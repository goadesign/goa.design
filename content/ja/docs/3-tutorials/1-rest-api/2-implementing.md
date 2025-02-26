---
title: 実装
weight: 2
description: "Goaでのコード生成、サービス実装、HTTPサーバーのセットアップ、エンドポイントのテストを含む、REST APIサービスの実装に関するステップバイステップガイド。"
---

GoaのDSLでREST APIを設計した後は、サービスを実装する段階です。このチュートリアルでは、実装プロセスを段階的に説明します。

1. Goa CLI（`goa gen`）を使用してコードを生成
2. サービスとHTTPサーバーを実装する`main.go`を作成

## 1. Goaアーティファクトの生成

プロジェクトのルート（例：`concerts/`）から、Goaコードジェネレーターを実行します：

```bash
goa gen concerts/design
```

このコマンドは、設計ファイル（`design/concerts.go`）を分析し、以下を含む`gen/`フォルダを生成します：
- **トランスポートに依存しないエンドポイント**（`gen/concerts/`内）
- サーバーとクライアント両方の**HTTP**バリデーションとマーシャリングコード（`gen/http/concerts/`内）
- **OpenAPI**アーティファクト（`gen/http/`内）

**注意：** 設計を変更した場合（メソッドやフィールドの追加など）、生成されたコードを同期させるために`goa gen`を再実行してください。

## 2. 生成されたコードの探索

生成されたコードの主要なコンポーネントを見ていきましょう。これらの
ファイルを理解することは、サービスを正しく実装し、Goaの機能を
最大限に活用するために重要です。

### gen/concerts

トランスポートプロトコルに依存しないコアサービスコンポーネントを定義します：
- ビジネスロジック実装のための**サービスインターフェース**（`service.go`）
- 設計を反映した**ペイロード**と**結果**の型
- サービス実装注入のための**NewEndpoints**関数
- サービスクライアント作成のための**NewClient**関数

### gen/http/concerts/server

サーバーサイドのHTTP固有のロジックを含みます：
- サービスエンドポイントをラップする**HTTPハンドラー**
- リクエストとレスポンスの**エンコード/デコード**ロジック
- サービスメソッドへの**リクエストルーティング**
- **トランスポート固有の型**とバリデーション
- 設計仕様からの**パス生成**

### gen/http/concerts/client

クライアントサイドのHTTP機能を提供します：
- HTTPエンドポイントからの**クライアント作成**
- リクエストとレスポンスの**エンコード/デコード**
- **パス生成**関数
- **トランスポート固有の型**とバリデーション
- クライアントツール用の**CLIヘルパー関数**

### OpenAPI仕様

`gen/http`ディレクトリには自動生成されたOpenAPI仕様が含まれます：
- `openapi2.yaml`と`openapi2.json`（Swagger）
- `openapi3.yaml`と`openapi3.json`（OpenAPI 3.0）

これらの仕様はSwagger UIやその他のAPIツールと互換性があり、APIの探索やクライアント生成に役立ちます。

## 3. サービスの実装

`gen/concerts/service.go`で生成されたサービスインターフェースは、実装が必要なメソッドを定義しています：

```go
type Service interface {
    // 予定されているコンサートをオプションのページネーションで一覧表示
    List(context.Context, *ListPayload) (res []*Concert, err error)
    // 新しいコンサートエントリーを作成
    Create(context.Context, *ConcertPayload) (res *Concert, err error)
    // IDで単一のコンサートを取得
    Show(context.Context, *ShowPayload) (res *Concert, err error)
    // IDで既存のコンサートを更新
    Update(context.Context, *UpdatePayload) (res *Concert, err error)
    // IDでシステムからコンサートを削除
    Delete(context.Context, *DeletePayload) (err error)
}
```

### 実装の流れ

実装には以下が必要です：

1. インターフェースを実装するサービス構造体の作成
2. 必要なすべてのメソッドの実装
3. HTTPサーバーとの連携

`cmd/concerts/main.go`に以下の実装を作成します：

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"

    "github.com/google/uuid"
    goahttp "goa.design/goa/v3/http"

    // 生成されたパッケージにはgenプレフィックスを使用
    genconcerts "concerts/gen/concerts"
    genhttp "concerts/gen/http/concerts/server"
)

// ConcertsServiceはgenconcerts.Serviceインターフェースを実装
type ConcertsService struct {
    concerts []*genconcerts.Concert // インメモリストレージ
}

// オプションのページネーションで予定されているコンサートを一覧表示
func (m *ConcertsService) List(ctx context.Context, p *genconcerts.ListPayload) ([]*genconcerts.Concert, error) {
    start := (p.Page - 1) * p.Limit
    end := start + p.Limit
    if end > len(m.concerts) {
        end = len(m.concerts)
    }
    return m.concerts[start:end], nil
}

// 新しいコンサートエントリーを作成
func (m *ConcertsService) Create(ctx context.Context, p *genconcerts.ConcertPayloadCreatePayload) (*genconcerts.Concert, error) {
    newConcert := &genconcerts.Concert{
        ID:     uuid.New().String(),
        Artist: p.Artist,
        Date:   p.Date,
        Venue:  p.Venue,
        Price:  p.Price,
    }
    m.concerts = append(m.concerts, newConcert)
    return newConcert, nil
}

// IDで単一のコンサートを取得
func (m *ConcertsService) Show(ctx context.Context, p *genconcerts.ShowPayload) (*genconcerts.Concert, error) {
    for _, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            return concert, nil
        }
    }
    // 設計されたエラーを使用
    return nil, genconcerts.MakeNotFound(fmt.Errorf("concert not found: %s", p.ConcertID))
}

// IDで既存のコンサートを更新
func (m *ConcertsService) Update(ctx context.Context, p *genconcerts.UpdatePayload) (*genconcerts.Concert, error) {
    for i, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            if p.Artist != nil {
                concert.Artist = *p.Artist
            }
            if p.Date != nil {
                concert.Date = *p.Date
            }
            if p.Venue != nil {
                concert.Venue = *p.Venue
            }
            if p.Price != nil {
                concert.Price = *p.Price
            }
            m.concerts[i] = concert
            return concert, nil
        }
    }
    return nil, genconcerts.MakeNotFound(fmt.Errorf("concert not found: %s", p.ConcertID))
}

// IDでシステムからコンサートを削除
func (m *ConcertsService) Delete(ctx context.Context, p *genconcerts.DeletePayload) error {
    for i, concert := range m.concerts {
        if concert.ID == p.ConcertID {
            m.concerts = append(m.concerts[:i], m.concerts[i+1:]...)
            return nil
        }
    }
    return genconcerts.MakeNotFound(fmt.Errorf("concert not found: %s", p.ConcertID))
}

// mainはサービスをインスタンス化し、HTTPサーバーを起動します
func main() {
    // サービスのインスタンス化
    svc := &ConcertsService{}

    // 生成されたエンドポイントでラップ
    endpoints := genconcerts.NewEndpoints(svc)

    // HTTPハンドラーの構築
    mux := goahttp.NewMuxer()
    requestDecoder := goahttp.RequestDecoder
    responseEncoder := goahttp.ResponseEncoder
    handler := genhttp.New(endpoints, mux, requestDecoder, responseEncoder, nil, nil)

    // ハンドラーをmuxにマウント
    genhttp.Mount(mux, handler)

    // 新しいHTTPサーバーを作成
    port := "8080"
    server := &http.Server{Addr: ":" + port, Handler: mux}

    // サポートされているルートをログ出力
    for _, mount := range handler.Mounts {
        log.Printf("%q mounted on %s %s", mount.Method, mount.Verb, mount.Pattern)
    }

    // サーバーを起動（実行をブロックします）
    log.Printf("Starting concerts service on :%s", port)
    if err := server.ListenAndServe(); err != nil {
        log.Fatal(err)
    }
}
```

## 4. 実行とテスト

1. プロジェクトのルートからサービスを**実行**：
```bash
go run concerts/cmd/concerts
```

2. curlでエンドポイントを**テスト**：
```bash
curl http://localhost:8080/concerts
```

おめでとうございます！🎉 最初のGoaサービスの実装に成功しました。次は
エキサイティングな部分 - APIの動作を確認する時です！[実行](./3-running.md)に
進んで、サービスとの対話方法と実際のHTTPリクエストの処理を見ていきましょう。 