const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queryOne, queryAll, execute } = require('../database/helpers');
const { authenticateToken } = require('../middleware/auth');
const { requireModule } = require('../middleware/moduleAccess');
const ExcelJS = require('exceljs');

router.use(authenticateToken);

// 營養數據相關路由需要 healthManagement 模組
router.use(requireModule('healthManagement'));

// ===== 體組成記錄 =====

// 導出體組成記錄為 Excel（需要放在其他路由之前）
router.get('/body-composition/export/excel', async (req, res) => {
  try {
    const { patientId } = req.query;

    // 獲取數據
    let query = `
      SELECT
        bc.*,
        p.name as patientName,
        p.phone as patientPhone
      FROM body_composition bc
      LEFT JOIN patients p ON bc.patientId = p.id
      WHERE 1=1
    `;
    let params = [];

    if (patientId) {
      query += ' AND bc.patientId = ?';
      params.push(patientId);
    }

    query += ' ORDER BY bc.date DESC';

    const records = await queryAll(query, params);

    // 創建 Excel 工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('體組成記錄');

    // 設定欄位
    worksheet.columns = [
      { header: '日期', key: 'date', width: 12 },
      { header: '病患姓名', key: 'patientName', width: 15 },
      { header: '病患電話', key: 'patientPhone', width: 15 },
      { header: '體重(kg)', key: 'weight', width: 10 },
      { header: '身高(cm)', key: 'height', width: 10 },
      { header: '體脂肪(%)', key: 'bodyFat', width: 10 },
      { header: '肌肉量(kg)', key: 'muscleMass', width: 12 },
      { header: 'BMI', key: 'bmi', width: 8 },
      { header: '內臟脂肪', key: 'visceralFat', width: 10 },
      { header: '骨量(kg)', key: 'boneMass', width: 10 },
      { header: '體水分(%)', key: 'bodyWater', width: 10 },
      { header: '基礎代謝率(kcal)', key: 'bmr', width: 15 },
      { header: '備註', key: 'notes', width: 30 }
    ];

    // 設定標題行樣式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 添加數據
    records.forEach(record => {
      worksheet.addRow({
        date: record.date,
        patientName: record.patientName || '',
        patientPhone: record.patientPhone || '',
        weight: record.weight,
        height: record.height,
        bodyFat: record.bodyFat,
        muscleMass: record.muscleMass,
        bmi: record.bmi,
        visceralFat: record.visceralFat,
        boneMass: record.boneMass,
        bodyWater: record.bodyWater,
        bmr: record.bmr,
        notes: record.notes || ''
      });
    });

    // 設定所有數據行的對齊方式
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    // 設定響應頭
    const fileName = `體組成記錄_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    // 輸出到響應
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export body composition error:', error);
    res.status(500).json({ error: '導出體組成記錄失敗' });
  }
});

// 獲取體組成記錄
router.get('/body-composition', async (req, res) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM body_composition';
    let params = [];

    if (patientId) {
      query += ' WHERE patientId = ?';
      params.push(patientId);
    }

    query += ' ORDER BY date DESC';

    const records = await queryAll(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get body composition error:', error);
    res.status(500).json({ error: '獲取體組成記錄失敗' });
  }
});

// 創建體組成記錄
router.post('/body-composition', async (req, res) => {
  try {
    const { patientId, date, weight, height, bodyFat, muscleMass, bmi, visceralFat, boneMass, bodyWater, bmr, notes } = req.body;
    const now = new Date().toISOString();
    const id = `body_comp_${Date.now()}`;

    await execute(`
      INSERT INTO body_composition (id, patientId, date, weight, height, bodyFat, muscleMass, bmi, visceralFat, boneMass, bodyWater, bmr, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, patientId, date, weight || null, height || null, bodyFat || null, muscleMass || null, bmi || null, visceralFat || null, boneMass || null, bodyWater || null, bmr || null, notes || null, now]);

    const newRecord = await queryOne('SELECT * FROM body_composition WHERE id = ?', [id]);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Create body composition error:', error);
    res.status(500).json({ error: '創建體組成記錄失敗' });
  }
});

// 更新體組成記錄
router.put('/body-composition/:id', async (req, res) => {
  try {
    const { date, weight, height, bodyFat, muscleMass, bmi, visceralFat, boneMass, bodyWater, bmr, notes } = req.body;

    const result = await execute(`
      UPDATE body_composition
      SET date = ?, weight = ?, height = ?, bodyFat = ?, muscleMass = ?, bmi = ?, visceralFat = ?, boneMass = ?, bodyWater = ?, bmr = ?, notes = ?
      WHERE id = ?
    `, [date, weight, height, bodyFat, muscleMass, bmi, visceralFat, boneMass, bodyWater, bmr, notes, req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    const updatedRecord = await queryOne('SELECT * FROM body_composition WHERE id = ?', [req.params.id]);
    res.json(updatedRecord);
  } catch (error) {
    console.error('Update body composition error:', error);
    res.status(500).json({ error: '更新記錄失敗' });
  }
});

// 刪除體組成記錄
router.delete('/body-composition/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM body_composition WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '刪除記錄失敗' });
  }
});

// ===== 營養記錄 =====

// 導出營養記錄為 Excel（需要放在其他路由之前）
router.get('/vital-signs/export/excel', async (req, res) => {
  try {
    const { patientId } = req.query;

    // 獲取數據
    let query = `
      SELECT
        vs.*,
        p.name as patientName,
        p.phone as patientPhone
      FROM vital_signs vs
      LEFT JOIN patients p ON vs.patientId = p.id
      WHERE 1=1
    `;
    let params = [];

    if (patientId) {
      query += ' AND vs.patientId = ?';
      params.push(patientId);
    }

    query += ' ORDER BY vs.date DESC';

    const records = await queryAll(query, params);

    // 創建 Excel 工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('營養記錄');

    // 設定欄位
    worksheet.columns = [
      { header: '日期', key: 'date', width: 12 },
      { header: '病患姓名', key: 'patientName', width: 15 },
      { header: '病患電話', key: 'patientPhone', width: 15 },
      { header: '卡路里攝取(kcal)', key: 'bloodPressureSystolic', width: 15 },
      { header: '蛋白質(g)', key: 'bloodPressureDiastolic', width: 15 },
      { header: '碳水化合物(g)', key: 'heartRate', width: 12 },
      { header: '脂肪攝取(g)', key: 'temperature', width: 10 },
      { header: '纖維(g)', key: 'respiratoryRate', width: 15 },
      { header: '水分攝取(ml)', key: 'oxygenSaturation', width: 15 },
      { header: '血糖(mg/dL)', key: 'bloodGlucose', width: 12 },
      { header: '備註', key: 'notes', width: 30 }
    ];

    // 設定標題行樣式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 添加數據
    records.forEach(record => {
      worksheet.addRow({
        date: record.date,
        patientName: record.patientName || '',
        patientPhone: record.patientPhone || '',
        bloodPressureSystolic: record.bloodPressureSystolic,
        bloodPressureDiastolic: record.bloodPressureDiastolic,
        heartRate: record.heartRate,
        temperature: record.temperature,
        respiratoryRate: record.respiratoryRate,
        oxygenSaturation: record.oxygenSaturation,
        bloodGlucose: record.bloodGlucose,
        notes: record.notes || ''
      });
    });

    // 設定所有數據行的對齊方式
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    // 設定響應頭
    const fileName = `營養記錄_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    // 輸出到響應
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export vital signs error:', error);
    res.status(500).json({ error: '更新營養記錄失敗' });
  }
});

// 獲取營養記錄
router.get('/vital-signs', async (req, res) => {
  try {
    const { patientId } = req.query;
    let query = 'SELECT * FROM vital_signs';
    let params = [];

    if (patientId) {
      query += ' WHERE patientId = ?';
      params.push(patientId);
    }

    query += ' ORDER BY date DESC';

    const records = await queryAll(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get vital signs error:', error);
    res.status(500).json({ error: '獲取營養記錄失敗' });
  }
});

// 創建營養記錄
router.post('/vital-signs', async (req, res) => {
  try {
    const { patientId, date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes } = req.body;
    const now = new Date().toISOString();
    const id = `vital_signs_${Date.now()}`;

    await execute(`
      INSERT INTO vital_signs (id, patientId, date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, patientId, date, bloodPressureSystolic || null, bloodPressureDiastolic || null, heartRate || null, temperature || null, respiratoryRate || null, oxygenSaturation || null, bloodGlucose || null, notes || null, now]);

    const newRecord = await queryOne('SELECT * FROM vital_signs WHERE id = ?', [id]);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Create vital signs error:', error);
    res.status(500).json({ error: '創建營養記錄失敗' });
  }
});

// 更新營養記錄
router.put('/vital-signs/:id', async (req, res) => {
  try {
    const { date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes } = req.body;

    const result = await execute(`
      UPDATE vital_signs
      SET date = ?, bloodPressureSystolic = ?, bloodPressureDiastolic = ?, heartRate = ?, temperature = ?, respiratoryRate = ?, oxygenSaturation = ?, bloodGlucose = ?, notes = ?
      WHERE id = ?
    `, [date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, respiratoryRate, oxygenSaturation, bloodGlucose, notes, req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    const updatedRecord = await queryOne('SELECT * FROM vital_signs WHERE id = ?', [req.params.id]);
    res.json(updatedRecord);
  } catch (error) {
    console.error('Update vital signs error:', error);
    res.status(500).json({ error: '更新記錄失敗' });
  }
});

// 刪除營養記錄
router.delete('/vital-signs/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM vital_signs WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '刪除記錄失敗' });
  }
});

module.exports = router;
