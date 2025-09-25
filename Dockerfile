# Production image for pre-built application
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy package files first (for better caching)
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies
RUN if [ -f "package-lock.json" ]; then \
      npm ci --omit=dev --workspace=server; \
    else \
      npm install --omit=dev --workspace=server; \
    fi

# Copy built application
COPY --chown=nodejs:nodejs server/dist ./server/dist
COPY --chown=nodejs:nodejs client/dist ./client/dist

USER nodejs

EXPOSE 5000

CMD ["node", "server/dist/index.js"]
