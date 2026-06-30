# ByRedLLC Learning Ledger

Append verified lessons here. Do not store secrets. Promote only receipt-backed, repeatable lessons.

## Web App Lessons

| Date | Trigger | Root Cause | Verified Fix | Prevention Rule | Receipt |
| --- | --- | --- | --- | --- | --- |
| 2026-06-29 | Dashboard source changed but browser still showed old heading/theme | Next dev cache/HMR served stale compiled output | Stop dev server, remove `.next`, restart dev server, then rerun browser proof | When source and authenticated DOM disagree after reload, verify cache state before debugging app code | `BYREDLLC_OPERATING_RECEIPT.md` dashboard entries |
| 2026-06-29 | Task detail page appeared blank after clicking dashboard task | Snapshot was taken before client data finished loading | Wait for task title and task API responses before calling page broken | Browser QA for task routes must wait for specific task content, not only route navigation | `BYREDLLC_OPERATING_RECEIPT.md` 18:22 PT |

## Dashboard UX Lessons

| Date | Trigger | Root Cause | Verified Fix | Prevention Rule | Receipt |
| --- | --- | --- | --- | --- | --- |
| 2026-06-29 | Dashboard branding changed from ByRedLLC logo to KP's PE compass logo | The existing sidebar asset was not KP's actual requested logo | Add supplied compass logo to `/public/brand/pe-compass-logo.png`; verify image alt and dimensions in browser | For branding changes, verify the actual supplied asset, not only an existing project logo | `BYREDLLC_OPERATING_RECEIPT.md` 19:03 PT |
| 2026-06-29 | Dashboard theme needed to match black/gold/white brand | Prior dashboard palette used emerald/red command styling | Sweep dashboard-specific panels, borders, labels, icons, and header treatment to black/gold/white | Palette changes need DOM/screenshot proof on desktop and mobile | `BYREDLLC_OPERATING_RECEIPT.md` 19:03 PT |
| 2026-06-29 | KP asked for My Dashboard to move from dark theme to light mode and feel more professionally organized | Dashboard-specific UI had accumulated dark panel tokens and stacked sections that made the page feel heavier than a daily operating cockpit | Added a light page shell, white/gold cards, charcoal text, lighter action buttons, and verified desktop/mobile rendering plus task route navigation | For dashboard restyles, sweep child controls too and verify rendered page after clearing stale `.next` cache if source and browser disagree | `BYREDLLC_OPERATING_RECEIPT.md` 19:53 PT |
| 2026-06-29 | KP wanted project cards to show the clear tasks due for that month | Project Sector cards were static summaries with only one current-signal task link | Add an inline client drilldown fed by server-built project summaries from `byred_tasks`: Needs Attention, Due In Month, and Unscheduled Backlog | For dashboard project organization, keep matching and task bucketing server-side, pass compact serializable summaries to the client, and separate overdue/blockers before normal monthly work | `BYREDLLC_OPERATING_RECEIPT.md` 20:32 PT |

## Provider-Team Lessons

| Date | Trigger | Root Cause | Verified Fix | Prevention Rule | Receipt |
| --- | --- | --- | --- | --- | --- |
| 2026-06-29 | `pnpm check:ai-env` reported providers missing while `.env.local` had keys | Script checked only `process.env` and did not load `.env.local` | Add a secret-safe `.env.local`/`.env` loader to `scripts/check-ai-provider-env.mjs` | Provider health checks must load project env files without printing values | `BYREDLLC_OPERATING_RECEIPT.md` 19:09 PT |
| 2026-06-29 | Gemini lane was missing and carried old model default | `GEMINI_API_KEY` was absent and repo/router still referenced `gemini-2.5-flash` | Install Gemini key locally and in Vercel; set `GEMINI_MODEL=gemini-3.5-flash`; update registry/docs/tests | Before provider work, verify current official model defaults and env read-back | `BYREDLLC_OPERATING_RECEIPT.md` 19:18 PT and 19:23 PT |
| 2026-06-29 | Provider-team pass had mixed results | Groq succeeded; DeepSeek network fetch failed; GLM hit HTTP 429; Gemini was unavailable before key install | Capture partial successes/failures instead of letting one provider failure kill the team run | Multi-provider runners should collect per-provider status and route around weak lanes | `BYREDLLC_OPERATING_RECEIPT.md` 19:09 PT |
| 2026-06-29 | `SAAS TEAM MODE` was activated for a dashboard restyle | The work needed fast layout triage before Codex edited source | Groq returned a fast dashboard layout plan using `openai/gpt-oss-120b` with 899 total tokens; Codex used it as advisory input, then implemented and verified | Provider output remains advisory until Codex verifies the UI and writes receipts | `BYREDLLC_OPERATING_RECEIPT.md` 19:53 PT |
| 2026-06-29 | KP asked to test the team against organizing tasks before push/deploy | First Groq run returned HTTP 200 but no usable suggestions because reasoning consumed the token budget | Reran Groq with strict JSON response format; 10 visible dashboard tasks produced 10 bucket suggestions, every task exactly once, and all bucket keys valid | For task organization runs, require JSON response format and validate count/id coverage before trusting provider output | `BYREDLLC_OPERATING_RECEIPT.md` 20:00 PT |

## Deployment Env Lessons

| Date | Trigger | Root Cause | Verified Fix | Prevention Rule | Receipt |
| --- | --- | --- | --- | --- | --- |
| 2026-06-29 | Vercel CLI rejected Preview env insertion without branch prompt | CLI required non-interactive Preview branch handling and `--value`, which would expose secret in args | Use Vercel API body payload for secret-safe env writes; read back metadata after write | For secrets, prefer API body over CLI args when CLI would expose the value | `BYREDLLC_OPERATING_RECEIPT.md` 19:23 PT |

## Universal Candidates

| Date | Candidate | Why It May Be Universal | Current Status | Receipt |
| --- | --- | --- | --- | --- |
| 2026-06-29 | Every project needs a local learning-loop adapter that maps motions, lessons, recipes, receipts, and promotion lanes | Same pattern can route ByRedLLC web, iOS, provider, and PE project work without duplicate brains | candidate; requires KP approval before core promotion | this adapter |
