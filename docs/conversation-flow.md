# Silverbites — Conversation Flow

## 1. Sender Classification (first thing that happens on every inbound message)

```
Inbound WhatsApp message
        │
        ▼
Is phone number in OwnerNumber table?
   ├── Yes → Owner/Staff flow (menu management, order overrides)
   └── No  → Customer flow (ordering)
```

## 2. New Customer — First Contact

```
Customer: "Hi"
AI: Welcome to Silverbites! 🍲 I'm here to help you order.
    Would you like to see our menu, or already know what you want?
```
- No prior `Customer` record → created on first inbound message (phone number as key).
- No order history to reference.

## 3. Returning Customer — First Contact

```
Customer: "Hi"
AI: [calls get_customer_history]
AI: Hi Steve 👋 welcome back! Last time you had 2x Jollof Rice + a Coke.
    Same again, or something different today?
```

## 4. Standard Ordering Flow

```
1. Greeting / intent detection (see 2 & 3 above)
2. Menu browsing
   Customer: "What drinks do you have?"
   AI: [calls get_menu, filters category=Drinks] → lists items + prices
3. Item selection (natural language, may be multi-turn)
   Customer: "2 jollof rice and one coke"
   AI: confirms items + running total
4. Delivery details
   AI: "What's the delivery address?"
5. Payment method
   AI: "Pay on delivery (cash/transfer) or pay online now?"
   → if online: [calls initiate_payment] → sends Paystack/Flutterwave link
6. Order confirmation
   AI: [calls create_order] → "Order confirmed! 🎉 Order #1234, total ₦4,500.
       We'll notify you as it's prepared."
7. Status updates (automatic, triggered by staff/owner status changes)
   System → Customer: "Your order is being prepared 👨‍🍳"
   System → Customer: "Your order is out for delivery 🛵"
   System → Customer: "Delivered! Enjoy your meal 🍽️ — thank you for ordering from Silverbites."
```

## 5. Voice Note Handling

```
Customer sends 🎤 voice note
        │
        ▼
Download media (Meta Media API)
        │
        ▼
Whisper transcription (English/Pidgin)
        │
        ▼
Transcript fed into Conversation Engine exactly like a text message
```

## 6. Pidgin Handling
No separate flow — language is detected per-message by the AI itself; the system prompt instructs it to respond in the language/register the customer used (English or Pidgin), and to mirror code-switching naturally rather than forcing English.

## 7. Owner — Conversational Menu Management

```
Owner: "Add Coke to Drinks for 800"
AI: [calls add_menu_item] → "Done ✅ Added Coke (₦800) to Drinks."

Owner: "Jollof rice is now 2500"
AI: [calls update_menu_item] → "Updated Jollof Rice to ₦2,500."

Owner: "Remove fried rice"
AI: "Just to confirm — remove Fried Rice from the menu entirely? (yes/no)"
Owner: "yes"
AI: [calls remove_menu_item] → "Removed Fried Rice from the menu."
```
- Destructive actions (remove, and any price/availability change materially affecting active orders) require an explicit confirmation step (FR-3.4).
- All mutations logged to `MenuAuditLog`.

## 8. PDF Menu Import

```
Owner uploads Menu.pdf
        │
        ▼
File stored in R2, [calls parse_menu_pdf]
        │
        ▼
AI extracts structured items → creates MenuImportDraft (not yet live)
        │
        ▼
AI: "I found 18 items across 4 categories in your PDF. Here's a summary:
     Starters (3), Mains (9), Drinks (4), Desserts (2).
     Reply 'confirm' to add these to your live menu, or tell me what to fix."
        │
        ▼
Owner: "confirm"
        │
        ▼
[calls confirm_menu_import] → items committed to live MenuItem table
```

## 9. Human Handoff

```
AI fails to resolve intent after 2 clarification attempts,
OR customer expresses a complaint/refund request,
OR customer explicitly asks for a human
        │
        ▼
Conversation.isHandedOff = true
        │
        ▼
Owner/staff notified (WhatsApp message or dashboard alert)
AI pauses automated replies on this conversation until staff responds
        │
        ▼
Staff can send messages directly (not via AI) until they manually resume automation, or it auto-resumes after N hours of inactivity
```
