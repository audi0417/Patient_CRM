const express = require('express');
const router = express.Router();
const { queryOne, queryAll, execute } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');
const { requireTenant, injectTenantQuery, checkSubscriptionExpiry } = require('../middleware/tenantContext');
const { requireModule } = require('../middleware/moduleAccess');

router.use(authenticateToken);
router.use(requireTenant); // 🔒 租户隔离
router.use(checkSubscriptionExpiry); // 🔒 订阅检查
router.use(injectTenantQuery); // 🔒 注入租户查询函数
router.use(requireModule('healthManagement'));

// 獲取健康目標（自動過濾組織）
router.get('/', async (req, res) => {
  try {
    const { patientId } = req.query;
    
    // 🔒 使用租户查询辅助函数，自动过滤 organizationId
    let options = { orderBy: 'createdAt DESC' };
    
    if (patientId) {
      // 🔒 先验证病患是否属于当前组织
      const patient = await req.tenantQuery.findById('patients', patientId);
      if (!patient) {
        return res.status(403).json({ error: '患者不存在或無權訪問' });
      }
      options.where = { patientId };
    }
    
    const goals = await req.tenantQuery.findAll('goals', options);

    // 解析 milestones JSON
    const parsedGoals = goals.map(g => ({
      ...g,
      milestones: g.milestones ? JSON.parse(g.milestones) : []
    }));

    res.json(parsedGoals);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: '獲取目標列表失敗' });
  }
});

// 獲取單個目標（自動驗證組織權限）
router.get('/:id', async (req, res) => {
  try {
    // 🔒 使用租户查询，自动验证是否属于同一组织
    const goal = await req.tenantQuery.findById('goals', req.params.id);

    if (!goal) {
      return res.status(404).json({ error: '目標不存在或無權訪問' });
    }

    goal.milestones = goal.milestones ? JSON.parse(goal.milestones) : [];

    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: '獲取目標失敗' });
  }
});

// 創建目標（自動關聯組織並驗證患者權限）
router.post('/', async (req, res) => {
  try {
    const { patientId, category, title, description, currentValue, targetValue, unit, startDate, targetDate, status, progress, milestones } = req.body;

    // 🔒 验证病患是否属于同一组织
    const patient = await req.tenantQuery.findById('patients', patientId);
    if (!patient) {
      return res.status(400).json({ error: '患者不存在或無權訪問' });
    }

    const now = new Date().toISOString();
    const id = `goal_${Date.now()}`;

    const data = {
      id,
      patientId,
      category,
      title,
      description: description || null,
      currentValue: currentValue || null,
      targetValue,
      unit: unit || null,
      startDate,
      targetDate: targetDate || null,
      status: status || 'active',
      progress: progress || 0,
      milestones: JSON.stringify(milestones || []),
      createdAt: now,
      updatedAt: now
    };

    // 🔒 使用租户查询插入，自动加入 organizationId
    const newGoal = await req.tenantQuery.insert('goals', data);
    newGoal.milestones = JSON.parse(newGoal.milestones);

    res.status(201).json(newGoal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: '創建目標失敗' });
  }
});

// 更新目標（自動驗證組織權限）
router.put('/:id', async (req, res) => {
  try {
    const { title, description, currentValue, targetValue, unit, targetDate, status, progress, milestones } = req.body;
    const now = new Date().toISOString();

    const data = {
      title,
      description,
      currentValue,
      targetValue,
      unit,
      targetDate,
      status,
      progress,
      milestones: JSON.stringify(milestones || []),
      updatedAt: now
    };

    // 🔒 使用租户查询更新，自动验证 organizationId
    const updatedGoal = await req.tenantQuery.update('goals', req.params.id, data);

    if (!updatedGoal) {
      return res.status(404).json({ error: '目標不存在或無權訪問' });
    }

    updatedGoal.milestones = JSON.parse(updatedGoal.milestones);

    res.json(updatedGoal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: '更新目標失敗' });
  }
});

// 更新目標進度（自動驗證組織權限）
router.post('/:id/update-progress', async (req, res) => {
  try {
    const { currentValue } = req.body;
    
    // 🔒 使用租户查询，自动验证是否属于同一组织
    const goal = await req.tenantQuery.findById('goals', req.params.id);

    if (!goal) {
      return res.status(404).json({ error: '目標不存在或無權訪問' });
    }

    // 計算進度百分比
    const range = goal.targetValue - goal.currentValue;
    const progress = range === 0 ? 100 : Math.min(100, Math.max(0, ((currentValue - goal.currentValue) / range) * 100));

    const now = new Date().toISOString();

    const data = {
      currentValue,
      progress: Math.round(progress),
      updatedAt: now
    };

    // 🔒 使用租户查询更新
    const updatedGoal = await req.tenantQuery.update('goals', req.params.id, data);
    updatedGoal.milestones = JSON.parse(updatedGoal.milestones);

    res.json(updatedGoal);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: '更新進度失敗' });
  }
});

// 刪除目標（自動驗證組織權限）
router.delete('/:id', async (req, res) => {
  try {
    // 🔒 使用租户查询删除，自动验证 organizationId
    const success = await req.tenantQuery.delete('goals', req.params.id);

    if (!success) {
      return res.status(404).json({ error: '目標不存在或無權訪問' });
    }

    res.json({ success: true, message: '目標已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除目標失敗' });
  }
});

module.exports = router;
