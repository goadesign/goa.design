---
title: "内部ツールレジストリ"
linkTitle: "レジストリ"
weight: 9
description: "プロセス境界をまたぐツールセットの発見と実行のために、クラスタ化されたゲートウェイをデプロイします。"
llm_optimized: true
---

**内部ツールレジストリ (Internal Tool Registry)** は、プロセス境界をまたいでツールセットの発見と呼び出しを可能にする、クラスタ化されたゲートウェイサービスです。ツールセットが別サービスとして提供され、エージェント（コンシューマ）とは独立してスケールさせたい場合に向いています。

## 概要

レジストリは、**カタログ** と **ゲートウェイ** の両方として機能します：

- **カタログ**: エージェントは、利用可能なツールセット、そのスキーマ、およびヘルス状態を発見できます
- **ゲートウェイ**: ツール呼び出しは、Pulse ストリームを介してレジストリからプロバイダーへルーティングされます

これにより、エージェントとツールセットプロバイダーが疎結合になり、スケール、デプロイ、ライフサイクル管理をそれぞれ独立して行えます。

### Tool Registry と Prompt Registry の違い

両者は別システムであり、責務も異なります。

- **内部 Tool Registry**（本ページ）: プロセス境界をまたぐ toolset / tool call の発見と呼び出し。
- **Runtime Prompt Registry**（`runtime.PromptRegistry`）: プロセス内での prompt spec 登録とレンダリング（必要に応じて `runtime.WithPromptStore` による prompt store を利用）。

Tool Registry は prompt template を保存せず、prompt override の解決もしません。
prompt の解決・レンダリングは runtime/planner 層で行われ、`prompt_rendered` 観測イベントを発行します。

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## マルチノード・クラスタリング

複数のレジストリノードは、設定で同じ `Name` を使用し、同じ Redis インスタンスに接続することで、同一の論理レジストリとして動作できます。

同じ名前のノードは自動的に次を行います：

- **ツールセット登録の共有**: Pulse のレプリケートされたマップを通じて共有
- **ヘルスチェック ping の協調**: 分散ティッカーにより協調（同時刻に ping するのは常に 1 ノードのみ）
- **プロバイダーヘルス状態の共有**: すべてのノードで同一のビューを保持

これにより水平スケールと高可用性が実現されます。クライアントはどのノードに接続しても、同一のレジストリ状態を参照できます。

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## クイックスタート

### ライブラリとして使う

レジストリノードをプログラムから作成して起動します。`New()` の呼び出しで、レジストリは Redis に接続し、複数の Pulse コンポーネントを初期化します（分散協調のためのプールノード、ヘルス状態とツールセット追跡のための 2 つのレプリケートマップ、ツール呼び出しルーティングのためのストリームマネージャなど）。`Run()` は gRPC サーバーを起動し、シャットダウンまでブロックしつつ、グレースフルな終了処理を自動的に行います。

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

    // Redis に接続
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer rdb.Close()

    // レジストリを作成
    reg, err := registry.New(ctx, registry.Config{
        Redis: rdb,
        Name:  "my-registry",  // 同じ Name のノードはクラスタを形成する
    })
    if err != nil {
        log.Fatal(err)
    }

    // gRPC サーバーを起動（シャットダウンまでブロック）
    log.Println("starting registry on :9090")
    if err := reg.Run(ctx, ":9090"); err != nil {
        log.Fatal(err)
    }
}
```

### サンプルバイナリ

`registry` パッケージには、すぐに試せるサンプルバイナリが含まれます。同じ Redis を指し、同じ `REGISTRY_NAME` を持つノードは自動的にクラスタを形成し、追加設定なしでツールセット登録を共有し、ヘルスチェックも協調されます。

```bash
# シングルノード（開発）
REDIS_URL=localhost:6379 go run ./registry/cmd/registry

# マルチノードクラスタ（本番）
REGISTRY_NAME=prod REGISTRY_ADDR=:9090 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9091 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9092 REDIS_URL=redis:6379 ./registry
```

### 環境変数

| 変数 | 説明 | デフォルト |
|----------|-------------|---------|
| `REGISTRY_ADDR` | gRPC リッスンアドレス | `:9090` |
| `REGISTRY_NAME` | レジストリクラスタ名 | `registry` |
| `REDIS_URL` | Redis 接続 URL | `localhost:6379` |
| `REDIS_PASSWORD` | Redis パスワード | (なし) |
| `PING_INTERVAL` | ヘルスチェック ping 間隔 | `10s` |
| `MISSED_PING_THRESHOLD` | 非健全とみなすまでの連続 ping 欠損数 | `3` |

## アーキテクチャ

{{< figure src="/images/diagrams/RegistryArchitecture.svg" alt="Registry Internal Architecture" >}}

### コンポーネント

| コンポーネント | 説明 |
|-----------|-------------|
| **Service** | ディスカバリと呼び出しのための gRPC ハンドラ |
| **Store** | ツールセットメタデータの永続化層（メモリまたは MongoDB） |
| **Health Tracker** | ping/pong によりプロバイダーの生存性を監視 |
| **Stream Manager** | ツール呼び出しルーティングのための Pulse ストリームを管理 |
| **Result Stream Manager** | ツール結果の配信を担当 |

### ツール呼び出しフロー

`CallTool` が呼ばれると、レジストリは次の手順を順に実行します：

1. **スキーマ検証**: コンパイル済みスキーマバリデータを使い、ペイロードをツールの JSON Schema に対して検証
2. **ヘルスチェック**: 直近の ping への応答状況を確認し、非健全なツールセットは即座に `service_unavailable` を返す
3. **結果ストリームの作成**: 一意な `tool_use_id` を持つ一時的な Pulse ストリームを作成し、クロスノード配信のために `tool_use_id → stream_id` の対応を Redis に保存
4. **リクエストの発行**: ツール呼び出しをツールセットのリクエストストリーム（`toolset:<name>:requests`）へ publish
5. **結果待ち**: ゲートウェイは結果ストリームに subscribe し、プロバイダーからの応答か 30 秒タイムアウトまでブロック

この設計により、プロバイダーが非健全な場合はタイムアウト待ちではなく、呼び出しが即時に失敗します。

## プロバイダー統合（サービス側）

レジストリによるルーティングは半分に過ぎません。**ツールセットの所有サービス側プロセスで、ツール実行ループ（プロバイダーループ）を動かす必要があります**。

サービス所有でメソッド連携のツールセット（`BindTo(...)` で宣言されたツール）の場合、コード生成は次の provider アダプタを出力します：

- `gen/<service>/toolsets/<toolset>/provider.go`

生成された provider は次を行います：

- 生成済み payload codec を使って、受信した payload JSON をデコード
- 生成済み transforms を使って、Goa メソッド用の payload を構築
- 連携先のサービスメソッドを呼び出し
- 生成済み result codec を使って、結果 JSON を宣言済み server-data（観測者向け任意 server-data とサーバー専用 always-on メタデータを含む）とともにエンコード

レジストリのゲートウェイからの呼び出しを処理するには、生成された provider をランタイムの provider ループに接続します：

```go
handler := toolsetpkg.NewProvider(serviceImpl)
go func() {
    err := toolprovider.Serve(ctx, pulseClient, toolsetID, handler, toolprovider.Options{
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

ストリーム ID は決定的です：

- 呼び出し: `toolset:<toolsetID>:requests`
- 結果: `result:<toolUseID>`

## 設定

### Config 構造体

`Name` は特に重要です。協調に使われる Pulse リソース名を決めます。プールは `<name>`、ヘルスマップは `<name>:health`、レジストリマップは `<name>:toolsets` です。`Name` と Redis 接続が一致するノードは自動的に相互発見します。

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

レジストリは、ストレージバックエンドを差し替えできます。ストアはツールセットメタデータ（名前、説明、バージョン、タグ、ツールスキーマ）を永続化します。なお、ヘルス状態とストリーム協調は、選択したストアに関係なく常に Redis/Pulse 経由で処理されます（ストアはメタデータ永続化にのみ影響します）。

```go
import (
    "goa.design/goa-ai/registry/store/memory"
    "goa.design/goa-ai/registry/store/mongo"
)

// インメモリストア（デフォルト、開発向け）
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    // Store defaults to memory.New()
})

// MongoDB ストア（本番の永続化向け）
mongoStore, _ := mongo.New(mongoClient, "registry", "toolsets")
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    Store: mongoStore,
})
```

## ヘルス監視

レジストリは、Pulse ストリーム上の ping/pong メッセージを使って、プロバイダーのヘルスを自動監視します。

### 仕組み

1. レジストリは各登録ツールセットのストリームへ周期的に `ping` を送る
2. プロバイダーは `Pong` gRPC メソッドを通じて `pong` で応答する
3. `MissedPingThreshold` 回連続で ping が欠損すると、非健全としてマークされる
4. 非健全なツールセットは `CallTool` のルーティング対象から除外される

ヘルストラッカーは、`(MissedPingThreshold + 1) × PingInterval` で計算される staleness しきい値を使用します。デフォルト（欠損 3 回、間隔 10 秒）では、40 秒 pong がないと非健全になります。応答猶予を確保しつつ、合理的な速度で障害を検知できます。

### 分散協調

マルチノードクラスタでは、ヘルスチェック ping は Pulse の分散ティッカーで協調されます。任意の時刻に ping を送るのは常に 1 ノードで、当該ノードが落ちれば、別ノードが 1 ping 間隔以内に自動的に引き継ぎます。

すべてのノードは、Pulse のレプリケートマップでヘルス状態を共有します。どのノードで pong を受けても、共有マップに最新のタイムスタンプを書き込みます。どのノードがヘルスを判定する場合でもこの共有マップを読むため、クラスタ全体で一貫したヘルスビューが保たれます。

## クライアント統合

エージェントは、生成された gRPC クライアントを使ってレジストリに接続します。`GRPCClientAdapter` は生の gRPC クライアントをラップし、ディスカバリと呼び出しのための扱いやすいインターフェイスを提供します。すべてのレジストリノードが状態を共有するため、クライアントはどのノードへ接続しても構いません。本番ではロードバランサ配下に配置すると、フェイルオーバが容易です。

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"

    registrypb "goa.design/goa-ai/registry/gen/grpc/registry/pb"
    runtimeregistry "goa.design/goa-ai/runtime/registry"
)

// レジストリへ接続
conn, _ := grpc.NewClient("localhost:9090",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
defer conn.Close()

// クライアントアダプタを作成
client := runtimeregistry.NewGRPCClientAdapter(
    registrypb.NewRegistryClient(conn),
)

// ツールセット一覧を取得
toolsets, _ := client.ListToolsets(ctx)
for _, ts := range toolsets {
    fmt.Printf("Toolset: %s (%d tools)\n", ts.Name, ts.ToolCount)
}

// ツールセットの完全なスキーマを取得
schema, _ := client.GetToolset(ctx, "data-tools")
for _, tool := range schema.Tools {
    fmt.Printf("  Tool: %s - %s\n", tool.Name, tool.Description)
}
```

## gRPC API

レジストリは次の gRPC メソッドを提供します：

### プロバイダー操作

| メソッド | 説明 |
|--------|-------------|
| `Register` | ツールセットをレジストリへ登録します。ツールスキーマを検証し、リクエストストリームを作成し、ヘルス監視を開始します。プロバイダーが subscribe するためのストリーム ID を返します。 |
| `Unregister` | ツールセットをレジストリから削除します。ヘルス ping を止め、メタデータを削除しますが、基盤となるストリーム自体は破棄しません。 |
| `EmitToolResult` | ツール実行結果を emit します。Redis から結果ストリームを引いて（クロスノード配信を可能にし）、結果を publish します。 |
| `Pong` | ヘルスチェック ping へ応答します。共有ヘルスマップの「最終 pong タイムスタンプ」を更新します。 |

### ディスカバリ操作

| メソッド | 説明 |
|--------|-------------|
| `ListToolsets` | 登録済みツールセットの一覧を返します（任意でタグフィルタ）。メタデータのみで、完全スキーマは返しません。 |
| `GetToolset` | 特定ツールセットの完全なスキーマ（全ツールの入出力スキーマを含む）を返します。 |
| `Search` | 名前、説明、タグへのキーワードマッチでツールセットを検索します。 |

### 呼び出し操作

| メソッド | 説明 |
|--------|-------------|
| `CallTool` | レジストリゲートウェイ経由でツールを呼び出します。ペイロードを検証し、ヘルスを確認し、プロバイダーへルーティングし、結果を待ちます（タイムアウト 30 秒）。 |

## ベストプラクティス

### デプロイ

- **クラスタ内の全ノードで同じ `Name` を使う**: 共有される Pulse リソース名を決めます
- **同じ Redis を指す**: 状態協調のため
- **ロードバランサ配下に配置する**: どのノードも同一状態を提供するため、クライアント側のフェイルオーバが容易です
- **本番は MongoDB ストアを使う**: 再起動をまたいで登録を保持します（インメモリストアは再起動で登録が失われます）

### ヘルス監視

- **`PingInterval` を要件に合わせて設定する**: デフォルトは 10 秒。短くすると検知は速くなりますが、Redis トラフィックが増えます
- **`MissedPingThreshold` を調整する**: 誤検知と検知速度のトレードオフ（デフォルト 3）。staleness は `(threshold + 1) × interval`
- **ヘルス状態を監視する**: 非健全なツールセットはタイムアウトではなく即座に `service_unavailable` になります

### スケーリング

- **ノードを追加して gRPC 接続数を捌く**: どのノードでもあらゆるリクエストを処理可能
- **分散ティッカーで作業を共有する**: 各ツールセットに ping するのは常に 1 ノードのみ
- **スティッキーセッションは不要**: 結果ストリームは Redis によりクロスノード配信されるため、あるノードで開始されたツール呼び出しが別ノードで完了しても問題ありません

## 次のステップ

- [Toolsets](./toolsets/) を読んでツールの定義方法を学ぶ
- [Production](./production/) でデプロイパターンを確認する
- [Agent Composition](./agent-composition/) でエージェント間のツール共有を理解する
