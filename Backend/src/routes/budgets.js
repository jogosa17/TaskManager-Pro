const express = require('express');
const { z } = require('zod');
const pool = require('../config/database');
const { authenticateToken, requireDIOS } = require('../middleware/auth');

const router = express.Router();

// Schema para validación de presupuesto
const createBudgetSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  client_name: z.string().min(1, 'Nombre del cliente requerido'),
  client_dni: z.string().regex(/^[0-9]{8}[A-Za-z]$/, 'DNI del cliente inválido').optional(),
  project_description: z.string().optional(),
  iva_rate: z.number().min(0).max(100).default(21),
  irpf_rate: z.number().min(0).max(100).default(0),
  items: z.array(z.object({
    description: z.string().min(1, 'Descripción requerida'),
    quantity: z.number().positive('Cantidad debe ser positiva'),
    unit_price: z.number().positive('Precio unitario debe ser positivo')
  })).optional()
});

const updateBudgetSchema = z.object({
  title: z.string().min(1, 'Título requerido').optional(),
  client_name: z.string().min(1, 'Nombre del cliente requerido').optional(),
  client_dni: z.string().regex(/^[0-9]{8}[A-Za-z]$/, 'DNI del cliente inválido').optional(),
  project_description: z.string().optional(),
  status: z.enum(['BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO']).optional(),
  iva_rate: z.number().min(0).max(100).optional(),
  irpf_rate: z.number().min(0).max(100).optional()
});

// GET /api/budgets - Obtener presupuestos (solo DIOS)
router.get('/', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const { status, client_name, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT b.*, u.name as created_name
      FROM budgets b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    
    if (client_name) {
      query += ' AND b.client_name LIKE ?';
      params.push(`%${client_name}%`);
    }

    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [budgets] = await pool.execute(query, params);

    res.json(budgets);
  } catch (error) {
    console.error('Error al obtener presupuestos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/budgets/:id - Obtener presupuesto por ID con sus items
router.get('/:id', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener presupuesto
    const [budgets] = await pool.execute(`
      SELECT b.*, u.name as created_name
      FROM budgets b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [id]);

    if (budgets.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Obtener items del presupuesto
    const [items] = await pool.execute(
      'SELECT * FROM budget_items WHERE budget_id = ? ORDER BY id',
      [id]
    );

    const budget = budgets[0];
    budget.items = items;

    res.json(budget);
  } catch (error) {
    console.error('Error al obtener presupuesto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/budgets - Crear nuevo presupuesto (solo DIOS)
router.post('/', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const budgetData = createBudgetSchema.parse(req.body);

    // Calcular totales
    let subtotal = 0;
    if (budgetData.items && budgetData.items.length > 0) {
      subtotal = budgetData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    }

    const iva_amount = subtotal * (budgetData.iva_rate / 100);
    const irpf_amount = subtotal * (budgetData.irpf_rate / 100);
    const total = subtotal + iva_amount - irpf_amount;

    // Insertar presupuesto
    const [result] = await pool.execute(
      `INSERT INTO budgets (title, client_name, client_dni, project_description, subtotal, iva_rate, iva_amount, irpf_rate, irpf_amount, total, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budgetData.title,
        budgetData.client_name,
        budgetData.client_dni || null,
        budgetData.project_description || null,
        subtotal,
        budgetData.iva_rate,
        iva_amount,
        budgetData.irpf_rate,
        irpf_amount,
        total,
        req.user.id
      ]
    );

    const budgetId = result.insertId;

    // Insertar items si existen
    if (budgetData.items && budgetData.items.length > 0) {
      for (const item of budgetData.items) {
        await pool.execute(
          'INSERT INTO budget_items (budget_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [budgetId, item.description, item.quantity, item.unit_price]
        );
      }
    }

    res.status(201).json({
      id: budgetId,
      ...budgetData,
      subtotal,
      iva_amount,
      irpf_amount,
      total,
      status: 'BORRADOR',
      created_by: req.user.id,
      message: 'Presupuesto creado exitosamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al crear presupuesto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/budgets/:id - Actualizar presupuesto (solo DIOS)
router.put('/:id', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = updateBudgetSchema.parse(req.body);

    // Verificar que presupuesto existe
    const [existing] = await pool.execute('SELECT * FROM budgets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Construir consulta dinámica
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.client_name !== undefined) {
      fields.push('client_name = ?');
      values.push(updates.client_name);
    }
    if (updates.client_dni !== undefined) {
      fields.push('client_dni = ?');
      values.push(updates.client_dni);
    }
    if (updates.project_description !== undefined) {
      fields.push('project_description = ?');
      values.push(updates.project_description);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    // Si se actualizan los impuestos, recalcular totales
    if (updates.iva_rate !== undefined || updates.irpf_rate !== undefined) {
      // Obtener subtotal actual
      const [currentBudget] = await pool.execute('SELECT subtotal FROM budgets WHERE id = ?', [id]);
      const subtotal = currentBudget[0].subtotal;
      
      const newIvaRate = updates.iva_rate !== undefined ? updates.iva_rate : currentBudget[0].iva_rate;
      const newIrpfRate = updates.irpf_rate !== undefined ? updates.irpf_rate : currentBudget[0].irpf_rate;
      
      const iva_amount = subtotal * (newIvaRate / 100);
      const irpf_amount = subtotal * (newIrpfRate / 100);
      const total = subtotal + iva_amount - irpf_amount;

      fields.push('iva_rate = ?', 'iva_amount = ?', 'irpf_rate = ?', 'irpf_amount = ?', 'total = ?');
      values.push(newIvaRate, iva_amount, newIrpfRate, irpf_amount, total);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    values.push(id);

    const query = `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);

    res.json({ message: 'Presupuesto actualizado exitosamente' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    console.error('Error al actualizar presupuesto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/budgets/:id - Eliminar presupuesto (solo DIOS)
router.delete('/:id', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que presupuesto existe
    const [existing] = await pool.execute('SELECT id FROM budgets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    await pool.execute('DELETE FROM budgets WHERE id = ?', [id]);

    res.json({ message: 'Presupuesto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar presupuesto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/budgets/:id/items - Añadir item a presupuesto
router.post('/:id/items', authenticateToken, requireDIOS, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, quantity, unit_price } = req.body;

    if (!description || !quantity || !unit_price) {
      return res.status(400).json({ error: 'Todos los campos del item son requeridos' });
    }

    // Verificar que presupuesto existe
    const [existing] = await pool.execute('SELECT id, subtotal FROM budgets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Insertar item
    const [result] = await pool.execute(
      'INSERT INTO budget_items (budget_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [id, description, quantity, unit_price]
    );

    // Recalcular totales del presupuesto
    const [items] = await pool.execute('SELECT quantity, unit_price FROM budget_items WHERE budget_id = ?', [id]);
    const newSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    const [budget] = await pool.execute('SELECT iva_rate, irpf_rate FROM budgets WHERE id = ?', [id]);
    const iva_amount = newSubtotal * (budget[0].iva_rate / 100);
    const irpf_amount = newSubtotal * (budget[0].irpf_rate / 100);
    const total = newSubtotal + iva_amount - irpf_amount;

    await pool.execute(
      'UPDATE budgets SET subtotal = ?, iva_amount = ?, irpf_amount = ?, total = ? WHERE id = ?',
      [newSubtotal, iva_amount, irpf_amount, total, id]
    );

    res.status(201).json({
      id: result.insertId,
      budget_id: parseInt(id),
      description,
      quantity,
      unit_price,
      message: 'Item añadido exitosamente'
    });
  } catch (error) {
    console.error('Error al añadir item:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
