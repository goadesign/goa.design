---
linkTitle: "ベストプラクティス"
title: インターセプターのベストプラクティス
description: "Goaインターセプターを実装するためのガイドラインとベストプラクティス"
weight: 4
---


このガイドでは、Goaサービスでインターセプターを実装する際のベストプラクティスとガイドラインについて説明します。

## 設計時のベストプラクティス

### 1. インターセプターを焦点を絞って設計する

インターセプターは単一責任の原則に従うべきです。各インターセプターは、ロギング、メトリクス、
認証などの特定の横断的関心事を1つだけ処理するようにします。これにより以下の利点が得られます：

- 独立して保守・更新が容易
- 分離してテストが簡単
- 異なるサービス間で再利用が可能
- 目的と動作が明確
- 異なる組み合わせで合成が容易

例えば、ロギングとメトリクスの両方を処理する1つの大きなインターセプターを作成するのではなく、
必要に応じて一緒に使用できる2つの焦点を絞ったインターセプターを作成します。この関心事の
分離により、より保守性と柔軟性の高いコードが実現できます。

以下は、焦点を絞ったインターセプターと焦点が散漫なインターセプターの違いを示す例です：

```go
// Good: 焦点を絞ったインターセプター
var Auth = Interceptor("Auth", func() {
    Description("認証のみを処理")
    ReadPayload(func() {
        Attribute("token", String)
    })
})

var Metrics = Interceptor("Metrics", func() {
    Description("メトリクスの収集のみを処理")
    ReadResult(func() {
        Attribute("status", Int)
    })
})

// Bad: 責任が多すぎる
var AuthAndMetrics = Interceptor("AuthAndMetrics", func() {
    Description("認証とメトリクスの両方を処理")
    // 関心事を混ぜることでインターセプターの保守が難しくなる
})
```

焦点を絞ったインターセプターは、テスト、保守が容易で、必要に応じて異なる組み合わせで
合成できます。

### 2. 適切なスコープを選択する

インターセプターをサービス全体に適用するか、特定のメソッドにのみ適用するかを慎重に
検討してください。サービスレベルのインターセプターは一貫した横断的関心事に適しており、
メソッドレベルのインターセプターは特定の要件に適しています。

以下の例は、異なるスコープでインターセプターを適用する方法を示しています：

```go
var _ = Service("users", func() {
    // Good: 認証はすべてのメソッドに適用
    ServerInterceptor(Auth)
    
    Method("list", func() {
        // Good: メトリクスはlistメソッドにのみ必要
        ServerInterceptor(Metrics)
    })
})
```

認証はどこでも必要なためサービス全体に適用され、メトリクス収集は関連するlistメソッドにのみ
適用されています。

### 3. 説明的な名前とドキュメントを使用する

明確な命名とドキュメントは、他の開発者がインターセプターの目的と動作を理解するのに
役立ちます。名前はインターセプターの機能を示し、説明はその目的と重要な詳細を説明する
必要があります。

以下の例を比較してください：

```go
// Good: 明確な名前と説明
var RequestValidator = Interceptor("RequestValidator", func() {
    Description("ビジネスルールに対して受信リクエストを検証")
    ReadPayload(func() {
        Attribute("data")
    })
})

// Bad: 目的が不明確
var Handler = Interceptor("Handler", func() {
    Description("何かを処理")
    ReadPayload(func() {
        Attribute("data")
    })
})
```

適切に命名されたインターセプターは、その目的を明確にし、有用なドキュメントを提供します。

## 実装のベストプラクティス

### 1. エラーを適切に処理する

GoaのエラーDSLを使用して設計時にエラーを定義します。これにより、型安全性とサービス全体での
一貫したエラー処理が保証されます。エラー定義はAPIの契約の一部となり、適切なヘルパー関数が
生成されます。

以下は、エラーを適切に定義して使用する方法です：

```go
// 設計内で
var _ = Service("users", func() {
    // サービス固有のエラーを定義
    Error("unauthorized", ErrorResult, "認証に失敗しました")
    Error("invalid_token", ErrorResult, "無効または不正なトークン")
    
    // インターセプター設計でエラーを使用
    var Auth = Interceptor("Auth", func() {
        Error("unauthorized")
        Error("invalid_token")
        ReadPayload(func() {
            Attribute("token")
        })
    })
    
    ServerInterceptor(Auth)
})

// 実装内で
func (i *ServerInterceptors) Auth(ctx context.Context, info *AuthInfo, next goa.Endpoint) (any, error) {
    p := info.Payload()
    
    // 設計時のエラーを使用
    token := p.Token()
    if token == "" {
        return nil, genservice.MakeUnauthorized(fmt.Errorf("認証トークンが必要です"))
    }
    
    claims, err := validateToken(token)
    if err != nil {
        return nil, genservice.MakeInvalidToken(err.Error())
    }
    
    return next(ctx, info.RawPayload())
}
```

生成された`Make*`関数は、エラーが設計と一致し、適切なエラーコードとメタデータを含むことを
保証します。このアプローチは、一般的なエラーよりも優れたエラー処理を提供し、APIの一貫性を
維持するのに役立ちます。

### 2. コンテキスト値を保持する

インターセプターでコンテキストを扱う際は、コンテキスト値を適切に管理し保持することが
重要です。多くのライブラリやツール（トレーサー、ロガー、認証など）はコンテキストに
情報を格納します。インターセプターは以下を行う必要があります：

- 新しいコンテキストを作成する代わりに既存のコンテキストから派生させる
- 新しい値を追加する際に既存の値を保持する
- deferを使用してリソースを適切にクリーンアップする
- 強化されたコンテキストを次のハンドラーに渡す

以下は、適切なコンテキスト処理の例です：

```go
func (i *ServerInterceptors) Tracer(ctx context.Context, info *TracerInfo, next goa.Endpoint) (any, error) {
    // Good: 新しいコンテキストを派生させ、既存の値を保持
    ctx, span := tracer.Start(ctx, info.Method())
    defer span.End()
    
    return next(ctx, info.RawPayload())
}
```

このアプローチにより以下が保証されます：
- 既存のコンテキスト値（リクエストIDや認証情報など）が保持される
- エラーが発生してもリソースが適切にクリーンアップされる
- 下流のハンドラーが必要なすべてのコンテキスト情報にアクセスできる

## パフォーマンスのベストプラクティス

インターセプターはすべてのリクエストで実行されるため、そのパフォーマンスへの影響は
サービス全体で倍増します。以下のプラクティスに従うことで、インターセプターが
スケールしても効率的に動作することを保証できます。

### 1. アロケーションを最小限に抑える

メモリアロケーションは、特に高負荷時にパフォーマンスに大きな影響を与える可能性が
あります。オブジェクトプールを使用し、可能な場合は事前アロケーションを行い、
インターセプターでの不要なアロケーションを避けます。一般的な手法には以下があります：

- 頻繁にアロケーションされるオブジェクトにsync.Poolを使用
- 既知の容量でスライスを事前アロケーション
- リクエスト間でオブジェクトを再利用
- 不要な文字列連結を避ける

以下は、効率的なオブジェクト管理の例です：

```go
func (i *ServerInterceptors) Metrics(ctx context.Context, info *MetricsInfo, next goa.Endpoint) (any, error) {
    // Good: オブジェクトを再利用
    labels := i.getLabelsFromPool()
    defer i.putLabelsToPool(labels)
    
    // Bad: 毎回新しいオブジェクトを作成
    // labels := make(map[string]string)
    
    return next(ctx, info.RawPayload())
}
```

このアプローチにより、ガベージコレクションの負荷が軽減され、特に高トラフィック時の
全体的なサービスパフォーマンスが向上します。

### 2. 適切なキャッシングを使用する

キャッシングはパフォーマンスを劇的に改善できますが、慎重に実装する必要があります。
以下を考慮してください：

- キャッシュの期間と有効期限の戦略
- キャッシュキーの設計
- メモリ使用量と退避ポリシー
- キャッシュ無効化メカニズム
- 並行アクセスパターン

以下は、効果的なキャッシュ使用の例です：

```go
func (i *ClientInterceptors) Cache(ctx context.Context, info *CacheInfo, next goa.Endpoint) (any, error) {
    p := info.Payload()
    
    // Good: 適切なキャッシュ期間を使用
    if cached := i.cache.Get(p.CacheKey()); cached != nil {
        if !isExpired(cached, p.TTL()) {
            return cached, nil
        }
    }
    
    return next(ctx, info.RawPayload())
}
``` 