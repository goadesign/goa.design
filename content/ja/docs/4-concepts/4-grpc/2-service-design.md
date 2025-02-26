---
title: "サービス設計"
linkTitle: "サービス設計"
weight: 2
description: "サービス定義、メッセージタイプ、型システムを含むGoaでのgRPCサービスの設計方法を学ぶ"
---

このガイドでは、GoaのDSLを使用してgRPCサービスを設計する方法について、サービス定義とメッセージタイプに焦点を当てて説明します。Goaの型システムとデータモデリング機能の包括的な概要については、[データモデリング](/docs/concepts/design-language/data-modeling)ガイドを参照してください。

## サービス定義

Goa gRPCサービスは、`GRPC`トランスポートを有効にした`Service` DSLを使用して定義します：

```go
var _ = Service("calculator", func() {
    Description("計算機サービスは算術演算を実行します")

    // gRPCトランスポートを有効化
    GRPC(func() {
        // サービスレベルのgRPC設定
        Metadata("package", "calculator.v1")
        Metadata("go.package", "calculatorpb")
    })

    // サービスメソッド...
})
```

### メソッド定義

メソッドはサービスが提供する操作を定義します。`GRPC` DSLはメソッドレベルでリクエスト/レスポンスの処理をカスタマイズするために使用できます：

```go
Method("add", func() {
    Description("2つの数値を加算します")

    // 入力メッセージ
    Payload(func() {
        Field(1, "a", Int, "1つ目の被演算子")
        Field(2, "b", Int, "2つ目の被演算子")
        Required("a", "b")
    })

    // 出力メッセージ
    Result(func() {
        Field(1, "sum", Int, "加算の結果")
        Required("sum")
    })

    // メソッド固有のgRPC設定
    GRPC(func() {
        // 成功レスポンスを定義
        Response(CodeOK)
        
        // エラーレスポンスを定義
        Response("not_found", CodeNotFound)
        Response("invalid_argument", CodeInvalidArgument)
    })
})
```

### リクエスト-レスポンスのカスタマイズ

`GRPC` DSLはデータの送信方法をカスタマイズするための複数の関数を提供します：

#### メッセージのカスタマイズ

`Message`を使用して、ペイロードのどのフィールドをgRPCリクエストメッセージに含めるかをカスタマイズします：

```go
var CreatePayload = Type("CreatePayload", func() {
    Field(1, "name", String, "アカウントの名前")
    TokenField(2, "token", String, "JWTトークン")
    Field(3, "metadata", String, "追加情報")
})

Method("create", func() {
    Payload(CreatePayload)
    
    GRPC(func() {
        // 特定のフィールドのみをリクエストメッセージに含める
        Message(func() {
            Attribute("name")
            Attribute("metadata")
        })
        Response(CodeOK)
    })
})
```

#### メタデータの処理

`Metadata`を使用して、ペイロードのどのフィールドをメッセージ本体ではなくgRPCメタデータとして送信するかを指定します：

```go
Method("create", func() {
    Payload(CreatePayload)
    
    GRPC(func() {
        // トークンをメタデータで送信
        Metadata(func() {
            Attribute("token")
        })
        Response(CodeOK)
    })
})
```

> 注：セキュリティ関連の属性（`TokenField`を使用して定義されたもの、または`Security`スキームを持つもの）は、`Message`を使用してメッセージに明示的に含まれない限り、自動的にリクエストメタデータに含まれます。

#### レスポンスヘッダーとトレーラー

`Headers`と`Trailers`を使用してレスポンスメタデータを制御します：

```go
var CreateResult = ResultType("application/vnd.create", func() {
    Field(1, "name", String, "リソース名")
    Field(2, "id", String, "リソースID")
    Field(3, "status", String, "処理状態")
})

Method("create", func() {
    Result(CreateResult)
    
    GRPC(func() {
        Response(func() {
            Code(CodeOK)
            // IDをレスポンスヘッダーで送信
            Headers(func() {
                Attribute("id")
            })
            // ステータスをトレーラーで送信
            Trailers(func() {
                Attribute("status")
            })
        })
    })
})
```

## gRPCのメッセージタイプ

gRPCサービスを設計する際は、Goaの型システムを使用してメッセージタイプを定義します。通常の型定義との主な違いは、Protocol Bufferのフィールド番号を指定するために`Attribute`の代わりに`Field` DSLを使用することです。

### フィールド番号付け

Protocol Bufferのベストプラクティスに従ってフィールド番号を付けます：

1. 頻繁に出現するフィールドには1-15の番号を使用（1バイトエンコーディング）
2. あまり頻繁でないフィールドには16-2047の番号を使用（2バイトエンコーディング）
3. 後方互換性のために番号を予約

```go
Method("createUser", func() {
    Payload(func() {
        // 頻繁に使用されるフィールド（1バイトエンコーディング）
        Field(1, "id", String)
        Field(2, "name", String)
        Field(3, "email", String)

        // あまり頻繁に使用されないフィールド（2バイトエンコーディング）
        Field(16, "preferences", func() {
            Field(1, "theme", String)
            Field(2, "language", String)
        })
    })
})
```

### 複雑な型の使用

[データモデリング](/docs/concepts/design-language/data-modeling)ガイドで説明されているすべての型システム機能をgRPCサービスで使用できます。一般的なパターンの使用方法は以下の通りです：

#### 構造体とネストされた型

```go
var Address = Type("Address", func() {
    Field(1, "street", String)
    Field(2, "city", String)
    Field(3, "country", String)
    Required("street", "city", "country")
})

var User = Type("User", func() {
    Field(1, "id", String)
    Field(2, "name", String)
    Field(3, "address", Address)  // ネストされた型
    Required("id", "name")
})
```

#### OneOf型

相互に排他的なフィールドには`OneOf`を使用します：

```go
var ContactInfo = Type("ContactInfo", func() {
    OneOf("contact", func() {
        Field(1, "email", String)
        Field(2, "phone", String)
        Field(3, "address", Address)
    })
})
```

## ベストプラクティス

### 前方互換性

将来の拡張性を考慮してメッセージを設計します：

1. 新しい追加にはオプションフィールドを使用
2. フィールド番号と名前を予約
3. 関連するフィールドをネストされたメッセージにグループ化

```go
var UserProfile = Type("UserProfile", func() {
    // 現在のバージョンのフィールド
    Field(1, "basic_info", func() {
        Field(1, "name", String)
        Field(2, "email", String)
    })

    // 将来の使用のために予約
    Reserved(2, 3, 4)
    ReservedNames("location", "department")

    // 拡張ポイント
    Field(5, "extensions", MapOf(String, Any))
})
```

### ドキュメント

包括的なドキュメントを追加します：

```go
var _ = Service("users", func() {
    Description("ユーザーサービスはユーザーアカウントとプロファイルを管理します")

    Method("create", func() {
        Description("新しいユーザーアカウントを作成します")
    })
}) 