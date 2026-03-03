const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Schema para validación de login
const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida')
});

// POST /api/auth/login - Login de usuarios
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    // Buscar usuario en base de datos
    const [users] = await pool.execute(
      'SELECT id, name, email, username, password, role, active FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar si usuario está activo
    if (!user.active) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    // Verificar contraseña (sin bcrypt ya que son 4 números)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/auth/me - Obtener usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, username, role, active FROM users WHERE id = ?',
      [req.user.id]
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

// POST /api/auth/refresh - Refrescar token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generar nuevo token
    const token = jwt.sign(
      {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
