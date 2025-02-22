---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
description: >
  Get up and running with Goa quickly - installation, setup, and your first API.
menu:
  main:
    weight: 2
---

This section guides you through getting started with Goa development. You'll learn how to:

1. [Set up your development environment](./1-installation/) with Go modules and the Goa CLI
2. [Create your first service](./2-first-service/) using Goa's design-first approach

## What to Expect

When working with Goa, your development workflow typically follows these steps:

1. **Design First**: Write your service definition using Goa's DSL in Go
2. **Generate Code**: Use the Goa CLI to generate boilerplate, transport layer, and documentation
3. **Implement Logic**: Add your business logic to the generated service interfaces
4. **Test & Run**: Use the generated client and server to test your implementation

## Choose Your Path

After completing the getting started guides, you can:

- Follow the [REST API Tutorial](../3-tutorials/1-rest-api/) for a deep dive into building HTTP services
- Explore [gRPC Services](../3-tutorials/2-grpc-service/) to create efficient RPC-based APIs
- Learn about [Error Handling](../3-tutorials/3-error-handling/) for robust service design

## Best Practices

- Keep your design files in a separate `design` package
- Run `goa gen` after any design changes
- Version control your generated code
- Use the generated OpenAPI documentation to validate your API design

Choose [Installation](./1-installation/) to begin your Goa journey.