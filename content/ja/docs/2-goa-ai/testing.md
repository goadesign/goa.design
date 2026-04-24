---
title: テストとトラブルシューティング
weight: 9
description: "エージェント、プランナー、ツールのテスト方法と、よくある問題のトラブルシューティングを学びます。"
llm_optimized: true
---

このガイドでは、Goa-AI エージェントのテスト戦略と、よくある問題への対処方法を説明します。

## エージェントのテスト

### インメモリエンジンでテストする

インメモリエンジンはテストに適しています:

- 外部依存が不要 (Temporal 不要)
- 同期実行のためテスト挙動を予測しやすい
- 開発中の feedback が速い

```go
func TestChatAgent(t *testing.T) {
    // Create runtime with in-memory engine (default)
    rt := runtime.New()
    ctx := context.Background()

    // Register agent with test planner
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &TestPlanner{},
    })
    require.NoError(t, err)

    _, err = rt.CreateSession(ctx, "test-session")
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

### Mock Model Client でプランナーをテストする

モデルクライアントを mock し、プランナー logic を切り離してテストします:

```go
type MockModelClient struct {
    responses []model.Message
    callCount int
}

func (m *MockModelClient) Complete(ctx context.Context, req *model.Request) (*model.Response, error) {
    if m.callCount >= len(m.responses) {
        return nil, fmt.Errorf("no more mock responses")
    }
    resp := &model.Response{
        Content: []model.Message{m.responses[m.callCount]},
    }
    m.callCount++
    return resp, nil
}

func (m *MockModelClient) Stream(ctx context.Context, req *model.Request) (model.Streamer, error) {
    // Return a mock streamer for streaming tests
    return &MockStreamer{response: m.responses[m.callCount]}, nil
}

func TestPlannerWithMockClient(t *testing.T) {
    mockClient := &MockModelClient{
        responses: []model.Message{
            {
                Role: model.ConversationRoleAssistant,
                Parts: []model.Part{
                    model.TextPart{Text: "I'll search for that."},
                    model.ToolUsePart{
                        ID:    "call-1",
                        Name:  "search",
                        Input: json.RawMessage(`{"query": "test"}`),
                    },
                },
            },
        },
    }

    planner := &MyPlanner{client: mockClient}

    input := &planner.PlanInput{
        Messages: []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Search for test"}},
        }},
    }

    result, err := planner.PlanStart(context.Background(), input)
    require.NoError(t, err)

    // Assert planner returned tool calls
    assert.NotNil(t, result.ToolCalls)
    assert.Len(t, result.ToolCalls, 1)
    assert.Equal(t, "search", string(result.ToolCalls[0].Name))
}
```

### ツールを単体でテストする

ツール executor はエージェントから独立してテストします:

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

    call := &planner.ToolRequest{
        Name:    specs.Search,
        Payload: json.RawMessage(`{"query": "test", "limit": 5}`),
    }

    // Execute tool
    result, err := executor.Execute(context.Background(), meta, call)
    require.NoError(t, err)
    require.NotNil(t, result.ToolResult)

    // Assert on result
    assert.Nil(t, result.ToolResult.Error)
    assert.NotNil(t, result.ToolResult.Result)

    // Unmarshal and verify typed result
    searchResult, ok := result.ToolResult.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### ツール検証と Retry Hint をテストする

不正な入力に対して、ツールが適切な error と hint を返すことを検証します:

```go
func TestToolValidationReturnsHint(t *testing.T) {
    executor := &SearchExecutor{}

    // Invalid payload - missing required field
    call := &planner.ToolRequest{
        Name:    specs.Search,
        Payload: json.RawMessage(`{"limit": 5}`), // missing "query"
    }

    result, err := executor.Execute(context.Background(), &runtime.ToolCallMeta{}, call)
    require.NoError(t, err) // Executor should not return error
    require.NotNil(t, result.ToolResult)

    // Should return ToolError with RetryHint
    assert.NotNil(t, result.ToolResult.Error)
    assert.NotNil(t, result.ToolResult.RetryHint)
    assert.Equal(t, planner.RetryReasonMissingFields, result.ToolResult.RetryHint.Reason)
    assert.Contains(t, result.ToolResult.RetryHint.MissingFields, "query")
}
```

### エージェント合成をテストする

agent-as-tool シナリオをテストします:

```go
func TestAgentComposition(t *testing.T) {
    rt := runtime.New()
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

    _, err = rt.CreateSession(ctx, "test-session")
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

---

## トラブルシューティング

### よくあるエラー

#### "registration closed" エラー

**症状:**

```
error: registration closed: cannot register agent after runtime start
```

**原因:** ランタイムが run の処理を開始した後で、エージェントを登録しようとしています。

**解決策:** run を開始する前にすべてのエージェントを登録します:

```go
rt := runtime.New()

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then create a session and start runs
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "session-123"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages, opts...)
```

#### "missing session ID" エラー

**症状:**

```
error: missing session ID: session ID is required for run
```

**原因:** session ID を渡さずに run を開始しています。

**解決策:** 必須の位置引数として session ID を必ず渡します:

```go
// ✗ Wrong - no session ID
out, err := client.Run(ctx, "", messages)

// ✓ Correct - session ID provided
if _, err := rt.CreateSession(ctx, "session-123"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages)
```

**ヒント:** テストでは固定の session ID を使います。本番では会話ごとに一意な session ID を生成してください。

#### Policy Violation エラー

**症状:**

```
error: policy violation: max tool calls exceeded (10/10)
```

**原因:** エージェントが *budgeted* tool に対して設定された `MaxToolCalls` 上限を超えました。`Bookkeeping()` として宣言された tool はこの cap に数えられません。

**解決策:**

1. ユースケース上、本当により多くの tool call が必要なら **上限を増やします**:

```go
RunPolicy(func() {
    DefaultCaps(MaxToolCalls(20)) // Increase from default
})
```

2. **プランナー効率を改善**して tool call を減らします:
   - 可能なら operation を batch 化する
   - より具体的な tool call を使う
   - prompt engineering を改善する

3. 同じ tool を繰り返し呼ぶ **無限ループ** がないか確認します。

4. **構造化 bookkeeping tool を budget から免除**するには、DSL で `Bookkeeping()` を宣言します。status update、progress marker、terminal-commit tool は通常この category です。免除されると `RemainingToolCalls` を消費せず常に実行できます。`Bookkeeping()` と `TerminalRun()` を組み合わせると、retrieval budget が尽きても finalize できる "commit this run" tool を作れます。

**症状:**

```
error: bookkeeping-only tool batch requires a terminal tool or terminal planner payload
```

**原因:** プランナーが bookkeeping tool だけを出しましたが、その結果のどれも次の planner turn を駆動できません。成功した bookkeeping result は既定では将来の `PlanResume` turn から隠されるため、同じ turn で terminal に解決するか、planner-visible bookkeeping result を生成する必要があります。

**解決策:**

1. bookkeeping batch がすでに terminal なら、`TerminalRun()`、`FinalResponse`、`FinalToolResult` で **同じ turn 内に完了**します。
2. run が人間または外部入力を待つ場合は、await/pause handshake で **明示的に pause** します。
3. 次の planner turn が推論すべき正規 state (構造化 progress snapshot など) を bookkeeping result が持つ場合は、**`PlannerVisible()` を付けます**。
4. **`PlannerVisible()` と `TerminalRun()` は組み合わせません**。原子的な完了には `TerminalRun()`、planning を再開する非 terminal bookkeeping には `PlannerVisible()` を使います。

**症状:**

```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**原因:** 複数の tool call が連続して失敗しました。

**解決策:**

1. **根本の tool error を修正**します。tool executor logs を確認してください。
2. **retry hint を改善**して、プランナーが自己修正できるようにします。
3. 一時的な失敗が想定されるなら **上限を増やします**:

```go
RunPolicy(func() {
    DefaultCaps(MaxConsecutiveFailedToolCalls(5))
})
```

**症状:**

```
error: policy violation: time budget exceeded (2m0s)
```

**原因:** agent run が設定された `TimeBudget` を超えました。

**解決策:**

1. 長時間 operation が必要なら **budget を増やします**:

```go
RunPolicy(func() {
    TimeBudget("10m")
})
```

2. **`Timing` でより細かく制御**します:

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")  // Overall budget
        Plan("1m")     // Per-plan timeout
        Tools("2m")    // Per-tool timeout
    })
})
```

3. tool execution を **高速化**します。

#### "unknown tool" エラー

**症状:**

```
error: unknown tool: orchestrator.helpers.search
```

**原因:** プランナーが登録されていない tool を要求しています。

**解決策:**

1. **toolset registration を確認**します。agent に toolset が含まれていることを確認してください:

```go
Agent("chat", "Chat agent", func() {
    Use(HelpersToolset) // Make sure this is included
})
```

2. **tool name の spelling** を確認します。tool name は case-sensitive で、qualified name を使います。

3. DSL 変更後は **コードを再生成**します:

```bash
goa gen example.com/project/design
```

#### "invalid payload" エラー

**症状:**

```
error: invalid payload: json: cannot unmarshal string into Go struct field SearchPayload.limit of type int
```

**原因:** LLM が tool schema と一致しない payload を生成しました。

**解決策:**

1. executor から **RetryHint を返し**、プランナーが自己修正できるようにします:

```go
if err != nil {
    return runtime.Executed(&planner.ToolResult{
        Name:  call.Name,
        Error: planner.NewToolError("invalid payload"),
        RetryHint: &planner.RetryHint{
            Reason:       planner.RetryReasonInvalidArguments,
            Tool:         call.Name,
            ExampleInput: map[string]any{"query": "example", "limit": 10},
            Message:      "limit must be an integer",
        },
    }), nil
}
```

2. expected type が明確になるように **tool description を改善**します。

3. DSL に **example** を追加します:

```go
Args(func() {
    Attribute("limit", Int, "Maximum results", func() {
        Example(10)
        Minimum(1)
        Maximum(100)
    })
})
```

### デバッグのヒント

#### Debug Logging を有効にする

```go
import "goa.design/goa-ai/runtime/agent/runtime"

rt := runtime.New(
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### デバッグ用に event を購読する

```go
type DebugSink struct{}

func (s *DebugSink) Send(ctx context.Context, event stream.Event) error {
    fmt.Printf("[%s] %s run=%s session=%s payload=%v
",
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
rt := runtime.New(runtime.WithStream(&DebugSink{}))
```

#### 実行時に Tool Spec を調べる

```go
// List all registered tools
for _, spec := range rt.ToolSpecsForAgent(chat.AgentID) {
    fmt.Printf("Tool: %s
", spec.Name)
    fmt.Printf("  Description: %s
", spec.Description)
    fmt.Printf("  Payload Schema: %s
", spec.Payload.Schema)
}
```

---

## 次のステップ

- **[DSL Reference](./dsl-reference/)** - 完全な DSL 関数リファレンス
- **[Runtime](./runtime/)** - ランタイムアーキテクチャを理解する
- **[Production](./production/)** - Temporal と streaming UI でデプロイする
