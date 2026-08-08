---
name: POS360 numeric fields
description: Drizzle numeric columns return JS strings; route handlers must parseFloat() before responding.
---

Drizzle ORM's `numeric()` column type always returns values as strings in query results, not JS numbers. Every route handler that returns numeric data (price, cost, stockQuantity, total, etc.) must explicitly call `parseFloat()` before including the value in the JSON response.

**Why:** The OpenAPI spec and frontend expect numbers, not strings. Without the conversion, arithmetic and display formatting break silently.

**How to apply:** In each route file, create a `toXxxJson(row)` helper that converts all numeric string fields. See `artifacts/api-server/src/routes/products.ts` (toProductJson) and `sales.ts` (toSaleJson) for the pattern.
