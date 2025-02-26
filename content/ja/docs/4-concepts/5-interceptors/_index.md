---
linkTitle: インターセプターとミドルウェア
title: インターセプターとミドルウェア
weight: 5
---

現代のAPIを構築するには、アプリケーションの異なる層でリクエストを処理する必要があります。
Goaは型安全なインターセプターと従来のミドルウェアパターンを組み合わせた包括的なソリューションを
提供し、両方の利点を活用できます。

## 異なるアプローチの理解

Goaサービスでリクエストを処理する際、3つの補完的なツールを利用できます。それぞれが特定の目的を
持ち、他のツールと連携して完全なリクエスト処理パイプラインを構築します。

### 型安全なインターセプターの力

Goaの設計の中心にあるのは、独自のインターセプターシステムです。従来のミドルウェアとは異なり、
Goaインターセプターはサービスのドメイン型へのコンパイル時安全なアクセスを提供します。
この根本的な違いは、従来のミドルウェアとGoaインターセプターを比較すると明確になります：

```go
// 従来のミドルウェアは生のバイトやinterface{}を扱う必要があり、
// エラーが発生しやすく、型アサーションが必要です
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // ボディに期待するものが含まれていることを願うだけ！
        data := parseBody(r)
        // 型アサーションとエラー処理が必要
    })
}

// Goaインターセプターはドメイン型への型安全なアクセスを提供し、
// コンパイル時チェックと生成されたヘルパーメソッドを備えています
func (i *Interceptor) Process(ctx context.Context, info *ProcessInfo, next goa.Endpoint) (any, error) {
    // 型付きペイロードフィールドへの直接アクセス
    amount := info.Amount()
    if amount > 1000 {
        // 生成されたエラーコンストラクタを使用
        return nil, goa.MakeInvalidAmount(fmt.Errorf("金額が上限を超えています"))
    }
    // 型安全性を保ちながら処理を継続
}
```

### トランスポート固有のミドルウェア

Goaインターセプターがビジネスロジックを処理する一方で、トランスポート固有の懸念事項も
扱う必要があります。このために、Goaは標準的なGoミドルウェアパターンとシームレスに統合されます：

1. [HTTPミドルウェア](./2-http-middleware)は、圧縮、CORS、セッション管理などのHTTP固有のタスクに
   標準的な`http.Handler`パターンを使用します。

2. [gRPCインターセプター](./3-grpc-interceptors)は、標準的なgRPCパターンを使用して、
   ストリーミング操作やメタデータ管理などのRPC固有のニーズを処理します。

## 3つのアプローチの組み合わせ

決済処理サービスを例に、これら3つのコンポーネントがどのように連携するかを見てみましょう。
各層が得意とする処理を担当し、関心事の明確な分離を実現します。

まず、プロトコルレベルの懸念事項を処理するHTTPミドルウェアを設定します：

```go
func main() {
    // ベースとなるHTTPマルチプレクサを作成
    mux := goahttp.NewMuxer()
    
    // 内側から外側へミドルウェアチェーンを構築
    handler := mux
    
    // OpenTelemetryで可観測性を追加
    handler = otelhttp.NewHandler(handler, "payment-svc")
    
    // デバッグツールとロギングを有効化
    handler = debug.HTTP()(handler)
    handler = log.HTTP(ctx)(handler)
    
    // ランタイム制御用のデバッグエンドポイントをマウント
    debug.MountDebugLogEnabler(debug.Adapt(mux))
    debug.MountPprofHandlers(debug.Adapt(mux))
}
```

次に、Goaインターセプターを使用してビジネスロジックを定義します。これにより型安全な
バリデーションと処理が提供されます：

```go
var _ = Service("payment", func() {
    // 型安全な決済バリデータを定義
    var ValidatePayment = Interceptor("ValidatePayment", func() {
        Description("決済詳細を検証します")
        
        // アクセスが必要なペイロードフィールドを指定
        ReadPayload(func() {
            Attribute("amount")
            Attribute("currency")
        })
        
        // 発生する可能性のあるバリデーションエラーを定義
        Error("invalid_amount")
        Error("unsupported_currency")
    })
    
    Method("process", func() {
        // このメソッドにバリデータを適用
        ServerInterceptor(ValidatePayment)
        
        // メソッドのペイロードを定義
        Payload(func() {
            Attribute("amount", Int)
            Attribute("currency", String)
            Required("amount", "currency")
        })
    })
})
```

最後に、RPC固有の懸念事項に対してgRPCインターセプターを設定します：

```go
func setupGRPC() *grpc.Server {
    return grpc.NewServer(
        grpc.UnaryInterceptor(
            grpc_middleware.ChainUnaryServer(
                // RPCレベルの機能を追加
                grpc_recovery.UnaryServerInterceptor(),   // パニックリカバリー
                grpc_prometheus.UnaryServerInterceptor,   // メトリクス
                grpc_ctxtags.UnaryServerInterceptor(),   // コンテキストタグ付け
            ),
        ),
    )
}
```

## ミドルウェアチェーン

これらのコンポーネントがどのように連携するかを理解するには、実行順序を理解する必要があります。
Goaは各層の利点を最大限に活かすように注意深く順序付けられたチェーンを通じてリクエストを処理します。

### 処理の順序

1. トランスポート固有のミドルウェアが最初に実行され、リクエストのトレースやロギングなどの
   プロトコルレベルの懸念事項を処理します。これにより、リクエスト処理の開始時から適切な
   可観測性が確保されます。

2. 次にGoaインターセプターが実行され、ビジネスレベルのバリデーションと変換のために
   ドメイン型への型安全なアクセスを提供します。

3. 最後に、完全に検証され変換されたデータを受け取ってサービスロジックが実行されます。

レスポンスは逆の経路をたどり、各層が適切にレスポンスを処理できるようにします。
典型的な決済処理フローでは以下のようになります：

```
リクエスト処理：
─────────────────────────────────────────────────────────────────────────────>
OpenTelemetry → デバッグ/ロギング → ビジネスバリデーション → レート制限 → 決済

レスポンス処理：
<─────────────────────────────────────────────────────────────────────────────
決済 → レート制限 → ビジネスバリデーション → レスポンスロギング → トレーシング
```

この層状のアプローチには以下の利点があります：

1. 可観測性がすべての操作を包含し、リクエスト処理の完全な可視性を提供します。

2. 必要な時にデバッグツールが利用可能で、問題の診断が容易になります。

3. ビジネスバリデーションは完全な型安全性を持って行われ、エラーを減少させ保守性を向上させます。

4. 各層が特定の責任に集中し、よりクリーンで保守しやすいコードにつながります。

## 次のステップ

異なるコンポーネントがどのように組み合わさるかを理解したところで、各コンポーネントをより深く
掘り下げましょう：

[Goaインターセプター](./1-goa-interceptors)から始めて型安全なリクエスト処理について学び、
その後それぞれのセクションでHTTPとgRPCのミドルウェアパターンを探索してください。 