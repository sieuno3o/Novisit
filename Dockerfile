# Production image for pre-built application
# Using regular node image instead of alpine for Playwright support
FROM node:18 AS runner
WORKDIR /app

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
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
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 -g nodejs nodejs

# Copy package files first (for better caching)
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies (dev 모드 지원을 위해 devDependencies도 설치)
RUN if [ -f "package-lock.json" ]; then \
      npm ci --workspace=server; \
    else \
      npm install --workspace=server; \
    fi

# Install Playwright browsers (chromium only for efficiency)
# --with-deps 옵션으로 시스템 종속성도 함께 설치 (더 안정적)
RUN cd server && npx playwright install chromium --with-deps

# Copy application (dev 모드를 위해 소스 파일도 복사)
COPY --chown=nodejs:nodejs server/src ./server/src
COPY --chown=nodejs:nodejs server/tsconfig.json ./server/tsconfig.json

# dist 디렉토리는 선택적으로 복사 (개발 환경에서는 없을 수 있음)
# 빈 디렉토리 먼저 생성
RUN mkdir -p ./server/dist ./client/dist

# server와 client 디렉토리를 임시 위치에 복사 (dist 포함 여부와 관계없이)
COPY --chown=nodejs:nodejs server ./tmp/server-build/
COPY --chown=nodejs:nodejs client ./tmp/client-build/

# dist 디렉토리가 존재하면 복사, 없으면 빈 디렉토리 유지
RUN if [ -d "./tmp/server-build/dist" ] && [ "$(ls -A ./tmp/server-build/dist 2>/dev/null)" ]; then \
      cp -r ./tmp/server-build/dist/* ./server/dist/ && \
      chown -R nodejs:nodejs ./server/dist; \
    fi && \
    if [ -d "./tmp/client-build/dist" ] && [ "$(ls -A ./tmp/client-build/dist 2>/dev/null)" ]; then \
      cp -r ./tmp/client-build/dist/* ./client/dist/ && \
      chown -R nodejs:nodejs ./client/dist; \
    fi && \
    rm -rf ./tmp

USER nodejs

EXPOSE 5000

WORKDIR /app/server

# NODE_ENV에 따라 dev 또는 start 실행
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then npm run dev; else npm start; fi"]
