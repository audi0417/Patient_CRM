# Patient CRM - 快速启动指南

## ✅ 配置已完成

### 当前配置
- **后端端口**: 3001
- **前端端口**: 8080
- **数据库**: SQLite (data/patient_crm.db)
- **环境**: 开发环境
- **安全密钥**: 已配置 ✅

---

## 🚀 启动方式

### 方式 1：完整启动（推荐）

```bash
npm run dev:full
```

这会：
1. ✅ 自动检查配置
2. 🔵 启动后端服务器（端口 3001）
3. 🟢 启动前端开发服务器（端口 8080）
4. 🔗 自动配置API代理

### 方式 2：分别启动

```bash
# 终端 1 - 启动后端
npm run server:dev

# 终端 2 - 启动前端
npm run dev
```

### 方式 3：检查配置

```bash
npm run check-config
```

---

## 🌐 访问地址

### 默认地址
- **前端**: http://localhost:8080
- **API**: http://localhost:3001
- **健康检查**: http://localhost:3001/api/health

### 如果端口被占用
前端会自动使用下一个可用端口：
- 8080 被占用 → 8081
- 8081 被占用 → 8082
- 以此类推...

---

## 🔧 自定义端口

编辑 `.env` 文件：

```env
# 后端端口
PORT=4000

# 前端端口
VITE_PORT=3000
```

重启服务即可生效。

---

## 📝 默认登录凭证

- **用户名**: `superadmin`
- **密码**: `SuperAdmin@2024`

⚠️ **首次登录后请立即更改密码！**

---

## 🐛 故障排除

### 问题 1: 端口被占用

**方法 1: 修改端口**
编辑 `.env` 文件更改端口号

**方法 2: 释放端口**
```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### 问题 2: 前端无法连接后端

1. 确认后端正在运行:
```bash
curl http://localhost:3001/api/health
```

2. 检查代理配置（已自动配置在 vite.config.ts）

3. 检查 `.env` 文件中的端口设置

### 问题 3: 配置检查失败

```bash
# 重新复制模板
Copy-Item .env.example .env

# 生成密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 将生成的密钥添加到 .env
```

---

## 📚 相关文档

- [完整配置指南](CONFIG.md) - 详细的环境变量说明
- [安全审计报告](SECURITY_AUDIT_REPORT.md) - 已修复的安全漏洞
- [部署指南](DEPLOYMENT_GUIDE.md) - 生产环境部署

---

## 🎯 当前系统状态

### 已完成的安全修复
- ✅ consultations.js - 咨询记录完全隔离
- ✅ email.js - 邮件服务跨组织保护
- ✅ goals.js - 健康目标完全隔离

### 配置管理
- ✅ 环境变量统一管理
- ✅ 端口灵活配置
- ✅ 自动配置检查
- ✅ 开发/生产环境分离

---

## 💡 开发提示

### 热重载
- 前端: 保存文件自动刷新 ✅
- 后端: 使用 nodemon 自动重启 ✅

### 调试模式
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/server/index.js",
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

### 数据库管理
```bash
# 初始化数据库
npm run init-db

# 填充测试数据
npm run seed-db
```

---

**最后更新**: 2026-02-22  
**系统版本**: 1.0.0  
**配置状态**: ✅ 已优化
