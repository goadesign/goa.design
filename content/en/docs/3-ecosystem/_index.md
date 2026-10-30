---
title: "Ecosystem & Tools"
linkTitle: "Ecosystem"
weight: 3
description: "Companion libraries and tools that extend Goa: architecture diagrams, distributed events, observability, and multi-agent coordination."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## Overview

The Goa ecosystem includes companion libraries and tools that address common needs in service and agentic development. These projects are designed to work seamlessly with Goa and Goa-AI, and can also be used independently.

## Companion Libraries & Tools

| Project | Purpose | Key Features |
|---------|---------|--------------|
| [Model](model/) | Architecture Diagrams | C4 diagrams as code, version control, interactive editor |
| [Pulse](pulse/) | Distributed Events | Event streaming, worker pools, replicated maps |
| [Clue](clue/) | Observability | Tracing, logging, metrics, health checks |
| [Chorus](chorus/) | Multi-Agent Coordination | Shared `#channels`, `@agent` DMs, server-held watermarks, `chorus watch` CLI |

## Model — Architecture Diagrams as Code

Model provides a Go DSL for describing software architecture using the [C4 model](https://c4model.com). Instead of drawing diagrams in graphical tools, you define your architecture in code:

```go
var _ = Design("My System", "System description", func() {
    var System = SoftwareSystem("My System", "Does something useful")
    
    Person("User", "A user of the system", func() {
        Uses(System, "Uses")
    })
    
    Views(func() {
        SystemContextView(System, "Context", "System context diagram", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

**Benefits:**
- Version-controlled architecture documentation
- Automatic diagram generation (SVG, JSON)
- Interactive graphical editor for positioning
- Goa plugin for combined API + architecture designs

**Learn more:** [Model Documentation](model/)

## Pulse — Distributed Event Infrastructure

Pulse provides primitives for building event-driven distributed systems. It's transport-agnostic and works with or without Goa services:

- **Streaming**: Pub/sub event routing across microservices
- **Worker Pools**: Dedicated workers with consistent hashing for job dispatch
- **Replicated Maps**: Eventually-consistent shared state across nodes

```go
// Publish events to a stream
stream.Add(ctx, "user.created", userEvent)

// Subscribe to events
reader.Subscribe(ctx, func(event *Event) error {
    return processEvent(event)
})
```

**Use cases:**
- Async event processing
- Background job queues
- Distributed caching
- Real-time notifications

**Learn more:** [Pulse Documentation](pulse/)

## Clue — Microservice Observability

Clue provides instrumentation for Goa services built on OpenTelemetry. It covers the three pillars of observability:

```go
// Configure OpenTelemetry
cfg := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
clue.ConfigureOpenTelemetry(ctx, cfg)

// Context-based logging
log.Info(ctx, "processing request", log.KV{"user_id", userID})

// Health checks
checker := health.NewChecker(health.NewPinger("db", dbAddr))
```

**Features:**
- Distributed tracing with automatic span propagation
- Structured logging with intelligent buffering
- Metrics collection and export
- Health check endpoints
- Debug endpoints for runtime troubleshooting

**Learn more:** [Clue Documentation](clue/)

## Chorus — Multi-Agent Coordination over MCP

Chorus is an MCP server built with [Goa-AI](/docs/2-goa-ai/) and [Pulse](pulse/) that lets multiple coding agents across terminals and model families coordinate over `#channels` and `@agent` direct messages:

```bash
# Install Chorus, register http://localhost:9440/mcp, and start the background service
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh

# Or install the agent skill via the Skills CLI
npx skills add goadesign/chorus --skill chorus
```

**Features:**
- Five MCP tools (`who`, `join`, `leave`, `send`, `read`) at a single `POST /mcp` endpoint
- Server-held per-agent read watermarks in `pulse/rmap` and bounded message logs in `pulse/streaming`
- Piggybacked unread delivery on `send` and compact plain-text wire responses
- Background OS listener (`chorus watch`) that blocks until a DM, mention, or reply arrives

**Learn more:** [Chorus Documentation](chorus/)

## Documentation Guides

| Guide | Description | ~Tokens |
|-------|-------------|---------|
| [Model](model/) | C4 diagrams, DSL reference, mdl CLI | ~2,500 |
| [Pulse](pulse/) | Streaming, worker pools, replicated maps | ~2,200 |
| [Clue](clue/) | Logging, tracing, metrics, health checks | ~2,800 |
| [Chorus](chorus/) | Multi-agent MCP coordination, CLI, and Goa-AI + Pulse architecture | ~1,100 |

**Total Section:** ~8,600 tokens

## Getting Started

Choose the library or tool that matches your needs:

- **Need architecture documentation?** Start with [Model](model/)
- **Building event-driven systems?** Start with [Pulse](pulse/)
- **Adding observability to Goa services?** Start with [Clue](clue/)
- **Coordinating multiple coding agents?** Start with [Chorus](chorus/)

All libraries are available via `go get` / `go install`:

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
go install github.com/goadesign/chorus/cmd/chorus@latest
```
