const express = require('express');
const router = express.Router();
const { queryOne, queryAll, execute, transaction } = require('../database/helpers');
const { authenticateToken, checkRole } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * 生成方案編號
 * 格式: PKG-YYYYMMDD-序號
 */
async function generatePackageNumber(organizationId) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PKG-${dateStr}-`;

  // 查找今天已建立的方案數量
  const count = await queryOne(
    `SELECT COUNT(*) as count FROM treatment_packages
     WHERE organizationId = ? AND packageNumber LIKE ?`,
    [organizationId, `${prefix}%`]
  );

  const sequence = (count?.count || 0) + 1;
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

// 獲取所有療程方案（支援篩選）
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { patientId, status, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM treatment_packages WHERE organizationId = ?';
    const params = [organizationId];

    if (patientId) {
      sql += ' AND patientId = ?';
      params.push(patientId);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (startDate) {
      sql += ' AND createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND createdAt <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY createdAt DESC';

    const packages = await queryAll(sql, params);

    // 解析 JSON items 欄位
    const packagesWithItems = packages.map(pkg => ({
      ...pkg,
      items: JSON.parse(pkg.items || '[]')
    }));

    res.json(packagesWithItems);
  } catch (error) {
    console.error('Get treatment packages error:', error);
    res.status(500).json({ error: '獲取療程方案列表失敗' });
  }
});

// 獲取某病患的所有療程方案
router.get('/patient/:patientId', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { patientId } = req.params;

    // 檢查病患是否存在且屬於此組織
    const patient = await queryOne(
      'SELECT id FROM patients WHERE id = ? AND organizationId = ?',
      [patientId, organizationId]
    );

    if (!patient) {
      return res.status(404).json({ error: '病患不存在' });
    }

    const packages = await queryAll(
      'SELECT * FROM treatment_packages WHERE patientId = ? AND organizationId = ? ORDER BY createdAt DESC',
      [patientId, organizationId]
    );

    const packagesWithItems = packages.map(pkg => ({
      ...pkg,
      items: JSON.parse(pkg.items || '[]')
    }));

    res.json(packagesWithItems);
  } catch (error) {
    console.error('Get patient packages error:', error);
    res.status(500).json({ error: '獲取病患療程方案失敗' });
  }
});

// 獲取單個療程方案（含使用記錄）
router.get('/:id', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const pkg = await queryOne(
      'SELECT * FROM treatment_packages WHERE id = ? AND organizationId = ?',
      [req.params.id, organizationId]
    );

    if (!pkg) {
      return res.status(404).json({ error: '療程方案不存在' });
    }

    // 解析 items
    pkg.items = JSON.parse(pkg.items || '[]');

    // 獲取病患姓名
    const patient = await queryOne(
      'SELECT name FROM patients WHERE id = ? AND organizationId = ?',
      [pkg.patientId, organizationId]
    );

    // 獲取使用記錄
    const usageLogs = await queryAll(
      `SELECT ul.*, si.name as serviceName, si.unit, u.name as performedByName
       FROM package_usage_logs ul
       LEFT JOIN service_items si ON ul.serviceItemId = si.id
       LEFT JOIN users u ON ul.performedBy = u.id
       WHERE ul.packageId = ? AND ul.organizationId = ?
       ORDER BY ul.usageDate DESC, ul.createdAt DESC`,
      [req.params.id, organizationId]
    );

    res.json({
      ...pkg,
      patientName: patient?.name || '未知病患',
      usageLogs
    });
  } catch (error) {
    console.error('Get package detail error:', error);
    res.status(500).json({ error: '獲取療程方案詳情失敗' });
  }
});

// 創建療程方案
router.post('/', async (req, res) => {
  try {
    const { patientId, packageName, items, startDate, expiryDate, notes } = req.body;
    const organizationId = req.user.organizationId;

    // 驗證必填欄位
    if (!patientId || !packageName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '請提供完整的方案資訊' });
    }

    // 檢查病患是否存在
    const patient = await queryOne(
      'SELECT id FROM patients WHERE id = ? AND organizationId = ?',
      [patientId, organizationId]
    );
    if (!patient) {
      return res.status(404).json({ error: '病患不存在' });
    }

    // 驗證所有服務項目
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName || !item.itemName.trim() || !item.totalQuantity || item.totalQuantity <= 0) {
        return res.status(400).json({ error: '服務項目資料不完整' });
      }

      // 使用自由輸入的項目名稱
      item.serviceName = item.itemName.trim();
      item.unit = '次'; // 預設單位
      item.usedQuantity = 0; // 初始化已使用數量
      // 為每個項目生成唯一 ID（使用索引，從 1 開始）
      item.serviceItemId = i + 1;

      // 移除 itemName 欄位，只保留 serviceName
      delete item.itemName;
    }

    // 生成方案編號
    const packageNumber = await generatePackageNumber(organizationId);

    const now = new Date().toISOString();

    const result = await execute(`
      INSERT INTO treatment_packages
      (organizationId, patientId, packageName, packageNumber, items, startDate, expiryDate, status, notes, createdBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      organizationId,
      patientId,
      packageName,
      packageNumber,
      JSON.stringify(items),
      startDate || now.slice(0, 10),
      expiryDate || null,
      'active',
      notes || null,
      req.user.id,
      now,
      now
    ]);

    const newPackage = await queryOne('SELECT * FROM treatment_packages WHERE id = ?', [result.lastID]);
    newPackage.items = JSON.parse(newPackage.items);

    res.status(201).json(newPackage);
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: '創建療程方案失敗' });
  }
});

// 更新療程方案
router.put('/:id', async (req, res) => {
  try {
    const { packageName, items, startDate, expiryDate, status, notes } = req.body;
    const organizationId = req.user.organizationId;

    // 檢查方案是否存在
    const existingPackage = await queryOne(
      'SELECT * FROM treatment_packages WHERE id = ? AND organizationId = ?',
      [req.params.id, organizationId]
    );

    if (!existingPackage) {
      return res.status(404).json({ error: '療程方案不存在' });
    }

    // 如果已完成或已取消，不允許修改項目
    if ((existingPackage.status === 'completed' || existingPackage.status === 'cancelled') && items) {
      return res.status(400).json({ error: '已完成或已取消的方案不可修改項目' });
    }

    let updateFields = [];
    let updateParams = [];

    if (packageName !== undefined) {
      updateFields.push('packageName = ?');
      updateParams.push(packageName);
    }

    if (items !== undefined) {
      // 驗證所有服務項目
      for (const item of items) {
        const serviceItem = await queryOne(
          'SELECT id, name, unit FROM service_items WHERE id = ? AND organizationId = ?',
          [item.serviceItemId, organizationId]
        );

        if (!serviceItem) {
          return res.status(404).json({ error: `服務項目 ID ${item.serviceItemId} 不存在` });
        }

        // 補充服務項目資訊（保留原有的 usedQuantity）
        item.serviceName = serviceItem.name;
        item.unit = serviceItem.unit;
      }

      updateFields.push('items = ?');
      updateParams.push(JSON.stringify(items));
    }

    if (startDate !== undefined) {
      updateFields.push('startDate = ?');
      updateParams.push(startDate);
    }

    if (expiryDate !== undefined) {
      updateFields.push('expiryDate = ?');
      updateParams.push(expiryDate);
    }

    if (status !== undefined) {
      if (!['active', 'suspended', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: '無效的狀態' });
      }
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateParams.push(notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '沒有可更新的欄位' });
    }

    const now = new Date().toISOString();
    updateFields.push('updatedAt = ?');
    updateParams.push(now);

    updateParams.push(req.params.id, organizationId);

    await execute(
      `UPDATE treatment_packages SET ${updateFields.join(', ')} WHERE id = ? AND organizationId = ?`,
      updateParams
    );

    const updatedPackage = await queryOne('SELECT * FROM treatment_packages WHERE id = ?', [req.params.id]);
    updatedPackage.items = JSON.parse(updatedPackage.items);

    res.json(updatedPackage);
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: '更新療程方案失敗' });
  }
});

// 刪除療程方案
router.delete('/:id', checkRole('super_admin', 'admin'), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const result = await execute(
      'DELETE FROM treatment_packages WHERE id = ? AND organizationId = ?',
      [req.params.id, organizationId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '療程方案不存在' });
    }

    res.json({ message: '療程方案已刪除' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: '刪除療程方案失敗' });
  }
});

// 執行療程（核銷次數）
router.post('/:id/execute', async (req, res) => {
  try {
    const { serviceItemId, quantity, usageDate, performedBy, notes, appointmentId } = req.body;
    const organizationId = req.user.organizationId;
    const packageId = req.params.id;

    // 驗證必填欄位
    if (serviceItemId === undefined || serviceItemId === null || !quantity || quantity <= 0 || !usageDate) {
      return res.status(400).json({
        error: '請提供完整的執行資訊',
        missing: {
          serviceItemId: !serviceItemId,
          quantity: !quantity || quantity <= 0,
          usageDate: !usageDate
        }
      });
    }

    // 檢查方案是否存在
    const pkg = await queryOne(
      'SELECT * FROM treatment_packages WHERE id = ? AND organizationId = ?',
      [packageId, organizationId]
    );

    if (!pkg) {
      return res.status(404).json({ error: '療程方案不存在' });
    }

    // 檢查方案狀態
    if (pkg.status !== 'active') {
      return res.status(400).json({ error: '只能執行進行中的療程方案' });
    }

    // 檢查是否過期
    if (pkg.expiryDate && new Date(pkg.expiryDate) < new Date()) {
      return res.status(400).json({ error: '療程方案已過期' });
    }

    // 解析項目
    const items = JSON.parse(pkg.items || '[]');
    const itemIndex = items.findIndex(i => i.serviceItemId == serviceItemId);

    if (itemIndex === -1) {
      return res.status(400).json({ error: '此方案不包含該服務項目' });
    }

    const item = items[itemIndex];

    // 檢查剩餘次數
    const remainingQuantity = item.totalQuantity - (item.usedQuantity || 0);
    if (quantity > remainingQuantity) {
      return res.status(400).json({
        error: `超過可用次數（剩餘 ${remainingQuantity} ${item.unit}）`
      });
    }

    // 使用 Transaction 確保一致性
    const result = await transaction(async (dbAdapter) => {
      // 1. 更新方案的 usedQuantity
      item.usedQuantity = (item.usedQuantity || 0) + parseFloat(quantity);
      items[itemIndex] = item;

      await dbAdapter.execute(
        'UPDATE treatment_packages SET items = ?, updatedAt = ? WHERE id = ? AND organizationId = ?',
        [JSON.stringify(items), new Date().toISOString(), packageId, organizationId]
      );

      // 2. 新增執行記錄
      const logResult = await dbAdapter.execute(`
        INSERT INTO package_usage_logs
        (organizationId, packageId, serviceItemId, usageDate, quantity, performedBy, notes, appointmentId, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        organizationId,
        packageId,
        serviceItemId,
        usageDate,
        quantity,
        performedBy || null,
        notes || null,
        appointmentId || null,
        req.user.id,
        new Date().toISOString()
      ]);

      // 3. 檢查是否全部用完，自動設為 completed
      const allCompleted = items.every(i => (i.usedQuantity || 0) >= i.totalQuantity);
      if (allCompleted) {
        await dbAdapter.execute(
          'UPDATE treatment_packages SET status = ?, updatedAt = ? WHERE id = ? AND organizationId = ?',
          ['completed', new Date().toISOString(), packageId, organizationId]
        );
      }

      return logResult;
    });

    // 獲取新增的記錄
    const newLog = await queryOne('SELECT * FROM package_usage_logs WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: '療程執行記錄已建立',
      log: newLog,
      remainingQuantity: item.totalQuantity - item.usedQuantity
    });
  } catch (error) {
    console.error('Execute package error:', error);
    res.status(500).json({ error: '執行療程失敗' });
  }
});

// 獲取使用記錄
router.get('/:id/usage-logs', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const usageLogs = await queryAll(
      `SELECT ul.*, si.name as serviceName, si.unit, u.name as performedByName
       FROM package_usage_logs ul
       LEFT JOIN service_items si ON ul.serviceItemId = si.id
       LEFT JOIN users u ON ul.performedBy = u.id
       WHERE ul.packageId = ? AND ul.organizationId = ?
       ORDER BY ul.usageDate DESC, ul.createdAt DESC`,
      [req.params.id, organizationId]
    );

    res.json(usageLogs);
  } catch (error) {
    console.error('Get usage logs error:', error);
    res.status(500).json({ error: '獲取使用記錄失敗' });
  }
});

// 刪除執行記錄（需要 admin 權限）
router.delete('/:id/usage-logs/:logId', checkRole('super_admin', 'admin'), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id: packageId, logId } = req.params;

    // 獲取記錄資訊
    const log = await queryOne(
      'SELECT * FROM package_usage_logs WHERE id = ? AND packageId = ? AND organizationId = ?',
      [logId, packageId, organizationId]
    );

    if (!log) {
      return res.status(404).json({ error: '執行記錄不存在' });
    }

    // 使用 Transaction 確保一致性
    await transaction(async (dbAdapter) => {
      // 1. 刪除記錄
      await dbAdapter.execute(
        'DELETE FROM package_usage_logs WHERE id = ? AND organizationId = ?',
        [logId, organizationId]
      );

      // 2. 更新方案的 usedQuantity
      const pkg = await dbAdapter.queryOne(
        'SELECT items FROM treatment_packages WHERE id = ? AND organizationId = ?',
        [packageId, organizationId]
      );

      if (pkg) {
        const items = JSON.parse(pkg.items || '[]');
        const itemIndex = items.findIndex(i => i.serviceItemId == log.serviceItemId);

        if (itemIndex !== -1) {
          items[itemIndex].usedQuantity = Math.max(0, (items[itemIndex].usedQuantity || 0) - parseFloat(log.quantity));

          await dbAdapter.execute(
            'UPDATE treatment_packages SET items = ?, status = ?, updatedAt = ? WHERE id = ? AND organizationId = ?',
            [JSON.stringify(items), 'active', new Date().toISOString(), packageId, organizationId]
          );
        }
      }
    });

    res.json({ message: '執行記錄已刪除' });
  } catch (error) {
    console.error('Delete usage log error:', error);
    res.status(500).json({ error: '刪除執行記錄失敗' });
  }
});

// 獲取使用摘要（快速查看剩餘次數）
router.get('/:id/summary', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const pkg = await queryOne(
      'SELECT packageName, items, status, expiryDate FROM treatment_packages WHERE id = ? AND organizationId = ?',
      [req.params.id, organizationId]
    );

    if (!pkg) {
      return res.status(404).json({ error: '療程方案不存在' });
    }

    const items = JSON.parse(pkg.items || '[]');

    const summary = items.map(item => ({
      serviceItemId: item.serviceItemId,
      serviceName: item.serviceName,
      unit: item.unit,
      totalQuantity: item.totalQuantity,
      usedQuantity: item.usedQuantity || 0,
      remainingQuantity: item.totalQuantity - (item.usedQuantity || 0),
      usagePercentage: Math.round(((item.usedQuantity || 0) / item.totalQuantity) * 100)
    }));

    res.json({
      packageName: pkg.packageName,
      status: pkg.status,
      expiryDate: pkg.expiryDate,
      items: summary
    });
  } catch (error) {
    console.error('Get package summary error:', error);
    res.status(500).json({ error: '獲取方案摘要失敗' });
  }
});

module.exports = router;
