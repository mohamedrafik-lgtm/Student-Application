# Build stage
FROM node:22 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma Client, build application, and copy wrapper files
RUN npx prisma generate && npm run build && \
    mkdir -p dist/src/whatsapp && \
    cp src/whatsapp/*.mjs dist/src/whatsapp/ 2>/dev/null || true

# Production stage
FROM node:22-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-freefont-ttf \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    curl \
    bash \
    openssl \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer environment variables (these are fixed, not configurable)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built code from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy google-cloud-key.json if it exists (use wildcard trick)
COPY google-cloud-key.jso[n] ./

# Copy start script with execute permission (avoids RUN chmod issue)
COPY --chmod=755 start.sh ./start.sh

# Create directories and non-root user in single RUN to minimize layers
RUN mkdir -p uploads whatsapp-auth backups \
    uploads/trainees uploads/logos uploads/news uploads/receipts uploads/lectures uploads/idcards && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs

# NOTE: PORT, DATABASE_URL, and other env vars come from Coolify at runtime
# We only set defaults here that can be overridden

# Default environment variables (will be overridden by Coolify)
ENV NODE_ENV=production \
    HOST=0.0.0.0

# NOTE: No EXPOSE needed - the app reads PORT from environment at runtime
# This allows the same image to run on different ports (4001, 4002, etc.)
# Coolify/Docker handles port mapping via -p flag, not EXPOSE

CMD ["./start.sh"]


