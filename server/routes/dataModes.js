/**
 * 數據記錄模組 API
 * 
 * 處理組織的數據記錄模式管理：
 * - 獲取可用的數據記錄模式
 * - 組織模式選擇和自定義
 * - SuperAdmin 模式分配管理
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queryOne, queryAll, execute } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');
const { requireTenant, requireSuperAdmin } = require('../middleware/tenantContext');
const { getAllDataModes, getDataModeById } = require('../config/dataModes');

// ===================
// 組織層級 API
// ===================

/**
 * 獲取組織可用的數據模式
 */
router.get('/me/available', authenticateToken, requireTenant, async (req, res) => {
  try {
    const allModes = getAllDataModes();
    res.json(allModes);
  } catch (error) {
    console.error('Get available data modes error:', error);
    res.status(500).json({ error: '獲取可用模式失敗' });
  }
});

/**
 * 獲取組織當前的數據模式設定
 */
router.get('/me/current', authenticateToken, requireTenant, async (req, res) => {
  try {
    const organizationId = req.tenantContext.organizationId;
    
    const org = await queryOne(
      'SELECT settings FROM organizations WHERE id = ?',
      [organizationId]
    );

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    const settings = org.settings ? JSON.parse(org.settings) : {};
    const dataMode = settings.dataMode || null;

    if (!dataMode) {
      return res.json({ 
        modeId: null,
        modeName: null,
        customizations: {}
      });
    }

    const modeConfig = getDataModeById(dataMode.modeId);
    if (!modeConfig) {
      return res.status(404).json({ error: '數據模式不存在' });
    }

    res.json({
      modeId: dataMode.modeId,
      modeName: modeConfig.name,
      customizations: dataMode.customizations || {},
      baseConfig: modeConfig
    });

  } catch (error) {
    console.error('Get current data mode error:', error);
    res.status(500).json({ error: '獲取當前模式失敗' });
  }
});

/**
 * 更新組織的數據模式設定
 */
router.put('/me/current', authenticateToken, requireTenant, async (req, res) => {
  try {
    const organizationId = req.tenantContext.organizationId;
    const { modeId, customizations = {} } = req.body;

    if (!modeId) {
      return res.status(400).json({ error: '請提供模式 ID' });
    }

    const modeConfig = getDataModeById(modeId);
    if (!modeConfig) {
      return res.status(400).json({ error: '無效的數據模式' }); 
    }

    // 獲取當前組織設定
    const org = await queryOne(
      'SELECT settings FROM organizations WHERE id = ?',
      [organizationId]
    );

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    const currentSettings = org.settings ? JSON.parse(org.settings) : {};
    
    // 更新數據模式設定
    currentSettings.dataMode = {
      modeId,
      customizations,
      updatedAt: new Date().toISOString()
    };

    // 儲存更新後的設定
    await execute(
      'UPDATE organizations SET settings = ? WHERE id = ?',
      [JSON.stringify(currentSettings), organizationId]
    );

    res.json({
      success: true,
      message: '數據模式已更新',
      modeId,
      modeName: modeConfig.name,
      customizations
    });

  } catch (error) {
    console.error('Update data mode error:', error);
    res.status(500).json({ error: '更新數據模式失敗' });
  }
});

/**
 * 重置為預設設定
 */
router.post('/me/reset', authenticateToken, requireTenant, async (req, res) => {
  try {
    const organizationId = req.tenantContext.organizationId;
    
    // 獲取當前組織設定
    const org = await queryOne(
      'SELECT settings FROM organizations WHERE id = ?', 
      [organizationId]
    );

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    const currentSettings = org.settings ? JSON.parse(org.settings) : {};
    
    // 如果有設定數據模式，則重置自定義設定
    if (currentSettings.dataMode) {
      currentSettings.dataMode.customizations = {};
      currentSettings.dataMode.updatedAt = new Date().toISOString();

      await execute(
        'UPDATE organizations SET settings = ? WHERE id = ?',
        [JSON.stringify(currentSettings), organizationId]
      );

      const modeConfig = getDataModeById(currentSettings.dataMode.modeId);
      
      res.json({
        success: true,
        message: '已重置為預設設定',
        modeId: currentSettings.dataMode.modeId,
        modeName: modeConfig?.name || '',
        customizations: {}
      });
    } else {
      res.json({
        success: true,
        message: '無需重置',
        modeId: null,
        modeName: null,
        customizations: {}
      });
    }

  } catch (error) {
    console.error('Reset data mode error:', error);
    res.status(500).json({ error: '重置失敗' });
  }
});

// ===================
// SuperAdmin 層級 API
// ===================

/**
 * 獲取所有數據模式（SuperAdmin）
 */
router.get('/admin/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const allModes = getAllDataModes();
    
    // 統計每個模式的使用情況
    const modesWithStats = await Promise.all(
      allModes.map(async (mode) => {
        const usage = await queryOne(`
          SELECT COUNT(*) as organizationCount
          FROM organizations 
          WHERE JSON_EXTRACT(settings, '$.dataMode.modeId') = ?
        `, [mode.id]);

        return {
          ...mode,
          organizationCount: usage?.organizationCount || 0
        };
      })
    );

    res.json(modesWithStats);
  } catch (error) {
    console.error('Get all data modes error:', error);
    res.status(500).json({ error: '獲取數據模式失敗' });
  }
});

/**
 * 獲取數據模式詳細資訊（SuperAdmin）
 */
router.get('/admin/:modeId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { modeId } = req.params;
    
    const modeConfig = getDataModeById(modeId);
    if (!modeConfig) {
      return res.status(404).json({ error: '數據模式不存在' });
    }

    // 獲取使用此模式的組織
    const organizations = await queryAll(`
      SELECT id, name, slug, plan, createdAt
      FROM organizations 
      WHERE JSON_EXTRACT(settings, '$.dataMode.modeId') = ?
    `, [modeId]);

    res.json({
      ...modeConfig,
      organizations: organizations || []
    });
  } catch (error) {
    console.error('Get data mode detail error:', error);
    res.status(500).json({ error: '獲取模式詳情失敗' });
  }
});

/**
 * 為組織分配數據模式（SuperAdmin）
 */
router.post('/admin/assign', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId, modeId } = req.body;

    if (!organizationId || !modeId) {
      return res.status(400).json({ error: '請提供組織 ID 和模式 ID' });
    }

    const modeConfig = getDataModeById(modeId);
    if (!modeConfig) {
      return res.status(400).json({ error: '無效的數據模式' });
    }

    // 檢查組織是否存在
    const org = await queryOne(
      'SELECT id, name, settings FROM organizations WHERE id = ?',
      [organizationId]
    );

    if (!org) {
      return res.status(404).json({ error: '組織不存在' });
    }

    const currentSettings = org.settings ? JSON.parse(org.settings) : {};
    
    // 分配數據模式
    currentSettings.dataMode = {
      modeId,
      customizations: {},
      assignedAt: new Date().toISOString(),
      assignedBy: req.user.id
    };

    await execute(
      'UPDATE organizations SET settings = ? WHERE id = ?',
      [JSON.stringify(currentSettings), organizationId]
    );

    res.json({
      success: true,
      message: `已為組織 "${org.name}" 分配數據模式 "${modeConfig.name}"`
    });

  } catch (error) {
    console.error('Assign data mode error:', error);
    res.status(500).json({ error: '分配數據模式失敗' });
  }
});

/**
 * 獲取數據模式使用統計（SuperAdmin）
 */
router.get('/admin/analytics', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const allModes = getAllDataModes();
    
    const analytics = await Promise.all(
      allModes.map(async (mode) => {
        // 組織統計
        const orgCount = await queryOne(`
          SELECT COUNT(*) as count
          FROM organizations 
          WHERE JSON_EXTRACT(settings, '$.dataMode.modeId') = ?
        `, [mode.id]);

        // 用戶統計
        const userCount = await queryOne(`
          SELECT COUNT(u.id) as count
          FROM users u
          JOIN organizations o ON u.organizationId = o.id
          WHERE JSON_EXTRACT(o.settings, '$.dataMode.modeId') = ?
        `, [mode.id]);

        // 患者統計
        const patientCount = await queryOne(`
          SELECT COUNT(p.id) as count
          FROM patients p
          JOIN organizations o ON p.organizationId = o.id
          WHERE JSON_EXTRACT(o.settings, '$.dataMode.modeId') = ?
        `, [mode.id]);

        // 本月新增組織
        const newOrgs = await queryOne(`
          SELECT COUNT(*) as count
          FROM organizations 
          WHERE JSON_EXTRACT(settings, '$.dataMode.modeId') = ?
            AND DATE(createdAt) >= DATE('now', 'start of month')
        `, [mode.id]);

        return {
          modeId: mode.id,
          modeName: mode.name,
          modeIcon: mode.icon,
          category: mode.category,
          stats: {
            organizations: orgCount?.count || 0,
            users: userCount?.count || 0, 
            patients: patientCount?.count || 0,
            newOrganizationsThisMonth: newOrgs?.count || 0
          }
        };
      })
    );

    res.json({ analytics });
  } catch (error) {
    console.error('Get data mode analytics error:', error);
    res.status(500).json({ error: '獲取使用統計失敗' });
  }
});

module.exports = router;