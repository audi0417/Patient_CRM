# 雲端部署指南

## 📋 目錄

1. [部署前準備](#部署前準備)
2. [環境變數設定](#環境變數設定)
3. [首次啟動](#首次啟動)
4. [超級管理員控制台](#超級管理員控制台)
5. [API 端點總覽](#api-端點總覽)
6. [安全性設定](#安全性設定)
7. [監控和維護](#監控和維護)

---

## 部署前準備

### 1. 環境需求

- Node.js 16+
- NPM 或 Yarn
- 資料庫：SQLite（預設）或 PostgreSQL

### 2. 部署平台選擇

推薦平台：
- ✅ **Zeabur** - 一鍵部署，自動 HTTPS
- ✅ **Vercel** - 適合前端 + Serverless
- ✅ **Railway** - 全棧部署
- ✅ **DigitalOcean App Platform** - 完整控制
- ✅ **AWS / GCP / Azure** - 企業級部署

---

## 環境變數設定

### 必要環境變數

```bash
# 應用程式設定
NODE_ENV=production
PORT=3001

# JWT 密鑰（請務必更換！）
JWT_SECRET=請使用-openssl-rand-base64-32-生成

# 超級管理員密碼
SUPER_ADMIN_PASSWORD=您的強密碼
```

### 生成安全的 JWT_SECRET

```bash
# 使用 OpenSSL 生成隨機密鑰
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 完整 .env 範例

參考專案根目錄的 `.env.example` 文件：

```bash
cp .env.example .env
# 編輯 .env 並設定所有變數
```

---

## 首次啟動

### 1. 安裝依賴

```bash
npm install
# 或
yarn install
```

### 2. 建置前端

```bash
npm run build
# 或
yarn build
```

### 3. 執行資料庫遷移

```bash
# 執行多租戶架構遷移
node server/database/migrate.js up
```

### 4. 啟動應用

```bash
npm start
# 或
yarn start
```

### 5. 確認超級管理員已建立

首次啟動時，系統會自動建立超級管理員帳號，並在控制台顯示：

```
👑 創建超級管理員帳號（系統控制台）...
✅ 超級管理員已創建
┌─────────────────────────────────────────┐
│  🔐 超級管理員帳號（請立即修改密碼）    │
├─────────────────────────────────────────┤
│  帳號: superadmin                       │
│  密碼: SuperAdmin@2024                  │
│  權限: 可管理所有組織和系統設定         │
└─────────────────────────────────────────┘
⚠️  重要：首次登入後請立即修改密碼！
```

---

## 超級管理員控制台

### 登入超級管理員

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "superadmin",
  "password": "SuperAdmin@2024"
}
```

回應：
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

### 控制台功能

#### 1. 系統總覽儀表板

```bash
GET /api/superadmin/dashboard
Authorization: Bearer {super_admin_token}
```

**回應內容：**
- 組織統計（總數、啟用中、按方案分類）
- 用戶統計（總數、活躍數、管理員數）
- 患者統計（總數、本月新增、本週新增）
- 預約統計（總數、已排程、已完成、已取消）
- 系統健康狀態
- 配額警告（接近上限的組織）
- 月度增長趨勢（最近 6 個月）

**範例回應：**
```json
{
  "organizations": {
    "total": 15,
    "active": 14,
    "inactive": 1,
    "byPlan": {
      "basic": 8,
      "professional": 5,
      "enterprise": 2
    }
  },
  "users": {
    "total": 47,
    "active": 45,
    "admins": 15,
    "regularUsers": 30
  },
  "patients": {
    "total": 1250,
    "thisMonth": 85,
    "thisWeek": 23
  },
  "quotaWarnings": [
    {
      "id": "org_xxx",
      "name": "台北仁愛醫院",
      "userUsagePercent": 85,
      "patientUsagePercent": 92,
      "needsAttention": true
    }
  ],
  "monthlyGrowth": [
    { "month": "2024-06", "organizations": 2, "patients": 180 },
    { "month": "2024-07", "organizations": 3, "patients": 220 }
  ]
}
```

#### 2. 組織使用量分析

```bash
GET /api/superadmin/organizations/analytics
Authorization: Bearer {super_admin_token}

# 查詢參數
?plan=professional    # 篩選方案
&sortBy=patients      # 排序欄位: patients, users, appointments, healthScore
&order=DESC          # 排序方向: DESC, ASC
```

**回應內容：**
- 每個組織的詳細使用量
- 用戶配額使用率
- 患者配額使用率
- 預約統計
- 健康分數 (0-100)
- 警告提醒

**範例回應：**
```json
{
  "total": 15,
  "organizations": [
    {
      "organization": {
        "id": "org_001",
        "name": "台北仁愛醫院",
        "plan": "professional",
        "isActive": true
      },
      "usage": {
        "users": {
          "current": 17,
          "limit": 20,
          "usagePercent": 85
        },
        "patients": {
          "total": 460,
          "limit": 500,
          "usagePercent": 92,
          "thisMonth": 45
        },
        "appointments": {
          "total": 1250,
          "scheduled": 85,
          "completed": 1100
        }
      },
      "healthScore": 65,
      "alerts": {
        "userQuotaHigh": true,
        "patientQuotaHigh": true,
        "inactive": false,
        "subscriptionExpiring": false
      }
    }
  ]
}
```

#### 3. 組織管理

```bash
# 獲取所有組織
GET /api/organizations
Authorization: Bearer {super_admin_token}

# 創建組織
POST /api/organizations
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "name": "新組織名稱",
  "slug": "new-org-slug",
  "plan": "professional",
  "maxUsers": 20,
  "maxPatients": 500,
  "contactName": "聯絡人",
  "contactEmail": "contact@example.com"
}

# 更新組織
PUT /api/organizations/{organizationId}
Authorization: Bearer {super_admin_token}

{
  "plan": "enterprise",
  "maxPatients": 1000,
  "isActive": true
}

# 停用組織（軟刪除）
DELETE /api/organizations/{organizationId}
Authorization: Bearer {super_admin_token}

# 永久刪除組織及所有資料
DELETE /api/organizations/{organizationId}?force=true
Authorization: Bearer {super_admin_token}
```

#### 4. 收入報表

```bash
GET /api/superadmin/revenue
Authorization: Bearer {super_admin_token}
```

**回應內容：**
```json
{
  "summary": {
    "totalOrganizations": 15,
    "monthlyRevenue": 7485,
    "yearlyRevenue": 89820,
    "currency": "TWD"
  },
  "byPlan": [
    {
      "plan": "basic",
      "organizations": 8,
      "monthlyRevenue": 792,
      "yearlyRevenue": 9504,
      "price": 99
    },
    {
      "plan": "professional",
      "organizations": 5,
      "monthlyRevenue": 2495,
      "yearlyRevenue": 29940,
      "price": 499
    },
    {
      "plan": "enterprise",
      "organizations": 2,
      "monthlyRevenue": 3998,
      "yearlyRevenue": 47976,
      "price": 1999
    }
  ]
}
```

#### 5. 活動日誌

```bash
GET /api/superadmin/activity-log
Authorization: Bearer {super_admin_token}

# 查詢參數
?limit=50    # 限制數量
```

**回應內容：**
- 最近登入的用戶
- 最近新增的組織
- 最近新增的患者

#### 6. 系統設定

```bash
# 獲取系統設定
GET /api/superadmin/settings
Authorization: Bearer {super_admin_token}

# 更新系統設定
PUT /api/superadmin/settings
Authorization: Bearer {super_admin_token}
```

---

## API 端點總覽

### 公開端點
- `POST /api/auth/login` - 登入

### 超級管理員專用
- `GET /api/superadmin/dashboard` - 系統總覽
- `GET /api/superadmin/organizations/analytics` - 使用量分析
- `GET /api/superadmin/revenue` - 收入報表
- `GET /api/superadmin/activity-log` - 活動日誌
- `GET /api/superadmin/settings` - 系統設定
- `PUT /api/superadmin/settings` - 更新設定

### 組織管理（超級管理員）
- `GET /api/organizations` - 所有組織
- `GET /api/organizations/:id` - 單個組織
- `POST /api/organizations` - 創建組織
- `PUT /api/organizations/:id` - 更新組織
- `DELETE /api/organizations/:id` - 刪除組織

### 組織用戶端點
- `GET /api/organizations/me/info` - 當前組織資訊
- `PUT /api/organizations/me/settings` - 更新組織設定（管理員）

### 業務端點（自動租戶隔離）
- `GET /api/patients` - 患者列表
- `GET /api/appointments` - 預約列表
- `GET /api/users` - 用戶列表
- 其他業務 API...

---

## 安全性設定

### 1. 修改超級管理員密碼

首次登入後，立即修改密碼：

```bash
POST /api/auth/change-password
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "oldPassword": "SuperAdmin@2024",
  "newPassword": "您的新強密碼"
}
```

### 2. 設定強密碼政策

新密碼必須符合：
- 至少 8 個字元
- 包含大寫字母
- 包含小寫字母
- 包含數字
- 建議包含特殊符號

### 3. JWT 密鑰

確保 `JWT_SECRET` 是隨機生成的強密鑰，至少 32 字元。

### 4. HTTPS

生產環境必須使用 HTTPS：
- Zeabur 自動提供 HTTPS
- 其他平台請設定 SSL 證書

### 5. CORS 設定

限制 API 訪問來源：

```bash
# .env
CORS_ORIGIN=https://yourdomain.com
```

### 6. 環境變數保護

- 絕對不要將 `.env` 文件提交到版控
- 使用平台的環境變數管理功能
- 定期輪換密鑰

---

## 監控和維護

### 1. 健康檢查端點

```bash
GET /api/health-check
```

回應：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. 日常監控項目

**組織管理：**
- 檢查配額警告
- 追蹤訂閱到期
- 監控不活躍組織

**系統健康：**
- 資料庫大小
- 記憶體使用
- API 回應時間

**安全性：**
- 異常登入行為
- 跨組織訪問嘗試
- 密碼重置頻率

### 3. 備份策略

**自動備份：**
```bash
# 每日備份腳本（建議設定 cron job）
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp data/patient_crm.db backups/patient_crm_$DATE.db
```

**備份保留政策：**
- 每日備份：保留 7 天
- 每週備份：保留 4 週
- 每月備份：保留 12 個月

### 4. 效能優化

**資料庫優化：**
```sql
-- 定期執行 VACUUM
VACUUM;

-- 重建索引
REINDEX;

-- 分析查詢計劃
EXPLAIN QUERY PLAN SELECT ...;
```

**監控慢查詢：**
- 設定查詢時間閾值
- 記錄超過 100ms 的查詢
- 優化熱點查詢

### 5. 擴展建議

**當達到以下情況時考慮擴展：**

| 指標 | 臨界值 | 建議動作 |
|------|--------|---------|
| 組織數量 | > 1000 | 考慮資料庫分片 |
| 總資料量 | > 100GB | 遷移至 PostgreSQL |
| API QPS | > 1000 | 增加伺服器實例 |
| 回應時間 | > 500ms | 加入 Redis 快取 |

---

## 部署檢查清單

在部署到生產環境前，請確認：

- [ ] 已設定強 `JWT_SECRET`
- [ ] 已設定安全的 `SUPER_ADMIN_PASSWORD`
- [ ] 已設定 `NODE_ENV=production`
- [ ] 已執行資料庫遷移
- [ ] 已建置前端資源
- [ ] 已設定 HTTPS
- [ ] 已設定 CORS
- [ ] 已測試超級管理員登入
- [ ] 已設定備份策略
- [ ] 已設定監控和告警
- [ ] 已測試多租戶隔離
- [ ] 已閱讀安全性文檔

---

## 常見問題

### Q: 忘記超級管理員密碼怎麼辦？

**A:** 需要直接操作資料庫：

```bash
# 1. 停止應用
# 2. 連接資料庫
sqlite3 data/patient_crm.db

# 3. 重設密碼（密碼: NewPassword123）
UPDATE users
SET password = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
WHERE username = 'superadmin';

# 4. 重啟應用並登入
```

### Q: 如何新增第二個超級管理員？

**A:** 使用現有超級管理員帳號，透過 API 創建：

```bash
POST /api/users
Authorization: Bearer {super_admin_token}

{
  "username": "superadmin2",
  "password": "StrongPassword123",
  "role": "super_admin",
  "name": "第二超級管理員",
  "email": "admin2@system.com"
}
```

### Q: 如何遷移到 PostgreSQL？

**A:** 參考資料庫遷移文檔，或使用工具如 `pgloader` 遷移資料。

### Q: 系統支援多大規模？

**A:**
- SQLite：適合 < 100 組織，< 10萬患者
- PostgreSQL：適合 > 100 組織，百萬級患者
- 建議根據實際使用量規劃

---

## 技術支援

如有問題，請聯繫：
- 技術文檔：`docs/`
- GitHub Issues：`[您的 repo URL]`
- Email：support@yourcompany.com

---

**祝您部署順利！🚀**
