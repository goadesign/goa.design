---
nav_group: reference
title: "内部ツールレジストリ"
linkTitle: "レジストリ"
weight: 110
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
- **ヘルスチェック ping を協調**: toolset ごとに取得する有効期限付き Redis lease を使います
- **provider health state を共有**: すべての node でヘルス状態を共有

これにより水平スケールと高可用性を実現できます。クライアントは任意の node に接続でき、同じ registry state を参照できます。

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## クイックスタート

### ライブラリとして使う

registry node をプログラムから作成して実行します。`registry.New` は Redis 上の catalog と call record、Pulse stream、health scheduler を初期化します。`Run` は gRPC server を起動し、shutdown まで待機します。この例はローカル開発用のアドレスを使います。deployment に合わせて Redis と gRPC の認証情報を設定してください。

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
| **Catalog** | Redis-backed の tool schema、admission token、provider lease、retirement history |
| **Health Tracker** | ping/pong による provider liveness の監視 |
| **Stream Manager** | tool call routing 用 Pulse streams の管理 |
| **Call Record Store** | 各 call の request identity、provider assignment、deadline、publication state、正規 terminal result を保持 |

### ツール呼び出しフロー

`CallTool` が呼ばれると、registry は次を順番に実行します:

1. **Identity と schema validation**: registry は payload を検証し、run 内で一意な `tool_use_id` を 1 つ導出します。完全に同じ retry は、保持済みの同じ record へ接続します。
2. **Provider wait**: 未 publish の call は active toolset に healthy provider が現れるまで、既存の execution deadline を上限として待ちます。
3. **Atomic publication**: 1 回の Redis operation で、選んだ provider が現在も active かつ non-draining であることを確認してから request を正確に 1 回 append します。health check 後に rollout が provider を変更した場合、未 publish の call は同じ deadline 内で replacement を選び直します。
4. **Immutable execution**: publish に成功すると provider assignment が固定されます。外部 effect が始まった可能性があるため、その後 call を移動できません。
5. **Result delivery**: `CallTool` は正確な provider token、result-stream identity、execution deadline、retention deadline を返します。executor は provider が terminal result を返すか execution deadline が call を確定するまで、その stream を読みます。

publish 前に execution deadline が切れた場合、registry は `call_not_admitted` を記録します。これは executor が別の plan を選べることを証明します。publish 済み call の結果が不明な場合は `outcome_unknown` を返し、replacement へ移せません。

## Provider 統合 (サービス側)

registry routing は半分にすぎません。**provider は toolset 所有サービスプロセス内で tool execution loop を実行する必要があります**。
handler を呼び出す前に、provider は message の execution deadline とは独立した、worker のライフサイクルに紐づく context と既存の claim timeout を使って `ClaimToolCall` を呼び出します。registry は call が期限切れか、すでに最終結果を持つか、別の配信が実行権限を持つかを判断します。provider はこれらの結果を受けると、handler を呼び出したり execution loop を停止したりせず、message の受信確認を行います。`execute` の判断を受けた場合に限り、message の元の execution deadline を延長せずに handler へ適用して呼び出します。

service-owned で method-backed な toolset (`BindTo(...)` で宣言された tool) の場合、code generation は次の provider adapter を出力します:

- `gen/<service>/toolsets/<toolset>/provider.go`

生成された provider は次を行います:

- 受信した tool payload JSON を生成 payload codec でデコード
- 生成 transform を使って Goa method payload を構築
- bound service method を呼び出し
- 生成 result codec を使って、tool result JSON と宣言済み server-data をエンコード

次の例は module `example.com/registry-provider`、service `catalog`、その method-backed toolset `search` を使い、`catalog.search` として登録します。アプリケーションの 2 つの import path と toolset 名を、自分のプロジェクトで生成された値に置き換えてください。`NewProvider`、`ToolSchemas`、`SchemaFingerprint` は生成 toolset package の関数です。生成 schema はそのまま使用します。登録 callback は、module root に生成される `AGENTS_QUICKSTART.md` の **Service-Side Tool Providers** の例に沿っています ([クイックスタート](../quickstart/))。

service の実装、`pulse.New(pulse.Options{Redis: rdb})` で作成した Pulse client、deployment の認証情報を指定して `grpc.NewClient` で作成した registry への gRPC connection を渡します。この process と toolset に対して安定し、稼働中の replica 間で一意な `providerID` と、同じ登録の replica が共有する deployment 指定の必須値 `admissionRevision` を渡してください。`Serve` が incarnation ID を作成し、callback へ渡します。bound service method は context cancellation に従う必要があります。`serveTools` を service のライフサイクル内で実行し、両 client を開いたまま終了を待ってください。shutdown 時には新しい処理の受け付けを止め、実行権を取得済みの call、result、受信確認を `Options.ShutdownTimeout` 内で完了させます。この処理が成功した場合だけ、別の時間枠 `Registration.ReleaseTimeout` で正確な lease を解放します。完了処理に失敗した場合は lease の期限切れによって実行権が終了します。戻り値の error が `context.Canceled` にも一致する場合でも、完了処理や lease 解放の error を保持して報告してください。以下では必要な登録 callback をすべて設定しています:

```go
package providers

import (
	"context"
	"encoding/json"
	"time"

	gencatalog "example.com/registry-provider/gen/catalog"
	gensearch "example.com/registry-provider/gen/catalog/toolsets/search"
	"goa.design/goa-ai/features/stream/pulse/clients/pulse"
	genregistrygrpc "goa.design/goa-ai/registry/gen/grpc/registry/client"
	genregistry "goa.design/goa-ai/registry/gen/registry"
	registrywire "goa.design/goa-ai/runtime/toolregistry"
	"goa.design/goa-ai/runtime/toolregistry/provider"
	"google.golang.org/grpc"
)

// serveTools runs the generated catalog provider until shutdown or a provider error.
// The caller owns the clients, service implementation, and deployment identifiers.
func serveTools(ctx context.Context, pulseClient pulse.Client, conn *grpc.ClientConn,
	serviceImpl gencatalog.Service, providerID, admissionRevision string) error {
	const toolsetID = "catalog.search"
	transport := genregistrygrpc.NewClient(conn, grpc.WaitForReady(true))
	registryClient := genregistry.NewClient(
		transport.Register(),
		transport.ReleaseProvider(),
		transport.DrainProvider(),
		transport.Unregister(),
		transport.Pong(),
		transport.ListToolsets(),
		transport.GetToolset(),
		transport.ResolveToolset(),
		transport.CheckAdmission(),
		transport.Search(),
		transport.CallTool(),
		transport.CallResolvedTool(),
		transport.RetryTool(),
		transport.CompleteToolCall(),
		transport.PublishToolOutputDelta(),
		transport.ReportToolCallOverload(),
		transport.ClaimToolCall(),
	)
	toolSchemas := gensearch.ToolSchemas()
	handler := gensearch.NewProvider(serviceImpl)
	return provider.Serve(ctx, pulseClient, toolsetID, handler,
		provider.Registration{
			AdmissionRevision: admissionRevision,
			Register: func(ctx context.Context, toolset, providerID, incarnationID, admissionRevision string) (provider.RegistrationLease, error) {
				schemaFingerprint, err := gensearch.SchemaFingerprint(toolset)
				if err != nil {
					return provider.RegistrationLease{}, err
				}
				result, err := registryClient.Register(ctx, &genregistry.RegisterPayload{
					Name:                  toolset,
					Tools:                 toolSchemas,
					ProviderID:            providerID,
					ProviderIncarnationID: incarnationID,
					AdmissionRevision:     admissionRevision,
					WireProtocolVersion:   registrywire.WireProtocolVersion,
					SchemaFingerprint:     schemaFingerprint,
				})
				if err != nil {
					return provider.RegistrationLease{}, err
				}
				return provider.RegistrationLease{
					RegistrationToken: result.RegistrationToken,
					Duration:          time.Duration(result.LeaseDurationMs) * time.Millisecond,
				}, nil
			},
			Drain: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string, settlementDuration time.Duration) error {
				return registryClient.DrainProvider(ctx, &genregistry.DrainProviderPayload{
					Name:                      toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ExpectedRegistrationToken: expectedToken,
					SettlementDurationMs:      settlementDuration.Milliseconds(),
				})
			},
			Release: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string) error {
				return registryClient.ReleaseProvider(ctx, &genregistry.ReleaseProviderPayload{
					Name:                      toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ExpectedRegistrationToken: expectedToken,
				})
			},
			Complete: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, requestEventID string, result registrywire.ToolResultMessage) error {
				resultJSON, err := json.Marshal(result)
				if err != nil {
					return err
				}
				return registryClient.CompleteToolCall(ctx, &genregistry.CompleteToolCallPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					RegistrationToken:         result.RegistrationToken,
					ToolUseID:                 result.ToolUseID,
					ResultJSON:                resultJSON,
					RequestEventID:            requestEventID,
					ProviderRegistrationToken: providerToken,
				})
			},
			PublishOutputDelta: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, callToken, toolUseID, requestEventID, stream, delta string) error {
				return registryClient.PublishToolOutputDelta(ctx, &genregistry.PublishToolOutputDeltaPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ProviderRegistrationToken: providerToken,
					CallRegistrationToken:     callToken,
					ToolUseID:                 toolUseID,
					RequestEventID:            requestEventID,
					Stream:                    stream,
					Delta:                     delta,
				})
			},
			ReportOverload: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, callToken, toolUseID, requestEventID string) error {
				return registryClient.ReportToolCallOverload(ctx, &genregistry.ProviderToolCallClaimPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ProviderRegistrationToken: providerToken,
					CallRegistrationToken:     callToken,
					ToolUseID:                 toolUseID,
					RequestEventID:            requestEventID,
				})
			},
			Claim: func(ctx context.Context, claim provider.ClaimRequest) (provider.ClaimDisposition, error) {
				result, err := registryClient.ClaimToolCall(ctx, &genregistry.ClaimToolCallPayload{
					Toolset:                   claim.Toolset,
					ProviderID:                claim.ProviderID,
					ProviderIncarnationID:     claim.ProviderIncarnationID,
					ProviderRegistrationToken: claim.ProviderRegistrationToken,
					CallRegistrationToken:     claim.CallRegistrationToken,
					ToolUseID:                 claim.ToolUseID,
					RequestEventID:            claim.RequestEventID,
					ClaimOperationID:          claim.OperationID,
				})
				if err != nil {
					return "", err
				}
				return provider.ClaimDisposition(result.Disposition), nil
			},
		},
		provider.Options{
			ProviderID: providerID,
			Pong: func(ctx context.Context, providerID, incarnationID, pingID string) error {
				return registryClient.Pong(ctx, &genregistry.PongPayload{
					PingID:                pingID,
					Toolset:               toolsetID,
					ProviderID:            providerID,
					ProviderIncarnationID: incarnationID,
				})
			},
		},
	)
}
```

stream ID は決定的です:

- Tool calls: `toolset:<toolsetID>:requests`
- Results: `result:<toolUseID>`

## 設定

### Registry のオプション {#config-構造体}

[ライブラリの例](#ライブラリとして使う)は最小限の設定を示しています。application が所有する Redis client を `Redis` に渡し、registry cluster で共有する `Name` を指定します。同じ名前と Redis database を使う node は、catalog、call record、health check の協調状態を共有します。catalog は Pulse replicated map `<name>:toolsets` を使います。

全 API と default 値は [registry.Config](https://pkg.go.dev/goa.design/goa-ai/registry#Config) を参照してください。`PingInterval` と `MissedPingThreshold` は health check、`ExecutionTimeout` は新しく受け付けた実行の時間上限、`ResultStreamTTL` は result の保持、`ProviderLeaseDuration` は provider 登録の更新を設定します。`ExpectedToolsets` は必要な catalog 名を telemetry に記録しますが、登録や call を拒否しません。`Logger` は call の確定処理の失敗を受け取ります。これらのオプションは registry の構築時に指定します。

### Redis ストレージ {#store-実装}

Redis の catalog は tool schema、admission identity、provider lease、health timestamp、登録撤回の履歴を保持します。call record と Pulse の request/result stream も Redis を使います。registry replica や再起動した process が同じ登録と call の判断を参照できるよう、永続化した Redis を使ってください。application が Redis client を所有し、registry の停止後に閉じます。

## ヘルス監視

registry は Pulse stream で health ping を送信し、provider は gRPC の `Pong` メソッドで応答します。

### 仕組み

1. health scheduler は共有 catalog から active toolset を読みます。
2. toolset の ping lease を持つ node は、call を受け付ける有効な provider が存在する間、ping を送信します。
3. `Pong` は、応答が現在の登録、provider process、health check identity に一致する場合だけ catalog を更新します。
4. routing には、新しい call を受け付ける期限内の provider lease と、十分に新しい受理済み pong が必要です。

health は Redis の時刻を使って catalog から計算します。最後に受理した pong の経過時間は `(MissedPingThreshold + 1) × PingInterval` 以下である必要があります。未 publish の call は、既存の execution deadline までだけ healthy provider を待ちます。

### 分散協調

各 registry node はローカル scheduler を実行し、toolset ごとに有効期限付き Redis lease の取得を試みます。lease を取得した node がその health check を実行し、期限切れ後は別の node が取得できます。lease 名は registry cluster ごとに分かれています。

provider lease、現在の health check identity、最後に受理した pong は catalog の同じ record に保存されます。各 node はその record から health を計算するため、古い provider の遅れた応答によって現在の登録が healthy になることはありません。

## クライアント統合

provider と invocation の API には、生成された registry service client を使います。catalog discovery では `runtime/registry.NewClient` が同じ生成 client を包み、`ListToolsets`、`GetToolset`、`Search` と、`runtime/registry.Manager` が使う resource type を提供します。

以下の例は catalog の一覧と、名前で指定した toolset の完全な schema を取得します。`grpc.NewClient` と deployment の認証情報で作成した connection を渡してください。呼び出し側が connection の所有権を保持します。上の provider の例と同じく、生成 client のすべての endpoint を接続しています。

```go
package discovery

import (
	"context"

	genregistrygrpc "goa.design/goa-ai/registry/gen/grpc/registry/client"
	genregistry "goa.design/goa-ai/registry/gen/registry"
	runtimeregistry "goa.design/goa-ai/runtime/registry"
	"google.golang.org/grpc"
)

// discoverTools lists the catalog and retrieves the schema of the named toolset.
// The caller creates the gRPC connection and keeps it open during discovery.
func discoverTools(ctx context.Context, conn *grpc.ClientConn, toolsetName string) (
	[]*runtimeregistry.ToolsetInfo, *runtimeregistry.ToolsetSchema, error,
) {
	transport := genregistrygrpc.NewClient(conn, grpc.WaitForReady(true))
	generated := genregistry.NewClient(
		transport.Register(),
		transport.ReleaseProvider(),
		transport.DrainProvider(),
		transport.Unregister(),
		transport.Pong(),
		transport.ListToolsets(),
		transport.GetToolset(),
		transport.ResolveToolset(),
		transport.CheckAdmission(),
		transport.Search(),
		transport.CallTool(),
		transport.CallResolvedTool(),
		transport.RetryTool(),
		transport.CompleteToolCall(),
		transport.PublishToolOutputDelta(),
		transport.ReportToolCallOverload(),
		transport.ClaimToolCall(),
	)
	client := runtimeregistry.NewClient(generated)
	toolsets, err := client.ListToolsets(ctx)
	if err != nil {
		return nil, nil, err
	}
	schema, err := client.GetToolset(ctx, toolsetName)
	if err != nil {
		return nil, nil, err
	}
	return toolsets, schema, nil
}
```

## gRPC API

registry は次の gRPC method を公開します:

### Provider Operations

| Method | 説明 |
|--------|-------------|
| `Register` | active tool contract に対する 1 つの provider lease を追加または更新します。別 contract は古い lease が終了するまで待ちます。 |
| `DrainProvider` | 1 つの provider lease を新規 call に使えなくし、すでに所有する call を完了する権限は保ちます。 |
| `ReleaseProvider` | process が受理済み work を確定した後、正確な provider lease を削除します。 |
| `Unregister` | 正確な active admission を意図して廃止します。discovery と routing から削除し、同じ admission token が戻ることを永久に防ぎます。rollout 操作ではありません。 |
| `Pong` | 正確な current lease と health-check epoch に対して provider health を記録します。 |
| `ClaimToolCall` | publish 済み request の実行権限を、正確に 1 つの provider lease に付与します。 |
| `CompleteToolCall` | claim 済み call の正規 terminal result を commit し、result stream へ publish します。 |
| `PublishToolOutputDelta` | claim 済み call の bounded な best-effort progress fragment を publish します。 |
| `ReportToolCallOverload` | provider が overloaded call を実行する前に、bounded retry control を記録します。 |

### Discovery Operations

| Method | 説明 |
|--------|-------------|
| `ListToolsets` | 登録済み toolset を一覧します (任意で tag filtering)。metadata のみを返し、full schema は返しません。 |
| `GetToolset` | 指定 toolset の full schema を取得します。すべての tool input/output schema を含みます。 |
| `Search` | name、description、tags に対する keyword match で toolset を検索します。 |

### Invocation Operations

| Method | 説明 |
|--------|-------------|
| `CallTool` | run 内で一意な call を検証して publish します。call は既存 deadline 内で provider health を待ち、publish 前だけ replacement に追随し、その後は正確で不変な execution reference を返します。 |
| `RetryTool` | provider overload が記録された後、元の admission をそのまま再 publish します。replacement provider へ実行を移しません。 |

## ベストプラクティス

### デプロイ

- **cluster 内のすべての node で同じ `Name` を使う**: catalog と call の状態を共有し、health check を協調します
- **同じ Redis instance を指す**: state coordination のため
- **load balancer の背後にデプロイする**: すべての node が同一 state を返します
- **catalog、call record、Pulse stream には永続化した Redis を使う**: registry replica と再起動した process が同じ判断を参照できるようにします

### ヘルス監視

- **`PingInterval` と `MissedPingThreshold` を設定する**: health check の頻度と許容する pong の経過時間を指定します。default 値は `registry.Config` を参照してください。
- **catalog と health の telemetry を確認する**: toolset が存在しない場合と、provider が現在 call を受け付けられない場合を区別します。
- **execution deadline を維持する**: 未 publish の call は既存の deadline までだけ provider の回復を待ちます。

### スケーリング

- **node を追加する**: gRPC connection を増やしても、各 node は任意の request を処理できます
- **node は health check を協調する**: toolset ごとの有効期限付き Redis lease を使います
- **sticky session は不要**: result stream は Redis により cross-node delivery されるため、ある node で開始した tool call が別 node で完了できます

## 次のステップ

- [Toolsets](./toolsets/) で tool の定義方法を学ぶ
- [Production](./production/) で deployment pattern を確認する
- [Agent Composition](./agent-composition/) で cross-agent tool sharing を理解する


現在のソース解決、生成済み契約、プロバイダー動作、移行については[ツール検索と動的カタログ](../tool-search/)を参照してください。
