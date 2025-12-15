---
title: コード生成
weight: 3
description: "Complete guide to Goa's code generation - commands, process, generated code structure, and customization options."
llm_optimized: true
aliases:
---

Goa のコード生成は、あなたの設計を生産可能なコードに変換します。単なる雛形ではなく、Goa はベストプラクティスに従い、API 全体の一貫性を維持する、完全で実行可能なサービス実装を生成します。



## コマンドラインツール

### インストール

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

### コマンド

すべてのコマンドは、ファイルシステムのパスではなく、Goパッケージのインポートパスを想定しています：

```bash
# ✅ Correct: using Go package import path
goa gen goa.design/examples/calc/design

# ❌ Incorrect: using filesystem path
goa gen ./design
```

#### コードの生成 (`goa gen`)

```bash
goa gen <design-package-import-path> [-o <output-dir>]
```

コード生成の主要コマンドです：
- デザイン・パッケージを処理し、実装コードを生成します。
- 毎回 `gen/` ディレクトリ全体をゼロから再作成します。
- デザイン変更毎に実行

#### 例題の作成 (`goa example`)

```bash
goa example <design-package-import-path> [-o <output-dir>]
```

雛形コマンド：
- 1回限りのサンプル実装を作成
- サンプルのロジックを持つハンドラスタブを生成します。
- 新規プロジェクト開始時に一度だけ実行
- 既存のカスタム実装を上書きしない

#### バージョンを表示

```bash
goa version
```

### 開発ワークフロー

1.初期デザインの作成
2.`goa gen`を実行してベースコードを生成する。
3.`goa example`を実行して実装スタブを作成する。
4.サービスロジックを実装する
5.デザインを変更するたびに`goa gen`を実行する

**ベストプラクティス:** CI/CD中に生成するのではなく、生成されたコードをバージョン管理にコミットする。これにより、再現可能なビルドが保証され、生成されたコードの変更を追跡できるようになります。

---

## 生成プロセス

`goa gen`を実行すると、Goaは体系的なプロセスに従う：

### 1.ブートストラップ段階

一時的な `main.go` を作成します：
- Goaパッケージとデザインパッケージをインポートします。
- DSL 評価を実行します。
- コード生成のトリガー

### 2.設計評価

- DSL関数を実行して式オブジェクトを作成
- 式が結合されて完全なAPIモデルになる
- 式間の関係が確立される
- 設計ルールと制約の検証

### 3.コード生成

- 検証された式がコード・ジェネレーターに渡される
- テンプレートがレンダリングされてコードファイルが生成される
- 出力は`gen/`ディレクトリに書き込まれる

---

## 生成されるコード構造

典型的な生成プロジェクト：

```
myservice/
├── cmd/                    # Generated example commands
│   └── calc/
│       ├── grpc.go
│       └── http.go
├── design/                 # Your design files
│   └── design.go
├── gen/                    # Generated code (don't edit)
│   ├── calc/               # Service-specific code
│   │   ├── client.go
│   │   ├── endpoints.go
│   │   └── service.go
│   ├── http/               # HTTP transport layer
│   │   ├── calc/
│   │   │   ├── client/
│   │   │   └── server/
│   │   └── openapi.json
│   └── grpc/               # gRPC transport layer
│       └── calc/
│           ├── client/
│           ├── server/
│           └── pb/
└── myservice.go            # Your service implementation
```

### サービスインターフェース

`gen/<service>/service.go` で生成される：

```go
// Service interface defines the API contract
type Service interface {
    Add(context.Context, *AddPayload) (res int, err error)
    Multiply(context.Context, *MultiplyPayload) (res int, err error)
}

// Payload types
type AddPayload struct {
    A int32
    B int32
}

// Constants for observability
const ServiceName = "calc"
var MethodNames = [2]string{"add", "multiply"}
``` で生成されます。

### エンドポイントレイヤー

`gen/<service>/endpoints.go`で生成される：

```go
// Endpoints wraps service methods in transport-agnostic endpoints
type Endpoints struct {
    Add      goa.Endpoint
    Multiply goa.Endpoint
}

// NewEndpoints creates endpoints from service implementation
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        Add:      NewAddEndpoint(s),
        Multiply: NewMultiplyEndpoint(s),
    }
}

// Use applies middleware to all endpoints
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.Add = m(e.Add)
    e.Multiply = m(e.Multiply)
}
``` で生成される。

エンドポイントミドルウェアの例：

```go
func LoggingMiddleware(next goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req any) (res any, err error) {
        log.Printf("request: %v", req)
        res, err = next(ctx, req)
        log.Printf("response: %v", res)
        return
    }
}

endpoints.Use(LoggingMiddleware)
```

### クライアントコード

`gen/<service>/client.go`で生成される：

```go
// Client provides typed methods for service calls
type Client struct {
    AddEndpoint      goa.Endpoint
    MultiplyEndpoint goa.Endpoint
}

func NewClient(add, multiply goa.Endpoint) *Client {
    return &Client{
        AddEndpoint:      add,
        MultiplyEndpoint: multiply,
    }
}

func (c *Client) Add(ctx context.Context, p *AddPayload) (res int, err error) {
    ires, err := c.AddEndpoint(ctx, p)
    if err != nil {
        return
    }
    return ires.(int), nil
}
``` で生成されます。

---

## HTTP コード生成

### サーバーの実装

`gen/http/<service>/server/server.go`で生成されます：

```go
func New(
    e *calc.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(ctx context.Context, err error) goahttp.Statuser,
) *Server

// Server exposes handlers for modification
type Server struct {
    Mounts   []*MountPoint
    Add      http.Handler
    Multiply http.Handler
}

// Use applies HTTP middleware to all handlers
func (s *Server) Use(m func(http.Handler) http.Handler)
``` で生成されます。

サーバーのセットアップ完了：

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    mux := goahttp.NewMuxer()
    server := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil, nil)
    genhttp.Mount(mux, server)
    http.ListenAndServe(":8080", mux)
}
```

### クライアントの実装

`gen/http/<service>/client/client.go`で生成される：

```go
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client
``` で生成される。

クライアントのセットアップ完了：

```go
func main() {
    httpClient := genclient.NewClient(
        "http",
        "localhost:8080",
        http.DefaultClient,
        goahttp.RequestEncoder,
        goahttp.ResponseDecoder,
        false,
    )

    client := gencalc.NewClient(
        httpClient.Add(),
        httpClient.Multiply(),
    )

    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## gRPCコード生成

### プロトバフの定義

`gen/grpc/<service>/pb/`で生成されます：

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
``` で生成される。

### サーバーの実装

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    svr := grpc.NewServer()
    gensvr := gengrpc.New(endpoints, nil)
    genpb.RegisterCalcServer(svr, gensvr)
    lis, _ := net.Listen("tcp", ":8080")
    svr.Serve(lis)
}
```

### クライアントの実装

```go
func main() {
    conn, _ := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    defer conn.Close()

    grpcClient := genclient.NewClient(conn)
    client := gencalc.NewClient(
        grpcClient.Add(),
        grpcClient.Multiply(),
    )

    result, _ := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## カスタマイズ

### タイプ生成コントロール

メソッドから直接参照されない型を強制的に生成します：

```go
var MyType = Type("MyType", func() {
    // Force generation in specific services
    Meta("type:generate:force", "service1", "service2")
    
    // Or force generation in all services
    Meta("type:generate:force")
    
    Attribute("name", String)
})
```

### パッケージの構成

共有パッケージで型を生成します：

```go
var CommonType = Type("CommonType", func() {
    Meta("struct:pkg:path", "types")
    Attribute("id", String)
})
```

作成する：
```
gen/
└── types/
    └── common_type.go
``` を作成する。

### フィールドのカスタマイズ

```go
var Message = Type("Message", func() {
    Attribute("id", String, func() {
        // Override field name
        Meta("struct:field:name", "ID")
        
        // Add custom struct tags
        Meta("struct:tag:json", "id,omitempty")
        Meta("struct:tag:msgpack", "id,omitempty")
        
        // Override type
        Meta("struct:field:type", "bson.ObjectId", "github.com/globalsign/mgo/bson", "bson")
    })
})
```

### プロトコルバッファのカスタマイズ

```go
var MyType = Type("MyType", func() {
    // Override protobuf message name
    Meta("struct:name:proto", "CustomProtoType")
    
    Field(1, "status", Int32, func() {
        // Override protobuf field type
        Meta("struct:field:proto", "int32")
    })

    // Use Google's timestamp type
    Field(2, "created_at", String, func() {
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",
            "google/protobuf/timestamp.proto",
            "Timestamp",
            "google.golang.org/protobuf/types/known/timestamppb")
    })
})

// Specify protoc include paths
var _ = API("calc", func() {
    Meta("protoc:include", "/usr/include", "/usr/local/include")
})
```

### OpenAPI のカスタマイズ

```go
var _ = API("MyAPI", func() {
    // Control generation
    Meta("openapi:generate", "false")
    
    // Format JSON output
    Meta("openapi:json:prefix", "  ")
    Meta("openapi:json:indent", "  ")
    
    // Disable example generation
    Meta("openapi:example", "false")
})

var _ = Service("UserService", func() {
    // Add tags
    HTTP(func() {
        Meta("openapi:tag:Users")
        Meta("openapi:tag:Backend:desc", "Backend API Operations")
    })
    
    Method("CreateUser", func() {
        // Custom operation ID
        Meta("openapi:operationId", "{service}.{method}")
        
        // Custom summary
        Meta("openapi:summary", "Create a new user")
        
        HTTP(func() {
            // Add extensions
            Meta("openapi:extension:x-rate-limit", `{"rate": 100}`)
            POST("/users")
        })
    })
})

var User = Type("User", func() {
    // Override type name in OpenAPI spec
    Meta("openapi:typename", "CustomUser")
})
```

---

## 型とバリデーション

### バリデーションの実施

Goaはシステム境界でデータを検証する：
- **サーバー側**: 受信リクエストを検証する
- **クライアント側**: 受信レスポンスを検証する
- **内部コード**: 不変量（invariants）を維持することが前提

### 構造体フィールドのポインタルール

| プロパティ | ペイロード/結果 | リクエストボディ（サーバー） | レスポンスボディ（サーバー） |
|------------|---------------|----------------------|---------------------|
| 必須 OR デフォルトあり | 直接値（-） | ポインタ（*） | 直接値（-） |
| 必須ではない & デフォルトなし | ポインタ（*） | ポインタ（*） | ポインタ（*） |

特殊型：
- **オブジェクト（構造体）**：常にポインターを使用
- **配列とマップ**：ポインターは使わない（すでに参照型になっている）

例
```go
type Person struct {
    Name     string             // required, direct value
    Age      *int               // optional, pointer
    Hobbies  []string           // array, no pointer
    Metadata map[string]string  // map, no pointer
}
```

### デフォルト値の処理

- **マーシャリング**：デフォルト値はnil配列/マップを初期化する
- **アンマーシャリング**：デフォルト値は、欠落しているオプションフィールドに適用されます（欠落している必須フィールドには適用されません）。

---

## ビューと結果タイプ

ビューは、結果型をどのようにレスポンスに表示するかを制御します。

### ビューの仕組み

1.サービスメソッドにはビューパラメータ
2.サービスレベルでビューパッケージが生成される
3.ビュー固有のバリデーションが自動的に生成される

### サーバーサイドのレスポンス

1.表示結果の型がマーシャリングされる
2.Nil属性は省略される
3.ビュー名は "Goa-View" ヘッダで渡される

### クライアント側のレスポンス

1.レスポンスはアンマーシャルされる
2.表示される結果タイプに変換される
3.Goa-View "ヘッダから抽出されたビュー名
4.ビュー固有の検証を実行
5.サービス結果タイプに変換

### デフォルトビュー

ビューが定義されていない場合、Goaはすべての基本フィールドを含む「デフォルト」ビューを追加します。

---

## プラグインシステム

Goaのプラグインシステムはコード生成を拡張します。プラグインは以下のことができます：

1. **新しいDSLの追加** - 設計言語コンストラクトの追加
2. **生成されたコードの修正** - ファイルの検査と修正、新しいファイルの追加

CORSプラグインを使用した例

```go
import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)

var _ = Service("calc", func() {
    cors.Origin("/.*localhost.*/", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
    })
})
```

一般的なプラグインの使用例
- プロトコルサポート（CORSなど）
- 追加ドキュメントフォーマット
- カスタム検証ルール
- 横断的な関心事（ロギング、メトリクス）
- 設定ファイルの生成
