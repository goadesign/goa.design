---
title: "Model"
weight: 1
description: "Diagramas de arquitectura como código con el modelo C4: bajo control de versiones, generados automáticamente e interactivos."
llm_optimized: true
---

Model proporciona un DSL en Go para describir la arquitectura de software siguiendo el [modelo C4](https://c4model.com). Define tu arquitectura en código, versiónala junto a tu software y genera diagramas automáticamente.

## ¿Por qué diagramas como código?

Los diagramas de arquitectura tradicionales envejecen mal: se dibujan en herramientas gráficas desconectadas del repositorio y quedan obsoletos enseguida. Model convierte la arquitectura en una pieza de primera clase dentro de tu repositorio:

- **Bajo control de versiones**: Los cambios de arquitectura son commits de Git con historial completo
- **Consistente**: Estilos y componentes compartidos entre todos los diagramas
- **Automatizado**: Genera diagramas en CI/CD sin capturas manuales
- **Componible**: Importa componentes de arquitectura entre proyectos mediante paquetes Go
- **Revisable**: Los cambios de arquitectura pasan por revisión de código como cualquier otro cambio

---

## El modelo C4

C4 define cuatro niveles de abstracción. Model cubre los tres primeros:

| Nivel | Qué muestra | Elementos de ejemplo |
|-------|-------------|----------------------|
| **Contexto** | El sistema en su entorno | Sistemas de software, personas |
| **Contenedor** | Aplicaciones dentro de un sistema | Apps web, APIs, bases de datos, colas de mensajes |
| **Componente** | Módulos dentro de un contenedor | Servicios, controladores, repositorios |

El cuarto nivel (Código) corresponde a las estructuras y funciones reales que tu IDE ya muestra directamente.

---

## Instalación

```bash
go install goa.design/model/cmd/mdl@latest
go install goa.design/model/cmd/stz@latest
```

Requiere Go 1.27+.

---

## Inicio rápido

{{< anchors "1-crear-un-paquete-modelo" >}}
### 1. Crea un paquete de modelo

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

{{< anchors "2-iniciar-el-editor" >}}
### 2. Abre el editor interactivo

```bash
mdl serve ./model -dir gen
```

Abre `http://localhost:8080`. Arrastra los elementos para colocarlos y guarda el resultado. El SVG se escribe en el directorio `gen/`.

{{< anchors "3-generar-diagramas-en-ci" >}}
### 3. Genera diagramas en CI

```bash
mdl svg ./model -dir gen --all
```

Ejecuta un navegador sin interfaz gráfica para aplicar disposición automática y guardar todas las vistas como archivos SVG.

---

{{< anchors "conceptos-básicos" >}}
## Conceptos clave

### Jerarquía de elementos

Model respeta la jerarquía de C4; cada elemento se anida dentro de su padre:

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

{{< anchors "referencias-de-elementos" >}}
### Referencias a elementos

Muchas funciones del DSL aceptan referencias a elementos. Puedes referenciarlos de dos maneras:

**Por variable** (llamando a `Uses` dentro de la función DSL del elemento origen):
```go
var _ = Design("My System", "Overall design", func() {
    SoftwareSystem("My System", "Application backend", func() {
        var DB = Container("Database", "Stores data", "PostgreSQL")
        Container("API", "Backend service", "Go", func() {
            Uses(DB, "Reads from", "SQL")
        })
    })
})
```

**Por ruta** (cuando el elemento se ha definido en otro lugar):
```go
// Same container, reference sibling by name
Uses("Database", "Reads from", "SQL")

// Different software system, use full path
Uses("Other System/API", "Calls")

// Component in another container
Uses("My System/Other Container/Service", "Invokes")
```

Las rutas utilizan `/` como separador. Las rutas relativas funcionan dentro del mismo ámbito (contenedores del mismo sistema o componentes del mismo contenedor).

### Fusión de elementos

Si defines el mismo elemento dos veces (mismo nombre en el mismo nivel), Model los fusiona:

```go
var _ = Design("Enterprise", "Merged model", func() {
    SoftwareSystem("System A", "First system")
    SoftwareSystem("System B", "Second system")

    Person("User", "First definition", func() {
        Uses("System A", "Uses")
    })
    Person("User", "Updated description", func() {
        Uses("System B", "Also uses")
    })
    // Result: One "User" person with "Updated description" and both relationships
})
```

Esto permite importar modelos compartidos y ampliarlos con relaciones locales.

---

## Sistemas de software

Elemento de nivel superior que representa un sistema de software desplegable:

```go
var _ = Design("Enterprise", "System landscape", func() {
    SoftwareSystem("E-Commerce", "Online shopping platform", func() {
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
})
```

### Contenedores

Aplicaciones, servicios o almacenes de datos dentro de un sistema de software:

```go
var _ = Design("E-Commerce", "Online shopping platform", func() {
    SoftwareSystem("E-Commerce", "Online store", func() {
        var Database = Container("Database", "Order and product data", "PostgreSQL", func() {
            Tag("database")
        })

        var Queue = Container("Message Queue", "Async processing", "RabbitMQ", func() {
            Tag("infrastructure")
        })

        var API = Container("API", "Backend REST API", "Go/Goa", func() {
            Tag("backend")
            URL("https://api.example.com")
            Uses(Database, "Reads/writes", "SQL")
            Uses(Queue, "Publishes events to", "AMQP")
        })

        Container("Web Application", "Customer UI", "React", func() {
            Tag("frontend")
            Uses(API, "Makes requests to", "HTTPS/JSON")
        })
    })
})
```

Con Goa, puedes pasar directamente una definición de servicio:

```go
// Goa service definition
var OrdersService = Service("orders", func() { /* ... */ })

// Reference it inside Design -> SoftwareSystem
var _ = Design("E-Commerce", "Online shopping platform", func() {
    SoftwareSystem("E-Commerce", "Online store", func() {
        Container(OrdersService, func() {
            // Name, description, and "Go and Goa v3" technology come from the service
            Tag("api")
        })
    })
})
```

### Componentes

Módulos internos dentro de un contenedor, útiles para documentar el detalle técnico:

```go
var _ = Design("E-Commerce", "Online shopping platform", func() {
    SoftwareSystem("Stripe", "Payment processor", func() {
        External()
        Container("API", "Card processing API", "HTTPS")
    })

    SoftwareSystem("E-Commerce", "Online store", func() {
        Container("API", "Backend API", "Go", func() {
            var PaymentService = Component("Payment Service", "Processes payments", "Go package", func() {
                Uses("Stripe/API", "Processes cards via", "HTTPS")
            })
            var NotificationService = Component("Notification Service", "Sends emails/SMS", "Go package")

            Component("Order Service", "Handles order lifecycle", "Go package", func() {
                Uses(PaymentService, "Calls for payment")
                Uses(NotificationService, "Triggers confirmations")
            })
        })
    })
})
```

---

## Personas

Usuarios, actores o roles que interactúan con los sistemas:

```go
var _ = Design("E-Commerce", "Online shopping platform", func() {
    SoftwareSystem("E-Commerce", "Online store", func() {
        Container("Admin Portal", "Back-office UI", "Web")
        Container("Support Tools", "Agent console", "Web")
    })

    var Customer = Person("Customer", "A customer placing orders", func() {
        External() // Outside the enterprise
        Tag("user")
        Uses("E-Commerce", "Places orders using", "HTTPS")
    })

    Person("Administrator", "Manages the platform", func() {
        // Internal by default
        Tag("internal")
        Uses("E-Commerce/Admin Portal", "Manages products via")
    })

    Person("Support Agent", "Handles customer issues", func() {
        InteractsWith(Customer, "Helps") // Person-to-person relationship
        Uses("E-Commerce/Support Tools", "Uses")
    })
})
```

---

## Relaciones

### Tipos

| Función | Origen | Destino | Caso de uso |
|---------|--------|---------|-------------|
| `Uses` | Cualquier elemento | Cualquier elemento | Dependencia general |
| `Delivers` | Sistema/Contenedor/Componente | Persona | Entrega de información al usuario |
| `InteractsWith` | Persona | Persona | Interacción entre personas |

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

Llama a `Uses`, `Delivers` e `InteractsWith` dentro del bloque DSL del elemento origen:

```go
// System uses external system
SoftwareSystem("Payments", "Handles checkout", func() {
    Uses(BankAPI, "Processes payments via", "REST/JSON", Synchronous)
})

// Container uses external system
Container("API", "Backend API", "Go", func() {
    Uses("Stripe/API", "Charges cards", "HTTPS", Asynchronous)
})

// System delivers to person
SoftwareSystem("Notifications", "Customer alerts", func() {
    Delivers(Customer, "Sends order updates to", "Email")
})
```

---

## Vistas

Las vistas renderizan subconjuntos del modelo con distintos niveles de detalle.

{{< anchors "vista-panorámica-del-sistema" >}}
### Vista panorámica del sistema (`SystemLandscapeView`)

Muestra todos los sistemas y personas de la organización:

```go
SystemLandscapeView("Landscape", "Enterprise overview", func() {
    Title("Company Systems")
    AddAll()
    AutoLayout(RankTopBottom)
    EnterpriseBoundaryVisible()  // Shows internal vs external
})
```

{{< anchors "vista-de-contexto-del-sistema" >}}
### Vista de contexto del sistema (`SystemContextView`)

Muestra un sistema y sus dependencias directas:

```go
SystemContextView(ECommerce, "Context", "E-Commerce in context", func() {
    AddAll()                      // Add system + all related elements
    Remove(InternalTooling)       // Exclude specific elements
    AutoLayout(RankLeftRight)
    EnterpriseBoundaryVisible()
})
```

{{< anchors "vista-de-contenedor" >}}
### Vista de contenedores (`ContainerView`)

Muestra los contenedores que integran un sistema:

```go
ContainerView(ECommerce, "Containers", "E-Commerce containers", func() {
    AddAll()
    SystemBoundariesVisible()  // Shows external system boundaries
    AutoLayout(RankTopBottom)
})
```

{{< anchors "vista-de-componentes" >}}
### Vista de componentes (`ComponentView`)

Muestra los componentes internos de un contenedor:

```go
ComponentView(API, "Components", "API internals", func() {
    AddAll()
    ContainerBoundariesVisible()  // Shows external container boundaries
    AutoLayout(RankLeftRight)
})
```

{{< anchors "vista-dinámica" >}}
### Vista dinámica (`DynamicView`)

Representa un flujo o escenario concreto con interacciones ordenadas:

```go
DynamicView(ECommerce, "OrderFlow", "Order placement flow", func() {
    Title("Customer places an order")

    Link(Customer, WebApp, func() {
        Description("1. Submits order")
    })
    Link(WebApp, API, func() {
        Description("2. Creates order")
    })
    Link(API, PaymentService, func() {
        Description("3. Processes payment")
    })
    Link(API, Database, func() {
        Description("4. Saves order")
    })

    AutoLayout(RankLeftRight)
})
```

El ámbito puede ser `Global` (cualquier elemento), un sistema de software (sus contenedores) o un contenedor (sus componentes).

{{< anchors "vista-de-despliegue" >}}
### Vista de despliegue (`DeploymentView`)

Muestra cómo se despliegan los contenedores sobre la infraestructura:

```go
DeploymentView(Global, "Production", "ProdDeployment", "Production setup", func() {
    AddAll()
    AutoLayout(RankLeftRight)
})
```

{{< anchors "vista-filtrada" >}}
### Vista filtrada (`FilteredView`)

Crea una variante filtrada de otra vista a partir de etiquetas:

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

### Añadir elementos

| Función | Comportamiento |
|---------|----------------|
| `AddAll()` | Añade todos los elementos del ámbito |
| `AddDefault()` | Añade los elementos relevantes por contexto |
| `Add(element)` | Añade un elemento concreto |
| `AddNeighbors(element)` | Añade el elemento y sus conexiones directas |
| `AddContainers()` | Añade todos los contenedores (`ContainerView`/`ComponentView`) |
| `AddComponents()` | Añade todos los componentes (`ComponentView`) |
| `AddInfluencers()` | Añade contenedores y dependencias externas (`ContainerView`) |

**`AddAll` frente a `AddDefault`**: `AddAll` incluye todo lo que existe en el ámbito. `AddDefault` añade lo habitualmente relevante: en una `SystemContextView`, el sistema más las personas y sistemas directamente relacionados, omitiendo elementos sin conexión.

{{< anchors "eliminar-elementos" >}}
### Excluir elementos

```go
SystemContextView(System, "key", "desc", func() {
    AddAll()
    Remove(InternalTool)              // Remove specific element
    RemoveTagged("internal")          // Remove by tag
    RemoveUnrelated()                 // Remove elements with no relationships
    RemoveUnreachable(MainSystem)     // Remove elements not reachable from MainSystem
})
```

{{< anchors "gestión-de-relaciones" >}}
### Gestionar relaciones

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

Al añadir elementos, puedes indicar coordenadas exactas:

```go
Add(Customer, func() {
    Coord(100, 200)      // X, Y position
    NoRelationship()     // Don't render relationships for this element
})
```

---

## AutoLayout

`AutoLayout` posiciona los elementos automáticamente mediante algoritmos de disposición de grafos:

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

Los estilos se aplican mediante etiquetas. Los elementos y relaciones admiten varias etiquetas y los estilos se combinan en cascada.

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

**Formas disponibles**: `ShapeBox`, `ShapeRoundedBox`, `ShapeCircle`, `ShapeEllipse`, `ShapeHexagon`, `ShapeCylinder`, `ShapePipe`, `ShapePerson`, `ShapeRobot`, `ShapeFolder`, `ShapeWebBrowser`, `ShapeMobileDevicePortrait`, `ShapeMobileDeviceLandscape`, `ShapeComponent`

{{< anchors "estilos-de-relación" >}}
### Estilos de relaciones

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

{{< anchors "soporte-de-temas-css" >}}
### Soporte de temas con CSS

Los archivos SVG exportados incluyen propiedades personalizadas de CSS con valores de respaldo, lo que permite alternar entre tema claro y oscuro sin regenerar los diagramas. Los colores definidos en `ElementStyle` y `RelationshipStyle` se traducen a variables CSS según el nombre de la etiqueta.

**Convención de nombres de variables:**
- Fondo de elementos: `--mdl-<tag>-bg`
- Color de texto de elementos: `--mdl-<tag>-color`
- Borde de elementos: `--mdl-<tag>-stroke`
- Color de relaciones: `--mdl-rel-<tag>-color`

Por ejemplo, esta definición de estilos:

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

**Definición de temas en tu sitio:**

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

Los SVGs funcionan de forma autónoma (gracias a los valores de respaldo) y se adaptan automáticamente cuando se incrustan en páginas que definen estas variables CSS.

**Importante:** Las propiedades personalizadas de CSS solo surten efecto cuando el SVG se inserta en línea dentro del documento HTML. Los SVGs cargados con `<img src="...">` no heredan el CSS de la página contenedora. En sitios Hugo, utiliza el shortcode `diagram` para incrustar SVGs en línea:

```markdown
{{</* diagram name="MyDiagram" */>}}
{{</* diagram name="MyDiagram" caption="System architecture" */>}}
```

---

## Modelado de despliegue

Modela infraestructura y entornos de ejecución:

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

{{< anchors "la-cli-mdl" >}}
## El CLI `mdl`

{{< anchors "mdl-serve---editor-interactivo" >}}
### `mdl serve` — Editor interactivo

```bash
mdl serve ./model -dir gen -port 8080
```

Inicia un editor web en `http://localhost:8080`. Incluye:
- Arrastrar elementos para posicionarlos
- Varios algoritmos de disposición (Layered, Force, Tree, Radial) mediante ELK.js
- Herramientas de alineación y distribución
- Deshacer y rehacer (Ctrl+Z / Ctrl+Shift+Z)
- Exportación a SVG
- Recarga en caliente al cambiar el DSL

**Atajos de teclado** (usa Cmd en Mac):

| Acción | Atajo |
|--------|-------|
| Guardar | Ctrl+S |
| Deshacer | Ctrl+Z |
| Rehacer | Ctrl+Shift+Z |
| Seleccionar todo | Ctrl+A |
| Acercar / alejar | Ctrl++/- o Ctrl+rueda |
| Ajustar a la vista | Ctrl+9 |
| Zoom 100 % | Ctrl+0 |
| Disposición automática | Ctrl+L |
| Mostrar / ocultar cuadrícula | Ctrl+G |
| Ajustar a la cuadrícula | Ctrl+Shift+G |
| Alinear en horizontal | Ctrl+Shift+H |
| Alinear en vertical | Ctrl+Shift+A |
| Añadir vértice | Alt+Clic |

{{< anchors "mdl-gen---exportación-json" >}}
### `mdl gen` — Exportación JSON

```bash
mdl gen ./model -out design.json
```

Exporta el modelo como JSON para integrarlo con otras herramientas.

{{< anchors "mdl-svg---generación-svg-sin-cabeza" >}}
### `mdl svg` — Generación SVG sin interfaz gráfica

```bash
# Generate all views
mdl svg ./model -dir gen --all

# Generate specific views
mdl svg ./model -dir gen --view Context --view Containers

# With layout options
mdl svg ./model -dir gen --all --direction LEFT --compact --timeout 30s
```

Ejecuta un navegador sin cabeza para calcular la disposición y guardar las vistas; ideal para pipelines de CI/CD.

---

{{< anchors "la-stz-cli" >}}
## El CLI `stz`

Sube modelos a [Structurizr](https://structurizr.com):

```bash
# Generate Structurizr workspace JSON
stz gen ./model

# Upload to Structurizr
stz put workspace.json -id WORKSPACE_ID -key API_KEY -secret API_SECRET

# Download from Structurizr
stz get -id WORKSPACE_ID -key API_KEY -secret API_SECRET -out workspace.json
```

---

{{< anchors "goa-plugin" >}}
## Plugin para Goa

Para usar Model junto con Goa, importa su DSL en tu paquete de diseño:

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

var OrdersService = Service("orders", func() {
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

Al ejecutar `goa gen` se generan tanto el código de la API como los artefactos de arquitectura (`design.json` y `workspace.json`).

---

{{< anchors "integración-cicd" >}}
## Integración en CI/CD

{{< anchors "acciones-github" >}}
### GitHub Actions

```yaml
name: Generate Architecture Diagrams
on: [push]

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      
      - uses: actions/setup-go@v6
        with:
          go-version: 'stable'
      
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

{{< anchors "mejores-prácticas" >}}
## Buenas prácticas

### Organizar modelos grandes

Divide arquitecturas extensas en funciones auxiliares repartidas en varios archivos e invócalas dentro de `Design(...)` (`SoftwareSystem` y `Person` deben ejecutarse dentro de un bloque `Design`):

```go
// model/systems.go
package model

import . "goa.design/model/dsl"

func defineSystems() {
    SoftwareSystem("E-Commerce", "Online store", func() {
        // containers...
    })

    SoftwareSystem("Payments", "Payment processing", func() {
        // containers...
    })
}
```

```go
// model/views.go
package model

import . "goa.design/model/dsl"

var _ = Design("Platform", "Company platform architecture", func() {
    defineSystems()

    Views(func() {
        SystemLandscapeView("Landscape", "All systems", func() {
            AddAll()
        })
    })
})
```

### Etiquetado coherente

Define una convención de etiquetas y mantenla en todo el modelo:

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

Exporta funciones auxiliares desde un paquete Go compartido y llámalas dentro del bloque `Design` de tu servicio:

```go
// shared/infrastructure.go
package shared

import . "goa.design/model/dsl"

func DefineStripe() {
    SoftwareSystem("Stripe", "Payment processing", func() {
        External()
        Tag("external", "payments")
    })
}
```

```go
// myservice/model.go
package model

import (
    . "goa.design/model/dsl"
    "mycompany/shared"
)

var _ = Design("My Service", "Checkout architecture", func() {
    shared.DefineStripe()

    SoftwareSystem("My Service", "Handles checkout", func() {
        Uses("Stripe", "Processes payments via", "HTTPS")
    })
})
```

---

## Referencia

- [Documentación del paquete DSL](https://pkg.go.dev/goa.design/model/dsl) — Referencia completa del DSL
- [Repositorio de Model en GitHub](https://github.com/goadesign/model) — Código fuente y ejemplos
- [Modelo C4](https://c4model.com) — Documentación del modelo C4
- [Structurizr](https://structurizr.com) — Alojamiento de diagramas en línea
