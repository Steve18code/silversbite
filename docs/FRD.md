# Silverbites — Functional Requirements Document (FRD)

Each requirement maps to a Gate in the roadmap so we can trace "why are we building this" back to a product decision.

## FR-1 — WhatsApp Messaging (Gate 5)
- FR-1.1: System receives inbound messages via Meta WhatsApp Cloud API webhook (text, voice note, image/PDF).
- FR-1.2: System sends outbound text, template, and interactive (button/list) messages.
- FR-1.3: System acknowledges Meta's webhook within its timeout window; heavy processing (AI calls, transcription, PDF parsing) happens asynchronously via a job queue.
- FR-1.4: Voice notes are downloaded from Meta's media API and transcribed (Whisper) before being handed to the AI engine.

## FR-2 — Conversation Engine (Gate 6)
- FR-2.1: Every inbound message is attached to a `Conversation`, keyed by customer phone number.
- FR-2.2: Conversation state (current order-in-progress, last topic) persists across messages so the AI has continuity.
- FR-2.3: System distinguishes **owner/staff senders** (allow-listed numbers) from **customer senders** and routes to different tool-permission sets.
- FR-2.4: Human handoff: if the AI cannot resolve a request (e.g. complaint, ambiguous request after 2 clarification attempts), conversation is flagged for a human/staff to take over.

## FR-3 — AI Engine (Gate 7)
- FR-3.1: AI engine is an LLM (Claude) invoked with the customer/owner's message, conversation history, and a tool-calling schema.
- FR-3.2: Tools exposed to the AI include: `get_menu`, `add_menu_item`, `update_menu_item`, `remove_menu_item`, `create_order`, `update_order_status`, `get_customer_history`, `parse_menu_pdf`.
- FR-3.3: AI responses support English and Nigerian Pidgin; language is auto-detected from the incoming message, not configured per-customer.
- FR-3.4: AI must confirm destructive actions (menu removal, order cancellation) before executing.
- FR-3.5: PDF/image menu uploads are sent to the AI as document input; the AI proposes a structured item list, which is shown back to the owner for a yes/no confirmation before committing to the DB.

## FR-4 — Customer Memory (Gate 3 / 7)
- FR-4.1: Customers are uniquely identified by phone number (E.164 format).
- FR-4.2: System stores full order history per customer.
- FR-4.3: On a new conversation from a known customer, the AI is given a summary (name, last order, order count) as context so it can personalize the greeting.

## FR-5 — Menu Management (Gate 8)
- FR-5.1: Menu items have: name, category, price (₦), description, availability flag, optional image.
- FR-5.2: Only allow-listed owner/staff numbers may trigger menu-mutation tools.
- FR-5.3: All menu mutations are logged (who changed what, when) for audit/debugging.

## FR-6 — Orders (Gate 8)
- FR-6.1: An order has: customer, line items (menu item + quantity + price snapshot), delivery address/notes, payment method, payment status, order status, timestamps.
- FR-6.2: Order status transitions: `pending → confirmed → preparing → out_for_delivery → delivered`, or `cancelled` from any pre-delivery state.
- FR-6.3: Customer receives an automatic WhatsApp message on each status transition.

## FR-7 — Payments (Gate 8)
- FR-7.1: Customer is offered a choice: cash/transfer on delivery, or online payment.
- FR-7.2: Online payment generates a Paystack (primary) or Flutterwave (fallback) payment link/checkout sent as a WhatsApp message.
- FR-7.3: Payment webhook from the gateway updates the order's `payment_status` and notifies the customer and owner.

## FR-8 — Authentication (Gate 4)
- FR-8.1: Dashboard (owner-facing) requires login (JWT access token + refresh token, bcrypt-hashed password).
- FR-8.2: WhatsApp-side "owner" identity is established purely by allow-listed phone number, not a dashboard login — these are two separate auth surfaces.

## FR-9 — Dashboard (Gate 9)
- FR-9.1: Live/paginated order feed with filter by status/date.
- FR-9.2: Order detail view: items, customer, payment, status history.
- FR-9.3: Customer list with order history and lifetime value.
- FR-9.4: Basic analytics: orders/day, revenue/day, top-selling items, repeat-customer rate.

## FR-10 — Non-Functional Requirements
- FR-10.1: Webhook response time to Meta must stay under their timeout (processing deferred to queue).
- FR-10.2: All secrets (Meta tokens, Paystack keys, DB credentials) via environment variables, never committed.
- FR-10.3: All inbound webhook payloads verified via Meta's signature header.
- FR-10.4: Structured logging for every AI tool call (input, output, latency) for debugging and audit.
