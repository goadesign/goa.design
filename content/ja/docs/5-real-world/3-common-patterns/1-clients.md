---
title: データベース統合
weight: 2
---

# サービスクライアントの作成

マイクロサービスを構築する際の一般的な課題は、サービス間の通信をどのように構造化するかということです。
このセクションでは、Goaサービスのクライアントを作成するためのベストプラクティスを説明し、保守性とテスト可能性の高いクライアント実装の作成に焦点を当てます。

## クライアント設計の哲学

Goaサービスのクライアントを構築する際の推奨アプローチは、以下の主要な原則に従います：

1. **単一責任**: 共有クライアントライブラリではなく、ダウンストリームサービスごとに1つのクライアントを作成
2. **狭いインターフェース**: 消費サービスが必要とするメソッドのみを公開するインターフェースを定義
3. **実装の独立性**: 同じインターフェースの背後で異なるトランスポートプロトコル（gRPC、HTTP）をサポート
4. **テスト可能性**: 明確に定義されたインターフェースを通じて、テストのための容易なモック化を可能に

このアプローチは、サービスが共有クライアントライブラリを通じて密接に結合される分散モノリスの作成を防ぐのに役立ちます。

## クライアントの構造

典型的なGoaサービスクライアントは以下で構成されます：

1. サービス契約を定義するクライアントインターフェース
2. ドメインモデルを表現するデータ型
3. 生成されたGoaクライアントを使用する具体的な実装
4. クライアントインスタンスを作成するファクトリ関数

天気予報サービスクライアントの完全な例を見てみましょう：

```go
package forecaster

import (
    "context"

    "google.golang.org/grpc"

    "goa.design/clue/debug"
    genforecast "goa.design/clue/example/weather/services/forecaster/gen/forecaster"
    gengrpcclient "goa.design/clue/example/weather/services/forecaster/gen/grpc/forecaster/client"
)

type (
    // Client は予報サービスのクライアントです。
    Client interface {
        // GetForecast は指定された場所の予報を取得します。
        GetForecast(ctx context.Context, lat, long float64) (*Forecast, error)
    }

    // Forecast は指定された場所の予報を表します。
    Forecast struct {
        // Location は予報の場所です。
        Location *Location
        // Periods は場所の予報です。
        Periods []*Period
    }

    // Location は予報の地理的位置を表します。
    Location struct {
        // Lat は場所の緯度です。
        Lat float64
        // Long は場所の経度です。
        Long float64
        // City は場所の都市です。
        City string
        // State は場所の州です。
        State string
    }

    // Period は予報期間を表します。
    Period struct {
        // Name は予報期間の名前です。
        Name string
        // StartTime は予報期間の開始時刻（RFC3339形式）です。
        StartTime string
        // EndTime は予報期間の終了時刻（RFC3339形式）です。
        EndTime string
        // Temperature は予報期間の温度です。
        Temperature int
        // TemperatureUnit は予報期間の温度単位です。
        TemperatureUnit string
        // Summary は予報期間の概要です。
        Summary string
    }

    // client はクライアントの実装です。
    client struct {
        genc *genforecast.Client
    }
)

// New は新しい予報サービスクライアントをインスタンス化します。
func New(cc *grpc.ClientConn) Client {
    c := gengrpcclient.NewClient(cc, grpc.WaitForReady(true))
    forecast := debug.LogPayloads(debug.WithClient())(c.Forecast())
    return &client{genc: genforecast.NewClient(forecast)}
}

// GetForecast は指定された場所の予報を返します。
func (c *client) GetForecast(ctx context.Context, lat, long float64) (*Forecast, error) {
    res, err := c.genc.Forecast(ctx, &genforecast.ForecastPayload{Lat: lat, Long: long})
    if err != nil {
        return nil, err
    }
    l := Location(*res.Location)
    ps := make([]*Period, len(res.Periods))
    for i, p := range res.Periods {
        pval := Period(*p)
        ps[i] = &pval
    }
    return &Forecast{&l, ps}, nil
}
```

主要なコンポーネントを分解して見てみましょう：

### クライアントインターフェース

インターフェースは消費者が使用する契約を定義します：

```go
type Client interface {
    GetForecast(ctx context.Context, lat, long float64) (*Forecast, error)
}
```

この狭いインターフェースは、実装の詳細を隠蔽し、保守とテストを容易にするために、消費者が必要とするメソッドのみを公開します。

### ドメイン型

クライアントパッケージは、生成された型を公開する代わりに、独自のドメイン型（`Forecast`、`Location`、`Period`）を定義します。これにより：

- 生成されたコードの変更からの分離
- よりクリーンで焦点を絞ったAPI
- 公開されるデータモデルのより良い制御

が可能になります。

### 実装

具体的な実装は、消費者にシンプルなインターフェースを提示しながら、内部的に生成されたGoaクライアントを使用します：

```go
type client struct {
    genc *genforecast.Client
}
```

### ファクトリ関数

`New`関数は、適切なトランスポート固有の設定でクライアントをインスタンス化します：

```go
func New(cc *grpc.ClientConn) Client {
    c := gengrpcclient.NewClient(cc, grpc.WaitForReady(true))
    forecast := debug.LogPayloads(debug.WithClient())(c.Forecast())
    return &client{genc: genforecast.NewClient(forecast)}
}
```

## HTTPクライアント

上記の例ではgRPCクライアントを示していますが、HTTPクライアントも同じパターンに従いますが、初期化が異なります。
HTTPクライアントの動作を詳しく見てみましょう。

### Goa生成HTTPクライアント

Goaはサービスの完全なHTTPクライアント実装を生成します。典型的な生成されたHTTPクライアントは以下のようになります：

```go
// Client はサービスエンドポイントのHTTPクライアントを一覧表示します。
type Client struct {
    // ForecastDoer は予報エンドポイントへのリクエストを行うためのHTTPクライアントです。
    ForecastDoer goahttp.Doer

    // 設定フィールド
    RestoreResponseBody bool
    scheme             string
    host               string
    encoder            func(*http.Request) goahttp.Encoder
    decoder            func(*http.Response) goahttp.Decoder
}

// NewClient はすべてのサービスサーバーのHTTPクライアントをインスタンス化します。
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client {
    return &Client{
        ForecastDoer:        doer,
        RestoreResponseBody: restoreBody,
        scheme:             scheme,
        host:               host,
        decoder:            dec,
        encoder:            enc,
    }
}

// Forecast はサービス予報サーバーにHTTPリクエストを行うエンドポイントを返します。
func (c *Client) Forecast() goa.Endpoint {
    var (
        decodeResponse = DecodeForecastResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v any) (any, error) {
        req, err := c.BuildForecastRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        resp, err := c.ForecastDoer.Do(req)
        if err != nil {
            return nil, goahttp.ErrRequestError("front", "forecast", err)
        }
        return decodeResponse(resp)
    }
}
```

生成されたクライアントは以下を提供します：
- 各エンドポイントのHTTPクライアントの動作をカスタマイズできる`Doer`インターフェース
- 組み込みのリクエストエンコーディングとレスポンスデコーディング
- エンドポイント固有のリクエストビルダーとレスポンスデコーダー
- `Doer`インターフェースを通じたミドルウェアのサポート

### クライアントインターフェースの作成

生成されたHTTPクライアントを使用してクリーンなクライアントインターフェースを作成するには、以下のように書きます：

```go
func NewHTTP(doer goa.Doer) Client {
    // 生成されたHTTPクライアントを作成
    c := genhttpclient.NewClient(
        "http",                    // スキーム
        "weather-service:8080",    // ホスト
        doer,                      // HTTPクライアント
        goahttp.RequestEncoder,    // リクエストエンコーダー
        goahttp.ResponseDecoder,   // レスポンスデコーダー
        false,                     // レスポンスボディの復元
``` 