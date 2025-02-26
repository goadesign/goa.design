---
title: "基本セットアップ"
description: "ClueとOpenTelemetryのセットアップ"
weight: 1
---

# 基本セットアップ

Goaサービスで可観測性を設定するには、ClueとOpenTelemetryの設定が必要です。
このガイドでは、基本的なセットアップ手順を説明します。

## 前提条件

まず、必要な依存関係を`go.mod`に追加します：

```go
require (
	goa.design/clue
	go.opentelemetry.io/otel 
	go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc 
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc 
	go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp 
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
)
```

これらのパッケージは以下を提供します：
- `clue`: Goaの可観測性ツールキット
- `otel`: OpenTelemetryのコア機能
- `otlpmetricgrpc`と`otlptracegrpc`: テレメトリーデータを送信するためのOTLPエクスポーター
- `otelhttp`と`otelgrpc`: HTTPとgRPCの自動計装

## 1. ロガーコンテキスト

ロガーコンテキストは可観測性セットアップの基盤です。設定と相関IDを
アプリケーション全体で伝播します：

```go
// 環境に基づいてロガーフォーマットを設定
format := log.FormatJSON
if log.IsTerminal() {
	format = log.FormatTerminal  // 開発用の人間が読みやすいフォーマット
}

// フォーマットとスパン追跡を含むベースコンテキストを作成
ctx := log.Context(context.Background(),
	log.WithFormat(format),      // 出力フォーマットを設定
	log.WithFunc(log.Span))      // ログにトレース/スパンIDを含める

// 必要に応じてデバッグロギングを有効化
if *debugf {
	ctx = log.Context(ctx, log.WithDebug())
	log.Debugf(ctx, "デバッグログが有効化されました")
}

// サービス情報を追加
ctx = log.With(ctx, 
	log.KV{"service", serviceName},
	log.KV{"version", version},
	log.KV{"env", environment})
```

ロガーコンテキストは以下を提供します：
- サービス全体で一貫した構造化ロギング
- ログとトレース間の自動相関
- 環境に応じたフォーマット（本番環境ではJSON、開発環境では読みやすい形式）
- デバッグログレベルの制御
- すべてのログエントリに共通のフィールド

## 2. OpenTelemetryの設定

OpenTelemetryのセットアップには、エクスポーターの作成とグローバルプロバイダーの設定が含まれます：

```go
// テレメトリーをコレクターに送信するためのOTLPエクスポーターを作成
spanExporter, err := otlptracegrpc.New(ctx,
	otlptracegrpc.WithEndpoint(*coladdr),
	otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()))
if err != nil {
	log.Fatalf(ctx, err, "トレーシングの初期化に失敗しました")
}
defer func() {
	ctx := log.Context(context.Background())
	if err := spanExporter.Shutdown(ctx); err != nil {
		log.Errorf(ctx, err, "トレーシングのシャットダウンに失敗しました")
	}
}()

metricExporter, err := otlpmetricgrpc.New(ctx,
	otlpmetricgrpc.WithEndpoint(*coladdr),
	otlpmetricgrpc.WithTLSCredentials(insecure.NewCredentials()))
if err != nil {
	log.Fatalf(ctx, err, "メトリクスの初期化に失敗しました")
}
defer func() {
	ctx := log.Context(context.Background())
	if err := metricExporter.Shutdown(ctx); err != nil {
		log.Errorf(ctx, err, "メトリクスのシャットダウンに失敗しました")
	}
}()

// エクスポーターでClueを初期化
cfg, err := clue.NewConfig(ctx,
	serviceName,
	version,
	metricExporter,
	spanExporter,
	clue.WithResourceAttributes(map[string]string{
		"environment": environment,
		"region":     region,
	}))
if err != nil {
	log.Fatalf(ctx, err, "可観測性の初期化に失敗しました")
}
clue.ConfigureOpenTelemetry(ctx, cfg)
```

この設定により、サービスのコアとなるOpenTelemetryインフラストラクチャがセットアップされます。
テレメトリーデータを処理と保存のためにコレクターに送信するエクスポーターを作成します。
また、サービス終了時のデータ損失を防ぐための適切なシャットダウン処理も確保します。
環境やリージョンなどのリソース属性を追加して、テレメトリーデータの効果的な整理とフィルタリングを
支援します。最後に、アプリケーション全体でトレーシングとメトリクス収集を可能にする
グローバルOpenTelemetryプロバイダーを初期化します。

## 3. HTTPとgRPCのセットアップ

HTTPサービスの場合、ハンドラーを可観測性ミドルウェアでラップします：

```go
// Goa HTTPマルチプレクサを作成
mux := goahttp.NewMuxer()

// デバッグエンドポイントをマウント
debug.MountDebugLogEnabler(debug.Adapt(mux))  // 動的ログレベル制御
debug.MountPprofHandlers(debug.Adapt(mux))    // Goプロファイリングエンドポイント

// 正しい順序でミドルウェアを追加（内側から外側）：
handler := otelhttp.NewHandler(mux, serviceName)  // 3. OpenTelemetry
handler = debug.HTTP()(handler)                   // 2. デバッグエンドポイント
handler = log.HTTP(ctx)(handler)                  // 1. リクエストロギング

// 計装されたハンドラーでサーバーを作成
server := &http.Server{
	Addr:         *httpAddr,
	Handler:      handler,
	ReadTimeout:  15 * time.Second,
	WriteTimeout: 15 * time.Second,
}
```

gRPCサービスの場合、インターセプターを使用します：

```go
// 可観測性を備えたgRPCクライアント接続を作成
conn, err := grpc.DialContext(ctx, *serverAddr,
	grpc.WithTransportCredentials(insecure.NewCredentials()),
	grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
	grpc.WithStatsHandler(otelgrpc.NewClientHandler()))

// 可観測性を備えたgRPCサーバーを作成
srv := grpc.NewServer(
	grpc.UnaryInterceptor(log.UnaryServerInterceptor()),
	grpc.StatsHandler(otelgrpc.NewServerHandler()))
```

ミドルウェア/インターセプターは以下を提供します：
- すべてのリクエストの分散トレーシング
- リクエスト/レスポンスのロギング
- 動的ログレベル制御
- パフォーマンスプロファイリングエンドポイント

## 4. ヘルスチェック

ヘルスチェックは、サービスとその依存関係を監視するのに役立ちます。Clueは
ヘルスチェックを実装するための2つの主要なインターフェースを提供します：

### Pingerインターフェース

`Pinger`インターフェースは、単一の依存関係の健全性をチェックする方法を定義します：

```go
type Pinger interface {
    // Nameはリモートサービスの名前を返します
    Name() string
    
    // Pingはサービスが正常かどうかをチェックします
    Ping(context.Context) error
}
```

Clueは、ヘルスチェックエンドポイントをpingするデフォルトのHTTPベースの実装を提供します：

```go
// データベースサービス用のpingerを作成
dbPinger := health.NewPinger("database", "db:8080",
    health.WithScheme("https"),           // HTTPSを使用（デフォルト: http）
    health.WithPath("/health"))           // カスタムパス（デフォルト: /livez）

// Redis用のpingerを作成
redisPinger := health.NewPinger("redis", "redis:6379",
    health.WithPath("/ping"))             // Redisのヘルスエンドポイント
```

特殊なケース用にカスタムpingerを実装することもできます：

```go
type CustomPinger struct {
    name string
    db   *sql.DB
}

func (p *CustomPinger) Name() string { return p.name }

func (p *CustomPinger) Ping(ctx context.Context) error {
    return p.db.PingContext(ctx)
}
```

### Checkerインターフェース

`Checker`インターフェースは、複数のpingerを集約し、全体的な健全性ステータスを提供します：

```go
type Checker interface {
    // Checkはすべての依存関係の健全性ステータスを返します
    Check(context.Context) (*Health, bool)
}

// Healthには詳細なステータス情報が含まれます
type Health struct {
    Uptime  int64             // サービスの稼働時間（秒）
    Version string            // サービスのバージョン
    Status  map[string]string // 各依存関係のステータス
}
```

複数の依存関係を持つチェッカーを作成：

```go
// 複数のpingerを持つヘルスチェッカーを作成
checker := health.NewChecker(
    health.NewPinger("database", *dbAddr),
    health.NewPinger("cache", *cacheAddr),
    health.NewPinger("search", *searchAddr),
    &CustomPinger{name: "custom", db: db},
)

// チェッカーからHTTPハンドラーを作成
check := health.Handler(checker)
``` 