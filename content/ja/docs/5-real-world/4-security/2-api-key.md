---
title: APIキー認証
description: GoaのAPIでAPIキー認証を実装する方法を学びます
weight: 2
---

# GoaにおけるAPIキー認証

APIキー認証は、APIを保護するためのシンプルで一般的な方法です。クライアントに一意のキーを配布し、
クライアントはそのキーをリクエストに含めます。この方法は、使用状況の追跡、レート制限の実装、
または異なるクライアントに異なるアクセスレベルを提供したい公開APIに特に有用です。

## APIキー認証の仕組み

APIキーは以下のような方法で送信できます：
1. ヘッダーとして（最も一般的）
2. クエリパラメータとして
3. リクエストボディ内

最も安全な方法は、`X-API-Key`や`Authorization`のような名前のヘッダーを使用することです。

## GoaでのAPIキー認証の実装

### 1. セキュリティスキームの定義

まず、設計パッケージでAPIキーセキュリティスキームを定義します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// APIKeyAuthはセキュリティスキームを定義
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("APIキーセキュリティ")
    Header("X-API-Key")  // ヘッダー名を指定
})
```

ヘッダーの代わりにクエリパラメータを使用することもできます：

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("APIキーセキュリティ")
    Query("api_key")  // クエリパラメータ名を指定
})
```

### 2. セキュリティスキームの適用

他のセキュリティスキームと同様に、APIキー認証は異なるレベルで適用できます：

```go
// APIレベル - すべてのサービスとメソッドに適用
var _ = API("secure_api", func() {
    Security(APIKeyAuth)
})

// サービスレベル - サービス内のすべてのメソッドに適用
var _ = Service("secure_service", func() {
    Security(APIKeyAuth)
})

// メソッドレベル - このメソッドにのみ適用
Method("secure_method", func() {
    Security(APIKeyAuth)
})
```

### 3. ペイロードの定義

APIキー認証を使用するメソッドでは、キーをペイロードに含めます：

```go
Method("getData", func() {
    Security(APIKeyAuth)
    Payload(func() {
        APIKey("api_key", "key", String, func() {
            Description("認証用のAPIキー")
            Example("abcdef123456")
        })
        Required("key")
        
        // 追加のペイロードフィールド
        Field(1, "query", String, "検索クエリ")
    })
    Result(ArrayOf(String))
    Error("unauthorized")
    HTTP(func() {
        GET("/data")
        // キーをヘッダーにマッピング
        Header("key:X-API-Key")
        Response("unauthorized", StatusUnauthorized)
    })
})
```

### 4. セキュリティハンドラーの実装

Goaがコードを生成したら、セキュリティハンドラーを実装する必要があります：

```go
// SecurityAPIKeyFuncはAPIキー認証の認可ロジックを実装
func (s *service) APIKeyAuth(ctx context.Context, key string) (context.Context, error) {
    // ここでキーの検証ロジックを実装
    valid, err := s.validateAPIKey(key)
    if err != nil {
        return ctx, err
    }
    if !valid {
        return ctx, genservice.MakeUnauthorized(fmt.Errorf("無効なAPIキー"))
    }
    
    // キー固有のデータをコンテキストに追加できます
    ctx = context.WithValue(ctx, "api_key_id", key)
    return ctx, nil
}

func (s *service) validateAPIKey(key string) (bool, error) {
    // キー検証の実装
    // これはデータベース、キャッシュなどをチェックする可能性があります
    return key == "valid-key", nil
}
```

## APIキー認証のベストプラクティス

### 1. キーの生成

強力でランダムなAPIキーを生成します：

```go
func GenerateAPIKey() string {
    // 32バイトのランダムデータを生成
    bytes := make([]byte, 32)
    if _, err := rand.Read(bytes); err != nil {
        panic(err)
    }
    // base64でエンコード
    return base64.URLEncoding.EncodeToString(bytes)
}
```

### 2. キーの保存

APIキーを安全に保存します：
- 保存前にキーをハッシュ化
- 安全なキーバリューストアやデータベースを使用
- キーローテーションメカニズムを実装

キー保存スキーマの例：

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL,
    client_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

### 4. キーのメタデータ

より良い制御のためにAPIキーにメタデータを関連付けます：

```go
type APIKeyMetadata struct {
    ClientID    string
    Plan        string    // 例："free"、"premium"
    Permissions []string  // 例：["read"、"write"]
    ExpiresAt   time.Time
}

func (s *service) APIKeyAuth(ctx context.Context, key string) (context.Context, error) {
    metadata, err := s.getAPIKeyMetadata(key)
    if err != nil {
        return ctx, err
    }
    
    // メタデータをコンテキストに追加
    ctx = context.WithValue(ctx, "api_key_metadata", metadata)
    return ctx, nil
}
```

## 実装例

以下は、GoaサービスでAPIキー認証を実装する完全な例です：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("APIキーを使用した認証")
    Header("X-API-Key")
})

var _ = API("weather_api", func() {
    Title("天気API")
    Description("APIキー認証付きの天気予報API")
    
    // デフォルトでAPIキー認証を適用
    Security(APIKeyAuth)
})

var _ = Service("weather", func() {
    Description("天気予報サービス")
    
    Method("forecast", func() {
        Description("天気予報を取得")
        
        Payload(func() {
            // APIキーは自動的に含まれます
            Field(1, "location", String, "予報を取得する場所")
            Field(2, "days", Int, "予報を取得する日数")
            Required("location")
        })
        
        Result(func() {
            Field(1, "location", String, "場所")
            Field(2, "forecast", ArrayOf(WeatherDay))
        })
        
        HTTP(func() {
            GET("/forecast/{location}")
            Param("days")
            Response(StatusOK)
            Response(StatusUnauthorized, func() {
                Description("無効または不足しているAPIキー")
            })
            Response(StatusTooManyRequests, func() {
                Description("レート制限を超過")
            })
        })
    })
    
    // パブリックエンドポイントの例
    Method("health", func() {
        Description("ヘルスチェックエンドポイント")
    })
}) 