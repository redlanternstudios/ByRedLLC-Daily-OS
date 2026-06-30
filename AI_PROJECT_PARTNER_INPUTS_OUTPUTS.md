# AI Project Partner: Inputs & Outputs Breakdown

Complete data flow for each step of the 5-step planning process.

---

## STEP 0: SETUP

### Inputs
**User Actions:**
- Selects Supabase repository (dropdown: "rorysemeah-prod", "keymon-prod", "shared")
- Enters GitHub repository name (text input: e.g., "redlanternstudios/project-name")
- Checks integration checkboxes (v0, Claude, GitHub, Slack, n8n, Vercel, Stripe, Notion MCP)
- Enters API keys for selected integrations (password fields, optional at this stage)
- Clicks "Continue to planning"

**From Browser State:**
- `tenantId` (user's tenant)
- Current authenticated user profile

### Processing
- Form validation: required fields only (at minimum, can continue without APIs)
- Build `SetupConfig` object:
  ```typescript
  {
    supabaseRepo?: string
    githubRepo?: string
    selectedIntegrations: string[]
    apiKeys: Record<string, string>
  }
  ```
- Store in React state (not persisted to DB yet)

### Outputs
**UI State:**
- `setup` object stored in component state
- Navigation to STEP 1 (Input)
- Setup config displayed as read-only info card during planning phases

**Data Passed Forward:**
- `setup` object carried through all subsequent steps
- Included in final commit payload to API

**Database Changes:**
- None yet (setup stored in memory only)

---

## STEP 1: INPUT

### Inputs
**User Actions:**
- Types project goal (textarea: "e.g. Launch a simple booking page...")
- Selects project tenant (dropdown, pre-selected to current tenant)
- Clicks "Draft the golden path"

**From Previous Steps:**
- `setup` config from Step 0 (read-only display)
- `tenantId` (validated from user session)

**From Browser:**
- Current authenticated user ID
- Tenant context

### Processing
**Client-side:**
1. Validate goal is non-empty
2. Validate tenantId exists
3. Build draft request payload:
   ```typescript
   {
     mode: "draft",
     goal: string,
     tenantId: string,
     setupConfig?: SetupConfig
   }
   ```

**Server-side (POST /api/os/planner):**
1. Authenticate user (check session)
2. Verify tenantId belongs to user
3. Call `generateDraft()` via Claude API (anthropic)
   - System prompt includes setup config (Supabase, GitHub, integrations)
   - User prompt: goal + team context
4. Parse Claude response into structured draft:
   ```typescript
   {
     goal_restatement: string,
     clarifying_questions: string[],
     assumptions: string[],
     risks: string[],
     proposed_epics: [{name, goal}]
   }
   ```
5. Return draft to client

### Outputs
**UI State:**
- `draft` object stored in component state
- Navigation to STEP 2 (Golden Path)
- Goal, clarifying questions, assumptions, risks, proposed epics displayed

**Data Passed Forward:**
- `draft` object
- `goal` (original user input)
- `setup` config (still in state)

**Database Changes:**
- None (draft is ephemeral, not persisted)

**API Response Structure:**
```json
{
  "goal_restatement": "...",
  "clarifying_questions": ["Q1", "Q2", "Q3"],
  "assumptions": ["A1", "A2"],
  "risks": ["R1", "R2"],
  "proposed_epics": [
    {"name": "Epic 1", "goal": "..."},
    {"name": "Epic 2", "goal": "..."}
  ]
}
```

---

## STEP 2: GOLDEN PATH

### Inputs
**From Previous Steps:**
- `goal` (user's original goal)
- `draft` (Claude-generated plan outline)
- `setup` config
- `tenantId`, user profile

**User Actions:**
- Reads clarifying questions, assumptions, risks, epics (review only)
- Types refinement prompts (textarea: optional suggestions to improve plan)
- Optionally modifies any field
- Clicks "Generate the full plan" or "Refine further"

**From Team Context:**
- `byred_users` for current tenant (team members for assignment)

### Processing
**Client-side:**
1. Collect refinement input (optional)
2. Build generate request:
   ```typescript
   {
     mode: "generate",
     goal: string,
     draft: DraftOutput,
     refinement_prompt: string,
     tenantId: string,
     setupConfig?: SetupConfig
   }
   ```

**Server-side (POST /api/os/planner):**
1. Authenticate and verify tenantId
2. Fetch team members for tenant:
   ```sql
   SELECT byred_users WHERE tenant_id = $1
   ```
3. Call Claude API with full planning prompt:
   - Goal + draft + refinement input
   - Team context (members available for assignment)
   - Setup config (available integrations and repos)
   - System prompt for full epic/story generation
4. Parse Claude response into full plan:
   ```typescript
   {
     project_name: string,
     project_summary: string,
     epics: [{
       name: string,
       goal: string,
       stories: [{
         title: string,
         user_story: string,
         description: string,
         acceptance_criteria: string[],
         definition_of_done: string[],
         priority: "critical" | "high" | "medium" | "low",
         estimate_minutes: number,
         assignee_name?: string
       }]
     }]
   }
   ```
5. Return full plan to client

### Outputs
**UI State:**
- `plan` object stored in component state
- `answers` (Claude's full response for review)
- Navigation to STEP 3 (Menu)
- Full epics and stories displayed in collapsible grid

**Data Passed Forward:**
- `plan` (full story breakdown)
- `setup` config
- Refinement history (for context)

**Database Changes:**
- None (plan is ephemeral)

**API Response Structure:**
```json
{
  "project_name": "Booking Platform",
  "project_summary": "Simple booking page for Paradise...",
  "epics": [
    {
      "name": "Core Booking Flow",
      "goal": "Users can request quotes",
      "stories": [
        {
          "title": "Create booking form",
          "user_story": "As a customer, I can submit my booking details",
          "description": "...",
          "acceptance_criteria": ["Form validates email", "..."],
          "definition_of_done": ["Code review passed", "..."],
          "priority": "critical",
          "estimate_minutes": 480,
          "assignee_name": "Rory Semeah"
        }
      ]
    }
  ]
}
```

---

## STEP 3: THE MENU

### Inputs
**From Previous Steps:**
- `plan` (full epics and stories)
- `setup` config
- `tenantId`, user profile, team members

**User Actions:**
- Checks/unchecks stories (checkbox per story)
- Selects AI mode per story (buttons: "I do it", "AI drafts", "AI fully executes")
- Optionally refines plan ("drop the multi-language stuff", etc.)
- Clicks "Create all tasks" or "Refine plan"

**From Database:**
- `byred_users` (for validation of assignee_name)
- `byred_teams` if applicable

### Processing
**Client-side:**
1. Build selection map:
   ```typescript
   sel = {
     "0_0": { on: true, mode: "AI_EXECUTE" },
     "0_1": { on: true, mode: "AI_DRAFT" },
     "0_2": { on: true, mode: "HUMAN_ONLY" },
     // ...
   }
   ```
2. Collect refinement input if user entered text
3. If refining: call `POST /api/os/planner` with mode="generate" + refinement
4. If committing: build commit payload:
   ```typescript
   {
     mode: "commit",
     tenantId: string,
     project_name: string,
     project_summary: string,
     setup: SetupConfig,
     items: [{
       epic_name: string,
       title: string,
       user_story: string,
       description: string,
       acceptance_criteria: string[],
       definition_of_done: string[],
       priority: string,
       estimate_minutes: number,
       ai_mode: "AI_EXECUTE" | "AI_DRAFT" | "HUMAN_ONLY",
       assignee_name?: string
     }]
   }
   ```

**Server-side (POST /api/os/planner commit handler):**
1. Authenticate and verify tenantId
2. Create project:
   ```sql
   INSERT INTO os_projects (tenant_id, name, description, setup_config, owner_user_id, created_by_user_id)
   VALUES ($1, $2, $3, $4, $5, $6)
   RETURNING id
   ```
3. For each selected item, create task:
   ```sql
   INSERT INTO byred_tasks (project_id, epic_name, title, user_story, description, acceptance_criteria, definition_of_done, priority, estimate_minutes, ai_mode, assigned_to)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
   ```
4. If `ai_mode` = "AI_EXECUTE" or "AI_DRAFT", queue async autobuild:
   - Store correlation ID
   - Emit domain event: `task.ai_mode_queued`
   - Claude generates full implementation details (code, configs, etc.) async
5. Return created project ID and task counts

### Outputs
**UI State:**
- `created` object: `{created: number, aiQueued: number, projectId: string}`
- Navigation to STEP 4 (Done)

**Database Changes:**
- Insert 1 row: `os_projects` (with setup_config JSON)
- Insert N rows: `byred_tasks` (one per selected story, with ai_mode)
- Emit domain events for AI tasks queued

**Data Returned:**
```json
{
  "projectId": "uuid-1234-5678",
  "created": 12,
  "aiQueued": 5
}
```

**Side Effects:**
- Async: Claude auto-generates implementations for tasks with ai_mode != "HUMAN_ONLY"
- Board: New tasks appear in `/os/board` immediately with ai_mode badges

---

## STEP 4: DONE

### Inputs
**From Previous Step:**
- `created` object: count of created tasks, AI-queued count, projectId
- `plan` (for reference)
- `setup` config

### Processing
**Display Only:**
- Show success confirmation
- Link to `/os/board?project={projectId}`
- Display stats: "12 tasks created. 5 queued for AI implementation"

### Outputs
**UI Actions:**
- Link to project board
- "Plan another" button returns to STEP 0

**Database/API Impact:**
- None (read-only step)

**User Outcomes:**
- Tasks now visible on board with:
  - `ai_mode` badge (HUMAN_ONLY, AI_DRAFT, AI_EXECUTE)
  - Assignee name and profile
  - Priority, estimate, acceptance criteria
  - Status: "queued" for AI tasks, "todo" for human tasks

---

## COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STEP 0: SETUP                               │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  User selections (Supabase, GitHub, integrations, APIs)      │
│ Output: SetupConfig {supabaseRepo, githubRepo, integrations, keys}  │
│ DB:     None (state only)                                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         STEP 1: INPUT                               │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  Goal + TenantId + SetupConfig                              │
│ Output: Draft {goal_restatement, questions, assumptions, risks}    │
│ DB:     None (state only)                                          │
│ Claude: generateDraft() → Parse response                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 2: GOLDEN PATH                              │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  Goal + Draft + Refinement + Setup + Team                   │
│ Output: Plan {project_name, epics[{name, stories[...]}]}           │
│ DB:     None (state only)                                          │
│ Claude: generatePlan() → Parse full epic/story tree                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      STEP 3: THE MENU                               │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  Plan + Selections (checked stories, ai_mode per story)     │
│ Output: Project + Tasks {created: N, aiQueued: M}                  │
│ DB:     INSERT os_projects, INSERT byred_tasks × N                 │
│ Events: task.ai_mode_queued (for AI_EXECUTE/AI_DRAFT tasks)        │
│ Async:  Claude auto-implements AI-queued tasks                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       STEP 4: DONE                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Input:  Created counts + ProjectId                                 │
│ Output: Success confirmation + Board link                          │
│ DB:     None (read-only display)                                   │
│ Action: User clicks board link or "Plan another"                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## KEY DATA STRUCTURES

### SetupConfig (Step 0 → Step 4)
```typescript
type SetupConfig = {
  supabaseRepo?: string                    // "rorysemeah-prod" | "keymon-prod" | "shared"
  githubRepo?: string                      // "org/repo-name"
  selectedIntegrations: string[]           // ["v0", "claude", "slack", "n8n", ...]
  apiKeys: Record<string, string>          // {v0: "...", slack: "...", ...}
}
```

### DraftOutput (Step 1 → Step 2)
```typescript
type DraftOutput = {
  goal_restatement: string
  clarifying_questions: string[]
  assumptions: string[]
  risks: string[]
  proposed_epics: Array<{name: string, goal: string}>
}
```

### Plan (Step 2 → Step 3)
```typescript
type Plan = {
  project_name: string
  project_summary: string
  epics: Array<{
    name: string
    goal: string
    stories: Story[]
  }>
}

type Story = {
  title: string
  user_story: string
  description: string
  acceptance_criteria: string[]
  definition_of_done: string[]
  priority: "critical" | "high" | "medium" | "low"
  estimate_minutes: number
  assignee_name?: string
}
```

### Selections (Step 3)
```typescript
type Sel = {
  on: boolean
  mode: "HUMAN_ONLY" | "AI_DRAFT" | "AI_EXECUTE"
}

type SelectionMap = Record<string, Sel>  // key: "{epicIndex}_{storyIndex}"
```

### CommitPayload (Step 3 → API)
```typescript
type CommitPayload = {
  mode: "commit"
  tenantId: string
  project_name: string
  project_summary: string
  setup?: SetupConfig
  items: Array<{
    epic_name: string
    title: string
    user_story: string
    description: string
    acceptance_criteria: string[]
    definition_of_done: string[]
    priority: string
    estimate_minutes: number
    ai_mode: "AI_EXECUTE" | "AI_DRAFT" | "HUMAN_ONLY"
    assignee_name?: string
  }>
}
```

---

## IMPORTANT NOTES

1. **State Persistence:** SetupConfig is the only data that flows through all 5 steps; everything else is ephemeral until commit.
2. **DB Writes:** All database writes happen at Step 3 commit only. Steps 0-2 are preview/draft only.
3. **AI Queuing:** Tasks with `ai_mode` != "HUMAN_ONLY" trigger async Claude implementation generation after commit.
4. **Refinement Loop:** User can loop back from Step 2 to refine the plan multiple times before committing.
5. **Validation:** All inputs are validated server-side; user IDs, tenant access, and data integrity checked.
