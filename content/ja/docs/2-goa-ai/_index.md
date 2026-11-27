---
title: "Goa-AI：設計からエージェントへ"
linkTitle: "Goa-AI"
weight: 2
description: "型付きツール、MCP サーバー、AI エージェントの契約を Go で設計。スキーマとコーデックを生成し、ローカルのインメモリまたは Temporal 上で永続実行します。"
llm_optimized: true
---

Goa-AI は、Goa の契約コンパイラを AI エージェント、MCP サーバー、ホスト型ツールレジストリへと拡張します。ツールの引数、戻り値の型、プロンプトテンプレート、実行ポリシーを Go で定義すると、`goa gen` が JSON Schema、境界バリデーション用コーデック、サービスバインディング、および **`AGENTS_QUICKSTART.md`** を生成します。プランナーとドメインハンドラーはアプリケーション側で実装します。

- **ローカルですぐ試す（インメモリエンジン・外部インフラ不要）：** **[最初のエージェントをつくる](quickstart/)**（Go 1.27+、別途 Goa サービスを立てなくても単体で動作）
- **MCP サーバーだけが必要ですか？** **[MCP 統合](mcp-integration/)** へ直接進んでください
- **コーディングエージェントをお使いですか？** 生成される **`AGENTS_QUICKSTART.md`** と **[コーディングエージェントとの開発手順](../ai-development/)** を組み合わせてください

## 1 つの契約から稼働するエージェントまで

### 1. サービス、バインドされたツール、実行ポリシーを宣言する（`design/catalog.go`）

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "tenant_id", String, "Caller tenant ID")
    Field(2, "sku", String, "Product SKU", func() {
        Pattern("^[A-Z0-9-]+$")
        Example("BOOK-1")
    })
    Required("tenant_id", "sku")
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product SKU", func() {
        Example("BOOK-1")
    })
    Field(2, "name", String, "Display name", func() {
        Example("The Go Book")
    })
    Field(3, "price_cents", Int, "Price in cents", func() {
        Example(3800)
    })
    Required("sku", "name", "price_cents")
})

var _ = Service("catalog", func() {
    Method("lookup", func() {
        Payload(LookupPayload)
        Result(Product)
    })

    Agent("assistant", "Answer product questions", func() {
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(6))
        })
        Use("catalog", func() {
            // Required tenant_id is hidden from the LLM JSON schema
            Tool("lookup", "Find a product by SKU", func() {
                BindTo("lookup")
                Inject("tenant_id")
            })
        })
    })
})
```

### 2. スキーマ、バインディング、`AGENTS_QUICKSTART.md` を生成する

```bash
go mod init example.com/catalog && go get goa.design/goa-ai@v0.90.0
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy && go run ./cmd/catalog
```

`go run` 経由で `goa` を実行すると、`go.mod` に固定されたジェネレーターのバージョンがそのまま使われます（Node.js や API キーは不要で、`goa example` がローカル動作確認用のスタブプランナーを生成します）。`Inject("tenant_id")` により、モデル向けの `gen/catalog/agents/assistant/specs/tool_schemas.json` からは `tenant_id` が除外され、`sku` の正規表現ルールだけが公開されます。

```json
{
  "id": "catalog.lookup",
  "payload": {
    "schema": {
      "properties": {
        "sku": { "type": "string", "pattern": "^[A-Z0-9-]+$" }
      },
      "required": ["sku"]
    }
  },
  "hidden_fields": ["tenant_id"]
}
```

### 3. プランナーを配線して実行する（インメモリまたは Temporal）

`goa example example.com/catalog/design` は API キーなしでローカル実行・テストできるスタブプランナーを生成します。本番モデル（`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、Bedrock、Vertex AI）に接続する場合は `planner.Planner`（`PlanStart` と `PlanResume`）を実装します。

```go
type CatalogPlanner struct{}

func (p *CatalogPlanner) PlanStart(
    ctx context.Context, in *planner.PlanInput,
) (*planner.PlanResult, error) {
    return p.next(ctx, in.Agent, in.Messages)
}

func (p *CatalogPlanner) PlanResume(
    ctx context.Context, in *planner.PlanResumeInput,
) (*planner.PlanResult, error) {
    return p.next(ctx, in.Agent, in.Messages)
}

func (p *CatalogPlanner) next(
    ctx context.Context,
    agent planner.PlannerContext,
    msgs []*model.Message,
) (*planner.PlanResult, error) {
    mc, ok := agent.PlannerModelClient("default")
    if !ok {
        return nil, errors.New(`model "default" is not registered`)
    }
    res, err := mc.Stream(ctx, &model.Request{
        Messages: msgs,
        Tools:    agent.AdvertisedToolDefinitions(),
        Stream:   true,
    })
    if err != nil {
        return nil, err
    }
    if len(res.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: res.ToolCalls}, nil
    }
    return &planner.PlanResult{FinalResponse: res.FinalResponse()}, nil
}
```

エージェントとバインドされたサービスのエグゼキューターを登録し（ローカルでは `inmem.New()`、本番では `runtime.WithEngine(temporalEng)`）、`runtime.WithLabels` で `tenant_id` を渡します。

```go
rt := runtime.New(inmem.New())
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
    APIKey: os.Getenv("OPENAI_API_KEY"), DefaultModel: "gpt-5-mini",
})
if err != nil {
    return err
}
if err := rt.RegisterModel("default", modelClient); err != nil {
    return err
}
if err := assistant.RegisterAssistantAgent(ctx, rt,
    assistant.AssistantAgentConfig{Planner: &CatalogPlanner{}},
); err != nil {
    return err
}
// catalogClient is catalog.NewClient(...) wrapping your Goa endpoints
exec := assistantcatalog.NewAssistantCatalogExec(
    assistantcatalog.WithClient(catalogClient),
)
if err := assistant.RegisterUsedToolsets(
    ctx, rt, assistant.WithCatalogExecutor(exec),
); err != nil {
    return err
}

client := assistant.NewClient(rt)
msg := &model.Message{
    Role: model.ConversationRoleUser,
    Parts: []model.Part{
        model.TextPart{Text: "What does BOOK-1 cost?"},
    },
}
out, err := client.Run(ctx, "session-1", []*model.Message{msg},
    runtime.WithLabels(map[string]string{"tenant_id": "acme"}),
)
```

```text
tool_start: catalog.lookup {"sku":"BOOK-1"}  # tenant_id="acme" injected
tool_end:   {"sku":"BOOK-1","name":"The Go Book","price_cents":3800}
assistant:  BOOK-1 ("The Go Book") costs $38.00.
```

## 主な機能

### 型付きツール契約と境界制御 {#design-first-agents}

Goa のバリデーションでツールの入出力を定義し、モデルから隠蔽してサーバー側で束縛するコンテキスト項目には `Inject("tenant_id")`、カーソルページネーションの上限には `BoundedResult`、重要な操作の実行前に人間の承認を挟むゲートには `Confirmation` を使います。[ツールセット](toolsets/)と[ツールペイロードのデフォルト値](tool-payload-defaults/)を参照してください。

### 構造化された直接出力 {#typed-direct-completions}

マルチターンのツールループを使わずに、スキーマ検証済みの型付きレスポンスをモデルから直接取得したい場合は `Completion(...)` を宣言します。生成された Unary / ストリーミング用ヘルパーが出力をデコード・検証します。[DSL リファレンス](dsl-reference/)と[ランタイム](runtime/)を参照してください。

### MCP サーバーとホスト型ツールレジストリ {#tool-registries}

- **MCP サーバー（`MCP(...)`）**：エージェントランタイムを動かさずに、Goa のサービスメソッドを HTTP 経由の MCP ツール、リソース、プロンプトテンプレートとして公開します。[MCP 統合](mcp-integration/)を参照してください。
- **ツールレジストリと検索**：同梱の Redis / [Pulse](../3-ecosystem/pulse/) ベースのレジストリゲートウェイを運用することで、全ツールのスキーマを毎回のプロンプトに詰め込む代わりに、サービス横断でスキーマを動的に検索・取得できます。[レジストリ](registry/)と[ツール検索](tool-search/)を参照してください。

### エージェントの合成と実行ツリー {#run-trees-composition}

あるエージェントを親エージェントから呼び出せるツールとして公開できます（`Export` / `Use`）。子実行は独立した Run ID、予算、および親スパンに紐づくテレメトリスパンを保持します。[エージェントの連携](agent-composition/)を参照してください。

### 型付きストリーミングイベント {#structured-streaming}

型付きランタイムイベント（`AssistantReply`、`ToolStart`、`ToolEnd`、`AwaitConfirmation`、`RunCompleted`）を SSE や WebSocket 経由で Web UI にストリーミング配信できます。[UI ストリーミング](production/#ui-ストリーミング)を参照してください。

### ローカル実行から Temporal による永続化まで {#temporal-durability}

開発とテストは外部依存ゼロのインメモリエンジンで行い、本番環境では Temporal エンジンに切り替えることで、クラッシュ復旧、永続的な `Confirmation` 一時停止、アクティビティのリトライを実現します（外部への副作用には冪等キーを組み合わせてください）。[プロダクション](production/)を参照してください。

### 評価スイート {#generated-evaluations}

エージェントと並べて評価シナリオスイートを宣言し、スクリプト化されたモデルダブルまたは較正済みの意味評価ジャッジを使って、ツール呼び出し軌跡の決定論的なアサーションを実行できます。[評価](evaluations/)と[テスト](testing/)を参照してください。

### モデルプロバイダーとセッション状態 {#model-providers}

**OpenAI**、**Anthropic**、**AWS Bedrock**、**Google Vertex AI** 向けの組み込みモデルアダプターを提供しています。セッショントランスクリプト、認可、ドメインメモリはアプリケーション側で管理します。[メモリとセッション](memory-sessions/)および[プロバイダー運用](provider-operations/)を参照してください。

## アーキテクチャ

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI アーキテクチャ：Design DSL から型付きパッケージを生成し、インメモリまたは Temporal エンジンとモデル／ツールアダプター上で Runtime が実行する構成" >}}
