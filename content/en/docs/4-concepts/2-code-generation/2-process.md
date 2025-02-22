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
code templates. They generate transport-specific code for HTTP and gRPC, create
all necessary supporting files, and write the complete output to the `gen/`
directory. This generation step produces all the code needed to run your service
while maintaining consistency across the codebase.

## Generated Structure

A typical generated project structure:

```
myservice/
├── cmd/             # Generated example commands
│   └── calc/
│       ├── grpc.go
│       └── http.go
├── design/          # Your design files
│   └── design.go
├── gen/            # Generated code
│   ├── calc/       # Service-specific code
│   │   ├── client/
│   │   ├── endpoints/
│   │   └── service/
│   └── http/       # Transport layer
│       ├── client/
│       └── server/
└── myservice.go    # Generated service implementation stub
```

Consult the
[Generated Code](/4-concepts/2-code-generation/3-generated-code) section
for more details on the generated code.