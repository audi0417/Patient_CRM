# 患者管理系統 - 設定說明

## 系統設定步驟

### 1. 建立 Super Admin 帳號

系統不提供首次設定頁面,需要透過後台腳本建立 Super Admin 帳號。

#### 執行建立帳號腳本

```bash
node -e "
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin123', 10);

  const user = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    username: 'admin',
    password: hashedPassword,
    fullName: '系統管理員',
    email: 'admin@hospital.com',
    role: 'super_admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const users = [user];

  const dir = path.join(__dirname, 'public', 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dir, 'users.json'),
    JSON.stringify(users, null, 2)
  );

  console.log('✅ Super Admin 帳號建立成功!');
  console.log('');
  console.log('登入資訊:');
  console.log('  使用者名稱: admin');
  console.log('  密碼: Admin123');
  console.log('');
  console.log('請執行步驟 2 將帳號同步到系統');
}

createAdmin().catch(console.error);
"
```

### 2. 同步帳號到系統

#### 方法 A: 使用瀏覽器開發者工具 (推薦)

1. 啟動開發伺服器:
```bash
npm run dev
```

2. 開啟瀏覽器訪問 http://localhost:8080/

3. 按 F12 開啟開發者工具

4. 進入 Console 頁籤

5. 執行以下指令:
```javascript
fetch('/data/users.json')
  .then(r => r.json())
  .then(users => {
    localStorage.setItem('hospital_crm_users', JSON.stringify(users));
    console.log('✅ 使用者資料已同步');
    alert('帳號同步成功!請重新載入頁面登入');
    window.location.reload();
  })
  .catch(err => console.error('❌ 同步失敗:', err));
```

6. 頁面會自動重新載入並導向登入頁面

7. 使用以下帳號登入:
   - 使用者名稱: `admin`
   - 密碼: `Admin123`

#### 方法 B: 手動設定 localStorage

1. 開啟 http://localhost:8080/

2. 按 F12 開啟開發者工具

3. 進入 Application → Local Storage → http://localhost:8080

4. 新增項目:
   - Key: `hospital_crm_users`
   - Value: (將 `public/data/users.json` 的內容複製貼上)

5. 重新載入頁面

### 3. 登入系統

使用剛才建立的帳號登入:
- 使用者名稱: `admin`
- 密碼: `Admin123`

### 4. 新增其他使用者

登入後,點擊右上角使用者選單 → 使用者管理,即可新增其他員工帳號。

## 預設測試帳號

系統已建立測試帳號:

```
使用者名稱: admin
密碼: Admin123
角色: Super Admin
```

**重要**: 正式使用前請務必:
1. 登入系統
2. 前往「使用者管理」
3. 修改預設密碼
4. 或建立新的 Super Admin 帳號後刪除此測試帳號

## 密碼規則

- 至少 8 個字元
- 包含至少一個大寫字母 (A-Z)
- 包含至少一個小寫字母 (a-z)
- 包含至少一個數字 (0-9)

## 常見問題

### Q: 忘記密碼怎麼辦?
A: 重新執行步驟 1 建立新的 Super Admin 帳號,然後執行步驟 2 同步。

### Q: 可以有多個 Super Admin 嗎?
A: 可以,登入後在「使用者管理」中建立。

### Q: 如何備份使用者資料?
A:
- 瀏覽器版本: 從開發者工具匯出 localStorage 的 `hospital_crm_users` 資料
- Electron 版本: 備份應用程式資料目錄中的資料庫檔案

### Q: Electron 版本需要手動同步嗎?
A: 不需要,Electron 版本直接使用檔案系統儲存,執行步驟 1 後即可登入。

## 技術資訊

- 前端框架: React 18.3.1
- 認證方式: JWT (24小時有效期)
- 密碼加密: bcryptjs (salt rounds: 10)
- 資料儲存: localStorage (瀏覽器) / SQLite (Electron)

## 相關文件

- [快速開始指南](./快速開始指南.md)
- [登入系統使用說明](./登入系統使用說明.md)
- [認證系統技術文件](./AUTH_README.md)
- [後台腳本說明](./scripts/README.md)

---

**更新日期**: 2025-01-05
**版本**: 1.0.0
