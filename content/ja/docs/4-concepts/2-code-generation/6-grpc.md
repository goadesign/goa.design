---
title: "生成されるgRPCサーバーとクライアントのコード"
linkTitle: "gRPCコード"
weight: 6
description: "サービスインターフェース、エンドポイント、トランスポート層を含め、Goaによって生成されるコードについて学びます。"
---

gRPCコード生成は、すべてのトランスポートレベルの懸念事項を処理する完全な
クライアントとサーバーの実装を作成します。Goaは各サービスのProtobuf定義を
生成し、自動的に`protoc`を呼び出してサーバーとクライアントの低レベルコードを
生成します。Goaはまた、Protobufで生成されたコードを活用して高レベルのgRPC
サーバーとクライアントの実装を作成するコードも生成します。

## Protobuf定義

protobufサービス定義は`gen/grpc/<サービス名>/pb/goagen_<API名>_<サービス名>.proto`
に生成されます：

```protobuf
syntax = "proto3";

package calc;

service Calc {
    rpc Add (AddRequest) returns (AddResponse);
    rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
}

message AddRequest {
    int64 a = 1;
    int64 b = 2;
}

message AddResponse {
    int64 result = 1;
}
// ...その他のメッセージ...
```

このprotobuf定義は、Goaがコード生成中に自動的に呼び出す`protoc`コンパイラを
通じて、低レベルのgRPCコードを生成するために使用されます。

## gRPCサーバーの実装

Goaは`gen/grpc/<サービス名>/server/server.go`に完全なgRPCサーバーの実装を
生成し、gRPCを使用してサービスメソッドを公開します。サーバーは、生成された
`New`関数を使用してインスタンス化できます。この関数は、サービスエンドポイント
とオプションのユニタリハンドラーを受け入れます。ユニタリハンドラーが提供
されない場合、サーバーはGoaが提供するデフォルトのハンドラーを使用します。

```go
// Newは、calcサービスのエンドポイントを使用してサーバー構造体を
// インスタンス化します。
func New(e *calc.Endpoints, uh goagrpc.UnaryHandler) *Server {
    return &Server{
        AddH: NewAddHandler(e.Add, uh),
        MultiplyH: NewMultiplyHandler(e.Multiply, uh),
    }
}
```

上記のコードの`goagrpc`は、`goa.design/goa/v3/grpc`にあるGoaのgRPCパッケージを
指します。`UnaryHandler`型は、コンテキストとリクエストを受け取り、レスポンスと
エラーを返す関数です。サービスがストリーミングメソッドを公開する場合、`New`は
ストリーミングハンドラーも受け入れます。

`Server`構造体は、個々のハンドラーを変更したり、特定のエンドポイントに
ミドルウェアを適用したりするために使用できるフィールドを公開しています：

```go
// ServerはcalcサービスエンドポイントのgRPCハンドラーをリストします。
type Server struct {
    AddH      goagrpc.UnaryHandler
    MultiplyH goagrpc.UnaryHandler
    // ... プライベートフィールド ...
}
```

サーバーファイルの残りの部分は、各サービスメソッドのgRPCサーバーハンドラーを
実装します。これらのハンドラーは、リクエストのデコード、サービスメソッドの
呼び出し、レスポンスとエラーのエンコードを担当します。

### すべてを組み合わせる

サービスインターフェースとエンドポイント層は、Goaで生成されるサービスの
基本的な構成要素です。メインパッケージはこれらの層を使用してトランスポート
固有のサーバーとクライアントの実装を作成し、gRPCを使用してサービスを実行し、
対話することができます：

```go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"

    "github.com/<ユーザー名>/calc"
    gencalc "github.com/<ユーザー名>/calc/gen/calc"
    genpb "github.com/<ユーザー名>/calc/gen/grpc/calc/pb"
    gengrpc "github.com/<ユーザー名>/calc/gen/grpc/calc/server"
)

func main() {
    svc := calc.New()                        // サービスの実装
    endpoints := gencalc.NewEndpoints(svc)   // サービスエンドポイントの作成
    svr := grpc.NewServer(nil)               // gRPCサーバーの作成
    gensvr := gengrpc.New(endpoints, nil)    // サーバー実装の作成
    genpb.RegisterCalcServer(svr, genserver) // サーバーをgRPCに登録
    lis, _ := net.Listen("tcp", ":8080")     // gRPCサーバーリスナーの開始
    svr.Serve(lis)                           // gRPCサーバーの開始
}
```

## gRPCクライアントの実装

Goaは`gen/grpc/<サービス名>/client/client.go`に完全なgRPCクライアントの実装を
生成します。HTTPクライアントと同様に、各サービスメソッドのGoaエンドポイントを
作成するメソッドを提供し、これらはトランスポートに依存しないクライアント実装に
ラップできます。

### クライアントの作成

生成された`NewClient`関数は、トランスポートに依存しないクライアントエンドポイント
を作成するために使用できるオブジェクトを作成します：

```go
// NewClientは、calcサービスのすべてのエンドポイントのgRPCクライアントを
// インスタンス化します。
func NewClient(cc *grpc.ClientConn, opts ...grpc.CallOption) *Client {
    return &Client{
        grpccli: calcpb.NewCalcClient(cc),
        opts:    opts,
    }
}
```

この関数は、低レベルのprotobufクライアントを作成するために使用されるgRPC接続
（`*grpc.ClientConn`）を必要とします。また、gRPCクライアントを設定するために
使用されるオプションのgRPC呼び出しオプション（`...grpc.CallOption`）も受け
入れます。

### gRPCクライアント

インスタンス化された`Client`構造体は、トランスポートに依存しないエンドポイント
を構築するメソッドを公開します：

```go
// Addは、calcサービスのaddサーバーにgRPCリクエストを行うエンドポイントを
// 返します。
func (c *Client) Add() goa.Endpoint

// Multiplyは、calcサービスのmultiplyサーバーにgRPCリクエストを行う
// エンドポイントを返します。
func (c *Client) Multiply() goa.Endpoint
```

### すべてを組み合わせる

以下は、`calc`サービスのgRPCクライアントを作成して使用する例です：

```go
package main

import (
    "context"
    "log"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    gencalc "github.com/<ユーザー名>/calc/gen/calc"
    genclient "github.com/<ユーザー名>/calc/gen/grpc/calc/client"
)

func main() {
    // gRPC接続の作成
    conn, err := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // gRPCクライアントの作成
    grpcClient := genclient.NewClient(conn)

    // エンドポイントクライアントの作成
    client := gencalc.NewClient(
        grpcClient.Add(),          // Addエンドポイント
        grpcClient.Multiply(),     // Multiplyエンドポイント
    )

    // サービスメソッドの呼び出し
    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("1 + 2 = %d", result)
}
```

この例は以下の方法を示しています：
1. gRPC接続の作成
2. 接続を使用したgRPCクライアントの作成
3. エンドポイントクライアントへのラップ
4. クライアントを使用したサービス呼び出し

gRPCクライアントはすべてのトランスポートレベルの懸念事項を処理し、エンドポイント
クライアントはサービス呼び出しを行うためのクリーンなインターフェースを提供します。

### 結論

生成されるgRPCクライアントは、gRPCを使用してサービスと対話する便利な方法を提供
します。クライアントはgRPC通信のすべての複雑さを処理しながら、他のトランスポート
実装と一致する一貫したインターフェースを提供します。 