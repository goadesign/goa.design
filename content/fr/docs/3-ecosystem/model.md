---
title: "Modèle"
weight: 1
description: "Architecture diagrams as code using the C4 model - version-controlled, automatically generated, and interactive."
llm_optimized: true
---

Model fournit un DSL Go pour décrire l'architecture logicielle selon le [modèle C4] (https://c4model.com). Définissez votre architecture en code, versionnez-la en même temps que votre logiciel et générez des diagrammes automatiquement.

## Pourquoi des diagrammes en tant que code ?

Les diagrammes d'architecture traditionnels pourrissent. Ils sont créés dans des outils graphiques, déconnectés de la base de code, et deviennent rapidement obsolètes. Model résout ce problème en faisant de l'architecture un élément de premier ordre de votre référentiel :

- **Contrôlé par la version** : Les changements d'architecture sont des commits git avec un historique complet
- **Cohérent** : Styles et composants partagés dans tous les diagrammes
- **Automatisé** : Générer des diagrammes en CI/CD - pas de captures d'écran manuelles
- **Composable** : Importation de composants d'architecture dans tous les projets via des paquets Go
- **Révisable** : Les changements d'architecture passent par la revue de code comme tout autre code

---

## Le modèle C4

C4 définit quatre niveaux d'abstraction. Le modèle prend en charge les trois premiers :

| Le modèle prend en charge les trois premiers : - le niveau - ce qu'il montre - les éléments d'exemple - le niveau - le niveau
|-------|---------------|------------------|
| Le système dans son environnement - Les systèmes logiciels, les personnes - Le système dans son environnement - Le système dans son environnement
| Les applications au sein d'un système - applications Web, API, bases de données, files d'attente de messages - sont des éléments de base du système
| **Composant** | Modules au sein d'un conteneur | Services, contrôleurs, référentiels |

Le quatrième niveau (Code) correspond à des classes et des fonctions réelles - votre IDE le montre déjà.

---

## Installation

```bash
go install goa.design/model/cmd/mdl@latest
go install goa.design/model/cmd/stz@latest
```

Nécessite Go 1.23+.

---

## Démarrage rapide

### 1. Créer un paquet de modèles

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

### 2. Lancer l'éditeur

```bash
mdl serve ./model -dir gen
```

Ouvrez `http://localhost:8080`. Faites glisser les éléments pour les positionner, puis enregistrez. Le SVG est écrit dans le répertoire `gen/`.

### 3. Générer des diagrammes dans CI

```bash
mdl svg ./model -dir gen --all
```

Ceci exécute un navigateur sans tête pour mettre en page automatiquement et enregistrer toutes les vues en tant que fichiers SVG.

---

## Concepts de base

### Hiérarchie des éléments

Le modèle suit la hiérarchie de C4. Les éléments s'imbriquent dans leurs parents :

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

### Références des éléments

De nombreuses fonctions DSL acceptent des références à des éléments. Vous pouvez référencer les éléments de deux manières :

**par variable** (lorsque vous disposez d'une référence) :
```go
var API = Container("API", "Backend service", "Go")
var DB = Container("Database", "Stores data", "PostgreSQL")

// Reference by variable
API.Uses(DB, "Reads from", "SQL")
```

**par chemin** (lorsque l'élément est défini ailleurs) :
```go
// Same container, reference sibling by name
Uses("Database", "Reads from", "SQL")

// Different software system, use full path
Uses("Other System/API", "Calls")

// Component in another container
Uses("My System/Other Container/Service", "Invokes")
```

Les chemins utilisent `/` comme séparateur. Les chemins relatifs fonctionnent à l'intérieur du champ d'application (conteneurs dans le même système, composants dans le même conteneur).

### Fusion d'éléments

Si vous définissez deux fois le même élément (même nom au même niveau), Model les fusionne :

```go
var User = Person("User", "First definition", func() {
    Uses("System A", "Uses")
})

var User2 = Person("User", "Updated description", func() {
    Uses("System B", "Also uses")
})
// Result: One "User" person with "Updated description" and both relationships
```

Cela permet d'importer des modèles partagés et de les étendre avec des relations locales.

---

## Systèmes logiciels

L'élément de premier niveau représentant un système logiciel déployable :

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

### Conteneurs

Applications, services ou magasins de données au sein d'un système logiciel :

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

Avec Goa, vous pouvez utiliser directement une définition de service :

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

### Composants

Modules à l'intérieur d'un conteneur. Utilisez-les pour une documentation technique détaillée :

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

## Personnes

Utilisateurs, acteurs ou rôles qui interagissent avec les systèmes :

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

| Fonction - De - A - Cas d'utilisation - Cas d'utilisation - Cas d'utilisation - Cas d'utilisation
|----------|------|----|---------|
`Uses` `Uses` Tout élément | Tout élément | Dépendance générale
| `Delivers` | Système/Conteneur/Composant | Personne | Sortie vers les utilisateurs |
| Personne | Personne | Interaction humaine |

### Syntaxe

Toutes les fonctions de relation acceptent les mêmes arguments facultatifs :

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

```go
// System uses system
PaymentSystem.Uses(BankAPI, "Processes payments via", "REST/JSON", Synchronous)

// Container uses external system
API.Uses("Stripe/API", "Charges cards", "HTTPS", Asynchronous)

// System delivers to person
NotificationSystem.Delivers(Customer, "Sends order updates to", "Email")
```

---

## Vues

Les vues représentent des sous-ensembles de votre modèle à différents niveaux de détail.

### Vue du paysage du système

Montre l'ensemble des systèmes et des personnes - la vue d'ensemble :

```go
SystemLandscapeView("Landscape", "Enterprise overview", func() {
    Title("Company Systems")
    AddAll()
    AutoLayout(RankTopBottom)
    EnterpriseBoundaryVisible()  // Shows internal vs external
})
```

### Vue du contexte du système

Montre un système et ses dépendances directes :

```go
SystemContextView(ECommerce, "Context", "E-Commerce in context", func() {
    AddAll()                      // Add system + all related elements
    Remove(InternalTooling)       // Exclude specific elements
    AutoLayout(RankLeftRight)
    EnterpriseBoundaryVisible()
})
```

### Vue du conteneur

Affiche les conteneurs d'un système :

```go
ContainerView(ECommerce, "Containers", "E-Commerce containers", func() {
    AddAll()
    SystemBoundariesVisible()  // Shows external system boundaries
    AutoLayout(RankTopBottom)
})
```

### Vue des composants

Affiche les composants à l'intérieur d'un conteneur :

```go
ComponentView(API, "Components", "API internals", func() {
    AddAll()
    ContainerBoundariesVisible()  // Shows external container boundaries
    AutoLayout(RankLeftRight)
})
```

### Vue dynamique

Montre un flux ou un scénario spécifique avec des interactions ordonnées :

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

La portée peut être `Global` (tout élément), un système logiciel (ses conteneurs) ou un conteneur (ses composants).

### Vue du déploiement

Montre comment les conteneurs sont déployés dans l'infrastructure :

```go
DeploymentView(Global, "Production", "ProdDeployment", "Production setup", func() {
    AddAll()
    AutoLayout(RankLeftRight)
})
```

### Vue filtrée

Crée une version filtrée d'une autre vue en fonction des balises :

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

## Manipulation de vues

### Ajout d'éléments

| Fonction | Comportement |
|----------|----------|
| `AddAll()` Ajouter tout ce qui se trouve dans le champ d'application
| `AddDefault()` Ajouter les éléments contextuellement pertinents | `Add(element)` Ajouter les éléments contextuels
`Add(element)` Ajouter un élément spécifique
| `AddNeighbors(element)` Ajouter l'élément et ses connexions directes
| `AddContainers()` Ajouter tous les conteneurs (ContainerView/ComponentView) | `AddComponents()` Ajouter un élément et ses connexions directes
| `AddComponents()` Ajouter tous les composants (ComponentView) | `AddInfluencers()` Ajouter un élément et ses connexions directes
| `AddInfluencers()` | Ajouter les conteneurs + les dépendances externes (ContainerView) | `AddComponents()` Ajouter tous les composants (ComponentView)

**AddAll vs AddDefault** : `AddAll` ajoute tout ce qui est possible dans le champ d'application. `AddDefault` ajoute ce qui est typiquement pertinent - pour un SystemContextView, c'est le système plus les systèmes et les personnes directement liés, mais pas les éléments non connectés.

### Suppression d'éléments

```go
SystemContextView(System, "key", "desc", func() {
    AddAll()
    Remove(InternalTool)              // Remove specific element
    RemoveTagged("internal")          // Remove by tag
    RemoveUnrelated()                 // Remove elements with no relationships
    RemoveUnreachable(MainSystem)     // Remove elements not reachable from MainSystem
})
```

### Gestion des relations

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

### Positionnement des éléments

Lors de l'ajout d'éléments, vous pouvez spécifier des coordonnées exactes :

```go
Add(Customer, func() {
    Coord(100, 200)      // X, Y position
    NoRelationship()     // Don't render relationships for this element
})
```

---

## AutoLayout

AutoLayout positionne automatiquement les éléments à l'aide d'algorithmes de mise en page graphique :

```go
AutoLayout(RankTopBottom, func() {
    Implementation(ImplementationDagre)  // or ImplementationGraphviz
    RankSeparation(300)   // Pixels between ranks (default: 300)
    NodeSeparation(600)   // Pixels between nodes in same rank (default: 600)
    EdgeSeparation(200)   // Pixels between edges (default: 200)
    RenderVertices()      // Create waypoints on edges
})
```

**Directions de classement** : `RankTopBottom`, `RankBottomTop`, `RankLeftRight`, `RankRightLeft`

---

## Styles

Les styles sont appliqués via des balises. Les éléments et les relations peuvent avoir plusieurs balises ; les styles sont appliqués en cascade.

### Styles d'éléments

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

### Styles de relation

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

### Prise en charge de l'habillage CSS

Les SVG exportés incluent des propriétés CSS personnalisées avec des valeurs de repli, ce qui permet de prendre en charge les thèmes clairs/foncés sans régénérer les diagrammes. Les couleurs définies dans `ElementStyle` et `RelationshipStyle` sont converties en variables CSS en fonction du nom de la balise.

**Convention d'appellation des variables:**
- Arrière-plans des éléments : `--mdl-<tag>-bg`
- Couleurs du texte de l'élément : `--mdl-<tag>-color`
- Traits des éléments : `--mdl-<tag>-stroke`
- Couleurs des relations : `--mdl-rel-<tag>-color`

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

Génère des éléments SVG avec :

```html
<rect fill="var(--mdl-database-bg, #438DD5)" ... />
<text fill="var(--mdl-database-color, #ffffff)" ... />
<path stroke="var(--mdl-rel-async-color, #707070)" ... />
```

**Implémentation de thèmes dans votre site:**

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

Les SVG fonctionnent de manière autonome (les valeurs de repli s'affichent correctement) et s'adaptent automatiquement lorsqu'ils sont intégrés dans des pages qui définissent ces variables CSS.

**Important:** Les propriétés CSS personnalisées ne fonctionnent que lorsque le SVG est intégré dans le document HTML. Les SVG chargés via `<img src="...">` n'héritent pas des CSS de la page mère. Pour les sites Hugo, utilisez le shortcode `diagram` pour intégrer les SVG :

```markdown
{{</* diagram name="MyDiagram" */>}}
{{</* diagram name="MyDiagram" caption="System architecture" */>}}
```

---

## Modélisation du déploiement

Modélisation des environnements d'infrastructure et d'exécution :

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

## Le `mdl` CLI

### `mdl serve` - L'éditeur interactif

```bash
mdl serve ./model -dir gen -port 8080
```

Démarre un éditeur basé sur le web à `http://localhost:8080`. Caractéristiques :
- Glisser les éléments pour les positionner
- Algorithmes de mise en page multiples (en couches, en force, en arborescence, radiale) via ELK.js
- Outils d'alignement et de distribution
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Exportation SVG
- Rechargement à chaud en cas de changement de DSL

**Raccourcis clavier** (utiliser Cmd sur Mac) :

| Action | Raccourci
|--------|----------|
sauvegarder | Ctrl+S | Annuler | Ctrl+Z | Ctrl+S
| Annuler | Ctrl+Z | Rétablir | Ctrl+Shift | Ctrl+S
| Ctrl+Shift+Z | Ctrl+A | Ctrl+A | Ctrl+S
| Sélectionner tout | Ctrl+A | Zoom avant/arrière | Ctrl+Shift+Z | Ctrl+S
| Zoom avant/arrière | Ctrl++/- ou Ctrl+défilement
| Ajuster à l'affichage | Ctrl+9 | Zoom 100 % | Ctrl+9
| Zoomer à 100% | Ctrl+0
| Mise en page automatique | Ctrl+L
| Ctrl+G | Ctrl+C | Ctrl+D | Ctrl+S | Ctrl+S | Ctrl+L
| Aligner sur la grille | Ctrl+Shift+G | Aligner sur l'horizontale
| Aligner horizontalement | Ctrl+Maj+H | Aligner verticalement | Ctrl+Maj+H
| Aligner verticalement | Ctrl+Maj+A | Aligner horizontalement | Ctrl+Maj+H | Aligner verticalement | Ctrl+Maj+A
| Ajouter un sommet | Alt+Click | Ajouter un sommet

### `mdl gen` - Exportation JSON

```bash
mdl gen ./model -out design.json
```

Exporte le modèle au format JSON. Utile pour l'intégration avec d'autres outils.

### `mdl svg` - Génération de SVG sans tête

```bash
# Generate all views
mdl svg ./model -dir gen --all

# Generate specific views
mdl svg ./model -dir gen --view Context --view Containers

# With layout options
mdl svg ./model -dir gen --all --direction LEFT --compact --timeout 30s
```

Exécute un navigateur sans tête pour la mise en page automatique et l'enregistrement des vues. Idéal pour les pipelines CI/CD.

---

## L'interface de programmation `stz` CLI

Télécharger les modèles vers [Structurizr] (https://structurizr.com) :

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

Lorsque vous utilisez Model avec Goa, ajoutez l'importation DSL à votre paquetage de conception :

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

L'exécution de `goa gen` produit à la fois le code API et les diagrammes d'architecture (`design.json` et `workspace.json`).

---

## Intégration CI/CD

### Actions GitHub

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

## Meilleures pratiques

### Organiser les grands modèles

Répartir les modèles dans plusieurs fichiers :

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

### Balisage cohérent

Définissez une convention de balisage et respectez-la :

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

## Référence

- [DSL Package Documentation](https://pkg.go.dev/goa.design/model/dsl) - Référence complète du DSL
- [Model GitHub Repository](https://github.com/goadesign/model) - Code source et exemples
- [C4 Model](https://c4model.com) - Documentation du modèle C4
- [Structurizr](https://structurizr.com) - Hébergement de diagrammes en ligne
