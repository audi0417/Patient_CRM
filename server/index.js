const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - 必須在 rate limiter 之前設定
// 當應用部署在 proxy/load balancer 後方時（如 Zeabur, Nginx, Cloudflare 等），需要此設定
// 這讓 Express 能正確讀取 X-Forwarded-For header 來識別真實客戶端 IP
app.set('trust proxy', 1);

// Rate Limiting
const { accountLoginLimiter, loginLimiter, apiLimiter } = require('./middleware/rateLimit');

// CORS 設定 - 限制允許的來源
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

app.use(cors({
  origin: (origin, callback) => {
    // 允許沒有 origin 的請求（如 Postman、curl、伺服器間請求）
    if (!origin) return callback(null, true);

    // 開發環境：允許所有 localhost 和 devtunnel
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('devtunnels.ms')) {
        return callback(null, true);
      }
    }

    // 如果未設置 ALLOWED_ORIGINS，對 zeabur.app 子域名自動開放（方便在 Zeabur 平台部署時不用額外設定）
    // 注意：這僅在 ALLOWED_ORIGINS 為空時啟用；若需要更嚴格控制，請在部署時設定 ALLOWED_ORIGINS 環境變數。
    if (allowedOrigins.length === 0) {
      if (origin && origin.includes('zeabur.app')) {
        console.log(`[CORS] Auto-allowed Zeabur origin: ${origin}`);
        return callback(null, true);
      }
    }

    // 檢查是否在允許清單中
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 為所有 API 端點添加一般限流
app.use('/api/', apiLimiter);

// 初始化數據庫
const db = require('./database/db');
db.initialize();

// ========================================
// API 路由
// ========================================
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const healthRoutes = require('./routes/health');
const appointmentRoutes = require('./routes/appointments');
const goalRoutes = require('./routes/goals');
const consultationRoutes = require('./routes/consultations');
const seedRoutes = require('./routes/seed');
const serviceTypeRoutes = require('./routes/serviceTypes');
const organizationRoutes = require('./routes/organizations');
const superadminRoutes = require('./routes/superadmin');
const lineRoutes = require('./routes/line');
const lineWebhookRoutes = require('./routes/lineWebhook');

// 登入端點添加特殊限流保護
// accountLoginLimiter: 基於帳號的失敗次數追蹤（15次鎖定15分鐘）
// loginLimiter: 基於IP的請求頻率限制（防止暴力嘗試多個帳號）
app.use('/api/auth/login', accountLoginLimiter, loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/service-types', serviceTypeRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/line', lineRoutes);
// Line Webhook 不需要 rate limiting（Line 平台自身就有頻率控制）
app.use('/api/line/webhook', lineWebhookRoutes);

// ========================================
// 模組配置端點
// ========================================
const { getOrganizationModules } = require('./middleware/moduleAccess');
const { authenticateToken: authToken } = require('./middleware/auth');
app.get('/api/modules', authToken, getOrganizationModules);

// ========================================
// 健康檢查端點
// ========================================
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================
// Frontend static files
// ========================================
const distPath = path.join(__dirname, '../dist');
console.log('[Server] Frontend path:', distPath);

// 提供靜態文件
app.use(express.static(distPath));

// React Router support
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[Server] Error serving index.html:', err);
      res.status(404).json({ error: 'Page not found' });
    }
  });
});

// ========================================
// Error handling middleware
// ========================================
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// ========================================
// Start server
// ========================================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
[Server] Patient CRM Backend & Frontend
[Server] Status: Running
[Server] Port: ${PORT}
[Server] Frontend: http://0.0.0.0:${PORT}
[Server] API: /api
[Server] Database: SQLite/PostgreSQL
  `);
  console.log('[Server] Backend started');
  console.log('[Server] Frontend ready');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM signal, gracefully shutting down');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT signal, gracefully shutting down');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

module.exports = app;
