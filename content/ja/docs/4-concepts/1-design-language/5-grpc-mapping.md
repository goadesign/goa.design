---
title: "トランスポートマッピング"
linkTitle: "トランスポートマッピング"
weight: 5
description: >
  サービスが異なるトランスポートプロトコルを介して通信する方法を定義します。サービスメソッドをHTTPとgRPCのエンドポイントにマッピングします。
---

## トランスポートマッピングの概要

GoaはHTTPとgRPCの両方をサポートしています。トランスポートマッピングDSLを使用すると、
サービスメソッドをこれらのプロトコルを介して公開する方法を定義できます。

## HTTPトランスポート

[HTTP DSL](https://pkg.go.dev/goa.design/goa/v3/dsl#HTTP)は、サービスメソッドを
HTTPエンドポイントにマッピングする方法を定義します。これは3つのレベルで設定できます：
- APIレベル：グローバルなHTTP設定を定義
- サービスレベル：サービス全体のHTTPプロパティを設定
- メソッドレベル：メソッド固有のHTTP動作を指定

### マッピングレベル

#### APIレベル
すべてのサービスに適用されるグローバルなHTTP設定を定義します：
```go
API("bookstore", func() {
    HTTP(func() {
        Path("/api/v1") // すべてのエンドポイントのグローバルプレフィックス
    })
})
```

#### サービスレベル
サービス内のすべてのメソッドのHTTPプロパティを設定します：
```go
Service("books", func() {
    HTTP(func() {
        Path("/books")     // サービス全体のパスプレフィックス
        Parent("store")    // パスのネストのための親サービス
    })
})
```

#### メソッドレベル
個々のメソッドの特定のHTTP動作を定義します：
```go
Method("show", func() {
    HTTP(func() {
        GET("/{id}")       // HTTPメソッドとパス
        Response(StatusOK) // 成功レスポンスコード
    })
})
```

### HTTPマッピング機能

HTTP DSLは、エンドポイントを設定するためのいくつかの機能を提供します：

1. **パスパラメータ**
   - ペイロードフィールドをURLパスセグメントにマッピング
   - パターンマッチングとバリデーションを使用
   - オプションパラメータをサポート

2. **クエリパラメータ**
   - ペイロードフィールドをクエリ文字列パラメータにマッピング
   - パラメータの型とバリデーションを定義
   - オプションパラメータを処理

3. **ヘッダー**
   - ペイロード/結果フィールドをHTTPヘッダーにマッピング
   - 必須およびオプションのヘッダーを設定
   - ヘッダーのフォーマットとバリデーションを定義

4. **レスポンスコード**
   - 結果を成功ステータスコードにマッピング
   - エラーレスポンスコードを定義
   - 異なるレスポンスシナリオを処理

## gRPCトランスポート

gRPC DSLは、サービスメソッドをgRPCプロシージャにマッピングする方法を定義します。
HTTPと同様に、複数のレベルで設定できます。

### gRPCの機能

1. **メッセージマッピング**
   - リクエスト/レスポンスメッセージ構造を定義
   - フィールドをprotobuf型にマッピング
   - フィールド番号とオプションを設定

2. **ステータスコード**
   - サービス結果をgRPCステータスコードにマッピング
   - エラーコードマッピングを定義
   - 標準的なgRPCステータスシナリオを処理

3. **メタデータ**
   - gRPCメタデータの処理を設定
   - ヘッダーをメタデータにマッピング
   - メタデータのバリデーションを定義

### 一般的なパターン

以下は一般的なトランスポートマッピングパターンです：

#### RESTfulリソースマッピング
```go
Service("users", func() {
    HTTP(func() {
        Path("/users")
    })
    
    Method("list", func() {
        HTTP(func() {
            GET("/")              // GET /users
        })
    })
    
    Method("show", func() {
        HTTP(func() {
            GET("/{id}")          // GET /users/{id}
        })
    })
})
```

#### 混合プロトコルサポート
サービスはHTTPとgRPCの両方をサポートできます：
```go
Method("create", func() {
    // HTTPマッピング
    HTTP(func() {
        POST("/")
        Response(StatusCreated)
    })
    
    // gRPCマッピング
    GRPC(func() {
        Response(CodeOK)
    })
})
```

## ベストプラクティス

{{< alert title="トランスポートマッピングガイドライン" color="primary" >}}
**HTTP設計**
- 一貫したURLパターンを使用
- RESTful規約に従う
- 適切なステータスコードを選択
- エラーを一貫して処理

**gRPC設計**
- 意味のあるサービス名を使用
- 明確なメッセージ構造を定義
- protobufのベストプラクティスに従う
- 後方互換性を計画

**一般的なヒント**
- トランスポート固有の動作を文書化
- セキュリティへの影響を考慮
- バージョニングを計画
- 両方のトランスポート層をテスト
{{< /alert >}}

## トランスポート固有のエラー処理

各トランスポートプロトコルには、独自のエラー表現方法があります：

### HTTPエラー
- 適切なステータスコードにマッピング
- レスポンスボディにエラーの詳細を含める
- 追加情報に標準ヘッダーを使用
- HTTPエラー規約に従う

### gRPCエラー
- 標準的なgRPCステータスコードを使用
- 詳細なエラーメッセージを含める
- エラー詳細機能を活用
- gRPCエラーモデルに従う 