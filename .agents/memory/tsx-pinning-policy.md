---
name: tsx pinning policy
description: How to unblock tsx when the Replit package firewall blocks a transitive tsx version pulled by drizzle-kit
---

**Rule:** When `ERR_PNPM_FETCH_403` appears for tsx during install, pin tsx via `overrides` in `pnpm-workspace.yaml` to a known-good exact version AND add tsx to `minimumReleaseAgeExclude`. Both are required — the catalog pin prevents resolution; the exclude prevents the firewall from blocking even the pinned version.

**Why:** drizzle-kit pulls tsx as a transitive dependency with a loose range. The Replit package firewall blocks packages released within the last 24 hours. The override alone is insufficient if the pinned version also trips the release-age check; `minimumReleaseAgeExclude` is needed alongside it.

**How to apply:**
1. Add `overrides: tsx: "<known-good version>"` in `pnpm-workspace.yaml`
2. Add `minimumReleaseAgeExclude: [tsx]` in the same file
