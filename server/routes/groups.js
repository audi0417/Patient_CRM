/**
 * Groups API Routes
 *
 * 病患群組管理端點
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenantContext');
const { queryOne, queryAll, execute } = require('../database/helpers');

// 獲取所有群組
router.get('/', authenticateToken, requireTenant, async (req, res) => {
  try {
    const groups = await queryAll(`
      SELECT * FROM groups
      WHERE organizationId = ?
      ORDER BY createdAt DESC
    `, [req.tenantContext.organizationId]);

    // 解析 patientIds (JSON 字串轉陣列)
    const parsedGroups = groups.map(group => ({
      ...group,
      patientIds: group.patientIds ? JSON.parse(group.patientIds) : []
    }));

    res.json(parsedGroups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: '獲取群組列表失敗' });
  }
});

// 獲取單一群組
router.get('/:id', authenticateToken, requireTenant, async (req, res) => {
  try {
    const group = await queryOne(`
      SELECT * FROM groups
      WHERE id = ? AND organizationId = ?
    `, [req.params.id, req.tenantContext.organizationId]);

    if (!group) {
      return res.status(404).json({ error: '群組不存在' });
    }

    // 解析 patientIds
    group.patientIds = group.patientIds ? JSON.parse(group.patientIds) : [];

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: '獲取群組失敗' });
  }
});

// 建立群組
router.post('/', authenticateToken, requireTenant, async (req, res) => {
  try {
    const { name, description, color, patientIds } = req.body;

    // 驗證必填欄位
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '群組名稱為必填' });
    }

    if (!color || !color.trim()) {
      return res.status(400).json({ error: '顏色為必填' });
    }

    const now = new Date().toISOString();
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await execute(`
      INSERT INTO groups (
        id, name, description, color, patientIds,
        organizationId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name.trim(),
      description?.trim() || null,
      color.trim(),
      JSON.stringify(patientIds || []),
      req.tenantContext.organizationId,
      now,
      now
    ]);

    const newGroup = await queryOne('SELECT * FROM groups WHERE id = ?', [id]);
    newGroup.patientIds = JSON.parse(newGroup.patientIds);

    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: '建立群組失敗' });
  }
});

// 更新群組
router.put('/:id', authenticateToken, requireTenant, async (req, res) => {
  try {
    const { name, description, color, patientIds } = req.body;

    // 檢查群組是否存在
    const existing = await queryOne(`
      SELECT id FROM groups
      WHERE id = ? AND organizationId = ?
    `, [req.params.id, req.tenantContext.organizationId]);

    if (!existing) {
      return res.status(404).json({ error: '群組不存在' });
    }

    // 驗證必填欄位
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: '群組名稱不能為空' });
    }

    const now = new Date().toISOString();

    await execute(`
      UPDATE groups
      SET name = COALESCE(?, name),
          description = ?,
          color = COALESCE(?, color),
          patientIds = COALESCE(?, patientIds),
          updatedAt = ?
      WHERE id = ? AND organizationId = ?
    `, [
      name?.trim(),
      description !== undefined ? (description?.trim() || null) : undefined,
      color?.trim(),
      patientIds !== undefined ? JSON.stringify(patientIds) : undefined,
      now,
      req.params.id,
      req.tenantContext.organizationId
    ]);

    const updated = await queryOne('SELECT * FROM groups WHERE id = ?', [req.params.id]);
    updated.patientIds = JSON.parse(updated.patientIds);

    res.json(updated);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: '更新群組失敗' });
  }
});

// 刪除群組
router.delete('/:id', authenticateToken, requireTenant, async (req, res) => {
  try {
    const result = await execute(`
      DELETE FROM groups
      WHERE id = ? AND organizationId = ?
    `, [req.params.id, req.tenantContext.organizationId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '群組不存在' });
    }

    res.json({ success: true, message: '群組已刪除' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: '刪除群組失敗' });
  }
});

module.exports = router;
