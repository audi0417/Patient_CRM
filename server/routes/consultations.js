const express = require('express');
const router = express.Router();
const { queryOne, queryAll, execute } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');
const encryptionMiddleware = require('../middleware/encryptionMiddleware');
const { accessControlMiddleware, requireAccess, Operation } = require('../middleware/accessControl');

// 定義需要加密的敏感欄位
const SENSITIVE_FIELDS = ['chiefComplaint', 'assessment', 'plan', 'notes'];

router.use(authenticateToken);
router.use(encryptionMiddleware); // 加密中介層
router.use(accessControlMiddleware); // 存取控制中介層
// 諮詢記錄不需要模組保護（未使用模組化）

// 獲取諮詢記錄
router.get('/', requireAccess('consultations', Operation.READ), async (req, res) => {
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

// 根據 ID 獲取諮詢記錄
router.get('/:id', async (req, res) => {
  try {
    const record = await queryOne('SELECT * FROM consultations WHERE id = ?', [req.params.id]);

    if (!record) {
      return res.status(404).json({ error: '諮詢記錄不存在' });
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

// 創建諮詢記錄
router.post('/', async (req, res) => {
  try {
    const { patientId, date, type, chiefComplaint, assessment, plan, notes } = req.body;

    if (!patientId || !date) {
      return res.status(400).json({ error: '患者ID和日期為必填欄位' });
    }

    const now = new Date().toISOString();
    const id = `consultation_${Date.now()}`;

    // 準備資料物件
    const data = {
      chiefComplaint: chiefComplaint || null,
      assessment: assessment || null,
      plan: plan || null,
      notes: notes || null
    };

    // 加密敏感欄位
    const { data: encryptedData, encrypted } = req.encryptFields(data, SENSITIVE_FIELDS);

    await execute(`
      INSERT INTO consultations (id, patientId, date, type, chiefComplaint, assessment, plan, notes, _encrypted, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      patientId,
      date,
      type || null,
      encryptedData.chiefComplaint,
      encryptedData.assessment,
      encryptedData.plan,
      encryptedData.notes,
      encrypted.length > 0 ? JSON.stringify(encrypted) : null,
      now,
      now
    ]);

    const newRecord = await queryOne('SELECT * FROM consultations WHERE id = ?', [id]);

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

// 更新諮詢記錄
router.put('/:id', async (req, res) => {
  try {
    const { date, type, chiefComplaint, assessment, plan, notes } = req.body;
    const now = new Date().toISOString();

    // 準備資料物件
    const data = {
      chiefComplaint: chiefComplaint || null,
      assessment: assessment || null,
      plan: plan || null,
      notes: notes || null
    };

    // 加密敏感欄位
    const { data: encryptedData, encrypted } = req.encryptFields(data, SENSITIVE_FIELDS);

    const result = await execute(`
      UPDATE consultations
      SET date = ?, type = ?, chiefComplaint = ?, assessment = ?, plan = ?, notes = ?, _encrypted = ?, updatedAt = ?
      WHERE id = ?
    `, [
      date,
      type || null,
      encryptedData.chiefComplaint,
      encryptedData.assessment,
      encryptedData.plan,
      encryptedData.notes,
      encrypted.length > 0 ? JSON.stringify(encrypted) : null,
      now,
      req.params.id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '諮詢記錄不存在' });
    }

    const updatedRecord = await queryOne('SELECT * FROM consultations WHERE id = ?', [req.params.id]);

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
