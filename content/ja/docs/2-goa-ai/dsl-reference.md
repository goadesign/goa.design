---
title: DSLリファレンス
weight: 2
description: "Goa-AI の DSL 関数（エージェント、ツールセット、ポリシー、MCP 連携）を網羅した完全リファレンス。"
llm_optimized: true
aliases:
---

このドキュメントは Goa-AI の DSL 関数の完全なリファレンスを提供します。[ランタイム](./runtime.md) ガイドと合わせて読むことで、デザインがランタイムの挙動にどのように変換されるかを理解できます。

## DSL クイックリファレンス

| 関数 | コンテキスト | 説明 |
|----------|---------|-------------|
| **エージェント関数** | | |
| `Agent` | Service | LLM ベースのエージェントを定義する |
| `Use` | Agent | ツールセットの利用（消費）を宣言する |
| `Export` | Agent, Service | 他エージェント向けにツールセットを公開する |
| `AgentToolset` | Use 引数 | 他エージェントが公開したツールセットを参照する |
| `UseAgentToolset` | Agent | `AgentToolset` + `Use` のエイリアス |
| `Passthrough` | Tool（Export 内） | 決定論的にサービスメソッドへフォワードする |
| `DisableAgentDocs` | API | `AGENTS_QUICKSTART.md` の生成を無効にする |
| **ツールセット関数** | | |
| `Toolset` | トップレベル | プロバイダ所有のツールセットを宣言する |
| `FromMCP` | Toolset 引数 | MCP バックエンドのツールセットとして構成する |
| `FromRegistry` | Toolset 引数 | レジストリ由来のツールセットとして構成する |
| `Description` | Toolset | ツールセットの説明を設定する |
| **ツール関数** | | |
| `Tool` | Toolset, Method | 呼び出し可能なツールを定義する |
| `Args` | Tool | 入力パラメータのスキーマを定義する |
| `Return` | Tool | 出力結果のスキーマを定義する |
| `ServerData` | Tool | ツール結果に付随するサーバーデータ（モデルには送らない）のスキーマを定義する |
| `ServerDataDefault` | Tool | 予約フィールド `server_data` が省略/`"auto"` のときの既定値（`"on"`/`"off"`）を設定する |
| `BoundedResult` | Tool | 結果を「境界付きビュー」としてマークし、bounds フィールドの標準形を適用する（任意で cursor 設定のサブ DSL を指定可能） |
| `Cursor` | BoundedResult | ページング用 cursor を格納する payload フィールド名を指定する（任意） |
| `NextCursor` | BoundedResult | 次ページ cursor を格納する result フィールド名を指定する（任意） |
| `Tags` | Tool, Toolset | メタデータラベルを付与する |
| `BindTo` | Tool | ツールをサービスメソッドにバインドする |
| `Inject` | Tool | ランタイム注入フィールドを指定する |
| `CallHintTemplate` | Tool | 呼び出し表示用テンプレート（ヒント） |
| `ResultHintTemplate` | Tool | 結果表示用テンプレート（ヒント） |
| `ResultReminder` | Tool | ツール結果後の静的なシステムリマインダ |
| `Confirmation` | Tool | 実行前に明示的な帯域外確認を要求する |
| **ポリシー関数** | | |
| `RunPolicy` | Agent | 実行制約を設定する |
| `DefaultCaps` | RunPolicy | リソース制限を設定する |
| `MaxToolCalls` | DefaultCaps | 最大ツール呼び出し回数 |
| `MaxConsecutiveFailedToolCalls` | DefaultCaps | 最大連続失敗回数 |
| `TimeBudget` | RunPolicy | 単純なウォールクロック制限 |
| `Timing` | RunPolicy | 詳細なタイムアウト設定 |
| `Budget` | Timing | 実行全体の予算 |
| `Plan` | Timing | プランナー（推論）アクティビティのタイムアウト |
| `Tools` | Timing | ツール実行アクティビティのタイムアウト |
| `History` | RunPolicy | 会話履歴管理 |
| `KeepRecentTurns` | History | スライディングウィンドウ（直近 N ターン） |
| `Compress` | History | モデル支援による要約圧縮 |
| `Cache` | RunPolicy | プロンプトキャッシュ設定 |
| `AfterSystem` | Cache | システムメッセージ後にチェックポイント |
| `AfterTools` | Cache | ツール定義後にチェックポイント |
| `InterruptsAllowed` | RunPolicy | 一時停止/再開を有効化 |
| `OnMissingFields` | RunPolicy | 必須フィールド欠落時の扱い |
| **MCP 関数** | | |
| `MCPServer` | Service | MCP を有効化する |
| `MCP` | Service | `MCPServer` のエイリアス |
| `ProtocolVersion` | MCP オプション | MCP プロトコルバージョンを設定する |
| `MCPTool` | Method | メソッドを MCP ツールとして扱う |
| `MCPToolset` | トップレベル | MCP 由来ツールセットを宣言する |
| `Resource` | Method | メソッドを MCP リソースとして扱う |
| `WatchableResource` | Method | メソッドを購読可能リソースとして扱う |
| `StaticPrompt` | Service | 静的プロンプトテンプレートを追加する |
| `DynamicPrompt` | Method | メソッドをプロンプト生成器として扱う |
| `Notification` | Method | メソッドを通知送信器として扱う |
| `Subscription` | Method | メソッドをサブスクリプションハンドラとして扱う |
| `SubscriptionMonitor` | Method | サブスクリプション監視（SSE）を提供する |
| **レジストリ関数** | | |
| `Registry` | トップレベル | レジストリソースを宣言する |
| `URL` | Registry | エンドポイントを設定する |
| `APIVersion` | Registry | API バージョンを設定する |
| `Timeout` | Registry | HTTP タイムアウトを設定する |
| `Retry` | Registry | リトライポリシーを設定する |
| `SyncInterval` | Registry | カタログ更新間隔を設定する |
| `CacheTTL` | Registry | ローカルキャッシュ有効期間を設定する |
| `Federation` | Registry | 外部レジストリの取り込みを設定する |
| `Include` | Federation | 取り込み対象グロブ |
| `Exclude` | Federation | 除外対象グロブ |
| `PublishTo` | Export | レジストリ公開先を設定する |
| `Version` | Toolset | レジストリツールセットのバージョンを固定する |
| **スキーマ関数** | | |
| `Attribute` | Args, Return, ServerData | スキーマフィールドを定義する（一般） |
| `Field` | Args, Return, ServerData | proto フィールド番号付きで定義する（gRPC） |
| `Required` | Schema | 必須フィールドを指定する |

## Prompt 管理（v1 統合パス）

Goa-AI v1 では、専用の Prompt DSL（`Prompt(...)`, `Prompts(...)`）は **不要** です。
現在の Prompt 管理はランタイム主導で行います。

- ベースラインの prompt spec を `runtime.PromptRegistry` に登録する
- スコープ付き override を `runtime.WithPromptStore(...)` で有効化する
- プランナーから `PlannerContext.RenderPrompt(...)` で prompt を解決・描画する
- 描画した prompt の provenance を `model.Request.PromptRefs` に付与する

agent-as-tool フローでは、agent-tool 登録時に `runtime.WithPromptSpec(...)` などの
ランタイムオプションを使い、tool ID と prompt ID を対応付けます。

### Field と Attribute の違い

`Field` と `Attribute` はどちらもスキーマフィールドを定義しますが、用途が異なります。

**`Attribute(name, type, description, dsl)`** — 一般目的のスキーマ定義:
- JSON のみのスキーマで使用する
- フィールド番号は不要
- 多くのケースで最も簡潔

```go
Args(func() {
    Attribute("query", String, "Search query")
    Attribute("limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**`Field(number, name, type, description, dsl)`** — gRPC/protobuf 向けの番号付きフィールド:
- gRPC サービスを生成する場合に必要
- フィールド番号は一意かつ安定である必要がある
- サービスが HTTP と gRPC の両トランスポートを公開する場合に使用する

```go
Args(func() {
    Field(1, "query", String, "Search query")
    Field(2, "limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**使い分け:**
- JSON のみのエージェントツールなら `Attribute`（最も一般的）
- Goa サービスが gRPC を持ち、ツールがそのメソッドにバインドされる場合は `Field`
- 同じスキーマ内での混在は可能ですが、推奨しません

## 概要

Goa-AI は、エージェント、ツールセット、ランタイムポリシーを宣言するための関数で Goa の DSL を拡張します。DSL は Goa の `eval` エンジンによって評価されるため、標準のサービス/トランスポート DSL と同じルールが適用されます: 式は適切なコンテキストで呼び出す必要があり、属性定義は Goa の型システム（`Attribute`、`Field`、バリデーション、例など）を再利用します。

### インポートパス

Goa デザインパッケージにエージェント DSL を追加します:

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### エントリーポイント

通常の Goa の `Service` 定義の中でエージェントを宣言します。DSL は Goa のデザインツリーを拡張し、`goa gen` の間に処理されます。

### 生成結果

`goa gen` は次を生成します:

- エージェントパッケージ（`gen/<service>/agents/<agent>`）: ワークフロー定義、プランナーアクティビティ、登録ヘルパー
- ツールセットのオーナー・パッケージ（`gen/<service>/toolsets/<toolset>`）: 型付きの payload/result 構造体、specs、codecs、（該当する場合）transforms
- plan/execute/resume ループ用のアクティビティハンドラ
- デザインをランタイムに配線する登録ヘルパー

`DisableAgentDocs()` で無効化しない限り、モジュールルートにコンテキスト付きの `AGENTS_QUICKSTART.md` が書き出されます。

### クイックスタート例

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var DocsToolset = Toolset("docs.search", func() {
    Tool("search", "Search indexed documentation", func() {
        Args(func() {
            Attribute("query", String, "Search phrase")
            Attribute("limit", Int, "Max results", func() { Default(5) })
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Matched snippets")
            Required("documents")
        })
        Tags("docs", "search")
    })
})

var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Description("Human front door for the knowledge agent.")

    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
        Use(AssistantSuite)
        Export("chat.tools", func() {
            Tool("summarize_status", "Produce operator-ready summaries", func() {
                Args(func() {
                    Attribute("prompt", String, "User instructions")
                    Required("prompt")
                })
                Return(func() {
                    Attribute("summary", String, "Assistant response")
                    Required("summary")
                })
                Tags("chat")
            })
        })
        RunPolicy(func() {
            DefaultCaps(
                MaxToolCalls(8),
                MaxConsecutiveFailedToolCalls(3),
            )
            TimeBudget("2m")
        })
    })
})
```

`goa gen example.com/assistant/design` を実行すると、例えば次が生成されます:

- `gen/orchestrator/agents/chat`: ワークフロー + プランナーアクティビティ + エージェントレジストリ
- `gen/orchestrator/agents/chat/specs`: エージェントのツールカタログ（`ToolSpec` の集約 + `tool_schemas.json`）
- `gen/orchestrator/toolsets/<toolset>`: サービス所有ツールセットの types/specs/codecs/transforms
- `gen/orchestrator/agents/chat/exports/<export>`: エクスポートされたツールセット（agent-as-tool）パッケージ
- `MCPToolset` が `Use` で参照された場合の MCP 対応登録ヘルパー

### 型付きツール識別子

ツールセットごとの specs パッケージは、生成されるすべてのツールについて型付きのツール識別子（`tools.Ident`）を定義します:

```go
const (
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

ツールを参照する必要がある場所では、これらの定数を使用してください。

### クロスプロセスのインライン合成

エージェント A が、エージェント B によってエクスポートされたツールセットを「使用する」と宣言した場合、Goa-AI は合成を自動的に配線します:

- エクスポータ（エージェント B）側パッケージには、生成された `agenttools` ヘルパーが含まれる
- コンシューマ（エージェント A）側のエージェントレジストリは、`Use(AgentToolset("service", "agent", "toolset"))` を使ったときにそれらのヘルパーを使用する
- 生成される `Execute` 関数は、ネストされたプランナーメッセージを構築し、プロバイダーエージェントを子ワークフローとして実行し、ネストされたエージェントの `RunOutput` を `planner.ToolResult` に適合させる

これにより、各エージェント実行は単一の決定論的ワークフローとなり、合成のためのリンクされた実行ツリーが得られます。

---

## エージェント関数

### Agent

`Agent(name, description, dsl)` は `Service` の中でエージェントを宣言します。サービススコープのエージェントメタデータを記録し、`Use` と `Export` によってツールセットを関連付けます。

**コンテキスト**: `Service` の内部

各エージェントはランタイム登録として次を持ちます:
- ワークフロー定義と Temporal アクティビティハンドラ
- DSL 由来のリトライ/タイムアウトオプションを持つ PlanStart/PlanResume アクティビティ
- ワークフロー、アクティビティ、ツールセットを登録する `Register<Agent>` ヘルパー

```go
var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
        Export("chat.tools", func() {
            // tools defined here
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Use

`Use(value, dsl)` は、エージェントがツールセットを消費することを宣言します。ツールセットは次のいずれかです:

- トップレベルの `Toolset` 変数
- `MCPToolset` 参照
- インラインツールセット定義（文字列名 + DSL）
- agent-as-tool 合成のための `AgentToolset` 参照

**コンテキスト**: `Agent` の内部

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference with subsetting
    Use(CommonTools, func() {
        Tool("notify") // consume only this tool from CommonTools
    })
    
    // Reference an MCP toolset
    Use(MCPToolset("assistant", "assistant-mcp"))
    
    // Inline agent-local toolset definition
    Use("helpers", func() {
        Tool("answer", "Answer a question", func() {
            // tool definition
        })
    })
    
    // Agent-as-tool composition
    Use(AgentToolset("service", "agent", "toolset"))
})
```

### Export

`Export(value, dsl)` は、他エージェントまたは他サービスへ公開するツールセットを宣言します。エクスポートされたツールセットは、他エージェントが `Use(AgentToolset(...))` を介して消費できます。

**コンテキスト**: `Agent` または `Service` の内部

```go
Agent("planner", "Planning agent", func() {
    Export("planning.tools", func() {
        Tool("create_plan", "Create a plan", func() {
            Args(func() {
                Attribute("goal", String, "Goal to plan for")
                Required("goal")
            })
            Return(func() {
                Attribute("plan", String, "Generated plan")
                Required("plan")
            })
        })
    })
})
```

### AgentToolset

`AgentToolset(service, agent, toolset)` は、他エージェントがエクスポートしたツールセットを参照します。これにより agent-as-tool 合成が可能になります。

**コンテキスト**: `Use` への引数

`AgentToolset` を使う場面:
- エクスポートされたツールセットへの式ハンドルがない
- 複数エージェントが同名のツールセットをエクスポートしている
- デザインで明示して可読性を上げたい

```go
// Agent A exports tools
Agent("planner", func() {
    Export("planning.tools", func() { /* tools */ })
})

// Agent B uses Agent A's tools
Agent("orchestrator", func() {
    Use(AgentToolset("service", "planner", "planning.tools"))
})
```

**エイリアス**: `UseAgentToolset(service, agent, toolset)` は、`AgentToolset` と `Use` を 1 回の呼び出しにまとめたエイリアスです。新しいデザインでは `AgentToolset` を優先してください。エイリアスは、一部のコードベースでの可読性のために存在します。

```go
// Equivalent to Use(AgentToolset("service", "planner", "planning.tools"))
Agent("orchestrator", func() {
    UseAgentToolset("service", "planner", "planning.tools")
})
```

### Passthrough

`Passthrough(toolName, target, methodName)` は、エクスポートされたツールを Goa のサービスメソッドへ決定論的にフォワードする設定です。これはプランナーを完全にバイパスします。

**コンテキスト**: `Export` の下にネストされた `Tool` の内部

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("message", String, "Message to log")
            Required("message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
        })
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

### DisableAgentDocs

`DisableAgentDocs()` は、モジュールルートに `AGENTS_QUICKSTART.md` を生成しないようにします。

**コンテキスト**: `API` の内部

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

---

## ツールセット関数

### Toolset

`Toolset(name, dsl)` は、プロバイダ所有のツールセットをトップレベルで宣言します。トップレベルで宣言されたツールセットは再利用可能になり、エージェントは `Use` で参照します。

**コンテキスト**: トップレベル

```go
var DocsToolset = Toolset("docs.search", func() {
    Description("Tools for searching documentation")
    Tool("search", "Search indexed documentation", func() {
        Args(func() {
            Attribute("query", String, "Search phrase")
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Matched snippets")
            Required("documents")
        })
    })
})
```

ツールセットは、標準の `Description()` DSL 関数を使って説明を含めることもできます:

```go
var DataToolset = Toolset("data-tools", func() {
    Description("Tools for data processing and analysis")
    Tool("analyze", "Analyze dataset", func() {
        Args(func() {
            Attribute("dataset_id", String, "Dataset identifier")
            Required("dataset_id")
        })
        Return(func() {
            Attribute("insights", ArrayOf(String), "Analysis insights")
            Required("insights")
        })
    })
})
```

### Tool

`Tool(name, description, dsl)` はツールセット内の呼び出し可能なケイパビリティを定義します。

**コンテキスト**: `Toolset` または `Method` の内部

コード生成は次を出力します:
- `tool_specs/types.go` の payload/result Go 構造体
- JSON コーデック（`tool_specs/codecs.go`）
- プランナーが消費する JSON Schema 定義
- ヘルパープロンプトとメタデータを含むツールレジストリエントリ

```go
Tool("search", "Search indexed documentation", func() {
    Title("Document Search")
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() { Default(5) })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Required("documents")
    })
    CallHintTemplate("Searching for: {{ .Query }}")
    ResultHintTemplate("Found {{ len .Documents }} documents")
    Tags("docs", "search")
})
```

### Args と Return

`Args(...)` と `Return(...)` は、標準の Goa 属性 DSL を使って payload/result 型を定義します。

**コンテキスト**: `Tool` の内部

次のいずれかを使用できます:
- `Attribute()` 呼び出しでインラインのオブジェクトスキーマを定義する関数
- 既存の型定義を再利用する Goa のユーザー型（Type, ResultType, etc.）
- 単純な単一値入出力のためのプリミティブ型（String, Int など）

```go
Tool("search", "Search documentation", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() {
            Default(5)
            Minimum(1)
            Maximum(100)
        })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Attribute("count", Int, "Number of results")
        Required("documents", "count")
    })
})
```

**型の再利用:**

```go
var SearchParams = Type("SearchParams", func() {
    Attribute("query", String)
    Attribute("limit", Int)
    Required("query")
})

Tool("search", "Search documents", func() {
    Args(SearchParams)
    Return(func() {
        Attribute("results", ArrayOf(String))
    })
})
```

### ServerData

`ServerData(kind, val, args...)` は、ツール結果に付随する **サーバー専用の構造化データ** のスキーマを定義します。server-data はモデルプロバイダへは送信されません。
任意の server-data は多くの場合、観測者向けの UI アーティファクト（例: チャート/カード）に投影され、モデル向けの結果を境界付き・トークン効率良く保つために使います。一方、always-on の server-data はサーバー側で常に発行/永続化されるメタデータであり、任意の観測者出力として扱ってはいけません。

**コンテキスト**: `Tool` の内部

**パラメータ:**
- `kind`: server-data 種別の文字列識別子（例: `"atlas.time_series"`, `"atlas.control_narrative"`, `"aura.evidence"`）。コンシューマは kind で投影/処理を判別します。
- `val`: スキーマ定義（`Args`/`Return` と同様に、`Attribute()` を含む関数、Goa ユーザー型、またはプリミティブ型）

**Audience によるルーティング（`Audience*`）:**

各 `ServerData` エントリは audience を宣言し、下流コンシューマが kind の命名規約に依存せずに payload をルーティングできるようにします:

- `"timeline"`: 永続化され、観測者向け（例: UI/timeline カード）へ投影可能
- `"internal"`: ツール合成用の添付データ。永続化・レンダリングしない
- `"evidence"`: provenance（証跡）参照。timeline カードとは別経路で永続化

`ServerData` の DSL ブロック内で設定します:

```go
ServerData("atlas.time_series.chart_points", TimeSeriesServerData, func() {
    AudienceInternal()
    FromMethodResultField("chart_sidecar")
})

ServerData("aura.evidence", ArrayOf(Evidence), func() {
    AudienceEvidence()
    ModeAlways()
    FromMethodResultField("evidence")
})
```

**ServerData を使う場面:**
- UI（チャート/グラフ/テーブル）が高忠実度データを必要とし、モデル向けは境界付きで十分なとき
- モデルのコンテキスト制限を超える大きな結果セットを添付したいとき
- 下流のコンシューマが、モデルには不要だが構造化されたデータを必要とするとき

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp (RFC3339)")
        Attribute("end_time", String, "End timestamp (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
        Attribute("min_value", Float64, "Minimum value in range")
        Attribute("max_value", Float64, "Maximum value in range")
        Required("summary", "count")
    })
    ServerData("atlas.time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    })
    ServerDataDefault("off") // 既定はオプトイン（呼び出し側は `server_data:"on"` を指定できる）
})
```

**Goa 型を server-data スキーマに使う例:**

```go
var TimeSeriesServerData = Type("TimeSeriesServerData", func() {
    Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
    Attribute("unit", String, "Measurement unit")
    Attribute("resolution", String, "Data resolution (e.g., '1m', '5m', '1h')")
    Required("data_points")
})

Tool("get_metrics", "Get device metrics", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Required("device_id")
    })
    Return(func() {
        Attribute("summary", String, "Metrics summary for the model")
        Attribute("point_count", Int, "Number of data points")
        Required("summary", "point_count")
    })
    ServerData("atlas.metrics", TimeSeriesServerData)
})
```

**ランタイムでの参照:**

実行時には、任意 server-data から投影された観測者向けアーティファクトが `planner.ToolResult.Artifacts` から参照できます:

```go
// In a stream subscriber or result handler
func handleToolResult(result *planner.ToolResult) {
    for _, art := range result.Artifacts {
        if art.Kind == "atlas.time_series" {
            // art.Data contains the full time series for UI rendering
        }
    }
}
```

### BoundedResult

`BoundedResult()` は、現在のツール結果が「潜在的により大きなデータセットに対する境界付きビュー」であることを示します。これは軽量なコントラクトであり、ランタイムとサービスに次を伝えます:

1. ツールは利用可能なデータのサブセットを返す可能性がある
2. ツールは結果とともに切り捨てメタデータ（`agent.Bounds`）を表出すべきである

**コンテキスト**: `Tool` の内部

`BoundedResult` 自体はツールのスキーマを変更しません。ツールに注釈を付けることで、codegen とサービスが統一した方法で境界メタデータを付与・強制できるようにします。

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("filter", String, "Optional filter expression")
        Attribute("limit", Int, "Maximum devices to return", func() {
            Default(100)
            Maximum(1000)
        })
        Attribute("offset", Int, "Pagination offset", func() {
            Default(0)
        })
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "List of devices")
        Attribute("returned", Int, "Number of devices returned")
        Attribute("total", Int, "Total devices matching filter")
        Attribute("truncated", Boolean, "Whether results were truncated")
        Required("devices", "returned", "truncated")
    })
    BoundedResult()
})
```

**agent.Bounds コントラクト:**

ツールが `BoundedResult()` でマークされた場合、ランタイムはツール結果が `agent.BoundedResult` インターフェースを実装するか、`agent.Bounds` にマップできるフィールドを含むことを期待します:

```go
// agent.Bounds describes how a tool result has been bounded
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied
    RefinementHint string // Guidance on how to narrow the query
}

// agent.BoundedResult interface for typed results
type BoundedResult interface {
    ResultBounds() *Bounds
}
```

**サービス側の責務:**

サービスは次を担います:
1. 独自の切り捨てロジックを適用する（ページネーション、上限、深さ制限など）
2. 結果に境界メタデータを設定する
3. 結果が切り捨てられた場合は任意で `RefinementHint` を提供する

ランタイムはサブセットや切り捨てを自動計算するのではなく、「境界付きツールが一貫した `Bounds` コントラクトを表出する」ことだけを統一的に扱います。

**BoundedResult を使う場面:**

- ページングされたリストを返すツール（デバイス、ユーザー、レコード）
- 大規模データセットへのクエリで結果制限を設けるツール
- 入れ子構造に深さ/サイズ上限を適用するツール
- モデルが結果の不完全性（切り捨ての可能性）を理解する必要があるツール

**Bounds を含む完全な例:**

```go
var DeviceToolset = Toolset("devices", func() {
    Tool("list_devices", "List IoT devices", func() {
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
            Required("devices", "returned", "truncated")
        })
        BoundedResult()
        BindTo("DeviceService", "ListDevices")
    })
})
```

**ランタイムの挙動:**

境界付きツールが実行されると:
1. ランタイムは結果をデコードし、`agent.BoundedResult` 実装をチェックする
2. 実装されていれば `ResultBounds()` を呼び出して bounds を抽出する
3. bounds メタデータは `planner.ToolResult.Bounds` に付与される
4. ストリーム購読者やファイナライザは UI 表示/ログ用途で bounds にアクセスできる

標準の `Title()` DSL 関数で、ツールに表示タイトルを持たせることもできます:

```go
Tool("web_search", "Search the web", func() {
    Title("Web Search")
    Args(func() { /* ... */ })
})
```

### Confirmation

`Confirmation(dsl)` は、ツール実行前に明示的な帯域外承認が必要であることを宣言します。これは **オペレータセンシティブ** なツール（書き込み、削除、コマンド）向けです。

**コンテキスト**: `Tool` の内部

生成時に Goa-AI は確認ポリシーを生成されたツールスペックに記録します。実行時にはワークフローが `AwaitConfirmation` を通じて確認要求を出し、明示的な承認が与えられた後にのみツールを実行します。

最小例:

```go
Tool("dangerous_write", "Write a stateful change", func() {
    Args(DangerousWriteArgs)
    Return(DangerousWriteResult)
    Confirmation(func() {
        Title("Confirm change")
        PromptTemplate(`Approve write: set {{ .Key }} to {{ .Value }}`)
        DeniedResultTemplate(`{"summary":"Cancelled","key":"{{ .Key }}"}`)
    })
})
```

注記:

- 確認の要求方法はランタイムが所有します。組み込みの確認プロトコルは専用の await（`AwaitConfirmation`）と決定 API（`ProvideConfirmation`）を使用します。期待される payload と実行フローはランタイムガイドを参照してください。
- `PromptTemplate` と `DeniedResultTemplate` は Go の `text/template` 文字列であり、`missingkey=error` で実行されます。標準のテンプレート関数（例: `printf`）に加えて、Goa-AI は次を提供します:
  - `json v` → `v` を JSON エンコード（任意のポインタフィールドや構造化値の埋め込みに有用）
  - `quote s` → Go エスケープ済みの引用文字列を返す（`fmt.Sprintf("%q", s)` と同等）
- `runtime.WithToolConfirmation(...)` によって、実行時に動的に Confirmation を有効化することもできます（環境別ポリシーやデプロイ単位の上書きなど）。

### CallHintTemplate と ResultHintTemplate

`CallHintTemplate(template)` と `ResultHintTemplate(template)` は、ツール呼び出し/結果の表示テンプレート（ヒント）を設定します。テンプレートは Go の `text/template` 文字列で、ツールの型付き payload/result 構造体に対して評価され、実行中および実行後に表示される簡潔なヒントを生成します。

**コンテキスト**: `Tool` の内部

**ポイント:**

- テンプレートは生の JSON ではなく型付き Go 構造体を受け取ります。JSON キー（例: `.query`, `.device_id`）ではなく Go のフィールド名（例: `.Query`, `.DeviceID`）を使ってください。
- ヒントは簡潔に保ちましょう（UI 表示のため、推奨 ≤140 文字）
- テンプレートは `missingkey=error` でコンパイルされます（参照するフィールドは必ず存在している必要があります）
- 任意フィールドには `{{ if .Field }}` や `{{ with .Field }}` を使ってください

**ランタイム契約:**

- hooks のイベントコンストラクタはヒントをレンダリングしません。ツール呼び出しのスケジュールイベントは既定で `DisplayHint==""` です。
- ランタイムは、型付き payload をデコードして `CallHintTemplate` を実行できる場合、公開時に **永続的な** 呼び出しヒントを付与して保存できます。
- 型付きデコードに失敗する、またはテンプレートが登録されていない場合、ランタイムは `DisplayHint` を空のままにします（生の JSON に対してヒントをレンダリングしません）。
- producer が hook イベントを公開する前に `DisplayHint`（非空）を明示的に設定した場合、ランタイムはそれを権威ある値として扱い、上書きしません。
- consumer ごとの文言変更（例: UI の表現）にはランタイムで `runtime.WithHintOverrides` を設定します。override は、ストリームの `tool_start` イベントにおいて DSL テンプレートより優先されます。

**基本例:**

```go
Tool("search", "Search documents", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Maximum results", func() { Default(10) })
        Required("query")
    })
    Return(func() {
        Attribute("count", Int, "Number of results found")
        Attribute("results", ArrayOf(String), "Matching documents")
        Required("count", "results")
    })
    CallHintTemplate("Searching for: {{ .Query }}")
    ResultHintTemplate("Found {{ .Count }} results")
})
```

**型付き構造体フィールド:**

テンプレートは生成された Go の payload/result 構造体を受け取ります。フィールド名は JSON の命名（snake_case/camelCase）ではなく Go の命名（PascalCase）に従います:

```go
// DSL definition
Tool("get_device_status", "Get device status", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")      // JSON: device_id
        Attribute("include_metrics", Boolean, "Include metrics") // JSON: include_metrics
        Required("device_id")
    })
    Return(func() {
        Attribute("device_name", String, "Device name")          // JSON: device_name
        Attribute("is_online", Boolean, "Online status")         // JSON: is_online
        Attribute("last_seen", String, "Last seen timestamp")    // JSON: last_seen
        Required("device_name", "is_online")
    })
    // Use Go field names (PascalCase), not JSON keys
    CallHintTemplate("Checking status of {{ .DeviceID }}")
    ResultHintTemplate("{{ .DeviceName }}: {{ if .IsOnline }}online{{ else }}offline{{ end }}")
})
```

**任意フィールドの扱い:**

テンプレートエラーを避けるため、任意フィールドには条件ブロックを使ってください:

```go
Tool("list_items", "List items with optional filter", func() {
    Args(func() {
        Attribute("category", String, "Optional category filter")
        Attribute("limit", Int, "Maximum items", func() { Default(50) })
    })
    Return(func() {
        Attribute("items", ArrayOf(Item), "Matching items")
        Attribute("total", Int, "Total count")
        Attribute("truncated", Boolean, "Results were truncated")
        Required("items", "total")
    })
    CallHintTemplate("Listing items{{ with .Category }} in {{ . }}{{ end }}")
    ResultHintTemplate("{{ .Total }} items{{ if .Truncated }} (truncated){{ end }}")
})
```

**組み込みテンプレート関数:**

ランタイムはヒントテンプレートのために次のヘルパー関数を提供します:

| 関数 | 説明 | 例 |
|----------|-------------|---------|
| `join` | 文字列スライスをセパレータで結合する | `{{ join .Tags ", " }}` |
| `count` | スライスの要素数を数える | `{{ count .Results }} items` |
| `truncate` | 文字列を N 文字で切り詰める | `{{ truncate .Query 20 }}` |

**すべての機能を含む例:**

```go
Tool("analyze_data", "Analyze dataset", func() {
    Args(func() {
        Attribute("dataset_id", String, "Dataset identifier")
        Attribute("analysis_type", String, "Type of analysis", func() {
            Enum("summary", "detailed", "comparison")
        })
        Attribute("filters", ArrayOf(String), "Optional filters")
        Required("dataset_id", "analysis_type")
    })
    Return(func() {
        Attribute("insights", ArrayOf(String), "Analysis insights")
        Attribute("metrics", MapOf(String, Float64), "Computed metrics")
        Attribute("processing_time_ms", Int, "Processing time in milliseconds")
        Required("insights", "processing_time_ms")
    })
    CallHintTemplate("Analyzing {{ .DatasetID }} ({{ .AnalysisType }})")
    ResultHintTemplate("{{ count .Insights }} insights in {{ .ProcessingTimeMs }}ms")
})
```

### ResultReminder

`ResultReminder(text)` は、ツール結果が返った後に会話へ注入される静的なシステムリマインダを設定します。これは、結果の解釈や UI 表示の前提など、モデルが「舞台裏の前提」を理解した上で応答できるようにするために使用します。

**コンテキスト**: `Tool` の内部

リマインダテキストはランタイムにより `<system-reminder>` タグで自動的にラップされます。テキスト内にタグを含めないでください。

**静的 vs 動的リマインダ:**

`ResultReminder` は、毎回適用される設計時（デザイン時）の静的リマインダです。実行時の状態やツール結果に依存する動的リマインダが必要な場合は、プランナー実装で `PlannerContext.AddReminder()` を使用してください。動的リマインダは次をサポートします:
- レート制限（ターン間の最小間隔）
- ランごとの上限（1 ランあたりの最大回数）
- 条件に基づく追加/削除
- 優先度（安全 vs ガイダンス）

**基本例:**

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp")
        Attribute("end_time", String, "End timestamp")
        Required("device_id", "start_time", "end_time")
    })
    Return(func() {
        Attribute("series", ArrayOf(DataPoint), "Time series data points")
        Attribute("summary", String, "Summary for the model")
        Required("series", "summary")
    })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

**ResultReminder を使う場面:**

- UI がツール結果を特別な表示（チャート/グラフ/テーブル）で描画し、モデルがそれを知る必要があるとき
- すでにユーザーに見えている情報をモデルが繰り返さない方がよいとき
- 表示方法に関する重要な前提が応答の仕方に影響する場合
- 毎回同じガイダンスを適用したい場合

**複数ツールのリマインダ:**

同一ターン内に複数のツールが result reminder を持つ場合、ランタイムは 1 つのシステムメッセージに統合します:

```go
Tool("get_metrics", "Get device metrics", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("Metrics are displayed as a dashboard widget.")
})

Tool("get_alerts", "Get active alerts", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("Alerts are shown in a priority-sorted list with severity indicators.")
})
```

**PlannerContext による動的リマインダ:**

実行時条件に依存する場合は、プランナー API を使用します:

```go
// In your planner implementation
func (p *MyPlanner) PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Add a dynamic reminder based on tool results
    for _, tr := range input.ToolResults {
        if tr.Name == "get_time_series" && hasAnomalies(tr.Result) {
            input.Agent.AddReminder(reminder.Reminder{
                ID:   "anomaly_detected",
                Text: "Anomalies were detected in the time series. Highlight these to the user.",
                Priority: reminder.TierGuidance,
            })
        }
    }
    // ... rest of planner logic
}
```

### Tags

`Tags(values...)` はツールまたはツールセットにメタデータラベルを付与します。タグはポリシーエンジンやテレメトリで参照されます。

**コンテキスト**: `Tool` または `Toolset` の内部

一般的なタグパターン:
- ドメイン: `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- 能力: `"read"`, `"write"`, `"search"`, `"transform"`
- リスク: `"safe"`, `"destructive"`, `"external"`

```go
Tool("delete_file", "Delete a file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})
```

### BindTo

`BindTo("Method")` または `BindTo("Service", "Method")` は、ツールを Goa のサービスメソッドに関連付けます。

**コンテキスト**: `Tool` の内部

ツールがメソッドにバインドされる場合:
- ツールの `Args` スキーマはメソッドの `Payload` と異なってよい
- ツールの `Return` スキーマはメソッドの `Result` と異なってよい
- 生成されるアダプタがツール型とメソッド型の間を変換する

```go
var _ = Service("orchestrator", func() {
    Method("Search", func() {
        Payload(SearchPayload)
        Result(SearchResult)
    })
    
    Agent("chat", func() {
        Use("docs", func() {
            Tool("search", "Search documentation", func() {
                Args(SearchPayload)
                Return(SearchResult)
                BindTo("Search") // binds to method on same service
            })
        })
    })
})
```

### Inject

`Inject(fields...)` は、特定の payload フィールドを「注入」（サーバー側インフラ）としてマークします。注入フィールドは:

1. LLM から隠される（モデルへ送る JSON Schema から除外される）
2. 生成された構造体に Setter メソッド付きで公開される
3. ランタイムフック（`ToolInterceptor`）により値が設定される想定である

**コンテキスト**: `Tool` の内部

```go
Tool("get_data", "Get data for current session", func() {
    Args(func() {
        Attribute("session_id", String, "Current session ID")
        Attribute("query", String, "Data query")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String))
    })
    BindTo("data_service", "get")
    Inject("session_id") // hidden from LLM, populated by interceptor
})
```

実行時は `ToolInterceptor` を使って注入フィールドを設定します:

```go
func (h *Handler) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    if call.Name == "data.get_data" {
        call.Payload.SetSessionID(ctx.Value(sessionKey).(string))
    }
    return nil
}
```

---

## ポリシー関数

### RunPolicy

`RunPolicy(dsl)` は、実行時に適用される実行制限を設定します。`Agent` の内部で宣言され、上限、時間予算、履歴管理、中断処理などのポリシー設定を含みます。

**コンテキスト**: `Agent` の内部

**利用可能なポリシー関数:**
- `DefaultCaps` — リソース制限（ツール呼び出し、連続失敗）
- `TimeBudget` — 実行全体の単純なウォールクロック制限
- `Timing` — 予算、計画、ツール実行の詳細タイムアウト（上級）
- `History` — 会話履歴管理（スライディングウィンドウ or 圧縮）
- `InterruptsAllowed` — ヒューマンインザループの一時停止/再開を有効化
- `OnMissingFields` — 必須フィールド欠落時のバリデーション挙動

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")

        History(func() {
            KeepRecentTurns(20)
        })
    })
})
```

### DefaultCaps

`DefaultCaps(opts...)` は、暴走ループを防止し実行制限を強制するためのケイパビリティ上限を適用します。

**コンテキスト**: `RunPolicy` の内部

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

**MaxToolCalls(n)**: 許可するツール呼び出しの最大回数。超過した場合、ランタイムは中断します。

**MaxConsecutiveFailedToolCalls(n)**: アボートするまでの最大連続失敗回数。無限の再試行ループを防ぎます。

### TimeBudget

`TimeBudget(duration)` は、エージェント実行にウォールクロックの制限を適用します。期間は文字列（例: `"2m"`, `"30s"`）で指定します。

**コンテキスト**: `RunPolicy` の内部

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

個々のアクティビティのタイムアウトを細かく制御したい場合は、代わりに `Timing` を使用します。

### Timing

`Timing(dsl)` は、`TimeBudget` の代替として詳細なタイムアウト設定を提供します。`TimeBudget` が単一の全体制限を設定する一方、`Timing` は 3 つのレベルで制御できます: 実行全体の予算、プランナーアクティビティ（LLM 推論）、ツール実行アクティビティ。

**コンテキスト**: `RunPolicy` の内部

**Timing と TimeBudget の使い分け:**
- 単一のウォールクロック制限で十分なら `TimeBudget`
- 計画とツール実行で異なるタイムアウトが必要なら `Timing`（例: ツールが遅い外部 API を叩くが LLM 応答は速くしたい）

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock budget for the entire run
        Plan("45s")     // timeout for Plan/Resume activities (LLM inference)
        Tools("2m")     // default timeout for ExecuteTool activities
    })
})
```

**Timing 関数:**

| 関数 | 説明 | 影響範囲 |
|----------|-------------|---------|
| `Budget(duration)` | 実行全体のウォールクロック予算 | ランのライフサイクル全体 |
| `Plan(duration)` | Plan/Resume アクティビティのタイムアウト | プランナーの LLM 推論呼び出し |
| `Tools(duration)` | ExecuteTool アクティビティのデフォルトタイムアウト | ツール実行（サービス、MCP、agent-as-tool） |

**Timing がランタイムに与える影響:**

ランタイムはこれらの DSL 値を、Temporal のアクティビティオプション（または同等のエンジンのタイムアウト）へ変換します:
- `Budget` → ワークフローの実行タイムアウト
- `Plan` → `PlanStart` / `PlanResume` のアクティビティタイムアウト
- `Tools` → `ExecuteTool` のデフォルトアクティビティタイムアウト

**完全な例:**

```go
Agent("data-processor", "Processes large datasets", func() {
    Use(DataToolset)
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(20))
        Timing(func() {
            Budget("30m")   // long-running data jobs
            Plan("1m")      // LLM decisions should be quick
            Tools("5m")     // data operations may take time
        })
    })
})
```

### Cache

`Cache(dsl)` は、エージェントのプロンプトキャッシュ挙動を設定します。キャッシュをサポートするプロバイダに対して、システムプロンプトやツール定義のどこにチェックポイント境界を置くべきかを指定します。

**コンテキスト**: `RunPolicy` の内部

プロンプトキャッシュは、プロバイダが以前に処理したコンテンツを再利用できるようにすることで、推論コストとレイテンシを大きく削減できます。`Cache` は、プロバイダが「どこまでがキャッシュ可能か」を判断するための境界を定義します。

```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

**キャッシュチェックポイント関数:**

| 関数 | 説明 |
|----------|-------------|
| `AfterSystem()` | すべてのシステムメッセージの後にチェックポイントを置く。プロバイダはこれを「システム前置き直後のキャッシュ境界」と解釈する。 |
| `AfterTools()` | ツール定義の後にチェックポイントを置く。プロバイダはこれを「ツール設定セクション直後のキャッシュ境界」と解釈する。 |

**プロバイダ対応:**

すべてのプロバイダがプロンプトキャッシュをサポートするわけではなく、対応はチェックポイント種別によって異なります:

| Provider | AfterSystem | AfterTools |
|----------|-------------|------------|
| Bedrock (Claude models) | ✓ | ✓ |
| Bedrock (Nova models) | ✓ | ✗ |

キャッシュ非対応のプロバイダはこれらのオプションを無視します。ランタイムはプロバイダ固有の制約も検証します。例えば Nova モデルで `AfterTools` を要求するとエラーになります。

**Cache を使う場面:**

- `AfterSystem()` を使う: システムプロンプトがターン間で安定しており、再処理を避けたい
- `AfterTools()` を使う: ツール定義が安定しており、ツール設定をキャッシュしたい
- 両方を併用する: 対応プロバイダで最大のキャッシュ効果を得たい

**完全な例:**

```go
Agent("assistant", "Conversational assistant", func() {
    Use(DocsToolset)
    Use(SearchToolset)
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(10))
        TimeBudget("5m")
        Cache(func() {
            AfterSystem()  // cache the system prompt
            AfterTools()   // cache tool definitions (Claude only)
        })
    })
})
```

### History

`History(dsl)` は、各プランナー呼び出しの前にランタイムが会話履歴をどのように管理するかを定義します。履歴ポリシーは次を保持しつつ、メッセージ履歴を変換します:

- 会話先頭のシステムプロンプト
- 論理的なターン境界（ユーザー + アシスタント + ツール呼び出し/結果を 1 単位とする）

エージェントごとに設定できる履歴ポリシーは最大 1 つです。

**コンテキスト**: `RunPolicy` の内部

標準ポリシーは 2 つあります:

**KeepRecentTurns（スライディングウィンドウ）:**

`KeepRecentTurns(n)` は、システムプロンプトとツールのやりとりを保ちながら、直近 N 個のユーザー/アシスタントターンのみを保持します。コンテキストサイズを制限する最も簡単な方法です。

```go
RunPolicy(func() {
    History(func() {
        KeepRecentTurns(20) // Keep the last 20 user/assistant turns
    })
})
```

**パラメータ:**
- `n`: 保持する直近ターン数（> 0 必須）

**Compress（モデル支援の要約）:**

`Compress(triggerAt, keepRecent)` は、古いターンをモデルで要約し、最近のターンを高忠実度で保持します。単純なスライディングウィンドウより多くの文脈を維持できます。

```go
RunPolicy(func() {
    History(func() {
        // When at least 30 turns exist, summarize older turns
        // and keep the most recent 10 in full fidelity
        Compress(30, 10)
    })
})
```

**パラメータ:**
- `triggerAt`: 圧縮を実行する最小総ターン数（> 0 必須）
- `keepRecent`: 高忠実度で保持する直近ターン数（>= 0 かつ < triggerAt）

**HistoryModel の要件:**

`Compress` を使う場合、生成されるエージェント設定の `HistoryModel` フィールドに `model.Client` を渡す必要があります。ランタイムはこのクライアントを `ModelClassSmall` とともに使用して古いターンを要約します:

```go
// Generated agent config includes HistoryModel field when Compress is used
cfg := chat.ChatAgentConfig{
    Planner:      &ChatPlanner{},
    HistoryModel: smallModelClient, // Required: implements model.Client
}
if err := chat.RegisterChatAgent(ctx, rt, cfg); err != nil {
    log.Fatal(err)
}
```

`Compress` が設定されているにもかかわらず `HistoryModel` が提供されない場合、登録は失敗します。

**ターン境界の保持:**

どちらのポリシーも論理的なターン境界を「原子単位」として保持します。ターンは次で構成されます:
1. ユーザーメッセージ
2. アシスタントの応答（テキストおよび/またはツール呼び出し）
3. その応答に紐づくツール結果

これにより、モデルは常に完全な相互作用シーケンスを見られ、文脈を混乱させる部分的なターンは見ません。

### InterruptsAllowed
 
`InterruptsAllowed(bool)` は、ヒューマンインザループの割り込みを尊重すべきであることを示します。有効にすると、ランタイムは一時停止/再開（pause/resume）をサポートし、確認/明確化ループや durable await 状態に重要となります。
 
**コンテキスト**: `RunPolicy` の内部
 
**主な利点:**
- 必須情報が不足している場合に、実行を **一時停止** できる（`OnMissingFields` 参照）
- 明確化ツール経由でユーザー入力を **待機** できる
- 一時停止中は状態が保持され、再開まで計算資源を消費しない
 
```go
RunPolicy(func() {
    // Enable pause/resume capability
    InterruptsAllowed(true)
    
    // Automatically pause when required tool arguments are missing
    OnMissingFields("await_clarification")
})
```

### OnMissingFields

`OnMissingFields(action)` は、ツール呼び出しのバリデーションで必須フィールドの欠落が検出されたときに、エージェントがどう応答するかを設定します。

**コンテキスト**: `RunPolicy` の内部

有効値:
- `"finalize"`: 必須フィールドがない場合に実行を停止する
- `"await_clarification"`: 一時停止し、ユーザーが不足情報を提供するのを待つ
- `"resume"`: 不足があっても実行を継続する
- `""`（空）: コンテキストに基づいてプランナーに判断させる

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

### 完全なポリシー例

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        Timing(func() {
            Budget("5m")
            Plan("30s")
            Tools("1m")
        })
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")
        History(func() {
            Compress(30, 10)
        })
    })
})
```

---

## MCP 関数

Goa-AI は、Goa サービス内で Model Context Protocol（MCP）サーバを宣言するための DSL 関数を提供します。

### MCPServer

`MCPServer(name, version, opts...)` は現在のサービスで MCP を有効化します。MCP プロトコルを通じてツール、リソース、プロンプトを公開するようサービスを構成します。

**エイリアス**: `MCP(name, version, opts...)` は `MCPServer` のエイリアスです。両者は同一の挙動です。

**コンテキスト**: `Service` の内部

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    // Using MCPServer
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    // Or equivalently using the MCP alias
    // MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("add", func() {
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(func() {
            Attribute("sum", Int, "Result of addition")
            Required("sum")
        })
        MCPTool("add", "Add two numbers")
    })
})
```

### ProtocolVersion

`ProtocolVersion(version)` は、サーバがサポートする MCP プロトコルバージョンを設定します。`MCPServer`/`MCP` に渡す設定関数を返します。

**コンテキスト**: `MCPServer` または `MCP` へのオプション引数

```go
Service("calculator", func() {
    // Specify protocol version as an option
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
})
```

### MCPTool

`MCPTool(name, description)` は、現在のメソッドを MCP ツールとしてマークします。メソッドの payload がツールの入力スキーマになり、result が出力スキーマになります。

**コンテキスト**: `Method` の内部（サービスは MCP が有効である必要があります）

```go
Method("search", func() {
    Payload(func() {
        Attribute("query", String, "Search query")
        Attribute("limit", Int, "Maximum results", func() { Default(10) })
        Required("query")
    })
    Result(func() {
        Attribute("results", ArrayOf(String), "Search results")
        Required("results")
    })
    MCPTool("search", "Search documents by query")
})
```

### MCPToolset

`MCPToolset(service, toolset)` は、Goa の MCP サーバから導出された MCP 定義ツールセットを宣言します。

**コンテキスト**: トップレベル

利用パターンは 2 つあります。

**Goa バックエンドの MCP サーバ:**

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

**外部 MCP サーバ（インラインスキーマ定義）:**

```go
var RemoteSearch = MCPToolset("remote", "search", func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

### Resource と WatchableResource

`Resource(name, uri, mimeType)` は、メソッドを MCP リソースプロバイダとしてマークします。

`WatchableResource(name, uri, mimeType)` は、メソッドを購読可能リソースとしてマークします。

**コンテキスト**: `Method` の内部（サービスは MCP が有効である必要があります）

```go
Method("readme", func() {
    Result(String)
    Resource("readme", "file:///docs/README.md", "text/markdown")
})

Method("system_status", func() {
    Result(func() {
        Attribute("status", String, "Current system status")
        Attribute("uptime", Int, "Uptime in seconds")
        Required("status", "uptime")
    })
    WatchableResource("status", "status://system", "application/json")
})
```

### StaticPrompt と DynamicPrompt

`StaticPrompt(name, description, messages...)` は静的プロンプトテンプレートを追加します。

`DynamicPrompt(name, description)` は、メソッドを動的プロンプト生成器としてマークします。

**コンテキスト**: `Service`（静的）または `Method`（動的）

```go
Service("assistant", func() {
    MCPServer("assistant", "1.0")
    
    // Static prompt
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    // Dynamic prompt
    Method("code_review", func() {
        Payload(func() {
            Attribute("language", String, "Programming language")
            Attribute("code", String, "Code to review")
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
})
```

### Notification と Subscription

`Notification(name, description)` は、メソッドを MCP 通知送信者としてマークします。

`Subscription(resourceName)` は、購読可能リソースのサブスクリプションハンドラとしてメソッドをマークします。

**コンテキスト**: `Method` の内部（サービスは MCP が有効である必要があります）

```go
Method("progress_update", func() {
    Payload(func() {
        Attribute("task_id", String, "Task identifier")
        Attribute("progress", Int, "Progress percentage (0-100)")
        Required("task_id", "progress")
    })
    Notification("progress", "Task progress notification")
})

Method("subscribe_status", func() {
    Payload(func() {
        Attribute("uri", String, "Resource URI to subscribe to")
        Required("uri")
    })
    Result(String)
    Subscription("status") // Links to WatchableResource named "status"
})
```

### SubscriptionMonitor

`SubscriptionMonitor(name)` は、現在のメソッドをサブスクリプション更新の server-sent events（SSE）モニターとしてマークします。メソッドは購読変更イベントを接続クライアントへストリーミングします。

**コンテキスト**: `Method` の内部（サービスは MCP が有効である必要があります）

```go
Method("watch_subscriptions", func() {
    StreamingResult(func() {
        Attribute("resource", String, "Resource URI that changed")
        Attribute("event", String, "Event type (created, updated, deleted)")
        Required("resource", "event")
    })
    SubscriptionMonitor("subscriptions")
})
```

**SubscriptionMonitor を使う場面:**
- クライアントがサブスクリプション変更のリアルタイム更新を必要とする
- サブスクリプションイベントをプッシュする SSE エンドポイントを実装したい
- リソース変更に反応するリアクティブ UI を構築したい

### 完全な MCP サーバ例

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    Method("search", func() {
        Description("Search documents")
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        MCPTool("search", "Search documents by query")
    })
    
    Method("get_readme", func() {
        Result(String)
        Resource("readme", "file:///README.md", "text/markdown")
    })
    
    Method("get_status", func() {
        Result(func() {
            Attribute("status", String)
            Attribute("updated_at", String)
        })
        WatchableResource("status", "status://system", "application/json")
    })
    
    Method("subscribe_status", func() {
        Payload(func() { Attribute("uri", String) })
        Result(String)
        Subscription("status")
    })
    
    Method("review_code", func() {
        Payload(func() {
            Attribute("language", String)
            Attribute("code", String)
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
    
    Method("notify_progress", func() {
        Payload(func() {
            Attribute("task_id", String)
            Attribute("progress", Int)
            Required("task_id", "progress")
        })
        Notification("progress", "Task progress update")
    })
})
```

---

## レジストリ関数

Goa-AI は、ツールレジストリ（MCP サーバ、ツールセット、エージェントの中央カタログ）を宣言・消費するための DSL 関数を提供します。レジストリは発見され、エージェントによって消費できます。

### Registry

`Registry(name, dsl)` は、ツール発見のためのレジストリソースを宣言します。

**コンテキスト**: トップレベル

DSL 内で次を使用します:
- `URL`: レジストリエンドポイント URL（必須）
- `Description`: 人間可読の説明
- `APIVersion`: レジストリ API バージョン（デフォルト `"v1"`）
- `Security`: 認証のための Goa セキュリティスキーム参照
- `Timeout`: HTTP リクエストタイムアウト
- `Retry`: 失敗時のリトライポリシー
- `SyncInterval`: カタログ更新間隔
- `CacheTTL`: ローカルキャッシュ保持期間
- `Federation`: 外部レジストリの取り込み設定

```go
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    Security(CorpAPIKey)
    Timeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})
```

**設定オプション:**

| 関数 | 説明 | 例 |
|----------|-------------|---------|
| `URL(endpoint)` | レジストリエンドポイント URL（必須） | `URL("https://registry.corp.internal")` |
| `APIVersion(version)` | API バージョンのパスセグメント | `APIVersion("v1")` |
| `Timeout(duration)` | HTTP リクエストタイムアウト | `Timeout("30s")` |
| `Retry(maxRetries, backoff)` | 失敗したリクエストのリトライポリシー | `Retry(3, "1s")` |
| `SyncInterval(duration)` | カタログ更新間隔 | `SyncInterval("5m")` |
| `CacheTTL(duration)` | ローカルキャッシュ保持期間 | `CacheTTL("1h")` |

### Federation

`Federation(dsl)` は外部レジストリ取り込み設定を構成します。Registry 宣言内で Federation を使い、フェデレーションされたソースから取り込むネームスペースを指定します。

**コンテキスト**: `Registry` の内部

Federation DSL 内で使用します:
- `Include`: 取り込むネームスペースのグロブパターン
- `Exclude`: スキップするネームスペースのグロブパターン

```go
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "data-*")
        Exclude("experimental/*", "deprecated/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})
```

**Include と Exclude:**

- `Include(patterns...)`: 取り込むネームスペースのグロブパターンを指定します。Include が指定されない場合、デフォルトではすべてのネームスペースを含みます。
- `Exclude(patterns...)`: スキップするネームスペースのグロブパターンを指定します。Exclude は Include の後に適用されます。

### FromRegistry

`FromRegistry(registry, toolset)` は、レジストリ由来のツールセットとして構成します。Toolset を宣言する際のプロバイダオプションとして `FromRegistry` を使用します。

**コンテキスト**: `Toolset` への引数

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

// Basic usage - toolset name derived from registry toolset name
var RegistryTools = Toolset(FromRegistry(CorpRegistry, "data-tools"))

// With explicit name
var MyTools = Toolset("my-tools", FromRegistry(CorpRegistry, "data-tools"))

// With additional configuration
var ConfiguredTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
    Tags("data", "etl")
})
```

レジストリ由来のツールセットは、標準の `Version()` DSL 関数で特定バージョンに固定できます:

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var PinnedTools = Toolset("stable-tools", FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
})
```

### PublishTo

`PublishTo(registry)` は、エクスポートされたツールセットをレジストリへ公開する設定を行います。Export DSL 内で `PublishTo` を使用して公開先レジストリを指定します。

**コンテキスト**: `Toolset` の内部（エクスポートされるとき）

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var LocalTools = Toolset("utils", func() {
    Tool("summarize", "Summarize text", func() {
        Args(func() { Attribute("text", String) })
        Return(func() { Attribute("summary", String) })
    })
})

Agent("data-agent", "Data processing agent", func() {
    Use(LocalTools)
    Export(LocalTools, func() {
        PublishTo(CorpRegistry)
        Tags("data", "etl")
    })
})
```

### 完全なレジストリ例

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Define registries
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    Security(CorpAPIKey)
    Timeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})

var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Federation(func() {
        Include("web-search", "code-execution")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Consume toolsets from registries
var DataTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("2.1.0")
})

var SearchTools = Toolset(FromRegistry(AnthropicRegistry, "web-search"))

// Local toolset to publish
var AnalyticsTools = Toolset("analytics", func() {
    Tool("analyze", "Analyze dataset", func() {
        Args(func() {
            Attribute("dataset_id", String, "Dataset identifier")
            Required("dataset_id")
        })
        Return(func() {
            Attribute("insights", ArrayOf(String), "Analysis insights")
            Required("insights")
        })
    })
})

var _ = Service("orchestrator", func() {
    Agent("analyst", "Data analysis agent", func() {
        Use(DataTools)
        Use(SearchTools)
        Use(AnalyticsTools)
        
        // Export and publish to registry
        Export(AnalyticsTools, func() {
            PublishTo(CorpRegistry)
            Tags("analytics", "data")
        })
        
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

---

## 次のステップ

- **[ランタイム](./runtime.md)** - 設計が実行時の挙動にどう変換されるかを理解する
- **[ツールセット](./toolsets.md)** - ツールセットの実行モデルを深掘りする
- **[MCP 連携](./mcp-integration.md)** - MCP サーバのランタイム配線を理解する

