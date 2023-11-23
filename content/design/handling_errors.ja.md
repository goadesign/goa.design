+++
title = "エラー処理"
weight = 3

[menu.main]
name = "エラー処理"
parent = "design"
+++

Goa を使えば、サービスメソッドが返す可能性のあるエラーを記述することが可能です。
Goa はこの記述からコードとドキュメントの両方を生成することができます。
このコードは、トランスポート固有の Marshal および Unmarshal のロジックを提供します。
エラーは、名前、型（基本型またはユーザー定義型であるかもしれません）、および記述（コメントとドキュメントの生成に使用されます）を持ちます。
このドキュメントでは、Goa デザインでエラーを定義する方法と、生成されたコードを活用してサービスメソッドからエラーを返す方法について説明します。

## デザイン

Goa DSL では、[Error](https://pkg.go.dev/goa.design/goa/v3/dsl#Error) 式を使用して、メソッドおよびサービス全体でエラー結果を定義できます：

```go
var _ = Service("divider", func() {
    // "DivByZero" はサービスレベルで定義されているため、
    // そのため、"divide" と "integral_divide" の両方で返される可能性があります。
    Error("DivByZero", func() {
        Description("DivByZero is the error returned by the service methods when the right operand is 0.")
    })

    Method("integral_divide", func() {
        // "HasRemainder" エラーはメソッドレベルで定義されているため、
        // "integral_divide" に固有のエラーです。
        Error("HasRemainder", func() {
            Description("HasRemainder is the error returned when an integer division has a remainder.")
        })
        // ...
    })

    Method("divide", func() {
        // ...
    })
})
```
この例では、`DivByZero` エラーと `HasRemainder` エラーの両方で、
デフォルトのエラー型 [ErrorResult](https://pkg.go.dev/goa.design/goa/v3/expr#pkg-variables) が使用されます。 
この型は、次のフィールドを定義します：

* `Name` はエラーの名前です。 生成されたコードは、レスポンスエンコード中にデザインで定義された名前つきフィールドを初期化します。
* `ID` は、エラーの特定のインスタンスの一意な識別子です。
  サービスログやトレースをともなうようなユーザーレポートと関連付けることができるように、この ID が備わっています。
* `Message` はエラーのメッセージです。
* `Temporary` はエラーが一時的なものであるかどうかを示します。
* `Timeout` はエラーがタイムアウトによるものであるかどうかを示します。
* `Fault` はエラーがサーバ側の障害によるもであるかどうかを示します。

DSL を使用すると、エラーが一時的な状態、かつ/またはタイムアウト、またはサーバー側の障害のいずれかであるかを指定できます。

```go
Error("network_failure", func() {
    Temporary()
})

Error("timeout"), func() {
    Timeout()
})

Error("remote_timeout", func() {
    Temporary()
    Timeout()
})

Error("internal_error", func() {
    Fault()
})
```
生成されたコードは、エラーレスポンスをエンコードするときに、`Temporary`、`Timeout`、`Fault` フィールドで `ErrorResult` を適切に初期化します。

## レスポンスのデザイン

[Response](https://pkg.go.dev/goa.design/goa/v3/dsl#Response) 関数を使用すると、
特定のエラーに関連付けられた HTTP/gRPC レスポンスを定義できます。

```go
var _ = Service("divider", func() {
    Error("DivByZero")
    HTTP(func() {
        // "DivByZero" エラーに HTTP ステータスコード 400 Bad Request を使う。 
        Response("DivByZero", StatusBadRequest)
    })
    GRPC(func() {
        // "DivByZero" エラーに gRPC ステータスコード "InvalidArgument" を使う。 
        Response("DivByZero", CodeInvalidArgument)
    })

    Method("integral_divide", func() {
        Error("HasRemainder")
        HTTP(func() {
            Response("HasRemainder", StatusExpectationFailed)
            // ...
        })
        GRPC(func() {
          Response("HasRemainder", CodeUnknown)
        })
    })
    // ...
})
```

## エラーを返す

上で与えられた除算機のサービスのデザインでは、Goa は `MakeDivByZero` と `MakeHasRemainder` に対応したエラーを構築する2つのヘルパー関数を生成します。
これらの関数は、引数として Go のエラーを受け入れ、ビジネスロジックのエラーと特定のエラー結果をマップするのに便利です。

ここで、`integral_divide` の実装がどのようなものになるのか、例を示します：

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *dividersvc.IntOperands) (int, error) {
    if p.B == 0 {
        // 生成された関数を利用してエラー結果を作成する
        return 0, dividersvc.MakeDivByZero(fmt.Errorf("right operand cannot be 0"))
    }
    if p.A%p.B != 0 {
        return 0, dividersvc.MakeHasRemainder(fmt.Errorf("remainder is %d", p.A%p.B))
    }

    return p.A / p.B, nil
}
```

以上です！
これにより、goa はメッセージフィールドを初期化するために提供されたエラーを使用して `ErrorResult` を初期化することを知っていますし、
他のすべてのフィールドをデザインで提供された情報で初期化します。

生成されたトランスポートコードは、Response DSL で定義されている適切な HTTP/gRPC ステータスコードも書き込みます。

確認するために生成されたコマンドラインツールを利用してみます：

```bash
./dividercli -v divider integer-divide -a 1 -b 2
> GET http://localhost:8080/idiv/1/2
< 417 Expectation Failed
< Content-Length: 68
< Content-Type: application/json
< Date: Thu, 22 Mar 2018 01:34:33 GMT
{"name":"HasRemainder","id":"dlqvenWL","message":"remainder is 1"}
```

## カスタムエラー型を使う

`Error` DSL では、エラー結果の型を指定できるので、`ErrorResult` で構成されるデフォルトは上書きされます。
エラー結果の形状を定義するために、任意の型を使用できます。
エラー結果の型として文字列を使用した例を次に示します：

```go
Error("NotFound", String, "NotFound is the error returned when there is no bottle with the given ID.")
```

型が明示的に定義されている場合、どのように説明をインラインで定義できるかに注意してください。
型は `ErrorResult` である場合があり、この場合も説明をインラインで定義できます。

カスタムエラーの結果型を使用する際に注意すべき注意点がいくつかあります：

* `Temporary`、`Timeout`、`Fault` の各式は、`ErrorResult` 構造体の対応するフィールド値を設定しないため、この場合のコード生成には影響しません。
* カスタムタイプがユーザー定義型であり、同一メソッドで複数のエラーを定義するために使用される場合、
   goa にどのアトリビュートにエラー名が含まれているかを通知する必要があります。
   このアトリビュートの値は、適切なエンコードの詳細（HTTP ステータスコードなど）を推測するために、
   エンコードおよびデコードコードによってデザインで定義されているエラーの名前と比較されます。
   アトリビュートは特別な `struct:error:name` メタタグを使用して識別され、文字列型で、かつ必須要素である必要があります。
   
```go
var InsertConflict = ResultType("application/vnd.service.insertconflict", func() {
    Description("InsertConflict is the type of the error values returned when insertion fails because of a conflict")
    Attributes(func() {
        Attribute("conflict_value", String)
        Attribute("name", String, "name of error used by goa to encode response", func() {
            Meta("struct:error:name")
        })
        Required("conflict_value", "name")
    })
    View("default", func() {
        Attribute("conflict_value")
        // 注： error_name は default ビューで省略されます。
        // この例では、error_name はエラーの名前を含むフィールドを識別するために使用されるアトリビュートであり、
        // クライアントに送信されるレスポンスではエンコードされません。
    })
})
```

* 生成されたコードはエラー構造体の `ErrorName` 関数を定義するため、カスタムエラー型の定義に使用されるユーザー型は `error_name` 
   という名前の属性を持つことはできません。
