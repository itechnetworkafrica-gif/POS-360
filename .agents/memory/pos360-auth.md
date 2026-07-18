---
name: POS360 Auth System
description: How real authentication works — JWT cookies, two user types, role-based nav filtering
---

# POS360 Auth System

## How it works
- **JWT** signed with `SESSION_SECRET`, stored as HTTP-only cookie named `pos360_session`
- Routes: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- Auth file: `artifacts/api-server/src/routes/auth.ts`
- Middleware: `cookieParser(SESSION_SECRET)` in `artifacts/api-server/src/app.ts`

## Two user types
- **Owners**: stored in `usersTable` (password hashed with bcrypt, 12 rounds)
- **Employees**: stored in `employeesTable` (login with email + plain-text PIN)
- Login endpoint tries `usersTable` first, then `employeesTable`

## JWT payload shape
```typescript
{ id, name, email, role, plan, storeId, userType: "owner"|"employee", businessName }
```

## Frontend auth
- `AuthProvider` in `artifacts/pos360/src/context/auth.tsx`
- Calls `GET /api/auth/me` on mount (1.4s delay for loading screen effect)
- All fetch calls use `credentials: "include"` to send cookie
- No localStorage — pure cookie-based sessions

## Role-based nav
- Defined in `App.tsx` via `roleCanSee()` helper and `roles?: Role[]` on nav items
- `owner`: everything; `manager`: most; `cashier`: POS+sales+items; `kitchen`: restaurant/kitchen only
- `visibleNav = NAV.filter(...)` computed per user in `SidebarNav`
- Role-based entry redirect: cashier → /pos, kitchen → /restaurant/kitchen

**Why:** Needed production-ready auth to replace localStorage fake accounts. JWT+cookie avoids session store complexity while being secure and persistent across deploys.
