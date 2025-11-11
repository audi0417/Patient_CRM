const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// 偵錯：顯示資料庫環境變數
console.log('🔍 環境變數檢查:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  DATABASE_TYPE:', process.env.DATABASE_TYPE);
console.log('  DATABASE_HOST:', process.env.DATABASE_HOST);
console.log('  DATABASE_PORT:', process.env.DATABASE_PORT);
console.log('  DATABASE_NAME:', process.env.DATABASE_NAME);
console.log('  DATABASE_USER:', process.env.DATABASE_USER);
console.log('  DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? '****' : 'undefined');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'defined' : 'undefined');
console.log('');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 設定 - 支援所有來源（包括 devtunnels）
app.use(cors({
  origin: true, // 允許所有來源
  credentials: true, // 允許傳送 cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ========================================
// 健康檢查端點
// ========================================
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================
// 前端靜態文件服務
// ========================================
const distPath = path.join(__dirname, '../dist');
console.log('📁 前端文件位置:', distPath);

// 提供靜態文件
app.use(express.static(distPath));

// React Router 支援 - 所有非 API 請求重定向到 index.html
app.get(/^(?!\/api).*/, (req, res) => {
  // 其他所有請求服務 index.html（用於 React Router）
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('發送 index.html 時出錯:', err);
      res.status(404).json({ error: 'Page not found' });
    }
  });
});

// ========================================
// 錯誤處理中介層
// ========================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// ========================================
// 啟動伺服器
// ========================================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════╗
║   Patient CRM Backend & Frontend      ║
╠════════════════════════════════════════╣
║   Status: ✓ Running                    ║
║   Backend API Port: ${PORT}             ║
║   Frontend URL: http://0.0.0.0:${PORT}  ║
║   API Endpoint: /api                   ║
║   Database: SQLite/PostgreSQL          ║
╚════════════════════════════════════════╝
  `);
  console.log('📡 後端服務已啟動');
  console.log('🌐 前端已就緒');
  console.log('✓ 雙服務已啟動\n');
});

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信號，優雅關閉伺服器...');
  server.close(() => {
    console.log('伺服器已關閉');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信號，優雅關閉伺服器...');
  server.close(() => {
    console.log('伺服器已關閉');
    process.exit(0);
  });
});

module.exports = app;
