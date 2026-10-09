---
nav_group: guides
title: MCP 統合
weight: 50
description: "Goa の設計から型付き MCP サーバーとクライアントを生成し、認可、ユーザー入力、永続ジョブ、Apps、Skills を組み合わせます。"
llm_optimized: true
aliases:
---

Goa-AIは、**MCPサーバーの構築**と**外部MCPツールの利用**の両方に対応します。GoaサービスにMCP宣言を追加して、メソッドをツールとして公開し、リソースやプロンプトテンプレートを提供できます。JSON-RPCのプロトコル処理とサービスアダプターは生成されます。MCPサーバーの提供にGoa-AIエージェントの実行は不要です。

HTTP・stdio caller はプロトコルのメタデータを含む独立したリクエストを送ります。初期化ハンドシェイクやプロトコルセッションはありません。`Caller` はツールを呼び出し、`Listen` は変更通知を受け取ります。Goa が生成する JSON-RPC クライアントは、サービス設計に宣言されたリソース、プロンプト、検出、補完の操作も公開します。

一つの設計がツールのスキーマ、型付きデコード、検証、サーバーのアダプター、クライアントを定義します。設定済み Goa エンドポイントは認証、認可、ミドルウェア、アプリケーションの処理を担当します。開発者とコーディングエージェントは契約とアプリケーションコードを編集し、`goa gen` が生成インターフェースを整合させます。生成 MCP サーバーは HTTP を使います。サブプロセス用クライアントは利用できますが、stdio サーバーの生成は延期しています。

このサーバーを生成する前に、[クイックスタートのモジュール設定](../quickstart/)に従い、検証済みの開発版と対応する Goa の依存関係をインストールしてください。

| 必要な機能 | 宣言または組み合わせ |
|---|---|
| ツール、リソース、プロンプト、候補 | `Tool`、`Resource`、`ResourceReader`、`Prompt`、`PromptCompletion`、`ResourceCompletion` |
| 認可されたカタログと変更通知 | `ToolCatalog`、`PromptCatalog`、`ResourceCatalog`、`ResourceTemplateCatalog`、`SubscriptionSource` |
| フォーム入力、URL を開く同意 | 既存の Goa メソッドの `InputExchange` |
| 非同期ジョブと後続のホスト回答 | 作成、取得、回答、キャンセルのメソッドを結ぶ `TaskExchange` |
| MCP ホスト内のブラウザー UI | `ToolUI`、`ToolVisibility`、`ToolMetadata` と通常のリソース |
| 指示と補助ファイル | `SkillCatalog`、`SkillLookup`、任意の `ResourceDirectory`、ホストによる読み込み |

以下のサーバーから始め、アプリケーションに必要な機能を加えてください。

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

## 生成されたサーバーのホスト

設定済みの元の Goa endpoint を `NewMCPAdapter` に渡し、生成された HTTP サーバーを構築します。許可するブラウザーのオリジンを、`New` コンストラクターの最後の文字列引数として渡します。例は `"https://app.example.com"` です。オリジンを指定しない場合、`Origin` ヘッダーのないリクエストは受け入れ、そのヘッダーを含むリクエストは拒否します。

リクエストの処理を始める前に `Server.Use` で HTTP middleware を設定します。`Mount(mux)` と直接の `ServeHTTP` 呼び出しは、middleware やサービスの実行前に、オリジン、HTTP メソッド、MCP ヘッダー、リクエストのメタデータを同じ処理で検証します。オリジンのリストは構築時にコピーされます。`MountWithOrigins` をコンストラクターの引数に置き換え、削除された内部 `Handler` フィールドの代わりに `ServeHTTP` を使ってください。サーバーの再生成と呼び出し側の更新をまとめて行ってください。

生成プラグインが Goa の構築プランで必須のサーバー依存関係を宣言した場合、その型付きの値を最後のオリジン引数より前に渡してください。標準の生成例の起動処理は、対応するアプリケーションの構築関数を呼び出します。サーバーの生成例を起動する前に、これらの関数を設定してください。

URL パラメーターを含むルートでは、`New` に渡したものと同じ mux に `ServeHTTP` を登録するか、`Mount(mux)` を使ってください。mux が生成されたデコーダーにパスの値を渡します。

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
    GetTask(ctx context.Context, taskID string) (Task, error)
    UpdateTask(ctx context.Context, taskID string, responses map[string]json.RawMessage) error
    CancelTask(ctx context.Context, taskID string) error
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

### 独自の Caller {#callerfunc-アダプター}

独自の caller はインターフェースの四つのメソッドをすべて実装します。`CallerFunc` は削除されました。一つの呼び出し関数では Task の取得、回答、キャンセルを表せないためです。未完了の状態はモデルの結果履歴に追加しません。

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

### 変更通知元の宣言

`SubscriptionSource()` は、認可されたリソース、Task、カタログの変更を配信するサーバーストリーミングメソッドを選びます。`resources` 入力は URI を、任意の `tasks` フィールドは作成メソッド名ごとにジョブ ID を指定します。必須の `change` ユニオンは `acknowledged` で受け付けた選択を返し、その後に変更を通知します。URI には `Format(FormatURI)` を宣言します。

元のメソッドが認可と変更検出を担当します。生成コードは設定された監視エンドポイントから変更したジョブを取得し、完全な状態を送ります。共有トランスポートがイベントの順序とリクエストの対応を管理します。`ToolCatalog`、`PromptCatalog`、`ResourceCatalog`、`ResourceTemplateCatalog` は認可されたページを通常のメソッドに結びます。同じ通知元から一覧変更を配信できますが、固定カタログには変更通知を追加しません。`ResourceSubscription()` を `SubscriptionSource()` に置き換えて再生成してください。互換エイリアスはありません。

### リソース、プロンプト、リッチコンテンツ

`ResourceTemplate` は URI テンプレートを型付き読み取りメソッドに対応付けます。`Prompt` はメッセージを返すメソッドに対応付けます。`ResourceCompletion` と `PromptCompletion` は型付き引数候補を提供します。`ToolContent` は構造化結果と別に返すリッチコンテンツのフィールドを指定します。いずれも通常のサービスメソッドと同じ Goa 設計・生成の手順を使います。

### 中断されたツール応答の再試行

HTTP の既定は一回の試行です。信頼するエンドポイントにはホストが `HTTPRetryPolicy` を設定できます。ツールが読み取り専用または冪等であると宣言し、その宣言をポリシーが信頼するときだけ、中断された応答を再試行します。新しいリクエスト ID が使われ、ツールが再実行される可能性があります。エラー、不正な応答、コールバックの失敗、購読の切断は再試行の根拠になりません。

ローカルでのリクエスト準備の失敗は、ツールが実行されたことを意味しません。送信前にキャンセルが確認された場合、リクエストは送信されません。試行が HTTP クライアントに渡された後で応答が失われると、ツールの実行結果は不明になります。ローカルのクライアントエラーと実行結果が不明な呼び出しは、どちらもエージェントの回復処理を終了します。

## OAuth 認可 {#クライアントシークレットによる認可}

MCP メソッドは Goa の通常のセキュリティで保護します。署名付きアクセストークンには `NewJWTResourceServer`、不透明なトークンには `NewIntrospectionResourceServer` で必須の検証器を構築し、生成サーバーのコンストラクターに渡します。信頼する発行者、対象リソース、鍵、認証情報はアプリケーション設定が提供します。認証情報の欠落や不正は 401、scope 不足は 403、検証器の停止は 503 です。呼び出し後のアプリケーションエラーを認可 challenge に変換しません。

クライアントは通常の HTTP トランスポートを共有します。`NewAuthorizationCodeHTTPTransport` はブラウザーの同意、state、発行者検証、S256 PKCE を処理します。`NewClientCredentialsHTTPTransport` は機密クライアントの権限を取得し、`NewEnterpriseHTTPTransport` はホストが検証したシングルサインオン認証情報を交換します。登録では公開クライアント、HTTP Basic、POST の secret、署名付き assertion のいずれかを明示します。事前登録と HTTPS メタデータ文書には明示的なコンストラクターがあり、廃止された動的登録は削除されています。

ホストがサインイン、信頼する発行者、ユーザーまたはアプリケーションごとの `AuthorizationStore` を管理します。永続化には暗号化ストレージとインスタンス間の直列化が必要です。メモリストアは一つのプロセス内のみ有効です。検出と challenge は認証情報を正確な発行者と対象に結びます。内部の送信 URL は対象と異なる場合があります。最初の認証情報なしのリクエストで同意前に scope を取得します。新しく広告された scope だけで同意を再要求しません。ブラウザーと enterprise クライアントは実行前の明示的な認可拒否から一度回復できます。機械用権限の拒否は終了扱いです。結果が不明なツールの再実行は認めません。[認可ガイド](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-resource-servers)を参照してください。

## 追加入力と非同期 Task {#additional-input-and-asynchronous-tasks}

`InputExchange(continuationField, outcomeField)` は既存メソッドの任意の continuation と、完了または入力要求を表す必須ユニオンを結びます。型付き要求はフォームまたは URL を開く同意を記述し、Goa の式からスキーマと回答デコーダーを生成します。広告するツール結果になるのは完了分岐のみです。各ラウンドで通常の認証と検証を適用し、状態とホストの回答はモデル引数に含めません。URL への同意だけでは外部処理の完了を証明しません。アプリケーションが確認します。

同じ宣言を MCP、ローカル `BindTo`、レジストリプロバイダーで利用できます。エージェントは待機中に停止し、型付き回答を受け取ると同じ未完了呼び出しを再開します。機密データはモデルに見えるフォームではなく外部 URL の処理に置きます。

`TaskExchange(read, answer, cancel)` は既存の永続ジョブメソッドを結びます。作成側は ID を返す前に受け付けた処理を永続的に引き受けます。取得結果は実行中、入力要求、完了、失敗、キャンセルです。回答とキャンセルは意図の受理を示し、その効果は後続の取得で確認します。サービスが保存と完了を担当し、アダプターはプロトコルメタデータと型変換を提供します。別のジョブストアは追加しません。

直接利用するクライアントは `CallResponse.Task` を保存して監視できる場合のみ `WithTaskSupport(ctx)` を使います。同じ caller で `GetTask`、`UpdateTask`、`CancelTask` を呼びます。生成されたエージェント処理は ID を保持し、取得や通知を通じて監視し、設定済みエンジンで入力待ちとキャンセルを処理します。本番の永続性には Temporal とアプリケーションストレージが必要です。メモリエンジンはプロセス内のみ有効です。[ネイティブ入力とジョブ](https://github.com/goadesign/goa-ai/blob/main/docs/dsl.md#native-job-tools)、[Task クライアント](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-task-clients)を参照してください。

## MCP Apps {#mcp-apps}

通常のリソースメソッドで `text/html;profile=mcp-app` の HTML を配信します。ツール内の `ToolUI("ui://...")` は同じサーバーのリソースを結果に結びます。`ToolVisibility("model")`、`ToolVisibility("app")`、または両方で呼び出し側を選び、省略時は両方を許可します。app 専用ツールはモデルのカタログに含めません。`ToolMetadata` はモデル向けコンテンツや構造化結果とは別に型付きホストデータを選びます。ブラウザーのないホストにも意味のある通常の結果を返します。

ホストがブラウザーの隔離と権限を管理します。[維持されている例](https://github.com/goadesign/goa-ai/tree/main/integration_tests/apps)は生成 Goa エンドポイント、公式ブラウザー SDK、別オリジンのフレーム、明示的な権限を組み合わせます。現在のツール公開範囲を確認し、非公開のホスト結果をモデルメッセージに含めません。

## MCP Skills {#mcp-skills}

`SkillCatalog()` と `SkillLookup()` を通常のメソッドに宣言し、`ResourceReader()` を併用します。一覧と正確な URI 検索は URI、全 frontmatter フィールド、安定ファイルのマニフェストまたは `dynamic` 宣言を返します。安定ファイルには正確な URI、生バイト数、SHA-256 が必要です。任意の `ResourceDirectory()` は直下の子を一覧表示しますが、指示を有効化したり保存済みマニフェストを拡張したりしません。

ホストはサーバーの識別情報を付け、完全なエントリーをモデルのコンテキストとともに保持します。利用前に `mcp.VerifySkillFile(ctx, retainedEntryJSON, uri, bytes)` で所属、サイズ、digest を検証します。キャッシュにも同じ検証が必要です。エントリー自身の `SKILL.md` は将来のフィールドや正確な数値を含む全 YAML フィールドを検出結果と比較します。動的エントリーはこの安定マニフェスト検証を通りません。

Skills は信頼できない指示であり、システムメッセージやツール権限ではありません。入れ子の `SKILL.md` を補助資料として読むだけでは有効化しません。有効化には独立した検出と同意が必要です。ローカル実行には発信サーバー、正確な Skill、完全なマニフェストに対する明示的な同意が必要で、マニフェスト変更は同意を失効させます。[参照ホスト](https://github.com/goadesign/goa-ai/tree/main/codegen/mcp/testdata/skills_host)は遅延読み込みとネイティブのツール確認を組み合わせます。コンテキストと承認は一つのプロセス内のみ有効です。保存するアプリケーションはエントリーと承認の寿命を管理します。[完全な契約](https://github.com/goadesign/goa-ai/blob/main/docs/mcp_skills.md)を参照してください。

## 互換性のない更新 {#breaking-upgrade}

サーバー、クライアント、executor、レジストリプロバイダーを同時に再生成します。初期化、セッション、プロトコル選択、JSON テキスト結果のデコーダーを削除します。独自 caller は四つのメソッドを実装します。設定済み Goa エンドポイントからアダプターを、検証器から保護サーバーを構築します。`ResourceSubscription` を `SubscriptionSource` に置き換え、生成ユニオンメソッドで分岐を選びます。

新旧の peer は同じエンドポイントを共有できません。互換性のない受理済み処理と保存済み run を完了または解決してから、worker、レジストリ、永続化を変更します。依存関係を戻すだけでは新しい保存データとの互換性は復元しません。[更新ガイド](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#preview-upgrade-guide)に従ってください。

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
