---
title: "MCP統合"
linkTitle: "MCP統合"
weight: 4
description: "外部MCPサーバーをエージェントに統合する。"
---

Goa-AIは、MCP（Model Context Protocol）サーバーをエージェントに統合するためのファーストクラスサポートを提供します。MCPツールセットにより、エージェントは生成されたラッパーとコーラーを通じて外部MCPサーバーからツールを消費できます。

## 概要

MCP統合は次のワークフローに従います：

1. **サービス設計**: GoaのMCP DSLを介してMCPサーバーを宣言
2. **エージェント設計**: `Use(MCPToolset("service", "suite"))`でそのスイートを参照
3. **コード生成**: クラシックなMCP JSON-RPCサーバー（オプション）とランタイム登録ヘルパーの両方を生成し、ツールコーデック/スペックをエージェントパッケージにミラーリング
4. **ランタイム配線**: `mcpruntime.Caller`トランスポート（HTTP/SSE/stdio）をインスタンス化。生成されたヘルパーがツールセットを登録し、JSON-RPCエラーを`planner.RetryHint`値に適応
5. **プランナー実行**: プランナーは単に正規のJSONペイロードでツールコールをエンキュー。ランタイムはそれらをMCPコーラーに転送し、フックを介して結果を永続化し、構造化テレメトリを表示

## MCPツールセットの宣言

### サービス設計内

まず、Goaサービス設計でMCPサーバーを宣言します：

```go
var _ = Service("assistant", func() {
    Description("アシスタントツール用MCPサーバー")
    
    // MCPサーバー宣言
    // ... MCP DSLはここ ...
})
```

### エージェント設計内

次に、エージェントでMCPスイートを参照します：

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", "会話ランナー", func() {
        Use(AssistantSuite)
    })
})
```

## ランタイム配線

ランタイムで、MCPコーラーをインスタンス化してツールセットを登録します：

```go
import (
    "goa.design/goa-ai/features/mcp"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
)

// MCPコーラーを作成（HTTP、SSE、またはstdio）
caller := featuresmcp.NewHTTPCaller("https://assistant.example.com/mcp")

// MCPツールセットを登録
if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
    log.Fatal(err)
}
```

## 生成されたヘルパー

コード生成は以下を生成します：

- MCPツールメタデータをランタイム登録に適応する`Register<Service><Suite>Toolset`関数
- エージェントパッケージにミラーリングされたツールコーデック/スペック
- Goa生成のMCPクライアントをランタイムに直接プラグインできる`client.NewCaller`ヘルパー

## MCPコーラータイプ

Goa-AIは複数のMCPトランスポートタイプをサポートします：

### HTTPコーラー

```go
caller := featuresmcp.NewHTTPCaller("https://assistant.example.com/mcp")
```

### SSEコーラー

```go
caller := featuresmcp.NewSSECaller("https://assistant.example.com/mcp")
```

### Stdioコーラー

```go
caller := featuresmcp.NewStdioCaller(cmd)
```

### Goa生成JSON-RPCコーラー

```go
caller := mcpassistant.NewCaller(client) // Goa生成クライアントを使用
```

## エラー処理

生成されたヘルパーはJSON-RPCエラーを`planner.RetryHint`値に適応します：

- 検証エラー → プランナー用ガイダンス付き`RetryHint`
- ネットワークエラー → バックオフ推奨付きリトライヒント
- サーバーエラー → ツール結果にエラー詳細を保持

## ツール実行フロー

1. プランナーはMCPツールを参照するツールコールを返します（ペイロードは`json.RawMessage`）
2. ランタイムはMCPツールセット登録を検出
3. 正規のJSONペイロードをMCPコーラーに転送
4. ツール名とペイロードでMCPコーラーを呼び出し
5. MCPコーラーはトランスポート（HTTP/SSE/stdio）とJSON-RPCプロトコルを処理
6. 生成されたコーデックを使用して結果をデコード
7. プランナーに`ToolResult`を返す

## ベストプラクティス

- **コード生成に登録を任せる**: 生成されたヘルパーを使用してMCPツールセットを登録します。手書きのグルーコードを避けて、コーデックとリトライヒントの一貫性を保ちます
- **型付きコーラーを使用**: 型安全性のために、利用可能な場合はGoa生成のJSON-RPCコーラーを優先
- **エラーを適切に処理**: MCPエラーを`RetryHint`値にマップしてプランナーの回復を支援
- **テレメトリを監視**: MCPコールは構造化テレメトリイベントを発行します。観測可能性に使用してください

## 次のステップ

- ツール実行モデルを理解するための[ツールセット](../3-toolsets/)を学ぶ
- 完全な例のための[MCPツールセットチュートリアル](../../4-tutorials/3-mcp-toolsets/)を探索する
- 実行フローを理解するための[ランタイムコンセプト](../2-runtime/)を読む

