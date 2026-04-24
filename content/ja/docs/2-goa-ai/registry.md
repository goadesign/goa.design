---
title: "内部ツールレジストリ"
linkTitle: "レジストリ"
weight: 9
description: "プロセス境界をまたぐツールセットの発見と呼び出しのために、クラスタ化されたゲートウェイをデプロイします。"
llm_optimized: true
---

**内部ツールレジストリ (Internal Tool Registry)** は、プロセス境界をまたいでツールセットの発見と呼び出しを可能にするクラスタ化されたゲートウェイサービスです。ツールセットを別サービスで提供し、消費側エージェントとは独立してスケールさせたい場面向けに設計されています。

## 概要

レジストリは **catalog** と **gateway** の両方として動作します:

- **Catalog**: エージェントは利用可能なツールセット、スキーマ、ヘルス状態を発見できます
- **Gateway**: ツール呼び出しはレジストリから Pulse streams 経由で provider へルーティングされます

これにより、エージェントとツールセット provider が疎結合になり、スケール、デプロイ、ライフサイクル管理を独立して行えます。

### Tool Registry と Prompt Registry

両者は責務の異なる別システムです:

- **Internal Tool Registry** (このページ): プロセス境界をまたぐ toolset と tool call の発見/呼び出し。
- **Runtime Prompt Registry** (`runtime.PromptRegistry`): プロセス内での prompt spec 登録とレンダリング。任意で prompt override store (`runtime.WithPromptStore`) を使えます。

tool registry は prompt template を保存せず、prompt override も解決しません。prompt rendering は runtime/planner 層に残り、`prompt_rendered` 観測イベントを発行します。

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## マルチノードクラスタリング

複数の registry node は、設定で同じ `Name` を使い、同じ Redis インスタンスへ接続することで、同じ論理 registry に参加できます。

同じ名前の node は自動的に次を行います:

- **ツールセット登録を共有**: Pulse replicated maps 経由で共有
- **ヘルスチェック ping を協調**: distributed tickers により、常に 1 node だけが ping します
- **provider health state を共有**: すべての node でヘルス状態を共有

これにより水平スケールと高可用性を実現できます。クライアントは任意の node に接続でき、同じ registry state を参照できます。

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## クイックスタート

### ライブラリとして使う

registry node をプログラムから作成して実行します。`New()` が呼ばれると、registry は Redis に接続し、分散協調用の pool node、health state と toolset tracking 用の 2 つの replicated map、tool call routing 用の stream manager など、複数の Pulse component を初期化します。`Run()` は gRPC server を起動し、shutdown まで block し、graceful termination を自動的に処理します。

```go
package main

import (
    "context"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/goa-ai/registry"
)

func main() {
    ctx := context.Background()

    // Connect to Redis
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer rdb.Close()

    // Create the registry
    reg, err := registry.New(ctx, registry.Config{
        Redis: rdb,
        Name:  "my-registry",  // Nodes with same name form a cluster
    })
    if err != nil {
        log.Fatal(err)
    }

    // Run the gRPC server (blocks until shutdown)
    log.Println("starting registry on :9090")
    if err := reg.Run(ctx, ":9090"); err != nil {
        log.Fatal(err)
    }
}
```

### サンプルバイナリ

registry package には、素早くデプロイするための example binary が含まれます。同じ Redis instance を指し、同じ `REGISTRY_NAME` を持つ node は自動的に cluster を形成します。追加設定なしで toolset registrations を共有し、health checks を協調します。

```bash
# Single node (development)
REDIS_URL=localhost:6379 go run ./registry/cmd/registry

# Multi-node cluster (production)
REGISTRY_NAME=prod REGISTRY_ADDR=:9090 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9091 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9092 REDIS_URL=redis:6379 ./registry
```

### 環境変数

| 変数 | 説明 | デフォルト |
|----------|-------------|---------|
| `REGISTRY_ADDR` | gRPC listen address | `:9090` |
| `REGISTRY_NAME` | Registry cluster name | `registry` |
| `REDIS_URL` | Redis connection URL | `localhost:6379` |
| `REDIS_PASSWORD` | Redis password | (なし) |
| `PING_INTERVAL` | Health check ping interval | `10s` |
| `MISSED_PING_THRESHOLD` | unhealthy とみなすまでの missed ping 数 | `3` |

## アーキテクチャ

{{< figure src="/images/diagrams/RegistryArchitecture.svg" alt="Registry Internal Architecture" >}}

### コンポーネント

| コンポーネント | 説明 |
|-----------|-------------|
| **Service** | discovery と invocation のための gRPC handler |
| **Store** | toolset metadata の persistence layer (memory または MongoDB) |
| **Health Tracker** | ping/pong による provider liveness の監視 |
| **Stream Manager** | tool call routing 用 Pulse streams の管理 |
| **Result Stream Manager** | tool result delivery の処理 |

### ツール呼び出しフロー

`CallTool` が呼ばれると、registry は次を順番に実行します:

1. **Schema validation**: runtime toolregistry schema validator を使い、payload を tool の JSON Schema に対して検証します
2. **Health check**: toolset が最近の ping に応答したか確認します。unhealthy な toolset は即座に `service_unavailable` を返します
3. **Result stream creation**: 一意な `tool_use_id` を持つ一時的な Pulse stream を作成し、cross-node result delivery のために mapping を Redis に保存します
4. **Request publishing**: tool call を toolset request stream (`toolset:<name>:requests`) に publish します
5. **Wait for result**: gateway は result stream を subscribe し、provider 応答または 30 秒 timeout まで block します

この設計により、provider が unhealthy な場合は timeout を待つのではなく fail fast します。

## Provider 統合 (サービス側)

registry routing は半分にすぎません。**provider は toolset 所有サービスプロセス内で tool execution loop を実行する必要があります**。

service-owned で method-backed な toolset (`BindTo(...)` で宣言された tool) の場合、code generation は次の provider adapter を出力します:

- `gen/<service>/toolsets/<toolset>/provider.go`

生成された provider は次を行います:

- 受信した tool payload JSON を生成 payload codec でデコード
- 生成 transform を使って Goa method payload を構築
- bound service method を呼び出し
- 生成 result codec を使って、tool result JSON と宣言済み server-data をエンコード

registry gateway からの tool call を処理するには、生成 provider を runtime provider loop (`goa.design/goa-ai/runtime/toolregistry/provider`) に配線します:

```go
handler := toolsetpkg.NewProvider(serviceImpl)
go func() {
    err := provider.Serve(ctx, pulseClient, toolsetID, handler, provider.Options{
        Pong: func(ctx context.Context, pingID string) error {
            return registryClient.Pong(ctx, &registry.PongPayload{
                PingID:  pingID,
                Toolset: toolsetID,
            })
        },
    })
    if err != nil {
        panic(err)
    }
}()
```

stream ID は決定的です:

- Tool calls: `toolset:<toolsetID>:requests`
- Results: `result:<toolUseID>`

## 設定

### Config 構造体

`Name` field は特に重要です。協調に使う Pulse resource name を決めます。pool は `<name>`、health map は `<name>:health`、registry map は `<name>:toolsets` です。Name と Redis connection が一致する node は自動的に互いを発見します。

```go
type Config struct {
    // Redis is the Redis client for Pulse operations. Required.
    Redis *redis.Client

    // Store is the persistence layer for toolset metadata.
    // Defaults to an in-memory store if not provided.
    Store store.Store

    // Name is the registry cluster name.
    // Nodes with the same Name and Redis connection form a cluster.
    // Defaults to "registry" if not provided.
    Name string

    // PingInterval is the interval between health check pings.
    // Defaults to 10 seconds if not provided.
    PingInterval time.Duration

    // MissedPingThreshold is the number of consecutive missed pings
    // before marking a toolset as unhealthy.
    // Defaults to 3 if not provided.
    MissedPingThreshold int

    // ResultStreamMappingTTL is the TTL for tool_use_id to stream_id mappings.
    // Defaults to 5 minutes if not provided.
    ResultStreamMappingTTL time.Duration

    // PoolNodeOptions are additional options for the Pulse pool node.
    PoolNodeOptions []pool.NodeOption
}
```

### Store 実装

registry は差し替え可能な storage backend をサポートします。store は toolset metadata (name, description, version, tags, tool schemas) を永続化します。health state と stream coordination は、どの store を選んでも常に Redis/Pulse 経由で処理されます。store は toolset metadata persistence だけに影響します。

```go
import (
    "goa.design/goa-ai/registry/store/memory"
    "goa.design/goa-ai/registry/store/mongo"
)

// In-memory store (default, for development)
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    // Store defaults to memory.New()
})

// MongoDB store (for production persistence)
mongoStore, _ := mongo.New(mongoClient, "registry", "toolsets")
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    Store: mongoStore,
})
```

## ヘルス監視

registry は Pulse streams 上の ping/pong message を使って provider health を自動的に監視します。

### 仕組み

1. Registry は登録済み toolset の stream へ定期的に `ping` message を送ります
2. Provider は `Pong` gRPC method 経由で `pong` message を返します
3. provider が `MissedPingThreshold` 回連続で ping を逃すと unhealthy に mark されます
4. unhealthy な toolset は `CallTool` routing から除外されます

health tracker は `(MissedPingThreshold + 1) × PingInterval` として計算される staleness threshold を使います。default (3 missed pings, 10s interval) では、40 秒 pong がないと toolset は unhealthy になります。provider に応答時間を与えつつ、合理的に素早く failure を検出できます。

### 分散協調

multi-node cluster では、health check pings は Pulse distributed tickers で協調されます。ticker により、任意の時点で ping を送る node は正確に 1 つになります。その node が crash した場合、別の node が 1 ping interval 以内に自動的に引き継ぎます。

すべての node は Pulse replicated map で health state を共有します。どの node が pong を受け取っても、共有 map に現在 timestamp を更新します。どの node が health を check してもこの共有 map を読むため、すべての node は一貫した provider health view を持ちます。

## クライアント統合

エージェントは生成 gRPC client を使って registry に接続します。`GRPCClientAdapter` は raw gRPC client を wrap し、discovery と invocation に使いやすい interface を提供します。すべての registry node は state を共有するため、client は任意の node に接続できます。本番では automatic failover のため load balancer を使ってください。

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"

    registrypb "goa.design/goa-ai/registry/gen/grpc/registry/pb"
    runtimeregistry "goa.design/goa-ai/runtime/registry"
)

// Connect to the registry
conn, _ := grpc.NewClient("localhost:9090",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
defer conn.Close()

// Create the client adapter
client := runtimeregistry.NewGRPCClientAdapter(
    registrypb.NewRegistryClient(conn),
)

// Discover toolsets
toolsets, _ := client.ListToolsets(ctx)
for _, ts := range toolsets {
    fmt.Printf("Toolset: %s (%d tools)
", ts.Name, ts.ToolCount)
}

// Get full schema for a toolset
schema, _ := client.GetToolset(ctx, "data-tools")
for _, tool := range schema.Tools {
    fmt.Printf("  Tool: %s - %s
", tool.Name, tool.Description)
}
```

## gRPC API

registry は次の gRPC method を公開します:

### Provider Operations

| Method | 説明 |
|--------|-------------|
| `Register` | toolset を registry に登録します。tool schema を検証し、request stream を作成し、health tracking を開始します。provider が subscribe する stream ID を返します。 |
| `Unregister` | toolset を registry から削除します。health ping を停止し metadata を削除しますが、基盤 stream は破棄しません。 |
| `EmitToolResult` | tool execution result を emit します。Redis から result stream を lookup し (cross-node delivery を可能にする)、result を publish します。 |
| `Pong` | health check ping に応答します。共有 health map の last-pong timestamp を更新します。 |

### Discovery Operations

| Method | 説明 |
|--------|-------------|
| `ListToolsets` | 登録済み toolset を一覧します (任意で tag filtering)。metadata のみを返し、full schema は返しません。 |
| `GetToolset` | 指定 toolset の full schema を取得します。すべての tool input/output schema を含みます。 |
| `Search` | name、description、tags に対する keyword match で toolset を検索します。 |

### Invocation Operations

| Method | 説明 |
|--------|-------------|
| `CallTool` | registry gateway 経由で tool を invoke します。payload を検証し、health を check し、provider へ route し、result を待ちます (30s timeout)。 |

## ベストプラクティス

### デプロイ

- **すべての node で同じ `Name` を使う**: これが共有 Pulse resource name を決めます
- **同じ Redis instance を指す**: state coordination のため
- **load balancer の背後にデプロイする**: すべての node が同一 state を返します
- **本番では MongoDB store を使う**: restart をまたいで metadata を保持します (in-memory store は restart で registration を失います)

### ヘルス監視

- **適切な `PingInterval` を設定する**: latency 要件に合わせます (default: 10s)。小さくすると failure 検出は速くなりますが Redis traffic が増えます。
- **`MissedPingThreshold` を調整する**: false positive と検出速度の balance を取ります (default: 3)。staleness threshold は `(threshold + 1) × interval` です。
- **health state を監視する**: unhealthy toolset は timeout ではなく即座に `service_unavailable` error を起こします

### スケーリング

- **node を追加する**: gRPC connection を増やしても、各 node は任意の request を処理できます
- **node は Pulse distributed tickers で作業を共有する**: toolset ごとの ping は一度に 1 node だけが行います
- **sticky session は不要**: result stream は Redis により cross-node delivery されるため、ある node で開始した tool call が別 node で完了できます

## 次のステップ

- [Toolsets](./toolsets/) で tool の定義方法を学ぶ
- [Production](./production/) で deployment pattern を確認する
- [Agent Composition](./agent-composition/) で cross-agent tool sharing を理解する
