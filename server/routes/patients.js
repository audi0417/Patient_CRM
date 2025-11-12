const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { requireTenant, injectTenantQuery, checkTenantQuota, checkSubscriptionExpiry } = require('../middleware/tenantContext');
const { queryOne, queryAll, execute } = require('../database/helpers');

// 應用認證和租戶上下文
router.use(authenticateToken);
router.use(requireTenant);
router.use(checkSubscriptionExpiry); // 檢查訂閱是否過期
router.use(injectTenantQuery);

// 獲取所有患者（自動過濾組織）
router.get('/', async (req, res) => {
  try {
    // 使用租戶查詢輔助函數，自動過濾 organizationId
    const patients = await req.tenantQuery.findAll('patients', {
      orderBy: 'updatedAt DESC'
    });

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

// 獲取單個患者（自動驗證組織權限）
router.get('/:id', async (req, res) => {
  try {
    // 使用租戶查詢，自動驗證是否屬於同一組織
    const patient = await req.tenantQuery.findById('patients', req.params.id);

    if (!patient) {
      return res.status(404).json({ error: '患者不存在或無權訪問' });
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

// 創建患者（自動檢查配額並關聯組織）
router.post('/', checkTenantQuota('patients'), async (req, res) => {
  try {
    const { name, gender, birthDate, phone, email, address, emergencyContact, emergencyPhone, notes, tags, groups, healthProfile } = req.body;

    const now = new Date().toISOString();
    const id = `patient_${Date.now()}`;

    // 使用租戶查詢插入，自動加入 organizationId
    const data = {
      id,
      name,
      gender: gender || null,
      birthDate: birthDate || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      emergencyContact: emergencyContact || null,
      emergencyPhone: emergencyPhone || null,
      notes: notes || null,
      tags: JSON.stringify(tags || []),
      groups: JSON.stringify(groups || []),
      healthProfile: JSON.stringify(healthProfile || null),
      createdAt: now,
      updatedAt: now
    };

    const newPatient = await req.tenantQuery.insert('patients', data);
    newPatient.tags = JSON.parse(newPatient.tags);
    newPatient.groups = JSON.parse(newPatient.groups);
    newPatient.healthProfile = JSON.parse(newPatient.healthProfile);

    res.status(201).json(newPatient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: '創建患者失敗' });
  }
});

// 更新患者（自動驗證組織權限）
router.put('/:id', async (req, res) => {
  try {
    const { name, gender, birthDate, phone, email, address, emergencyContact, emergencyPhone, notes, tags, groups, healthProfile } = req.body;
    const now = new Date().toISOString();

    const data = {
      name,
      gender,
      birthDate,
      phone,
      email,
      address,
      emergencyContact,
      emergencyPhone,
      notes,
      tags: JSON.stringify(tags || []),
      groups: JSON.stringify(groups || []),
      healthProfile: JSON.stringify(healthProfile || null),
      updatedAt: now
    };

    // 使用租戶查詢更新，自動驗證 organizationId
    const updatedPatient = await req.tenantQuery.update('patients', req.params.id, data);

    if (!updatedPatient) {
      return res.status(404).json({ error: '患者不存在或無權訪問' });
    }

    updatedPatient.tags = JSON.parse(updatedPatient.tags);
    updatedPatient.groups = JSON.parse(updatedPatient.groups);
    updatedPatient.healthProfile = JSON.parse(updatedPatient.healthProfile);

    res.json(updatedPatient);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: '更新患者失敗' });
  }
});

// 刪除患者（自動驗證組織權限）
router.delete('/:id', async (req, res) => {
  try {
    // 使用租戶查詢刪除，自動驗證 organizationId
    const success = await req.tenantQuery.delete('patients', req.params.id);

    if (!success) {
      return res.status(404).json({ error: '患者不存在或無權訪問' });
    }

    res.json({ success: true, message: '患者已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除患者失敗' });
  }
});

module.exports = router;
