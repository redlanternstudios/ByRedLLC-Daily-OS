# ByRedLLC Motions Library

Replayable UI and workflow paths. Motions require durable locators or URLs, expected state, and proof.

## Web App Motions

### MOTION: Verify My Dashboard First Screen
- Goal: prove the signed-in dashboard renders the intended first-screen hierarchy.
- Surface: `http://127.0.0.1:3000/os/my-dashboard` locally; production route is `https://byredlanternos.com/os/my-dashboard`.
- Replay when: dashboard header, brand, first-screen cards, or theme changes.
- Steps:
  1. Open `/os/my-dashboard` in an authenticated browser session.
  2. Wait for heading `Salam Alaikum, Keymon.`.
  3. Verify supporting text `This is your workflow and the things you need to handle.`.
  4. Verify `Operating Order` is visible.
  5. Verify the logo image alt text if branding changed.
  6. Capture desktop and mobile screenshots.
- Verify receipt: `BYREDLLC_OPERATING_RECEIPT.md`, latest dashboard branding/theme entries.
- Pitfalls: local Next cache can serve stale dashboard bundles; clear `.next` and restart dev server when source and DOM disagree.
- Last verified: 2026-06-29 | Frequency: 4

### MOTION: Verify Operating Order Task Click
- Goal: prove dashboard cards link into real task detail routes.
- Surface: `/os/my-dashboard` -> `/os/tasks/<taskId>`.
- Replay when: cards, task routing, or task detail loading changes.
- Steps:
  1. Open authenticated `/os/my-dashboard`.
  2. Click the `Now` task link from the Operating Order card.
  3. Confirm URL changes to `/os/tasks/<taskId>`.
  4. Wait for task title, status controls, comments, details, and dependencies to render.
- Verify receipt: `BYREDLLC_OPERATING_RECEIPT.md` entry at 2026-06-29 18:22 PT.
- Pitfalls: an early DOM snapshot can look blank while SWR/task API calls are still loading; wait for the task title before calling it broken.
- Last verified: 2026-06-29 | Frequency: 1

## Provider-Team Motions

### MOTION: Verify Provider Env Health
- Goal: prove local provider availability without printing secrets.
- Surface: ByRedLLC repo root.
- Replay when: adding or rotating provider keys/models.
- Steps:
  1. Run `pnpm check:ai-env`.
  2. Confirm configured/missing status only; do not print key values.
  3. For a new provider key, run one minimal live health request and report HTTP/model/status only.
  4. Restart local dev server if app routes need the new env.
- Verify receipt: `BYREDLLC_OPERATING_RECEIPT.md` Gemini/Groq provider entries.
- Pitfalls: health scripts must load `.env.local`; shell-only checks may falsely report missing.
- Last verified: 2026-06-29 | Frequency: 2
