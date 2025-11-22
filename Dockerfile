# Production image for pre-built application
# Using regular node image instead of alpine for Playwright support
FROM node:20 AS runner
WORKDIR /app

# Install Playwright system dependencies
# dpkg 설정을 먼저 수정하고 패키지 설치
RUN apt-get update && \
    (dpkg --configure -a || true) && \
    (apt-get install -f -y || true) && \
# DEBIAN_FRONTEND를 noninteractive로 설정하여 대화형 프롬프트 방지
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    (dpkg --configure -a || true) && \
    (apt-get install -f -y || true) && \
    apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with home directory
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 -g nodejs -m nodejs

# Copy package files first (for better caching)
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies (dev 모드 지원을 위해 devDependencies도 설치)
RUN if [ -f "package-lock.json" ]; then \
      npm ci --workspace=server; \
    else \
      npm install --workspace=server; \
    fi

# Copy built application files
# 프로덕션 환경에서는 빌드된 dist 파일만 필요
# dist 디렉토리가 없어도 빌드가 진행되도록 처리
RUN mkdir -p ./server/dist ./client/dist

# 배포 패키지에서 빌드된 dist 파일 복사
# dist 디렉토리가 없을 경우를 대비해 빌드 인자 사용
# 빌드 시 dist 디렉토리가 있으면 복사, 없으면 빈 디렉토리 유지
# COPY 명령은 소스가 없으면 실패하므로, 먼저 server와 client 디렉토리를 임시로 복사
# .dockerignore를 사용하여 불필요한 파일 제외 후 복사
COPY --chown=nodejs:nodejs server ./server-tmp/
COPY --chown=nodejs:nodejs client ./client-tmp/
RUN if [ -d "./server-tmp/dist" ] && [ "$(ls -A ./server-tmp/dist 2>/dev/null)" ]; then \
      cp -r ./server-tmp/dist/* ./server/dist/ 2>/dev/null || true; \
    fi && \
    if [ -d "./client-tmp/dist" ] && [ "$(ls -A ./client-tmp/dist 2>/dev/null)" ]; then \
      cp -r ./client-tmp/dist/* ./client/dist/ 2>/dev/null || true; \
    fi && \
    rm -rf ./server-tmp ./client-tmp

# tsconfig.json도 복사 (배포 패키지에 포함됨)
COPY --chown=nodejs:nodejs server/tsconfig.json ./server/tsconfig.json

# nodejs 사용자로 전환하여 Playwright 브라우저 설치
# 시스템 종속성은 이미 root로 설치했으므로, 브라우저만 nodejs 사용자로 설치
USER nodejs

# Playwright 브라우저 설치 (nodejs 사용자로 실행)
# PLAYWRIGHT_BROWSERS_PATH를 명시하여 nodejs 사용자 홈 디렉토리에 설치
# --with-deps는 제외 (시스템 종속성은 이미 설치됨)
ENV PLAYWRIGHT_BROWSERS_PATH=/home/nodejs/.cache/ms-playwright
RUN cd server && npx playwright install chromium

EXPOSE 5000

WORKDIR /app/server

# NODE_ENV에 따라 dev 또는 start 실행
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then npm run dev; else npm start; fi"]
