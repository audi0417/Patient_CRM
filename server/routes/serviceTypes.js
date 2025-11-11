const express = require('express');
const router = express.Router();
const { queryOne, queryAll, execute, transaction } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 獲取所有服務類別 (包含停用的)
router.get('/', async (req, res) => {
  try {
    const serviceTypes = await queryAll('SELECT * FROM service_types ORDER BY displayOrder ASC, createdAt ASC');
    res.json(serviceTypes);
  } catch (error) {
    console.error('Get service types error:', error);
    res.status(500).json({ error: '獲取服務類別列表失敗' });
  }
});

// 獲取啟用的服務類別
router.get('/active', async (req, res) => {
  try {
    const serviceTypes = await queryAll('SELECT * FROM service_types WHERE isActive = 1 ORDER BY displayOrder ASC, createdAt ASC');
    res.json(serviceTypes);
  } catch (error) {
    console.error('Get active service types error:', error);
    res.status(500).json({ error: '獲取啟用服務類別失敗' });
  }
});

// 獲取單個服務類別
router.get('/:id', async (req, res) => {
  try {
    const serviceType = await queryOne('SELECT * FROM service_types WHERE id = ?', [req.params.id]);

    if (!serviceType) {
      return res.status(404).json({ error: '服務類別不存在' });
    }

    res.json(serviceType);
  } catch (error) {
    console.error('Get service type error:', error);
    res.status(500).json({ error: '獲取服務類別失敗' });
  }
});

// 創建服務類別
router.post('/', async (req, res) => {
  try {
    const { name, description, color, displayOrder } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: '服務類別名稱和顏色為必填欄位' });
    }

    // 檢查名稱是否已存在
    const existing = await queryOne('SELECT id FROM service_types WHERE name = ?', [name]);
    if (existing) {
      return res.status(400).json({ error: '此服務類別名稱已存在' });
    }

    const now = new Date().toISOString();
    const id = `service_type_${Date.now()}`;

    await execute(`
      INSERT INTO service_types (id, name, description, color, isActive, displayOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name,
      description || null,
      color,
      1, // 預設為啟用
      displayOrder || 0,
      now,
      now
    ]);

    const newServiceType = await queryOne('SELECT * FROM service_types WHERE id = ?', [id]);
    res.status(201).json(newServiceType);
  } catch (error) {
    console.error('Create service type error:', error);
    res.status(500).json({ error: '創建服務類別失敗' });
  }
});

// 更新服務類別
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, isActive, displayOrder } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: '服務類別名稱和顏色為必填欄位' });
    }

    // 檢查名稱是否與其他服務類別重複
    const existing = await queryOne('SELECT id FROM service_types WHERE name = ? AND id != ?', [name, req.params.id]);
    if (existing) {
      return res.status(400).json({ error: '此服務類別名稱已存在' });
    }

    const now = new Date().toISOString();

    const result = await execute(`
      UPDATE service_types
      SET name = ?, description = ?, color = ?, isActive = ?, displayOrder = ?, updatedAt = ?
      WHERE id = ?
    `, [
      name,
      description || null,
      color,
      isActive !== undefined ? isActive : 1,
      displayOrder || 0,
      now,
      req.params.id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '服務類別不存在' });
    }

    const updatedServiceType = await queryOne('SELECT * FROM service_types WHERE id = ?', [req.params.id]);
    res.json(updatedServiceType);
  } catch (error) {
    console.error('Update service type error:', error);
    res.status(500).json({ error: '更新服務類別失敗' });
  }
});

// 刪除服務類別
router.delete('/:id', async (req, res) => {
  try {
    // 檢查是否有預約使用此服務類別
    const usageCount = await queryOne('SELECT COUNT(*) as count FROM appointments WHERE type = (SELECT name FROM service_types WHERE id = ?)', [req.params.id]);

    if (usageCount.count > 0) {
      return res.status(400).json({
        error: '無法刪除此服務類別',
        message: `目前有 ${usageCount.count} 個預約使用此服務類別，請先處理這些預約或改為停用此服務類別`
      });
    }

    const result = await execute('DELETE FROM service_types WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '服務類別不存在' });
    }

    res.json({ message: '服務類別已刪除' });
  } catch (error) {
    console.error('Delete service type error:', error);
    res.status(500).json({ error: '刪除服務類別失敗' });
  }
});

// 批次更新排序順序
router.put('/batch/reorder', async (req, res) => {
  try {
    const { items } = req.body; // items: [{ id, displayOrder }, ...]

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: '請提供有效的排序資料' });
    }

    const now = new Date().toISOString();

    // 使用 transaction 確保批次更新的原子性
    await transaction(async (dbAdapter) => {
      for (const item of items) {
        await dbAdapter.execute('UPDATE service_types SET displayOrder = ?, updatedAt = ? WHERE id = ?', [item.displayOrder, now, item.id]);
      }
    });

    const updatedServiceTypes = await queryAll('SELECT * FROM service_types ORDER BY displayOrder ASC, createdAt ASC');
    res.json(updatedServiceTypes);
  } catch (error) {
    console.error('Reorder service types error:', error);
    res.status(500).json({ error: '更新排序失敗' });
  }
});

module.exports = router;
