+++
title = "デザイン概要"
weight = 1

[menu.main]
name = "デザイン概要"
parent = "design"
+++

以下のセクションでは、goa DSL を使用してサービスを記述する方法について説明し、キーコンセプトの概要を説明します。
完全なリファレンスは [GoDocs](https://pkg.go.dev/goa.design/goa/v3/dsl) を参照してください。

## API の表現

[API](https://pkg.go.dev/goa.design/goa/v3/dsl#API) 関数は、省略可能なトップレベルの DSL で、名前や説明、バージョン番号のような API の大域のプロパティを列挙します。
`API` は、異なるサービスセットを公開する可能性がある1つ以上の[サーバー](https://pkg.go.dev/goa.design/goa/v3/dsl#Server)を定義できます。
単一のサービスは、任意の番号（または番号なし）のサーバーによって公開されるでしょう。
もし `Server` が省略されていれば、デザインで定義される全てのサービスを公開する単一のサーバーが自動的に定義されます。
`Server` の表現は、コマンドライン クライアントや OpenAPI の仕様を生成するときに使用されます。

```go
var _ = API("calc", func() {
    Title("Calculator Service")
    Description("A service for multiplying numbers, a goa teaser")

    // Server はクライアントのリクエストを受け付ける単一のプロセスを記述します
    // DSLは、サーバーがホストする一連のサービスとホストの詳細を定義します
    Server("calc", func() {
        Description("calc hosts the Calculator Service.")

        // このサーバーによってホストされているサービスを列挙します
        Services("calc")

        // ホストとそのトランスポート URL を列挙します。
        Host("development", func() {
            Description("Development hosts.")
            // トランスポート固有の URL, サポートされているスキーマは以下です：
            // 'http', 'https', 'grpc' and 'grpcs' とそれぞれのデフォルト
            // ポート： 80, 443, 8080, 8443
            URI("http://localhost:8000/calc")
            URI("grpc://localhost:8080")
        })

        Host("production", func() {
            Description("Production hosts.")
            // URL は {param} 記法を用いてパラメータ化できます。
            URI("https://{version}.goa.design/calc")
            URI("grpcs://{version}.goa.design")

            // Variable は URI の変数を記述します
            Variable("version", String, "API version", func() {
                // URL パラメータにはデフォルト値か Enum バリデーション（あるいはその両方）が必要です
                Default("v1")
            })
        })
    })
})
```

## Service の表現

[Service](https://pkg.go.dev/goa.design/goa/v3/dsl#Service) 関数はメソッドのグループを定義します。
これは、REST のリソースか、gRPC の [サービス宣言](https://grpc.io/docs/guides/concepts.html#service-definition) に対応します。 
サービスはすべてのサービスメソッドに共通のエラーレスポンスを定義することができます。
エラー定義に関する追加情報については、[エラー処理](/design/handling_errors/) を参照してください。

```go
var _ = Service("calc", func() {
    Description("The calc service performs operations on numbers")

    // Method はサービスメソッド（エンドポイント）を記述します
    Method("multiply", func() {
        // Payload はメソッドのペイロードを記述します
        // ここでは、ペイロードは2つのフィールドからなるオブジェクトです
        Payload(func() {
            // Field はフィールドインデックス、フィールド名、型、および説明が与えられたオブジェクトを記述します
            Field(1, "a", Int, "Left operand")
            Field(2, "b", Int, "Right operand")
            // Required は必須となるフィールドの名前を列挙します
            Required("a", "b")
        })

        // Result はメソッドの結果を記述します
        // ここでは、結果は単純に1つの整数値です
        Result(Int)

        // HTTP は HTTP トランスポートへの対応を記述します
        HTTP(func() {
            // サービスへのリクエストは HTTP GET リクエストで構成されています
            // ペイロードはパスパラメータとしてエンコードされます
            GET("/multiply/{a}/{b}")
            // レスポンスは HTTP ステータス "200 OK" を使用します
            // 結果はレスポンスボディにエンコードされます（デフォルト）
            Response(StatusOK)
        })

        // GRPC は gRPC トランスポートへの対応を記述します
        GRPC(func() {
            // レスポンスは gRPC コード "OK" を使用します
            // 結果はレスポンスメッセージにエンコードされます（デフォルト）
            Response(CodeOK)
        })
    })

    // /swagger.json に送られたリクエストに対して、ファイルを相対パス ./gen/http/openapi.json で提供します 
    Files("/swagger.json", "./gen/http/openapi.json")
})
```

## Method の表現

サービスメソッドは [Method](https://pkg.go.dev/goa.design/goa/v3/dsl#Method) を用いて記述されます。
この関数はメソッドペイロード（入力）と結果（出力）の型を定義します。
任意の数のエラーレスポンスを列挙することもあります。
エラーレスポンスは名前と型があります。型はオプションです。
ペイロードまたは結果の型を省略すると、組み込み型 `Empty` を使用した場合と同じ効果があります。
`Empty` は HTTP では空のボディ、gRPC では `Empty` メッセージに対応します。
エラータイプを省略すると、デフォルトのエラータイプ [ErrorResult](https://pkg.go.dev/goa.design/goa/v3/expr#ErrorResult) を使用した場合と同じ効果があります。

```go
Method("divide", func() {
    Description("Divide returns the integral division of two integers.")
    Payload(func() {
        Attribute("a", Int, "Left operand")
        Attribute("b", Int, "Right operand")
        Required("a", "b")
    })
    Result(Int)

    // Error はエラーを定義します。
    Error("DivByZero")

    HTTP(func() {
        GET("/div/{a}/{b}")
        // "DivByZero" エラーに対応するレスポンスの HTTP ステータスコードは 400 Bad Requestです
        // 成功したリクエストに対するデフォルトのレスポンスは 200 OK です
        Response("DivByZero", StatusBadRequest)
    })

    GRPC(func() {
        // "DivByZero"エラーに対応する結果の gRPC コードは 3（INVALID_ARGUMENT）です
        // 成功したリクエストに対するデフォルトのレスポンスは 0 OK です
        Response("DivByZero", CodeInvalidArgument)
    })
})
```

ペイロード、結果、およびエラータイプは、 *トランスポートとは無関係に* メソッドの入力と出力を定義します。
言い換えれば、ペイロードと結果の型は、HTTP ヘッダ、URL パラメータなどにマッピングされるフィールドを含めた、ビジネスロジックに必要なすべてのフィールドを含むべきです。

### gRPC の表現


[gRPC](https://pkg.go.dev/goa.design/goa/v3/dsl#GRPC) 関数は、ペイロードや結果型のアトリビュートから gRPC メッセージとメタデータへのマッピングを定義します。 

```go
    Method("update", func() {
        Description("Change account name")
        Payload(UpdateAccount)
        Result(Empty)
        Error("NotFound")
        Error("BadRequest")

        // gRPC トランスポート
        GRPC(func() {
            Response("NotFound", CodeNotFound)
            Response("BadRequest", CodeInvalidArgument)
        })
    })
```

### HTTP の表現

[HTTP](https://pkg.go.dev/goa.design/goa/v3/dsl#HTTP) 関数は、
ペイロードや結果型のアトリビュートから HTTP リクエストパスとクエリー文字列の値、
および HTTP リクエストやレスポンスボディへのマッピングを定義します。
`HTTP` 関数は、リクエストパスやレスポンス HTTP ステータスコードなど、他の HTTP 固有のプロパティも定義します。

```go
    Method("update", func() {
        Description("Change account name")
        Payload(UpdateAccount)
        Result(Empty)
        Error("NotFound")
        Error("BadRequest")

        // HTTP transport
        HTTP(func() {
            PUT("/{accountID}")    // "accountID" は UpdateAccount のアトリビュート
            Body(func() {
                Attribute("name")  // "name" は UpdateAccount のアトリビュート
                Required("name")
            })
            Response(StatusNoContent)
            Response("NotFound", StatusNotFound)
            Response("BadRequest", StatusBadRequest)
        })
    })
```

### Method のペイロード型

上記の例では、`accountID` HTTP リクエストパスパラメータは、同じ名前の `UpdateAccount` 型のアトリビュートによって定義されています。
HTTP リクエストボディは、`UpdateAccount` ペイロード型の `name` アトリビュートを含むオブジェクトとして定義されています。

`HTTP` 関数によって明示的にマップされていないすべてのアトリビュートは、リクエストボディのアトリビュートに暗黙的にマップされます。
これにより、たとえば、ペイロード型のフィールドの1つのみが HTTP ヘッダーにマップされるようなマッピングを定義するのが簡単になります。

ボディのアトリビュートは `Body` 関数を使って明示的に列挙することもできます。
この関数は、対応するペイロード型のアトリビュート名を列挙する DSL、または文字列を受け取ります。
文字列を受け取るとき、この文字列は、ペイロード型のひとつのアトリビュートの名前に対応し、リクエストボディ全体の形状を定義します。
後者はリクエストボディを記述するために任意の型を使用することを可能にします（例えば配列とマップ）。

次は、リクエストボディの形状を暗黙的に定義する HTTP マッピングの例です：

```go
HTTP(func() {
    PUT("/{accountID}")       // ペイロード型のアトリビュート "accountID"
    Response(StatusNoContent) // ペイロード型の他の全てのアトリビュートは、リクエストボディにマップされます                              // mapped to the request body.
})
```

リクエストボディの形状を定義するためにペイロード型のアトリビュートの名前を使用する別の例：

```go
HTTP(func() {
    PUT("/")
    Body("names") // ペイロード型は "names" アトリビュートをもつと仮定
    Response(StatusNoContent)
})
```

### Method の結果型

`Service` は1つの結果型だけしか定義できませんが、`HTTP` は複数のレスポンスを列挙できます。
各レスポンスは、HTTP ステータス、（もしあれば）レスポンスボディを定義し、また HTTP ヘッダを列挙するでしょう。
`Tag` DSL 関数は、HTTP レスポンスで送信するレスポンスを決定するために使われる、結果型のアトリビュートを定義することが出来ます。
HTTP レスポンスの書き込みに Tag が使用されるように定義されるレスポンスで、必須なアトリビュートに対して、
この関数は結果型のアトリビュート名と、アトリビュートの値を指定します。

デフォルトでは、HTTP ステータスコード 200 のレスポンスボディの形状は、メソッドの結果型によって記述されます。
`HTTP` 関数は、オプションで結果型のアトリビュートを使用して、レスポンスヘッダーを定義できます。
レスポンスヘッダーの定義に明示的に使用されていない結果型のアトリビュートは、レスポンスボディのフィールドを暗黙的に定義します。
ほとんどの場合、ヘッダーに割り当てられるアトリビュートはごく少ないので、これにより、ボディを定義するためにすべての結果型のアトリビュートを繰り返す必要が軽減されます。

レスポンスボディは、`Body` 関数を使用して明示的に記述することもできます。
この関数は、リクエストボディを記述するために使用される場合と同じように機能します：
結果型のアトリビュートのリストが与えられるかもしれません、その場合、ボディの形状はオブジェクトになります。
もしくは特定のアトリビュートの名前で指定されているかもしれません、その場合、レスポンスボディの形状はアトリビュートの型によって決まります。

Assuming the following type definition:

```go
var Account = Type("Account", func() {
    Attribute("name", String, "Name of account.")
})
```

and the following method design:

```go
Method("index", func() {
    Description("Index all accounts")
    Payload(ListAccounts)
    Result(func() {
        Attribute("marker", String, "Pagination marker")
        Attribute("accounts", CollectionOf(Account), "list of accounts")
    })
    HTTP(func() {
        GET("")
        Response(StatusOK, func() {
            Header("marker")
            Body("accounts")
        })
    })
})
```

"index" メソッドに送信されるリクエストの HTTP レスポンスボディは、`[{"name":"foo"},{"name":"bar"}]` の形式です。
同じ例ですが、レスポンスボディを定義する行（`Body("accounts")`）を削除すると次の形式のレスポンスボディが生成されます：
`{"accounts":[{"name":"foo"},{"name":"bar"}]}` これは、レスポンスボディの形状が、
定義済みヘッダーに使用されない結果型のすべてのアトリビュートを含むオブジェクトになったためです（`accounts` のみが残っているので）。

## データ型

Goaは、プリミティブ型、配列、マップ、およびオブジェクト型をサポートしています。

以下の表に、サポートされている **基本** 型と、生成された HTTP および gRPC トランスポートコードでのそれらの表現を示します。

|   基本型   |      HTTP     |   gRPC    |
|-----------|---------------|-----------|
| `Boolean` |   `bool`      |  `bool`   |
| `Int`     |   `int`       |  `sint32` |
| `Int32`   |   `int32`     |  `sint32` |
| `Int64`   |   `int64`     |  `sint64` |
| `UInt`    |   `uint`      |  `uint32` |
| `UInt32`  |   `uint32`    |  `uint32` |
| `UInt64`  |   `uint64`    |  `uint64` |
| `Float32` |   `float32`   |  `float`  |
| `Float64` |   `float64`   |  `double` |
| `String`  |   `string`    |  `string` |
| `Bytes`   |   `[]byte`    |  `bytes`  |
| `Any`     | `interface{}` |     *     |
 \* - 非対応


**ユーザー定義型**は [Type](https://pkg.go.dev/goa.design/goa/v3/dsl#Type) または
[ResultType](https://pkg.go.dev/goa.design/goa/v3/dsl#ResultType) を使用して Goa で定義できます。
ResultType は （Typeとは違って）ビューのセットも定義する型です。
各ビューは、結果型のインスタンスを Marshal するときにレンダリングされるアトリビュート（フィールド）を列挙します。
たとえば、HTTP API は、エンティティのコレクションを列挙するエンドポイントと、特定のエンティティを取得するエンドポイントを定義できます。
特定のエンティティを返すときに、すべてのフィールドを保持しながら、リスト内でマーシャリングされるフィールドの数を制限することが望ましい場合があります。
ビューを使用すると、両方のシナリオをサポートする単一の結果型を定義することが出来ます。
ビューは結果型のレンダリングにのみ適用されるため、メソッドペイロードでは意味がないことに注意してください。
型はペイロードと結果の両方で使用できますが、ResultType は結果でのみ使用する必要があります。

**マップ** は [MapOf](https://pkg.go.dev/goa.design/goa/v3/dsl#MapOf) で定義できます. 
構文は `MapOf(<KeyType>, <ElemType>)` の形式です。ここで、 `<KeyType>` は
基本型、配列、ユーザー型で、`<ElemType>` は基本型、配列、ユーザー型もしくはマップが利用できます。
マップ型は HTTP トランスポートでは、Go の `map` として、
gRPC トランスポートでは、プロトコルバッファの [map](https://developers.google.com/protocol-buffers/docs/proto3#maps) 
として表されます。
ただし、プロトコルバッファでは、（float や byte を除く）基本型のみをマップのキーとして許容することに注意してください。


**配列** は2つの方法で定義できます：
* 任意の型を受け付け、型を返す [ArrayOf](https://pkg.go.dev/goa.design/goa/v3/dsl#ArrayOf)
* 結果型のみを受け付け、結果型を返す [CollectionOf](https://pkg.go.dev/goa.design/goa/v3/dsl#CollectionOf)

`CollectionOf` によって返される結果型には、引数として指定された結果型とおなじビューが含まれます。
各ビューは、各要素が対応する要素のビューによって投影された配列を単純にレンダリングします。

## トランスポートからサービス への型のマッピング

以下のセクションでは、トランスポート固有のリクエストとレスポンスが、
トランスポートに依存しないペイロードと結果型にどのようにマップされるかについて説明します。

### ペイロードからリクエストへのマッピング


[Payload](https://pkg.go.dev/goa.design/goa/v3/dsl#Payload) 関数は、
サービスメソッドの引数として指定されたデータの形状を記述します。
`HTTP` および `GRPC` 関数は、受信リクエストからペイロードを構築する方法（サーバー側）と、ペイロードからリクエストを構築する方法（クライアント側）を定義します。

**HTTP** の場合：

* [Param](https://pkg.go.dev/goa.design/goa/v3/dsl#Param) 関数はパスまたはクエリ文字列パラメータからロードされる値を定義します。
* [Header](https://pkg.go.dev/goa.design/goa/v3/dsl#Header) 関数は HTTP ヘッダからロードされる値を定義します。
* [Body](https://pkg.go.dev/goa.design/goa/v3/dsl#Body) 関数はリクエストボディからロードされる値を定義します。

デフォルトでは、ペイロードアトリビュートは HTTP リクエストボディにマップされます。
ペイロードの型が基本型、配列型、マップ型のとき、次のような制限が適用されます：

* パスパラメータやヘッダを定義に使用できるのは `基本型` と `配列型` だけです。
`配列型` は基本型を使用して要素を定義する必要があります。
* クエリ文字列パラメータの定義に使用できるのは `基本型`、`配列型`、`マップ型` だけです。
`配列型` と `マップ型` は基本型を使用して要素を定義するの必要があります。

**gRPC** の場合：

* [Message](https://pkg.go.dev/goa.design/goa/v3/dsl#Message) 関数は gRPC メッセージからロードされた値を定義します。
* [Metadata](https://pkg.go.dev/goa.design/goa/v3/dsl#Metadata) 関数は gRPC リクエスト[メタデータ](https://grpc.io/docs/guides/concepts.html#metadata)からロードされた値を定義します。

デフォルトでは、ペイロードアトリビュートは gRPC メッセージにマッピングされます。 
ペイロードの型が基本型、配列、マップの場合、次のような制限が適用されます：

* gRPC メタデータの定義に使用できるのは、`基本型` もしくは `配列型` だけです。

### 結果からレスポンスへのマッピング

[Result](https://pkg.go.dev/goa.design/goa/v3/dsl#Result) 関数は
サービスメソッドの返値となるデータの形状を記述します。
 `HTTP` および `GRPC` 関数は、結果型からのレスポンスの構築方法（サーバー側）と、
 レスポンスからから結果の構築方法（クライアント側）を定義します。

**HTTP** の場合：

* [Header](https://pkg.go.dev/goa.design/goa/v3/dsl#Header) 関数は HTTPヘッダからロードされる値を定義します。
* [Body](https://pkg.go.dev/goa.design/goa/v3/dsl#Body) 関数はレスポンスボディからロードされる値を定義します。

デフォルトでは、結果のアトリビュートは HTTP レスポンスボディにマッピングされます。
結果の型が基本型、配列、マップの場合、次のような制限が適用されます：

* レスポンスヘッダーの定義には、`基本型` または `配列型` のみを使用できます。
`配列型` は、基本型を使用して要素を定義する必要があります。

**gRPC** の場合：

* [Message](https://pkg.go.dev/goa.design/goa/v3/dsl#Message) 関数は gRPC メッセージからロードされる値を定義します。
* [Headers](https://pkg.go.dev/goa.design/goa/v3/dsl#Headers) 関数は gRPC ヘッダーメタデータからロードされる値を定義します。
* [Trailers](https://pkg.go.dev/goa.design/goa/v3/dsl#Trailers) 関数は gRPC トレーラーメタデータからロードされる値を定義します。

デフォルトでは、結果のアトリビュートは gRPC メッセージにマッピングされます。 
結果の型が基本型、配列、マップの場合、次のような制限が適用されます：

* gRPC ヘッダー/トレーラーメタデータの定義には、`基本型`、`配列型` のみを使用できます。
