---
title: "インターセプターの種類"
description: "様々なGoaインターセプターの種類とそのユースケースを理解する"
weight: 2
---

Goaは異なるシナリオを処理するために複数の種類のインターセプターをサポートしています。
このガイドでは、異なる種類とその使用タイミングについて説明します。

## コアコンセプト

インターセプターを設計する際には、3つの重要な次元を考慮する必要があります：

1. サーバーサイドとクライアントサイド：
   - サーバーサイドインターセプターはサービス実装で実行される
   - クライアントサイドインターセプターは生成されたクライアントで実行される

2. ペイロードとリザルトのアクセス：
   - ペイロード：受信リクエストへのアクセス/変更
   - リザルト：送信レスポンスへのアクセス/変更

3. 読み取りと書き込みのアクセス：
   - 読み取り：変更せずにデータを検査
   - 書き込み：データを変更または強化

インターセプターはアクセスしたい属性を名前で参照するだけでよく、属性の完全な定義や説明を
再定義する必要はありません。メソッド設計には、これらの属性がペイロードとリザルトの型に
含まれている必要があります。

## 基本的なパターン

### 読み取り専用アクセス

データを変更せずに検査する必要がある場合に使用します。モニタリング、ロギング、バリデーションに
最適です：

```go
var Monitor = Interceptor("Monitor", func() {
    Description("データを変更せずにメトリクスを収集します")
    
    // ペイロードからリクエストサイズを読み取る
    ReadPayload(func() {
        Attribute("size")        // 型と説明はペイロード型から継承
    })
    
    // リザルトからレスポンスステータスを読み取る
    ReadResult(func() {
        Attribute("status")      // 型と説明はリザルト型から継承
    })
})
```

`ReadPayload`と`ReadResult` DSL関数はペイロードとリザルトの属性への読み取り専用アクセスを宣言します：
- インターセプターはアクセスしたい属性名を列挙するだけでよい
- 型と説明はメソッドのペイロードとリザルトの型から継承される
- 複数の属性を1つの`ReadPayload`または`ReadResult`ブロックに列挙できる
- インターセプターの実装はこれらの属性を読み取り専用フィールドとして受け取る

### 書き込みアクセス

インターセプターがデータを変更または追加する必要がある場合にこのパターンを使用します：

```go
var Enricher = Interceptor("Enricher", func() {
    Description("リクエストとレスポンスにコンテキスト情報を追加します")
    
    // ペイロードにリクエストIDを追加
    WritePayload(func() {
        Attribute("requestID")   // ペイロード型で定義されている必要がある
    })
    
    // リザルトにタイミングを追加
    WriteResult(func() {
        Attribute("processedAt") // リザルト型で定義されている必要がある
    })
})
```

`WritePayload`と`WriteResult` DSL関数は書き込みアクセスを宣言します：
- 列挙された属性はインターセプターの実装で変更可能
- メソッドのペイロードとリザルトの型にこれらの属性が含まれている必要がある
- 必要に応じて複数の書き込みブロックを定義可能
- 書き込みアクセスには同じ属性への読み取りアクセスが暗黙的に含まれる

### 組み合わせアクセス

インターセプターが読み取りと書き込みの両方のアクセスを必要とする場合、パターンを組み合わせます：

```go
var DataProcessor = Interceptor("DataProcessor", func() {
    Description("リクエストとレスポンスの両方を処理します")
    
    // リクエストデータを変換
    ReadPayload(func() {
        Attribute("rawData")     // ペイロードからの入力データ
        Attribute("format")      // 現在のフォーマット
    })
    WritePayload(func() {
        Attribute("processed")   // 変換されたデータ
        Attribute("newFormat")   // 新しいフォーマット
    })
    
    // レスポンスデータを変換
    ReadResult(func() {
        Attribute("status")      // レスポンスステータス
        Attribute("data")        // レスポンスデータ
    })
    WriteResult(func() {
        Attribute("enriched")    // 強化されたレスポンス
        Attribute("metadata")    // 追加されたメタデータ
    })
})
```

アクセスパターンの組み合わせに関する重要なポイント：
- 読み取りと書き込みのブロックはペイロードとリザルトの両方で自由に組み合わせ可能
- 各ブロックは複数の属性を列挙可能
- 同じ属性が読み取りと書き込みの両方のブロックに現れることが可能
- ブロックの順序は実装に影響しない

## サーバーサイドインターセプター

サーバーインターセプターはサービス実装側で実行され、リクエストがデコードされた後、
サービスメソッドが呼び出される前に実行されます。ロギング、メトリクス収集、リクエストの
強化、レスポンスの変換などの横断的関心事の実装に最適です。

以下は、GETリクエストのレスポンスをキャッシュするサーバーサイドキャッシュインターセプターの
例です：

```go
var Cache = Interceptor("Cache", func() {
    Description("GETリクエストのレスポンスキャッシュを実装します")
    
    // キャッシュキーとして使用するレコードIDを読み取る必要がある
    ReadPayload(func() {
        Attribute("recordID")    // ペイロード型からのUUID
    })
    
    // レスポンスにキャッシュメタデータを追加する
    WriteResult(func() {
        Attribute("cachedAt")    // リザルト型からのString
        Attribute("ttl")         // リザルト型からのInt
    })
})
```

このサーバーサイドインターセプターは以下を示しています：
- ペイロードへの読み取りアクセスとリザルトへの書き込みアクセスを組み合わせる方法
- インターセプターをサービスレベルで適用できること
- DSLでの属性宣言と実装ロジックの分離
- 属性の型はインターセプターではなくメソッドによって定義されること

サービス設計にはこれらの属性が含まれている必要があります：

```go
var _ = Service("catalog", func() {
    // サービス内のすべてのメソッドにキャッシュを適用
    ServerInterceptor(Cache)
    
    Method("get", func() {
        Payload(func() {
            // Cacheインターセプターが使用する属性を定義
            Attribute("recordID", UUID, "キャッシュキーのためのレコード識別子")
        })
        Result(func() {
            // Cacheインターセプターが使用する属性を定義
            Attribute("cachedAt", String, "レスポンスがキャッシュされた時刻")
            Attribute("ttl", Int, "生存時間（秒）")
            // その他のリザルトフィールド...
        })
        HTTP(func() {
            GET("/{recordID}")
            Response(StatusOK)
        })
    })
})
```

## クライアントサイドインターセプター

クライアントインターセプターはクライアント側で、リクエストがサーバーに送信される前に
実行されます。リクエストの強化、レスポンスの処理、クライアントサイドキャッシングなどの
クライアント側の振る舞いを可能にします。

以下は、クライアントコンテキストを追加しレート制限を追跡するクライアントサイド
インターセプターの例です：

```go
var ClientContext = Interceptor("ClientContext", func() {
    Description("リクエストにクライアントコンテキストを追加しレート制限を追跡します")
    
    // 送信リクエストにクライアントコンテキストを追加
    WritePayload(func() {
        Attribute("clientVersion")  // ペイロード型からのString
        Attribute("clientID")       // ペイロード型からのUUID
        Attribute("region")         // ペイロード型からのString
    })
    
    // レスポンスからレート制限情報を追跡
    ReadResult(func() {
        Attribute("rateLimit")           // リザルト型から
        Attribute("rateLimitRemaining")  // リザルト型から
        Attribute("rateLimitReset")      // リザルト型から
    })
})
```

このクライアントサイドインターセプターは以下を示しています：
- クライアントインターセプターが`WritePayload`を使用して送信リクエストを変更する方法
- `ReadResult`を使用してレスポンスデータを読み取る方法
- 同じDSLパターンがクライアントとサーバーの両方のインターセプターで機能すること
- メソッド設計で必要なすべての属性を宣言することの重要性

サービスはこれらの属性を定義する必要があります：

```go
var _ = Service("inventory", func() {
    // すべてのクライアント呼び出しにコンテキスト情報を含める
    ClientInterceptor(ClientContext)
    
    Method("list", func() {
        Payload(func() {
            // ビジネスロジックの属性
            Attribute("page", Int, "ページ番号")
            Attribute("perPage", Int, "1ページあたりのアイテム数")
            
            // ClientContextインターセプターが必要とする属性
            Attribute("clientVersion", String, "クライアントライブラリのバージョン")
            Attribute("clientID", UUID, "このクライアントインスタンスの一意の識別子")
            Attribute("region", String, "クライアントの地理的リージョン")
        })
        Result(func() {
            // ビジネスロジックの属性
            Attribute("items", ArrayOf(Item))
            
            // ClientContextインターセプターが必要とする属性
            Attribute("rateLimit", Int, "現在のレート制限")
            Attribute("rateLimitRemaining", Int, "現在のウィンドウで残っているリクエスト数")
            Attribute("rateLimitReset", Int, "レート制限ウィンドウがリセットされる時刻")
        })
    })
})
```

## ストリーミングインターセプター

ストリーミングインターセプターは、ペイロード、リザルト、または両方がメッセージのストリームである
ストリーミングメソッドを処理します。特別なストリーミングバリアントを使用します。 