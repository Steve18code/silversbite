# Silverbites — Project Roadmap (Gates)

We do not move to the next gate until the current one is verifiably complete (working code/tests, not just "written").

## Gate 0 — Product Definition ✅ (this document set)
- [x] PRD.md, FRD.md, architecture.md, database-design.md, api-design.md, conversation-flow.md, project-roadmap.md

## Gate 1 — Development Environment
- [ ] Monorepo structure (`/backend`, `/dashboard`, `/docs`)
- [ ] Node.js + TypeScript project scaffolding (backend)
- [ ] ESLint + Prettier + Husky + Commitlint (Conventional Commits)
- [ ] Docker Compose: Postgres, Redis, backend, dashboard
- [ ] `.env.example` for all required secrets
- [ ] Git strategy: `main` / `develop` / `feature/*`, branch protection

## Gate 2 — Backend Foundation
- [ ] Express app skeleton, health-check endpoint
- [ ] Global error handling + structured logging (pino or similar)
- [ ] BullMQ + Redis wired up with a test job
- [ ] Config/env validation on boot (fail fast if secrets missing)

## Gate 3 — Database
- [ ] Prisma schema from `database-design.md` implemented
- [ ] Migrations committed and runnable via `docker compose`
- [ ] Seed script (sample menu, sample owner number)

## Gate 4 — Authentication
- [ ] Dashboard login: JWT access + refresh token, bcrypt password hashing
- [ ] `OwnerNumber` allow-list check for WhatsApp-side owner commands
- [ ] Middleware: `requireAuth` (dashboard), `requireOwnerNumber` (WhatsApp tool routing)

## Gate 5 — WhatsApp Integration
- [ ] Meta WhatsApp Business Cloud API app registered, webhook verified
- [ ] Inbound webhook: signature verification, raw message persistence, job enqueue
- [ ] Outbound sender: text, template, interactive list/button messages
- [ ] Media download (voice notes, images, PDFs) + Whisper transcription pipeline

## Gate 6 — Conversation Engine
- [ ] Conversation/Message persistence per FR-2
- [ ] Sender classification (owner vs customer)
- [ ] Conversation state management (in-progress order draft, etc.)
- [ ] Human handoff flagging + notification

## Gate 7 — AI Engine
- [ ] Claude API integration with tool-calling schema (from `api-design.md`)
- [ ] System prompt: brand voice, English/Pidgin handling, confirmation-before-destructive-action rule
- [ ] Tool implementations wired to Business Logic Services (Gate 8)
- [ ] Logging of every tool call (input/output/latency)

## Gate 8 — Business Logic
- [ ] MenuService (add/update/remove, audit log)
- [ ] MenuImportService (PDF parsing → staged draft → confirm)
- [ ] OrderService (create, status transitions, status-change notifications)
- [ ] CustomerService (get-or-create by phone, history summary)
- [ ] PaymentService (Paystack primary, Flutterwave fallback, common interface)

## Gate 9 — Dashboard
- [ ] React + Vite + TS + Tailwind + Shadcn scaffold
- [ ] Login screen (JWT auth)
- [ ] Order feed + order detail view
- [ ] Customer list + profile view
- [ ] Analytics summary page
- [ ] Menu audit log view (read-only)

## Gate 10 — Production
- [ ] GitHub Actions CI: lint, typecheck, test, build
- [ ] Docker images built and pushed
- [ ] Hetzner VPS provisioned, Nginx reverse proxy, TLS via Cloudflare
- [ ] Staging environment with a WhatsApp test number
- [ ] Production WhatsApp Business number verified with Meta
- [ ] Monitoring/alerting (basic uptime + error rate)
- [ ] Backup strategy for Postgres

---

**Next step:** Gate 1. Say the word and we'll scaffold the actual repo — monorepo structure, TypeScript config, Docker Compose, and tooling — as real, runnable code.
