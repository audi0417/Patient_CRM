# 配置指南 Configuration Guide

Patient CRM 系统使用环境变量进行配置管理，提供灵活且安全的配置方案。

---

## 📋 快速开始

### 1. 复制环境变量模板

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

### 2. 编辑 `.env` 文件

```bash
# 使用你喜欢的编辑器
notepad .env        # Windows
nano .env          # Linux/Mac
code .env          # VS Code
```

### 3. 必须配置的变量

⚠️ **首次启动前必须设置以下变量：**

```env
# JWT 密钥（生成方式见下文）
JWT_SECRET=你的随机密钥

# 数据加密密钥（生成方式见下文）
ENCRYPTION_KEY=你的加密密钥
```

### 4. 生成安全密钥

```bash
# 生成 JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔧 配置详解

### 服务器配置

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `NODE_ENV` | 运行环境 | `development` | `production` / `development` / `test` |
| `PORT` | 后端服务器端口 | `3001` | `3001` |
| `VITE_PORT` | 前端开发服务器端口 | `8080` | `8080` |

**端口说明：**
- **后端端口 (PORT)**：Node.js API 服务器监听的端口
- **前端端口 (VITE_PORT)**：Vite 开发服务器端口，前端应用在此运行
- 如果端口被占用，Vite 会自动尝试下一个可用端口（如 8081、8082）

**修改端口示例：**

```env
# 使用自定义端口
PORT=4000
VITE_PORT=3000
```

### API 配置

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `VITE_API_URL` | 前端 API 地址 | 空（使用代理） | `https://api.example.com` |
| `API_ENDPOINT` | 后端完整地址 | `http://localhost:3001` | - |
| `CLIENT_URL` | 前端完整地址 | `http://localhost:8080` | - |

**工作原理：**

#### 开发环境（本地）
```env
# 留空使用相对路径 /api
VITE_API_URL=

# Vite 会自动代理 /api -> http://localhost:3001
```

#### 生产环境（分离部署）
```env
# 指定完整的 API 地址
VITE_API_URL=https://api.your-domain.com
```

### 数据库配置

#### SQLite（本地开发）

```env
DATABASE_TYPE=sqlite
DATABASE_PATH=data/patient_crm.db
```

#### PostgreSQL（生产环境）

**方式 1：使用 DATABASE_URL（推荐）**
```env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:5432/database
```

**方式 2：分开配置**
```env
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=patient_crm
```

### 安全配置

| 变量 | 说明 | 必填 | 示例 |
|------|------|------|------|
| `JWT_SECRET` | JWT 令牌密钥 | ✅ 是 | `74a23c1393baf870...` |
| `JWT_EXPIRY` | JWT 过期时间 | 否 | `24h` / `7d` / `30m` |
| `ENCRYPTION_KEY` | 数据加密密钥 | ✅ 是 | `0b5880e3db1cf4ef...` |
| `SUPER_ADMIN_PASSWORD` | 超级管理员初始密码 | 否 | `SuperAdmin@2024` |
| `ALLOWED_ORIGINS` | CORS 允许源 | 否 | `https://app.com,https://www.app.com` |

**密钥长度要求：**
- `JWT_SECRET`: 至少 32 字符（256 bits）
- `ENCRYPTION_KEY`: 至少 32 字符（用于 AES-256 加密）

### 部署模式

| 变量 | 说明 | 可选值 | 默认 |
|------|------|--------|------|
| `DEPLOYMENT_MODE` | 部署模式 | `saas` / `on-premise` | `saas` |

**模式说明：**

#### SaaS 模式（多租户云端）
```env
DEPLOYMENT_MODE=saas
```
- 支持多个组织（医院/诊所）
- 使用订阅计划管理
- 数据完全隔离

#### On-Premise 模式（企业自部署）
```env
DEPLOYMENT_MODE=on-premise
LICENSE_KEY=your_license_key
LICENSE_PUBLIC_KEY_PATH=config/license-public.pem
```
- 单一组织使用
- 本地数据存储
- 需要有效授权

### 功能开关

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ENABLE_EMAIL_NOTIFICATIONS` | 启用邮件通知 | `false` |
| `ENABLE_SMS_NOTIFICATIONS` | 启用短信通知 | `false` |
| `ENABLE_BACKUP` | 启用自动备份 | `true` |

### 邮件配置（可选）

```env
# SMTP 邮件服务器设置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@patient-crm.com

# 或使用 Resend API
RESEND_API_KEY=re_xxxxxxxxxx
```

### 日志配置

| 变量 | 说明 | 可选值 | 默认 |
|------|------|--------|------|
| `LOG_LEVEL` | 日志级别 | `error` / `warn` / `info` / `debug` | `info` |

---

## 🚀 使用场景

### 场景 1：本地开发（默认配置）

```env
NODE_ENV=development
PORT=3001
VITE_PORT=8080

DATABASE_TYPE=sqlite
DATABASE_PATH=data/patient_crm.db

VITE_API_URL=
API_ENDPOINT=http://localhost:3001
CLIENT_URL=http://localhost:8080
```

**启动方式：**
```bash
npm run dev:full
```

**访问地址：**
- 前端：`http://localhost:8080`
- 后端：`http://localhost:3001`
- API 文档：`http://localhost:3001/api/health`

---

### 场景 2：生产部署（Zeabur 云端）

```env
NODE_ENV=production
PORT=3001

DATABASE_TYPE=postgres
DATABASE_URL=${ZEABUR_POSTGRES_URL}

VITE_API_URL=
API_ENDPOINT=https://your-app.zeabur.app
CLIENT_URL=https://your-app.zeabur.app

DEPLOYMENT_MODE=saas
ALLOWED_ORIGINS=https://your-app.zeabur.app
```

---

### 场景 3：企业自部署（Docker）

```env
NODE_ENV=production
PORT=3001
VITE_PORT=80

DATABASE_TYPE=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=patient_crm
DATABASE_PASSWORD=secure_password
DATABASE_NAME=patient_crm

DEPLOYMENT_MODE=on-premise
LICENSE_KEY=your_enterprise_license

ALLOWED_ORIGINS=https://crm.your-company.com
```

**Docker Compose 启动：**
```bash
docker-compose up -d
```

---

### 场景 4：分离部署（前后端不同服务器）

#### 后端服务器 (.env)
```env
NODE_ENV=production
PORT=3001

DATABASE_TYPE=postgres
DATABASE_URL=postgresql://...

ALLOWED_ORIGINS=https://frontend.example.com
CLIENT_URL=https://frontend.example.com
```

#### 前端服务器 (.env)
```env
# 指定后端 API 完整地址
VITE_API_URL=https://api.example.com
```

---

## 🔐 安全最佳实践

### 1. 保护敏感信息

✅ **应该做的：**
- 将 `.env` 添加到 `.gitignore`
- 使用强随机密钥
- 定期轮换密钥
- 使用环境变量注入（CI/CD）

❌ **不应该做的：**
- 提交 `.env` 到版本控制
- 使用默认或简单密钥
- 在代码中硬编码密钥
- 共享 `.env` 文件

### 2. 生产环境检查清单

- [ ] 更改 `SUPER_ADMIN_PASSWORD`
- [ ] 设置强 `JWT_SECRET`
- [ ] 设置强 `ENCRYPTION_KEY`
- [ ] 配置 `ALLOWED_ORIGINS`
- [ ] 使用 PostgreSQL 数据库
- [ ] 启用 HTTPS
- [ ] 配置备份策略
- [ ] 设置日志监控

### 3. 密钥生成建议

```bash
# 生成 256-bit 密钥（推荐）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 512-bit 密钥（更安全）
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成随机密码
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

---

## 🧪 测试配置

### 验证环境变量

创建 `test-config.js`：

```javascript
require('dotenv').config();

console.log('配置检查：');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- VITE_PORT:', process.env.VITE_PORT);
console.log('- DATABASE_TYPE:', process.env.DATABASE_TYPE);
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✅ 已设置' : '❌ 未设置');
console.log('- ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '✅ 已设置' : '❌ 未设置');
```

运行测试：
```bash
node test-config.js
```

### 验证端口

```bash
# 检查端口是否被占用
netstat -ano | findstr :3001    # Windows
lsof -i :3001                   # Linux/Mac

# 检查后端健康状态
curl http://localhost:3001/api/health

# 检查前端访问
curl http://localhost:8080
```

---

## 📝 配置优先级

配置读取优先级（从高到低）：

1. **系统环境变量**（最高优先级）
2. **`.env.local`** 文件（不纳入版本控制）
3. **`.env`** 文件
4. **代码中的默认值**（最低优先级）

**示例：**

```env
# .env
PORT=3001

# .env.local (覆盖 .env)
PORT=4000

# 系统环境变量 (覆盖所有)
export PORT=5000
```

---

## 🔄 动态配置更新

### 不需要重启的配置
- 日志级别（通过 API 动态调整）
- 功能开关（数据库存储）

### 需要重启的配置
- 端口配置
- 数据库连接
- JWT 密钥
- CORS 设置

**重启服务：**
```bash
# 开发环境
npm run dev:full

# 生产环境
pm2 restart patient-crm
# 或
systemctl restart patient-crm
```

---

## 🐛 常见问题

### Q1: 端口被占用怎么办？

**A1:** 修改 `.env` 中的端口配置：

```env
# 使用其他端口
PORT=4000
VITE_PORT=3000
```

或在 Windows 上停止占用进程：
```powershell
# 查找占用端口的进程
Get-NetTCPConnection -LocalPort 3001 | 
  Select-Object -ExpandProperty OwningProcess | 
  ForEach-Object { Get-Process -Id $_ }

# 停止进程
Stop-Process -Id <PID>
```

### Q2: 前端无法连接后端

**A2:** 检查以下几点：

1. 后端是否正常运行
```bash
curl http://localhost:3001/api/health
```

2. 端口配置是否一致
```env
# .env 中的 PORT
PORT=3001

# vite.config.ts 会自动读取
```

3. 代理配置是否正确（已自动配置）

### Q3: JWT 验证失败

**A3:** 可能原因：

1. `JWT_SECRET` 未设置或更改
2. Token 已过期（检查 `JWT_EXPIRY`）
3. 清除浏览器 localStorage 并重新登录

### Q4: 数据加密错误

**A4:** 确保 `ENCRYPTION_KEY` 已正确设置且长度足够（至少 32 字符）

```bash
# 重新生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ **警告**：更改 `ENCRYPTION_KEY` 会导致已加密的数据无法解密！

### Q5: 数据库连接失败

**A5:** 检查配置：

```env
# SQLite
DATABASE_TYPE=sqlite
DATABASE_PATH=data/patient_crm.db  # 确保目录存在

# PostgreSQL
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@host:5432/db  # 检查连接字符串
```

---

## 📚 相关文档

- [部署指南](DEPLOYMENT_GUIDE.md)
- [安全审计报告](SECURITY_AUDIT_REPORT.md)
- [数据库架构](DATABASE_SCHEMA.md)
- [API 文档](docs/API.md)

---

## 💡 提示

- 使用 `.env.local` 存储个人配置（不纳入版本控制）
- 使用 `.env.production` 存储生产配置模板
- 使用环境变量注入工具（如 Doppler、Vault）管理密钥
- 定期审查和更新配置

---

**最后更新**: 2026-02-22  
**版本**: 1.0.0
