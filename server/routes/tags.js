/**
 * Tags API Routes
 *
 * 病患標籤管理端點
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenantContext');
const { queryOne, queryAll, execute } = require('../database/helpers');

// 獲取所有標籤
router.get('/', authenticateToken, requireTenant, async (req, res) => {
  try {
    const tags = await queryAll(`
      SELECT * FROM tags
      WHERE organizationId = ?
      ORDER BY createdAt DESC
    `, [req.tenantContext.organizationId]);

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: '獲取標籤列表失敗' });
  }
});

// 獲取單一標籤
router.get('/:id', authenticateToken, requireTenant, async (req, res) => {
  try {
    const tag = await queryOne(`
      SELECT * FROM tags
      WHERE id = ? AND organizationId = ?
    `, [req.params.id, req.tenantContext.organizationId]);

    if (!tag) {
      return res.status(404).json({ error: '標籤不存在' });
    }

    res.json(tag);
  } catch (error) {
    console.error('Get tag error:', error);
    res.status(500).json({ error: '獲取標籤失敗' });
  }
});

// 建立標籤
router.post('/', authenticateToken, requireTenant, async (req, res) => {
  try {
    const { name, color } = req.body;

    // 驗證必填欄位
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '標籤名稱為必填' });
    }

    if (!color || !color.trim()) {
      return res.status(400).json({ error: '顏色為必填' });
    }

    // 檢查標籤名稱是否已存在
    const existing = await queryOne(`
      SELECT id FROM tags
      WHERE name = ? AND organizationId = ?
    `, [name.trim(), req.tenantContext.organizationId]);

    if (existing) {
      return res.status(400).json({ error: '標籤名稱已存在' });
    }

    const now = new Date().toISOString();
    const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await execute(`
      INSERT INTO tags (
        id, name, color, organizationId, createdAt
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      id,
      name.trim(),
      color.trim(),
      req.tenantContext.organizationId,
      now
    ]);

    const newTag = await queryOne('SELECT * FROM tags WHERE id = ?', [id]);

    res.status(201).json(newTag);
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: '建立標籤失敗' });
  }
});

// 更新標籤
router.put('/:id', authenticateToken, requireTenant, async (req, res) => {
  try {
    const { name, color } = req.body;

    // 檢查標籤是否存在
    const existing = await queryOne(`
      SELECT id FROM tags
      WHERE id = ? AND organizationId = ?
    `, [req.params.id, req.tenantContext.organizationId]);

    if (!existing) {
      return res.status(404).json({ error: '標籤不存在' });
    }

    // 驗證必填欄位
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: '標籤名稱不能為空' });
    }

    // 檢查新名稱是否與其他標籤衝突
    if (name) {
      const duplicate = await queryOne(`
        SELECT id FROM tags
        WHERE name = ? AND organizationId = ? AND id != ?
      `, [name.trim(), req.tenantContext.organizationId, req.params.id]);

      if (duplicate) {
        return res.status(400).json({ error: '標籤名稱已存在' });
      }
    }

    await execute(`
      UPDATE tags
      SET name = COALESCE(?, name),
          color = COALESCE(?, color)
      WHERE id = ? AND organizationId = ?
    `, [
      name?.trim(),
      color?.trim(),
      req.params.id,
      req.tenantContext.organizationId
    ]);

    const updated = await queryOne('SELECT * FROM tags WHERE id = ?', [req.params.id]);

    res.json(updated);
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: '更新標籤失敗' });
  }
});

// 刪除標籤
router.delete('/:id', authenticateToken, requireTenant, async (req, res) => {
  try {
    const result = await execute(`
      DELETE FROM tags
      WHERE id = ? AND organizationId = ?
    `, [req.params.id, req.tenantContext.organizationId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '標籤不存在' });
    }

    res.json({ success: true, message: '標籤已刪除' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: '刪除標籤失敗' });
  }
});

module.exports = router;
