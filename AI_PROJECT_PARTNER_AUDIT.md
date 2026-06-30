# AI Project Partner — Complete Audit

## Overview

The AI Project Partner is a 5-step interactive planning interface that guides teams through goal → plan → task creation. It combines AI-driven planning with human decision control, stores results in real database tables, and integrates setup (Supabase, GitHub, integrations) into the planning flow.

---

## STEP 0: PROJECT SETUP

### Page/Route
- **Route**: `/os/planner` (single page, state-managed)
- **Step**: `step === "setup"`

### Features

#### 1. Supabase Repository Picker
- **Field**: `setup.supabaseRepo` (string, optional)
- **Options**:
  - "— Select or create Supabase repo —" (default empty)
  - "rorysemeah-prod" (Rory's production instance)
  - "keymon-prod" (Keymon's production instance)
  - "shared" (multi-tenant shared)
- **UI**: HTML `<select>` dropdown
- **State Update**: `setSetup({...setup, supabaseRepo: e.target.value})`
- **Validation**: None (optional field, stores as-is)

#### 2. GitHub Repository Picker
- **Field**: `setup.githubRepo` (string, optional)
- **Input**: Text input + "Create New" button
- **Placeholder**: "e.g. redlanternstudios/project-name"
- **State Update**: `setSetup({...setup, githubRepo: e.target.value})`
- **Create New Button**: Placeholder only (no action wired)
- **Validation**: None (optional field)

#### 3. Integration Selector (Checkbox Grid)
- **Field**: `setup.selectedIntegrations` (string array)
- **Integrations** (8 total, 2-column grid):
  - v0 (AI UI generation)
  - Claude (AI planning & coding)
  - GitHub (Version control)
  - Slack (Team notifications)
  - n8n (Workflow automation)
  - Vercel (Deployment)
  - Stripe (Payments)
  - Notion MCP (Docs & databases)
- **UI**: Checkboxes with description text
- **State Update**:
  - Check: `setSetup({...setup, selectedIntegrations: [...setup.selectedIntegrations, int.id]})`
  - Uncheck: Filter out the id from array
- **Conditional Display**: API key fields only render if `setup.selectedIntegrations.length > 0`

#### 4. API Keys & Secrets (Conditional)
- **Field**: `setup.apiKeys` (Record<string, string>)
- **Renders**: Only if 1+ integrations selected
- **UI**: Password input per selected integration
- **Placeholder**: "Enter {integration} API key (optional for now)"
- **State Update**: `setSetup({...setup, apiKeys: {...setup.apiKeys, [int]: e.target.value}})`
- **Validation**: None (all optional for now; note says "AI will prompt for these later")

#### 5. Continue Button
- **Label**: "Continue to planning"
- **Action**: `setStep("input")`
- **Disabled State**: No disabling logic (always enabled)
- **Passes Setup Data**: `setup` object carried through all remaining steps

### Data Flow
```
Setup Form → Local State (setup) → Carried through Input/Golden/Plan steps → Commit payload
```

---

## STEP 1: INPUT (Project Goal)

### Page/Route
- **Route**: `/os/planner`
- **Step**: `step === "input"`

### Features

#### 1. Setup Summary Card (Conditional)
- **Shows**: Only if `setup.selectedIntegrations.length > 0`
- **Content**:
  - Supabase repo (if selected)
  - GitHub repo (if entered)
  - Integrations list (uppercase, comma-separated)
- **Edit Link**: `<button onClick={() => setStep("setup")}>Edit setup</button>`
- **Style**: Card with read-only display

#### 2. Tenant Selector
- **Field**: `tenantId` (string)
- **Source**: Fetched from `/api/os/tenants` on mount
- **UI**: HTML `<select>` dropdown
- **State Update**: `setTenantId(e.target.value)`
- **Default**: First tenant auto-selected on load
- **Initial Fetch**:
  ```javascript
  useEffect(() => {
    fetch("/api/os/tenants").then((r) => r.json()).then((d) => {
      const t = d.tenants ?? []; setTenants(t); if (t[0]) setTenantId(t[0].id)
    })
  }, [])
  ```

#### 3. Goal Textarea
- **Field**: `goal` (string, required)
- **UI**: 5-row textarea
- **Placeholder**: "e.g. Launch a simple booking page for Paradise so customers can request a quote and we get notified."
- **State Update**: `setGoal(e.target.value)`
- **Validation**: Required field, blocks "Draft golden path" if empty (`!goal.trim()`)

#### 4. Draft Button
- **Label**: "Draft the golden path"
- **Action**: Calls `doDraft()` which:
  1. Clears error state
  2. Sets loading=true
  3. Calls `/api/os/planner` with `mode: "draft"`
  4. Receives `Draft` object (restated_goal, questions, assumptions, risks, epics)
  5. Sets `draft` state and transitions to `step="golden"`
  6. Sets loading=false
- **Disabled**: If `loading || !goal.trim() || !tenantId`
- **UI**: Shows spinner while loading

### Data Flow
```
User enters goal + selects tenant
→ Click "Draft golden path"
→ POST /api/os/planner { mode: "draft", tenantId, goal, answers }
→ Claude generates Draft (5-30 seconds)
→ Transition to Golden Path step
```

---

## STEP 2: GOLDEN PATH (Review & Refine)

### Page/Route
- **Route**: `/os/planner`
- **Step**: `step === "golden"`

### Features

#### 1. Restated Goal Card
- **Source**: `draft.restated_goal`
- **UI**: Read-only text in card
- **Styling**: 15px text, leading-relaxed

#### 2. Clarifying Questions (Conditional)
- **Shows**: Only if `draft.clarifying_questions.length > 0`
- **List**: Bullet list with "?" prefix in red
- **Textarea Below**: User can answer questions (optional)
- **Field**: `answers` (string)
- **State Update**: `setAnswers(e.target.value)`
- **Placeholder**: "Answer any of the above here (optional) so the plan fits better."

#### 3. Two-Column Layout
- **Column 1: Assumptions**
  - Source: `draft.assumptions` array
  - Icon: Green checkmark (CheckCircle2)
  - List format: Bullet items
- **Column 2: Risks**
  - Source: `draft.risks` array
  - Each risk has `risk` and `mitigation` text
  - Icon: Orange warning triangle (AlertTriangle)
  - Format: Risk text + indented mitigation below

#### 4. Proposed Epics Card
- **Source**: `draft.proposed_epics` array
- **Per Epic**:
  - Name (bold)
  - Summary (smaller text)
  - Est. story count (right-aligned gray badge)
- **UI**: Horizontal cards in white/gray layout

#### 5. Navigation Buttons
- **Back Button**: `setStep("setup")` (Back to setup)
- **Continue Button**: `doGenerate()` (Build the menu)
- **Label**: "Build the menu"
- **Action**: POST `/api/os/planner` with `mode: "generate"`

### Data Flow
```
Claude reviews draft + user optionally answers questions
→ Click "Build the menu"
→ POST /api/os/planner { mode: "generate", tenantId, goal, answers, golden: draft, refine: "" }
→ Claude generates full Plan with epics + stories (30-60 seconds)
→ Transition to Plan (Menu) step
```

---

## STEP 3: THE MENU (Task Selection & AI Mode)

### Page/Route
- **Route**: `/os/planner`
- **Step**: `step === "plan"`

### Features

#### 1. Selection Summary
- **Text**: "{selectedCount} plates checked · {aiCount} for the AI"
- **Calculation**:
  - `selectedCount = Object.values(sel).filter(s => s.on).length`
  - `aiCount = Object.values(sel).filter(s => s.on && (s.mode === "AI_DRAFT" || s.mode === "AI_EXECUTE")).length`
- **Real-time update**: Recalculates when selection changes

#### 2. Shape the Plan (Refinement)
- **Card**: Input + Update button
- **Input Field**: `refine` (string, optional)
- **Placeholder**: "e.g. drop the multi language stuff, add a thank you page, keep it under a week"
- **Update Button**:
  - Calls `doGenerate(refine)` (re-generates plan with refinement request)
  - Disabled if `!refine.trim()` or `loading`
  - Shows spinner while generating
- **Auto-clears**: `setRefine("")` after generation

#### 3. Epic Cards (Expandable Sections)
- **Per Epic** (from `plan.epics`):
  - Epic name (bold with sparkle icon)
  - Epic goal (smaller gray text)
  - Story list below

#### 4. Story Rows (Per Epic)
- **Per Story** (from `epic.stories`):

##### Story Header
- **Checkbox**: Toggle story on/off
  - `sel[keyOf(ei, si)].on`
  - Visual: Empty checkbox (unchecked) or red filled checkbox (checked)
  - Action: `toggle(k)` → sets `on: !on`
- **Title**: Story title (bold, white)
- **Priority Badge**: Colored by priority (critical=red, high=orange, medium=yellow, low=green)
- **Estimate**: "{estimate_minutes}m" (gray)
- **Assignee**: Optional, shows person icon + name if present

##### Story Body (Collapsible)
- **User Story**: "As a X, I want Y, so that Z" (italic gray)
- **Capability Badge**: 
  - "AI can complete" (green bg/text)
  - "AI can draft" (yellow bg/text)
  - "Human only" (gray bg/text)
  - Tooltip on hover: `s.capability_reason`
- **AI Mode Buttons** (3 buttons per story):
  - "I do it" (HUMAN_ONLY)
  - "AI drafts" (AI_DRAFT)
  - "AI does it" (AI_EXECUTE)
  - Visual: Active button highlighted red, disabled if mode not allowed by capability
  - Action: `setMode(k, mode)` → updates `sel[k].mode`
- **Capability Reason**: "Here's why we think..." (smaller gray text)

##### Story Selection Logic
```javascript
const defaultMode = (c: Capability): Mode =>
  c === "ai_can_complete" ? "AI_EXECUTE" :
  c === "ai_can_draft" ? "AI_DRAFT" :
  "HUMAN_ONLY"

// On plan load, auto-select all stories + set default mode
useEffect(() => {
  if (!plan) return
  const next = {}
  plan.epics.forEach((e, ei) =>
    e.stories.forEach((s, si) => {
      next[keyOf(ei, si)] = { on: true, mode: defaultMode(s.capability) }
    })
  )
  setSel(next)
}, [plan])
```

#### 5. Place Order Button (Sticky Bottom)
- **Label**: "Place the order ({selectedCount})"
- **Action**: `doCommit()` which:
  1. Collects all `sel[k].on === true` stories
  2. Builds `items` array from selected stories
  3. Preserves `epic_name, title, user_story, description, acceptance_criteria, definition_of_done, priority, estimate_minutes, ai_mode, assignee_name`
  4. Posts `/api/os/planner` with `mode: "commit"` + full `setup` config
  5. Receives `{ projectId, created, aiQueued }`
  6. Transitions to `step="done"`
- **Disabled**: If `loading || selectedCount === 0`
- **Sticky**: Bottom-4 with backdrop blur

### Data Flow
```
Claude displays full plan with stories + capabilities
→ User selects/deselects stories and sets AI mode per story
→ User optionally refines plan (loops back to generate)
→ Click "Place the order"
→ POST /api/os/planner {
    mode: "commit",
    tenantId,
    project_name: plan.project_name,
    project_summary: plan.project_summary,
    setup: { supabaseRepo, githubRepo, selectedIntegrations, apiKeys },
    items: [ { epic_name, title, user_story, description, ..., ai_mode, assignee_name }, ... ]
  }
→ Backend builds os_projects + byred_tasks
→ Transition to Done step
```

---

## STEP 4: DONE (Confirmation)

### Page/Route
- **Route**: `/os/planner`
- **Step**: `step === "done"`

### Features

#### 1. Success Icon
- **Icon**: Green CheckCircle2 (large)

#### 2. Summary Message
- **Text**: "Project built · {created.created} tasks"
- **Shows created task count**

#### 3. AI Queueing Message (Conditional)
- **If `created.aiQueued > 0`**:
  - "X tasks are marked for the AI partner — the executor picks them up and posts the work for review. Owners were auto-assigned and can be changed on the board."
- **If `created.aiQueued === 0`**:
  - "Tasks are owned by the team and grouped by epic on the project board."

#### 4. Navigation Buttons
- **Open Project Button** (if projectId):
  - Link: `/os/projects/{projectId}`
  - Text: "Open project board"
- **View Tasks Link** (fallback):
  - Link: `/os/tasks`
  - Text: "View tasks"
- **Plan Another Button**:
  - Resets all state to initial
  - Goes back to `step="setup"`
  - Clears: goal, answers, refine, draft, plan, sel, setup

### Data Flow
```
Project successfully created in database
→ Show confirmation + task count + AI task count
→ User can view project board or plan another
```

---

## API ENDPOINTS

### 1. POST `/api/os/planner` (Main Planner Engine)

#### Authentication
```
Checks: Auth user exists
→ Resolves profile (byred_users)
→ Verifies tenant access (byred_user_tenants)
→ Returns profileId, tenantIds
```

#### Mode: "draft"
- **Input**: `{ mode: "draft", tenantId, goal, answers }`
- **Processing**:
  1. Validates tenantId in user's accessible tenants
  2. Fetches tenant name from byred_tenants
  3. Calls Claude (Sonnet 4.6) with draftSchema
  4. Returns `{ draft: Draft }`
- **Output**: Draft object (restated_goal, clarifying_questions, assumptions, risks, proposed_epics)
- **Timeout**: 60 seconds maxDuration

#### Mode: "generate"
- **Input**: `{ mode: "generate", tenantId, goal, answers, golden: Draft, refine?: string }`
- **Processing**:
  1. Validates tenantId
  2. Fetches tenant name + team roster (byred_users, byred_user_tenants)
  3. Calls `generatePlan()` library function
  4. Claude generates Plan with epics + stories (constraints: 4 epics max, 3 stories/epic max, 10-12 total)
  5. Each story gets capability rating (ai_can_complete, ai_can_draft, human_only)
  6. Assignment based on role + availability (from team roster)
  7. Returns `{ plan: Plan }`
- **Output**: Plan object (project_name, project_summary, epics with stories)

#### Mode: "commit"
- **Input**: 
  ```json
  {
    mode: "commit",
    tenantId,
    project_name,
    project_summary,
    setup: { supabaseRepo, githubRepo, selectedIntegrations, apiKeys },
    items: [ BuildStory, ... ]
  }
  ```
- **Validation**: Zod schema validates all fields
- **Processing**:
  1. Validates tenantId
  2. Calls `buildProject()` library function with setup config
  3. Creates os_projects row (includes setup_config as JSON)
  4. Creates byred_tasks rows (one per selected story, linked to project)
  5. Logs activity to byred_activities
  6. Returns `{ projectId, created, aiQueued }`
- **Output**: Project + task count + AI-queued count

#### Mode: "autobuild" (Lantern handoff)
- **Input**: `{ mode: "autobuild", tenantId, goal, context }`
- **Processing**:
  1. One-pass flow: generate + commit
  2. Skips human menu selection (all stories on by default)
  3. Uses capability-to-mode mapping (ai_can_complete → AI_EXECUTE, etc.)
  4. Returns full project + task IDs
- **Used By**: Lantern AI's "push_to_planner" action

### 2. GET `/api/os/tenants`
- **Returns**: List of tenants the user can access
- **Response**: `{ tenants: [ { id, name }, ... ] }`

### 3. GET `/api/os/projects`
- **Returns**: All projects for user's tenants with live task counts
- **Response**: `{ projects: [ { id, name, description, status, tenant_id, owner_user_id, created_at, task_count, done_count }, ... ] }`
- **Calculation**: Joins os_projects + byred_tasks, counts by project_id + status

### 4. GET `/api/os/projects/[id]`
- **Returns**: Single project + all its byred_tasks (board view)
- **Response**: `{ project, tasks: [ ... ] }`
- **Security**: Verifies user has access to project's tenant

---

## DATABASE SCHEMA

### os_projects
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK byred_tenants |
| name | text | Project name |
| description | text | One-line summary |
| status | text | "active" \| "paused" \| "archived" |
| owner_user_id | uuid | FK byred_users |
| created_by_user_id | uuid | FK byred_users |
| **setup_config** | json | **NEW**: Stores SetupConfig (supabaseRepo, githubRepo, selectedIntegrations, apiKeys) |
| created_at | timestamp | Auto-set |
| updated_at | timestamp | Auto-update |

### byred_tasks
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK byred_tenants |
| project_id | uuid | FK os_projects (null if adhoc) |
| epic | text | Epic name (for grouping) |
| title | text | Story title |
| description | text | Full description + acceptance criteria + DoD |
| status | text | "not_started" \| "in_progress" \| "done" \| "cancelled" |
| priority | text | "critical" \| "high" \| "medium" \| "low" |
| **ai_mode** | text | **KEY**: "HUMAN_ONLY" \| "AI_DRAFT" \| "AI_EXECUTE" |
| owner_user_id | uuid | FK byred_users (assigned by planner) |
| created_by_user_id | uuid | FK byred_users |
| estimated_minutes | int | Story estimate |
| order_index | int | Sort order within project |
| created_at | timestamp | Auto-set |
| updated_at | timestamp | Auto-update |

---

## DATA TYPES & SCHEMAS

### SetupConfig (Client State)
```typescript
type SetupConfig = {
  supabaseRepo?: string  // "rorysemeah-prod" | "keymon-prod" | "shared"
  githubRepo?: string    // "redlanternstudios/project-name"
  selectedIntegrations: string[]  // ["v0", "claude", "github", "slack", "n8n", "vercel", "stripe", "mcp-notion"]
  apiKeys: Record<string, string>  // { v0: "...", claude: "...", ... }
}
```

### Draft (AI Output, Step 2)
```typescript
type Draft = {
  restated_goal: string
  clarifying_questions: string[]
  assumptions: string[]
  risks: Array<{ risk: string; mitigation: string }>
  proposed_epics: Array<{ name: string; summary: string; est_stories: number }>
}
```

### Plan (AI Output, Step 3)
```typescript
type Plan = {
  project_name: string
  project_summary: string
  epics: Array<{
    name: string
    goal: string
    stories: Array<{
      title: string
      user_story: string
      description: string
      acceptance_criteria: string[]
      definition_of_done: string[]
      priority: "critical" | "high" | "medium" | "low"
      estimate_minutes: number
      capability: "ai_can_complete" | "ai_can_draft" | "human_only"
      capability_reason: string
      assignee_name: string
    }>
  }>
}
```

### BuildStory (Commit Payload Item)
```typescript
type BuildStory = {
  epic_name: string
  title: string
  user_story: string
  description: string
  acceptance_criteria: string[]
  definition_of_done: string[]
  priority: "critical" | "high" | "medium" | "low"
  estimate_minutes: number
  ai_mode: "HUMAN_ONLY" | "AI_DRAFT" | "AI_EXECUTE"
  assignee_name?: string | null
}
```

---

## CLICK PATHS & USER FLOWS

### Happy Path: Setup → Input → Golden → Plan → Commit → Done
```
1. User arrives at /os/planner
2. SETUP step loads (default first render)
   → Select Supabase repo (optional)
   → Enter GitHub repo (optional)
   → Check integrations (0 or more)
   → Enter API keys for selected integrations (optional)
   → Click "Continue to planning"

3. INPUT step
   → Setup summary card shows (if integrations selected)
   → Select tenant from dropdown
   → Type project goal in textarea
   → Click "Draft the golden path"
   → Loading spinner (Claude generates draft)

4. GOLDEN PATH step
   → Review restated goal
   → Review clarifying questions (optional answer textarea)
   → Review assumptions + risks in 2-column layout
   → Review proposed epics
   → Optional: Answer clarifying questions for better plan
   → Click "Build the menu"
   → Loading spinner (Claude generates full plan)

5. THE MENU step
   → Display all epics + stories
   → Per story: checkbox toggle + capability badge + 3 AI mode buttons
   → Selection counter shows at top
   → Optional: Type refinement request + click "Update" (re-generates plan)
   → Select/deselect stories + set AI mode per story
   → Click "Place the order"
   → Loading spinner (Backend builds project + tasks)

6. DONE step
   → Success icon + "Project built · N tasks"
   → Message showing AI-queued task count
   → "Open project board" button (links to /os/projects/{id})
   → "Plan another" button (resets and goes back to setup)
```

### Refinement Loop (In Menu Step)
```
User types refinement request (e.g., "add dark mode, remove payment step")
→ Click "Update"
→ Claude re-generates plan with refinement applied
→ Plan re-renders with updated stories
→ User selections are preserved (same story order)
```

### Back Navigation
- **Setup → Input**: Click "Continue to planning"
- **Input → Setup**: (No back button, but can refresh page or navigate)
- **Golden → Setup**: Click "Back to setup" button
- **Plan → Golden**: Click "Back" button
- **Menu → Golden**: Can click "Back" (sticky footer button)

### Edit Setup After Input
```
In INPUT step, if setup was done:
→ Setup summary card shows at top
→ Click "Edit setup" link
→ Jump back to setup step
→ Modify Supabase/GitHub/integrations/keys
→ Click "Continue to planning"
→ Return to input step (goal + tenant still intact)
```

---

## ERROR HANDLING

### Client-Side Errors
- **No goal entered**: "Draft golden path" button disabled
- **No tenant selected**: "Draft golden path" button disabled
- **No stories selected**: "Place the order" button disabled
- **API error**: Caught in `run()` helper, displayed in red alert box at top
- **Network failure**: Generic "Something went wrong" message

### Server-Side Errors
- **Unauthorized**: Returns 401, caught by client error handler
- **Invalid tenant**: Returns 400 "Invalid project"
- **Claude timeout**: Caught, returns 500 "Planner failed. Try again."
- **DB error**: Caught, returns 500 + error message

### Displayed Errors
```
{err && (
  <div className="...bg-red-950/40 border border-red-800/40 text-red-400...">
    <AlertTriangle className="w-4 h-4" /> {err}
  </div>
)}
```

---

## STATE MANAGEMENT (React Hooks)

### Top-Level State Variables
```javascript
const [tenants, setTenants]                    // Array of { id, name }
const [tenantId, setTenantId]                  // Selected tenant id (string)
const [goal, setGoal]                          // User's goal textarea
const [answers, setAnswers]                    // Answers to clarifying questions
const [refine, setRefine]                      // Refinement request in menu
const [step, setStep]                          // "setup" | "input" | "golden" | "plan" | "done"
const [draft, setDraft]                        // Draft object from AI (null until generated)
const [plan, setPlan]                          // Plan object from AI (null until generated)
const [sel, setSel]                            // Record<string, { on: bool, mode: Mode }>
const [created, setCreated]                    // { created: number, aiQueued: number, projectId?: string }
const [loading, setLoading]                    // Boolean flag for API calls
const [err, setErr]                            // Error message string
const [setup, setSetup]                        // SetupConfig object
```

### Derived Values
```javascript
const selectedCount = Object.values(sel).filter(s => s.on).length
const aiCount = Object.values(sel).filter(s => s.on && (s.mode === "AI_DRAFT" || s.mode === "AI_EXECUTE")).length
```

### Effects
```javascript
// On mount: fetch tenant list
useEffect(() => {
  fetch("/api/os/tenants")
    .then(r => r.json())
    .then(d => {
      const t = d.tenants ?? []
      setTenants(t)
      if (t[0]) setTenantId(t[0].id)
    })
}, [])

// When plan arrives: auto-populate story selections
useEffect(() => {
  if (!plan) return
  const next = {}
  plan.epics.forEach((e, ei) =>
    e.stories.forEach((s, si) => {
      next[keyOf(ei, si)] = { on: true, mode: defaultMode(s.capability) }
    })
  )
  setSel(next)
}, [plan])
```

---

## STYLING & THEMING

### Color Palette
- **Primary Red**: `#D92532` (buttons, accents)
- **Dark BG**: `#111318` (card backgrounds)
- **Darker BG**: `#0E0F13` (inputs, nested)
- **Border**: `#2A2D35` (card borders)
- **Text Primary**: White
- **Text Secondary**: `#9CA3AF` (labels, hints)
- **Text Tertiary**: `#6B7280` (timestamps, small text)
- **Success Green**: `#4ADE80` (checkmarks, "ai_can_complete")
- **Warning Yellow**: `#FACC15` (medium priority, "ai_can_draft")
- **Error Red**: `#F87171` (critical priority)
- **Orange**: `#FB923C` (high priority)

### Reusable Classes
```javascript
const card = "rounded-xl bg-[#111318] border border-[#2A2D35] p-5"
const label = "text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest"
const prio = {
  critical: "#F87171",
  high: "#FB923C",
  medium: "#FACC15",
  low: "#4ADE80"
}
```

---

## CAPABILITY RATINGS & MODE MAPPING

### Capability Levels (AI Assessment)
```typescript
"ai_can_complete"  // AI can do 100%, no human review needed
  → Default mode: AI_EXECUTE
  → Allowed modes: HUMAN_ONLY, AI_DRAFT, AI_EXECUTE

"ai_can_draft"     // AI produces strong draft, human must review
  → Default mode: AI_DRAFT
  → Allowed modes: HUMAN_ONLY, AI_DRAFT, AI_EXECUTE

"human_only"       // Requires human (legal, accounts, external API, manual action)
  → Default mode: HUMAN_ONLY
  → Allowed modes: HUMAN_ONLY only (other buttons disabled)
```

### Mode Semantics
```typescript
"HUMAN_ONLY"       // No AI involvement, fully manual task
"AI_DRAFT"         // AI produces draft, owner reviews + edits before execution
"AI_EXECUTE"       // AI completes task end-to-end, posted for review (qa gate depends on task)
```

---

## TEAM ASSIGNMENT LOGIC

### Sources
1. Claude generates `assignee_name` per story (from prompt with team roster)
2. Team roster fetched from `byred_users` table (active only, sorted by name)
3. Roster includes: id, name, role

### Assignment Rules (From Prompt)
- Keymon Penn (PM/RTE) → planning, coordination, sprint work
- Homira Gitesatani → "Beauty By Red" work exclusively
- Developers → engineering/build work
- Default fallback → Rory Semeah

### Resolution (buildProject)
```javascript
const resolveOwner = (name?: string | null): string | null => {
  if (!name || !name.trim()) return null
  const q = name.trim().toLowerCase()
  let hit = teamMembers.find(m => m.name.toLowerCase() === q)
  if (!hit) hit = teamMembers.find(m => m.name.toLowerCase().includes(q))
  return hit?.id ?? null
}
```
- Exact match → use id
- Partial match → use id
- No match → null (task unassigned, can be reassigned on board)

---

## AI MODEL & PROMPTING

### Model
- **Claude Sonnet 4.6** (`claude-sonnet-4-6`)
- **Max Tokens**: Default (no override in code)
- **Max Duration**: 60 seconds for entire planner endpoint

### Structured Generation
- Uses `generateObject()` from AI SDK with Zod schemas
- Ensures output matches expected shape exactly

### Prompt Architecture

#### Draft Prompt
- Tenant context ("for X")
- Goal (user's description)
- Optional answers (user-provided extra context)
- Output schema: draftSchema (5 fields)

#### Generate/Plan Prompt
- Senior PM framing
- Tenant context
- Constraints: 4 epics max, 3 stories/epic max, 10-12 stories total
- Capability rating rules (strict definitions)
- Assignment guidance (roster + role matching)
- Team roster text (formatted list of names + roles)
- Goal + golden path + answers + optional refinement
- Output schema: planSchema

### Capability Reasoning
Prompt tells Claude:
- "ai_can_complete": AI finishes 100% (writing copy, drafting spec, structuring schema)
- "ai_can_draft": AI produces strong draft (human reviews/decides/finishes)
- "human_only": Needs human (account, payment, legal, external login, real-world action)
- "Be strict and truthful — never mark as ai_can_complete if it truly needs a human"

---

## KNOWN LIMITATIONS & GAPS

### Setup Phase (Currently Implemented)
- ✅ Supabase repo dropdown
- ✅ GitHub repo text input (+ "Create New" button is placeholder)
- ✅ Integration checkboxes
- ✅ API key password fields
- ⚠️ **GAP**: "Create New" GitHub button has no onclick handler (placeholder)
- ⚠️ **GAP**: API keys are stored client-side in state, never validated/securely stored yet (note says "AI will prompt later")
- ⚠️ **GAP**: Setup config not currently used by Claude during planning (not in prompts yet)

### Integration Awareness (Not Yet Built)
- ⚠️ Claude doesn't see selected integrations during planning
- ⚠️ No integration-specific story suggestions (e.g., "Use Stripe for payments")
- ⚠️ No integration-specific capability ratings (e.g., "Stripe integration handles this fully")

### Secrets Management (Not Yet Built)
- ⚠️ API keys accepted but not persisted securely
- ⚠️ No encryption on storage
- ⚠️ No integration with environment variables yet
- ⚠️ "AI will prompt for these later" — placeholder text only

### GitHub Integration (Not Yet Built)
- ⚠️ "Create New" button has no onclick
- ⚠️ No validation that repo exists or is accessible
- ⚠️ Repo name stored as plain string, no auto-linking to GitHub API

### Project Board (Separate Feature)
- ✅ `/os/projects` API + `/os/projects/[id]` API exist (task queries, epic grouping)
- ⚠️ Board UI not audited here (separate page component)

### Error Cases Not Fully Tested
- Network timeout during 60-second Claude call
- Claude returns invalid JSON (schema violation)
- Database constraint violation (duplicate project name, etc.)
- User access to tenant revoked mid-flow

---

## SUMMARY TABLE

| Component | Status | Notes |
|-----------|--------|-------|
| Setup Phase | ✅ Built | Supabase, GitHub, integrations, keys; config flows through pipeline |
| Input Phase | ✅ Built | Goal input, tenant selector, draft trigger |
| Golden Path Phase | ✅ Built | Review + optional refinement answers |
| Menu Phase | ✅ Built | Full story display, capability badges, AI mode selection, refinement loop |
| Done Phase | ✅ Built | Success confirmation, project board link |
| API Routes | ✅ Built | draft, generate, commit, autobuild modes |
| Database Persistence | ✅ Built | os_projects + byred_tasks with setup_config JSON |
| Integration Awareness | ⚠️ Partial | Selected integrations stored but not used in AI prompts yet |
| Secrets Vault | ⚠️ Partial | API keys accepted but not encrypted/persisted |
| GitHub Automation | ⚠️ Partial | Repo input accepted but "Create New" is placeholder |
| Error Handling | ✅ Built | Client + server error messages displayed |
| State Management | ✅ Built | All flows preserved across steps |
| Styling | ✅ Built | Consistent dark theme, responsive grid layouts |
| Team Assignment | ✅ Built | Claude assigns from roster, resolved by name matching |

---

## END OF AUDIT
