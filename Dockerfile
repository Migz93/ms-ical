FROM node:20-alpine AS web-builder

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:20-alpine AS server-builder

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

FROM node:20-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies and source
COPY --from=server-builder --chown=nodejs:nodejs /app/server/node_modules ./node_modules
COPY --chown=nodejs:nodejs server/package*.json ./
COPY --chown=nodejs:nodejs server/src ./src
COPY --from=web-builder --chown=nodejs:nodejs /app/web/dist ./public

# Switch to non-root user
USER nodejs

EXPOSE 5600

CMD ["node", "src/index.js"]
