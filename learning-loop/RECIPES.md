# ByRedLLC Recipes

Reusable solution patterns. Recipes need proof and a clear lane.

## Dashboard UX Recipes

### RECIPE: First-Screen Executive Dashboard Header
- Problem: KP needs the dashboard to greet him, show the brand, and orient the day's workflow immediately.
- Minimal pattern:
  1. Use one brand/logo frame with stable dimensions.
  2. Put the greeting as the only H1.
  3. Put the current workflow sentence directly below the H1.
  4. Keep `Operating Order` immediately underneath with `Now`, `Next`, `Delegate`, `Verify`.
  5. Verify desktop and mobile first viewport.
- Proof bundle: screenshots and DOM checks referenced in `BYREDLLC_OPERATING_RECEIPT.md`.
- Reuse when: creating/refining personal dashboard surfaces for KP.

### RECIPE: Black / Gold / White PE Theme Adapter
- Problem: dashboard must match the Penn Enterprises compass logo without losing operational density.
- Minimal pattern:
  1. Background: near-black `#050505` / `#0A0A0A`.
  2. Borders and primary accents: gold `#C9A227`, `#D4AF37`, `#F5C451`.
  3. Text: white for headings, light gray for support.
  4. Keep warning states warm gold/amber inside this dashboard; let shared status badges keep their own semantics.
  5. Use screenshot proof, not color intent, before calling it verified.
- Proof bundle: `/tmp/byred-dashboard-pe-logo-gold-desktop.png`, `/tmp/byred-dashboard-pe-logo-gold-mobile.png`, and `BYREDLLC_OPERATING_RECEIPT.md`.
- Reuse when: applying PE branding to ByRedLLC OS surfaces.

### RECIPE: Light Executive Workflow Dashboard
- Problem: KP's personal dashboard needs to feel professional, calm, and operational instead of heavy/dark.
- Minimal pattern:
  1. Put a light page-level shell over the dark OS app frame for this dashboard only.
  2. Use white cards, soft gold borders, charcoal text, and restrained gold accents.
  3. Keep the first screen ordered as: greeting + PE logo, `Operating Order`, dashboard signals, KP-owned pressure.
  4. Keep work lanes separated by purpose: Command Summary, Execution Queues, Project Sectors, Team Routing.
  5. Verify desktop and mobile for no horizontal overflow, logo load, and task-link navigation.
- Proof bundle: `BYREDLLC_OPERATING_RECEIPT.md` 19:53 PT.
- Reuse when: KP asks for a lighter, more professional dashboard or operating cockpit.

### RECIPE: Clickable Monthly Project Drilldown
- Problem: project cards need to show the clear task list for the current month without sending KP away from My Dashboard.
- Minimal pattern:
  1. Keep project matching and task bucketing server-side against `byred_tasks`.
  2. Pass compact serializable project summaries into one client component.
  3. Make project cards selectable buttons, not separate command centers.
  4. Split selected-project work into `Needs Attention`, `Due In [Month]`, and `Unscheduled Backlog`.
  5. Put overdue, blocked, or blocker-flagged tasks in the attention lane before normal monthly work.
  6. Keep every task row linked to its task detail page for full execution context.
  7. Pull the UI through Codex's in-app browser for visual/click proof whenever the bridge is available.
- Proof bundle: `BYREDLLC_OPERATING_RECEIPT.md` 20:32 PT.
- Reuse when: KP asks to click a project, business lane, or product sector and see month-specific work.

## Provider-Team Recipes

### RECIPE: Provider Team Before Codex Execution
- Problem: Codex should avoid spending high-reasoning loops on every first-pass idea.
- Minimal pattern:
  1. Load `/Users/kp/Agents/operations/AI_PROVIDER_ROUTER.md`.
  2. Check `pnpm check:ai-env`.
  3. Route fast triage to Groq.
  4. Route screenshot/large-context UX to Gemini.
  5. Route implementation strategy to GLM / Z.AI.
  6. Route code/test critique to DeepSeek.
  7. Codex executes only accepted actions, verifies, and writes receipts.
  8. Record provider runs or failures with handoff metadata.
- Proof bundle: provider status receipts in `BYREDLLC_OPERATING_RECEIPT.md`.
- Reuse when: dashboard, provider routing, or feature planning work could be pre-processed by cheaper lanes.
