# POS360

> Complete point-of-sale platform for Nigerian and African retailers — sales, inventory, staff, accounting, and multi-store management in one screen.

Built by **iTech Network Africa** · Branding: light green `#5AC85A`, black, white.

---

## Features

- **POS Screen** — product grid, cart, multi-payment (Cash / Card / Mobile Money), receipt printing
- **Inventory** — products, categories, suppliers, purchase orders, stock transfers
- **Customers** — CRM, loyalty points, customer groups with discount tiers
- **Employees** — roles (owner / manager / cashier / kitchen), clock-in / clock-out time tracking
- **Restaurant** — floor plan with colour-coded table status, kitchen display with ticket cards
- **Reports** — sales, products, employees, inventory, tax reports with charts
- **Accounting** — income, expenses, cash-flow tracking
- **Multi-store** — manage multiple branches from one account
- **Billing** — Starter / Professional / Enterprise plans

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui, Recharts, TanStack Query, Wouter |
| Backend | Node.js 24, Express 5, Pino |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Package manager | pnpm workspaces |

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — install globally: `npm install -g pnpm`
- **PostgreSQL** ≥ 14 (local) — or a managed service (Neon, Supabase, etc.)

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/your-org/pos360.git
cd pos360
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in at minimum:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pos360
SESSION_SECRET=any-long-random-string
```

### 4. Push the database schema

```bash
pnpm db:push
```

### 5. Start both servers

In two separate terminals:

```bash
# Terminal 1 — API server (port 8080)
pnpm dev:api

# Terminal 2 — Frontend dev server (port 3000)
pnpm dev
```

Open **http://localhost:3000** in your browser.

> The frontend talks to the API via `/api/*` paths. Make sure the API server is running on port 8080.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the frontend dev server on port 3000 |
| `pnpm dev:api` | Start the API server on port 8080 |
| `pnpm build` | Production build of the frontend |
| `pnpm start` | Start the compiled API server |
| `pnpm db:push` | Push schema changes to the database |
| `pnpm codegen` | Regenerate API hooks from the OpenAPI spec |
| `pnpm typecheck` | Full TypeScript check across all packages |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | fallback string | JWT signing secret — use a strong value in production |
| `PORT` | | `8080` | API server port |
| `NODE_ENV` | | `development` | Set to `production` for deployed environments |
| `CORS_ORIGIN` | | (all) | Comma-separated allowed origins in production |
| `LOG_LEVEL` | | `info` | Pino log level |

See `.env.example` for the full list including object-storage variables.

---

## Production Build

```bash
# Build the frontend
pnpm build

# The compiled frontend is at artifacts/pos360/dist/public/
```

```bash
# Build the API server
pnpm --filter @workspace/api-server run build

# The compiled API is at artifacts/api-server/dist/index.mjs
# Start it with:
NODE_ENV=production PORT=8080 DATABASE_URL=... SESSION_SECRET=... node artifacts/api-server/dist/index.mjs
```

---

## GitHub Preparation

```bash
# Ensure .gitignore is respected
git rm -r --cached .
git add .
git commit -m "chore: clean tracked files"

# Push to GitHub
git remote add origin https://github.com/your-org/pos360.git
git push -u origin main
```

---

## Vercel Deployment

### One-click deploy

1. Push the repo to GitHub.
2. Import the repo in the [Vercel dashboard](https://vercel.com/new).
3. Vercel auto-detects the `vercel.json` — no manual framework selection needed.
4. Add the following **Environment Variables** in the Vercel project settings:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your production PostgreSQL URL |
| `SESSION_SECRET` | A long random secret |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | Your Vercel domain, e.g. `https://pos360.vercel.app` |

5. Click **Deploy**.

### How it works on Vercel

- **Frontend** is built to `public/` and served as static files.
- **API** runs as a Vercel Serverless Function (`api/index.ts`).
- All `/api/*` requests are routed to the function; everything else is served from the static bundle.
- The SPA fallback rewrite (`/(.*) → /index.html`) ensures client-side routing works.

### Database migrations on Vercel

Schema changes are applied in development with `pnpm db:push`. On Vercel, run the push manually from your local machine pointing at the production `DATABASE_URL` before deploying:

```bash
DATABASE_URL=<production-url> pnpm db:push
```

---

## Project Structure

```
pos360/
├── api/
│   └── index.ts              # Vercel serverless entry point
├── artifacts/
│   ├── api-server/           # Express API server
│   │   └── src/
│   │       ├── routes/       # One file per domain (auth, products, sales…)
│   │       └── lib/
│   └── pos360/               # React + Vite frontend
│       └── src/
│           ├── pages/        # Route-level page components
│           ├── components/   # Shared UI components
│           └── context/      # Auth, currency providers
├── lib/
│   ├── api-spec/             # OpenAPI spec (source of truth)
│   ├── api-client-react/     # Generated React Query hooks
│   ├── api-zod/              # Generated Zod validation schemas
│   └── db/                   # Drizzle schema + migration config
├── vercel.json               # Vercel deployment config
└── .env.example              # Environment variable reference
```

---

## API Overview

All endpoints are prefixed with `/api`. Key routes:

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current session |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/products` | List products |
| GET | `/api/dashboard/summary` | KPI summary |
| GET | `/api/sales` | Sales list |
| GET | `/api/reports/sales` | Sales report |
| GET | `/api/stores` | Stores list |

Full spec: `lib/api-spec/openapi.yaml`

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `DATABASE_URL must be set` | Add `DATABASE_URL` to `.env.local` |
| 401 on every request | Set `SESSION_SECRET` — must be the same across restarts |
| Build fails on Vercel | Check that all env vars are set in Vercel project settings |
| CORS errors in production | Set `CORS_ORIGIN` to your frontend domain |
| Schema mismatch | Run `pnpm db:push` against the target database |

---

## Currency

Default currency is **NGN (Nigerian Naira)**. Owners can change it in **Settings → General** — the change propagates immediately to all open tabs.

## Licence

MIT © iTech Network Africa
