---
title: "生成されるサービスインターフェースとエンドポイント"
linkTitle: "サービスインターフェースとエンドポイント"
weight: 3
description: "サービスインターフェース、エンドポイント、トランスポート層を含め、Goaによって生成されるコードについて学びます。"
---

## サービスインターフェース

Goaが生成する最初のコンポーネントは、サービスインターフェース層です。この基礎と
なる層は、APIの契約とサービス実装インターフェースの両方を定義します。APIエンド
ポイントを実装するすべてのメソッドシグネチャを含み、サービス操作で使用される
データ構造を指定するペイロードと結果型の定義が完備されています。

例えば、以下のデザインを想定します：

```go
var _ = Service("calc", func() {
    Description("calcサービスは数値の加算と乗算の操作を提供します。")
    Method("add", func() {
        Description("addはaとbの和を返します")
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(Int)
    })
    Method("multiply", func() {
        Description("multiplyはaとbの積を返します")
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(Int)
    })
})
```

このデザインに基づいて、Goaは`gen/calc/service.go`に以下のようなサービス
インターフェースを生成します：

```go
// calcサービスは数値の加算と乗算の操作を提供します。
type Service interface {
    // addはaとbの和を返します
    Add(context.Context, *AddPayload) (res int, err error)
    // multiplyはaとbの積を返します
    Multiply(context.Context, *MultiplyPayload) (res int, err error)
}

// AddPayloadはcalcサービスのaddメソッドのペイロード型です。
type AddPayload struct {
    A int32
    B int32
}

// MultiplyPayloadはcalcサービスのmultiplyメソッドのペイロード型です。
type MultiplyPayload struct {
    A int32
    B int32
}
```

Goaはまた、サービス名やメソッド名など、サービスと可観測性スタックの設定時に
参照できる定数も生成します：

```go
// APINameはデザインで定義されたAPIの名前です。
const APIName = "calc"

// APIVersionはデザインで定義されたAPIのバージョンです。
const APIVersion = "0.0.1"

// ServiceNameはデザインで定義されたサービスの名前です。これは
// ServiceKeyキーの下のエンドポイントリクエストコンテキストに設定
// される値と同じです。
const ServiceName = "calc"

// MethodNamesはデザインで定義されたサービスメソッド名をリストします。
// これらはMethodKeyキーの下のエンドポイントリクエストコンテキストに
// 設定される値と同じです。
var MethodNames = [1]string{"multiply"}
```

## エンドポイント層

次に、Goaは`gen/calc/endpoints.go`にエンドポイント層を生成します。この層は
トランスポートに依存しない方法でサービスメソッドを公開します。これにより、
ミドルウェアやその他のクロスカッティングな関心事をサービスメソッドに適用
することが可能になります：

```go
// Endpointsは"calc"サービスのエンドポイントをラップします。
type Endpoints struct {
    Add      goa.Endpoint
    Multiply goa.Endpoint
}

// NewEndpointsは"calc"サービスのメソッドをエンドポイントでラップします。
func NewEndpoints(s Service) *Endpoints {
   return &Endpoints{
        Add:      NewAddEndpoint(s),
        Multiply: NewMultiplyEndpoint(s),
    }
}
```

`Endpoints`構造体はサービス実装で初期化でき、トランスポート固有のサーバーと
クライアントの実装を作成するために使用できます。

Goaはまた、サービスメソッドをラップする個々のエンドポイント実装も生成します：

```go
// NewAddEndpointは"calc"サービスの"add"メソッドを呼び出すエンドポイントを
// 返します。
func NewAddEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req any) (any, error) {
        p := req.(*AddPayload)
        return s.Add(ctx, p)
    }
}
```

このパターンにより、特定のエンドポイントにミドルウェアを適用したり、完全に
カスタム実装に置き換えたりすることができます。

## Goaエンドポイントミドルウェア

最後に、Goaはすべてのサービスメソッドにミドルウェアを適用するために使用できる
`Use`関数を生成します：

```go
// Useは指定されたミドルウェアを"calc"サービスのすべてのエンドポイントに
// 適用します。
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.Add = m(e.Add)
    e.Multiply = m(e.Multiply)
}
```

エンドポイントミドルウェアは、エンドポイントを受け取って新しいエンドポイントを
返す関数です。実装はリクエストペイロードと結果を変更し、コンテキストを変更し、
エラーをチェックし、エンドポイントが呼び出される前後に実行する必要のある任意の
操作を実行できます。Goaエンドポイントは`goa`パッケージで以下のように定義
されています：

```go
// Endpointは、基盤となるトランスポートに依存せずにサービスメソッドを
// リモートクライアントに公開します。
type Endpoint func(ctx context.Context, req any) (res any, err error)
```

例えば、以下のGoaエンドポイントミドルウェアはリクエストとレスポンスを
ログに記録します：

```go
func LoggingMiddleware(next goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req any) (res any, err error) {
        log.Printf("request: %v", req)
        res, err = next(ctx, req)
        log.Printf("response: %v", res)
        return
    }
}
```

このミドルウェアは以下のようにしてサービスエンドポイントに適用できます：

```go
endpoints.Use(LoggingMiddleware)
``` 