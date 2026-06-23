# byred_os — Keymon Handoff Brief

**Project:** By Red, LLC. — OS Daily  
**Environment:** v0.app (Vercel sandbox) — Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui  
**Author of this brief:** v0 (AI), summarizing full session for handoff  
**Date:** April 20, 2026  

---

## 1. WHAT THIS IS

An internal operations OS (operating system) for **Ro Semeah**, owner of **By Red, LLC.** — a multi-entity holding company. It is a private, single-user command center that surfaces every task, lead, and activity across all four tenants (companies) in one place. Think: a hyper-focused CRM + task manager built specifically for one person running multiple businesses.

The phrase "execution, not ambition" is the guiding design principle. Every screen is dense, information-first, minimal friction.

---

## 2. THE FOUR TENANTS (COMPANIES)

Ro owns four entities, each gets its own color dot in the sidebar and throughout the UI:

| ID  | Name                       | Type    | Color Dot |
|-----|----------------------------|---------|-----------|
| t1  | By Red LLC                 | parent  | red       |
| t2  | Paradise Property Services | service | blue      |
| t3  | HireWire                   | product | violet    |
| t4  | Authentic Hadith            | product | amber     |

These are defined in `lib/seed.ts` as `SEED_TENANTS` and their color mapping is in `lib/tenant-colors.ts`.

---

## 3. THE STACK — EXACTLY

```
Framework:   Next.js 16.2.0 (App Router, no pages dir)
Language:    TypeScript 5.7.3
Styling:     Tailwind CSS v4 (no tailwind.config.js — config lives in globals.css @theme inline)
Components:  shadcn/ui (Radix primitives) — all in components/ui/
Icons:       lucide-react
Fonts:       Barlow Condensed (headings, labels, IDs), DM Sans (body), JetBrains Mono (mono)
Toasts:      sonner (via <Toaster> in root layout)
Dates:       date-fns v4
Markdown:    react-markdown
Runtime:     React 19.2.4
Package mgr: pnpm
Hosting:     Vercel
```

**NO DATABASE yet.** All data is static seed data in `lib/seed.ts`. This is intentional — the UI is fully built, wired to seed data, and ready to be connected to a real backend.

**NO AUTH yet.** The login page at `/login` is a working UI with local state, but it does NOT verify credentials against anything. Submitting any email + "password" routes you to `/`.

---

## 4. FULL FILE MAP

```
app/
  layout.tsx                    ← Root layout. Loads 3 fonts, Toaster, Analytics.
  globals.css                   ← ALL design tokens here (Tailwind v4 @theme inline). Light off-white theme.
  login/page.tsx                ← Login screen (UI only, no real auth)
  (app)/
    layout.tsx                  ← App shell layout: renders <Sidebar> + <Topbar> + <main>
    page.tsx                    ← / — Command Center (all tasks, 4 metric cards, full table)
    today/page.tsx              ← /today — Daily Brief card + 5 task buckets grid
    tasks/page.tsx              ← /tasks — Full task list with filter bar (search, tenant, status, ai mode, priority, toggles)
    tasks/[id]/page.tsx         ← /tasks/[id] — Task detail: inline title edit, description, AI Actions card, Settings sidebar
    leads/page.tsx              ← /leads — Kanban board (6 stages), pipeline metrics
    leads/[id]/page.tsx         ← /leads/[id] — Lead detail: contact card, stage tracker, activity log, follow-up card
    leads/new/page.tsx          ← /leads/new — New lead form
    activities/page.tsx         ← /activities — Grouped chronological activity log
    tenants/page.tsx            ← /tenants — 4 tenant cards with live stats (active tasks, overdue, leads)
    settings/page.tsx           ← /settings — Profile, AI defaults, Integrations status, Danger zone

components/
  byred/
    sidebar.tsx                 ← Fixed 240px left nav. Logo, WORK/TENANTS/SYSTEM groups, user block.
    topbar.tsx                  ← Fixed top bar. Breadcrumb, Daily Brief popover, notification bell, avatar.
    task-table.tsx              ← Reusable sortable task table used on / and /tasks
    metric-card.tsx             ← Reusable stat card (icon + count + label)
    status-badge.tsx            ← Status chip (not_started, in_progress, overdue, done, blocked, cancelled)
    priority-flag.tsx           ← Priority chip (Critical, High, Medium, Low)
    due-date-cell.tsx           ← Due date display, turns red if overdue
    ai-mode-chip.tsx            ← AI mode chip (HUMAN_ONLY, AI_ASSIST, AI_DRAFT, AI_EXECUTE)
    tenant-pill.tsx             ← Colored dot + tenant name pill
    blocker-banner.tsx          ← Red warning strip shown when task.blocker_flag = true
    activity-item.tsx           ← Single activity row used in lead detail + activities page
    empty-state.tsx             ← Centered empty state with icon
  ui/                           ← shadcn/ui components (DO NOT EDIT — auto-generated)

lib/
  seed.ts                       ← ALL static data: SEED_TENANTS, SEED_USER, SEED_TASKS, SEED_LEADS, SEED_ACTIVITIES, SEED_DAILY_BRIEF
  tenant-colors.ts              ← Maps tenant IDs to Tailwind color strings
  utils.ts                      ← cn() utility (clsx + tailwind-merge)

types/
  db.ts                         ← TypeScript interfaces: Tenant, User, Task, Lead, Activity, DailyBrief, DailyPlan
```

---

## 5. DESIGN SYSTEM

**Theme:** Light off-white. NOT dark mode. All screens use this.

**Key CSS custom properties (in `app/globals.css`):**
```css
--background: #f7f6f4     ← page background (warm off-white)
--card: #ffffff           ← card surfaces
--foreground: #18181b     ← body text
--border: #e4e4e7         ← zinc-200 equivalent
--primary: #d90009        ← By Red brand red (all CTAs, active states, accents)
--sidebar: #ffffff        ← sidebar background

/* Custom brand tokens (use as bg-byred-red, text-byred-red, etc.) */
--color-byred-red: #d90009
--color-byred-red-hot: #ff1a22    ← hover state
--color-byred-red-deep: #a60007   ← active/pressed state
```

**Font classes:**
- `font-condensed` → Barlow Condensed (page titles, nav labels, kanban headers, metric numbers)
- `font-sans` → DM Sans (body, form labels, descriptions) — this is the default
- `font-mono` → JetBrains Mono (IDs, timestamps, estimated minutes, scores)

**Important:** There is NO `tailwind.config.js`. Tailwind v4 reads config from `@theme inline` block inside `app/globals.css`. The `font-condensed` utility is defined as a custom `@layer utilities` rule also in `globals.css` since Tailwind v4 doesn't ship `font-condensed` by default.

---

## 6. DATA MODEL (TypeScript types in `types/db.ts`)

```typescript
Task {
  id, tenant_id, title, description, status, priority, due_date,
  estimated_minutes, ai_mode, blocker_flag, blocker_reason,
  blocked_by_task_id, owner_user_id, revenue_impact_score (0–10),
  urgency_score (0–10), created_at
}

Lead {
  id, tenant_id, name, phone, email, source,
  stage: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'QUOTED' | 'WON' | 'LOST',
  assigned_user_id, last_contacted_at, next_follow_up_at,
  revenue_potential, created_at
}

Activity {
  id, tenant_id, object_type: 'task'|'lead', object_id,
  user_id, type, summary, created_at
}

DailyBrief {
  id, date,
  summary: { headline, top_3: string[], warnings: string[], next_action },
  created_at
}
```

**AI Mode values** (on Task): `HUMAN_ONLY` | `AI_ASSIST` | `AI_DRAFT` | `AI_EXECUTE`

**Task statuses:** `not_started` | `in_progress` | `overdue` | `done` | `blocked` | `cancelled`

**Lead stages (kanban columns):** `NEW` → `CONTACTED` → `QUALIFIED` → `QUOTED` → `WON` / `LOST`

---

## 7. WHAT IS FULLY BUILT (UI-COMPLETE, DATA IS SEED)

| Screen | Route | Status |
|--------|-------|--------|
| Login | `/login` | UI done, no real auth |
| Command Center | `/` | Done. 4 metric cards + full task table |
| Today | `/today` | Done. Brief card + 5 bucket grid |
| Tasks list | `/tasks` | Done. Filter bar: search, tenant, status, AI mode, priority, overdue toggle, blocker toggle |
| Task detail | `/tasks/[id]` | Done. Inline edit, AI Actions card (Suggest/Draft/Execute w/ mock responses), blocker banner, settings sidebar |
| Leads kanban | `/leads` | Done. 6 column kanban + pipeline metrics |
| Lead detail | `/leads/[id]` | Done. Contact card, stage tracker, activity log, follow-up card, quick actions |
| New lead | `/leads/new` | Done. Form with all fields |
| Activities | `/activities` | Done. Grouped by day |
| Tenants | `/tenants` | Done. 4 cards with computed live stats from seed data |
| Settings | `/settings` | Done. Profile, AI mode default, integrations list, danger zone |

---

## 8. WHAT IS NOT BUILT YET — THE REMAINING WORK

### 8a. DATABASE CONNECTION (Priority 1)
All data is static seed. Need to connect to a real database. **Supabase is already connected as an integration in this v0 project.** The recommended path:

1. Run the SQL migration to create the tables (schema matches `types/db.ts` exactly)
2. Seed the tables with `lib/seed.ts` data
3. Replace all `SEED_*` imports in pages with Supabase client calls
4. Add Row Level Security (RLS) policies

Suggested Supabase tables: `tenants`, `users`, `tasks`, `leads`, `activities`, `daily_briefs`

### 8b. REAL AUTHENTICATION
The login form at `/login` needs to be wired to Supabase Auth. Currently it sets a local state flag and redirects. Steps:
1. Install `@supabase/ssr` and `@supabase/supabase-js`
2. Create `lib/supabase/client.ts`, `lib/supabase/server.ts`
3. Add middleware (`middleware.ts`) to protect `/(app)/*` routes — redirect unauthenticated users to `/login`
4. Wire login form to `supabase.auth.signInWithPassword()`
5. Wire sidebar user block to real session user

### 8d. AI ACTIONS (REAL)
The AI Actions card on `/tasks/[id]` simulates Suggest / Draft / Execute with hardcoded mock strings. Needs to be wired to a real AI provider. **Groq is already connected as an integration in this v0 project.** Recommended path:
- Use Groq (available) with `llama-3.3-70b-versatile` or similar
- POST task context (title, description, tenant, urgency) to a Next.js API route `/api/ai/task-action`
- Stream the response back using the AI SDK

### 8e. DAILY BRIEF GENERATION
The daily brief is a static seed object (`SEED_DAILY_BRIEF`). It should be auto-generated each morning. Recommended path:
- Cron job or Vercel scheduled function that runs at 6:00 AM PT
- Queries all overdue + due-today tasks, blocked tasks, and follow-up-due leads
- Sends to AI (Groq) to generate `headline`, `top_3`, `warnings`, `next_action`
- Stores result in `daily_briefs` table

### 8f. TASK/LEAD MUTATIONS
All create/edit/delete actions currently call `toast.success()` and do nothing to real state. Every form submission, status change, stage change, and toggle needs to be wired to Supabase mutations. Use SWR for client-side caching with `mutate()` for optimistic updates.

### 8g. DRAG-AND-DROP KANBAN
The leads kanban on `/leads` has the column structure but no real drag-and-drop. Install `@dnd-kit/core` and `@dnd-kit/sortable` and wire the card drag to update `lead.stage` in Supabase.

### 8h. REAL-TIME / LIVE UPDATES (OPTIONAL BUT RECOMMENDED)
Supabase Realtime subscriptions on the `tasks` and `leads` tables so the Command Center updates live when Ro makes changes on another device.

---

## 9. KNOWN ISSUES / BLOCKERS

1. **The By Red logo image** (`public/brand/by-red-logo.png`) was AI-generated and renders on a dark background. On the light login screen it may look awkward — may need a white/transparent version or a text-only wordmark instead.

2. **`styles/globals.css` is a ghost file.** There are two globals: `app/globals.css` (the one that matters, fully configured) and an old `styles/globals.css` that was in the original scaffold. The `app/layout.tsx` imports `./globals.css` (correct). The `styles/` one is harmless but can be deleted.

3. **No error boundaries.** If a seed lookup returns `undefined` (e.g., navigating to `/tasks/fake-id`), the page will throw a runtime error. Need 404/not-found handling on all `[id]` routes.

4. **The login flow does not enforce authentication.** Any user can navigate directly to `/` without going through `/login`. The middleware (`middleware.ts`) needs to be written to enforce this once Supabase Auth is wired.

5. **`react-markdown` renders without prose plugin.** The task description card uses `prose prose-sm` Tailwind classes but `@tailwindcss/typography` is not installed. Headings/lists in markdown won't be styled. Either install `@tailwindcss/typography` or use a simpler text renderer.

---

## 10. HOW TO RUN LOCALLY

```bash
# Clone from GitHub or download ZIP from the v0 project
pnpm install
pnpm dev
# Open http://localhost:3000
```

No environment variables are required for the current seed-only build. Once Supabase and Groq are wired, you'll need:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

All of these can be added in the v0 project Settings → Vars panel without leaving the browser.

---

## 11. WHAT KEYMON NEEDS TO DO FIRST

**In order:**

1. **Connect Supabase** (already shown as available integration in this v0 project — click Settings → Integrations to confirm env vars are present)
2. **Write and run the SQL migration** — create `tenants`, `users`, `tasks`, `leads`, `activities`, `daily_briefs` tables matching `types/db.ts`
3. **Seed the database** — insert data from `lib/seed.ts` using Supabase SQL editor or a script
4. **Wire Supabase Auth** — update `/login` page, create `middleware.ts` to protect routes, update sidebar user block
5. **Replace seed imports with Supabase queries** — one page at a time, starting with `/` (Command Center)
6. **Wire all mutations** — task status changes, lead stage changes, form submissions
7. **Wire AI Actions** — `/api/ai/task-action` route using Groq (already integrated)
8. **Add drag-and-drop to leads kanban** — `@dnd-kit/core`
9. **Daily Brief generation** — Vercel Cron + Groq

---

## 12. THINGS RO TOLD US (DESIGN INTENT / PREFERENCES)

- Light off-white theme (NOT dark) — the site uses `#f7f6f4` background, white cards, zinc neutrals
- `byred-red (#d90009)` is the only brand accent — used for CTAs, active nav states, blocker indicators, score bars
- "Execution, not ambition" — dense, minimal chrome, no decorative elements
- Tenant identity (the 4 companies) should always be visible on every task/lead row via the colored pill
- AI mode is a first-class concept — every task is tagged with how much AI involvement is allowed
- The Daily Brief is the morning anchor — it shows on topbar popover and is the centerpiece of `/today`
- Revenue impact score + urgency score drive sort order on Command Center (not just due date)

---

*End of handoff. Everything above reflects the actual state of the codebase as of this session.*
