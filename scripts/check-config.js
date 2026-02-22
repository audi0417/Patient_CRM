// ====================================
// Patient CRM - 启动脚本配置检查
// ====================================
// 此脚本会在启动前检查必要的配置

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('');
console.log('═══════════════════════════════════════');
console.log('  Patient CRM - 配置检查');
console.log('═══════════════════════════════════════');
console.log('');

let hasErrors = false;
let hasWarnings = false;

// 必须配置项
const REQUIRED_CONFIGS = [
  { key: 'JWT_SECRET', minLength: 32, description: 'JWT 密钥' },
  { key: 'ENCRYPTION_KEY', minLength: 32, description: '数据加密密钥' }
];

// 推荐配置项
const RECOMMENDED_CONFIGS = [
  { key: 'PORT', default: '3001', description: '后端端口' },
  { key: 'VITE_PORT', default: '8080', description: '前端端口' },
  { key: 'DATABASE_TYPE', default: 'sqlite', description: '数据库类型' },
  { key: 'NODE_ENV', default: 'development', description: '运行环境' }
];

// 检查必须配置
console.log('【必须配置】');
REQUIRED_CONFIGS.forEach(config => {
  const value = process.env[config.key];
  const status = value && value.length >= config.minLength;
  
  if (status) {
    console.log(`  ✅ ${config.description} (${config.key}): 已设置`);
  } else {
    console.log(`  ❌ ${config.description} (${config.key}): 未设置或长度不足`);
    hasErrors = true;
  }
});

console.log('');
console.log('【推荐配置】');
RECOMMENDED_CONFIGS.forEach(config => {
  const value = process.env[config.key] || config.default;
  console.log(`  ℹ️  ${config.description} (${config.key}): ${value || '未设置'}`);
});

console.log('');
console.log('【数据库配置】');
const dbType = process.env.DATABASE_TYPE || 'sqlite';
console.log(`  📊 数据库类型: ${dbType}`);

if (dbType === 'sqlite') {
  const dbPath = process.env.DATABASE_PATH || 'data/patient_crm.db';
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    console.log(`  ⚠️  数据库目录不存在: ${dbDir}`);
    console.log(`     正在创建目录...`);
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`  ✅ 目录已创建`);
  } else {
    console.log(`  ✅ 数据库路径: ${dbPath}`);
  }
} else if (dbType === 'postgres') {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log(`  ✅ PostgreSQL 连接: 已配置`);
  } else {
    const host = process.env.DATABASE_HOST;
    const port = process.env.DATABASE_PORT;
    const user = process.env.DATABASE_USER;
    const name = process.env.DATABASE_NAME;
    
    if (host && port && user && name) {
      console.log(`  ✅ PostgreSQL 配置完整`);
    } else {
      console.log(`  ⚠️  PostgreSQL 配置不完整`);
      hasWarnings = true;
    }
  }
}

console.log('');
console.log('【端口配置】');
const backendPort = process.env.PORT || '3001';
const frontendPort = process.env.VITE_PORT || '8080';
console.log(`  🔌 后端端口: ${backendPort}`);
console.log(`  🔌 前端端口: ${frontendPort}`);

console.log('');
console.log('【安全配置】');
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'production') {
  const origins = process.env.ALLOWED_ORIGINS;
  if (origins) {
    console.log(`  ✅ CORS 允许源: ${origins}`);
  } else {
    console.log(`  ⚠️  生产环境建议设置 ALLOWED_ORIGINS`);
    hasWarnings = true;
  }
  
  const adminPwd = process.env.SUPER_ADMIN_PASSWORD;
  if (adminPwd === 'SuperAdmin@2024') {
    console.log(`  ⚠️  使用默认管理员密码（不安全）`);
    hasWarnings = true;
  }
} else {
  console.log(`  ℹ️  开发环境模式`);
}

console.log('');
console.log('═══════════════════════════════════════');

if (hasErrors) {
  console.log('');
  console.log('❌ 配置检查失败！');
  console.log('');
  console.log('请按照以下步骤修复：');
  console.log('');
  console.log('1. 确保 .env 文件存在');
  console.log('   如果没有，请复制: cp .env.example .env');
  console.log('');
  console.log('2. 生成必要的密钥：');
  console.log('');
  console.log('   # 生成 JWT_SECRET');
  console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('');
  console.log('   # 生成 ENCRYPTION_KEY');
  console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('');
  console.log('3. 将生成的密钥添加到 .env 文件');
  console.log('');
  console.log('4. 重新运行此检查：node scripts/check-config.js');
  console.log('');
  console.log('详细配置指南: CONFIG.md');
  console.log('');
  process.exit(1);
}

if (hasWarnings) {
  console.log('');
  console.log('⚠️  配置检查通过，但有警告');
  console.log('   请查看上述警告信息并考虑优化配置');
  console.log('');
}

if (!hasErrors && !hasWarnings) {
  console.log('');
  console.log('✅ 配置检查通过！');
  console.log('');
}

console.log('准备启动系统...');
console.log('');
console.log(`访问地址: http://localhost:${frontendPort}`);
console.log(`API 地址: http://localhost:${backendPort}`);
console.log('');
console.log('═══════════════════════════════════════');
console.log('');
