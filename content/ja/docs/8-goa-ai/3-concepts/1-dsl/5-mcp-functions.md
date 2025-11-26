---
title: "MCP DSL関数"
linkTitle: "MCP DSL関数"
weight: 5
description: "MCPサーバー、ツール、リソース、プロンプトを宣言するための関数。"
---

## 概要

Goa-AIは、GoaサービスでModel Context Protocol（MCP）サーバーを宣言するためのDSL関数を提供します。これらの関数により、サービスはMCPプロトコルを介してツール、リソース、プロンプトを公開できます。

MCP宣言は以下を生成します：

- JSON-RPCトランスポートを備えたMCPサーバーハンドラーコード
- ツール/リソース/プロンプトの登録
- MCPサーバーを消費するためのクライアントヘルパー
- `MCPToolset`を介したエージェントツールセットとの統合

## MCPServer

`MCPServer(name, version, opts...)`は現在のサービスでMCPサポートを有効にします。MCPプロトコルを介してツール、リソース、プロンプトを公開するようにサービスを設定します。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Service`内  
**目的**: サービスのMCPサーバーを宣言します。

### 引数

- `name`: MCPサーバー名（MCPハンドシェイクで使用）
- `version`: サーバーバージョン文字列
- `opts...`: オプションの設定関数（例：`ProtocolVersion`）

### 例

```go
Service("calculator", func() {
    Description("電卓MCPサーバー")
    
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("add", func() {
        Payload(func() {
            Attribute("a", Int, "最初の数値")
            Attribute("b", Int, "2番目の数値")
            Required("a", "b")
        })
        Result(func() {
            Attribute("sum", Int, "加算結果")
            Required("sum")
        })
        MCPTool("add", "2つの数値を加算")
    })
})
```

## ProtocolVersion

`ProtocolVersion(version)`はサーバーがサポートするMCPプロトコルバージョンを設定します。`MCPServer`で使用する設定関数を返します。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `MCPServer`の引数  
**目的**: MCPプロトコルバージョンを設定します。

### 例

```go
MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
```

## MCPTool

`MCPTool(name, description)`は現在のメソッドをMCPツールとしてマークします。メソッドのペイロードがツール入力スキーマになり、メソッドの結果がツール出力スキーマになります。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Method`内（サービスでMCPが有効化されている必要あり）  
**目的**: サービスメソッドをMCPツールとして公開します。

### 例

```go
Method("search", func() {
    Payload(func() {
        Attribute("query", String, "検索クエリ")
        Attribute("limit", Int, "最大結果数", func() { Default(10) })
        Required("query")
    })
    Result(func() {
        Attribute("results", ArrayOf(String), "検索結果")
        Required("results")
    })
    MCPTool("search", "クエリでドキュメントを検索")
})
```

## Resource

`Resource(name, uri, mimeType)`は現在のメソッドをMCPリソースプロバイダーとしてマークします。メソッドの結果が、クライアントがリソースを読み取るときに返されるリソースコンテンツになります。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Method`内（サービスでMCPが有効化されている必要あり）  
**目的**: サービスメソッドをMCPリソースとして公開します。

### 引数

- `name`: リソース名（MCPリソースリストで使用）
- `uri`: リソースURI（例：`"file:///docs/readme.md"`）
- `mimeType`: コンテンツMIMEタイプ（例：`"text/plain"`、`"application/json"`）

### 例

```go
Method("readme", func() {
    Result(String)
    Resource("readme", "file:///docs/README.md", "text/markdown")
})
```

## WatchableResource

`WatchableResource(name, uri, mimeType)`は現在のメソッドをサブスクリプションをサポートするMCPリソースとしてマークします。クライアントはリソースコンテンツが変更されたときに通知を受け取るためにサブスクライブできます。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Method`内（サービスでMCPが有効化されている必要あり）  
**目的**: 監視可能/サブスクライブ可能なリソースを公開します。

### 例

```go
Method("system_status", func() {
    Result(func() {
        Attribute("status", String, "現在のシステム状態")
        Attribute("uptime", Int, "稼働時間（秒）")
        Required("status", "uptime")
    })
    WatchableResource("status", "status://system", "application/json")
})
```

## StaticPrompt

`StaticPrompt(name, description, messages...)`はMCPサーバーに静的プロンプトテンプレートを追加します。静的プロンプトは、クライアントがパラメータなしで使用できる事前定義されたメッセージシーケンスを提供します。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Service`内（サービスでMCPが有効化されている必要あり）  
**目的**: 静的プロンプトテンプレートを宣言します。

### 引数

- `name`: プロンプト識別子
- `description`: 人間可読なプロンプト説明
- `messages...`: 交互のロールとコンテンツ文字列（例：`"user"`, `"text"`, `"system"`, `"text"`）

### 例

```go
Service("assistant", func() {
    MCPServer("assistant", "1.0")
    
    StaticPrompt("greeting", "フレンドリーな挨拶",
        "system", "あなたは親切なアシスタントです",
        "user", "こんにちは！")
    
    StaticPrompt("code_help", "プログラミング支援",
        "system", "あなたは専門のプログラマーです",
        "user", "コードを手伝ってください")
})
```

## DynamicPrompt

`DynamicPrompt(name, description)`は現在のメソッドを動的プロンプトジェネレーターとしてマークします。メソッドのペイロードは生成されるプロンプトをカスタマイズするパラメータを定義し、結果は生成されたメッセージシーケンスを含みます。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Method`内（サービスでMCPが有効化されている必要あり）  
**目的**: パラメータ化されたプロンプトジェネレーターを宣言します。

### 例

```go
Method("code_review", func() {
    Payload(func() {
        Attribute("language", String, "プログラミング言語")
        Attribute("code", String, "レビューするコード")
        Required("language", "code")
    })
    Result(ArrayOf(Message))
    DynamicPrompt("code_review", "コードレビュープロンプトを生成")
})
```

## Notification

`Notification(name, description)`は現在のメソッドをMCP通知送信者としてマークします。メソッドのペイロードは通知メッセージ構造を定義します。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Method`内（サービスでMCPが有効化されている必要あり）  
**目的**: 通知タイプを宣言します。

### 例

```go
Method("progress_update", func() {
    Payload(func() {
        Attribute("task_id", String, "タスク識別子")
        Attribute("progress", Int, "進捗パーセンテージ（0-100）")
        Required("task_id", "progress")
    })
    Notification("progress", "タスク進捗通知")
})
```

## Subscription

`Subscription(resourceName)`は現在のメソッドを監視可能なリソースのサブスクリプションハンドラーとしてマークします。クライアントが`resourceName`で識別されるリソースにサブスクライブするとメソッドが呼び出されます。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Method`内（サービスでMCPが有効化されている必要あり）  
**目的**: リソースサブスクリプションを処理します。

### 例

```go
Method("subscribe_status", func() {
    Payload(func() {
        Attribute("uri", String, "サブスクライブするリソースURI")
        Required("uri")
    })
    Result(String)
    Subscription("status") // "status"という名前のWatchableResourceにリンク
})
```

## SubscriptionMonitor

`SubscriptionMonitor(name)`は現在のメソッドをサブスクリプション更新用のサーバー送信イベント（SSE）モニターとしてマークします。メソッドは接続されたクライアントにサブスクリプション変更イベントをストリーミングします。

**場所**: `dsl/mcp.go`  
**コンテキスト**: `Method`内（サービスでMCPが有効化されている必要あり）  
**目的**: サブスクリプションイベント用のSSEストリームを宣言します。

### 例

```go
Method("watch_subscriptions", func() {
    StreamingResult(func() {
        Attribute("resource", String, "リソース名")
        Attribute("event", String, "イベントタイプ")
        Required("resource", "event")
    })
    SubscriptionMonitor("subscriptions")
})
```

## 完全なMCPサーバー例

```go
var _ = Service("assistant", func() {
    Description("フル機能MCPサーバー例")
    
    // MCPを有効化
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    // 静的プロンプト
    StaticPrompt("greeting", "フレンドリーな挨拶",
        "system", "あなたは親切なアシスタントです",
        "user", "こんにちは！")
    
    // MCPを介して公開されるツール
    Method("search", func() {
        Description("ドキュメントを検索")
        Payload(func() {
            Attribute("query", String, "検索クエリ")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "検索結果")
            Required("results")
        })
        MCPTool("search", "クエリでドキュメントを検索")
    })
    
    // 静的リソース
    Method("get_readme", func() {
        Result(String)
        Resource("readme", "file:///README.md", "text/markdown")
    })
    
    // サブスクリプション付き監視可能リソース
    Method("get_status", func() {
        Result(func() {
            Attribute("status", String)
            Attribute("updated_at", String)
        })
        WatchableResource("status", "status://system", "application/json")
    })
    
    Method("subscribe_status", func() {
        Payload(func() {
            Attribute("uri", String)
        })
        Result(String)
        Subscription("status")
    })
    
    // 動的プロンプト
    Method("review_code", func() {
        Payload(func() {
            Attribute("language", String)
            Attribute("code", String)
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "コードレビュープロンプトを生成")
    })
    
    // 通知
    Method("notify_progress", func() {
        Payload(func() {
            Attribute("task_id", String)
            Attribute("progress", Int)
            Required("task_id", "progress")
        })
        Notification("progress", "タスク進捗更新")
    })
})
```

## エージェントでのMCPツールの使用

MCPサーバーを宣言したら、エージェントは`MCPToolset`を介してそのツールを消費できます：

```go
// MCPサーバーのツールセットを参照
var AssistantTools = MCPToolset("assistant", "assistant")

var _ = Service("orchestrator", func() {
    Agent("chat", "チャットエージェント", func() {
        Use(AssistantTools) // MCPサーバーからすべてのツールを消費
    })
})
```

ランタイム配線の詳細については[MCP統合](../4-mcp-integration/)を参照してください。

## 次のステップ

- ランタイム設定については[MCP統合](../4-mcp-integration/)を読む
- 完全な例については[MCPツールセットチュートリアル](../../4-tutorials/3-mcp-toolsets/)を探索する
- エージェントネイティブツールセットについては[ツールセット関数](./3-toolset-functions.md)を学ぶ

