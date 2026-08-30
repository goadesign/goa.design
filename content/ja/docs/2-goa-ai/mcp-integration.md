---
title: MCP 統合
weight: 6
description: "生成されたラッパーと caller を使って、外部 MCP サーバーをエージェントへ統合します。"
llm_optimized: true
aliases:
---

Goa-AI は、MCP (Model Context Protocol) サーバーをエージェントへ統合するためのファーストクラスのサポートを提供します。MCP ツールセットにより、エージェントは外部 MCP サーバーのツールを、生成されたラッパーと caller 経由で利用できます。

handwritten caller が現在実装するのは MCP `2025-06-18` の tool contract
です。session を初期化し、server の tools capability を必須とし、`tools/call`
を呼びます。このページは prompts や resources を含む MCP 全体の実装を示すもの
ではありません。

## 概要

MCP 統合は次の流れです:

1. **サービス設計**: Goa の MCP DSL で MCP サーバーを宣言する
2. **エージェント設計**: `FromMCP(...)` または `FromExternalMCP(...)` で宣言したツールセットとして、その suite を参照する
3. **コード生成**: Goa-backed の場合は MCP JSON-RPC サーバーを生成し、suite 用のランタイム登録 helper とツールセット所有の specs/codecs も生成する
4. **ランタイム配線**: `mcpruntime.Caller` transport（HTTP/SSE/stdio）を作成する。生成 helper が toolset を登録し、JSON-RPC error を `planner.ToolFailure` に変換する
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

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
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
if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
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

type CallRequest struct {
    Tool    string
    Payload json.RawMessage
}

type CallResponse struct {
    Content           []ContentBlock
    StructuredContent json.RawMessage
}
```

### HTTP Caller

HTTP JSON-RPC で到達できる MCP サーバー向けです:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient, // 省略時は 30 秒のタイムアウトを持つ client を使う。
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
    InitTimeout: 10 * time.Second, // 省略可能な初期化タイムアウト。
})
```

HTTP caller は作成時に MCP initialize handshake を行います。各 JSON-RPC 2.0
message を設定済み endpoint への HTTP `POST` として送ります。tool response は
JSON または HTTP event stream で受信でき、別の SSE caller は不要です。

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
    InitTimeout: 10 * time.Second, // 省略可能な初期化タイムアウト。
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
caller, err := mcpassistant.NewCaller(ctx, client, mcpruntime.ClientInfo{
    Name:    "my-agent",
    Version: "1.0.0",
})
```

---

## ツール実行フロー

1. プランナーが生成済み MCP tool descriptor から構築した call を返すか、検証済み model call を `planner.ToolRequestFromModelCall` で転送します
2. runtime が planner result 全体を検証して execution ID を割り当て、`runtime.ToolCall` value を作ります
3. runtime が MCP toolset 登録を検出します
4. runtime call の正規 JSON payload を MCP caller へ転送します
5. MCP caller がトランスポート (HTTP/SSE/stdio) と JSON-RPC プロトコルを扱います
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
    storageinmem "goa.design/goa-ai/runtime/agent/storage/inmem"
)

func main() {
    rt := runtime.New(storageinmem.New())
    ctx := context.Background()

    // Wire MCP caller
    caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{
            Name:    "my-agent",
            Version: "1.0.0",
        },
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
    call, err := planner.NewToolRequest(
        mcpspecs.SearchTool(),
        &mcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{call},
    }, nil
}
```

ここで `mcpspecs` は MCP toolset の生成 specs package です。検証済みの model-generated tool call を転送する場合は、provider correlation ID を保持するため `planner.ToolRequestFromModelCall` を使います。

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
