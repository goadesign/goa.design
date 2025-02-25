---
title: "Architecture Diagrams as Code"
linkTitle: "Architecture Diagrams"
weight: 3
description: >
  Learn how to create and maintain architecture diagrams using Model, an open source project for C4 modeling, and its integration with Goa through the model plugin.
---

# Architecture Diagrams as Code

Modern software architectures, especially those built around microservices, require 
clear and maintainable documentation. While service contracts and API documentation 
are essential, understanding how services interact and fit into the larger system 
often proves challenging. This is where architecture diagrams become invaluable.

## Understanding Model

[Model](https://github.com/goadesign/model) is an open source project that brings 
the power of code to architecture documentation. It implements the C4 model approach, 
which provides a hierarchical way to describe and communicate software architecture 
through different levels of abstraction.

By defining architecture diagrams in code, Model enables you to:
- Version control your architectural documentation
- Maintain diagrams alongside your implementation
- Automate diagram updates
- Ensure consistency across your documentation

To get started with Model, install the required command-line tools:

```bash
# Install the diagram editor and viewer
go install goa.design/model/cmd/mdl@latest
```

### Creating Your First Diagram

Let's create a simple system diagram that shows a user interacting with a service 
that uses a database. The following example demonstrates the key concepts of Model's 
design language:

```go
package design

import . "goa.design/model/dsl"

var _ = Design("Getting Started", "This is a model of my software system.", func() {
    // Define the main software system - this represents your entire application
    var System = SoftwareSystem("Software System", "My software system.", func() {
        // Define a database container within the system
        Database = Container("Database", "Stores information", "MySQL", func() {
            Tag("Database")  // Tags help with styling and filtering
        })
        
        // Define a service container that uses the database
        Container("Service", "My service", "Go and Goa", func() {
            Uses(Database, "Reads and writes data")
        })
    })

    // Define an external user of the system
    Person("User", "A user of my software system.", func() {
        Uses(System, "Uses")  // Create a relationship to the system
        Tag("person")         // Tag for styling
    })

    // Create a view to visualize the architecture
    Views(func() {
        SystemContextView(System, "System", "System Context diagram.", func() {
            AddAll()                    // Include all elements
            AutoLayout(RankLeftRight)   // Arrange elements automatically
        })
    })
})
```

This example introduces several key concepts:
1. The `Design` function defines the scope of your architecture
2. `SoftwareSystem` represents your application
3. `Container` defines major components (services, databases, etc.)
4. `Person` represents users or roles
5. `Uses` creates relationships between elements
6. `Views` define different ways to visualize your architecture

### Understanding C4 Views

Model implements the C4 model's hierarchical approach to describing software 
architecture. Each view type serves a specific purpose and audience, as defined by 
the [C4 Model](https://c4model.com/):

```go
Views(func() {
    // System Landscape: Show all systems and people in the enterprise landscape
    SystemLandscapeView("landscape", "Overview", func() {
        AddAll()
        AutoLayout(RankTopBottom)
    })

    // System Context: Focus on one system and its immediate relationships
    SystemContextView(System, "context", func() {
        AddAll()
        AutoLayout(RankLeftRight)
    })

    // Container: Show the high-level technical building blocks
    ContainerView(System, "containers", func() {
        AddAll()
        AutoLayout(RankTopBottom)
    })

    // Component: Detail the internals of a specific container
    ComponentView("System/Container", "components", func() {
        AddAll()
        AutoLayout(RankLeftRight)
    })
})
```

Let's look at each view type in detail:

#### System Landscape View
This view shows the big picture of your software systems landscape. It helps 
stakeholders understand how your system fits into the overall enterprise IT 
environment.

#### System Context View
This diagram shows your software system in its environment, focusing on the people 
who use it and the other systems it interacts with. It's an excellent starting 
point for documenting and communicating context with both technical and 
non-technical audiences.

#### Container View
As described in the [C4 Model Container Diagram guide](https://c4model.com/diagrams/container), 
a container view zooms into your software system to show the high-level technical 
building blocks. A "container" in this context represents a separately 
runnable/deployable unit that executes code or stores data, such as:

- Server-side web applications
- Single-page applications
- Desktop applications
- Mobile apps
- Database schemas
- File systems

This view helps developers and operations staff understand:
- The high-level shape of the software architecture
- How responsibilities are distributed
- The major technology choices
- How containers communicate with one another

Note that this diagram intentionally omits deployment details like clustering, load 
balancers, and replication, as these typically vary across environments.

#### Component View
This view zooms into an individual container to show its components and their 
interactions. It's useful for developers working on the codebase to understand how 
the container is structured internally.

## Working with Diagrams

Model provides an interactive editor through the `mdl` command that makes it easy to 
refine and export your diagrams. Start the editor with:

```bash
# Start with default output directory (./gen)
mdl serve goa.design/examples/model/design

# Or specify a custom output directory
mdl serve goa.design/examples/model/design -dir diagrams
```

This launches a web interface at http://localhost:8080 where you can:
- Arrange elements by dragging them
- Adjust relationship paths
- Preview changes in real-time
- Export diagrams as SVG files

### Interactive Editing

The editor provides several ways to manipulate your diagrams:

1. Element Positioning:
   - Drag elements to position them
   - Use arrow keys for fine adjustments
   - Hold SHIFT with arrow keys for larger movements

2. Relationship Management:
   - ALT + click to add vertices to relationships
   - Select and delete vertices with BACKSPACE or DELETE
   - Drag vertices to adjust relationship paths

3. Selection Tools:
   - Click to select individual elements
   - SHIFT + click or drag to select multiple elements
   - CTRL + A to select everything
   - ESC to clear selection

### Keyboard Shortcuts Reference

The following shortcuts help you work efficiently with the editor:

| Category | Shortcut | Effect |
|----------|----------|--------|
| Help | ?, SHIFT + F1 | Show keyboard shortcuts |
| File | CTRL + S | Save SVG |
| History | CTRL + Z | Undo |
| History | CTRL + SHIFT + Z, CTRL + Y | Redo |
| Zoom | CTRL + =, CTRL + wheel | Zoom in |
| Zoom | CTRL + -, CTRL + wheel | Zoom out |
| Zoom | CTRL + 9 | Zoom to fit |
| Zoom | CTRL + 0 | Zoom 100% |
| Select | CTRL + A | Select all |
| Select | ESC | Deselect |
| Move | Arrow keys | Move selection |
| Move | SHIFT + Arrow keys | Move selection faster |

### Styling Your Diagrams

Model allows you to customize the appearance of your diagrams through styles:

```go
Views(func() {
    // Define the view
    SystemContextView(System, "context", func() {
        AddAll()
        AutoLayout(RankTopBottom)
    })
    
    // Apply custom styles
    Styles(func() {
        // Style for elements tagged as "system"
        ElementStyle("system", func() {
            Background("#1168bd")  // Blue background
            Color("#ffffff")       // White text
        })
        
        // Style for elements tagged as "person"
        ElementStyle("person", func() {
            Shape(ShapePerson)     // Use person icon
            Background("#08427b")  // Dark blue background
            Color("#ffffff")       // White text
        })
    })
})
```

## Integration with Structurizr

While the `mdl` tool is perfect for local development and SVG export, Model also 
integrates with the [Structurizr](https://structurizr.com/) service for advanced
visualization and sharing capabilities. The `stz` tool manages this integration:

```bash
# Install stz
go install goa.design/model/cmd/stz@latest

# Generate a Structurizr workspace file
stz gen goa.design/examples/model/design

# Upload to your Structurizr workspace
stz put workspace.json -id ID -key KEY -secret SECRET

# Download from Structurizr
stz get -id ID -key KEY -secret SECRET -out workspace.json
```

Consider using Structurizr when you need:
- To share diagrams with a wider audience
- Collaborative editing features
- Alternative visualization options
- Integration with existing Structurizr workflows

## The Goa Model Plugin

For Goa users, Model provides a plugin that ensures your architecture diagrams stay 
synchronized with your service definitions. Enable the plugin by importing it in your 
Goa design:

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/plugins/v3/model/dsl"
)

var _ = API("calc", func() {
    // Link to your Model design package
    Model("goa.design/model/examples/basic/model", "calc")
    
    // Configure container naming (optional)
    ModelContainerFormat("%s Service")
    
    // Exclude certain containers from validation
    ModelExcludedTags("database", "external", "thirdparty")
    
    // Enable complete validation (optional)
    ModelComplete()
})
```

The plugin provides several features:
1. Validates that each Goa service has a corresponding container
2. Ensures consistent naming between services and containers
3. Supports excluding certain containers (like databases) from validation
4. Optionally verifies that all containers have matching services

You can also configure validation at the service level:

```go
var _ = Service("calculator", func() {
    // Override the container name
    ModelContainer("Calculator Service")
    
    // Or disable validation for this service
    // ModelNone()
})
```

## Best Practices

When working with Model and architecture diagrams:

1. Version Control
   Keep your architecture diagrams in source control and review them as part of your 
   normal code review process. This helps maintain accuracy and provides a history of 
   architectural decisions.

2. Diagram Organization
   Break down complex architectures into focused views that tell a specific story. 
   Use consistent naming and maintain clear descriptions for all elements.

3. Goa Integration
   When using the Goa plugin, maintain alignment between your service definitions and 
   architecture diagrams. Use the same terminology across both to avoid confusion.

4. Documentation
   Include context and rationale in your descriptions. Document significant 
   architectural decisions and keep diagrams focused on their intended purpose.

## Further Reading

- [Model Project Documentation](https://github.com/goadesign/model)
- [C4 Model](https://c4model.com/)
- [Structurizr](https://structurizr.com/)
