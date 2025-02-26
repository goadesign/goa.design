---
title: "生成されるクライアント"
linkTitle: "クライアント"
weight: 4
description: "クライアントサイドのエンドポイントとクライアント構造体を含め、Goaによって生成されるクライアントコードについて学びます。"
---

## Goaエンドポイント

エンドポイントの抽象化は、サービス内の単一のRPCメソッドを表現します。エンドポイント
は、サービスが実装するメソッドを表現するためにサーバーサイドで作成されるか、
クライアントが呼び出すメソッドを表現するためにクライアントサイドで作成されます。
どちらの場合も、エンドポイントは`goa.Endpoint`関数で表現できます。

## エンドポイントクライアント

先ほどの`calc`の例を続けましょう：Goaは`gen/calc/client.go`にトランスポートに
依存しないクライアント構造体を生成します。この構造体はクライアントサイドの
エンドポイントを含み、サービスリクエストを行うための型付きメソッドを提供します。
生成されるクライアントコードは以下のようになります：

```go
// Clientは"calc"サービスのクライアントです。
type Client struct {
        MultiplyEndpoint goa.Endpoint
        AddEndpoint      goa.Endpoint
}

// NewClientは、指定されたエンドポイントを使用して"calc"サービスの
// クライアントを初期化します。
func NewClient(multiply, add goa.Endpoint) *Client {
        return &Client{
                AddEndpoint:      add,
                MultiplyEndpoint: multiply,
        }
}

// Addは"calc"サービスの"add"エンドポイントを呼び出します。
func (c *Client) Add(ctx context.Context, p *AddPayload) (res int, err error) {
        var ires any
        ires, err = c.AddEndpoint(ctx, p)
        if err != nil {
                return
        }
        return ires.(int), nil
}

// Multiplyは"calc"サービスの"multiply"エンドポイントを呼び出します。
func (c *Client) Multiply(ctx context.Context, p *MultiplyPayload) (res int, err error) {
        var ires any
        ires, err = c.MultiplyEndpoint(ctx, p)
        if err != nil {
                return
        }
        return ires.(int), nil
}
```

クライアント構造体には`AddEndpoint`と`MultiplyEndpoint`の2つのフィールドが
あり、これらは`add`メソッドと`multiply`メソッドのクライアントサイドエンド
ポイントを表現します。`NewClient`関数は、提供されたエンドポイントを使用して
クライアント構造体を初期化します。

Goaによって生成されるトランスポート固有のコードには、トランスポート層の
エンドポイントを作成するファクトリメソッドが含まれています。これらのファクトリ
メソッドは、適切なエンドポイントでクライアント構造体を初期化するために使用
されます。

トランスポート固有のクライアント実装の詳細については、[HTTP](./5-http.md)と
[gRPC](./6-grpc.md)のセクションを参照してください。 