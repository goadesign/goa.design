---
title: "Modello"
weight: 1
description: "Architecture diagrams as code using the C4 model - version-controlled, automatically generated, and interactive."
llm_optimized: true
---

Model fornisce un DSL Go per descrivere l'architettura del software secondo il [modello C4] (https://c4model.com). Definisce l'architettura nel codice, la versione insieme al software e genera automaticamente i diagrammi.

## Perché i diagrammi come codice?

I diagrammi di architettura tradizionali sono imputati. Vengono creati con strumenti grafici, sono scollegati dalla base di codice e diventano rapidamente obsoleti. Model risolve questo problema rendendo l'architettura una parte di prima classe del vostro repository:

- **Versione controllata**: Le modifiche all'architettura sono commit git con una cronologia completa
- **Consistente**: Stili e componenti condivisi in tutti i diagrammi
- **Automatizzato**: Generazione di diagrammi in CI/CD, senza schermate manuali
- **Componibile**: Importazione di componenti dell'architettura in tutti i progetti tramite pacchetti Go
- **Rivedibile**: Le modifiche all'architettura passano attraverso la revisione del codice come qualsiasi altro codice

---

## Il modello C4

C4 definisce quattro livelli di astrazione. Il modello supporta i primi tre:

| Livello | Cosa mostra | Elementi di esempio |
|-------|---------------|------------------|
| **Contesto** | Sistema nel suo ambiente | Sistemi software, persone |
| **Contenitore** | Applicazioni all'interno di un sistema | Applicazioni web, API, database, code di messaggi |
| **Componente** | Moduli all'interno di un contenitore | Servizi, controllori, repository |

Il quarto livello (Codice) si riferisce a classi e funzioni vere e proprie, come già mostrato dal vostro IDE.

---

## Installazione

```bash
go install goa.design/model/cmd/mdl@latest
go install goa.design/model/cmd/stz@latest
```

Richiede Go 1.23+.

---

## Avvio rapido

### 1. Creare un pacchetto di modelli

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

### 2. Avviare l'editor

```bash
mdl serve ./model -dir gen
```

Aprire `http://localhost:8080`. Trascinare gli elementi per posizionarli, quindi salvare. L'SVG viene scritto nella cartella `gen/`.

### 3. Generare diagrammi in CI

```bash
mdl svg ./model -dir gen --all
```

Esegue un browser headless per il layout automatico e salva tutte le viste come file SVG.

---

## Concetti fondamentali

### Gerarchia degli elementi

Il modello segue la gerarchia di C4. Gli elementi si annidano all'interno dei loro genitori:

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

### Riferimenti agli elementi

Molte funzioni del DSL accettano riferimenti a elementi. È possibile fare riferimento agli elementi in due modi:

**Per variabile** (quando si dispone di un riferimento):
```go
var API = Container("API", "Backend service", "Go")
var DB = Container("Database", "Stores data", "PostgreSQL")

// Reference by variable
API.Uses(DB, "Reads from", "SQL")
```

**Per percorso** (quando l'elemento è definito altrove):
```go
// Same container, reference sibling by name
Uses("Database", "Reads from", "SQL")

// Different software system, use full path
Uses("Other System/API", "Calls")

// Component in another container
Uses("My System/Other Container/Service", "Invokes")
```

I percorsi usano `/` come separatore. I percorsi relativi funzionano all'interno dell'ambito (contenitori nello stesso sistema, componenti nello stesso contenitore).

### Fusione di elementi

Se si definisce due volte lo stesso elemento (stesso nome e stesso livello), Model li fonde:

```go
var User = Person("User", "First definition", func() {
    Uses("System A", "Uses")
})

var User2 = Person("User", "Updated description", func() {
    Uses("System B", "Also uses")
})
// Result: One "User" person with "Updated description" and both relationships
```

Ciò consente di importare modelli condivisi e di estenderli con relazioni locali.

---

## Sistemi software

Elemento di primo livello che rappresenta un sistema software distribuibile:

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

### Contenitori

Applicazioni, servizi o archivi di dati all'interno di un sistema software:

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

Con Goa, è possibile utilizzare direttamente una definizione di servizio:

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

### Componenti

Moduli all'interno di un contenitore. Utilizzateli per la documentazione tecnica dettagliata:

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

## Persone

Utenti, attori o ruoli che interagiscono con i sistemi:

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

## Relazioni

### Tipi

| Funzione | Da | A | Caso d'uso |
|----------|------|----|---------|
| `Uses` | Qualsiasi elemento | Qualsiasi elemento | Dipendenza generale |
| `Delivers` | Sistema/Contenitore/Componente | Persona | Output agli utenti |
| `InteractsWith` | Persona | Persona | Interazione umana |

### Sintassi

Tutte le funzioni di relazione accettano gli stessi argomenti opzionali:

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

### Esempi

```go
// System uses system
PaymentSystem.Uses(BankAPI, "Processes payments via", "REST/JSON", Synchronous)

// Container uses external system
API.Uses("Stripe/API", "Charges cards", "HTTPS", Asynchronous)

// System delivers to person
NotificationSystem.Delivers(Customer, "Sends order updates to", "Email")
```

---

## Visualizzazioni

Le viste visualizzano sottoinsiemi del modello a diversi livelli di dettaglio.

### Vista orizzontale del sistema

Mostra tutti i sistemi e le persone: il quadro generale:

```go
SystemLandscapeView("Landscape", "Enterprise overview", func() {
    Title("Company Systems")
    AddAll()
    AutoLayout(RankTopBottom)
    EnterpriseBoundaryVisible()  // Shows internal vs external
})
```

### Vista del contesto del sistema

Mostra un sistema e le sue dipendenze dirette:

```go
SystemContextView(ECommerce, "Context", "E-Commerce in context", func() {
    AddAll()                      // Add system + all related elements
    Remove(InternalTooling)       // Exclude specific elements
    AutoLayout(RankLeftRight)
    EnterpriseBoundaryVisible()
})
```

### Vista contenitore

Mostra i contenitori all'interno di un sistema:

```go
ContainerView(ECommerce, "Containers", "E-Commerce containers", func() {
    AddAll()
    SystemBoundariesVisible()  // Shows external system boundaries
    AutoLayout(RankTopBottom)
})
```

### Vista dei componenti

Mostra i componenti all'interno di un contenitore:

```go
ComponentView(API, "Components", "API internals", func() {
    AddAll()
    ContainerBoundariesVisible()  // Shows external container boundaries
    AutoLayout(RankLeftRight)
})
```

### Vista dinamica

Mostra un flusso o uno scenario specifico con interazioni ordinate:

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

L'ambito può essere `Global` (qualsiasi elemento), un sistema software (i suoi contenitori) o un contenitore (i suoi componenti).

### Vista di distribuzione

Mostra come i container vengono distribuiti nell'infrastruttura:

```go
DeploymentView(Global, "Production", "ProdDeployment", "Production setup", func() {
    AddAll()
    AutoLayout(RankLeftRight)
})
```

### Vista filtrata

Crea una versione filtrata di un'altra vista basata sui tag:

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

## Manipolazione della vista

### Aggiunta di elementi

| Funzione | Comportamento |
|----------|----------|
| `AddAll()` | Aggiunge tutto ciò che è nello scope |
| `AddDefault()` | Aggiungere elementi contestualmente rilevanti |
| `Add(element)` | Aggiungi elemento specifico |
| `AddNeighbors(element)` | Aggiungere l'elemento e le sue connessioni dirette |
| `AddContainers()` | Aggiungere tutti i contenitori (ContainerView/ComponentView) |
| `AddComponents()` | Aggiungere tutti i componenti (ComponentView) |
| `AddInfluencers()` | Aggiungere i contenitori + le dipendenze esterne (ContainerView) |

**AddAll vs AddDefault**: `AddAll` aggiunge tutto il possibile nell'ambito. `AddDefault` aggiunge ciò che è tipicamente rilevante: per una SystemContextView, si tratta del sistema più i sistemi e le persone direttamente collegati, ma non gli elementi non collegati.

### Rimozione di elementi

```go
SystemContextView(System, "key", "desc", func() {
    AddAll()
    Remove(InternalTool)              // Remove specific element
    RemoveTagged("internal")          // Remove by tag
    RemoveUnrelated()                 // Remove elements with no relationships
    RemoveUnreachable(MainSystem)     // Remove elements not reachable from MainSystem
})
```

### Gestione delle relazioni

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

### Posizionamento degli elementi

Quando si aggiungono elementi, è possibile specificare le coordinate esatte:

```go
Add(Customer, func() {
    Coord(100, 200)      // X, Y position
    NoRelationship()     // Don't render relationships for this element
})
```

---

## AutoLayout

AutoLayout posiziona automaticamente gli elementi utilizzando algoritmi di layout del grafo:

```go
AutoLayout(RankTopBottom, func() {
    Implementation(ImplementationDagre)  // or ImplementationGraphviz
    RankSeparation(300)   // Pixels between ranks (default: 300)
    NodeSeparation(600)   // Pixels between nodes in same rank (default: 600)
    EdgeSeparation(200)   // Pixels between edges (default: 200)
    RenderVertices()      // Create waypoints on edges
})
```

**Direzioni di rango**: `RankTopBottom`, `RankBottomTop`, `RankLeftRight`, `RankRightLeft`

---

## Stili

Gli stili sono applicati tramite tag. Gli elementi e le relazioni possono avere più tag; gli stili sono a cascata.

### Stili degli elementi

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

**Forme disponibili**: `ShapeBox`, `ShapeRoundedBox`, `ShapeCircle`, `ShapeEllipse`, `ShapeHexagon`, `ShapeCylinder`, `ShapePipe`, `ShapePerson`, `ShapeRobot`, `ShapeFolder`, `ShapeWebBrowser`, `ShapeMobileDevicePortrait`, `ShapeMobileDeviceLandscape`, `ShapeComponent`

### Stili di relazione

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

### Supporto della tematizzazione CSS

Gli SVG esportati includono proprietà personalizzate CSS con valori di fallback, consentendo il supporto di temi chiari/scuri senza rigenerare i diagrammi. I colori definiti in `ElementStyle` e `RelationshipStyle` sono convertiti in variabili CSS in base al nome del tag.

**Convenzione di denominazione delle variabili:**
- Sfondi degli elementi: `--mdl-<tag>-bg`
- Colori del testo degli elementi: `--mdl-<tag>-color`
- Tratti degli elementi: `--mdl-<tag>-stroke`
- Colori delle relazioni: `--mdl-rel-<tag>-color`

Ad esempio, questa definizione di stile:

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

Genera elementi SVG con:

```html
<rect fill="var(--mdl-database-bg, #438DD5)" ... />
<text fill="var(--mdl-database-color, #ffffff)" ... />
<path stroke="var(--mdl-rel-async-color, #707070)" ... />
```

**Implementazione di temi nel sito:**

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

Gli SVG funzionano autonomamente (i valori di fallback vengono visualizzati correttamente) e si adattano automaticamente quando vengono incorporati in pagine che definiscono queste variabili CSS.

**Importante:** Le proprietà personalizzate CSS funzionano solo quando l'SVG è inserito nel documento HTML. Gli SVG caricati tramite `<img src="...">` non ereditano i CSS dalla pagina madre. Per i siti Hugo, utilizzare lo shortcode `diagram` per inserire gli SVG:

```markdown
{{</* diagram name="MyDiagram" */>}}
{{</* diagram name="MyDiagram" caption="System architecture" */>}}
```

---

## Modellazione della distribuzione

Modellare l'infrastruttura e gli ambienti di runtime:

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

## La `mdl` CLI

### `mdl serve` - Editor interattivo

```bash
mdl serve ./model -dir gen -port 8080
```

Avvia un editor basato sul Web a `http://localhost:8080`. Caratteristiche:
- Trascinare gli elementi per posizionarli
- Algoritmi di layout multipli (a strati, a forza, ad albero, radiale) tramite ELK.js
- Strumenti di allineamento e distribuzione
- Annullamento/ripristino (Ctrl+Z / Ctrl+Shift+Z)
- Esportazione SVG
- Ricarica a caldo quando il DSL cambia

**Scorciatoie da tastiera** (usare Cmd su Mac):

| Azione | Scorciatoia |
|--------|----------|
| Salva | Ctrl+S |
| Annulla | Ctrl+Z |
| Ripristina | Ctrl+Shift+Z |
| Seleziona tutto | Ctrl+A |
| Zoom in/out | Ctrl++/- o Ctrl+scroll |
| Adatta alla visualizzazione | Ctrl+9 |
| Zoom al 100% | Ctrl+0 |
| Layout automatico | Ctrl+L |
| Allinea la griglia | Ctrl+G |
| Aggancia alla griglia | Ctrl+Shift+G |
| Allinea orizzontale | Ctrl+Shift+H |
| Allinea verticale | Ctrl+Shift+A |
| Aggiungi vertice | Alt+Click |

### `mdl gen` - Esportazione JSON

```bash
mdl gen ./model -out design.json
```

Esporta il modello come JSON. Utile per l'integrazione con altri strumenti.

### `mdl svg` - Generazione di SVG senza testa

```bash
# Generate all views
mdl svg ./model -dir gen --all

# Generate specific views
mdl svg ./model -dir gen --view Context --view Containers

# With layout options
mdl svg ./model -dir gen --all --direction LEFT --compact --timeout 30s
```

Esegue un browser headless per creare e salvare automaticamente le viste. Ideale per le pipeline CI/CD.

---

## La `stz` CLI

Carica i modelli su [Structurizr] (https://structurizr.com):

```bash
# Generate Structurizr workspace JSON
stz gen ./model

# Upload to Structurizr
stz put workspace.json -id WORKSPACE_ID -key API_KEY -secret API_SECRET

# Download from Structurizr
stz get -id WORKSPACE_ID -key API_KEY -secret API_SECRET -out workspace.json
```

---

## Plugin Goa

Quando si usa Model con Goa, aggiungere l'importazione DSL al pacchetto di progettazione:

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

L'esecuzione di `goa gen` produce sia il codice API che i diagrammi di architettura (`design.json` e `workspace.json`).

---

## Integrazione CI/CD

### Azioni GitHub

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

## Migliori pratiche

### Organizzare modelli di grandi dimensioni

Dividere i modelli in più file:

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

### Etichettatura coerente

Definite una convenzione per i tag e attenetevi ad essa:

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

### Importazione di componenti condivisi

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

## Riferimento

- [Documentazione del pacchetto DSL](https://pkg.go.dev/goa.design/model/dsl) - Riferimento completo al DSL
- [Model GitHub Repository](https://github.com/goadesign/model) - Codice sorgente ed esempi
- [Modello C4](https://c4model.com) - Documentazione del modello C4
- [Structurizr](https://structurizr.com) - Hosting di diagrammi online
