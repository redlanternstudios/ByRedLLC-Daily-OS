# By Red LLC OS — Connectors & Command Architecture Audit

## Current State Overview

### 1. Data Access Layer (`lib/data/`)
**Pattern**: Read-only Server Functions with Tenant Scoping
- `getTasks()`, `getTasksByTenant()`, `getBlockedTasks()`, `getRecentTasks()` — pure read functions
- All queries scoped via `getUserTenantIds()` — enforces row-level security (RLS) client-side
- Maps raw DB rows to typed entities via `mapTaskFromDb()`
- No parameterized inputs — all queries are deterministic reads

**Current Entities**:
- Tasks (byred_tasks)
- Leads (byred_leads) 
- Tenants (byred_tenants)
- Activities (audit log)
- Projects (calendar integration)
- Comms/Messages
- CRM Companies/Contacts
- Automations
- Workflows
- KPIs

### 2. API Routes (`app/api/os/`)
**Pattern**: Shallow REST-like handlers (GET only for most routes)
- `GET /api/os/tasks/triage` — AI task bucketing (POST to Groq)
- `GET /api/os/projects/tasks` — list tenant tasks
- `GET /api/os/calendar/route.ts` — calendar events
- `POST /api/os/generate-pulse` — AI team digest generation
- `POST /api/os/comms/messages` — message creation
- CRM routes (companies, contacts) — read-only GETs

**Issues**:
- No unified mutation endpoints (POST/PUT/PATCH/DELETE for tasks, projects, assignments)
- No generic bulk operations (batch create, delete, reassign)
- No command/event bus for distributed state changes
- No audit trail for mutations

### 3. Form/Input Patterns (`components/byred/`)
**Components Found**:
- `MentionTextarea` — comment input with @mentions
- `StatusBadge` — dropdown select for task status
- `DueDateCell` — date picker for task due dates
- `LeadDetail` — inline form for lead edits (textarea, date inputs)
- `TaskDetail` — modal with inline field edits
- `TaskComments` — comment form with mentions
- `TaskTable` — inline row editing (limited)

**Issues**:
- No centralized command/action handler — each component handles its own API calls
- No consistency in loading states, error handling, optimistic updates
- No global mutation state — components directly call APIs
- Form validation scattered across components
- No undo/redo support

### 4. Command/Mutation Patterns (Missing)
**What Exists**:
- `setActiveTenantAction()` in `lib/actions/tenant.ts` — single server action
- Inline mutations in components (form submissions calling `/api/os/*`)
- No centralized command definition or routing

**What's Missing**:
- No command registry (list all available OS commands)
- No command validation layer
- No atomic multi-entity mutations
- No soft deletes/archiving
- No assignment history
- No command audit trail
- No optimistic concurrency (no version fields)

---

## Suggested Architecture: Unified Command System

### A. Centralized Command Registry

Create `lib/commands/index.ts` — single source of truth for all OS operations:

```
Commands:
- CreateTask(title, tenantId, assignee)
- UpdateTask(taskId, fields: {status?, priority?, dueDate?, assignee?})
- DeleteTask(taskId, reason?) — soft delete with audit
- AssignTask(taskId, userId)
- ReassignTask(taskId, fromUserId, toUserId) — log reassignment history
- BulkUpdateTasks(taskIds[], fields) — atomic batch

- CreateProject(name, tenantId, owner)
- UpdateProject(projectId, fields)
- ArchiveProject(projectId)

- CreateAssignment(taskId, userId, dueDate?)
- UpdateAssignment(assignmentId, fields)
- CompleteAssignment(assignmentId)
- RejectAssignment(assignmentId, reason?)

- CreateTenant(name, owner)
- AddUserToTenant(userId, tenantId, role)
- RemoveUserFromTenant(userId, tenantId)

- AddComment(taskId, text, mentions[])
- DeleteComment(commentId) — soft delete

Action Types (for audit):
- CREATED, UPDATED, DELETED, ASSIGNED, REASSIGNED, COMPLETED, COMMENTED
```

### B. Input/Form Abstraction Layer

Create `lib/forms/` — validated, typed command builders:

```
- createTaskForm(schema) — validates title, priority, estimate, dueDate
- updateTaskForm(taskId, schema) — validates only changed fields
- assignmentForm(schema) — validates user access, date conflicts
- bulkForm(schema) — batch validation with partial error recovery
```

All forms export:
- Schema (Zod or similar)
- Errors (type-safe error messages)
- Defaults (smart defaults per context)

### C. Unified Mutation Endpoint

Replace scattered `/api/os/*/route.ts` with `/api/os/commands/[command]/route.ts`:

```typescript
// POST /api/os/commands/task:create
{ title, tenantId, priority, dueDate, assignee? }

// PATCH /api/os/commands/task:update
{ taskId, fields: {status?, priority?, assignee?} }

// DELETE /api/os/commands/task:delete
{ taskId, reason? }

// POST /api/os/commands/task:assign
{ taskId, userId }

// POST /api/os/commands/tasks:bulk-update
{ taskIds, fields }
```

Benefits:
- Single entry point for auth/rate-limiting/audit
- Consistent error format
- Atomic transaction boundaries
- Audit trail on every command

### D. Command Execution Pipeline

Create `lib/commands/executor.ts`:

```typescript
interface CommandContext {
  userId: string
  tenantId: string
  requestId: string // for audit trail
}

async function executeCommand(
  command: CommandName,
  params: unknown,
  context: CommandContext
) {
  // 1. Validate input via schema
  // 2. Check permissions (RBAC)
  // 3. Run pre-hooks (e.g., check if task is locked)
  // 4. Execute mutation in transaction
  // 5. Run post-hooks (e.g., notify assignee, update metrics)
  // 6. Emit audit event
  // 7. Return result with metadata
}
```

### E. Form Component Integration

Refactor `TaskDetail`, `LeadDetail`, etc. to use command system:

```typescript
// Before: component calls API directly
const handleUpdate = async (fields) => {
  await fetch(`/api/os/tasks/${taskId}`, { 
    method: 'PATCH',
    body: JSON.stringify(fields) 
  })
}

// After: component uses command hook
const handleUpdate = async (fields) => {
  const result = await executeCommand('task:update', {
    taskId,
    fields
  }, context)
  
  if (result.error) {
    showError(result.error.message) // Consistent error handling
  } else {
    optimisticUpdate(result.data)    // Consistent optimistic UI
  }
}
```

### F. Data Modifications Audit Trail

Add to every mutation:

```typescript
CREATE TABLE command_audit (
  id UUID PRIMARY KEY,
  command_name VARCHAR,
  entity_type VARCHAR, -- 'task', 'project', etc.
  entity_id UUID,
  user_id UUID,
  tenant_id UUID,
  params JSONB, -- what was sent
  result JSONB, -- what changed
  error JSONB, -- if failed
  executed_at TIMESTAMP,
  request_id UUID -- correlate multiple commands
)
```

Enables:
- Full undo/redo per entity
- Change history on detail pages
- Compliance audits
- Debugging state mismatches

---

## Implementation Priority

### Phase 1: Core Infrastructure (No UI changes)
1. Create command registry (`lib/commands/`)
2. Build validation layer (`lib/forms/`)
3. Add executor with transaction support
4. Create unified `/api/os/commands` handler
5. Wire audit trail to DB

### Phase 2: Component Migration (Bottom-up)
1. Start with `TaskDetail` — refactor to use command hooks
2. Migrate `MentionTextarea` → integrated with command system
3. Update `TaskTable` inline edits
4. Migrate all forms to use validators

### Phase 3: Advanced Features
1. Soft deletes & archiving
2. Assignment history + reassignment audit
3. Optimistic concurrency (version fields)
4. Undo/redo UI
5. Bulk operations modal

---

## Key Improvements This Enables

✅ **Consistency**: All mutations through same pipeline
✅ **Auditability**: Every change logged with user/tenant/timestamp
✅ **Reliability**: Atomic transactions, rollback on error
✅ **Type Safety**: Command params validated server + client
✅ **Testability**: Pure command functions, easy to mock
✅ **Extensibility**: Pre/post hooks for notifications, metrics, webhooks
✅ **User Experience**: Optimistic updates, consistent errors, loading states
✅ **Debugging**: Request IDs trace commands through system

---

## No Changes Needed (Working Well)

- Tenant scoping via `getUserTenantIds()` — solid RLS pattern
- Read-only data layer (`lib/data/`) — correct separation
- Component display logic — keep as is
- Existing AI integration (triage, pulse) — integrate via command hooks
