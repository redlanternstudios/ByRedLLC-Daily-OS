# ByRedLLC AI Provider Stack

Date: 2026-06-29T00:00:00-07:00

Live provider check: 2026-06-29T16:59:00-07:00

## Canonical Source

The cross-system source of truth is:

```text
/Users/kp/Agents/operations/AI_PROVIDER_ROUTER.md
```

This ByRedLLC file is a project adapter. It defines how ByRedLLC consumes the shared router; it does not replace the canonical strategy.

## ByRedLLC Operating Rule

Gemini, DeepSeek, and Groq are complementary intelligence providers for ByRedLLC OS. They must improve planning, feature review, UI critique, code reasoning, brief generation, and test design without becoming required dependencies for normal OS work.

Core flows that must work without Gemini, DeepSeek, or Groq:

- Sign in and tenant-scoped OS navigation
- My Dashboard, Tasks, Projects, Today, and Team Pulse data views
- Manual task creation, assignment, status changes, and blocker handling
- Verified OS receipt reads and writes
- Existing LanternAI and planner behavior where their own configured providers are available

## Provider Roles

| Provider | Role | Best use | Dependency rule |
| --- | --- | --- | --- |
| Anthropic | Primary | LanternAI, planner reasoning, PM structure | Existing AI routes may depend on its key, but OS navigation cannot |
| Groq | Open-weight speed lane | Fast daily briefs, task triage, repeatable summaries | Briefs can degrade without blocking task data |
| Gemini | Complement | Multimodal review, screenshots, large context, dashboard UX critique | Optional only |
| DeepSeek | Complement | Code reasoning, implementation options, cost-aware second-pass review | Optional only |

## Verified Model Defaults

| Provider | Env override | Default model | Verification |
| --- | --- | --- | --- |
| Groq | `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq deprecation docs recommend it as the replacement for `llama-3.3-70b-versatile`, which shuts down on 2026-08-16. |
| Gemini | `GEMINI_MODEL` | `gemini-2.5-flash` | Google model docs list `gemini-2.5-flash` for large-scale, low-latency, high-volume agentic use cases. |
| DeepSeek | `DEEPSEEK_MODEL` | `deepseek-v4-flash` | DeepSeek docs list `deepseek-v4-flash` and note `deepseek-chat` retires on 2026-07-24. |

## Environment

Use `.env.local` for local development and Vercel environment variables for production. Do not commit real keys.

Keep provider keys separate. Do not reuse one vendor key under another provider name, and do not place Gemini or DeepSeek keys in public `NEXT_PUBLIC_*` variables.

Required only when enabling the complementary provider:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
GROQ_MODEL=openai/gpt-oss-120b
OS_AI_COMPLEMENTARY_PROVIDERS=gemini,deepseek
```

## Verification Surface

Authenticated provider status endpoint:

```text
/api/os/ai/providers
```

The endpoint reports whether providers are configured without exposing secret values.

Authenticated read-only advisor endpoint:

```text
/api/os/ai/advisor
```

This endpoint lets DeepSeek produce implementation plans, bug hypotheses, test plans, and code-review notes from verified OS receipts. It cannot mutate data, close tasks, deploy, send email, or mark work complete.

## Agent Learning Boundary

Feature agents can use only verified OS receipts as reusable learning context. Do not treat chat-only notes, localhost-only observations, stale Monday.com logic, or typo names such as `Bay Red LLC` as durable truth.
