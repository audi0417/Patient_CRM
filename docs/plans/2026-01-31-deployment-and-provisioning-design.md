# 部署與開通設計方案

**日期**: 2026-01-31
**狀態**: Draft
**作者**: System Design

## 1. 概述

### 1.1 目標

設計一套完整的部署與開通方案，支援：
- **SaaS 模式**：多租戶雲端部署，自動化開通
- **地端部署**：客戶私有環境部署，License Key 管理
- **混合部署**：未來支援混合雲場景

### 1.2 核心原則

1. **統一程式碼庫**：SaaS 和地端使用相同的程式碼，透過配置區分
2. **自動化優先**：減少人工介入，提升效率
3. **安全至上**：License 驗證、資料隔離、存取控制
4. **可觀測性**：完整的日誌、監控、告警體系
5. **向後兼容**：支援平滑升級和回滾

---

## 2. 整體架構

### 2.1 部署模式對照

| 項目 | SaaS 模式 | 地端部署 |
|------|-----------|----------|
| **部署位置** | 雲端（AWS/GCP/Azure） | 客戶私有環境 |
| **資料庫** | 雲端 PostgreSQL（RDS/CloudSQL） | 客戶自建 PostgreSQL |
| **租戶隔離** | RLS + tenant_id | RLS + tenant_id |
| **認證方式** | 統一登入系統 | License Key + 本地認證 |
| **開通流程** | 自動化（API/Admin Portal） | 手動配置 + License |
| **更新方式** | CI/CD 自動部署 | 版本包 + 更新腳本 |
| **監控** | 集中式監控（CloudWatch/Datadog） | 可選的本地監控 |
| **計費** | 訂閱制（按租戶/用戶數） | License 一次性或年費 |

### 2.2 共享組件

兩種部署模式共享以下核心組件：
- 應用程式碼（React + Node.js）
- 資料庫 Schema（PostgreSQL + RLS）
- 加密模組（欄位加密、密碼雜湊）
- 存取控制矩陣（RBAC）
- 稽核日誌服務

### 2.3 差異化組件

| 組件 | SaaS 專用 | 地端專用 |
|------|----------|----------|
| **租戶管理** | Superadmin Portal | N/A |
| **License 管理** | N/A | License Server |
| **自動開通** | Provisioning API | Setup Wizard |
| **監控** | CloudWatch/Datadog | 可選的 Prometheus |
| **備份** | 自動化備份 | 手動或客戶自建 |

---

## 3. SaaS 部署架構

### 3.1 雲端基礎設施

```
┌─────────────────────────────────────────────────────────────┐
│                         用戶流量                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (ALB)                       │
│                  SSL Termination + WAF                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   App Server  │ │   App Server  │ │   App Server  │
│   (ECS/K8s)   │ │   (ECS/K8s)   │ │   (ECS/K8s)   │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │    PostgreSQL (RDS/CloudSQL)     │
        │    - Multi-tenant (RLS)          │
        │    - Automated Backups           │
        │    - Read Replicas               │
        └─────────────────────────────────┘
```

### 3.2 租戶開通流程

```mermaid
sequenceDiagram
    participant Admin as 管理員
    participant Portal as Superadmin Portal
    participant API as Provisioning API
    participant DB as Database
    participant Notify as Notification Service

    Admin->>Portal: 創建新租戶
    Portal->>API: POST /api/superadmin/tenants
    API->>DB: 創建 Organization 記錄
    API->>DB: 初始化預設群組
    API->>DB: 創建管理員帳號
    API->>Notify: 發送歡迎郵件
    Notify-->>Admin: 租戶創建成功
```

**實現步驟**：
1. **租戶資料庫記錄**：在 `organizations` 表創建新記錄
2. **預設群組**：創建「全部病患」群組
3. **管理員帳號**：創建初始管理員（角色：admin）
4. **密鑰生成**：為租戶生成獨立的加密密鑰（存入 KMS）
5. **通知發送**：郵件通知管理員登入資訊

### 3.3 多租戶隔離

#### RLS 策略（已實現）
```sql
-- 範例：consultations 表的 RLS
CREATE POLICY consultations_tenant_isolation ON consultations
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

#### 中介層強制設定
```javascript
// server/middleware/tenantContext.js
app.use((req, res, next) => {
  const tenantId = req.user.tenant_id;
  req.db.query('SET app.current_tenant = $1', [tenantId]);
  next();
});
```

### 3.4 自動化部署 (CI/CD)

```yaml
# .github/workflows/deploy-saas.yml
name: Deploy SaaS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Tests
        run: npm test

      - name: Build Docker Image
        run: docker build -t patient-crm:${{ github.sha }} .

      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker tag patient-crm:${{ github.sha }} $ECR_REGISTRY/patient-crm:latest
          docker push $ECR_REGISTRY/patient-crm:latest

      - name: Update ECS Service
        run: |
          aws ecs update-service --cluster prod-cluster --service patient-crm --force-new-deployment

      - name: Run Migrations
        run: |
          aws ecs run-task --cluster prod-cluster --task-definition db-migration
```

---

## 4. 地端部署架構

### 4.1 部署拓撲

```
客戶內網環境
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  ┌─────────────────┐         ┌──────────────────┐       │
│  │  Web Server     │◄────────│  Reverse Proxy   │       │
│  │  (Node.js)      │         │  (Nginx/Apache)  │       │
│  └────────┬────────┘         └──────────────────┘       │
│           │                                              │
│           ▼                                              │
│  ┌─────────────────┐         ┌──────────────────┐       │
│  │  PostgreSQL DB  │◄────────│  Backup Service  │       │
│  │  (Self-hosted)  │         │  (Optional)      │       │
│  └─────────────────┘         └──────────────────┘       │
│                                                           │
│  ┌──────────────────────────────────────────────┐       │
│  │          License Verification                 │       │
│  │  - Offline verification                       │       │
│  │  - Hardware fingerprint binding               │       │
│  └──────────────────────────────────────────────┘       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 4.2 License Key 機制

#### License Key 結構
```javascript
// License Key 格式（JWT-based）
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "customer_id": "CUST-12345",
    "customer_name": "醫院名稱",
    "license_type": "enterprise", // starter | professional | enterprise
    "max_users": 50,
    "max_patients": 10000,
    "features": [
      "consultation_management",
      "body_composition",
      "vital_signs",
      "audit_logs",
      "field_encryption"
    ],
    "issued_at": "2026-01-31T00:00:00Z",
    "expires_at": "2027-01-31T23:59:59Z",
    "hardware_binding": {
      "method": "mac_address", // mac_address | cpu_id | mixed
      "fingerprint": "sha256_hash_of_hardware_info"
    }
  },
  "signature": "..."
}
```

#### License 驗證流程
```javascript
// server/services/licenseService.js

class LicenseService {
  constructor() {
    this.publicKey = fs.readFileSync('/etc/patient-crm/license-public.pem');
    this.licenseCache = null;
    this.lastCheck = null;
  }

  // 啟動時驗證
  async verifyOnStartup() {
    const licenseKey = process.env.LICENSE_KEY;
    if (!licenseKey) {
      throw new Error('License key not found');
    }

    try {
      const license = jwt.verify(licenseKey, this.publicKey, { algorithms: ['RS256'] });

      // 檢查過期時間
      if (new Date(license.expires_at) < new Date()) {
        throw new Error('License expired');
      }

      // 硬體綁定驗證
      const currentFingerprint = await this.getHardwareFingerprint(license.hardware_binding.method);
      if (currentFingerprint !== license.hardware_binding.fingerprint) {
        throw new Error('Hardware fingerprint mismatch');
      }

      this.licenseCache = license;
      console.log('License verified successfully');
      return license;
    } catch (error) {
      console.error('License verification failed:', error);
      throw error;
    }
  }

  // 執行期間定期檢查
  async periodicCheck() {
    const now = Date.now();
    if (this.lastCheck && (now - this.lastCheck) < 3600000) { // 1 hour
      return this.licenseCache;
    }

    await this.verifyOnStartup();
    this.lastCheck = now;
    return this.licenseCache;
  }

  // 功能檢查
  hasFeature(featureName) {
    if (!this.licenseCache) {
      return false;
    }
    return this.licenseCache.features.includes(featureName);
  }

  // 用戶數限制檢查
  async checkUserLimit() {
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    if (userCount.rows[0].count >= this.licenseCache.max_users) {
      throw new Error('User limit exceeded');
    }
  }

  // 病患數限制檢查
  async checkPatientLimit() {
    const patientCount = await db.query('SELECT COUNT(*) FROM patients');
    if (patientCount.rows[0].count >= this.licenseCache.max_patients) {
      throw new Error('Patient limit exceeded');
    }
  }

  // 硬體指紋生成
  async getHardwareFingerprint(method) {
    const os = require('os');
    const crypto = require('crypto');

    let data = '';
    switch (method) {
      case 'mac_address':
        const ifaces = os.networkInterfaces();
        const macs = Object.values(ifaces)
          .flat()
          .filter(i => !i.internal && i.mac !== '00:00:00:00:00:00')
          .map(i => i.mac)
          .sort();
        data = macs.join(',');
        break;

      case 'cpu_id':
        data = os.cpus()[0].model;
        break;

      case 'mixed':
        const ifaces2 = os.networkInterfaces();
        const macs2 = Object.values(ifaces2)
          .flat()
          .filter(i => !i.internal && i.mac !== '00:00:00:00:00:00')
          .map(i => i.mac)
          .sort();
        data = macs2.join(',') + os.cpus()[0].model;
        break;
    }

    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

module.exports = new LicenseService();
```

#### License 中介層
```javascript
// server/middleware/licenseCheck.js

const licenseService = require('../services/licenseService');

// 啟動時驗證
async function initializeLicense() {
  if (process.env.DEPLOYMENT_MODE === 'on-premise') {
    await licenseService.verifyOnStartup();
  }
}

// 定期檢查
function periodicLicenseCheck(req, res, next) {
  if (process.env.DEPLOYMENT_MODE === 'on-premise') {
    licenseService.periodicCheck()
      .then(() => next())
      .catch(err => {
        res.status(403).json({ error: 'License verification failed', details: err.message });
      });
  } else {
    next();
  }
}

// 功能檢查
function requireFeature(featureName) {
  return (req, res, next) => {
    if (process.env.DEPLOYMENT_MODE === 'on-premise') {
      if (!licenseService.hasFeature(featureName)) {
        return res.status(403).json({ error: `Feature '${featureName}' not available in your license` });
      }
    }
    next();
  };
}

module.exports = {
  initializeLicense,
  periodicLicenseCheck,
  requireFeature
};
```

### 4.3 安裝與初始化

#### 安裝包結構
```
patient-crm-v1.0.0-onpremise/
├── README.md                    # 安裝指南
├── LICENSE                      # 軟體授權條款
├── install.sh                   # 自動安裝腳本
├── docker-compose.yml           # Docker 部署配置
├── .env.example                 # 環境變數範例
├── bin/
│   ├── server                   # 編譯後的應用程式
│   └── migrate                  # 資料庫遷移工具
├── public/                      # 前端靜態檔案
│   ├── index.html
│   └── assets/
├── database/
│   ├── schema.sql               # 資料庫 Schema
│   ├── rls-policies.sql         # RLS 策略
│   └── seed.sql                 # 初始資料（可選）
├── config/
│   ├── nginx.conf.example       # Nginx 配置範例
│   └── license-public.pem       # License 驗證公鑰
└── docs/
    ├── installation-guide.pdf   # 安裝手冊
    ├── admin-guide.pdf          # 管理員手冊
    └── user-manual.pdf          # 使用者手冊
```

#### 安裝腳本
```bash
#!/bin/bash
# install.sh

set -e

echo "=== Patient CRM 地端安裝程式 v1.0.0 ==="

# 1. 檢查系統需求
echo "檢查系統需求..."
check_requirements() {
  if ! command -v docker &> /dev/null; then
    echo "錯誤: Docker 未安裝"
    exit 1
  fi

  if ! command -v psql &> /dev/null; then
    echo "警告: PostgreSQL 客戶端未安裝（可選）"
  fi
}

# 2. 配置環境變數
echo "配置環境變數..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "請編輯 .env 檔案並設定以下參數："
  echo "  - DATABASE_URL"
  echo "  - LICENSE_KEY"
  echo "  - ENCRYPTION_KEY"
  read -p "按 Enter 繼續..."
  ${EDITOR:-nano} .env
fi

# 3. 驗證 License
echo "驗證 License..."
source .env
if [ -z "$LICENSE_KEY" ]; then
  echo "錯誤: LICENSE_KEY 未設定"
  exit 1
fi

# 4. 初始化資料庫
echo "初始化資料庫..."
read -p "是否要執行資料庫遷移？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  psql $DATABASE_URL < database/schema.sql
  psql $DATABASE_URL < database/rls-policies.sql
  echo "資料庫初始化完成"
fi

# 5. 生成加密密鑰（如果未設定）
if [ -z "$ENCRYPTION_KEY" ]; then
  echo "生成加密密鑰..."
  ENCRYPTION_KEY=$(openssl rand -base64 32)
  echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
fi

# 6. 建置 Docker 映像
echo "建置 Docker 映像..."
docker-compose build

# 7. 啟動服務
echo "啟動服務..."
docker-compose up -d

# 8. 健康檢查
echo "等待服務啟動..."
sleep 10
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "✓ 服務啟動成功"
else
  echo "✗ 服務啟動失敗，請檢查日誌: docker-compose logs"
  exit 1
fi

# 9. 創建初始管理員帳號
echo "創建初始管理員帳號..."
read -p "管理員 Email: " admin_email
read -s -p "管理員密碼: " admin_password
echo

docker-compose exec app node bin/create-admin.js "$admin_email" "$admin_password"

echo ""
echo "=== 安裝完成 ==="
echo "請訪問: http://localhost:3000"
echo "管理員帳號: $admin_email"
echo ""
echo "詳細文件請參考 docs/installation-guide.pdf"
```

---

## 5. 開通流程

### 5.1 SaaS 開通流程

**Step 1: 銷售團隊接收訂單**
- 客戶選擇方案（Starter / Professional / Enterprise）
- 提供組織資訊（名稱、聯絡人、Email）

**Step 2: Superadmin 創建租戶**
```javascript
// POST /api/superadmin/tenants
{
  "name": "XX診所",
  "contact_email": "admin@example.com",
  "plan": "professional",
  "max_users": 20,
  "features": ["consultation_management", "body_composition"]
}
```

**Step 3: 系統自動化處理**
1. 創建 `organizations` 記錄
2. 生成加密密鑰（存入 AWS KMS）
3. 創建預設群組
4. 創建管理員帳號
5. 發送歡迎郵件（包含登入連結和初始密碼）

**Step 4: 客戶啟用**
- 客戶收到郵件，點擊連結登入
- 首次登入強制修改密碼
- 進入系統開始使用

### 5.2 地端開通流程

**Step 1: 客戶採購與交付**
- 客戶選擇版本（Starter / Professional / Enterprise）
- 簽訂合約
- 提供硬體資訊（用於 License 綁定）

**Step 2: 生成 License Key**
```bash
# 內部工具：generate-license.js
node bin/generate-license.js \
  --customer-id "CUST-12345" \
  --customer-name "XX醫院" \
  --license-type "enterprise" \
  --max-users 100 \
  --max-patients 50000 \
  --features "consultation_management,body_composition,audit_logs" \
  --duration "1y" \
  --hardware-fingerprint "abc123..."
```

輸出：
```
License Key Generated:
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

保存路徑: ./licenses/CUST-12345.license
公鑰路徑: ./licenses/CUST-12345.pem
```

**Step 3: 交付安裝包與 License**
- 提供安裝包：`patient-crm-v1.0.0-onpremise.tar.gz`
- 提供 License Key
- 提供安裝文件

**Step 4: 客戶端安裝**
1. 解壓安裝包
2. 配置 `.env`（設定 `LICENSE_KEY`）
3. 執行 `install.sh`
4. 創建管理員帳號
5. 開始使用

**Step 5: 啟用驗證**
- 系統啟動時自動驗證 License
- 綁定硬體指紋
- 定期檢查授權狀態

---

## 6. 更新機制

### 6.1 SaaS 更新

**滾動更新（Zero Downtime）**
```yaml
# ECS Task Definition
{
  "family": "patient-crm",
  "deploymentConfiguration": {
    "maximumPercent": 200,
    "minimumHealthyPercent": 100
  },
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3
  }
}
```

**資料庫遷移策略**
1. **向後兼容的變更**（不停機）
   - 新增欄位（設定預設值）
   - 新增索引（CONCURRENTLY）
   - 新增表

2. **破壞性變更**（需停機維護）
   - 刪除欄位
   - 修改資料型態
   - 重新命名

**遷移腳本範例**
```javascript
// migrations/20260131-add-patient-tags.js
exports.up = async (db) => {
  await db.query(`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_tags
    ON patients USING GIN(tags);
  `);
};

exports.down = async (db) => {
  await db.query(`
    DROP INDEX IF EXISTS idx_patients_tags;
    ALTER TABLE patients DROP COLUMN IF EXISTS tags;
  `);
};
```

### 6.2 地端更新

**更新包結構**
```
patient-crm-v1.1.0-update/
├── README.md                    # 更新說明
├── CHANGELOG.md                 # 變更日誌
├── update.sh                    # 更新腳本
├── rollback.sh                  # 回滾腳本
├── bin/                         # 新版本應用程式
├── migrations/                  # 資料庫遷移腳本
└── checksums.txt                # 檔案校驗和
```

**更新腳本**
```bash
#!/bin/bash
# update.sh

set -e

echo "=== Patient CRM 更新程式 v1.0.0 -> v1.1.0 ==="

# 1. 備份檢查
echo "檢查備份..."
if [ ! -d ./backups ]; then
  echo "錯誤: 請先執行備份"
  exit 1
fi

# 2. 備份當前版本
echo "備份當前版本..."
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r bin/ $BACKUP_DIR/
docker-compose exec db pg_dump -U postgres -Fc patient_crm > $BACKUP_DIR/database.dump

# 3. 停止服務
echo "停止服務..."
docker-compose down

# 4. 校驗更新包
echo "校驗更新包..."
sha256sum -c checksums.txt || {
  echo "錯誤: 校驗和不符，更新包可能已損壞"
  exit 1
}

# 5. 執行資料庫遷移
echo "執行資料庫遷移..."
for migration in migrations/*.sql; do
  echo "執行: $migration"
  psql $DATABASE_URL < $migration
done

# 6. 更新應用程式檔案
echo "更新應用程式..."
cp -r bin/* ../bin/
cp -r public/* ../public/

# 7. 重新啟動服務
echo "重新啟動服務..."
cd ..
docker-compose up -d

# 8. 健康檢查
echo "等待服務啟動..."
sleep 10
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "✓ 更新成功"
else
  echo "✗ 服務啟動失敗，開始回滾..."
  ./update/rollback.sh
  exit 1
fi

echo "=== 更新完成 ==="
```

**回滾腳本**
```bash
#!/bin/bash
# rollback.sh

set -e

echo "=== 開始回滾 ==="

# 找到最新的備份
LATEST_BACKUP=$(ls -t backups/ | head -1)
echo "回滾至備份: $LATEST_BACKUP"

# 停止服務
docker-compose down

# 還原應用程式
cp -r backups/$LATEST_BACKUP/bin/* bin/

# 還原資料庫
docker-compose up -d db
sleep 5
docker-compose exec -T db pg_restore -U postgres -d patient_crm -c < backups/$LATEST_BACKUP/database.dump

# 重啟服務
docker-compose up -d

echo "=== 回滾完成 ==="
```

---

## 7. 打包與 CI/CD

### 7.1 SaaS 打包流程

**Dockerfile**
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci --only=production

# 建置前端
COPY . .
RUN npm run build

# Runtime image
FROM node:18-alpine

WORKDIR /app

# 複製依賴與建置產物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./

# 健康檢查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000

CMD ["node", "server/index.js"]
```

### 7.2 地端打包流程

**建置腳本**
```bash
#!/bin/bash
# build-onpremise.sh

VERSION="1.0.0"
OUTPUT_DIR="./dist/onpremise"

echo "=== 建置地端安裝包 v$VERSION ==="

# 1. 清理舊檔案
rm -rf $OUTPUT_DIR
mkdir -p $OUTPUT_DIR

# 2. 建置前端
npm run build
cp -r dist/ $OUTPUT_DIR/public/

# 3. 複製後端
cp -r server/ $OUTPUT_DIR/server/
cp -r node_modules/ $OUTPUT_DIR/node_modules/

# 4. 複製資料庫檔案
mkdir -p $OUTPUT_DIR/database
cp server/database/schema.js $OUTPUT_DIR/database/schema.sql
cp server/database/rls-policies.sql $OUTPUT_DIR/database/

# 5. 複製配置檔案
cp .env.example $OUTPUT_DIR/
cp docker-compose.yml $OUTPUT_DIR/
cp config/license-public.pem $OUTPUT_DIR/config/

# 6. 複製安裝腳本
cp install.sh $OUTPUT_DIR/
cp update.sh $OUTPUT_DIR/

# 7. 複製文件
mkdir -p $OUTPUT_DIR/docs
cp docs/*.pdf $OUTPUT_DIR/docs/

# 8. 生成校驗和
cd $OUTPUT_DIR
find . -type f -exec sha256sum {} \; > checksums.txt
cd -

# 9. 打包
tar -czf patient-crm-v$VERSION-onpremise.tar.gz -C ./dist onpremise/

echo "✓ 安裝包建置完成: patient-crm-v$VERSION-onpremise.tar.gz"
```

---

## 8. 監控與支援

### 8.1 SaaS 監控

**CloudWatch / Datadog 指標**
- **應用層**：
  - HTTP 請求速率（req/s）
  - 響應時間（p50, p95, p99）
  - 錯誤率（4xx, 5xx）
  - 活躍用戶數

- **資料庫層**：
  - 連線數
  - 查詢延遲
  - 死鎖數量
  - 磁碟使用率

- **基礎設施**：
  - CPU 使用率
  - 記憶體使用率
  - 網路流量
  - 磁碟 I/O

**告警規則**
```javascript
// 範例：高錯誤率告警
{
  "metric": "http.server.errors",
  "condition": "avg > 10",
  "duration": "5m",
  "severity": "critical",
  "notify": ["slack", "pagerduty"]
}
```

### 8.2 地端監控（可選）

**內建健康檢查端點**
```javascript
// server/routes/health.js
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    checks: {}
  };

  // 資料庫連線檢查
  try {
    await db.query('SELECT 1');
    health.checks.database = { status: 'ok' };
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = { status: 'fail', error: error.message };
  }

  // License 檢查
  try {
    await licenseService.periodicCheck();
    health.checks.license = {
      status: 'ok',
      expires_at: licenseService.licenseCache.expires_at
    };
  } catch (error) {
    health.status = 'fail';
    health.checks.license = { status: 'fail', error: error.message };
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

**日誌收集**
```javascript
// 使用 Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 在生產環境中輸出到 console（Docker 會收集）
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### 8.3 技術支援流程

**SaaS 支援**
1. **監控告警** → 自動通知工程團隊
2. **客戶回報** → Ticket 系統
3. **遠端排查** → 透過 CloudWatch Logs、Datadog
4. **熱修復** → CI/CD 快速部署

**地端支援**
1. **客戶回報** → Email / 電話
2. **遠端協助** → VPN / TeamViewer（需客戶同意）
3. **日誌收集** → 客戶匯出 logs 目錄
4. **更新包交付** → 提供修復版本

---

## 9. 實施計劃

### 9.1 階段劃分

#### Phase 1: SaaS 基礎設施（2 週）
- [ ] 雲端環境設定（AWS/GCP）
- [ ] PostgreSQL RDS 建置
- [ ] Docker 映像建置
- [ ] CI/CD Pipeline 建置
- [ ] Superadmin Portal 開發

**驗收標準**：
- 能透過 Superadmin Portal 創建租戶
- 租戶資料完全隔離（RLS 驗證）
- 自動化部署流程正常運作

#### Phase 2: License 系統開發（1.5 週）
- [ ] License Key 生成工具
- [ ] License 驗證服務（server/services/licenseService.js）
- [ ] License 中介層（server/middleware/licenseCheck.js）
- [ ] 硬體指紋綁定
- [ ] 功能限制檢查

**驗收標準**：
- 能生成有效的 License Key
- 啟動時驗證 License
- 功能受 License 控制（如：audit_logs）
- 用戶/病患數限制生效

#### Phase 3: 地端安裝包與腳本（1 週）
- [ ] 安裝腳本（install.sh）
- [ ] 更新腳本（update.sh, rollback.sh）
- [ ] Docker Compose 配置
- [ ] 安裝文件撰寫

**驗收標準**：
- 能在乾淨的 Linux 環境中執行 install.sh 完成安裝
- 更新流程能成功執行且可回滾
- 文件清晰易懂

#### Phase 4: 測試與優化（1 週）
- [ ] SaaS 多租戶壓力測試
- [ ] 地端安裝在多種環境測試（Ubuntu, CentOS, Docker）
- [ ] License 破解嘗試測試
- [ ] 資料庫遷移測試
- [ ] 文件審查

**驗收標準**：
- 通過所有測試案例
- License 驗證機制無明顯漏洞
- 安裝成功率 > 95%

#### Phase 5: 上線準備（0.5 週）
- [ ] 生產環境部署
- [ ] 監控告警設定
- [ ] 備份策略驗證
- [ ] 客戶培訓材料準備

**驗收標準**：
- 生產環境穩定運行
- 監控指標正常
- 備份可成功還原

### 9.2 時程表

| 週次 | 階段 | 產出 |
|------|------|------|
| W1-W2 | Phase 1 | SaaS 基礎設施 + Superadmin Portal |
| W3-W4.5 | Phase 2 | License 系統 |
| W4.5-W5.5 | Phase 3 | 地端安裝包 |
| W6-W6.5 | Phase 4 | 測試與優化 |
| W7 | Phase 5 | 上線 |

**總計：約 7 週**

---

## 10. 風險與緩解

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| License 被破解 | 高 | 中 | 使用 RSA 簽名 + 硬體綁定 + 定期檢查 |
| 地端安裝失敗 | 中 | 中 | 詳細文件 + 安裝腳本自動化 + 技術支援 |
| 資料庫遷移失敗 | 高 | 低 | 備份策略 + 回滾腳本 + 測試環境驗證 |
| 多租戶資料洩漏 | 高 | 低 | RLS 強制啟用 + 自動化測試 + Code Review |
| 雲端成本超支 | 中 | 中 | 成本監控告警 + 資源限制 + 自動擴展上限 |

---

## 11. 附錄

### 11.1 環境變數清單

#### SaaS 環境變數
```bash
# 部署模式
DEPLOYMENT_MODE=saas

# 資料庫
DATABASE_URL=postgresql://user:pass@rds-endpoint/dbname

# 加密（使用 AWS KMS）
KMS_KEY_ID=arn:aws:kms:region:account:key/xxx

# 郵件服務
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxx

# 監控
DATADOG_API_KEY=xxx
```

#### 地端環境變數
```bash
# 部署模式
DEPLOYMENT_MODE=on-premise

# 資料庫
DATABASE_URL=postgresql://user:pass@localhost/patient_crm

# License
LICENSE_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# 加密（本地密鑰）
ENCRYPTION_KEY=base64_encoded_key

# 郵件（可選）
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
```

### 11.2 License 版本對照表

| 版本 | max_users | max_patients | 功能 |
|------|-----------|--------------|------|
| **Starter** | 10 | 1,000 | 基礎功能 |
| **Professional** | 50 | 10,000 | + Body Composition + Audit Logs |
| **Enterprise** | 無限制 | 無限制 | + Field Encryption + API Access |

### 11.3 資料庫備份策略

**SaaS**
- **自動備份**：每日 RDS 自動備份
- **保留期**：30 天
- **時間點還原**：支援
- **跨區域複製**：啟用

**地端**
```bash
# 每日備份腳本
#!/bin/bash
# /etc/cron.daily/backup-patient-crm

BACKUP_DIR="/var/backups/patient-crm"
DATE=$(date +%Y%m%d)

# 備份資料庫
pg_dump -U postgres -Fc patient_crm > $BACKUP_DIR/patient_crm_$DATE.dump

# 刪除 30 天前的備份
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete
```

---

## 12. 後續優化方向

### 12.1 短期（3 個月內）
- [ ] License 管理後台（客戶自助查看授權狀態）
- [ ] 地端更新自動檢查功能
- [ ] SaaS 租戶自助升級/降級
- [ ] 更細緻的功能開關（Feature Flags）

### 12.2 中期（6 個月內）
- [ ] 混合部署支援（部分資料上雲）
- [ ] License 線上啟用（無需硬體指紋）
- [ ] 多區域部署（災難恢復）
- [ ] API Gateway + Rate Limiting

### 12.3 長期（1 年內）
- [ ] Kubernetes 支援
- [ ] 微服務架構拆分
- [ ] 多語言支援
- [ ] 行動端應用

---

**文件版本**: v1.0
**最後更新**: 2026-01-31
**下次審查**: 實施 Phase 1 完成後
