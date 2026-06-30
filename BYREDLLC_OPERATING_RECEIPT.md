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

## AI Provider Router Receipt

Latest verified: 2026-06-29 20:00 PT

- SaaS team task-organization test was run before GitHub/Vercel save.
- Source tasks: 10 visible task cards read from signed-in `http://127.0.0.1:3000/os/my-dashboard`.
- First Groq attempt returned HTTP 200 but no usable suggestions because the model spent the token budget on reasoning.
- Recovery: reran Groq with strict JSON response format using `openai/gpt-oss-120b`.
- Verification: second Groq run returned 10 suggestions for 10 tasks, every task appeared exactly once, and all bucket keys were valid across `critical_now`, `money_moves`, `quick_wins`, `coming_up`, and `deep_work`.
- Token receipt: second Groq run used 2,069 total tokens.
- Boundary: this was a read-only organization test; Codex did not mutate task records or generate a team pulse.

Latest verified: 2026-06-29 19:53 PT

- `SAAS TEAM MODE` used for `/os/my-dashboard` light-mode professional layout pass.
- Groq fast triage lane returned HTTP 200 using `openai/gpt-oss-120b` with 899 total tokens; output was treated as advisory only.
- Codex changed the actual dashboard UI in `app/(app)/os/my-dashboard/page.tsx` and `components/byred/os/my-dashboard-task-actions.tsx`.
- User-visible result: My Dashboard now uses a light page shell, white cards, soft gold borders, charcoal text, lighter task action buttons, and clearer operating hierarchy: greeting + PE logo, `Operating Order`, dashboard signals, KP-owned pressure, project sectors, command summary, execution queues, and team routing.
- Verification: `pnpm exec tsc --noEmit --pretty false` passed; `node learning-loop/scripts/audit-learning-loop.mjs` returned `ok: true` with 6 files checked and 0 failures.
- Browser proof: authenticated in-app browser at `http://127.0.0.1:3000/os/my-dashboard` rendered background `rgb(247, 243, 234)`, H1 `Salam Alaikum, Keymon.`, loaded `Penn Enterprises compass logo` with nonzero dimensions, showed `Receipt-gated work only`, and showed `Operating Order`.
- Desktop viewport proof: 1440x1000 had no horizontal overflow and rendered first-screen sequence with logo, greeting, operating cards, dashboard signals, and KP-owned pressure.
- Mobile viewport proof: 390x844 had no horizontal overflow, logo loaded at 82x82, H1 stayed readable, and operating cards collapsed to a single-column stack.
- Interaction proof: visible dashboard task click opened `/os/tasks/6e107a09-ed3b-4162-aacc-a7d5b41c1111`; after load, the route rendered task title, blocked/critical status, blocker text, and definition-of-done content.
- Cache lesson reused: initial browser QA showed stale dark bundle; local dev processes were stopped, `.next` was removed, and a single clean dev server was restarted before final verification.
- Boundary: local signed-in dev verification only; production has not been deployed in this receipt.

Latest verified: 2026-06-29 19:34 PT

- Hard-coded activation term added: `SAAS TEAM MODE`.
- Universal SaaS team activation spec added at `/Users/kp/Agents/operations/SAAS_TEAM_ACTIVATION.md`.
- Universal learning-loop hard gate added at `/Users/kp/Agents/operations/LEARNING_LOOP_HARD_GATE.md`.
- Project adapter registry added at `/Users/kp/Agents/operations/LEARNING_LOOP_ADAPTERS.json`.
- Read-only adapter audit added at `/Users/kp/Agents/operations/scripts/audit-learning-loop-adapters.mjs`.
- ByRedLLC learning-loop README now points to the hard gate and activation term.
- Verification: universal adapter audit returned `ok: true` across 4 adapters; ByRedLLC learning-loop audit returned `ok: true` with 6 files checked and 0 failures; `pnpm check:ai-env` reported Groq, Gemini, DeepSeek, and GLM / Z.AI configured; PE file-orchestration audit passed 28/28 registered paths.
- Boundary: this hard-codes Codex startup behavior and audit routing. It does not make external provider calls automatic without task context, and it does not store or expose provider secrets.

Latest verified: 2026-06-29 19:30 PT

- ByRedLLC now has a repo-local learning-loop adapter at `learning-loop/`.
- The adapter maps verified work into categories: `web_app_feature`, `dashboard_ux`, `provider_team`, `deployment_env`, `ios_agent`, and `universal_candidate`.
- New stores: `learning-loop/MOTIONS_LIBRARY.md`, `learning-loop/LEARNING_LEDGER.md`, and `learning-loop/RECIPES.md`.
- Machine routing map: `learning-loop/LOOP_ROUTING_MAP.json`.
- Audit gate: `node learning-loop/scripts/audit-learning-loop.mjs`.
- Universal registry updated: `/Users/kp/Agents/LEARNING_SYSTEM_REGISTRY.md`.
- System map updated: `/Users/kp/Agents/operations/SYSTEM_MAP.md`.
- Verification: learning-loop audit returned `ok: true` with 6 files checked and 0 failures; provider registry tests passed with 26 tests.
- Boundary: this is structurally wired and seeded. A Codex-native automatic Stop-hook/session-end enforcement is not yet installed.

Latest verified: 2026-06-29 19:23 PT

- Gemini Vercel environment variables were installed for project `redlantern-studios/byredllc-daily-os`.
- Vercel project id: `prj_POpB7luJ51rdITgii3zW2GpTvvJx`.
- `GEMINI_API_KEY` is encrypted across Production, Preview, and Development.
- `GEMINI_MODEL=gemini-3.5-flash` is set across Production, Preview, and Development.
- Verification: Vercel CLI `env ls` and Vercel API read-back both showed `GEMINI_API_KEY` and `GEMINI_MODEL` present in Production, Preview, and Development. Secret value was not printed or stored in receipts.
- Boundary: deployments must be redeployed/restarted to consume newly added Vercel env values.

Latest verified: 2026-06-29 19:18 PT

- Gemini API key was installed locally in ignored `.env.local` as `GEMINI_API_KEY`; the key value was not printed or stored in receipts.
- Gemini model default is `GEMINI_MODEL=gemini-3.5-flash`.
- Stale `gemini-2.5-flash` defaults were removed from the checked ByRedLLC repo/router surfaces.
- Updated surfaces: `lib/ai/provider-registry.ts`, `.env.example`, `__tests__/lib/ai-provider-registry.test.ts`, `BYREDLLC_AI_PROVIDER_STACK.md`, and `/Users/kp/Agents/operations/AI_PROVIDER_ROUTER.md`.
- Verification: `pnpm test -- --run __tests__/lib/ai-provider-registry.test.ts` passed with 26 tests; `pnpm check:ai-env` reported Gemini configured; live Gemini API health returned HTTP 200 on `gemini-3.5-flash` and produced `Gemini health ok`; local dev server was restarted so the app process reloads `.env.local`.
- Boundary: Vercel/production Gemini env has not been set in this receipt.

Latest verified: 2026-06-29 19:09 PT

- Provider-team activation check was run for the ByRedLLC dashboard workflow.
- `scripts/check-ai-provider-env.mjs` now loads `.env.local` and `.env` before reporting configured/missing provider status, without printing secret values.
- Verified local provider status after the fix: Groq configured, DeepSeek configured, GLM / Z.AI configured, Gemini missing.
- Gemini check details: `GEMINI_API_KEY` and `GEMINI_MODEL` exist only as placeholders in `.env.example`; no Gemini/Google Generative AI key was found in `.env.local` or the local process environment.
- Provider-team pass result: Groq returned HTTP 200 for a dashboard review; DeepSeek fetch failed at the network layer; GLM / Z.AI returned HTTP 429; Gemini was not called because no key is configured.
- Artifact: `/tmp/byred-dashboard-provider-team-review.json`.
- Boundary: no provider output was promoted to reusable truth; Codex still must execute, verify, and record receipts.

Latest verified: 2026-06-29 19:03 PT

- `/os/my-dashboard` now uses KP's actual Penn Enterprises compass logo in the first-screen header.
- Logo asset added at `/public/brand/pe-compass-logo.png` from the supplied image.
- Dashboard theme shifted to black, gold, and white across the My Dashboard-specific panels, borders, icons, labels, and header treatment.
- Verification: `pnpm exec tsc --noEmit --pretty false` passed; local dev cache was cleared and server restarted; authenticated browser check confirmed logo alt `Penn Enterprises compass logo`, loaded image dimensions on desktop and mobile, white heading text, gold operating label, black panel background, and gold panel border; no framework overlay or new relevant console errors were observed.
- Screenshots: `/tmp/byred-dashboard-pe-logo-gold-desktop.png` and `/tmp/byred-dashboard-pe-logo-gold-mobile.png`.
- Boundary: local dev server verification only; production has not been deployed in this receipt.

Latest verified: 2026-06-29 18:57 PT

- `/os/my-dashboard` now incorporates the ByRedLLC logo in the first-screen header beside the Salam workflow greeting.
- Logo source: `/public/by-red-logo.png`, matching the existing OS sidebar brand asset.
- Verification: `pnpm exec tsc --noEmit --pretty false` passed; authenticated browser check confirmed image alt `By Red, LLC. logo` on desktop and mobile; the optimized image loaded with nonzero natural dimensions; no framework overlay or new relevant console errors were observed.
- Screenshots: `/tmp/byred-dashboard-logo-desktop.png` and `/tmp/byred-dashboard-logo-mobile.png`.
- Boundary: local dev server verification only; production has not been deployed in this receipt.

Latest verified: 2026-06-29 18:55 PT

- `/os/my-dashboard` greeting changed to `Salam Alaikum, Keymon.`
- Supporting line changed to `This is your workflow and the things you need to handle.`
- My Dashboard color lane changed from red-heavy command styling to an emerald, gold, sky, and deep-charcoal workflow palette. Urgent/blocker states still keep warm warning colors.
- Verification: `pnpm exec tsc --noEmit --pretty false` passed; local dev cache was cleared and server restarted; authenticated browser check confirmed the new greeting and color lane on desktop and mobile; old `Welcome Keymon` copy was absent; no framework overlay or new relevant console errors were observed.
- Screenshots: `/tmp/byred-dashboard-salam-colors-desktop.png` and `/tmp/byred-dashboard-salam-colors-mobile.png`.
- Boundary: local dev server verification only; production has not been deployed in this receipt.

Latest verified: 2026-06-29 18:33 PT

- `/os/my-dashboard` first-screen header now greets KP with `Welcome Keymon`.
- Supporting line now says `Here's what I have for you today.`
- Verification: `pnpm exec tsc --noEmit --pretty false` passed; authenticated browser check confirmed the welcome heading, supporting line, and existing `Operating Order` sequence render on `http://127.0.0.1:3000/os/my-dashboard`; screenshot saved at `/tmp/byred-dashboard-welcome-keymon.png`.
- Boundary: local dev server verification only; production has not been deployed in this receipt.

Latest verified: 2026-06-29 18:22 PT

- `/os/my-dashboard` now starts with an `Operating Order` sequence: `Now`, `Next`, `Delegate`, and `Verify`.
- Groq was used as the fast triage lane and returned HTTP 200 with an implementation-ready handoff.
- Codex implemented the dashboard change and remained the executor/verifier.
- Local preview env was repaired by merging missing Vercel development env names into ignored `.env.local`; secret values were not printed or stored in receipts.
- Authenticated visual QA after KP signed in: `/os/my-dashboard` rendered the `Operating Order` first-screen sequence on desktop and mobile, and clicking the `Now` task opened `/os/tasks/d40b4dd4-1de8-44d9-a3fa-3abb7fa8d4f8`.
- Task detail verification: the clicked task rendered title, status controls, comments, details, and dependency area after loading.
- Verification: `pnpm exec tsc --noEmit --pretty false` passed; provider tests passed with 26 tests; `pnpm build` passed; browser screenshots saved at `/tmp/byred-dashboard-operating-order-desktop.png`, `/tmp/byred-dashboard-operating-order-mobile.png`, and `/tmp/byred-dashboard-task-detail-desktop.png`.

Latest verified: 2026-06-29 18:10 PT

- SaaS team orchestration added to canonical router and ByRedLLC adapter.
- Provider communication now uses structured `os_ai_provider_runs.metadata` handoff packets instead of untracked model chatter.
- Provider-run API now exposes executive metrics: `verified_codex_tokens_saved`, `verified_codex_minutes_saved`, and `team_handoffs`.
- `/os/ai` board now shows verified savings and handoff count.
- Verification: `pnpm exec tsc --noEmit --pretty false` passed; `pnpm test -- --run __tests__/lib/ai-provider-registry.test.ts` passed with 26 tests.
- Boundary: no live multi-provider handoff task was triggered in this receipt.

Latest verified: 2026-06-29 18:05 PT

- Canonical provider router: `/Users/kp/Agents/operations/AI_PROVIDER_ROUTER.md`
- Project adapter: `/Users/kp/Documents/Keymon & Rory/ByRedLLC/ByRedLLC-Daily-OS/BYREDLLC_AI_PROVIDER_STACK.md`
- Groq local secret installed in `.env.local` as `GROQ_API_KEY`; value was not printed or stored in receipts.
- Groq model default installed as `GROQ_MODEL=openai/gpt-oss-120b`.
- Vercel project `redlantern-studios/byredllc-daily-os` has `GROQ_API_KEY` encrypted and `GROQ_MODEL=openai/gpt-oss-120b` across Production, Preview, and Development.
- Verification: Groq models API returned HTTP 200; `pnpm check:ai-env` reported `Groq: configured`; secret install did not touch tracked code; this receipt file is the intentional tracked repo change.

Latest GitHub verification:

- Main branch typecheck passed after PR merge.
- Vercel preview deployments passed before merge.

## Standard Flow

1. Work from `/Users/kp/Documents/Keymon & Rory/ByRedLLC/ByRedLLC-Daily-OS`.
2. Verify against `https://byredlanternos.com`, not localhost, unless local preview is explicitly requested.
3. Use feature branches and PRs for app changes.
4. For Supabase schema changes, apply only the intended migration SQL and verify with read-back queries.
5. Log durable receipts in this file or the agent receipt ledger when the work changes the operating system.
