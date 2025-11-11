/**
 * Database Migration Runner
 *
 * 執行資料庫遷移腳本
 *
 * 使用方式：
 * node server/database/migrate.js up     # 執行遷移
 * node server/database/migrate.js down   # 回滾遷移
 */

const path = require('path');
const fs = require('fs');

// 取得遷移方向
const direction = process.argv[2] || 'up';

if (!['up', 'down'].includes(direction)) {
  console.error('❌ 錯誤：請指定 "up" 或 "down"');
  console.log('使用方式: node migrate.js up|down');
  process.exit(1);
}

// 載入遷移文件
const migrationsDir = path.join(__dirname, 'migrations');

console.log(`📦 載入遷移文件從: ${migrationsDir}`);

try {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (files.length === 0) {
    console.log('ℹ️  沒有找到遷移文件');
    process.exit(0);
  }

  console.log(`找到 ${files.length} 個遷移文件`);
  console.log('');

  // 執行遷移
  for (const file of files) {
    const migrationPath = path.join(migrationsDir, file);
    console.log(`執行: ${file}`);

    const migration = require(migrationPath);

    if (typeof migration[direction] !== 'function') {
      console.error(`❌ 遷移文件 ${file} 沒有 ${direction} 函數`);
      continue;
    }

    migration[direction]();
    console.log(`✅ ${file} ${direction === 'up' ? '遷移' : '回滾'}完成`);
    console.log('');
  }

  console.log('🎉 所有遷移執行完成！');

} catch (error) {
  console.error('❌ 遷移失敗:', error);
  process.exit(1);
}
