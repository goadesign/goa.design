+++
date = "2016-01-30T11:01:06-05:00"
title = "セキュリティ"
weight = 9

[menu.main]
name = "セキュリティ"
identifier = "implement security"
parent = "implement"
+++

セキュリティを実装するには、最初にデザインでセキュリティスキームを定義する必要があります。
詳しくは、[デザイン](https://goa.design/ja/design/) セクションの [セキュリティ](https://goa.design/ja/design/security/) を参照してください。

## サービスセキュリティ

生成されたサービスのコードは、実際に認証を実装するセキュリティミドルウェアを登録するためのパッケージ機能を定義します。
関数は `UseXXXMiddleware` という命名パターンに従って `app` パッケージの中に（`goagen` の実行によって対象パッケージが上書きされていない限り）定義されます。ここで、`XXX` はセキュリティスキームの名前です。
たとえば：

```go
func UseAPIKeyMiddleware(service *goa.Service, middleware goa.Middleware)
```

ミドルウェアは、認証に失敗した場合にエラー（通常は [ErrUnauthorized](https://goa.design/reference/goa/#variables)）を返すか、成功した場合には次のハンドラを呼び出す必要があります。
生成されたコードは、デザインに提供された情報のコピーを含むセキュリティスキームのデータ構造をインスタンス化するための関数も含みます。
これには、セキュリティミドルウェアの実装によって活用できる情報が含まれています。
これらの関数は `NewXXXSecurity` という名前のパターンに従います。`XXX` はセキュリティスキームの名前です。たとえば：

```go
func NewAPIKeySecurity() *goa.APIKeySecurity
```

## セキュリティ ミドルウエア

goa は、すべてのセキュリティスキームのセキュリティミドルウェアの完全、もしくは部分的な実装です。

### Basic 認証

Basic 認証ミドルウエアの[単純な実装](https://github.com/goadesign/goa/blob/master/middleware/security/basicauth/basicauth.go) はより高機能な実装の基礎として役立ちます。

### API キー


API キーのスキームの検証は単に2つの値を比較するだけなので、セキュリティミドルウェアの実装はありません。
ただし、GitHub の [examples](https://github.com/goadesign/examples) リポジトリに[実装例](https://github.com/goadesign/examples/blob/master/security/api_key.go)があります。

### JWT キー

JWT セキュリティミドルウエアの[完全な実装](https://goa.design/reference/goa/middleware/security/jwt/)を備えています。
[JWT の例](https://github.com/goadesign/examples/blob/master/security/jwt.go) がトークンを検証するためにどのようにキーをロードするかを示しています。

### OAuth2

OAuth2 の実装には、OAuth2 が単なる認証メカニズムではなく、サードパーティがサービスユーザーのふりをするための方法としても働くことを求められます。[oauth2](https://github.com/goadesign/oauth2) GitHub リポジトリは goa サービスに OAuth2 を簡単に追加するための枠組みを提供しています。詳細は [README](https://GitHub.com/goadesign/oauth2/blob/master/README.md) を参照してください。

## セキュリティミドルウエアの例

すべてのスキームをサポートするためのセキュリティミドルウエアの実装方法のデモが[セキュリティの例](https://github.com/goadesign/examples/tree/master/security)で示されています。
