---
title: "セキュリティ"
linkTitle: "セキュリティ"
weight: 6
description: "GoaのセキュリティDSLを使用して、JWT、APIキー、Basic認証、OAuth2を含むサービスの認証と認可のスキームを定義します。"
---

## セキュリティの概要

APIを保護する際には、2つの異なる概念を理解することが重要です：

- **認証**（AuthN）：クライアントの身元を確認します（「あなたは誰ですか？」）
- **認可**（AuthZ）：認証されたクライアントが何を行えるかを決定します（「何を許可されていますか？」）

Goaは、サービスの認証と認可の要件を定義するためのDSL構成要素を提供します。

## セキュリティスキーム

### JWT（JSON Web Token）

JWTは、JSON オブジェクトとして情報を安全に送信するためのコンパクトな方法を定義する
オープン標準（[RFC 7519](https://tools.ietf.org/html/rfc7519)）です。JWTは認証と
認可の両方によく使用されます：

1. **認証**：JWTは信頼できる機関によって発行された（秘密鍵で署名された）ものであるため、
   所持者が認証済みであることを証明します
2. **認可**：JWTはサービスが認可の決定を行うために使用できるクレーム（ユーザーロールや
   権限など）を運ぶことができます

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT ベースの認証と認可")
    // スコープはJWTクレームに対してチェックできる権限を定義します
    Scope("api:read", "読み取り専用アクセス")
    Scope("api:write", "読み書きアクセス")
})
```

#### スコープの理解

スコープは、クライアントが実行を許可されるアクションを表す名前付きの権限です。
JWTを使用する場合：

1. 認証サーバーは発行時にJWTに付与されたスコープを含めます
2. サービスは各エンドポイントに必要なスコープに対してこれらのスコープを検証します
3. JWTに必要なスコープが含まれていない場合、リクエストは拒否されます

### APIキー

APIキーは、クライアントがリクエストに含める単純な文字列トークンです。一般的に
「APIキー認証」と呼ばれますが、より正確には認可メカニズムとして説明されます：

- 身元を証明しません（簡単に共有や盗難が可能）
- 主にリクエストの送信元を識別し、レート制限を適用するために機能します
- JWTよりもシンプルですが、セキュリティと柔軟性は低くなります

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("APIキーベースのリクエスト認可")
})
```

APIキーの一般的な用途：
- クライアントごとのレート制限
- 使用状況の追跡
- シンプルなプロジェクト/チームの識別
- パブリックAPIの基本的なアクセス制御

### Basic認証

Basic認証は、HTTPプロトコルに組み込まれたシンプルな認証スキームです：

- クライアントは各リクエストに認証情報（ユーザー名/パスワード）を送信します
- 認証情報はBase64エンコードされますが、暗号化されません（HTTPSが必要）
- 真の認証を提供しますが、組み込みの認可メカニズムはありません

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("ユーザー名/パスワード認証")
    // ここでのスコープは、認証成功後に付与できる権限を定義します
    Scope("api:read", "読み取り専用アクセス")
})
```

### OAuth2

OAuth2は、異なる種類のアプリケーション向けに複数のフローをサポートする包括的な認可
フレームワークです。以下を分離します：

1. 認証（認可サーバーが処理）
2. 認可（アクセストークンを介して特定の権限を付与）
3. リソースアクセス（アクセストークンを使用）

```go
var OAuth2Auth = OAuth2Security("oauth2", func() {
    // OAuth2フローのエンドポイントを定義
    AuthorizationCodeFlow(
        "http://auth.example.com/authorize",  // 認可をリクエストする場所
        "http://auth.example.com/token",      // コードをトークンと交換する場所
        "http://auth.example.com/refresh",    // 期限切れトークンを更新する場所
    )
    // 利用可能な権限を定義
    Scope("api:read", "読み取り専用アクセス")
    Scope("api:write", "読み書きアクセス")
})
```

## セキュリティスキームの適用

セキュリティスキームは異なるレベルで適用できます：

### メソッドレベルのセキュリティ

個々のメソッドを1つまたは複数のスキームで保護します：

```go
Method("secure_endpoint", func() {
    Security(JWTAuth, func() {
        Scope("api:read")
    })
    
    Payload(func() {
        TokenField(1, "token", String)
        Required("token")
    })
    
    HTTP(func() {
        GET("/secure")
        Response(StatusOK)
    })
})
```

### 複数のスキーム

セキュリティを強化するために複数のセキュリティスキームを組み合わせます：

```go
Method("doubly_secure", func() {
    Security(JWTAuth, APIKeyAuth, func() {
        Scope("api:write")
    })
    
    Payload(func() {
        TokenField(1, "token", String)
        APIKeyField(2, "api_key", "key", String)
        Required("token", "key")
    })
    
    HTTP(func() {
        POST("/secure")
        Param("key:k")  // クエリパラメータのAPIキー
        Response(StatusOK)
    })
})
```

## トランスポート固有の設定

### HTTPセキュリティ設定

セキュリティ認証情報がHTTP経由で送信される方法を設定します：

```go
Method("secure_endpoint", func() {
    Security(JWTAuth)
    Payload(func() {
        TokenField(1, "token", String)
        Required("token")
    })
    HTTP(func() {
        GET("/secure")
        Header("token:Authorization") // AuthorizationヘッダーのJWT
        Response(StatusOK)
        Response("unauthorized", StatusUnauthorized)
    })
})
```

### gRPCセキュリティ設定

gRPCトランスポートのセキュリティを設定します：

```go
Method("secure_endpoint", func() {
    Security(JWTAuth, APIKeyAuth)
    Payload(func() {
        TokenField(1, "token", String)
        APIKeyField(2, "api_key", "key", String)
        Required("token", "key")
    })
    GRPC(func() {
        Metadata(func() {
            Attribute("token:authorization")  // メタデータのJWT
            Attribute("api_key:x-api-key")   // メタデータのAPIキー
        })
        Response(CodeOK)
        Response("unauthorized", CodeUnauthenticated)
    })
})
```

## エラー処理

セキュリティ関連のエラーを一貫して定義します：

```go
Service("secure_service", func() {
    Error("unauthorized", String, "無効な認証情報")
    Error("forbidden", String, "無効なスコープ")
    
    HTTP(func() {
        Response("unauthorized", StatusUnauthorized)
        Response("forbidden", StatusForbidden)
    })
    
    GRPC(func() {
        Response("unauthorized", CodeUnauthenticated)
        Response("forbidden", CodePermissionDenied)
    })
})
```

## ベストプラクティス

{{< alert title="セキュリティ実装ガイドライン" color="primary" >}}
**認証設計**
- ユースケースに適したセキュリティスキームを使用
- 適切なトークン検証を実装
- 認証情報を安全に保存
- 本番環境ではHTTPSを使用

**認可設計**
- 明確なスコープ階層を定義
- きめ細かい権限を使用
- ロールベースのアクセス制御を実装
- すべてのセキュリティ要件を検証

**一般的なヒント**
- セキュリティ要件を文書化
- 適切なエラー処理を実装
- セキュアなデフォルトを使用
- 定期的なセキュリティ監査を実施
{{< /alert >}}

## セキュリティの実装

デザインでセキュリティスキームを定義すると、Goaはデザインに固有の`Auther`インター
フェースを生成し、サービスはこれを実装する必要があります。このインターフェースは、
指定した各セキュリティスキームのメソッドを定義します：

```go
// Autherはサービスのセキュリティ要件を定義します。
type Auther interface {
    // BasicAuthはbasic認証の認可ロジックを実装します。
    BasicAuth(context.Context, string, string, *security.BasicScheme) (context.Context, error)
} 