const express = require('express');
const router = express.Router();
const { queryOne, queryAll, execute } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 獲取諮詢記錄
router.get('/', async (req, res) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM consultations';
    let params = [];

    if (patientId) {
      query += ' WHERE patientId = ?';
      params.push(patientId);
    }

    query += ' ORDER BY date DESC, createdAt DESC';

    const records = await queryAll(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ error: '獲取諮詢記錄失敗' });
  }
});

// 根據 ID 獲取諮詢記錄
router.get('/:id', async (req, res) => {
  try {
    const record = await queryOne('SELECT * FROM consultations WHERE id = ?', [req.params.id]);

    if (!record) {
      return res.status(404).json({ error: '諮詢記錄不存在' });
    }

    res.json(record);
  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ error: '獲取諮詢記錄失敗' });
  }
});

// 創建諮詢記錄
router.post('/', async (req, res) => {
  try {
    const { patientId, date, type, chiefComplaint, assessment, plan, notes } = req.body;

    if (!patientId || !date) {
      return res.status(400).json({ error: '患者ID和日期為必填欄位' });
    }

    const now = new Date().toISOString();
    const id = `consultation_${Date.now()}`;

    await execute(`
      INSERT INTO consultations (id, patientId, date, type, chiefComplaint, assessment, plan, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      patientId,
      date,
      type || null,
      chiefComplaint || null,
      assessment || null,
      plan || null,
      notes || null,
      now,
      now
    ]);

    const newRecord = await queryOne('SELECT * FROM consultations WHERE id = ?', [id]);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ error: '創建諮詢記錄失敗' });
  }
});

// 更新諮詢記錄
router.put('/:id', async (req, res) => {
  try {
    const { date, type, chiefComplaint, assessment, plan, notes } = req.body;
    const now = new Date().toISOString();

    const result = await execute(`
      UPDATE consultations
      SET date = ?, type = ?, chiefComplaint = ?, assessment = ?, plan = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `, [
      date,
      type || null,
      chiefComplaint || null,
      assessment || null,
      plan || null,
      notes || null,
      now,
      req.params.id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '諮詢記錄不存在' });
    }

    const updatedRecord = await queryOne('SELECT * FROM consultations WHERE id = ?', [req.params.id]);
    res.json(updatedRecord);
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ error: '更新諮詢記錄失敗' });
  }
});

// 刪除諮詢記錄
router.delete('/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM consultations WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '諮詢記錄不存在' });
    }

    res.json({ success: true, message: '諮詢記錄已刪除' });
  } catch (error) {
    console.error('Delete consultation error:', error);
    res.status(500).json({ error: '刪除諮詢記錄失敗' });
  }
});

module.exports = router;
