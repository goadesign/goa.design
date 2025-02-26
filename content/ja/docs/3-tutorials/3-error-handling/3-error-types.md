---
title: "エラータイプ"
linkTitle: エラータイプ
weight: 3
description: "Goaのエラータイプシステムを探索します。デフォルトのErrorResultタイプと、より複雑なエラーシナリオのためのカスタムエラータイプの作成方法を含みます。"
---

Goaでは、デフォルトの`ErrorResult`タイプまたはカスタムの
ユーザー定義タイプを使用してエラーを定義できます。適切なエラータイプの
選択は、表現する必要のあるエラーの複雑さと特異性に依存します。

## デフォルトのエラータイプ（`ErrorResult`）

デフォルトでは、エラーは`ErrorResult`タイプを使用し、`Name`、`ID`、
`Message`、`Temporary`、`Timeout`、`Fault`などの標準フィールドが
含まれます。これにより、サービス全体で一貫したエラー構造が提供されます。

### 構造とフィールド

- **Name**: DSLで定義されたエラーの名前。
- **ID**: エラーの特定のインスタンスの一意の識別子。ログとトレースの相関に有用。
- **Message**: 説明的なエラーメッセージ。
- **Temporary**: エラーが一時的で、再試行により解決される可能性があるかを示す。
- **Timeout**: エラーがタイムアウトによって引き起こされたかを示す。
- **Fault**: エラーがサーバー側の障害によるものかを示す。

### 使用例

デフォルトの`ErrorResult`を使用してサービスレベルのエラーを定義：

```go
var _ = Service("divider", func() {
    Error("DivByZero", ErrorResult, "ゼロによる除算")
    Error("ServiceUnavailable", ErrorResult, "サービスは一時的に利用できません。", func() {
        Temporary()
    })
    // ...
})
```

この例では、`divider`サービス内の任意のメソッドから返すことができる2つの
サービスレベルのエラーを定義しています。`DivByZero`エラーはゼロによる除算
操作を表し、`ServiceUnavailable`エラーは一時的なサービス停止を示します。
両方のエラーはデフォルトの`ErrorResult`タイプを使用しますが、
`ServiceUnavailable`エラーは`Temporary()`関数を使用して一時的なものとして
マークされ、クライアントが操作を再試行できることを示します。

### ランタイム表現

生成されたコードは、`DivByZero`および`ServiceUnavailable`エラーのための
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError)
オブジェクトをインスタンス化する関数を定義します。これらの関数は、エラーの
適切なフィールドの設定を処理します：

```go
// MakeDivByZeroは、エラーからgoa.ServiceErrorを構築します。
func MakeDivByZero(err error) *goa.ServiceError {
    return goa.NewServiceError(err, "DivByZero", false, false, false)
}

// MakeServiceUnavailableは、エラーからgoa.ServiceErrorを構築します。
func MakeServiceUnavailable(err error) *goa.ServiceError {
    return goa.NewServiceError(err, "ServiceUnavailable", true, false, false)
}
```

クライアントは、サービスから返されたエラーを`ServiceError`タイプにキャストし、
`Temporary`、`Timeout`、`Fault`フィールドを使用してエラーの詳細を
確認できます。

## カスタムエラータイプ

より詳細なエラー情報のために、カスタムエラータイプを定義できます。これにより、
アプリケーションのニーズに特化した追加フィールドを含めることができます。

### カスタムエラータイプの作成

`Type`関数を使用してカスタムエラータイプを定義：

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZeroは、除数として0を使用した場合に返されるエラーです。")
    Field(1, "message", String, "ゼロによる除算のエラーメッセージ。")
    Field(2, "divisor", Int, "エラーの原因となった除数。")
    Required("message", "divisor")
})
```

### サービスでのカスタムエラータイプの使用

カスタムエラータイプをサービスメソッド内に統合：

```go
var _ = Service("divider", func() {
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        Result(func() {
            Field(1, "quotient", Int)
            Field(2, "remainder", Int)
            Required("quotient", "remainder")
        })
        Error("DivByZero", DivByZero, "ゼロによる除算")
        // 追加のメソッド定義...
    })
})
```

この例では、カスタム`DivByZero`タイプを使用する`DivByZero`という
メソッドレベルのエラーを定義しています。これにより、ゼロによる除算
シナリオに特化した詳細なエラー情報を提供でき、エラーメッセージと
エラーの原因となった実際の除数値の両方を含めることができます。

### カスタムエラータイプ使用時の注意点

- **エラーメタデータ**: 同じメソッド内で複数のエラーにカスタムタイプを
  使用する場合、`struct:error:name`メタデータを使用してエラー名を含む
  属性を指定する必要があります。これは、Goaがエラーを正しくその定義に
  マッピングするために不可欠です。

```go
var CustomError = Type("CustomError", func() {
    Field(1, "detail", String)
    Field(2, "name", String, func() {
        Meta("struct:error:name")
    })
    Required("detail", "name")
})
```

- **予約された属性**: カスタムエラータイプは、Goaがエラーの識別と
  シリアライゼーションのために内部的に使用するため、`error_name`という
  名前の属性を持つことはできません。 