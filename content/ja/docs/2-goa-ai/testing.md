---
title: テストとトラブルシューティング
weight: 9
description: "エージェント、プランナー、ツールのテスト方法と、よくある問題のトラブルシューティングを学びます。"
llm_optimized: true
---

このガイドでは、Goa-AI のエージェントをテストするための戦略と、よくある問題の解決方法を説明します。

## エージェントのテスト

### インメモリエンジンでテストする

インメモリエンジンは、次の理由でテストに最適です:

- 外部依存が不要（Temporal 不要）
- 同期実行のため、テストの挙動が予測しやすい
- 開発中のフィードバックが速い

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

### モックのモデルクライアントでプランナーをテストする

モデルクライアントをモックして、プランナーのロジックを切り出してテストします:

```go
type MockModelClient struct {
    responses []*model.Message
    callCount int
}

func (m *MockModelClient) Generate(ctx context.Context, req *model.Request) (*model.Response, error) {
    if m.callCount >= len(m.responses) {
        return nil, fmt.Errorf("no more mock responses")
    }
    resp := &model.Response{
        Message: m.responses[m.callCount],
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
        responses: []*model.Message{
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
        Tools: []tools.ToolSpec{/* ... */},
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

エージェントとは独立に、ツールエグゼキュータをテストします:

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
    
    // Assert on result
    assert.Nil(t, result.Error)
    assert.NotNil(t, result.Result)
    
    // Unmarshal and verify typed result
    searchResult, ok := result.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### ツールのバリデーションとリトライヒントをテストする

入力が不正なときに、ツールが適切なエラーとヒントを返すことを検証します:

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
    
    // Should return ToolError with RetryHint
    assert.NotNil(t, result.Error)
    assert.NotNil(t, result.RetryHint)
    assert.Equal(t, planner.RetryReasonMissingFields, result.RetryHint.Reason)
    assert.Contains(t, result.RetryHint.MissingFields, "query")
}
```

### エージェント・コンポジションをテストする

エージェントをツールとして呼び出すシナリオ（agent-as-tool）をテストします:

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

**原因:** ランタイムが実行の処理を開始した後に、エージェントを登録しようとしている。

**解決策:** 実行を開始する前に、すべてのエージェントを登録します:

```go
rt := runtime.New()

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then start runs
client := chat.NewClient(rt)
out, err := client.Run(ctx, messages, opts...)
```

#### "missing session ID" エラー

**症状:**

```
error: missing session ID: session ID is required for run
```

**原因:** セッション ID を指定せずに実行を開始している。

**解決策:** 必須の位置引数としてセッション ID を必ず渡します:

```go
// ✗ Wrong - no session ID
out, err := client.Run(ctx, "", messages)

// ✓ Correct - session ID provided
out, err := client.Run(ctx, "session-123", messages)
```

**ヒント:** テストでは固定のセッション ID を使います。本番では会話ごとに一意なセッション ID を生成します。

#### ポリシー違反（Policy Violation）エラー

**症状:**

```
error: policy violation: max tool calls exceeded (10/10)
```

**原因:** エージェントが設定された `MaxToolCalls` の上限を超えた。

**解決策:**

1. ユースケース上、正当により多くのツール呼び出しが必要であれば **上限を増やします**:

```go
RunPolicy(func() {
    DefaultCaps(MaxToolCalls(20)) // Increase from default
})
```

2. **プランナーの効率を改善**してツール呼び出し回数を減らします:
   - 可能ならバッチ化する
   - より具体的なツール呼び出しを使う
   - プロンプトを改善する

3. 同じツールを繰り返し呼び出す **無限ループ** がないか確認します。

**症状:**

```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**原因:** 連続して複数のツール呼び出しに失敗した。

**解決策:**

1. **根本のツールエラーを修正**する（ツールエグゼキュータのログを確認）
2. **リトライヒントを改善**し、プランナーが自動で自己修正できるようにする
3. 一時的な失敗が想定される場合は **上限を増やす**:

```go
RunPolicy(func() {
    DefaultCaps(MaxConsecutiveFailedToolCalls(5))
})
```

**症状:**

```
error: policy violation: time budget exceeded (2m0s)
```

**原因:** エージェント実行が設定された `TimeBudget` を超えた。

**解決策:**

1. 長時間の処理が必要なら **予算を増やす**:

```go
RunPolicy(func() {
    TimeBudget("10m")
})
```

2. **`Timing` でより細かな制御**を行う:

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")  // Overall budget
        Plan("1m")     // Per-plan timeout
        Tools("2m")    // Per-tool timeout
    })
})
```

3. ツール実行を **高速化**します。

#### "unknown tool" エラー

**症状:**

```
error: unknown tool: orchestrator.helpers.search
```

**原因:** プランナーが、登録されていないツールを要求している。

**解決策:**

1. **ツールセット登録を確認**する（エージェントにツールセットが含まれていること）:

```go
Agent("chat", "Chat agent", func() {
    Use(HelpersToolset) // Make sure this is included
})
```

2. **ツール名のスペル**を確認する（ツール名は大文字小文字を区別し、修飾名を使う）

3. DSL 変更後は **コードを再生成**する:

```bash
goa gen example.com/project/design
```

#### "invalid payload" エラー

**症状:**

```
error: invalid payload: json: cannot unmarshal string into Go struct field SearchPayload.limit of type int
```

**原因:** LLM がツールのスキーマに合わないペイロードを生成した。

**解決策:**

1. エグゼキュータから **RetryHint を返す**ことで、プランナーが自己修正できるようにします:

```go
if err != nil {
    return &planner.ToolResult{
        Error: planner.NewToolError("invalid payload"),
        RetryHint: &planner.RetryHint{
            Reason:       planner.RetryReasonInvalidArguments,
            Tool:         call.Name,
            ExampleInput: map[string]any{"query": "example", "limit": 10},
            Message:      "limit must be an integer",
        },
    }, nil
}
```

2. 期待する型が伝わるように **ツールの説明を改善**します。

3. DSL に **例（Example）** を追加します:

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

#### デバッグログを有効にする

```go
import "goa.design/goa-ai/runtime/agent/runtime"

rt := runtime.New(
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### イベントを購読してデバッグする

```go
type DebugSink struct{}

func (s *DebugSink) Receive(event stream.Event) error {
    fmt.Printf("[%s] %T: %+v\n", time.Now().Format(time.RFC3339), event, event)
    return nil
}

// Subscribe to run events
stop, err := rt.SubscribeRun(ctx, runID, &DebugSink{})
defer stop()
```

#### 実行時にツール仕様を確認する

```go
// List all registered tools
for _, spec := range rt.ToolSpecsForAgent(chat.AgentID) {
    fmt.Printf("Tool: %s\n", spec.Name)
    fmt.Printf("  Description: %s\n", spec.Description)
    fmt.Printf("  Payload Schema: %s\n", spec.Payload.Schema)
}
```

---

## 次のステップ

- **[DSL リファレンス](./dsl-reference/)** - DSL 関数リファレンス
- **[Runtime](./runtime/)** - ランタイムアーキテクチャを理解する
- **[Production](./production/)** - Temporal とストリーミング UI でデプロイする
