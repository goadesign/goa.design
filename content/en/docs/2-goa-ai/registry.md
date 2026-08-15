---
title: "Internal Tool Registry"
linkTitle: "Registry"
weight: 9
description: "Deploy a clustered gateway for cross-process toolset discovery and invocation."
llm_optimized: true
---

The **Internal Tool Registry** is a clustered gateway service that enables toolset discovery and invocation across process boundaries. It's designed for scenarios where toolsets are provided by separate services that may scale independently from the agents consuming them.

## Overview

The registry acts as both a **catalog** and a **gateway**:

- **Catalog**: Agents discover available toolsets, their schemas, and health status
- **Gateway**: Tool calls are routed through the registry to providers via Pulse streams

This decouples agents from toolset providers, enabling independent scaling, deployment, and lifecycle management.

### Tool Registry vs Prompt Registry

These are different systems with different responsibilities:

- **Internal Tool Registry** (this page): cross-process discovery/invocation of toolsets and tool calls.
- **Runtime Prompt Registry** (`runtime.PromptRegistry`): in-process prompt spec registration and rendering,
  optionally backed by a prompt override store (`runtime.WithPromptStore`).

The tool registry does not store prompt templates or resolve prompt overrides. Prompt rendering remains in
the runtime/planner layer and emits `prompt_rendered` observability events.

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## Multi-Node Clustering

Multiple registry nodes can participate in the same logical registry by using the same `Name` in their configuration and connecting to the same Redis instance.

Nodes with the same name automatically:

- **Share toolset registrations** via Pulse replicated maps
- **Coordinate health check pings** via distributed tickers (only one node pings at a time)
- **Share provider health state** across all nodes

This enables horizontal scaling and high availability. Clients can connect to any node and see the same registry state.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Quick Start

### Library Usage

Create and run a registry node programmatically. When `New()` is called, the registry connects to Redis and initializes several Pulse components: a pool node for distributed coordination, two replicated maps for health state and toolset tracking, and stream managers for tool call routing. The `Run()` method starts the gRPC server and blocks until shutdown, handling graceful termination automatically.

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

### Example Binary

The registry package includes an example binary for quick deployment. All nodes with the same `REGISTRY_NAME` pointing to the same Redis instance automatically form a cluster—they share toolset registrations and coordinate health checks without additional configuration.

```bash
# Single node (development)
REDIS_URL=localhost:6379 go run ./registry/cmd/registry

# Multi-node cluster (production)
REGISTRY_NAME=prod REGISTRY_ADDR=:9090 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9091 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9092 REDIS_URL=redis:6379 ./registry
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REGISTRY_ADDR` | gRPC listen address | `:9090` |
| `REGISTRY_NAME` | Registry cluster name | `registry` |
| `REDIS_URL` | Redis connection URL | `localhost:6379` |
| `REDIS_PASSWORD` | Redis password | (none) |
| `PING_INTERVAL` | Health check ping interval | `10s` |
| `MISSED_PING_THRESHOLD` | Missed pings before unhealthy | `3` |

## Architecture

{{< figure src="/images/diagrams/RegistryArchitecture.svg" alt="Registry Internal Architecture" >}}

### Components

| Component | Description |
|-----------|-------------|
| **Service** | gRPC handlers for discovery and invocation |
| **Catalog** | Redis-backed tool schemas, admission tokens, provider leases, and retirement history |
| **Health Tracker** | Monitors provider liveness via ping/pong |
| **Stream Manager** | Manages Pulse streams for tool call routing |
| **Call Record Store** | Retains each call's request identity, provider assignment, deadline, publication state, and canonical terminal result |

### Tool Call Flow

When `CallTool` is invoked, the registry performs these steps in sequence:

1. **Identity and schema validation**: The registry validates the payload and
   derives one run-scoped `tool_use_id`. An exact retry attaches to the same
   retained record.
2. **Provider wait**: An unpublished call waits for the active toolset to have a
   healthy provider, bounded by the call's existing execution deadline.
3. **Atomic publication**: One Redis operation verifies that the selected
   provider is still current and non-draining, then appends the request exactly
   once. If a rollout changed providers after the health check, the unpublished
   call selects the replacement and tries again within the same deadline.
4. **Immutable execution**: Successful publication fixes the provider
   assignment. The call can no longer move because an external effect may have
   begun.
5. **Result delivery**: `CallTool` returns the exact provider token,
   result-stream identity, execution deadline, and retention deadline. The
   executor reads that stream until the provider returns a terminal result or
   the execution deadline settles the call.

If the execution deadline expires before publication, the registry records
`call_not_admitted`, which proves that the executor may choose another plan. A
published call with an uncertain result returns `outcome_unknown` and may not be
replaced.

## Provider Integration (Service-Side)

Registry routing is only half of the story: **providers must run a tool execution loop** in the toolset-owning service process.

For service-owned, method-backed toolsets (tools declared with `BindTo(...)`), code generation emits a provider adapter at:

- `gen/<service>/toolsets/<toolset>/provider.go`

The generated provider:

- Decodes the incoming tool payload JSON using the generated payload codec
- Builds the Goa method payload using generated transforms
- Calls the bound service method
- Encodes the tool result JSON together with any declared server-data using the generated result codec

To serve tool calls from the registry gateway, wire the generated provider into
the runtime provider loop (`goa.design/goa-ai/runtime/toolregistry/provider`):

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

Stream IDs are deterministic:

- Tool calls: `toolset:<toolsetID>:requests`
- Results: `result:<toolUseID>`

## Configuration

### Config Struct

The `Name` field is particularly important: it determines the Pulse resource names used for coordination. The pool is named `<name>`, the health map `<name>:health`, and the registry map `<name>:toolsets`. Nodes with matching names and Redis connections automatically discover each other.

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

### Store Implementations

The registry supports pluggable storage backends. The store persists toolset metadata (name, description, version, tags, and tool schemas). Note that health state and stream coordination are always handled via Redis/Pulse regardless of which store you choose—the store only affects toolset metadata persistence.

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

## Health Monitoring

The registry automatically monitors provider health using ping/pong messages over Pulse streams.

### How It Works

1. Registry sends periodic `ping` messages to each registered toolset's stream
2. Providers respond with `pong` messages via the `Pong` gRPC method
3. If a provider misses `MissedPingThreshold` consecutive pings, it's marked unhealthy
4. Unhealthy toolsets are excluded from `CallTool` routing

The health tracker uses a staleness threshold calculated as `(MissedPingThreshold + 1) × PingInterval`. With defaults (3 missed pings, 10s interval), a toolset becomes unhealthy after 40 seconds without a pong. This gives providers enough time to respond while still detecting failures reasonably quickly.

### Distributed Coordination

In a multi-node cluster, health check pings are coordinated via Pulse distributed tickers. The ticker ensures exactly one node sends pings at any given time—if that node crashes, another node automatically takes over within one ping interval.

All nodes share health state via a Pulse replicated map. When a pong is received on any node, it updates the shared map with the current timestamp. When any node checks health, it reads from this shared map, so all nodes have a consistent view of provider health.

## Client Integration

Agents connect to the registry using the generated gRPC client. The `GRPCClientAdapter` wraps the raw gRPC client and provides a cleaner interface for discovery and invocation. Since all registry nodes share state, clients can connect to any node—use a load balancer in production for automatic failover.

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
    fmt.Printf("Toolset: %s (%d tools)\n", ts.Name, ts.ToolCount)
}

// Get full schema for a toolset
schema, _ := client.GetToolset(ctx, "data-tools")
for _, tool := range schema.Tools {
    fmt.Printf("  Tool: %s - %s\n", tool.Name, tool.Description)
}
```

## gRPC API

The registry exposes the following gRPC methods:

### Provider Operations

| Method | Description |
|--------|-------------|
| `Register` | Add or renew one provider lease for the active tool contract. A different contract waits until the old leases end. |
| `DrainProvider` | Make one provider lease unavailable for new calls while preserving its authority to finish calls it already owns. |
| `ReleaseProvider` | Remove one exact provider lease after its process has settled accepted work. |
| `Unregister` | Intentionally retire the exact active admission. This removes it from discovery and routing and permanently prevents the same admission token from returning; it is not a rollout operation. |
| `Pong` | Record provider health for the exact current lease and health-check epoch. |
| `ClaimToolCall` | Grant execution of a published request to one exact provider lease. |
| `CompleteToolCall` | Commit the canonical terminal result for the claimed call and publish it to the result stream. |
| `PublishToolOutputDelta` | Publish a bounded, best-effort progress fragment for a claimed call. |
| `ReportToolCallOverload` | Record bounded retry control before a provider executes an overloaded call. |

### Discovery Operations

| Method | Description |
|--------|-------------|
| `ListToolsets` | List all registered toolsets (with optional tag filtering). Returns metadata only, not full schemas. |
| `GetToolset` | Get full schema for a specific toolset, including all tool input/output schemas. |
| `Search` | Search toolsets by keyword matching name, description, or tags. |

### Invocation Operations

| Method | Description |
|--------|-------------|
| `CallTool` | Validate and publish one run-scoped call. The call waits for provider health within its existing deadline, follows a replacement only before publication, and then returns its exact immutable execution reference. |
| `RetryTool` | Republish the exact original admission after recorded provider overload. It never moves execution to a replacement provider. |

## Best Practices

### Deployment

- **Use the same `Name`** for all nodes in a cluster—this determines the shared Pulse resource names
- **Point to the same Redis** instance for state coordination
- **Deploy behind a load balancer** for client connections—all nodes serve identical state
- **Use durable Redis** for the catalog, call records, and Pulse streams so registry replicas and process restarts observe the same decisions

### Health Monitoring

- **Set appropriate `PingInterval`** based on your latency requirements (default: 10s). Lower values detect failures faster but increase Redis traffic.
- **Tune `MissedPingThreshold`** to balance between false positives and detection speed (default: 3). The staleness threshold is `(threshold + 1) × interval`.
- **Monitor health state** via metrics or logs. Unpublished calls wait for provider recovery only until their existing execution deadline; they do not wait forever.

### Scaling

- **Add nodes** to handle more gRPC connections—each node can serve any request
- **Nodes share work** via Pulse distributed tickers—only one node pings each toolset at a time
- **No sticky sessions** required—result streams use Redis for cross-node delivery, so a tool call can be initiated on one node and completed on another

## Next Steps

- Learn about [Toolsets](./toolsets/) for defining tools
- Explore [Production](./production/) for deployment patterns
- Read about [Agent Composition](./agent-composition/) for cross-agent tool sharing
