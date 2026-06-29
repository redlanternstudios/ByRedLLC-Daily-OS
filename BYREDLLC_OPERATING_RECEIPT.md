# ByRedLLC OS Operating Receipt

Last verified: 2026-06-29 14:11 PT

## Source Of Truth

- Production site: `https://byredlanternos.com`
- GitHub repo: `https://github.com/redlanternstudios/ByRedLLC-Daily-OS`
- Local working copy: `/Users/kp/Documents/Keymon & Rory/ByRedLLC/ByRedLLC-Daily-OS`
- Do not use localhost as the operational source unless KP explicitly asks for a local development preview.
- Do not use `Bay Red`, `BayRed`, or `bay red`. Correct project term: `ByRedLLC`.

## Production Projects

- Primary Supabase project ref: `endovljmaudnxdzdapmf`
- Supabase project name in dashboard: `RedLantern Studios`
- Supabase project URL: `https://endovljmaudnxdzdapmf.supabase.co`
- Production Vercel project: `redlantern-studios/byredllc-daily-os`
- Production domain: `byredlanternos.com`

## Latest Verified Build

- GitHub PR: `https://github.com/redlanternstudios/ByRedLLC-Daily-OS/pull/12`
- Main commit after merge: `256cbdccc7fc0841cdadcfa5f64276c3de81bf21`
- Live route verified: `https://byredlanternos.com/os/my-dashboard`
- Live API verified: `https://byredlanternos.com/api/os/agent-receipts?agent_family=web_app`

## My Dashboard

Route: `/os/my-dashboard`

Purpose: KP personal PM command view inside the operating OS.

Sections:

- My Scorecard
- Do First
- Project Lanes
- Decision Queue
- Agent Learning
- Team Watchlist
- Unassigned Intake

## Agent Learning Ledger

Production table: `os_agent_receipts`

Purpose: verified receipt ledger for web-app feature agents.

Rules:

- Web-app feature agents use `agent_family = 'web_app'` receipts.
- Universal mindset/proof patterns use `framework_scope = 'mindset_universal'`.
- iOS execution receipts stay in the iOS lane.
- Web-app agents must not learn execution frameworks from iOS receipts.
- Verified receipts only. Do not store unverified observations as reusable truth.

Production verification:

- Table exists: `os_agent_receipts`
- RLS enabled: `true`
- Column count: `14`
- Required scope columns present: `agent_family`, `framework_scope`, `verification_status`
- Policies present:
  - `Users can view verified receipts in their tenants`
  - `Block direct client receipt inserts`
  - `Block direct client receipt updates`
  - `Block direct client receipt deletes`

## Verification Commands

Run from the repo root:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec vitest run
pnpm exec next build
```

Latest local verification before merge:

- TypeScript: passed
- Vitest: 20/20 tests passed
- Next production build: passed

Latest GitHub verification:

- Main branch typecheck passed after PR merge.
- Vercel preview deployments passed before merge.

## Standard Flow

1. Work from `/Users/kp/Documents/Keymon & Rory/ByRedLLC/ByRedLLC-Daily-OS`.
2. Verify against `https://byredlanternos.com`, not localhost, unless local preview is explicitly requested.
3. Use feature branches and PRs for app changes.
4. For Supabase schema changes, apply only the intended migration SQL and verify with read-back queries.
5. Log durable receipts in this file or the agent receipt ledger when the work changes the operating system.
