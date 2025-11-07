const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 獲取健康目標
router.get('/', (req, res) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM goals';
    let params = [];

    if (patientId) {
      query += ' WHERE patientId = ?';
      params.push(patientId);
    }

    query += ' ORDER BY createdAt DESC';

    const goals = db.prepare(query).all(...params);

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

// 獲取單個目標
router.get('/:id', (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);

    if (!goal) {
      return res.status(404).json({ error: '目標不存在' });
    }

    goal.milestones = goal.milestones ? JSON.parse(goal.milestones) : [];

    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: '獲取目標失敗' });
  }
});

// 創建目標
router.post('/', (req, res) => {
  try {
    const { patientId, category, title, description, currentValue, targetValue, unit, startDate, targetDate, status, progress, milestones } = req.body;

    const now = new Date().toISOString();
    const id = `goal_${Date.now()}`;

    db.prepare(`
      INSERT INTO goals (id, patientId, category, title, description, currentValue, targetValue, unit, startDate, targetDate, status, progress, milestones, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, patientId, category, title, description || null, currentValue || null, targetValue, unit || null,
      startDate, targetDate || null, status || 'active', progress || 0, JSON.stringify(milestones || []),
      now, now
    );

    const newGoal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    newGoal.milestones = JSON.parse(newGoal.milestones);

    res.status(201).json(newGoal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: '創建目標失敗' });
  }
});

// 更新目標
router.put('/:id', (req, res) => {
  try {
    const { title, description, currentValue, targetValue, unit, targetDate, status, progress, milestones } = req.body;
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE goals
      SET title = ?, description = ?, currentValue = ?, targetValue = ?, unit = ?, targetDate = ?, status = ?, progress = ?, milestones = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      title, description, currentValue, targetValue, unit, targetDate, status, progress,
      JSON.stringify(milestones || []), now, req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '目標不存在' });
    }

    const updatedGoal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    updatedGoal.milestones = JSON.parse(updatedGoal.milestones);

    res.json(updatedGoal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: '更新目標失敗' });
  }
});

// 更新目標進度
router.post('/:id/update-progress', (req, res) => {
  try {
    const { currentValue } = req.body;
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);

    if (!goal) {
      return res.status(404).json({ error: '目標不存在' });
    }

    // 計算進度百分比
    const range = goal.targetValue - goal.currentValue;
    const progress = range === 0 ? 100 : Math.min(100, Math.max(0, ((currentValue - goal.currentValue) / range) * 100));

    const now = new Date().toISOString();

    db.prepare('UPDATE goals SET currentValue = ?, progress = ?, updatedAt = ? WHERE id = ?')
      .run(currentValue, Math.round(progress), now, req.params.id);

    const updatedGoal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    updatedGoal.milestones = JSON.parse(updatedGoal.milestones);

    res.json(updatedGoal);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: '更新進度失敗' });
  }
});

// 刪除目標
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '目標不存在' });
    }

    res.json({ success: true, message: '目標已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除目標失敗' });
  }
});

module.exports = router;
