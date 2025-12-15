---
title: "Ecosystem & Tools"
linkTitle: "Ecosystem"
weight: 3
description: "Companion libraries that extend Goa: architecture diagrams, distributed events, and observability."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## Overview

The Goa ecosystem includes companion libraries that address common needs in microservice development. These tools are designed to work seamlessly with Goa but can also be used independently.

## Companion Libraries

| Library | Purpose | Key Features |
|---------|---------|--------------|
| [Model](model/) | Architecture Diagrams | C4 diagrams as code, version control, interactive editor |
| [Pulse](pulse/) | Distributed Events | Event streaming, worker pools, replicated maps |
| [Clue](clue/) | Observability | Tracing, logging, metrics, health checks |

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

## Documentation Guides

| Guide | Description | ~Tokens |
|-------|-------------|---------|
| [Model](model/) | C4 diagrams, DSL reference, mdl CLI | ~2,500 |
| [Pulse](pulse/) | Streaming, worker pools, replicated maps | ~2,200 |
| [Clue](clue/) | Logging, tracing, metrics, health checks | ~2,800 |

**Total Section:** ~7,500 tokens

## Getting Started

Choose the library that matches your needs:

- **Need architecture documentation?** Start with [Model](model/)
- **Building event-driven systems?** Start with [Pulse](pulse/)
- **Adding observability to Goa services?** Start with [Clue](clue/)

All libraries are available via `go get`:

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
```
