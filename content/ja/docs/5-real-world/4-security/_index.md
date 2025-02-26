---
linkTitle: セキュリティ
title:  Goaにおけるセキュリティ
weight: 4
description: 様々な認証方式を使用してHTTP Goa APIを保護する方法を学びます
---

Goaは、複数のレベルでAPIを保護できる堅牢なセキュリティ機能を提供します。
Basic認証、APIキー、JWTトークン、OAuth2のいずれが必要な場合でも、Goaの
セキュリティDSLを使用することで、セキュアなエンドポイントを簡単に実装できます。

このセクションでは、基本的な概念から高度な実装まで、Goaのセキュリティ機能について
説明します。各認証方式を詳しく説明し、APIを保護するためのベストプラクティスを
提供します。

## Goaのセキュリティの理解

Goaのセキュリティは、認証と認可の動作方法を指定する再利用可能な定義である
セキュリティスキームを通じて実装されます。これらのスキームは、APIがエンドポイントに
アクセスしようとするクライアントの身元をどのように検証するかを定義するテンプレート
として考えることができます。

これらのスキームは、柔軟なセキュリティ設定を提供するために、3つの異なるレベルで
適用できます：

- **APIレベル**: APIレベルで適用すると、セキュリティスキームはAPI内のすべての
  エンドポイントのデフォルトになります。これは、API全体で一貫したセキュリティが
  必要な場合に便利です。

- **サービスレベル**: サービスはAPIレベルのセキュリティを上書きするか、APIレベルで
  セキュリティが定義されていない場合は独自のセキュリティを定義できます。これにより、
  関連するエンドポイントのグループごとに異なるセキュリティ要件を持つことができます。

- **メソッドレベル**: 個々のメソッド（エンドポイント）は、APIとサービスレベルの
  両方のセキュリティを上書きできます。これにより、最も細かいレベルの制御が可能になり、
  特定のエンドポイントで異なるセキュリティスキームを使用したり、セキュリティを
  まったく使用しないようにしたりできます。

## 利用可能なセキュリティスキーム

Goaは、専用のDSL関数を通じていくつかの一般的なセキュリティメカニズムをサポートしています。
各スキームは特定のユースケース向けに設計されています：

### Basic認証

Basic認証は、クライアントがユーザー名とパスワードを提供するAPIセキュリティの
最も単純な形式の1つです。シンプルですが、認証情報の送信時に暗号化を確保するために、
HTTPSでのみ使用する必要があります。

[Basic認証についてもっと詳しく →](1-basic-auth.md)

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("ユーザー名とパスワードを使用したBasic認証")
})
```

### APIキー認証

APIキーは、単一のトークンを使用してクライアントを認証する簡単な方法を提供します。
一般的にヘッダーまたはクエリパラメータで渡されます。この方法は、使用状況を追跡
したりレート制限を実装したりする必要がある公開APIで人気があります。

[APIキー認証についてもっと詳しく →](2-api-key.md)

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("APIキーを要求することでエンドポイントを保護します。")
})
```

### JWT（JSON Web Token）認証

JWT認証は、クレームを運ぶことができる署名付きトークンを使用したステートレスな認証に
理想的です。JWTは、サービス間で認証と認可の情報を渡す必要があるマイクロサービス
アーキテクチャに最適です。

[JWT認証についてもっと詳しく →](3-jwt.md)

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("有効なJWTトークンを要求することでエンドポイントを保護します。")
    Scope("api:read", "APIへの読み取りアクセス")
    Scope("api:write", "APIへの書き込みアクセス")
})
```

### OAuth2認証

OAuth2は、委任された認可のための包括的なソリューションを提供します。サードパーティ
アプリケーションがユーザーに代わってAPIにアクセスすることを許可する必要がある場合に
理想的です。

[OAuth2認証についてもっと詳しく →](4-oauth2.md)

```go
var OAuth2 = OAuth2Security("oauth2", func() {
    Description("OAuth2認証")
    ImplicitFlow("/authorization")
    Scope("api:write", "書き込みアクセス")
    Scope("api:read", "読み取りアクセス")
})
```

## セキュリティ階層の例

異なるレベルでセキュリティスキームを適用する方法を示す完全な例を見てみましょう。
この例は、Goaのセキュリティシステムの柔軟性と、異なるセキュリティ要件を組み合わせる
方法を示しています：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// セキュリティスキームを定義
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Basic認証")
})

var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("APIキーを要求することでエンドポイントを保護します。")
})

var JWTAuth = JWTSecurity("jwt", func() {
    Description("有効なJWTトークンを要求することでエンドポイントを保護します。")
})

// APIレベルでセキュリティを適用
var _ = API("hierarchy", func() {
    Title("セキュリティ例API")
    Description("このAPIは、API、サービス、またはメソッドレベルでセキュリティを" +
        "使用する効果を示します")

    // すべてのエンドポイントのデフォルトセキュリティスキームとしてBasic認証を設定
    Security(BasicAuth)
})
```

### Basic認証を使用するデフォルトサービス

このサービスはAPIレベルのBasic認証を継承します。ペイロードにユーザー名とパスワードの
フィールドを含める必要があることに注意してください：

```go
var _ = Service("default_service", func() {
    Method("default", func() {
        Description("デフォルトサービスのdefaultメソッドはBasic認証で" +
            "保護されています")
        // Basic認証に必要なペイロードを定義
        Payload(func() {
            Username("username")  // ユーザー名フィールドの特別なDSL
            Password("password")  // パスワードフィールドの特別なDSL
            Required("username", "password")
        })
        HTTP(func() { GET("/default") })
    })
})
```

### 混合セキュリティを持つサービス

このサービスは、サービスとメソッドの両方のレベルでセキュリティを上書きする方法を
示し、Goaのセキュリティシステムの柔軟性を示しています：

```go
var _ = Service("api_key_service", func() {
    Description("svcサービスはAPIキーベースの認証で保護されています")
    HTTP(func() { Path("/svc") })

    // このサービス全体のAPIレベルのセキュリティを上書き
    Security(APIKeyAuth)

    Method("default", func() {
        // このメソッドはサービスレベルのAPIキーセキュリティを使用
        Payload(func() {
            APIKey("api_key", "key", String, func() {
                Description("認証に使用されるAPIキー")
            })
            Required("key")
        })
        HTTP(func() { GET("/default") })
    })

    Method("secure", func() {
        // この特定のメソッドのサービスレベルのセキュリティを上書き
        Security(JWTAuth)
        Description("このメソッドは有効なJWTトークンを必要とします。")
        Payload(func() {
            Token("token", String, func() {
                Description("認証に使用されるJWT")
            })
            Required("token")
        })
        HTTP(func() { GET("/secure") })
    })

    Method("unsecure", func() {
        Description("このメソッドは保護されていません。")
        // このメソッドのすべてのセキュリティ要件を削除
        NoSecurity()
    })
})
```

## NoSecurity()でセキュリティを削除

ヘルスチェックや公開ドキュメントのエンドポイントなど、特定のエンドポイントを
公開アクセス可能にする必要がある場合があります。`NoSecurity()`関数は、メソッドから
すべてのセキュリティ要件を削除します：

```go
Method("health", func() {
    Description("公開ヘルスチェックエンドポイント")
    NoSecurity()
    HTTP(func() { GET("/health") })
})
```

## ベストプラクティス

Goaサービスでセキュリティを実装する際は、最良の結果を得るために以下のガイドラインに
従ってください：

[セキュリティのベストプラクティスについてもっと詳しく →](5-best-practices.md)

1. 一貫したデフォルトの動作のために、APIレベルでセキュリティスキームを定義する
2. サービスレベルのセキュリティの上書きは、サービスが異なる認証を必要とする場合のみ行う
3. メソッドレベルのセキュリティは例外的なケースでのみ使用する
4. エンドポイントを公開する場合は、常に明示的に`NoSecurity()`を使用する
5. APIの利用者を助けるために、セキュリティスキームに明確な説明を含める
6. 本番環境では常にHTTPSを使用する
7. APIキー認証にはレート制限を実装する
8. JWTトークンには適切な有効期限を設定する
9. 定期的にシークレットとキーをローテーションする
10. 認証の失敗をログに記録し監視する

## 生成されるコード

Goaは、セキュリティ要件を強制するために必要なコードを自動的に生成します。
生成されるコードはいくつかの利点を提供します：

### 生成されるセキュリティ機能

Goaの設計でセキュリティ要件を定義すると、フレームワークは必要なすべての認証
タスクを処理する包括的なセキュリティミドルウェアを生成します。このミドルウェアは
自動的に認証情報をリクエストから抽出します。 