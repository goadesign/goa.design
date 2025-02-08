---
title: "Customization"
linkTitle: "Customization"
weight: 3
description: "Learn how to customize and extend Goa's code generation using metadata and plugins."
---

## Metadata

Metadata allows you to control and customize code generation. Use the `Meta`
function to add metadata to your design elements.

### Type Generation Control

The `"type:generate:force"` tag can be used to force the generation of a type
even if it is not directly referenced by any method. The values are the names of
the services that need the type generated.

```go
var MyType = Type("MyType", func() {
    // Force type generation even if unused
    Meta("type:generate:force", "service1", "service2")
    
    Attribute("name", String)
})
```

### Package and Structure Customization

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

### Common Metadata Keys

The following metadata keys are supported:

- `type:generate:force`: Force generation of types
- `struct:pkg:path`: Override package location
- `struct:field:name`: Override field names
- `struct:field:type`: Override field types
- `struct:tag:xxx`: Set custom struct tags
- `openapi:generate`: Control OpenAPI generation

## Plugin System

While metadata provides basic customization options, sometimes you need deeper
control over code generation. This is where Goa's plugin system comes in.
Plugins offer a powerful way to extend and modify Goa's code generation process,
allowing you to:

Plugins enable you to add entirely new DSL constructs for implementing custom
features, modify and enhance the generated code to meet specific needs,
implement organization-specific patterns and requirements, add support for new
protocols or frameworks, and generate additional files alongside Goa's standard
output. This flexibility allows you to extend Goa's functionality while
maintaining consistency with the core system.

The plugin system is designed to be both flexible and maintainable, making it an
ideal solution for advanced customization needs that go beyond what metadata can
provide.

Plugins extend Goa's generation capabilities. They can:

1. **Add New DSLs**

Plugins can define new DSL functions that integrate seamlessly with Goa's core
DSL. These functions can capture additional design information specific to your
needs. For example, a CORS plugin might add DSL for configuring allowed origins:

```go
var _ = Service("calc", func() {
    // Core Goa DSL
    Description("Calculator service")
    
    // Plugin DSL
    cors.Origin("/.*localhost.*/", func() {
        cors.Headers("X-Shared-Secret")
    })
})
```

2. **Modify Generated Code**

Plugins can modify or add generated code. For example, a logging plugin might
add logging to all service methods:





```go
func Generate(genpkg string, roots []eval.Root, files []*codegen.File) ([]*codegen.File, error) {
    // Modify or add generated files
    return files, nil
}
```

### Using Plugins

To use an existing plugin:
1. Import the plugin package
2. Use its DSL in your design
3. Run `goa gen` as usual

```go
import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)
```

For detailed information about creating and using plugins, see the [Plugins](/docs/6-advanced/plugins) section.

## Best Practices

{{< alert title="Customization Tips" color="primary" >}}
- Use metadata for simple customizations
- Create plugins for complex features
- Keep customizations consistent
- Document custom generation behavior
- Test generated code thoroughly
{{< /alert >}}
