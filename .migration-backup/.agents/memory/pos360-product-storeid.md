---
name: POS360 product storeId
description: Products are seeded globally (storeId=null); POS screen must not filter by storeId.
---

All seeded products have `storeId = null`, meaning they are available globally across all stores. The POS screen's `useListProducts()` call must NOT pass a `storeId` parameter, or the query will return an empty list (the DB filter `WHERE store_id = 1` won't match null rows).

**Why:** Products are designed as a global catalog. Store-level scoping is optional and only meaningful when merchants explicitly assign products to a store.

**How to apply:** In `artifacts/pos360/src/pages/pos.tsx`, call `useListProducts({ categoryId, search })` without `storeId`. Only pass `storeId` if the merchant's store explicitly owns products.
