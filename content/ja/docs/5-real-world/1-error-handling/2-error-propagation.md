---
title: エラーの伝播
weight: 2
---

このガイドでは、Goaサービスのビジネスロジックからクライアントまで、異なる層を通じてエラーがどのように伝播するかを説明します。

## 概要

Goaにおけるエラーの伝播は、明確な経路に従います：
1. ビジネスロジックがエラーを生成
2. エラーが設計定義とマッチング
3. トランスポート層がエラーを変換
4. クライアントがエラーを受信して解釈

## エラーの流れ

### 1. ビジネスロジック層

エラーは通常、サービス実装で発生します：

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // ビジネスロジックは以下のような方法でエラーを返すことができます：
    
    // 1. 生成されたヘルパー関数の使用（ErrorResult用）
    if !hasEnoughFunds(p.Amount) {
        return nil, payment.MakeInsufficientFunds(
            fmt.Errorf("口座残高 %d が必要額 %d を下回っています", balance, p.Amount))
    }
    
    // 2. カスタムエラー型の返却
    if err := validateCard(p.Card); err != nil {
        return nil, &payment.PaymentError{
            Name:    "card_expired",
            Message: err.Error(),
        }
    }
    
    // 3. 下流サービスからのエラーの伝播
    result, err := s.processor.ProcessPayment(ctx, p)
    if err != nil {
        // 外部エラーをドメインエラーでラップ
        return nil, payment.MakeProcessingFailed(fmt.Errorf("決済処理エラー: %w", err))
    }
    
    return result, nil
}
```

### 2. エラーマッチング

Goaランタイムは、返却されたエラーを設計定義とマッチングします：

```go
var _ = Service("payment", func() {
    // ここで定義されたエラーは名前でマッチング
    Error("insufficient_funds")
    Error("card_expired")
    Error("processing_failed", func() {
        // プロパティはエラー処理に影響を与える
        Temporary()
        Fault()
    })
})
```

マッチングのプロセス：
1. `ErrorResult`の場合：生成された`MakeXXX`関数からエラー名を使用
2. カスタム型の場合：`struct:error:name`でマークされたフィールドを使用
3. 不明なエラーの場合：内部サーバーエラーとして扱われる

### 3. トランスポート層

マッチングが完了すると、エラーはトランスポート固有のルールに従って変換されます：

```go
var _ = Service("payment", func() {
    HTTP(func() {
        // HTTPマッピングルール
        Response("insufficient_funds", StatusPaymentRequired)
        Response("card_expired", StatusUnprocessableEntity)
        Response("processing_failed", StatusServiceUnavailable)
    })
    
    GRPC(func() {
        // gRPCマッピングルール
        Response("insufficient_funds", CodeFailedPrecondition)
        Response("card_expired", CodeInvalidArgument)
        Response("processing_failed", CodeUnavailable)
    })
})
```

トランスポート層は：
1. 適切なステータスコードを適用
2. エラーメッセージと詳細をフォーマット
3. レスポンスをシリアライズ

### 4. クライアント受信

クライアントは設計に一致する型付きエラーを受信します：

```go
client := payment.NewClient(endpoint)
result, err := client.Process(ctx, payload)
if err != nil {
    switch e := err.(type) {
    case *payment.InsufficientFundsError:
        // 残高不足の処理（エラープロパティを含む）
        if e.Temporary {
            return retry(ctx, payload)
        }
        return promptForTopUp(e.Message)
        
    case *payment.CardExpiredError:
        // 期限切れカードの処理
        return promptForNewCard(e.Message)
        
    case *payment.ProcessingFailedError:
        // 処理失敗の処理
        if e.Temporary {
            return retryWithBackoff(ctx, payload)
        }
        return reportSystemError(e)
        
    default:
        // 予期しないエラーの処理
        return handleUnknownError(err)
    }
}
```

## ベストプラクティス

1. **エラーのラッピング**
   - 外部エラーをドメインエラーでラップ
   - `fmt.Errorf("...%w", err)`を使用して根本原因を保持
   - ドメインに関連するコンテキストを追加

2. **一貫した伝播**
   - 可能な限り生成されたヘルパー関数を使用
   - チェーン全体でエラープロパティを維持
   - 不必要にエラー型を混在させない

3. **トランスポートの考慮事項**
   - 各トランスポートに適切なステータスコードを定義
   - 関連するヘッダー/メタデータを含める
   - クライアントの要件を考慮

4. **クライアントエクスペリエンス**
   - 型付きエラーを提供
   - 処理に十分なコンテキストを含める
   - 再試行戦略を文書化

## エラー変換の例

以下は、システムを通じてエラーがどのように変換されるかの完全な例です：

```go
// 1. ビジネスロジック（サービス実装）
if !hasEnoughFunds(amount) {
    return nil, payment.MakeInsufficientFunds(
        fmt.Errorf("残高 %d が必要額 %d を下回っています", balance, amount))
}

// 2. エラー定義（設計）
var _ = Service("payment", func() {
    Error("insufficient_funds", func() {
        Description("口座の残高が不足しています")
        Temporary()  // チャージ後に再試行可能
    })
})

// 3. トランスポートマッピング（設計）
HTTP(func() {
    Response("insufficient_funds", StatusPaymentRequired)
})

// 4. クライアント受信
result, err := client.Process(ctx, payload)
if err != nil {
    if e, ok := err.(*payment.InsufficientFundsError); ok {
        if e.Temporary {
            // retry-afterヘッダーの期間待機
            time.Sleep(retryAfter)
            return retry(ctx, payload)
        }
    }
}
```

## 結論

Goaのエラー伝播システムは以下を保証します：
- エラーは層を超えて意味的な意味を維持
- トランスポート固有の詳細は自動的に処理
- クライアントは型付きで実用的なエラーを受信
- エラー処理はAPI全体で一貫性を維持 