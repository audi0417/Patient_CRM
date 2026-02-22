# 病患数据隔离安全审计报告

**审计日期**: 2026-02-22  
**审计范围**: 病患数据处理、组织隔离、配额检查  
**严重程度**: 🔴 高危

---

## 执行摘要

系统在病患数据处理方面存在**多处严重的数据隔离漏洞**，可能导致跨组织数据泄露。主要问题包括：
- ✅ **病患CRUD操作** - 隔离正常
- ❌ **咨询记录** - 完全没有组织隔离
- ❌ **邮件服务** - 可以跨组织查询病患姓名
- ⚠️ **其他资源** - 部分查询缺少隔离检查

---

## 🔴 严重漏洞详情

### 1. 咨询记录 (consultations.js) - 完全无隔离
**文件**: `server/routes/consultations.js`  
**严重程度**: 🔴 极高

#### 问题描述
- **未使用** `requireTenant` 中间件
- **未使用** `injectTenantQuery` 辅助函数
- **未检查** `organizationId`
- **任何用户可以访问任何组织的咨询记录**

#### 漏洞位置
```javascript
// Line 16-40: 获取咨询记录 - 无组织过滤
router.get('/', requireAccess('consultations', Operation.READ), async (req, res) => {
  const { patientId } = req.query;
  let query = 'SELECT * FROM consultations';  // ❌ 没有 organizationId 过滤
  let params = [];
  
  if (patientId) {
    query += ' WHERE patientId = ?';  // ❌ 只检查 patientId，不检查组织
    params.push(patientId);
  }
  // ...
});

// Line 43-64: 获取单个咨询记录 - 无组织过滤
router.get('/:id', async (req, res) => {
  const record = await queryOne('SELECT * FROM consultations WHERE id = ?', [req.params.id]);
  // ❌ 任何用户可以访问任何ID的咨询记录
});

// Line 67-120: 创建咨询记录 - 无组织验证
router.post('/', async (req, res) => {
  const { patientId, ... } = req.body;
  // ❌ 没有验证 patientId 是否属于当前组织
  // ❌ 没有自动关联 organizationId
});

// Line 123-167: 更新咨询记录 - 无组织验证
router.put('/:id', async (req, res) => {
  // ❌ 没有验证记录是否属于当前组织
});

// Line 170-184: 删除咨询记录 - 无组织验证
router.delete('/:id', async (req, res) => {
  // ❌ 没有验证记录是否属于当前组织
});
```

#### 影响范围
- 医院A可以读取医院B的所有咨询记录
- 医院A可以修改/删除医院B的咨询记录
- 医院A可以为医院B的病患创建咨询记录

---

### 2. 邮件服务 (email.js) - 跨组织信息泄露
**文件**: `server/routes/email.js`  
**严重程度**: 🔴 高

#### 问题描述
- 查询病患姓名时**未检查** `organizationId`
- 可以通过病患ID获取其他组织的病患姓名

#### 漏洞位置
```javascript
// Line 51, 104, 157, 210: 4处相同漏洞
const patient = await queryOne('SELECT name FROM patients WHERE id = ?', [patientId]);
// ❌ 没有检查 organizationId
// 应该是: WHERE id = ? AND organizationId = ?
```

#### 影响范围
- 医院A可以通过邮件API获取医院B的病患姓名
- 虽然只泄露姓名，但已构成隐私违规

---

### 3. 其他潜在漏洞
**文件**: 多个路由文件  
**严重程度**: ⚠️ 中等

以下查询使用 `WHERE id = ?` 但可能缺少组织隔离验证：

| 文件 | 行号 | 查询内容 | 状态 |
|------|------|----------|------|
| `consultations.js` | 48, 107, 159 | consultations 查询 | ❌ 需修复 |
| `goals.js` | 42, 73, 102, 116, 132 | goals 查询 | ⚠️ 需检查 |
| `groups.js` | 90, 140 | groups 查询 | ⚠️ 需检查 |
| `tags.js` | 87, 140 | tags 查询 | ⚠️ 需检查 |
| `health.js` | 146, 169, 320, 343 | 健康记录查询 | ⚠️ 需检查 |

---

## ✅ 正常工作的部分

### 病患主路由 (patients.js)
**文件**: `server/routes/patients.js`  
**状态**: ✅ 安全

#### 正确实现
```javascript
// ✅ 使用完整的租户中间件链
router.use(authenticateToken);
router.use(requireTenant);
router.use(checkSubscriptionExpiry);
router.use(injectTenantQuery);
router.use(encryptionMiddleware);
router.use(accessControlMiddleware);

// ✅ 使用租户查询辅助函数
router.get('/', requireAccess('patients', Operation.READ), async (req, res) => {
  const patients = await req.tenantQuery.findAll('patients', {
    orderBy: 'updatedAt DESC'
  });  // ✅ 自动过滤 organizationId
});

// ✅ 创建时检查配额
router.post('/', 
  requireAccess('patients', Operation.CREATE), 
  checkTenantQuota('patients'),  // ✅ 检查病患数量上限
  async (req, res) => {
    const newPatient = await req.tenantQuery.insert('patients', data);
    // ✅ 自动注入 organizationId
  }
);

// ✅ 更新/删除时验证权限
router.put('/:id', async (req, res) => {
  const updatedPatient = await req.tenantQuery.update('patients', id, data);
  // ✅ 自动验证 organizationId
});
```

### 配额检查机制
**文件**: `server/middleware/tenantContext.js`  
**状态**: ✅ 正常工作

#### 配额检查实现
```javascript
// Lines 330-370: 病患配额检查
function checkTenantQuota(resourceType) {
  return async (req, res, next) => {
    const { organizationId, limits } = req.tenantContext;
    
    switch (resourceType) {
      case 'patients':
        currentCount = await query.count('patients');  // ✅ 自动过滤组织
        maxLimit = limits.maxPatients;  // ✅ 从组织设置读取
        break;
    }
    
    if (currentCount >= maxLimit) {
      return res.status(403).json({
        error: `已達到 ${resourceType} 數量上限 (${maxLimit})`,
        code: 'QUOTA_EXCEEDED',
        current: currentCount,
        limit: maxLimit
      });  // ✅ 阻止创建
    }
  };
}
```

#### 配额限制
- **免费版**: 100 病患
- **专业版**: 500 病患  
- **企业版**: 99,999 病患

### 预约管理 (appointments.js)
**文件**: `server/routes/appointments.js`  
**状态**: ✅ 大部分安全

```javascript
// ✅ 使用租户中间件
router.use(authenticateToken);
router.use(requireTenant);
router.use(checkSubscriptionExpiry);
router.use(injectTenantQuery);

// ✅ 查询时过滤组织
router.get('/', async (req, res) => {
  const { organizationId } = req.tenantContext;
  let query = 'SELECT * FROM appointments WHERE organizationId = ?';  // ✅
});

// ✅ 创建时验证病患权限
router.post('/', async (req, res) => {
  const patient = await req.tenantQuery.findById('patients', patientId);
  if (!patient) {
    return res.status(400).json({ error: '患者不存在或無權訪問' });
  }  // ✅
});
```

---

## 🛠️ 修复建议

### 优先级 P0 (立即修复)

#### 1. 修复 consultations.js

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTenant, injectTenantQuery, checkSubscriptionExpiry } = require('../middleware/tenantContext');  // ✅ 添加
const encryptionMiddleware = require('../middleware/encryptionMiddleware');
const { accessControlMiddleware, requireAccess, Operation } = require('../middleware/accessControl');

const SENSITIVE_FIELDS = ['chiefComplaint', 'assessment', 'plan', 'notes'];

router.use(authenticateToken);
router.use(requireTenant);  // ✅ 添加
router.use(checkSubscriptionExpiry);  // ✅ 添加
router.use(injectTenantQuery);  // ✅ 添加
router.use(encryptionMiddleware);
router.use(accessControlMiddleware);

// 修复：使用租户查询
router.get('/', requireAccess('consultations', Operation.READ), async (req, res) => {
  try {
    const { patientId } = req.query;
    
    // ✅ 使用租户查询辅助函数
    let options = { orderBy: 'date DESC, createdAt DESC' };
    if (patientId) {
      options.where = { patientId };
    }
    
    const records = await req.tenantQuery.findAll('consultations', options);
    const decryptedRecords = req.decryptObjectArray(records, SENSITIVE_FIELDS);
    const filteredRecords = req.filterFieldsArray('consultations', decryptedRecords);
    
    res.json(filteredRecords);
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ error: '獲取諮詢記錄失敗' });
  }
});

// 修复：验证组织权限
router.get('/:id', requireAccess('consultations', Operation.READ), async (req, res) => {
  try {
    // ✅ 使用租户查询验证权限
    const record = await req.tenantQuery.findById('consultations', req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: '諮詢記錄不存在或無權訪問' });
    }
    
    const decryptedRecord = req.decryptFields(record, SENSITIVE_FIELDS);
    const filteredRecord = req.filterFields('consultations', decryptedRecord);
    
    res.json(filteredRecord);
  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ error: '獲取諮詢記錄失敗' });
  }
});

// 修复：验证病患权限并关联组织
router.post('/', requireAccess('consultations', Operation.CREATE), async (req, res) => {
  try {
    const { patientId, date, type, chiefComplaint, assessment, plan, notes } = req.body;

    if (!patientId || !date) {
      return res.status(400).json({ error: '患者ID和日期為必填欄位' });
    }

    // ✅ 验证病患是否属于当前组织
    const patient = await req.tenantQuery.findById('patients', patientId);
    if (!patient) {
      return res.status(400).json({ error: '患者不存在或無權訪問' });
    }

    const now = new Date().toISOString();
    const id = `consultation_${Date.now()}`;

    const data = {
      id,
      patientId,
      date,
      type: type || null,
      chiefComplaint: chiefComplaint || null,
      assessment: assessment || null,
      plan: plan || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now
    };

    // 加密敏感欄位
    const { data: encryptedData, encrypted } = req.encryptFields(data, SENSITIVE_FIELDS);
    if (encrypted.length > 0) {
      encryptedData._encrypted = JSON.stringify(encrypted);
    }

    // ✅ 使用租户查询自动注入 organizationId
    const newRecord = await req.tenantQuery.insert('consultations', encryptedData);
    
    const decryptedRecord = req.decryptFields(newRecord, SENSITIVE_FIELDS);
    const filteredRecord = req.filterFields('consultations', decryptedRecord);

    res.status(201).json(filteredRecord);
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ error: '創建諮詢記錄失敗' });
  }
});

// 修复：验证组织权限
router.put('/:id', requireAccess('consultations', Operation.UPDATE), async (req, res) => {
  try {
    const { date, type, chiefComplaint, assessment, plan, notes } = req.body;
    const now = new Date().toISOString();

    const data = {
      date,
      type,
      chiefComplaint,
      assessment,
      plan,
      notes,
      updatedAt: now
    };

    // 加密敏感欄位
    const { data: encryptedData, encrypted } = req.encryptFields(data, SENSITIVE_FIELDS);
    if (encrypted.length > 0) {
      encryptedData._encrypted = JSON.stringify(encrypted);
    }

    // ✅ 使用租户查询自动验证 organizationId
    const updatedRecord = await req.tenantQuery.update('consultations', req.params.id, encryptedData);

    if (!updatedRecord) {
      return res.status(404).json({ error: '諮詢記錄不存在或無權訪問' });
    }

    const decryptedRecord = req.decryptFields(updatedRecord, SENSITIVE_FIELDS);
    const filteredRecord = req.filterFields('consultations', decryptedRecord);

    res.json(filteredRecord);
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ error: '更新諮詢記錄失敗' });
  }
});

// 修复：验证组织权限
router.delete('/:id', requireAccess('consultations', Operation.DELETE), async (req, res) => {
  try {
    // ✅ 使用租户查询自动验证 organizationId
    const success = await req.tenantQuery.delete('consultations', req.params.id);

    if (!success) {
      return res.status(404).json({ error: '諮詢記錄不存在或無權訪問' });
    }

    res.json({ success: true, message: '諮詢記錄已刪除' });
  } catch (error) {
    console.error('Delete consultation error:', error);
    res.status(500).json({ error: '刪除諮詢記錄失敗' });
  }
});

module.exports = router;
```

#### 2. 修复 email.js

```javascript
// 修改所有4处病患查询（Line 51, 104, 157, 210）
// 从：
const patient = await queryOne('SELECT name FROM patients WHERE id = ?', [patientId]);

// 改为：使用租户查询
const patient = await req.tenantQuery.findById('patients', patientId);
if (!patient) {
  return res.status(400).json({ error: '患者不存在或無權訪問' });
}
patientName = patient.name || '患者';
```

### 优先级 P1 (本周修复)

#### 3. 检查并修复其他资源

对以下文件进行完整审计：
- `goals.js` - 目标管理
- `groups.js` - 分组管理
- `tags.js` - 标签管理
- `health.js` - 健康记录
- `serviceItems.js` - 服务项目
- `serviceTypes.js` - 服务类型
- `treatmentPackages.js` - 疗程套餐

确保所有路由都：
1. ✅ 使用 `requireTenant` 中间件
2. ✅ 使用 `injectTenantQuery` 辅助函数
3. ✅ 使用 `req.tenantQuery.*` 方法进行数据库操作
4. ✅ 避免直接使用 `queryOne/queryAll` 进行跨表查询

---

## 📊 测试建议

### 渗透测试场景

#### 测试1: 跨组织咨询记录访问
```bash
# 创建两个组织和病患
curl -X POST http://localhost:3001/api/consultations \
  -H "Authorization: Bearer <org1_token>" \
  -d '{"patientId": "org1_patient_1", "date": "2026-02-22", ...}'

# 响应: {"id": "consultation_1234567890"}

# 尝试用组织2的token访问组织1的记录
curl http://localhost:3001/api/consultations/consultation_1234567890 \
  -H "Authorization: Bearer <org2_token>"

# 当前: ❌ 返回200和完整数据 (漏洞)
# 修复后: ✅ 返回404 (正确)
```

#### 测试2: 跨组织病患姓名查询
```bash
# 尝试用组织2的token查询组织1的病患姓名
curl -X POST http://localhost:3001/api/email/send/appointment-reminder \
  -H "Authorization: Bearer <org2_token>" \
  -d '{"patientId": "org1_patient_1", "to": "test@test.com", ...}'

# 当前: ❌ 可以获取到org1的病患姓名 (漏洞)
# 修复后: ✅ 返回400 "患者不存在或無權訪問" (正确)
```

#### 测试3: 病患配额检查
```bash
# 创建100个病患 (免费版上限)
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/patients \
    -H "Authorization: Bearer <token>" \
    -d "{\"name\": \"Patient $i\", ...}"
done

# 尝试创建第101个
curl -X POST http://localhost:3001/api/patients \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Patient 101", ...}'

# 期望: ✅ 返回403 "已達到 patients 數量上限 (100)"
```

---

## 📋 检查清单

### 立即行动项
- [ ] 修复 `consultations.js` 的所有端点
- [ ] 修复 `email.js` 的4处病患查询
- [ ] 运行渗透测试验证修复
- [ ] 审计数据库是否已存在跨组织数据污染

### 后续行动项
- [ ] 审计所有路由文件的组织隔离
- [ ] 为所有资源添加自动化隔离测试
- [ ] 添加数据库级RLS (Row Level Security) 作为第二道防线
- [ ] 实施定期安全审计流程
- [ ] 添加异常访问检测和告警

---

## 🎯 最佳实践规范

### 路由文件标准模板

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  requireTenant, 
  injectTenantQuery, 
  checkSubscriptionExpiry,
  checkTenantQuota  // 如果需要配额检查
} = require('../middleware/tenantContext');
const { requireModule } = require('../middleware/moduleAccess');  // 如果是模块化功能
const encryptionMiddleware = require('../middleware/encryptionMiddleware');  // 如果有加密
const { accessControlMiddleware, requireAccess, Operation } = require('../middleware/accessControl');

// ✅ 标准中间件链
router.use(authenticateToken);
router.use(requireTenant);
router.use(checkSubscriptionExpiry);
router.use(requireModule('module_name'));  // 可选
router.use(injectTenantQuery);
router.use(encryptionMiddleware);  // 可选
router.use(accessControlMiddleware);

// ✅ 查询操作
router.get('/', requireAccess('resource', Operation.READ), async (req, res) => {
  const items = await req.tenantQuery.findAll('table_name', options);
  // 自动过滤 organizationId
});

// ✅ 创建操作
router.post('/', 
  requireAccess('resource', Operation.CREATE),
  checkTenantQuota('resource'),  // 可选：检查配额
  async (req, res) => {
    // 如果引用其他资源，先验证权限
    if (req.body.patientId) {
      const patient = await req.tenantQuery.findById('patients', req.body.patientId);
      if (!patient) {
        return res.status(400).json({ error: '患者不存在或無權訪問' });
      }
    }
    
    const newItem = await req.tenantQuery.insert('table_name', data);
    // 自动注入 organizationId
  }
);

// ✅ 更新操作
router.put('/:id', requireAccess('resource', Operation.UPDATE), async (req, res) => {
  const updated = await req.tenantQuery.update('table_name', req.params.id, data);
  if (!updated) {
    return res.status(404).json({ error: '資源不存在或無權訪問' });
  }
  // 自动验证 organizationId
});

// ✅ 删除操作
router.delete('/:id', requireAccess('resource', Operation.DELETE), async (req, res) => {
  const success = await req.tenantQuery.delete('table_name', req.params.id);
  if (!success) {
    return res.status(404).json({ error: '資源不存在或無權訪問' });
  }
  // 自动验证 organizationId
});

module.exports = router;
```

### 禁止的模式

```javascript
// ❌ 绝对禁止：直接查询不带organizationId过滤
const item = await queryOne('SELECT * FROM table WHERE id = ?', [id]);

// ❌ 绝对禁止：手动拼接organizationId（容易出错）
const items = await queryAll(`
  SELECT * FROM table WHERE organizationId = ?
`, [req.user.organizationId]);  // 应该用 req.tenantContext.organizationId

// ❌ 绝对禁止：不验证关联资源的组织权限
const consultation = await execute(`
  INSERT INTO consultations (patientId, ...)
  VALUES (?, ...)
`, [req.body.patientId]);  // 没有验证 patientId 是否属于当前组织

// ✅ 正确：永远使用租户查询辅助函数
const item = await req.tenantQuery.findById('table', id);
const items = await req.tenantQuery.findAll('table', options);
const newItem = await req.tenantQuery.insert('table', data);
const updated = await req.tenantQuery.update('table', id, data);
const success = await req.tenantQuery.delete('table', id);
```

---

## 结论

系统的核心病患管理功能（patients.js）**隔离正常**，配额检查**工作正常**。但**咨询记录**和**邮件服务**存在严重漏洞，必须立即修复。

**风险等级**: 🔴 高危  
**建议**: 立即暂停咨询记录功能的生产使用，直到修复完成

---

**报告人**: GitHub Copilot  
**审核**: 待审核
