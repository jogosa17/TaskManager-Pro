const express = require('express');
const { z } = require('zod');
const pool = require('../config/database');
const { authenticateToken, requireDIOS, requireRole } = require('../middleware/auth');
const { generateCredentials, validateDNI } = require('../utils/credentials');

const router = express.Router();

// Schema para validación de creación de usuario
const createUserSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  dni: z.string().regex(/^[0-9]{8}[A-Za-z]$/, 'DNI inválido'),
  role: z.enum(['ENCARGADO', 'TRABAJADOR'])
});

// Schema para actualización de usuario
const updateUserSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').optional(),
  email: z.string().email('Email inválido').optional(),
  role: z.enum(['ENCARGADO', 'TRABAJADOR']).optional(),
  active: z.boolean().optional()
});

// GET /api/users - Obtener todos los usuarios (solo DIOS)
router.get('/', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, dni, username, role, active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/users/:id - Obtener usuario por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Solo puede ver su propio perfil o DIOS puede ver todos
    if (req.user.id !== parseInt(id) && req.user.role !== 'DIOS') {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    const [users] = await pool.execute(
      'SELECT id, name, email, dni, username, role, active, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/users - Crear nuevo usuario (solo DIOS)
router.post('/', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const { name, email, dni, role } = createUserSchema.parse(req.body);

    // Validar DNI
    if (!validateDNI(dni)) {
      return res.status(400).json({ error: 'DNI inválido' });
    }

    // Generar credenciales automáticas
    const { username, password } = generateCredentials(dni);

    // Verificar si DNI ya existe
    const [existingDNI] = await pool.execute('SELECT id FROM users WHERE dni = ?', [dni]);
    if (existingDNI.length > 0) {
      return res.status(400).json({ error: 'El DNI ya está registrado' });
    }

    // Verificar si email ya existe
    const [existingEmail] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Verificar si username ya existe
    const [existingUsername] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'El username ya está registrado' });
    }

    // Insertar nuevo usuario
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, dni, username, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, dni, username, password, role]
    );

    // Devolver usuario creado con credenciales
    res.status(201).json({
      id: result.insertId,
      name,
      email,
      dni,
      username,
      password, // Solo se muestra una vez en la creación
      role,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/users/:id - Actualizar usuario (solo DIOS)
router.put('/:id', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = updateUserSchema.parse(req.body);

    // Verificar que usuario existe
    const [existing] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Construir consulta dinámica
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/users/:id - Eliminar usuario (solo DIOS)
router.delete('/:id', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no es el usuario DIOS
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario DIOS' });
    }

    // Verificar que usuario existe
    const [existing] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Eliminar usuario (soft delete: desactivar)
    await pool.execute('UPDATE users SET active = FALSE WHERE id = ?', [id]);

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
