const express = require('express');
const router = express.Router();
const { queryOne, queryAll, execute, transaction } = require('../database/helpers');
const { authenticateToken, checkRole } = require('../middleware/auth');

router.use(authenticateToken);

// 獲取所有服務項目（包含停用的）
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { category, isActive } = req.query;

    let sql = 'SELECT * FROM service_items WHERE organizationId = ?';
    const params = [organizationId];

    // 篩選條件
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (isActive !== undefined) {
      sql += ' AND isActive = ?';
      params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    sql += ' ORDER BY displayOrder ASC, createdAt ASC';

    const serviceItems = await queryAll(sql, params);
    res.json(serviceItems);
  } catch (error) {
    console.error('Get service items error:', error);
    res.status(500).json({ error: '獲取服務項目列表失敗' });
  }
});

// 獲取所有分類（不重複）
router.get('/categories', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const categories = await queryAll(
      'SELECT DISTINCT category FROM service_items WHERE organizationId = ? AND category IS NOT NULL ORDER BY category',
      [organizationId]
    );
    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: '獲取分類列表失敗' });
  }
});

// 獲取啟用的服務項目
router.get('/active', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const serviceItems = await queryAll(
      'SELECT * FROM service_items WHERE organizationId = ? AND isActive = 1 ORDER BY displayOrder ASC, createdAt ASC',
      [organizationId]
    );
    res.json(serviceItems);
  } catch (error) {
    console.error('Get active service items error:', error);
    res.status(500).json({ error: '獲取啟用服務項目失敗' });
  }
});

// 獲取單個服務項目
router.get('/:id', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const serviceItem = await queryOne(
      'SELECT * FROM service_items WHERE id = ? AND organizationId = ?',
      [req.params.id, organizationId]
    );

    if (!serviceItem) {
      return res.status(404).json({ error: '服務項目不存在' });
    }

    res.json(serviceItem);
  } catch (error) {
    console.error('Get service item error:', error);
    res.status(500).json({ error: '獲取服務項目失敗' });
  }
});

// 創建服務項目
router.post('/', checkRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { code, name, category, unit, description, displayOrder } = req.body;
    const organizationId = req.user.organizationId;

    if (!name) {
      return res.status(400).json({ error: '服務名稱為必填欄位' });
    }

    // 檢查名稱是否已存在（同組織內）
    const existingName = await queryOne(
      'SELECT id FROM service_items WHERE name = ? AND organizationId = ?',
      [name, organizationId]
    );
    if (existingName) {
      return res.status(400).json({ error: '此服務名稱已存在' });
    }

    // 檢查代碼是否已存在（如果有提供）
    if (code) {
      const existingCode = await queryOne(
        'SELECT id FROM service_items WHERE code = ? AND organizationId = ?',
        [code, organizationId]
      );
      if (existingCode) {
        return res.status(400).json({ error: '此服務代碼已存在' });
      }
    }

    const now = new Date().toISOString();

    const result = await execute(`
      INSERT INTO service_items (organizationId, code, name, category, unit, description, isActive, displayOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      organizationId,
      code || null,
      name,
      category || null,
      unit || '次',
      description || null,
      1, // 預設為啟用
      displayOrder || 0,
      now,
      now
    ]);

    const newServiceItem = await queryOne('SELECT * FROM service_items WHERE id = ?', [result.lastID]);
    res.status(201).json(newServiceItem);
  } catch (error) {
    console.error('Create service item error:', error);
    res.status(500).json({ error: '創建服務項目失敗' });
  }
});

// 更新服務項目
router.put('/:id', checkRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { code, name, category, unit, description, isActive, displayOrder } = req.body;
    const organizationId = req.user.organizationId;

    if (!name) {
      return res.status(400).json({ error: '服務名稱為必填欄位' });
    }

    // 檢查服務項目是否存在
    const existing = await queryOne(
      'SELECT id FROM service_items WHERE id = ? AND organizationId = ?',
      [req.params.id, organizationId]
    );
    if (!existing) {
      return res.status(404).json({ error: '服務項目不存在' });
    }

    // 檢查名稱是否與其他項目重複（同組織內）
    const duplicateName = await queryOne(
      'SELECT id FROM service_items WHERE name = ? AND id != ? AND organizationId = ?',
      [name, req.params.id, organizationId]
    );
    if (duplicateName) {
      return res.status(400).json({ error: '此服務名稱已存在' });
    }

    // 檢查代碼是否與其他項目重複（如果有提供）
    if (code) {
      const duplicateCode = await queryOne(
        'SELECT id FROM service_items WHERE code = ? AND id != ? AND organizationId = ?',
        [code, req.params.id, organizationId]
      );
      if (duplicateCode) {
        return res.status(400).json({ error: '此服務代碼已存在' });
      }
    }

    const now = new Date().toISOString();

    const result = await execute(`
      UPDATE service_items
      SET code = ?, name = ?, category = ?, unit = ?, description = ?, isActive = ?, displayOrder = ?, updatedAt = ?
      WHERE id = ? AND organizationId = ?
    `, [
      code || null,
      name,
      category || null,
      unit || '次',
      description || null,
      isActive !== undefined ? (isActive ? 1 : 0) : 1,
      displayOrder || 0,
      now,
      req.params.id,
      organizationId
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '服務項目不存在' });
    }

    const updatedServiceItem = await queryOne('SELECT * FROM service_items WHERE id = ?', [req.params.id]);
    res.json(updatedServiceItem);
  } catch (error) {
    console.error('Update service item error:', error);
    res.status(500).json({ error: '更新服務項目失敗' });
  }
});

// 刪除服務項目
router.delete('/:id', checkRole('super_admin', 'admin'), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // 檢查是否有療程方案使用此服務項目
    const packagesUsingItem = await queryAll(
      'SELECT id, packageName FROM treatment_packages WHERE organizationId = ?',
      [organizationId]
    );

    let usageCount = 0;
    for (const pkg of packagesUsingItem) {
      const items = JSON.parse(pkg.items || '[]');
      if (items.some(item => item.serviceItemId == req.params.id)) {
        usageCount++;
      }
    }

    if (usageCount > 0) {
      return res.status(400).json({
        error: '無法刪除此服務項目',
        message: `目前有 ${usageCount} 個療程方案使用此服務項目，請先處理這些方案或改為停用此服務項目`
      });
    }

    const result = await execute(
      'DELETE FROM service_items WHERE id = ? AND organizationId = ?',
      [req.params.id, organizationId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '服務項目不存在' });
    }

    res.json({ message: '服務項目已刪除' });
  } catch (error) {
    console.error('Delete service item error:', error);
    res.status(500).json({ error: '刪除服務項目失敗' });
  }
});

// 批次更新排序順序
router.put('/batch/reorder', checkRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { items } = req.body; // items: [{ id, displayOrder }, ...]
    const organizationId = req.user.organizationId;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: '請提供有效的排序資料' });
    }

    const now = new Date().toISOString();

    // 使用 transaction 確保批次更新的原子性
    await transaction(async (dbAdapter) => {
      for (const item of items) {
        await dbAdapter.execute(
          'UPDATE service_items SET displayOrder = ?, updatedAt = ? WHERE id = ? AND organizationId = ?',
          [item.displayOrder, now, item.id, organizationId]
        );
      }
    });

    const updatedServiceItems = await queryAll(
      'SELECT * FROM service_items WHERE organizationId = ? ORDER BY displayOrder ASC, createdAt ASC',
      [organizationId]
    );
    res.json(updatedServiceItems);
  } catch (error) {
    console.error('Reorder service items error:', error);
    res.status(500).json({ error: '更新排序失敗' });
  }
});

module.exports = router;
