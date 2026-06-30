# ByRedLLC Learning Loop

Purpose: project adapter for the universal Penn Enterprises learning loop.

Canonical standard:

- `/Users/kp/Agents/UNIVERSAL_LEARNING_LOOP.md`
- `/Users/kp/Agents/core/CORE_LEARNING_STANDARD.md`
- `/Users/kp/Agents/operations/LEARNING_LOOP_HARD_GATE.md`
- `/Users/kp/Agents/operations/SAAS_TEAM_ACTIVATION.md`

Hard activation term:

```text
SAAS TEAM MODE
```

ByRedLLC stores:

- `LOOP_ROUTING_MAP.json` - machine-readable routing for where a learning belongs.
- `MOTIONS_LIBRARY.md` - replayable UI and workflow motions.
- `LEARNING_LEDGER.md` - verified lessons, failures, fixes, and prevention rules.
- `RECIPES.md` - reusable solution patterns.

Rules:

1. Reuse first: before touching a feature, read this adapter plus the matching store.
2. Capture after: any verified feature click, provider handoff, bug fix, deployment, env change, or UI proof gets categorized here.
3. Receipts decide truth: chat-only notes are not reusable learning.
4. Keep lanes separate: web-app, iOS, provider-team, deployment, dashboard-UX, and universal candidates route to different homes.
5. Never store secrets, tokens, cookies, or raw env values.

Status vocabulary:

- `verified` - proven in this session with a receipt.
- `pending_verification` - useful but not yet proven.
- `rejected` - tried and proven wrong.
- `not_reusable` - one-off result that should stay only in the task receipt.

Session end gate:

Run:

```bash
node learning-loop/scripts/audit-learning-loop.mjs
```

If the audit fails, add or fix the required receipt/learning record before claiming the session is complete.
