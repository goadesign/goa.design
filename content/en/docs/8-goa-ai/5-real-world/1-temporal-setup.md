---
title: "Temporal Setup"
linkTitle: "Temporal Setup"
weight: 1
description: "Set up Temporal for durable agent workflows in production."
---

This guide covers setting up Temporal for durable agent workflows in production environments.

## Overview

Temporal provides durable execution, replay, retries, signals, and workers for your Goa-AI agents. The Goa-AI runtime includes a Temporal adapter that implements the `engine.Engine` interface.

## Installation

### Option 1: Temporal Cloud

Sign up at [temporal.io](https://temporal.io) and configure your client with cloud credentials.

### Option 2: Self-Hosted Temporal

Deploy Temporal using Docker Compose or Kubernetes. See the [Temporal documentation](https://docs.temporal.io) for deployment guides.

### Option 3: Temporalite (Development)

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

## Runtime Configuration

```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
```

## Worker Setup

Workers poll task queues and execute workflows/activities:

```go
// Workers are automatically started for each registered agent
// No manual worker configuration needed in most cases
```

## Best Practices

- **Use separate namespaces** for different environments (dev, staging, prod)
- **Configure retry policies** in your workflow definitions
- **Monitor workflow execution** using Temporal's UI and observability tools
- **Set appropriate timeouts** for activities and workflows

## Next Steps

- Learn about [Streaming UI](./2-streaming-ui.md) for real-time agent updates
- Explore [Memory Persistence](./3-memory-persistence.md) for transcript storage


