---
title: Goaにおける可観測性
linkTitle: "可観測性"
description: "Goaサービスにおける可観測性の理解と実装"
weight: 2
---


現代の分散システムは複雑です。問題が発生した時、従来のロギングだけでは何が起きたのかを理解するのに十分ではありません。
システム全体でリクエストがどのように流れているのかを把握し、パフォーマンスを測定し、システムの健全性を監視する必要があります。
これが可観測性の役割です。

{{< alert title="注意" color="primary" >}}
Goaサービスは標準的なHTTPまたはgRPCサービスなので、お好みの可観測性スタックを使用できます。
このガイドでは[Clue](https://github.com/goadesign/clue)（Goaが生成例で使用し、Goa固有の機能を提供する）に焦点を当てていますが、
これらの原則は任意の可観測性ソリューションに適用できます。
{{< /alert >}}

## 可観測性とは

可観測性とは、システムの出力を見ることで、システム内部で何が起きているかを理解する能力です。
Goaでは、これを3つの主要な柱を通じて実現します：

1. **分散トレーシング**: サービス間でリクエストがどのように移動するかを追跡
2. **メトリクス**: システムの動作とパフォーマンスを測定
3. **ログ**: 特定のイベントとエラーを記録

## Clueパッケージ

Clueは、Goaが推奨する可観測性パッケージです。業界標準の可観測性フレームワークである
[OpenTelemetry](https://opentelemetry.io)の上に構築されており、Goaの生成コードと密接に統合されています。

以下は、実践における可観測性の簡単な例です：

```go
import (
    "go.opentelemetry.io/otel"                // 標準OpenTelemetry
    "go.opentelemetry.io/otel/attribute"      // 標準OpenTelemetry
    "goa.design/clue/log"                     // Clueのロギングパッケージ
)

func (s *Service) CreateOrder(ctx context.Context, order *Order) error {
    // 標準OpenTelemetry APIの使用
    ctx, span := otel.Tracer("service").Start(ctx, "create_order")
    defer span.End()

    // 標準OpenTelemetryの属性
    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.Float64("order.amount", order.Amount))

    // 標準OpenTelemetryのメトリクス
    s.orderCounter.Add(ctx, 1,
        attribute.String("type", order.Type))

    // Clueの構造化ロギング（オプション）
    log.Info(ctx, "注文を処理中",
        log.KV{"order_id", order.ID})

    if err := s.processOrder(ctx, order); err != nil {
        // 標準OpenTelemetryのエラー記録
        span.RecordError(err)
        return err
    }

    return nil
}
```

コードの大部分が標準OpenTelemetryパッケージ（`go.opentelemetry.io/otel/*`）を使用していることに注目してください。
Clue固有のコードはロギングのみで、これも好みのロギングソリューションに置き換えることができます。これにより：
- OpenTelemetry互換の任意の可観測性バックエンドを使用可能
- 必要に応じて異なるロギングライブラリに切り替え可能
- 可観測性コードの移植性を維持可能

## なぜOpenTelemetryファースト？

ClueはOpenTelemetryファーストのアプローチを採用しています。これは以下を意味します：

1. **トレース**が主要なデバッグツールです。以下を示します：
   - 各リクエストの正確なパス
   - 時間がどこで費やされているか
   - どのサービスが関与しているか
   - どのエラーが発生したか

2. **メトリクス**はシステムの健全性監視に役立ちます：
   - リクエストのレートとレイテンシー
   - エラーレート
   - リソース使用量
   - ビジネスメトリクス

3. **ログ**は限定的に使用され、主に以下のために：
   - 致命的なエラー
   - システムの起動/シャットダウン
   - 特定の問題のデバッグ

このアプローチは従来のロギングよりも優れたスケーラビリティを提供します：
- トレースは自動的にコンテキストを提供
- メトリクスはログ解析よりも効率的
- ログは重要な事項に集中可能

## はじめに

Goaサービスに可観測性を追加するには、以下が必要です：

1. **Clueのセットアップ**: 適切なエクスポーターでOpenTelemetryを設定
2. **計装の追加**: ハンドラーとクライアントをラップ
3. **メトリクスの定義**: 重要なシステム動作を追跡
4. **ヘルスチェックの設定**: サービスの依存関係を監視
5. **デバッグの有効化**: トラブルシューティングツールを追加

以下のガイドで各ステップを説明します：

1. [基本セットアップ](1-setup) - ClueとOpenTelemetryの設定
2. [トレーシング](2-tracing) - 分散トレーシングの実装
3. [メトリクス](3-metrics) - サービスメトリクスの追加
4. [ロギング](4-logging) - ロギングの設定
5. [ヘルスチェック](5-health) - ヘルス監視の追加
6. [デバッグ](6-debugging) - デバッグツールの有効化

## サービス例

以下は、完全に可観測なGoaサービスの実践例です：

```go
func main() {
    // 1. 適切なフォーマットでロガーを作成
    format := log.FormatJSON
    if log.IsTerminal() {
        format = log.FormatTerminal
    }
    ctx := log.Context(context.Background(),
        log.WithFormat(format),
        log.WithFunc(log.Span))

    // 2. OTLPエクスポーターでOpenTelemetryを設定
    spanExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(*coladdr),
        otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf(ctx, err, "トレーシングの初期化に失敗しました")
    }
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(*coladdr),
        otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf(ctx, err, "メトリクスの初期化に失敗しました")
    }

    // 3. OpenTelemetryでClueを初期化
    cfg, err := clue.NewConfig(ctx,
        genservice.ServiceName,
        genservice.APIVersion,
        metricExporter,
        spanExporter)
    clue.ConfigureOpenTelemetry(ctx, cfg)

    // 4. ミドルウェア付きでサービスを作成
    svc := front.New(fc, lc)
    endpoints := genservice.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads())  // デバッグロギング
    endpoints.Use(log.Endpoint)         // リクエストロギング
    endpoints.Use(middleware.ErrorReporter())

    // 5. 可観測性を備えたHTTPハンドラーのセットアップ
    mux := goahttp.NewMuxer()
    debug.MountDebugLogEnabler(debug.Adapt(mux))  // 動的ログレベル制御
    debug.MountPprofHandlers(debug.Adapt(mux))    // Goプロファイリングエンドポイント
    
    // 正しい順序でミドルウェアを追加：
    handler := otelhttp.NewHandler(mux, serviceName)  // 3. OpenTelemetry
    handler = debug.HTTP()(handler)                   // 2. デバッグエンドポイント
    handler = log.HTTP(ctx)(handler)                  // 1. リクエストロギング

    // 6. 別ポートでヘルスチェックをマウント
    check := health.Handler(health.NewChecker(
        health.NewPinger("locator", *locatorHealthAddr),
        health.NewPinger("forecaster", *forecasterHealthAddr)))
    http.Handle("/healthz", log.HTTP(ctx)(check))

    // 7. グレースフルシャットダウン付きでサーバーを起動
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        log.Printf(ctx, "HTTPサーバーが%sでリッスン中", *httpAddr)
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Errorf(ctx, err, "サーバーエラー")
        }
    }()

    // シャットダウンの処理
    <-ctx.Done()
    if err := server.Shutdown(context.Background()); err != nil {
        log.Errorf(ctx, err, "シャットダウンエラー")
    }
    wg.Wait()
}
```

このサービスは、本番環境でアプリケーションを監視およびデバッグするのに役立つ重要な可観測性機能を示しています。
サービス全体でコンテキストを伝播する構造化ロギングを実装し、コンポーネント間でリクエストを追跡できるようにしています。
サービスはOpenTelemetryを統合して分散トレーシングとメトリクス収集を行い、パフォーマンスと動作に関する洞察を提供します。
ヘルスチェックエンドポイントは、ロケーターやフォーキャスターなどの依存サービスのステータスを監視します。
デバッグエンドポイントにより、実行中のサービスのプロファイリングを行い、パフォーマンスのボトルネックを特定できます。
また、サービスは動的なログレベル制御をサポートし、再起動なしでランタイムに詳細度を調整できます。
最後に、グレースフルシャットダウン処理を実装し、サービス停止時にリソースを適切にクリーンアップし、
進行中のリクエストを完了させます。

## 詳細情報

- [OpenTelemetryドキュメント](https://opentelemetry.io/docs/)
- [Clue GitHubリポジトリ](https://github.com/goadesign/clue)
- [Clue Weather サンプル](https://github.com/goadesign/clue/tree/main/example/weather) 