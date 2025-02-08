---
title: Installation
weight: 1
description: "Step-by-step guide to installing Goa and setting up your development environment, including prerequisites and verification steps."
---

## Prerequisites

Goa requires the use of **Go modules**, so ensure they're enabled in your Go environment.

- Use **Go 1.18+** (recommended).
- Enable **Go Modules**: Confirm they're enabled in your environment (e.g., `GO111MODULE=on` or using Go 1.16+ defaults).

## Install Goa

```bash
# Pull the Goa packages
go get goa.design/goa/v3/...

# Install the Goa CLI
go install goa.design/goa/v3/cmd/goa@latest

# Verify the installation
goa version
```

You should see the current Goa version (e.g., `v3.x.x`).

---

Continue to [First Service](./2-first-service/) to learn how to create your first service.
