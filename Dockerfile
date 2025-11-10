# 多階段構建 - 構建前端
FROM node:18-alpine AS builder

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製源代碼
COPY . .

# 構建前端
RUN npm run build

# ========================================
# 生產階段
FROM node:18-alpine

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝生產依賴
RUN npm ci --only=production

# 從 builder 階段複製構建好的前端
COPY --from=builder /app/dist ./dist

# 複製服務器代碼和初始化腳本
COPY server ./server
COPY scripts ./scripts
COPY data ./data

# 建立數據目錄（用於 SQLite 或其他存儲）
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health-check', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 啟動命令
CMD ["node", "server/index.js"]
