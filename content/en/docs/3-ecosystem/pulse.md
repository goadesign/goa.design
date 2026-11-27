---
title: "Pulse"
weight: 2
description: "Redis-backed event streams, consistent-hash worker pools, and replicated in-memory maps for Go services."
llm_optimized: true
---

Pulse provides three focused Go packages for distributed coordination on top of Redis (`*redis.Client`), without introducing a separate message broker. It works standalone in any Go binary or alongside Goa and Goa-AI services.

## Overview

| Package | Primary Type | Use Case |
|---------|--------------|----------|
| `goa.design/pulse/streaming` | `streaming.Stream`, `Reader`, `Sink` | Event streams, independent fan-out, consumer-group queues |
| `goa.design/pulse/pool` | `pool.Node`, `pool.Worker` | Key-hashed background jobs with automatic dead-worker failover |
| `goa.design/pulse/rmap` | `rmap.Map` | Replicated, locally cached key-value state across service replicas |

## Installation

```bash
go get goa.design/pulse@latest
```

---

## Replicated Maps (`rmap`)

`rmap` maintains an eventually consistent, read-local key-value map across nodes using a Redis hash (`map:<name>:content`), atomic Lua write scripts, and a Redis pub/sub update channel (`map:<name>:updates`).

### Architecture

{{< figure src="/images/diagrams/PulseRmap.svg" alt="Pulse replicated map architecture showing distributed state synchronization" class="img-fluid" >}}

- **Authoritative store**: Redis hash `map:<name>:content` stores canonical key-value entries.
- **Atomic writes**: Every mutation (`Set`, `Inc`, `AppendValues`, `TestAndSet`, `Delete`, `Reset`) runs in a single Redis Lua script that updates the hash and publishes a compact binary notification on `map:<name>:updates`.
- **Zero-network reads**: Each joined process keeps an in-memory copy updated from pub/sub, so `Get`, `Keys`, and `Map` read local memory without round-tripping to Redis.

### Joining, Reading, and Writing

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

### Watching Change Notifications

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

`Subscribe` emits coarse-grained `EventKind` notifications (`EventChange`, `EventDelete`, `EventReset`) and coalesces rapid bursts so high-write maps never flood readers; inspect `m.Get`, `m.Map()`, or `m.Keys()` on wake.

### Consistency and Failure Modes

- **Join order**: `rmap.Join` subscribes to `map:<name>:updates` *before* running `HGETALL`, so no mutation between snapshot and subscription can be missed.
- **Disconnects & crashes**: If Redis pub/sub drops, the background loop retries resubscription automatically while local reads continue serving the last cached snapshot. If a process crashes, Redis retains canonical state and restarting processes call `rmap.Join` to rehydrate.
- **Options**: Pass `rmap.WithLogger(pulse.ClueLogger(ctx))` (from `goa.design/pulse/pulse`) to attach structured logging. See [`pkg.go.dev/goa.design/pulse/rmap`](https://pkg.go.dev/goa.design/pulse/rmap).

---

## Streaming (`streaming`)

`streaming` routes typed events across microservices over Redis Streams, supporting both independent fan-out cursors (`Reader`) and shared consumer-group work queues (`Sink`).

### Architecture

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="Pulse streaming architecture showing event producer, streams, and consumer" class="img-fluid" >}}

### Stream Retention Defaults (`1,000` Events)

By default, `streaming.NewStream` retains the **most recent `1,000` events** using exact `MAXLEN =` trimming on Redis Streams:
- Pass `options.WithStreamMaxLen(n)` (from `goa.design/pulse/streaming/options`) to raise or lower the retained event cap.
- Pass `options.WithUnboundedStream()` when unconsumed work items must never be trimmed automatically, and call `stream.Remove(ctx, event.ID)` once each item is settled.

### Creating Streams and Publishing Events

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

### Consuming Events: `Sink` vs `Reader`

Both `Sink` and `Reader` deliver events over a Go channel returned by `Subscribe() <-chan *streaming.Event`:

| | `Reader` (`stream.NewReader`) | `Sink` (`stream.NewSink`) |
|---|---|---|
| **Cursor** | Independent per `Reader` instance (no group name) | Shared across all `Sink` instances with the same `name` |
| **Delivery** | Every `Reader` sees **every** event | Each event is delivered to **one** `Sink` consumer |
| **Ack** | None (`reader.Close()` stops reading) | Explicit `sink.Ack(ctx, event)` (unless `WithSinkNoAck()`) |
| **Best for** | Live projections, cache invalidation, audit/replay | At-least-once background queues, parallel workers |

**Shared consumer-group `Sink` (at-least-once work queue):**

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

**Independent `Reader` (fan-out, replay from oldest, and multi-stream fan-in):**

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

### Key Streaming Options (`goa.design/pulse/streaming/options`)

| Option | Target | Description |
|--------|--------|-------------|
| `options.WithStreamMaxLen(n)` | `NewStream` | Exact `MAXLEN =` event cap per stream (default: `1,000`). |
| `options.WithUnboundedStream()` | `NewStream` | Disable `MAXLEN` trimming; pair with `stream.Remove(ctx, ids...)`. |
| `options.WithStreamLogger(logger)` | `NewStream` | Attach structured logger (`pulse.ClueLogger(ctx)`). |
| `options.WithReaderStartAtOldest()` | `NewReader` | Replay from the oldest retained stream entry instead of newest. |
| `options.WithReaderTopic(t)` / `WithReaderTopicPattern(re)` | `NewReader` | Filter delivered events by exact topic or regular expression. |
| `options.WithSinkAckGracePeriod(d)` | `NewSink` | Lease window before an unacknowledged event is reclaimed by another consumer. |
| `options.WithSinkMaxPolled(n)` / `WithReaderMaxPolled(n)` | `NewSink` / `NewReader` | Max events fetched per Redis poll batch. |
| `options.WithTopic(topic)` / `WithOnlyIfStreamExists()` | `stream.Add` | Tag published event with a topic, or skip auto-creating missing streams. |

See [`pkg.go.dev/goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options) for the full option set.

---

## Worker Pools (`pool`)

`pool` dispatches keyed jobs across a fleet of worker processes using jump consistent hashing so jobs with the same key route to the same worker, rebalancing automatically when workers join, leave, or stop heartbeating.

### Architecture

{{< figure src="/images/diagrams/PulsePool.svg" alt="Pulse worker pool architecture showing job dispatch flow" class="img-fluid" >}}

### Creating a Pool Node, Adding Workers, and Dispatching Jobs

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

### Delivery Semantics and Failover

- **At-least-once execution**: Workers heartbeat into an `rmap`; if a worker misses `WithWorkerTTL`, peer nodes requeue its active jobs onto surviving consistent-hash owners. Keep `Start` handlers idempotent.
- **`Close` vs `Shutdown`**: `node.Close(ctx)` requeues this node's jobs onto remaining nodes during a rolling deploy; `node.Shutdown(ctx)` coordinates a fleet-wide stop without requeueing.
- **Backpressure**: `pool.WithMaxQueuedJobs(n)` bounds queued dispatches so overloaded pools fail fast rather than growing unbounded in Redis.

---

## Complete Example: User Signup Flow

Combining `rmap`, `streaming`, and `pool` in one service:

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

## Redis Setup and Production Checklist

- **Client type & persistence**: Pulse constructors (`rmap.Join`, `streaming.NewStream`, `pool.AddNode`) accept `*redis.Client` against Redis 5.0+ or Valkey (standalone, primary-replica with Redis Sentinel via `redis.NewFailoverClient`, or managed Redis endpoints with AOF persistence enabled). `*redis.ClusterClient` is not supported because Lua scripts touch map/stream keys directly.
- **Exact stream trimming**: `NewStream` trims at `1,000` events by default using exact `MAXLEN =`. Size `options.WithStreamMaxLen(n)` for your replay window, or use `options.WithUnboundedStream()` + explicit `stream.Remove(ctx, id)` when every queued item must be processed before deletion.
- **Idempotent handlers**: Both `Sink` consumers and `pool` workers deliver at-least-once across crashes and rebalances; guard external side effects with idempotency keys.

## See Also

- [Pulse GitHub Repository](https://github.com/goadesign/pulse) — Source code and tests
- [Chorus Architecture](../chorus/#architecture) — Production example combining `pulse/rmap`, `pulse/streaming`, and `pulse/semaphore`
