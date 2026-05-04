# By Red OS — Engineering Handoff

**Generated:** 2026-05-03  
**Purpose:** Full audit state, completed fixes, remaining work, and architectural context for the next Claude Code session.

---

## 1. Project Overview

By Red OS is a Next.js 15 (App Router) internal ops tool for By Red LLC. It is a multi-tenant task/CRM system with an AI assistant (LanternAI). The `app/os/*` routes are the primary surface. Tech stack: Next.js 15 App Router, TypeScript, Supabase (Postgres + Auth), Tailwind v4, `ai` SDK v6 with Groq, `sonner` for toasts.

### Key architectural facts

- **Auth:** `supabase.auth.getUser()` → `lib/auth.ts:getCurrentUser()` → `lib/auth.ts:requireAuth()` → `lib/data/tenant-scope.ts:requireTenantScope()`
- **Identity split:** `auth.users.id` ≠ `byred_users.id`. The app's canonical user ID is `byred_users.id` (a separate profile table linked via `auth_user_id`). `requireTenantScope()` returns `profileId = user.profile?.id ?? null` — this is the `byred_users` UUID, not the Supabase auth UUID. All owner fields in tasks reference `byred_users.id`.
- **Tenant scoping:** All data queries must `.in('tenant_id', tenantIds)`. `requireTenantScope()` returns the list of tenants the user belongs to.
- **Client context:** `lib/context/user-context.tsx` — `TenantProvider` / `useUser()` — exposes `profile`, `tenants`, `activeTenantId`, `directory` (pre-fetched `byred_users` roster) to client components.
- **`mapTaskFromDb`:** `types/db.ts` — normalises raw Supabase task rows into the `Task` type used everywhere in the UI. If you add new task fields to the UI, add them here too.

---

## 2. File Map (OS module)

```
app/
  os/
    tasks/
      page.tsx              — Task list, weekly buckets, filter row (server component)
      new/page.tsx          — New task form (client component, uses useUser())
      [id]/page.tsx         — Task detail server shell (fetches task + directory)
  today/page.tsx            — Personal daily brief (server component)
  api/
    os/
      tasks/
        route.ts            — GET (task list) + POST (create task)
        [id]/route.ts       — PATCH (update task) + DELETE (soft-archive)
        [id]/dependencies/  — Task dependency management (untouched)
        reorder/route.ts    — Drag-to-reorder (untouched)
      lantern-ai/route.ts   — LanternAI streaming chat (Groq llama-3.3-70b)

components/
  os/
    TaskDetailClient.tsx    — Task detail UI (client component, optimistic PATCH)

lib/
  auth.ts                   — getCurrentUser(), requireAuth(), signOut()
  data/
    tasks.ts                — getTasks(), getTasksForToday(), getTaskById(), getTaskStats()
    tenant-scope.ts         — requireTenantScope() → { tenantIds, profileId }
    daily-briefs.ts         — getDailyBriefForSession() (untouched)
  context/
    user-context.tsx        — TenantProvider, useUser(), DirectoryUser type
  supabase/
    server.ts               — createClient() for server components/routes
    client.ts               — createClient() for client components

types/
  db.ts                     — Task type, Lead type, mapTaskFromDb()
  db.generated.ts           — Auto-generated Supabase types (do not edit)
  database.ts               — Enum types: TaskStatus, TaskPriority, etc.
```

---

## 3. Database Tables (relevant columns)

### `byred_tasks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK → byred_tenants.id |
| `title` | text | Required |
| `status` | text | not_started / in_progress / blocked / done / cancelled / overdue |
| `priority` | text | critical / high / medium / low |
| `due_date` | date | YYYY-MM-DD string |
| `owner_user_id` | uuid | FK → byred_users.id (canonical owner) |
| `assigned_user_id` | uuid | Legacy field — NOT the same as owner_user_id. Do not confuse. |
| `estimated_minutes` | int | Task effort estimate — currently hardcoded to 30 |
| `revenue_impact_score` | int | 0–10, used for sorting |
| `urgency_score` | int | 0–10, used for sorting |
| `archived_at` | timestamptz | Soft delete — all queries filter `.is('archived_at', null)` |
| `blocker_flag` | bool | |
| `is_low_hanging_fruit` | bool | |
| `is_ready_for_ai` | bool | |
| `needs_decision` | bool | |
| `definition_of_done` | text | |
| `acceptance_criteria` | text | |
| `project_id` | uuid | Optional |
| `board_id` | uuid | Optional |

### `byred_users`
| Column | Notes |
|--------|-------|
| `id` | UUID — this is `profileId` / `owner_user_id` |
| `auth_user_id` | Links to Supabase auth.users.id |
| `name` | Display name |
| `avatar_url` | Optional |
| `active` | bool — filter `.eq('active', true)` when building directories |
| `role` | 'admin' \| 'member' etc. |

---

## 4. Completed Fixes

### P0 — Fixed this session

**#1 — `onMouseEnter`/`onMouseLeave` in server component (`app/os/tasks/page.tsx`)**
- Root cause: `TaskRow` used inline JS event handlers. React Server Components cannot serialise functions — throws at runtime.
- Fix: Removed both handlers, added `className="os-task-row"`, added `.os-task-row:hover { background: rgba(255,255,255,0.03); }` to `app/globals.css`.

---

### P1 — Fixed this session

**#2 — `owner_user_id` never set on new tasks (`app/api/os/tasks/route.ts`)**
- Root cause: POST body type didn't include `owner_user_id`; insert statement omitted it.
- Fix: Destructured `profileId` from `requireTenantScope()` in the POST handler. Now inserts `owner_user_id: profileId ?? null` server-side. The form doesn't need to change — ownership is set securely on the server.
- Note: Bulk import mode (the `tasks` array branch) still does NOT auto-set `owner_user_id`. Bulk import callers can include it explicitly in each task object.

**#3 — No owner field in task detail (`components/os/TaskDetailClient.tsx`, `app/os/tasks/[id]/page.tsx`)**
- Root cause: `TaskRow` type didn't include `owner_user_id`. Server page didn't fetch or pass the user directory. No owner UI existed.
- Fix:
  - Added `owner_user_id: string | null` to `TaskRow` type.
  - Added `owner_user_id` to the `Patch` type (PATCH route already accepted it).
  - Added `directory?: DirectoryUser[]` prop to `TaskDetailClient`.
  - Added owner `<select>` picker in the meta grid — calls `patch({ owner_user_id })` on change.
  - Updated `app/os/tasks/[id]/page.tsx` to fetch `byred_users` in parallel with the task and pass to `TaskDetailClient`.

**#4 — GET `/api/os/tasks` selected `assigned_user_id` instead of `owner_user_id`**
- Root cause: The SELECT string in GET used `assigned_user_id` — a legacy field that is always null in practice.
- Fix: Replaced with `owner_user_id` in the SELECT string. All callers of this API endpoint now get the correct ownership data.

**#5 — Today page showed all team tasks, not current user's (`app/os/today/page.tsx`, `lib/data/tasks.ts`)**
- Root cause: Page called `getTasks()` with no owner filter. `getTasksForToday()` also had no owner filter parameter.
- Fix:
  - Added `ownerId?: string | null` to the `PageOpts` type in `lib/data/tasks.ts`.
  - `getTasksForToday` now applies `.eq("owner_user_id", opts.ownerId)` when `ownerId` is provided.
  - `app/os/today/page.tsx` now calls `requireTenantScope()`, extracts `profileId`, and passes `{ ownerId: profileId }` to `getTasksForToday`.
  - Import changed from `getTasks` to `getTasksForToday`.

---

### P2 — Fixed this session

**#6 — LanternAI had no idea who was asking (`app/api/os/lantern-ai/route.ts`)**
- Fix: Extracted `profileId` from `requireTenantScope()`. Added 3 parallel queries: caller's display name from `byred_users`, caller's open task count, caller's critical tasks due today or overdue. System prompt now opens with `Requesting user: {name}`, `{name}'s open tasks: N`, `{name}'s critical/overdue: [list]`, then team-wide counts.

**#9 — User pill row overflows with large teams (`app/os/tasks/page.tsx`)**
- Fix: `directory.slice(0, 5)` caps the rendered pills at 5. If `directory.length > 5`, a static `+N` badge follows, with a `title` tooltip listing the hidden names. No dropdown — intentionally minimal.

---

## 5. Remaining Work

### P2 — Not yet done

**#7 — `estimated_minutes` hardcoded to 30 everywhere**

Files:
- `app/api/os/tasks/route.ts` — both single-task POST and bulk import hardcode `estimated_minutes: 30`
- `app/os/tasks/new/page.tsx` — no field in the form for it
- `types/db.ts:mapTaskFromDb` — `row.estimated_minutes ?? 30` fallback is fine, but the data is never real

What to do:
1. Add an `estimated_minutes` number input to the new task form (`app/os/tasks/new/page.tsx`). Suggested UX: a small dropdown or number field with options 15 / 30 / 60 / 90 / 120 / custom.
2. Update the POST body type in `route.ts` to accept `estimated_minutes?: number`.
3. Use `body.estimated_minutes ?? 30` in both single and bulk insert.
4. The Today page's "Quick Wins" bucket (`t.estimated_minutes <= 30`) and "Deep Work" bucket (`t.estimated_minutes >= 60`) will immediately benefit from real data.

**#8 — `in_progress` tasks with no due date land in "No Date" bucket (low priority)**

Files:
- `app/os/tasks/page.tsx:buildWeeklyBuckets()`

Current behaviour: any task without `due_date` goes to `bucketMap['no_date']`, which renders last.

Proposed fix: In `buildWeeklyBuckets`, tasks where `status === 'in_progress'` and `!due_date` should go into `bucketMap['today']` or a dedicated `'active_no_date'` bucket rendered between "Today" and "Tomorrow". Requires a new bucket definition and label.

Risk: This changes the default sort order users have already seen. Low urgency — discuss before implementing.

**#10 — Breadcrumb for `/os/tasks/new`** — Confirmed non-issue. The prefix match in `getMetaForPath` correctly shows "Tasks" as the breadcrumb. No action needed.

---

## 6. Not in Scope / Acknowledged Gaps

These were noted in the original audit but are architectural decisions, not bugs:

- **No pagination on task list** — The task list page uses `.limit(300)`. For large tenants this will be slow. A cursor-based pagination or infinite scroll is the correct fix but is a larger feature.
- **Bulk import doesn't auto-assign `owner_user_id`** — By design for now. Bulk imports come from external sources (Monday sync etc.) where the owner is determined by the import data, not the current session.
- **`getTaskStats()` in `lib/data/tasks.ts` is used by the sidebar dashboard widgets** — It has no `ownerId` filter. If you want per-user stats in the sidebar, it needs the same treatment as `getTasksForToday`.

---

## 7. Critical Gotchas for Next Session

1. **`profileId` vs `authUser.id`** — Never use `authUser.id` to query `byred_tasks.owner_user_id`. These are different UUIDs. Always use `profileId` from `requireTenantScope()`.

2. **`assigned_user_id` is a legacy field** — The `byred_tasks` table has both `assigned_user_id` and `owner_user_id`. The OS module uses `owner_user_id` as the canonical owner. `assigned_user_id` exists for backward compat with older code and should not be used in new features.

3. **Server components can't have event handlers** — `app/os/tasks/page.tsx` has no `'use client'` directive. Any component rendered inside it that needs interactivity (hover, click, onChange) must either use CSS-only techniques or be extracted into a separate `'use client'` file.

4. **Task detail is a mixed server/client pattern** — `app/os/tasks/[id]/page.tsx` is a server component that fetches data and passes it to `TaskDetailClient` (client component). When adding new editable fields to the detail view: add them to the `TaskRow` type in `TaskDetailClient.tsx`, add them to the server page's `select('*')` (already `*` so no change needed), and add `owner_user_id`-style to the `Patch` type + PATCH allowed list in `app/api/os/tasks/[id]/route.ts`.

5. **`mapTaskFromDb` is the source of truth for the `Task` type** — If a new column is added to `byred_tasks` and needs to appear in `Task`, it must be added to both the `Task` type and the `mapTaskFromDb` function in `types/db.ts`. The generated types in `db.generated.ts` are for raw DB rows only.

6. **`getTasksForToday` has a quirky OR filter** — `.or('due_date.lte.${today},status.eq.in_progress,status.eq.not_started')` means it pulls tasks that are either overdue/due today OR are in any active status regardless of date. This is intentional (personal task board), but means the bucket counts on Today page can be high for users with lots of open `not_started` tasks.

---

## 8. Test Checklist Before Shipping

- [ ] Create a new task → confirm it appears under "Mine" filter on `/os/tasks?view=mine`
- [ ] Open the task detail → confirm the Owner dropdown shows all active users
- [ ] Change the owner in task detail → confirm the PATCH fires and the pill updates on the list page after refresh
- [ ] Visit `/os/today` as two different users → confirm each sees only their own tasks
- [ ] Ask LanternAI "what are my blockers?" → confirm the response uses your name and your personal task counts
- [ ] Have 6+ active users in `byred_users` → confirm the Who filter row shows 5 pills + "+N" badge
- [ ] Hover a task row on the list → confirm the background tint appears (CSS hover, no JS error)
- [ ] Create a task via the `/api/os/tasks` GET endpoint → confirm response contains `owner_user_id`, not `assigned_user_id`
