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

// Rate Limiting - 僅導入登入保護所需的限流器
const { accountLoginLimiter, loginLimiter } = require('./middleware/rateLimit');

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

// 稽核日誌中介層（在認證之後會自動記錄）
const auditMiddleware = require('./middleware/auditLog');
app.use(auditMiddleware);

// 注意：移除全域 API 限流以避免影響正常使用
// 僅在關鍵端點（如登入）應用特定限流保護

// 資料庫和定時任務將在 startServer() 函數中初始化

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
const serviceItemRoutes = require('./routes/serviceItems');
const treatmentPackageRoutes = require('./routes/treatmentPackages');
const emailRoutes = require('./routes/email');
const groupRoutes = require('./routes/groups');
const tagRoutes = require('./routes/tags');
const auditLogRoutes = require('./routes/auditLogs');

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
// Line Webhook 必須在 /api/line 之前註冊（避免路由衝突）
// Line Webhook 不需要 rate limiting（Line 平台自身就有頻率控制）
app.use('/api/line/webhook', lineWebhookRoutes);
app.use('/api/line', lineRoutes);
app.use('/api/service-items', serviceItemRoutes);
app.use('/api/treatment-packages', treatmentPackageRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// ========================================
// 模組配置端點
// ========================================
const { getOrganizationModules } = require('./middleware/moduleAccess');
const { authenticateToken: authToken } = require('./middleware/auth');
app.get('/api/modules', authToken, getOrganizationModules);

// ========================================
// 健康檢查端點
// ========================================
app.get('/api/health-check', async (req, res) => {
  const { getDeploymentConfig, getAppVersion } = require('./config/deployment');
  const { dbAdapter } = require('./database/db');

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
    deployment: getDeploymentConfig().mode,
    checks: {}
  };

  // 資料庫連線檢查
  try {
    await dbAdapter.queryOne('SELECT 1 as ping');
    health.checks.database = {
      status: 'ok',
      type: require('./database/sqlHelpers').getDbType()
    };
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = {
      status: 'fail',
      error: error.message
    };
  }

  // License 檢查（僅地端部署）
  const deploymentConfig = getDeploymentConfig();
  if (deploymentConfig.isOnPremise) {
    try {
      const licenseService = require('./services/licenseService');
      const licenseInfo = licenseService.getLicenseInfo();

      if (licenseInfo) {
        const daysUntilExpiry = licenseService.getDaysUntilExpiry();
        const isExpiringSoon = licenseService.isExpiringSoon();

        health.checks.license = {
          status: 'ok',
          type: licenseInfo.license_type,
          customer: {
            id: licenseInfo.customer_id,
            name: licenseInfo.customer_name
          },
          limits: {
            users: licenseInfo.max_users,
            patients: licenseInfo.max_patients
          },
          features: licenseInfo.features,
          expiry: {
            date: licenseInfo.expires_at,
            days_remaining: daysUntilExpiry,
            expiring_soon: isExpiringSoon
          },
          hardware_bound: licenseInfo.hardware_bound
        };

        if (isExpiringSoon) {
          health.status = 'degraded';
          health.checks.license.warning = `License expires in ${daysUntilExpiry} days`;
        }
      } else {
        health.checks.license = {
          status: 'missing',
          error: 'License not loaded'
        };
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.license = {
        status: 'error',
        error: error.message
      };
      health.status = 'degraded';
    }
  }

  // 系統資源
  health.checks.system = {
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    },
    nodeVersion: process.version
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
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
async function startServer() {
  try {
    // 顯示部署資訊
    const { logDeploymentInfo, isOnPremise } = require('./config/deployment');
    logDeploymentInfo();

    // 初始化資料庫
    const { initialize: initializeDatabase } = require('./database/db');
    await initializeDatabase();

    // 地端模式：初始化 License
    if (isOnPremise()) {
      const { initializeLicense } = require('./middleware/licenseCheck');
      await initializeLicense();
    }

    // 啟動 Cron Jobs
    const { startCronJobs } = require('./services/cronJobs');
    startCronJobs();

    // 啟動伺服器
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

    return server;
  } catch (error) {
    console.error('[Server] ❌ Failed to start server:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 啟動伺服器
const serverPromise = startServer();
let server;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] Received SIGTERM signal, gracefully shutting down');
  const srv = await serverPromise;
  srv.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Server] Received SIGINT signal, gracefully shutting down');
  const srv = await serverPromise;
  srv.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

module.exports = app;
