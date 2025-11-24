---
title: "Tool Validation & Retry Hints"
linkTitle: "Tool Validation & Retry Hints"
weight: 6
description: "Learn how Goa-AI turns validation failures into structured ToolError and RetryHint values that LLMs can use to repair tool calls."
---

## Why This Matters

Goa-AI combines **Goa's design-time validations** with a **structured tool error model**
to give LLM planners a powerful way to **repair invalid tool calls automatically**.

Instead of:

- sprinkling ad-hoc validation in executors,
- guessing which fields are missing from opaque error strings, or
- forcing users to fix every bad call manually,

Goa-AI lets you:

- describe precise payload schemas and validations in the Goa design,
- surface failures as structured `ToolError` + `RetryHint` values, and
- teach your planner to **retry with better inputs** based on those hints.

This pattern is one of the best reasons to use Goa-AI for tool-using agents.

## Core Types: ToolError and RetryHint

At planner level (`runtime/agent/planner`):

- **`ToolError`**  
  Alias to `runtime/agent/toolerrors.ToolError`:
  - `Message string` – human-readable summary.
  - `Cause *ToolError` – optional nested cause (preserves chains across
    retries and agent-as-tool hops).
  - Constructors and helpers:
    - `planner.NewToolError(msg string)`
    - `planner.NewToolErrorWithCause(msg string, cause error)`
    - `planner.ToolErrorFromError(err error)`
    - `planner.ToolErrorf(format, args...)`.

- **`RetryHint`**  
  Planner-side hint used by the runtime and policy engine:

  ```go
  type RetryHint struct {
      Reason             RetryReason
      Tool               tools.Ident
      RestrictToTool     bool
      MissingFields      []string
      ExampleInput       map[string]any
      PriorInput         map[string]any
      ClarifyingQuestion string
      Message            string
  }
  ```

  Common `RetryReason` values:

  - `invalid_arguments` – payload failed validation (schema/type).
  - `missing_fields` – required fields are missing.
  - `malformed_response` – tool returned data that could not be decoded.
  - `timeout`, `rate_limited`, `tool_unavailable` – execution/infra issues.

The runtime converts planner hints into a runtime/policy form
(`policy.RetryHint`) with the same fields; policy engines and UIs can then
react (adjust caps, disable tools, display repair suggestions).

## Where Validation Comes From

Validation is **design-driven**:

- In your Goa design, you describe tool payloads (`Args`) with:
  - `Attribute` types,
  - `Required(...)`,
  - constraints (`MinLength`, `Maximum`, `Enum`, etc.),
  - descriptions and examples.
- Goa-AI codegen emits:
  - **typed payload/result structs**, and
  - **validators/codecs** that enforce those rules at the tool boundary.

When a tool payload fails validation (e.g., a missing required field), the
generated code and runtime can:

- produce a `ToolError` with a concise message, and
- attach a `RetryHint` that tells the planner **exactly how to repair** the call.

You do not need to write custom parsers for error strings; the pattern is
standardized.

## ToolResult: Carrying Errors and Hints

Every tool invocation surfaces as a `planner.ToolResult`:

```go
type ToolResult struct {
    Name          tools.Ident
    Result        any
    Error         *ToolError
    RetryHint     *RetryHint
    Telemetry     *telemetry.ToolTelemetry
    ToolCallID    string
    ChildrenCount int
    RunLink       *run.Handle
}
```

Key points:

- On success:
  - `Result` contains the decoded result (or raw JSON as a fallback).
  - `Error` and `RetryHint` are nil.
- On validation or execution failure:
  - `Error` describes what went wrong in a planner/UI-friendly way.
  - `RetryHint` (when present) explains **how to try again**.

The runtime:

- receives a logical tool output from your executor or activity,
- wraps any failure message into a `ToolError`,
- attaches any `RetryHint` produced at the boundary, and
- publishes a `ToolResultReceivedEvent` (and corresponding `stream.ToolEnd` event)
  with a structured `toolerrors.ToolError` payload for UIs.

## Pattern: Auto-Repairing Invalid Tool Calls

The recommended pattern is:

1. **Design tools with strong payload schemas** (Goa design).
2. **Let executors/tools surface validation failures** as `ToolError` +
   `RetryHint` instead of panicking or hiding errors.
3. **Teach your planner** to:
   - inspect `ToolResult.Error` and `ToolResult.RetryHint`,
   - repair the payload when possible (or ask the user), and
   - retry the tool call if appropriate.

### Example Executor (Pseudo-Code)

Conceptual executor for a tool that upserts a record:

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (*planner.ToolResult, error) {
    // Decode using generated codec
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        // Validation / decode error → structured ToolError + RetryHint
        return &planner.ToolResult{
            Name: call.Name,
            Error: planner.NewToolError("invalid payload"),
            RetryHint: &planner.RetryHint{
                Reason:        planner.RetryReasonInvalidArguments,
                Tool:          call.Name,
                RestrictToTool: true,
                Message:       "Payload did not match the expected schema.",
                // Optionally: MissingFields, ExampleInput, ClarifyingQuestion...
            },
        }, nil
    }

    // Call the underlying service
    res, err := client.Upsert(ctx, args)
    if err != nil {
        return &planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }, nil
    }

    // Success: return result as usual
    return &planner.ToolResult{
        Name:   call.Name,
        Result: res,
    }, nil
}
```

### Example Planner Logic

On `PlanResume`, your planner can inspect the last tool result:

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolResults) == 0 {
        // Nothing to do
        return &planner.PlanResult{}, nil
    }

    last := in.ToolResults[len(in.ToolResults)-1]
    if last.Error != nil && last.RetryHint != nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
            // Strategy 1: Ask the user for clarification (AwaitClarification)
            return &planner.PlanResult{
                Await: &planner.Await{
                    Clarification: &planner.AwaitClarification{
                        ID:               "fix-" + string(hint.Tool),
                        Question:         hint.ClarifyingQuestion,
                        MissingFields:    hint.MissingFields,
                        RestrictToTool:   hint.Tool,
                        ExampleInput:     hint.ExampleInput,
                        ClarifyingPrompt: hint.Message,
                    },
                },
            }, nil

        case planner.RetryReasonTimeout, planner.RetryReasonRateLimited:
            // Strategy 2: Back off or switch tools (implementation-specific)
        }
    }

    // Default: synthesize a final answer from tool results
    // ...
    return &planner.PlanResult{/* FinalResponse, next ToolCalls, ... */}, nil
}
```

This pattern lets the LLM (via your planner code) **repair tool calls** rather
than failing the run outright.

## How Goa-AI Uses Goa to Make This Work

Goa-AI leverages Goa’s design and codegen in several ways:

- **Design-time validation**  
  The Goa design for a tool’s payload defines:
  - required vs optional fields,
  - allowed values, formats, and ranges,
  - descriptions and examples.

- **Generated validators and codecs**  
  For each tool payload:
  - Goa-AI emits typed structs and validation logic.
  - Validation errors at the boundary can be mapped into concise messages and
    field-level hints.

- **Runtime hint building**  
  The runtime and activity layer:
  - capture validation failures at the **tool boundary** (before executing
    the underlying service),
  - preserve error chains as `ToolError`,
  - attach any available `RetryHint` to the `ToolResult`, and
  - avoid aborting the entire workflow when a single tool call is invalid.

Because the design and runtime agree on schemas, you can rely on a **uniform
error/hint contract** for all tools, whether they are:

- service-backed,
- agent-backed (agent-as-tool),
- or MCP-backed.

## Best Practices

- **Put validations in the design, not in planners**  
  Use Goa’s attribute DSL (`Required`, `MinLength`, `Enum`, etc.). Let
  generated validators and codecs enforce them; surface structured errors
  and hints at the tool boundary.

- **Return ToolError + RetryHint from executors**  
  Prefer:

  ```go
  return &planner.ToolResult{
      Name:  call.Name,
      Error: planner.NewToolError("..."),
      RetryHint: &planner.RetryHint{ /* structured guidance */ },
  }, nil
  ```

  over panics or plain `error` returns.

- **Keep hints concise but actionable**  
  Focus on:
  - which fields are missing/invalid,
  - a short clarifying question,
  - a small `ExampleInput` map with corrected values.

- **Teach planners to read hints**  
  Make `RetryHint` handling a first-class part of your planner:
  - repair and retry when safe,
  - ask the user via `AwaitClarification` when needed,
  - fall back to final answers otherwise.

- **Avoid re-validating inside services**  
  Goa-AI assumes validation happens at the tool boundary; internal service
  logic should trust validated inputs and focus on domain behavior.

For a deep dive into future enhancements (schema-aware hint builders, richer
field issues), see `docs/tool_validation_retry_hints.md` in the goa-ai repo.


