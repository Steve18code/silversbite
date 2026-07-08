# Silverbites — Database Design

Single-tenant: no `restaurant_id`/`tenant_id` columns anywhere. Everything below belongs to the one Silverbites restaurant.

## Prisma Schema (draft)

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  STAFF
}

enum SenderType {
  CUSTOMER
  OWNER
  STAFF
  AI
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
}

enum PaymentMethod {
  CASH_ON_DELIVERY
  TRANSFER_ON_DELIVERY
  ONLINE
}

enum PaymentStatus {
  UNPAID
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum PaymentProviderName {
  PAYSTACK
  FLUTTERWAVE
}

// Dashboard login — separate from WhatsApp "owner" identity
model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(STAFF)
  refreshToken String?
  createdAt    DateTime @default(now())
}

// Allow-listed WhatsApp numbers permitted to run owner tools (add/edit menu, etc.)
model OwnerNumber {
  id          String   @id @default(cuid())
  phoneNumber String   @unique
  label       String?  // e.g. "Chidi - owner", "Kemi - staff"
  createdAt   DateTime @default(now())
}

model Customer {
  id          String   @id @default(cuid())
  phoneNumber String   @unique
  name        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  conversations Conversation[]
  orders        Order[]
}

model Conversation {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  state       Json     @default("{}") // in-progress order draft, last topic, etc.
  isHandedOff Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  messages Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  senderType     SenderType
  content        String       @db.Text
  mediaUrl       String?      // voice note / image / pdf, if any (stored in R2)
  transcript     String?      @db.Text // for voice notes
  createdAt      DateTime     @default(now())
}

model Category {
  id    String @id @default(cuid())
  name  String @unique
  order Int    @default(0)

  items MenuItem[]
}

model MenuItem {
  id           String   @id @default(cuid())
  name         String
  description  String?
  priceKobo    Int      // stored in kobo to avoid float rounding issues
  isAvailable  Boolean  @default(true)
  imageUrl     String?
  categoryId   String
  category     Category @relation(fields: [categoryId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  orderItems OrderItem[]
}

model Order {
  id             String        @id @default(cuid())
  customerId     String
  customer       Customer      @relation(fields: [customerId], references: [id])
  status         OrderStatus   @default(PENDING)
  paymentMethod  PaymentMethod
  paymentStatus  PaymentStatus @default(UNPAID)
  paymentRef     String?       // gateway transaction reference
  deliveryAddress String
  deliveryNotes  String?
  totalKobo      Int
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  items OrderItem[]
  statusHistory OrderStatusEvent[]
}

model OrderItem {
  id           String   @id @default(cuid())
  orderId      String
  order        Order    @relation(fields: [orderId], references: [id])
  menuItemId   String
  menuItem     MenuItem @relation(fields: [menuItemId], references: [id])
  quantity     Int
  unitPriceKobo Int     // price snapshot at time of order
}

model OrderStatusEvent {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id])
  status    OrderStatus
  note      String?
  createdAt DateTime    @default(now())
}

// Audit trail for AI/owner menu mutations
model MenuAuditLog {
  id          String   @id @default(cuid())
  actorPhone  String   // who triggered it (owner number, or "AI")
  action      String   // e.g. "ADD_ITEM", "UPDATE_PRICE", "REMOVE_ITEM"
  detail      Json
  createdAt   DateTime @default(now())
}

// Staged extraction from an uploaded Menu.pdf, pending owner confirmation
model MenuImportDraft {
  id          String   @id @default(cuid())
  sourceUrl   String   // original PDF/image in R2
  extracted   Json     // AI-proposed structured items
  confirmed   Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

## Key Design Decisions
- **Money stored in kobo (integer)** — never floats — to avoid rounding bugs in prices/totals.
- **Price snapshot on `OrderItem`** — menu price changes after an order is placed must not retroactively change historical order totals.
- **`OwnerNumber` is separate from `User`** — WhatsApp owner identity (phone-based) and dashboard login (email/password) are two different auth surfaces (see FR-8).
- **`Conversation.state` as JSON** — flexible scratch space for in-progress order drafts without needing a rigid schema for every possible conversational state.
- **`MenuImportDraft`** — PDF-extracted menus are staged, not written directly, so the owner can confirm/correct before it hits the live menu.
- **No `tenant_id` anywhere** — intentional, per the single-tenant decision.
