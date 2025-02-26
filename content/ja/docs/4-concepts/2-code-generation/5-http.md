---
title: "生成されるHTTPサーバーとクライアントのコード"
linkTitle: "HTTPコード"
weight: 5
description: "サーバーとクライアントの実装、ルーティング、エラー処理を含め、Goaによって生成されるHTTPコードについて学びます。"
---

HTTPコード生成は、リクエストのルーティング、データのシリアライズ、エラー処理
などのトランスポートレベルの懸念事項をすべて処理する、完全なクライアントと
サーバーの実装を作成します。このセクションでは、生成されるHTTPコードの主要な
コンポーネントについて説明します。

## HTTPサーバーの実装

Goaは`gen/http/<サービス名>/server/server.go`に完全なHTTPサーバーの実装を
生成し、デザインで記述されたHTTPパスとメソッドを使用してサービスメソッドを
公開します。サーバーの実装は、リクエストのルーティング、レスポンスの
エンコード、エラー処理など、すべてのネットワーク詳細を処理します：

```go
// Newは、提供されたエンコーダーとデコーダーを使用して、calcサービスの
// すべてのエンドポイントのHTTPハンドラーをインスタンス化します。ハンドラー
// は、デザインで定義されたHTTPメソッドとパスを使用して、指定されたmuxに
// マウントされます。errhandlerは、レスポンスのエンコードに失敗した
// ときに呼び出されます。formatterは、サービスメソッドから返された
// エラーをエンコードする前にフォーマットするために使用されます。
// errhandlerとformatterはどちらもオプションで、nilにすることができます。
func New(
    e *calc.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(ctx context.Context, err error) goahttp.Statuser,
) *Server
```

HTTPサーバーをインスタンス化するには、サービスエンドポイント、リクエストを
正しいハンドラーにルーティングするためのマルチプレクサー、データをマーシャル
およびアンマーシャルするためのエンコーダーとデコーダー関数を提供する必要が
あります。サーバーはまた、カスタムエラー処理とフォーマット（どちらもオプション）
をサポートしています。HTTPエンコーディング、エラー処理、フォーマットの詳細に
ついては、[HTTPサービス](../3-http-services)を参照してください。

Goaはまた、HTTPサーバーをマルチプレクサーにマウントするために使用できる
ヘルパー関数も生成します：

```go
// Mountは、calcエンドポイントを提供するようにmuxを設定します。
func Mount(mux goahttp.Muxer, h *Server) {
    MountAddHandler(mux, h.Add)
    MountMultiplyHandler(mux, h.Multiply)
}
```

これにより、デザインで定義されたHTTPメソッドとパスに基づいて、リクエストを
正しいハンドラーにルーティングするようにマルチプレクサーが自動的に設定
されます。

`Server`構造体はまた、個々のハンドラーを変更したり、特定のエンドポイントに
ミドルウェアを適用したりするために使用できるフィールドを公開しています：

```go
// ServerはcalcサービスエンドポイントのHTTPハンドラーをリストします。
type Server struct {
    Mounts   []*MountPoint // メソッド名と関連するHTTPメソッドとパス
    Add      http.Handler  // "add"サービスメソッドのHTTPハンドラー
    Multiply http.Handler  // "multiply"サービスメソッドのHTTPハンドラー
}
```

`Mounts`フィールドには、イントロスペクションに有用なマウントされたすべての
ハンドラーのメタデータが含まれており、`Add`フィールドと`Multiply`フィールド
は各サービスメソッドの個々のハンドラーを公開します。

`MountPoint`構造体には、各ハンドラーのメソッド名、HTTPメソッド、パスが含まれて
います。このメタデータはイントロスペクションとデバッグに有用です。

最後に、`Server`構造体は、すべてのサービスメソッドにHTTPミドルウェアを適用
するために使用できる`Use`メソッドも公開しています：

```go
// Useは、指定されたミドルウェアを"calc"サービスのすべてのHTTPハンドラーに
// 適用します。
func (s *Server) Use(m func(http.Handler) http.Handler) {
    s.Add = m(s.Add)
    s.Multiply = m(s.Multiply)
}
```

例えば、すべてのハンドラーにロギングミドルウェアを適用できます：

```go
// LoggingMiddlewareは各リクエストをログに記録する例のミドルウェアです。
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        log.Printf("リクエストを受信: %s %s", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}

// ミドルウェアをサーバーに適用
server.Use(LoggingMiddleware)
```

#### HTTPパス

Goaは、必要なパラメータが与えられた場合に各サービスメソッドのHTTPパスを返す
関数を生成します。例えば、`Add`メソッドには以下の関数が生成されます：

```go
// AddCalcPathは、calcサービスのaddエンドポイントへのURLパスを返します。
func AddCalcPath(a int, b int) string {
    return fmt.Sprintf("/add/%v/%v", a, b)
}
```

このような関数は、サービスメソッドのURLを生成するために使用できます。

### すべてを組み合わせる

サービスインターフェースとエンドポイント層は、Goaで生成されるサービスの
基本的な構成要素です。メインパッケージはこれらの層を使用してトランスポート
固有のサーバーとクライアントの実装を作成し、HTTPを使用してサービスを実行し、
対話することができます：

```go
package main

import (
    "net/http"

    goahttp "goa.design/goa/v3/http"

    "github.com/<ユーザー名>/calc"
    gencalc "github.com/<ユーザー名>/calc/gen/calc"
    genhttp "github.com/<ユーザー名>/calc/gen/http/calc/server"
)

func main() {
    svc := calc.New()                      // サービスの実装
    endpoints := gencalc.NewEndpoints(svc) // サービスエンドポイントの作成
    mux := goahttp.NewMuxer()             // HTTPリクエストマルチプレクサーの作成
    server := genhttp.New(                 // HTTPサーバーの作成
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil, nil)              
    genhttp.Mount(mux, server)             // サーバーのマウント
    http.ListenAndServe(":8080", mux)      // HTTPサーバーの起動
}
```

## HTTPクライアントの実装

Goaはまた、サービスと対話するために使用できる完全なHTTPクライアントの実装も
生成します。クライアントコードは`client`パッケージ`gen/http/<サービス名>/client/client.go`
に生成され、サービスメソッドごとにGoaエンドポイントを作成するメソッドを提供
します。これらのエンドポイントは、`gen/<サービス名>/client.go`で生成された
エンドポイントクライアントコードを使用して、トランスポートに依存しないクライアント
実装にラップできます：

HTTP `client`パッケージで生成された`NewClient`関数は、トランスポートに依存しない
クライアントエンドポイントを作成するために使用できるオブジェクトを作成します：

```go  
// NewClientは、calcサービスのすべてのサーバーのHTTPクライアントを
// インスタンス化します。
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client
```

この関数は、サービススキーム（`http`または`https`）、ホスト（例：`example.com`）、
リクエストを行うためのHTTPクライアントを必要とします。標準のGoのHTTPクライアント
は`goahttp.Doer`インターフェースを満たしています。`NewClient`はまた、データを
マーシャルおよびアンマーシャルするためのエンコーダーとデコーダー関数も必要と
します。`restoreBody`フラグは、デコード後にレスポンスボディを基礎となるGo
の`io.Reader`オブジェクトに復元するかどうかを示します。

### HTTPクライアント

インスタンス化された`Client`構造体は、サービスエンドポイントごとのフィールドを
公開し、特定のエンドポイントのHTTPクライアントをオーバーライドすることが
できます：

```go
// ClientはcalcサービスエンドポイントのHTTPクライアントをリストします。
type Client struct {
    // AddDoerはaddエンドポイントへのリクエストを行うために使用される
    // HTTPクライアントです。
    AddDoer goahttp.Doer

    // MultiplyDoerはmultiplyエンドポイントへのリクエストを行うために
    // 使用されるHTTPクライアントです。
    MultiplyDoer goahttp.Doer

    // RestoreResponseBodyは、デコード後にレスポンスボディをリセットして
    // 再度読み取れるようにするかどうかを制御します。
    RestoreResponseBody bool

    // プライベートフィールド...
}
```

この構造体はまた、トランスポートに依存しないエンドポイントを構築するメソッドも
公開しています：

```go
// Multiplyは、calcサービスのmultiplyサーバーにHTTPリクエストを行う
// エンドポイントを返します。
func (c *Client) Multiply() goa.Endpoint
```

### すべてを組み合わせる

[./4-client.md](クライアント)セクションで説明したように、Goaは各サービスの
トランスポートに依存しないクライアントを生成します。これらのクライアントは
適切なエンドポイントで初期化され、サービスへのリクエストを行うために使用
できます。

以下は、`calc`サービスのHTTPクライアントを作成して使用する例です：

```go
package main

import (
    "context"
    "log"
    "net/http"

    goahttp "goa.design/goa/v3/http"
    
    gencalc "github.com/<ユーザー名>/calc/gen/calc"
    genclient "github.com/<ユーザー名>/calc/gen/http/calc/client"
)

func main() {
    // HTTPクライアントの作成
    httpClient := genclient.NewClient(
        "http",                    // スキーム
        "localhost:8080",          // ホスト
        http.DefaultClient,        // HTTPクライアント
        goahttp.RequestEncoder,    // リクエストエンコーダー
        goahttp.ResponseDecoder,   // レスポンスデコーダー
        false,                     // レスポンスボディを復元しない
    )

    // エンドポイントクライアントの作成
    client := gencalc.NewClient(
        httpClient.Add(),
        httpClient.Multiply(),
    )

    // サービスメソッドの呼び出し
    payload := &gencalc.AddPayload{A: 1, B: 2}
    sum, err := client.Add(context.Background(), payload)
    if err != nil {
        log.Fatalf("エラー: %v", err)
    }
    log.Printf("1 + 2 = %d", sum)
}
```

このコードは、HTTPクライアントを作成し、それを使用してトランスポートに依存しない
クライアントを初期化し、最後にサービスメソッドを呼び出す方法を示しています。
クライアントコードは、トランスポートの詳細を抽象化し、型安全な方法でサービス
メソッドを呼び出すためのクリーンなAPIを提供します。