---
title: "Core Concepts"
linkTitle: "Concepts"
weight: 4
description: >
  Deep dive into Goa's core concepts, design principles, and architecture.
menu:
  main:
    weight: 4
---

Learn about Goa's core concepts and architectural principles. This section explains the key components and patterns that make Goa powerful and flexible.

## Core Concepts

### 1. [Design Language](./1-design-language)
Master Goa's DSL for API definition:
- [Data Modeling](./1-design-language/1-data-modeling) - Define types and structures
- [Services and Methods](./1-design-language/2-services-methods) - Create service endpoints
- [Transport Mapping](./1-design-language/3-transport-mapping) - Configure HTTP/gRPC bindings

### 2. [Code Generation](./2-code-generation)
Understand the generated codebase:
- [Code Layout](./2-code-generation/1-code-layout) - Generated file structure
- [Implementation Guide](./2-code-generation/2-implementing) - Service implementation
- [Data Structures](./2-code-generation/3-data-structures) - Working with types

### 3. [Middleware and Interceptors](./2-interceptors)
Learn about request/response processing:
- [Goa Interceptors](./2-interceptors/1-goa-interceptors) - Transport-agnostic middleware
- [HTTP Middleware](./2-interceptors/2-http-middleware) - HTTP-specific handlers
- [gRPC Interceptors](./2-interceptors/3-grpc-interceptors) - gRPC-specific interceptors

### 4. [HTTP Encoding](./4-http-encoding)
Master HTTP data handling:
- Content negotiation
- Custom encoders/decoders
- Default implementations

## Core Architecture

{{< alert title="Clean Architecture" color="primary" >}}
Goa follows clean architecture principles with clear separation of concerns:

**1. Transport Layer**
- Handles HTTP/gRPC protocols
- Manages encoding/decoding
- Validates incoming requests

**2. Endpoint Layer**
- Provides transport-agnostic interfaces
- Enables middleware integration
- Manages request/response flow

**3. Service Layer**
- Contains business logic
- Implements service interfaces
- Remains protocol-independent
{{< /alert >}}

By understanding these concepts, you'll be able to:
- Design clean and maintainable APIs
- Generate efficient, production-ready code
- Implement robust service logic
- Handle cross-cutting concerns effectively

---

Begin with the [Design Language](./1-design-language) section to learn how to define your services using Goa's DSL.


