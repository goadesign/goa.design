---
title: "MCPツールセット"
linkTitle: "MCPツールセット"
weight: 3
description: "Model Context Protocol（MCP）サーバーをGoa-AIエージェントと統合する。"
---

このチュートリアルでは、Model Context Protocol（MCP）サーバーをGoa-AIエージェントと統合する方法を示します。MCPはツール、プロンプト、リソースを外部システムに公開するための標準化されたプロトコルです。

## MCPとは

MCPはAIエージェントが外部サービスと対話するためのオープンプロトコルです。Goa-AIはMCPサーバーとの**コンシューマー**統合をサポートしており、エージェントがMCPサーバーが公開するツールを使用できます。

## 設計でのMCPの設定

```go
package design

import (
    . "goa.design/goa-ai/dsl"
    . "goa.design/goa/v3/dsl"
)

var _ = Service("assistant", func() {
    Agent("helper", "MCPツールを使用するアシスタント", func() {
        // MCPサーバーに接続
        UseMCP("filesystem", func() {
            Description("ファイルシステム操作")
            Server("npx", "@modelcontextprotocol/server-filesystem", "/allowed/path")
        })
    })
})
```

## 動作原理

MCPサーバーを設定すると：

- Goa-AIはサーバープロセスを起動し、MCPプロトコルを話す
- サーバーが公開するツールを発見
- これらのツールをエージェントの利用可能なツールリストに追加
- ツールコールをMCPリクエストにプロキシし、応答をGoa-AI形式に変換

## 主な機能

- **自動発見**：MCPサーバーのツールは自動的にエージェントに利用可能
- **型変換**：MCPスキーマがGoa-AI型に変換される
- **エラー処理**：MCPエラーが適切に`ToolError`に変換される
- **ライフサイクル管理**：ランタイムがサーバープロセスの起動とシャットダウンを管理

## 次のステップ

- [MCP統合コンセプト](../../3-concepts/4-mcp-integration.md)で詳細なMCP機能を学ぶ
- MCPサーバーの構築については[MCP DSL関数](../../3-concepts/1-dsl/5-mcp-functions.md)を参照


