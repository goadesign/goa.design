---
title: "Model"
weight: 1
description: "Architecture diagrams as code using the C4 model - version-controlled, automatically generated, and interactive."
llm_optimized: true
---

Model provides a Go DSL for describing software architecture following the [C4 model](https://c4model.com). Define your architecture in code, version it alongside your software, and generate diagrams automatically.

## Why Diagrams as Code?

Traditional architecture diagrams rot. They're created in graphical tools, disconnected from the codebase, and quickly become outdated. Model solves this by making architecture a first-class part of your repository:

- **Version controlled**: Architecture changes are git commits with full history
- **Consistent**: Shared styles and components across all diagrams
- **Automated**: Generate diagrams in CI/CD—no manual screenshots
- **Composable**: Import architecture components across projects via Go packages
- **Reviewable**: Architecture changes go through code review like any other code

---

## The C4 Model

C4 defines four levels of abstraction. Model supports the first three:

| Level | What It Shows | Example Elements |
|-------|---------------|------------------|
| **Context** | System in its environment | Software systems, people |
| **Container** | Applications within a system | Web apps, APIs, databases, message queues |
| **Component** | Modules within a container | Services, controllers, repositories |

The fourth level (Code) maps to actual classes and functions—your IDE already shows that.

---

## Installation

```bash
go install goa.design/model/cmd/mdl@latest
go install goa.design/model/cmd/stz@latest
```

Requires Go 1.23+.

---

## Quick Start

### 1. Create a Model Package

```go
// model/model.go
package model

import . "goa.design/model/dsl"

var _ = Design("My System", "A description of the overall design", func() {
    // Define elements
    var System = SoftwareSystem("My System", "Does useful things", func() {
        Tag("primary")
    })
    
    Person("User", "Someone who uses the system", func() {
        Uses(System, "Uses")
        Tag("external")
    })
    
    // Define views
    Views(func() {
        SystemContextView(System, "Context", "Shows the system in context", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
        
        Styles(func() {
            ElementStyle("primary", func() {
                Background("#1168bd")
                Color("#ffffff")
            })
            ElementStyle("external", func() {
                Shape(ShapePerson)
                Background("#08427b")
                Color("#ffffff")
            })
        })
    })
})
```

### 2. Launch the Editor

```bash
mdl serve ./model -dir gen
```

Open `http://localhost:8080`. Drag elements to position them, then save. The SVG is written to the `gen/` directory.

### 3. Generate Diagrams in CI

```bash
mdl svg ./model -dir gen --all
```

This runs a headless browser to auto-layout and save all views as SVG files.

---

## Core Concepts

### Element Hierarchy

Model follows C4's hierarchy. Elements nest inside their parents:

```
Design
├── Person (top-level)
├── SoftwareSystem (top-level)
│   └── Container
│       └── Component
└── DeploymentEnvironment
    └── DeploymentNode
        ├── InfrastructureNode
        ├── ContainerInstance
        └── DeploymentNode (nested)
```

### Element References

Many DSL functions accept element references. You can reference elements two ways:

**By variable** (when you have a reference):
```go
var API = Container("API", "Backend service", "Go")
var DB = Container("Database", "Stores data", "PostgreSQL")

// Reference by variable
API.Uses(DB, "Reads from", "SQL")
```

**By path** (when the element is defined elsewhere):
```go
// Same container, reference sibling by name
Uses("Database", "Reads from", "SQL")

// Different software system, use full path
Uses("Other System/API", "Calls")

// Component in another container
Uses("My System/Other Container/Service", "Invokes")
```

Paths use `/` as separator. Relative paths work within scope (containers in the same system, components in the same container).

### Element Merging

If you define the same element twice (same name at the same level), Model merges them:

```go
var User = Person("User", "First definition", func() {
    Uses("System A", "Uses")
})

var User2 = Person("User", "Updated description", func() {
    Uses("System B", "Also uses")
})
// Result: One "User" person with "Updated description" and both relationships
```

This enables importing shared models and extending them with local relationships.

---

## Software Systems

The top-level element representing a deployable software system:

```go
var ECommerce = SoftwareSystem("E-Commerce", "Online shopping platform", func() {
    // Mark as external to the enterprise
    External()
    
    // Documentation link
    URL("https://docs.example.com/ecommerce")
    
    // Custom metadata
    Prop("owner", "Platform Team")
    Prop("tier", "1")
    
    // Tags for styling
    Tag("critical", "public-facing")
})
```

### Containers

Applications, services, or data stores within a software system:

```go
var _ = SoftwareSystem("E-Commerce", "Online store", func() {
    var WebApp = Container("Web Application", "Customer UI", "React", func() {
        Tag("frontend")
    })
    
    var API = Container("API", "Backend REST API", "Go/Goa", func() {
        Tag("backend")
        URL("https://api.example.com")
    })
    
    var Database = Container("Database", "Order and product data", "PostgreSQL", func() {
        Tag("database")
    })
    
    var Queue = Container("Message Queue", "Async processing", "RabbitMQ", func() {
        Tag("infrastructure")
    })
    
    // Relationships between containers
    WebApp.Uses(API, "Makes requests to", "HTTPS/JSON")
    API.Uses(Database, "Reads/writes", "SQL")
    API.Uses(Queue, "Publishes events to", "AMQP")
})
```

With Goa, you can use a service definition directly:

```go
// Goa service definition
var OrdersService = Service("orders", func() { /* ... */ })

// Use it as a container
var _ = SoftwareSystem("E-Commerce", func() {
    Container(OrdersService, func() {
        // Name, description, and "Go and Goa v3" technology come from the service
        Tag("api")
    })
})
```

### Components

Modules within a container. Use these for detailed technical documentation:

```go
var _ = Container("API", "Backend API", "Go", func() {
    var OrderService = Component("Order Service", "Handles order lifecycle", "Go package")
    var PaymentService = Component("Payment Service", "Processes payments", "Go package")
    var NotificationService = Component("Notification Service", "Sends emails/SMS", "Go package")
    
    OrderService.Uses(PaymentService, "Calls for payment")
    OrderService.Uses(NotificationService, "Triggers confirmations")
    PaymentService.Uses("Stripe/API", "Processes cards via", "HTTPS")
})
```

---

## Persons

Users, actors, or roles that interact with systems:

```go
var Customer = Person("Customer", "A customer placing orders", func() {
    External()  // Outside the enterprise
    Tag("user")
    Uses("E-Commerce", "Places orders using", "HTTPS")
})

var Admin = Person("Administrator", "Manages the platform", func() {
    // Internal by default
    Tag("internal")
    Uses("E-Commerce/Admin Portal", "Manages products via")
})

var Support = Person("Support Agent", "Handles customer issues", func() {
    InteractsWith(Customer, "Helps")  // Person-to-person relationship
    Uses("E-Commerce/Support Tools", "Uses")
})
```

---

## Relationships

### Types

| Function | From | To | Use Case |
|----------|------|----|---------| 
| `Uses` | Any element | Any element | General dependency |
| `Delivers` | System/Container/Component | Person | Output to users |
| `InteractsWith` | Person | Person | Human interaction |

### Syntax

All relationship functions accept the same optional arguments:

```go
// Minimal
Uses(Target, "description")

// With technology
Uses(Target, "description", "technology")

// With interaction style
Uses(Target, "description", Synchronous)  // or Asynchronous

// With technology and style
Uses(Target, "description", "technology", Synchronous)

// With properties
Uses(Target, "description", "technology", func() {
    Tag("async")
})
```

### Examples

```go
// System uses system
PaymentSystem.Uses(BankAPI, "Processes payments via", "REST/JSON", Synchronous)

// Container uses external system
API.Uses("Stripe/API", "Charges cards", "HTTPS", Asynchronous)

// System delivers to person
NotificationSystem.Delivers(Customer, "Sends order updates to", "Email")
```

---

## Views

Views render subsets of your model at different levels of detail.

### System Landscape View

Shows all systems and people—the big picture:

```go
SystemLandscapeView("Landscape", "Enterprise overview", func() {
    Title("Company Systems")
    AddAll()
    AutoLayout(RankTopBottom)
    EnterpriseBoundaryVisible()  // Shows internal vs external
})
```

### System Context View

Shows one system and its direct dependencies:

```go
SystemContextView(ECommerce, "Context", "E-Commerce in context", func() {
    AddAll()                      // Add system + all related elements
    Remove(InternalTooling)       // Exclude specific elements
    AutoLayout(RankLeftRight)
    EnterpriseBoundaryVisible()
})
```

### Container View

Shows containers within a system:

```go
ContainerView(ECommerce, "Containers", "E-Commerce containers", func() {
    AddAll()
    SystemBoundariesVisible()  // Shows external system boundaries
    AutoLayout(RankTopBottom)
})
```

### Component View

Shows components within a container:

```go
ComponentView(API, "Components", "API internals", func() {
    AddAll()
    ContainerBoundariesVisible()  // Shows external container boundaries
    AutoLayout(RankLeftRight)
})
```

### Dynamic View

Shows a specific flow or scenario with ordered interactions:

```go
DynamicView(ECommerce, "OrderFlow", "Order placement flow", func() {
    Title("Customer places an order")
    
    Link(Customer, WebApp, func() {
        Description("1. Submits order")
        Order("1")
    })
    Link(WebApp, API, func() {
        Description("2. Creates order")
        Order("2")
    })
    Link(API, PaymentService, func() {
        Description("3. Processes payment")
        Order("3")
    })
    Link(API, Database, func() {
        Description("4. Saves order")
        Order("4")
    })
    
    AutoLayout(RankLeftRight)
})
```

Scope can be `Global` (any elements), a software system (its containers), or a container (its components).

### Deployment View

Shows how containers are deployed to infrastructure:

```go
DeploymentView(Global, "Production", "ProdDeployment", "Production setup", func() {
    AddAll()
    AutoLayout(RankLeftRight)
})
```

### Filtered View

Creates a filtered version of another view based on tags:

```go
// Base view
SystemContextView(System, "AllContext", "Everything", func() {
    AddAll()
})

// Filtered to show only external elements
FilteredView("AllContext", func() {
    FilterTag("external")
})

// Filtered to exclude infrastructure
FilteredView("AllContext", func() {
    FilterTag("infrastructure")
    Exclude()
})
```

---

## View Manipulation

### Adding Elements

| Function | Behavior |
|----------|----------|
| `AddAll()` | Add everything in scope |
| `AddDefault()` | Add contextually relevant elements |
| `Add(element)` | Add specific element |
| `AddNeighbors(element)` | Add element and its direct connections |
| `AddContainers()` | Add all containers (ContainerView/ComponentView) |
| `AddComponents()` | Add all components (ComponentView) |
| `AddInfluencers()` | Add containers + external dependencies (ContainerView) |

**AddAll vs AddDefault**: `AddAll` adds everything possible in scope. `AddDefault` adds what's typically relevant—for a SystemContextView, that's the system plus directly related systems and people, but not unconnected elements.

### Removing Elements

```go
SystemContextView(System, "key", "desc", func() {
    AddAll()
    Remove(InternalTool)              // Remove specific element
    RemoveTagged("internal")          // Remove by tag
    RemoveUnrelated()                 // Remove elements with no relationships
    RemoveUnreachable(MainSystem)     // Remove elements not reachable from MainSystem
})
```

### Managing Relationships

```go
// Explicitly add a relationship
Link(Source, Destination, func() {
    Vertices(100, 200, 100, 400)  // Waypoints for line routing
    Routing(RoutingOrthogonal)    // RoutingDirect, RoutingCurved, RoutingOrthogonal
    Position(50)                  // Label position (0-100 along line)
})

// Remove a relationship
Unlink(Source, Destination)
Unlink(Source, Destination, "specific description")  // When multiple relationships exist

// Merge multiple relationships into one (Context/Landscape views only)
CoalesceRelationships(Customer, System, "Interacts with")  // Explicit merge
CoalesceAllRelationships()  // Auto-merge all duplicates
```

### Element Positioning

When adding elements, you can specify exact coordinates:

```go
Add(Customer, func() {
    Coord(100, 200)      // X, Y position
    NoRelationship()     // Don't render relationships for this element
})
```

---

## AutoLayout

AutoLayout positions elements automatically using graph layout algorithms:

```go
AutoLayout(RankTopBottom, func() {
    Implementation(ImplementationDagre)  // or ImplementationGraphviz
    RankSeparation(300)   // Pixels between ranks (default: 300)
    NodeSeparation(600)   // Pixels between nodes in same rank (default: 600)
    EdgeSeparation(200)   // Pixels between edges (default: 200)
    RenderVertices()      // Create waypoints on edges
})
```

**Rank directions**: `RankTopBottom`, `RankBottomTop`, `RankLeftRight`, `RankRightLeft`

---

## Styles

Styles are applied via tags. Elements and relationships can have multiple tags; styles cascade.

### Element Styles

```go
Styles(func() {
    ElementStyle("database", func() {
        Shape(ShapeCylinder)
        Background("#438DD5")
        Color("#ffffff")
        Stroke("#2E6295")
        FontSize(24)
        Border(BorderSolid)  // BorderSolid, BorderDashed, BorderDotted
        Opacity(100)         // 0-100
        Width(450)           // Pixels
        Height(300)          // Pixels
        Icon("https://example.com/db-icon.png")
        ShowMetadata()       // Show technology
        ShowDescription()    // Show description text
    })
})
```

**Available shapes**: `ShapeBox`, `ShapeRoundedBox`, `ShapeCircle`, `ShapeEllipse`, `ShapeHexagon`, `ShapeCylinder`, `ShapePipe`, `ShapePerson`, `ShapeRobot`, `ShapeFolder`, `ShapeWebBrowser`, `ShapeMobileDevicePortrait`, `ShapeMobileDeviceLandscape`, `ShapeComponent`

### Relationship Styles

```go
RelationshipStyle("async", func() {
    Dashed()                    // or Solid()
    Thickness(2)                // Line thickness in pixels
    Color("#707070")
    FontSize(18)
    Width(200)                  // Label width
    Routing(RoutingOrthogonal)  // RoutingDirect, RoutingCurved, RoutingOrthogonal
    Position(50)                // Label position (0-100)
    Opacity(100)
})
```

### CSS Theming Support

Exported SVGs include CSS custom properties with fallback values, enabling light/dark theme support without regenerating diagrams. Colors defined in `ElementStyle` and `RelationshipStyle` are converted to CSS variables based on the tag name.

**Variable naming convention:**
- Element backgrounds: `--mdl-<tag>-bg`
- Element text colors: `--mdl-<tag>-color`
- Element strokes: `--mdl-<tag>-stroke`
- Relationship colors: `--mdl-rel-<tag>-color`

For example, this style definition:

```go
Styles(func() {
    ElementStyle("database", func() {
        Background("#438DD5")
        Color("#ffffff")
    })
    RelationshipStyle("async", func() {
        Color("#707070")
    })
})
```

Generates SVG elements with:

```html
<rect fill="var(--mdl-database-bg, #438DD5)" ... />
<text fill="var(--mdl-database-color, #ffffff)" ... />
<path stroke="var(--mdl-rel-async-color, #707070)" ... />
```

**Implementing themes in your site:**

```css
/* Light theme (defaults from SVG) */
:root {
  --mdl-database-bg: #438DD5;
  --mdl-database-color: #ffffff;
  --mdl-rel-async-color: #707070;
}

/* Dark theme overrides */
[data-theme="dark"] {
  --mdl-database-bg: #3a7bc8;
  --mdl-database-color: #f0f0f0;
  --mdl-rel-async-color: #9ca3af;
}
```

The SVGs work standalone (fallback values render correctly) and adapt automatically when embedded in pages that define these CSS variables.

**Important:** CSS custom properties only work when the SVG is inlined in the HTML document. SVGs loaded via `<img src="...">` don't inherit CSS from the parent page. For Hugo sites, use the `diagram` shortcode to inline SVGs:

```markdown
{{</* diagram name="MyDiagram" */>}}
{{</* diagram name="MyDiagram" caption="System architecture" */>}}
```

---

## Deployment Modeling

Model infrastructure and runtime environments:

```go
var _ = Design("System", "desc", func() {
    var System = SoftwareSystem("My System", func() {
        var API = Container("API", "Backend", "Go")
        var DB = Container("Database", "Storage", "PostgreSQL")
    })
    
    DeploymentEnvironment("Production", func() {
        DeploymentNode("AWS", "Amazon Web Services", "Cloud Provider", func() {
            DeploymentNode("us-east-1", "US East Region", "AWS Region", func() {
                
                DeploymentNode("ECS Cluster", "Container orchestration", "AWS ECS", func() {
                    Instances("3")  // Can be number or range like "1..N"
                    
                    ContainerInstance("My System/API", func() {
                        InstanceID(1)
                        HealthCheck("API Health", func() {
                            URL("https://api.example.com/health")
                            Interval(30)      // Seconds
                            Timeout(5000)     // Milliseconds
                            Header("Authorization", "Bearer token")
                        })
                    })
                })
                
                DeploymentNode("RDS", "Managed database", "AWS RDS", func() {
                    ContainerInstance("My System/Database")
                })
                
                InfrastructureNode("ALB", "Load balancer", "AWS ALB", func() {
                    Tag("infrastructure")
                    URL("https://docs.aws.amazon.com/elasticloadbalancing/")
                })
            })
        })
    })
    
    Views(func() {
        DeploymentView(Global, "Production", "ProdDeploy", "Production deployment", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

---

## The `mdl` CLI

### `mdl serve` — Interactive Editor

```bash
mdl serve ./model -dir gen -port 8080
```

Starts a web-based editor at `http://localhost:8080`. Features:
- Drag elements to position them
- Multiple layout algorithms (Layered, Force, Tree, Radial) via ELK.js
- Alignment and distribution tools
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- SVG export
- Hot reload when DSL changes

**Key shortcuts** (use Cmd on Mac):

| Action | Shortcut |
|--------|----------|
| Save | Ctrl+S |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |
| Select all | Ctrl+A |
| Zoom in/out | Ctrl++/- or Ctrl+scroll |
| Fit to view | Ctrl+9 |
| Zoom 100% | Ctrl+0 |
| Auto layout | Ctrl+L |
| Toggle grid | Ctrl+G |
| Snap to grid | Ctrl+Shift+G |
| Align horizontal | Ctrl+Shift+H |
| Align vertical | Ctrl+Shift+A |
| Add vertex | Alt+Click |

### `mdl gen` — JSON Export

```bash
mdl gen ./model -out design.json
```

Exports the model as JSON. Useful for integration with other tools.

### `mdl svg` — Headless SVG Generation

```bash
# Generate all views
mdl svg ./model -dir gen --all

# Generate specific views
mdl svg ./model -dir gen --view Context --view Containers

# With layout options
mdl svg ./model -dir gen --all --direction LEFT --compact --timeout 30s
```

Runs a headless browser to auto-layout and save views. Ideal for CI/CD pipelines.

---

## The `stz` CLI

Upload models to [Structurizr](https://structurizr.com):

```bash
# Generate Structurizr workspace JSON
stz gen ./model

# Upload to Structurizr
stz put workspace.json -id WORKSPACE_ID -key API_KEY -secret API_SECRET

# Download from Structurizr
stz get -id WORKSPACE_ID -key API_KEY -secret API_SECRET -out workspace.json
```

---

## Goa Plugin

When using Model with Goa, add the DSL import to your design package:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/model/dsl"
)

// API definition
var _ = API("orders", func() {
    Title("Orders API")
})

var _ = Service("orders", func() {
    Method("create", func() { /* ... */ })
})

// Architecture model
var _ = Design("Orders", "Order management system", func() {
    var OrdersAPI = SoftwareSystem("Orders API", "Manages orders", func() {
        Container(OrdersService)  // Uses Goa service
    })
    
    Person("Customer", "Places orders", func() {
        Uses(OrdersAPI, "Creates orders via", "HTTPS")
    })
    
    Views(func() {
        SystemContextView(OrdersAPI, "Context", "System context", func() {
            AddAll()
            AutoLayout(RankTopBottom)
        })
    })
})
```

Running `goa gen` produces both API code and architecture diagrams (`design.json` and `workspace.json`).

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate Architecture Diagrams
on: [push]

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      
      - name: Install mdl
        run: go install goa.design/model/cmd/mdl@latest
      
      - name: Generate SVGs
        run: mdl svg ./model -dir docs/architecture --all
      
      - name: Commit diagrams
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add docs/architecture/
          git diff --cached --quiet || git commit -m "Update architecture diagrams"
          git push
```

---

## Best Practices

### Organize Large Models

Split models across multiple files:

```go
// model/systems.go
package model

import . "goa.design/model/dsl"

var ECommerce = SoftwareSystem("E-Commerce", "Online store", func() {
    // containers...
})

var Payments = SoftwareSystem("Payments", "Payment processing", func() {
    // containers...
})
```

```go
// model/views.go
package model

import . "goa.design/model/dsl"

var _ = Design("Platform", func() {
    Views(func() {
        SystemLandscapeView("Landscape", "All systems", func() {
            AddAll()
        })
        // more views...
    })
})
```

### Consistent Tagging

Define a tagging convention and stick to it:

```go
// Element types
Tag("database")
Tag("api")
Tag("frontend")
Tag("queue")

// Visibility
Tag("external")
Tag("internal")

// Criticality
Tag("critical")
Tag("tier-1")
```

### Import Shared Components

```go
// shared/infrastructure.go
package shared

import . "goa.design/model/dsl"

var Stripe = SoftwareSystem("Stripe", "Payment processing", func() {
    External()
    Tag("external", "payments")
})
```

```go
// myservice/model.go
package model

import (
    . "goa.design/model/dsl"
    _ "mycompany/shared"  // Import shared elements
)

var _ = Design("My Service", func() {
    var Service = SoftwareSystem("My Service", func() {
        Uses("Stripe", "Processes payments via")  // Reference by name
    })
})
```

---

## Reference

- [DSL Package Documentation](https://pkg.go.dev/goa.design/model/dsl) — Complete DSL reference
- [Model GitHub Repository](https://github.com/goadesign/model) — Source code and examples
- [C4 Model](https://c4model.com) — C4 model documentation
- [Structurizr](https://structurizr.com) — Online diagram hosting
