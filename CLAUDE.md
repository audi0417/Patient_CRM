# Patient CRM - 患者管理系統

## 專案概述

Patient CRM 是一套醫療診所患者關係管理系統，支援 SaaS 多租戶雲端部署與 On-Premise 地端部署。核心功能涵蓋患者管理、健康紀錄追蹤、預約排程、診所分析儀表板，以及 LINE/Email 通知整合。

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + TypeScript + Vite 7 |
| UI | Tailwind CSS + shadcn/ui (Radix UI) |
| 狀態管理 | Zustand + TanStack React Query |
| 表單 | React Hook Form + Zod |
| 圖表 | Recharts |
| 後端 | Express.js 5 (Node.js 18+) |
| 資料庫 | SQLite (開發/桌面) / PostgreSQL 15+ (雲端) |
| 認證 | JWT (HS256) + bcryptjs |
| 加密 | AES-256-GCM (欄位級加密) |
| 桌面應用 | Electron |
| 測試 | Jest + supertest |
| 部署 | Docker + Docker Compose |

## 快速啟動

### 環境準備

```bash
# 安裝依賴
npm install

# 複製環境變數設定（首次需要）
cp .env.example .env
```

### 開發模式

```bash
# 同時啟動前後端（推薦）
npm run dev:full

# 或分開啟動：
npm run server:dev   # 後端 → http://localhost:3001
npm run dev          # 前端 → http://localhost:8080
```

### 其他啟動方式

```bash
npm run electron:dev     # Electron 桌面應用
npm run dev:demo         # Demo 模式（port 5173）
npm start                # 生產模式
```

### 預設登入帳號

```
帳號: superadmin
密碼: SuperAdmin@2024
```

## 專案結構

```
├── server/                  # 後端 API
│   ├── index.js             # Express 伺服器入口
│   ├── routes/              # API 路由（23 個路由檔）
│   ├── middleware/           # 中介層（auth, RBAC, 加密, 審計）
│   ├── database/            # 資料庫層
│   │   ├── adapters/        # SQLite / PostgreSQL 適配器
│   │   ├── schema.js        # 表結構定義
│   │   ├── migrations/      # 遷移腳本
│   │   └── rls-policies.sql # PostgreSQL RLS 策略
│   ├── config/              # 後端設定（部署模式, RBAC, 模組）
│   │   ├── dataRecordingModes.js # 數據記錄模式主配置
│   │   └── modes/           # 模組化模式定義
│   │       ├── index.js     # 模組載入器
│   │       ├── nutrition.js # 營養管理模式
│   │       ├── medical.js   # 醫療監護模式
│   │       ├── fitness.js   # 運動訓練模式
│   │       └── rehabilitation.js # 復健追蹤模式
│   ├── services/            # 業務邏輯
│   ├── utils/               # 工具函式（加密, 密碼）
│   └── __tests__/           # 後端測試
│
├── src/                     # 前端 React 應用
│   ├── App.tsx              # 根元件 + 路由
│   ├── main.tsx             # 入口
│   ├── pages/               # 頁面元件（25 個）
│   ├── components/          # 共用元件
│   │   └── ui/              # shadcn/ui 元件
│   ├── contexts/            # React Context（Auth, DataMode, DataRecording）
│   ├── hooks/               # 自訂 Hooks
│   ├── lib/                 # API client, auth, storage 工具
│   ├── types/               # TypeScript 型別定義
│   └── utils/               # 前端工具函式
│
├── electron/                # Electron 桌面應用
├── bin/                     # 部署/管理腳本
├── config/                  # Nginx 設定, License 公鑰
├── docs/                    # 詳細文件
└── scripts/                 # 資料庫初始化/種子腳本
```

## API 路由一覽

| 路由 | 說明 |
|------|------|
| `POST /api/auth/login` | 登入 |
| `GET /api/patients` | 患者列表 |
| `GET /api/health/:patientId` | 健康紀錄 |
| `GET /api/appointments` | 預約管理 |
| `GET /api/consultations` | 諮詢紀錄 |
| `GET /api/goals` | 健康目標 |
| `GET /api/organizations` | 組織管理 |
| `GET /api/users` | 使用者管理 |
| `GET /api/analytics` | 診所分析 |
| `GET /api/service-types` | 服務類型 |
| `GET /api/treatment-packages` | 療程方案 |
| `GET /api/audit-logs` | 審計日誌 |
| `GET /api/data-modes` | 資料模式設定 |
| `/api/line`, `/api/email` | LINE / Email 整合 |
| `GET /api/health-check` | 系統健康檢查 |

API 回應格式：`{ success: true, data: {...} }` 或 `{ error: "message" }`

## 資料庫

- **開發環境**：SQLite，檔案位於 `data/patient_crm.db`
- **雲端環境**：PostgreSQL，透過 `DATABASE_URL` 連線
- 透過 `DATABASE_TYPE` 環境變數切換（`sqlite` / `postgres`）
- Schema 定義於 `server/database/schema.js`，自動適配兩種資料庫
- PostgreSQL 使用 RLS (Row-Level Security) 實現多租戶資料隔離

```bash
npm run init-db      # 初始化資料庫
npm run seed-db      # 填入測試資料
```

### 主要資料表

`organizations`, `users`, `patients`, `body_composition`, `vital_signs`, `appointments`, `consultations`, `goals`, `tags`, `groups`, `service_types`, `service_items`, `treatment_packages`, `audit_logs`, `token_blacklist`, `module_settings`

## 認證與權限

- JWT Token 存於前端 localStorage，透過 `Authorization: Bearer <token>` 傳送
- 角色：`super_admin`（系統管理）、`admin`（組織管理）、`user`（一般使用者）
- 中介層鏈：`authenticateToken` → `tenantContext` → `checkRole` → 路由處理
- 登出時 Token 加入黑名單（`token_blacklist` 表）
- 敏感端點設有 Rate Limiting

## 測試

```bash
npm test              # 執行所有測試
npm run test:watch    # 監聽模式
npm run test:coverage # 覆蓋率報告（最低門檻 30%）
```

測試位於 `server/__tests__/`，涵蓋 middleware、routes、services、utils。

## 環境變數（必要項目）

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `PORT` | 後端端口 | `3001` |
| `VITE_PORT` | 前端端口 | `8080` |
| `DATABASE_TYPE` | 資料庫類型 | `sqlite` |
| `JWT_SECRET` | JWT 簽名金鑰 | **必須設定** |
| `ENCRYPTION_KEY` | AES-256 加密金鑰 | **必須設定** |
| `DEPLOYMENT_MODE` | 部署模式 | `saas` |
| `SUPER_ADMIN_PASSWORD` | 超級管理員密碼 | `SuperAdmin@2024` |

生成安全金鑰：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 部署

```bash
# Docker SaaS 模式
docker-compose up -d

# Docker On-Premise 模式
docker-compose -f docker-compose.onpremise.yml up -d
```

支援 Zeabur、AWS、GCP、Azure 雲端平台部署。詳見 `DEPLOYMENT_GUIDE.md`、`DOCKER.md`、`ZEABUR_DEPLOYMENT.md`。

## 開發慣例

- 前端元件使用 TypeScript + 函式元件
- UI 元件統一使用 shadcn/ui，位於 `src/components/ui/`
- 後端路由遵循 RESTful 風格，使用 express-validator 驗證輸入
- 資料庫操作透過 adapter 模式抽象，同時支援 SQLite 與 PostgreSQL
- 所有敏感操作記錄至 `audit_logs`
- 多租戶隔離透過 middleware 自動注入 `organizationId`
- 數據記錄模式採用模組化設計，支援動態載入和快速擴展
- 新增數據記錄模式只需在 `server/config/modes/` 目錄創建 `.js` 文件
- Commit 前確保 `npm run lint` 與 `npm test` 通過

## 相關文件

- [QUICKSTART.md](QUICKSTART.md) - 快速上手指南
- [CONFIG.md](CONFIG.md) - 完整環境變數說明
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - 資料庫結構詳細文件
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 部署指南
- [docs/MULTI_TENANT_ARCHITECTURE.md](docs/MULTI_TENANT_ARCHITECTURE.md) - 多租戶架構
- [LINE_INTEGRATION.md](LINE_INTEGRATION.md) - LINE 整合說明
