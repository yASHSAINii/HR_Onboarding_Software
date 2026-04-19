const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all templates
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM templates ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single template
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create template
router.post('/', async (req, res) => {
  const { name, subject, body } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO templates (name, subject, body) VALUES ($1, $2, $3) RETURNING *',
      [name, subject, body]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  const { name, subject, body } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE templates SET name = $1, subject = $2, body = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, subject, body, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Template not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;