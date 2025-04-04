---
title: "HTTPトランスポートマッピング"
linkTitle: "HTTPマッピング"
weight: 4
description: >
  サービスメソッドをHTTPエンドポイントにマッピングする方法を定義します。ペイロードをHTTPリクエストとレスポンスにマッピングする方法を学びます。
---

このセクションでは、[HTTP](https://pkg.go.dev/goa.design/goa/v3/dsl#HTTP)トランスポート
DSLを使用してサービスメソッドのペイロードをHTTPエンドポイントにマッピングする方法を
説明します。ペイロード型はサービスメソッドに引数として渡されるデータの形状を定義し、
HTTP式は受信したHTTPリクエストのさまざまな部分からこのデータを構築する方法を指定します。

## HTTPリクエストの状態

HTTPリクエストは4つの部分で構成されています：

1. **URLパスパラメータ**  
   例えば、ルート`/bottle/{id}`では、`{id}`がパスパラメータです。

2. **URLクエリ文字列パラメータ**

3. **HTTPヘッダー**

4. **HTTPリクエストボディ**

[HTTP式](https://goa.design/reference/dsl/http/)は、生成されたコードがリクエストを
期待されるペイロードにデコードする方法を導きます：

- **`Param`式：** パスまたはクエリ文字列パラメータから値を読み込みます。
- **`Header`式：** HTTPヘッダーから値を読み込みます。
- **`Body`式：** リクエストボディから値を読み込みます。

次のセクションでは、これらの式について詳しく説明します。

---

## オブジェクト型以外のペイロードのマッピング

ペイロード型がプリミティブ（例：`String`、整数型、`Float`、`Boolean`、または`Bytes`）、
配列、またはマップの場合、値は以下の順序で最初に定義された要素から読み込まれます：

1. 最初のURLパスパラメータ（定義されている場合）
2. それ以外の場合、最初のクエリ文字列パラメータ（定義されている場合）
3. それ以外の場合、最初のヘッダー（定義されている場合）
4. それ以外の場合、リクエストボディ

### 制限事項

- **パスパラメータとヘッダー：** プリミティブ型またはプリミティブの配列を使用して定義する必要があります。
- **クエリ文字列パラメータ：** プリミティブ、配列、またはマップ（要素としてプリミティブを持つ）が可能です。
- **パスとヘッダーの配列：** カンマ区切りの値として表現されます。

### 例

#### 1. シンプルな「IDによる取得」（整数ID）

```go
Method("show", func() {
    Payload(Int)
    HTTP(func() {
        GET("/{id}")
    })
})
```

| 生成されるメソッド | リクエスト例 | 対応する呼び出し |
| ---------------- | ----------- | -------------- |
| `Show(int)`      | `GET /1`    | `Show(1)`      |

#### 2. 一括「IDによる削除」（文字列ID）

```go
Method("delete", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        DELETE("/{ids}")
    })
})
```

| 生成されるメソッド     | リクエスト例    | 対応する呼び出し                     |
| -------------------- | -------------- | ---------------------------------- |
| `Delete([]string)`   | `DELETE /a,b`  | `Delete([]string{"a", "b"})`      |

> **注意：** パスパラメータの実際の名前は重要ではありません。

#### 3. クエリ文字列の配列

```go
Method("list", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        GET("")
        Param("filter")
    })
})
```

| 生成されるメソッド   | リクエスト例              | 対応する呼び出し                  |
| ------------------ | ------------------------ | -------------------------------- |
| `List([]string)`   | `GET /?filter=a&filter=b`| `List([]string{"a", "b"})`      |

#### 4. ヘッダーの浮動小数点数

```go
Method("list", func() {
    Payload(Float32)
    HTTP(func() {
        GET("")
        Header("version")
    })
})
```

| 生成されるメソッド   | リクエスト例                      | 対応する呼び出し |
| ------------------ | -------------------------------- | --------------- |
| `List(float32)`    | `GET /` とヘッダー `version=1.0` | `List(1.0)`    |

#### 5. ボディのマップ

```go
Method("create", func() {
    Payload(MapOf(String, Int))
    HTTP(func() {
        POST("")
    })
})
```

| 生成されるメソッド          | リクエスト例                    | 対応する呼び出し                                      |
| ------------------------- | ------------------------------ | -------------------------------------------------- |
| `Create(map[string]int)`  | `POST / {"a": 1, "b": 2}`     | `Create(map[string]int{"a": 1, "b": 2})`           |

---

## オブジェクト型ペイロードのマッピング

オブジェクトとして定義されたペイロード（複数の属性を持つ）の場合、HTTP式を使用して
各属性がどこから読み込まれるかを指定できます。一部の属性はURLパスから、他の属性は
クエリパラメータ、ヘッダー、またはボディから取得できます。同じ型の制限が適用されます：

- **パスとヘッダーの属性：** プリミティブまたはプリミティブの配列である必要があります。
- **クエリ文字列の属性：** プリミティブ、配列、またはマップ（要素としてプリミティブを持つ）が可能です。

### `Body`式の使用

`Body`式は、どのペイロード属性がHTTPリクエストボディに対応するかを指定します。`Body`式を
省略した場合、パス、クエリ、またはヘッダーにマッピングされていない属性は自動的にボディ
から取得されると見なされます。

#### 例：パスとボディの混在

以下のペイロードの場合：

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
})
```

以下のHTTP式は、`id`属性をパスパラメータにマッピングし、残りの属性をリクエストボディに
マッピングします：

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
    HTTP(func() {
        POST("/{id}")
    })
})
```

| 生成されるメソッド         | リクエスト例                    | 対応する呼び出し                                  |
| ------------------------ | ------------------------------ | ----------------------------------------------- |
| `Create(*CreatePayload)` | `POST /1 {"name": "a", "age": 2}` | `Create(&CreatePayload{ID: 1, Name: "a", Age: 2})` |

### オブジェクト型以外での`Body`の使用

`Body`式は、リクエストボディがオブジェクトでない場合（例えば、配列やマップ）もサポート
します。

#### 例：ボディのマップ

以下のペイロードを考えてみましょう：

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
})
```

以下のHTTP式では、`rates`属性はボディから直接読み込まれます：

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
    HTTP(func() {
        PUT("/{id}")
        Body("rates")
    })
})
```

| 生成されるメソッド         | リクエスト例                  | 対応する呼び出し                                                         |
| ------------------------ | ---------------------------- | ---------------------------------------------------------------------- |
| `Rate(*RatePayload)`    | `PUT /1 {"a": 0.5, "b": 1.0}` | `Rate(&RatePayload{ID: 1, Rates: map[string]float64{"a": 0.5, "b": 1.0}})` |

`Body`式がない場合、リクエストボディは`rates`という名前の単一のフィールドを持つ
オブジェクトとして解釈されます。

---

## HTTP要素名と属性名のマッピング

`Param`、`Header`、`Body`式を使用すると、HTTP要素名（例：クエリ文字列キー、ヘッダー名、
またはボディフィールド名）をペイロード属性名にマッピングできます。マッピング構文は
以下の通りです：

```go
"属性名:要素名"
```

例えば：

```go
Header("version:X-Api-Version")
```

この場合、`version`属性は`X-Api-Version` HTTPヘッダーから読み込まれます。

### リクエストボディのフィールドのマッピング

`Body`式は、ボディ属性とそれに対応するHTTPフィールド名を明示的にリストする代替構文も
サポートしています。これは、受信フィールド名とペイロード属性名の間のマッピングを
指定するのに便利です。 