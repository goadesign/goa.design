---
nav_group: guides
title: MCP 統合
weight: 50
description: "ツール、リソース、プロンプトを公開するMCPサーバーを構築し、外部MCPツールを利用します。"
llm_optimized: true
aliases:
---

Goa-AIは、**MCPサーバーの構築**と**外部MCPツールの利用**の両方に対応します。GoaサービスにMCP宣言を追加して、メソッドをツールとして公開し、リソースやプロンプトテンプレートを提供できます。JSON-RPCのプロトコル処理とサービスアダプターは生成されます。MCPサーバーの提供にGoa-AIエージェントの実行は不要です。

HTTP・stdio caller はプロトコルのメタデータを含む独立したリクエストを送ります。初期化ハンドシェイクやプロトコルセッションはありません。`Caller` はツールを呼び出し、`Listen` は変更通知を受け取ります。Goa が生成する JSON-RPC クライアントは、サービス設計に宣言されたリソース、プロンプト、検出、補完の操作も公開します。

## 概要

MCP 統合は次の流れです:

1. **サービス設計**: Goa の MCP DSL で MCP サーバーを宣言する
2. **エージェント設計**: `FromMCP(...)` または `FromExternalMCP(...)` で宣言したツールセットとして、その suite を参照する
3. **コード生成**: Goa-backed の場合は MCP JSON-RPC サーバーを生成し、suite 用のランタイム登録 helper とツールセット所有の specs/codecs も生成する
4. **ランタイム配線**: HTTP または stdio の `mcpruntime.Caller` を作成する。HTTP caller は JSON response または HTTP event stream を受け取る。生成 helper が toolset を登録し、JSON-RPC error を `planner.ToolFailure` に変換する
5. **プランナー実行**: プランナーは生成済みの型付き tool descriptor で call を構築する。runtime が正規 JSON を MCP caller へ転送し、result を記録し、構造化 telemetry を公開する

---

## MCP ツールセットを宣言する

### サービス設計内

まず、Goa サービス設計で MCP サーバーを宣言します:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")

    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })

    StaticPrompt("find-docs", "Help a user find documentation",
        "user", "Find relevant documentation for the user's question.")

    Method("readme", func() {
        Result(String)
        Resource("readme", "file:///docs/README.md", "text/markdown")
    })

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
        })
        Tool("search", "Search documents by query")
    })
})
```

### エージェント設計内

次に、エージェントから MCP suite を参照します:

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### インラインスキーマを持つ外部 MCP サーバー

外部 MCP サーバー (Goa-backed ではないもの) では、インラインスキーマでツールを宣言します:

```go
var RemoteSearch = Toolset("remote-search", FromExternalMCP("remote", "search"), func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

---

## URL 値と属性のマッピング

Goa の `Param("payload_field:url_name")` を使うと、payload のフィールド名と URL パラメーター名を分けられます。

```go
JSONRPC(func() {
    POST("/organizations/{organization}/mcp")
    Param("organization_id:organization")
})
```

URL が `organization_id` を指定します。このフィールドはツールやプロンプトの引数、スキーマ、例、生成された引数 codec に含まれません。独立したドメインフィールド `organization` は引数として残ります。各メソッドの型、Go フィールド名、検証を維持し、不正な URL 値は設定済み endpoint の実行前に拒否します。API と親サービスの完全なパスも維持します。

生成されたプロトコルクライアントは、この値を JSON-RPC パラメーターの外で送信します。生成された `NewCaller` は retry policy の後にパス順で URL 値を受け取ります。このパスでは最後に `"blue"` を渡してください。その caller は各ツール呼び出しで同じアドレスを使います。`NewHTTPCaller` には `https://example.com/organizations/blue/mcp` のような完全な URL を渡します。クライアント、サーバー、agent 契約をまとめて再生成してください。

---

## ランタイム配線

実行時には MCP caller を作成し、ツールセットを登録します:

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
)

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := genchat.RegisterUsedToolsets(ctx, rt,
    genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
); err != nil {
    log.Fatal(err)
}
```

---

## MCP Caller の種類

Goa-AI は `runtime/mcp` パッケージを通じて HTTP と stdio をサポートします。
どちらの caller も `Caller` インターフェースを実装します:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

`CallRequest` はツール名、JSON 引数、ホストが管理する任意の継続情報を持ちます。`CallResponse.Content` は `runtime/content` の `content.Blocks` で、テキスト、画像、音声、リソースリンク、埋め込みリソースを順序通りに保持します。構造化 JSON は `StructuredContent` に分けて保持します。`InputRequired` は操作が未完了であることを示します。ホストが必要な入力を渡してから継続します。

### HTTP Caller

HTTP JSON-RPC で到達できる MCP サーバー向けです:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient,
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
```

コンストラクターは通信せずにエンドポイントとアプリケーションの識別情報を検証します。各操作は HTTP `POST` で JSON-RPC を送り、JSON またはイベントストリームを受け取ります。`Client` を省略すると `http.DefaultClient` を使います。期限はアプリケーションがコンテキストと HTTP クライアントで指定します。

### Stdio Caller

stdin/stdout で通信するサブプロセスとして MCP サーバーを起動する場合に使います:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // 現在の環境へ追加する。
    Dir:     "/path/to/workdir",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    return err
}
defer func() {
    if err := caller.Close(shutdownContext); err != nil {
        log.Print(err)
    }
}()
```

stdio caller はサブプロセスを起動し、リクエスト ID で並行操作を対応付けます。各リクエストは自身のメタデータを持ちます。終了時はアプリケーションが用意した終了用コンテキストで caller を閉じ、戻り値のエラーを処理してください。

### CallerFunc アダプター

独自 caller 実装やテスト用です:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Adapt a function to the Caller interface
caller := mcpruntime.CallerFunc(func(ctx context.Context, req mcpruntime.CallRequest) (mcpruntime.CallResponse, error) {
    content, structured, err := myCustomMCPCall(ctx, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{
        Content:           content,
        StructuredContent: structured,
    }, nil
})
```

### Goa 生成 JSON-RPC Caller

サービスメソッドをラップする Goa 生成 MCP クライアント向けです:

```go
import genmcpclient "example.com/assistant/gen/jsonrpc/mcp_assistant/client"

caller, err := genmcpclient.NewCaller(client, mcpruntime.ClientInfo{
    Name: "my-agent", Version: "1.0.0",
}, mcpruntime.InputSupport{}, mcpruntime.HTTPRetryPolicy{})
if err != nil {
    return err
}
```

## 進捗とリソースの変更

最終結果より前に進捗が必要な場合は `WithProgress(ctx, handler)` を使います。サービスは `ReportProgress` を呼び、トランスポートが対応付けの識別子を付けます。コールバックのエラーはその操作を停止するため、処理が必要です。

```go
err := caller.Listen(ctx, mcpruntime.SubscriptionFilter{
    ResourceSubscriptions: []string{"file:///docs/README.md"},
}, func(ctx context.Context, event mcpruntime.SubscriptionEvent) error {
    return handleResourceChange(ctx, event)
})
if err != nil {
    return err
}
```

`Listen` は受諾通知と、受諾されたカタログまたはリソースの変更を受け取ります。未対応の種類は省略されるので、受諾されたフィルターを確認してください。アプリケーションは `handleResourceChange` を実装し、対象データを再取得してキャンセルに従います。接続の切断はエラーとなり、caller は自動再接続しません。

生成された JSON-RPC クライアントでは `WithSubscriptionEvents(ctx, handler)` を使い、型付き `SubscriptionsListen` エンドポイントを呼びます。エンドポイントは最終結果を返し、ハンドラーは検証済みイベントを受け取ります。ハンドラーがなければ通信前に失敗します。

### リソース購読元の宣言

リソースを持つ HTTP MCP サービスでは、サーバーストリーミングメソッドを一つ `ResourceSubscription()` で指定できます。任意の入力 `resources` は URI の配列です。必須の共用体 `change` は任意の `resources` 配列を持つ `acknowledged`、または必須の `uri` を持つ `updated` です。各 URI に `Format(FormatURI)` を指定します。購読元は許可した部分集合を最初に通知し、メソッドが戻るかキャンセルされるまで変更を送ります。

購読元が指定されたサービスだけがリソース購読機能を公開します。認可、変更検出、関連するサブリソースの選択は購読元が管理します。生成コードは認証情報、スコープ、インターセプター、ミドルウェアを含む Goa エンドポイントを使います。共有トランスポートは通知の順序とリクエスト ID を管理します。固定カタログはカタログ変更通知を送りません。

### リソース、プロンプト、リッチコンテンツ

`ResourceTemplate` は URI テンプレートを型付き読み取りメソッドに対応付けます。`Prompt` はメッセージを返すメソッドに対応付けます。`ResourceCompletion` と `PromptCompletion` は型付き引数候補を提供します。`ToolContent` は構造化結果と別に返すリッチコンテンツのフィールドを指定します。いずれも通常のサービスメソッドと同じ Goa 設計・生成の手順を使います。

### 中断されたツール応答の再試行

HTTP の既定は一回の試行です。信頼するエンドポイントにはホストが `HTTPRetryPolicy` を設定できます。ツールが読み取り専用または冪等であると宣言し、その宣言をポリシーが信頼するときだけ、中断された応答を再試行します。新しいリクエスト ID が使われ、ツールが再実行される可能性があります。エラー、不正な応答、コールバックの失敗、購読の切断は再試行の根拠になりません。

---

## ツール実行フロー

1. プランナーが生成済み MCP tool descriptor から構築した call を返すか、検証済み model call を `planner.ToolRequestFromModelCall` で転送します
2. runtime が planner result 全体を検証して execution ID を割り当て、`runtime.ToolCall` value を作ります
3. runtime が MCP toolset 登録を検出します
4. runtime call の正規 JSON payload を MCP caller へ転送します
5. MCP caller は HTTP または stdio を使い、JSON-RPC protocol を処理します。HTTP response は JSON または event stream です
6. 生成 codec で結果をデコードします
7. `ToolResult` をプランナーへ返します

---

## エラー処理

生成 helper は JSON-RPC error を `planner.ToolFailure` value へ変換します:

- **validation error** → 正確な修正情報を持つ invalid-call failure
- **network error** → 明示的な replan または finish action を持つ unavailable／timeout failure
- **server error** → 構造化された cause を failure に保持

これにより MCP toolset と native toolset は、同じ強制 recovery contract を使います。

tool が返した failure は `ToolFailure` になります。完了した planner result が
不正な場合は `OutputContractError` となり、別の model request を行わず拒否され、
tool failure として提示されません。

---

## 完全な例

### デザイン

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// MCP server service
var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")

    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
        })
        Tool("search", "Search documents by query")
    })
})

// Agent that uses MCP tools
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### ランタイム

エージェントの登録前に `RegisterUsedToolsets` に生成された実行器を渡してください。この例は構築済みのランタイムとプランナーを受け取ります。

```go
package main

import (
    "context"

    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    mcpruntime "goa.design/goa-ai/runtime/mcp"
)

func registerChat(ctx context.Context, rt *runtime.Runtime, p planner.Planner) error {
    caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{Name: "my-agent", Version: "1.0.0"},
    })
    if err != nil {
        return err
    }
    if err := genchat.RegisterUsedToolsets(ctx, rt,
        genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
    ); err != nil {
        return err
    }
    return genchat.RegisterChatAgent(ctx, rt, genchat.ChatAgentConfig{Planner: p})
}
```

### プランナー

プランナーは MCP ツールをネイティブツールセットと同じように参照できます:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    call, err := planner.NewToolRequest(
        genmcpspecs.SearchTool(),
        &genmcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{ToolCalls: []planner.ToolRequest{call}}, nil
}
```

`genmcpspecs` は `example.com/assistant/gen/assistant/toolsets/assistant_mcp` をインポートします。モデルの検証済み呼び出しを転送する場合は、プロバイダーの対応付け ID を保持するため `planner.ToolRequestFromModelCall` を使います。

---

## ベストプラクティス

- **登録は codegen に任せる**: MCP toolset 登録には生成 helper を使い、codec と構造化 failure recovery の一貫性を保つ
- **型付き caller を使う**: 利用できる場合は型安全のため Goa 生成 JSON-RPC caller を優先する
- **error を明示的に扱う**: MCP error を、正しい failure kind と recovery action を持つ `ToolFailure` value へ map する
- **telemetry を監視する**: MCP 呼び出しは構造化 telemetry イベントを発行するため、可観測性に活用する
- **適切な transport を選ぶ**: リモートサーバーには HTTP、サブプロセス型サーバーには stdio を使う。HTTP caller は JSON と event-stream の応答を受け付ける

---

## 次のステップ

- **[Toolsets](./toolsets.md)** - ツール実行モデルを理解する
- **[Memory & Sessions](./memory-sessions.md)** - transcript と memory store で状態を管理する
- **[Production](./production.md)** - Temporal と streaming UI でデプロイする
