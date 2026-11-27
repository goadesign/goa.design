---
title: "Model"
weight: 1
description: "Diagrammi di architettura come codice con il modello C4 — versionati, generati automaticamente e interattivi."
llm_optimized: true
---

Model fornisce un DSL Go per descrivere l'architettura del software secondo il [modello C4](https://c4model.com). Definisci l'architettura nel codice, versionala insieme al software e genera i diagrammi automaticamente.

## Perché i diagrammi come codice?

I diagrammi di architettura tradizionali invecchiano in fretta: creati in strumenti grafici separati dalla codebase, diventano rapidamente obsoleti. Model risolve il problema rendendo l'architettura un cittadino di prima classe del repository:

- **Sotto controllo di versione**: Le modifiche architetturali sono commit Git con cronologia completa
- **Coerente**: Stili e componenti condivisi tra tutti i diagrammi
- **Automatizzato**: Genera i diagrammi in CI/CD senza screenshot manuali
- **Componibile**: Importa componenti architetturali tra progetti tramite pacchetti Go
- **Revisionabile**: Le modifiche all'architettura passano dalla code review come qualsiasi altro codice

---

## Il modello C4

C4 definisce quattro livelli di astrazione. Model supporta i primi tre:

| Livello | Cosa mostra | Elementi tipici |
|-------|---------------|------------------|
| **Context** | Il sistema nel suo ambiente | Sistemi software, persone |
| **Container** | Le applicazioni dentro un sistema | Web app, API, database, code di messaggi |
| **Component** | I moduli dentro un container | Servizi, controller, repository |

Il quarto livello (Code) corrisponde a tipi e funzioni reali, che il tuo IDE mostra già direttamente.

---

## Installazione

```bash
go install goa.design/model/cmd/mdl@latest
go install goa.design/model/cmd/stz@latest
```

Richiede Go 1.27+.

---

## Avvio rapido

{{< anchors "1-creare-un-pacchetto-di-modelli" >}}
### 1. Crea un pacchetto Model

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

{{< anchors "2-avviare-leditor" >}}
### 2. Avvia l'editor

```bash
mdl serve ./model -dir gen
```

Apri `http://localhost:8080`. Trascina gli elementi per posizionarli e salva: l'SVG viene scritto nella cartella `gen/`.

{{< anchors "3-generare-diagrammi-in-ci" >}}
### 3. Genera i diagrammi in CI

```bash
mdl svg ./model -dir gen --all
```

Esegue un browser headless per applicare il layout automatico e salvare tutte le viste come file SVG.

---

## Concetti fondamentali

### Gerarchia degli elementi

Model segue la gerarchia di C4; ogni elemento si annida all'interno del proprio genitore:

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

Molte funzioni del DSL accettano riferimenti agli elementi. Puoi referenziarli in due modi:

**Per variabile** (chiama `Uses` dentro la funzione DSL dell'elemento sorgente):
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

**Per percorso** (quando l'elemento è definito altrove):
```go
// Same container, reference sibling by name
Uses("Database", "Reads from", "SQL")

// Different software system, use full path
Uses("Other System/API", "Calls")

// Component in another container
Uses("My System/Other Container/Service", "Invokes")
```

I percorsi usano `/` come separatore. I percorsi relativi funzionano all'interno dello stesso ambito (container nello stesso sistema, componenti nello stesso container).

{{< anchors "fusione-di-elementi" >}}
### Unione degli elementi

Se definisci due volte lo stesso elemento (stesso nome allo stesso livello), Model unisce le definizioni:

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

Questo permette di importare modelli condivisi ed estenderli con relazioni locali.

---

## Sistemi software

L'elemento di primo livello che rappresenta un sistema software distribuibile:

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

{{< anchors "contenitori" >}}
### Container

Applicazioni, servizi o data store all'interno di un sistema software:

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

Con Goa puoi passare direttamente una definizione di servizio:

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

### Componenti

Moduli all'interno di un container, ideali per documentare la struttura tecnica interna:

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

## Persone

Utenti, attori o ruoli che interagiscono con i sistemi:

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

## Relazioni

### Tipi

| Funzione | Da | A | Caso d'uso |
|----------|------|----|---------|
| `Uses` | Qualsiasi elemento | Qualsiasi elemento | Dipendenza generica |
| `Delivers` | Sistema/Container/Componente | Persona | Invio di output agli utenti |
| `InteractsWith` | Persona | Persona | Interazione tra persone |

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

Chiama `Uses`, `Delivers` e `InteractsWith` dentro la closure DSL dell'elemento sorgente:

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

{{< anchors "visualizzazioni" >}}
## Viste

Le viste rappresentano sottoinsiemi del modello a diversi livelli di dettaglio.

{{< anchors "vista-orizzontale-del-sistema" >}}
### System Landscape View

Mostra tutti i sistemi e le persone — la visione d'insieme:

```go
SystemLandscapeView("Landscape", "Enterprise overview", func() {
    Title("Company Systems")
    AddAll()
    AutoLayout(RankTopBottom)
    EnterpriseBoundaryVisible()  // Shows internal vs external
})
```

{{< anchors "vista-del-contesto-del-sistema" >}}
### System Context View

Mostra un sistema e le sue dipendenze dirette:

```go
SystemContextView(ECommerce, "Context", "E-Commerce in context", func() {
    AddAll()                      // Add system + all related elements
    Remove(InternalTooling)       // Exclude specific elements
    AutoLayout(RankLeftRight)
    EnterpriseBoundaryVisible()
})
```

{{< anchors "vista-contenitore" >}}
### Container View

Mostra i container all'interno di un sistema:

```go
ContainerView(ECommerce, "Containers", "E-Commerce containers", func() {
    AddAll()
    SystemBoundariesVisible()  // Shows external system boundaries
    AutoLayout(RankTopBottom)
})
```

{{< anchors "vista-dei-componenti" >}}
### Component View

Mostra i componenti all'interno di un container:

```go
ComponentView(API, "Components", "API internals", func() {
    AddAll()
    ContainerBoundariesVisible()  // Shows external container boundaries
    AutoLayout(RankLeftRight)
})
```

{{< anchors "vista-dinamica" >}}
### Dynamic View

Mostra un flusso o uno scenario specifico con interazioni ordinate:

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

Lo scope può essere `Global` (qualsiasi elemento), un sistema software (i suoi container) o un container (i suoi componenti).

{{< anchors "vista-di-distribuzione" >}}
### Deployment View

Mostra come i container vengono distribuiti sull'infrastruttura:

```go
DeploymentView(Global, "Production", "ProdDeployment", "Production setup", func() {
    AddAll()
    AutoLayout(RankLeftRight)
})
```

{{< anchors "vista-filtrata" >}}
### Filtered View

Crea una versione filtrata di un'altra vista in base ai tag:

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

{{< anchors "manipolazione-della-vista" >}}
## Manipolazione delle viste

{{< anchors "aggiunta-di-elementi" >}}
### Aggiungere elementi

| Funzione | Comportamento |
|----------|----------|
| `AddAll()` | Aggiunge tutti gli elementi nello scope |
| `AddDefault()` | Aggiunge gli elementi contestualmente rilevanti |
| `Add(element)` | Aggiunge un elemento specifico |
| `AddNeighbors(element)` | Aggiunge l'elemento e le sue connessioni dirette |
| `AddContainers()` | Aggiunge tutti i container (`ContainerView` / `ComponentView`) |
| `AddComponents()` | Aggiunge tutti i componenti (`ComponentView`) |
| `AddInfluencers()` | Aggiunge i container + le dipendenze esterne (`ContainerView`) |

**`AddAll` vs `AddDefault`**: `AddAll` include tutto ciò che appartiene allo scope; `AddDefault` include solo ciò che è normalmente rilevante — per una `SystemContextView`, il sistema insieme ai sistemi e alle persone direttamente collegati, escludendo gli elementi isolati.

{{< anchors "rimozione-di-elementi" >}}
### Rimuovere elementi

```go
SystemContextView(System, "key", "desc", func() {
    AddAll()
    Remove(InternalTool)              // Remove specific element
    RemoveTagged("internal")          // Remove by tag
    RemoveUnrelated()                 // Remove elements with no relationships
    RemoveUnreachable(MainSystem)     // Remove elements not reachable from MainSystem
})
```

{{< anchors "gestione-delle-relazioni" >}}
### Gestire le relazioni

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

Quando aggiungi un elemento puoi specificare coordinate esatte:

```go
Add(Customer, func() {
    Coord(100, 200)      // X, Y position
    NoRelationship()     // Don't render relationships for this element
})
```

---

## AutoLayout

`AutoLayout` posiziona automaticamente gli elementi tramite algoritmi di layout su grafo:

```go
AutoLayout(RankTopBottom, func() {
    Implementation(ImplementationDagre)  // or ImplementationGraphviz
    RankSeparation(300)   // Pixels between ranks (default: 300)
    NodeSeparation(600)   // Pixels between nodes in same rank (default: 600)
    EdgeSeparation(200)   // Pixels between edges (default: 200)
    RenderVertices()      // Create waypoints on edges
})
```

**Direzioni disponibili**: `RankTopBottom`, `RankBottomTop`, `RankLeftRight`, `RankRightLeft`

---

## Stili

Gli stili vengono applicati tramite tag. Elementi e relazioni possono avere più tag e gli stili si compongono in cascata.

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

{{< anchors "stili-di-relazione" >}}
### Stili delle relazioni

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

{{< anchors "supporto-della-tematizzazione-css" >}}
### Tematizzazione CSS

Gli SVG esportati includono custom property CSS con valori di fallback, abilitando il supporto per tema chiaro e scuro senza rigenerare i diagrammi. I colori definiti in `ElementStyle` e `RelationshipStyle` vengono convertiti in variabili CSS basate sul nome del tag.

**Convenzione sui nomi delle variabili:**
- Sfondi degli elementi: `--mdl-<tag>-bg`
- Colori del testo degli elementi: `--mdl-<tag>-color`
- Contorni degli elementi: `--mdl-<tag>-stroke`
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

**Implementare i temi nel tuo sito:**

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

Gli SVG funzionano anche standalone (grazie ai valori di fallback) e si adattano automaticamente quando incorporati in pagine che definiscono queste variabili CSS.

**Importante:** Le custom property CSS funzionano solo quando l'SVG è incorporato inline nel documento HTML; gli SVG caricati tramite `<img src="...">` non ereditano il CSS della pagina padre. Nei siti Hugo usa lo shortcode `diagram` per incorporare gli SVG inline:

```markdown
{{</* diagram name="MyDiagram" */>}}
{{</* diagram name="MyDiagram" caption="System architecture" */>}}
```

---

{{< anchors "modellazione-della-distribuzione" >}}
## Modellazione del deployment

Modella infrastruttura e ambienti di esecuzione:

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

{{< anchors "la-mdl-cli" >}}
## La CLI `mdl`

{{< anchors "mdl-serve---editor-interattivo" >}}
### `mdl serve` — Editor interattivo

```bash
mdl serve ./model -dir gen -port 8080
```

Avvia un editor web su `http://localhost:8080`. Funzionalità principali:
- Trascinamento degli elementi per posizionarli
- Più algoritmi di layout (Layered, Force, Tree, Radial) tramite ELK.js
- Strumenti di allineamento e distribuzione
- Annulla/ripristina (Ctrl+Z / Ctrl+Shift+Z)
- Esportazione SVG
- Hot reload quando il DSL cambia

**Scorciatoie da tastiera** (usa Cmd su Mac):

| Azione | Scorciatoia |
|--------|----------|
| Salva | Ctrl+S |
| Annulla | Ctrl+Z |
| Ripristina | Ctrl+Shift+Z |
| Seleziona tutto | Ctrl+A |
| Zoom avanti/indietro | Ctrl++/- o Ctrl+rotellina |
| Adatta alla vista | Ctrl+9 |
| Zoom 100% | Ctrl+0 |
| Layout automatico | Ctrl+L |
| Mostra/nascondi griglia | Ctrl+G |
| Aggancia alla griglia | Ctrl+Shift+G |
| Allinea in orizzontale | Ctrl+Shift+H |
| Allinea in verticale | Ctrl+Shift+A |
| Aggiungi vertice | Alt+Click |

{{< anchors "mdl-gen---esportazione-json" >}}
### `mdl gen` — Esportazione JSON

```bash
mdl gen ./model -out design.json
```

Esporta il modello in formato JSON, utile per l'integrazione con altri strumenti.

{{< anchors "mdl-svg---generazione-di-svg-senza-testa" >}}
### `mdl svg` — Generazione SVG headless

```bash
# Generate all views
mdl svg ./model -dir gen --all

# Generate specific views
mdl svg ./model -dir gen --view Context --view Containers

# With layout options
mdl svg ./model -dir gen --all --direction LEFT --compact --timeout 30s
```

Esegue un browser headless per applicare il layout automatico e salvare le viste, ideale nelle pipeline CI/CD.

---

{{< anchors "la-stz-cli" >}}
## La CLI `stz`

Carica e scarica modelli su [Structurizr](https://structurizr.com):

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

Quando usi Model insieme a Goa, aggiungi l'importazione del DSL al tuo pacchetto `design`:

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

L'esecuzione di `goa gen` produce sia il codice dell'API sia gli artefatti dei diagrammi di architettura (`design.json` e `workspace.json`).

---

## Integrazione CI/CD

{{< anchors "azioni-github" >}}
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

{{< anchors "migliori-pratiche" >}}
## Best practice

### Organizzare modelli di grandi dimensioni

Suddividi le architetture ampie in funzioni helper su più file e invocale dentro `Design(...)` (`SoftwareSystem` e `Person` devono essere eseguiti all'interno di una closure `Design`):

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

{{< anchors "etichettatura-coerente" >}}
### Convenzioni coerenti sui tag

Definisci una convenzione di tagging e mantienila uniforme:

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

{{< anchors "importazione-di-componenti-condivisi" >}}
### Importare componenti condivisi

Esporta funzioni helper da un pacchetto Go condiviso e chiamale dentro il blocco `Design` del tuo servizio:

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

{{< anchors "riferimento" >}}
## Riferimenti

- [Documentazione del pacchetto DSL](https://pkg.go.dev/goa.design/model/dsl) — Riferimento completo del DSL
- [Repository GitHub di Model](https://github.com/goadesign/model) — Codice sorgente ed esempi
- [Modello C4](https://c4model.com) — Documentazione del modello C4
- [Structurizr](https://structurizr.com) — Hosting online per i diagrammi
