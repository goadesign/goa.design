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

- `gen/<service>/toolsets/<toolset>/` の配下に、ツールセット単位の specs / types / codecs が生成されます
- 内部ツールレジストリを使用する場合、レジストリ経由のサービス側実行のために `gen/<service>/toolsets/<toolset>/provider.go` も生成されます
- これらのツールセットを `Use` するエージェントは、プロバイダ側 specs を import し、型付きのコールビルダとエクゼキュータ・ファクトリを取得します
- アプリケーションは、（ランタイム提供のコーデック経由で）型付き引数をデコードし、必要に応じて transforms を使い、サービスクライアントを呼び出して `ToolResult` を返すエクゼキュータを登録します

プロセス間呼び出しのために内部ツールレジストリをデプロイする場合、所有サービスは `toolset:<toolsetID>:requests` に subscribe して `result:<toolUseID>` に publish する provider ループを実行します。provider の接続スニペットは [レジストリのドキュメント]({{< ref "/docs/2-goa-ai/registry.md" >}}) を参照してください。

### エージェント実装のツールセット（Agent-as-Tool）

エージェントの `Export` ブロックで定義し、必要に応じて他のエージェントが `Use` できます。

- 所有権はあくまでサービス側にあり、エージェントが実装になります
- プロバイダ側には `gen/<service>/agents/<agent>/exports/<export>` 配下に export パッケージが生成され、`NewRegistration` と型付きのコールビルダを提供します
- エクスポートされたツールセットを `Use` するコンシューマ側のヘルパは、ルーティング用メタデータを一元化したままプロバイダ側ヘルパへ委譲します
- 実行はインラインで行われます。ペイロードは正規（canonical）の JSON として渡され、プロンプト作成のために必要な場合のみ境界でデコードされます

### MCP ツールセット

`Toolset(FromMCP(service, suite))` は Goa-backed MCP suite 用、`Toolset("name", FromExternalMCP(service, suite), func() { ... })` はインライン tool schema を持つ外部 MCP server 用です。

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
func (e *Executor) Execute(
    ctx context.Context,
    meta *runtime.ToolCallMeta,
    call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case specs.Summarize:
        args, _ := specs.UnmarshalSummarizePayload(call.Payload)
        // Custom logic: fetch multiple docs, combine, summarize
        summary := e.summarizeDocuments(ctx, args.DocIDs)
        return runtime.Executed(&planner.ToolResult{
            Name:   call.Name,
            Result: &specs.SummarizeResult{Summary: summary},
        }), nil
    }
    return runtime.Executed(&planner.ToolResult{
        Name:  call.Name,
        Error: planner.NewToolError("unknown tool"),
    }), nil
}
```

### バウンデッドなツール結果

一部の tool は、大きな list、graph、time-series window を返すのが自然です。これらを **bounded view** としてマークすると、trim は service が責任を持ったまま、runtime が contract を強制し表面化できます。

#### agent.Bounds contract

`agent.Bounds` は、tool result が underlying data set 全体に対してどのように bounded されたかを表す、小さな provider-agnostic contract です:

```go
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied (length, window, depth)
    RefinementHint string // Guidance on how to narrow the query when truncated
}
```

| フィールド | 説明 |
|-------|-------------|
| `Returned` | result に実際に含まれる item 数 |
| `Total` | truncation 前の total item 数の best-effort 値 (不明なら nil) |
| `Truncated` | pagination、depth limit、size limit など何らかの cap が適用された場合 true |
| `RefinementHint` | result が truncated のとき、query を絞るための人間可読な案内 |

#### trim は service の責務

runtime は subset や truncation を自分では計算しません。**service は次を担います**:

1. **truncation logic の適用**: pagination、result limit、depth cap、time window
2. **runtime bounds metadata の populate**: `planner.ToolResult.Bounds` を設定する
3. **refinement hint の提供**: result が truncated のとき、user/model に query の絞り方を案内する

この設計により、truncation logic を domain knowledge がある service に置いたまま、runtime、planner、UI が消費できる統一 contract を提供できます。

#### bounded tool を宣言する

`Tool` 定義内で DSL helper `BoundedResult()` を使います:

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("site_id", String, "Site identifier")
        Attribute("cursor", String, "Opaque pagination cursor")
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "Matching devices")
        Required("devices")
    })
    BoundedResult(func() {
        Cursor("cursor")
        NextCursor("next_cursor")
    })
    BindTo("DeviceService", "ListDevices")
})
```

#### コード生成

tool が `BoundedResult()` でマークされると:

- 生成 tool spec に `tools.ToolSpec.Bounds` が含まれます
- 生成 JSON result schema には正規 bounded field (`returned`, `total`, `truncated`, `refinement_hint`, optional `next_cursor`) が含まれます
- semantic Go result type は domain-specific のままで、それらの field を重複させる必要はありません

method-backed `BindTo` tool では、生成 executor が runtime projection 前に `planner.ToolResult.Bounds` を構築できるよう、bound service method result は正規 bounded field を保持する必要があります。

```go
spec.Bounds = &tools.BoundsSpec{
    Paging: &tools.PagingSpec{
        CursorField:     "cursor",
        NextCursorField: "next_cursor",
    },
}
```

#### bounded tool を実装する

bounded tool は強い contract です。service は truncation を実装し、すべての successful path で bounds metadata を populate します。

**Contract:**

- `Bounds.Returned` と `Bounds.Truncated` は successful bounded tool result で常に設定する必要があります。
- `Bounds.Total`、`Bounds.NextCursor`、`Bounds.RefinementHint` は optional で、分かる場合だけ設定します。

executor は truncation を実装し、bounds metadata を populate します:

```go
func (e *DeviceExecutor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    args, err := specs.UnmarshalListDevicesPayload(call.Payload)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("invalid payload"),
        }), nil
    }

    devices, total, nextCursor, truncated, err := e.repo.QueryDevices(ctx, args.SiteID, args.Cursor)
    if err != nil {
        return nil, err
    }

    return runtime.Executed(&planner.ToolResult{
        Name: call.Name,
        Result: &ListDevicesResult{
            Devices: devices,
        },
        Bounds: &agent.Bounds{
            Returned:       len(devices),
            Total:          ptr(total),
            Truncated:      truncated,
            NextCursor:     nextCursor,
            RefinementHint: "Add a status filter or reduce the site scope to see fewer results",
        },
    }), nil
}
```

#### Runtime behavior

bounded tool が実行されると:

1. runtime は successful bounded tool が `planner.ToolResult.Bounds` を返したことを検証します
2. runtime は `BoundedResult(...)` の field name を使い、emitted JSON に bounds を merge します
3. bounds は `planner.ToolResult.Bounds` に付いたままです
4. stream subscriber と finalizer は UI display、logging、policy decision に bounds を使えます

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

#### BoundedResult を使う場面

`BoundedResult()` は次のような tool に使います:

- paginated list を返す (device、user、record、log)
- result limit 付きで大きな dataset を query する
- nested structure (graph/tree) に depth/size cap を適用する
- time-windowed data (metric/event) を返す

bounded contract は次を助けます:

- **Model** は result が不完全かもしれないことを理解し、refinement を要求できます
- **UI** は truncation indicator や pagination control を表示できます
- **Policy** は size limit を強制し、runaway query を検出できます

### 注入フィールド（Injected Fields）

`Inject` DSL 関数は、特定のペイロードフィールドを「注入フィールド」としてマークします。これは LLM からは見えない一方で、サービスメソッドには必須となる、サーバサイドのインフラ値（セッション ID、ユーザコンテキスト、認証トークンなど）に使えます。

#### Inject の仕組み

フィールドを `Inject` でマークすると：

1. **LLM から隠される**：モデルプロバイダへ送る JSON Schema から除外されます
2. **設計時に検証される**：バインド先メソッド payload 上の必須 `String` フィールドでなければなりません
3. **executor が設定する**：生成 executor が `runtime.ToolCallMeta` から値をコピーし、その後で必要なら hook を実行します

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

メソッドにバインドされたツール向けの生成 executor は、サービスクライアントを呼ぶ前に `runtime.ToolCallMeta` から注入フィールドを型付きメソッド payload へコピーします:

```go
p := specs.InitGetUserDataMethodPayload(toolArgs)
p.SessionID = meta.SessionID
```

サポートされる注入フィールド名は固定で、`run_id`、`session_id`、`turn_id`、`tool_call_id`、`parent_tool_call_id` です。

#### 生成された interceptor による実行時設定

生成されたサービス executor は型付き hook も公開します。リクエストコンテキストや他のランタイム状態からメソッド payload を補完したい場合はそれを使います:

```go
type SessionInterceptor struct{}

func (i *SessionInterceptor) Inject(ctx context.Context, payload any, meta *runtime.ToolCallMeta) error {
    sessionID, ok := ctx.Value(sessionKey).(string)
    if !ok {
        return fmt.Errorf("session ID not found in context")
    }

    switch p := payload.(type) {
    case *userservice.GetDataPayload:
        p.SessionID = sessionID
    }
    return nil
}

exec := usertools.NewChatUserToolsExec(
    usertools.WithClient(userClient),
    usertools.WithInterceptors(&SessionInterceptor{}),
)
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
6. ストリーム購読者が親ツールコールの `tool_start` / `tool_end` に加え、`child_run_linked` のリンクイベントも発行するため、UI は単一のセッションストリームを消費しながらネストされたエージェントカードを構築できる

### 結果マテリアライザ

toolset には、型付きの結果マテリアライザを登録できます。

```go
reg := runtime.ToolsetRegistration{
    Name: "chat.ask_question",
    Execute: runtime.ToolCallExecutorFunc(func(
        ctx context.Context,
        meta *runtime.ToolCallMeta,
        call *planner.ToolRequest,
    ) (*runtime.ToolExecutionResult, error) {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("externally provided"),
        }), nil
    }),
    Specs: []tools.ToolSpec{specs.SpecAskQuestion},
    ResultMaterializer: func(ctx context.Context, meta runtime.ToolCallMeta, call *planner.ToolRequest, result *planner.ToolResult) error {
        // 決定論的な server-only sidecar をここで付与します。
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

契約:

- `ResultMaterializer` は、**通常の実行パス** と **外部提供結果による await パス** の両方で実行されます。
- ランタイムが hooks、workflow 境界、呼び出し側向けに JSON をエンコードする前に、元の型付き `planner.ToolRequest` と型付き `planner.ToolResult` を受け取ります。
- `result.ServerData` を付与したり、結果の意味的な形を決定論的に正規化したりする用途に使います。
- 純粋かつ決定論的である必要があります。workflow コード内で動く場合、I/O を行ってはいけません。

これは、元のツール payload と型付き結果から observer-only sidecar を導出しつつ、それらの sidecar をモデルプロバイダから見えないままに保つための正規の場所です。

---

## エクゼキュータ・ファースト（Executor-First）モデル

生成された service toolset は、エージェントが使う toolset ごとに `runtime.ToolCallExecutor` 実装を受け取る registration helper を公開します:

```go
if err := chat.RegisterUsedToolsets(ctx, rt,
    chat.WithSearchExecutor(searchExec),
    chat.WithProfilesExecutor(profileExec),
); err != nil {
    return err
}
```

アプリケーションは、消費する local toolset ごとに executor 実装を登録します。executor は tool の実行方法 (service client、custom function、registry caller など) を決め、`ToolCallMeta` で呼び出し単位の明示的な metadata を受け取ります。

**エクゼキュータ例：**

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name:  call.Name,
                Error: planner.NewToolError("invalid payload"),
            }), nil
        }

        // Optional transforms if emitted by codegen
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name:  call.Name,
                Error: planner.ToolErrorFromError(err),
            }), nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return runtime.Executed(&planner.ToolResult{
            Name:   call.Name,
            Result: tr,
        }), nil

    default:
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("unknown tool"),
        }), nil
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
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
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

Transforms はツールセットのオーナー・パッケージ（例: `gen/<service>/toolsets/<toolset>/transforms.go`）に生成され、Goa の GoTransform を使って安全にフィールドをマッピングします。transform が生成されない場合は、エクゼキュータ側で明示的なマッパーを書いてください。

---

## ツール識別子（Tool Identity）

各ツールセットは、生成されたすべてのツール（非エクスポートのツールセットを含む）に対して、型付きツール ID（`tools.Ident`）を定義します。アドホックな文字列ではなく、これらの定数を使ってください：

```go
import searchspecs "example.com/assistant/gen/orchestrator/toolsets/search"

// Use a generated constant instead of ad-hoc strings/casts
spec, _ := rt.ToolSpec(searchspecs.Search)
schemas, _ := rt.ToolSchema(searchspecs.Search)
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
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name: call.Name,
            Error: planner.NewToolError("invalid payload"),
            RetryHint: &planner.RetryHint{
                Reason:        planner.RetryReasonInvalidArguments,
                Tool:          call.Name,
                RestrictToTool: true,
                Message:       "Payload did not match the expected schema.",
            },
        }), nil
    }

    res, err := client.Upsert(ctx, args)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }), nil
    }

    return runtime.Executed(&planner.ToolResult{Name: call.Name, Result: res}), nil
}
```

**プランナー側ロジック例：**

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolOutputs) == 0 {
        return &planner.PlanResult{}, nil
    }

    last := in.ToolOutputs[len(in.ToolOutputs)-1]
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

### Server Data

一部の tool は、UI や audit system には有用でも model provider には重すぎる rich observer-facing output (完全な time series、topology graph、大きな result set、evidence reference など) を返す必要があります。Goa-AI は、その model 向けではない出力を **server-data** としてモデル化します。

#### Model-facing result と Server Data

重要なのは、どの data がどこへ流れるかです:

| Data Type | Model へ送る | 保存/stream | 目的 |
|-----------|---------------|-----------------|---------|
| **Model-facing result** | ✓ | ✓ | LLM が推論する bounded summary |
| **Timeline server-data** | ✗ | ✓ | UI、timeline、chart、map、table 向け observer-facing data |
| **Evidence server-data** | ✗ | ✓ | provenance reference または audit evidence |
| **Internal server-data** | ✗ | consumer に依存 | tool-composition attachment または server-only metadata |

この分離により:

- model context window を bounded で focused に保てます
- LLM prompt を肥大化させずに rich visualization (chart、graph、table) を提供できます
- model が見る必要のない provenance/audit data を付けられます
- model は summary で作業しつつ、large dataset を UI へ stream できます

#### DSL で ServerData を宣言する

`Tool` 定義内で `ServerData(kind, schema)` を使います:

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
    // Server-data: full-fidelity data for observers (e.g., UIs)
    ServerData("atlas.time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    }, func() {
        AudienceTimeline()
    })
})
```

`kind` parameter (例: `"atlas.time_series"`) は server-data kind を識別し、UI が適切な renderer に dispatch できるようにします。audience は routing intent を宣言します:

- `AudienceTimeline()` は observer-facing timeline/UI payload 用です。
- `AudienceEvidence()` は provenance または audit evidence 用です。
- `AudienceInternal()` は server-only composition payload 用です。

`BindTo(...)` tool で server-data payload を bound service method result の field から project する場合は `FromMethodResultField("field_name")` を使います。

#### 生成 spec と helper

specs package では、各 `tools.ToolSpec` entry に次が含まれます:

- `Payload tools.TypeSpec` – tool input schema
- `Result tools.TypeSpec` – model-facing output schema
- `ServerData []*tools.ServerDataSpec` – result に付随して emitted される server-only payload

server-data entry には生成 schema と codec が含まれるため、subscriber はそれらの canonical JSON bytes を model provider へ送らずに decode できます。

#### Runtime usage patterns

**tool executor 側**では、canonical server-data JSON を tool result に attach します:

```go
func (e *Executor) Execute(
    ctx context.Context,
    meta *runtime.ToolCallMeta,
    call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
    args, _ := specs.UnmarshalGetTimeSeriesPayload(call.Payload)

    // Fetch full data
    fullData, err := e.dataService.GetTimeSeries(ctx, args.DeviceID, args.StartTime, args.EndTime)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }), nil
    }

    // Build bounded model-facing result
    result := &specs.GetTimeSeriesResult{
        Summary:  fmt.Sprintf("Retrieved %d data points from %s to %s", len(fullData.Points), args.StartTime, args.EndTime),
        Count:    len(fullData.Points),
        MinValue: fullData.Min,
        MaxValue: fullData.Max,
    }

    // Build full-fidelity server-data for UIs
    // Generated server-data codecs are named from the tool and kind, for example:
    // specs.GetTimeSeriesAtlasTimeSeriesServerDataCodec.ToJSON(...)
    serverData, err := buildCanonicalServerData("atlas.time_series", fullData)
    if err != nil {
        return nil, err
    }

    return runtime.Executed(&planner.ToolResult{
        Name:   call.Name,
        Result: result,
        ServerData: serverData,
    }), nil
}
```

method-backed tool は、生成 provider と result materializer を通じて server-data を attach することもできます。materializer は deterministic で、normal execution と externally provided-result await path の両方で実行されます:

```go
reg := runtime.ToolsetRegistration{
    Name:  "orchestrator.metrics",
    Specs: []tools.ToolSpec{specs.SpecGetTimeSeries},
    ResultMaterializer: func(ctx context.Context, meta runtime.ToolCallMeta, call *planner.ToolRequest, result *planner.ToolResult) error {
        if len(result.ServerData) != 0 {
            return nil
        }
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

**stream subscriber や UI handler 側**では、tool end event または run log から `ServerData` を読み、宣言 kind 用の生成 codec で decode します:

```go
func handleToolEnd(event stream.ToolEnd) {
    if len(event.Data.ServerData) == 0 {
        return
    }
    data, err := decodeTimeSeriesServerData(event.Data.ServerData)
    if err != nil {
        log.Printf("invalid server-data: %v", err)
        return
    }
    renderTimeSeriesChart(data.DataPoints)
}
```

#### ServerData を使う場面

server-data は次の場合に使います:

- tool result に model context には大きすぎる data (time series、log、大きな table) が含まれる
- UI が visualization (chart、graph、map) のために structured data を必要とする
- model が推論する data と user が見る data を分けたい
- downstream system が full-fidelity data を必要とし、model は summary で十分な場合

次の場合は server-data を避けます:

- 完全な result が model context に無理なく収まる
- 完全 data を必要とする UI/downstream consumer がない
- bounded result だけで必要な情報をすでに含んでいる

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

