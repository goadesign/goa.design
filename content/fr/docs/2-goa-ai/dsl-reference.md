---
title: Référence DSL
weight: 2
description: "Complete reference for Goa-AI's DSL functions - agents, toolsets, policies, and MCP integration."
llm_optimized: true
aliases:
---

Ce document fournit une référence complète pour les fonctions DSL de Goa-AI. Utilisez-le avec le guide [Runtime](./runtime.md) pour comprendre comment les conceptions se traduisent en comportement d'exécution.

## Référence rapide DSL

| Fonction | Contexte | Description |
|----------|---------|-------------|
| **Fonctions d'agent** | | | |
| `Agent` Service | Définit un agent basé sur LLM | `Use` Agent
| `Use` Agent | Déclare la consommation d'un jeu d'outils |
| Agent, Service | Expose les ensembles d'outils à d'autres agents | `Export` Service
| `AgentToolset` | Argument d'utilisation | Fait référence à un jeu d'outils d'un autre agent |
| Agent | Alias pour AgentToolset + Use | `UseAgentToolset` Agent, Service
| Outil (dans l'exportation) | Méthode de transfert déterministe vers le service | `Passthrough` Outil (dans l'exportation)
| API | Désactive la génération du fichier AGENTS_QUICKSTART.md |
| | **Fonctions de l'ensemble d'outils** | | | |
| Niveau supérieur | Déclare un jeu d'outils appartenant au fournisseur
| `FromMCP` | Argument de l'ensemble d'outils | Configure l'ensemble d'outils soutenu par le MCP |
| Argument de jeu d'outils | Configure un jeu d'outils adossé à la base de registre |
| | Configure le jeu d'outils adossé au registre | `Description` Toolset | Définit la description du jeu d'outils |
| **Fonctions d'outils** | | | |
| `Tool` Toolset, Method | Définit un outil appelable |
| `Args` Tool | Définit le schéma des paramètres d'entrée | `Return` Tool
| `Return` | Outil | Définit le schéma du résultat de sortie | `ServerData` | Outil
| `ServerData` | Outil | Définit le schéma des données serveur (jamais envoyées au fournisseur de modèle) | `BoundedResult` | Outil
| `ServerDataDefault` | Outil | Émission par défaut des server-data optionnelles lorsque `server_data` est omis ou vaut `"auto"` |
| `BoundedResult` | Outil | Marque le résultat comme vue bornée; applique la forme canonique des champs de bounds; un sous-DSL optionnel peut déclarer les champs de cursor |
| `Cursor` | BoundedResult | Déclare quel champ du payload porte le curseur de pagination (optionnel) |
| `NextCursor` | BoundedResult | Déclare quel champ du résultat porte le curseur de page suivante (optionnel) |
| `Tags` | Outil, Toolset | Attache des étiquettes de métadonnées |
| Outil, Toolset | Attache des étiquettes de métadonnées | `BindTo` | Outil, Toolset | Lie l'outil à la méthode de service |
| `Inject` | Outil | Marque les champs comme étant injectés au moment de l'exécution | `CallHintTemplate` | Outil
| `CallHintTemplate` | Outil | Affiche un modèle pour les invocations | `ResultHintTemplate` | Outil
| `ResultHintTemplate` `ResultHintTemplate` `ResultHintTemplate` `ResultHintTemplate` Outil | Afficher le modèle pour les résultats
| Outil | Rappel statique du système après le résultat de l'outil | `ResultReminder` | Outil | Rappel statique du système après le résultat de l'outil | | Outil
| | Outil | Requiert une confirmation explicite hors bande avant l'exécution | `Confirmation` | Outil
| **Fonctions de politique** | | | |
| Agent : Configure les contraintes d'exécution
| | | Agent | Configure les contraintes d'exécution | | `DefaultCaps` | RunPolicy | Définit les limites de ressources |
| `MaxToolCalls` | DefaultCaps | Invocations maximales de l'outil | `MaxToolCalls` | DefaultCaps
| `MaxConsecutiveFailedToolCalls` | DefaultCaps | Maximum d'échecs consécutifs |
| RunPolicy | Limite simple de l'horloge murale |
| RunPolicy | Configuration fine du délai d'attente | `Timing` RunPolicy
| `Budget` | Timing | Budget global d'exécution | `Plan` | Timing
| `Plan` `Plan` `Plan` `Plan` | Timing | Planner activity timeout
| | Temps d'activité du planificateur | `Tools` | Temps d'activité de l'outil | `History` | Temps d'activité du planificateur
| Gestion de l'historique de la conversation | `History` | RunPolicy
| `KeepRecentTurns` Historique | Gestion de l'historique des conversations | `KeepRecentTurns` Historique
| `Compress` | Historique | Récapitulation assistée par un modèle |
| | Politique d'exécution | Configuration de la mise en cache de l'invite |
| `AfterSystem` Cache | Point de contrôle après les messages du système |
| `AfterTools` | Cache | Point de contrôle après les définitions d'outils | `AfterTools` | Cache
`InterruptsAllowed` | RunPolicy | Activer la pause/reprise |
| Politique d'exécution | Comportement de validation
| **Fonctionnalités MCP** | | | |
| `MCPServer` Service | Active la prise en charge de MCP
| `MCP` Service | Alias pour MCPServer | | `MCP` Service | Alias pour MCPServer
| MCP option | Définit la version du protocole MCP | `ProtocolVersion` MCP option | Définit la version du protocole MCP | `MCPTool` MCP option
| Méthode | Marque la méthode en tant qu'outil MCP
`MCPToolset` Top-level | Déclare un ensemble d'outils dérivé de MCP
| `Resource` | Méthode | Marque la méthode en tant que ressource MCP |

| `StaticPrompt` | Service | Ajoute un modèle d'invite statique
| `DynamicPrompt` | Méthode | Marque la méthode comme générateur d'invite |
| `Notification` Méthode | Marque la méthode en tant qu'expéditeur de notification

| SSE pour les abonnements | `SubscriptionMonitor` | SSE pour les abonnements
| **Fonctions de registre** | | | |
| `Registry` Niveau supérieur | Déclare une source de registre |
| `URL` Registre | Définit le point de terminaison du registre | `APIVersion` Registre
| `APIVersion` | Registre | Définit la version de l'API
| `Timeout` | Registre | Définit le délai d'attente HTTP | `Retry` | Registre
| `Retry` Registre | Configure la politique de réessai | `SyncInterval` Registre
`SyncInterval` `SyncInterval` `SyncInterval` `SyncInterval` | Registre | Définit l'intervalle de rafraîchissement du catalogue
| `CacheTTL` | Registre | Définit la durée du cache local | `Federation` | Registre
| `Federation` Registre | Configure les importations de registre externe |
| `Include` Fédération | Modèles globaux à importer | `Exclude` Fédération
| Fédération | Motifs globaux à ignorer | `Exclude` Fédération
| Exportation | Configuration de la publication dans le registre
| `Version` Toolset | Configure la version du jeu d'outils du registre |
| **Fonctions de schéma** | | | | |
| Args, Return, ServerData | Définit un champ de schéma (utilisation générale) | `Field` Args, Return, ServerData
| Args, Return, ServerData | Définit le champ proto numéroté (gRPC) |
| `Required` Schema | Marque les champs comme obligatoires |

## Gestion des prompts (chemin d'integration v1)

Goa-AI v1 ne requiert **pas** de DSL dediee aux prompts (`Prompt(...)`, `Prompts(...)`).
La gestion des prompts est actuellement pilotee par le runtime :

- Enregistrer les prompt specs de base dans `runtime.PromptRegistry`.
- Configurer des overrides par scope avec `runtime.WithPromptStore(...)`.
- Rendre les prompts depuis les planners via `PlannerContext.RenderPrompt(...)`.
- Attacher la provenance des prompts rendus dans `model.Request.PromptRefs`.

Pour les flux agent-as-tool, mapper les IDs d'outil aux IDs de prompt avec des options
runtime comme `runtime.WithPromptSpec(...)` sur les enregistrements d'agent-tools.

### Champ vs Attribut

Les `Field` et `Attribute` définissent tous deux des champs de schéma, mais ils ont des objectifs différents :

**`Attribute(name, type, description, dsl)`** - Définition de schéma à usage général :
- Utilisé pour les schémas JSON uniquement
- Aucune numérotation des champs n'est requise
- Syntaxe plus simple pour la plupart des cas d'utilisation

```go
Args(func() {
    Attribute("query", String, "Search query")
    Attribute("limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**`Field(number, name, type, description, dsl)`** - Champs numérotés pour gRPC/protobuf :
- Requis lors de la génération de services gRPC
- Les numéros de champs doivent être uniques et stables
- A utiliser lorsque votre service expose à la fois des transports HTTP et gRPC

```go
Args(func() {
    Field(1, "query", String, "Search query")
    Field(2, "limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**Quand utiliser quoi:**
- Utilisez `Attribute` pour les outils d'agent qui n'utilisent que JSON (cas le plus courant)
- Utilisez `Field` lorsque votre service Goa dispose d'un transport gRPC et que les outils se lient à ces méthodes
- Le mélange est autorisé mais non recommandé au sein d'un même schéma

## Vue d'ensemble

Goa-AI étend le DSL de Goa avec des fonctions pour déclarer des agents, des ensembles d'outils et des politiques d'exécution. Le DSL est évalué par le moteur `eval` de Goa, de sorte que les mêmes règles s'appliquent qu'avec le DSL de service/transport standard : les expressions doivent être invoquées dans le contexte approprié, et les définitions d'attributs réutilisent le système de types de Goa (`Attribute`, `Field`, validations, exemples, etc.)


### Chemin d'importation

Ajoutez le DSL des agents à vos paquets de conception Goa :

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### Point d'entrée

Déclarer des agents à l'intérieur d'une définition Goa `Service` normale. Le DSL complète l'arbre de conception de Goa et est traité pendant `goa gen`.

### Résultat

L'exécution de `goa gen` produit :

- Des paquets d'agents (`gen/<service>/agents/<agent>`) avec des définitions de flux de travail, des activités de planification et des aides à l'enregistrement
- Paquets propriétaires du toolset (`gen/<service>/toolsets/<toolset>`) avec structs typés payload/result, specs, codecs et (le cas échéant) transforms
- Des gestionnaires d'activité pour les boucles de planification/exécution/reprise
- Des aides à l'enregistrement qui intègrent la conception dans le moteur d'exécution

Un `AGENTS_QUICKSTART.md` contextuel est écrit à la racine du module, sauf s'il est désactivé par `DisableAgentDocs()`.

### Exemple de démarrage rapide

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var DocsToolset = Toolset("docs.search", func() {
    Tool("search", "Search indexed documentation", func() {
        Args(func() {
            Attribute("query", String, "Search phrase")
            Attribute("limit", Int, "Max results", func() { Default(5) })
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Matched snippets")
            Required("documents")
        })
        Tags("docs", "search")
    })
})

var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Description("Human front door for the knowledge agent.")

    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
        Use(AssistantSuite)
        Export("chat.tools", func() {
            Tool("summarize_status", "Produce operator-ready summaries", func() {
                Args(func() {
                    Attribute("prompt", String, "User instructions")
                    Required("prompt")
                })
                Return(func() {
                    Attribute("summary", String, "Assistant response")
                    Required("summary")
                })
                Tags("chat")
            })
        })
        RunPolicy(func() {
            DefaultCaps(
                MaxToolCalls(8),
                MaxConsecutiveFailedToolCalls(3),
            )
            TimeBudget("2m")
        })
    })
})
```

L'exécution `goa gen example.com/assistant/design` produit :

- `gen/orchestrator/agents/chat` : flux de travail + activités du planificateur + registre des agents
- `gen/orchestrator/agents/chat/specs` : catalogue d'outils de l'agent (agrégation de `ToolSpec`s + `tool_schemas.json`)
- `gen/orchestrator/toolsets/<toolset>` : types/specs/codecs/transforms du toolset (propriété du service)
- `gen/orchestrator/agents/chat/exports/<export>` : paquets de toolsets exportés (agent-as-tool)
- Aides à l'enregistrement tenant compte des MCP lorsqu'un `MCPToolset` est référencé par l'intermédiaire d'un `Use`

### Identificateurs d'outils typés

Chaque paquet de spécifications par jeu d'outils définit des identificateurs d'outils typés (`tools.Ident`) pour chaque outil généré :

```go
const (
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Utilisez ces constantes partout où vous avez besoin de référencer des outils.

### Composition en ligne inter-processus

Lorsque l'agent A déclare qu'il "utilise" un ensemble d'outils exporté par l'agent B, Goa-AI réalise la composition automatiquement :

- Le paquetage de l'exportateur (agent B) inclut les aides générées `agenttools`
- Le registre de l'agent consommateur (agent A) utilise ces aides lorsque vous `Use(AgentToolset("service", "agent", "toolset"))`
- La fonction `Execute` générée construit des messages de planificateur imbriqués, exécute l'agent fournisseur en tant que flux de travail enfant et adapte le `RunOutput` de l'agent imbriqué en un `planner.ToolResult`

On obtient ainsi un seul flux de travail déterministe par exécution de l'agent et un arbre d'exécution lié pour la composition.

---

## Fonctions de l'agent

### Agent

`Agent(name, description, dsl)` déclare un agent à l'intérieur d'un `Service`. Il enregistre les métadonnées de l'agent en fonction du service et attache des ensembles d'outils via `Use` et `Export`.

**Contexte** : A l'intérieur de `Service`

Chaque agent devient un enregistrement d'exécution avec :
- Une définition du flux de travail et des gestionnaires d'activités temporelles
- Des activités PlanStart/PlanResume avec des options de relance et de temporisation dérivées du DSL
- Un `Register<Agent>` qui enregistre les flux de travail, les activités et les ensembles d'outils

```go
var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
        Export("chat.tools", func() {
            // tools defined here
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Utilisation

`Use(value, dsl)` déclare qu'un agent consomme un ensemble d'outils. L'ensemble d'outils peut être :

- Une variable de premier niveau `Toolset` une référence `MCPToolset` à un ensemble d'outils
- Une référence `MCPToolset`
- Une définition en ligne de l'ensemble d'outils (nom de la chaîne + DSL)
- Une référence `AgentToolset` pour la composition de l'agent en tant qu'outil

**Contexte** : Intérieur `Agent`

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference with subsetting
    Use(CommonTools, func() {
        Tool("notify") // consume only this tool from CommonTools
    })
    
    // Reference an MCP toolset
    Use(MCPToolset("assistant", "assistant-mcp"))
    
    // Inline agent-local toolset definition
    Use("helpers", func() {
        Tool("answer", "Answer a question", func() {
            // tool definition
        })
    })
    
    // Agent-as-tool composition
    Use(AgentToolset("service", "agent", "toolset"))
})
```

### Exportation

`Export(value, dsl)` déclare les ensembles d'outils exposés à d'autres agents ou services. Les ensembles d'outils exportés peuvent être consommés par d'autres agents via `Use(AgentToolset(...))`.

**Contexte** : Dans `Agent` ou `Service`

```go
Agent("planner", "Planning agent", func() {
    Export("planning.tools", func() {
        Tool("create_plan", "Create a plan", func() {
            Args(func() {
                Attribute("goal", String, "Goal to plan for")
                Required("goal")
            })
            Return(func() {
                Attribute("plan", String, "Generated plan")
                Required("plan")
            })
        })
    })
})
```

### AgentToolset

`AgentToolset(service, agent, toolset)` fait référence à un ensemble d'outils exporté par un autre agent. Cela permet la composition d'un agent en tant qu'outil.

**Context** : Argument de `Use`

Utilisez `AgentToolset` lorsque :
- Vous n'avez pas de poignée d'expression pour l'ensemble d'outils exporté
- Plusieurs agents exportent des ensembles d'outils portant le même nom
- Vous voulez être explicite dans la conception pour plus de clarté

```go
// Agent A exports tools
Agent("planner", func() {
    Export("planning.tools", func() { /* tools */ })
})

// Agent B uses Agent A's tools
Agent("orchestrator", func() {
    Use(AgentToolset("service", "planner", "planning.tools"))
})
```

**Alias** : `UseAgentToolset(service, agent, toolset)` est un alias qui combine `AgentToolset` avec `Use` en un seul appel. Préférez `AgentToolset` dans les nouvelles conceptions ; l'alias existe pour des raisons de lisibilité dans certaines bases de code.

```go
// Equivalent to Use(AgentToolset("service", "planner", "planning.tools"))
Agent("orchestrator", func() {
    UseAgentToolset("service", "planner", "planning.tools")
})
```

### Passthrough

`Passthrough(toolName, target, methodName)` définit un transfert déterministe pour un outil exporté vers une méthode de service Goa. Cela permet de contourner entièrement le planificateur.

**Contexte** : Dans `Tool` imbriqué dans `Export`

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("message", String, "Message to log")
            Required("message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
        })
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

### DisableAgentDocs

`DisableAgentDocs()` désactive la génération de `AGENTS_QUICKSTART.md` à la racine du module.

**Contexte** : A l'intérieur de `API`

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

---

## Fonctions de l'ensemble d'outils

### Jeu d'outils

`Toolset(name, dsl)` déclare un ensemble d'outils appartenant au fournisseur au niveau supérieur. Lorsqu'il est déclaré au niveau supérieur, le jeu d'outils devient globalement réutilisable ; les agents y font référence via `Use`.

**Contexte** : Niveau supérieur

```go
var DocsToolset = Toolset("docs.search", func() {
    Description("Tools for searching documentation")
    Tool("search", "Search indexed documentation", func() {
        Args(func() {
            Attribute("query", String, "Search phrase")
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Matched snippets")
            Required("documents")
        })
    })
})
```

Les ensembles d'outils peuvent inclure une description à l'aide de la fonction DSL standard `Description()` :

```go
var DataToolset = Toolset("data-tools", func() {
    Description("Tools for data processing and analysis")
    Tool("analyze", "Analyze dataset", func() {
        Args(func() {
            Attribute("dataset_id", String, "Dataset identifier")
            Required("dataset_id")
        })
        Return(func() {
            Attribute("insights", ArrayOf(String), "Analysis insights")
            Required("insights")
        })
    })
})
```

### Outil

`Tool(name, description, dsl)` définit une capacité appelable à l'intérieur d'un ensemble d'outils.

**Contexte** : A l'intérieur de `Toolset` ou `Method`

La génération de code émet :
- Payload/result Go structs dans `tool_specs/types.go`
- Codecs JSON (`tool_specs/codecs.go`)
- Définitions de schéma JSON consommées par les planificateurs
- Entrées de registre d'outils avec invites d'aide et métadonnées

```go
Tool("search", "Search indexed documentation", func() {
    Title("Document Search")
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() { Default(5) })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Required("documents")
    })
    CallHintTemplate("Searching for: {{ .Query }}")
    ResultHintTemplate("Found {{ len .Documents }} documents")
    Tags("docs", "search")
})
```

### Args et retour

`Args(...)` et `Return(...)` définissent les types de charge utile/résultat à l'aide du DSL d'attributs standard de Goa.

**Context** : A l'intérieur de `Tool`

Vous pouvez utiliser :
- Une fonction pour définir un schéma d'objet en ligne avec des appels `Attribute()`
- Un type utilisateur Goa (Type, ResultType, etc.) pour réutiliser les définitions de type existantes
- Un type primitif (String, Int, etc.) pour les entrées/sorties simples à valeur unique

```go
Tool("search", "Search documentation", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() {
            Default(5)
            Minimum(1)
            Maximum(100)
        })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Attribute("count", Int, "Number of results")
        Required("documents", "count")
    })
})
```

**Réutilisation des types:**

```go
var SearchParams = Type("SearchParams", func() {
    Attribute("query", String)
    Attribute("limit", Int)
    Required("query")
})

Tool("search", "Search documents", func() {
    Args(SearchParams)
    Return(func() {
        Attribute("results", ArrayOf(String))
    })
})
```

### ServerData

`ServerData(kind, val, args...)` définit des données serveur typées émises aux côtés d'un résultat d'outil. Les server-data ne sont jamais envoyées au fournisseur de modèle.

**Contexte** : Dans `Tool`

**Paramètres:**
- `kind` : Chaîne d'identification du type d'artefact (par exemple, `"time_series"`, `"chart_data"`, `"full_results"`). Cela permet aux consommateurs d'identifier et de traiter les différents types d'artefacts de manière appropriée.
- `val` : la définition du schéma, suivant les mêmes modèles que `Args` et `Return` - soit une fonction avec des appels `Attribute()`, un type d'utilisateur Goa ou un type primitif.

**Routage par audience (`Audience*`) :**

Chaque entrée `ServerData` déclare une audience que les consommateurs en aval utilisent pour router la charge utile sans dépendre des conventions de nommage du `kind` :

- `"timeline"` : persistée et éligible à une projection orientée observateur (par ex. cartes UI/timeline)
- `"internal"` : pièce jointe pour la composition entre outils ; ni persistée ni rendue
- `"evidence"` : références de provenance ; persistées séparément des cartes de timeline

Définissez l’audience dans le bloc DSL de `ServerData` :

```go
ServerData("atlas.time_series.chart_points", TimeSeriesServerData, func() {
    AudienceInternal()
    FromMethodResultField("chart_sidecar")
})

ServerData("aura.evidence", ArrayOf(Evidence), func() {
    AudienceEvidence()
    ModeAlways()
    FromMethodResultField("evidence")
})
```

**Quand utiliser ServerData:**
- Lorsque les résultats de l'outil doivent inclure des données complètes pour les interfaces utilisateur (diagrammes, graphiques, tableaux) tout en gardant les charges utiles du modèle limitées
- Lorsque vous souhaitez attacher de grands ensembles de résultats qui dépasseraient les limites du contexte du modèle
- Lorsque les consommateurs en aval ont besoin de données structurées que le modèle n'a pas besoin de voir

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp (RFC3339)")
        Attribute("end_time", String, "End timestamp (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
        Attribute("min_value", Float64, "Minimum value in range")
        Attribute("max_value", Float64, "Maximum value in range")
        Required("summary", "count")
    })
    ServerData("atlas.time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    })
    ServerDataDefault("off")
})
```

**Utilisation d'un type Goa pour le schéma de l'artefact:**

```go
var TimeSeriesArtifact = Type("TimeSeriesArtifact", func() {
    Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
    Attribute("unit", String, "Measurement unit")
    Attribute("resolution", String, "Data resolution (e.g., '1m', '5m', '1h')")
    Required("data_points")
})

Tool("get_metrics", "Get device metrics", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Required("device_id")
    })
    Return(func() {
        Attribute("summary", String, "Metrics summary for the model")
        Attribute("point_count", Int, "Number of data points")
        Required("summary", "point_count")
    })
    ServerData("atlas.metrics", TimeSeriesArtifact)
})
```

**Runtime access:**

Au moment de l'exécution, les artefacts d'UI (projetés depuis des server-data optionnelles) sont disponibles sur `planner.ToolResult.Artifacts` :

```go
// In a stream subscriber or result handler
func handleToolResult(result *planner.ToolResult) {
    for _, art := range result.Artifacts {
        if art.Kind == "atlas.time_series" {
            // art.Data contains the full time series for UI rendering
        }
    }
}
```

### BoundedResult

`BoundedResult()` marque le résultat de l'outil actuel comme une vue limitée sur un ensemble de données potentiellement plus grand. Il s'agit d'un contrat léger qui indique à l'exécution et aux services que cet outil :

1. Peut renvoyer un sous-ensemble de données disponibles
2. Doit faire apparaître des métadonnées de troncature (`agent.Bounds`) à côté de son résultat

**Contexte** : Intérieur `Tool`

`BoundedResult` impose une forme canonique pour les résultats bornés. Les outils déclarent soit
tous les champs standard (`returned`, `total`, `truncated`, `refinement_hint`), soit aucun et laissent
`BoundedResult()` les ajouter. Les déclarations partielles sont rejetées.

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("filter", String, "Optional filter expression")
        Attribute("limit", Int, "Maximum devices to return", func() {
            Default(100)
            Maximum(1000)
        })
        Attribute("offset", Int, "Pagination offset", func() {
            Default(0)
        })
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "List of devices")
        Attribute("returned", Int, "Number of devices returned")
        Attribute("total", Int, "Total devices matching filter")
        Attribute("truncated", Boolean, "Whether results were truncated")
        Required("devices", "returned", "truncated")
    })
    BoundedResult()
})
```

**Le contrat agent.Bounds:**

Lorsqu'un outil est marqué par `BoundedResult()`, les types de résultat générés implémentent
`agent.BoundedResult` via `ResultBounds()`, et le runtime dérive `planner.ToolResult.Bounds` à partir de ce méthode :

```go
// agent.Bounds describes how a tool result has been bounded
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied
    RefinementHint string // Guidance on how to narrow the query
}

// agent.BoundedResult interface for typed results
type BoundedResult interface {
    ResultBounds() *Bounds
}
```

**Responsabilité du service:**

Les services sont responsables de :
1. Appliquer leur propre logique de troncature (pagination, limites, plafonds de profondeur)
2. De remplir les métadonnées relatives aux limites dans le résultat
3. Fournir éventuellement un `RefinementHint` lorsque les résultats sont tronqués

Le moteur d'exécution ne calcule pas lui-même les sous-ensembles ou la troncature ; il se contente de veiller à ce que les outils délimités présentent un contrat `Bounds` cohérent pour leurs résultats.

**Quand utiliser BoundedResult:**

- Outils qui renvoient des listes paginées (appareils, utilisateurs, enregistrements)
- Outils qui interrogent de grands ensembles de données avec des limites de résultats
- Outils qui appliquent des limites de profondeur ou de taille aux structures imbriquées
- Tout outil pour lequel le modèle doit comprendre que les résultats peuvent être incomplets

**Exemple complet avec limites:**

```go
var DeviceToolset = Toolset("devices", func() {
    Tool("list_devices", "List IoT devices", func() {
        Args(func() {
            Attribute("site_id", String, "Site identifier")
            Attribute("status", String, "Filter by status", func() {
                Enum("online", "offline", "unknown")
            })
            Attribute("limit", Int, "Maximum results", func() {
                Default(50)
                Maximum(500)
            })
            Required("site_id")
        })
        Return(func() {
            Attribute("devices", ArrayOf(Device), "Matching devices")
            Attribute("returned", Int, "Count of returned devices")
            Attribute("total", Int, "Total matching devices")
            Attribute("truncated", Boolean, "Results were capped")
            Attribute("refinement_hint", String, "How to narrow results")
            Required("devices", "returned", "truncated")
        })
        BoundedResult()
        BindTo("DeviceService", "ListDevices")
    })
})
```

**Comportement en cours d'exécution:**

Lorsqu'un outil délimité s'exécute :
1. Le runtime décode le résultat et vérifie l'implémentation de `agent.BoundedResult`
2. Si le résultat met en œuvre l'interface, `ResultBounds()` est appelé pour extraire les limites
3. Les métadonnées relatives aux bornes sont attachées à `planner.ToolResult.Bounds`
4. Les abonnés au flux et les finaliseurs peuvent accéder aux bornes pour l'affichage de l'interface utilisateur ou la journalisation

Les outils peuvent inclure un titre d'affichage à l'aide de la fonction DSL standard `Title()` :

```go
Tool("web_search", "Search the web", func() {
    Title("Web Search")
    Args(func() { /* ... */ })
})
```

### Confirmation

`Confirmation(dsl)` déclare qu'un outil doit être explicitement approuvé hors bande avant d'être exécuté
avant d'être exécuté. Ceci est prévu pour les outils **sensibles à l'opérateur** (écritures, suppressions, commandes).

**Contexte** : Intérieur `Tool`

Au moment de la génération, Goa-AI enregistre la politique de confirmation dans la spécification de l'outil généré. Au moment de l'exécution, le
workflow émet une demande de confirmation à l'aide de `AwaitConfirmation` et n'exécute l'outil qu'après avoir obtenu une
approbation explicite.

Exemple minimal :

```go
Tool("dangerous_write", "Write a stateful change", func() {
    Args(DangerousWriteArgs)
    Return(DangerousWriteResult)
    Confirmation(func() {
        Title("Confirm change")
        PromptTemplate(`Approve write: set {{ .Key }} to {{ .Value }}`)
        DeniedResultTemplate(`{"summary":"Cancelled","key":"{{ .Key }}"}`)
    })
})
```

Notes :

- La manière dont la confirmation est demandée est propre à l'exécution. Le protocole de confirmation intégré utilise un
  `AwaitConfirmation` dédié et un appel de décision `ProvideConfirmation`. Voir le guide de l'exécution pour les charges utiles et le flux d'exécution attendus
  les charges utiles attendues et le flux d'exécution.
- Les modèles de confirmation (`PromptTemplate` et `DeniedResultTemplate`) sont des chaînes Go `text/template`
  exécutées avec `missingkey=error`. En plus des fonctions standard des modèles (par exemple, `printf`),
  Goa-AI fournit :
  - `json v` → JSON encode `v` (utile pour les champs de pointeurs optionnels ou l'intégration de valeurs structurées).
  - `quote s` → renvoie une chaîne de caractères entre guillemets (comme `fmt.Sprintf("%q", s)`).
- La confirmation peut également être activée dynamiquement au moment de l'exécution via `runtime.WithToolConfirmation(...)`
  (utile pour les politiques basées sur l'environnement ou les dérogations par déploiement).

### CallHintTemplate et ResultHintTemplate

`CallHintTemplate(template)` et `ResultHintTemplate(template)` configurent les modèles d'affichage pour les invocations d'outils et les résultats. Les modèles sont des chaînes de caractères Go text/template rendues avec la charge utile typée de l'outil ou la structure de résultat pour produire des indications concises affichées pendant et après l'exécution.

**Contexte** : Intérieur `Tool`

**Key Points:**

- Les modèles reçoivent des structures Go typées, pas du JSON brut - utilisez des noms de champs Go (par exemple, `.Query`, `.DeviceID`) pas des clés JSON (par exemple, `.query`, `.device_id`)
- Les indices doivent être concis : ≤140 caractères recommandés pour un affichage propre de l'interface utilisateur
- Les modèles sont compilés avec `missingkey=error` - tous les champs référencés doivent exister
- Utiliser les blocs `{{ if .Field }}` ou `{{ with .Field }}` pour les champs facultatifs

**Contrat d'exécution :**

- Les constructeurs d'événements de hooks ne rendent pas les indices. Les événements de planification d'outil ont `DisplayHint==""` par défaut.
- Le runtime peut enrichir et persister un indice d'appel **durable** au moment de la publication en décodant la charge utile typée et en exécutant `CallHintTemplate`.
- Si le décodage typé échoue ou si aucun modèle n'est enregistré, le runtime laisse `DisplayHint` vide. Les indices ne sont jamais rendus à partir de JSON brut.
- Si un producteur définit explicitement `DisplayHint` (non vide) avant de publier l'événement hook, le runtime le considère comme faisant autorité et ne l'écrase pas.
- Pour des variations par consommateur (par exemple, une formulation UI différente), configurez `runtime.WithHintOverrides` sur le runtime. Les overrides ont la priorité sur les templates DSL pour les événements `tool_start` streamés.

**Exemple de base:**

```go
Tool("search", "Search documents", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Maximum results", func() { Default(10) })
        Required("query")
    })
    Return(func() {
        Attribute("count", Int, "Number of results found")
        Attribute("results", ArrayOf(String), "Matching documents")
        Required("count", "results")
    })
    CallHintTemplate("Searching for: {{ .Query }}")
    ResultHintTemplate("Found {{ .Count }} results")
})
```

**Typed Struct Fields:**

Les modèles reçoivent les structures Go générées (payload/result). Les noms des champs suivent les conventions de nommage Go (PascalCase), et non les conventions JSON (snake_case ou camelCase) :

```go
// DSL definition
Tool("get_device_status", "Get device status", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")      // JSON: device_id
        Attribute("include_metrics", Boolean, "Include metrics") // JSON: include_metrics
        Required("device_id")
    })
    Return(func() {
        Attribute("device_name", String, "Device name")          // JSON: device_name
        Attribute("is_online", Boolean, "Online status")         // JSON: is_online
        Attribute("last_seen", String, "Last seen timestamp")    // JSON: last_seen
        Required("device_name", "is_online")
    })
    // Use Go field names (PascalCase), not JSON keys
    CallHintTemplate("Checking status of {{ .DeviceID }}")
    ResultHintTemplate("{{ .DeviceName }}: {{ if .IsOnline }}online{{ else }}offline{{ end }}")
})
```

**Gestion des champs optionnels:**

Utilisez des blocs conditionnels pour les champs facultatifs afin d'éviter les erreurs de modèle :

```go
Tool("list_items", "List items with optional filter", func() {
    Args(func() {
        Attribute("category", String, "Optional category filter")
        Attribute("limit", Int, "Maximum items", func() { Default(50) })
    })
    Return(func() {
        Attribute("items", ArrayOf(Item), "Matching items")
        Attribute("total", Int, "Total count")
        Attribute("truncated", Boolean, "Results were truncated")
        Required("items", "total")
    })
    CallHintTemplate("Listing items{{ with .Category }} in {{ . }}{{ end }}")
    ResultHintTemplate("{{ .Total }} items{{ if .Truncated }} (truncated){{ end }}")
})
```

**Fonctions de modèle intégrées:**

Le moteur d'exécution fournit ces fonctions d'aide pour les modèles d'indices :

| Fonction | Description | Exemple
|----------|-------------|---------|
| `join` | Join string slice with separator | `{{ join .Tags ", " }}` |
| `count` | Compter les éléments dans une tranche | `{{ count .Results }} items` |
| `truncate` | Tronquer la chaîne à N caractères | `{{ truncate .Query 20 }}` |

**Exemple complet avec toutes les fonctionnalités:**

```go
Tool("analyze_data", "Analyze dataset", func() {
    Args(func() {
        Attribute("dataset_id", String, "Dataset identifier")
        Attribute("analysis_type", String, "Type of analysis", func() {
            Enum("summary", "detailed", "comparison")
        })
        Attribute("filters", ArrayOf(String), "Optional filters")
        Required("dataset_id", "analysis_type")
    })
    Return(func() {
        Attribute("insights", ArrayOf(String), "Analysis insights")
        Attribute("metrics", MapOf(String, Float64), "Computed metrics")
        Attribute("processing_time_ms", Int, "Processing time in milliseconds")
        Required("insights", "processing_time_ms")
    })
    CallHintTemplate("Analyzing {{ .DatasetID }} ({{ .AnalysisType }})")
    ResultHintTemplate("{{ count .Insights }} insights in {{ .ProcessingTimeMs }}ms")
})
```

### ResultReminder

`ResultReminder(text)` configure un rappel statique du système qui est injecté dans la conversation après le retour du résultat de l'outil. Utilisez-le pour guider le modèle en coulisses sur la manière d'interpréter ou de présenter le résultat à l'utilisateur.

**Contexte** : Intérieur `Tool`

Le texte du rappel est automatiquement enveloppé dans des balises `<system-reminder>` par le moteur d'exécution. Ne pas inclure les balises dans le texte.

**Rappels statiques et rappels dynamiques:**

`ResultReminder` est destiné aux rappels statiques, au moment de la conception, qui s'appliquent à chaque fois que l'outil est appelé. Pour les rappels dynamiques qui dépendent de l'état d'exécution ou du contenu des résultats de l'outil, utilisez plutôt `PlannerContext.AddReminder()` dans l'implémentation de votre planificateur. Les rappels dynamiques prennent en charge
- La limitation du taux (nombre minimum de tours entre les émissions)
- Plafonds par exécution (émissions maximales par exécution)
- Ajout/suppression de temps d'exécution en fonction des conditions
- Niveaux de priorité (sécurité ou guidage)

**Exemple de base:**

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp")
        Attribute("end_time", String, "End timestamp")
        Required("device_id", "start_time", "end_time")
    })
    Return(func() {
        Attribute("series", ArrayOf(DataPoint), "Time series data points")
        Attribute("summary", String, "Summary for the model")
        Required("series", "summary")
    })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

**Quand utiliser ResultReminder:**

- Lorsque l'interface utilisateur rend les résultats de l'outil d'une manière spéciale (diagrammes, graphiques, tableaux) que le modèle doit connaître
- Lorsque le modèle doit éviter de répéter des informations déjà visibles par l'utilisateur
- Lorsqu'il existe un contexte important sur la façon dont les résultats sont présentés et qui affecte la façon dont le modèle doit répondre
- Lorsque vous souhaitez des conseils cohérents qui s'appliquent à chaque utilisation de l'outil

**Outils multiples avec rappels:**

Lorsque plusieurs outils d'un même tour ont des rappels de résultats, ils sont combinés en un seul message système :

```go
Tool("get_metrics", "Get device metrics", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("Metrics are displayed as a dashboard widget.")
})

Tool("get_alerts", "Get active alerts", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("Alerts are shown in a priority-sorted list with severity indicators.")
})
```

**Rappels dynamiques via PlannerContext:**

Pour les rappels qui dépendent de conditions d'exécution, utilisez plutôt l'API du planificateur :

```go
// In your planner implementation
func (p *MyPlanner) PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Add a dynamic reminder based on tool results
    for _, tr := range input.ToolResults {
        if tr.Name == "get_time_series" && hasAnomalies(tr.Result) {
            input.Agent.AddReminder(reminder.Reminder{
                ID:   "anomaly_detected",
                Text: "Anomalies were detected in the time series. Highlight these to the user.",
                Priority: reminder.TierGuidance,
            })
        }
    }
    // ... rest of planner logic
}
```

### Tags

`Tags(values...)` annote les outils ou les ensembles d'outils avec des étiquettes de métadonnées. Les étiquettes sont présentées aux moteurs de politique et à la télémétrie.

**Contexte** : Dans `Tool` ou `Toolset`

Modèles de balises communs :
- Catégories de domaines : `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- Types de capacités : `"read"`, `"write"`, `"search"`, `"transform"`
- Niveaux de risque : `"safe"`, `"destructive"`, `"external"`

```go
Tool("delete_file", "Delete a file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})
```

### BindTo

`BindTo("Method")` ou `BindTo("Service", "Method")` associe un outil à une méthode de service Goa.

**Context** : Inside `Tool`

Lorsqu'un outil est lié à une méthode :
- Le schéma `Args` de l'outil peut différer du schéma `Payload` de la méthode
- Le schéma `Return` de l'outil peut différer de celui de la méthode `Result`
- Les adaptateurs générés transforment les types d'outils et de méthodes

```go
var _ = Service("orchestrator", func() {
    Method("Search", func() {
        Payload(SearchPayload)
        Result(SearchResult)
    })
    
    Agent("chat", func() {
        Use("docs", func() {
            Tool("search", "Search documentation", func() {
                Args(SearchPayload)
                Return(SearchResult)
                BindTo("Search") // binds to method on same service
            })
        })
    })
})
```

### Injecter

`Inject(fields...)` marque des champs spécifiques de la charge utile comme étant "injectés" (infrastructure côté serveur). Les champs injectés sont les suivants :

1. Cachés du LLM (exclus du schéma JSON envoyé au modèle)
2. Exposés dans la structure générée avec une méthode Setter
3. Destiné à être alimenté par des crochets d'exécution (`ToolInterceptor`)

**Contexte** : A l'intérieur de `Tool`

```go
Tool("get_data", "Get data for current session", func() {
    Args(func() {
        Attribute("session_id", String, "Current session ID")
        Attribute("query", String, "Data query")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String))
    })
    BindTo("data_service", "get")
    Inject("session_id") // hidden from LLM, populated by interceptor
})
```

Au moment de l'exécution, utilisez un `ToolInterceptor` pour remplir les champs injectés :

```go
func (h *Handler) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    if call.Name == "data.get_data" {
        call.Payload.SetSessionID(ctx.Value(sessionKey).(string))
    }
    return nil
}
```

---

## Fonctions de politique

### RunPolicy

`RunPolicy(dsl)` configure les limites d'exécution appliquées au moment de l'exécution. Elle est déclarée à l'intérieur d'une `Agent` et contient des paramètres de politique tels que les plafonds, les budgets de temps, la gestion de l'historique et la gestion des interruptions.

**Contexte** : Dans `Agent`

**Fonctions de politique disponibles** : `Agent`
- `DefaultCaps` - limites de ressources (appels d'outils, échecs consécutifs)
- `TimeBudget` - limite simple de l'horloge murale pour l'ensemble de l'exécution
- `Timing` - délais d'attente précis pour les activités liées au budget, à la planification et aux outils (avancé)
- `History` - gestion de l'historique des conversations (fenêtre coulissante ou compression)
- `InterruptsAllowed` - activation de la pause/reprise pour l'homme dans la boucle
- `OnMissingFields` - comportement de validation pour les champs obligatoires manquants

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")

        History(func() {
            KeepRecentTurns(20)
        })
    })
})
```

### DefaultCaps

`DefaultCaps(opts...)` applique des plafonds de capacité pour empêcher les boucles d'emballement et imposer des limites d'exécution.

**Contexte** : Inside `RunPolicy`

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

**MaxToolCalls(n)** : Définit le nombre maximum d'invocations d'outils autorisées. Si ce nombre est dépassé, l'exécution est interrompue.

**MaxConsecutiveFailedToolCalls(n)** : Définit le nombre maximal d'échecs consécutifs des appels d'outils avant l'abandon. Cela permet d'éviter les boucles de réessais infinies.

### TimeBudget

`TimeBudget(duration)` impose une limite d'horloge murale à l'exécution de l'agent. La durée est spécifiée sous forme de chaîne (par exemple, `"2m"`, `"30s"`).

**Contexte** : Intérieur `RunPolicy`

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

Pour un contrôle plus fin des délais d'attente des activités individuelles, utilisez plutôt `Timing`.

### Chronométrage

`Timing(dsl)` permet de configurer finement les délais d'attente, à la place de `TimeBudget`. Alors que `TimeBudget` fixe une limite globale unique, `Timing` vous permet de contrôler les délais à trois niveaux : le budget d'exécution global, les activités du planificateur (inférence LLM) et les activités d'exécution de l'outil.

**Contexte** : A l'intérieur de `RunPolicy`

**Quand utiliser Timing vs TimeBudget:**
- Utilisez `TimeBudget` dans les cas simples où une seule limite de temps est suffisante
- Utilisez `Timing` lorsque vous avez besoin de délais différents pour la planification et l'exécution de l'outil - par exemple, lorsque les outils effectuent des appels API externes lents mais que vous souhaitez des réponses LLM rapides

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock budget for the entire run
        Plan("45s")     // timeout for Plan/Resume activities (LLM inference)
        Tools("2m")     // default timeout for ExecuteTool activities
    })
})
```

**Fonctions de temporisation:**

| La fonction de synchronisation est la suivante : - Fonction - Description - Affectation
|----------|-------------|---------|
| `Budget(duration)` | Budget total de l'horloge murale pour l'exécution | Cycle de vie complet de l'exécution | `Plan(duration)` | Délai d'attente pour les activités de planification et de reprise
| `Plan(duration)` | Délai d'attente pour les activités de planification et de reprise | Appels d'inférence LLM via le planificateur |
| `Tools(duration)` | Délai d'attente par défaut pour les activités ExecuteTool | Exécution d'outils (appels de service, MCP, agent-as-tool) |

**Comment la temporisation affecte le comportement de l'exécution:**

Le moteur d'exécution traduit ces valeurs DSL en options d'activité temporelles (ou en délais équivalents pour le moteur) :
- `Budget` devient le délai d'exécution du flux de travail
- `Plan` devient le délai d'attente pour les activités `PlanStart` et `PlanResume`
- `Tools` devient le délai d'attente par défaut pour les activités `ExecuteTool`

**Exemple complet:**

```go
Agent("data-processor", "Processes large datasets", func() {
    Use(DataToolset)
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(20))
        Timing(func() {
            Budget("30m")   // long-running data jobs
            Plan("1m")      // LLM decisions should be quick
            Tools("5m")     // data operations may take time
        })
    })
})
```

### Cache

`Cache(dsl)` configure le comportement de mise en cache des invites pour l'agent. Il indique où le moteur d'exécution doit placer les points de contrôle du cache par rapport aux invites du système et aux définitions d'outils pour les fournisseurs qui prennent en charge la mise en cache.

**Contexte** : Intérieur `RunPolicy`

La mise en cache des invites peut réduire considérablement les coûts d'inférence et la latence en permettant aux fournisseurs de réutiliser le contenu précédemment traité. La fonction Cache vous permet de définir les limites des points de contrôle que les fournisseurs utilisent pour déterminer quel contenu peut être mis en cache.

```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

**Fonctions de point de contrôle de la mise en cache:**

| Fonction | Description |
|----------|-------------|
| Place un point de contrôle du cache après tous les messages du système. Les fournisseurs l'interprètent comme une limite de cache suivant immédiatement le préambule du système. |
`AfterTools()` | Place un point de contrôle de la mémoire cache après les définitions d'outils. Les fournisseurs l'interprètent comme une limite de cache immédiatement après la section de configuration de l'outil. |

**Provider Support:**

Tous les fournisseurs ne prennent pas en charge la mise en cache rapide, et la prise en charge varie selon le type de point de contrôle :

| Les fournisseurs ne prennent pas tous en charge la mise en cache des invites et la prise en charge varie selon le type de point de contrôle : - Fournisseur - AfterSystem - AfterTools
|----------|-------------|------------|
bedrock (modèles Claude) ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ↪So_2713
| Bedrock (modèles Nova) | | ✓ | ✗ |

Les fournisseurs qui ne prennent pas en charge la mise en cache ignorent ces options. Le moteur d'exécution valide les contraintes spécifiques au fournisseur - par exemple, la demande de `AfterTools` avec un modèle Nova renvoie une erreur.

**When to Use Cache:**

- Utilisez `AfterSystem()` lorsque l'invite de votre système est stable d'un tour à l'autre et que vous souhaitez éviter de la traiter à nouveau
- Utilisez `AfterTools()` lorsque vos définitions d'outils sont stables et que vous souhaitez mettre en cache la configuration de l'outil
- Combinez les deux pour bénéficier au maximum de la mise en cache avec les fournisseurs pris en charge

**Exemple complet:**

```go
Agent("assistant", "Conversational assistant", func() {
    Use(DocsToolset)
    Use(SearchToolset)
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(10))
        TimeBudget("5m")
        Cache(func() {
            AfterSystem()  // cache the system prompt
            AfterTools()   // cache tool definitions (Claude only)
        })
    })
})
```

### Historique

`History(dsl)` définit la manière dont le runtime gère l'historique de la conversation avant chaque invocation du planificateur. Les politiques d'historique transforment l'historique des messages tout en le préservant :

- Les invites du système au début de la conversation
- Les limites logiques du tour (utilisateur + assistant + appels/résultats de l'outil en tant qu'unités atomiques)

Une seule politique d'historique peut être configurée par agent.

**Contexte** : Intérieur `RunPolicy`

Deux politiques standard sont disponibles :

**Maintien des virages récents (fenêtre coulissante):**

`KeepRecentTurns(n)` ne retient que les N tours les plus récents de l'utilisateur/assistant tout en préservant les invites du système et les échanges d'outils. Il s'agit de l'approche la plus simple pour limiter la taille du contexte.

```go
RunPolicy(func() {
    History(func() {
        KeepRecentTurns(20) // Keep the last 20 user/assistant turns
    })
})
```

**Paramètres:**
- `n` : Nombre de tours récents à conserver (doit être > 0)

**Compression (résumé assisté par modèle):**

`Compress(triggerAt, keepRecent)` résume les tours plus anciens à l'aide d'un modèle tout en conservant les tours récents en toute fidélité. Cela permet de préserver plus de contexte qu'une simple fenêtre coulissante en condensant les conversations plus anciennes dans un résumé.

```go
RunPolicy(func() {
    History(func() {
        // When at least 30 turns exist, summarize older turns
        // and keep the most recent 10 in full fidelity
        Compress(30, 10)
    })
})
```

**Paramètres:**
- `triggerAt` : Nombre minimum de tours avant compression (doit être > 0)
- `keepRecent` : Nombre de tours les plus récents à conserver en toute fidélité (doit être >= 0 et < triggerAt)

**HistoryModel Requirement:**

When using `Compress`, vous devez fournir un `model.Client` via le champ `HistoryModel` généré dans la configuration de l'agent. Le runtime utilise ce client avec `ModelClassSmall` pour résumer les anciens tours :

```go
// Generated agent config includes HistoryModel field when Compress is used
cfg := chat.ChatAgentConfig{
    Planner:      &ChatPlanner{},
    HistoryModel: smallModelClient, // Required: implements model.Client
}
if err := chat.RegisterChatAgent(ctx, rt, cfg); err != nil {
    log.Fatal(err)
}
```

Si `HistoryModel` n'est pas fourni lorsque `Compress` est configuré, l'enregistrement échouera.

**Turn Boundary Preservation:**

Les deux politiques préservent les limites logiques des virages en tant qu'unités atomiques. Un "virage" se compose de :
1. Un message de l'utilisateur
2. La réponse de l'assistant (texte et/ou appels d'outils)
3. Les résultats éventuels de cette réponse

Cela garantit que le modèle voit toujours des séquences d'interaction complètes, jamais des tours partiels qui pourraient confondre le contexte.

### Interruptions autorisées
 
`InterruptsAllowed(bool)` signale que les interruptions humaines dans la boucle doivent être prises en compte. Lorsqu'elle est activée, l'exécution prend en charge les opérations de pause/reprise, qui sont essentielles pour les boucles de clarification et les états d'attente durables.
 
**Contexte** : Intérieur `RunPolicy`
 
**Principaux avantages:**
- Permet à l'agent de **pause** l'exécution lorsqu'il manque des informations requises (voir `OnMissingFields`).
- Permet au planificateur d'**attendre** les données de l'utilisateur par le biais d'outils de clarification.
- Assure que l'état de l'agent est préservé exclusivement pendant la pause, ne consommant aucune ressource de calcul jusqu'à la reprise.
 
```go
RunPolicy(func() {
    // Enable pause/resume capability
    InterruptsAllowed(true)
    
    // Automatically pause when required tool arguments are missing
    OnMissingFields("await_clarification")
})
```

### OnMissingFields

`OnMissingFields(action)` configure la manière dont l'agent réagit lorsque la validation de l'invocation de l'outil détecte des champs obligatoires manquants.

**Contexte** : Inside `RunPolicy`

Valeurs valides :
- `"finalize"` : Arrêter l'exécution lorsque des champs obligatoires sont manquants
- `"await_clarification"` : Pause et attente pour que l'utilisateur fournisse les informations manquantes
- `"resume"` : Poursuit l'exécution malgré les champs manquants
- `""` (vide) : Laisser le planificateur décider en fonction du contexte

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

### Exemple de politique complète

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        Timing(func() {
            Budget("5m")
            Plan("30s")
            Tools("1m")
        })
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")
        History(func() {
            Compress(30, 10)
        })
    })
})
```

---

## Fonctions MCP

Goa-AI fournit des fonctions DSL pour déclarer les serveurs MCP (Model Context Protocol) dans les services Goa.

### MCPServer

`MCPServer(name, version, opts...)` active le support MCP pour le service actuel. Il configure le service pour qu'il expose les outils, les ressources et les invites via le protocole MCP.

**Alias** : `MCP(name, version, opts...)` est un alias pour `MCPServer`. Les deux fonctions ont un comportement identique.

**Contexte** : Dans `Service`

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    // Using MCPServer
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    // Or equivalently using the MCP alias
    // MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("add", func() {
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(func() {
            Attribute("sum", Int, "Result of addition")
            Required("sum")
        })
        MCPTool("add", "Add two numbers")
    })
})
```

### ProtocolVersion

`ProtocolVersion(version)` configure la version du protocole MCP prise en charge par le serveur. Il renvoie une fonction de configuration à utiliser avec `MCPServer` ou `MCP`.

**Context** : Argument d'option à `MCPServer` ou `MCP`

```go
Service("calculator", func() {
    // Specify protocol version as an option
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
})
```

### MCPTool

`MCPTool(name, description)` marque la méthode en cours comme un outil MCP. La charge utile de la méthode devient le schéma d'entrée de l'outil et le résultat devient le schéma de sortie.

**Contexte** : Inside `Method` (le service doit avoir MCP activé)

```go
Method("search", func() {
    Payload(func() {
        Attribute("query", String, "Search query")
        Attribute("limit", Int, "Maximum results", func() { Default(10) })
        Required("query")
    })
    Result(func() {
        Attribute("results", ArrayOf(String), "Search results")
        Required("results")
    })
    MCPTool("search", "Search documents by query")
})
```

### MCPToolset

`MCPToolset(service, toolset)` déclare un ensemble d'outils défini par MCP et dérivé d'un serveur Goa MCP.

**Contexte** : Niveau supérieur

Il existe deux types d'utilisation :

**Serveur MCP soutenu par Goa:**

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

**Serveur MCP externe avec schémas en ligne:**

```go
var RemoteSearch = MCPToolset("remote", "search", func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

### Ressource et WatchableResource

`Resource(name, uri, mimeType)` marque une méthode en tant que fournisseur de ressources MCP.

`WatchableResource(name, uri, mimeType)` indique qu'une méthode est une ressource à laquelle on peut s'abonner.

**Contexte** : Inside `Method` (le service doit avoir MCP activé)

```go
Method("readme", func() {
    Result(String)
    Resource("readme", "file:///docs/README.md", "text/markdown")
})

Method("system_status", func() {
    Result(func() {
        Attribute("status", String, "Current system status")
        Attribute("uptime", Int, "Uptime in seconds")
        Required("status", "uptime")
    })
    WatchableResource("status", "status://system", "application/json")
})
```

### StaticPrompt et DynamicPrompt

`StaticPrompt(name, description, messages...)` ajoute un modèle d'invite statique.

`DynamicPrompt(name, description)` marque une méthode comme générateur d'invite dynamique.

**Contexte** : A l'intérieur de `Service` (statique) ou `Method` (dynamique)

```go
Service("assistant", func() {
    MCPServer("assistant", "1.0")
    
    // Static prompt
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    // Dynamic prompt
    Method("code_review", func() {
        Payload(func() {
            Attribute("language", String, "Programming language")
            Attribute("code", String, "Code to review")
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
})
```

### Notification et abonnement

`Notification(name, description)` marque une méthode en tant qu'expéditeur de notifications MCP.

`Subscription(resourceName)` marque une méthode en tant que gestionnaire d'abonnement pour une ressource observable.

**Contexte** : Inside `Method` (le service doit avoir MCP activé)

```go
Method("progress_update", func() {
    Payload(func() {
        Attribute("task_id", String, "Task identifier")
        Attribute("progress", Int, "Progress percentage (0-100)")
        Required("task_id", "progress")
    })
    Notification("progress", "Task progress notification")
})

Method("subscribe_status", func() {
    Payload(func() {
        Attribute("uri", String, "Resource URI to subscribe to")
        Required("uri")
    })
    Result(String)
    Subscription("status") // Links to WatchableResource named "status"
})
```

### SubscriptionMonitor

`SubscriptionMonitor(name)` marque la méthode actuelle en tant que moniteur d'événements envoyés par le serveur (SSE) pour les mises à jour d'abonnement. La méthode transmet les événements de changement d'abonnement aux clients connectés.

**Contexte** : Inside `Method` (le service doit avoir activé MCP)

```go
Method("watch_subscriptions", func() {
    StreamingResult(func() {
        Attribute("resource", String, "Resource URI that changed")
        Attribute("event", String, "Event type (created, updated, deleted)")
        Required("resource", "event")
    })
    SubscriptionMonitor("subscriptions")
})
```

**Quand utiliser SubscriptionMonitor:**
- Lorsque les clients ont besoin de mises à jour en temps réel sur les changements d'abonnement
- Pour implémenter des points d'extrémité SSE qui envoient des événements d'abonnement
- Lors de la construction d'interfaces utilisateur réactives qui répondent aux changements de ressources

### Exemple complet de serveur MCP

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    Method("search", func() {
        Description("Search documents")
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        MCPTool("search", "Search documents by query")
    })
    
    Method("get_readme", func() {
        Result(String)
        Resource("readme", "file:///README.md", "text/markdown")
    })
    
    Method("get_status", func() {
        Result(func() {
            Attribute("status", String)
            Attribute("updated_at", String)
        })
        WatchableResource("status", "status://system", "application/json")
    })
    
    Method("subscribe_status", func() {
        Payload(func() { Attribute("uri", String) })
        Result(String)
        Subscription("status")
    })
    
    Method("review_code", func() {
        Payload(func() {
            Attribute("language", String)
            Attribute("code", String)
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
    
    Method("notify_progress", func() {
        Payload(func() {
            Attribute("task_id", String)
            Attribute("progress", Int)
            Required("task_id", "progress")
        })
        Notification("progress", "Task progress update")
    })
})
```

---

## Fonctions du registre

Goa-AI fournit des fonctions DSL pour déclarer et consommer des registres d'outils - des catalogues centralisés de serveurs MCP, d'ensembles d'outils et d'agents qui peuvent être découverts et consommés par des agents.

### Registre

`Registry(name, dsl)` déclare une source de registre pour la découverte d'outils. Les registres sont des catalogues centralisés qui peuvent être découverts et consommés par les agents goa-ai.

**Contexte** : Niveau supérieur

Dans la fonction DSL, utilisez :
- `URL` : définit l'URL du point de terminaison du registre (obligatoire)
- `Description` : définit une description lisible par l'homme
- `APIVersion` : définit la version de l'API du registre (la valeur par défaut est "v1")
- `Security` : référence les schémas de sécurité Goa pour l'authentification
- `Timeout` : définit le délai d'attente pour les requêtes HTTP
- `Retry` : configure la politique de réessai pour les requêtes échouées
- `SyncInterval` : définit la fréquence de rafraîchissement du catalogue
- `CacheTTL` : définit la durée du cache local
- `Federation` : configure les paramètres d'importation du registre externe

```go
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    Security(CorpAPIKey)
    Timeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})
```

**Options de configuration:**

| Fonction | Description | Exemple
|----------|-------------|---------|
| `URL(endpoint)` URL du point de terminaison du registre (obligatoire) | `URL("https://registry.corp.internal")` | `APIVersion(version)` Segment du chemin de la version de l'API
| `APIVersion(version)` | Segment de chemin de la version de l'API | `APIVersion("v1")` | `Timeout(duration)` | Segment de chemin de la version de l'API

| `Retry(maxRetries, backoff)` | Politique de réessai pour les requêtes échouées | `Retry(3, "1s")` |
| `SyncInterval(duration)` | Intervalle de rafraîchissement du catalogue
| `CacheTTL(duration)` | Durée du cache local | `CacheTTL("1h")` | `CacheTTL("1h")` |

### Fédération

`Federation(dsl)` configure les paramètres d'importation du registre externe. Utilisez Federation à l'intérieur d'une déclaration de registre pour spécifier les espaces de noms à importer à partir d'une source fédérée.

**Contexte** : A l'intérieur de `Registry`

À l'intérieur de la fonction DSL de fédération, utilisez :
- `Include` : spécifie des modèles globaux pour les espaces de noms à importer
- `Exclude` : spécifie des modèles globaux pour les espaces de noms à ignorer

```go
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "data-*")
        Exclude("experimental/*", "deprecated/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})
```

**Inclure et exclure:**

- `Include(patterns...)` : spécifie des motifs globaux pour les espaces de noms à importer. Si aucun motif d'inclusion n'est spécifié, tous les espaces de noms sont inclus par défaut.
- `Exclude(patterns...)` : spécifie des modèles globaux pour les espaces de noms à ignorer. Les motifs d'exclusion sont appliqués après les motifs d'inclusion.

### FromRegistry

`FromRegistry(registry, toolset)` configure un jeu d'outils pour qu'il provienne d'un registre. Utilisez FromRegistry comme option de fournisseur lors de la déclaration d'un jeu d'outils.

**Context** : Argument de `Toolset`

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

// Basic usage - toolset name derived from registry toolset name
var RegistryTools = Toolset(FromRegistry(CorpRegistry, "data-tools"))

// With explicit name
var MyTools = Toolset("my-tools", FromRegistry(CorpRegistry, "data-tools"))

// With additional configuration
var ConfiguredTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
    Tags("data", "etl")
})
```

Les ensembles d'outils soutenus par le registre peuvent être rattachés à une version spécifique à l'aide de la fonction DSL standard `Version()` :

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var PinnedTools = Toolset("stable-tools", FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
})
```

### PublishTo

`PublishTo(registry)` configure la publication de registre pour un jeu d'outils exporté. Utilisez PublishTo à l'intérieur d'un DSL d'exportation pour spécifier les registres dans lesquels le jeu d'outils doit être publié.

**Contexte** : Dans `Toolset` (lors de l'exportation)

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var LocalTools = Toolset("utils", func() {
    Tool("summarize", "Summarize text", func() {
        Args(func() { Attribute("text", String) })
        Return(func() { Attribute("summary", String) })
    })
})

Agent("data-agent", "Data processing agent", func() {
    Use(LocalTools)
    Export(LocalTools, func() {
        PublishTo(CorpRegistry)
        Tags("data", "etl")
    })
})
```

### Exemple complet de registre

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Define registries
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    Security(CorpAPIKey)
    Timeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})

var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Federation(func() {
        Include("web-search", "code-execution")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Consume toolsets from registries
var DataTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("2.1.0")
})

var SearchTools = Toolset(FromRegistry(AnthropicRegistry, "web-search"))

// Local toolset to publish
var AnalyticsTools = Toolset("analytics", func() {
    Tool("analyze", "Analyze dataset", func() {
        Args(func() {
            Attribute("dataset_id", String, "Dataset identifier")
            Required("dataset_id")
        })
        Return(func() {
            Attribute("insights", ArrayOf(String), "Analysis insights")
            Required("insights")
        })
    })
})

var _ = Service("orchestrator", func() {
    Agent("analyst", "Data analysis agent", func() {
        Use(DataTools)
        Use(SearchTools)
        Use(AnalyticsTools)
        
        // Export and publish to registry
        Export(AnalyticsTools, func() {
            PublishTo(CorpRegistry)
            Tags("analytics", "data")
        })
        
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

---

## Prochaines étapes

- **[Runtime](./runtime.md)** - Comprendre comment les conceptions se traduisent en comportement d'exécution
- **[Outils](./toolsets.md)** - Approfondissement des modèles d'exécution des outils
- **[Intégration MCP](./mcp-integration.md)** - Câblage de l'exécution pour les serveurs MCP
