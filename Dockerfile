# 使用官方 Node.js 镜像作为基础
FROM node:18-slim

# 安装 Puppeteer 的系统依赖
RUN apt-get update && \
    apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

# 设置工作目录
WORKDIR /app

# 复制项目文件并安装依赖
COPY package*.json ./
RUN npm install --production

# 复制源码
COPY . .

# 设置 Puppeteer 缓存路径
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# 暴露端口（与 Render 环境变量一致）
EXPOSE 10000

# 启动命令
CMD ["node", "form_handler.js "]