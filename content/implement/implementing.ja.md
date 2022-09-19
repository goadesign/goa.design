+++
date = "2021-12-05T11:01:06-05:00"
title = "Goa サービスの実装"
weight = 1

[menu.main]
name = "Goa サービスの実装"
parent = "implement"
+++

## 概要

サービスの[デザイン](/design/overview)が完成したら、いよいよ `goa` ツールを実行して、コード生成します：

```bash
goa gen <Go import path of design package>
```

`goa` ツールは、`gen` ディレクトリを作成し、生成されたすべてのコードとドキュメントをそこに格納します。
生成されたコードは下記のようなクリーン・アーキテクチャ・パターンに従っていて、各サービスそれぞれが自身のパッケージに入っています。
加えて、`gen` ディレクトリは各トランスポート（`http` と `grpc` のいずれか、または両方）のサブディレクトリを含みます。

```bash
gen
├── service1
│   ├── client.go       # Service client struct
│   ├── endpoints.go    # Transport agnostic service endpoints
│   └── service.go      # Service interface
├── service2
│   ├── client.go
│   ├── endpoints.go
│   └── service.go
├── ...
├── grpc
│   ├── service1
│   │   ├── client      # gRPC client code
│   │   ├── pb          # Generated gRPC protobuf files
│   │   └── server      # gRPC server code
│   ├── service2
│   └── ...
│   ├── ...
│   └── cli
└── http
    ├── service1
    │   ├── client      # HTTP client code
    │   └── server      # HTTP server code
    ├── service2
    │   └── ...
    ├── ...
    ├── cli
    │   └── calc
    │       └── cli.go
    ├── openapi.json    # OpenAPI 2 (a.k.a. swagger) specification
    ├── openapi.yaml
    ├── openapi3.json   # OpenAPI 3 specification
    └── openapi3.yaml
```

# クリーン・アーキテクチャの階層

サービスを実装する方法の詳細に入る前に、クリーン・アーキテクチャ・パターンの階層について理解しておくことが助けになるでしょう。
各サービスごとに Goa はトランスポート階層、エンドポイント階層、そしてサービス階層を生成します。

## トランスポート階層

トランスポート階層は、リクエストとレスポンスのエンコードとデコードをおこない、それらの内容を検証します。
HTTP の場合、Goa によって生成されるコードは、ランタイムで提供されるエンコーダーとデコーダーを利用しており、サービスやメソッドごとに異なるエンコーダーとデコーダーを使用することができます。
詳細は[HTTPエンコーディング](/implement/encoding)を参照してください。この階層は `http` と `grpc` のディレクトリの下にあるパッケージによって実装されています。

## エンドポイント階層

エンドポイント階層は、トランスポート階層とサービス階層をつなぐ階層です。
エンドポイント階層は、共通の Go の関数のシグネチャを用いて各サービスを表現し、すべてのメソッドに適用される直交動作の実装（トランスポートに依存しないミドルウエアともいえるでしょう）を可能にします。
エンドポイント関数のシグネチャは次のようになっています：

```go
func (s *Service) Method(ctx context.Context, payload interface{}) (response interface{}, err error)
```

エンドポイント階層は、各サービスのディレクトリの下にある `endpoints.go` というファイルに実装されています。

## サービス階層

最後に、サービス階層はビジネスロジックのある階層です。Goa は各サービスのインターフェースを生成し、ユーザーはそれらの実装を用意します。
サービス階層は、各サービスのディレクトリの下にある `service.go` というファイルに実装されています。

## すべてをまとめる

HTTP や gRPC サーバで受け取ったリクエストは、トランスポート階層でデコードされ、エンドポイント階層に渡されます。
エンドポイント階層はサービス階層を呼び出し、ビジネスロジックを実行します。
サービス階層はレスポンスをエンドポイント階層に返し、それらはトランスポート階層でエンコードされ、クライアントに送り返されます。

```
             TRANSPORT             ENDPOINT            SERVICE

           +-----------+       +--------------+
  Request  | Decoding  |       |  Middleware  |
---------->|    &      +------>|      &       +----------+
           | Validation|       | Type casting |          v
           +-----------+       +--------------+     +----------+
                                                    | Business |
                                                    |  logic   |
           +-----------+       +--------------+     +----+-----+
  Response |           |       |  Middleware  |          |
<----------+ Encoding  |<------+      &       |<---------+
           |           |       | Type casting |
           +-----------+       +--------------+
```

> 注: トランスポート階層には上の図のリクエストフローには表現されてないミドルウエアを追加することもできます

# サービスの実装

サービスの実装は、Goa によって生成されるファイル `service.go` に含まれるインターフェースを実装することによって構成されています。
次のようなサービスデザインがあったとします：

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("calc", func() {
    Method("Multiply", func() {
        Payload(func() {
            Attribute("a", Int, "First operand")
            Attribute("b", Int, "Second operand")
        })
        Result(Int)
        HTTP(func() {
            GET("/multiply/{a}/{b}")
        })
        GRPC(func() {})
    })
})
```

そして、以下のように設定したとします：

```bash
mkdir calc; cd calc
go mod init calc
mkdir design
# create design/design.go with the content above
goa gen calc/design
```

Goa は次のようなインターフェースを `gen/calc/service.go` に生成します：

```go
type Service interface {
    Multiply(context.Context, *MultiplyPayload) (res int, err error)
}
```

生成されたインターフェースに対する実装は次のようなものが考えられます：

```go
type svc struct {}

func (s *svc) Multiply(ctx context.Context, p *calcsvc.MultiplyPayload) (int, error) {
	return p.A + p.B, nil
}
```

このインターフェースを実装した構造体は、`endpoints.go` に生成されている `NewEndpoints` 関数を用いて、サービスのエンドポイントのインスタンスを作成することができます：

```go
func NewEndpoints(s Service) *Endpoints {
	return &Endpoints{
		Multiply: NewMultiplyEndpoint(s),
	}
}
```

この関数は単にサービスインターフェースをエンドポイントメソッドでラップしたもので、生成されたトランスポート層に提供され、与えられたトランスポートにエンドポイントを公開することができます。

```go
s := &svc{}
endpoints := calc.NewEndpoints(s)
```

## HTTPサーバの作成

HTTPの場合、生成されている `http/<service>/server/server.go` というファイルに含まれる `New` を用いて作成します：

```go
func New(
	e *calc.Endpoints,
	mux goahttp.Muxer,
	decoder func(*http.Request) goahttp.Decoder,
	encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
	errhandler func(context.Context, http.ResponseWriter, error),
	formatter func(context.Context, err error) goahttp.Statuser,
) *Server
```

HTTP サーバを作成するには、サービスのエンドポイントに加えて、HTTP ルーター、デコーダー、エンコーダーが必要です。
`errhadler` は生成されたエンコーディングやデコーディングが失敗したときに生成されたコードから呼ばれる関数です。
`formatter` は、サービスメソッドでエンコーディングの前にエラーを返す際に Goa がどのようにそのエラーを整形するか、をオーバーライドすることができます。
いずれも `nil` に設定できますが、その場合、エンコーディングでエラーが発生した場合には生成されたコードでは panic になります（デフォルトの Goa のエンコーダーでは発生しません）、
そのほかのエラーは [ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError) 構造体を使ってフォーマットされます。

Goa の [http パッケージ](https://pkg.go.dev/goa.design/goa/v3/http) には、HTTP サーバを作るのに便利なように、ルーター、デコーダー、エンコーダーのデフォルト実装が用意されています。

```go
mux := goahttp.NewMuxer()
dec := goahttp.RequestDecoder
enc := goahttp.ResponseEncoder
svr := calcsvr.New(endpoints, mux, dec, enc, nil, nil)
```

HTTP サーバの設定に必要な最後のステップは、生成された `Mount` 関数を呼び出すことです。

```go
func Mount(mux goahttp.Muxer, h *Server) {
	MountMultiplyHandler(mux, h.Multiply)
}
```

mux オブジェクトは標準的な Go の HTTP ハンドラで、HTTP リクエストを扱うために利用できます：

```go
calcsvr.Mount(mux, svr)
s := &http.Server{Handler: mux}
s.ListenAndServe()
```

HTTP サービスの例として完全なコードは次のようになります：

```go
package main

import (
	"context"
	"net/http"

	goahttp "goa.design/goa/v3/http"

	"calc/gen/calc"
	"calc/gen/http/calc/server"
)

type svc struct{}

func (s *svc) Multiply(ctx context.Context, p *calc.MultiplyPayload) (int, error) {
	return p.A + p.B, nil
}

func main() {
	s := &svc{}                                               # Create Service
	endpoints := calc.NewEndpoints(s)                         # Create endpoints
	mux := goahttp.NewMuxer()                                 # Create HTTP muxer
	dec := goahttp.RequestDecoder                             # Set HTTP request decoder           
	enc := goahttp.ResponseEncoder                            # Set HTTP response encoder
	svr := server.New(endpoints, mux, dec, enc, nil, nil)     # Create Goa HTTP server
	server.Mount(mux, svr)                                    # Mount Goa server on mux
	httpsvr := &http.Server{                                  # Create Go HTTP server
        Addr: "localhost:8081",                               # Configure server address
        Handler: mux,                                         # Set request handler
    }
	if err := httpsvr.ListenAndServe(); err != nil {          # Start HTTP server
		panic(err)
	}
}
```

> 注：上記のコードは、生成されたコードとインターフェースを理解するためのもので、このまま使用することを意図したものではありません。
> 特に実際のコードでは、ビジネスロジックを独自のパッケージに移し、適切なエラー処理を実装することになるでしょう。 

## gRPCサーバの作成

gRPC サーバの作成は、HTTP サーバと同様のパターンで行います。
`gen/grpc/<service>/server/server.go` に生成されている `New` でサーバを作成します：

```go
func New(e *calc.Endpoints, uh goagrpc.UnaryHandler) *Server {
	return &Server{
		MultiplyH: NewMultiplyHandler(e.Multiply, uh),
	}
}
```

この関数は、エンドポイントとオプションの gRPC ハンドラを受け取り、gRPC の設定を可能にします。
デフォルトに実装では、デフォルトの gRPC のオプションを使用しています：

```go
func NewMultiplyHandler(endpoint goa.Endpoint, h goagrpc.UnaryHandler) goagrpc.UnaryHandler {
	if h == nil {
		h = goagrpc.NewUnaryHandler(endpoint, DecodeMultiplyRequest, EncodeMultiplyResponse)
	}
	return h
}
```

作成された Goa の gRPC サーバは、生成された `Register<Service>Server` 関数を用いて、標準的な gRPC サーバに対して登録されます：

```go
svr := server.New(endpoints, nil)
grpcsrv := grpc.NewServer()
calcpb.RegisterCalcServer(grpcsrv, svr)
```

gRPC サーバの起動は通常の方法で行われます。たとえば以下のようになります：

```go
lis, err := net.Listen("tcp", "localhost:8082")
if err != nil {
    panic(err)
}
if err :=  srv.Serve(lis); err != nil {
    panic(err)
}
```

gRPC サービスの例として完全なコードは次のようになります：

```go
package main

import (
	"context"
	"net"

	"google.golang.org/grpc"

	"calc/gen/calc"
	calcpb "ca/gen/grpc/calc/pb"
	"calc/gen/grpc/calc/server"
)

type svc struct{}

func (s *svc) Multiply(ctx context.Context, p *calc.MultiplyPayload) (int, error) {
	return p.A + p.B, nil
}

func main() {
	s := &svc{}
	endpoints := calc.NewEndpoints(s)
	svr := server.New(endpoints, nil)
	grpcsrv := grpc.NewServer()
	calcpb.RegisterCalcServer(grpcsrv, svr)
	lis, err := net.Listen("tcp", "localhost:8082")
	if err != nil {
		panic(err)
	}
	if err := grpcsrv.Serve(lis); err != nil {
		panic(err)
	}
}
```

ひとつの Goa のサービスが HTTP と gRPC の両方のエンドポイントを同時に公開することがあります。
このような場合、生成されたエンドポイントの構造体は、HTTP と gRPC のサービスで共有されます。

## デフォルトをオーバーライドする

生成されたコードを理解するために重要なことのひとつは、それらが完全にオーバーライドできるように設計されているということです。
生成されたサービスのパッケージには、個々のエンドポイントを作成することができる関数が用意されています。たとえば：

`gen/calc/endpoints.go`

```go
func NewMultiplyEndpoint(s Service) goa.Endpoint {
	return func(ctx context.Context, req interface{}) (interface{}, error) {
		p := req.(*MultiplyPayload)
		return s.Multiply(ctx, p)
	}
}
```

生成された `NewEndpoints` 関数は、単に個々のエンドポイント作成関数を呼び出し、エンドポイントの参照を保持する構造体を返します。
構造体のフィールドはパブリックなので、ユーザーコードでどのエンドポイントもオーバーライドすることができます：

```go
type Endpoints struct {
	Multiply goa.Endpoint
}
```

同様に、HTTP と gRPC サーバのオブジェクトは、HTTP と gRPC の各ハンドラを保持するパブリックなフィールドを公開しています。

HTTP (`gen/http/calc/server/server.go`):

```go
type Server struct {
	Multiply http.Handler
    // ...
}
```

gRPC (`gen/grpc/calc/server/server.go`):

```go
type Server struct {
	MultiplyH goagrpc.UnaryHandler
	// ...
}
```

ハンドラはパブリックなフィールドなので、ユーザーコードでいずれのハンドラもオーバーライドすることができます。
サーバを作成する `New` 関数は、エンドポイント固有の公開された関数に単にデリゲートします。この関数はパブリックであり、個別に呼び出すことができます。

HTTP (`gen/http/calc/server/server.go`):

```go
func NewMultiplyHandler(
	endpoint goa.Endpoint,
	mux goahttp.Muxer,
	decoder func(*http.Request) goahttp.Decoder,
	encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
	errhandler func(context.Context, http.ResponseWriter, error),
	formatter func(context.Context, err error) goahttp.Statuser,
) http.Handler
```

gRPC (`gen/grpc/calc/server/server.go`):

```go
func NewMultiplyHandler(endpoint goa.Endpoint, h goagrpc.UnaryHandler) goagrpc.UnaryHandler
```

また HTTP では、Goa の HTTP パッケージが提供するデフォルト実装ではなく、独自の実装によって、HTTP エンコーダー、デコーダー、さらには muxer をオーバーライドすることができます。
