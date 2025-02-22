---
title: "Code Generation"
linkTitle: "Code Generation"
weight: 2
description: "Learn how Goa generates code from your design, including command-line usage, generation process, and customization options."
---

Goa's code generation system transforms your design into production-ready code.
Rather than just scaffolding, Goa generates complete, runnable service
implementations that follow best practices and maintain consistency across your
entire API.

## Key Concepts

### 1. [Command Line Tools](./1-commands)

Learn about Goa's CLI tools for code generation. Understand the different
commands available, their purposes, and how to use them effectively in your
development workflow.

### 2. [Generation Process](./2-process)

Dive into how Goa transforms your design into code. Understand the generation pipeline from design loading to final code output, including validation and expression handling.

### 3. [Customization](./3-customization)

Discover ways to customize and extend code generation. Use metadata to control output, create plugins for new features, and adapt generation to your specific needs.

## Benefits of Code Generation

- **Consistency**: Generated code follows consistent patterns and best practices
- **Type Safety**: Strong typing throughout the generated implementation
- **Validation**: Automatic request validation based on your design rules
- **Documentation**: Generated OpenAPI specs and documentation
- **Transport Support**: Multiple transport protocols from a single design
- **Maintainability**: Changes to design automatically reflect in implementation

Start with [Command Line Tools](./1-commands) to learn how to generate code from your designs.

## Code Generation Overview

Goa's code generation takes your design files and produces complete, runnable service implementations.

## Command Line Tools

### Installation

Install Goa's command-line tools using:

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

### Key Commands

Goa provides two commands to help you generate and scaffold your services.
All commands expect a Go package import path, not a filesystem path:

```bash
# ✅ Correct: using Go package import path
goa gen goa.design/examples/calc/design

# ❌ Incorrect: using filesystem path
goa gen ./design
```

#### Generate Code (`goa gen`)

```bash
goa gen <design-package-import-path> [-o <output-dir>]
```

The primary command for code generation. It:
- Processes your design package and generates implementation code
- Recreates the entire `gen/` directory from scratch each time
- Should be run after every design change
- Allows custom output location with `-o` flag (defaults to `./gen`)

#### Create Example (`goa example`)

```bash
goa example <design-package-import-path> [-o <output-dir>]
```

A scaffolding command that:
- Creates a one-time example implementation of your service
- Generates handler stubs with example logic
- Should only be run once when starting a new project
- Is not meant to be re-run after design changes
- Will NOT overwrite any custom implementation if re-run

#### Show Version (`goa version`)

```bash
goa version
```

Displays the installed version of Goa.

## Generation Process

When you run the Goa code generation commands, Goa follows a systematic process
to transform your design into working code:

### Design Loading

The generation process happens in several phases:

1. **Bootstrap**: 
   First, Goa creates a temporary `main.go` file that imports your design
   package and the Goa packages. This temporary file is then compiled and
   executed as a separate process to bootstrap the code generation.

2. **DSL Execution**:
   The design package's initialization functions execute first, followed by the
   DSL functions which construct expression objects in memory. These expressions
   work together to create a comprehensive model representing your entire API
   design.

3. **Validation**:
   During validation, Goa performs comprehensive checks on the expression tree
   to ensure it is complete and well-formed. It verifies that all required
   relationships between expressions are properly defined and that the design
   follows all rules and constraints. This validation step helps catch potential
   issues early in the development process before any code is generated.

4. **Code Generation**:
   Once validation is complete, Goa passes the valid expressions to the code
   generators. These generators use the expression data to render templates,
   which produce the actual code files. The generated files are then written to
   the `gen/` directory in your project, organized by service and transport
   layer.

## Customizing Generation

### Using Metadata

The `Meta` function allows you to customize code generation behavior. Here are
key metadata tags that affect generation:

#### Type Generation Control

The `"type:generate:force"` tag can be used to force the generation of a type
even if it is not directly referenced by any method. The values are the names
of the services that need the type generated.

```go
var MyType = Type("MyType", func() {
    // Force type generation even if unused
    Meta("type:generate:force", "service1", "service2")
    
    Attribute("name", String)
})
```

#### Package and Structure Customization

The `"struct:pkg:path"` tag allows you to specify the package and path for a
type. The values is the package path relative to the `gen` package.

```go
var MyType = Type("MyType", func() {
    // Generate type in custom package
    Meta("struct:pkg:path", "types")
    
    Attribute("ssn", String, func() {
        // Override field name
        Meta("struct:field:name", "SSN")
        // Custom struct tags
        Meta("struct:tag:json", "ssn,omitempty")
    })
})
```

#### Protocol Buffer Customization

The `"struct:name:proto"` tag allows you to specify the name of the protocol
buffer message for a type. The values are the package path, the message name,
and the import path of the protocol buffer type.

```go
var Timestamp = Type("Timestamp", func() {
    // Override protobuf message name
    Meta("struct:name:proto", "MyProtoType")
    
    Field(1, "created_at", String, func() {
        // Use Google's timestamp type
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",
            "google/protobuf/timestamp.proto",
            "Timestamp",
            "google.golang.org/protobuf/types/known/timestamppb")
    })
})
```

#### OpenAPI Generation

The `"openapi:generate"` tag allows you to disable OpenAPI generation for a
service. The values are the names of the services that need the type generated.

The `"openapi:operationId"` tag allows you to specify the operation ID for a
method. The values are the service name and the method name.

The `"openapi:tag"` tag allows you to specify the OpenAPI tags for a service.
The values are the service name and the tag name.

```go
var _ = Service("MyService", func() {
    // Disable OpenAPI generation for this service
    Meta("openapi:generate", "false")
    
    Method("MyMethod", func() {
        // Custom operation ID
        Meta("openapi:operationId", "{service}.{method}")
        // Add OpenAPI tags
        Meta("openapi:tag:Backend", "Backend API")
    })
})
```

Common metadata uses:
- Control which types get generated
- Customize generated struct fields and tags
- Override package locations
- Configure protocol buffer generation
- Customize API documentation

{{< alert title="Metadata Tips" color="primary" >}}
- Use `type:generate:force` when types are only referenced indirectly
- Keep package paths (`struct:pkg:path`) consistent across related types
- Consider documentation impact when customizing OpenAPI generation
- Use field customization sparingly to maintain consistency
{{< /alert >}}

### Plugin System

Goa's plugin system allows you to extend and customize the code generation
process. Plugins intercept the generation pipeline at specific points, enabling
you to add features, modify generated code, or create entirely new outputs.

#### Plugin Capabilities

Plugins can interact with Goa in three main ways:

1. **Add New DSLs**  
   Plugins can provide additional design language constructs that work alongside
   Goa's core DSL. For example, the
   [CORS plugin](https://github.com/goadesign/plugins/tree/master/cors) adds DSL for
   defining cross-origin policies:

```go
var _ = Service("calc", func() {
    Description("Calculator service")
    
    // CORS plugin adds this DSL
    cors.Origin("/.*localhost.*/", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
    })
})
```

2. **Modify Generated Code**  
   Plugins can inspect and modify the files Goa generates, or add new files
   entirely: The plugin `Generate` function is called by Goa during code
   generation after the design has been evaluated. It receives:
   
   - `genpkg`: The Go package path where generated code will be placed
   - `roots`: The evaluated design roots containing all design data
   - `files`: The array of files that Goa has generated so far
   
   This function allows plugins to inspect and modify any generated files, add
   entirely new files to the output, remove files from generation, and transform
   code based on the design. The flexibility of this function enables plugins to
   have complete control over the final generated codebase.
   
3. **Prepare Design**  
   Plugins can process or modify the design before code generation begins:

```go
func Prepare(genpkg string, roots []eval.Root) error {
    // Validate or transform design before generation
    return nil
}
```

#### Common Use Cases

Plugins are typically used to:
- Add support for specific protocols or transports (like CORS)
- Generate additional documentation formats
- Implement custom validation rules
- Add cross-cutting concerns (logging, metrics, etc.)
- Generate supporting configuration files

#### Getting Started with Plugins

To use an existing plugin:
1. Import the plugin package
2. Use its DSL in your design
3. Run `goa gen` as usual - the plugin automatically integrates

```go
import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)
```

{{< alert title="Learn More About Plugins" color="primary" >}}
This is just an overview of Goa's plugin system. For detailed information about:
- Creating custom plugins
- Available plugin hooks
- Plugin best practices
- Example implementations

See the dedicated [Plugins](../../6-advanced/1-plugins) section.
{{< /alert >}}
