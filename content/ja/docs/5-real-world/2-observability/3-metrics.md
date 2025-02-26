---
title: "メトリクス"
description: "OpenTelemetryを使用したサービスメトリクスの実装"
weight: 3
---

# サービスメトリクス

現代のアプリケーションは、その動作とパフォーマンスを理解するために定量的なデータを必要とします。
どれだけのリクエストを処理しているのか？それらにどれだけの時間がかかっているのか？
リソースは不足していないか？メトリクスは、サービスの運用に関する数値的な測定を提供することで、
これらの質問に答えるのに役立ちます。

## メトリクスの理解

OpenTelemetryは、特定の測定ニーズに合わせて設計された複数のメトリクス計測器を提供します。
各計測器は以下によって定義されます：
- **名前**: 何を測定しているか（例：`http.requests.total`）
- **種類**: 値がどのように振る舞うか（例：増加のみ、上下可能）
- **単位**: オプションの測定単位（例：`ms`、`bytes`）
- **説明**: オプションのメトリクスが表す内容の説明

各種類の計測器を見ていきましょう：

### 同期計測器
これらの計測器は、何かが発生した時にコード内で直接呼び出されます：

1. **カウンター**
   車のオドメーターのように、上昇のみする値：
   ```go
   requestCounter, _ := meter.Int64Counter("http.requests.total",
       metric.WithDescription("HTTPリクエストの総数"),
       metric.WithUnit("{requests}"))
   
   // 使用法：リクエスト受信時にインクリメント
   requestCounter.Add(ctx, 1)
   ```
   以下に最適：
   - リクエスト数
   - 処理されたバイト数
   - 完了したタスク数

2. **上下カウンター**
   キュー内のアイテムのように、増減可能な値：
   ```go
   queueSize, _ := meter.Int64UpDownCounter("queue.items",
       metric.WithDescription("キュー内の現在のアイテム数"),
       metric.WithUnit("{items}"))
   
   // 使用法：エンキュー時に追加、デキュー時に減算
   queueSize.Add(ctx, 1)  // アイテム追加
   queueSize.Add(ctx, -1) // アイテム削除
   ```
   以下に最適：
   - キューの長さ
   - アクティブな接続数
   - スレッドプールのサイズ

3. **ヒストグラム**
   リクエスト時間のような値の分布を追跡：
   ```go
   latency, _ := meter.Float64Histogram("http.request.duration",
       metric.WithDescription("HTTPリクエストの所要時間"),
       metric.WithUnit("ms"))
   
   // 使用法：リクエスト完了時に値を記録
   latency.Record(ctx, time.Since(start).Milliseconds())
   ```
   以下に最適：
   - リクエストのレイテンシー
   - レスポンスのサイズ
   - キューの待ち時間

### 非同期計測器
これらの計測器は、登録したコールバックによって定期的に収集されます：

1. **非同期カウンター**
   増加のみする値で、合計値にのみアクセス可能な場合：
   ```go
   bytesReceived, _ := meter.Int64ObservableCounter("network.bytes.received",
       metric.WithDescription("受信した総バイト数"),
       metric.WithUnit("By"))
   
   // 使用法：現在の値を収集するコールバックを登録
   meter.RegisterCallback([]instrument.Asynchronous{bytesReceived},
       func(ctx context.Context) {
           bytesReceived.Observe(ctx, getNetworkStats().TotalBytesReceived)
       })
   ```
   以下に最適：
   - 転送された総バイト数
   - システムの稼働時間
   - 外部システムからの累積イベント

2. **非同期上下カウンター**
   値が双方向に変化可能だが、現在の状態のみ確認可能な場合：
   ```go
   goroutines, _ := meter.Int64ObservableUpDownCounter("system.goroutines",
       metric.WithDescription("現在のgoroutine数"),
       metric.WithUnit("{goroutines}"))
   
   // 使用法：現在の値を収集するコールバックを登録
   meter.RegisterCallback([]instrument.Asynchronous{goroutines},
       func(ctx context.Context) {
           goroutines.Observe(ctx, int64(runtime.NumGoroutine()))
       })
   ```
   以下に最適：
   - 現在の接続数
   - リソースプールのサイズ
   - スレッド数

3. **非同期ゲージ**
   定期的にサンプリングする現在値の測定：
   ```go
   cpuUsage, _ := meter.Float64ObservableGauge("system.cpu.usage",
       metric.WithDescription("CPU使用率"),
       metric.WithUnit("1"))
   
   // 使用法：現在の値を収集するコールバックを登録
   meter.RegisterCallback([]instrument.Asynchronous{cpuUsage},
       func(ctx context.Context) {
           cpuUsage.Observe(ctx, getCPUUsage())
       })
   ```
   以下に最適：
   - CPU使用率
   - メモリ使用量
   - 温度の読み取り
   - ディスク容量

### 適切な計測器の選択

1. 以下の質問を自問してください：
   - 発生時に値を記録する必要がある（同期）か、定期的に状態を確認する（非同期）か？
   - 値は上昇のみ（カウンター）か、上下両方（上下カウンター）か？
   - 値の分布を分析する必要がある（ヒストグラム）か？
   - 現在の状態を測定している（ゲージ）か？

2. 一般的なユースケース：
   - イベントのカウント → カウンター
   - 所要時間の測定 → ヒストグラム
   - リソース使用量 → 非同期ゲージ
   - キューサイズ → 上下カウンター
   - システム統計 → 非同期計測器

## 自動メトリクス

Clueは、サービスのいくつかの重要なメトリクスを自動的に計装します。
これにより、コードを書くことなく即座の可視性が得られます：

### HTTPサーバーメトリクス
HTTPハンドラーをOpenTelemetryミドルウェアでラップすると：
```go
handler = otelhttp.NewHandler(handler, "service")
```

以下が自動的に取得されます：
- **リクエスト数**: パス、メソッド、ステータスコード別の総リクエスト数
- **所要時間ヒストグラム**: リクエストの処理にかかる時間
- **進行中リクエスト**: 現在のアクティブなリクエスト数
- **レスポンスサイズ**: レスポンスペイロードサイズの分布

### gRPCサーバーメトリクス
OpenTelemetry計装付きでgRPCサーバーを作成すると：
```go
server := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()))
```

以下が自動的に取得されます：
- **RPC数**: メソッドとステータスコード別の総RPC数
- **所要時間ヒストグラム**: RPCの完了にかかる時間
- **進行中RPC**: 現在のアクティブなRPC数
- **メッセージサイズ**: リクエスト/レスポンスサイズの分布

## カスタムメトリクス

自動メトリクスは有用ですが、ビジネス固有の測定を追跡する必要がよくあります。
以下は、カスタムメトリクスを効果的に作成し使用する方法です：

### メトリクスの作成

まず、サービス用のメーターを取得します：
```go
meter := otel.Meter("myservice")
```

次に、必要なメトリクスを作成します：

1. **カウンターの例**: ビジネスイベントの追跡
   ```go
   orderCounter, _ := meter.Int64Counter("orders.total",
       metric.WithDescription("処理された注文の総数"),
       metric.WithUnit("{orders}"))
   ```

2. **ヒストグラムの例**: 処理時間の測定
   ```go
   processingTime, _ := meter.Float64Histogram("order.processing_time",
       metric.WithDescription("注文の処理にかかる時間"),
       metric.WithUnit("ms"))
   ```

3. **ゲージの例**: キューの深さの監視
   ```go
   queueDepth, _ := meter.Int64UpDownCounter("orders.queue_depth",
       metric.WithDescription("キュー内の現在の注文数"),
       metric.WithUnit("{orders}"))
   ```

### メトリクスの使用

実際のシナリオで異なる種類のメトリクスを使用する方法を示す完全な例を見てみましょう。
この例は、注文処理システムを監視する方法を示しています：

```go
func processOrder(ctx context.Context, order *Order) error {
    // 総注文数の追跡（カウンター）
    // 各注文に対してカウンターを1増加させ、分析用の属性を追加
    orderCounter.Add(ctx, 1,
        attribute.String("type", order.Type),
        attribute.String("customer", order.CustomerID))

    // 処理時間の測定（ヒストグラム）
    // 関数が早期に戻る場合でも必ず所要時間を記録するためにdeferを使用
    start := time.Now()
    defer func() {
        processingTime.Record(ctx,
            time.Since(start).Milliseconds(),
            attribute.String("type", order.Type))
    }()

    // キューの深さの監視（ゲージ）
    // 追加時にインクリメント、完了時にデクリメントしてキューサイズを追跡
    queueDepth.Add(ctx, 1)  // キューに追加時にインクリメント
    defer queueDepth.Add(ctx, -1)  // 完了時にデクリメント

    return processOrderInternal(ctx, order)
}
```

この例は以下のベストプラクティスを示しています：
- 離散的なイベント（処理された注文）にカウンターを使用
- 所要時間（処理時間）にヒストグラムを使用
- 現在の状態（キューの深さ）にゲージを使用
- 分析に関連する属性の追加
- deferステートメントによる適切なクリーンアップ

## サービスレベル指標（SLI） 