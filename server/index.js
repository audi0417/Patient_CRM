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

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const healthRoutes = require('./routes/health');
const appointmentRoutes = require('./routes/appointments');
const goalRoutes = require('./routes/goals');
const consultationRoutes = require('./routes/consultations');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/consultations', consultationRoutes);

// 健康檢查端點
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 錯誤處理中介層
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 啟動伺服器 - 綁定到所有網路介面 (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════╗
║   Patient CRM Backend Server          ║
╠════════════════════════════════════════╣
║   Status: Running                      ║
║   Port: ${PORT}                         ║
║   Local: http://localhost:${PORT}       ║
║   Network: http://0.0.0.0:${PORT}       ║
║   API: /api                            ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
