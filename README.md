# Silverbites

WhatsApp-native ordering platform for a single restaurant. See `docs/` for the full Gate 0 product/architecture documentation.

## Monorepo Structure

```
silverbites/
├── backend/       Node.js + TypeScript + Express API
├── dashboard/      React + Vite + TypeScript + Tailwind owner dashboard
├── docs/           Gate 0 deliverables (PRD, FRD, architecture, etc.)
└── docker-compose.yml
```

## Prerequisites
- Node.js 20+
- Docker + Docker Compose
- npm 10+

## Getting Started (local dev, no Docker)

```bash
npm install                 # installs all workspaces
cp .env.example .env         # fill in secrets as each gate needs them
npm run dev:backend          # starts Express on :4000 (tsx watch mode)
npm run dev:dashboard        # starts Vite dev server on :5173
```

Health check: `curl http://localhost:4000/health`

## Getting Started (Docker Compose — full stack incl. Postgres/Redis)

```bash
cp .env.example .env
docker compose up --build
```
- Backend: http://localhost:4000
- Dashboard: http://localhost:5173
- Postgres: localhost:5432 (user/pass: `silverbites`)
- Redis: localhost:6379

## Tooling
- **Lint:** `npm run lint` (both workspaces)
- **Format:** `npm run format` (Prettier across the repo)
- **Test (backend):** `npm run test --workspace=backend`
- **Typecheck (backend):** `npm run typecheck --workspace=backend`
- **Commits:** Conventional Commits enforced via Husky + Commitlint (`feat:`, `fix:`, `chore:`, etc.)

## Git Strategy
- `main` — production-ready
- `develop` — integration branch
- `feature/*` — one branch per feature, merged into `develop`

## Gate Status
See `docs/project-roadmap.md` for the full Gate 0–10 plan and current progress.

- ✅ Gate 0 — Product Definition
- ✅ Gate 1 — Development Environment (this scaffold)
- ⬜ Gate 2 — Backend Foundation (queue wiring, error handling)
- ⬜ Gate 3 — Database (Prisma schema + migrations)
- ⬜ Gate 4–10 — see roadmap
