---
title: "カスタマイズ"
linkTitle: "カスタマイズ"
weight: 7
description: "メタデータを使用してGoaのコード生成をカスタマイズおよび拡張する方法を学びます。"
---

## 概要

メタデータを使用すると、シンプルなタグを通じてコード生成を制御および
カスタマイズできます。`Meta`関数を使用して、デザイン要素にメタデータを
追加します。

### 基本的な型生成の制御

デフォルトでは、Goaはサービスメソッドで使用される型のみを生成します。デザイン
で型を定義しても、メソッドのパラメータや結果で参照されていない場合、Goaは
その型の生成をスキップします。

`"type:generate:force"`メタデータタグはこの動作をオーバーライドします。サービス
名を引数として取り、どのサービスがその型を生成されたコードに含めるべきかを
指定します。サービス名が提供されない場合、その型はすべてのサービスで生成
されます：

```go
var MyType = Type("MyType", func() {
    // 未使用でもservice1とservice2で型を強制的に生成
    Meta("type:generate:force", "service1", "service2")
    Attribute("name", String)
})

var OtherType = Type("OtherType", func() {
    // すべてのサービスで型を強制的に生成
    Meta("type:generate:force")
    Attribute("id", String)
})
```

### パッケージの構成

パッケージメタデータを使用して、型が生成される場所を制御できます。デフォルト
では、型はそれぞれのサービスパッケージで生成されますが、共有パッケージで
生成することもできます。これは、複数のサービスが同じGo構造体を扱う必要がある
場合、例えばビジネスロジックやデータアクセスコードを共有する場合に特に
便利です。型を共有パッケージで生成することで、サービス間で重複する型定義の
変換を避けることができます：

```go
var CommonType = Type("CommonType", func() {
    // 共有型パッケージで生成
    Meta("struct:pkg:path", "types")
    
    Attribute("id", String)
    Attribute("createdAt", String)
})
```

これにより、以下のような構造が作成されます：
```
project/
├── gen/
│   └── types/              # 共有型パッケージ
│       └── common_type.go # CommonTypeから生成
```

{{< alert title="重要な注意点" color="primary" >}}
- 関連するすべての型は同じパッケージパスを使用する必要があります
- 相互に参照する型は同じパッケージにある必要があります
- `types`パッケージは共有型によく使用されます
- 共有パッケージを使用することで、サービスがコードを共有する際に重複する型定義
  間のコピーや変換が不要になります
{{< /alert >}}

### フィールドのカスタマイズ

デフォルトでは、Goaは属性名をキャメルケースに変換してフィールド名を生成
します。例えば、"user_id"という名前の属性は、生成される構造体では"UserID"に
なります。

Goaはまた、デザイン型からGo型へのデフォルトの型マッピングも提供します：
- `String` → `string`
- `Int` → `int`
- `Int32` → `int32`
- `Int64` → `int64`
- `Float32` → `float32`
- `Float64` → `float64`
- `Boolean` → `bool`
- `Bytes` → `[]byte`
- `Any` → `any`

いくつかのメタデータタグを使用して、個々のフィールドをカスタマイズできます：

- `struct:field:name`: 生成されるフィールド名をオーバーライド
- `struct:field:type`: 生成されるフィールド型をオーバーライド
- `struct:tag:*`: カスタム構造体タグを追加

以下は、これらを組み合わせた例です：

```go
var Message = Type("Message", func() {
    Meta("struct:pkg:path", "types")
    
    Attribute("id", String, func() {
        // フィールド名をオーバーライド
        Meta("struct:field:name", "ID")
        // カスタムMessagePackタグを追加
        Meta("struct:tag:msgpack", "id,omitempty")
        // カスタム型で型をオーバーライド
        Meta("struct:field:type", "bison.ObjectId", "github.com/globalsign/mgo/bson", "bison")
    })
})
```

これにより、以下のようなGo構造体が生成されます：

```go
type Message struct {
    ID bison.ObjectId `msgpack:"id,omitempty"`
}
```

{{< alert title="重要な制限事項" color="primary" >}}
`struct:field:type`を使用する場合：
- オーバーライドされた型は、元の型と同じマーシャリング/アンマーシャリングを
  サポートする必要があります
- Goaは元の型定義に基づいてエンコーディング/デコーディングコードを生成します
- 互換性のないマーシャリング動作は実行時エラーを引き起こします
{{< /alert >}}

## Protocol Bufferのカスタマイズ

Protocol Buffersを扱う場合、いくつかのメタデータキーを使用して生成される
protobufコードをカスタマイズできます：

### メッセージ型名

`struct:name:proto`メタデータを使用すると、生成されるprotobufメッセージ名を
オーバーライドできます。デフォルトでは、Goaはデザインから型名を使用します：

```go
var MyType = Type("MyType", func() {
    // protobufメッセージ名を"CustomProtoType"に変更
    Meta("struct:name:proto", "CustomProtoType")
    
    Field(1, "name", String)
})
```

### フィールド型

`struct:field:proto`メタデータを使用すると、生成されるprotobufフィールド型を
オーバーライドできます。これは、よく知られたprotobuf型や他のprotoファイルの
型を扱う場合に特に便利です。最大4つの引数を受け入れます：

1. protobuf型名
2. （オプション）protoファイルのインポートパス
3. （オプション）Go型名
4. （オプション）Goパッケージのインポートパス

```go
var MyType = Type("MyType", func() {
    // シンプルな型のオーバーライド
    Field(1, "status", Int32, func() {
        // デフォルトのsint32からint32に変更
        Meta("struct:field:proto", "int32")
    })

    // Googleのよく知られたタイムスタンプ型を使用
    Field(2, "created_at", Timestamp, func() {
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",           // Proto型
            "google/protobuf/timestamp.proto",     // Protoインポート
            "Timestamp",                           // Go型
            "google.golang.org/protobuf/types/known/timestamppb") // Goインポート
    })
})
```

これにより、以下のようなprotobuf定義が生成されます：

```protobuf
import "google/protobuf/timestamp.proto";

message MyType {
    int32 status = 1;
    google.protobuf.Timestamp created_at = 2;
}
```

### インポートパス

`protoc:include`メタデータは、protocコンパイラを呼び出す際に使用される
インポートパスを指定します。APIレベルまたはサービスレベルで設定できます：

```go
var _ = API("calc", func() {
    // すべてのサービスのグローバルインポートパス
    Meta("protoc:include", 
        "/usr/include",
        "/usr/local/include")
})

var _ = Service("calculator", func() {
    // サービス固有のインポートパス
    Meta("protoc:include", 
        "/usr/local/include/google/protobuf")
    
    // ... サービスメソッド ...
})
```

API定義で設定すると、インポートパスはすべてのサービスに適用されます。サービス
で設定すると、パスはそのサービスにのみ適用されます。

{{< alert title="重要な注意点" color="primary" >}}
- 外部proto型を使用する場合、`struct:field:proto`メタデータは必要なすべての
  インポート情報を提供する必要があります
- `protoc:include`のインポートパスは、.protoファイルを含むディレクトリを
  指している必要があります
- サービスレベルのインポートパスは、APIレベルのパスを置き換えるのではなく、
  追加されます
{{< /alert >}}

## OpenAPI仕様の制御

### 基本的なOpenAPI設定

OpenAPI仕様の生成とフォーマットを制御します：

```go
var _ = API("MyAPI", func() {
    // OpenAPI生成を制御
    Meta("openapi:generate", "false")
    
    // JSON出力をフォーマット
    Meta("openapi:json:prefix", "  ")
    Meta("openapi:json:indent", "  ")
})
```

これにより、OpenAPI JSONのフォーマット方法が影響を受けます：
```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "MyAPI",
    "version": "1.0"
  }
}
```

### オペレーションと型のカスタマイズ

いくつかのメタデータキーを使用して、オペレーションと型がOpenAPI仕様で
どのように表示されるかをカスタマイズできます：

```go
var _ = Service("calc", func() {
    // オペレーション名をオーバーライド
    Method("add", func() {
        Meta("openapi:operationId", "customAdd")
    })

    // スキーマ名をオーバーライド
    Method("multiply", func() {
        Payload(func() {
            Meta("openapi:schema:ref", "#/components/schemas/CustomPayload")
        })
    })
})
```

### セキュリティ定義

OpenAPIセキュリティ定義をカスタマイズできます：

```go
var _ = Service("calc", func() {
    // セキュリティスキームをオーバーライド
    Security(JWT, func() {
        Meta("openapi:security:scheme", "bearer")
        Meta("openapi:security:bearerFormat", "JWT")
    })

    // スコープをカスタマイズ
    Method("add", func() {
        Security(OAuth2, func() {
            Meta("openapi:security:scopes", "read:calc", "write:calc")
        })
    })
})
```

### 拡張プロパティ

OpenAPI仕様に任意の拡張プロパティを追加できます：

```go
var _ = API("MyAPI", func() {
    // APIレベルの拡張
    Meta("openapi:extension:x-api-id", "123")
    
    Service("calc", func() {
        // サービスレベルの拡張
        Meta("openapi:extension:x-service-version", "1.0")
        
        Method("add", func() {
            // メソッドレベルの拡張
            Meta("openapi:extension:x-rate-limit", "100")
        })
    })
})
```

{{< alert title="重要な注意点" color="primary" >}}
- OpenAPI拡張プロパティは常に`x-`プレフィックスで始まる必要があります
- 拡張値は有効なJSONでなければなりません
- 拡張は任意のレベル（API、サービス、メソッド、型など）で適用できます
{{< /alert >}}

## まとめ

メタデータは、Goaのコード生成をカスタマイズするための強力なメカニズムを提供
します。主な使用例は以下の通りです：

1. **型生成の制御**
   - 型の生成を強制
   - パッケージの構成をカスタマイズ
   - フィールド名と型をオーバーライド

2. **Protocol Bufferのカスタマイズ**
   - メッセージとフィールドの型をカスタマイズ
   - インポートパスを制御
   - 外部proto型との統合

3. **OpenAPI仕様の制御**
   - 生成とフォーマットをカスタマイズ
   - オペレーションと型の表現をカスタマイズ
   - セキュリティ定義を設定
   - 拡張プロパティを追加

メタデータを効果的に使用することで、生成されるコードをプロジェクトの特定の
ニーズに合わせて調整できます。