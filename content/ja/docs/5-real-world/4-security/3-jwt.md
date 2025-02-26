---
linkTitle: JWT認証
title: GoaにおけるJWT認証
description: GoaのAPIでJWT認証を実装する方法を学びます
weight: 3
---

[JSON Web Tokens (JWT)](https://jwt.io/introduction)は、当事者間でクレームを安全に
送信する方法を提供します。これらは特に、サービス間で認証と認可情報を渡す必要がある
マイクロサービスアーキテクチャで有用です。JWTは、ユーザー情報、権限、その他のクレームを
含むことができる自己完結型のトークンです。

## JWT認証の仕組み

1. クライアントが認証を行い、JWTを受け取る
2. JWTは後続のリクエストに含まれる（通常はAuthorizationヘッダー）
3. サーバーがJWTの署名とクレームを検証
4. 有効な場合、クレームのコンテキストでリクエストが処理される

JWT認証フローの詳細な説明については、
[JWT認証フローガイド](https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow)を参照してください。

## JWTの構造

JWTは3つの部分で構成されます（ライブ例については[JWT.ioデバッガー](https://jwt.io/#debugger-io)を参照）：
1. ヘッダー（アルゴリズムとトークンタイプ）
2. ペイロード（クレーム）
3. 署名

JWTの例：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

JWTクレームの詳細については、
[JWTクレームのドキュメント](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims)を参照してください。

## スコープの理解

### スコープとは

スコープは、クライアントがAPIで実行できるアクションを決定する権限です。
スコープは、きめ細かなアクセス制御を実装する方法と考えてください。例えば：
- モバイルアプリはデータを表示するための`read`スコープを持つ
- 管理ダッシュボードは`read`と`write`の両方のスコープを持つ
- バックアップサービスは`backup`スコープを持つ

### スコープの仕組み

1. **定義**: スコープはセキュリティスキームで定義される
2. **割り当て**: トークンを生成する際に、付与されたスコープを含める
3. **検証**: リクエストを処理する際に、トークンが必要なスコープを持っているか確認する

実世界の例え：
- ホテルのキーカード（JWT）は異なるアクセスレベル（スコープ）を持つことがある：
  - `room:access` - 自分の部屋のみにアクセス
  - `pool:access` - プールへのアクセス
  - `gym:access` - ジムへのアクセス
  - `all:access` - すべての施設への完全なアクセス

### スコープのフォーマット

スコープは通常、`resource:action`のようなパターンに従います。一般的な例：
```
api:read        # APIへの読み取り専用アクセス
api:write       # APIへの書き込みアクセス
users:create    # ユーザーを作成する能力
admin:*         # 完全な管理者アクセス
```

### スコープの継承

スコープは階層的にすることができます。例えば：
- メソッドが`api:read`を必要とする場合、`admin:*`を持つトークンも有効かもしれない
- メソッドが複数のスコープを必要とする場合、トークンはすべての必要なスコープを持っている必要がある

スコープ階層の例：
```
admin:*           # 完全な管理者アクセス（すべての管理者スコープを含む）
├── admin:read    # 管理リソースの読み取り
├── admin:write   # 管理リソースの変更
└── admin:delete  # 管理リソースの削除
```

### Goaでのスコープの実装

#### 1. 利用可能なスコープの定義

まず、APIに存在するスコープを定義します：

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("スコープ付きJWT認証")
    
    // 利用可能なすべてのスコープを定義
    Scope("api:read", "APIリソースへの読み取りアクセス")
    Scope("api:write", "APIリソースへの書き込みアクセス")
    Scope("api:admin", "完全な管理者アクセス")
    Scope("users:read", "ユーザープロファイルの読み取り")
    Scope("users:write", "ユーザープロファイルの変更")
})
```

#### 2. メソッドへのスコープの適用

次に、各エンドポイントに必要なスコープを指定します：

```go
var _ = Service("users", func() {
    // ユーザー一覧 - 読み取りアクセスが必要
    Method("list", func() {
        Security(JWTAuth, func() {
            // 読み取りアクセスのみ必要
            Scope("users:read")
        })
    })
    
    // ユーザー更新 - 書き込みアクセスが必要
    Method("update", func() {
        Security(JWTAuth, func() {
            // 読み取りと書き込みの両方のアクセスが必要
            Scope("users:read", "users:write")
        })
    })
    
    // ユーザー削除 - 管理者アクセスが必要
    Method("delete", func() {
        Security(JWTAuth, func() {
            Scope("api:admin")
        })
    })
})
```

#### 3. トークンへのスコープの含め方

トークンを生成する際に、付与されたスコープを含めます：

```go
func GenerateUserToken(user *User) (string, error) {
    // ユーザーロールに基づいてスコープを決定
    var scopes []string
    switch user.Role {
    case "admin":
        scopes = []string{"api:admin", "users:read", "users:write"}
    case "editor":
        scopes = []string{"users:read", "users:write"}
    default:
        scopes = []string{"users:read"}
    }
    
    claims := Claims{
        StandardClaims: jwt.StandardClaims{
            ExpiresAt: time.Now().Add(time.Hour * 24).Unix(),
            IssuedAt:  time.Now().Unix(),
            Subject:   user.ID,
        },
        Scopes: scopes,  // トークンにスコープを含める
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(jwtSecret))
}
```

#### 4. スコープの検証

リクエストを処理する際に、トークンが必要なスコープを持っているか検証します：

```go
func validateScopes(tokenScopes []string, requiredScopes []string) error {
    // 効率的な検索のためにトークンのスコープのマップを作成
    scopeMap := make(map[string]bool)
    for _, scope := range tokenScopes {
        scopeMap[scope] = true
    }
    
    // 特別なケース：管理者スコープはすべてのアクセスを許可
    if scopeMap["api:admin"] {
        return nil
    }
    
    // 各必要なスコープをチェック
    for _, required := range requiredScopes {
        if !scopeMap[required] {
            return fmt.Errorf("必要なスコープがありません: %s", required)
        }
    }
    
    return nil
}
```

### スコープのベストプラクティス

1. **命名規則**
   - 一貫したパターンを使用（`resource:action`）
   - 名前は小文字を使用し、コロンを区切り文字として使用
   - 説明的だが簡潔に

2. **粒度**
   - きめ細かな制御のために十分に具体的なスコープにする
   - ただし、管理不能になるほど具体的にしない
   - 関連するアクションをグループ化することを検討

3. **ドキュメント**
   - 各スコープが許可する内容を文書化
   - 各スコープをいつ使用するかの例を提供
   - スコープの階層を説明

4. **セキュリティ**
   - サーバー側で常にスコープを検証
   - クライアント側のスコープチェックを信頼しない
   - トークンとともにスコープの有効期限を考慮

5. **管理**
   - 機密性の高い操作にはスコープのローテーションを実装
   - スコープの使用状況を監視
   - スコープの割り当てを定期的に監査

## GoaでのJWT認証の実装

### 1. セキュリティスキームの定義

まず、設計パッケージでJWTセキュリティスキームを定義します。

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// JWTAuthはセキュリティスキームを定義
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT認証")
    
    // 認可のためのスコープを定義
    Scope("api:read", "APIへの読み取りアクセス")
    Scope("api:write", "APIへの書き込みアクセス")
})
```

### 2. セキュリティスキームの適用

JWT認証は、特定のスコープ要件を持つ異なるレベルで適用できます。 