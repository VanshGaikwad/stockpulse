# 📡 API Reference

All backend routes are defined under **`backend/src/`** (Node/Express).  Base URL: `http://localhost:<PORT>` (default 8081).

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `GET` | `/products` | List products (optional `status`, `category` query) | – | `[{ id, name, price, stock, … }]` |
| `GET` | `/products/:id` | Get a single product | – | `{ id, name, price, … }` |
| `PATCH` | `/products/:id/stock` | Update stock level | `{ "stockLevel": number }` | Updated product |
| `POST` | `/products/:id/orders` | Simulate an order (decrements stock) | `{ "quantity": number }` | Updated product |
| `POST` | `/products/:id/suggest-pricing` | Trigger Gemini pricing suggestion | `{ "triggerReason": "MANUAL" | "LOW_STOCK" | … }` | `{ "suggestionId": string, "status": "PENDING" }` |
| `GET` | `/products/:id/suggest-pricing/stream` | **SSE** – live AI reasoning stream (used by UI) | `?trigger=MANUAL` | Server‑Sent Events: `start`, `token`, `complete` |
| `POST` | `/products/:id/suggest-reorder` | Trigger Gemini reorder suggestion | `{ "triggerReason": "MANUAL" }` | `{ "suggestionId": string, "status": "PENDING" }` |
| `GET` | `/pricing-suggestions` | List pricing suggestions (filter by `status`) | – | `[ { id, productId, recommendedPrice, confidence, … } ]` |
| `PATCH` | `/pricing-suggestions/:id` | Accept/Reject a suggestion | `{ "action": "ACCEPT" | "REJECT" }` | Updated suggestion |
| `GET` | `/reorder-suggestions` | List reorder suggestions | – | `[ { id, productId, recommendedQty, confidence, … } ]` |
| `PATCH` | `/reorder-suggestions/:id` | Accept/Reject reorder suggestion | `{ "action": "ACCEPT" | "REJECT" }` | Updated suggestion |
| `GET` | `/stats` | Dashboard metrics (total products, total stock, AI calls) | – | `{ "totalProducts": number, "totalStock": number, "aiCalls": number }` |
| `GET` | `/config/strategy` | Current pricing strategy (`rule‑based`, `ai‑gemini`, `hybrid`) | – | `{ "strategy": string }` |
| `POST` | `/config/strategy` | Switch strategy at runtime | `{ "strategy": "rule‑based" | "ai‑gemini" | "hybrid" }` | Updated config |
| `POST` | `/seed` | Re‑seed DB with demo data (dev only) | – | `{ "seeded": true }` |

**Headers** – All JSON endpoints require `Content-Type: application/json`.

**Auth** – Currently open for development; production should protect routes with Firebase Auth (see the `firebase-auth-basics` skill).

*File: `docs/api.md`*
