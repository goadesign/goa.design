---
title: "Pulse"
weight: 2
description: "Go サービス向けの Redis ベースイベントストリーム、コンシステントハッシュ・ワーカープール、レプリケートされたインメモリマップ。"
llm_optimized: true
---

Pulse は、別途メッセージブローカーを導入することなく、Redis（`*redis.Client`）上で分散協調を実現する 3 つの Go パッケージを提供します。任意の Go バイナリで単体利用できるほか、Goa や Goa-AI サービスとも自然に組み合わせられます。

## 概要

| パッケージ | 主な型 | ユースケース |
|---------|--------------|----------|
| `goa.design/pulse/streaming` | `streaming.Stream`, `Reader`, `Sink` | イベントストリーム、独立ファンアウト、コンシューマーグループキュー |
| `goa.design/pulse/pool` | `pool.Node`, `pool.Worker` | 停止ワーカーの自動フェイルオーバーを備えたキーハッシュ型バックグラウンドジョブ |
| `goa.design/pulse/rmap` | `rmap.Map` | サービスレプリカ間でローカルキャッシュ・同期されるレプリケート型キーバリュー状態 |

## インストール

```bash
go get goa.design/pulse@latest
```

---

## レプリケートマップ（`rmap`）

`rmap` は、Redis ハッシュ（`map:<name>:content`）、原子的な Lua 書き込みスクリプト、および Redis pub/sub 更新チャネル（`map:<name>:updates`）を用いて、ノード間で結果整合性を持つローカル読み取り型のキーバリューマップを維持します。

### アーキテクチャ

{{< figure src="/images/diagrams/PulseRmap.svg" alt="分散状態同期を行う Pulse レプリケートマップのアーキテクチャ" class="img-fluid" >}}

- **正規ストア**：Redis ハッシュ `map:<name>:content` が正規のキーバリューエントリを保持します。
- **原子的書き込み**：すべての変更操作（`Set`、`Inc`、`AppendValues`、`TestAndSet`、`Delete`、`Reset`）は単一の Redis Lua スクリプト内で実行され、ハッシュの更新と `map:<name>:updates` へのコンパクトなバイナリ通知の publish を不可分に行います。
- **ネットワーク往復ゼロの読み取り**：参加中の各プロセスは pub/sub から更新されるインメモリコピーを保持するため、`Get`、`Keys`、`Map` は Redis へ通信せずにローカルメモリから直接読み取ります。

### 参加・読み取り・書き込み

```go
package main

import (
    "context"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    // Join loads a snapshot from Redis and subscribes to live updates
    m, err := rmap.Join(ctx, "config", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer m.Close()

    // Mutate state atomically in Redis (propagates to all joined nodes)
    if _, err := m.Set(ctx, "feature.enabled", "true"); err != nil {
        log.Fatal(err)
    }
    _, _ = m.Inc(ctx, "requests.total", 1)
    _, _ = m.AppendValues(ctx, "allowed.regions", "us-east-1", "eu-west-1")
    _, _ = m.TestAndSet(ctx, "config.version", "v1", "v2")

    // Read directly from the local in-memory cache
    if value, ok := m.Get("feature.enabled"); ok {
        log.Printf("feature.enabled = %s (keys: %v)", value, m.Keys())
    }
}
```

### 変更通知の購読

```go
changes := m.Subscribe()
defer m.Unsubscribe(changes)

go func() {
    for kind := range changes {
        switch kind {
        case rmap.EventChange:
            log.Printf("config updated: %v", m.Map())
        case rmap.EventDelete:
            log.Println("config key deleted")
        case rmap.EventReset:
            log.Println("config reset")
        }
    }
}()
```

`Subscribe` は粗粒度の `EventKind` 通知（`EventChange`、`EventDelete`、`EventReset`）を配信し、書き込みバーストを自動的にまとめるため、高頻度に更新されるマップでもリーダーが通知で溢れることはありません。起床時に `m.Get`、`m.Map()`、`m.Keys()` で最新状態を参照してください。

### 整合性と障害時の挙動

- **参加順序**：`rmap.Join` は `HGETALL` を実行する*前*に `map:<name>:updates` を購読するため、スナップショット取得と購読開始の間の変更を取りこぼしません。
- **切断とクラッシュ**：Redis pub/sub 接続が切れた場合、ローカル読み取りは直近のキャッシュスナップショットを返し続け、バックグラウンドループが自動で再購読を試みます。プロセスがクラッシュしても正規の状態は Redis に残り、再起動プロセスは `rmap.Join` で復元できます。
- **オプション**：構造化ロガーを付与するには `rmap.WithLogger(pulse.ClueLogger(ctx))`（`goa.design/pulse/pulse`）を渡します。詳細は [`pkg.go.dev/goa.design/pulse/rmap`](https://pkg.go.dev/goa.design/pulse/rmap) を参照してください。

---

## ストリーミング（`streaming`）

`streaming` は Redis Streams 上でマイクロサービス間の型付きイベントをルーティングし、独立したファンアウトカーソル（`Reader`）と共有コンシューマーグループのワークキュー（`Sink`）の両方をサポートします。

### アーキテクチャ

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="イベントプロデューサー、ストリーム、コンシューマーを示す Pulse ストリーミングのアーキテクチャ" class="img-fluid" >}}

### ストリーム保持件数のデフォルト（`1,000` 件）

デフォルトでは、`streaming.NewStream` は Redis Streams の厳密な `MAXLEN =` トリミングを使って**直近 `1,000` 件のイベント**を保持します：
- 保持イベント数の上限を増減するには、`options.WithStreamMaxLen(n)`（`goa.design/pulse/streaming/options`）を渡します。
- 未処理のワークアイテムを自動トリムさせたくない場合は `options.WithUnboundedStream()` を渡し、各アイテムの処理完了後に `stream.Remove(ctx, event.ID)` を呼び出してください。

### ストリームの作成とイベントの発行

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/pulse/streaming"
    "goa.design/pulse/streaming/options"
)

type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func publishSignup(ctx context.Context, rdb *redis.Client) error {
    stream, err := streaming.NewStream("users", rdb,
        options.WithStreamMaxLen(10_000),
    )
    if err != nil {
        return err
    }

    payload, err := json.Marshal(UserCreatedEvent{
        UserID: "123",
        Email:  "user@example.com",
    })
    if err != nil {
        return err
    }

    eventID, err := stream.Add(ctx, "user.created", payload)
    if err != nil {
        return err
    }
    log.Printf("published user.created as %s", eventID)
    return nil
}
```

### イベントの消費：`Sink` と `Reader` の使い分け

`Sink` と `Reader` はどちらも `Subscribe() <-chan *streaming.Event` が返す Go チャネル経由でイベントを配信します：

| | `Reader`（`stream.NewReader`） | `Sink`（`stream.NewSink`） |
|---|---|---|
| **カーソル** | `Reader` インスタンスごとに独立（グループ名なし） | 同じ `name` を持つすべての `Sink` インスタンス間で共有 |
| **配信方式** | すべての `Reader` が**全イベント**を受信 | 各イベントは **1 つ**の `Sink` コンシューマーにのみ配信 |
| **Ack** | 不要（`reader.Close()` で読み取り停止） | 明示的な `sink.Ack(ctx, event)`（`WithSinkNoAck()` 指定時を除く） |
| **主な用途** | ライブ投影、キャッシュ無効化、監査・リプレイ | at-least-once のバックグラウンドキュー、並列ワーカー |

**共有コンシューマーグループ `Sink`（at-least-once ワークキュー）：**

```go
sink, err := stream.NewSink(ctx, "billing-workers",
    options.WithSinkBlockDuration(time.Second),
)
if err != nil {
    log.Fatal(err)
}
defer sink.Close(ctx)

for event := range sink.Subscribe() {
    if err := processBilling(event); err != nil {
        log.Printf("billing failed for %s (will retry after ack grace period): %v", event.ID, err)
        continue
    }
    if err := sink.Ack(ctx, event); err != nil {
        log.Printf("ack failed: %v", err)
    }
}
```

**独立した `Reader`（ファンアウト、最古エントリからのリプレイ、複数ストリームのファンイン）：**

```go
// Replay from the oldest retained event in ordersStream, and fan in paymentsStream
reader, err := ordersStream.NewReader(ctx, options.WithReaderStartAtOldest())
if err != nil {
    log.Fatal(err)
}
defer reader.Close()

if err := reader.AddStream(ctx, paymentsStream); err != nil {
    log.Fatal(err)
}

for event := range reader.Subscribe() {
    applyProjection(event.StreamName, event.EventName, event.Payload)
}
```

### 主なストリーミングオプション（`goa.design/pulse/streaming/options`）

| オプション | 対象 | 説明 |
|--------|--------|-------------|
| `options.WithStreamMaxLen(n)` | `NewStream` | ストリームごとの厳密な `MAXLEN =` イベント上限（デフォルト：`1,000`）。 |
| `options.WithUnboundedStream()` | `NewStream` | `MAXLEN` トリミングを無効化。`stream.Remove(ctx, ids...)` と組み合わせて使用します。 |
| `options.WithStreamLogger(logger)` | `NewStream` | 構造化ロガー（`pulse.ClueLogger(ctx)`）を付与します。 |
| `options.WithReaderStartAtOldest()` | `NewReader` | 最新ではなく、保持されている最古のストリームエントリからリプレイします。 |
| `options.WithReaderTopic(t)` / `WithReaderTopicPattern(re)` | `NewReader` | 完全一致トピックまたは正規表現で配信イベントをフィルタします。 |
| `options.WithSinkAckGracePeriod(d)` | `NewSink` | 未 ack のイベントが別コンシューマーに再割り当てされるまでのリース猶予時間。 |
| `options.WithSinkMaxPolled(n)` / `WithReaderMaxPolled(n)` | `NewSink` / `NewReader` | Redis の 1 回のポーリングバッチで取得する最大イベント数。 |
| `options.WithTopic(topic)` / `WithOnlyIfStreamExists()` | `stream.Add` | 発行イベントにトピックを付与、または未作成ストリームの自動作成を抑止します。 |

全オプションの一覧は [`pkg.go.dev/goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options) を参照してください。

---

## ワーカープール（`pool`）

`pool` はジャンプコンシステントハッシュを使ってワーカープロセス群へキー付きジョブをディスパッチします。同じキーのジョブは常に同じワーカーへルーティングされ、ワーカーの参加・離脱・ハートビート停止時には自動的にリバランスされます。

### アーキテクチャ

{{< figure src="/images/diagrams/PulsePool.svg" alt="ジョブディスパッチの流れを示す Pulse ワーカープールのアーキテクチャ" class="img-fluid" >}}

### プールノードの作成、ワーカー追加、ジョブのディスパッチ

```go
type EmailJob struct {
    Email string `json:"email"`
}

type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var payload EmailJob
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    return sendEmail(payload.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}

func runPool(ctx context.Context, rdb *redis.Client) error {
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
        pool.WithMaxQueuedJobs(1_000),
    )
    if err != nil {
        return err
    }
    defer node.Close(ctx)

    if _, err := node.AddWorker(ctx, &EmailJobHandler{}); err != nil {
        return err
    }

    payload, err := json.Marshal(EmailJob{Email: "user@example.com"})
    if err != nil {
        return err
    }
    // Producers that only enqueue jobs can pass pool.WithClientOnly() to AddNode
    return node.DispatchJob(ctx, "user:123", payload)
}
```

### 配信セマンティクスとフェイルオーバー

- **at-least-once 実行**：各ワーカーは `rmap` 上でハートビートを更新します。ワーカーが `WithWorkerTTL` を超過すると、他ノードがその進行中ジョブを再キューイングし、生存しているコンシステントハッシュ担当ワーカーへ引き継ぎます。`Start` ハンドラーは冪等に実装してください。
- **`Close` と `Shutdown` の違い**：ローリングデプロイ時に呼ぶ `node.Close(ctx)` はそのノードのジョブを残りのノードへ再キューイングします。一方 `node.Shutdown(ctx)` は再キューイングを行わずにフリート全体を協調停止します。
- **バックプレッシャー**：`pool.WithMaxQueuedJobs(n)` でキュー待ちディスパッチ数に上限を設け、過負荷時に Redis 上で無制限に膨らむ前に即時エラー（fail fast）を返します。

---

## 完全な実装例：ユーザー登録フロー

1 つのサービス内で `rmap`、`streaming`、`pool` を組み合わせる例です：

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
    cluelog "goa.design/clue/log"
    "goa.design/pulse/pool"
    "goa.design/pulse/pulse"
    "goa.design/pulse/rmap"
    "goa.design/pulse/streaming"
    "goa.design/pulse/streaming/options"
)

type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

type EmailJob struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func main() {
    ctx := cluelog.Context(context.Background())
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    logger := pulse.ClueLogger(ctx)

    // 1. Replicated feature flags across service instances
    flags, err := rmap.Join(ctx, "feature-flags", rdb, rmap.WithLogger(logger))
    if err != nil {
        log.Fatal(err)
    }
    defer flags.Close()

    // 2. Bounded stream for user lifecycle events
    userStream, err := streaming.NewStream("users", rdb,
        options.WithStreamMaxLen(10_000),
        options.WithStreamLogger(logger),
    )
    if err != nil {
        log.Fatal(err)
    }

    // 3. Consistent-hash worker pool for welcome emails
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
        pool.WithMaxQueuedJobs(1_000),
        pool.WithLogger(logger),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)

    if _, err := node.AddWorker(ctx, &EmailJobHandler{flags: flags}); err != nil {
        log.Fatal(err)
    }

    // 4. Publish lifecycle event and dispatch keyed background job
    created := UserCreatedEvent{UserID: "123", Email: "user@example.com"}
    eventBytes, _ := json.Marshal(created)
    if _, err := userStream.Add(ctx, "user.created", eventBytes); err != nil {
        log.Fatal(err)
    }

    jobBytes, _ := json.Marshal(EmailJob(created))
    if err := node.DispatchJob(ctx, "email:"+created.UserID, jobBytes); err != nil {
        log.Fatal(err)
    }
}

type EmailJobHandler struct {
    flags *rmap.Map
}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var j EmailJob
    if err := json.Unmarshal(job.Payload, &j); err != nil {
        return err
    }
    if enabled, ok := h.flags.Get("welcome_email"); ok && enabled == "false" {
        return nil
    }
    log.Printf("sending welcome email to %s", j.Email)
    return nil
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}
```

---

## Redis 構成と本番運用チェックリスト

- **クライアント型と永続化**：Pulse の各コンストラクタ（`rmap.Join`、`streaming.NewStream`、`pool.AddNode`）は、Redis 5.0+ または Valkey（単体構成、`redis.NewFailoverClient` による Redis Sentinel プライマリ・レプリカ構成、または AOF 永続化を有効にしたマネージド Redis エンドポイント）に対する `*redis.Client` を受け取ります。Lua スクリプトがマップやストリームのキーへ直接アクセスするため、`*redis.ClusterClient` には対応していません。
- **厳密なストリームトリミング**：`NewStream` はデフォルトで厳密な `MAXLEN =` により `1,000` 件でトリムします。必要なリプレイ幅に合わせて `options.WithStreamMaxLen(n)` を設定するか、すべてのキュー項目を確実に処理してから削除したい場合は `options.WithUnboundedStream()` と明示的な `stream.Remove(ctx, id)` を組み合わせてください。
- **ハンドラーの冪等性**：`Sink` コンシューマーと `pool` ワーカーはどちらもクラッシュやリバランス時に at-least-once で再配信されるため、外部への副作用は冪等キーで保護してください。

## 関連リンク

- [Pulse GitHub リポジトリ](https://github.com/goadesign/pulse) — ソースコードとテスト
- [Chorus アーキテクチャ](../chorus/#architecture) — `pulse/rmap`、`pulse/streaming`、`pulse/semaphore` を組み合わせた本番実装例
