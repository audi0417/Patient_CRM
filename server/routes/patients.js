const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 獲取所有患者
router.get('/', (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY updatedAt DESC').all();

    // 解析 JSON 欄位
    const parsedPatients = patients.map(p => ({
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : [],
      groups: p.groups ? JSON.parse(p.groups) : [],
      healthProfile: p.healthProfile ? JSON.parse(p.healthProfile) : null
    }));

    res.json(parsedPatients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: '獲取患者列表失敗' });
  }
});

// 獲取單個患者
router.get('/:id', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);

    if (!patient) {
      return res.status(404).json({ error: '患者不存在' });
    }

    // 解析 JSON 欄位
    patient.tags = patient.tags ? JSON.parse(patient.tags) : [];
    patient.groups = patient.groups ? JSON.parse(patient.groups) : [];
    patient.healthProfile = patient.healthProfile ? JSON.parse(patient.healthProfile) : null;

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: '獲取患者資訊失敗' });
  }
});

// 創建患者
router.post('/', (req, res) => {
  try {
    const { name, gender, birthDate, phone, email, address, emergencyContact, emergencyPhone, notes, tags, groups, healthProfile } = req.body;

    const now = new Date().toISOString();
    const id = `patient_${Date.now()}`;

    db.prepare(`
      INSERT INTO patients (id, name, gender, birthDate, phone, email, address, emergencyContact, emergencyPhone, notes, tags, groups, healthProfile, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, gender || null, birthDate || null, phone || null, email || null, address || null,
      emergencyContact || null, emergencyPhone || null, notes || null,
      JSON.stringify(tags || []), JSON.stringify(groups || []), JSON.stringify(healthProfile || null),
      now, now
    );

    const newPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    newPatient.tags = JSON.parse(newPatient.tags);
    newPatient.groups = JSON.parse(newPatient.groups);
    newPatient.healthProfile = JSON.parse(newPatient.healthProfile);

    res.status(201).json(newPatient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: '創建患者失敗' });
  }
});

// 更新患者
router.put('/:id', (req, res) => {
  try {
    const { name, gender, birthDate, phone, email, address, emergencyContact, emergencyPhone, notes, tags, groups, healthProfile } = req.body;
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE patients
      SET name = ?, gender = ?, birthDate = ?, phone = ?, email = ?, address = ?,
          emergencyContact = ?, emergencyPhone = ?, notes = ?, tags = ?, groups = ?,
          healthProfile = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      name, gender, birthDate, phone, email, address, emergencyContact, emergencyPhone, notes,
      JSON.stringify(tags || []), JSON.stringify(groups || []), JSON.stringify(healthProfile || null),
      now, req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '患者不存在' });
    }

    const updatedPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    updatedPatient.tags = JSON.parse(updatedPatient.tags);
    updatedPatient.groups = JSON.parse(updatedPatient.groups);
    updatedPatient.healthProfile = JSON.parse(updatedPatient.healthProfile);

    res.json(updatedPatient);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: '更新患者失敗' });
  }
});

// 刪除患者
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '患者不存在' });
    }

    res.json({ success: true, message: '患者已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除患者失敗' });
  }
});

module.exports = router;
