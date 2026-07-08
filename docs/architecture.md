# Silverbites — Architecture

## 1. Guiding Principle
Single-tenant backend platform, communicating primarily through WhatsApp, with a thin owner-facing dashboard. Core services are written generically enough that a second vertical/tenant could be bolted on later, but nothing is over-engineered for that case today.

## 2. High-Level Components

```
                          ┌────────────────────┐
                          │   Meta WhatsApp     │
                          │   Cloud API         │
                          └─────────┬───────────┘
                                    │ webhook (in) / send (out)
                                    ▼
                          ┌────────────────────┐
                          │  Express API        │
                          │  /webhooks/whatsapp │◄──── owner dashboard (React) calls
                          │  /api/*              │      REST API for orders/analytics
                          └─────────┬───────────┘
                                    │ enqueue
                                    ▼
                          ┌────────────────────┐
                          │ Redis + BullMQ      │
                          │ (message-processing │
                          │  queue)              │
                          └─────────┬───────────┘
                                    │ worker
                                    ▼
                 ┌──────────────────────────────────────┐
                 │        Conversation Engine             │
                 │  - loads conversation + customer state │
                 │  - builds AI context                   │
                 └───────────────┬────────────────────────┘
                                 ▼
                 ┌──────────────────────────────────────┐
                 │            AI Engine (Claude)           │
                 │  tool-calling: menu, orders, customers  │
                 └───────────────┬────────────────────────┘
                                 ▼
                 ┌──────────────────────────────────────┐
                 │         Business Logic Services         │
                 │  MenuService / OrderService /            │
                 │  CustomerService / PaymentService        │
                 └───────────────┬────────────────────────┘
                                 ▼
                          ┌────────────────────┐
                          │   PostgreSQL         │
                          │   (Prisma ORM)        │
                          └────────────────────┘

External integrations: Whisper (voice transcription), Paystack/Flutterwave (payments),
Cloudflare R2 (menu images, PDF originals, voice-note audio).
```

## 3. Module Breakdown

### Core Platform (vertical-agnostic)
- **Auth** — dashboard login (JWT + refresh), bcrypt password hashing.
- **Conversations** — persists per-customer conversation state and message history.
- **AI Engine** — wraps Claude API calls, owns the tool-calling schema and system prompt.
- **WhatsApp Integration** — webhook receiver, outbound sender, media download, signature verification.
- **Notifications** — outbound WhatsApp status messages triggered by order/payment events.
- **Human Handoff** — flags conversations the AI can't resolve for a staff member.

### Restaurant Module (concrete, not generic)
- **Menu** — items, categories, PDF-import staging.
- **Orders** — line items, status lifecycle.
- **Customers** — profile + order history (scoped to this one restaurant, no tenant_id needed).
- **Payments** — Paystack/Flutterwave abstraction behind a single `PaymentProvider` interface.

## 4. Why a Queue?
Meta's webhook expects a fast acknowledgment. AI calls, Whisper transcription, and PDF parsing can take seconds — long enough to risk Meta retrying the webhook and creating duplicate processing. The Express handler does the minimum (verify signature, persist raw message, enqueue job) and returns 200 immediately; a BullMQ worker does the actual AI/business-logic work and sends the reply asynchronously.

## 5. AI Tool-Calling Boundary
The AI never touches the database directly. It calls named tools (`create_order`, `add_menu_item`, etc.) that are implemented as thin wrappers over the Business Logic Services. This keeps a hard boundary between "what the LLM decided to do" and "what actually happened," and makes every mutation auditable and testable independent of the AI.

## 6. Deployment
- Docker Compose locally; same images built via GitHub Actions and deployed to a Hetzner VPS behind Nginx.
- Cloudflare in front for DNS/TLS/CDN; Cloudflare R2 for object storage (images, PDFs, audio).
- Environments: `local`, `staging`, `production` — separate `.env` per environment, separate WhatsApp test number for staging.

## 7. Why Single-Tenant Simplifies This
No `tenant_id`/`restaurant_id` scoping needed on every query. No routing logic to determine which WhatsApp number → which restaurant. No cross-tenant permission checks. This removes an entire class of bugs and lets Gates 3–8 move faster. If Silverbites is ever resold to other restaurants, the Restaurant Module is the part that would need a tenant boundary added — the Core Platform is already structured to make that addition additive, not a rewrite.
