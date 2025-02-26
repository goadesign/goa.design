---
title: "データモデリング"
linkTitle: "データモデリング"
weight: 1
description: >
  Goaの包括的な型システムを使用してサービスのデータ構造を定義します。バリデーションルールと制約を通じてデータの整合性を確保しながら、ドメインモデルに合致する型定義を作成します。
---

Goaは、ドメインを正確かつ明確にモデル化できる強力な型システムを提供します。
シンプルなプリミティブ型から複雑なネスト構造まで、DSLはデータの関係、制約、
バリデーションルールを自然な方法で表現する手段を提供します。

## 基本型

Goaの型システムの基礎は、プリミティブ型と基本的な型定義から始まります。これらの
構成要素により、シンプルながらも表現力豊かなデータ構造を作成できます。

### プリミティブ型
Goaは、すべてのデータモデリングの基礎となる豊富な組み込みプリミティブ型を提供します：

```go
Boolean  // JSONブール値
Int      // 符号付き整数
Int32    // 符号付き32ビット整数
Int64    // 符号付き64ビット整数
UInt     // 符号なし整数
UInt32   // 符号なし32ビット整数
UInt64   // 符号なし64ビット整数
Float32  // 32ビット浮動小数点数
Float64  // 64ビット浮動小数点数
String   // JSON文字列
Bytes    // バイナリデータ
Any      // 任意のJSON値
```

### 型定義
Type DSL関数は、構造化されたデータ型を定義する主要な方法です。属性、バリデーション、
ドキュメントをサポートします：

```go
var Person = Type("Person", func() {
    Description("人物")
    
    // 基本的な属性
    Attribute("name", String)
    
    // バリデーション付きの属性
    Attribute("age", Int32, func() {
        Minimum(0)
        Maximum(120)
    })
    
    // 必須フィールド
    Required("name", "age")
})
```

## 複合型

実世界のドメインをモデル化する際には、より洗練されたデータ構造が必要になることが
よくあります。Goaはコレクションとネスト型に対する包括的なサポートを提供します。

### 配列
配列を使用すると、任意の型の順序付きコレクションをオプションのバリデーションルール
付きで定義できます：

```go
var Names = ArrayOf(String, func() {
    // 配列要素のバリデーション
    MinLength(1)
    MaxLength(10)
})

var Team = Type("Team", func() {
    Attribute("members", ArrayOf(Person))
})
```

### マップ
マップは、キーと値の両方に対する型安全性とバリデーションを備えたキーと値の関連付けを
提供します：

```go
var Config = MapOf(String, Int32, func() {
    // キーのバリデーション
    Key(func() {
        Pattern("^[a-z]+$")
    })
    // 値のバリデーション
    Elem(func() {
        Minimum(0)
    })
})
```

## 型の合成

Goaは、コードの再利用と関心事の明確な分離を可能にする洗練された型の合成パターンを
サポートします。

### Reference
Referenceを使用すると、別の型から属性のデフォルトプロパティを設定できます。現在の型の
属性が参照される型の属性と同じ名前を持つ場合、参照される属性のプロパティを継承します。
複数の参照を指定でき、プロパティは出現順に検索されます：

```go
var Employee = Type("Employee", func() {
    // Personから属性定義を再利用
    Reference(Person)
    Attribute("name") // name属性を再定義する必要なし
    Attribute("age")  // age属性を再定義する必要なし

    // 新しい属性を追加
    Attribute("employeeID", String, func() {
        Format(FormatUUID)
    })
})
```

### Extend

`Extend`は既存の型に基づいて新しい型を作成し、階層的な関係のモデル化に最適です。
`Reference`とは異なり、`Extend`は自動的にベース型からすべての属性を継承します。

```go
var Manager = Type("Manager", func() {
    // ベース型を拡張
    Extend(Employee)
    
    // マネージャー固有のフィールドを追加
    Attribute("reports", ArrayOf(Employee))
})
```

## バリデーションルール

Goaは、データの整合性を確保しビジネスルールを強制するための包括的なバリデーション
機能を提供します。以下がGoaで利用可能な主要なバリデーションルールです：

### 文字列のバリデーション
- `Pattern(regex)` - 正規表現に対するバリデーション
- `MinLength(n)` - 最小文字列長
- `MaxLength(n)` - 最大文字列長
- `Format(format)` - 事前定義されたフォーマット（メール、URI等）に対するバリデーション

### 数値のバリデーション
- `Minimum(n)` - 最小値（含む）
- `Maximum(n)` - 最大値（含む）
- `ExclusiveMinimum(n)` - 最小値（含まない）
- `ExclusiveMaximum(n)` - 最大値（含まない）

### 配列とマップのバリデーション
- `MinLength(n)` - 最小要素数
- `MaxLength(n)` - 最大要素数

### オブジェクトのバリデーション
- `Required("field1", "field2")` - 必須フィールド

### 汎用バリデーション
- `Enum(value1, value2)` - 列挙された値に制限

さらに、配列とマップの要素は、属性と同じルールを使用してバリデーションできます。

バリデーションルールを組み合わせて、包括的なバリデーションロジックを作成できます：

```go
var UserProfile = Type("UserProfile", func() {
    Attribute("username", String, func() {
        Pattern("^[a-z0-9]+$") // 正規表現パターン
        MinLength(3)           // 最小文字列長
        MaxLength(50)          // 最大文字列長
    })
    
    Attribute("email", String, func() {
        Format(FormatEmail)    // 組み込みフォーマット
    })
    
    Attribute("age", Int32, func() {
        Minimum(18)            // 最小値
        ExclusiveMaximum(150)  // 最大値（含まない）
    })
    
    Attribute("tags", ArrayOf(String, func() { Enum("tag1", "tag2", "tag3") }), func() {
                              // 配列要素の列挙値
        MinLength(1)          // 最小配列長
        MaxLength(10)         // 最大配列長
    })
    
    Attribute("settings", MapOf(String, String), func() {
        MaxLength(20)         // 最大マップ長
    })

    Required("username", "email", "age") // 必須フィールド
})
```

## カスタム型

ドメイン固有のフォーマットとバリデーションルールをカプセル化する再利用可能な
カスタム型を作成します：

```go
// カスタムフォーマットを定義
var UUID = Type("UUID", String, func() {
    Format(FormatUUID)
    Description("RFC 4122 UUID")
})

// カスタム型を使用
var Resource = Type("Resource", func() {
    Attribute("id", UUID)
    Attribute("name", String)
})
```

詳細については[Type DSL](https://pkg.go.dev/goa.design/goa/v3/dsl#Type)を参照してください。

## 組み込みフォーマット

Goaには、一般的なデータパターン用の包括的な事前定義フォーマットが含まれています。
これらのフォーマットは自動バリデーションと明確な意味を提供します：

- `FormatDate` - RFC3339日付値
- `FormatDateTime` - RFC3339日時値
- `FormatUUID` - RFC4122 UUID値
- `FormatEmail` - RFC5322メールアドレス
- `FormatHostname` - RFC1035インターネットホスト名
- `FormatIPv4` - RFC2373 IPv4アドレス値
- `FormatIPv6` - RFC2373 IPv6アドレス値
- `FormatIP` - RFC2373 IPv4またはIPv6アドレス値
- `FormatURI` - RFC3986 URI値
- `FormatMAC` - IEEE 802 MAC-48、EUI-48またはEUI-64 MACアドレス値
- `FormatCIDR` - RFC4632およびRFC4291 CIDR表記IPアドレス値
- `FormatRegexp` - RE2で受け入れられる正規表現構文
- `FormatJSON` - JSONテキスト
- `FormatRFC1123` - RFC1123日時値

## Attribute vs Field DSL

Goaは型の属性を定義する2つの同等の方法を提供します：`Attribute`と`Field`です。
主な違いは、`Field`がgRPCメッセージのフィールド番号に使用される追加のタグパラメータを
取ることです。

### Attribute DSL
gRPCサポートが不要な場合や、gRPCメッセージで使用されない型を定義する場合に使用します：

```go
var Person = Type("Person", func() {
    Attribute("name", String)
    Attribute("age", Int32)
})
```

### Field DSL
gRPCメッセージで使用される型を定義する場合に使用します。最初の引数はフィールド番号
タグです：

```go
var Person = Type("Person", func() {
    Field(1, "name", String)
    Field(2, "age", Int32)
})
``` 