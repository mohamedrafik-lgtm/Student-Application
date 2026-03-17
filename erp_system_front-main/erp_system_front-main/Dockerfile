# مرحلة البناء - استخدام الصورة الكاملة
FROM node:20 AS builder

WORKDIR /app

# نسخ ملفات package
COPY package.json package-lock.json* ./

# تثبيت dependencies
RUN npm ci --legacy-peer-deps

# نسخ كل الملفات
COPY . .

# تعطيل telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# بناء التطبيق
RUN npm run build

# مرحلة الإنتاج
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# نسخ الملفات المبنية
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
