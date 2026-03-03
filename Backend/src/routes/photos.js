const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Schema para validación de metadata de foto
const photoSchema = z.object({
  task_id: z.number().positive().optional(),
  budget_id: z.number().positive().optional(),
  description: z.string().optional()
});

// GET /api/photos - Obtener fotos (con filtros)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { task_id, budget_id, uploaded_by, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, u.name as uploaded_name
      FROM photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filtros según rol
    if (req.user.role === 'TRABAJADOR') {
      query += ' AND p.uploaded_by = ?';
      params.push(req.user.id);
    }

    // Filtros adicionales
    if (task_id) {
      query += ' AND p.task_id = ?';
      params.push(task_id);
    }
    
    if (budget_id) {
      query += ' AND p.budget_id = ?';
      params.push(budget_id);
    }
    
    if (uploaded_by) {
      query += ' AND p.uploaded_by = ?';
      params.push(uploaded_by);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [photos] = await pool.execute(query, params);

    res.json(photos);
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/photos/:id - Obtener foto por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [photos] = await pool.execute(`
      SELECT p.*, u.name as uploaded_name
      FROM photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.id = ?
    `, [id]);

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    const photo = photos[0];

    // Verificar permisos
    if (req.user.role === 'TRABAJADOR' && photo.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    res.json(photo);
  } catch (error) {
    console.error('Error al obtener foto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/photos - Subir nueva foto
router.post('/', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido' });
    }

    const { task_id, budget_id, description } = photoSchema.parse(req.body);

    // Verificar que al menos una de las referencias existe
    if (!task_id && !budget_id) {
      return res.status(400).json({ error: 'La foto debe estar asociada a una tarea o presupuesto' });
    }

    // Verificar permisos para la referencia
    if (task_id) {
      const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [task_id]);
      if (tasks.length === 0) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }

      const task = tasks[0];
      if (req.user.role === 'TRABAJADOR' && task.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'No puedes subir fotos a tareas no asignadas' });
      }
    }

    if (budget_id) {
      const [budgets] = await pool.execute('SELECT * FROM budgets WHERE id = ?', [budget_id]);
      if (budgets.length === 0) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
    }

    // Por ahora, guardar como base64 (más adelante se integrará Cloudinary)
    const photoData = req.file.buffer.toString('base64');
    const url = `data:${req.file.mimetype};base64,${photoData}`;

    // Insertar foto en base de datos
    const [result] = await pool.execute(
      'INSERT INTO photos (url, task_id, budget_id, description, uploaded_by, file_size) VALUES (?, ?, ?, ?, ?, ?)',
      [url, task_id || null, budget_id || null, description || null, req.user.id, req.file.size]
    );

    res.status(201).json({
      id: result.insertId,
      url,
      task_id,
      budget_id,
      description,
      uploaded_by: req.user.id,
      file_size: req.file.size,
      message: 'Foto subida exitosamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al subir foto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/photos/:id - Eliminar foto
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que foto existe
    const [existing] = await pool.execute('SELECT * FROM photos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    const photo = existing[0];

    // Verificar permisos
    const canDelete = 
      req.user.role === 'DIOS' ||
      photo.uploaded_by === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    await pool.execute('DELETE FROM photos WHERE id = ?', [id]);

    res.json({ message: 'Foto eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/photos/task/:taskId - Obtener fotos de una tarea específica
router.get('/task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verificar que tarea existe y permisos
    const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const task = tasks[0];
    if (req.user.role === 'TRABAJADOR' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    const [photos] = await pool.execute(`
      SELECT p.*, u.name as uploaded_name
      FROM photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.task_id = ?
      ORDER BY p.created_at DESC
    `, [taskId]);

    res.json(photos);
  } catch (error) {
    console.error('Error al obtener fotos de tarea:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/photos/budget/:budgetId - Obtener fotos de un presupuesto específico
router.get('/budget/:budgetId', authenticateToken, async (req, res) => {
  try {
    const { budgetId } = req.params;

    // Solo DIOS puede ver fotos de presupuestos
    if (req.user.role !== 'DIOS') {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    // Verificar que presupuesto existe
    const [budgets] = await pool.execute('SELECT * FROM budgets WHERE id = ?', [budgetId]);
    if (budgets.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    const [photos] = await pool.execute(`
      SELECT p.*, u.name as uploaded_name
      FROM photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.budget_id = ?
      ORDER BY p.created_at DESC
    `, [budgetId]);

    res.json(photos);
  } catch (error) {
    console.error('Error al obtener fotos de presupuesto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
