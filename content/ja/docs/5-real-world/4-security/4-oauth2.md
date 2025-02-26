---
title: OAuth2認証
description: GoaのAPIでOAuth2認証を実装する方法を学びます
weight: 4
---

# GoaにおけるOAuth2認証

OAuth2は、ユーザーのパスワードを必要とせずにアプリケーションがユーザーに代わってデータに安全にアクセスできるようにする広く使用されているプロトコルです。
ホテルのキーカードシステムのようなものと考えてください - 宿泊客はマスターキーを持たずに、特定のエリアに一時的にアクセスできます。

Goaには、OAuth2を扱う2つの方法があります：

1. **OAuth2プロバイダーの実装**: クライアントアプリケーションにトークンを発行する独自の認可サーバーを作成します。
   これは、ホテルのように - キーカードを発行し管理する立場です。

2. **OAuth2を使用したサービスの保護**: GoogleやあなたのOAuth2プロバイダーなどの外部プロバイダーからのトークンを使用して、
   APIエンドポイントを保護します。これは、ホテルのキーカードを受け入れるホテル内のショップのようなものです。

それでは、両方のアプローチを詳しく見ていきましょう。

## パート1: OAuth2プロバイダーの実装

独自のOAuth2認可サーバー（GoogleやGitHubのような）を作成したい場合、Goaは[goadesign/oauth2](https://github.com/goadesign/oauth2)
パッケージを通じて完全な実装を提供します。この実装は、最も安全で広く使用されているOAuth2フローである認可コードフローに焦点を当てています。

### プロバイダーフローの理解

OAuth2プロバイダーを実装する場合、3つの主要なタイプのリクエストを処理するシステムを作成します：

1. **認可リクエスト**（ユーザーから）
   - 例：ユーザーがクライアントアプリで「MyServiceでログイン」をクリック
   - プロバイダーが許可画面を表示
   - 承認後、クライアントアプリに認可コードを送信

2. **トークン交換**（クライアントアプリから）
   - クライアントアプリが認可コードを送り返す
   - プロバイダーがそれを検証し、アクセス/リフレッシュトークンを返す

3. **トークンリフレッシュ**（クライアントアプリから）
   - アクセストークンが期限切れになると、クライアントアプリがリフレッシュトークンを送信
   - プロバイダーが新しいアクセストークンを発行

### プロバイダーの実装

#### ステップ1: プロバイダーAPIの定義

まず、設計にOAuth2プロバイダーエンドポイントを作成します。このコードは、OAuth2プロバイダーサービスの基本構造を設定します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "github.com/goadesign/oauth2"  // OAuth2プロバイダーパッケージをインポート
)

var _ = API("oauth2_provider", func() {
    Title("OAuth2 Provider API")
    Description("OAuth2認可サーバーの実装")
})

var OAuth2Provider = OAuth2("/oauth2/authorize", "/oauth2/token", func() {
    Description("OAuth2プロバイダーエンドポイント")
    
    // 認可コードフローを設定
    AuthorizationCodeFlow("/auth", "/token", "/refresh")
    
    // 利用可能なスコープを定義
    Scope("api:read", "APIへの読み取りアクセス")
    Scope("api:write", "APIへの書き込みアクセス")
})
```

この設計コードは：
- OAuth2プロバイダー機能専用の新しいAPIを作成
- ユーザー認可用の"/oauth2/authorize"とトークン管理用の"/oauth2/token"という2つの主要エンドポイントを定義
- 必要なエンドポイントで認可コードフローを設定
- クライアントがリクエストできる2つの基本的なスコープを定義

#### ステップ2: プロバイダーインターフェースの実装

プロバイダーインターフェースは、OAuth2実装の中心です。OAuth2フローを処理するコアメソッドを定義します：

```go
type Provider interface {
    // Authorizeは初期許可リクエストを処理
    Authorize(clientID, scope, redirectURI string) (code string, err error)

    // Exchangeは認可コードをトークンと交換
    Exchange(clientID, code, redirectURI string) (refreshToken, accessToken string, 
        expiresIn int, err error)

    // Refreshは新しいアクセストークンを提供
    Refresh(refreshToken, scope string) (newRefreshToken, accessToken string, 
        expiresIn int, err error)

    // Authenticateはクライアント認証情報を検証
    Authenticate(clientID, clientSecret string) error
}
```

各メソッドには特定の目的があります：
- `Authorize`: ユーザーがアクセスを承認したときに呼び出され、一時的なコードを生成
- `Exchange`: 一時的なコードをアクセストークンとリフレッシュトークンに変換
- `Refresh`: 古いトークンが期限切れになったときに新しいアクセストークンを発行
- `Authenticate`: トークン操作の前にクライアント認証情報を検証

#### ステップ3: プロバイダーコントローラーの作成

コントローラーは、HTTPエンドポイントをプロバイダー実装に接続します：

```go
func NewOAuth2ProviderController(service *goa.Service, provider oauth2.Provider) *OAuth2ProviderController {
    return &OAuth2ProviderController{
        ProviderController: oauth2.NewProviderController(service, provider),
    }
}
```

このコントローラーは：
- プロバイダー実装を入力として受け取る
- すべてのHTTPルーティングとリクエスト処理を処理
- エラーレスポンスとステータスコードを管理
- OAuth2プロトコルの準拠を確保

### プロバイダーのセキュリティ考慮事項

OAuth2プロバイダーを実装する際は、堅牢なセキュリティ対策が必要です。主要なコンポーネントとその実装を見てみましょう：

#### トークン管理

TokenStoreは、アクセストークンとリフレッシュトークンの安全な保存と管理を提供します：

```go
type TokenStore struct {
    accessTokens  map[string]*TokenInfo
    refreshTokens map[string]*TokenInfo
    mu           sync.RWMutex
}

func (s *TokenStore) StoreToken(info *TokenInfo) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    s.accessTokens[info.AccessToken] = info
    if info.RefreshToken != "" {
        s.refreshTokens[info.RefreshToken] = info
    }
    return nil
}
```

この実装は：
- アクセストークンとリフレッシュトークン用の別々のマップを使用
- ミューテックスを使用したスレッドセーフなトークン保存を実装
- 両方のトークンタイプを1つの操作で処理
- 競合状態を防ぐための原子的な更新を提供

#### クライアント管理

Client構造体は、登録されたOAuth2クライアントに関する情報を管理します：

```go
type Client struct {
    ID          string   // クライアントの一意の識別子
    Secret      string   // クライアントの認証用シークレットキー
    RedirectURI string   // 認可されたリダイレクトURI
    Scopes      []string // このクライアントに許可されたスコープ
    Type        string   // "confidential"または"public"
}
```

この構造は：
- 重要なクライアント認証情報を保存
- フィッシングを防ぐために許可されたリダイレクトURIを追跡
- 許可されたスコープのリストを維持
- 機密（サーバーサイド）とパブリック（クライアントサイド）アプリを区別

## パート2: OAuth2を使用したサービスの保護

APIエンドポイントをOAuth2で保護したい場合（自身のプロバイダーまたはGoogleなどの外部プロバイダーを使用）、
Goaはこれを簡単にします。

### APIの保護

#### ステップ1: セキュリティスキームの定義

このコードは、APIをOAuth2で保護する方法をGoaに指示します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var OAuth2Auth = OAuth2Security("oauth2", func() {
    Description("OAuth2認証")
    
    // サポートするOAuth2フローを定義
    AuthorizationCodeFlow("/auth", "/token", "/refresh")
    
    // 必要なスコープを定義
    Scope("api:read", "APIへの読み取りアクセス")
    Scope("api:write", "APIへの書き込みアクセス")
})
```

上記のセキュリティスキームは、APIのコアOAuth2設定を確立します。"oauth2"という名前を付けることで、
API設計全体で参照できる明確な識別子を作成します。このスキームは、サポートするOAuth2フローを指定し、
この場合は最も安全なオプションの1つである認可コードフローです。また、クライアントがAPIにアクセスする際に
リクエストできる利用可能なスコープを定義し、きめ細かなアクセス制御を可能にします。最後に、OAuth2フロー中に
クライアントが対話する必要な認証エンドポイント（認可、トークン交換、リフレッシュトークンエンドポイント）を
設定します。この包括的なセットアップは、Goa APIでOAuth2セキュリティを実装するために必要なすべてを提供します。

#### ステップ2: エンドポイントの保護

APIエンドポイントにOAuth2セキュリティを適用する方法は以下の通りです：

```go
var _ = Service("secure_api", func() {
    Description("OAuth2で保護されたAPI")
    
    Method("getData", func() {
        Description("保護されたデータを取得")
        
        // 特定のスコープを必要とするOAuth2
        Security(OAuth2Auth, func() {
            Scope("api:read")
        })
        
        Payload(func() {
            AccessToken("token", String, "OAuth2アクセストークン")
            Required("token")
        })
        
        Result(String)
        
        HTTP(func() {
            GET("/data")
            Response(StatusOK)
        })
    })
})
``` 