# Docker 部署指南

本專案提供兩種 Docker 部署模式：

1. **開發/SaaS 模式** (`docker-compose.yml`) - 用於開發環境或雲端 SaaS 部署
2. **地端部署模式** (`docker-compose.onpremise.yml`) - 用於客戶私有環境部署

---

## 📋 前置需求

- Docker Engine 20.10+
- Docker Compose v2.0+
- 至少 2GB 可用記憶體
- 至少 10GB 可用磁碟空間

---

## 🚀 開發/SaaS 模式部署

### 1. 準備環境變數

複製範例環境變數檔案：

```bash
cp .env.example .env
```

編輯 `.env` 並設定必要變數：

```bash
# 安全配置（必須）
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 資料庫配置
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=patient_crm

# 部署模式
DEPLOYMENT_MODE=saas
```

### 2. 啟動服務

```bash
# 構建並啟動
docker compose up -d

# 查看日誌
docker compose logs -f app

# 檢查健康狀態
docker compose ps
```

### 3. 存取應用

- 前端：http://localhost:3001
- API：http://localhost:3001/api
- 健康檢查：http://localhost:3001/api/health-check
- PostgreSQL：localhost:5432

### 4. 停止服務

```bash
# 停止服務
docker compose down

# 停止並刪除資料
docker compose down -v
```

---

## 🏢 地端部署模式

### 1. 準備環境變數

創建 `.env` 檔案：

```bash
# 部署模式（地端）
DEPLOYMENT_MODE=on-premise
APP_VERSION=1.0.0

# 資料庫配置
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=patient_crm

# 安全配置（必須）
JWT_SECRET=your_jwt_secret_min_32_chars
ENCRYPTION_KEY=your_encryption_key_min_32_chars
SUPER_ADMIN_PASSWORD=your_super_admin_password

# License 配置（必須）
LICENSE_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# CORS 配置
ALLOWED_ORIGINS=https://yourdomain.com
API_ENDPOINT=https://yourdomain.com

# 郵件配置（可選）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

### 2. 準備 SSL 憑證

將 SSL 憑證放置在 `certs/` 目錄：

```bash
mkdir -p certs
# 將憑證檔案放入 certs/
# - fullchain.pem
# - privkey.pem
```

### 3. 配置 Nginx

複製並編輯 Nginx 配置：

```bash
cp config/nginx.conf.example config/nginx.conf
# 編輯 nginx.conf，修改 server_name 和 SSL 路徑
```

### 4. 啟動服務

```bash
# 使用地端部署配置啟動
docker compose -f docker-compose.onpremise.yml up -d

# 查看日誌
docker compose -f docker-compose.onpremise.yml logs -f

# 檢查所有服務狀態
docker compose -f docker-compose.onpremise.yml ps
```

### 5. 驗證部署

```bash
# 檢查健康狀態
curl https://yourdomain.com/api/health-check

# 應該返回類似：
{
  "status": "ok",
  "version": "1.0.0",
  "deployment": "on-premise",
  "checks": {
    "database": { "status": "ok", "type": "postgres" },
    "license": {
      "status": "ok",
      "type": "professional",
      "customer": { "id": "CUST-001", "name": "客戶名稱" },
      ...
    }
  }
}
```

---

## 🔧 常用命令

### 查看日誌

```bash
# 查看所有服務日誌
docker compose logs -f

# 查看特定服務日誌
docker compose logs -f app
docker compose logs -f db
docker compose logs -f nginx  # 僅地端模式
```

### 進入容器

```bash
# 進入應用容器
docker compose exec app sh

# 進入資料庫容器
docker compose exec db psql -U postgres -d patient_crm
```

### 資料庫備份與還原

```bash
# 備份
docker compose exec db pg_dump -U postgres patient_crm > backup.sql

# 還原
docker compose exec -T db psql -U postgres patient_crm < backup.sql
```

### 更新應用

```bash
# 重新構建並重啟
docker compose up -d --build

# 僅重啟特定服務
docker compose restart app
```

---

## 🐛 故障排除

### 1. 容器無法啟動

檢查日誌：
```bash
docker compose logs app
```

常見問題：
- JWT_SECRET 或 ENCRYPTION_KEY 未設定
- LICENSE_KEY 無效（地端模式）
- 資料庫連線失敗

### 2. 資料庫連線失敗

檢查資料庫狀態：
```bash
docker compose ps db
docker compose logs db
```

確認環境變數設定正確：
```bash
docker compose config | grep DATABASE
```

### 3. License 驗證失敗（地端模式）

檢查 License：
```bash
docker compose exec app node -e "
  process.env.LICENSE_KEY = process.env.LICENSE_KEY;
  const licenseService = require('./server/services/licenseService');
  licenseService.verifyOnStartup().then(() => console.log('OK')).catch(console.error);
"
```

### 4. Nginx 無法啟動（地端模式）

檢查配置語法：
```bash
docker compose exec nginx nginx -t
```

檢查憑證檔案：
```bash
ls -la certs/
```

---

## 📊 監控與維護

### 健康檢查

所有服務都配置了健康檢查：

```bash
# 檢查所有服務健康狀態
docker compose ps

# 輸出範例：
# NAME                  STATUS              PORTS
# patient-crm-app       Up (healthy)        0.0.0.0:3001->3001/tcp
# patient-crm-db        Up (healthy)        5432/tcp
# patient-crm-nginx     Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 資源使用

```bash
# 查看資源使用情況
docker stats

# 查看磁碟使用
docker system df
```

### 日誌管理

日誌會持久化到 Docker volumes：

```bash
# 查看 volumes
docker volume ls | grep patient-crm

# 清理舊日誌（謹慎使用）
docker compose exec app sh -c "find /app/logs -type f -mtime +30 -delete"
```

---

## 🔒 安全建議

1. **永遠使用強密碼**
   - JWT_SECRET 至少 32 字元
   - ENCRYPTION_KEY 至少 32 字元
   - 資料庫密碼至少 16 字元

2. **定期更新**
   ```bash
   docker compose pull
   docker compose up -d
   ```

3. **啟用 SSL（生產環境必須）**
   - 使用 Let's Encrypt 或購買 SSL 憑證
   - 強制 HTTPS 重定向

4. **限制網路存取**
   - 使用防火牆限制資料庫埠
   - 僅開放 80/443 埠對外

5. **定期備份**
   - 設定自動備份腳本
   - 測試備份還原流程

---

## 📚 進階配置

### 自訂網路

```yaml
networks:
  patient-crm-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

### 資源限制

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 多環境配置

```bash
# 開發環境
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# 測試環境
docker compose -f docker-compose.yml -f docker-compose.test.yml up

# 生產環境
docker compose -f docker-compose.onpremise.yml up
```

---

## 🆘 支援

如遇問題，請檢查：
1. 日誌檔案：`docker compose logs`
2. 健康檢查：`/api/health-check`
3. 環境變數：`docker compose config`

技術支援：請聯繫系統管理員
