---
title: MCP 統合
weight: 6
description: "Integrate external MCP servers into your agents with generated wrappers and callers."
llm_optimized: true
aliases:
---

Goa-AI は、MCP (Model Context Protocol) サーバーをエージェントに統合するためのファーストクラスのサポートを提供します。MCP ツールセットにより、エージェントは外部の MCP サーバーのツールを、生成されたラッパーと caller（呼び出し元）を通じて利用できます。

## 概要

MCP 統合は、次のワークフローに従います：

1. **サービス設計**: Goa の MCP DSL で MCP サーバーを宣言する
2. **エージェント設計**: `Use(MCPToolset("service", "suite"))` でそのスイートを参照する
3. **コード生成**: 従来の MCP JSON-RPC サーバー（任意）とランタイム登録ヘルパーを生成し、ツールの codec/specs をエージェントパッケージへミラーする
4. **ランタイム配線**: `mcpruntime.Caller` トランスポート（HTTP/SSE/stdio）を作成する。生成ヘルパーがツールセットを登録し、JSON-RPC エラーを `planner.RetryHint` に変換する
5. **プランナー実行**: プランナーは canonical（正規）な JSON ペイロードでツール呼び出しをキューに積むだけでよい。ランタイムが MCP caller へ転送し、フックで結果を永続化し、構造化テレメトリを出力する

---

## MCP ツールセットの宣言

### サービス設計

まず、Goa のサービス設計で MCP サーバーを宣言します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
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
})
```

### エージェント設計

次に、エージェントで MCP スイートを参照します：

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

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

### インラインスキーマを持つ外部 MCP サーバ

外部 MCP サーバー（Goa で実装されていない MCP サーバー）の場合は、インラインスキーマでツールを宣言します：

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

---

## ランタイム配線

実行時に、MCP caller を作成してツールセットを登録します：

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

Goa-AI は `runtime/mcp` パッケージを通じて、複数の MCP トランスポートをサポートします。すべての caller は `Caller` インターフェイスを実装します：

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

### HTTP Caller

HTTP JSON-RPC でアクセスできる MCP サーバー向けです：

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

HTTP caller は作成時に MCP の初期化ハンドシェイクを実行し、ツール呼び出しには HTTP POST 上の同期 JSON-RPC を使用します。

### SSE Caller

Server-Sent Events（SSE）によるストリーミングを使う MCP サーバー向けです：

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

SSE caller は初期化ハンドシェイクに HTTP を使用しますが、ツール呼び出しでは `text/event-stream` 応答を要求するため、サーバーは最終応答の前に進捗イベントをストリーミングできます。

### Stdio Caller

stdin/stdout で通信するサブプロセスとして実行する MCP サーバー向けです：

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

stdio caller はコマンドをサブプロセスとして起動し、MCP の初期化ハンドシェイクを実行して、ツール呼び出しをまたいでセッションを維持します。終了時は `Close()` を呼び出してサブプロセスを終了します。

### CallerFunc アダプタ

独自の caller 実装やテスト用途向けです：

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

### Goa が生成する JSON-RPC コーラー

サービスメソッドをラップする Goa 生成 MCP クライアント向けです：

```go
caller := mcpassistant.NewCaller(client) // Uses Goa-generated client
```

---

## ツール実行の流れ

1. プランナーが MCP ツールを参照するツール呼び出しを返す（ペイロードは `json.RawMessage`）
2. ランタイムが MCP ツールセットの登録を検出する
3. canonical JSON ペイロードを MCP caller に転送する
4. ツール名とペイロードで MCP caller を呼び出す
5. MCP caller がトランスポート（HTTP/SSE/stdio）と JSON-RPC プロトコルを処理する
6. 生成された codec で結果をデコードする
7. プランナーへ `ToolResult` を返す

---

## エラー処理

生成されたヘルパーは JSON-RPC エラーを `planner.RetryHint` に変換します：

- **バリデーションエラー** → プランナー向けのガイダンス付き `RetryHint`
- **ネットワークエラー** → バックオフ推奨の `RetryHint`
- **サーバーエラー** → エラー詳細をツール結果に保持

これにより、プランナーはネイティブツールセットと同じリトライパターンで MCP エラーから回復できます。

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
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
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
})

// Agent that uses MCP tools
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

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

プランナーは、ネイティブツールセットと同様に MCP ツールを参照できます：

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

- **コード生成に登録を任せる**: MCP ツールセットの登録は生成ヘルパーを使い、手書きのグルーを避けて codec と retry hint の一貫性を保つ
- **型付き caller を使う**: 利用できる場合は、型安全のため Goa 生成 JSON-RPC caller を優先する
- **エラーを適切に扱う**: MCP エラーを `RetryHint` にマップし、プランナーが回復できるようにする
- **テレメトリを監視する**: MCP 呼び出しは構造化テレメトリイベントを発行するため、可観測性に活用する
- **用途に合ったトランスポートを選ぶ**: 単純な request/response には HTTP、ストリーミングには SSE、サブプロセス型サーバーには stdio を使う

---

## 次のステップ

- **[Toolsets](./toolsets.md)** - ツールの実行モデルを理解する
- **[Memory & Sessions](./memory-sessions.md)** - トランスクリプトとメモリストアで状態を管理する
- **[Production](./production.md)** - Temporal とストリーミング UI でデプロイする
