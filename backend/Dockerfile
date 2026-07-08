# ── Build stage ──────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
RUN npm install --workspace=backend
COPY backend ./backend
RUN npm run build --workspace=backend

# ── Runtime stage ────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "backend/dist/index.js"]
