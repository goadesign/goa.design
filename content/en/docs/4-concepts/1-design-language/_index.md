---
title: "Design Language"
linkTitle: "Design Language"
weight: 1
---

Learn about Goa's Design Language (DSL), a powerful domain-specific language for defining APIs. The DSL allows you to express your service design in a clear, declarative way while enforcing best practices and maintaining consistency.

## Key Concepts

### 1. [Data Modeling](./1-data-modeling)

Define your service's data structures using Goa's comprehensive type system. Create type definitions with attributes that match your domain model, and add validation rules and constraints to ensure data integrity. Extend the type system with custom types to handle specialized data formats. Use type composition and inheritance to build complex data structures from simpler components while maintaining clean separation and reusability.

### 2. [API Definition](./2-api)

Define the core properties of your API including metadata, servers, and global settings. Configure API-wide settings like versioning, documentation, security schemes, and terms of service. The API definition serves as the entry point for your service design and establishes the foundation for all other components.

### 3. [Services and Methods](./3-services-methods)

Design your service interface by defining the core components of your API. Create service definitions that encapsulate related functionality and establish clear boundaries. Specify methods that represent discrete operations, complete with their input parameters and expected outputs. Define request and response payloads to model the data flowing through your service. Implement comprehensive error handling patterns to gracefully manage failure scenarios and provide meaningful feedback to clients.

### 4. [Transport Mapping](./4-transport-mapping)

Configure how your service communicates over different transport protocols. Define HTTP endpoints with flexible routing, request methods, and response codes. Map your service methods to gRPC procedures with protocol buffer message definitions. Handle various content types through built-in and custom encoders/decoders. Set up intuitive path patterns and query parameter bindings that match your API's requirements.

### 5. [Security](./5-security)

Implement robust security measures for your API using Goa's security DSL. Define authentication schemes including Basic Auth, API Keys, JWT, and OAuth2. Configure authorization requirements at the API, service, and method levels. Specify security scopes and requirements for fine-grained access control. Handle secure communication through transport layer security (TLS) configuration.

By mastering Goa's Design Language, you'll be able to:
- Create clear and maintainable API definitions
- Ensure consistent service implementations
- Generate production-ready code
- Support multiple transport protocols
- Implement robust security measures

---

Start with [Data Modeling](./1-data-modeling) to learn how to define your service's types and structures.

