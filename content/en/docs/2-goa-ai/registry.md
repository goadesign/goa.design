---
nav_group: reference
title: "Internal Tool Registry"
linkTitle: "Registry"
weight: 110
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
- **Coordinate health check pings** with expiring Redis leases, acquired separately for each toolset
- **Share provider health state** across all nodes

This enables horizontal scaling and high availability. Clients can connect to any node and see the same registry state.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Quick Start

### Library Usage

Create and run a registry node programmatically. `registry.New` initializes
the Redis-backed catalog, call records, Pulse streams, and health scheduler.
`Run` starts the gRPC server and blocks until shutdown. The example uses local
development addresses; configure Redis and gRPC credentials for your deployment.

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
Before invoking a handler, the provider calls `ClaimToolCall` using its worker
lifecycle context and existing bounded claim timeout, independently of the
message's execution deadline. The registry decides whether the call has expired,
already has a final result, or is owned by another delivery. For these outcomes,
the provider acknowledges the message without invoking the handler or stopping its
execution loop. Only after an `execute` decision does the provider invoke the
handler with the message's original execution deadline, without extending it.

For service-owned, method-backed toolsets (tools declared with `BindTo(...)`), code generation emits a provider adapter at:

- `gen/<service>/toolsets/<toolset>/provider.go`

The generated provider:

- Decodes the incoming tool payload JSON using the generated payload codec
- Builds the Goa method payload using generated transforms
- Calls the bound service method
- Encodes the tool result JSON together with any declared server-data using the generated result codec

The example below uses module `example.com/registry-provider`, service
`catalog`, and its method-backed toolset `search`, registered as
`catalog.search`. Replace the two application import paths and the toolset name
with your generated values. `NewProvider`, `ToolSchemas`, and
`SchemaFingerprint` come from the generated toolset package; keep the generated
schemas intact. The registration callbacks follow the **Service-Side Tool
Providers** example in the module's generated `AGENTS_QUICKSTART.md`
([Quickstart](../quickstart/)).

Pass your service implementation, a Pulse client constructed with
`pulse.New(pulse.Options{Redis: rdb})`, and a registry gRPC connection created
with `grpc.NewClient` using your deployment's credentials. Supply a stable
`providerID` for this process and toolset, unique among active replicas, and
the required deployment-issued `admissionRevision` shared by replicas of the
same registration. `Serve` creates the incarnation ID and supplies it to the
callbacks. Bound service methods must honor context cancellation. Run
`serveTools` as part of your service lifecycle and wait for it to return before
closing either client. On shutdown, the provider stops intake and settles
claimed calls, results, and acknowledgements within `Options.ShutdownTimeout`.
Only successful settlement permits release of the exact lease, using the
separate `Registration.ReleaseTimeout` budget. Failed settlement leaves
ownership to end through lease expiry. Preserve and report settlement or
release errors even when the returned error also matches `context.Canceled`.
Every required registration callback is wired below:

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

Stream IDs are deterministic:

- Tool calls: `toolset:<toolsetID>:requests`
- Results: `result:<toolUseID>`

## Configuration

### Registry Options {#config-struct}

The [library example](#library-usage) shows the minimal configuration:
pass the application-owned Redis client in `Redis` and choose a shared `Name`
for the registry cluster. Nodes using the same name and Redis database share
the catalog, call records, and health-check coordination. The catalog uses the
Pulse replicated map `<name>:toolsets`.

See [registry.Config](https://pkg.go.dev/goa.design/goa-ai/registry#Config) for the complete API and defaults.
`PingInterval` and `MissedPingThreshold` control health checks;
`ExecutionTimeout` bounds newly admitted execution; `ResultStreamTTL` controls
result retention; and `ProviderLeaseDuration` controls provider registration
renewal. `ExpectedToolsets` records required catalog names in telemetry without
rejecting registrations or calls. `Logger` receives call-settlement failures.
Configure these options when constructing the registry.

### Redis Storage {#store-implementations}

Redis stores the catalog's tool schemas, admission identities, provider leases,
health timestamps, and retirement history. Call records and Pulse request and
result streams also use Redis. Use durable Redis so registry replicas and
process restarts observe the same registrations and call decisions. The
application owns the Redis client and closes it after the registry stops.

## Health Monitoring

The registry sends health pings over Pulse streams. Providers reply through the `Pong` gRPC method.

### How It Works

1. The health scheduler reads the active toolsets from the shared catalog.
2. The node holding a toolset's ping lease sends a ping while that toolset has a live provider accepting calls.
3. `Pong` updates the catalog only when the reply matches the current registration, provider process, and health-check identity.
4. Routing requires an unexpired provider lease that accepts new calls and a sufficiently recent accepted pong.

Health is derived from the catalog using Redis time. The last accepted pong
must be no older than `(MissedPingThreshold + 1) × PingInterval`. An
unpublished call waits for a healthy provider only within its existing
execution deadline.

### Distributed Coordination

Each registry node runs a local scheduler and competes for an expiring Redis
lease for each toolset. The node that acquires the lease performs that health
check; after it expires, another node can acquire it. Lease names are scoped
to the registry cluster.

Provider leases, the current health-check identity, and the last accepted pong
are stored together in the catalog. Every node derives health from that
record, so a delayed reply from an obsolete provider cannot make the current
registration healthy.

## Client Integration

Use the generated registry service client for provider and invocation APIs.
For catalog discovery, `runtime/registry.NewClient` wraps that same generated
client and exposes `ListToolsets`, `GetToolset`, and `Search`, including the
resource types used by `runtime/registry.Manager`.

The example lists the catalog and retrieves one named toolset's full schema.
Pass a connection created with `grpc.NewClient` and your deployment's
credentials; the caller retains ownership of that connection. The generated
client is wired with every endpoint, as in the provider example above.

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

- **Use the same `Name`** for all nodes in a cluster to share catalog and call state and coordinate health checks
- **Point to the same Redis** instance for state coordination
- **Deploy behind a load balancer** for client connections—all nodes serve identical state
- **Use durable Redis** for the catalog, call records, and Pulse streams so registry replicas and process restarts observe the same decisions

### Health Monitoring

- **Configure `PingInterval` and `MissedPingThreshold`** for the desired health-check cadence and tolerated pong age. See `registry.Config` for defaults.
- **Observe catalog and health telemetry** to distinguish missing toolsets from providers that cannot currently accept calls.
- **Keep the execution deadline**: unpublished calls wait for provider recovery only until their existing deadline.

### Scaling

- **Add nodes** to handle more gRPC connections—each node can serve any request
- **Nodes coordinate health checks** with expiring Redis leases for each toolset
- **No sticky sessions** required—result streams use Redis for cross-node delivery, so a tool call can be initiated on one node and completed on another

## Next Steps

- Learn about [Toolsets](./toolsets/) for defining tools
- Explore [Production](./production/) for deployment patterns
- Read about [Agent Composition](./agent-composition/) for cross-agent tool sharing


See [Tool search and dynamic catalogs](../tool-search/) for current source resolution, generated contracts, provider behavior, and migration.
