const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { requireTenant, injectTenantQuery, checkTenantQuota, checkSubscriptionExpiry } = require('../middleware/tenantContext');
const { queryOne, queryAll, execute } = require('../database/helpers');
const encryptionMiddleware = require('../middleware/encryptionMiddleware');
const { accessControlMiddleware, requireAccess, Operation } = require('../middleware/accessControl');

// 定義需要加密的敏感欄位
const SENSITIVE_FIELDS = ['medicalHistory', 'allergies', 'emergencyContact'];

// 應用認證和租戶上下文
router.use(authenticateToken);
router.use(requireTenant);
router.use(checkSubscriptionExpiry); // 檢查訂閱是否過期
router.use(injectTenantQuery);
router.use(encryptionMiddleware); // 加密中介層
router.use(accessControlMiddleware); // 存取控制中介層

// 獲取所有患者（自動過濾組織）
router.get('/', requireAccess('patients', Operation.READ), async (req, res) => {
  try {
    // 使用租戶查詢輔助函數，自動過濾 organizationId
    const patients = await req.tenantQuery.findAll('patients', {
      orderBy: 'updatedAt DESC'
    });

    // 解密敏感欄位
    const decryptedPatients = req.decryptObjectArray(patients, SENSITIVE_FIELDS);

    // 解析 JSON 欄位
    const parsedPatients = decryptedPatients.map(p => ({
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : [],
      groups: p.groups ? JSON.parse(p.groups) : [],
      healthProfile: p.healthProfile ? JSON.parse(p.healthProfile) : null
    }));

    // 根據角色權限過濾欄位
    const filteredPatients = req.filterFieldsArray('patients', parsedPatients);

    res.json(filteredPatients);
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

    // 解密敏感欄位
    const decryptedPatient = req.decryptFields(patient, SENSITIVE_FIELDS);

    // 解析 JSON 欄位
    decryptedPatient.tags = decryptedPatient.tags ? JSON.parse(decryptedPatient.tags) : [];
    decryptedPatient.groups = decryptedPatient.groups ? JSON.parse(decryptedPatient.groups) : [];
    decryptedPatient.healthProfile = decryptedPatient.healthProfile ? JSON.parse(decryptedPatient.healthProfile) : null;

    // 根據角色權限過濾欄位
    const filteredPatient = req.filterFields('patients', decryptedPatient);

    // 記錄稽核日誌
    if (req.audit) {
      req.audit('READ', 'patients', req.params.id, { name: filteredPatient.name });
    }

    res.json(filteredPatient);
  } catch (error) {
    res.status(500).json({ error: '獲取患者資訊失敗' });
  }
});

// 創建患者（自動檢查配額並關聯組織）
router.post('/', checkTenantQuota('patients'), async (req, res) => {
  try {
    const { name, gender, birthDate, phone, email, address, emergencyContact, emergencyPhone, bloodType, medicalHistory, allergies, notes, tags, groups, healthProfile } = req.body;

    const now = new Date().toISOString();
    const id = `patient_${Date.now()}`;

    // 準備資料物件
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
      bloodType: bloodType || null,
      medicalHistory: medicalHistory || null,
      allergies: allergies || null,
      notes: notes || null,
      tags: JSON.stringify(tags || []),
      groups: JSON.stringify(groups || []),
      healthProfile: JSON.stringify(healthProfile || null),
      createdAt: now,
      updatedAt: now
    };

    // 加密敏感欄位
    const { data: encryptedData, encrypted } = req.encryptFields(data, SENSITIVE_FIELDS);

    // 記錄哪些欄位已加密
    if (encrypted.length > 0) {
      encryptedData._encrypted = JSON.stringify(encrypted);
    }

    // 使用租戶查詢插入，自動加入 organizationId
    const newPatient = await req.tenantQuery.insert('patients', encryptedData);

    // 解密後返回給前端
    const decryptedPatient = req.decryptFields(newPatient, SENSITIVE_FIELDS);
    decryptedPatient.tags = JSON.parse(decryptedPatient.tags);
    decryptedPatient.groups = JSON.parse(decryptedPatient.groups);
    decryptedPatient.healthProfile = JSON.parse(decryptedPatient.healthProfile);

    // 根據角色權限過濾欄位
    const filteredPatient = req.filterFields('patients', decryptedPatient);

    // 記錄稽核日誌
    if (req.audit) {
      req.audit('CREATE', 'patients', filteredPatient.id, { name: filteredPatient.name });
    }

    res.status(201).json(filteredPatient);
  } catch (error) {
    console.error('Create patient error:', error);
    if (req.audit) {
      req.audit('CREATE', 'patients', null, {}, 'FAILURE', error.message);
    }
    res.status(500).json({ error: '創建患者失敗' });
  }
});

// 更新患者（自動驗證組織權限）
router.put('/:id', async (req, res) => {
  try {
    const { name, gender, birthDate, phone, email, address, emergencyContact, emergencyPhone, bloodType, medicalHistory, allergies, notes, tags, groups, healthProfile } = req.body;
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
      bloodType,
      medicalHistory,
      allergies,
      notes,
      tags: JSON.stringify(tags || []),
      groups: JSON.stringify(groups || []),
      healthProfile: JSON.stringify(healthProfile || null),
      updatedAt: now
    };

    // 加密敏感欄位
    const { data: encryptedData, encrypted } = req.encryptFields(data, SENSITIVE_FIELDS);

    // 更新加密標記
    if (encrypted.length > 0) {
      encryptedData._encrypted = JSON.stringify(encrypted);
    }

    // 使用租戶查詢更新，自動驗證 organizationId
    const updatedPatient = await req.tenantQuery.update('patients', req.params.id, encryptedData);

    if (!updatedPatient) {
      return res.status(404).json({ error: '患者不存在或無權訪問' });
    }

    // 解密後返回給前端
    const decryptedPatient = req.decryptFields(updatedPatient, SENSITIVE_FIELDS);
    decryptedPatient.tags = JSON.parse(decryptedPatient.tags);
    decryptedPatient.groups = JSON.parse(decryptedPatient.groups);
    decryptedPatient.healthProfile = JSON.parse(decryptedPatient.healthProfile);

    // 根據角色權限過濾欄位
    const filteredPatient = req.filterFields('patients', decryptedPatient);

    // 記錄稽核日誌
    if (req.audit) {
      req.audit('UPDATE', 'patients', req.params.id, {
        name: filteredPatient.name,
        changedFields: Object.keys(data)
      });
    }

    res.json(filteredPatient);
  } catch (error) {
    console.error('Update patient error:', error);
    if (req.audit) {
      req.audit('UPDATE', 'patients', req.params.id, {}, 'FAILURE', error.message);
    }
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

    // 記錄稽核日誌
    if (req.audit) {
      req.audit('DELETE', 'patients', req.params.id);
    }

    res.json({ success: true, message: '患者已刪除' });
  } catch (error) {
    if (req.audit) {
      req.audit('DELETE', 'patients', req.params.id, {}, 'FAILURE', error.message);
    }
    res.status(500).json({ error: '刪除患者失敗' });
  }
});

module.exports = router;
