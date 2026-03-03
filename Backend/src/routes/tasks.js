const express = require('express');
const { z } = require('zod');
const pool = require('../config/database');
const { authenticateToken, requireDIOSOrEncargado, requireRole } = require('../middleware/auth');

const router = express.Router();

// Schema para validación de tarea
const createTaskSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional(),
  priority: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
  due_date: z.string().optional().transform(val => val ? new Date(val) : null),
  assigned_to: z.number().positive().optional(),
  project_name: z.string().optional(),
  location: z.string().optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Título requerido').optional(),
  description: z.string().optional(),
  status: z.enum(['PENDIENTE', 'EN_PROGRESO', 'FINALIZADA']).optional(),
  priority: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).optional(),
  due_date: z.string().optional().transform(val => val ? new Date(val) : null),
  assigned_to: z.number().positive().optional(),
  project_name: z.string().optional(),
  location: z.string().optional()
});

// GET /api/tasks - Obtener tareas (con filtros)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, assigned_to, project_name, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT t.*, 
             u_assigned.name as assigned_name,
             u_created.name as created_name
      FROM tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filtros según rol
    if (req.user.role === 'TRABAJADOR') {
      query += ' AND t.assigned_to = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'ENCARGADO') {
      // Encargado ve sus tareas creadas y las asignadas a sus trabajadores
      query += ' AND (t.created_by = ? OR t.assigned_to IN (SELECT id FROM users WHERE role = "TRABAJADOR"))';
      params.push(req.user.id);
    }
    // DIOS ve todas las tareas (sin filtro adicional)

    // Filtros adicionales
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }
    
    if (project_name) {
      query += ' AND t.project_name LIKE ?';
      params.push(`%${project_name}%`);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [tasks] = await pool.execute(query, params);

    res.json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/tasks/:id - Obtener tarea por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [tasks] = await pool.execute(`
      SELECT t.*, 
             u_assigned.name as assigned_name,
             u_created.name as created_name
      FROM tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      WHERE t.id = ?
    `, [id]);

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const task = tasks[0];

    // Verificar permisos
    if (req.user.role === 'TRABAJADOR' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error al obtener tarea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/tasks - Crear nueva tarea (DIOS o ENCARGADO)
router.post('/', authenticateToken, requireDIOSOrEncargado, async (req, res) => {
  try {
    const taskData = createTaskSchema.parse(req.body);

    // Verificar que el usuario asignado existe y es trabajador
    if (taskData.assigned_to) {
      const [users] = await pool.execute(
        'SELECT id, role FROM users WHERE id = ? AND active = TRUE',
        [taskData.assigned_to]
      );

      if (users.length === 0) {
        return res.status(400).json({ error: 'Usuario asignado no encontrado o inactivo' });
      }

      const assignedUser = users[0];
      if (assignedUser.role !== 'TRABAJADOR') {
        return res.status(400).json({ error: 'Solo se pueden asignar tareas a trabajadores' });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by, project_name, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskData.title,
        taskData.description || null,
        'PENDIENTE',
        taskData.priority,
        taskData.due_date,
        taskData.assigned_to || null,
        req.user.id,
        taskData.project_name || null,
        taskData.location || null
      ]
    );

    res.status(201).json({
      id: result.insertId,
      ...taskData,
      status: 'PENDIENTE',
      created_by: req.user.id,
      message: 'Tarea creada exitosamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/tasks/:id - Actualizar tarea
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = updateTaskSchema.parse(req.body);

    // Verificar que tarea existe
    const [existing] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const task = existing[0];

    // Verificar permisos
    const canUpdate = 
      req.user.role === 'DIOS' ||
      req.user.role === 'ENCARGADO' ||
      (req.user.role === 'TRABAJADOR' && task.assigned_to === req.user.id);

    if (!canUpdate) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    // Trabajadores solo pueden cambiar estado a EN_PROGRESO o FINALIZADA
    if (req.user.role === 'TRABAJADOR' && updates.status) {
      if (!['EN_PROGRESO', 'FINALIZADA'].includes(updates.status)) {
        return res.status(403).json({ error: 'Los trabajadores solo pueden marcar tareas como en progreso o finalizadas' });
      }
    }

    // Construir consulta dinámica
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(updates.due_date);
    }
    if (updates.assigned_to !== undefined) {
      // Verificar que el usuario asignado existe
      if (updates.assigned_to) {
        const [users] = await pool.execute(
          'SELECT id, role FROM users WHERE id = ? AND active = TRUE',
          [updates.assigned_to]
        );
        if (users.length === 0 || users[0].role !== 'TRABAJADOR') {
          return res.status(400).json({ error: 'Usuario asignado no válido' });
        }
      }
      fields.push('assigned_to = ?');
      values.push(updates.assigned_to);
    }
    if (updates.project_name !== undefined) {
      fields.push('project_name = ?');
      values.push(updates.project_name);
    }
    if (updates.location !== undefined) {
      fields.push('location = ?');
      values.push(updates.location);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    values.push(id);

    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);

    res.json({ message: 'Tarea actualizada exitosamente' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/tasks/:id - Eliminar tarea (solo DIOS o ENCARGADO)
router.delete('/:id', authenticateToken, requireDIOSOrEncargado, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que tarea existe
    const [existing] = await pool.execute('SELECT id, created_by FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Encargado solo puede eliminar tareas que él creó
    if (req.user.role === 'ENCARGADO' && existing[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Solo puedes eliminar tareas que tú creaste' });
    }

    await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);

    res.json({ message: 'Tarea eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
