---
title: "Installation"
linkTitle: "Installation"
weight: 1
description: "Install Goa-AI and set up your development environment."
---

## Prerequisites

Before installing Goa-AI, ensure you have:

- **Go 1.24+** installed and configured
- **Goa v3.23.0+** CLI installed
- **Temporal** (optional, for durable workflows) - can use in-memory engine for development

## Install Goa CLI

The Goa CLI is required to generate code from your designs:

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

Verify the installation:

```bash
goa version
```

## Install Goa-AI

Add Goa-AI to your Go module:

```bash
go get goa.design/goa-ai@latest
```

Or add it to your `go.mod`:

```bash
go get goa.design/goa-ai
```

## Optional: Temporal Setup

For durable workflows in production, you'll need Temporal. For development, you can use the in-memory engine (no Temporal required).

### Development (In-Memory Engine)

The runtime uses an in-memory engine by default, so you can start developing immediately without Temporal:

```go
rt := runtime.New() // Uses in-memory engine
```

### Production (Temporal Engine)

For production deployments, set up Temporal:

**Option 1: Docker (Quick Start)**

```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**Option 2: Temporalite (Local Development)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**Option 3: Temporal Cloud**

Sign up at [temporal.io](https://temporal.io) and configure your client with cloud credentials.

## Verify Installation

Create a simple test to verify everything works:

```go
package main

import (
    "context"
    
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    // Runtime created successfully
    _ = rt
}
```

Run it:

```bash
go run main.go
```

If this runs without errors, you're ready to start building agents!

## Next Steps

Now that you have Goa-AI installed, follow the [First Agent](./2-first-agent/) guide to create your first agent.


