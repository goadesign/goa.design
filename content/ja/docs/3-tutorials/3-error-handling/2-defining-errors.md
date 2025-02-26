---
title: エラーの定義
linkTitle: エラーの定義
weight: 2
description: "GoaのDSLを使用したサービスレベルおよびメソッドレベルのエラー定義の技法を習得します。カスタムエラータイプと再利用可能なエラー定義を含みます。"
---

Goaは、サービス設計内でエラーを定義するための柔軟で強力な方法を提供します。
Goaのドメイン固有言語（DSL）を活用することで、サービスレベルとメソッドレベルの
両方のエラーを指定し、エラータイプをカスタマイズし、APIがHTTPやgRPCなどの
異なるトランスポート間で障害を明確かつ一貫して伝達することを保証できます。

## サービスレベルのエラー

サービスレベルのエラーは、サービススコープで定義され、サービス内の任意の
メソッドから返すことができます。これは、複数のメソッドで共通するエラーに
便利です。

### 例

```go
var _ = Service("divider", func() {
    // "DivByZero"エラーはサービスレベルで定義され、
    // したがって"divide"と"integral_divide"の両方から返すことができます。
    Error("DivByZero", func() {
        Description("DivByZeroは、右オペランドが0の場合にサービスメソッドが返すエラーです。")
    })

    Method("integral_divide", func() {
        // メソッド固有の定義...
    })

    Method("divide", func() {
        // メソッド固有の定義...
    })
})
```

この例では、`divider`サービス内の任意のメソッドで使用できる`DivByZero`という
サービスレベルのエラーを定義しています。これは、この場合のゼロによる除算操作
のような、複数のメソッドで発生する可能性のある共通のエラー条件に特に
有用です。

## メソッドレベルのエラー

メソッドレベルのエラーは、特定のメソッドのスコープ内で定義され、そのメソッド
にのみ適用されます。これにより、個々の操作に合わせてより細かいエラーハンドリング
が可能になります。

### 例

```go
var _ = Service("divider", func() {
    Method("integral_divide", func() {
        // "HasRemainder"エラーはメソッドレベルで定義され、
        // したがって"integral_divide"に固有のものです。
        Error("HasRemainder", func() {
            Description("HasRemainderは、整数除算に余りがある場合に返されるエラーです。")
        })
        // 追加のメソッド定義...
    })

    Method("divide", func() {
        // メソッド固有の定義...
    })
})
```

この例では、`integral_divide`メソッドに固有の`HasRemainder`というメソッド
レベルのエラーを定義しています。このエラーは、除算操作に余りがある場合に
使用され、整数除算操作に特に関連します。

## 再利用可能なエラー定義

Goaでは、複数のサービスやメソッドでエラー定義を再利用できます。これは、
APIの複数の部分で使用される共通のエラーを定義する場合に特に便利です。
このような定義は`API` DSLに記述する必要があります：

### 例

```go
var _ = API("example", func() {
    Error("NotFound", func() {
        Description("リソースがシステム内で見つかりませんでした。")
    })
    HTTP(func() {
        Response("NotFound", StatusNotFound)
    })
    GRPC(func() {
        Response("NotFound", CodeNotFound)
    })
})

var _ = Service("example", func() {
    Method("get", func() {
        Payload(func() {
            Field(1, "id", String, "取得するコンサートのID。")
        })
        Result(Concert)
        Error("NotFound")
        HTTP(func() {
            GET("/concerts/{id}")
        })
        GRPC(func() {})
    })
})
```

この例では、`example`サービス内の任意のメソッドで使用できる`NotFound`という
再利用可能なエラーを定義しています。このエラーは`API` DSLで定義され、
したがってAPI内のすべてのサービスとメソッドで利用可能です。`NotFound`エラーは
HTTPステータスコード`404`とgRPCステータスコード`NotFound`にマッピングされ、
このマッピングは`API` DSLで行われ、`Service`や`Method` DSLで繰り返す必要は
ありません。

## カスタムエラータイプと説明

Goaのエラー DSLは、エラーの定義と文書化を行うためのいくつかの方法を提供します。
説明、一時的/永続的なステータス、さらにはカスタムレスポンス構造を定義することが
できます。

### 基本的なエラー定義

最も単純な形式のエラー定義には、名前と説明が含まれます：

```go
Error("NotFound", func() {
    Description("リソースがシステム内で見つかりませんでした。")
})
```

上記の定義は以下と同等です：

```go
Error("NotFound", ErrorResult, "リソースがシステム内で見つかりませんでした。")
```

エラーのデフォルトタイプは`ErrorResult`で、生成されたコードでは
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError)タイプに
マッピングされます。

### 一時的、タイムアウト、フォールト

エラーが一時的なものか、タイムアウトか、フォールトか、またはこれらの組み合わせ
であるかを、`Temporary`、`Timeout`、`Fault`関数を使用して指定できます：

```go
Error("ServiceUnavailable", func() {
    Description("サービスは一時的に利用できません。")
    Temporary()
})

Error("RequestTimeout", func() {
    Description("リクエストがタイムアウトしました。")
    Timeout()
})

Error("InternalServerError", func() {
    Description("内部サーバーエラー。")
    Fault()
})
```

クライアントは、[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError)
オブジェクトから対応するフィールドを参照して、エラーが一時的なものか、
タイムアウトか、フォールトかを判断できます。

> 注：これは、ランタイムタイプが[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError)
> である`ErrorResult`エラーでのみサポートされています。

### カスタムエラータイプ

Goaでは、カスタムエラータイプの設計も簡単です。例えば：

```go
Error("ValidationError", DivByZero, "DivByZeroは、除数として0を使用した場合に返されるエラーです。")
```

この例では、`DivByZero`がファイルの他の場所で定義されたカスタムエラータイプ
であることを前提としています。例えば：

```go
var DivByZero = Type("DivByZero", func() {
    Field(1, "name", String, "エラーの名前。", func() {
        Meta("struct:error:name")
    })
    Field(2, "message", String, "エラーメッセージ。")
    Required("name", "message")
})
```

これらのエラー定義は、サービスレベルとメソッドレベルの両方で使用でき、
APIのエラーハンドリングの構造化に柔軟性を提供します。エラーDSLは、Goaの
コード生成と統合され、異なるトランスポートプロトコル間で一貫したエラー
レスポンスを生成します。

カスタムエラータイプの詳細については、[エラータイプ](../3-error-types)を
参照してください。

## まとめ

Goaでのエラーの定義は、サービス設計とシームレスに統合される簡単なプロセスです。
サービスレベルとメソッドレベルのエラー定義を利用し、デフォルトのErrorResult
タイプを活用するか、カスタムエラータイプを作成することで、APIが障害を適切に
処理し、クライアントに効果的に伝達することを保証できます。適切なエラー定義は、
サービスの堅牢性を高めるだけでなく、明確で一貫したエラーハンドリング
メカニズムを提供することで、開発者の体験も向上させます。 