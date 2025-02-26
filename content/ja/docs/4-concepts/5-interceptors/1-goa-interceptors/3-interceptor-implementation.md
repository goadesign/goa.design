---
title: "インターセプターの実装"
description: "Goaインターセプターの実装方法と一般的なパターンを理解する"
weight: 3
---

このガイドでは、インターセプターパターンと`next`関数が提供する柔軟性に焦点を当てながら、
Goaでインターセプターを実装する方法について説明します。

## 実装の構造

Goaは設計に基づいて型安全なインターセプターインターフェースを生成します。各インターセプター
メソッドは以下のシグネチャに従います：

```go
func (i *Interceptor) MethodName(ctx context.Context, info *InterceptorInfo, next goa.Endpoint) (any, error)
```

各パラメータの意味：
- `ctx`：リクエストコンテキスト
- `info`：ペイロードとリザルトの属性への型安全なアクセス
- `next`：ラップされたエンドポイント（サービスメソッドまたは次のインターセプター）

## Next関数

`next`関数はインターセプターの柔軟性の鍵となります。ラップされたエンドポイントを表し、
インターセプターコードの任意の時点で呼び出すことができます。これにより3つの主要な
パターンが可能になります：

### 1. 前処理パターン

コンテキストやペイロードを変更した後、最後に`next`を呼び出します：

```go
func (i *Interceptor) SetDeadline(ctx context.Context, info *SetDeadlineInfo, next goa.Endpoint) (any, error) {
    // エンドポイントを呼び出す前にコンテキストを変更
    deadline := time.Now().Add(30 * time.Second)
    ctx, cancel := context.WithDeadline(ctx, deadline)
    defer cancel()
    
    // 変更されたコンテキストでエンドポイントを呼び出す
    return next(ctx, info.RawPayload())
}
```

### 2. 後処理パターン

最初に`next`を呼び出し、その結果を処理します：

```go
func (i *Interceptor) Cache(ctx context.Context, info *CacheInfo, next goa.Endpoint) (any, error) {
    // 最初にエンドポイントを呼び出す
    resp, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // レスポンスを処理
    if result := info.Result(resp); result != nil {
        // 結果をキャッシュ...
    }
    
    return resp, nil
}
```

### 3. ラッパーパターン

`next`の呼び出しの前後で処理を行います：

```go
func (i *Interceptor) RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error) {
    // 前処理
    start := time.Now()
    payload := info.RawPayload()
    
    // エンドポイントを呼び出す
    resp, err := next(ctx, payload)
    
    // 後処理
    duration := time.Since(start)
    if err != nil {
        log.Printf("リクエストが失敗: %v, 所要時間: %v", err, duration)
        return nil, err
    }
    
    log.Printf("リクエストが成功, 所要時間: %v", duration)
    return resp, nil
}
```

## Infoオブジェクトの使用

生成された`info`オブジェクトは、ペイロードとリザルトの属性への型安全なアクセスを提供します。
アクセスメソッドは設計DSLに基づいて生成されます：

```go
// 設計内で
var TraceRequest = Interceptor("TraceRequest", func() {
    Description("リクエストにトレースコンテキストを追加します")
    
    ReadPayload(func() {
        Attribute("trace_id")    // info.TraceID()メソッドを生成
        Attribute("span_id")     // info.SpanID()メソッドを生成
    })
    
    WriteResult(func() {
        Attribute("duration")    // info.SetDuration()メソッドを生成
    })
})

// 生成された実装内で
func (i *Interceptor) TraceRequest(ctx context.Context, info *TraceRequestInfo, next goa.Endpoint) (any, error) {
    // 生成されたメソッドは設計内の属性名と一致
    traceID := info.TraceID()   // trace_idの値を返す
    spanID := info.SpanID()     // span_idの値を返す
    
    resp, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // 生成されたセッターを使用してリザルト属性を書き込む
    if result := info.Result(resp); result != nil {
        info.SetDuration(result, time.Since(start))
    }
    
    return resp, nil
}
```

設計内の各属性について：
- `ReadPayload`/`ReadResult`属性はゲッターメソッドを生成
- `WritePayload`/`WriteResult`属性はセッターメソッドを生成
- メソッド名は属性名のキャメルケースバージョン
- 型は設計定義から保持される

## ストリーミングインターセプター

ストリーミングインターセプターはストリーミングメソッドを処理しますが、通常のインターセプターとは
重要な違いがあります：リクエストごとに1回ではなく、ストリーム内の各メッセージに対して呼び出されます。
通常のインターセプターと同様に、サーバーサイドまたはクライアントサイドのいずれかで動作し、
両方では動作しません：

```go
// サーバーサイドのストリーミングインターセプター
func (i *Interceptor) ServerStreamMonitor(ctx context.Context, info *ServerStreamMonitorInfo, next goa.Endpoint) (any, error) {
    // このインターセプターはストリーム内の各メッセージに対して呼び出される
    
    // サーバーストリーミングリザルトの場合：
    // - サーバーがメッセージを送信しようとするたびに呼び出される
    // - info.StreamingResult()には送信されようとしているメッセージが含まれる
    resp, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    if result := info.StreamingResult(resp); result != nil {
        // 送信されるサーバーストリームメッセージを監視
        log.Printf("サーバーがメッセージを送信: %v", result)
    }
    
    return resp, nil
}

// クライアントサイドのストリーミングインターセプター
func (i *Interceptor) ClientStreamMonitor(ctx context.Context, info *ClientStreamMonitorInfo, next goa.Endpoint) (any, error) {
    // このインターセプターはストリーム内の各メッセージに対して呼び出される
    
    // クライアントストリーミングペイロードの場合：
    // - クライアントがメッセージを送信するたびに呼び出される
    // - info.StreamingPayload()には送信されようとしているメッセージが含まれる
    if payload := info.StreamingPayload(); payload != nil {
        // 送信されるクライアントストリームメッセージを監視
        log.Printf("クライアントがメッセージを送信: %v", payload)
    }
    
    return next(ctx, info.RawPayload())
}
```

このメッセージごとの実行により以下が可能になります：
- システムを流れる各メッセージの処理
- インターセプターインスタンスのフィールドを使用したメッセージ間の状態維持
- エラーを返すことによる早期ストリーム終了
- メッセージの変換またはフィルタリング

例えば、サーバーサイドのレート制限インターセプター：

```go
type StreamRateLimiter struct {
    messageCount int
    lastReset   time.Time
    limit       int
}

func (i *StreamRateLimiter) LimitServerStream(ctx context.Context, info *LimitServerStreamInfo, next goa.Endpoint) (any, error) {
    i.mu.Lock()
    // 1分ごとにカウンターをリセット
    if time.Since(i.lastReset) > time.Minute {
        i.messageCount = 0
        i.lastReset = time.Now()
    }

    // メッセージを処理する前にレートをチェック
    if i.messageCount >= i.limit {
        i.mu.Unlock()
        return nil, fmt.Errorf("レート制限を超過") 
    }

    // メッセージを処理してカウンターをインクリメント
    i.messageCount++
    i.mu.Unlock()

    return next(ctx, info.RawPayload())
}
```

## エラー処理

インターセプターはラップされたエンドポイントからのエラーを処理できます：

```go
func (i *Interceptor) ErrorHandler(ctx context.Context, info *ErrorHandlerInfo, next goa.Endpoint) (any, error) {
    resp, err := next(ctx, info.RawPayload())
    if err != nil {
        // エラーを適切な型に変換
        if gerr, ok := err.(*goa.ServiceError); ok {
            // サービスエラーを処理...
            return nil, gerr
        }
        // 不明なエラーをラップ
        return nil, goa.NewServiceError("内部エラー")
    }
    return resp, nil
}
```

## 次のステップ

- インターセプターの設計のための[ベストプラクティス](../4-best-practices)を探索する 