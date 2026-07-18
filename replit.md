# POS360

A full-featured Loyverse-inspired POS SaaS platform for iTech Network Africa. Covers POS sales, Inventory, CRM/Loyalty, Employees, Restaurant, Reports, and Multi-Store management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/pos360 run dev` — run the frontend (port 18338, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite, Tailwind CSS, shadcn/ui, Recharts, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit by hand)
- `lib/db/src/schema/` — Drizzle table definitions (stores, categories, products, customers, employees, sales, inventory, restaurant)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/pos360/src/pages/` — Frontend pages (dashboard, pos, inventory/, customers/, employees/, restaurant/, reports, stores, settings)

## Architecture decisions

- Contract-first: OpenAPI spec defined first; hooks and Zod schemas generated from it. Never edit generated files.
- Numeric DB fields stored as `numeric` type (returns strings from Drizzle) — all route handlers parse with `parseFloat()` before responding.
- Products use `storeId: null` to be globally available across all stores; store-scoped products can set a specific storeId.
- Sales flow deducts stock automatically when a sale is created. Receiving a purchase order increments stock.
- Loyalty points = floor(sale total) per transaction; accumulated on customer record.

## Product

- **Dashboard** — KPI cards (revenue, sales, customers, AOV), sales-by-hour bar chart, low stock alerts, top products
- **POS Screen** — product grid with category filters, search, cart, multi-payment (Cash/Card/Mobile Money), checkout
- **Inventory** — Products CRUD, Categories, Suppliers, Purchase Orders with receive workflow
- **Customers** — CRM list, customer groups with discount tiers, loyalty points, purchase history
- **Employees** — roster, roles (owner/manager/cashier/kitchen), clock-in/out time tracking
- **Restaurant** — floor plan with color-coded table status, kitchen display with ticket cards
- **Reports** — Sales, Products, Employees, Inventory tabs with charts and metrics
- **Stores** — multi-store management (3 demo stores seeded)

## User preferences

- Branding: POS360, light green (#5AC85A), black, white — for iTech Network Africa
- Currency: NGN (Nigerian Naira) — seeded stores use NGN

## Gotchas

- Numeric fields from Drizzle come back as strings — always `parseFloat()` in routes before responding.
- POS product list should NOT filter by storeId (products are global with `storeId: null`).
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change.
- Run `pnpm --filter @workspace/db run push` after any schema change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
