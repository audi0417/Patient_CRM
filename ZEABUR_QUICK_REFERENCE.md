# Patient CRM - Zeabur 部署快速參考

## 📊 系統信息

**目前使用數據庫**: SQLite (better-sqlite3)
**當前狀態**: 本地開發環境
**推薦部署方案**: Zeabur + PostgreSQL

---

## ⚡ 快速部署步驟（5 分鐘版本）

### 1️⃣ 準備工作
```bash
# 檢查文件是否已創建
ls -la | grep -E "Dockerfile|.dockerignore|.env.example"

# 預期輸出:
# Dockerfile          ✓
# .dockerignore       ✓
# .env.example        ✓
```

### 2️⃣ 推送到 GitHub
```bash
git add .
git commit -m "Add Zeabur deployment files"
git push origin main
```

### 3️⃣ 在 Zeabur 部署
1. 訪問 https://zeabur.com
2. 連接 GitHub
3. 選擇 `Patient_CRM` 倉庫
4. 點擊 "Deploy"

### 4️⃣ 配置數據庫
1. 添加 PostgreSQL 服務
2. Zeabur 提供 `DATABASE_URL`
3. 設置為環境變量

### 5️⃣ 設置環境變量
```
DATABASE_URL=[自動生成]
JWT_SECRET=your-secret-key-here
NODE_ENV=production
PORT=3001
```

### 6️⃣ 訪問應用
```
https://your-app.zeabur.app
用戶名: admin
密碼: Admin123
```

---

## 🗄️ 數據庫對比

| 特性 | SQLite | PostgreSQL |
|------|--------|-----------|
| **本地開發** | ✓ 完美 | ✓ 需要安裝 |
| **雲端部署** | ✗ 數據丟失 | ✓ 推薦 |
| **多用戶** | ✗ 支持差 | ✓ 完全支持 |
| **備份** | ✗ 困難 | ✓ 自動 |
| **成本** | 免費 | Zeabur 免費配額 |

---

## 🚀 Zeabur 優勢

✅ **無需運維** - 自動管理基礎設施
✅ **自動備份** - PostgreSQL 自動備份
✅ **自動部署** - Git push 自動部署
✅ **CDN 加速** - 全球加速
✅ **監控告警** - 實時監控
✅ **成本低** - 免費配額足夠測試

---

## 📁 已創建的文件清單

```
✓ Dockerfile           - Docker 容器定義
✓ .dockerignore        - Docker 忽略文件
✓ .env.example         - 環境變量示例
✓ zeabur.json          - Zeabur 配置（可選）
✓ ZEABUR_DEPLOYMENT_GUIDE.md        - 詳細指南
✓ ZEABUR_DEPLOYMENT_STEPS.md        - 完整步驟
✓ ZEABUR_QUICK_REFERENCE.md         - 本文檔
```

---

## 🔧 常用命令

```bash
# 本地測試 Docker 構建
docker build -t patient-crm .
docker run -p 3001:3001 patient-crm

# 本地開發（SQLite）
npm run dev:full

# 構建生產版本
npm run build

# 檢查構建輸出
ls -la dist/

# 測試後端 API
curl http://localhost:3001/api/health-check

# 查看日誌
npm run server:dev
```

---

## 🌍 訪問方式

| 環境 | URL | 數據庫 |
|------|-----|--------|
| **本地開發** | http://localhost:5173 | SQLite |
| **本地後端** | http://localhost:3001 | SQLite |
| **Zeabur** | https://your-app.zeabur.app | PostgreSQL |
| **自定義域名** | https://your-domain.com | PostgreSQL |

---

## 📊 當前部署狀態

```
Patient CRM 系統
├── 前端: React + Vite ✓
├── 後端: Node.js + Express ✓
├── 數據庫: SQLite ⚠️ (不適合生產)
├── 測試數據: 20 位患者 ✓
│   ├── 體組成記錄: 71 筆 ✓
│   ├── 生命徵象: 90 筆 ✓
│   ├── 預約記錄: 111 筆 ✓
│   ├── 健康目標: 40 個 ✓
│   └── 諮詢記錄: 51 筆 ✓
└── 部署準備: 完成 ✓
```

---

## ❓ 常見問題

### Q: 為什麼不能直接用 SQLite？
**A**: SQLite 是文件型數據庫，容器重啟時文件丟失。需要使用服務型數據庫（PostgreSQL）。

### Q: 遷移會丟失數據嗎？
**A**: 本地 SQLite 數據不會自動遷移。可以編寫遷移腳本或重新輸入。

### Q: PostgreSQL 會額外收費嗎？
**A**: Zeabur 提供免費配額，足夠小型應用。超出部分才收費。

### Q: 多久需要更新一次？
**A**: 推薦每月檢查依賴更新，重要安全補丁立即更新。

### Q: 如何回滾到之前版本？
**A**: Git 標簽 + Zeabur 自動部署。推送舊標簽即可回滾。

---

## 🆘 故障排查

### 應用無法啟動
```bash
# 1. 檢查日誌
# Zeabur 控制面板 → Logs

# 2. 常見原因
- 缺少環境變量 → 添加 DATABASE_URL
- 端口被占用 → 改為 3001
- 依賴版本衝突 → npm ci --only=production
```

### 數據庫無法連接
```bash
# 1. 驗證 DATABASE_URL
echo $DATABASE_URL

# 2. 檢查連接
# Zeabur 控制面板 → PostgreSQL → 連接信息

# 3. 防火牆設置
# 確保允許連接
```

### 部署速度慢
```bash
# 1. 檢查 npm 緩存
npm cache clean --force

# 2. 使用 npm ci 代替 npm install
npm ci --only=production

# 3. 優化 Dockerfile
# 使用多階段構建（已配置）
```

---

## 📞 支援資源

- **Zeabur 官方文檔**: https://zeabur.com/docs
- **Docker 官方文檔**: https://docs.docker.com
- **PostgreSQL 文檔**: https://www.postgresql.org/docs
- **Express.js 文檔**: https://expressjs.com
- **Zeabur 社群**: https://discord.gg/zeabur

---

## ✅ 下一步行動計畫

### 立即執行
- [ ] 驗證所有文件都已創建
- [ ] 測試本地 Docker 構建
- [ ] 提交代碼到 GitHub

### 本周執行
- [ ] 在 Zeabur 上部署
- [ ] 配置 PostgreSQL
- [ ] 測試應用功能

### 本月執行
- [ ] 設置自定義域名
- [ ] 配置 SSL/TLS
- [ ] 設置監控和告警

---

## 💡 部署後的建議

1. **安全性**
   - 更改默認管理員密碼
   - 配置強 JWT Secret
   - 啟用 HTTPS（已自動）

2. **性能**
   - 啟用 CDN
   - 配置緩存策略
   - 監控數據庫連接

3. **可靠性**
   - 配置自動備份
   - 設置告警
   - 定期測試恢復

4. **運維**
   - 設置日誌收集
   - 監控應用性能
   - 定期更新依賴

---

**部署難度**: ⭐⭐☆ 中等（適合有基本容器知識的開發者）

**預計時間**: 首次 30-60 分鐘，之後自動部署

**支援成本**: 基本功能免費，高級功能按需付費

---

祝部署順利！🚀
