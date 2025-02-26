---
linkTitle: Basic認証
title: GoaにおけるBasic認証
description: GoaのAPIでBasic認証を実装する方法を学びます
weight: 1
---

Basic認証は、HTTPプロトコルに組み込まれたシンプルな認証スキームです。最も単純な認証形式の
1つですが、特に内部APIや開発環境で広く使用されています。

## Basic認証の仕組み

Basic認証を使用する場合：

1. クライアントはユーザー名とパスワードをコロンで結合します（username:password）
2. この文字列はbase64でエンコードされます
3. エンコードされた文字列はAuthorizationヘッダーで送信されます：
   `Authorization: Basic base64(username:password)`

## GoaでのBasic認証の実装

### 1. セキュリティスキームの定義

まず、設計パッケージでBasic認証のセキュリティスキームを定義します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// BasicAuthはセキュリティスキームを定義
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("APIにアクセスするにはユーザー名とパスワードを使用してください")
})
```

### 2. セキュリティスキームの適用

Basic認証は異なるレベルで適用できます：

```go
// APIレベル - すべてのサービスとメソッドに適用
var _ = API("secure_api", func() {
    Security(BasicAuth)
})

// サービスレベル - サービス内のすべてのメソッドに適用
var _ = Service("secure_service", func() {
    Security(BasicAuth)
})

// メソッドレベル - このメソッドにのみ適用
Method("secure_method", func() {
    Security(BasicAuth)
})
```

### 3. ペイロードの定義

Basic認証を使用するメソッドでは、ユーザー名とパスワードのフィールドを含むペイロードを
定義する必要があります：

```go
Method("login", func() {
    Security(BasicAuth)
    Payload(func() {
        // これらの特別なDSL関数はGoaによって認識されます
        Username("username", String, "認証用のユーザー名")
        Password("password", String, "認証用のパスワード")
        Required("username", "password")
    })
    Result(String)
    HTTP(func() {
        POST("/login")
        // Responseは認証成功後の動作を定義します
        Response(StatusOK)
    })
})
```

### 4. セキュリティハンドラーの実装

Goaがコードを生成したら、セキュリティハンドラーを実装する必要があります。
以下は例です：

```go
// SecurityBasicAuthFuncはBasic認証の認可ロジックを実装します
func (s *service) BasicAuth(ctx context.Context, user, pass string) (context.Context, error) {
    // ここで認証ロジックを実装
    if user == "admin" && pass == "secret" {
        // 認証成功
        return ctx, nil
    }
    // 認証失敗
    return ctx, basic.Unauthorized("無効な認証情報")
}
```

## Basic認証のベストプラクティス

1. **常にHTTPSを使用**
   Basic認証は認証情報をbase64エンコードして送信します（暗号化ではありません）。
   転送中の認証情報を保護するために、常にHTTPSを使用してください。

2. **安全なパスワード保存**
   - パスワードを平文で保存しない
   - 強力なハッシュアルゴリズム（bcryptなど）を使用
   - パスワードハッシュにソルトを追加
   - 安全なパスワード管理ライブラリの使用を検討

3. **レート制限**
   ブルートフォース攻撃を防ぐためにレート制限を実装：

   ```go
   var _ = Service("secure_service", func() {
       Security(BasicAuth)
       
       // レート制限のアノテーションを追加
       Meta("ratelimit:limit", "60")
       Meta("ratelimit:window", "1m")
   })
   ```

4. **エラーメッセージ**
   ユーザー名とパスワードのどちらが間違っているかを明らかにしないでください。
   一般的なメッセージを使用：

   ```go
   return ctx, basic.Unauthorized("無効な認証情報")
   ```

5. **ログ記録**
   認証試行をログに記録しますが、パスワードは決して記録しないでください：

   ```go
   func (s *service) BasicAuth(ctx context.Context, user, pass string) (context.Context, error) {
       // 良い例：ユーザー名と結果のみをログに記録
       log.Printf("認証試行 ユーザー: %s", user)
       
       // 悪い例：これは絶対にしないでください
       // log.Printf("パスワード試行: %s", pass)
   }
   ```

## 実装例

以下は、GoaサービスでBasic認証を実装する完全な例です：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("APIアクセス用のBasic認証")
})

var _ = API("secure_api", func() {
    Title("セキュアAPIの例")
    Description("Basic認証を示すAPI")
    
    // デフォルトですべてのエンドポイントにBasic認証を適用
    Security(BasicAuth)
})

var _ = Service("secure_service", func() {
    Description("認証を必要とするセキュアなサービス")
    
    Method("getData", func() {
        Description("保護されたデータを取得")
        
        // セキュリティ要件を定義
        Security(BasicAuth)
        
        // ペイロードを定義（認証情報は自動的に追加されます）
        Payload(func() {
            // ここに追加のペイロードフィールドを追加
            Field(1, "query", String, "検索クエリ")
        })
        
        // 結果を定義
        Result(ArrayOf(String))
        
        // HTTPトランスポートを定義
        HTTP(func() {
            GET("/data")
            Response(StatusOK)
            Response(StatusUnauthorized, func() {
                Description("無効な認証情報")
            })
        })
    })
    
    // パブリックエンドポイントの例
    Method("health", func() {
        Description("ヘルスチェックエンドポイント")
        NoSecurity()
        Result(String)
        HTTP(func() {
            GET("/health")
        })
    })
})
```

## 生成されるコード

Goaは、Basic認証のために以下のコンポーネントを生成します：

1. **セキュリティタイプ**
   - 認証情報のタイプ
   - 認証失敗のエラータイプ

2. **ミドルウェア**
   - リクエストから認証情報を抽出
   - セキュリティハンドラーを呼び出し
   - 認証エラーを処理

3. **OpenAPIドキュメント**
   - セキュリティ要件を文書化
   - 必要なフィールドを表示
   - エラーレスポンスを文書化

## 一般的な問題と解決策

### 1. 認証情報が送信されない

認証情報が送信されない場合、以下を確認してください：
- `Authorization`ヘッダーのフォーマット
- Base64エンコーディング
- 特殊文字のURLエンコーディング

### 2. 常に認証エラーになる

一般的な原因：
- 設計での`Security()`の欠落
- セキュリティハンドラーの実装が不正確
- ミドルウェアの順序の問題

### 3. CORSの問題

ブラウザベースのクライアントの場合、適切なCORS設定を確保してください：

```go
var _ = Service("secure_service", func() {
``` 