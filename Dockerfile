# ----------------------------------------------------
# EduAegis Multi-Stage Production Dockerfile
# ----------------------------------------------------

# Stage 1: Build & Compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Lightweight Image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 4200

CMD ["node", "dist/index.js"]
