---
title: ドメインエラーとトランスポートエラー
weight: 1
description: "Goaにおけるドメインエラーとトランスポートエラーの違い、およびそれらの効果的なマッピング方法について学びます。"
---

# ドメインエラーとトランスポートエラー

Goaでエラー処理を設計する際、ドメインエラーとそのトランスポート表現の違いを理解することが重要です。
この分離により、クリーンなドメインロジックを維持しながら、異なるプロトコル間で適切なエラー通信を確保することができます。

## ドメインエラー

ドメインエラーは、アプリケーションのビジネスロジックの失敗を表します。これらはプロトコルに依存せず、
ビジネスロジックの観点から何が問題であったかに焦点を当てています。Goaのデフォルトの`ErrorResult`型は、
ドメインエラーを表現するのに十分であり、カスタムエラー型は特殊なケースでのみ必要とされます。

### デフォルトエラー型の使用

デフォルトの`ErrorResult`型は、意味のある名前、説明、エラープロパティと組み合わせることで、
ほとんどのドメインエラーを効果的に表現できます：

```go
var _ = Service("payment", func() {
    // デフォルトのErrorResult型を使用してドメインエラーを定義
    Error("insufficient_funds", ErrorResult, func() {
        Description("取引に必要な残高が不足しています")
        // エラープロパティはエラーの特性を定義するのに役立ちます
        Temporary()  // ユーザーが資金を追加すれば解決する可能性がある
    })

    Error("card_expired", ErrorResult, func() {
        Description("支払いカードの有効期限が切れています")
        // カードが更新されるまでは永続的なエラー
    })

    Error("processing_failed", ErrorResult, func() {
        Description("決済処理システムが一時的に利用できません")
        Temporary()  // 後で再試行可能
        Fault()      // サーバーサイドの問題
    })
    
    Method("process", func() {
        // ... メソッド定義
    })
})
```

ドメインエラーは以下の要件を満たすべきです：
- ビジネスシナリオを反映した明確で説明的な名前を持つ
- ドキュメントとデバッグのための意味のある説明を含む
- エラーの特性を示すためにエラープロパティを使用する
- 伝送方法から独立している

### カスタムエラー型（オプション）

追加の構造化されたエラーデータが必要な場合、カスタムエラー型を定義できます。カスタムエラー型に関する
詳細な情報、`name`フィールドの重要な要件、および`struct:error:name`メタデータについては、
[メインのエラー処理ドキュメント](../_index.md#custom-error-types)を参照してください。

```go
// 追加のエラーコンテキストが必要な場合のカスタム型
var PaymentError = Type("PaymentError", func() {
    Description("PaymentErrorは決済処理の失敗を表します")
    Field(1, "message", String, "人間が読めるエラーメッセージ")
    Field(2, "code", String, "内部エラーコード")
    Field(3, "transaction_id", String, "失敗したトランザクションID")
    Field(4, "name", String, "トランスポートマッピング用のエラー名", func() {
        Meta("struct:error:name")
    })
    Required("message", "code", "name")
})
```

## トランスポートマッピング

トランスポートマッピングは、ドメインエラーが特定のプロトコルでどのように表現されるかを定義します。
これには、ステータスコード、ヘッダー、レスポンス形式が含まれます。

### HTTPトランスポート

```go
var _ = Service("payment", func() {
    // ドメインエラーの定義
    Error("insufficient_funds", PaymentError)
    Error("card_expired", PaymentError)
    Error("processing_failed", PaymentError)
    
    HTTP(func() {
        // ドメインエラーをHTTPステータスコードにマッピング
        Response("insufficient_funds", StatusPaymentRequired, func() {
            // 決済固有のヘッダーを追加
            Header("Retry-After")
            // エラーレスポンス形式をカスタマイズ
            Body(func() {
                Attribute("error_code")
                Attribute("message")
            })
        })
        Response("card_expired", StatusUnprocessableEntity)
        Response("processing_failed", StatusServiceUnavailable)
    })
})
```

### gRPCトランスポート

```go
var _ = Service("payment", func() {
    // 同じドメインエラー
    Error("insufficient_funds", PaymentError)
    Error("card_expired", PaymentError)
    Error("processing_failed", PaymentError)
    
    GRPC(func() {
        // gRPCステータスコードへのマッピング
        Response("insufficient_funds", CodeFailedPrecondition)
        Response("card_expired", CodeInvalidArgument)
        Response("processing_failed", CodeUnavailable)
    })
})
```

## 分離の利点

この関心の分離には以下のような利点があります：

1. **プロトコル独立性**
   - ドメインエラーはビジネスロジックに焦点を当てる
   - 同じエラーを異なるプロトコルで異なる方法でマッピング可能
   - 新しいトランスポートプロトコルの追加が容易

2. **一貫したエラー処理**
   - 一元化されたエラー定義
   - サービス全体で統一されたエラー処理
   - ドメインエラーとトランスポートエラーの明確なマッピング

3. **より良いドキュメント**
   - ドメインエラーはビジネスルールを文書化
   - トランスポートマッピングはAPI動作を文書化
   - 明確な分離によりAPI利用者の理解を促進

## 実装例

以下は、この分離が実践でどのように機能するかを示しています：

### デフォルトのErrorResultの使用

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // ドメインロジック
    if !hasEnoughFunds(p.Amount) {
        // 生成されたヘルパー関数を使用してエラーを返す
        return nil, payment.MakeInsufficientFunds(
            fmt.Errorf("口座残高 %d が必要額 %d を下回っています", balance, p.Amount))
    }
    
    if isSystemOverloaded() {
        // 一時的なシステム問題のエラーを返す
        return nil, payment.MakeProcessingFailed(
            fmt.Errorf("決済システムが一時的に利用できません"))
    }
    
    // さらなる処理...
}
```

### カスタムエラー型の使用（追加のコンテキストが必要な場合）

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // ドメインロジック
    if !hasEnoughFunds(p.Amount) {
        // 追加のコンテキストを持つドメインエラーを返す
        return nil, &payment.PaymentError{
            Name:          "insufficient_funds",
            Message:       "取引に必要な口座残高が不足しています",
            Code:         "FUNDS_001",
            TransactionID: txID,
        }
    }
    
    // さらなる処理...
}
```

トランスポート層は自動的に：
1. ドメインエラーを適切なステータスコードにマッピング
2. プロトコルに応じてエラーレスポンスをフォーマット
3. プロトコル固有のヘッダーやメタデータを含める

## ベストプラクティス

1. **ドメインファースト**
   - ビジネス要件に基づいてエラーを設計
   - エラーメッセージにドメイン用語を使用
   - デバッグに関連するコンテキストを含める

2. **一貫したマッピング**
   - 各プロトコルに適切なステータスコードを使用
   - サービス間で一貫したマッピングを維持
   - マッピングの根拠を文書化

3. **エラープロパティ**
   - エラーの特性を示すためにエラープロパティ（`Temporary()`、`Timeout()`、`Fault()`）を使用
   - カスタムエラー型で同様のプロパティの実装を検討
   - プロパティがクライアントの動作にどのように影響するかを文書化

4. **ドキュメント**
   - ドメインの意味とトランスポートの動作の両方を文書化
   - エラーレスポンスの例を含める
   - 再試行戦略とクライアントの処理方法を説明

## 結論

ドメインエラーをトランスポート表現から分離することで、Goaは以下を可能にします：
- クリーンなドメインロジックの維持
- プロトコルに適したエラーレスポンスの提供
- 複数のプロトコルの一貫したサポート
- APIの成長に合わせたエラー処理のスケーリング 