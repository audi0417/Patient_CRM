# 🚢 部署指南

本文件說明如何將 Patient CRM 部署到不同環境和平台。

---

## 📋 目錄

1. [開發環境部署](#開發環境部署)
2. [生產環境打包](#生產環境打包)
3. [Windows 部署](#windows-部署)
4. [macOS 部署](#macos-部署)
5. [Linux 部署](#linux-部署)
6. [常見問題](#常見問題)

---

## 🛠️ 開發環境部署

### 前置要求

確保系統已安裝：
- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Git (選用)

### 步驟 1: 克隆專案

```bash
git clone <your-repo-url>
cd Patient_CRM
```

### 步驟 2: 安裝依賴

```bash
npm install
```

### 步驟 3: 啟動開發伺服器

#### Web 模式
```bash
npm run dev
```
訪問 http://localhost:8080

#### Electron 模式
```bash
npm run electron:dev
```

---

## 📦 生產環境打包

### 打包前檢查

```bash
# 1. 確保所有測試通過
npm run lint

# 2. 建置 Web 版本確認無誤
npm run build
npm run preview

# 3. 確認 Electron 配置
cat electron-builder.json
```

### 全平台打包

```bash
npm run electron:build
```

這將建置當前平台的安裝檔案。

### 特定平台打包

```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

### 打包產出

打包完成後，檔案位於 `release/` 目錄：

```
release/
├── 患者管理系統-1.0.0-win.exe          (Windows 安裝程式)
├── 患者管理系統-1.0.0-win-portable.exe (Windows 可攜版)
├── 患者管理系統-1.0.0-mac.dmg          (macOS 安裝映像)
├── 患者管理系統-1.0.0-mac.zip          (macOS ZIP 封裝)
├── 患者管理系統-1.0.0-linux.AppImage   (Linux AppImage)
└── 患者管理系統-1.0.0-linux.deb        (Debian/Ubuntu 套件)
```

---

## 💻 Windows 部署

### 開發者建置

```bash
# 在 Windows 上建置
npm run electron:build:win
```

### 安裝檔類型

1. **NSIS 安裝程式** (`.exe`)
   - 完整安裝程式
   - 包含解除安裝程式
   - 創建開始選單捷徑
   - 支援自訂安裝路徑

2. **可攜版** (`.exe`)
   - 單一執行檔
   - 無需安裝
   - 適合 USB 隨身碟

### 系統需求

- Windows 7 SP1 / 8 / 10 / 11
- 64-bit 作業系統
- 至少 100MB 可用空間

### 安裝步驟

1. 雙擊 `.exe` 安裝檔
2. 選擇安裝路徑
3. 勾選「建立桌面捷徑」(選用)
4. 點擊「安裝」
5. 安裝完成後啟動應用程式

### 資料位置

```
C:\Users\<用戶名>\AppData\Roaming\patient-crm\
├── patient_crm.db          (主資料庫)
├── patient_crm.db.bak      (自動備份)
└── logs\                   (日誌檔案)
```

### 解除安裝

控制台 → 程式和功能 → 找到「患者管理系統」→ 解除安裝

---

## 🍎 macOS 部署

### 開發者建置

```bash
# 在 macOS 上建置
npm run electron:build:mac
```

### 安裝檔類型

1. **DMG 映像檔** (`.dmg`)
   - 標準 macOS 安裝方式
   - 拖放安裝
   - 推薦使用

2. **ZIP 封裝** (`.zip`)
   - 解壓即用
   - 適合高級用戶

### 系統需求

- macOS 10.13 (High Sierra) 或更高
- Intel 或 Apple Silicon (M1/M2)
- 至少 100MB 可用空間

### 安裝步驟

1. 開啟 `.dmg` 檔案
2. 將應用程式拖曳到「應用程式」資料夾
3. 彈出 DMG 映像
4. 從 Launchpad 或應用程式資料夾啟動

### 首次執行

macOS Gatekeeper 可能會阻止首次執行：

1. 右鍵點擊應用程式
2. 選擇「開啟」
3. 在警告對話框中點擊「開啟」

或透過系統偏好設定：
```
系統偏好設定 → 安全性與隱私權 → 一般 → 點擊「強制開啟」
```

### 資料位置

```
~/Library/Application Support/patient-crm/
├── patient_crm.db          (主資料庫)
├── patient_crm.db.bak      (自動備份)
└── logs/                   (日誌檔案)
```

### 解除安裝

1. 開啟 Finder
2. 前往「應用程式」資料夾
3. 將「患者管理系統」拖曳到垃圾桶
4. 清空垃圾桶

---

## 🐧 Linux 部署

### 開發者建置

```bash
# 在 Linux 上建置
npm run electron:build:linux
```

### 安裝檔類型

1. **AppImage** (`.AppImage`)
   - 通用格式
   - 無需安裝
   - 支援所有主流發行版
   - 推薦使用

2. **DEB 套件** (`.deb`)
   - Debian/Ubuntu 專用
   - 使用 apt 管理
   - 系統整合更好

### 系統需求

- Ubuntu 18.04 / Debian 10 或更高
- Fedora 30 或更高
- 其他現代 Linux 發行版
- 至少 100MB 可用空間

### AppImage 安裝

```bash
# 1. 下載 AppImage
# 2. 添加執行權限
chmod +x 患者管理系統-1.0.0-linux.AppImage

# 3. 執行
./患者管理系統-1.0.0-linux.AppImage
```

### DEB 套件安裝

```bash
# Ubuntu/Debian
sudo dpkg -i 患者管理系統-1.0.0-linux.deb

# 如果有依賴問題
sudo apt-get install -f
```

### 資料位置

```
~/.config/patient-crm/
├── patient_crm.db          (主資料庫)
├── patient_crm.db.bak      (自動備份)
└── logs/                   (日誌檔案)
```

### 解除安裝

```bash
# DEB 套件
sudo apt-get remove patient-crm

# AppImage
rm 患者管理系統-1.0.0-linux.AppImage
```

---

## 🔧 進階配置

### 自訂打包設定

編輯 `electron-builder.json`:

```json
{
  "appId": "com.yourcompany.patientcrm",
  "productName": "自訂名稱",
  "directories": {
    "output": "custom-release"
  }
}
```

### 程式碼簽署

#### Windows
```bash
# 設置簽署證書
export CSC_LINK=path/to/cert.pfx
export CSC_KEY_PASSWORD=your_password

npm run electron:build:win
```

#### macOS
```bash
# 設置 Apple Developer 證書
export CSC_LINK=path/to/cert.p12
export CSC_KEY_PASSWORD=your_password
export APPLEID=your@apple.id
export APPLEIDPASS=app_specific_password

npm run electron:build:mac
```

### 自動更新

未來版本將支援自動更新功能。

---

## 🐛 常見問題

### Q: 打包時出現記憶體不足錯誤

**A:** 增加 Node.js 記憶體限制：
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run electron:build
```

### Q: Windows 打包失敗

**A:** 確保安裝了必要的建置工具：
```bash
npm install --global windows-build-tools
```

### Q: macOS 無法開啟應用程式

**A:** 移除隔離屬性：
```bash
xattr -cr /Applications/患者管理系統.app
```

### Q: Linux 缺少依賴

**A:** 安裝必要的系統函式庫：
```bash
# Ubuntu/Debian
sudo apt-get install libgtk-3-0 libnotify4 libnss3 libxss1 \
  libxtst6 xdg-utils libatspi2.0-0 libuuid1 libappindicator3-1

# Fedora
sudo dnf install gtk3 libnotify nss libXScrnSaver libXtst \
  xdg-utils at-spi2-atk libuuid libappindicator-gtk3
```

### Q: 打包檔案太大

**A:** 啟用壓縮和優化：
```json
// electron-builder.json
{
  "compression": "maximum",
  "asar": true,
  "removePackageScripts": true
}
```

### Q: 如何在打包中排除檔案

**A:** 在 electron-builder.json 中配置：
```json
{
  "files": [
    "dist/**/*",
    "electron/**/*"
  ],
  "extraFiles": []
}
```

---

## 📊 部署檢查清單

### 打包前

- [ ] 更新版本號 (`package.json`)
- [ ] 執行 linter (`npm run lint`)
- [ ] 測試所有功能
- [ ] 更新 CHANGELOG
- [ ] 準備圖示資源 (`build/` 目錄)

### 打包中

- [ ] 選擇目標平台
- [ ] 執行打包命令
- [ ] 檢查建置日誌
- [ ] 確認打包產出

### 打包後

- [ ] 測試安裝程式
- [ ] 驗證功能完整性
- [ ] 測試資料庫功能
- [ ] 檢查檔案大小
- [ ] 準備發布說明

---

## 🚀 持續整合 (CI/CD)

### GitHub Actions 範例

創建 `.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run electron:build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: release-${{ matrix.os }}
          path: release/
```

---

## 📞 支援

如遇到部署問題：

- 📖 查看 [README.md](./README.md)
- 📖 查看 [QUICK_START.md](./QUICK_START.md)
- 🐛 提交 [GitHub Issues](https://github.com/your-repo/issues)
- 📧 Email: support@patient-crm.com

---

**更新日期**: 2025-11-04
**版本**: 1.0.0
