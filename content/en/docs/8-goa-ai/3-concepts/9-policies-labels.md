---
title: "Policies, Caps & Labels"
linkTitle: "Policies & Labels"
weight: 9
description: "Learn how Goa-AI enforces caps, time budgets, and policies around agent runs using design-time RunPolicy and runtime overrides."
---

## Design-Time RunPolicy

At design time, you configure per-agent policies with `RunPolicy`:

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

This becomes a `runtime.RunPolicy` attached to the agent’s registration:

- **Caps**:
  - `MaxToolCalls` – total tool calls per run.
  - `MaxConsecutiveFailedToolCalls` – consecutive failures before abort.
- **Time budget**:
  - `TimeBudget` – wall-clock budget for the run.
  - `FinalizerGrace` (runtime-only) – optional reserved window for finalization.
- **Interrupts**:
  - `InterruptsAllowed` – opt-in for pause/resume.
- **Missing fields behavior**:
  - `OnMissingFields` – governs what happens when validation indicates missing fields
    (`"finalize"`, `"await_clarification"`, `"resume"`).

These are **strong defaults**: the runtime enforces them on every run unless
overridden explicitly.

## Runtime Policy Overrides

In some environments you may want to tighten or relax policies without changing
the design (experiments, backoffs, temporary overrides). The runtime exposes:

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

Only non-zero fields (and `InterruptsAllowed` when true) are applied; unspecified
fields keep the design-time defaults.

Guidelines:

- use **design-time RunPolicy** for stable, contract-level bounds,
- use **`OverridePolicy`** sparingly for local experiments or emergency caps.

## Labels and Policy Engines

Goa-AI integrates with pluggable policy engines via `policy.Engine`. Policies
receive:

- tool metadata (IDs, tags),
- run context (SessionID, TurnID, labels),
- and `RetryHint` information after tool failures.

Policy decisions can:

- allow/deny tools,
- adjust caps or time budgets,
- or annotate runs with additional labels.

Labels flow into:

- `run.Context.Labels` – available to planners during a run,
- `run.Record.Labels` – persisted with run metadata (useful for search/dashboards).

Examples:

- marking runs with `{"tenant":"acme","priority":"high"}`,
- tagging runs that triggered a particular policy branch for later analysis.

## How Policies and RetryHints Work Together

When a tool fails and returns a `RetryHint` (see the **Tool Validation & Retry Hints**
page), the runtime converts it into `policy.RetryHint` and passes it into the policy
engine before deciding how to proceed:

- policies can:
  - reduce caps or disable problematic tools for the rest of the run,
  - mark runs for review via labels,
  - or leave decisions entirely to the planner.
- planners can:
  - repair and retry calls based on `RetryHint`,
  - escalate to `AwaitClarification`,
  - or finalize with a best-effort answer.

Design intent:

- **RunPolicy** defines **what is allowed** and **global limits**,
- **RetryHint** explains **what went wrong** for a specific tool call,
- **Policy engines** decide **how to adapt** future behavior for this run (and
  optionally future runs) based on both.


