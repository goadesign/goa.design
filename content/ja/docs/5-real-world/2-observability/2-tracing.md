---
title: "トレーシング"
description: "OpenTelemetryを使用した分散トレーシングの実装"
weight: 2
---

現代のアプリケーションは複雑な分散システムであり、1つのユーザーリクエストが
数十のサービス、データベース、外部APIに触れる可能性があります。問題が発生した時、
何が起きたのかを理解するのは困難です。ここで分散トレーシングが役立ちます。

## 分散トレーシングとは

分散トレーシングは、リクエストがシステム内を移動する際の各ステップでタイミング、
エラー、コンテキストを記録しながら追跡します。これはリクエストのGPSトラッキング
システムのようなものです - リクエストがどこを通過し、各ステップにどれだけ時間が
かかり、どこで問題に遭遇したかを正確に把握できます。

### 主要な概念

1. **トレース**: システム内でのリクエストの完全な旅路
2. **スパン**: その旅路内の単一の操作（データベースクエリやAPIコールなど）
3. **コンテキスト**: リクエストと共に移動する情報（ユーザーIDや相関IDなど）
4. **属性**: 何が起きたかを説明するキーと値のペア（注文IDやエラーの詳細など）

以下は視覚的な例です：

```
トレース: 注文作成
├── スパン: ユーザー検証 (10ms)
│   └── 属性: user_id=123
├── スパン: 在庫確認 (50ms)
│   ├── 属性: product_id=456
│   └── イベント: "在庫レベルが低い"
└── スパン: 支払い処理 (200ms)
    ├── 属性: amount=99.99
    └── エラー: "残高不足"
```

## 自動計装

トレーシングを始める最も簡単な方法は自動計装を使用することです。
Clueは、コードを変更することなくHTTPとgRPCリクエストを自動的にトレースする
ミドルウェアを提供します：

```go
// HTTPサーバーの場合、ハンドラーをOpenTelemetryミドルウェアでラップします。
// これにより、すべての受信リクエストのトレースが自動的に作成されます。
handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    // ハンドラーのコード
})

// トレーシングミドルウェアを追加
handler = otelhttp.NewHandler(handler, "my-service")

// ミドルウェアは以下を行います：
// - 各リクエストのスパンを作成
// - HTTPメソッド、ステータスコード、URLを記録
// - リクエスト時間を追跡
// - コンテキストを下流のサービスに伝播
```

gRPCサービスの場合、提供されているインターセプターを使用します：

```go
// トレーシングを有効にしたgRPCサーバーを作成
server := grpc.NewServer(
    // すべてのRPCをトレースするためにOpenTelemetryハンドラーを追加
    grpc.StatsHandler(otelgrpc.NewServerHandler()))

// これにより自動的に：
// - すべてのgRPCメソッドをトレース
// - メソッド名とステータスコードを記録
// - レイテンシーを追跡
// - コンテキストの伝播を処理
```

## 手動計装

自動計装はリクエストの境界に適していますが、重要なビジネス操作を追跡するために
カスタムスパンを追加する必要がよくあります。以下はコードにカスタムトレーシングを
追加する方法です：

```go
func processOrder(ctx context.Context, order *Order) error {
    // この操作の新しいスパンを開始。
    // スパン名"process_order"がトレースに表示されます。
    ctx, span := otel.Tracer("myservice").Start(ctx, "process_order")
    
    // 関数が戻る時に必ずスパンを終了
    defer span.End()

    // ビジネスコンテキストをスパン属性として追加
    span.SetAttributes(
        // これらはトレースのフィルタリングと分析に役立ちます
        attribute.String("order.id", order.ID),
        attribute.Float64("order.amount", order.Amount),
        attribute.String("customer.id", order.CustomerID))

    // タイムスタンプ付きで重要なイベントを記録
    span.AddEvent("validating_order")
    if err := validateOrder(ctx, order); err != nil {
        // コンテキスト付きでエラーを記録
        span.RecordError(err)
        span.SetStatus(codes.Error, "注文の検証に失敗しました")
        return err
    }
    span.AddEvent("order_validated")

    // サブ操作用のネストされたスパンを作成
    ctx, paymentSpan := otel.Tracer("myservice").Start(ctx, "process_payment")
    defer paymentSpan.End()

    if err := processPayment(ctx, order); err != nil {
        paymentSpan.RecordError(err)
        paymentSpan.SetStatus(codes.Error, "支払いに失敗しました")
        return err
    }

    return nil
}
```

## 外部呼び出しのトレーシング

サービスが他のサービスやデータベースを呼び出す場合、それらの操作をトレースの一部として
追跡したいと思います。以下は異なる種類のクライアントを計装する方法です：

### HTTPクライアント

```go
// トレーシングを有効にしたHTTPクライアントを作成
client := &http.Client{
    // デフォルトのトランスポートをOpenTelemetryでラップ
    Transport: otelhttp.NewTransport(
        http.DefaultTransport,
        // 詳細なHTTPトレーシングを有効化（オプション）
        otelhttp.WithClientTrace(func(ctx context.Context) *httptrace.ClientTrace {
            return otelhttptrace.NewClientTrace(ctx)
        }),
    ),
}

// これですべてのリクエストが自動的にトレースされます
resp, err := client.Get("https://api.example.com/data")
```

### gRPCクライアント

```go
// トレーシング付きのgRPCクライアント接続を作成
conn, err := grpc.DialContext(ctx,
    "service:8080",
    // OpenTelemetryハンドラーを追加
    grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    // その他のオプション...
    grpc.WithTransportCredentials(insecure.NewCredentials()))

// この接続を使用するすべての呼び出しがトレースされます
client := pb.NewServiceClient(conn)
```

### データベース呼び出し

データベース操作の場合、クエリを追跡するためのカスタムスパンを作成します：

```go
func (r *Repository) GetUser(ctx context.Context, id string) (*User, error) {
    // データベース操作用のスパンを作成
    ctx, span := otel.Tracer("repository").Start(ctx, "get_user")
    defer span.End()

    // クエリのコンテキストを追加
    span.SetAttributes(
        attribute.String("db.type", "postgres"),
        attribute.String("db.user_id", id))

    // クエリを実行
    var user User
    if err := r.db.GetContext(ctx, &user, "SELECT * FROM users WHERE id = $1", id); err != nil {
        // データベースエラーを記録
        span.RecordError(err)
        span.SetStatus(codes.Error, "データベースクエリが失敗しました")
        return nil, err
    }

    return &user, nil
}
```

## コンテキスト伝播

トレースがサービスの境界を越えて機能するためには、トレースコンテキストをリクエストと
共に伝播する必要があります。これは上記の計装されたクライアントでは自動的に行われますが、
以下は手動で行う方法です：

```go
// リクエストを受信する際、トレースコンテキストを抽出
func handleIncoming(w http.ResponseWriter, r *http.Request) {
    // リクエストヘッダーからトレースコンテキストを抽出
    ctx := otel.GetTextMapPropagator().Extract(r.Context(),
        propagation.HeaderCarrier(r.Header))
    
    // このコンテキストをすべての操作で使用
    processRequest(ctx)
}

// リクエストを送信する際、トレースコンテキストを注入
func makeOutgoing(ctx context.Context) error {
    req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com", nil)
    
    // リクエストヘッダーにトレースコンテキストを注入
    otel.GetTextMapPropagator().Inject(ctx,
        propagation.HeaderCarrier(req.Header))
    
    resp, err := http.DefaultClient.Do(req)
    return err
}
```

コンテキスト伝播は、異なるサービスと可観測性システム間でトレースが機能することを
保証するためにW3C Trace Context標準を使用します。コンテキスト伝播の詳細については
以下を参照してください：

- [OpenTelemetry コンテキストと伝播](https://opentelemetry.io/docs/concepts/context-propagation/)
- [W3C Trace Context 仕様](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Go SDK 伝播](https://pkg.go.dev/go.opentelemetry.io/otel/propagation)

## トレースデータの制御

本番システムでは、すべてのリクエストをトレースすると膨大な量のデータが生成され、
ストレージコストとパフォーマンスのオーバーヘッドが高くなる可能性があります。
サンプリングは、コストを抑えながらシステムを理解するのに十分なトレースを収集するのに
役立ちます。

### なぜサンプリングが必要か？

1. **コスト制御**: トレースデータの保存と処理にはコストがかかる
2. **パフォーマンス**: トレースの生成はリクエストにオーバーヘッドを追加する
3. **分析**: システムの動作を理解するためにすべてのトレースが必要なわけではない
4. **ストレージ**: トレースデータは急速に大量のストレージを消費する可能性がある

### 固定レートサンプリング

最も単純なアプローチは、リクエストの固定割合をサンプリングすることです。
これは予測可能で理解しやすいです： 