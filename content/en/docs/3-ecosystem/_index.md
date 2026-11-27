---
title: "Ecosystem & Tools"
linkTitle: "Ecosystem"
weight: 3
description: "Companion Go libraries and multi-agent tools: C4 architecture diagrams, Redis event streams and worker pools, OpenTelemetry observability, MCP agent coordination, and contract-driven verification."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

{{< anchors "companion-libraries--tools" >}}
## Overview

These open-source libraries and MCP tools extend Goa and Goa-AI for architecture modeling, distributed events, observability, and multi-agent development. Each library works with Goa or standalone in any Go service.

| Project | Role | What It Provides |
|---------|------|------------------|
| [Model](model/) | Architecture as Code | C4 model DSL in Go, SVG/JSON export, interactive layout editor (`mdl`), Goa plugin |
| [Pulse](pulse/) | Redis Streams, Pools & Maps | Bounded or unbounded event streams, consistent-hash worker pools, replicated in-memory maps |
| [Clue](clue/) | OpenTelemetry Observability | Error-flushed buffered logging, OTLP traces and metrics, `/healthz` checks, runtime debug toggles |
| [Chorus](chorus/) | Peer Agent Coordination | Shared `#channels`, `@agent` DMs, server-held watermarks, 0-token `chorus watch`, live `chorus ui` |
| [Highbay](highbay/) | Contract & Verification Control Plane | `Story` + Change Cards, separated builder and test-writer Git copies, `eval/` gates, browser merge |

{{< anchors "model--architecture-diagrams-as-code" >}}
## Model: C4 Architecture Diagrams in Go

[Model](model/) defines [C4 architecture diagrams](https://c4model.com) in Go code alongside your service contracts so diagrams stay in version control and regenerate in CI:

```go
var _ = Design("Catalog Platform", "Product catalog architecture", func() {
    var System = SoftwareSystem("Catalog Service", "Serves product lookups over HTTP, gRPC, and MCP")

    Person("Developer", "Calls catalog APIs and MCP tools", func() {
        Uses(System, "Queries products", "HTTPS / MCP")
    })

    Views(func() {
        SystemContextView(System, "Context", "System context diagram", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

Run `mdl serve` to adjust layout interactively in the browser or `mdl svg` to export SVGs headlessly in CI. See the [Model guide](model/).

{{< anchors "pulse--distributed-event-infrastructure" >}}
## Pulse: Redis Event Streams, Worker Pools & Replicated Maps

[Pulse](pulse/) builds three distributed primitives directly on Redis (`*redis.Client`) without requiring a separate message broker:

- **`streaming`**: Event streams (`1,000`-event exact `MAXLEN` cap by default, configurable via `options.WithStreamMaxLen` or `options.WithUnboundedStream`) with independent fan-out `Reader`s and shared consumer-group `Sink`s.
- **`pool`**: Dedicated worker pools that route jobs by key with jump consistent hashing and automatic dead-worker failover.
- **`rmap`**: Read-local, eventually consistent key-value maps synchronized via atomic Redis Lua scripts and pub/sub notifications.

```go
// Open a stream and subscribe a shared consumer-group sink before publishing
stream, err := streaming.NewStream("orders", rdb)
if err != nil {
    log.Fatal(err)
}
sink, err := stream.NewSink(ctx, "billing-workers")
if err != nil {
    log.Fatal(err)
}
defer sink.Close(ctx)

if _, err := stream.Add(ctx, "order.created", payload); err != nil {
    log.Fatal(err)
}

for event := range sink.Subscribe() {
    if err := handleOrder(event); err == nil {
        _ = sink.Ack(ctx, event)
    }
}
```

See the [Pulse guide](pulse/).

{{< anchors "clue--microservice-observability" >}}
## Clue: OpenTelemetry Tracing, Buffered Logs & Health Checks

[Clue](clue/) instruments Go services with OpenTelemetry traces, metrics, health probes, and **error-flushed context logging** — keeping successful untraced requests quiet while flushing full per-request debug context whenever an error occurs:

```go
// Configure OpenTelemetry trace and metric exporters
cfg, err := clue.NewConfig(ctx, "catalog", "1.0.0", metricExporter, spanExporter)
if err != nil {
    log.Fatal(ctx, err)
}
clue.ConfigureOpenTelemetry(ctx, cfg)

// Buffered structured log (flushed automatically if an error is logged or request is traced)
log.Info(ctx, log.KV{K: "msg", V: "looking up SKU"}, log.KV{K: "sku", V: sku})

// HTTP dependency health check (probes upstream /livez with an explicit timeout)
checker := health.NewChecker(
    health.NewPinger("inventory-api", inventoryAddr, health.WithTimeout(5*time.Second)),
)
```

See the [Clue guide](clue/).

{{< anchors "chorus--multi-agent-coordination-over-mcp" >}}
## Chorus: Multi-Agent Coordination over MCP

[Chorus](chorus/) is a local MCP server built on [Goa-AI](/docs/2-goa-ai/) and [Pulse](pulse/) that connects coding agents across terminals, editors, and model families (`Claude Code`, `Codex`, `Gemini CLI`, `Antigravity`, `Cursor`, `Windsurf`, `Copilot`, `VS Code`) through shared `#channels`, `@agent` direct messages, and a pinned task board:

```bash
brew install goadesign/tap/chorus && chorus up
```

Alternative single-command setups (`npx @goadesign/chorus up`, `curl`, and `go install`) are in the [Chorus guide](chorus/) and on the [Chorus page](/chorus/).

- **Five tools (`who`, `join`, `leave`, `send`, `read`)** at `http://localhost:9440/mcp` using compact plain-text `ToolContent` wire responses (`~16–52 tokens/msg` estimated on the scripted passkey session).
- **Server-held read watermarks** in `pulse/rmap`, piggybacked unread delivery on `send`, and `0` model tokens while waiting in `chorus watch`.

{{< anchors "highbay--contract-driven-multi-agent-control-plane" >}}
## Highbay: Contract-Driven Multi-Agent Control Plane

[Highbay](highbay/) standardizes platform architecture across services, MCP servers, and AI agents — pairing one builder coding agent (`.highbay-build`) with a separate test-writing coding agent (`.highbay-tests`) around a confirmed contract before merge:

```bash
brew install goadesign/tap/highbay
highbay up
```

Alternative `npx @goadesign/highbay up` and `go install github.com/goadesign/highbay/cmd/highbay@latest` setups are in the [Highbay guide](highbay/) and on the [Highbay page](/highbay/).

- **`/highbay` (`$highbay` in Codex)** drafts a Change Card (`CP1`) and C4 architecture preview (`CP2`), starting empty folders from a clean, domain-neutral Go and `eval/` shell (`highbay init -example` adds a runnable sample).
- **Independent verification (`CP4`)** gates browser **Approve** and **Merge** (`CP5`) until candidate commits pass the accepted `eval/` scenario suite.

{{< anchors "documentation-guides" "getting-started" >}}
## Install Reference

```bash
# Go libraries
go get goa.design/model@latest
go get goa.design/pulse@latest
go get goa.design/clue@latest

# CLI & MCP tools
go install goa.design/model/cmd/mdl@latest
go install github.com/goadesign/chorus/cmd/chorus@latest
go install github.com/goadesign/highbay/cmd/highbay@latest
```
