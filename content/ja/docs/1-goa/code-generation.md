---
nav_group: reference
title: コード生成
weight: 80
description: "Complete guide to Goa's code generation - commands, process, generated code structure, and customization options."
llm_optimized: true
aliases:
---

Goa のコード生成は、設計を本番環境向けのサービス契約、トランスポート、クライアント、ドキュメントへ変換します。`goa example` はサービスを実行するための初期コードを生成し、アプリケーションはビジネスロジックを実装します。



## コマンドラインツール

### インストール

```bash
go get goa.design/goa/v3@v3.31.1
go install goa.design/goa/v3/cmd/goa@v3.31.1
```

{{< alert title="v3.31.1 へのアップグレード" color="info" >}}
コード生成プレビューは安定版になりました。v3.30.x から v3.31.1 への
アップグレードには意図的な非互換変更が含まれます。既存のアプリケーションを
再生成する前に、[アップグレードガイド](https://github.com/goadesign/goa/blob/v3.31.1/UPGRADING.md)
を確認してください。Goa モジュールとコマンドを同じバージョンに固定し、
`gen/` ディレクトリ全体を再生成して、アプリケーションをコンパイル・テストします。
ガイドに記載されたメッセージ形式の変更については、クライアントとサーバーの
更新を合わせて行ってください。元に戻す場合は、依存関係、生成コード、
アプリケーションコードをまとめて復元します。
{{< /alert >}}

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

Goa は、完全に検証された設計からパッケージ、型宣言、名前、インポート、フィールドの参照先、生成時に確定できる分岐を解決してから、テンプレートをレンダリングします。テンプレートはその決定をコードへ直接書き出します。生成されたプログラムが分岐するのは、実行時に渡される値についてだけです。

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
    Meta("type:generate:force")
    Attribute("id", String)
})
```

作成する：
```
gen/
└── types/
    └── common_type.go
``` を作成する。

`struct:pkg:path` を指定すると、設計で定義した型は選択した生成パッケージで一度だけ宣言され、生成コード内のすべての使用箇所がその宣言をインポートします。Go パッケージ名には、パスの最後の要素を小文字にした名前が使われます。移動した型が設計で定義した別の型を含む場合、その型にも明示的な `struct:pkg:path` が必要です。通常は同じパッケージを指定します。コンパイラが作成する入れ子の型は、それを含む設計上の型と同じ場所に生成されます。

設計で定義した一つの型宣言は、複数のサービス、およびペイロード、結果、エラーとしての使用箇所で共有されます。その型自体をカスタムエラーとして使う場合、Goa は別の型を生成せず、同じ宣言の隣にエラーメソッドを追加します。

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

Goa はデフォルトで OpenAPI 2.0 と 3.0 のドキュメントを生成します。OpenAPI
3.2.0 の記述も生成するには、API レベルで明示的に選択します。

```go
var _ = API("MyAPI", func() {
    Meta("openapi:versions", "2.0", "3.0", "3.2")
    Meta("openapi:path:3.2", "docs/openapi")
})
```

選択した各バージョンは JSON と YAML の両方で書き出されます。上の例では
OpenAPI 3.2 用に `gen/docs/openapi.json` と `gen/docs/openapi.yaml` が生成され
ます。出力先を指定しない場合、Goa は `gen/http/openapi3.2.json` と
`gen/http/openapi3.2.yaml` に書き出します。バージョンの選択は生成される
サービスコードを変更しません。

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

Goa が生成するトランスポートのデコーダーは、サーバー側で受信リクエストを、クライアント側で受信レスポンスを検証します。その後、サービスがアプリケーションの不変条件を維持します。サービスや生成されたエンドポイントを直接呼び出すと、このデコード処理を通りません。その呼び出し元は、有効な値を渡すか、自身の入力境界で検証する必要があります。

### 構造体フィールドのポインタルール

service type は validation 済みの value を表します。decode 済み transport type は、
受信 field が欠けていたかどうかも保持します。

この表は、Goa v3.31.1 の一般的なスカラーとオブジェクトのフィールドを示します。Bytes、`Any`、union には固有の表現があるため、生成された型を確認してください。

| Field | Service type | HTTP／JSON-RPC body | Protobuf request または response |
|---|---|---|---|
| 必須 primitive または default 付き primitive | Value | validation のために decode するときは pointer、encode するときは value | presence を保持する必要がある singular field は pointer |
| default のない任意 primitive | Pointer | Pointer | Pointer |
| Object | Pointer | Pointer | Pointer |
| Array または map | Value | Value | Value |

HTTP と JSON-RPC では、decode 済み input は server の request または client の
response です。クライアントが送信するリクエストとサーバーが送信するレスポンスでは、必須またはデフォルト値付きのスカラーフィールドは値型を使い、デフォルト値のない任意のスカラーはポインタを使います。protobuf Go struct では、必須の singular boolean、number、string、
enum とその alias は request と response の両方で pointer になります。これにより、
validation は field の欠落と明示的な zero value を区別できます。byte slice は slice、
message は pointer のままで、service struct は従来の構造を保ちます。

例
```go
type Person struct {
    Name     string             // required, direct value
    Age      *int               // optional, pointer
    Hobbies  []string           // array, no pointer
    Metadata map[string]string  // map, no pointer
}
```

`ArrayOfRequired` は、受信 HTTP／JSON-RPC body だけで primitive element と
primitive alias を pointer にして `[null]` を拒否します。service と生成 response
body は value slice のままです。

### コレクションの存在と空の値

`Required("items")` と `MinLength(1)` は別の制約です。JSON では必須のコレクションは省略や null にできませんが、長さの制約がなければ `[]` や `{}` は有効です。protobuf の repeated フィールドと map フィールドは、シリアライズとデシリアライズを経ると省略と空を区別できません。そのため、生成されたバリデーションは存在ではなく長さと内容を検証します。必須の単一スカラー、メッセージ、oneof では、それぞれの存在チェックが維持されます。

Go のコレクションが nil か空かによって業務上の操作を表現しないでください。「変更しない」と「空で置き換える」を区別する必要がある場合は、操作を明示的にモデル化します。

### デフォルト値の処理

デフォルト値は設計で宣言し、生成されたトランスポート変換が適用します。プレビュー版の gRPC デコードでは、入力が省略された場合に宣言されたデフォルト値を適用し、明示的な `0`、`false`、空の値は保持します。サービスから protobuf への変換は渡された値を保持し、ゼロ値をデフォルト値で置き換えません。

HTTP の規則は異なります。受信本文のコンストラクターは省略された値にデフォルト値を適用し、送信本文のコンストラクターはサービスフィールドのゼロ値にも適用する場合があります。ゼロや省略が業務上の意味を持つ場合は、該当方向のコンストラクターとデコーダーを確認してください。すべてのトランスポートに同じ規則を当てはめないでください。

---

## ビューと結果タイプ

ビューは、結果型をどのようにレスポンスに表示するかを制御します。

### ビューの仕組み

1. 結果型で各ビューに含める属性を定義します。
2. Goa がビューの表現、変換、バリデーターを生成します。
3. メソッドの設計で固定ビューを選択できます。動的な単項結果では、生成されたサービスメソッドが結果とともにビュー名を返します。ストリーミングのインターフェースには、生成されたビュー選択操作が用意されます。

### サーバーサイドのレスポンス

生成されたエンコーダーは、選択したビューの表現を使います。そのビューに含まれない属性は除外され、含まれる必須属性には引き続き契約が適用されます。動的 HTTP ビューは `Goa-View` レスポンスヘッダーで名前を伝え、gRPC は `goa-view` メタデータを使います。プレビュー版の JSON-RPC は、動的ビューを `result` 内の `{ "view": ..., "body": ... }` として表します。ビューなしの結果と固定ビューの結果には、この形式を追加しません。

### クライアント側のレスポンス

生成されたクライアントは、選択されたビューを読み取り、その表現をデコードし、ビューの契約を検証してサービスの結果型へ変換します。独自のクライアントは、選択したトランスポートとリリースの表現に従う必要があります。

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

生成済みの値やファイルを変更するプラグインでは、公開済みのコールバックを引き続き使用できます。パッケージレベルの名前を宣言するプラグインは、ファクトリの計画フェーズを使用する必要があります。これにより Goa は、レンダリング前にほかのすべての宣言と合わせてその名前を予約できます。プラグインの詳しい契約と移行手順については、[コード生成アーキテクチャ](https://github.com/goadesign/goa/blob/v3.31.1/codegen/ARCHITECTURE.md)と[アップグレードガイド](https://github.com/goadesign/goa/blob/v3.31.1/UPGRADING.md)を参照してください。
