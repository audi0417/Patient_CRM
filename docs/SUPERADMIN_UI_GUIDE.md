# 超級管理員後台使用指南

## 概述

超級管理員現在擁有專屬的後台管理介面，可以管理所有組織、查看系統統計資料，與一般客戶使用的患者管理系統完全分離。

## 功能特點

### 1. 登入後的介面差異

**超級管理員 (super_admin):**
- 登入後會看到頂部導航欄有一個特殊的「🛡️ 超級後台」入口
- 可以在超級後台和患者管理系統之間切換
- 右上角用戶選單中也有「超級管理員後台」快速入口

**一般管理員/用戶 (admin/user):**
- 看到標準的患者管理介面（患者列表、健康數據、回診管理等）
- 沒有超級後台入口

### 2. 超級管理員後台功能

#### 📊 儀表板 (`/superadmin`)

顯示系統整體運行狀況：

**統計卡片：**
- 組織總數（包含活躍數量和本月增長）
- 用戶總數（包含管理員數量和本月增長）
- 患者總數（包含本月新增數量）
- 預約統計（排程數和完成數）

**訂閱方案分布：**
- Basic 方案：TWD 99/月
- Professional 方案：TWD 499/月
- Enterprise 方案：TWD 1,999/月
- 顯示每個方案的組織數量

**配額警告：**
- 自動列出接近配額限制的組織
- 顯示使用率（用戶數/患者數）
- 紅色標記：已超限（≥100%）
- 橙色標記：即將滿額（80-99%）

**本月增長趨勢：**
- 新增組織數量
- 新增用戶數量
- 新增患者數量

**快速操作按鈕：**
- 查看所有組織
- 創建新組織
- 使用量分析
- 活動日誌
- 收入報表

#### 🏢 組織管理 (`/superadmin/organizations`)

完整的組織管理功能：

**組織列表：**
- 組織名稱和識別碼（slug）
- 訂閱方案標籤
- 用戶數使用率（當前/最大）
- 患者數使用率（當前/最大）
- 聯絡人資訊
- 啟用狀態

**篩選與搜尋：**
- 搜尋欄：可搜尋組織名稱、識別碼、聯絡信箱
- 方案篩選：可篩選 Basic/Professional/Enterprise

**創建組織：**
- 組織名稱
- 識別碼（唯一，例如：taipei-hospital）
- 訂閱方案選擇
- 聯絡人姓名
- 聯絡信箱

**編輯組織：**
- 更新組織名稱
- 升級/降級訂閱方案
- 調整最大用戶數
- 調整最大患者數
- 啟用/停用組織

**刪除組織：**
- 軟刪除：可恢復
- 硬刪除（force=true）：永久刪除，無法恢復

**使用率顏色提示：**
- 🟢 綠色：使用率 < 80%
- 🟠 橙色：使用率 80-89%
- 🔴 紅色：使用率 ≥ 90%

## 路由結構

```
/superadmin                    # 超級管理員儀表板
/superadmin/organizations      # 組織管理
/superadmin/organizations/new  # 創建新組織（從儀表板快速操作）
/superadmin/analytics          # 使用量分析（待實作）
/superadmin/activity-log       # 活動日誌（待實作）
/superadmin/revenue            # 收入報表（待實作）
```

## 權限保護

所有超級管理員路由都受到 `ProtectedRoute` 保護：
- 只有 `role: "super_admin"` 的用戶才能訪問
- 未授權用戶會被導向登入頁面
- 權限檢查在前端和後端同時進行

## API 端點

### 儀表板數據
```
GET /api/superadmin/dashboard
Authorization: Bearer {token}
```

### 組織列表
```
GET /api/organizations
Authorization: Bearer {token}

# 可選參數
?isActive=true    # 只看啟用的組織
&plan=enterprise  # 篩選方案
```

### 創建組織
```
POST /api/organizations
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "新醫院名稱",
  "slug": "new-hospital",
  "plan": "professional",
  "maxUsers": 20,
  "maxPatients": 500,
  "contactName": "聯絡人姓名",
  "contactEmail": "contact@hospital.com"
}
```

### 更新組織
```
PUT /api/organizations/{organizationId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "plan": "enterprise",
  "maxPatients": 1000,
  "isActive": true
}
```

### 刪除組織
```
# 軟刪除（可恢復）
DELETE /api/organizations/{organizationId}
Authorization: Bearer {token}

# 永久刪除
DELETE /api/organizations/{organizationId}?force=true
Authorization: Bearer {token}
```

### 組織使用量分析
```
GET /api/superadmin/organizations/analytics
Authorization: Bearer {token}

# 可選參數
?plan=professional    # 篩選方案
&sortBy=patients      # 排序：patients, users, appointments, healthScore
&order=DESC           # 排序方向
```

### 收入報表
```
GET /api/superadmin/revenue
Authorization: Bearer {token}
```

### 活動日誌
```
GET /api/superadmin/activity-log
Authorization: Bearer {token}
?limit=50    # 限制數量，預設 50
```

## 使用流程

### 1. 首次登入

```bash
# 使用超級管理員帳號登入
帳號: superadmin
密碼: SuperAdmin@2024  （或環境變數 SUPER_ADMIN_PASSWORD 設定的值）
```

### 2. 訪問超級後台

登入後，您會看到：
1. **頂部導航欄**：「🛡️ 超級後台」按鈕
2. **用戶選單**：點擊右上角頭像 → 「超級管理員後台」

### 3. 管理組織

1. 點擊「超級後台」進入儀表板
2. 查看系統總覽數據
3. 點擊「管理組織」或導航至 `/superadmin/organizations`
4. 使用搜尋和篩選功能找到特定組織
5. 編輯組織資訊或調整配額

### 4. 創建新組織

1. 在組織管理頁面點擊「創建組織」
2. 填寫組織資訊：
   - 組織名稱：例如「台北仁愛醫院」
   - 識別碼：例如「taipei-renai」（必須唯一）
   - 選擇訂閱方案
   - 填寫聯絡人資訊
3. 點擊「創建組織」

### 5. 處理配額警告

當儀表板顯示配額警告時：
1. 點擊「管理組織」
2. 找到相關組織
3. 點擊「編輯」按鈕
4. 選擇升級方案或手動調整配額上限
5. 儲存變更

### 6. 升級組織方案

```
步驟：
1. 進入組織管理
2. 找到需要升級的組織
3. 點擊編輯按鈕
4. 在「訂閱方案」下拉選單中選擇新方案
5. 系統會自動更新配額限制
6. 也可以手動調整「最大用戶數」和「最大患者數」
7. 儲存變更
```

## 導航欄顯示邏輯

### 超級管理員看到的導航
```
[醫療CRM系統] | 🛡️ 超級後台 | 患者列表
```

### 一般管理員/用戶看到的導航
```
[醫療CRM系統] | 患者列表 | 健康數據 | 回診管理 | [使用者管理*]
```
*只有 admin 角色才會看到「使用者管理」

## 配額方案對照表

| 方案 | 月費 | 最大用戶數 | 最大患者數 | 功能 |
|------|------|------------|------------|------|
| **Basic** | TWD 99 | 5 | 100 | 基礎功能 |
| **Professional** | TWD 499 | 20 | 500 | 進階報表、API 存取 |
| **Enterprise** | TWD 1,999 | 999 | 99,999 | 客製化、專屬客服 |

## 視覺設計

### 配額使用率顏色
- **< 80%**: 綠色文字
- **80-89%**: 橙色文字
- **≥ 90%**: 紅色文字

### 方案標籤顏色
- **Basic**: `secondary` badge（灰色）
- **Professional**: `default` badge（藍色）
- **Enterprise**: `destructive` badge（紅色）

### 圖示使用
- 🛡️ Shield：超級管理員專屬功能
- 🏢 Building2：組織
- 👥 Users：用戶數
- ✅ UserCheck：患者數
- 📅 Calendar：預約
- 💰 DollarSign：收入
- ⚠️ AlertTriangle：警告
- 📊 TrendingUp：增長趨勢

## 安全考量

1. **權限驗證**：所有 API 請求都需要 Bearer Token
2. **角色檢查**：前端和後端都會驗證 `super_admin` 角色
3. **路由保護**：使用 `ProtectedRoute` 組件保護所有超級管理員路由
4. **操作確認**：刪除組織時需要用戶確認
5. **硬刪除警告**：永久刪除操作會顯示特別警告

## 待開發功能

以下功能已在儀表板中預留入口，但尚未實作：

- [ ] 使用量分析頁面 (`/superadmin/analytics`)
- [ ] 活動日誌頁面 (`/superadmin/activity-log`)
- [ ] 收入報表頁面 (`/superadmin/revenue`)
- [ ] 組織詳細頁面（點擊組織名稱查看詳情）
- [ ] 批次操作功能
- [ ] 導出報表功能
- [ ] 圖表視覺化

## 檔案結構

```
src/
├── pages/
│   ├── SuperAdminDashboard.tsx      # 超級管理員儀表板
│   ├── OrganizationManagement.tsx   # 組織管理頁面
│   └── ...
├── components/
│   └── Header.tsx                    # 導航欄（已更新）
├── App.tsx                           # 路由配置（已更新）
└── types/
    └── user.ts                       # 用戶角色定義
```

## 疑難排解

### Q: 登入後看不到「超級後台」按鈕

**解決方法：**
1. 確認使用的帳號是 `superadmin`
2. 檢查資料庫中該用戶的 `role` 欄位是否為 `super_admin`
3. 清除瀏覽器快取並重新登入
4. 檢查 localStorage 中的用戶資料

### Q: 點擊「超級後台」後顯示 404

**解決方法：**
1. 確認前端已重新編譯（`npm run build`）
2. 確認 `src/App.tsx` 中已加入超級管理員路由
3. 重啟開發伺服器

### Q: API 返回 403 Forbidden

**解決方法：**
1. 確認 Token 是否有效
2. 檢查後端路由是否正確設定權限中間件
3. 確認用戶角色是 `super_admin`

### Q: 儀表板數據不顯示

**解決方法：**
1. 打開瀏覽器開發者工具查看 Network 請求
2. 確認 `/api/superadmin/dashboard` 端點是否正常
3. 檢查後端是否已實作相關 API
4. 查看控制台是否有錯誤訊息

## 相關文件

- [超級管理員快速入門](./SUPERADMIN_QUICKSTART.md) - API 使用說明
- [多租戶架構文檔](./MULTI_TENANT_ARCHITECTURE.md) - 系統架構說明
- [部署指南](./DEPLOYMENT_GUIDE.md) - 系統部署說明

## 總結

超級管理員後台提供了完整的系統管理功能，讓您可以：
- ✅ 集中管理所有組織
- ✅ 監控系統整體運行狀況
- ✅ 處理配額警告和升級需求
- ✅ 查看收入和增長趨勢
- ✅ 與一般客戶介面完全分離

現在登入超級管理員帳號，就能看到專屬的管理後台了！🚀
