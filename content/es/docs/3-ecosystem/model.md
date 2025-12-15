---
title: "Modelo"
weight: 1
description: "Architecture diagrams as code using the C4 model - version-controlled, automatically generated, and interactive."
llm_optimized: true
---

Model proporciona un Go DSL para describir la arquitectura del software siguiendo el [modelo C4](https://c4model.com). Define tu arquitectura en código, modifícala junto con tu software y genera diagramas automáticamente.

## ¿Por qué diagramas como código?

Los diagramas de arquitectura tradicionales se pudren. Se crean con herramientas gráficas, se desconectan del código base y se quedan obsoletos rápidamente. Model soluciona esto haciendo que la arquitectura sea una parte de primera clase de su repositorio:

- **Versión controlada**: Los cambios en la arquitectura son commits git con historial completo
- **Consistente**: Estilos y componentes compartidos en todos los diagramas
- **Automatizado**: Generar diagramas en CI/CD-sin capturas de pantalla manuales
- **Composible**: Importación de componentes de arquitectura entre proyectos a través de paquetes Go
- **Revisable**: Los cambios en la arquitectura se revisan como cualquier otro código

---

## El modelo C4

C4 define cuatro niveles de abstracción. El modelo soporta los tres primeros:

| Nivel | Lo que muestra | Elementos de ejemplo |
|-------|---------------|------------------|
| Contexto: Sistema en su entorno, sistemas de software, personas
| Contenedor: Aplicaciones dentro de un sistema: Aplicaciones web, API, bases de datos, colas de mensajes
| **Componente** | Módulos dentro de un contenedor | Servicios, controladores, repositorios |

El cuarto nivel (Código) se refiere a las clases y funciones reales, su IDE ya lo muestra.

---

## Instalación

```bash
go install goa.design/model/cmd/mdl@latest
go install goa.design/model/cmd/stz@latest
```

Requiere Go 1.23+.

---

## Inicio rápido

### 1. Crear un paquete modelo

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

### 2. Iniciar el editor

```bash
mdl serve ./model -dir gen
```

Abra `http://localhost:8080`. Arrastre los elementos para colocarlos y, a continuación, guárdelos. El SVG se escribe en el directorio `gen/`.

### 3. Generar diagramas en CI

```bash
mdl svg ./model -dir gen --all
```

Esto ejecuta un navegador sin cabeza para auto-diseñar y guardar todas las vistas como archivos SVG.

---

## Conceptos básicos

### Jerarquía de elementos

El modelo sigue la jerarquía de C4. Los elementos se anidan dentro de sus padres:

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

### Referencias de elementos

Muchas funciones DSL aceptan referencias a elementos. Se puede hacer referencia a elementos de dos maneras:

**Por variable** (cuando se tiene una referencia):
```go
var API = Container("API", "Backend service", "Go")
var DB = Container("Database", "Stores data", "PostgreSQL")

// Reference by variable
API.Uses(DB, "Reads from", "SQL")
```

**Por ruta** (cuando el elemento está definido en otro lugar):
```go
// Same container, reference sibling by name
Uses("Database", "Reads from", "SQL")

// Different software system, use full path
Uses("Other System/API", "Calls")

// Component in another container
Uses("My System/Other Container/Service", "Invokes")
```

Las rutas utilizan `/` como separador. Las rutas relativas funcionan dentro del ámbito (contenedores en el mismo sistema, componentes en el mismo contenedor).

### Fusión de elementos

Si define el mismo elemento dos veces (mismo nombre en el mismo nivel), Model los fusiona:

```go
var User = Person("User", "First definition", func() {
    Uses("System A", "Uses")
})

var User2 = Person("User", "Updated description", func() {
    Uses("System B", "Also uses")
})
// Result: One "User" person with "Updated description" and both relationships
```

Esto permite importar modelos compartidos y ampliarlos con relaciones locales.

---

## Sistemas de software

Elemento de nivel superior que representa un sistema de software desplegable:

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

### Contenedores

Aplicaciones, servicios o almacenes de datos dentro de un sistema de software:

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

Con Goa, puede utilizar una definición de servicio directamente:

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

### Componentes

Módulos dentro de un contenedor. Utilícelos para documentación técnica detallada:

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

## Personas

Usuarios, actores o roles que interactúan con los sistemas:

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

## Relaciones

### Tipos

| Función | De | A | Caso de Uso |
|----------|------|----|---------|
| `Uses` | Cualquier elemento | Cualquier elemento | Dependencia general |
| `Delivers` | Sistema/Contenedor/Componente | Persona | Salida a usuarios |
| `InteractsWith` | Persona | Interacción humana |

### Sintaxis

Todas las funciones de relación aceptan los mismos argumentos opcionales:

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

### Ejemplos

```go
// System uses system
PaymentSystem.Uses(BankAPI, "Processes payments via", "REST/JSON", Synchronous)

// Container uses external system
API.Uses("Stripe/API", "Charges cards", "HTTPS", Asynchronous)

// System delivers to person
NotificationSystem.Delivers(Customer, "Sends order updates to", "Email")
```

---

## Vistas

Las vistas representan subconjuntos de su modelo con diferentes niveles de detalle.

### Vista panorámica del sistema

Muestra todos los sistemas y las personas: el panorama general:

```go
SystemLandscapeView("Landscape", "Enterprise overview", func() {
    Title("Company Systems")
    AddAll()
    AutoLayout(RankTopBottom)
    EnterpriseBoundaryVisible()  // Shows internal vs external
})
```

### Vista de contexto del sistema

Muestra un sistema y sus dependencias directas:

```go
SystemContextView(ECommerce, "Context", "E-Commerce in context", func() {
    AddAll()                      // Add system + all related elements
    Remove(InternalTooling)       // Exclude specific elements
    AutoLayout(RankLeftRight)
    EnterpriseBoundaryVisible()
})
```

### Vista de contenedor

Muestra los contenedores dentro de un sistema:

```go
ContainerView(ECommerce, "Containers", "E-Commerce containers", func() {
    AddAll()
    SystemBoundariesVisible()  // Shows external system boundaries
    AutoLayout(RankTopBottom)
})
```

### Vista de componentes

Muestra los componentes dentro de un contenedor:

```go
ComponentView(API, "Components", "API internals", func() {
    AddAll()
    ContainerBoundariesVisible()  // Shows external container boundaries
    AutoLayout(RankLeftRight)
})
```

### Vista dinámica

Muestra un flujo o escenario específico con interacciones ordenadas:

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

El ámbito puede ser `Global` (cualquier elemento), un sistema de software (sus contenedores) o un contenedor (sus componentes).

### Vista de despliegue

Muestra cómo se despliegan los contenedores en la infraestructura:

```go
DeploymentView(Global, "Production", "ProdDeployment", "Production setup", func() {
    AddAll()
    AutoLayout(RankLeftRight)
})
```

### Vista filtrada

Crea una versión filtrada de otra vista basada en etiquetas:

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

## Manipulación de vistas

### Añadir Elementos

| Función | Comportamiento |
|----------|----------|
| `AddAll()` | Añadir todo en el ámbito |
`AddDefault()` `AddDefault()` `AddDefault()` `AddDefault()` `AddDefault()` Añadir elementos contextualmente relevantes
| `Add(element)` | Añadir elemento específico |
`AddNeighbors(element)` `AddNeighbors(element)` `AddNeighbors(element)` `AddNeighbors(element)` Añadir elemento y sus conexiones directas
`AddContainers()` `AddContainers()` `AddContainers()` `AddContainers()` `AddContainers()` Añadir todos los contenedores (ContainerView/ComponentView)
| Añadir todos los componentes (ComponentView)
`AddInfluencers()` `AddInfluencers()` `AddInfluencers()` `AddInfluencers()` `AddInfluencers()` Añadir contenedores + dependencias externas (ContainerView)

**AddAll vs AddDefault**: `AddAll` añade todo lo posible en el ámbito. `AddDefault` añade lo que es típicamente relevante-para un SystemContextView, que es el sistema más los sistemas directamente relacionados y las personas, pero no los elementos no conectados.

### Eliminar elementos

```go
SystemContextView(System, "key", "desc", func() {
    AddAll()
    Remove(InternalTool)              // Remove specific element
    RemoveTagged("internal")          // Remove by tag
    RemoveUnrelated()                 // Remove elements with no relationships
    RemoveUnreachable(MainSystem)     // Remove elements not reachable from MainSystem
})
```

### Gestión de relaciones

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

### Posicionamiento de elementos

Al añadir elementos, puede especificar coordenadas exactas:

```go
Add(Customer, func() {
    Coord(100, 200)      // X, Y position
    NoRelationship()     // Don't render relationships for this element
})
```

---

## AutoLayout

AutoLayout posiciona los elementos automáticamente usando algoritmos de diseño gráfico:

```go
AutoLayout(RankTopBottom, func() {
    Implementation(ImplementationDagre)  // or ImplementationGraphviz
    RankSeparation(300)   // Pixels between ranks (default: 300)
    NodeSeparation(600)   // Pixels between nodes in same rank (default: 600)
    EdgeSeparation(200)   // Pixels between edges (default: 200)
    RenderVertices()      // Create waypoints on edges
})
```

**Direcciones de rango**: `RankTopBottom`, `RankBottomTop`, `RankLeftRight`, `RankRightLeft`

---

## Estilos

Los estilos se aplican mediante etiquetas. Los elementos y relaciones pueden tener múltiples etiquetas; los estilos se aplican en cascada.

### Estilos de elementos

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

**Estilos disponibles**: `ShapeBox`, `ShapeRoundedBox`, `ShapeCircle`, `ShapeEllipse`, `ShapeHexagon`, `ShapeCylinder`, `ShapePipe`, `ShapePerson`, `ShapeRobot`, `ShapeFolder`, `ShapeWebBrowser`, `ShapeMobileDevicePortrait`, `ShapeMobileDeviceLandscape`, `ShapeComponent`

### Estilos de relación

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

### Soporte de temas CSS

Los SVG exportados incluyen propiedades personalizadas CSS con valores fallback, lo que permite la compatibilidad con temas claros/oscuros sin regenerar los diagramas. Los colores definidos en `ElementStyle` y `RelationshipStyle` se convierten en variables CSS basadas en el nombre de la etiqueta.

**Convención de nomenclatura de variables:**
- Fondos de elemento: `--mdl-<tag>-bg`
- Colores de texto de elementos: `--mdl-<tag>-color`
- Elemento trazos: `--mdl-<tag>-stroke`
- Colores de relación: `--mdl-rel-<tag>-color`

Por ejemplo, esta definición de estilo:

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

Genera elementos SVG con:

```html
<rect fill="var(--mdl-database-bg, #438DD5)" ... />
<text fill="var(--mdl-database-color, #ffffff)" ... />
<path stroke="var(--mdl-rel-async-color, #707070)" ... />
```

**Implementación de temas en su sitio:**

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

Los SVG funcionan de forma independiente (los valores fallback se renderizan correctamente) y se adaptan automáticamente cuando se incrustan en páginas que definen estas variables CSS.

**Importante:** Las propiedades personalizadas de CSS sólo funcionan cuando el SVG está incrustado en el documento HTML. Los SVG cargados mediante `<img src="...">` no heredan CSS de la página principal. Para sitios Hugo, utilice el código corto `diagram` para insertar SVG:

```markdown
{{</* diagram name="MyDiagram" */>}}
{{</* diagram name="MyDiagram" caption="System architecture" */>}}
```

---

## Modelado de despliegue

Modelar entornos de infraestructura y tiempo de ejecución:

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

## La CLI `mdl`

### `mdl serve` - Editor Interactivo

```bash
mdl serve ./model -dir gen -port 8080
```

Inicia un editor basado en web en `http://localhost:8080`. Funciones:
- Arrastre elementos para posicionarlos
- Múltiples algoritmos de diseño (por capas, forzado, árbol, radial) a través de ELK.js
- Herramientas de alineación y distribución
- Deshacer/rehacer (Ctrl+Z / Ctrl+Shift+Z)
- Exportación SVG
- Recarga en caliente cuando cambia DSL

**Atajos de teclado** (use Cmd en Mac):

| Acción
|--------|----------|
| Guardar: Ctrl+S
| Deshacer Ctrl+Z
| Rehacer Ctrl+Shift+Z
| Seleccionar todo Ctrl+A
| Acercar/Alejar: Ctrl++/- o Ctrl+scroll
| Ajustar a la vista: Ctrl+9
| Zoom 100% Ctrl+0
| Autodisposición Ctrl+L
| Ajustar a la cuadrícula Ctrl+G
| Ajustar a la cuadrícula Ctrl+Mayús+G
| Alineación horizontal Ctrl+Mayús+H
| Alinear vertical Ctrl+Mayús+A
| Añadir vértice Alt+Click

### `mdl gen` - Exportación JSON

```bash
mdl gen ./model -out design.json
```

Exporta el modelo como JSON. Útil para la integración con otras herramientas.

### `mdl svg` - Generación SVG sin cabeza

```bash
# Generate all views
mdl svg ./model -dir gen --all

# Generate specific views
mdl svg ./model -dir gen --view Context --view Containers

# With layout options
mdl svg ./model -dir gen --all --direction LEFT --compact --timeout 30s
```

Ejecuta un navegador sin cabeza para auto-diseñar y guardar vistas. Ideal para CI/CD pipelines.

---

## La `stz` CLI

Subir modelos a [Structurizr](https://structurizr.com):

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

Cuando utilice Model con Goa, añada la importación DSL a su paquete de diseño:

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

Ejecutar `goa gen` produce tanto código API como diagramas de arquitectura (`design.json` y `workspace.json`).

---

## Integración CI/CD

### Acciones GitHub

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

## Mejores prácticas

### Organizar modelos grandes

Divida los modelos en varios archivos:

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

### Etiquetado coherente

Defina una convención de etiquetado y aténgase a ella:

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

### Importar componentes compartidos

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

## Referencia

- [Documentación del paquete DSL](https://pkg.go.dev/goa.design/model/dsl) - Referencia completa del DSL
- [Model GitHub Repository](https://github.com/goadesign/model) - Código fuente y ejemplos
- [Modelo C4](https://c4model.com) - Documentación del modelo C4
- [Structurizr](https://structurizr.com) - Alojamiento de diagramas en línea
