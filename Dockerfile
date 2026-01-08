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

# Install build dependencies for better-sqlite3 and su-exec for user switching
RUN apk add --no-cache python3 make g++ su-exec

# Create default non-root user (will be updated at runtime if PUID/PGID are set)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy dependencies and source
COPY --from=server-builder --chown=nodejs:nodejs /app/server/node_modules ./node_modules
COPY --chown=nodejs:nodejs server/package*.json ./
COPY --chown=nodejs:nodejs server/src ./src
COPY --from=web-builder --chown=nodejs:nodejs /app/web/dist ./public

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5600

ENTRYPOINT ["/entrypoint.sh"]