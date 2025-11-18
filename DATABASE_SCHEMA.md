# 完整資料庫格式文檔

> 此文檔定義 Patient CRM 系統所需的完整資料庫結構
> 最後更新：2025-11-18
> 基於程式碼分析：所有 routes 和 middleware 實際使用的欄位

---

## 1. 組織管理 (organizations)

**用途**：多租戶架構的核心，管理不同的診所/組織

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 組織唯一識別碼 |
| name | TEXT | ✓ | | 組織名稱 |
| slug | TEXT UNIQUE | ✓ | | URL 友善識別碼 |
| domain | TEXT | | | 自訂網域 |
| plan | TEXT | ✓ | 'basic' | 方案：basic / professional / enterprise |
| maxUsers | INTEGER | | 5 | 最大使用者數量 |
| maxPatients | INTEGER | | 100 | 最大病患數量 |
| isActive | BOOLEAN | | TRUE | 是否啟用 |
| settings | TEXT (JSON) | | | 組織設定 (包含 modules 配置) |
| subscriptionStartDate | TIMESTAMP | | | 訂閱開始日期 |
| subscriptionEndDate | TIMESTAMP | | | 訂閱結束日期 |
| billingEmail | TEXT | | | 帳單郵箱 |
| contactName | TEXT | | | 聯絡人姓名 |
| contactPhone | TEXT | | | 聯絡電話 |
| contactEmail | TEXT | | | 聯絡郵箱 |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**索引**：
- `UNIQUE(slug)`

---

## 2. 使用者 (users)

**用途**：系統使用者（診所人員、管理員）

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 使用者唯一識別碼 |
| username | TEXT UNIQUE | ✓ | | 使用者名稱（登入帳號） |
| password | TEXT | ✓ | | 加密後的密碼 (SHA256) |
| name | TEXT | ✓ | | 真實姓名 |
| email | TEXT UNIQUE | ✓ | | 電子郵件 |
| role | TEXT | ✓ | | 角色：super_admin / admin / user |
| isActive | BOOLEAN | | TRUE | 是否啟用 |
| isFirstLogin | BOOLEAN | | TRUE | 是否首次登入 |
| lastLogin | TIMESTAMP | | | 最後登入時間 |
| organizationId | TEXT | | | 所屬組織（FK: organizations.id） |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `UNIQUE(username)`
- `UNIQUE(email)`
- `idx_users_org (organizationId, isActive)`
- `idx_users_org_username (organizationId, username)`

**檢查約束**：
- `role IN ('super_admin', 'admin', 'user')`

---

## 3. 模組設定 (module_settings)

**用途**：組織層級的功能模組啟用/停用設定

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 設定唯一識別碼 |
| organizationId | TEXT | ✓ | | 所屬組織 (FK: organizations.id) |
| moduleName | TEXT | ✓ | | 模組名稱 |
| isEnabled | BOOLEAN | | FALSE | 是否啟用 |
| settings | TEXT/JSONB | | | 模組專屬設定 (JSON) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**唯一約束**：
- `UNIQUE(organizationId, moduleName)`

**索引**：
- `idx_module_settings_org (organizationId, moduleName)`

---

## 4. 病患 (patients)

**用途**：病患基本資料

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 病患唯一識別碼 |
| name | TEXT | ✓ | | 病患姓名 |
| phone | VARCHAR(50) | | | 電話號碼 |
| email | VARCHAR(500) | | | 電子郵件 |
| birthDate | DATE | | | 出生日期 |
| gender | VARCHAR(20) | | | 性別：male / female / other |
| bloodType | VARCHAR(10) | | | 血型：A / B / AB / O |
| address | TEXT | | | 地址 |
| emergencyContact | VARCHAR(500) | | | 緊急聯絡人 |
| emergencyPhone | VARCHAR(50) | | | 緊急聯絡電話 |
| medicalHistory | TEXT | | | 病史 |
| allergies | TEXT | | | 過敏史 |
| notes | TEXT | | | 備註 |
| **tags** | **TEXT (JSON)** | | **[]** | **標籤列表 (JSON 陣列)** |
| **groups** | **TEXT (JSON)** | | **[]** | **分組列表 (JSON 陣列)** |
| **healthProfile** | **TEXT (JSON)** | | **null** | **健康檔案 (JSON 物件)** |
| organizationId | VARCHAR(500) | ✓ | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_patients_org (organizationId)`
- `idx_patients_org_name (organizationId, name)`
- `idx_patients_org_updated (organizationId, updatedAt DESC)`
- `idx_patients_name (name)`
- `idx_patients_phone (phone)`

**檢查約束**：
- `gender IN ('male', 'female', 'other')`

**JSON 欄位格式**：
```json
// tags 範例
["VIP", "定期回診", "慢性病患"]

// groups 範例
["group_123", "group_456"]

// healthProfile 範例
{
  "chronicConditions": ["高血壓", "糖尿病"],
  "medications": ["降血壓藥"],
  "lastCheckup": "2025-01-15"
}
```

---

## 5. 體組成記錄 (body_composition)

**用途**：病患體組成追蹤資料

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 記錄唯一識別碼 |
| patientId | TEXT | ✓ | | 病患 ID (FK: patients.id) |
| date | TEXT | ✓ | | 測量日期 |
| weight | REAL | | | 體重 (kg) |
| height | REAL | | | 身高 (cm) |
| bodyFat | REAL | | | 體脂肪 (%) |
| muscleMass | REAL | | | 肌肉量 (kg) |
| bmi | REAL | | | BMI 值 |
| visceralFat | REAL | | | 內臟脂肪等級 |
| boneMass | REAL | | | 骨質量 (kg) |
| bodyWater | REAL | | | 體水分 (%) |
| bmr | REAL | | | 基礎代謝率 (kcal) |
| notes | TEXT | | | 備註 |
| organizationId | TEXT | | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |

**外鍵**：
- `FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE`
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_body_composition_patient (patientId, date)`
- `idx_body_composition_org (organizationId)`
- `idx_body_composition_org_patient (organizationId, patientId, date DESC)`

---

## 6. 生命徵象記錄 (vital_signs)

**用途**：病患生命徵象追蹤

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 記錄唯一識別碼 |
| patientId | TEXT | ✓ | | 病患 ID (FK: patients.id) |
| date | TEXT | ✓ | | 測量日期 |
| bloodPressureSystolic | INTEGER | | | 收縮壓 (mmHg) |
| bloodPressureDiastolic | INTEGER | | | 舒張壓 (mmHg) |
| heartRate | INTEGER | | | 心跳率 (bpm) |
| temperature | REAL | | | 體溫 (°C) |
| respiratoryRate | INTEGER | | | 呼吸率 (次/分) |
| oxygenSaturation | REAL | | | 血氧飽和度 (%) |
| bloodGlucose | REAL | | | 血糖 (mg/dL) |
| notes | TEXT | | | 備註 |
| organizationId | TEXT | | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |

**外鍵**：
- `FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE`
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_vital_signs_patient (patientId, date)`
- `idx_vital_signs_org (organizationId)`
- `idx_vital_signs_org_patient (organizationId, patientId, date DESC)`

---

## 7. 健康目標 (goals)

**用途**：病患健康目標設定與追蹤

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 目標唯一識別碼 |
| patientId | TEXT | ✓ | | 病患 ID (FK: patients.id) |
| category | TEXT | ✓ | | 目標類別 |
| title | TEXT | ✓ | | 目標標題 |
| description | TEXT | | | 目標描述 |
| currentValue | REAL | | | 當前值 |
| targetValue | REAL | ✓ | | 目標值 |
| unit | TEXT | | | 單位 |
| startDate | TEXT | ✓ | | 開始日期 |
| targetDate | TEXT | | | 目標日期 |
| status | TEXT | ✓ | | 狀態：active / completed / cancelled / overdue |
| progress | INTEGER | | 0 | 進度 (0-100) |
| milestones | TEXT (JSON) | | | 里程碑列表 (JSON 陣列) |
| organizationId | TEXT | | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE`
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_goals_patient (patientId, status)`
- `idx_goals_org (organizationId)`
- `idx_goals_org_patient (organizationId, patientId, status)`

**檢查約束**：
- `status IN ('active', 'completed', 'cancelled', 'overdue')`

---

## 8. 預約 (appointments)

**用途**：病患預約管理

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 預約唯一識別碼 |
| patientId | TEXT | ✓ | | 病患 ID (FK: patients.id) |
| date | TEXT | ✓ | | 預約日期 |
| time | TEXT | ✓ | | 預約時間 |
| type | TEXT | ✓ | | 預約類型 |
| notes | TEXT | | | 備註 |
| status | TEXT | ✓ | | 狀態：scheduled / completed / cancelled |
| reminderSent | BOOLEAN | | FALSE | 是否已發送提醒 |
| isRecurring | BOOLEAN | | FALSE | 是否為重複預約 |
| recurringPattern | TEXT | | | 重複模式 |
| recurringEndDate | TEXT | | | 重複結束日期 |
| parentAppointmentId | TEXT | | | 父預約 ID |
| reminderDays | INTEGER | | 1 | 提前提醒天數 |
| organizationId | TEXT | | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE`
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_appointments_patient (patientId, date)`
- `idx_appointments_org (organizationId)`
- `idx_appointments_org_date (organizationId, date, time)`
- `idx_appointments_org_patient (organizationId, patientId)`
- `idx_appointments_org_status (organizationId, status)`

**檢查約束**：
- `status IN ('scheduled', 'completed', 'cancelled')`

---

## 9. 標籤 (tags)

**用途**：病患分類標籤

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 標籤唯一識別碼 |
| name | TEXT | ✓ | | 標籤名稱 |
| color | TEXT | ✓ | | 標籤顏色 |
| organizationId | TEXT | | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_tags_org (organizationId)`

---

## 10. 群組 (groups)

**用途**：病患群組管理

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 群組唯一識別碼 |
| name | TEXT | ✓ | | 群組名稱 |
| description | TEXT | | | 群組描述 |
| color | TEXT | ✓ | | 群組顏色 |
| patientIds | TEXT (JSON) | | | 病患 ID 列表 (JSON 陣列) |
| organizationId | TEXT | | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_groups_org (organizationId)`

---

## 11. 服務類別 (service_types)

**用途**：服務項目分類

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 類別唯一識別碼 |
| name | TEXT | ✓ | | 類別名稱 |
| description | TEXT | | | 類別描述 |
| color | TEXT | ✓ | | 類別顏色 |
| isActive | BOOLEAN | | TRUE | 是否啟用 |
| displayOrder | INTEGER | | 0 | 顯示順序 |
| organizationId | TEXT | ✓ | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**唯一約束**：
- `UNIQUE(organizationId, name)`

**索引**：
- `idx_service_types_org (organizationId, isActive)`

---

## 12. 服務項目庫 (service_items)

**用途**：可用的服務項目定義（用於療程方案）

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | SERIAL/AUTOINCREMENT | ✓ | | 項目唯一識別碼 (自動遞增) |
| organizationId | TEXT | ✓ | | 所屬組織 (FK: organizations.id) |
| code | VARCHAR(50) | | | 項目代碼 |
| name | TEXT | ✓ | | 項目名稱 |
| category | TEXT | | | 項目類別 |
| unit | VARCHAR(20) | | '次' | 計量單位 |
| description | TEXT | | | 項目描述 |
| isActive | BOOLEAN | | TRUE | 是否啟用 |
| displayOrder | INTEGER | | 0 | 顯示順序 |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**唯一約束**：
- `UNIQUE(organizationId, code)`

---

## 13. 療程方案 (treatment_packages)

**用途**：病患購買的療程方案（包含多個服務項目）

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | SERIAL/AUTOINCREMENT | ✓ | | 方案唯一識別碼 (自動遞增) |
| organizationId | TEXT | ✓ | | 所屬組織 (FK: organizations.id) |
| patientId | TEXT | ✓ | | 病患 ID (FK: patients.id) |
| packageName | TEXT | ✓ | | 方案名稱 |
| packageNumber | VARCHAR(50) | | | 方案編號 (如 PKG-20250118-0001) |
| items | TEXT/JSONB | ✓ | | 療程項目列表 (JSON 陣列) |
| startDate | DATE | | | 開始日期 |
| expiryDate | DATE | | | 到期日期 |
| status | VARCHAR(50) | | 'active' | 狀態：active / completed / expired / cancelled |
| notes | TEXT | | | 備註 |
| createdBy | TEXT | ✓ | | 建立者 ID (FK: users.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`
- `FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE`
- `FOREIGN KEY (createdBy) REFERENCES users(id)`

**唯一約束**：
- `UNIQUE(organizationId, packageNumber)`

**索引**：
- `idx_treatment_packages_patient (patientId)`
- `idx_treatment_packages_status (status)`

**檢查約束**：
- `status IN ('active', 'completed', 'expired', 'cancelled')`

**items JSON 格式**：
```json
[
  {
    "id": 1,
    "serviceItemId": 5,
    "name": "復健治療",
    "unit": "次",
    "totalQuantity": 10,
    "usedQuantity": 3,
    "remainingQuantity": 7
  }
]
```

---

## 14. 療程方案使用記錄 (package_usage_logs)

**用途**：記錄療程方案的每次使用

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | SERIAL/AUTOINCREMENT | ✓ | | 記錄唯一識別碼 (自動遞增) |
| organizationId | TEXT | ✓ | | 所屬組織 (FK: organizations.id) |
| packageId | INTEGER | ✓ | | 療程方案 ID (FK: treatment_packages.id) |
| serviceItemId | INTEGER | ✓ | | 服務項目 ID (items 陣列中的 id) |
| usageDate | DATE | ✓ | | 使用日期 |
| quantity | REAL | | 1 | 使用數量 |
| performedBy | TEXT | | | 執行人員 ID (FK: users.id) |
| notes | TEXT | | | 備註 |
| appointmentId | TEXT | | | 關聯預約 ID (FK: appointments.id) |
| createdBy | TEXT | ✓ | | 建立者 ID (FK: users.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`
- `FOREIGN KEY (packageId) REFERENCES treatment_packages(id) ON DELETE CASCADE`
- `FOREIGN KEY (performedBy) REFERENCES users(id)`
- `FOREIGN KEY (appointmentId) REFERENCES appointments(id)`
- `FOREIGN KEY (createdBy) REFERENCES users(id)`

**注意**：serviceItemId 是內部識別碼，**不設外鍵約束** (依據 migration 012)

**索引**：
- `idx_package_usage_logs_package (packageId)`
- `idx_package_usage_logs_date (usageDate)`

---

## 15. 諮詢記錄 (consultations)

**用途**：病患諮詢記錄

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 記錄唯一識別碼 |
| patientId | TEXT | ✓ | | 病患 ID (FK: patients.id) |
| date | TEXT | ✓ | | 諮詢日期 |
| type | TEXT | | | 諮詢類型 |
| chiefComplaint | TEXT | | | 主訴 |
| assessment | TEXT | | | 評估 |
| plan | TEXT | | | 計畫 |
| notes | TEXT | | | 備註 |
| organizationId | TEXT | | | 所屬組織 (FK: organizations.id) |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE`
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_consultations_patient (patientId, date)`
- `idx_consultations_org (organizationId)`
- `idx_consultations_org_patient (organizationId, patientId, date DESC)`

---

## 16. LINE 配置 (line_configs)

**用途**：組織的 LINE 整合配置

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 配置唯一識別碼 |
| organizationId | TEXT UNIQUE | ✓ | | 所屬組織 (FK: organizations.id) |
| channelId | TEXT | ✓ | | LINE Channel ID |
| channelSecret | TEXT | ✓ | | LINE Channel Secret (加密儲存) |
| accessToken | TEXT | ✓ | | LINE Access Token (加密儲存) |
| webhookUrl | TEXT | | | Webhook URL |
| isActive | BOOLEAN | | TRUE | 是否啟用 |
| isVerified | BOOLEAN | | FALSE | 是否已驗證 |
| lastVerifiedAt | TIMESTAMP | | | 最後驗證時間 |
| enabledFeatures | TEXT (JSON) | | | 啟用功能列表 (JSON 物件) |
| messagesSentToday | INTEGER | | 0 | 今日已發送訊息數 |
| messagesSentThisMonth | INTEGER | | 0 | 本月已發送訊息數 |
| totalMessagesSent | INTEGER | | 0 | 累計已發送訊息數 |
| totalMessagesReceived | INTEGER | | 0 | 累計已接收訊息數 |
| dailyMessageLimit | INTEGER | | 1000 | 每日訊息上限 |
| monthlyMessageLimit | INTEGER | | 30000 | 每月訊息上限 |
| lastActivityAt | TIMESTAMP | | | 最後活動時間 |
| lastError | TEXT | | | 最後錯誤訊息 |
| errorCount | INTEGER | | 0 | 錯誤次數 |
| lastErrorAt | TIMESTAMP | | | 最後錯誤時間 |
| configuredById | TEXT | | | 配置者 ID (FK: users.id) |
| configuredAt | TIMESTAMP | | | 配置時間 |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**唯一約束**：
- `UNIQUE(organizationId)`

**索引**：
- `idx_line_configs_org (organizationId, isActive)`

---

## 17. LINE 用戶 (line_users)

**用途**：LINE 好友資料（獨立於病患，可選擇性綁定）

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 用戶唯一識別碼 |
| lineUserId | VARCHAR(500) UNIQUE | ✓ | | LINE User ID |
| organizationId | VARCHAR(500) | ✓ | | 所屬組織 (FK: organizations.id) |
| displayName | VARCHAR(500) | | | 顯示名稱 |
| pictureUrl | TEXT | | | 頭像 URL |
| statusMessage | TEXT | | | 狀態訊息 |
| language | VARCHAR(50) | | | 語言設定 |
| patientId | VARCHAR(500) | | | 綁定的病患 ID (FK: patients.id，可為空) |
| isActive | BOOLEAN | | TRUE | 是否活躍 |
| followedAt | TIMESTAMP | | | 關注時間 |
| unfollowedAt | TIMESTAMP | | | 取消關注時間 |
| lastInteractionAt | TIMESTAMP | | | 最後互動時間 |
| tags | TEXT/JSONB | | | 標籤 (JSON 陣列) |
| notes | TEXT | | | 備註 |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`
- `FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL`

**唯一約束**：
- `UNIQUE(lineUserId)`

**索引**：
- `idx_line_users_line_user_id (lineUserId)`
- `idx_line_users_organization (organizationId)`
- `idx_line_users_patient (patientId)`

---

## 18. 對話管理 (conversations)

**用途**：LINE 對話管理

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 對話唯一識別碼 |
| lineUserId | VARCHAR(500) | | | LINE 用戶 ID (FK: line_users.id) |
| patientId | VARCHAR(500) | | | 病患 ID (FK: patients.id) |
| organizationId | VARCHAR(500) | ✓ | | 所屬組織 (FK: organizations.id) |
| status | VARCHAR(50) | | 'ACTIVE' | 狀態：ACTIVE / ARCHIVED / CLOSED |
| priority | VARCHAR(50) | | 'MEDIUM' | 優先級：LOW / MEDIUM / HIGH / URGENT |
| lastMessageAt | TIMESTAMP | | | 最後訊息時間 |
| lastMessagePreview | TEXT | | | 最後訊息預覽 |
| unreadCount | INTEGER | | 0 | 未讀訊息數 |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |
| updatedAt | TIMESTAMP | ✓ | | 更新時間 |

**外鍵**：
- `FOREIGN KEY (lineUserId) REFERENCES line_users(id) ON DELETE CASCADE`
- `FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE`
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_conversations_line_user (lineUserId)`
- `idx_conversations_patient (patientId)`
- `idx_conversations_organization (organizationId)`
- `idx_conversations_status (status)`
- `idx_conversations_org_status (organizationId, status)`

**檢查約束**：
- `status IN ('ACTIVE', 'ARCHIVED', 'CLOSED')`
- `priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')`

---

## 19. LINE 訊息記錄 (line_messages)

**用途**：LINE 訊息收發記錄

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | TEXT PRIMARY KEY | ✓ | | 訊息唯一識別碼 |
| conversationId | TEXT | | | 對話 ID (FK: conversations.id) |
| organizationId | TEXT | ✓ | | 所屬組織 (FK: organizations.id) |
| messageType | TEXT | ✓ | | 訊息類型：TEXT / STICKER / IMAGE / SYSTEM |
| messageContent | TEXT | ✓ | | 訊息內容 |
| senderId | TEXT | | | 發送者 ID |
| recipientId | TEXT | | | 接收者 ID |
| senderType | TEXT | ✓ | | 發送者類型：PATIENT / ADMIN / SYSTEM |
| recipientType | TEXT | | | 接收者類型：PATIENT / ADMIN |
| lineMessageId | TEXT | | | LINE 訊息 ID |
| replyToken | TEXT | | | LINE Reply Token |
| status | TEXT | | 'SENT' | 狀態：SENT / DELIVERED / READ / FAILED |
| sentAt | TIMESTAMP | ✓ | | 發送時間 |
| deliveredAt | TIMESTAMP | | | 送達時間 |
| readAt | TIMESTAMP | | | 已讀時間 |
| isReply | BOOLEAN | | FALSE | 是否為回覆 |
| quotedMessageId | TEXT | | | 引用訊息 ID |
| metadata | TEXT (JSON) | | | 後設資料 (如貼圖資訊) |
| retryCount | INTEGER | | 0 | 重試次數 |
| errorMessage | TEXT | | | 錯誤訊息 |
| createdAt | TIMESTAMP | ✓ | | 建立時間 |

**外鍵**：
- `FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE`
- `FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE`

**索引**：
- `idx_line_messages_conversation (conversationId, createdAt DESC)`
- `idx_line_messages_org (organizationId)`
- `idx_line_messages_line_id (lineMessageId)`

**檢查約束**：
- `messageType IN ('TEXT', 'STICKER', 'IMAGE', 'SYSTEM')`
- `senderType IN ('PATIENT', 'ADMIN', 'SYSTEM')`
- `recipientType IN ('PATIENT', 'ADMIN')`
- `status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')`

---

## 20. 遷移追蹤 (migrations)

**用途**：資料庫遷移執行記錄（已廢除，但保留表結構）

| 欄位名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| id | SERIAL/AUTOINCREMENT | ✓ | | 記錄唯一識別碼 |
| name | TEXT UNIQUE | ✓ | | 遷移名稱 |
| executed_at | TIMESTAMP | | CURRENT_TIMESTAMP | 執行時間 |

**唯一約束**：
- `UNIQUE(name)`

---

## 資料類型對照表

### SQLite vs PostgreSQL

| 邏輯類型 | SQLite | PostgreSQL |
|---------|--------|------------|
| 主鍵 (文字) | TEXT PRIMARY KEY | TEXT PRIMARY KEY / VARCHAR(500) PRIMARY KEY |
| 主鍵 (自動遞增) | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL PRIMARY KEY |
| 文字 | TEXT | TEXT |
| 短文字 | TEXT / VARCHAR(50) | VARCHAR(50) / VARCHAR(500) |
| 整數 | INTEGER | INTEGER |
| 浮點數 | REAL | REAL / DECIMAL |
| 布林值 | INTEGER (0/1) | BOOLEAN |
| 時間戳記 | TEXT (ISO 8601) | TIMESTAMP |
| 日期 | TEXT (YYYY-MM-DD) | DATE |
| JSON | TEXT | JSONB |

---

## 關鍵設計原則

### 1. 多租戶架構 (Multi-Tenancy)
- 所有業務表都包含 `organizationId` 欄位
- 透過 `tenantContext` middleware 自動過濾資料
- 確保資料完全隔離

### 2. JSON 欄位使用
以下欄位使用 JSON 格式儲存：
- `patients.tags` - 病患標籤陣列
- `patients.groups` - 病患分組陣列
- `patients.healthProfile` - 健康檔案物件
- `groups.patientIds` - 病患 ID 列表
- `goals.milestones` - 里程碑列表
- `treatment_packages.items` - 療程項目列表
- `line_configs.enabledFeatures` - 啟用功能配置
- `line_users.tags` - LINE 用戶標籤
- `line_messages.metadata` - 訊息後設資料
- `organizations.settings` - 組織設定（包含模組配置）

### 3. 外鍵級聯刪除
- 組織刪除時，所有關聯資料自動刪除 (`ON DELETE CASCADE`)
- 病患刪除時，相關記錄自動刪除
- LINE 用戶與病患綁定時使用 `ON DELETE SET NULL`

### 4. 索引策略
- 多租戶複合索引：`(organizationId, ...)`
- 查詢最佳化：時間欄位使用 DESC 排序
- 外鍵欄位都建立索引

### 5. 特殊注意事項
- **package_usage_logs.serviceItemId** 不設外鍵約束（內部識別碼）
- **布林值** 在 SQLite 使用 INTEGER (0/1)，PostgreSQL 使用 BOOLEAN
- **時間戳記** 統一使用 ISO 8601 格式

---

## 變更記錄

- **2025-11-18**: 基於所有程式碼分析建立完整文檔
  - 發現並記錄 `patients` 表缺少 `tags`, `groups`, `healthProfile` 三個 JSON 欄位
  - 確認所有 LINE 整合表結構
  - 確認療程管理表結構（service_items, treatment_packages, package_usage_logs）
  - 整理所有 20 個資料表的完整欄位定義
