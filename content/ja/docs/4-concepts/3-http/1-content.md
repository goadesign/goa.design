---
title: "コンテントネゴシエーション"
linkTitle: "コンテントネゴシエーション"
weight: 1
description: "Goa HTTPサービスで複数のコンテントタイプを処理し、Acceptヘッダーを処理し、カスタムエンコーダー/デコーダーを実装する方法を学びます。"
menu:
  main:
    parent: "HTTP高度なトピック"
    weight: 1
---

コンテントネゴシエーションにより、HTTPサービスで複数のコンテントタイプとフォーマットをサポートすることができます。
Goaは、HTTPレスポンスとリクエストのコンテントタイプに任意のエンコーダーとデコーダーを関連付けることを可能にする、
柔軟なエンコーディングとデコーディングの戦略を提供します。

## サーバーの構築

生成されたHTTPサーバーのコンストラクタは、エンコーダーとデコーダーの関数を引数として受け取り、
カスタム実装を可能にします：

```go
// Newは、すべてのサービスエンドポイントに対するHTTPハンドラーをインスタンス化します
func New(
    e *divider.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(context.Context, err error) goahttp.Statuser,
) *Server
```

GoaのデフォルトエンコーダーとデコーダーはGoa `http`パッケージによって提供され、
以下のように使用できます：

```go
import (
    // ...
    "goa.design/goa/v3/http"
)

// ...

server := calcsvr.New(endpoints, mux, http.RequestDecoder, http.ResponseEncoder, nil, nil)
```

## コンテントタイプのサポート

Goaのコンテントタイプサポートは、ネットワーク境界を越えてデータがどのようにシリアライズおよびデシリアライズされるかを決定します。
エンコーディングとデコーディングの役割は、実行順序に従ってクライアントとサーバーの間で切り替わります：

- クライアント側のエンコーディングは、送信するリクエストボディを準備します
- サーバー側のデコーディングは、受信したリクエストボディを処理します
- サーバー側のエンコーディングは、クライアントに送信するレスポンスボディを処理します
- クライアント側のデコーディングは、受信したレスポンスボディを処理します

### 組み込みエンコーダー/デコーダー

Goaのデフォルトエンコーダーとデコーダーは、いくつかの一般的なコンテントタイプをサポートしています。
これらには以下が含まれます：
- JSONとJSONバリアント（`application/json`、`*+json`）
- XMLとXMLバリアント（`application/xml`、`*+xml`）
- GobとGobバリアント（`application/gob`、`*+gob`）
- HTML（`text/html`）
- プレーンテキスト（`text/plain`）

サフィックスマッチングパターンにより、`application/ld+json`、`application/hal+json`、
`application/vnd.api+json`などのコンテントタイプバリアントが可能になります。

### レスポンスのコンテントタイプ

デフォルトのレスポンスエンコーダーは、順序に従って複数の要因を考慮するコンテントネゴシエーション戦略を実装しています：

- まず、クライアントの優先コンテントタイプを決定するために、受信リクエストの`Accept`ヘッダーを調べます。
- 次に、Acceptヘッダーが存在しない場合、リクエストの`Content-Type`ヘッダーを確認します。
- 最後に、どちらのヘッダーも使用可能な情報を提供しない場合、レスポンスのデフォルトコンテントタイプにフォールバックします。

サーバー側では、エンコーダーはクライアントの`Accept`ヘッダーを処理してコンテントタイプの優先順位を決定します。
その後、利用可能なサポートされているタイプに基づいて最も適切なエンコーダーを選択します。
受け入れられるタイプの中に適切な一致が見つからない場合、エンコーダーはデフォルトでJSONを使用します。

クライアント側の操作では、デコーダーはレスポンスヘッダーで指定されたコンテントタイプに基づいて受信したレスポンスを処理します。
未知のコンテントタイプに遭遇した場合、互換性を維持するためにJSONデコーディングに安全にフォールバックします。

### リクエストのコンテントタイプ

リクエストのコンテントタイプ処理は、レスポンスよりも単純なネゴシエーションプロセスに従います。
このプロセスは主にリクエストの`Content-Type`ヘッダーに依存し、必要な場合はデフォルトのコンテントタイプにフォールバックします。

サーバー側では、デコーダーはまずリクエストの`Content-Type`ヘッダーを検査します。
この値に基づいて、JSON、XML、またはgobのいずれかの適切なデコーダー実装を選択します。
`Content-Type`ヘッダーが欠落しているか、サポートされていないフォーマットを指定している場合、
デコーダーはリクエスト処理を継続できるようにデフォルトでJSONを使用します。

クライアント側の操作では、エンコーダーはリクエスト設定に基づいてコンテントタイプを設定し、
それに応じてリクエストボディをエンコードします。特定のコンテントタイプが提供されていない場合、
一貫した動作を維持するためにデフォルトでJSONエンコーディングを使用します。

すべての場合において、エンコーディングまたはデコーディングが失敗した場合、GoaはHTTPサーバーの作成時に
登録されたエラーハンドラーを呼び出し、適切なエラー処理とクライアントへのフィードバックを可能にします。

### デフォルトコンテントタイプの設定

`ContentType` DSLを使用して、デフォルトのレスポンスコンテントタイプを指定します：

```go
var _ = Service("media", func() {
    Method("create", func() {
        HTTP(func() {
            POST("/media")
            Response(StatusCreated, func() {
                // レスポンスのコンテントタイプをオーバーライド
                ContentType("application/json")
            })
        })
    })
})
```

設定すると、これはリクエストヘッダーで指定されたコンテントタイプをオーバーライドしますが、
`Accept`ヘッダーの値はオーバーライドしません。

## カスタムエンコーダー/デコーダー

Goaの組み込みエンコーダーがニーズを満たさない場合、カスタムエンコーダーとデコーダーを実装できます。
MessagePackやBSONなど、Goaのデフォルトに含まれていない特殊なフォーマットをサポートするために
カスタムエンコーダーが必要になる場合があります。また、特定のユースケースに対してエンコーディング
パフォーマンスを最適化する場合や、レスポンスに圧縮または暗号化レイヤーを追加する場合、
既存システムで使用されているレガシーまたはプロプライエタリなフォーマットとの互換性を維持する場合にも
有用です。

### カスタムエンコーダーの作成

エンコーダーは、Goa `http`パッケージで定義された`Encoder`インターフェースを実装し、
コンストラクタ関数を提供する必要があります：

```go
// レスポンスエンコーディングのためのEncoderインターフェース
type Encoder interface {
    Encode(v any) error
}

// コンストラクタ関数
func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

コンストラクタ関数は`Encoder`とエラーを返す必要があります：

```go
// コンストラクタのシグネチャ
func(ctx context.Context, w http.ResponseWriter) (goahttp.Encoder, error)

// MessagePackエンコーダーの例
type MessagePackEncoder struct {
    w http.ResponseWriter
}

func (enc *MessagePackEncoder) Encode(v interface{}) error {
    // コンテントタイプヘッダーを設定
    enc.w.Header().Set("Content-Type", "application/msgpack")
    
    // MessagePackエンコーディングを使用
    return msgpack.NewEncoder(enc.w).Encode(v)
}

// コンストラクタ関数
func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

コンテキストには`ContentTypeKey`と`AcceptTypeKey`の値が含まれており、
コンテントタイプのネゴシエーションが可能です。

### カスタムデコーダーの作成

デコーダーは`goahttp.Decoder`インターフェースを実装し、コンストラクタ関数を提供する必要があります：

```go
// コンストラクタのシグネチャ
func(r *http.Request) (goahttp.Decoder, error)

// MessagePackデコーダーの例
type MessagePackDecoder struct {
    r *http.Request
}

func (dec *MessagePackDecoder) Decode(v interface{}) error {
    return msgpack.NewDecoder(dec.r.Body).Decode(v)
}

// コンストラクタ関数
func NewMessagePackDecoder(r *http.Request) goahttp.Decoder {
    return &MessagePackDecoder{r: r}
}
```

コンストラクタはリクエストオブジェクトにアクセスでき、その状態を検査して適切なデコーダーを決定できます。

### カスタムエンコーダー/デコーダーの登録

HTTPサーバーの作成時にカスタムエンコーダー/デコーダーを使用します：

```go
func main() {
    // エンドポイントを作成
    endpoints := myapi.NewEndpoints(svc)
    
    // デコーダーファクトリを作成
    decoder := func(r *http.Request) goahttp.Decoder {
        switch r.Header.Get("Content-Type") {
        case "application/msgpack":
            return NewMessagePackDecoder(r)
        default:
            return goahttp.RequestDecoder(r) // デフォルトのGoaデコーダー
        }
    }
    
    // エンコーダーファクトリを作成
    encoder := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        if accept := ctx.Value(goahttp.AcceptTypeKey).(string); accept == "application/msgpack" {
            return NewMessagePackEncoder(ctx, w)
        }
        return goahttp.ResponseEncoder(ctx, w) // デフォルトのGoaエンコーダー
    }
    
    // カスタムエンコーダー/デコーダーを使用してHTTPサーバーを作成
    server := myapi.NewServer(endpoints, mux, decoder, encoder, nil, nil)
}
```

### カスタムエンコーダーのベストプラクティス

1. **エラー処理**
   - エンコーディング/デコーディングが失敗した場合は意味のあるエラーを返す
   - 特定の失敗に対してカスタムエラータイプの実装を検討する
   - nilの値とエッジケースを適切に処理する 