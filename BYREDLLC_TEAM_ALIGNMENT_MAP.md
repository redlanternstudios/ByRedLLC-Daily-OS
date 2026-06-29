# ByRedLLC Team Alignment Map

Verified on 2026-06-29 from the live ByRedLLC OS data in Supabase.

## Source-Of-Truth Rules

- ByRed OS / Supabase owns tasks, owners, statuses, priorities, blockers, due dates, comments, and receipts.
- GitHub owns source code, migrations, runbooks, and durable implementation history.
- Vercel owns production deployments and deployment proof.
- Supabase Storage owns OS-uploaded profile and app assets.
- Google Drive owns original business files, docs, and brand assets before they are attached to the OS.
- Codex owns execution support, audits, cleanup recommendations, verified receipts, and safe task operations.
- KP owns L2 authority: legal exposure, pricing, public commitments, client commitments, purchases, and irreversible decisions.

## Naming Guardrails

- Correct company/project name: ByRedLLC.
- Correct production OS: https://byredlanternos.com.
- Do not use Monday.com as an operating source.
- Do not use localhost-only state as proof for live OS decisions.
- Do not use typo naming such as Bay Red LLC or BayRed.

## Real-Team Lanes

These lanes are the starting map, not a final legal or HR roster.

- KP: Principal PM, decision owner, revenue priorities, L2 approvals, task routing, final acceptance.
- Rory: execution lead for scoped technical/admin work after load balancing.
- Homira: operations, brand, vendor/admin follow-through.
- Basheer: Paradise Property Services field/service lane.
- Mohamed: AI Front Desk support and warm-intro outreach lane.
- Codex: PM execution support, OS cleanup, code changes, audits, receipts, and verification.

## Live Alignment Snapshot

Live audit source: `byred_users`, `byred_tenants`, and `byred_tasks`.

- Active tasks: 279.
- Initial unassigned active tasks: 43.
- Current verified unassigned active tasks after cleanup: 0.
- Rory active tasks: 133.
- Rory critical tasks: 36.
- Rory overdue tasks: 83.
- KP active tasks: 39.
- KP critical tasks: 12.

## OS Control Tasks

- `ee613171-a92d-4033-8f9f-db2c6efe9c98` - Team Alignment: lock real-team lanes and unassigned intake.
- `02c7f866-6a3a-4d60-8aca-913754caae64` - Team Alignment: separate real team from test accounts.
- `c37f2313-71e9-4af6-aa85-415add291884` - Team Alignment: triage 43 unassigned tasks.
- `b87113f8-1910-41fc-af38-25c5c07e9a34` - Team Alignment: load-balance Rory's active task stack.

## Cleanup Order

1. Confirm real operators versus test or duplicate accounts.
2. Reduce Rory overload by cancelling stale work, moving lane-correct work, and escalating L2 tasks.
3. Keep KP's My Dashboard focused on PM decisions, critical revenue work, and proof gates.
4. Log verified receipts for each material alignment pass.

## Completed Intake Cleanup

- Cancelled 5 stale Team Pulse 2022 tasks.
- Routed 5 L2/legal/spend tasks to KP as blocked.
- Routed 4 Davier/Muf AI Front Desk tasks to KP as blocked because those named operators did not have verified OS user rows.
- Routed 6 Paradise field/service tasks to Basheer.
- Routed 12 Paradise ops/vendor/admin tasks to Homira.
- Routed 5 technical proof tasks to Rory.
- Routed 6 authority or unclear tasks to KP as blocked.
- Closed `c37f2313-71e9-4af6-aa85-415add291884` after live read-back confirmed active unassigned tasks were 0.

## Receipt

- OS agent receipt: `d3e3e5b5-fa40-4db5-90d8-a81f05cb5ba0`.
- Main task comment: `f4b85540-bb39-409b-98d4-a8a029415219`.
- Main task activity: `e531900c-8eba-4598-800e-6a7acab60191`.
- Unassigned cleanup receipts:
  - `1f777712-79df-4fbc-9390-6b35bbe665b9`
  - `0b6ce7d9-71a4-48e7-869b-3e62f8bb7bc4`
  - `7ea1ec7d-0fe7-4850-8248-82871e526693`
  - `583388fb-e21f-41fa-ae53-43c2917eb628`

## Undo Path

- To reverse the OS setup, cancel the four `Team Alignment:` tasks instead of deleting them.
- To reverse this repo document, remove this file in a new Git commit.
- Do not delete users, deactivate accounts, or mass-reassign task owners without KP approval and a verified before/after receipt.
