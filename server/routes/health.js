const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ===== 體組成記錄 =====

// 獲取體組成記錄
router.get('/body-composition', (req, res) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM body_composition';
    let params = [];

    if (patientId) {
      query += ' WHERE patientId = ?';
      params.push(patientId);
    }

    query += ' ORDER BY date DESC';

    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (error) {
    console.error('Get body composition error:', error);
    res.status(500).json({ error: '獲取體組成記錄失敗' });
  }
});

// 創建體組成記錄
router.post('/body-composition', (req, res) => {
  try {
    const { patientId, date, weight, height, bodyFat, muscleMass, bmi, visceralFat, boneMass, bodyWater, bmr, notes } = req.body;
    const now = new Date().toISOString();
    const id = `body_comp_${Date.now()}`;

    db.prepare(`
      INSERT INTO body_composition (id, patientId, date, weight, height, bodyFat, muscleMass, bmi, visceralFat, boneMass, bodyWater, bmr, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientId, date, weight || null, height || null, bodyFat || null, muscleMass || null, bmi || null, visceralFat || null, boneMass || null, bodyWater || null, bmr || null, notes || null, now);

    const newRecord = db.prepare('SELECT * FROM body_composition WHERE id = ?').get(id);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Create body composition error:', error);
    res.status(500).json({ error: '創建體組成記錄失敗' });
  }
});

// 更新體組成記錄
router.put('/body-composition/:id', (req, res) => {
  try {
    const { date, weight, height, bodyFat, muscleMass, bmi, visceralFat, boneMass, bodyWater, bmr, notes } = req.body;

    const result = db.prepare(`
      UPDATE body_composition
      SET date = ?, weight = ?, height = ?, bodyFat = ?, muscleMass = ?, bmi = ?, visceralFat = ?, boneMass = ?, bodyWater = ?, bmr = ?, notes = ?
      WHERE id = ?
    `).run(date, weight, height, bodyFat, muscleMass, bmi, visceralFat, boneMass, bodyWater, bmr, notes, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    const updatedRecord = db.prepare('SELECT * FROM body_composition WHERE id = ?').get(req.params.id);
    res.json(updatedRecord);
  } catch (error) {
    console.error('Update body composition error:', error);
    res.status(500).json({ error: '更新記錄失敗' });
  }
});

// 刪除體組成記錄
router.delete('/body-composition/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM body_composition WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '刪除記錄失敗' });
  }
});

// ===== 生命徵象記錄 =====

// 獲取生命徵象記錄
router.get('/vital-signs', (req, res) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM vital_signs';
    let params = [];

    if (patientId) {
      query += ' WHERE patientId = ?';
      params.push(patientId);
    }

    query += ' ORDER BY date DESC';

    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (error) {
    console.error('Get vital signs error:', error);
    res.status(500).json({ error: '獲取生命徵象記錄失敗' });
  }
});

// 創建生命徵象記錄
router.post('/vital-signs', (req, res) => {
  try {
    const { patientId, date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes } = req.body;
    const now = new Date().toISOString();
    const id = `vital_signs_${Date.now()}`;

    db.prepare(`
      INSERT INTO vital_signs (id, patientId, date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientId, date, bloodPressureSystolic || null, bloodPressureDiastolic || null, heartRate || null, temperature || null, respiratoryRate || null, oxygenSaturation || null, bloodGlucose || null, notes || null, now);

    const newRecord = db.prepare('SELECT * FROM vital_signs WHERE id = ?').get(id);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Create vital signs error:', error);
    res.status(500).json({ error: '創建生命徵象記錄失敗' });
  }
});

// 更新生命徵象記錄
router.put('/vital-signs/:id', (req, res) => {
  try {
    const { date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes } = req.body;

    const result = db.prepare(`
      UPDATE vital_signs
      SET date = ?, bloodPressureSystolic = ?, bloodPressureDiastolic = ?, heartRate = ?, temperature = ?, respiratoryRate = ?, oxygenSaturation = ?, bloodGlucose = ?, notes = ?
      WHERE id = ?
    `).run(date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    const updatedRecord = db.prepare('SELECT * FROM vital_signs WHERE id = ?').get(req.params.id);
    res.json(updatedRecord);
  } catch (error) {
    console.error('Update vital signs error:', error);
    res.status(500).json({ error: '更新記錄失敗' });
  }
});

// 刪除生命徵象記錄
router.delete('/vital-signs/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM vital_signs WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '刪除記錄失敗' });
  }
});

module.exports = router;
