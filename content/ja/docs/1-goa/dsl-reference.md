---
title: DSLリファレンス
weight: 2
description: "Complete reference for Goa's design language - data modeling, services, methods, HTTP/gRPC mapping, and security."
llm_optimized: true
aliases:
---

Goaのドメイン固有言語(DSL)は、デザインファーストアプローチの基礎となるものです。このリファレンスは、基本的な型定義から複雑なトランスポートマッピングやセキュリティスキームまで、DSLのあらゆる側面をカバーしています。

## データモデリング

Goaは、あなたのドメインを正確にモデル化するための強力な型システムを提供します。単純なプリミティブから複雑な入れ子構造に至るまで、DSLはデータ関係、 制約、検証ルールを表現する自然な方法を提供します。

### プリミティブ型

Goa には以下の組み込みプリミティブ型があります：

```go
Boolean  // JSON boolean
Int      // Signed integer
Int32    // Signed 32-bit integer 
Int64    // Signed 64-bit integer
UInt     // Unsigned integer
UInt32   // Unsigned 32-bit integer
UInt64   // Unsigned 64-bit integer
Float32  // 32-bit floating number
Float64  // 64-bit floating number
String   // JSON string
Bytes    // Binary data
Any      // Arbitrary JSON value
```

### 型の定義

`Type` DSL関数は、構造化データ型を定義する主な方法です：

```go
var Person = Type("Person", func() {
    Description("A person")
    
    // Basic attribute
    Attribute("name", String)
    
    // Attribute with validation
    Attribute("age", Int32, func() {
        Minimum(0)
        Maximum(120)
    })
    
    // Required fields
    Required("name", "age")
})
```

### 複合型

#### 配列

配列は、任意の検証を伴う順序付きコレクションを定義します：

```go
var Names = ArrayOf(String, func() {
    MinLength(1)
    MaxLength(10)
})

var Team = Type("Team", func() {
    Attribute("members", ArrayOf(Person))
})
```

#### マップ

マップは、型安全性を備えたキーと値の関連付けを提供します：

```go
var Config = MapOf(String, Int32, func() {
    Key(func() {
        Pattern("^[a-z]+$")
    })
    Elem(func() {
        Minimum(0)
    })
})
```

### 型の構成

#### リファレンス

他の型の属性定義を継承するには `Reference` を使用します：

```go
var Employee = Type("Employee", func() {
    Reference(Person)
    Attribute("name")  // Inherits from Person
    Attribute("age")   // Inherits from Person
    
    Attribute("employeeID", String, func() {
        Format(FormatUUID)
    })
})
```

#### 拡張

`Extend` は、すべての属性を自動的に継承する新しい型を作成します：

```go
var Manager = Type("Manager", func() {
    Extend(Employee)
    Attribute("reports", ArrayOf(Employee))
})
```

### バリデーション・ルール

#### 文字列の検証
- `Pattern(regex)` - 正規表現に対するバリデーション
- `MinLength(n)` - 文字列の長さの最小値
- `MaxLength(n)` - 文字列の最大長
- `Format(format)` - 定義済みのフォーマットに対して検証を行う

#### 数値の検証
- `Minimum(n)` - 最小値(包含)
- `Maximum(n)` - 最大値(数値を含む)
- `ExclusiveMinimum(n)` - 最小値（排他的）。
- `ExclusiveMaximum(n)` - 最大値（排他的）。

#### コレクション検証
- `MinLength(n)` - 最小要素数
- `MaxLength(n)` - 要素の最大数

#### オブジェクトの検証
- `Required("field1", "field2")` - 必須項目

#### 汎用バリデーション
- `Enum(value1, value2)` - 列挙された値に制限する

組み合わせた例

```go
var UserProfile = Type("UserProfile", func() {
    Attribute("username", String, func() {
        Pattern("^[a-z0-9]+$")
        MinLength(3)
        MaxLength(50)
    })
    
    Attribute("email", String, func() {
        Format(FormatEmail)
    })
    
    Attribute("age", Int32, func() {
        Minimum(18)
        ExclusiveMaximum(150)
    })
    
    Attribute("tags", ArrayOf(String, func() { 
        Enum("tag1", "tag2", "tag3") 
    }), func() {
        MinLength(1)
        MaxLength(10)
    })

    Required("username", "email", "age")
})
```

### 組み込みフォーマット

Goaには、一般的なデータパターン用の定義済みフォーマットが含まれています：

| フォーマット
|--------|-------------|
| `FormatDate` | RFC3339 日付の値
| `FormatDateTime` | RFC3339 日付時刻値
| `FormatUUID` | RFC4122 UUIDの値
| `FormatEmail` | RFC5322メールアドレス
| `FormatHostname` | RFC1035 インターネット・ホスト名 | | `FormatIPv4` | RFC4122 UUID値
| `FormatIPv4` | RFC2373 IPv4アドレス値 | | `FormatIPv6` | RFC2373 IPv4アドレス値
| `FormatIPv6` | RFC2373 IPv6アドレスの値
| `FormatIP` | RFC2373のIPv4またはIPv6アドレス値
`FormatURI` | RFC3986 URIの値
`FormatMAC` | IEEE 802 MAC-48/EUI-48/EUI-64アドレス | `FormatCIDR` | IEEE 802 MAC-48/EUI-48/EUI-64アドレスの値
| `FormatCIDR` | RFC4632/RFC4291 CIDR 表記法 | | `FormatRegexp` | RFC3986 URI 値
| `FormatRegexp` | RE2 正規表現構文 | | `FormatJSON` | RE2 正規表現構文
| `FormatJSON` | JSONテキスト
| `FormatRFC1123` | RFC1123 日付時刻値

### 属性とフィールドのDSL

HTTP専用の型には`Attribute`を使う。gRPCサポートが必要な場合は`Field`を使用してください（フィールド番号タグを含む）：

```go
// HTTP only
var Person = Type("Person", func() {
    Attribute("name", String)
    Attribute("age", Int32)
})

// With gRPC support
var Person = Type("Person", func() {
    Field(1, "name", String)
    Field(2, "age", Int32)
})
``` を使う。

### 例

ドキュメント用にサンプル値を提供します：

```go
var User = Type("User", func() {
    Attribute("name", String, func() {
        Example("John Doe")
    })
    
    Attribute("email", String, func() {
        Example("work", "john@work.com")
        Example("personal", "john@gmail.com")
        Format(FormatEmail)
    })
})

var Address = Type("Address", func() {
    Attribute("street", String)
    Attribute("city", String)
    Required("street", "city")
    
    Example("Home Address", func() {
        Description("Example of a residential address")
        Value(Val{
            "street": "123 Main St",
            "city": "Boston",
        })
    })
})
```

---

## API 定義

`API`関数は、サービスのグローバルプロパティを定義し、デザインのルートとなります。

### 基本構造

```go
var _ = API("calculator", func() {
    Title("Calculator API")
    Description("A simple calculator service")
    Version("1.0.0")
})
```

### 完全な例

```go
var _ = API("bookstore", func() {
    Title("Bookstore API")
    Description("A modern bookstore management API")
    Version("2.0.0")
    TermsOfService("https://example.com/terms")
    
    Contact(func() {
        Name("API Support")
        Email("support@example.com")
        URL("https://example.com/support")
    })
    
    License(func() {
        Name("Apache 2.0")
        URL("https://www.apache.org/licenses/LICENSE-2.0.html")
    })
    
    Docs(func() {
        Description("Comprehensive API documentation")
        URL("https://example.com/docs")
    })
})
``` の場合

### サーバーの構成

APIにアクセスできる場所を定義します：

```go
var _ = API("bookstore", func() {
    Server("production", func() {
        Description("Production server")
        
        Host("production", func() {
            URI("https://{version}.api.example.com")
            URI("grpcs://{version}.grpc.example.com")
            
            Variable("version", String, "API version", func() {
                Default("v2")
                Enum("v1", "v2")
            })
        })
    })
    
    Server("development", func() {
        Host("localhost", func() {
            URI("http://localhost:8000")
            URI("grpc://localhost:8080")
        })
    })
})
```

### APIレベルのエラー

APIレベルで再利用可能なエラーを定義します：

```go
var _ = API("bookstore", func() {
    Error("unauthorized", ErrorResult, "Authentication failed")
    
    HTTP(func() {
        Response("unauthorized", StatusUnauthorized)
    })
    
    GRPC(func() {
        Response("unauthorized", CodeUnauthenticated)
    })
})
``` です。

サービスはこれらのエラーを名前で参照できる：

```go
var _ = Service("billing", func() {
    Error("unauthorized")  // Inherits all properties
})
```

---

## サービスとメソッド

サービスは、特定の機能を提供する関連メソッドをグループ化したものです。

### サービス DSL

```go
var _ = Service("users", func() {
    Description("User management service")
    
    Docs(func() {
        Description("Detailed documentation for the user service")
        URL("https://example.com/docs/users")
    })

    // Service-level errors
    Error("unauthorized", String, "Authentication failed")
    Error("not_found", NotFound, "Resource not found")
    
    // Metadata
    Meta("swagger:tag", "Users")
    
    // Security requirements
    Security(OAuth2, func() {
        Scope("read:users")
        Scope("write:users")
    })
    
    Method("create", func() {
        // ... method definition
    })
    
    Method("list", func() {
        // ... method definition
    })
})
``` サービス・DSL

### メソッド DSL

```go
Method("add", func() {
    Description("Add two numbers together")
    
    Payload(func() {
        Field(1, "a", Int32, "First operand")
        Field(2, "b", Int32, "Second operand")
        Required("a", "b")
    })
    
    Result(Int32)
    
    Error("overflow")
})
``` メソッドDSL

### ペイロードの種類

```go
// Simple payload
Method("getUser", func() {
    Payload(String, "User ID")
    Result(User)
})

// Structured payload
Method("createUser", func() {
    Payload(func() {
        Field(1, "name", String, "User's full name")
        Field(2, "email", String, "Email address", func() {
            Format(FormatEmail)
        })
        Field(3, "role", String, "User role", func() {
            Enum("admin", "user", "guest")
        })
        Required("name", "email", "role")
    })
    Result(User)
})

// Reference to predefined type
Method("updateUser", func() {
    Payload(UpdateUserPayload)
    Result(User)
})
```

### 結果のタイプ

```go
// Simple result
Method("count", func() {
    Result(Int64)
})

// Structured result
Method("search", func() {
    Result(func() {
        Field(1, "items", ArrayOf(User), "Matching users")
        Field(2, "total", Int64, "Total count")
        Required("items", "total")
    })
})
``` 結果の種類

### ストリーミング・メソッド

```go
Method("streamNumbers", func() {
    Description("Stream a sequence of numbers")
    StreamingPayload(Int32)
    StreamingResult(Int32)
})

Method("processEvents", func() {
    StreamingPayload(func() {
        Field(1, "event_type", String)
        Field(2, "data", Any)
        Required("event_type", "data")
    })
    
    Result(func() {
        Field(1, "processed", Int64)
        Field(2, "errors", Int64)
        Required("processed", "errors")
    })
})
```

---

## HTTP トランスポートマッピング

HTTP DSLは、サービスメソッドがどのようにHTTPエンドポイントにマッピング されるかを定義します。

### HTTP リクエストコンポーネント

HTTP リクエストには、ペイロード属性にマッピングできる 4 つの部分があります：

1. **URLパス・パラメーター** - 例えば、`/bottle/{id}` です。
2. **クエリー文字列パラメーター
3. **HTTPヘッダー
4. **リクエストボディ

マッピング式
- `Param` - パスまたはクエリ文字列からロードする。
- `Header` - HTTPヘッダーからロードする。
- `Body` - リクエストボディからロードする

### オブジェクト以外のペイロードのマッピング

プリミティブ、配列、またはマップのペイロードの場合、値は最初に定義された要素からロードされます：

```go
// Path parameter
Method("show", func() {
    Payload(Int)
    HTTP(func() {
        GET("/{id}")
    })
})
// GET /1 → Show(1)

// Array in path (comma-separated)
Method("delete", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        DELETE("/{ids}")
    })
})
// DELETE /a,b → Delete([]string{"a", "b"})

// Array in query string
Method("list", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        GET("")
        Param("filter")
    })
})
// GET /?filter=a&filter=b → List([]string{"a", "b"})

// Header
Method("list", func() {
    Payload(Float32)
    HTTP(func() {
        GET("")
        Header("version")
    })
})
// GET / with header version=1.0 → List(1.0)

// Map in body
Method("create", func() {
    Payload(MapOf(String, Int))
    HTTP(func() {
        POST("")
    })
})
// POST / {"a": 1, "b": 2} → Create(map[string]int{"a": 1, "b": 2})
```

### マッピングオブジェクトペイロード

オブジェクトのペイロードでは、各属性がどこから来るのかを指定します：

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
    HTTP(func() {
        POST("/{id}")
        // id from path, name and age from body
    })
})
// POST /1 {"name": "a", "age": 2} → Create(&CreatePayload{ID: 1, Name: "a", Age: 2})
```

オブジェクト以外のボディを指定するには、`Body`を使う：

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
    HTTP(func() {
        PUT("/{id}")
        Body("rates")  // Body is the map directly
    })
})
// PUT /1 {"a": 0.5, "b": 1.0} → Rate(&RatePayload{ID: 1, Rates: map[string]float64{...}})
```

### 要素名のマッピング

HTTP 要素名を属性名にマッピングします：

```go
Header("version:X-Api-Version")  // version attribute from X-Api-Version header

Body(func() {
    Attribute("name:n")  // name attribute from "n" field in JSON
    Attribute("age:a")   // age attribute from "a" field in JSON
})
```

---

## gRPCトランスポートマッピング

gRPC DSLは、サービスメソッドがgRPCプロシージャにどのようにマッピングされるかを定義します。

### gRPC の機能

1. **メッセージ・マッピング** - フィールド番号によるリクエスト/レスポンス構造の定義
2. **ステータスコード** - 結果を gRPC ステータスコードにマッピングします。
3. **メタデータ** - gRPCメタデータ処理の設定

### 混合プロトコルのサポート

サービスは HTTP と gRPC の両方をサポートできます：

```go
Method("create", func() {
    Payload(CreatePayload)
    Result(User)
    
    HTTP(func() {
        POST("/")
        Response(StatusCreated)
    })
    
    GRPC(func() {
        Response(CodeOK)
    })
})
``` を参照してください。

RESTfulリソースマッピング：

```go
Service("users", func() {
    HTTP(func() {
        Path("/users")
    })
    
    Method("list", func() {
        HTTP(func() { GET("/") })           // GET /users
        GRPC(func() { Response(CodeOK) })
    })
    
    Method("show", func() {
        HTTP(func() { GET("/{id}") })       // GET /users/{id}
        GRPC(func() { Response(CodeOK) })
    })
})
``` です。

---

## セキュリティ

Goaは認証と認可のためのDSL構造を提供します。

### セキュリティスキーム

#### JWT (JSON ウェブトークン)

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT-based authentication")
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
``` JWT

#### API キー

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("API key-based authorization")
})
```

#### 基本認証

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Username/password authentication")
    Scope("api:read", "Read-only access")
})
``` ##基本認証

#### OAuth2

```go
var OAuth2Auth = OAuth2Security("oauth2", func() {
    AuthorizationCodeFlow(
        "http://auth.example.com/authorize",
        "http://auth.example.com/token",
        "http://auth.example.com/refresh",
    )
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
```

### セキュリティの適用

#### メソッドレベル

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
        Header("token:Authorization")
    })
})
```

#### 複数のスキーム

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
        Param("key:k")
    })
})
``` ##複数のスキーム

### セキュリティの実装

Goaは、サービスが実装しなければならない`Auther`インターフェースを生成します：

```go
type Auther interface {
    BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error)
    JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error)
    APIKeyAuth(ctx context.Context, key string, scheme *security.APIKeyScheme) (context.Context, error)
    OAuth2Auth(ctx context.Context, token string, scheme *security.OAuth2Scheme) (context.Context, error)
}
``` インターフェイスを生成します。

JWTの実装例：

```go
func (s *svc) JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error) {
    claims := make(jwt.MapClaims)
    
    _, err := jwt.ParseWithClaims(token, claims, func(_ *jwt.Token) (interface{}, error) { 
        return Key, nil 
    })
    if err != nil {
        return ctx, ErrInvalidToken
    }

    // Validate required scopes
    scopes, ok := claims["scopes"].([]any)
    if !ok {
        return ctx, ErrInvalidTokenScopes
    }
    scopesInToken := make([]string, len(scopes))
    for _, scp := range scopes {
        scopesInToken = append(scopesInToken, scp.(string))
    }
    if err := scheme.Validate(scopesInToken); err != nil {
        return ctx, ErrInvalidScopes
    }

    return contextWithAuthInfo(ctx, authInfo{claims: claims}), nil
}
```

Basic Authの実装例：

```go
func (s *svc) BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error) {
    if user != "goa" || pass != "rocks" {
        return ctx, ErrUnauthorized
    }
    return contextWithAuthInfo(ctx, authInfo{user: user}), nil
}
```

---

## ベストプラクティス

### タイプ編成
- 関連する型をグループ化する
- 意味のあるフィールド名と説明を使用する
- 一貫した命名規則に従う
- タイプを集中させ、まとまりを持たせる

### バリデーション戦略
- 各フィールドに適切な制約を追加する
- 必須フィールドを明示的に定義する
- 標準的なフォーマットにはフォーマットバリデータを使う
- ドメイン固有のバリデーションルールを考慮する

### サービス設計
- 関連する機能をサービスにまとめる
- サービスの範囲を絞って、まとまりを持たせる
- 明確で説明的なサービス名を使用する
- サービスの目的と使用方法を文書化する

### メソッド設計
- アクション指向の明確なメソッド名を使用する
- 詳細な説明を提供する
- 適切なエラー応答を定義する
- 検証要件を考慮する

### HTTP の設計
- 一貫したURLパターンを使用する
- RESTfulの規約に従う
- 適切なステータスコードを選択する
- 一貫したエラー処理

### セキュリティ
- ユースケースに適したセキュリティスキームを使用する
- 適切なトークン検証を実装する
- 明確なスコープ階層を定義する
- 本番環境で HTTPS を使用する
