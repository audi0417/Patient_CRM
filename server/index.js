const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
