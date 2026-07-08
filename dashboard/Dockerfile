# ── Build stage ──────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY dashboard/package.json ./dashboard/
RUN npm install --workspace=dashboard
COPY dashboard ./dashboard
RUN npm run build --workspace=dashboard

# ── Runtime stage ────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dashboard/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
