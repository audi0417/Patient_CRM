# PostgreSQL Row-Level Security (RLS) 設定指引

## 概述

本文檔說明如何在 PostgreSQL 資料庫中啟用和配置 Row-Level Security (RLS)，以提供**資料庫層的多租戶資料隔離防護**。

**版本**: 1.0
**日期**: 2026-01-31
**適用**: PostgreSQL 9.5+

---

## 目錄

1. [什麼是 RLS](#什麼是-rls)
2. [為什麼需要 RLS](#為什麼需要-rls)
3. [部署前準備](#部署前準備)
4. [部署步驟](#部署步驟)
5. [測試與驗證](#測試與驗證)
6. [疑難排解](#疑難排解)
7. [效能考量](#效能考量)
8. [常見問題](#常見問題)

---

## 什麼是 RLS

**Row-Level Security (RLS)** 是 PostgreSQL 的原生功能，允許在**資料庫層**定義存取控制策略，自動過濾查詢結果。

### 核心概念

```
應用層查詢: SELECT * FROM patients;

RLS 自動轉換為:
SELECT * FROM patients
WHERE "organizationId" = current_setting('app.current_org_id');
```

### 運作機制

1. 應用層在每個請求開始時設定 `app.current_org_id`
2. PostgreSQL RLS 策略自動過濾所有 SELECT/INSERT/UPDATE/DELETE
3. 即使應用層被繞過（如 SQL 注入），RLS 仍能保護資料

---

## 為什麼需要 RLS

### 安全層級對比

| 層級 | 防護方式 | RLS 啟用前 | RLS 啟用後 |
|------|---------|----------|----------|
| **應用層** | TenantQuery 過濾 | ✅ 有效 | ✅ 有效 |
| **資料庫層** | RLS 策略 | ❌ 無保護 | ✅ 有效 |

### 防護場景

RLS 能防止以下攻擊：

1. **SQL 注入繞過應用層過濾**
   ```sql
   -- 攻擊者嘗試注入：
   '; SELECT * FROM patients WHERE '1'='1

   -- 即使成功執行，RLS 仍會過濾結果
   ```

2. **應用層程式碼漏洞**
   - 忘記加上 `WHERE organizationId = ?`
   - 使用錯誤的 organizationId
   - RLS 作為最後一道防線

3. **直接資料庫存取**
   - 管理員誤操作
   - 第三方工具存取
   - RLS 強制執行隔離

---

## 部署前準備

### 1. 檢查 PostgreSQL 版本

RLS 需要 PostgreSQL 9.5 或更新版本：

```bash
psql -c "SELECT version();"
```

### 2. 備份資料庫

⚠️ **重要：啟用 RLS 前務必完整備份**

```bash
# 完整備份
pg_dump -h localhost -U username -d database_name -F c -f rls-backup-$(date +%Y%m%d).dump

# 驗證備份
pg_restore --list rls-backup-*.dump | head
```

### 3. 確認環境變數

確保 `.env` 已正確設定：

```bash
DB_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:port/database
# 或分開設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hospital_crm
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## 部署步驟

### 步驟 1：執行 RLS 策略 SQL

連線到 PostgreSQL 並執行策略腳本：

```bash
psql -h localhost -U postgres -d hospital_crm -f server/database/rls-policies.sql
```

或使用 `psql` 互動模式：

```sql
\i server/database/rls-policies.sql
```

預期輸出：

```
✅ PostgreSQL Row-Level Security 策略已成功創建
📊 已為 12 個表啟用 RLS 保護
🔒 資料庫層多租戶隔離已生效
```

### 步驟 2：驗證 RLS 已啟用

檢查哪些表已啟用 RLS：

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
```

預期結果應包含：
- `patients`
- `consultations`
- `body_composition`
- `vital_signs`
- `goals`
- `appointments`
- 等其他表

### 步驟 3：檢查 RLS 策略

查看所有 RLS 策略：

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

每個表應該有 4 個策略：
- `*_select_policy` (SELECT)
- `*_insert_policy` (INSERT)
- `*_update_policy` (UPDATE)
- `*_delete_policy` (DELETE)

### 步驟 4：重啟應用伺服器

RLS 策略已在資料庫層生效，現在重啟應用：

```bash
# 如果使用 pm2
pm2 restart hospital-crm

# 或直接重啟
npm run server
```

應用層會自動在每個請求開始時設定 `app.current_org_id`。

---

## 測試與驗證

### 自動化測試

執行 RLS 測試腳本：

```bash
node server/database/test-rls.js
```

測試腳本會驗證：
1. ✅ RLS 是否已啟用
2. ✅ RLS 策略是否存在
3. ✅ 資料隔離是否有效
4. ✅ 跨組織存取是否被阻止
5. ✅ INSERT/UPDATE/DELETE 隔離

### 手動測試

#### 測試 1：基本資料隔離

```sql
-- 設定組織 1 上下文
SET app.current_org_id = 'org-001';

-- 查詢病患（應該只看到 org-001 的資料）
SELECT id, name, "organizationId" FROM patients;

-- 設定組織 2 上下文
SET app.current_org_id = 'org-002';

-- 再次查詢（應該只看到 org-002 的資料）
SELECT id, name, "organizationId" FROM patients;
```

#### 測試 2：跨組織存取阻止

```sql
-- 設定組織 1 上下文
SET app.current_org_id = 'org-001';

-- 嘗試查詢組織 2 的特定病患（應該返回空）
SELECT * FROM patients WHERE id = 'patient-from-org-002';
-- 預期結果：0 rows
```

#### 測試 3：INSERT 隔離

```sql
-- 設定組織 1 上下文
SET app.current_org_id = 'org-001';

-- 嘗試插入組織 2 的資料（應該失敗）
INSERT INTO patients (id, name, "organizationId", "createdAt", "updatedAt")
VALUES ('test-001', 'Test Patient', 'org-002', NOW(), NOW());
-- 預期錯誤：new row violates row-level security policy
```

#### 測試 4：無上下文查詢

```sql
-- 重置組織上下文
RESET app.current_org_id;

-- 查詢病患（應該看不到任何資料）
SELECT * FROM patients;
-- 預期結果：0 rows
```

---

## 疑難排解

### 問題 1：RLS 策略創建失敗

**錯誤訊息**:
```
ERROR: relation "patients" does not exist
```

**解決方法**:
- 確認資料庫 schema 已正確創建
- 執行 `server/database/schema.js` 的 SQL
- 檢查表名稱大小寫

### 問題 2：查詢返回空結果

**症狀**: 啟用 RLS 後所有查詢都返回空

**可能原因**:
1. 未設定 `app.current_org_id`
2. 設定的 organizationId 不正確
3. 資料的 organizationId 與上下文不符

**診斷**:
```sql
-- 檢查當前上下文
SHOW app.current_org_id;

-- 檢查資料的 organizationId
SELECT "organizationId", COUNT(*) FROM patients GROUP BY "organizationId";
```

### 問題 3：應用層未設定 RLS 上下文

**症狀**: 測試腳本通過，但應用仍可跨組織存取

**解決方法**:
- 檢查 `tenantContext.js` 是否正確修改
- 確認 `DB_TYPE=postgres`
- 檢查 `db.adapter.setOrgContext` 是否被調用
- 查看伺服器日誌

### 問題 4：Super Admin 無法存取資料

**症狀**: Super Admin 登入後看不到任何資料

**解決方法**:
Super Admin 通常沒有 `organizationId`，需要特殊處理：

選項 A：應用層跳過 RLS（推薦）
```javascript
// 在 requireTenant 中加入條件
if (req.user.role !== 'super_admin') {
  await db.adapter.setOrgContext(org.id);
}
```

選項 B：資料庫層創建 Super Admin 策略
```sql
CREATE POLICY patients_select_superadmin ON patients
  FOR SELECT
  USING (
    "organizationId" = get_current_org_id()
    OR current_setting('app.user_role', true) = 'super_admin'
  );
```

---

## 效能考量

### RLS 對效能的影響

| 操作 | 無 RLS | 有 RLS | 差異 |
|------|--------|--------|------|
| SELECT (簡單) | ~1ms | ~1.2ms | +20% |
| SELECT (複雜) | ~50ms | ~52ms | +4% |
| INSERT | ~2ms | ~2.5ms | +25% |
| UPDATE | ~3ms | ~3.5ms | +17% |

### 優化建議

1. **確保 organizationId 有索引**
   ```sql
   CREATE INDEX idx_patients_org ON patients("organizationId");
   ```

2. **使用 EXPLAIN 分析查詢**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM patients WHERE "organizationId" = 'org-001';
   ```

3. **監控查詢效能**
   - 使用 pg_stat_statements
   - 監控慢查詢日誌

---

## 常見問題

### Q1: RLS 與應用層過濾哪個優先？

A: **兩者都會生效**，RLS 是額外的資料庫層防護，不會取代應用層過濾。

### Q2: SQLite 是否支援 RLS？

A: **不支援**。SQLite 沒有 RLS 功能，必須完全依賴應用層過濾（TenantQuery）。

### Q3: 如何暫時停用 RLS？

A: 僅在緊急情況下使用：

```sql
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
```

⚠️ **警告**：停用 RLS 會移除資料庫層保護。

### Q4: RLS 會影響資料備份嗎？

A: 不會。`pg_dump` 會備份所有資料，不受 RLS 影響。

### Q5: 如何查看 RLS 阻止的操作？

A: 啟用 PostgreSQL 日誌：

```sql
ALTER DATABASE hospital_crm SET log_statement = 'all';
ALTER DATABASE hospital_crm SET log_min_messages = 'notice';
```

查看日誌：
```bash
tail -f /var/log/postgresql/postgresql-*.log | grep "row-level security"
```

### Q6: 多個連線池會共用 RLS 上下文嗎？

A: **不會**。使用 `SET LOCAL` 確保上下文僅在當前交易有效，連線池復用連線時上下文會自動重置。

---

## 安全最佳實踐

### 1. 雙層防護策略

```
請求 → 應用層過濾 (TenantQuery) → 資料庫層過濾 (RLS) → 結果
```

兩層都必須正確配置。

### 2. 定期審計

```sql
-- 檢查未啟用 RLS 的表
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('organizations', 'migrations');
```

### 3. 監控 RLS 策略變更

```sql
-- 記錄 RLS 策略修改
CREATE TABLE rls_audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT,
  policy_name TEXT,
  action TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

---

## 總結

啟用 PostgreSQL RLS 後，您的系統擁有：

✅ **雙層安全防護**：應用層 + 資料庫層
✅ **防SQL注入**：即使注入成功，RLS 仍會過濾
✅ **零信任架構**：不依賴應用層正確性
✅ **合規要求**：符合資料隔離法規要求

---

**文檔版本**: 1.0
**最後更新**: 2026-01-31
**維護者**: 系統架構團隊
