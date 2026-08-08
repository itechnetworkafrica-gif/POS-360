---
name: tsx invocation in pnpm workspace
description: How to run tsx scripts in this monorepo — direct pnpm exec fails; use absolute store paths
---

## Rule
Never rely on `pnpm exec tsx` or `pnpm run <script-using-tsx>` from the workspace root or from a package dir — tsx is pinned via workspace overrides and is not linked as a local bin in most packages.

## Working invocation pattern
Run scripts that need packages from a specific workspace package (e.g. api-server) using Node directly with absolute pnpm store paths:

```sh
node --input-type=module << 'EOF'
import bcrypt from "/home/runner/workspace/node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs/index.js";
import pg from "/home/runner/workspace/node_modules/.pnpm/pg@8.22.0/node_modules/pg/esm/index.mjs";
// ...
EOF
```

Key store paths (verified 2026-08-08):
- tsx binary: `node_modules/.pnpm/node_modules/.bin/tsx` (or `lib/db/node_modules/.bin/tsx`)
- bcryptjs ESM: `node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs/index.js`
- pg ESM: `node_modules/.pnpm/pg@8.22.0/node_modules/pg/esm/index.mjs`

**Why:** pnpm does not hoist packages to a flat node_modules — each package's deps live in the virtual store. `tsx` resolves imports from the *script file's* location, not the cwd, so running from the api-server dir still can't find `pg` unless pg is in a node_modules ancestor of the script.

**How to apply:** Any time you need to run a one-off TypeScript/JS script that uses workspace-specific deps (pg, bcrypt, drizzle, etc.), use the inline node heredoc pattern above rather than tsx.
