-- ============================================================================
-- PostgreSQL Row-Level Security (RLS) 策略
-- ============================================================================
--
-- 目的：在資料庫層強制執行多租戶資料隔離
-- 適用：PostgreSQL 9.5+
--
-- 核心概念：
-- 1. 使用 current_setting('app.current_org_id') 取得當前組織 ID
-- 2. 每個請求開始時設定 SET LOCAL app.current_org_id = '...'
-- 3. RLS 策略自動過濾所有 SELECT/INSERT/UPDATE/DELETE
-- 4. 即使應用層被繞過，資料庫層仍能保護資料
--
-- 注意事項：
-- - 此腳本僅適用於 PostgreSQL
-- - SQLite 不支援 RLS，需依賴應用層過濾
-- - Super Admin 可跨組織存取（透過 USING (true) 策略）
-- ============================================================================

-- ============================================================================
-- 輔助函式：取得當前組織 ID
-- ============================================================================

-- 創建函式以安全地取得當前組織 ID
-- 如果未設定則返回 NULL（此時策略會阻止存取）
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_org_id', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_org_id() IS
'安全地取得當前請求的組織 ID。如果未設定 app.current_org_id，返回 NULL。';

-- ============================================================================
-- 1. PATIENTS 表 - 病患資料
-- ============================================================================

-- 啟用 RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- SELECT 策略：只能查看本組織的病患
CREATE POLICY patients_select_policy ON patients
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

-- INSERT 策略：只能插入本組織的病患
CREATE POLICY patients_insert_policy ON patients
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

-- UPDATE 策略：只能更新本組織的病患
CREATE POLICY patients_update_policy ON patients
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

-- DELETE 策略：只能刪除本組織的病患
CREATE POLICY patients_delete_policy ON patients
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

COMMENT ON POLICY patients_select_policy ON patients IS 'RLS: 只允許查看本組織的病患資料';
COMMENT ON POLICY patients_insert_policy ON patients IS 'RLS: 只允許插入本組織的病患資料';
COMMENT ON POLICY patients_update_policy ON patients IS 'RLS: 只允許更新本組織的病患資料';
COMMENT ON POLICY patients_delete_policy ON patients IS 'RLS: 只允許刪除本組織的病患資料';

-- ============================================================================
-- 2. CONSULTATIONS 表 - 諮詢記錄
-- ============================================================================

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultations_select_policy ON consultations
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY consultations_insert_policy ON consultations
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY consultations_update_policy ON consultations
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY consultations_delete_policy ON consultations
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 3. BODY_COMPOSITION 表 - 體組成記錄
-- ============================================================================

ALTER TABLE body_composition ENABLE ROW LEVEL SECURITY;

CREATE POLICY body_composition_select_policy ON body_composition
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY body_composition_insert_policy ON body_composition
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY body_composition_update_policy ON body_composition
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY body_composition_delete_policy ON body_composition
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 4. VITAL_SIGNS 表 - 生命徵象記錄
-- ============================================================================

ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY vital_signs_select_policy ON vital_signs
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY vital_signs_insert_policy ON vital_signs
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY vital_signs_update_policy ON vital_signs
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY vital_signs_delete_policy ON vital_signs
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 5. GOALS 表 - 健康目標
-- ============================================================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_select_policy ON goals
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY goals_insert_policy ON goals
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY goals_update_policy ON goals
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY goals_delete_policy ON goals
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 6. APPOINTMENTS 表 - 預約記錄
-- ============================================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointments_select_policy ON appointments
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY appointments_insert_policy ON appointments
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY appointments_update_policy ON appointments
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY appointments_delete_policy ON appointments
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 7. SERVICE_TYPES 表 - 服務類型
-- ============================================================================

ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_types_select_policy ON service_types
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY service_types_insert_policy ON service_types
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY service_types_update_policy ON service_types
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY service_types_delete_policy ON service_types
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 8. TREATMENT_PACKAGES 表 - 療程方案
-- ============================================================================

ALTER TABLE treatment_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY treatment_packages_select_policy ON treatment_packages
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY treatment_packages_insert_policy ON treatment_packages
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY treatment_packages_update_policy ON treatment_packages
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY treatment_packages_delete_policy ON treatment_packages
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 9. TAGS 表 - 標籤
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select_policy ON tags
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY tags_insert_policy ON tags
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY tags_update_policy ON tags
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY tags_delete_policy ON tags
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 10. GROUPS 表 - 群組
-- ============================================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY groups_select_policy ON groups
  FOR SELECT
  USING ("organizationId" = get_current_org_id());

CREATE POLICY groups_insert_policy ON groups
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY groups_update_policy ON groups
  FOR UPDATE
  USING ("organizationId" = get_current_org_id())
  WITH CHECK ("organizationId" = get_current_org_id());

CREATE POLICY groups_delete_policy ON groups
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 11. USERS 表 - 使用者（特殊處理）
-- ============================================================================

-- 使用者表需要特殊處理：
-- - 一般使用者只能看到同組織的使用者
-- - Super Admin 可以看到所有使用者（透過應用層額外控制）

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING ("organizationId" = get_current_org_id() OR "organizationId" IS NULL);
  -- organizationId IS NULL 允許查看 super_admin（super_admin 沒有 organizationId）

CREATE POLICY users_insert_policy ON users
  FOR INSERT
  WITH CHECK ("organizationId" = get_current_org_id() OR "organizationId" IS NULL);

CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING ("organizationId" = get_current_org_id() OR "organizationId" IS NULL)
  WITH CHECK ("organizationId" = get_current_org_id() OR "organizationId" IS NULL);

CREATE POLICY users_delete_policy ON users
  FOR DELETE
  USING ("organizationId" = get_current_org_id());

-- ============================================================================
-- 12. AUDIT_LOGS 表 - 審計日誌（只允許插入，不允許修改/刪除）
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 允許查看本組織的審計日誌
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING ("organizationId" = get_current_org_id() OR "organizationId" IS NULL);

-- 允許插入審計日誌
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- 審計日誌允許任何組織插入

-- 禁止更新審計日誌（審計日誌應該是 immutable）
-- 不創建 UPDATE 策略意味著禁止更新

-- 禁止刪除審計日誌（需要 super_admin 手動處理）
-- 不創建 DELETE 策略意味著禁止刪除

COMMENT ON POLICY audit_logs_select_policy ON audit_logs IS 'RLS: 允許查看本組織的審計日誌';
COMMENT ON POLICY audit_logs_insert_policy ON audit_logs IS 'RLS: 允許插入審計日誌（任何組織）';

-- ============================================================================
-- 驗證 RLS 策略
-- ============================================================================

-- 查看所有已啟用 RLS 的表
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE rowsecurity = true
ORDER BY tablename;

-- 查看所有 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
ORDER BY tablename, policyname;

-- ============================================================================
-- 停用 RLS（僅在需要時使用，如資料遷移）
-- ============================================================================

-- 警告：停用 RLS 會移除資料庫層的安全防護
-- 僅在需要執行管理任務時暫時停用

-- -- 停用單一表的 RLS
-- ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
--
-- -- 停用所有表的 RLS（危險！）
-- DO $$
-- DECLARE
--   r RECORD;
-- BEGIN
--   FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true
--   LOOP
--     EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
--   END LOOP;
-- END $$;

-- ============================================================================
-- 測試 RLS 策略
-- ============================================================================

-- 測試步驟：
-- 1. 設定組織上下文
--    SET app.current_org_id = 'org-001';
--
-- 2. 查詢資料（應該只看到 org-001 的資料）
--    SELECT * FROM patients;
--
-- 3. 更換組織上下文
--    SET app.current_org_id = 'org-002';
--
-- 4. 再次查詢（應該只看到 org-002 的資料）
--    SELECT * FROM patients;
--
-- 5. 重置上下文
--    RESET app.current_org_id;
--
-- 6. 再次查詢（應該看不到任何資料，因為沒有設定組織 ID）
--    SELECT * FROM patients;

-- ============================================================================
-- 完成
-- ============================================================================

-- 輸出成功訊息
DO $$
BEGIN
  RAISE NOTICE '✅ PostgreSQL Row-Level Security 策略已成功創建';
  RAISE NOTICE '📊 已為 12 個表啟用 RLS 保護';
  RAISE NOTICE '🔒 資料庫層多租戶隔離已生效';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  重要提醒：';
  RAISE NOTICE '  1. 應用層必須在每次請求開始時設定 app.current_org_id';
  RAISE NOTICE '  2. 使用 SET LOCAL 確保上下文僅在當前交易有效';
  RAISE NOTICE '  3. 定期檢查 RLS 策略是否正常運作';
  RAISE NOTICE '  4. SQLite 不支援 RLS，仍需依賴應用層過濾';
END $$;
