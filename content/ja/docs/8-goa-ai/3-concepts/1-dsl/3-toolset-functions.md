---
title: "ツールセット関数"
linkTitle: "ツールセット関数"
weight: 3
description: "ツールセットとツールを定義するための関数。"
---

## Toolset

`Toolset(name, dsl)`はトップレベルでプロバイダー所有のツールセットを宣言します。トップレベルで宣言された場合、ツールセットはグローバルに再利用可能になります。エージェントは`Use`で参照し、サービスは`Export`で公開できます。

**場所**: `dsl/toolset.go`  
**コンテキスト**: トップレベル  
**目的**: プロバイダー所有のツールセット（エージェント間で再利用可能）を定義します。

ツールセットは複数のツールを持つことができ、各ツールにはペイロード/結果スキーマ、ヘルパープロンプト、メタデータタグがあります。

### 例

```go
var DocsToolset = Toolset("docs.search", func() {
    ToolsetDescription("ドキュメント検索用ツール")
    Tool("search", "インデックスされたドキュメントを検索", func() {
        Args(func() {
            Attribute("query", String, "検索フレーズ")
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "マッチしたスニペット")
            Required("documents")
        })
    })
})
```

## ToolsetDescription

`ToolsetDescription(description)`は現在のツールセットの人間可読な説明を設定します。この説明はツールセットの目的と機能を文書化します。

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Toolset`内  
**目的**: ツールセットの目的を文書化します。

### 例

```go
Toolset("data-tools", func() {
    ToolsetDescription("データ処理と分析用ツール")
    Tool("analyze", "データセットを分析", func() {
        // ツール定義
    })
})
```

## MCPToolset

`MCPToolset(service, toolset)`はGoa MCPサーバーから派生したMCP定義のツールセットを宣言します。エージェントが`Use`で参照するトップレベルの構造体です。

**場所**: `dsl/toolset.go`  
**コンテキスト**: トップレベル  
**目的**: エージェントが`Use`で参照するプロバイダーMCPスイートを宣言します。

2つの使用パターンがあります：

1. **Goaバックエンドのmcpサーバー**: ツールスキーマはサービスの`MCPTool`宣言から発見されます
2. **外部MCPサーバー**: ツールはインラインスキーマで明示的に宣言されます。ランタイムで`mcpruntime.Caller`が必要です

### 例（Goaバックエンド）

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

### 例（インラインスキーマを持つ外部）

```go
var RemoteSearch = MCPToolset("remote", "search", func() {
    Tool("web_search", "ウェブを検索", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

## Tool

`Tool(name, description, dsl)`はツールセット内で呼び出し可能な機能を定義します。2つの異なるユースケースがあります：

1. **Toolset内**: インラインの引数と戻り値スキーマを持つツールを宣言
2. **Method内**: GoaサービスメソッドをMCPツールとしてマーク（[MCP DSLリファレンス](./5-mcp-functions.md)を参照）

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Toolset`または`Method`内  
**目的**: ツール（引数、結果、メタデータ）を定義します。

コード生成は以下を出力します：

- `tool_specs/types.go`のペイロード/結果Go構造体
- アクティビティマーシャリングとメモリに使用されるJSONコーデック（`tool_specs/codecs.go`）
- プランナーとオプションの検証レイヤーが消費するJSONスキーマ定義
- ヘルパープロンプトとメタデータを含む、ランタイムが消費するツールレジストリエントリ

### 例

```go
Tool("search", "インデックスされたドキュメントを検索", func() {
    ToolTitle("ドキュメント検索")
    Args(func() {
        Attribute("query", String, "検索フレーズ")
        Attribute("limit", Int, "最大結果数", func() { Default(5) })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "マッチしたスニペット")
        Required("documents")
    })
    CallHintTemplate("検索中: {{ .Query }}")
    ResultHintTemplate("{{ len .Documents }}件のドキュメントが見つかりました")
    Tags("docs", "search")
})
```

## Args と Return

`Args(...)`と`Return(...)`は標準のGoa属性DSLを使用してペイロード/結果タイプを定義します。以下を使用できます：

- `Attribute()`呼び出しでインラインオブジェクトスキーマを定義する関数
- 既存の型定義を再利用するGoaユーザータイプ（Type、ResultTypeなど）
- 単純な単一値の入出力用のプリミティブタイプ（String、Intなど）

インラインでスキーマを定義する関数を使用する場合、以下が使用できます：

- `Attribute(name, type, description)`で各フィールドを定義
- `Field(index, name, type, description)`で位置フィールド
- `Required(...)`でフィールドを必須としてマーク
- `Example(...)`で例の値
- `Default(...)`でデフォルト値
- `Enum(...)`で列挙値
- `MinLength`/`MaxLength`で文字列制約
- `Minimum`/`Maximum`で数値制約

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Tool`内  
**目的**: 標準のGoa属性DSLを使用してペイロード/結果タイプを定義します。

### 例

```go
Tool("search", "ドキュメントを検索", func() {
    Args(func() {
        Attribute("query", String, "検索フレーズ")
        Attribute("limit", Int, "最大結果数", func() {
            Default(5)
            Minimum(1)
            Maximum(100)
        })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "マッチしたスニペット")
        Attribute("count", Int, "結果数")
        Required("documents", "count")
    })
})
```

### 例（型の再利用）

```go
var SearchParams = Type("SearchParams", func() {
    Attribute("query", String)
    Attribute("limit", Int)
    Required("query")
})

Tool("search", "ドキュメントを検索", func() {
    Args(SearchParams)
    Return(func() {
        Attribute("results", ArrayOf(String))
    })
})
```

## Sidecar

`Sidecar(...)`はツール結果の型付きサイドカースキーマを定義します。サイドカーデータは`planner.ToolResult.Sidecar`にアタッチされますが、モデルプロバイダーには送信されません—境界付きのモデル向け結果をバックアップする完全忠実度のアーティファクト用です。

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Tool`内  
**目的**: 結果にアタッチされるがモデルからは隠される構造化データを定義します。

### 例

```go
Tool("get_time_series", "時系列データを取得", func() {
    Args(func() {
        Attribute("device_id", String, "デバイス識別子")
        Required("device_id")
    })
    Return(func() {
        Attribute("summary", String, "モデル用サマリー")
        Attribute("count", Int, "データポイント数")
    })
    Sidecar(func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "完全なデータ")
        Attribute("metadata", MapOf(String, String), "追加メタデータ")
    })
})
```

## ToolTitle

`ToolTitle(title)`はツールの人間フレンドリーな表示タイトルを設定します。指定されない場合、生成されたコードはsnake_caseやkebab-caseをTitle Caseに変換してツール名からタイトルを導出します。

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Tool`内  
**目的**: UI表示用の表示タイトルを設定します。

### 例

```go
Tool("web_search", "ウェブを検索", func() {
    ToolTitle("ウェブ検索")
    Args(func() { /* ... */ })
})
```

## CallHintTemplate と ResultHintTemplate

`CallHintTemplate(template)`と`ResultHintTemplate(template)`はツール呼び出しと結果の表示テンプレートを設定します。テンプレートはツールのペイロードまたは結果でレンダリングされるGoテンプレートで、実行中および実行後に表示される簡潔なヒントを生成します。

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Tool`内  
**目的**: ツール実行中にUI用の表示ヒントを提供します。

テンプレートは`missingkey=error`でコンパイルされます。`CallHintTemplate`は簡潔に保つことを推奨します（140文字以下推奨）。

### 例

```go
Tool("search", "ドキュメントを検索", func() {
    Args(func() {
        Attribute("query", String)
        Attribute("limit", Int)
    })
    Return(func() {
        Attribute("count", Int)
        Attribute("results", ArrayOf(String))
    })
    CallHintTemplate("検索中: {{ .Query }} (制限: {{ .Limit }})")
    ResultHintTemplate("{{ .Count }}件の結果が見つかりました")
})
```

## Tags

`Tags(values...)`はツールまたはツールセットにメタデータラベルでアノテートします。タグはポリシーエンジンとテレメトリに公開され、ツールのフィルタリングや分類が可能になります。

一般的なタグパターン：

- ドメインカテゴリ: `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- 機能タイプ: `"read"`, `"write"`, `"search"`, `"transform"`
- リスクレベル: `"safe"`, `"destructive"`, `"external"`
- パフォーマンスヒント: `"slow"`, `"fast"`, `"cached"`

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Tool`または`Toolset`内  
**目的**: ツール/ツールセットにメタデータタグでアノテートします。

### 例

```go
Tool("delete_file", "ファイルを削除", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})

Toolset("admin-tools", func() {
    Tags("admin", "privileged")
    Tool("reset_system", "システム状態をリセット", func() {
        // ツールセットタグを継承
    })
})
```

## BindTo

`BindTo("Method")`または`BindTo("Service", "Method")`はツールをGoaサービスメソッドに関連付けます。評価中、DSLは参照されたメソッドを解決します。コード生成は型付きスペック/コーデックと変換ヘルパーを出力します。

ツールがメソッドにバインドされている場合：

- ツールの`Args`スキーマはメソッドの`Payload`と異なることができます
- ツールの`Return`スキーマはメソッドの`Result`と異なることができます
- 生成されたアダプターがツールとメソッドタイプ間を変換します
- メソッドのペイロード/結果検証は引き続き適用されます

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Tool`内  
**目的**: ツールをサービスメソッド実装に関連付けます。

### 例

```go
var _ = Service("orchestrator", func() {
    Method("Search", func() {
        Payload(SearchPayload)
        Result(SearchResult)
    })
    
    Agent("chat", func() {
        Use("docs", func() {
            Tool("search", "ドキュメントを検索", func() {
                Args(SearchPayload)
                Return(SearchResult)
                BindTo("Search") // 同じサービスのメソッドにバインド
            })
        })
    })
})
```

### 例（クロスサービスバインディング）

```go
Tool("notify", "通知を送信", func() {
    Args(func() {
        Attribute("message", String)
    })
    BindTo("notifications", "send")  // notifications.sendメソッド
})
```

## Inject

`Inject(fields...)`は特定のペイロードフィールドを「インジェクト」（サーバーサイドインフラストラクチャ）としてマークします。インジェクトされたフィールドは：

1. LLMから隠される（モデルに送信されるJSONスキーマから除外）
2. 生成された構造体でSetterメソッドと共に公開される
3. ランタイムフック（`ToolInterceptor`）によって入力されることを意図

**場所**: `dsl/toolset.go`  
**コンテキスト**: `Tool`内  
**目的**: フィールドをインフラストラクチャ専用、LLMから隠すとしてマークします。

### 例

```go
Tool("get_data", "現在のセッションのデータを取得", func() {
    Args(func() {
        Attribute("session_id", String, "現在のセッションID")
        Attribute("query", String, "データクエリ")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String))
    })
    BindTo("data_service", "get")
    // session_idはサービスで必要だがLLMからは隠される
    Inject("session_id")
})
```

ランタイムでは、`ToolInterceptor`を使用してインジェクトされたフィールドを入力します：

```go
func (h *Handler) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    if call.Name == "data.get_data" {
        call.Payload.SetSessionID(ctx.Value(sessionKey).(string))
    }
    return nil
}
```

## 次のステップ

- ランタイム動作を設定するための[ポリシー関数](./4-policy-functions.md)を学ぶ
- ツールセットの実行方法を理解するための[ランタイムコンセプト](../2-runtime/)を読む
