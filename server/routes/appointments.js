const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 獲取預約
router.get('/', (req, res) => {
  try {
    const { patientId, startDate, endDate } = req.query;
    let query = 'SELECT * FROM appointments WHERE 1=1';
    let params = [];

    if (patientId) {
      query += ' AND patientId = ?';
      params.push(patientId);
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date ASC, time ASC';

    const appointments = db.prepare(query).all(...params);
    // Convert INTEGER to boolean for frontend
    const formatted = appointments.map(apt => ({
      ...apt,
      reminderSent: Boolean(apt.reminderSent),
      isRecurring: Boolean(apt.isRecurring)
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: '獲取預約列表失敗' });
  }
});

// 創建預約
router.post('/', (req, res) => {
  try {
    const {
      patientId,
      date,
      time,
      type,
      notes,
      status,
      reminderSent,
      isRecurring,
      recurringPattern,
      recurringEndDate,
      parentAppointmentId,
      reminderDays
    } = req.body;

    const now = new Date().toISOString();
    const id = `appointment_${Date.now()}`;

    db.prepare(`
      INSERT INTO appointments (
        id, patientId, date, time, type, notes, status,
        reminderSent, isRecurring, recurringPattern, recurringEndDate,
        parentAppointmentId, reminderDays, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      patientId,
      date,
      time,
      type,
      notes || null,
      status || 'scheduled',
      reminderSent ? 1 : 0,
      isRecurring ? 1 : 0,
      recurringPattern || null,
      recurringEndDate || null,
      parentAppointmentId || null,
      reminderDays || 1,
      now,
      now
    );

    const newAppointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    // Convert INTEGER to boolean for frontend
    const formatted = {
      ...newAppointment,
      reminderSent: Boolean(newAppointment.reminderSent),
      isRecurring: Boolean(newAppointment.isRecurring)
    };
    res.status(201).json(formatted);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: '創建預約失敗' });
  }
});

// 更新預約
router.put('/:id', (req, res) => {
  try {
    const {
      date,
      time,
      type,
      notes,
      status,
      reminderSent,
      isRecurring,
      recurringPattern,
      recurringEndDate,
      parentAppointmentId,
      reminderDays
    } = req.body;
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE appointments
      SET date = ?, time = ?, type = ?, notes = ?, status = ?,
          reminderSent = ?, isRecurring = ?, recurringPattern = ?,
          recurringEndDate = ?, parentAppointmentId = ?, reminderDays = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      date,
      time,
      type,
      notes,
      status,
      reminderSent ? 1 : 0,
      isRecurring ? 1 : 0,
      recurringPattern || null,
      recurringEndDate || null,
      parentAppointmentId || null,
      reminderDays || 1,
      now,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '預約不存在' });
    }

    const updatedAppointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    // Convert INTEGER to boolean for frontend
    const formatted = {
      ...updatedAppointment,
      reminderSent: Boolean(updatedAppointment.reminderSent),
      isRecurring: Boolean(updatedAppointment.isRecurring)
    };
    res.json(formatted);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: '更新預約失敗' });
  }
});

// 刪除預約
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '預約不存在' });
    }

    res.json({ success: true, message: '預約已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除預約失敗' });
  }
});

module.exports = router;
