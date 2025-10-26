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

# Install production dependencies
RUN if [ -f "package-lock.json" ]; then \
      npm ci --omit=dev --workspace=server; \
    else \
      npm install --omit=dev --workspace=server; \
    fi

# Install Playwright browsers (chromium only for efficiency)
RUN cd server && npx playwright install chromium

# Copy built application
COPY --chown=nodejs:nodejs server/dist ./server/dist
COPY --chown=nodejs:nodejs client/dist ./client/dist

USER nodejs

EXPOSE 5000

CMD ["node", "server/dist/index.js"]
