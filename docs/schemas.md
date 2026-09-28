# 📂 Data Schemas

## Product
```json
{
  "id": "string (uuid)",
  "productName": "string",
  "sku": "string",
  "category": "string",
  "currentPrice": "number (float)",
  "stockLevel": "number (int)",
  "strategy": "enum('rule‑based','ai‑gemini','hybrid')",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## PricingSuggestion
```json
{
  "id": "string (uuid)",
  "productId": "uuid",
  "recommendedPrice": "number",
  "confidence": "number (0‑1)",
  "direction": "enum('up','down','neutral')",
  "status": "enum('PENDING','ACCEPTED','REJECTED')",
  "triggerReason": "string",
  "createdAt": "timestamp",
  "completedAt": "timestamp?"
}
```

## ReorderSuggestion
```json
{
  "id": "string (uuid)",
  "productId": "uuid",
  "recommendedQty": "number",
  "confidence": "number (0‑1)",
  "status": "enum('PENDING','ACCEPTED','REJECTED')",
  "triggerReason": "string",
  "createdAt": "timestamp",
  "completedAt": "timestamp?"
}
```

## Stats (derived)
```json
{
  "totalProducts": "number",
  "totalStock": "number",
  "aiCalls": "number"
}
```

*All entities are stored in Firestore; see `firebase-firestore` skill for indexing and security rules.*

*File: `docs/schemas.md`*
