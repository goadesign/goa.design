---
title: Plugins
weight: 1
---

For more advanced customization needs, Goa provides a plugin system. Plugins offer deeper control over code generation when metadata alone isn't sufficient.

### Plugin Capabilities

Plugins can:

1. **Add New DSL Functions**
   Create custom DSL that integrates with Goa's core DSL:

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
   Transform or enhance the generated output:

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

For detailed information about creating and using plugins, see the [Plugins](/6-advanced/plugins) section.

## Best Practices

{{< alert title="Customization Tips" color="primary" >}}
- Start with metadata for simple customizations
- Use plugins only when metadata isn't sufficient
- Keep customizations consistent across your codebase
- Document custom generation behavior
- Test generated code thoroughly
{{< /alert >}}
