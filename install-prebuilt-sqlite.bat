@echo off
chcp 65001 >nul
echo ====================================
echo   安裝預編譯的 better-sqlite3
echo ====================================
echo.

echo 檢測 Node.js 版本...
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js 版本: %NODE_VERSION%

echo.
echo 移除現有的 better-sqlite3...
call npm uninstall better-sqlite3

echo.
echo 根據您的 Node.js 版本，嘗試安裝相容版本...

if "%NODE_VERSION:~1,2%"=="22" (
    echo 偵測到 Node.js 22.x
    echo 安裝 better-sqlite3@9.6.0 (支援 Node.js 22)
    call npm install better-sqlite3@9.6.0
    goto :test
)

if "%NODE_VERSION:~1,2%"=="20" (
    echo 偵測到 Node.js 20.x
    echo 安裝 better-sqlite3@9.6.0
    call npm install better-sqlite3@9.6.0
    goto :test
)

if "%NODE_VERSION:~1,2%"=="18" (
    echo 偵測到 Node.js 18.x
    echo 安裝 better-sqlite3@9.4.0
    call npm install better-sqlite3@9.4.0
    goto :test
)

echo 安裝最新版本...
call npm install better-sqlite3
goto :test

:test
echo.
echo ====================================
echo   測試安裝
echo ====================================
echo.

node -e "try { const db = require('better-sqlite3')(':memory:'); console.log('✅ better-sqlite3 安裝成功！'); } catch(e) { console.log('❌ 安裝失敗:', e.message); process.exit(1); }"

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo   安裝完成！
    echo ====================================
    echo.
    echo 現在可以啟動系統了：
    echo   npm run dev:full
    echo.
) else (
    echo.
    echo ====================================
    echo   安裝失敗
    echo ====================================
    echo.
    echo 建議：
    echo 1. 安裝 Windows Build Tools (以管理員身分執行):
    echo    npm install --global windows-build-tools
    echo.
    echo 2. 或查看詳細說明:
    echo    BETTER_SQLITE3_FIX.md
    echo.
)

pause
