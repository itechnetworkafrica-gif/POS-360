# Gotecx POS

A multi-tenant point-of-sale system with employee management, inventory, sales, restaurant/kitchen ticketing, and reporting. Branded as Gotecx POS and deployed on Replit.

## Run & Operate

- **Start everything**: click Run in Replit — starts both the API server and the POS360 web app.
- `pnpm --filter @workspace/api-server run dev` — run the API server (port from `$PORT`, defaults to 8080)
- `pnpm --filter @workspace/pos360 run dev` — run the POS360 frontend (port from `$PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run migrate` — run pending DB migrations (idempotent, journal-tracked, never drops columns)
- `pnpm --filter @workspace/scripts run db-setup` — migrate + backfill orphaned tenant rows (use after importing a new DB)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET` — JWT signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifact: `artifacts/api-server`)
- Frontend: Vite + React 19 + Tailwind v4 (artifact: `artifacts/pos360`)
- DB: PostgreSQL + Drizzle ORM (lib: `lib/db`)
- Auth: JWT in httpOnly cookie (`gotecx_session`, 7-day TTL); per-request DB validation of isActive/role
- Build: esbuild (API bundle); Vite (frontend)

## Where things live

- `artifacts/api-server/src/routes/` — Express route handlers (auth, products, sales, employees, storage, …)
- `artifacts/api-server/src/lib/auth.ts` — requireAuth, requireRole, signReservationToken
- `artifacts/pos360/src/` — Vite+React frontend; API client generated from OpenAPI spec
- `lib/db/src/schema/` — Drizzle schema (source of truth for DB shape)
- `lib/db/drizzle/` — versioned migration files (0000_baseline, 0001_add_store_id…)

## Architecture decisions

- **Tenant isolation**: every authenticated request is gated by a non-null `storeId` (403 if missing). All DB queries use `req.user!.storeId!` — no fallback to null.
- **Role auth**: `requireRole("manager")` on all catalog mutations; owners always pass. Employees cannot escalate to "owner"; only owners can assign "manager".
- **JWT + per-request DB check**: JWT holds id/storeId/role but `requireAuth` also DB-validates `isActive` and refreshes `role` on every request, so deactivation and demotion take effect immediately.
- **Object storage**: Replit-only (GCS sidecar). Non-Replit runtimes (e.g. Vercel) get 503 on all storage routes after auth. Upload ownership uses a signed reservationToken (SESSION_SECRET) to bind object paths to uploaders across instances.
- **Versioned migrations**: `drizzle-kit migrate` only — no `push --force`. The baseline uses `CREATE TABLE IF NOT EXISTS`; column additions use `ADD COLUMN IF NOT EXISTS`.

## User preferences

_Populate as you build._

## Gotchas

- `vite.config.ts` proxies `/api` → `http://localhost:8080` in dev so the frontend hot-reload server calls the API server.
- Employee PIN is bcrypt-hashed and never returned in API responses.
- `tsx` is pinned to `4.21.0` via `pnpm-workspace.yaml` overrides because newer versions can be blocked by the Replit package firewall.
- `SESSION_SECRET` must be set before the API server starts — it fails closed with a thrown error if missing.
