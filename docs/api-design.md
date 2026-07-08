# Silverbites — API Design

Base URL: `/api` (dashboard-facing, JWT-protected) and `/webhooks` (WhatsApp/payment providers, signature-verified, not JWT).

## Webhooks

### `GET /webhooks/whatsapp`
Meta's verification handshake (hub.challenge echo).

### `POST /webhooks/whatsapp`
Receives inbound WhatsApp events. Verifies `X-Hub-Signature-256`, persists the raw message, enqueues a processing job, returns `200` immediately.

### `POST /webhooks/paystack`
Verifies Paystack signature, updates `Order.paymentStatus`, triggers customer/owner notification.

### `POST /webhooks/flutterwave`
Same as above, Flutterwave signature scheme.

## Auth (dashboard)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | email + password → access + refresh token |
| POST | `/api/auth/refresh` | refresh token → new access token |
| POST | `/api/auth/logout` | invalidate refresh token |

## Orders (dashboard)

| Method | Path | Description |
|---|---|---|
| GET | `/api/orders` | paginated, filter by `status`, `from`, `to` |
| GET | `/api/orders/:id` | order detail incl. items + status history |
| PATCH | `/api/orders/:id/status` | manual status update (staff override) |

## Customers (dashboard)

| Method | Path | Description |
|---|---|---|
| GET | `/api/customers` | paginated list, search by phone/name |
| GET | `/api/customers/:id` | profile + order history + lifetime value |

## Menu (dashboard — read-only for MVP; mutations happen via chat)

| Method | Path | Description |
|---|---|---|
| GET | `/api/menu` | full menu grouped by category |
| GET | `/api/menu/audit-log` | recent menu mutations (who/what/when) |

## Analytics (dashboard)

| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/summary` | orders/day, revenue/day, repeat-customer rate |
| GET | `/api/analytics/top-items` | best-selling menu items |

## Internal AI Tool Contracts
These are not HTTP endpoints — they're the tool-calling functions exposed to the Claude AI engine, implemented directly against the Business Logic Services (no network hop). Documented here because they're as much "API surface" as the REST endpoints above.

```
get_menu() -> MenuItem[]
add_menu_item(name, category, priceKobo, description?) -> MenuItem
update_menu_item(itemId, changes) -> MenuItem
remove_menu_item(itemId) -> void
parse_menu_pdf(fileUrl) -> MenuImportDraft   // staged, not committed
confirm_menu_import(draftId) -> MenuItem[]   // owner confirms staged import

create_order(customerId, items[], deliveryAddress, paymentMethod) -> Order
update_order_status(orderId, status) -> Order
get_customer_history(phoneNumber) -> { name, pastOrders, orderCount }
initiate_payment(orderId, provider) -> { paymentUrl }
```

Every tool call is logged (input, output, latency, invoking conversation id) per FR-10.4.
