# 多階段構建 - 構建前端
FROM node:18-alpine AS builder

# 構建參數
ARG DEPLOYMENT_MODE=saas
ARG APP_VERSION=1.0.0

WORKDIR /app

# 安裝構建依賴（用於編譯原生模組，如需使用 SQLite 時的 better-sqlite3）
RUN apk add --no-cache python3 make g++

# 複製 package 文件
COPY package*.json ./

# 安裝所有依賴（包括 devDependencies，構建需要）
# 使用 npm install 替代 npm ci 以避免 ETXTBSY 錯誤
RUN npm install --legacy-peer-deps

# 複製源代碼（排除 node_modules 和 .git）
COPY . .

# 構建前端
RUN npm run build

# ========================================
# 生產階段
FROM node:18-alpine

# 版本標籤
ARG APP_VERSION=1.0.0
ARG BUILD_DATE
ARG VCS_REF

LABEL org.opencontainers.image.title="Patient CRM" \
      org.opencontainers.image.description="Patient CRM - Healthcare Management System" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}"

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝運行時依賴
# 注意：如果使用 PostgreSQL，不需要 better-sqlite3 的構建工具
# 如果使用 SQLite，需要保留構建工具
RUN apk add --no-cache python3 make g++ && \
    npm ci --only=production && \
    apk del python3 make g++

# 從 builder 階段複製構建好的前端
COPY --from=builder /app/dist ./dist

# 複製服務器代碼和初始化腳本
COPY server ./server
COPY scripts ./scripts

# 複製配置和管理工具
COPY config ./config
COPY bin ./bin

# 複製文檔（可選）
COPY docs ./docs

# 建立數據目錄（用於 SQLite 或其他存儲）
# 注意：不複製本地 data 目錄，讓 volume 掛載管理
RUN mkdir -p /app/data && chmod 777 /app/data

# 設定環境變數
ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}

# 暴露端口
EXPOSE 3001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health-check', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 啟動命令（執行 migration 然後啟動伺服器）
CMD ["npm", "start"]
