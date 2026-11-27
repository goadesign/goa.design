---
title: "Model"
weight: 1
description: "Diagrammes d’architecture sous forme de code selon le modèle C4 — versionnés avec Git, générés automatiquement et éditables interactivement."
llm_optimized: true
---

Model fournit un DSL Go permettant de décrire une architecture logicielle selon le [modèle C4](https://c4model.com). Définissez votre architecture en code, versionnez-la aux côtés de vos services et générez vos diagrammes automatiquement.

{{< anchors "pourquoi-des-diagrammes-en-tant-que-code-" >}}
## Pourquoi décrire ses diagrammes en code ?

Les diagrammes d’architecture dessinés à la main vieillissent mal : créés dans des outils graphiques déconnectés du code source, ils deviennent vite obsolètes. Model fait de l’architecture un citoyen de première classe de votre dépôt :

- **Versionné** : Chaque évolution d’architecture est un commit Git doté d’un historique complet
- **Cohérent** : Styles et composants partagés entre tous les diagrammes
- **Automatisé** : Génération des diagrammes en CI/CD — sans captures d’écran manuelles
- **Composable** : Réutilisation de composants d’architecture entre projets via des packages Go
- **Relu en revue de code** : Les changements d’architecture suivent le même processus de relecture que le reste du code

---

## Le modèle C4

C4 définit quatre niveaux d’abstraction. Model prend en charge les trois premiers :

| Niveau | Ce qu’il représente | Exemples d’éléments |
|--------|---------------------|---------------------|
| **Contexte** | Le système dans son environnement | Systèmes logiciels, personnes |
| **Conteneur** | Les applications composant un système | Applications web, API, bases de données, files de messages |
| **Composant** | Les modules au sein d’un conteneur | Services, contrôleurs, dépôts de données |

Le quatrième niveau (*Code*) correspond directement aux types et fonctions que votre IDE affiche déjà.

---

## Installation

```bash
go install goa.design/model/cmd/mdl@latest
go install goa.design/model/cmd/stz@latest
```

Nécessite Go 1.27+.

---

## Démarrage rapide

{{< anchors "1-créer-un-paquet-de-modèles" >}}
### 1. Créer un package de modèle

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

{{< anchors "2-lancer-léditeur" >}}
### 2. Lancer l’éditeur interactif

```bash
mdl serve ./model -dir gen
```

Ouvrez `http://localhost:8080`. Faites glisser les éléments pour ajuster leur position, puis enregistrez : le fichier SVG est écrit dans le répertoire `gen/`.

{{< anchors "3-générer-des-diagrammes-dans-ci" >}}
### 3. Générer les diagrammes en CI

```bash
mdl svg ./model -dir gen --all
```

Cette commande exécute un navigateur sans interface graphique (*headless*) pour calculer la mise en page automatique et enregistrer toutes les vues au format SVG.

---

{{< anchors "concepts-de-base" >}}
## Concepts fondamentaux

### Hiérarchie des éléments

Model suit la hiérarchie C4 ; chaque élément s’imbrique dans son parent :

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

{{< anchors "références-des-éléments" >}}
### Référencer des éléments

De nombreuses fonctions du DSL acceptent des références d’éléments, exprimables de deux façons :

**Par variable** (en appelant `Uses` dans la fermeture DSL de l’élément source) :
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

**Par chemin** (lorsque l’élément est déclaré ailleurs) :
```go
// Same container, reference sibling by name
Uses("Database", "Reads from", "SQL")

// Different software system, use full path
Uses("Other System/API", "Calls")

// Component in another container
Uses("My System/Other Container/Service", "Invokes")
```

Les chemins utilisent `/` comme séparateur. Les chemins relatifs fonctionnent au sein de la portée courante (conteneurs d’un même système, composants d’un même conteneur).

### Fusion d’éléments

Si vous déclarez deux fois le même élément (même nom au même niveau), Model fusionne les deux définitions :

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

Cela permet d’importer des modèles partagés et de les enrichir localement avec de nouvelles relations.

---

{{< anchors "systèmes-logiciels" >}}
## Systèmes logiciels (`SoftwareSystem`)

Élément de premier niveau représentant un système logiciel déployable :

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

{{< anchors "conteneurs" >}}
### Conteneurs (`Container`)

Applications, services ou magasins de données au sein d’un système logiciel :

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

Avec Goa, vous pouvez passer directement une définition de service :

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

{{< anchors "composants" >}}
### Composants (`Component`)

Modules internes d’un conteneur, utiles pour documenter l’architecture interne détaillée :

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

{{< anchors "personnes" >}}
## Personnes (`Person`)

Utilisateurs, acteurs ou rôles interagissant avec les systèmes :

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

{{< anchors "relationships" >}}
## Relations

{{< anchors "types" >}}
### Types de relations

| Fonction | Source | Cible | Cas d’usage |
|----------|--------|-------|-------------|
| `Uses` | Tout élément | Tout élément | Dépendance générale |
| `Delivers` | Système / Conteneur / Composant | Personne | Envoi d’informations à un utilisateur |
| `InteractsWith` | Personne | Personne | Interaction humaine |

### Syntaxe

Toutes les fonctions de relation acceptent les mêmes arguments optionnels :

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

### Exemples

Appelez `Uses`, `Delivers` et `InteractsWith` à l’intérieur de la fermeture DSL de l’élément source :

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

## Vues

Les vues affichent des sous-ensembles de votre modèle à différents niveaux de détail.

{{< anchors "vue-du-paysage-du-système" >}}
### Vue de paysage système (`SystemLandscapeView`)

Présente l’ensemble des systèmes et des personnes à l’échelle de l’organisation :

```go
SystemLandscapeView("Landscape", "Enterprise overview", func() {
    Title("Company Systems")
    AddAll()
    AutoLayout(RankTopBottom)
    EnterpriseBoundaryVisible()  // Shows internal vs external
})
```

{{< anchors "vue-du-contexte-du-système" >}}
### Vue de contexte système (`SystemContextView`)

Présente un système et ses dépendances directes :

```go
SystemContextView(ECommerce, "Context", "E-Commerce in context", func() {
    AddAll()                      // Add system + all related elements
    Remove(InternalTooling)       // Exclude specific elements
    AutoLayout(RankLeftRight)
    EnterpriseBoundaryVisible()
})
```

{{< anchors "vue-du-conteneur" >}}
### Vue des conteneurs (`ContainerView`)

Présente les conteneurs composant un système :

```go
ContainerView(ECommerce, "Containers", "E-Commerce containers", func() {
    AddAll()
    SystemBoundariesVisible()  // Shows external system boundaries
    AutoLayout(RankTopBottom)
})
```

{{< anchors "vue-des-composants" >}}
### Vue des composants (`ComponentView`)

Présente les composants internes d’un conteneur :

```go
ComponentView(API, "Components", "API internals", func() {
    AddAll()
    ContainerBoundariesVisible()  // Shows external container boundaries
    AutoLayout(RankLeftRight)
})
```

{{< anchors "vue-dynamique" >}}
### Vue dynamique (`DynamicView`)

Illustre un scénario ou un flux précis sous forme d’interactions ordonnées :

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

La portée peut être `Global` (n’importe quel élément), un système logiciel (ses conteneurs) ou un conteneur (ses composants).

{{< anchors "vue-du-déploiement" >}}
### Vue de déploiement (`DeploymentView`)

Montre comment les conteneurs sont déployés sur l’infrastructure :

```go
DeploymentView(Global, "Production", "ProdDeployment", "Production setup", func() {
    AddAll()
    AutoLayout(RankLeftRight)
})
```

{{< anchors "vue-filtrée" >}}
### Vue filtrée (`FilteredView`)

Dérive une version filtrée d’une vue existante à partir de tags :

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

{{< anchors "manipulation-de-vues" >}}
## Manipulation des vues

{{< anchors "ajout-déléments" >}}
### Ajouter des éléments

| Fonction | Comportement |
|----------|--------------|
| `AddAll()` | Ajoute tous les éléments de la portée |
| `AddDefault()` | Ajoute les éléments contextuellement pertinents |
| `Add(element)` | Ajoute un élément précis |
| `AddNeighbors(element)` | Ajoute un élément et ses voisins directs |
| `AddContainers()` | Ajoute tous les conteneurs (`ContainerView` / `ComponentView`) |
| `AddComponents()` | Ajoute tous les composants (`ComponentView`) |
| `AddInfluencers()` | Ajoute les conteneurs et leurs dépendances externes (`ContainerView`) |

**`AddAll` vs `AddDefault`** : `AddAll` inclut tous les éléments présents dans la portée. `AddDefault` n’ajoute que ce qui est généralement pertinent — pour une `SystemContextView`, le système cible ainsi que les systèmes et personnes directement reliés, sans les éléments isolés.

{{< anchors "suppression-déléments" >}}
### Retirer des éléments

```go
SystemContextView(System, "key", "desc", func() {
    AddAll()
    Remove(InternalTool)              // Remove specific element
    RemoveTagged("internal")          // Remove by tag
    RemoveUnrelated()                 // Remove elements with no relationships
    RemoveUnreachable(MainSystem)     // Remove elements not reachable from MainSystem
})
```

{{< anchors "gestion-des-relations" >}}
### Gérer les relations

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

{{< anchors "positionnement-des-éléments" >}}
### Positionner les éléments

Lors de l’ajout d’un élément, vous pouvez fixer ses coordonnées exactes :

```go
Add(Customer, func() {
    Coord(100, 200)      // X, Y position
    NoRelationship()     // Don't render relationships for this element
})
```

---

{{< anchors "autolayout" >}}
## Mise en page automatique (`AutoLayout`)

`AutoLayout` dispose automatiquement les éléments à l’aide d’algorithmes de graphes :

```go
AutoLayout(RankTopBottom, func() {
    Implementation(ImplementationDagre)  // or ImplementationGraphviz
    RankSeparation(300)   // Pixels between ranks (default: 300)
    NodeSeparation(600)   // Pixels between nodes in same rank (default: 600)
    EdgeSeparation(200)   // Pixels between edges (default: 200)
    RenderVertices()      // Create waypoints on edges
})
```

**Orientations disponibles** : `RankTopBottom`, `RankBottomTop`, `RankLeftRight`, `RankRightLeft`

---

## Styles

Les styles s’appliquent via des tags. Un élément ou une relation peut porter plusieurs tags ; les styles se combinent en cascade.

{{< anchors "styles-déléments" >}}
### Styles d’éléments (`ElementStyle`)

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

**Formes disponibles** : `ShapeBox`, `ShapeRoundedBox`, `ShapeCircle`, `ShapeEllipse`, `ShapeHexagon`, `ShapeCylinder`, `ShapePipe`, `ShapePerson`, `ShapeRobot`, `ShapeFolder`, `ShapeWebBrowser`, `ShapeMobileDevicePortrait`, `ShapeMobileDeviceLandscape`, `ShapeComponent`

{{< anchors "styles-de-relation" >}}
### Styles de relations (`RelationshipStyle`)

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

{{< anchors "prise-en-charge-de-lhabillage-css" >}}
### Prise en charge des thèmes CSS

Les SVG exportés incluent des variables CSS personnalisées assorties de valeurs de repli, permettant de basculer entre thème clair et thème sombre sans régénérer les diagrammes. Les couleurs déclarées dans `ElementStyle` et `RelationshipStyle` sont converties en variables CSS dérivées du nom du tag.

**Convention de nommage des variables :**
- Arrière-plan d’élément : `--mdl-<tag>-bg`
- Couleur de texte d’élément : `--mdl-<tag>-color`
- Contour d’élément : `--mdl-<tag>-stroke`
- Couleur de relation : `--mdl-rel-<tag>-color`

Par exemple, cette définition de style :

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

Génère des éléments SVG de la forme :

```html
<rect fill="var(--mdl-database-bg, #438DD5)" ... />
<text fill="var(--mdl-database-color, #ffffff)" ... />
<path stroke="var(--mdl-rel-async-color, #707070)" ... />
```

**Définir les thèmes sur votre site :**

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

Les fichiers SVG restent autonomes grâce aux valeurs de repli et s’adaptent automatiquement lorsqu’ils sont intégrés dans une page définissant ces variables CSS.

**Important :** Les propriétés CSS personnalisées ne s’appliquent que lorsque le SVG est injecté en ligne (*inline*) dans le document HTML ; un SVG chargé via `<img src="...">` n’hérite pas des styles de la page parente. Sur un site Hugo, utilisez le shortcode `diagram` pour intégrer les SVG en ligne :

```markdown
{{</* diagram name="MyDiagram" */>}}
{{</* diagram name="MyDiagram" caption="System architecture" */>}}
```

---

## Modélisation du déploiement

Modélisez votre infrastructure et vos environnements d’exécution :

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

{{< anchors "le-mdl-cli" >}}
## La CLI `mdl`

{{< anchors "mdl-serve---léditeur-interactif" >}}
### `mdl serve` — Éditeur interactif

```bash
mdl serve ./model -dir gen -port 8080
```

Démarre un éditeur web sur `http://localhost:8080`. Fonctionnalités :
- Déplacement des éléments par glisser-déposer
- Plusieurs algorithmes de disposition (Layered, Force, Tree, Radial) via ELK.js
- Outils d’alignement et de distribution
- Annuler / rétablir (Ctrl+Z / Ctrl+Maj+Z)
- Export SVG
- Rechargement à chaud lorsque le DSL change

**Raccourcis clavier** (remplacez Ctrl par Cmd sur macOS) :

| Action | Raccourci |
|--------|-----------|
| Enregistrer | Ctrl+S |
| Annuler | Ctrl+Z |
| Rétablir | Ctrl+Shift+Z |
| Tout sélectionner | Ctrl+A |
| Zoom avant / arrière | Ctrl++/- ou Ctrl+molette |
| Ajuster à la vue | Ctrl+9 |
| Zoom 100 % | Ctrl+0 |
| Mise en page automatique | Ctrl+L |
| Afficher / masquer la grille | Ctrl+G |
| Magnétisme sur la grille | Ctrl+Shift+G |
| Aligner horizontalement | Ctrl+Shift+H |
| Aligner verticalement | Ctrl+Shift+A |
| Ajouter un point d’inflexion | Alt+Clic |

{{< anchors "mdl-gen---exportation-json" >}}
### `mdl gen` — Export JSON

```bash
mdl gen ./model -out design.json
```

Exporte le modèle au format JSON pour l’intégrer à d’autres outils.

{{< anchors "mdl-svg---génération-de-svg-sans-tête" >}}
### `mdl svg` — Génération SVG sans interface graphique

```bash
# Generate all views
mdl svg ./model -dir gen --all

# Generate specific views
mdl svg ./model -dir gen --view Context --view Containers

# With layout options
mdl svg ./model -dir gen --all --direction LEFT --compact --timeout 30s
```

Exécute un navigateur sans tête pour calculer la disposition et enregistrer les vues — idéal dans les pipelines CI/CD.

---

{{< anchors "linterface-de-programmation-stz-cli" >}}
## La CLI `stz`

Synchronisez vos modèles avec [Structurizr](https://structurizr.com) :

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
## Plugin Goa

Lorsque vous utilisez Model avec Goa, ajoutez l’import du DSL Model dans votre package de conception :

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

L’exécution de `goa gen` génère alors à la fois le code API et les fichiers du modèle d’architecture (`design.json` et `workspace.json`).

---

## Intégration CI/CD

{{< anchors "actions-github" >}}
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

{{< anchors "meilleures-pratiques" >}}
## Bonnes pratiques

### Organiser les grands modèles

Découpez les architectures volumineuses en fonctions auxiliaires réparties sur plusieurs fichiers, puis appelez-les à l’intérieur de `Design(...)` (`SoftwareSystem` et `Person` doivent s’exécuter dans une fermeture `Design`) :

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

{{< anchors "balisage-cohérent" >}}
### Convention de tags homogène

Adoptez une convention de tags et tenez-vous-y :

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

### Importer des composants partagés

Exportez des fonctions d’aide depuis un package Go partagé et appelez-les dans le bloc `Design` de votre service :

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

## Référence

- [Documentation du package DSL](https://pkg.go.dev/goa.design/model/dsl) — Référence complète du DSL
- [Dépôt GitHub Model](https://github.com/goadesign/model) — Code source et exemples
- [Modèle C4](https://c4model.com) — Documentation officielle du modèle C4
- [Structurizr](https://structurizr.com) — Hébergement de diagrammes en ligne
