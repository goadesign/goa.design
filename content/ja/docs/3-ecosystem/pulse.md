---
title: "Pulse"
weight: 2
description: "分散イベント基盤: Go マイクロサービス向けのストリーミング、ワーカープール、レプリケートマップ。"
llm_optimized: true
---

Pulse は、イベント駆動の分散システムを構築するためのプリミティブを提供します。トランスポートに依存せず、Goa とは独立に動作しますが、Goa サービスとも自然に統合できます。

## 概要

Pulse は 3 つの主要パッケージで構成されます:

| パッケージ | 目的 | ユースケース |
|-----------|------|-------------|
| `streaming` | イベントストリーム | Pub/sub、fan-out、fan-in |
| `pool` | ワーカープール | バックグラウンドジョブ、タスクディスパッチ |
| `rmap` | レプリケートマップ | ノード間の共有状態 |

すべてのパッケージは、分散協調のためのバックエンドとして Redis を使用します。

## なぜ Pulse なのか？

- **Redis ネイティブで最小構成**: Pulse は Redis Streams とハッシュだけで動作します。すでに Redis を運用しているなら、Kafka や新しいブローカーを追加せずに、ストリーミング、ワーカープール、レプリケート状態を手に入れられます。
- **小さく、焦点の当たった API**: `streaming.Stream`、`pool.Node`、`rmap.Map` は巨大なフレームワークではなく、小さく合成可能なビルディングブロックです。Pulse を段階的に導入しやすくします。
- **Go ファーストな使い勝手**: API は Go らしく（`context.Context`、`[]byte` ペイロード、独自 struct による強い型付け）、明確な契約と構造化ロギングのフックを備えています。
- **複雑さより合成可能性**: イベントにはストリーム、長時間ジョブにはプール、Feature Flag やワーカーメタデータのようなコントロールプレーンの共有データにはレプリケートマップを使えます。
- **運用がシンプル**: 境界付きストリーム、明示的 ack を伴う at-least-once 配信、ジョブルーティングのためのコンシステントハッシュにより、実行時の挙動が予測可能で本番で理解しやすくなります。

## インストール

```bash
go get goa.design/pulse/streaming
go get goa.design/pulse/pool
go get goa.design/pulse/rmap
```

---

## レプリケートマップ

`rmap` パッケージは、Redis ハッシュと pub/sub チャネルをバックエンドにした、分散ノード間で複製される「最終的整合性 (eventually-consistent)」の読み取り最適化キー/バリューマップを提供します。

### アーキテクチャ

{{< figure src="/images/diagrams/PulseRmap.svg" alt="分散状態同期を行う Pulse レプリケートマップのアーキテクチャ" class="img-fluid" >}}

概念的には次の通りです:

- **権威あるストア**: Redis ハッシュ `map:<name>:content` がマップの正の値（カノニカル）を保持します。
- **更新チャネル**: Redis pub/sub `map:<name>:updates` がマップの変更（`set`、`del`、`reset`）をブロードキャストします。
- **ローカルキャッシュ**: 各プロセスはメモリ上のコピーを持ち、Redis から同期され続けます。読み取りはローカルで高速です。

### 参加と読み取り

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/rmap"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // Join a replicated map (loads a snapshot and subscribes to updates)
    m, err := rmap.New(ctx, "config", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer m.Close()

    // Read from the local cache
    value, ok := m.Get("feature.enabled")
    keys := m.Keys()
}
```

参加時には次が行われます:

- `rmap.New`（内部で `Join` を経由）はマップ名を検証し、原子的な更新に使う Lua スクリプトをロードしてキャッシュします
- `map:<name>:updates` チャネルを購読します
- Redis ハッシュの現在値を読み、ローカルキャッシュを初期化します

これにより、ローカルマップは Redis と同じマップに参加している他ノードに対して **最終的整合性** を持つようになります。

### 書き込み

```go
// Set a value
if _, err := m.Set(ctx, "feature.enabled", "true"); err != nil {
    log.Fatal(err)
}

// Increment a counter
count, err := m.Inc(ctx, "requests.total", 1)

// Append values to a list-like key
_, err = m.AppendValues(ctx, "allowed.regions", "us-east-1", "eu-west-1")

// Compare-and-swap a value
prev, err := m.TestAndSet(ctx, "config.version", "v1", "v2")

// Delete a key
_, err = m.Delete(ctx, "feature.enabled")
```

すべての変更操作は Lua スクリプトを通過し、次を行います:

- Redis ハッシュを 1 コマンドで更新し
- updates チャネルへコンパクトなバイナリ通知を publish します

Redis の Lua は原子的に実行されるため、各書き込みは「1 つの順序づけられた操作」として適用され、ブロードキャストされます。

### 変更通知

```go
// Watch for changes
changes := m.Subscribe()

go func() {
    for kind := range changes {
        switch kind {
        case rmap.EventChange:
            log.Info("config changed", "snapshot", m.Map())
        case rmap.EventDelete:
            log.Info("config key deleted")
        case rmap.EventReset:
            log.Info("config reset")
        }
    }
}()
```

- `Subscribe` は粗い粒度のイベント（`EventChange`、`EventDelete`、`EventReset`）を返すチャネルです。
- 通知には変更された key/value 自体は含まれません。現在状態を確認するには `Get`、`Map`、`Keys` を使います。
- リモート側の複数更新が 1 つの通知にまとめられることがあります。これにより、マップが高頻度更新されても通知トラフィックは小さく保たれます。

### 整合性と故障時の挙動

- **原子的更新**: すべての書き込み（`Set`、`Inc`、`Append*`、`Delete`、`Reset`、`TestAnd*`）は Lua スクリプトで実行され、ハッシュ更新と通知 publish が 1 ステップで行われます。
  - 読み手は「通知のないハッシュ変更」や「ハッシュ変更のない通知」を見ることはありません（逆も同様）。
- **参加時の整合性**: 参加時には
  - updates チャネルを購読してから、
  - `HGETALL` でスナップショット（ハッシュ内容）をロードします。
  pub/sub とスナップショットの両方で更新が見える小さな窓はありますが、更新は冪等であり最終状態は同じになります。
- **Redis 切断**: pub/sub 接続が落ちると、バックグラウンドの `run` ゴルーチンがエラーをログし、再購読を繰り返し試みます。
  - 切断中はローカルキャッシュにリモート更新が流れませんが、読み取りには使えます。
  - 再接続後は Redis からの新しい更新が再び流れ始めます。書き込みでは常に Redis を正とみなします。
- **プロセスクラッシュ**: `Map` を使うプロセスが落ちても、権威ある内容は Redis に残るため他ノードには影響しません。
  - 新しいプロセスが `rmap.New` で再参加すれば、Redis からローカルキャッシュを再構築できます。
- **Redis の永続性**: ワーカープール同様、永続性は Redis の設定に依存します。
  - AOF/スナップショット、またはレプリケーションされたクラスタ構成なら、マップ内容はプロセス/ノード障害を超えて残ります。
  - Redis がデータを失うと、すべてのマップは実質的にリセットされ、次回 join では空のマップになります。

### ユースケース

- **Feature Flag**: 設定変更をフリート全体へ即時に配布します。
- **レート制限**: インスタンス間でカウンタを共有し、グローバルな制限を実施します。
- **セッション/コントロールプレーン状態**: アクティブノードやワーカーメタデータのような「小さく、頻繁に読まれる状態」をサービス間で同期します。

### 主な設定オプション

**Maps（`rmap.New`）**

| オプション | 説明 |
|-----------|------|
| `rmap.WithLogger(logger)` | レプリケートマップ内部と Redis 操作にロガーを付与します。 |

API 全体は [`rmap` パッケージ docs](https://pkg.go.dev/goa.design/pulse/rmap) を参照してください。

---

## ストリーミング

`streaming` パッケージは、Redis Streams を使ってマイクロサービス間のイベントルーティングを提供します。

### アーキテクチャ

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="イベントプロデューサ、ストリーム、コンシューマを含む Pulse ストリーミングのアーキテクチャ" class="img-fluid" >}}

### ストリームの作成

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/streaming"
)

func main() {
    // Connect to Redis
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    
    // Create a stream
    stream, err := streaming.NewStream(ctx, "events", rdb,
        streaming.WithStreamMaxLen(10000),
    )
    if err != nil {
        log.Fatal(err)
    }
}
```

### イベントの publish

```go
type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

// Add strongly-typed event to the stream (payload is JSON-encoded)
payload, err := json.Marshal(UserCreatedEvent{
    UserID: "123",
    Email:  "user@example.com",
})
if err != nil {
    log.Fatal(err)
}

eventID, err := stream.Add(ctx, "user.created", payload)
if err != nil {
    log.Fatal(err)
}
```

### イベントの consume

```go
// Create a reader
reader, err := stream.NewReader(ctx, "my-consumer-group",
    streaming.WithReaderBlockDuration(time.Second),
)
if err != nil {
    log.Fatal(err)
}

// Read events
for {
    events, err := reader.Read(ctx)
    if err != nil {
        log.Error(err)
        continue
    }
    
    for _, event := range events {
        if err := processEvent(event); err != nil {
            log.Error(err)
            continue
        }
        reader.Ack(ctx, event.ID)
    }
}
```

### Fan-Out パターン

複数の consumer group が全イベントを受け取ります:

```go
// Service A - analytics
analyticsReader, _ := stream.NewReader(ctx, "analytics-group")

// Service B - notifications  
notifyReader, _ := stream.NewReader(ctx, "notify-group")

// Both receive all events independently
```

### Fan-In パターン

複数ストリームのイベントを集約します:

```go
// Create readers for multiple streams
ordersReader, _ := ordersStream.NewReader(ctx, "aggregator")
paymentsReader, _ := paymentsStream.NewReader(ctx, "aggregator")

// Process events from both
go processStream(ordersReader)
go processStream(paymentsReader)
```

### Reader と Sink の違い

Pulse はストリーム消費に 2 つの方法を提供します:

- **Reader**: 各 reader は独自のカーソルを持ち、ストリーム中の **すべてのイベント** を見ます。分析、投影（projection）、デバッグ、fan-out 形式の処理に適しています。
- **Sink**: 同じ名前の sink インスタンスは **consumer-group のカーソル** を共有します。各イベントは **1 つ** の sink consumer に配信され、at-least-once のワークキューセマンティクスを提供します。

|                | Reader                                         | Sink                                                        |
|----------------|------------------------------------------------|-------------------------------------------------------------|
| カーソル        | reader ごとに独立                              | sink 名ごとに共有（consumer group）                         |
| 配信            | すべての reader がすべてのイベントを見る        | 各イベントは 1 つの sink consumer に割り当てられる           |
| ack            | 任意（読み取りを止めればよい）                  | 明示的 `Ack`（`WithSinkNoAck` を使う場合を除く）             |
| 典型用途        | 投影、分析、デバッグ、リプレイ                  | バックグラウンド処理、並列ワーカー、タスク分配               |

### 主な設定オプション

**Streams（`streaming.NewStream`）**

| オプション | 説明 |
|-----------|------|
| `streaming.WithStreamMaxLen(n)` | ストリームごとに保持するイベント数を上限設定し、古いイベントをトリムします。 |
| `streaming.WithStreamLogger(logger)` | ストリーム内部、reader、sink にロガーを注入します。 |

**Readers（`stream.NewReader`）**

| オプション | 説明 |
|-----------|------|
| `options.WithReaderBlockDuration(d)` | `Read` がイベントを待つ時間を制御します。 |
| `options.WithReaderStartAtOldest()` | 新規イベントのみではなく、最古のイベントから開始します。 |
| `options.WithReaderTopic(topic)` / `WithReaderTopicPattern(re)` | クライアント側で topic または topic 正規表現によりフィルタします。 |

**Sinks（`stream.NewSink`）**

| オプション | 説明 |
|-----------|------|
| `options.WithSinkBlockDuration(d)` | sink がワークを待つブロック時間を制御します。 |
| `options.WithSinkAckGracePeriod(d)` | consumer が ack するまでの猶予。超過するとイベントは再び利用可能になります。 |
| `options.WithSinkNoAck()` | ack を完全に無効化します（fire-and-forget）。 |

**Event options（`stream.Add`）**

| オプション | 説明 |
|-----------|------|
| `options.WithTopic(topic)` | イベントに topic を付与し、reader/sink がフィルタできるようにします。 |
| `options.WithOnlyIfStreamExists()` | ストリームが存在する場合のみ追加します（自動作成しません）。 |

reader/sink/stream のオプション一覧は
[`goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options)
を参照してください。

---

## ワーカープール

`pool` パッケージは、ジョブディスパッチをコンシステントハッシュでルーティングする専用ワーカープールを実装します。

### アーキテクチャ

{{< figure src="/images/diagrams/PulsePool.svg" alt="ジョブディスパッチの流れを示す Pulse ワーカープールのアーキテクチャ" class="img-fluid" >}}

ジョブはキーに基づきコンシステントハッシュでワーカーへルーティングされます。これにより:

- 同じキーのジョブは同じワーカーへ向かう
- 負荷がワーカー間で均等に分散される
- ワーカー障害時に自動でリバランスされる

### 故障時の挙動と永続性

Pulse のワーカープールは **at-least-once** 配信を前提に設計されています。ジョブはリトライされ得ますが、Redis が状態を永続化している限り、黙って落とされることはありません。

**ワーカープロセスクラッシュ**

- 各ワーカーは、レプリケートマップに keep-alive タイムスタンプを定期更新します。
- ノード上のバックグラウンド cleanup ゴルーチンがこのマップを定期走査し:
  - `workerTTL` 以内にタイムスタンプ更新がないワーカーを inactive としてマークします。
  - inactive ワーカーが所有していたジョブはすべて再キューされ、通常ディスパッチと同じコンシステントハッシュルーティングで再割り当てされます。
- 結果: ワーカーがジョブ途中で落ちても、そのジョブはいずれ他のアクティブワーカーで再実行されます。

**ノードクラッシュ（プロセス/ホスト）**

- ジョブ状態（ジョブキー、ペイロード、ワーカー割り当て、保留中のディスパッチ情報）はメモリではなく Redis のレプリケートマップとストリームに存在します。
- ノードが消えると:
  - 他ノードがノード keep-alive マップから不在を検知します。
  - ノード固有のストリームはガーベジコレクトされます。
  - そのノード上のワーカーに割り当てられていたジョブは再キューされ、残りノードへ再分配されます。
- `Close` と `Shutdown` は次を区別します:
  - **Close**: このノードのジョブを再キューし、他ノードが処理を継続できるようにします。
  - **Shutdown**: ノード間で協調して全体停止し、再キューせずにジョブを drain します。

**ディスパッチ失敗とリトライ**

- `DispatchJob` はプールストリームに start-job イベントを書き込み、次を待ちます:
  - ワーカーからの ack（`Start` の成功/失敗）または
  - 同じキーのジョブが既に存在することの検知
- 別途、保留ジョブマップとタイムスタンプベース TTL により、複数ノードが同じジョブキーを競合 enqueue した場合の重複ディスパッチを防ぎます。
- 設定した猶予時間内にワーカーがジョブ開始を ack しない場合、そのディスパッチは cleanup ロジックによりリトライ対象となります。

**ワーカー参加/離脱時のリバランス**

- プールはアクティブワーカーのレプリケートマップを維持します。
- ワーカーが追加/削除されると:
  - ノードがワーカーマップの変化を検知し、各ワーカーへジョブのリバランスを依頼します。
  - コンシステントハッシュのバケットが別ワーカーに移るジョブは停止され、再キューされて新しいターゲットへ拾われます。
- これにより、キーに基づくルーティング契約を守りつつ、現状のワーカー集合に整合した割り当てを維持します。

**Redis の永続性**

- Pulse は永続性を Redis に依存します。Redis が永続化（AOF/スナップショット、またはレプリケーションされたクラスタ）されていれば、ジョブはプロセス/ノード障害を超えて残ります。
- Redis がデータを失うと、Pulse はジョブやワーカーメタデータを復元できません。その場合、プールはクリーンスレートで開始されます。

実運用では、これは次を意味します:

- 永続化された Redis の下で `DispatchJob` が受理したジョブは、成功するか、失敗が明示的に返るか、ワーカーが処理可能になるまでリトライされます。
- 主なトレードオフは at-least-once セマンティクスであり、ハンドラは冪等である必要があります（リトライやリバランスにより同じジョブが複数回実行され得ます）。

### プールの作成

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/pool"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // Create a pool node that can run workers
    node, err := pool.AddNode(ctx, "my-pool", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)
}
```

### ジョブのディスパッチ

```go
type EmailJob struct {
    Email string `json:"email"`
}

// Producer node (often created with pool.WithClientOnly)
payload, err := json.Marshal(EmailJob{
    Email: "user@example.com",
})
if err != nil {
    log.Fatal(err)
}

// Dispatch job with key (determines which worker handles it)
if err := node.DispatchJob(ctx, "user:123", payload); err != nil {
    log.Fatal(err)
}
```

### ジョブ処理

```go
// Worker implementation: decode strongly-typed jobs from []byte payloads.
type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var payload EmailJob
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    return sendEmail(payload.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    // Optional: clean up resources for the given job key.
    return nil
}

// Attach the handler to a worker in the pool.
_, err := node.AddWorker(ctx, &EmailJobHandler{})
if err != nil {
    log.Fatal(err)
}
```

### Sink（Consumer Group）

Pulse の sink は streaming パッケージ上に構築され、pool の内部でも使われます。同じプール名に参加する複数 pool ノードは作業を共有します:

```go
// Two nodes participating in the same pool
node1, _ := pool.AddNode(ctx, "email-pool", rdb)
node2, _ := pool.AddNode(ctx, "email-pool", rdb)

// Jobs dispatched to "email-pool" are distributed across all active workers.
```

### 主な設定オプション

**Pool nodes（`pool.AddNode`）**

| オプション | 説明 |
|-----------|------|
| `pool.WithWorkerTTL(d)` | 死亡ワーカー検知の積極度。低いほど failover は速く、高いほどハートビートが少なくなります。 |
| `pool.WithMaxQueuedJobs(n)` | 進行中のキュー済みジョブに対するグローバル上限。超過時は新しい `DispatchJob` が fail-fast します。 |
| `pool.WithAckGracePeriod(d)` | ワーカーがジョブ開始を ack するまで待つ時間。超過すると再割り当て可能になります。 |
| `pool.WithClientOnly()` | ジョブをディスパッチするだけのノードを作成します（バックグラウンドルーティングやワーカー無し）。 |
| `pool.WithLogger(logger)` | pool 内部全体に構造化ロガーを付与します。 |

さらに高度なチューニング（shutdown TTL、sink block duration 等）は
[pool パッケージ docs](https://pkg.go.dev/goa.design/pulse/pool) を参照してください。

---

## インフラ構成

### Redis 要件

Pulse は Streams 対応のため Redis 5.0+ を必要とします。本番では:

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### Redis クラスタ

高可用性のためには Redis Cluster を使います:

```go
rdb := redis.NewClusterClient(&redis.ClusterOptions{
    Addrs: []string{
        "redis-1:6379",
        "redis-2:6379",
        "redis-3:6379",
    },
})
```

---

## パターン

### Event Sourcing

```go
// Append events to a stream
stream.Add(ctx, "order.created", orderCreatedEvent)
stream.Add(ctx, "order.paid", orderPaidEvent)
stream.Add(ctx, "order.shipped", orderShippedEvent)

// Replay events to rebuild state
reader, _ := stream.NewReader(ctx, "replay", streaming.WithStartID("0"))
for {
    events, _ := reader.Read(ctx)
    for _, e := range events {
        applyEvent(state, e)
    }
}
```

### 非同期タスク処理

```go
// Task payload type used on both producer and worker sides.
type ImageTask struct {
    URL string `json:"url"`
}

// Producer: queue tasks into the pool with a strongly-typed payload.
payload, err := json.Marshal(ImageTask{URL: imageURL})
if err != nil {
    log.Fatal(err)
}
if err := node.DispatchJob(ctx, taskID, payload); err != nil {
    log.Fatal(err)
}

// Worker: process tasks in a JobHandler.
type ImageTaskHandler struct{}

func (h *ImageTaskHandler) Start(job *pool.Job) error {
    var task ImageTask
    if err := json.Unmarshal(job.Payload, &task); err != nil {
        return err
    }
    return processImage(task.URL)
}

func (h *ImageTaskHandler) Stop(key string) error {
    return nil
}
```

---

## 完全な例: ユーザーサインアップフロー

以下は、ストリーム、ワーカープール、レプリケートマップを組み合わせて、メール確認と Feature Flag を含むユーザーサインアップフローを実装する際のスケッチです:

```go
type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

type EmailJob struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    // 1. Shared feature flags / config across services.
    flags, err := rmap.New(ctx, "feature-flags", rdb, rmap.WithLogger(pulse.ClueLogger(ctx)))
    if err != nil {
        log.Fatal(err)
    }
    defer flags.Close()

    // 2. Stream for user lifecycle events.
    userStream, err := streaming.NewStream("users", rdb,
        streaming.WithStreamMaxLen(10_000),
        streaming.WithStreamLogger(pulse.ClueLogger(ctx)),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer userStream.Destroy(ctx)

    // 3. Worker pool for sending emails.
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)

    // 4. Attach a worker that reads jobs from the pool.
    _, err = node.AddWorker(ctx, &EmailJobHandler{})
    if err != nil {
        log.Fatal(err)
    }

    // 5. On user signup, publish an event and dispatch a job.
    created := UserCreatedEvent{
        UserID: "123",
        Email:  "user@example.com",
    }
    payload, _ := json.Marshal(created)
    if _, err := userStream.Add(ctx, "user.created", payload); err != nil {
        log.Fatal(err)
    }

    jobPayload, _ := json.Marshal(EmailJob{
        UserID: created.UserID,
        Email:  created.Email,
    })
    if err := node.DispatchJob(ctx, "email:"+created.UserID, jobPayload); err != nil {
        log.Fatal(err)
    }
}

type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var j EmailJob
    if err := json.Unmarshal(job.Payload, &j); err != nil {
        return err
    }
    // Optionally read feature flags from rmap here before sending.
    return sendWelcomeEmail(j.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}
```

このパターンは自然にスケールします。メールワーカーを増やしたり、`users` ストリームの別コンシューマ（分析、監査など）を追加したり、レプリケートマップでコントロールプレーン状態を共有したりできます。

---

## 本番運用での考慮点

- **Redis のサイジングと永続性**: Redis 5+ を使い、ワークロードに対してストリームデータやレプリケートマップがどれだけ重要かに応じて永続化（AOF またはスナップショット）を適切に設定してください。
- **ストリームのトリミング**: `WithStreamMaxLen` はリプレイの必要量（event sourcing、デバッグ）を満たすだけ大きくしつつ、無制限増加を避けるだけ小さくします。トリミングが近似であることも考慮してください。
- **at-least-once セマンティクス**: ストリームと sink は at-least-once です。ハンドラは冪等で、リトライ安全に設計してください。
- **ワーカー TTL とシャットダウン**: `WithWorkerTTL` と `WithWorkerShutdownTTL` は、障害検知の速さとシャットダウン時の drain に必要な時間に応じて調整してください。
- **保留/詰まりジョブ**: `WithAckGracePeriod` と pool 内部の保留ジョブ追跡により、ジョブが永遠に詰まることは防げますが、繰り返し開始に失敗するジョブの監視は必要です。
- **可観測性**: `pulse.ClueLogger` または独自の構造化ロガーを `WithStreamLogger`、`WithLogger`、`rmap.WithLogger` で渡し、本番でイベントとジョブのライフサイクルを追跡できるようにしてください。
- **バックプレッシャとキュー上限**: `WithMaxQueuedJobs`、`WithReaderMaxPolled`、`WithSinkMaxPolled` を使ってメモリ使用量を境界づけ、過負荷時のバックプレッシャを明示化してください。
- **高可用性**: 重要システムでは Redis を cluster または sentinel モードで運用し、複数の pool ノードを動かしてワーカーをクリーンに failover できるようにしてください。

---

## トラブルシューティング

- **Redis に接続できない**: `redis.NewClient` / `redis.NewClusterClient` が使うアドレス、パスワード、TLS 設定を確認してください。Pulse はこれらの接続エラーをそのまま返します。
- **イベントが届かない**: reader/sink が正しいストリーム名、開始位置（`WithReaderStart*` / `WithSinkStart*`）、topic/topic pattern を使っているか確認してください。また `BlockDuration` が誤って `0` になっていないかも確認します。
- **イベントが欠落しているように見える**: `WithStreamMaxLen` が小さすぎると古いイベントがトリムされます。最大長を増やすか、重要イベントは別の場所へ永続化してください。
- **ジョブが拾われない**: 少なくとも 1 つの client-only ではないノードが、アクティブワーカー（`AddWorker`）付きで動作していること、また `WithMaxQueuedJobs` を超過していないことを確認してください。
- **ジョブがリトライされ続ける/ワーカー間を移動し続ける**: 多くの場合、ワーカーが開始 ack に失敗しているか、処理中にクラッシュしています。ジョブハンドラのログを確認し、`WithAckGracePeriod` の増加や非冪等ハンドラの修正を検討してください。
- **ワーカー負荷が偏る**: Jump consistent hashing は通常キーをよく分散しますが、ほとんどのジョブが同じキーなら偏ります。キー空間のシャーディングや別のキー戦略を検討してください。
- **シャットダウンがハングする**: `Close` や pool の shutdown が長すぎる場合、`WithWorkerShutdownTTL` を見直し、ワーカーの `Stop` 実装が作業が遅い/外部サービスが落ちている場合でも速やかに戻ることを確認してください。

### 分散キャッシュ

```go
// Cache with replicated map
cache, _ := rmap.New(ctx, "cache", rdb)

func GetUser(ctx context.Context, id string) (*User, error) {
    // Check cache
    if data, err := cache.Get(ctx, "user:"+id); err == nil {
        return unmarshalUser(data)
    }
    
    // Fetch from database
    user, err := db.GetUser(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Update cache (propagates to all nodes)
    cache.Set(ctx, "user:"+id, marshalUser(user))
    return user, nil
}
```

---

## 参考

- [Pulse GitHub Repository](https://github.com/goadesign/pulse) — ソースコードと例
- [Redis Streams Documentation](https://redis.io/docs/data-types/streams/) — Redis Streams の概念


