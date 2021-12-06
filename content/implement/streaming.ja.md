+++
title = "ストリーミング"
weight = 3

[menu.main]
name = "ストリーミング"
parent = "implement"
+++

# ストリーミングの結果

Goa を使用すると、エンドポイントがペイロードを受信して一連の結果をストリーミングできる単一方向のサーバー側ストリーミングを定義できます。
ストリーミングされた結果は、同じタイプのインスタンスです。
このドキュメントでは、結果のシーケンスをストリーミングする方法と、トランスポート非依存およびトランスポート依存のコードに対してジェネレーターが生成するものについて説明します。

## デザイン

[StreamingResult DSL](https://godoc.org/goa.design/goa/dsl#StreamingResult) は、結果のシーケンスをストリーミングするエンドポイントを設定するメソッドで定義できます。
`StreamingResult` DSL は `Result` DSL と似た構文を持ちます。
`StreamingResult` と `Result` は相互に排他的です：指定された `Method` 式で使えるのはそのうちの1つだけです。



```go
var _ = Service("cellar", func() {
    Method("list", func() {
        // StoredBottleは、ストリームを介してクライアントに送信されます。
        StreamingResult(StoredBottle)
    })
})
```

コードジェネレーターは、サービスパッケージの `list` エンドポイント用に次のストリームインターフェースを生成します。

```go
// Interface that the server must satisfy.
type ListServerStream interface {
    // `StoredBottle` のストリームインスタンスを送信します。
    Send(*StoredBottle) error
    // ストリームをクローズします。
    Close() error
}

// クライアントが満たす必要があるインターフェース。
type ListClientStream interface {
    // Recv は、ストリームから `StoredBottle` のインスタンスを読み取ります。
    Recv() (*StoredBottle, error)
}
```

* `Send` は0回以上呼び出されることが可能で、結果のインスタンスをクライアントにストリーミングできます。
   `Send` がエラーを返した場合、その後の `Send` への呼び出しも失敗し、`Close` を呼び出す必要はありません。
* `Close` ははストリームを閉じます。 その後のいかなる `Send` への呼び出しもエラーを返します。
* `Recv` は、ストリームから次の結果インスタンスを読み取ります。
  サーバーがストリームを閉じた場合、`io.EOF` を返します。

`Service` インターフェイスの `List` メソッドシグネチャは、サーバーストリームインターフェイスを引数の1つとして受け付けます。
生成された Goa クライアントは、クライアントストリームインターフェイスを返します。

トランスポート依存コードは、トランスポート固有のストリーミングロジックを使用して、上記のサーバーおよびクライアントのストリームインターフェイスを実装します。

ここで `StoredBottle` のストリームを送信し、送信後にストリームを閉じるサービスエンドポイント実装の例を次に示します

```go
// Lists は保存しているボトルを列挙します。
func (s *cellarSvc) List(ctx context.Context, stream cellarsvc.ListServerStream) (err error) {
    bottles := loadStoredBottles()
    for _, c := range bottles {
        if err := stream.Send(c); err != nil {
            return err
        }
    }
    return stream.Close()
}
```

### HTTP 経由のストリーミング

HTTP でのストリーミングは Web ソケットを利用します。
Goa は [gorilla websocket](https://godoc.org/github.com/gorilla/websocket)
を使用して、サーバーとクライアントのストリーミングインターフェイスを実装します。

`Goa http` パッケージは、Web ソケットの Upgrader および Dialer インターフェースと、
Upgrader、Dialer から取得した Web ソケット接続のカスタマイズに使用できる Web ソケット接続設定機能型を提供します。

サーバーおよびクライアントストリームにカスタム Web ソケット接続構成を提供する例を次に示します。

```go
/* service main.go */

// Goa によって生成されたデフォルトの upgrader
//upgrader := &websocket.Upgrader{}
// カスタム Web ソケット upgrader
upgrader := &websocket.Upgrader {
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}

// Webソケット 接続構成
connConfigurer := func(conn *websocket.Conn) *websocket.Conn {
    conn.SetPingHandler(...)
    conn.SetPongHandler(...)
    conn.SetCloseHandler(...)
    return conn
}

cellarServer = cellarsvcsvr.New(cellarEndpoints, mux, dec, enc, eh, upgrader, connConfigurer)

/* client main.go */

// Goa によって生成されるデフォルトの dialer
//dialer = websocket.DefaultDialer
// カスタム dialer
dialer = &websocket.Dialer {
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}

endpoint, payload, err := cli.ParseEndpoint(
    scheme,
    host,
    doer,
    goahttp.RequestEncoder,
    goahttp.ResponseDecoder,
    debug,
    dialer,
    connConfigurer,
)
```

### 複数のビューを持つ結果型

メソッドが複数のビューを持つ結果型を返す場合、`SetView` メソッドは両方のインターフェイスで次のシグネチャで生成されます：

```go
SetView(view string)
```

アプリケーション開発者は、データをストリームに送信する前に、サービスエンドポイント実装でこのメソッドを呼び出して、結果型が適切なビューでレンダリングされるようにする必要があります。
このメソッドが呼び出されない場合、`default` ビューを使用して結果タイプがレンダリングされます。

リクエストされたビューを使用して、保存されたボトルがストリームに送信される前にレンダリングされる例を次に示します。

```go
// Lists は保存しているボトルを列挙します。
func (s *cellarSvc) List(ctx context.Context, p *cellarsvc.ListPayload, stream cellarsvc.ListServerStream) (err error) {
    stream.SetView(p.View)
    bottles := loadStoredBottles()
    for _, c := range bottles {
        if err := stream.Send(c); err != nil {
            return err
        }
    }
    return stream.Close()
}
```
