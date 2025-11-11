# 超級管理員快速入門指南

## 🚀 立即開始

### 1. 首次部署

當您首次啟動系統時，超級管理員帳號會自動建立。

**預設超級管理員：**
```
帳號: superadmin
密碼: SuperAdmin@2024  （或環境變數 SUPER_ADMIN_PASSWORD 設定的值）
```

⚠️ **重要：請立即修改預設密碼！**

---

### 2. 登入控制台

```bash
POST http://your-domain.com/api/auth/login
Content-Type: application/json

{
  "username": "superadmin",
  "password": "SuperAdmin@2024"
}
```

成功回應：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_superadmin_001",
    "username": "superadmin",
    "role": "super_admin",
    "name": "系統超級管理員"
  }
}
```

**請保存 `token`，所有後續請求都需要它。**

---

### 3. 修改密碼（必做）

```bash
POST http://your-domain.com/api/auth/change-password
Authorization: Bearer {您的token}
Content-Type: application/json

{
  "oldPassword": "SuperAdmin@2024",
  "newPassword": "您的新強密碼"
}
```

---

## 📊 核心功能

### 系統總覽儀表板

查看系統整體運行狀況：

```bash
GET http://your-domain.com/api/superadmin/dashboard
Authorization: Bearer {您的token}
```

**查看內容：**
- 📈 組織統計（總數、活躍數、各方案數量）
- 👥 用戶統計（總數、管理員數、活躍數）
- 🏥 患者統計（總數、本月新增）
- 📅 預約統計（已排程、已完成）
- ⚠️ 配額警告（接近上限的組織）
- 📊 月度增長趨勢

---

### 組織使用量分析

查看所有組織的詳細使用情況：

```bash
GET http://your-domain.com/api/superadmin/organizations/analytics
Authorization: Bearer {您的token}

# 可選參數：
?plan=professional    # 篩選方案
&sortBy=patients      # 排序: patients, users, appointments, healthScore
&order=DESC          # 排序方向
```

**每個組織顯示：**
- 用戶使用率（17/20 = 85%）
- 患者使用率（460/500 = 92%）
- 預約統計
- 健康分數 (0-100)
- 警告提醒（配額過高、不活躍、訂閱到期）

---

### 組織管理

#### 查看所有組織

```bash
GET http://your-domain.com/api/organizations
Authorization: Bearer {您的token}

# 可選參數：
?isActive=true    # 只看啟用的組織
&plan=enterprise  # 篩選方案
```

#### 創建新組織

```bash
POST http://your-domain.com/api/organizations
Authorization: Bearer {您的token}
Content-Type: application/json

{
  "name": "新醫院名稱",
  "slug": "new-hospital",         # 唯一識別碼
  "plan": "professional",          # basic, professional, enterprise
  "maxUsers": 20,                  # 可選，預設根據方案
  "maxPatients": 500,              # 可選，預設根據方案
  "contactName": "聯絡人姓名",
  "contactEmail": "contact@hospital.com"
}
```

#### 更新組織（升級/降級方案、調整配額）

```bash
PUT http://your-domain.com/api/organizations/{organizationId}
Authorization: Bearer {您的token}
Content-Type: application/json

{
  "plan": "enterprise",       # 升級方案
  "maxPatients": 1000,        # 提高配額
  "isActive": true            # 啟用狀態
}
```

#### 停用組織

```bash
# 軟刪除（可恢復）
DELETE http://your-domain.com/api/organizations/{organizationId}
Authorization: Bearer {您的token}

# 永久刪除（包含所有資料）
DELETE http://your-domain.com/api/organizations/{organizationId}?force=true
Authorization: Bearer {您的token}
```

⚠️ **永久刪除無法恢復！**

---

### 收入報表

查看訂閱收入統計：

```bash
GET http://your-domain.com/api/superadmin/revenue
Authorization: Bearer {您的token}
```

**顯示內容：**
- 總組織數
- 月收入
- 年收入
- 各方案收入明細

**訂閱方案定價：**
- Basic: TWD 99/月
- Professional: TWD 499/月
- Enterprise: TWD 1,999/月

---

### 活動日誌

查看系統最近活動：

```bash
GET http://your-domain.com/api/superadmin/activity-log
Authorization: Bearer {您的token}

?limit=50    # 限制數量，預設 50
```

**包含：**
- 最近登入的用戶
- 最近新增的組織
- 最近新增的患者

---

## ⚙️ 訂閱方案說明

| 方案 | 價格 | 用戶數 | 患者數 | 功能 |
|------|------|--------|--------|------|
| **Basic** | TWD 99/月 | 5 | 100 | 基礎功能 |
| **Professional** | TWD 499/月 | 20 | 500 | 進階報表、API 存取 |
| **Enterprise** | TWD 1,999/月 | 999 | 99,999 | 客製化、專屬客服 |

---

## 🚨 重要監控指標

### 需要關注的警告

1. **配額使用率 > 80%**
   - 用戶或患者接近上限
   - 建議：聯繫客戶升級方案

2. **健康分數 < 50**
   - 組織不活躍或配額嚴重超限
   - 建議：調查原因，考慮調整配額

3. **30 天未登入**
   - 可能流失客戶
   - 建議：主動聯繫了解原因

4. **訂閱即將到期**
   - 7 天內到期
   - 建議：提醒續約

---

## 📱 常用操作範例

### 範例 1：為客戶升級方案

客戶「台北仁愛醫院」已達患者上限 (460/500)，需要升級：

```bash
# 1. 查詢組織 ID
GET /api/organizations?name=台北仁愛醫院

# 2. 升級到 Enterprise
PUT /api/organizations/{org_id}
{
  "plan": "enterprise",
  "maxPatients": 99999
}

# 3. 確認更新
GET /api/superadmin/organizations/analytics
```

### 範例 2：處理不活躍組織

發現「新竹健康診所」30 天未登入：

```bash
# 1. 查看詳細資訊
GET /api/organizations/{org_id}

# 2. 查看最後活動
GET /api/superadmin/activity-log

# 3. 決定是否停用
DELETE /api/organizations/{org_id}  # 軟刪除
```

### 範例 3：月度收入報表

```bash
# 1. 獲取收入總覽
GET /api/superadmin/revenue

# 2. 查看本月新增組織
GET /api/superadmin/dashboard
# 查看 monthlyGrowth 資料

# 3. 分析健康度
GET /api/superadmin/organizations/analytics?sortBy=healthScore&order=ASC
# 找出需要關注的組織
```

---

## 🔒 安全最佳實踐

### 1. 密碼要求
- 至少 8 個字元
- 包含大小寫字母
- 包含數字
- 建議包含特殊符號

### 2. Token 管理
- Token 有效期 24 小時
- 不要共享 Token
- 定期換發新 Token

### 3. 環境變數保護
```bash
# 生產環境必須設定
JWT_SECRET=強隨機字串
SUPER_ADMIN_PASSWORD=強密碼
NODE_ENV=production
```

### 4. HTTPS
生產環境必須使用 HTTPS，保護傳輸資料。

---

## 🛠️ 疑難排解

### Q: 忘記超級管理員密碼

```bash
# 1. 停止服務
# 2. 連接資料庫
sqlite3 data/patient_crm.db

# 3. 重設為 NewPassword123
UPDATE users
SET password = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
WHERE username = 'superadmin';

# 4. 重啟並登入
```

### Q: 組織被誤刪怎麼辦

軟刪除可以恢復：
```bash
UPDATE organizations
SET isActive = 1
WHERE id = '{org_id}';
```

硬刪除（force=true）無法恢復。

### Q: 如何備份資料

```bash
# SQLite 備份
cp data/patient_crm.db backups/backup_$(date +%Y%m%d).db

# 建議設定每日自動備份
```

---

## 📞 支援資源

- **完整文檔**：`docs/DEPLOYMENT_GUIDE.md`
- **多租戶架構**：`docs/MULTI_TENANT_ARCHITECTURE.md`
- **API 測試**：使用 Postman 或 curl

---

## ✅ 部署檢查清單

首次部署完成後，請確認：

- [ ] 超級管理員登入成功
- [ ] 已修改預設密碼
- [ ] 已測試儀表板 API
- [ ] 已建立測試組織
- [ ] 已設定環境變數
- [ ] 已啟用 HTTPS
- [ ] 已設定備份策略

---

**準備好了嗎？開始管理您的系統吧！🚀**

有任何問題，請參考完整文檔或聯繫技術支援。
