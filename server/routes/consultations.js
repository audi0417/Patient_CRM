const express = require('express');
const router = express.Router();
const { queryOne, queryAll, execute } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');
const { requireTenant, injectTenantQuery, checkSubscriptionExpiry } = require('../middleware/tenantContext');
const encryptionMiddleware = require('../middleware/encryptionMiddleware');
const { accessControlMiddleware, requireAccess, Operation } = require('../middleware/accessControl');

// 定義需要加密的敏感欄位
const SENSITIVE_FIELDS = ['chiefComplaint', 'assessment', 'plan', 'notes'];

router.use(authenticateToken);
router.use(requireTenant); // 🔒 租戶隔離
router.use(checkSubscriptionExpiry); // 🔒 訂閱檢查
router.use(injectTenantQuery); // 🔒 注入租戶查詢函數
router.use(encryptionMiddleware); // 加密中介層
router.use(accessControlMiddleware); // 存取控制中介層
// 諮詢記錄不需要模組保護（未使用模組化）

// 獲取諮詢記錄（自動過濾組織）
router.get('/', requireAccess('consultations', Operation.READ), async (req, res) => {
  try {
    const { patientId } = req.query;
    
    // 🔒 使用租戶查詢輔助函數，自動過濾 organizationId
    let options = { orderBy: 'date DESC, createdAt DESC' };
    
    if (patientId) {
      // 🔒 先驗證病患是否屬於當前組織
      const patient = await req.tenantQuery.findById('patients', patientId);
      if (!patient) {
        return res.status(403).json({ error: '患者不存在或無權訪問' });
      }
      options.where = { patientId };
    }
    
    const records = await req.tenantQuery.findAll('consultations', options);

    // 解密敏感欄位
    const decryptedRecords = req.decryptObjectArray(records, SENSITIVE_FIELDS);

    // 根據角色權限過濾欄位
    const filteredRecords = req.filterFieldsArray('consultations', decryptedRecords);

    res.json(filteredRecords);
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ error: '獲取諮詢記錄失敗' });
  }
});

// 根據 ID 獲取諮詢記錄（自動驗證組織權限）
router.get('/:id', requireAccess('consultations', Operation.READ), async (req, res) => {
  try {
    // 🔒 使用租戶查詢，自動驗證是否屬於同一組織
    const record = await req.tenantQuery.findById('consultations', req.params.id);

    if (!record) {
      return res.status(404).json({ error: '諮詢記錄不存在或無權訪問' });
    }

    // 解密敏感欄位
    const decryptedRecord = req.decryptFields(record, SENSITIVE_FIELDS);

    // 根據角色權限過濾欄位
    const filteredRecord = req.filterFields('consultations', decryptedRecord);

    res.json(filteredRecord);
  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ error: '獲取諮詢記錄失敗' });
  }
});

// 創建諮詢記錄（自動關聯組織並驗證患者權限）
router.post('/', requireAccess('consultations', Operation.CREATE), async (req, res) => {
  try {
    const { patientId, date, type, chiefComplaint, assessment, plan, notes } = req.body;

    if (!patientId || !date) {
      return res.status(400).json({ error: '患者ID和日期為必填欄位' });
    }

    // 🔒 驗證患者是否屬於同一組織
    const patient = await req.tenantQuery.findById('patients', patientId);
    if (!patient) {
      return res.status(400).json({ error: '患者不存在或無權訪問' });
    }

    const now = new Date().toISOString();
    const id = `consultation_${Date.now()}`;

    // 準備資料物件
    const data = {
      id,
      patientId,
      date,
      type: type || null,
      chiefComplaint: chiefComplaint || null,
      assessment: assessment || null,
      plan: plan || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now
    };

    // 加密敏感欄位
    const { data: encryptedData, encrypted } = req.encryptFields(data, SENSITIVE_FIELDS);
    if (encrypted.length > 0) {
      encryptedData._encrypted = JSON.stringify(encrypted);
    }

    // 🔒 使用租戶查詢插入，自動加入 organizationId
    const newRecord = await req.tenantQuery.insert('consultations', encryptedData);

    // 解密後返回給前端
    const decryptedRecord = req.decryptFields(newRecord, SENSITIVE_FIELDS);

    // 根據角色權限過濾欄位
    const filteredRecord = req.filterFields('consultations', decryptedRecord);

    res.status(201).json(filteredRecord);
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ error: '創建諮詢記錄失敗' });
  }
});

// 更新諮詢記錄（自動驗證組織權限）
router.put('/:id', requireAccess('consultations', Operation.UPDATE), async (req, res) => {
  try {
    const { date, type, chiefComplaint, assessment, plan, notes } = req.body;
    const now = new Date().toISOString();

    // 準備資料物件
    const data = {
      date,
      type,
      chiefComplaint: chiefComplaint || null,
      assessment: assessment || null,
      plan: plan || null,
      notes: notes || null,
      updatedAt: now
    };

    // 加密敏感欄位
    const { data: encryptedData, encrypted } = req.encryptFields(data, SENSITIVE_FIELDS);
    if (encrypted.length > 0) {
      encryptedData._encrypted = JSON.stringify(encrypted);
    }

    // 🔒 使用租戶查詢更新，自動驗證 organizationId
    const updatedRecord = await req.tenantQuery.update('consultations', req.params.id, encryptedData);

    if (!updatedRecord) {
      return res.status(404).json({ error: '諮詢記錄不存在或無權訪問' });
    }

    // 解密後返回給前端
    const decryptedRecord = req.decryptFields(updatedRecord, SENSITIVE_FIELDS);

    // 根據角色權限過濾欄位
    const filteredRecord = req.filterFields('consultations', decryptedRecord);

    res.json(filteredRecord);
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ error: '更新諮詢記錄失敗' });
  }
});

// 刪除諮詢記錄（自動驗證組織權限）
router.delete('/:id', requireAccess('consultations', Operation.DELETE), async (req, res) => {
  try {
    // 🔒 使用租戶查詢刪除，自動驗證 organizationId
    const success = await req.tenantQuery.delete('consultations', req.params.id);

    if (!success) {
      return res.status(404).json({ error: '諮詢記錄不存在或無權訪問' });
    }

    res.json({ success: true, message: '諮詢記錄已刪除' });
  } catch (error) {
    console.error('Delete consultation error:', error);
    res.status(500).json({ error: '刪除諮詢記錄失敗' });
  }
});

module.exports = router;
