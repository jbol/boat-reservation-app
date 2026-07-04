# Multi-stage build for the VPS deployment path (see docs/DEPLOY_HOSTINGER.md).
FROM node:22-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# Builder keeps devDependencies (incl. the prisma CLI) — docker-compose.prod.yml
# reuses this stage as a one-off migration runner.
FROM base AS builder
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV BUILD_STANDALONE=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3000
ENV HOSTNAME=0.0.0.0 PORT=3000
CMD ["node", "server.js"]
