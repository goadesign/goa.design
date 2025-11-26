---
title: "Basic JSON‑RPC Service"
linkTitle: "Basic JSON‑RPC Service"
weight: 3
description: "Design and implement a simple JSON‑RPC 2.0 service in Goa. Learn the DSL, ID mapping, transports (HTTP, SSE, WebSocket), notifications, and batching."
---

Build a small but complete JSON‑RPC 2.0 service using Goa’s design‑first workflow. You will define the API with the DSL, generate type‑safe code, implement the business logic, and run the service over HTTP, Server‑Sent Events (SSE), and WebSocket.

### What you'll learn

- JSON‑RPC service design using the Goa DSL
- How JSON‑RPC IDs map to your payloads and results
- Choosing between HTTP, SSE, and WebSocket (and when)
- Sending notifications and batches
- Running and calling the service with curl and the generated client

### Prerequisites

- Go 1.21+ installed
- `goa` code generator installed (`go install goa.design/goa/v3/cmd/goa@latest`)
- Basic familiarity with Goa’s REST/gRPC tutorials is helpful but not required

### What you'll build

A `calculator` service with a single `Add` method exposed via JSON‑RPC. You can call it over HTTP for simple request/response, and extend it to SSE/WebSocket as you progress.

Continue with the first step: [Designing the Service](./1-designing.md).

