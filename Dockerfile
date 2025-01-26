# 使用官方 Node.js 镜像作为基础
FROM node:22-slim

# 安装 Puppeteer 的系统依赖
RUN apt-get update && \
    apt-get install -y \
    gnupg2  # 添加 gnupg2
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

# 安装 Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable

# 设置工作目录
WORKDIR /app

# 复制项目文件并安装依赖
COPY package*.json ./
RUN npm install

# 自动安装 Chrome
RUN npm install puppeteer

# 创建缓存目录
RUN mkdir -p /app/.cache/puppeteer && chmod -R 777 /app/.cache/puppeteer

# 设置环境变量
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# 复制源码
COPY . .

# 暴露端口（与 Render 环境变量一致）
EXPOSE 10000

# 启动命令
CMD ["node", "form_handler.js"]