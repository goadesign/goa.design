---
title: Testing & Troubleshooting
weight: 9
description: "Learn how to test agents, planners, and tools, and troubleshoot common issues."
llm_optimized: true
---

This guide covers testing strategies for Goa-AI agents and solutions to common issues.

## Testing Agents

### Testing with the In-Memory Engine

The in-memory engine is ideal for testing because it:
- Requires no external dependencies (no Temporal)
- Executes synchronously for predictable test behavior
- Provides fast feedback during development

```go
func TestChatAgent(t *testing.T) {
    // Create runtime with in-memory engine (default)
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    
    // Register agent with test planner
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &TestPlanner{},
    })
    require.NoError(t, err)

    _, err = store.CreateSession(ctx, "test-session", time.Now().UTC())
    require.NoError(t, err)
    
    // Run agent
    client := chat.NewClient(rt)
    out, err := client.Run(
        ctx,
        "test-session",
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Hello"}},
        }},
    )
    require.NoError(t, err)
    
    // Assert on output
    assert.NotEmpty(t, out.RunID)
    assert.NotNil(t, out.Final)
}
```

### Testing Planners with Fake Providers

`model.Client` is framework-owned and cannot be implemented by application test
doubles. Implement `model.Provider`, then construct the same validated client
used in production:

```go
type FakeProvider struct {
    response *model.Response
}

func (p *FakeProvider) Complete(context.Context, *model.Request) (*model.Response, error) {
    return p.response, nil
}

func (p *FakeProvider) Stream(context.Context, *model.Request) (model.Streamer, error) {
    return nil, model.ErrStreamingUnsupported
}

func TestValidatedModelResponse(t *testing.T) {
    provider := &FakeProvider{response: &model.Response{
        Content: []model.Message{{
            Role: model.ConversationRoleAssistant,
            Parts: []model.Part{model.TextPart{Text: "Hello."}},
        }},
        StopReason: "stop",
    }}
    client, err := model.NewClient(provider)
    require.NoError(t, err)

    resp, err := client.Complete(context.Background(), &model.Request{
        Messages: []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Hello"}},
        }},
    })
    require.NoError(t, err)
    assert.Len(t, resp.Content, 1)
}
```

For planner unit tests that do not need model validation, inject deterministic
planner inputs and typed tool requests directly. Use a fake provider when the
test must prove request validation, tool-payload decoding, output bounds, or
stream termination behavior.

Streaming fakes must emit a complete valid chunk sequence and then return
`io.EOF`; only then does `ValidatedStream.Response()` expose the accepted
response. To test rejection, return malformed provider output and assert the
boundary error. Generated completion tests should assert
`planner.OutputContractError` and a nil response when output violates the
generated codec.

Rate-limiter and token-budget history tests need a fake provider that also
implements exact `model.TokenCounter`. A non-counting fake should produce
`model.ErrTokenCountingUnsupported`, not an estimated result.

### Testing Tools in Isolation

Test tool executors independently from the agent:

```go
func TestSearchToolExecutor(t *testing.T) {
    // Create executor with mock dependencies
    mockSearchService := &MockSearchService{
        results: []string{"doc1", "doc2", "doc3"},
    }
    executor := &SearchExecutor{searchService: mockSearchService}
    
    // Create test tool call
    meta := &runtime.ToolCallMeta{
        RunID:      "test-run",
        SessionID:  "test-session",
        TurnID:     "test-turn",
        ToolCallID: "call-1",
    }
    
    request, err := planner.NewToolRequest(specs.SearchTool(), &specs.SearchPayload{
        Query: "test",
        Limit: 5,
    })
    require.NoError(t, err)

    // Executors run after validation and execution-ID assignment. Build the
    // runtime call from the valid bytes produced by the generated descriptor.
    call := &runtime.ToolCall{
        Name:       request.Name,
        Payload:    request.Payload,
        RunID:      meta.RunID,
        SessionID:  meta.SessionID,
        TurnID:     meta.TurnID,
        ToolCallID: meta.ToolCallID,
    }
    
    // Execute tool
    result, err := executor.Execute(context.Background(), meta, call)
    require.NoError(t, err)
    require.NotNil(t, result.ToolResult)
    
    // Assert on result
    assert.Nil(t, result.ToolResult.Failure)
    assert.NotNil(t, result.ToolResult.Result)
    
    // Unmarshal and verify typed result
    searchResult, ok := result.ToolResult.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### Testing Tool Validation and Recovery

Test malformed external JSON at the generated codec boundary. Invalid model
tool calls are rejected before planner or executor code receives them:

```go
func TestSearchPayloadRequiresQuery(t *testing.T) {
    _, err := specs.SearchTool().Payload.FromJSON(
        rawjson.Message(`{"limit":5}`),
    )
    require.Error(t, err)

    var validationErr *tools.ValidationError
    require.ErrorAs(t, err, &validationErr)
    assert.Equal(t, "query", validationErr.Issues()[0].Field)
}
```

Direct executor tests should create a valid `planner.ToolRequest` with the
generated typed descriptor, then construct a `runtime.ToolCall` from its name
and canonical payload bytes and assign the execution IDs the runtime would add.
Assert domain or provider failures through `ToolResult.Failure.Kind`,
`Failure.Error`, and `Failure.Recovery`. Planner tests that specifically forward
a validated provider call may use `planner.ToolRequestFromModelCall` to preserve
its provider correlation ID.

### Testing Agent Composition

Test agent-as-tool scenarios:

```go
func TestAgentComposition(t *testing.T) {
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    
    // Register provider agent
    err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    })
    require.NoError(t, err)
    
    // Register consumer agent that uses provider's tools
    err = orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    })
    require.NoError(t, err)

    _, err = store.CreateSession(ctx, "test-session", time.Now().UTC())
    require.NoError(t, err)
    
    // Run orchestrator - it should invoke planner agent as a tool
    client := orchestrator.NewClient(rt)
    out, err := client.Run(
        ctx,
        "test-session",
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Create a plan for X"}},
        }},
    )
    require.NoError(t, err)
    
    // Verify child run was created
    assert.Greater(t, out.ChildrenCount, 0)
}
```

### Testing Runtime Storage

Use `runtime/agent/storage/inmem` for planner and workflow tests. Test a durable
production implementation against the same contract, including these cases:

- root, child, and sessionless one-shot starts store their metadata and first
  records together;
- a child start stores its parent link in the same operation as the child start;
- an identical retry returns the original record identifier and reports that no
  new record was inserted;
- repeating a lifecycle change with a different record conflicts even when the
  requested status and other lifecycle fields are unchanged;
- changing any value fixed by the first write returns a conflict;
- the first cancellation reason is permanent and a different later reason is a
  conflict;
- suspension stores the checkpoint, suspended status, and matching record
  together;
- terminal completion stores the final status and matching record together;
- a continuation start requires an existing suspended predecessor with the same
  session, agent, and parent run identity;
- a continuation mismatch leaves no successor start or parent link, and a
  successful successor records `PredecessorRunID` in `RunStarted` rather than
  `RunMeta`;
- an ended session prevents planner and tool work but still records an accepted
  workflow as canceled;
- purge fails while a run is active, then removes the ended session's run
  metadata, checkpoints, and records after all runs finish.

These tests should exercise the real database transaction behavior. A mock that
only checks method calls cannot prove that state and records become visible
together.

Continuation tests should accept `goa-ai.run-suspension.v7` and reject every
earlier checkpoint version before restoring payloads or calling a planner.

---

## Troubleshooting

### Common Errors

#### "registration closed" Error

**Symptom:**
```
error: registration closed: cannot register agent after runtime start
```

**Cause:** Attempting to register an agent after the runtime has started processing runs.

**Solution:** Register all agents before starting any runs:

```go
store := storageinmem.New()
rt := runtime.New(store)

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then create a session and start runs
client := chat.NewClient(rt)
if _, err := store.CreateSession(ctx, "session-123", time.Now().UTC()); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages, opts...)
```

#### "missing session ID" Error

**Symptom:**
```
error: missing session ID: session ID is required for run
```

**Cause:** Starting a run without providing a session ID.

**Solution:** Always provide a session ID as the required positional argument:

```go
// ✗ Wrong - no session ID
out, err := client.Run(ctx, "", messages)

// ✓ Correct - session ID provided
if _, err := store.CreateSession(ctx, "session-123", time.Now().UTC()); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages)
```

**Tip:** For testing, use a fixed session ID. For production, generate unique session IDs per conversation.

#### Policy Violation Errors

**Symptom:**
```
error: policy violation: max tool calls exceeded (10/10)
```

**Cause:** The agent exceeded the configured `MaxToolCalls` limit for *budgeted* tools. Tools declared `Bookkeeping()` do not count against this cap.

**Solutions:**

1. **Increase the limit** if the use case legitimately requires more tool calls:
```go
RunPolicy(func() {
    DefaultCaps(MaxToolCalls(20)) // Increase from default
})
```

2. **Improve planner efficiency** to use fewer tool calls:
   - Batch operations where possible
   - Use more specific tool calls
   - Improve prompt engineering

3. **Check for infinite loops** in planner logic that repeatedly calls the same tool.

4. **Exempt structured control records from retrieval and failure budgets** by declaring them `Bookkeeping()` in the DSL. Status markers and transition declarations belong in this category; lookup results whose success must schedule later reasoning do not. A mixed model-authored batch remains atomic and is rejected as a whole if its budgeted calls do not fit. Use `TerminalRun()` alone for a terminal commit; terminal tools automatically become bookkeeping and can be admitted after the retrieval budget is exhausted.

**Symptom:**
```
error: bookkeeping-only tool batch requires a terminal tool or terminal planner payload
```

**Cause:** The planner emitted only bookkeeping tools. Their calls and results remain in the provider transcript, but successful results do not trigger another `PlanResume` or enter typed future `ToolOutputs`. The same turn must therefore resolve terminally or await input.

**Solutions:**

1. **Finish in the same turn** with `TerminalRun()`, `FinalResponse`, or `FinalToolResult` when the bookkeeping batch is already terminal.
2. **Pause explicitly** with an await/pause handshake if the run is waiting for human or external input.
3. **Move next-turn state to explicit planner input** instead of relying on a successful bookkeeping result to resume planning.

**Symptom:**
```
error: policy violation: recovery turn cap exceeded
```

**Cause:** The planner used every allowed replacement call after rejected tool
or model output.

**Solutions:**

1. **Fix rejected tool output** - check executor logs and ensure `Failure.Recovery` gives the planner the correct action and correction evidence
2. **Fix rejected model output** - return precise correction text from the output validator
3. **Increase the replacement allowance** when the agent legitimately needs more correction attempts:
```go
RunPolicy(func() {
    DefaultCaps(MaxRecoveryTurns(5))
})
```

**Symptom:**
```
error: policy violation: time budget exceeded (2m0s)
```

**Cause:** The agent run exceeded the configured `TimeBudget`.

**Solutions:**

1. **Increase the budget** for long-running operations:
```go
RunPolicy(func() {
    TimeBudget("10m")
})
```

2. **Use `Timing` for fine-grained control**:
```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")  // Overall budget
        Plan("1m")     // Per-plan timeout
        Tools("2m")    // Per-tool timeout
    })
})
```

3. **Optimize tool execution** to complete faster.

#### "unknown tool" Error

**Symptom:**
```
error: unknown tool: orchestrator.helpers.search
```

**Cause:** The planner requested a tool that isn't registered.

**Solutions:**

1. **Verify toolset registration** - ensure the toolset is registered with the agent:
```go
Agent("chat", "Chat agent", func() {
    Use(HelpersToolset) // Make sure this is included
})
```

2. **Check tool name spelling** - tool names are case-sensitive and use qualified names.

3. **Regenerate code** after DSL changes:
```bash
goa gen example.com/project/design
```

#### "invalid payload" Error

**Symptom:**
```
error: invalid payload: json: cannot unmarshal string into Go struct field SearchPayload.limit of type int
```

**Cause:** The LLM provided a payload that doesn't match the tool's schema.

**Solutions:**

1. **Test the generated codec** so the boundary reports exact field issues:
```go
_, err := specs.SearchTool().Payload.FromJSON(
    rawjson.Message(`{"query":"example","limit":"ten"}`),
)
var validationErr *tools.ValidationError
require.ErrorAs(t, err, &validationErr)
assert.Equal(t, "invalid_field_type", validationErr.Issues()[0].Constraint)
```

When a provider emits this payload, the validated model client returns
`model.OutputValidationError`. The planner/runtime surfaces it as
`planner.OutputContractError` before executor or service code runs. Use
`errors.As` to assert the structured error at the boundary under test; no
`ToolFailure` is recorded.

Test `RecoveryCorrectCall` separately with a model-authored call that passes
schema validation and whose executor or domain boundary returns a recoverable
`ToolFailure`.

2. **Improve tool descriptions** to clarify expected types.

3. **Add examples** to the DSL:
```go
Args(func() {
    Attribute("limit", Int, "Maximum results", func() {
        Example(10)
        Minimum(1)
        Maximum(100)
    })
})
```

### Debugging Tips

#### Enable Debug Logging

```go
import "goa.design/goa-ai/runtime/agent/runtime"

rt := runtime.New(
    storageinmem.New(),
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### Subscribe to Events for Debugging

```go
type DebugSink struct{}

func (s *DebugSink) Send(ctx context.Context, event stream.Event) error {
    fmt.Printf("[%s] %s run=%s session=%s payload=%v\n",
        time.Now().Format(time.RFC3339),
        event.Type(),
        event.RunID(),
        event.SessionID(),
        event.Payload(),
    )
    return nil
}

func (s *DebugSink) Close(ctx context.Context) error { return nil }

// Wire the sink into the runtime to observe all stream events.
rt := runtime.New(storageinmem.New(), runtime.WithStream(&DebugSink{}))
```

#### Inspect Tool Specs at Runtime

```go
// List all registered tools
for _, spec := range rt.ToolSpecsForAgent(chat.AgentID) {
    fmt.Printf("Tool: %s\n", spec.Name)
    fmt.Printf("  Description: %s\n", spec.Description)
    fmt.Printf("  Payload Schema: %s\n", spec.Payload.Schema)
}
```

---

## Next Steps

- **[DSL Reference](./dsl-reference/)** - Complete DSL function reference
- **[Runtime](./runtime/)** - Understand runtime architecture
- **[Production](./production/)** - Deploy with Temporal and streaming UI
