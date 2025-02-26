---
title: "クロスオリジンリソース共有（CORS）"
description: "CORSプラグインを使用してGoaサービスでCORSポリシーを設定する"
weight: 4
---

# クロスオリジンリソース共有（CORS）

クロスオリジンリソース共有（CORS）は、Webブラウザによって実装されるセキュリティ機能で、
あるドメインのWebページが異なるドメインのリソースをリクエストし、やり取りする方法を制御します。
異なるドメインでホストされているWebアプリケーションからアクセスされる必要があるAPIを構築する場合、
適切なCORS設定が不可欠です。CORSについての詳細は
[MDN Web Docs](https://developer.mozilla.org/ja/docs/Web/HTTP/CORS)で学ぶことができます。

Goaは、サービスのCORSポリシーを定義および実装を容易にする強力な
[CORSプラグイン](https://github.com/goadesign/plugins/tree/v3/cors)を提供しています。
このプラグインは、必要なすべてのHTTPヘッダーとプリフライトリクエストを自動的に処理し、
アクセスポリシーの定義に集中できるようにします。

## CORSプラグインのセットアップ

GoaデザインでCORS機能を使用するには、CORSプラグインと標準のGoa DSLパッケージの両方を
インポートする必要があります：

```go
import (
    cors "goa.design/plugins/v3/cors/dsl"
    . "goa.design/goa/v3/dsl"
)
```

## CORSポリシーの定義

CORSポリシーは、Goaデザインの2つのレベルで定義できます：

1. APIレベル：これらのポリシーは、すべてのサービスにわたるすべてのエンドポイントにグローバルに適用されます
2. サービスレベル：これらのポリシーは、特定のサービス内のエンドポイントにのみ適用されます

CORSプラグインは、CORSポリシーのさまざまな側面を設定するためのいくつかの関数を提供します：

- `Origin`：APIにアクセスできる許可されたオリジン（ドメイン）を指定します
- `Methods`：許可されたHTTPメソッドを定義します
- `Headers`：許可されたHTTPヘッダーを指定します
- `Expose`：ブラウザがアクセスを許可されるヘッダーを一覧表示します
- `MaxAge`：ブラウザがプリフライトリクエストの結果をキャッシュする期間を設定します
- `Credentials`：クッキーとHTTP認証情報の送信を有効にします

### 例：サービスレベルのCORS設定

サービスレベルでCORSを設定するさまざまな方法を示す例を以下に示します：

```go
var _ = Service("calc", func() {
    // "localhost"からのリクエストのみを許可
    cors.Origin("localhost")

    // domain.comの任意のサブドメインからのリクエストを許可
    cors.Origin("*.domain.com", func() {
        cors.Headers("X-Shared-Secret", "X-Api-Version")
        cors.MaxAge(100)
        cors.Credentials()
    })

    // 任意のオリジンからのリクエストを許可
    cors.Origin("*")

    // 正規表現にマッチするオリジンからのリクエストを許可
    cors.Origin("/.*domain.*/", func() {
        cors.Headers("*")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
    })
})
```

### 完全なデザイン例

計算機サービスでAPIレベルとサービスレベルの両方でCORSを実装する完全な例を以下に示します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)

var _ = API("calc", func() {
    Title("CORS例計算機API")
    Description("このAPIはgoa CORSプラグインの使用を示します")
    
    // APIレベルのCORSポリシー
    cors.Origin("http://127.0.0.1", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
        cors.MaxAge(600)
        cors.Credentials()
    })
})

var _ = Service("calc", func() {
    Description("計算機サービスはCORSポリシーを定義する公開エンドポイントを公開します。")
    
    // サービスレベルのCORSポリシー
    cors.Origin("/.*localhost.*/", func() {
        cors.Methods("GET", "POST")
        cors.Expose("X-Time", "X-Api-Version")
        cors.MaxAge(100)
    })

    Method("add", func() {
        // ... 通常通り ...
    })
})
```

## 動作の仕組み

デザインでCORSプラグインを有効にすると、Goaは自動的に：

1. ブラウザからのプリフライト（OPTIONS）リクエストを処理するCORSハンドラーを生成します
2. ポリシー定義に基づいて、すべてのHTTPエンドポイントレスポンスに適切なCORSヘッダーを追加します
3. オリジンをパターンや正規表現と照合する複雑なロジックを処理します
4. デザインで指定されたとおりにキャッシュヘッダーと認証情報を管理します

このプラグインは、低レベルのCORS実装の詳細をすべて処理し、DSLを使用して高レベルで
セキュリティポリシーを定義することに集中できるようにします。 