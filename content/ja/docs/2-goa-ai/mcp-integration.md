---
title: MCP 統合
weight: 6
description: "生成されたラッパーと caller を使って、外部 MCP サーバーをエージェントへ統合します。"
llm_optimized: true
aliases:
---

Goa-AI は、MCP (Model Context Protocol) サーバーをエージェントへ統合するためのファーストクラスのサポートを提供します。MCP ツールセットにより、エージェントは外部 MCP サーバーのツールを、生成されたラッパーと caller 経由で利用できます。

## 概要

MCP 統合は次の流れです:

1. **サービス設計**: Goa の MCP DSL で MCP サーバーを宣言する
2. **エージェント設計**: `FromMCP(...)` または `FromExternalMCP(...)` で宣言したツールセットとして、その suite を参照する
3. **コード生成**: Goa-backed の場合は MCP JSON-RPC サーバーを生成し、suite 用のランタイム登録 helper とツールセット所有の specs/codecs も生成する
4. **ランタイム配線**: `mcpruntime.Caller` トランスポート (HTTP/SSE/stdio) を作成する。生成 helper がツールセットを登録し、JSON-RPC エラーを `planner.RetryHint` に変換する
5. **プランナー実行**: プランナーは正規 JSON payload のツール呼び出しを enqueue するだけでよい。ランタイムが MCP caller へ転送し、hook で結果を永続化し、構造化 telemetry を表面化する

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

    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
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

## ランタイム配線

実行時には MCP caller を作成し、ツールセットを登録します:

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
)

// Create an MCP caller (HTTP, SSE, or stdio)
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
    log.Fatal(err)
}
```

---

## MCP Caller の種類

Goa-AI は `runtime/mcp` パッケージを通じて複数の MCP トランスポートをサポートします。すべての caller は `Caller` インターフェースを実装します:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

### HTTP Caller

HTTP JSON-RPC で到達できる MCP サーバー向けです:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage with defaults
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})

// Full configuration
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint:        "https://assistant.example.com/mcp",
    Client:          customHTTPClient,        // Optional: custom *http.Client
    ProtocolVersion: "2024-11-05",            // Optional: MCP protocol version
    ClientName:      "my-agent",              // Optional: client name for handshake
    ClientVersion:   "1.0.0",                 // Optional: client version
    InitTimeout:     10 * time.Second,        // Optional: initialize handshake timeout
})
```

HTTP caller は作成時に MCP initialize handshake を行い、ツール呼び出しには HTTP POST 上の同期 JSON-RPC を使います。

### SSE Caller

Server-Sent Events streaming を使う MCP サーバー向けです:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage
caller, err := mcpruntime.NewSSECaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})

// Full configuration (same options as HTTP)
caller, err := mcpruntime.NewSSECaller(ctx, mcpruntime.HTTPOptions{
    Endpoint:        "https://assistant.example.com/mcp",
    Client:          customHTTPClient,
    ProtocolVersion: "2024-11-05",
    ClientName:      "my-agent",
    ClientVersion:   "1.0.0",
    InitTimeout:     10 * time.Second,
})
```

SSE caller は initialize handshake に HTTP を使いますが、ツール呼び出しでは `text/event-stream` 応答を要求します。そのため、サーバーは最終応答の前に進捗イベントをストリーミングできます。

### Stdio Caller

stdin/stdout で通信するサブプロセスとして MCP サーバーを起動する場合に使います:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage
caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
})

// Full configuration
caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command:         "mcp-server",
    Args:            []string{"--config", "config.json"},
    Env:             []string{"MCP_DEBUG=1"},  // Additional environment variables
    Dir:             "/path/to/workdir",       // Working directory
    ProtocolVersion: "2024-11-05",
    ClientName:      "my-agent",
    ClientVersion:   "1.0.0",
    InitTimeout:     10 * time.Second,
})
defer caller.Close() // Clean up subprocess
```

stdio caller はコマンドをサブプロセスとして起動し、MCP initialize handshake を実行し、ツール呼び出しをまたいでセッションを維持します。終了時は `Close()` を呼んでサブプロセスを終了します。

### CallerFunc アダプター

独自 caller 実装やテスト用です:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Adapt a function to the Caller interface
caller := mcpruntime.CallerFunc(func(ctx context.Context, req mcpruntime.CallRequest) (mcpruntime.CallResponse, error) {
    // Custom implementation
    result, err := myCustomMCPCall(ctx, req.Suite, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{Result: result}, nil
})
```

### Goa 生成 JSON-RPC Caller

サービスメソッドをラップする Goa 生成 MCP クライアント向けです:

```go
caller := mcpassistant.NewCaller(client) // Uses Goa-generated client
```

---

## ツール実行フロー

1. プランナーが MCP ツールを参照するツール呼び出しを返します (payload は `json.RawMessage`)
2. ランタイムが MCP ツールセット登録を検出します
3. 正規 JSON payload を MCP caller へ転送します
4. ツール名と payload で MCP caller を呼び出します
5. MCP caller がトランスポート (HTTP/SSE/stdio) と JSON-RPC プロトコルを扱います
6. 生成 codec で結果をデコードします
7. `ToolResult` をプランナーへ返します

---

## エラー処理

生成 helper は JSON-RPC エラーを `planner.RetryHint` 値へ変換します:

- **バリデーションエラー** → プランナー向けのガイダンス付き `RetryHint`
- **ネットワークエラー** → バックオフ推奨を含む retry hint
- **サーバーエラー** → エラー詳細をツール結果に保持

これにより、プランナーはネイティブツールセットと同じ retry パターンで MCP エラーから回復できます。

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

    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
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

```go
package main

import (
    "context"
    "log"

    mcpruntime "goa.design/goa-ai/runtime/mcp"
    chat "example.com/assistant/gen/orchestrator/agents/chat"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()

    // Wire MCP caller
    caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
    })
    if err != nil {
        log.Fatal(err)
    }
    if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
        log.Fatal(err)
    }

    // Register agent
    if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &MyPlanner{},
    }); err != nil {
        log.Fatal(err)
    }

    // Run agent
    client := chat.NewClient(rt)
    // ... use client ...
}
```

### プランナー

プランナーは MCP ツールをネイティブツールセットと同じように参照できます:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{
            {
                Name:    "assistant.assistant-mcp.search",
                Payload: []byte(`{"query": "golang tutorials"}`),
            },
        },
    }, nil
}
```

---

## ベストプラクティス

- **登録は codegen に任せる**: MCP ツールセット登録には生成 helper を使い、codec と retry hint の一貫性を保つ
- **型付き caller を使う**: 利用できる場合は型安全のため Goa 生成 JSON-RPC caller を優先する
- **エラーを穏当に扱う**: MCP エラーを `RetryHint` 値へ map し、プランナーが回復できるようにする
- **telemetry を監視する**: MCP 呼び出しは構造化 telemetry イベントを発行するため、可観測性に活用する
- **適切な transport を選ぶ**: 単純な request/response には HTTP、streaming には SSE、サブプロセス型サーバーには stdio を使う

---

## 次のステップ

- **[Toolsets](./toolsets.md)** - ツール実行モデルを理解する
- **[Memory & Sessions](./memory-sessions.md)** - transcript と memory store で状態を管理する
- **[Production](./production.md)** - Temporal と streaming UI でデプロイする
