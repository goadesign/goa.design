---
title: "Generation Process"
linkTitle: "Generation Process"
weight: 2
description: "Understand how Goa transforms your design into code, including the generation pipeline, expression evaluation, and output structure."
---

## Generation Pipeline

When you run `goa gen`, Goa follows a systematic process to transform your
design into working code:

### 1. Bootstrap Phase

Goa first creates and runs a temporary program:
During this phase, Goa creates a temporary `main.go` program that:

1. Imports the necessary Goa packages for code generation and evaluation
2. Imports your design package
3. Runs the DSL evaluation to process your design
4. Triggers the code generation process

This temporary program serves as the entry point for transforming your design
into code. It's automatically created and removed during the generation process,
so you never need to manage it directly.

### 2. Design Evaluation

During this phase, Goa loads and evaluates your design package:

1. DSL functions are executed to create expression objects that represent your API design
2. These expressions are combined into a complete model of your API's structure and behavior
3. The system analyzes and establishes relationships between different expressions
4. All design rules and constraints are carefully validated to ensure correctness

This evaluation phase is critical as it transforms your declarative design into
a structured model that can be used for code generation.

### 3. Code Generation

Once the expressions have been validated, they are passed to Goa's code
generators. The generators use these expressions as input data to render various
code templates. They generate transport-specific code for protocols like HTTP
and gRPC, create all necessary supporting files, and write the complete output
to the `gen/` directory. This generation step produces all the code needed to
run your service while maintaining consistency across the codebase.

## Generated Structure

A typical generated project structure:

```
myservice/
├── design/           # Your design files
│   └── design.go
├── gen/             # Generated code
│   ├── calc/        # Service-specific code
│   │   ├── client/
│   │   ├── service/
│   │   └── endpoints/
│   └── http/        # Transport layer
│       ├── client/
│       └── server/
└── cmd/             # Generated example commands
    └── calc/
        ├── http.go
        └── grpc.go
```

## Generated Components

First, Goa generates the service interfaces, which form the core contract of
your API. This includes the main service definitions that specify the operations
your API provides, comprehensive type definitions for all data structures used
in your API, and method signatures that define how clients interact with your
service.

Next, Goa creates the transport layer implementation. This consists of complete
HTTP and gRPC server implementations that handle all the networking details,
sophisticated request and response encoding logic to marshal data between wire
formats and Go types, built-in middleware support for common concerns like
logging and monitoring, and client libraries that make it easy to consume your
API.

Finally, Goa generates various supporting code components that round out the
implementation. This includes custom error types for proper error handling,
comprehensive validation logic to ensure data integrity, detailed documentation
in multiple formats, and example implementations that demonstrate how to use the
generated code effectively.

{{< alert title="Generation Tips" color="primary" >}}
- Review generated code to understand the implementation
- Don't modify generated files directly
- Use version control to track generated changes
- Keep generated code separate from custom implementation
{{< /alert >}}
