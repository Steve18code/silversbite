# Silverbites — Product Requirements Document (PRD)

## 1. Product Summary
Silverbites is a WhatsApp-native ordering platform for **a single restaurant**. Customers order food, get AI-assisted recommendations, and pay — all inside one WhatsApp conversation. The restaurant owner manages the entire menu conversationally through the same AI, with no separate admin panel required for catalog changes.

This is **not** a multi-tenant SaaS at this stage. There is exactly one restaurant, one WhatsApp Business number, and one customer database, fully owned by that restaurant. The core platform is still engineered so a second vertical or tenant *could* be added later without a rewrite — but we are not building that now (YAGNI).

## 2. Problem Statement
Small-to-mid Nigerian restaurants lose orders to slow manual WhatsApp replies, forgotten repeat customers, and menu updates that require a developer or a clunky app. Silverbites turns the restaurant's WhatsApp number into an always-on ordering assistant that remembers customers and lets the owner manage the menu by simply typing/talking to it.

## 3. Goals
- Customers can browse menu, order, and pay entirely inside WhatsApp.
- The AI remembers returning customers and their order history, and proactively suggests repeat orders.
- The owner manages menu items (add/update/remove/upload PDF) via natural-language chat — no dashboard dependency for catalog work.
- Support English and Nigerian Pidgin, both text and voice notes.
- Owner gets a lightweight dashboard for orders, revenue, and customer insight (read-mostly, not menu management).

## 4. Non-Goals (explicitly out of scope for MVP)
- Multi-restaurant / multi-tenant support.
- Subscription billing for restaurant owners (single-tenant — not applicable).
- Non-WhatsApp channels (SMS, Instagram, calls) — future consideration only.
- Table reservations, dine-in table management (future module).

## 5. Target Users
| User | Description |
|---|---|
| Customer | Orders food via WhatsApp, may be new or returning |
| Owner/Staff | Manages menu via chat, views dashboard, fulfills orders |

## 6. Core Features (MVP)

### 6.1 Conversational Ordering
- Customer messages the restaurant's WhatsApp number.
- AI greets, presents menu/categories, takes order, confirms, and collects delivery details.
- Supports English + Pidgin, text and voice notes (transcribed via Whisper).

### 6.2 Customer Memory
- Every customer is identified by phone number.
- AI recalls name, past orders, and can proactively suggest "the usual."
- Full order history persisted and queryable from the dashboard.

### 6.3 Conversational Menu Management (Owner)
- Owner (verified by phone number / role) sends natural-language commands: "Add Coke to Drinks", "Jollof Rice is now ₦2,500", "Remove fried rice".
- AI performs the corresponding database mutation via tool-calling and confirms back in chat.

### 6.4 PDF Menu Import
- Owner uploads a `Menu.pdf` (or image) via WhatsApp.
- AI extracts structured items (name, category, price, description) and stages them for confirmation before writing to the DB.

### 6.5 Payments
- Customer chooses cash/transfer-on-delivery **or** online payment (Paystack, with Flutterwave as fallback) inside the same chat flow.
- Order status updates as payment is confirmed.

### 6.6 Order Lifecycle
- States: `pending → confirmed → preparing → out_for_delivery → delivered / cancelled`.
- Owner can update status via chat or dashboard; customer gets automatic WhatsApp status updates.

### 6.7 Owner Dashboard (read-oriented)
- Live order feed, order details, status updates.
- Revenue and basic analytics (orders/day, top items, repeat-customer rate).
- Customer list with order history.
- No menu-editing UI required for MVP (menu is chat-managed) — may be added later as a convenience, not a dependency.

## 7. Success Metrics
- % of orders completed without human intervention.
- Average time from first message to order confirmation.
- Returning-customer recognition accuracy.
- Payment completion rate (online vs. cash/transfer).

## 8. Constraints & Assumptions
- Single WhatsApp Business number (Meta Cloud API), single restaurant, single owner/staff team.
- Nigerian Naira (₦) as the only currency for MVP.
- Owner identity verified by an allow-listed phone number (or numbers) for menu-management commands.

## 9. Brand
- Name: **Silverbites**
- Style: warm, local, Nigerian food-brand feel — not corporate/minimal.
