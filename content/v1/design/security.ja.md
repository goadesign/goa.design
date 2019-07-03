+++
date = "2016-01-30T11:01:06-05:00"
title = "セキュリティ"
weight = 3

[menu.v1]
name = "セキュリティ"
identifier = "design security"
parent = "design.v1"
+++
goaには、Basic認証、APIキー（共有秘密鍵）、JWT、OAuth2など、複数のセキュリティスキームが組み込まれています。
セキュリティスキームは、API全体、リソース、または単一のアクションに加えることができます。
セキュリティスキームが添付されているアクションでは、クライアントはスキームで表現される認証をおこなう必要があります。
個々のアクションで認証をおこなう必要性が上書きされる可能性もあります。

## セキュリティ DSL

セキュリティスキームは、
[BasicAuthSecurity](/v1/reference/goa/design/apidsl/#BasicAuthSecurity)、
[APIKeySecurity](/v1/reference/goa/design/apidsl/#APIKeySecurity)、
[JWTSecurity](/v1/reference/goa/design/apidsl/#JWTSecurity) または
[OAuth2Security](/v1/reference/goa/design/apidsl/#OAuth2Security) のいずれかを使用して定義されます。
API、リソース、アクションで [Security](/v1/reference/goa/design/apidsl/#Security) を使うことでスキームを加えることができます。

例えば：

```go
var BasicAuth = BasicAuthSecurity("BasicAuth", func() {
    Description("Use client ID and client secret to authenticate")
})

var _ = Resource("secured", func() {
    Security(BasicAuth)
    // ...
})
```

各スキームは、対応する認証メカニズムに固有のDSLを使用します。
たとえば、APIキーでは、キーをクエリ文字列に設定するかヘッダーに設定するかを指定できます。
各 DSL の詳細については[リファレンス](/v1/reference/goa/design/apidsl)を参照してください。

## スコープ

`JWT` と ` OAuth2` の両方のスキームでは、クライアントで設定されていなければならないトークンのスコープを指定することができます。
[Security](/v1/reference/goa/design/apidsl/#Security) 関数を使うと、スキーマが添付されたアクションに対して、要求されるスコープを指定することができます。
例えば、`OAuth2` スキームが利用する `OAuth2` 認可コードは以下のように定義できます：

```go
var OAuth2 = OAuth2Security("OAuth2", func() {
    Description("Use OAuth2 to authenticate")
    AccessCodeFlow("/authorization", "/token")
    Scope("api:read", "Provides read access")
    Scope("api:write", "Provides write access")
})
```

スキームは2つの可能なスコープを定義します。
あるリソースで、クライアントが "api:read" スコープをセットしていることを提示しなければならないことを宣言できます：

```go
var _ = Resource("secured", func() {
    Security(OAuth2, func() {
        Scope("api:read") // All resource actions require "api:read" scope
    })
    // ...
})
```

あるアクションはそれに加えて、"api:write" スコープを要求します：

```go
    Action("write", func() {
        Security(OAuth2, func() {
            Scope("api:write") // Require "api:write" scope on top of scopes already required by
        })                     // the resource or API.
        // ...
    })
```

以下の例のように、[NoSecurity](/v1/reference/goa/design/apidsl/#NoSecurity) を利用すると、
アクションで完全に認証をオプトアウトすることもできます：

```go
    Action("health-check", func() {
        NoSecurity()
        // ...
    })
```

## コード生成に対する影響


セキュリティスキームを定義し、それらをAPI、リソース、アクションに加えることで、
クライアントで認証が要求されるようにコードが生成されます。
これにより、クライアントパッケージも対応する署名を利用することになります。
最終的には、生成される Swagger もセキュリティスキームを反映したものになります。

認証を実装している生成されたコードは、実際の施行をおこなうミドルウェアを受け入れます。
これにより、必要に応じて動作をカスタマイズすることができます。
goaには、セキュリティスキームを部分的にまたは完全に実装する一連のセキュリティミドルウェアが付属しています。

どのようにセキュリティミドルウェアを実装するかの詳細は、[実装する](/ja/v1/implement) の [セキュリティ](/ja/v1/implement/security) セクションを参照してください。
