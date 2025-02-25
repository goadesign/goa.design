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

- **Keep your design files in a separate `design` package**: This separation helps maintain a clear distinction between your API design and implementation. It makes it easier to manage changes to your API contract independently from your business logic.

- **Run `goa gen` after any design changes**: Keeping generated code in sync with your design is crucial. Running `goa gen` ensures that your implementation interfaces, transport layer code, and documentation always reflect your current API design.

- **Version control your generated code**: While generated code can be recreated, versioning it helps track API evolution, makes deployments more reliable, and enables easier code review of API changes. It also ensures team members work with consistent code regardless of their local Goa version.

- **Use the generated OpenAPI/Swagger documentation**: The auto-generated API documentation serves as a valuable resource for both development and API validation. It provides an interactive way to explore your API and can be shared with stakeholders for feedback.

- **Follow consistent naming conventions**: Use descriptive and consistent names for your services, methods, and types in your design. This makes your API more intuitive and easier to maintain.

- **Leverage Goa's type system**: Take advantage of Goa's rich type system to define precise data structures and validation rules in your design. This reduces boilerplate validation code and ensures consistent data handling.

Ready to begin? Start with [Installation](./1-installation/) to set up your Goa development environment.