---
title: ツールセット
weight: 4
description: "Goa-AI におけるツールセットの種類、実行モデル、検証、再試行ヒント、ツールカタログについて学びます。"
llm_optimized: true
aliases:
---

ツールセットは、エージェントが利用できるツールの集合です。Goa-AI は、実行モデルと用途が異なる複数のツールセット種類をサポートします。

## ツールセットの種類

### サービス所有のツールセット（メソッド連携）

`Toolset("name", func() { ... })` で宣言します。ツールは Goa サービスメソッドに `BindTo` でき、またはカスタムエクゼキュータで実装できます。

- `gen/<service>/tools/<toolset>/` の配下に、ツールセット単位の specs / types / codecs が生成されます
- これらのツールセットを `Use` するエージェントは、プロバイダ側 specs を import し、型付きのコールビルダとエクゼキュータ・ファクトリを取得します
- アプリケーションは、（ランタイム提供のコーデック経由で）型付き引数をデコードし、必要に応じて transforms を使い、サービスクライアントを呼び出して `ToolResult` を返すエクゼキュータを登録します

### エージェント実装のツールセット（Agent-as-Tool）

エージェントの `Export` ブロックで定義し、必要に応じて他のエージェントが `Use` できます。

- 所有権はあくまでサービス側にあり、エージェントが実装になります
- プロバイダ側には `agenttools/<toolset>` のヘルパが生成され、`NewRegistration` と型付きのコールビルダを提供します
- エクスポートされたツールセットを `Use` するコンシューマ側のヘルパは、ルーティング用メタデータを一元化したままプロバイダ側ヘルパへ委譲します
- 実行はインラインで行われます。ペイロードは正規（canonical）の JSON として渡され、プロンプト作成のために必要な場合のみ境界でデコードされます

### MCP ツールセット

`MCPToolset(service, suite)` で宣言し、`Use(MCPToolset(...))` で参照します。

- 生成される登録は `DecodeInExecutor=true` を設定し、生の JSON が MCP エクゼキュータへそのまま渡されます
- MCP エクゼキュータは自身のコーデックでデコードします
- 生成されるラッパは JSON スキーマ / エンコーダとトランスポート（HTTP/SSE/stdio）を、リトライとトレーシング付きで扱います

### BindTo とインライン実装の使い分け

**`BindTo` を使うのは次のときです：**

- 既存の Goa サービスメソッドを呼び出したい
- ツール型とメソッド型の間の transforms を生成したい
- 必要なビジネスロジックがすでにサービスメソッド側にある
- サービス層の検証やエラーハンドリングを再利用したい

```go
// Tool bound to existing service method
Tool("search", "Search documents", func() {
    Args(SearchPayload)
    Return(SearchResult)
    BindTo("Search")  // Calls the Search method on the same service
})
```

**インライン実装を使うのは次のときです：**

- サービスメソッドに紐づかない独自ロジックが必要
- 複数のサービス呼び出しをオーケストレーションする必要がある
- ツールが純粋な計算（外部呼び出しなし）で完結する
- 実行フローを完全に制御したい

```go
// Tool with custom executor implementation
Tool("summarize", "Summarize multiple documents", func() {
    Args(func() {
        Attribute("doc_ids", ArrayOf(String), "Document IDs to summarize")
        Required("doc_ids")
    })
    Return(func() {
        Attribute("summary", String, "Combined summary")
        Required("summary")
    })
    // No BindTo - implement in executor
})
```

インライン実装の場合は、エクゼキュータのロジックを直接記述します：

```go
func (e *Executor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*planner.ToolResult, error) {
    switch call.Name {
    case specs.Summarize:
        args, _ := specs.UnmarshalSummarizePayload(call.Payload)
        // Custom logic: fetch multiple docs, combine, summarize
        summary := e.summarizeDocuments(ctx, args.DocIDs)
        return &planner.ToolResult{
            Name:   call.Name,
            Result: &specs.SummarizeResult{Summary: summary},
        }, nil
    }
    return nil, fmt.Errorf("unknown tool: %s", call.Name)
}
```

### バウンデッドなツール結果

一部のツールは、巨大なリスト・グラフ・時系列ウィンドウなどを返すのが自然です。これらを **bounded view（バウンデッド・ビュー）** としてマークすると、トリミングはサービス側が責任を持ちつつ、ランタイムがそのコントラクトを強制し可視化できます。

#### agent.Bounds のコントラクト

`agent.Bounds` は、ツール結果が元のデータセットに対してどのように「境界付け（bounded）」されたかを記述する、小さな（プロバイダ非依存の）コントラクトです：

```go
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied (length, window, depth)
    RefinementHint string // Guidance on how to narrow the query when truncated
}
```

| フィールド | 説明 |
|-----------|------|
| `Returned` | 結果に実際に含まれている項目数 |
| `Total` | 切り詰め前の総数（ベストエフォート、未知なら nil） |
| `Truncated` | 何らかの上限（ページング、深さ制限、サイズ制限など）が適用された場合に true |
| `RefinementHint` | 結果が切り詰められたときに、クエリを絞り込むための人間可読なガイダンス（例：「結果を減らすために日付フィルタを追加する」） |

#### トリミングはサービスの責務

ランタイムはサブセット作成や切り詰めを自動で行いません。**サービス側が以下を責任として担います：**

1. **切り詰めロジックの適用**：ページネーション、件数上限、深さ上限、時間窓
2. **bounds メタデータの設定**：`Returned` / `Total` / `Truncated` を正確に設定する
3. **refinement hints の提供**：結果が切り詰められたときに、ユーザ / モデルがクエリを狭める方法を案内する

この設計により、切り詰めロジックをドメイン知識のある場所（サービス）に置きつつ、ランタイム・プランナー・UI が共通で扱える統一コントラクトが得られます。

#### バウンデッドツールの宣言

`Tool` 定義内で DSL ヘルパ `BoundedResult()` を使います：

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("site_id", String, "Site identifier")
        Attribute("status", String, "Filter by status", func() {
            Enum("online", "offline", "unknown")
        })
        Attribute("limit", Int, "Maximum results", func() {
            Default(50)
            Maximum(500)
        })
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "Matching devices")
        Attribute("returned", Int, "Count of returned devices")
        Attribute("total", Int, "Total matching devices")
        Attribute("truncated", Boolean, "Results were capped")
        Attribute("refinement_hint", String, "How to narrow results")
        Required("devices", "returned")
    })
    BoundedResult()
    BindTo("DeviceService", "ListDevices")
})
```

#### コード生成

ツールを `BoundedResult()` でマークすると：

- 生成されるツール仕様に `BoundedResult: true` が含まれます
- 生成される結果エイリアス型に `Bounds *agent.Bounds` フィールドが追加されます
- 生成された結果型が `agent.BoundedResult` インタフェースを実装します：

```go
// Generated interface implementation
type ListDevicesResult struct {
    Devices        []*Device
    Returned       int
    Total          *int
    Truncated      bool
    RefinementHint string
}

func (r *ListDevicesResult) ResultBounds() *agent.Bounds {
    return &agent.Bounds{
        Returned:       r.Returned,
        Total:          r.Total,
        Truncated:      r.Truncated,
        RefinementHint: r.RefinementHint,
    }
}
```

#### バウンデッドツールの実装

サービスが切り詰めを実装し、bounds メタデータを設定します：

```go
func (s *DeviceService) ListDevices(ctx context.Context, p *ListDevicesPayload) (*ListDevicesResult, error) {
    // Query with limit + 1 to detect truncation
    devices, err := s.repo.QueryDevices(ctx, p.SiteID, p.Status, p.Limit+1)
    if err != nil {
        return nil, err
    }
    
    // Determine if results were truncated
    truncated := len(devices) > p.Limit
    if truncated {
        devices = devices[:p.Limit] // Trim to requested limit
    }
    
    // Get total count (optional, may be expensive)
    total, _ := s.repo.CountDevices(ctx, p.SiteID, p.Status)
    
    // Build refinement hint when truncated
    var hint string
    if truncated {
        hint = "Add a status filter or reduce the site scope to see fewer results"
    }
    
    return &ListDevicesResult{
        Devices:        devices,
        Returned:       len(devices),
        Total:          &total,
        Truncated:      truncated,
        RefinementHint: hint,
    }, nil
}
```

#### ランタイムの動作

バウンデッドツールが実行されると：

1. ランタイムが結果をデコードし、`agent.BoundedResult` を実装しているか確認します
2. 実装していれば `ResultBounds()` で bounds メタデータを抽出します
3. bounds は `planner.ToolResult.Bounds` に付与されます
4. ストリーム購読者やファイナライザは、UI 表示・ログ・ポリシー判断などに bounds を利用できます

```go
// In a stream subscriber
func handleToolEnd(event *stream.ToolEndEvent) {
    if event.Bounds != nil && event.Bounds.Truncated {
        log.Printf("Tool %s returned %d of %d results (truncated)",
            event.ToolName, event.Bounds.Returned, *event.Bounds.Total)
        if event.Bounds.RefinementHint != "" {
            log.Printf("Hint: %s", event.Bounds.RefinementHint)
        }
    }
}
```

#### BoundedResult を使うべきとき

`BoundedResult()` は次のようなツールに適しています：

- ページングされたリストを返す（デバイス、ユーザ、レコード、ログ）
- 件数上限付きで巨大なデータセットを検索する
- 入れ子構造（グラフ、木）に深さ / サイズ上限を適用する
- 時間窓のデータを返す（メトリクス、イベント）

この bounded コントラクトは次を助けます：

- **モデル**：結果が不完全である可能性を理解し、絞り込み要求ができる
- **UI**：切り詰めインジケータやページング操作を表示できる
- **ポリシー**：サイズ上限を強制し、暴走クエリを検出できる

### 注入フィールド（Injected Fields）

`Inject` DSL 関数は、特定のペイロードフィールドを「注入フィールド」としてマークします。これは LLM からは見えない一方で、サービスメソッドには必須となる、サーバサイドのインフラ値（セッション ID、ユーザコンテキスト、認証トークンなど）に使えます。

#### Inject の仕組み

フィールドを `Inject` でマークすると：

1. **LLM から隠される**：モデルプロバイダへ送る JSON Schema から除外されます
2. **setter が生成される**：コード生成がペイロード構造体に setter メソッドを追加します
3. **ランタイムで設定する**：実行前に `ToolInterceptor` で値を埋めます

#### DSL での宣言

```go
Tool("get_user_data", "Get data for current user", func() {
    Args(func() {
        Attribute("session_id", String, "Current session ID")
        Attribute("query", String, "Data query")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String), "Query results")
        Required("data")
    })
    BindTo("UserService", "GetData")
    Inject("session_id")  // Hidden from LLM, populated at runtime
})
```

#### 生成されるコード

注入フィールドごとに setter が生成されます：

```go
// Generated payload struct
type GetUserDataPayload struct {
    SessionID string `json:"session_id"`
    Query     string `json:"query"`
}

// Generated setter for injected field
func (p *GetUserDataPayload) SetSessionID(v string) {
    p.SessionID = v
}
```

#### ToolInterceptor によるランタイム設定

`ToolInterceptor` で、実行前に注入フィールドを埋めます：

```go
type SessionInterceptor struct{}

func (i *SessionInterceptor) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    // Extract session from context (set by your auth middleware)
    sessionID, ok := ctx.Value(sessionKey).(string)
    if !ok {
        return fmt.Errorf("session ID not found in context")
    }
    
    // Populate injected field using generated setter
    switch call.Name {
    case specs.GetUserData:
        payload, _ := specs.UnmarshalGetUserDataPayload(call.Payload)
        payload.SetSessionID(sessionID)
        call.Payload, _ = json.Marshal(payload)
    }
    return nil
}

// Register interceptor with runtime
rt := runtime.New(runtime.WithToolInterceptor(&SessionInterceptor{}))
```

#### Inject を使うべきとき

`Inject` は次のようなフィールドに使います：

- サービスにとっては必須だが、LLM に「選ばせる」べきではない
- ランタイムコンテキスト由来（セッション、ユーザ、テナント、リクエスト ID）
- 機密値（認証トークン、API キー）
- インフラ関心事（トレース ID、相関 ID）

---

## 実行モデル

### アクティビティベース実行（デフォルト）

サービス連携のツールセットは Temporal のアクティビティ（他の実行エンジンでも同等の仕組み）として実行されます：

1. プランナーが `PlanResult` にツールコールを返す（ペイロードは `json.RawMessage`）
2. ランタイムがツールコールごとに `ExecuteToolActivity` をスケジュールする
3. アクティビティが生成済みコーデックでペイロードをデコードし、検証やヒント付けを行う
4. 正規 JSON を渡して、ツールセット登録の `Execute(ctx, planner.ToolRequest)` を呼ぶ
5. 生成済み result コーデックで結果を再エンコードする

### インライン実行（Agent-as-Tool）

Agent-as-Tool のツールセットは、プランナー視点では「インライン」実行のように見えます。一方でランタイムはプロバイダ側エージェントを実際の子ランとして起動します：

1. ランタイムがツールセット登録の `Inline=true` を検出する
2. `engine.WorkflowContext` を `ctx` に注入し、ツールセットの `Execute` がプロバイダ側エージェントを子ワークフローとして開始できるようにする（子ランは独自の `RunID` を持つ）
3. 親の `RunID` と `ToolCallID` を含むツールメタデータ、および正規 JSON ペイロードとともに `Execute(ctx, call)` を呼ぶ
4. 生成済み agent-tool エクゼキュータが、ツールペイロードからネストしたエージェントメッセージ（system + user）を組み立て、プロバイダ側エージェントを子ランとして実行する
5. 子ラン側で plan/execute/resume ループを完走し、`RunOutput` とツールイベントが親 `planner.ToolResult` に集約される（結果ペイロード、集約テレメトリ、`ChildrenCount`、子ランへの `RunLink` を含む）
6. ストリーム購読者が親ツールコールの `tool_start` / `tool_end` に加え、`agent_run_started` のリンクイベントも発行するため、UI やデバッガは必要に応じて子ランのストリームへアタッチできる

---

## エクゼキュータ・ファースト（Executor-First）モデル

生成されるサービスツールセットは、単一の汎用コンストラクタを公開します：

```go
New<Agent><Toolset>ToolsetRegistration(exec runtime.ToolCallExecutor)
```

アプリケーションは、消費するツールセットごとにエクゼキュータ実装を登録します。エクゼキュータは、ツールの実行方法（サービスクライアント、MCP、ネストしたエージェントなど）を決め、`ToolCallMeta` で呼び出し単位の明示的なメタデータを受け取ります。

**エクゼキュータ例：**

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return planner.ToolResult{
                Error: planner.NewToolError("invalid payload"),
            }, nil
        }
        
        // Optional transforms if emitted by codegen
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return planner.ToolResult{
                Error: planner.ToolErrorFromError(err),
            }, nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return planner.ToolResult{Payload: tr}, nil
        
    default:
        return planner.ToolResult{
            Error: planner.NewToolError("unknown tool"),
        }, nil
    }
}
```

---

## ツールコール・メタデータ

ツールエクゼキュータは、`context.Context` から値を「釣り上げる」のではなく、`ToolCallMeta` を通じて呼び出し単位の明示的なメタデータを受け取ります。これにより、相関付け・テレメトリ・親子関係のための、ラン単位 ID に直接アクセスできます。

### ToolCallMeta のフィールド

| フィールド | 説明 |
|----------|------|
| `RunID` | このツールコールを所有するランの耐久的なワークフロー実行 ID。リトライをまたいで安定し、ランタイム記録とテレメトリの相関に使います。 |
| `SessionID` | 関連するランを論理的にグルーピング（例：チャット会話）。サービスは通常、セッション単位でメモリや検索属性をインデックスします。 |
| `TurnID` | このツールコールを生成した会話ターン ID。イベントストリームがイベントの順序付けやグルーピングに使います。 |
| `ToolCallID` | ツール呼び出しを一意に識別。開始/更新/終了イベントおよび親子関係の相関に使います。 |
| `ParentToolCallID` | 子呼び出しの場合の親ツールコール ID（例：agent-tool が起動したツール）。UI と購読者がコールツリー再構築に使います。 |

### エクゼキュータのシグネチャ

すべてのツールエクゼキュータは、`ToolCallMeta` を明示パラメータとして受け取ります：

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*planner.ToolResult, error) {
    // Access run context directly from meta
    log.Printf("Executing tool in run %s, session %s, turn %s", 
        meta.RunID, meta.SessionID, meta.TurnID)
    
    // Use ToolCallID for correlation
    span := tracer.StartSpan("tool.execute", trace.WithAttributes(
        attribute.String("tool.call_id", meta.ToolCallID),
        attribute.String("tool.parent_call_id", meta.ParentToolCallID),
    ))
    defer span.End()
    
    // ... tool implementation
}
```

### 明示的メタデータにする理由

明示的メタデータ・パターンには次の利点があります：

- **型安全**：必要な識別子が存在することをコンパイル時に保証
- **テスト容易性**：context をモックせずにメタデータを簡単に構築できる
- **明快さ**：context key やミドルウェア順序への暗黙依存がない
- **相関性**：ネストした agent-tool 呼び出しの親子関係に直接アクセスできる
- **トレーサビリティ**：ユーザ入力 → ツール実行 → 最終応答までの因果チェーンを明確に追える

---

## 非同期・耐久実行（Async & Durable Execution）

Goa-AI は、サービス連携のツール実行に **Temporal Activities** を利用します。この「async-first」なアーキテクチャは暗黙であり、特別な DSL は不要です。

### 暗黙の非同期（Implicit Async）

プランナーがツール呼び出しを決めたとき、ランタイムは OS スレッドをブロックしません。代わりに：

1. ランタイムがツールコールの **Temporal Activity** をスケジュールする
2. エージェントワークフローが実行を一時停止（状態を保存）
3. アクティビティが実行される（ローカル / リモート / 別クラスタでもよい）
4. アクティビティ完了後、ワークフローが復帰し状態を復元して、結果とともに再開する

つまり **すべてのツールコール** は自動的に並列化可能で、耐久的で、長時間実行にも向きます。標準の async 動作のために `InterruptsAllowed` を設定する必要は **ありません**。

### Pause & Resume（エージェントレベル）

`InterruptsAllowed(true)` は別物です。これは、現在実行中のツールアクティビティに紐づかない任意の外部シグナル（例：ユーザの追加回答）を待つために、**エージェント自体**が停止できるようにします。

| 機能 | 暗黙の非同期 | Pause & Resume |
|------|--------------|----------------|
| **スコープ** | 単一ツール実行 | エージェントワークフロー全体 |
| **トリガ** | 任意のサービスツール呼び出し | 引数不足 / プランナー要求 |
| **必要なポリシー** | なし（デフォルト） | `InterruptsAllowed(true)` |
| **用途** | 遅い API / バッチ / 処理 | Human-in-the-loop / 追加確認 |

ポリシーを有効化する前に、本当に *エージェントレベル* の停止が必要かを確認してください。多くの場合、標準のツール非同期で十分です。

### 非ブロッキングなプランナー

**プランナー（LLM）** の視点では、やり取りは同期的に見えます。モデルがツールを要求し「停止」し、次のターンで結果が「見える」からです。

一方、**インフラ** の視点では完全に非同期・ノンブロッキングです。そのため、小さなエージェントワーカーでも、スレッドやメモリ枯渇なしに多数の長時間実行を同時に扱えます。

### 再起動を跨いだ継続

実行は耐久的なので、ツール実行中にバックエンド全体（エージェントワーカー含む）を再起動しても問題ありません。復旧後は：

- 保留中のツールアクティビティがワーカーにより再取得されます
- 完了したツールが親ワークフローへ結果を返します
- エージェントは中断した地点から正確に再開します

これは、動的な環境でも信頼性高く動くプロダクション品質のエージェントシステムを構築するうえで重要です。

---

## Transforms

ツールが `BindTo` を介して Goa メソッドに紐づくと、コード生成はツールの Args / Return とメソッドの Payload / Result を解析します。形状が互換なら、Goa は型安全な transform ヘルパを生成します：

- `ToMethodPayload_<Tool>(in <ToolArgs>) (<MethodPayload>, error)`
- `ToToolReturn_<Tool>(in <MethodResult>) (<ToolReturn>, error)`

Transforms は `gen/<service>/agents/<agent>/specs/<toolset>/transforms.go` に生成され、Goa の GoTransform を使って安全にフィールドをマッピングします。transform が生成されない場合は、エクゼキュータ側で明示的なマッパーを書いてください。

---

## ツール識別子（Tool Identity）

各ツールセットは、生成されたすべてのツール（非エクスポートのツールセットを含む）に対して、型付きツール ID（`tools.Ident`）を定義します。アドホックな文字列ではなく、これらの定数を使ってください：

```go
import chattools "example.com/assistant/gen/orchestrator/agents/chat/agenttools/search"

// Use a generated constant instead of ad-hoc strings/casts
spec, _ := rt.ToolSpec(chattools.Search)
schemas, _ := rt.ToolSchema(chattools.Search)
```

エクスポートされたツールセット（agent-as-tool）については、Goa-AI は **agenttools** パッケージも生成します：

- 型付きツール ID
- エイリアスの payload / result 型
- コーデック
- ヘルパービルダ（例：`New<Search>Call`）

---

## ツール検証とリトライヒント

Goa-AI は **Goa の設計時検証** と **構造化されたツールエラーモデル** を組み合わせ、LLM プランナーが **不正なツールコールを自動的に修復** するための強力な手段を提供します。

### 中核型：ToolError と RetryHint

**ToolError**（`runtime/agent/toolerrors.ToolError` のエイリアス）：

- `Message string`：人間可読な要約
- `Cause *ToolError`：任意のネスト原因（リトライや agent-as-tool hop を跨いだチェーンを保持）
- コンストラクタ：`planner.NewToolError(msg)`, `planner.NewToolErrorWithCause(msg, cause)`, `planner.ToolErrorFromError(err)`, `planner.ToolErrorf(format, args...)`

**RetryHint**：ランタイムとポリシーエンジンが利用する、プランナー側のヒント：

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

よく使う `RetryReason` の値：

- `invalid_arguments`：ペイロードが検証に失敗（スキーマ / 型）
- `missing_fields`：必須フィールドが欠落
- `malformed_response`：ツールがデコードできないデータを返した
- `timeout`, `rate_limited`, `tool_unavailable`：実行 / インフラ起因の問題

**ToolResult** はエラーとヒントを運びます：

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

### 不正なツールコールの自動修復

推奨パターンは次のとおりです：

1. **強いペイロードスキーマでツールを設計する**（Goa design）
2. **検証失敗を隠したり panic しない**：`ToolError` + `RetryHint` として表面化する
3. **プランナーにヒント解釈を教える**：`ToolResult.Error` と `ToolResult.RetryHint` を読み、可能ならペイロードを修復して適切にリトライする

**エクゼキュータ例：**

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (*planner.ToolResult, error) {
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        return &planner.ToolResult{
            Name: call.Name,
            Error: planner.NewToolError("invalid payload"),
            RetryHint: &planner.RetryHint{
                Reason:        planner.RetryReasonInvalidArguments,
                Tool:          call.Name,
                RestrictToTool: true,
                Message:       "Payload did not match the expected schema.",
            },
        }, nil
    }

    res, err := client.Upsert(ctx, args)
    if err != nil {
        return &planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }, nil
    }

    return &planner.ToolResult{Name: call.Name, Result: res}, nil
}
```

**プランナー側ロジック例：**

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolResults) == 0 {
        return &planner.PlanResult{}, nil
    }

    last := in.ToolResults[len(in.ToolResults)-1]
    if last.Error != nil && last.RetryHint != nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
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
        }
    }

    return &planner.PlanResult{/* FinalResponse, next ToolCalls, ... */}, nil
}
```

---

## ツールカタログとスキーマ

Goa-AI エージェントは、Goa デザインから **単一の権威あるツールカタログ** を生成します。このカタログは次を支えます：

- プランナーへのツール広告（モデルが呼べるツール一覧）
- UI での発見（ツール一覧、カテゴリ、スキーマ）
- 機械可読な仕様が必要な外部オーケストレータ（MCP、カスタムフロントエンドなど）

### 生成される specs と tool_schemas.json

エージェントごとに、Goa-AI は **specs パッケージ** と **JSON カタログ** を生成します。

**Specs パッケージ（`gen/<service>/agents/<agent>/specs/...`）：**

- `types.go`：payload / result の Go 構造体
- `codecs.go`：JSON コーデック（型付き payload / result の encode / decode）
- `specs.go`：正規ツール ID、payload / result スキーマ、ヒントを持つ `[]tools.ToolSpec`

**JSON カタログ（`tool_schemas.json`）：**

場所：`gen/<service>/agents/<agent>/specs/tool_schemas.json`

ツールごとに 1 エントリがあり、次を含みます：

- `id`：正規ツール ID（`"<service>.<toolset>.<tool>"`）
- `service`, `toolset`, `title`, `description`, `tags`
- `payload.schema` と `result.schema`（JSON Schema）

この JSON は、LLM プロバイダへスキーマを渡す、UI のフォーム/エディタを構築する、オフラインのドキュメントツールを作る、といった用途に向きます。

### ランタイムのイントロスペクション API

実行時に `tool_schemas.json` をディスクから読む必要はありません。ランタイムがイントロスペクション API を提供します：

```go
agents   := rt.ListAgents()     // []agent.Ident
toolsets := rt.ListToolsets()   // []string

spec,   ok := rt.ToolSpec(toolID)              // single ToolSpec
schemas, ok := rt.ToolSchema(toolID)           // payload/result schemas
specs   := rt.ToolSpecsForAgent(chat.AgentID)  // []ToolSpec for one agent
```

ここで `toolID` は、生成された specs もしくは agenttools パッケージの型付き `tools.Ident` 定数です。

### 型付きサイドカー（Artifacts）

ツールによっては、UI や監査では有用でもモデルプロバイダへ渡すには重すぎる **リッチな成果物**（完全な時系列、トポロジーグラフ、大規模な結果セットなど）を返したい場合があります。Goa-AI はこれを **typed sidecars（型付きサイドカー）**（別名 artifacts）としてモデル化します。

#### モデル向け結果とサイドカーデータ

重要なのは「どのデータがどこへ流れるか」です：

| データ種別 | モデルへ送る | 保存/ストリーム | 目的 |
|----------|-------------|----------------|------|
| **モデル向け結果** | ✓ | ✓ | LLM が推論するための bounded な要約 |
| **サイドカー / Artifact** | ✗ | ✓ | UI、監査、下流コンシューマのための完全忠実度データ |

この分離により：

- モデルのコンテキストを bounded に保てる
- LLM プロンプトを肥大化させずにリッチな可視化（チャート、グラフ、表）を提供できる
- モデルが見る必要のない provenance / 監査データを付けられる
- モデルは要約で作業しながら、大きなデータセットを UI へストリームできる

#### DSL での artifacts 宣言

`Tool` 定義内で `Artifact(kind, schema)` を使います：

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp (RFC3339)")
        Attribute("end_time", String, "End timestamp (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    // Model-facing result: bounded summary
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
        Attribute("min_value", Float64, "Minimum value in range")
        Attribute("max_value", Float64, "Maximum value in range")
        Required("summary", "count")
    })
    // Sidecar: full-fidelity data for UIs
    Artifact("time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    })
})
```

`kind`（例：`"time_series"`）は artifact の種類を識別し、UI が適切なレンダラへディスパッチするために使います。

#### 生成される specs とヘルパ

specs パッケージでは、各 `tools.ToolSpec` が次を含みます：

- `Payload tools.TypeSpec`：入力スキーマ
- `Result tools.TypeSpec`：モデル向け出力スキーマ
- `Sidecar *tools.TypeSpec`（任意）：artifact スキーマ

Goa-AI は sidecar を扱うための型付きヘルパを生成します：

```go
// Get artifact from a tool result
func GetGetTimeSeriesSidecar(res *planner.ToolResult) (*GetTimeSeriesSidecar, error)

// Attach artifact to a tool result
func SetGetTimeSeriesSidecar(res *planner.ToolResult, sc *GetTimeSeriesSidecar) error
```

#### ランタイムでの利用パターン

**ツールエクゼキュータ側**では、結果に artifacts を付与します：

```go
func (e *Executor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*planner.ToolResult, error) {
    args, _ := specs.UnmarshalGetTimeSeriesPayload(call.Payload)
    
    // Fetch full data
    fullData, err := e.dataService.GetTimeSeries(ctx, args.DeviceID, args.StartTime, args.EndTime)
    if err != nil {
        return &planner.ToolResult{Error: planner.ToolErrorFromError(err)}, nil
    }
    
    // Build bounded model-facing result
    result := &specs.GetTimeSeriesResult{
        Summary:  fmt.Sprintf("Retrieved %d data points from %s to %s", len(fullData.Points), args.StartTime, args.EndTime),
        Count:    len(fullData.Points),
        MinValue: fullData.Min,
        MaxValue: fullData.Max,
    }
    
    // Build full-fidelity artifact for UIs
    artifact := &specs.GetTimeSeriesSidecar{
        DataPoints: fullData.Points,
        Metadata:   fullData.Metadata,
    }
    
    // Attach artifact to result
    toolResult := &planner.ToolResult{
        Name:   call.Name,
        Result: result,
    }
    specs.SetGetTimeSeriesSidecar(toolResult, artifact)
    
    return toolResult, nil
}
```

**ストリーム購読者や UI ハンドラ側**では、artifacts にアクセスします：

```go
func handleToolEnd(event *stream.ToolEndEvent) {
    // Artifacts are available on the event
    for _, artifact := range event.Artifacts {
        switch artifact.Kind {
        case "time_series":
            // Render time series chart
            renderTimeSeriesChart(artifact.Data)
        case "topology":
            // Render network graph
            renderTopologyGraph(artifact.Data)
        }
    }
}
```

#### Artifact の構造

`planner.Artifact` は次を運びます：

```go
type Artifact struct {
    Kind       string       // Logical type (e.g., "time_series", "chart_data")
    Data       any          // JSON-serializable payload
    SourceTool tools.Ident  // Tool that produced this artifact
    RunLink    *run.Handle  // Link to nested agent run (for agent-as-tool)
}
```

#### artifacts を使うべきとき

次の場合に artifacts を使います：

- モデルのコンテキストには大きすぎるデータ（時系列、ログ、大きな表）を結果として扱いたい
- UI が可視化のために構造化データ（チャート、グラフ、地図）を必要とする
- モデルが推論するデータと、ユーザが見るデータを分離したい
- モデルは要約で作業しつつ、下流システムには完全忠実度が必要

次の場合は artifacts を避けます：

- 完全な結果がモデルコンテキストに収まる
- 完全データを必要とする UI / 下流コンシューマが存在しない
- bounded な結果だけで必要十分

---

## ベストプラクティス

- **検証はプランナーではなくデザインに置く**：Goa の属性 DSL（`Required`, `MinLength`, `Enum` など）を使う
- **エクゼキュータは ToolError + RetryHint を返す**：panic や素の `error` より構造化エラーを優先
- **ヒントは短く、しかし実行可能に**：欠落/無効なフィールド、短い明確化質問、小さな `ExampleInput` に集中
- **プランナーにヒント読解を教える**：`RetryHint` 処理をプランナーのファーストクラスにする
- **サービス内で再検証しない**：Goa-AI はツール境界で検証される前提

---

## 次のステップ

- **[Agent Composition](./agent-composition.md)** - agent-as-tool パターンで複雑なシステムを構築する
- **[MCP Integration](./mcp-integration.md)** - 外部ツールサーバに接続する
- **[Runtime](./runtime.md)** - ツール実行フローを理解する

