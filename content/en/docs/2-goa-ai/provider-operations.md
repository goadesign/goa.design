---
nav_group: guides
title: "Provider-Owned Operations"
weight: 35
description: "Call exported Agent operations and registered tools without importing provider implementations."
llm_optimized: true
---

Call exported Agent operations and registered tools without importing provider implementations.

## Start an operation

A host authorizes the caller, then submits the generated operation declaration and
original arguments. `StartOperation` uses an existing host-owned session;
`StartOneShotOperation` creates no session. The provider worker validates its own export
and prepares the selected immutable configuration. The consumer needs no private Agent
definition or `WithAgentExecutors` wiring.

```go
handle, err := rt.StartOneShotOperation(
    ctx, runID, operation, arguments, labels, nil,
)
if err != nil {
    return err
}
output, err := handle.Wait(ctx)
if err != nil {
    return err
}
```

Use `StartToolOperation` or `StartOneShotToolOperation` for an exact retained Registry
selection and its `RegisteredInvocation`. Configure the same Registry source and
generated client. Native Agent operations use their declared workflow and queue. Service
operations use `WithToolWorkflowQueue` and a worker calling `RegisterToolWorkflow`; they
need no Agent, planner, model, or conversation. A registration or label is not an access
credential.

When the caller also needs an idempotent start-and-wait helper that recovers from
interrupted starter processes, use `EnsureOperationCompletion`,
`EnsureOneShotOperationCompletion`, `EnsureToolOperationCompletion`, or
`EnsureOneShotToolOperationCompletion`. Pass `runtime.WithTextOnly(true)` when a
one-shot or session operation must return a direct assistant text reply without
calling tools, or `runtime.WithRootExecutionTarget(target)` (using
`rt.CurrentWorkflowTarget(ctx, queue)` on the sticky worker) when an operation
must execute on a specific pinned worker queue.

When a provider worker needs to serve an operation contract across compatible
revision changes, register the revision-owned contract with
`rt.RegisterAgentOperationProvider` before sealing the runtime.

## Select history explicitly

Register `AgentToolResolver` on the provider worker before sealing or submitting work.
Its signature is `func(context.Context, genregistry.ExecutionInvocation, string,
*runtime.ToolCall) (*runtime.AgentToolConfiguration, error)`. It receives the original
invocation, immutable configuration reference, and validated provider call. Return
required `History`, labels, policy, optional metadata and rendered prompt references.

```go
configuration := &runtime.AgentToolConfiguration{
    History: runtime.LiteralAgentHistory(messages),
    Labels: labels,
    Policy: policy,
}
```

For a later turn, use `runtime.NextTurnAgentHistory(completedRunID, systemMessages,
freshMessages)`. The source must be a successfully completed run of the same Agent and
session. Fresh messages cannot contain system messages. `WithoutPriorReasoning()`
excludes prior reasoning from supplied and inherited history; that exclusion survives
later turns. One-shot operations cannot inherit another session’s history. Exact replay
reuses the accepted preparation rather than selecting newer history or configuration.

## Results, input, and cancellation

The engine owns accepted work before provider preparation. Repeating the exact request
observes the original execution; changing accepted input conflicts. A failure or
cancellation before the first runtime run record still has an engine-backed terminal
outcome. Observe accepted engine work before concluding that an absent runtime record
means nothing started.

Common run inputs, outputs, records, and snapshots require generated `Subject`: either
the actual Agent identifier or the service tool’s Registry source and qualified name. A
service tool has no fabricated Agent or hidden session. Agent-only clients and model
history still require an Agent identity.

`planner.PlanInput.ParentTool` and `planner.PlanResumeInput.ParentTool` carry the
selected result contract for delegation and direct Agent operations. A planner returns
`planner.FinalToolResult` matching that contract; conversation text alone is rejected.
Use `FinalToolResult` for the successful typed result and `Final` for assistant text.
Load paged run events only when diagnostic history is needed.

When input is required, continuation restores the original operation, preserves the
accepted caller metadata (`Metadata`), and admits one successor. For service tools, the
host durably saves the predecessor, successor run ID, and typed answer; its worker calls
`StartToolContinuation` and `EnsureToolContinuationCompletion` (passing any workflow
`memo map[string]any` as the final argument). Parent cancellation follows accepted child
relationships and retains unfinished cleanup. Completion must not depend on a client
retry.

## Generated input contracts

Inside `Use` of a compiled toolset, `BindInput("read", "scope")` removes a required
top-level provider field from that consumer’s model input. Install the generated typed
helper for each planning activity to supply the application-owned value. The provider
still receives its complete original input. Optional, injected, unknown, repeated, or
nested-path fields are rejected; remote Registry contracts cannot be bound without a
compiled declaration.

Generated codecs support `Any` or `Bytes` explicitly represented as `json.RawMessage`,
preserving raw JSON values and exact numbers. An explicitly declared map with
`Meta("struct:tag:json", ",embed")` accepts additional object members under its value
contract. Codecs reject duplicate keys, collisions with declared fields, and invalid
additional values. Ordinary objects remain closed; ordinary byte fields use base64.

## Upgrade and rollback {#upgrade}

This is a coordinated source, wire, and saved-data upgrade. Regenerate and rebuild
providers and consumers; replace resolver `Messages` with required `History` and move
resolver registration to provider workers. An intentionally empty history is
`runtime.LiteralAgentHistory(nil)`; a zero `AgentHistory` is rejected. Native targets
require `Executor`, `Configuration`, `Workflow`, and `Queue`. `SeedDeclaration` no
longer duplicates `Origin`; `RunSeed.Origin` is taken directly from the
`BeginRunPreparationOperation` parameter. Validate every retained declaration group,
including retired entries, before activation.

Current suspensions use `goa-ai.run-suspension.v14`; top-level results use
`json/goa-ai-run-output-v3`. Earlier formats are rejected. Update custom Stores, engine
adapters, common run envelopes, event consumers, and generated transports for required
`Subject`. Inventory saved starts, preparations, bindings, checkpoints, parent histories
containing child results, exported histories, and result copies. Drain work on matching
old workers or perform an owner-controlled conversion with replay verification. Old and
new preparation workers cannot share a queue while old work remains.

Coordinate independently deployed readers and writers. Rollback requires matching saved
data, declarations, request bytes, and worker code; reverting only a binary after new
writes is unsafe. The framework does not infer missing executors or provide a permanent
compatibility mode.

Detailed framework contracts:

- [Run subjects](https://github.com/goadesign/goa-ai/blob/main/docs/run-subjects.md)
- [Workflow results](https://github.com/goadesign/goa-ai/blob/main/docs/workflow-results.md)
- [Native declarations](https://github.com/goadesign/goa-ai/blob/main/docs/native-agent-declarations.md)
- [JSON codecs](https://github.com/goadesign/goa-ai/blob/main/docs/json_codecs.md)
