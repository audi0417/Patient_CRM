# 快速上手 - 30 秒開始使用

## 🎯 最快速的方式

### 1. 開啟系統
訪問: **http://localhost:8080/**

### 2. 同步測試帳號 (在瀏覽器 Console 執行)
按 F12 → Console → 貼上執行:
```javascript
fetch('/data/users.json').then(r=>r.json()).then(users=>{localStorage.setItem('hospital_crm_users',JSON.stringify(users));location.reload()})
```

### 3. 登入
- 使用者名稱: `admin`
- 密碼: `Admin123`

## ✅ 完成!

現在您可以:
- 管理病患資料
- 建立其他使用者帳號
- 設定系統權限

## ⚠️ 重要提醒

**正式使用前請務必修改密碼!**

1. 登入後點擊右上角使用者選單
2. 選擇「使用者管理」
3. 重設 admin 密碼
4. 或建立新的 Super Admin 後刪除 admin 帳號

---

詳細說明請參考:
- [完整設定說明](./SETUP_INSTRUCTIONS.md)
- [系統更新說明](./系統更新說明.md)
