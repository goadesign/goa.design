---
title: "ヘルスチェック"
description: "Clueを使用したヘルスチェックの実装"
weight: 5
---

# ヘルスチェック

ヘルスチェックは、サービスの監視とオーケストレーションにとって重要です。
サービスが正しく機能し、すべての依存関係が利用可能であることを確認するのに
役立ちます。Clueは、サービスの依存関係を監視してそのステータスを報告する
標準的なヘルスチェックシステムを提供し、コンテナオーケストレーターや監視
システムとの統合を容易にします。

## 概要

Clueのヘルスチェックシステムは、包括的なサービスヘルス監視を提供します：

- **依存関係の監視**: データベース、キャッシュ、その他のサービスの健全性を追跡
- **標準エンドポイント**: Kubernetesなどのプラットフォームと互換性のあるHTTPエンドポイント
- **詳細なステータス**: 稼働時間やバージョンを含む豊富なステータス情報
- **カスタムチェック**: ビジネス固有の健全性基準のサポート
- **柔軟な設定**: タイムアウト、パス、レスポンス形式のカスタマイズ可能

## 基本セットアップ

サービスでヘルスチェックを設定するのは簡単です。以下は基本的な例です：

```go
// ヘルスチェッカーを作成
checker := health.NewChecker()

// ヘルスチェックエンドポイントをマウント
// サービスステータスを返すGET /healthエンドポイントを作成
mux.Handle("GET", "/health", health.Handler(checker))
```

この基本的なセットアップにより、サービスはいくつかの重要なヘルス監視機能を
獲得します。外部システムがサービスのステータスを確実に照会できる標準化された
ヘルスチェックエンドポイントが得られます。エンドポイントはJSON形式でレスポンスを
返すため、監視ツールがヘルスデータを解析および処理しやすくなります。
システムは標準的なHTTPステータスコードを使用して、サービスが正常か問題が
発生しているかを明確に示します。さらに、サービスのすべての依存関係のステータスを
自動的に集約し、一目でシステムの健全性の包括的なビューを提供します。

## レスポンス形式

ヘルスチェックエンドポイントは、監視されているすべての依存関係のステータスを
含むJSONレスポンスを返します：

```json
{
    "status": {
        "PostgreSQL": "OK",
        "Redis": "OK",
        "PaymentService": "NOT OK"
    },
    "uptime": 3600,
    "version": "1.0.0"
}
```

レスポンスには以下が含まれます：
- **status**: 依存関係名から現在のステータスへのマップ
- **uptime**: サービスの稼働時間（秒）
- **version**: サービスのバージョン情報

HTTPステータスコード：
- **200 OK**: すべての依存関係が正常
- **503 Service Unavailable**: 1つ以上の依存関係が異常

## ヘルスチェックの実装

サービスまたは依存関係をヘルスチェック可能にするには、`Pinger`インターフェースを
実装します。このインターフェースはシンプルですが強力です：

```go
// Pingerインターフェース
type Pinger interface {
    Name() string                    // 依存関係の一意の識別子
    Ping(context.Context) error      // 依存関係が正常かチェック
}

// データベースのヘルスチェック
// PostgreSQLデータベースの実装例
type DBClient struct {
    db *sql.DB
}

func (c *DBClient) Name() string {
    return "PostgreSQL"
}

func (c *DBClient) Ping(ctx context.Context) error {
    // データベースの組み込みping機能を使用
    return c.db.PingContext(ctx)
}

// Redisのヘルスチェック
// Redisキャッシュの実装例
type RedisClient struct {
    client *redis.Client
}

func (c *RedisClient) Name() string {
    return "Redis"
}

func (c *RedisClient) Ping(ctx context.Context) error {
    // RedisのPINGコマンドを使用
    return c.client.Ping(ctx).Err()
}
```

ヘルスチェックを実装する際には、いくつかの重要な要因を考慮する必要があります。
まず第一に、ヘルスチェックは軽量で迅速に実行される必要があります。これは、
監視システムによって頻繁に呼び出される可能性があるため、サービスのパフォーマンスに
影響を与えないようにするためです。

適切なタイムアウト処理も重要です。各ヘルスチェックは、コンテキストを介して
渡されたタイムアウトを尊重し、タイムアウトに達した場合は速やかに戻る必要が
あります。これにより、ヘルスチェックがハングしてより広範なシステムの問題に
つながる可能性を防ぎます。

ヘルスチェックが返すエラーメッセージは、明確で実行可能である必要があります。
チェックが失敗した場合、エラーメッセージには、オペレーターが問題を迅速に理解し
対処するのに十分な詳細が含まれている必要があります。これには、特定のエラーコード、
コンポーネントの状態、トラブルシューティングのヒントなどが含まれる場合があります。

リソースを大量に消費したり外部サービスにアクセスしたりするヘルスチェックの場合、
キャッシュメカニズムの実装を検討してください。これにより、合理的な最新のヘルス
ステータスを提供しながら負荷を軽減できます。キャッシュの期間は、精度に対する
ニーズとのバランスを取る必要があります - 期間が短いとより最新の結果が得られますが、
負荷が増加します。

## ダウンストリームサービス

分散システムでは、ダウンストリームサービスの健全性を監視することが重要です。
以下は、異なる種類のサービスのヘルスチェックを実装する方法です：

```go
// HTTPサービスのヘルスチェック
type ServiceClient struct {
    name   string
    client *http.Client
    url    string
}

func (c *ServiceClient) Name() string {
    return c.name
}

func (c *ServiceClient) Ping(ctx context.Context) error {
    // タイムアウト処理用のコンテキスト付きでリクエストを作成
    req, err := http.NewRequestWithContext(ctx,
        "GET", c.url+"/health", nil)
    if err != nil {
        return err
    }
    
    // ヘルスチェックリクエストを実行
    resp, err := c.client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    // レスポンスステータスをチェック
    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("サービスが異常: %d", resp.StatusCode)
    }
    
    return nil
}

// gRPCサービスのヘルスチェック
type GRPCClient struct {
    name string
    conn *grpc.ClientConn
}

func (c *GRPCClient) Name() string {
    return c.name
}

func (c *GRPCClient) Ping(ctx context.Context) error {
    // 標準gRPCヘルスチェックプロトコルを使用
    return c.conn.Invoke(ctx,
        "/grpc.health.v1.Health/Check",
        &healthpb.HealthCheckRequest{},
        &healthpb.HealthCheckResponse{})
}
```

## カスタムヘルスチェック

基本的な接続チェックを超えて、ビジネス固有の要件に対するカスタムヘルスチェックを
実装できます：

```go
// カスタムビジネスロジックチェック
type BusinessCheck struct {
    store *Store
}

func (c *BusinessCheck) Name() string {
    return "BusinessLogic"
}

func (c *BusinessCheck) Ping(ctx context.Context) error {
    // 重要なビジネス条件をチェック
    ok, err := c.store.CheckConsistency(ctx)
    if err != nil {
        return err
    }
    if !ok {
        return errors.New("データの不整合を検出")
    }
    return nil
}

// システムリソースチェック
type ResourceCheck struct {
    threshold float64
}

func (c *ResourceCheck) Name() string {
    return "SystemResources"
}

func (c *ResourceCheck) Ping(ctx context.Context) error {
    // メモリ使用量をチェック
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    memoryUsage := float64(m.Alloc) / float64(m.Sys)
    if memoryUsage > c.threshold {
        return fmt.Errorf("メモリ使用量が高すぎます: %.2f", memoryUsage)
    }
    
    return nil
}
```

## Kubernetes統合

プローブを使用してKubernetesでサービスのヘルスチェックを設定します。
この例では、livenessプローブとreadinessプローブの両方を示しています： 