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

    request, err := planner.NewToolRequest(specs.SearchTool(), &specs.SearchPayload{
        Query: "test",
        Limit: 5,
    })
    require.NoError(t, err)

    // executor は検証と実行 ID の割り当て後に動くため、生成 descriptor が
    // 作った正規 payload bytes から runtime call を構築する。
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

### ツールの検証と回復をテストする

不正な外部 JSON は生成 codec の境界でテストします。不正な model tool call は、
planner や executor が受け取る前に拒否されます。

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

executor の直接テストでは、生成された型付き descriptor を使って有効な
`planner.ToolRequest` を作り、その名前と正規 payload bytes から
`runtime.ToolCall` を構築して、runtime が付与する実行 ID を設定します。
domain または provider の失敗は `ToolResult.Failure.Kind`、`Failure.Error`、
`Failure.Recovery` で検証します。検証済み provider call の転送をテストする
planner では、provider correlation ID を保持する
`planner.ToolRequestFromModelCall` を使えます。

### エージェント合成をテストする

agent-as-tool シナリオをテストします:

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

### ランタイムストレージのテスト

プランナーとワークフローのテストには `runtime/agent/storage/inmem` を使います。プロダクション用の永続実装も同じ契約に対してテストし、次のケースを含めます。

- ルート、子、セッションなし one-shot の各開始が、メタデータと最初の記録をまとめて保存する
- 新しい `StartChildRun` と `StartOneShotChildRun` は running の parent を必須とし、親 link と child start を同じ操作で保存する
- 受理済みのどちらの child start も、完全に同じ retry なら parent の停止後も有効だが、内容を変えた retry と新しい child は拒否する
- まったく同じ再試行が元の記録 ID を返し、新しい記録を追加していないことを報告する
- status と他の lifecycle field が同じでも、別の record で同じ変更を繰り返すと conflict になる
- 最初の書き込みで確定した値を変更すると競合になる
- running workflow が受理した明示的な `CancelRun` は、最初の reason と対応する
  `storage.CancellationRecordType` record をまとめて保存する。この record の
  serialized type は `runtime.cancellation_intent` である。完全に同じ retry は成功するが、
  後から異なる reason を指定すると conflict になる
- sessionful run の開始時に session がすでに終了していた場合、`session_ended` と
  canceled の terminal record を保存し、`storage.CancellationRecordType` record は保存しない
- engine が始めたキャンセルでは、保存された reason は空のままで
  `storage.CancellationRecordType` record もなく、terminal record に
  `engine_canceled` が入る
- 一時停止がチェックポイント、一時停止状態、対応する記録をまとめて保存する
- 終了が最終状態と対応する記録をまとめて保存する
- continuation の開始には、存在し、同じ session、agent、parent run identity を持つ
  suspended predecessor が必要である
- continuation の identity が一致しない場合は successor の開始も親リンクも書かれず、
  受理された successor は `RunMeta` ではなく `RunStarted` に
  `PredecessorRunID` を保存する
- 終了済みセッションではプランナーやツールを実行せず、すでに受理されたワークフローはキャンセルとして記録する
- 実行中のランがある間は purge が失敗し、すべて終了した後に終了済みセッションのメタデータ、チェックポイント、記録を削除する

これらの store test では、実際の database transaction を動かしてください。method
call だけを確認する mock では、state と record が同時に見えることを証明できません。

Temporal adapter は別に test します。親 workflow を終了すると child workflow も
終了する必要があります。

runtime の明示的な完了結果配信 command は別に test し、次を確認します。

- `EnsureRunCompletion` は active な保存済み run に欠けている result を保存し、
  すでに保存済みの result は変更せず、検証して再配信する
- child link は final event より先に配信し、`EnsureChildRunLink` は保存済みの正確な
  link だけを配信する
- active な Session で `Runtime.WithStream` がない場合は失敗し、新たに確認した
  Session が終了済みなら、保存済み result を保持して配信を抑止する
- `LoadSessionStatus` は Session の現在の status を返すが、`EnsureRunCompletion` は
  final record の書き込みまたは完全に同じ再試行と一緒に返された
  `SessionStatus` を使い、stream 配信の再試行中もその status を保つ
- Session が active な間に受理された event は、その配信 call 中に Session が
  終了しても配信対象のままである
- engine workflow が open なら `ErrRunCompletionNotReady` を返し、engine または
  storage の data が不正、または矛盾していれば `ErrRunCompletionCorrupt` を返す

hook codec は別に test します。`RunStarted`、`RunSuspended`、`RunCompleted`、
`ChildRunLinked` の decoder は、`null`、未知の field、末尾の二つ目の JSON 値を
拒否する必要があります。

continuation test は `goa-ai.run-suspension.v7` を受理し、それ以前の version は
payload の復元や planner 呼び出しの前に拒否することを確認します。

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
if _, err := store.CreateSession(ctx, "session-123", time.Now().UTC()); err != nil {
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

4. **構造化された制御記録を retrieval と失敗の budget から免除**するには、DSL で `Bookkeeping()` を宣言します。status marker と transition declaration はこの category ですが、成功後に追加推論をスケジュールすべき lookup result は該当しません。モデルが生成した mixed batch は原子的なままで、予算対象呼び出しが収まらなければ batch 全体が拒否されます。terminal commit には `TerminalRun()` だけを使用します。terminal tool は自動的に bookkeeping となり、retrieval budget が尽きた後でも受け入れられます。

**症状:**

```
error: bookkeeping-only tool batch requires a terminal tool or terminal planner payload
```

**原因:** プランナーが bookkeeping tool だけを出しました。呼び出しと結果は provider transcript に残りますが、成功した結果は次の `PlanResume` を起動せず、将来の型付き `ToolOutputs` にも入りません。そのため、同じ turn で terminal に解決するか、入力待ちにする必要があります。

**解決策:**

1. bookkeeping batch がすでに terminal なら、`TerminalRun()`、`FinalResponse`、`FinalToolResult` で **同じ turn 内に完了**します。
2. run が人間または外部入力を待つ場合は、await/pause handshake で **明示的に pause** します。
3. 成功した bookkeeping result に依存して planning を再開するのではなく、次の turn の state は **明示的な planner 入力** に移します。

**症状:**

```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**原因:** 複数の tool call が連続して失敗しました。

**解決策:**

1. **根本の tool error を修正**します。tool executor logs を確認してください。
2. **構造化された failure contract を修正**し、`Failure.Recovery` が planner に正しい action と正確な correction evidence を渡すようにします。
3. 一時的な失敗が想定されるなら **上限を増やします**:

```go
RunPolicy(func() {
    DefaultCaps(MaxRecoveryTurns(5))
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

1. 生成 codec をテストし、境界が正確な field issue を返すことを確認します:

```go
_, err := specs.SearchTool().Payload.FromJSON(
    rawjson.Message(`{"query":"example","limit":"ten"}`),
)
var validationErr *tools.ValidationError
require.ErrorAs(t, err, &validationErr)
assert.Equal(t, "invalid_field_type", validationErr.Issues()[0].Constraint)
```

provider がこの payload を返すと、検証済み model client は
`model.OutputValidationError` を返します。planner/runtime は executor や service
code が動く前に、それを `planner.OutputContractError` として公開します。対象の
境界で `errors.As` を使って structured error を検証してください。
`ToolFailure` は記録されません。

`RecoveryCorrectCall` は別にテストします。schema 検証には合格するものの、
executor または domain 境界が recoverable な `ToolFailure` を返す
model-authored call を使います。

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
    storageinmem.New(),
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### デバッグ用に event を購読する

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
