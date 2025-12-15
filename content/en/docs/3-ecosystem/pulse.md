---
title: "Pulse"
weight: 2
description: "Distributed event infrastructure - streaming, worker pools, and replicated maps for Go microservices."
llm_optimized: true
---

Pulse provides primitives for building event-driven distributed systems. It's transport-agnostic and works independently of Goa, though it integrates well with Goa services.

## Overview

Pulse consists of three main packages:

| Package | Purpose | Use Case |
|---------|---------|----------|
| `streaming` | Event streams | Pub/sub, fan-out, fan-in |
| `pool` | Worker pools | Background jobs, task dispatch |
| `rmap` | Replicated maps | Shared state across nodes |

All packages use Redis as the backing store for distributed coordination.

## Why Pulse?

- **Redis-native, minimal infrastructure**: Pulse runs entirely on Redis Streams and hashes, so if you already run Redis you get streaming, worker pools, and replicated state without introducing Kafka or new brokers.
- **Small, focused APIs**: `streaming.Stream`, `pool.Node`, and `rmap.Map` are tiny, composable building blocks instead of a large framework, making it easy to adopt Pulse incrementally.
- **Go-first ergonomics**: APIs are idiomatic Go (`context.Context`, `[]byte` payloads, strong typing via your own structs), with clear contracts and structured logging hooks.
- **Composability over complexity**: Use streams for events, the pool for long-running jobs, and replicated maps for shared control-plane data like feature flags or worker metadata.
- **Operationally simple**: Bounded streams, at-least-once delivery with explicit acks, and consistent hashing for job routing keep runtime behavior predictable and easy to reason about in production.

## Installation

```bash
go get goa.design/pulse/streaming
go get goa.design/pulse/pool
go get goa.design/pulse/rmap
```

---

## Replicated Maps

The `rmap` package provides an eventually-consistent, read-optimized key-value map replicated across distributed nodes, backed by Redis hashes and pub/sub channels.

### Architecture

{{< figure src="/images/diagrams/PulseRmap.svg" alt="Pulse replicated map architecture showing distributed state synchronization" class="img-fluid" >}}

At a high level:

- **Authoritative store**: Redis hash `map:<name>:content` holds the canonical map values.
- **Update channel**: Redis pub/sub `map:<name>:updates` broadcasts map mutations (`set`, `del`, `reset`).
- **Local caches**: each process maintains an in-memory copy that is kept in sync from Redis, so reads are local and fast.

### Joining and Reading

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

On join:

- `rmap.New` (via `Join`) validates the map name, loads and caches the Lua scripts used for atomic updates,
- subscribes to the `map:<name>:updates` channel, then
- reads the current content of the Redis hash and seeds the local cache.

This makes the local map **eventually consistent** with Redis and other nodes that have joined the same map.

### Writing

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

All mutating operations go through Lua scripts that:

- update the Redis hash in a single command, and
- publish a compact binary notification on the updates channel.

Because Redis runs Lua scripts atomically, each write is applied and broadcast as a single, ordered operation.

### Change Notifications

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

- `Subscribe` returns a channel of coarse-grained events (`EventChange`, `EventDelete`, `EventReset`).
- Notifications do **not** include the changed key/value; callers should use `Get`, `Map`, or `Keys` to inspect the current state.
- Multiple remote updates may be coalesced into a single notification, which keeps notification traffic small even when the map is busy.

### Consistency and Failure Modes

- **Atomic updates**: Every write (`Set`, `Inc`, `Append*`, `Delete`, `Reset`, `TestAnd*`) is performed by a Lua script that updates the hash and publishes a notification in one step.
  - Readers never see a hash change without a corresponding notification (and vice versa).
- **Join consistency**: On join, the map:
  - subscribes to the updates channel, then
  - loads the hash via `HGETALL`.
  A tiny window exists where updates may be seen both via pub/sub and the snapshot, but they are idempotent and lead to the same final state.
- **Redis disconnects**: If the pub/sub connection drops, the background `run` goroutine logs the error and repeatedly attempts to resubscribe.
  - While disconnected, the local cache stops receiving remote updates but remains usable for reads.
  - Once reconnected, new updates from Redis resume flowing; callers always treat Redis as the source of truth when writing.
- **Process crash**: If a process using `Map` exits, the authoritative content remains in Redis; other nodes are unaffected.
  - A new process can call `rmap.New` to rejoin and rebuild its local cache from Redis.
- **Redis durability**: As with worker pools, durability depends on how Redis is configured.
  - With AOF/snapshots or replicated cluster, map content survives process and node failures.
  - If Redis loses its data, all maps are effectively reset; the next join will see an empty map.

### Use Cases

- **Feature flags**: Distribute configuration changes instantly across a fleet.
- **Rate limiting**: Share counters across instances to enforce global limits.
- **Session / control-plane state**: Keep small, frequently-read state (like active nodes, worker metadata) in sync across services.

### Key Configuration Options

**Maps (`rmap.New`)**

| Option | Description |
|--------|-------------|
| `rmap.WithLogger(logger)` | Attach a logger to replicated map internals and Redis operations. |

See the [rmap package docs](https://pkg.go.dev/goa.design/pulse/rmap) for the full API surface.

---

## Streaming

The `streaming` package provides event routing across microservices using Redis Streams.

### Architecture

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="Pulse streaming architecture showing event producer, streams, and consumer" class="img-fluid" >}}

### Creating Streams

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

### Publishing Events

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

### Consuming Events

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

### Fan-Out Pattern

Multiple consumer groups receive all events:

```go
// Service A - analytics
analyticsReader, _ := stream.NewReader(ctx, "analytics-group")

// Service B - notifications  
notifyReader, _ := stream.NewReader(ctx, "notify-group")

// Both receive all events independently
```

### Fan-In Pattern

Aggregate events from multiple streams:

```go
// Create readers for multiple streams
ordersReader, _ := ordersStream.NewReader(ctx, "aggregator")
paymentsReader, _ := paymentsStream.NewReader(ctx, "aggregator")

// Process events from both
go processStream(ordersReader)
go processStream(paymentsReader)
```

### Readers vs Sinks

Pulse gives you two ways to consume streams:

- **Readers**: each reader has its own cursor and sees **every event** in the stream. They are ideal for analytics, projections, and any fan-out style processing.
- **Sinks**: all sink instances with the same name share a **consumer-group cursor**. Each event is delivered to **one** sink consumer, giving you at-least-once work-queue semantics.

|                | Readers                                        | Sinks                                                       |
|----------------|-------------------------------------------------|-------------------------------------------------------------|
| Cursor         | Independent per reader                          | Shared per sink name (consumer group)                       |
| Delivery       | Every reader sees every event                  | Each event goes to one sink consumer                        |
| Acknowledgment | Optional (just stop reading)                   | Explicit `Ack` (unless `WithSinkNoAck` is used)             |
| Typical use    | Projections, analytics, debugging, replays     | Background processing, parallel workers, task distribution  |

### Key Configuration Options

**Streams (`streaming.NewStream`)**

| Option | Description |
|--------|-------------|
| `streaming.WithStreamMaxLen(n)` | Bounds how many events are kept per stream before older events are trimmed. |
| `streaming.WithStreamLogger(logger)` | Injects a logger for stream internals, readers, and sinks. |

**Readers (`stream.NewReader`)**

| Option | Description |
|--------|-------------|
| `options.WithReaderBlockDuration(d)` | Controls how long `Read` waits for events before returning. |
| `options.WithReaderStartAtOldest()` | Start from the oldest event instead of only new ones. |
| `options.WithReaderTopic(topic)` / `WithReaderTopicPattern(re)` | Filter events by topic or topic regex on the client side. |

**Sinks (`stream.NewSink`)**

| Option | Description |
|--------|-------------|
| `options.WithSinkBlockDuration(d)` | Controls how long the sink blocks waiting for work. |
| `options.WithSinkAckGracePeriod(d)` | Time window for a consumer to ack before the event is made available again. |
| `options.WithSinkNoAck()` | Disable acknowledgements entirely (fire-and-forget consumption). |

**Event options (`stream.Add`)**

| Option | Description |
|--------|-------------|
| `options.WithTopic(topic)` | Attach a topic to the event so readers/sinks can filter on it. |
| `options.WithOnlyIfStreamExists()` | Only append the event if the stream already exists (do not auto-create). |

For the full list of reader, sink, and stream options, see the Go package docs for
[`goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options).

---

## Worker Pools

The `pool` package implements dedicated worker pools with consistent hashing for job dispatch.

### Architecture

{{< figure src="/images/diagrams/PulsePool.svg" alt="Pulse worker pool architecture showing job dispatch flow" class="img-fluid" >}}

Jobs are routed to workers based on a key using consistent hashing. This ensures:
- Jobs with the same key go to the same worker
- Load is distributed evenly across workers
- Worker failures trigger automatic rebalancing

### Failure Modes and Durability

Pulse worker pools are designed for **at-least-once** delivery: jobs may be retried, but they are not silently dropped as long as Redis persists state.

**Worker process crash**

- Each worker periodically updates a keep-alive timestamp in a replicated map.
- Background cleanup goroutines on the nodes periodically scan this map:
  - Workers that have not updated their timestamp within `workerTTL` are marked inactive.
  - All jobs owned by an inactive worker are requeued and reassigned via the same consistent-hash routing used for normal dispatch.
- Result: if a worker dies mid-job, that job will eventually be rerun on another active worker.

**Node crash (process or host)**

- Job state (job keys, job payloads, worker assignments and pending dispatch information) lives in Redis replicated maps and streams, not in memory.
- If a node disappears:
  - Other nodes detect its absence via a keep-alive map for nodes.
  - Its node-specific streams are garbage collected.
  - Jobs previously assigned to workers on that node are requeued and redistributed across remaining nodes.
- `Close` and `Shutdown` distinguish between:
  - **Close**: requeues this node’s jobs so that other nodes continue processing the pool.
  - **Shutdown**: coordinates a global stop across nodes, draining jobs without requeueing.

**Dispatch failures and retries**

- `DispatchJob` writes a start-job event into a pool stream and waits for:
  - an acknowledgement from a worker (success or failure of `Start`), or
  - detection that a job with the same key is already present.
- A separate pending-jobs map and timestamp-based TTL prevent duplicate dispatches when multiple nodes race to enqueue the same job key.
- If a worker fails to acknowledge starting a job within the configured grace period, that dispatch is eligible to be retried by cleanup logic.

**Rebalancing when workers join or leave**

- The pool maintains a replicated map of active workers.
- When workers are added or removed:
  - Nodes detect changes to the worker map and ask each worker to rebalance its jobs.
  - Jobs whose consistent-hash bucket now maps to a different worker are stopped and requeued so they can be picked up by the new target worker.
- This keeps job assignments aligned with the current worker set while respecting the key-based routing contract.

**Redis durability**

- Pulse relies on Redis for durability. If Redis is configured with persistence (AOF/snapshots or cluster with replication), jobs survive process and node crashes.
- If Redis loses its data, Pulse cannot recover jobs or worker metadata; in that case the pool starts from a clean slate.

In practice, this means:
- With a durable Redis, a job that `DispatchJob` has accepted will either run successfully, fail with a surfaced error, or be retried until a worker can process it.
- The main trade-off is at-least-once semantics: handlers must be idempotent because retries and rebalances can cause the same job to run more than once.

### Creating a Pool

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

### Dispatching Jobs

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

### Processing Jobs

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

### Sinks (Consumer Groups)

Sinks in Pulse are built on top of the streaming package and are used internally by the pool
to balance work across workers. Multiple pool nodes joining the same pool name share the work:

```go
// Two nodes participating in the same pool
node1, _ := pool.AddNode(ctx, "email-pool", rdb)
node2, _ := pool.AddNode(ctx, "email-pool", rdb)

// Jobs dispatched to "email-pool" are distributed across all active workers.
```

### Key Configuration Options

**Pool nodes (`pool.AddNode`)**

| Option | Description |
|--------|-------------|
| `pool.WithWorkerTTL(d)` | How aggressively to detect dead workers; lower values mean faster failover, higher values mean fewer heartbeats. |
| `pool.WithMaxQueuedJobs(n)` | Global cap on in-flight queued jobs; exceeding it causes new `DispatchJob` calls to fail fast. |
| `pool.WithAckGracePeriod(d)` | How long the pool waits for a worker to acknowledge starting a job before it can be reassigned. |
| `pool.WithClientOnly()` | Create a node that only dispatches jobs (no background routing or workers). |
| `pool.WithLogger(logger)` | Attach a structured logger for all pool internals. |

For more advanced tuning (shutdown TTLs, sink block durations, etc.), see the
[pool package docs](https://pkg.go.dev/goa.design/pulse/pool).

---

## Infrastructure Setup

### Redis Requirements

Pulse requires Redis 5.0+ for Streams support. For production:

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

### Redis Cluster

For high availability, use Redis Cluster:

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

## Patterns

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

### Async Task Processing

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

## Complete Example: User Signup Flow

The following sketch shows how you might combine streams, a worker pool, and a replicated map
to implement a user signup flow with email confirmation and feature flags:

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

This pattern scales naturally: you can add more email workers, add additional consumers of the
`users` stream (analytics, audit, etc.), and share additional control-plane state via replicated maps.

---

## Production Considerations

- **Redis sizing and durability**: Use Redis 5+ with persistence configured appropriately (AOF or snapshotting) depending on how critical stream data and replicated maps are for your workload.
- **Stream trimming**: Set `WithStreamMaxLen` high enough to accommodate replay needs (event sourcing, debugging) but low enough to avoid unbounded growth; remember trimming is approximate.
- **At-least-once semantics**: Streams and sinks are at-least-once; design handlers to be idempotent and safe to retry.
- **Worker TTLs and shutdown**: Tune `WithWorkerTTL` and `WithWorkerShutdownTTL` based on how quickly you want to detect failed workers and how long they need to drain work on shutdown.
- **Pending and stuck jobs**: `WithAckGracePeriod` and pool’s internal pending job tracking prevent jobs from getting stuck forever, but you should still monitor for jobs that repeatedly fail to start.
- **Observability**: Use `pulse.ClueLogger` or your own structured logger with `WithStreamLogger`, `WithLogger`, and `rmap.WithLogger` so you can trace events and job lifecycles in production.
- **Backpressure and queue limits**: Use `WithMaxQueuedJobs`, `WithReaderMaxPolled`, and `WithSinkMaxPolled` to bound memory usage and make backpressure explicit when the system is overloaded.
- **High availability**: For critical systems, run Redis in cluster or sentinel mode and run multiple pool nodes so workers can fail over cleanly.

---

## Troubleshooting

- **Cannot connect to Redis**: Verify the address, password, and TLS settings used by `redis.NewClient` or `redis.NewClusterClient`; Pulse simply propagates these connection errors.
- **No events are being delivered**: Check that readers and sinks use the correct stream name, start position (`WithReaderStart*` / `WithSinkStart*`), and topic/topic pattern; also verify that `BlockDuration` is not set to `0` inadvertently.
- **Events appear to be missing**: If `WithStreamMaxLen` is too small, older events may have been trimmed; increase the max length or persist important events elsewhere.
- **Jobs are never picked up**: Ensure at least one non-client-only node is running with active workers (`AddWorker`) and that `WithMaxQueuedJobs` has not been exceeded.
- **Jobs keep being retried or moved between workers**: This usually indicates the worker fails to start or crashes while processing; inspect job handler logs and consider increasing `WithAckGracePeriod` or fixing non-idempotent handlers.
- **Uneven worker load**: Jump consistent hashing normally balances keys well; if most jobs share the same key, consider sharding the key space or using a different keying strategy.
- **Shutdown hangs**: If `Close` or a pool shutdown takes too long, review `WithWorkerShutdownTTL` and ensure workers’ `Stop` implementations return promptly even when work is slow or external services are down.

### Distributed Caching

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

## See Also

- [Pulse GitHub Repository](https://github.com/goadesign/pulse) — Source code and examples
- [Redis Streams Documentation](https://redis.io/docs/data-types/streams/) — Redis Streams concepts
