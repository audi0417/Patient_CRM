const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { requireTenant, injectTenantQuery } = require('../middleware/tenantContext');

// 應用認證和租戶上下文
router.use(authenticateToken);
router.use(requireTenant);
router.use(injectTenantQuery);

// 獲取預約（自動過濾組織）
router.get('/', (req, res) => {
  try {
    const { patientId, startDate, endDate } = req.query;
    const { organizationId } = req.tenantContext;

    // 建立租戶感知的查詢
    let query = 'SELECT * FROM appointments WHERE organizationId = ?';
    let params = [organizationId];

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

// 創建預約（自動關聯組織並驗證患者權限）
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

    // 驗證患者是否屬於同一組織
    const patient = req.tenantQuery.findById('patients', patientId);
    if (!patient) {
      return res.status(400).json({ error: '患者不存在或無權訪問' });
    }

    const now = new Date().toISOString();
    const id = `appointment_${Date.now()}`;

    const data = {
      id,
      patientId,
      date,
      time,
      type,
      notes: notes || null,
      status: status || 'scheduled',
      reminderSent: reminderSent ? 1 : 0,
      isRecurring: isRecurring ? 1 : 0,
      recurringPattern: recurringPattern || null,
      recurringEndDate: recurringEndDate || null,
      parentAppointmentId: parentAppointmentId || null,
      reminderDays: reminderDays || 1,
      createdAt: now,
      updatedAt: now
    };

    const newAppointment = req.tenantQuery.insert('appointments', data);
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

// 更新預約（自動驗證組織權限）
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

    const data = {
      date,
      time,
      type,
      notes,
      status,
      reminderSent: reminderSent ? 1 : 0,
      isRecurring: isRecurring ? 1 : 0,
      recurringPattern: recurringPattern || null,
      recurringEndDate: recurringEndDate || null,
      parentAppointmentId: parentAppointmentId || null,
      reminderDays: reminderDays || 1,
      updatedAt: now
    };

    const updatedAppointment = req.tenantQuery.update('appointments', req.params.id, data);

    if (!updatedAppointment) {
      return res.status(404).json({ error: '預約不存在或無權訪問' });
    }

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

// 刪除預約（自動驗證組織權限）
router.delete('/:id', (req, res) => {
  try {
    const success = req.tenantQuery.delete('appointments', req.params.id);

    if (!success) {
      return res.status(404).json({ error: '預約不存在或無權訪問' });
    }

    res.json({ success: true, message: '預約已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除預約失敗' });
  }
});

module.exports = router;
