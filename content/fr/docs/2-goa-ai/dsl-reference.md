---
title: Référence DSL
weight: 2
description: "Complete reference for Goa-AI's DSL functions - agents, toolsets, policies, and MCP integration."
llm_optimized: true
aliases:
---

Ce document fournit une référence complète pour les fonctions DSL du Goa-AI. Utilisez-le avec le guide [Runtime](./runtime.md) pour comprendre comment les conceptions se traduisent en comportement d'exécution.

## Référence rapide DSL


| Fonction                                                | Contexte                  | Description                                                                                                        |
| ------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Fonctions d'agent**                                     |                          |                                                                                                                    |
| `Agent`                                                 | Service                  | Définit un agent basé sur LLM                                                                                         |
| `Completion`                                            | Service                  | Déclare un contrat de sortie d'assistant direct dactylographié appartenant au service                                                    |
| `Use`                                                   | Agent                    | Déclare la consommation de l'ensemble d'outils                                                                                       |
| `Export`                                                | Agent, Service           | Expose les ensembles d'outils à d'autres agents                                                                                   |
| `AgentToolset`                                          | Utiliser des arguments             | Jeu d’outils de références d’un autre agent                                                                              |
| `UseAgentToolset`                                       | Agent                    | Alias ​​pour AgentToolset + Utilisation                                                                                       |
| `Passthrough`                                           | Outil (en Export)         | Méthode de transfert déterministe vers le service                                                                         |
| `DisableAgentDocs`                                      | API                      | Désactive la génération AGENTS_QUICKSTART.md                                                                           |
| **Fonctions de l'ensemble d'outils**                                   |                          |                                                                                                                    |
| `Toolset`                                               | Niveau supérieur                | Déclare un ensemble d'outils appartenant au fournisseur                                                                                  |
| `FromMCP`                                               | Argument de l’ensemble d’outils         | Configure l'ensemble d'outils soutenu par MCP                                                                                      |
| `FromRegistry`                                          | Argument de l’ensemble d’outils         | Configure un ensemble d'outils basés sur le registre                                                                                 |
| `Description`                                           | Ensemble d'outils                  | Définit la description du jeu d'outils                                                                                           |
| **Fonctions de l'outil**                                      |                          |                                                                                                                    |
| `Tool`                                                  | Ensemble d'outils, méthode          | Définit un outil appelable                                                                                            |
| `Args`                                                  | Outil                     | Définit le schéma des paramètres d'entrée                                                                                     |
| `Return`                                                | Outil, achèvement         | Définit le schéma de résultat visible par le modèle                                                                            |
| `ServerData`                                            | Outil                     | Définit le schéma de données du serveur uniquement (jamais envoyé aux fournisseurs de modèles)                                                    |
| `FromMethodResultField`                                 | Données du serveur               | Projette les données du serveur à partir d'un champ de résultat de méthode de service lié                                                     |
| `AudienceTimeline`                                      | Données du serveur               | Marque les données du serveur comme chronologique/UI éligibles (par défaut)                                                               |
| `AudienceInternal`                                      | Données du serveur               | Marque les données du serveur comme pièce jointe de composition interne                                                           |
| `AudienceEvidence`                                      | Données du serveur               | Marque les données du serveur comme provenance ou preuve d'audit                                                                 |
| `BoundedResult`                                         | Outil                     | Déclare un contrat à résultats limités appartenant au runtime ; le sous-DSL facultatif peut déclarer les champs du curseur de pagination                |
| `Cursor`                                                | Résultat délimité            | Déclare quel champ de charge utile porte la référence de continuation du runtime (facultatif)                                      |
| `NextCursor`                                            | Résultat délimité            | Déclare le nom du champ de résultat projeté pour la référence de continuation de la page suivante (facultatif)                     |
| `Idempotent`                                            | Outil                     | Marque l’outil comme idempotent dans une transcription d’exécution ; permet une déduplication sécurisée des transcriptions croisées pour des appels identiques |
| `Tags`                                                  | Outil, ensemble d'outils            | Attache des étiquettes de métadonnées                                                                                           |
| `BindTo`                                                | Outil                     | Lie l'outil à la méthode de service                                                                                       |
| `Inject`                                                | Outil                     | Marque les champs comme injectés lors de l'exécution                                                                                   |
| `CallHintTemplate`                                      | Outil                     | Modèle d'affichage pour les appels                                                                                   |
| `ResultHintTemplate`                                    | Outil                     | Modèle d'affichage des résultats                                                                                       |
| `ResultReminder`                                        | Outil                     | Rappel du système statique après le résultat de l'outil                                                                           |
| `Confirmation`                                          | Outil                     | Nécessite une confirmation hors bande explicite avant l'exécution                                                        |
| `TerminalRun`                                           | Outil                     | Marque le terminal de l'outil : l'exécution se termine immédiatement après son exécution (pas de tour de suivi du planificateur)               |
| `Bookkeeping`                                           | Outil                     | Marque l'outil comme comptabilité : les appels ne consomment pas le budget de récupération `MaxToolCalls` au niveau de l'exécution et restent cachés par défaut aux futurs tours du planificateur. |
| **Fonctions de stratégie**                                    |                          |                                                                                                                    |
| `RunPolicy`                                             | Agent                    | Configure les contraintes d'exécution                                                                                   |
| `DefaultCaps`                                           | Exécuter la politique                | Fixe les limites des ressources                                                                                               |
| `MaxToolCalls`                                          | Caps par défaut              | Nombre maximal d'appels d'outils                                                                                           |
| `MaxConsecutiveFailedToolCalls`                         | Caps par défaut              | Nombre maximum d'échecs consécutifs                                                                                       |
| `TimeBudget`                                            | Exécuter la politique                | Limite d'horloge murale simple                                                                                            |
| `Timing`                                                | Exécuter la politique                | Configuration précise du délai d'attente                                                                                 |
| `Budget`                                                | Timing                   | Budget global d'exécution                                                                                                 |
| `Plan`                                                  | Timing                   | Expiration du délai d'activité du planificateur                                                                                           |
| `Tools`                                                 | Timing                   | Expiration du délai d'activité de l'outil                                                                                              |
| `History`                                               | Exécuter la politique                | Gestion de l'historique des conversations                                                                                    |
| `KeepRecentTurns`                                       | Histoire                  | Politique de fenêtre glissante                                                                                              |
| `Compress`                                              | Histoire                  | Résumé assisté par modèle                                                                                       |
| `Cache`                                                 | Exécuter la politique                | Configuration de la mise en cache rapide                                                                                       |
| `AfterSystem`                                           | Cache                    | Point de contrôle après les messages système                                                                                   |
| `AfterTools`                                            | Cache                    | Point de contrôle après les définitions d'outils                                                                                  |
| `InterruptsAllowed`                                     | Exécuter la politique                | Activer la pause/reprise                                                                                                |
| `OnMissingFields`                                       | Exécuter la politique                | Comportement de validation                                                                                                |
| **Fonctions MCP**                                       |                          |                                                                                                                    |
| `MCP`                                                   | Service                  | Active la prise en charge de MCP                                                                                                |
| `ProtocolVersion`                                       | Option MCP               | Définit la version du protocole MCP                                                                                          |
| `Tool`                                                  | Méthode                   | Marque une méthode comme outil MCP dans un service compatible MCP                                                            |
| `Toolset(FromMCP(...))`                                 | Niveau supérieur                | Déclare un ensemble d'outils dérivés de MCP soutenu par Goa                                                                          |
| `Toolset("name", FromExternalMCP(...), func() { ... })` | Niveau supérieur                | Déclare un jeu d'outils MCP externe avec des schémas en ligne                                                               |
| `Resource`                                              | Méthode                   | Marque la méthode comme ressource MCP                                                                                       |
| `WatchableResource`                                     | Méthode                   | Marque la méthode comme ressource abonnable                                                                              |
| `StaticPrompt`                                          | Service                  | Ajoute un modèle d'invite statique                                                                                        |
| `DynamicPrompt`                                         | Méthode                   | Méthode Marks comme générateur d'invites                                                                                   |
| `Notification`                                          | Méthode                   | Marque la méthode comme expéditeur de notification                                                                                |
| `Subscription`                                          | Méthode                   | Marque la méthode comme gestionnaire d’abonnement                                                                               |
| `SubscriptionMonitor`                                   | Méthode                   | Moniteur SSE pour les abonnements                                                                                      |
| **Fonctions de registre**                                  |                          |                                                                                                                    |
| `Registry`                                              | Niveau supérieur                | Déclare une source de registre                                                                                         |
| `URL`                                                   | Enregistrement                 | Définit le point de terminaison du registre                                                                                             |
| `APIVersion`                                            | Enregistrement                 | Définit la version API                                                                                                   |
| `Timeout`                                               | Enregistrement                 | Définit le délai d'expiration HTTP                                                                                                  |
| `Retry`                                                 | Enregistrement                 | Configure la politique de nouvelle tentative                                                                                            |
| `SyncInterval`                                          | Enregistrement                 | Définit l'intervalle d'actualisation du catalogue                                                                                      |
| `CacheTTL`                                              | Enregistrement                 | Définit la durée du cache local                                                                                          |
| `Federation`                                            | Enregistrement                 | Configure les importations de registre externe                                                                               |
| `Include`                                               | Fédération               | Modèles globaux à importer                                                                                            |
| `Exclude`                                               | Fédération               | Modèles Glob à ignorer                                                                                              |
| `PublishTo`                                             | Exporter                   | Configure la publication du registre                                                                                    |
| `Version`                                               | Ensemble d'outils                  | Version du jeu d'outils du registre d'épingles                                                                                      |
| **Fonctions de schéma**                                    |                          |                                                                                                                    |
| `Attribute`                                             | Args, retour, ServerData | Définit le champ de schéma (usage général)                                                                                 |
| `Field`                                                 | Args, retour, ServerData | Définit le champ proto numéroté (gRPC)                                                                                |
| `Required`                                              | Schéma                   | Marque les champs comme requis                                                                                           |
| `Example`                                               | Schéma                   | Joint un exemple explicite ; les exemples de payload d'outil racine déclarés deviennent des exemples natifs fournisseur et des conseils de nouvelle tentative |


### Exemples de payload d'outil

Pour les schémas de payload d'outil, un `Example(...)` Goa de niveau supérieur
déclaré est la source des exemples de niveau supérieur exposés aux fournisseurs.
Codegen conserve cet exemple dans la spécification d'outil générée sous forme de
JSON brut et d'objet d'entrée parsé, et émet aussi le schéma annoté ainsi qu'un
schéma dont seul l'`example` racine a été retiré.

Les adaptateurs fournisseur utilisent directement ces projections. Les
fournisseurs basés sur les annotations de schéma utilisent le JSON Schema annoté.
Anthropic direct et Bedrock Claude utilisent des `input_examples` natifs avec la
projection sans exemple racine ; Bedrock transmet les champs Anthropic via
`additionalModelRequestFields` quand le contrat beta l'exige. Les exemples
générés ou synthétisés ne sont jamais promus en exemples fournisseur de niveau
supérieur.

## Gestion des invites (chemin d'intégration v1)

Goa-AI v1 ne nécessite **pas** d'invite dédiée DSL (`Prompt(...)`, `Prompts(...)`).
La gestion des invites est actuellement basée sur l'exécution :

- Enregistrez les spécifications d'invite de base dans `runtime.PromptRegistry`.
- Configurez les remplacements de portée avec `runtime.WithPromptStore(...)`.
- Affichez les invites des planificateurs à l'aide de `PlannerContext.RenderPrompt(...)`.
- Attachez la provenance de l'invite rendue aux appels de modèle avec `model.Request.PromptRefs`.

Pour les flux d'agent en tant qu'outil, mappez les ID d'outil aux ID d'invite à l'aide d'options d'exécution telles que
`runtime.WithPromptSpec(...)` sur les enregistrements d'outils d'agent.
Ceci est facultatif : lorsqu'aucun contenu d'invite côté consommateur n'est configuré, le moteur d'exécution
utilise la charge utile de l'outil canonique JSON comme message utilisateur et fournisseur imbriqués
les planificateurs peuvent afficher leurs propres invites avec un contexte injecté côté serveur.

### Champ vs attribut

`Field` et `Attribute` définissent des champs de schéma, mais ils servent à des fins différentes :

`**Attribute(name, type, description, dsl)`** - Définition de schéma à usage général :

- Utilisé pour les schémas JSON uniquement
- Aucune numérotation de champ requise
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

`**Field(number, name, type, description, dsl)**` - Champs numérotés pour gRPC/protobuf :

- Requis lors de la génération des services gRPC
- Les numéros de champs doivent être uniques et stables
- À utiliser lorsque votre service expose à la fois les transports HTTP et gRPC

```go
Args(func() {
    Field(1, "query", String, "Search query")
    Field(2, "limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**Quand utiliser lequel :**

- Utilisez `Attribute` pour les outils d'agent qui utilisent uniquement JSON (cas le plus courant)
- Utilisez `Field` lorsque votre service Goa dispose d'un transport gRPC et que les outils sont liés à ces méthodes
- Le mélange est autorisé mais déconseillé au sein d’un même schéma

## Aperçu

Goa-AI étend le DSL de Goa avec des fonctions permettant de déclarer des agents, des ensembles d'outils et des politiques d'exécution. Le DSL est évalué par le moteur `eval` de Goa, donc les mêmes règles s'appliquent qu'avec le service/transport standard DSL : les expressions doivent être invoquées dans le contexte approprié et les définitions d'attributs réutilisent le système de types de Goa (`Attribute`, `Field`, validations, exemples, etc.).

### Chemin d'importation

Ajoutez les agents DSL à vos packages de conception Goa :

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### Point d'entrée

Déclarez les agents dans une définition Goa `Service` normale. Le DSL augmente l'arbre de conception du Goa et est traité pendant le `goa gen`.

### Résultat

L’exécution de `goa gen` produit :

- Packages d'agent (`gen/<service>/agents/<agent>`) avec définitions de flux de travail, activités de planification et aides à l'inscription
- Packages d'achèvement appartenant au service (`gen/<service>/completions`) lorsque le service déclare `Completion(...)`
- Packages propriétaires d'ensemble d'outils (`gen/<service>/toolsets/<toolset>`) avec structures de charge utile/résultat typées, spécifications, codecs et (le cas échéant) transformations
- Gestionnaires d’activités pour les boucles planifier/exécuter/reprendre
- Aides à l'enregistrement qui connectent la conception au runtime

Un `AGENTS_QUICKSTART.md` contextuel est écrit à la racine du module, sauf s'il est désactivé via `DisableAgentDocs()`.

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

var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

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

L’exécution de `goa gen example.com/assistant/design` produit :

- `gen/orchestrator/agents/chat` : workflow + activités du planificateur + registre des agents
- `gen/orchestrator/agents/chat/specs` : catalogue d'outils d'agent (`ToolSpec` agrégés + `tool_schemas.json`)
- `gen/orchestrator/toolsets/<toolset>` : types/spécifications/codecs/transformations appartenant au jeu d'outils pour les jeux d'outils appartenant au service
- `gen/orchestrator/agents/chat/exports/<export>` : packages d'ensembles d'outils exportés (agent-as-tool)
- Aides à l'enregistrement compatibles MCP lorsqu'un ensemble d'outils soutenu par MCP est référencé via `Use`

### Identificateurs d'outils typés

Chaque package de spécifications par ensemble d'outils définit des identifiants d'outil typés (`tools.Ident`) pour chaque outil généré :

```go
const (
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Utilisez ces constantes partout où vous avez besoin de référencer des outils.

### Complétions typées appartenant au service

Les outils ne sont pas le seul contrat structuré que Goa-AI peut détenir. Utiliser
`Completion(...)` lorsque l'assistant doit renvoyer directement une réponse finale dactylographiée
au lieu d'émettre un appel d'outil :

```go
var Draft = Type("Draft", func() {
    Attribute("name", String, "Task name")
    Attribute("goal", String, "Outcome-style goal")
    Required("name", "goal")
})

var _ = Service("tasks", func() {
    Completion("draft_from_transcript", "Produce a task draft directly", func() {
        Return(Draft)
    })
})
```

Les noms de réalisation font partie du contrat de sortie structurée. Ils doivent être
1 à 64 caractères ASCII, peuvent contenir des lettres, des chiffres, `_` et `-`, et doivent
commencez par une lettre ou un chiffre.

`goa gen` émet un package sous `gen/<service>/completions` avec :

- schémas de résultats générés et types Go saisis
- codecs JSON générés et aides à la validation
- valeurs `completion.Spec` saisies
- assistants `Complete<Name>(ctx, client, req)` générés
- généré `StreamComplete<Name>(ctx, client, req)` et `Decode<Name>Chunk(...)`
aides

Les assistants unaires décodent directement la réponse finale de l'assistant. Aides au streaming
rester sur la surface brute `model.Streamer` : les morceaux `completion_delta` sont
en aperçu uniquement, exactement un dernier morceau `completion` est canonique, et
`Decode<Name>Chunk(...)` décode uniquement cette charge utile finale.

Les assistants d'achèvement générés rejettent les demandes activées par l'outil et fournies par l'appelant
`StructuredOutput`. Les fournisseurs qui n’implémentent pas de sortie structurée échouent
explicitement avec `model.ErrStructuredOutputUnsupported`.
Le schéma généré reste le contrat de service canonique ; les adaptateurs de modèle peuvent
le normaliser pour le décodage contraint spécifique au fournisseur, mais ils doivent le rejeter
prestataires qui ne peuvent pas représenter le contrat déclaré.

### Composition en ligne multi-processus

Lorsque l'agent A déclare qu'il "utilise" un jeu d'outils exporté par l'agent B, la composition des fils Goa-AI est automatique :

- Le package exportateur (agent B) inclut les assistants `agenttools` générés
- Le registre des agents du consommateur (agent A) utilise ces assistants lorsque vous `Use(AgentToolset("service", "agent", "toolset"))`
- La fonction `Execute` générée crée des messages de planificateur imbriqués, exécute l'agent fournisseur en tant que flux de travail enfant et adapte le `RunOutput` de l'agent imbriqué en un `planner.ToolResult`.

Cela produit un seul flux de travail déterministe par exécution d'agent et une arborescence d'exécution liée pour la composition.

---

## Fonctions des agents

### Agent

`Agent(name, description, dsl)` déclare un agent à l'intérieur d'un `Service`. Il enregistre les métadonnées de l'agent au niveau du service et attache des ensembles d'outils via `Use` et `Export`.

**Contexte** : À l'intérieur de `Service`

Chaque agent devient un enregistrement d'exécution avec :

- Une définition de workflow et des gestionnaires d'activités Temporal
- Activités PlanStart/PlanResume avec options de nouvelle tentative/expiration dérivées du DSL
- Un assistant `Register<Agent>` qui enregistre les flux de travail, les activités et les ensembles d'outils

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

### Utiliser

`Use(value, dsl)` déclare qu'un agent consomme un ensemble d'outils. L'ensemble d'outils peut être :

- Une variable `Toolset` de niveau supérieur
- Un jeu d'outils déclaré avec `FromMCP(...)` ou `FromExternalMCP(...)`
- Une définition d'ensemble d'outils en ligne (nom de chaîne + DSL)
- Une référence `AgentToolset` pour la composition d'agent en tant qu'outil

**Contexte** : À l'intérieur de `Agent`

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference with subsetting
    Use(CommonTools, func() {
        Tool("notify") // consume only this tool from CommonTools
    })
    
    // Reference an MCP toolset declared at top level
    Use(AssistantSuite)
    
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

### Exporter

`Export(value, dsl)` déclare les ensembles d'outils exposés à d'autres agents ou services. Les ensembles d'outils exportés peuvent être utilisés par d'autres agents via `Use(AgentToolset(...))`.

**Contexte** : à l'intérieur de `Agent` ou `Service`

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

### Ensemble d'outils d'agent

`AgentToolset(service, agent, toolset)` fait référence à un jeu d'outils exporté par un autre agent. Cela permet une composition d'agent en tant qu'outil.

**Contexte** : Argument à `Use`

Utilisez `AgentToolset` lorsque :

- Vous n'avez pas de handle d'expression pour le jeu d'outils exporté
- Plusieurs agents exportent des jeux d’outils portant le même nom
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

**Alias** : `UseAgentToolset(service, agent, toolset)` est un alias qui combine `AgentToolset` avec `Use` en un seul appel. Préférez `AgentToolset` dans les nouveaux designs ; l'alias existe pour des raisons de lisibilité dans certaines bases de code.

```go
// Equivalent to Use(AgentToolset("service", "planner", "planning.tools"))
Agent("orchestrator", func() {
    UseAgentToolset("service", "planner", "planning.tools")
})
```

### Passage

`Passthrough(toolName, target, methodName)` définit le transfert déterministe d'un outil exporté vers une méthode de service Goa. Cela contourne complètement le planificateur.

**Contexte** : à l'intérieur de `Tool` imbriqué sous `Export`

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

### DésactiverAgentDocs

`DisableAgentDocs()` désactive la génération de `AGENTS_QUICKSTART.md` à la racine du module.

**Contexte** : À l'intérieur de `API`

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

---

## Fonctions de l'ensemble d'outils

### Ensemble d'outils

`Toolset(name, dsl)` déclare un ensemble d'outils appartenant au fournisseur au niveau supérieur. Lorsqu'il est déclaré au niveau supérieur, l'ensemble d'outils devient globalement réutilisable ; les agents y font référence via `Use`.

**Contexte** : niveau supérieur

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

Les ensembles d'outils peuvent inclure une description à l'aide de la fonction standard `Description()` DSL :

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

`Tool(name, description, dsl)` définit une capacité appelable dans un ensemble d'outils.

**Contexte** : à l'intérieur de `Toolset` ou `Method`

La génération de code émet :

- Charge utile/résultat des structures Go dans `tool_specs/types.go`
- Codecs JSON (`tool_specs/codecs.go`)
- JSON Définitions de schéma utilisées par les planificateurs
- Entrées de registre d'outils avec invites d'assistance et métadonnées

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
    ResultHintTemplate("Found {{ len .Result.Documents }} documents")
    Tags("docs", "search")
})
```

### Args et retour

`Args(...)` et `Return(...)` définissent les types de charge utile/résultat à l'aide de l'attribut standard Goa DSL.

**Contexte** : À l'intérieur de `Tool`

Vous pouvez utiliser :

- Une fonction pour définir un schéma d'objet en ligne avec des appels `Attribute()`
- Un type d'utilisateur Goa (Type, ResultType, etc.) pour réutiliser les définitions de types existantes
- Un type primitif (String, Int, etc.) pour des entrées/sorties simples à valeur unique

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

**Réutilisation des types :**

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

### Données du serveur

`ServerData(kind, val, args...)` définit la sortie typée réservée au serveur émise avec le résultat d'un outil. Les données du serveur ne sont jamais envoyées aux fournisseurs de modèles.
Les données du serveur Timeline sont généralement projetées dans des cartes, des graphiques, des tableaux ou des cartes UI orientés vers l'observateur tout en gardant le résultat orienté vers le modèle limité et efficace en termes de jetons. Les preuves et les audiences internes permettent aux consommateurs en aval d'acheminer des données de provenance ou de composition uniquement sans s'appuyer sur des conventions de dénomination de type.

**Contexte** : À l'intérieur de `Tool`

**Paramètres :**

- `kind` : identifiant de chaîne pour le type de données du serveur (par exemple, `"atlas.time_series"`, `"atlas.control_narrative"`, `"aura.evidence"`). Cela permet aux consommateurs d'identifier et de gérer de manière appropriée différentes projections de données du serveur.
- `val` : définition du schéma, suivant les mêmes modèles que `Args` et `Return` : soit une fonction avec des appels `Attribute()`, un type d'utilisateur Goa ou un type primitif.

**Routage d'audience (`Audience`*) :**

Chaque entrée `ServerData` déclare une audience que les consommateurs en aval utilisent pour acheminer la charge utile sans s'appuyer sur des conventions de dénomination de type :

- `"timeline"` : persistant et éligible à la projection face à l'observateur (par exemple, UI/cartes chronologiques)
- `"internal"` : accessoire de composition d'outils ; non persisté ou rendu
- `"evidence"` : références de provenance ; persisté séparément des cartes de chronologie

Définissez l'audience à l'intérieur du bloc `ServerData` DSL :

```go
ServerData("atlas.time_series.chart_points", TimeSeriesServerData, func() {
    AudienceInternal()
    FromMethodResultField("chart_sidecar")
})

ServerData("aura.evidence", ArrayOf(Evidence), func() {
    AudienceEvidence()
    FromMethodResultField("evidence")
})
```

**Quand utiliser ServerData :**

- Lorsque les résultats de l'outil doivent inclure des données pleine fidélité pour UIs (graphiques, graphiques, tableaux) tout en limitant les charges utiles du modèle
- Lorsque vous souhaitez attacher des ensembles de résultats volumineux qui dépasseraient les limites du contexte du modèle
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
})
```

**Utilisation d'un type Goa pour le schéma de données du serveur :**

```go
var TimeSeriesServerData = Type("TimeSeriesServerData", func() {
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
    ServerData("atlas.metrics", TimeSeriesServerData)
})
```

**Accès à l'exécution :**

Au moment de l'exécution, les données du serveur émises par les outils sont conservées
`planner.ToolResult.ServerData`. Décodez ces octets canoniques JSON avec le
codecs de données de serveur générés pour les types déclarés par l'outil :

```go
// In a stream subscriber or result handler
func handleToolResult(result *planner.ToolResult) {
    if len(result.ServerData) > 0 {
        // Decode with the generated server-data codecs for this tool.
    }
}
```

### Résultat délimité

`BoundedResult()` marque le résultat de l'outil actuel comme une vue limitée sur un ensemble de données potentiellement plus grand.
Il déclare un contrat de limites appartenant à l'exécution tout en conservant la sémantique et le type de résultat créé.
spécifique au domaine.

**Contexte** : À l'intérieur de `Tool`

Champs visibles dans le modèle canonique :

- `returned` (obligatoire, `Int`)
- `truncated` (obligatoire, `Boolean`)
- `total` (en option, `Int`)
- `refinement_hint` (en option, `String`)
- `next_cursor` (facultatif, `String`) lorsqu'il est déclaré via `NextCursor(...)`; c'est une référence de continuation du runtime, pas le curseur du fournisseur

`BoundedResult` est la seule source de vérité pour ce contrat :

- codegen l'enregistre dans le `tools.ToolSpec.Bounds` généré
- codegen projette les champs délimités canoniques dans le schéma de résultat JSON généré
- les exécutions limitées réussies doivent définir `planner.ToolResult.Bounds`
- le runtime projette les limites détenues par le fournisseur dans le JSON `tool_result` codé, les données de modèle d'indice de résultat,
hooks et événements de flux
- pour les outils paginés par curseur, le `next_cursor` visible par le modèle est le `tool_call_id` producteur; le curseur du fournisseur reste privé dans l'historique du runtime

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("site_id", String, "Site identifier")
        Attribute("cursor", String, "Runtime continuation reference returned by the previous page")
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "List of devices")
        Required("devices")
    })
    BoundedResult(func() {
        Cursor("cursor")
        NextCursor("next_cursor")
    })
})
```

Les types de retour côté outil ne doivent pas déclarer `returned`, `total`, `truncated`,
`refinement_hint`, ou `next_cursor` juste pour que le modèle puisse les voir. Gardez le résultat sémantique concentré
sur les données de domaine. Les outils basés sur des méthodes peuvent toujours utiliser des types de résultats de méthodes de service plus riches en interne, mais
le contrat d'outil Goa-AI provient de `BoundedResult(...)`, et non des champs de retour d'outil dupliqués. À l'intérieur
pour ces résultats de méthode liés, seuls `returned` et `truncated` peuvent être requis ; `total`,
`refinement_hint` et `next_cursor` restent des parties facultatives du contrat de limites.

**Responsabilité du service :**

Les services sont chargés de :

1. Appliquer leur propre logique de troncature (pagination, limites, plafonds de profondeur)
2. Remplissage de `planner.ToolResult.Bounds`
3. Définition de `Bounds.NextCursor` avec le curseur du fournisseur lorsqu'une autre page existe
4. Fournir éventuellement un `RefinementHint` lorsque les résultats sont tronqués

Le runtime ne calcule pas lui-même les sous-ensembles ni la troncature. Il valide et projette uniquement les limites
métadonnées rapportées par les outils.

**Quand utiliser BoundedResult :**

- Outils qui renvoient des listes paginées (appareils, utilisateurs, enregistrements)
- Outils qui interrogent de grands ensembles de données avec des limites de résultats
- Outils qui appliquent des limites de profondeur ou de taille aux structures imbriquées
- Tout outil où le modèle doit comprendre que les résultats peuvent être incomplets

**Comportement d'exécution :**

```go
result := &planner.ToolResult{
    Result: &ListDevicesResult{
        Devices: devices,
    },
    Bounds: &agent.Bounds{
        Returned:       len(devices),
        Total:          ptr(total),
        Truncated:      truncated,
        NextCursor:     nextCursor,
        RefinementHint: refinementHint,
    },
}
```

Lorsqu'un outil limité s'exécute :

1. Le runtime valide qu’un outil limité réussi a renvoyé `planner.ToolResult.Bounds`.
2. Le moteur d'exécution fusionne ces limites dans le JSON émis en utilisant les noms de champs de `BoundedResult(...)`.
   Quand `Bounds.NextCursor` est présent, le `next_cursor` émis est la référence de continuation `tool_call_id` productrice.
3. Le curseur du fournisseur reste un état privé du runtime utilisé pour hydrater l'appel suivant; les planificateurs, hooks,
flux et UIs reçoivent les limites visibles par le modèle.

Les outils peuvent inclure un titre d'affichage à l'aide de la fonction standard `Title()` DSL :

```go
Tool("web_search", "Search the web", func() {
    Title("Web Search")
    Args(func() { /* ... */ })
})
```

### Idempotent

`Idempotent()` marque l'outil actuel comme idempotent *dans une transcription d'exécution*.
Lorsqu'ils sont définis, les environnements d'exécution/planificateurs peuvent traiter les appels d'outils répétés avec des arguments identiques
comme redondants et évitez de les exécuter une fois qu'un résultat positif existe déjà dans
la transcription.

**Contexte** : À l'intérieur de `Tool`

**Quand utiliser**

Utilisez `Idempotent()` uniquement lorsque le résultat de l'outil est une pure fonction de ses arguments
pendant toute la durée de vie d'une transcription d'exécution (par exemple, la récupération d'une documentation
section par identifiant stable).

**Quand ne pas utiliser**

Ne marquez pas les outils idempotents lorsque leur résultat dépend d'un changement d'état externe
mais la charge utile de l'outil ne comporte pas de paramètre heure/version (par exemple,
instantanés « obtenir le mode actuel » ou « obtenir l'état actuel » sans entrée `as_of`).

**Génération de code**

Lorsqu'un outil est marqué `Idempotent()`, codegen émet la balise
`goa-ai.idempotency=transcript` dans le `tools.ToolSpec.Tags` généré. Ceci
La balise est consommée par les environnements d'exécution/planificateurs qui implémentent la déduplication prenant en compte la transcription.

### Confirmation

`Confirmation(dsl)` déclare qu'un outil doit être explicitement approuvé hors bande avant d'être
exécute. Ceci est destiné aux outils **sensibles à l'opérateur** (écritures, suppressions, commandes).

**Contexte** : À l'intérieur de `Tool`

Au moment de la génération, Goa-AI enregistre la stratégie de confirmation dans la spécification de l'outil générée. Au moment de l'exécution, le
Le workflow émet une demande de confirmation à l'aide de `AwaitConfirmation` et exécute l'outil uniquement après un
une approbation explicite est fournie.

Exemple minimal :

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

Remarques :

- Le runtime est propriétaire de la manière dont la confirmation est demandée. Le protocole de confirmation intégré utilise un
`AwaitConfirmation` attend et un appel de décision `ProvideConfirmation`. Consultez le guide d'exécution pour le
charges utiles attendues et flux d’exécution.
- Les modèles de confirmation (`PromptTemplate` et `DeniedResultTemplate`) sont des chaînes Go `text/template`
exécuté avec `missingkey=error`. En plus des fonctions de modèle standard (par exemple `printf`),
Goa-AI fournit :
  - `json v` → JSON code `v` (utile pour les champs de pointeur facultatifs ou l'intégration de valeurs structurées).
  - `quote s` → renvoie une chaîne entre guillemets avec échappement Go (comme `fmt.Sprintf("%q", s)`).
- La confirmation peut également être activée dynamiquement au moment de l'exécution via `runtime.WithToolConfirmation(...)`
(utile pour les politiques basées sur l'environnement ou les remplacements par déploiement).

### CallHintTemplate et ResultHintTemplate

`CallHintTemplate(template)` et `ResultHintTemplate(template)` configurent des modèles d'affichage pour les appels d'outils et les résultats. Les modèles sont des chaînes de texte/modèle Go rendues avec des valeurs Go saisies pour produire des conseils concis affichés pendant et après l'exécution.

**Contexte** : À l'intérieur de `Tool`

**Points clés :**

- Les modèles d'appel reçoivent la charge utile saisie en tant que racine du modèle (par exemple, `.Query`, `.DeviceID`).
- Les modèles de résultats reçoivent un wrapper explicite où les champs sémantiques se trouvent sous `.Result` et les métadonnées limitées sous `.Bounds`.
- Gardez les conseils concis : ≤ 140 caractères recommandés pour un affichage UI propre
- Les modèles sont compilés avec `missingkey=error` : tous les champs référencés doivent exister
- Utilisez les noms de champs Go, pas les clés JSON
- Utilisez les blocs `{{ if .Field }}` ou `{{ with .Field }}` pour les champs facultatifs

**Contrat d'exécution :**

- Les constructeurs de hooks ne rendent pas d'indices. Les événements planifiés d’appel d’outil sont par défaut `DisplayHint==""`.
- Le runtime enrichit et conserve un indice d'appel par défaut durable au moment de la publication à partir du modèle typé lorsque le décodage de la charge utile réussit.
- L'enregistrement des outils exige un titre de métadonnées non vide. Lorsque le décodage typé échoue ou qu'aucun modèle n'est enregistré, le runtime utilise ce titre comme display hint. Les charges utiles mal formées échouent toujours à la frontière de l'outil ; le titre de métadonnées sert seulement à garder le travail tenté affichable. Les indices ne sont jamais rendus à partir des octets JSON bruts.
- Si un producteur définit explicitement `DisplayHint` (non vide) avant de publier l'événement hook, le runtime traite
comme faisant autorité et ne l'écrase pas.
- Pour les modifications de formulation par consommateur, configurez `runtime.WithHintOverrides` au moment de l'exécution. Les remplacements prennent
priorité sur les modèles créés par DSL pour les événements `tool_start` diffusés en streaming.

**Exemple de base :**

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
    ResultHintTemplate("Found {{ .Result.Count }} results")
})
```

**Champs de structure typés :**

Les modèles d'appel reçoivent la structure de charge utile Go générée en tant que racine du modèle.
Les modèles de résultats reçoivent le wrapper d'aperçu d'exécution, donc les champs sémantiques sont actifs
sous `.Result` et les métadonnées limitées se trouvent sous `.Bounds`. Les noms des champs suivent
Conventions de dénomination Go (PascalCase), pas conventions JSON (snake_case ou camelCase) :

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
    ResultHintTemplate("{{ .Result.DeviceName }}: {{ if .Result.IsOnline }}online{{ else }}offline{{ end }}")
})
```

**Gestion des champs facultatifs :**

Utilisez des blocs conditionnels pour les champs facultatifs afin d'éviter les erreurs de modèle :

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
    ResultHintTemplate("{{ .Result.Total }} items{{ if .Result.Truncated }} (truncated){{ end }}")
})
```

**Fonctions de modèle intégrées :**

Le runtime fournit ces fonctions d'assistance pour les modèles d'indices :


| Fonction   | Description                      | Exemple                      |
| ---------- | -------------------------------- | ---------------------------- |
| `join`     | Joindre une tranche de chaîne avec un séparateur | `{{ join .Tags ", " }}`      |
| `count`    | Compter les éléments dans une tranche        | `{{ count .Results }} items` |
| `truncate` | Tronquer la chaîne à N caractères  | `{{ truncate .Query 20 }}`   |


**Exemple complet avec toutes les fonctionnalités :**

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
    ResultHintTemplate("{{ count .Result.Insights }} insights in {{ .Result.ProcessingTimeMs }}ms")
})
```

### Rappel de résultat

`ResultReminder(text)` configure un rappel système statique qui est injecté dans la conversation après le retour du résultat de l'outil. Utilisez-le pour fournir des conseils en coulisses au modèle sur la manière d'interpréter ou de présenter le résultat à l'utilisateur.

**Contexte** : À l'intérieur de `Tool`

Le texte de rappel est automatiquement enveloppé dans des balises `<system-reminder>` par le runtime. N'incluez pas les balises dans le texte.

**Rappels statiques ou dynamiques :**

`ResultReminder` est destiné aux rappels statiques au moment de la conception qui s'appliquent à chaque fois que l'outil est appelé. Pour les rappels dynamiques qui dépendent de l'état d'exécution ou du contenu des résultats de l'outil, utilisez plutôt `PlannerContext.AddReminder()` dans l'implémentation de votre planificateur. Prise en charge des rappels dynamiques :

- Limitation du débit (tours minimum entre les émissions)
- Plafonds par cycle (émissions maximales par cycle)
- Ajout/suppression d'environnement d'exécution en fonction des conditions
- Niveaux de priorité (sécurité vs conseils)

**Exemple de base :**

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

**Quand utiliser ResultReminder :**

- Lorsque l'outil UI restitue les résultats d'une manière spéciale (graphiques, graphiques, tableaux) que le modèle doit connaître
- Quand le modèle doit éviter de répéter des informations déjà visibles par l'utilisateur
- Lorsqu'il existe un contexte important sur la façon dont les résultats sont présentés qui affecte la façon dont le modèle doit réagir
- Lorsque vous souhaitez des conseils cohérents qui s'appliquent à chaque appel de l'outil

**Plusieurs outils avec rappels :**

Lorsque plusieurs outils en un seul tour ont des rappels de résultats, ils sont combinés en un seul message système :

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

**Rappels dynamiques via PlannerContext :**

Pour les rappels qui dépendent des conditions d'exécution, utilisez plutôt le planificateur API :

```go
// In your planner implementation
func (p *MyPlanner) PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Add a dynamic reminder based on tool results
    for _, tr := range input.ToolOutputs {
        if tr.Name != "get_time_series" || tr.Error != nil {
            continue
        }
        result, err := specs.UnmarshalGetTimeSeriesResult(tr.Result)
        if err != nil {
            return nil, err
        }
        if hasAnomalies(result) {
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

### Balises

`Tags(values...)` annote les outils ou jeux d’outils avec des étiquettes de métadonnées. Les balises sont présentées aux moteurs de politiques et à la télémétrie.

**Contexte** : à l'intérieur de `Tool` ou `Toolset`

Modèles de balises courants :

- Catégories de domaines : `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- Types de capacités : `"read"`, `"write"`, `"search"`, `"transform"`
- Niveaux de risque : `"safe"`, `"destructive"`, `"external"`

```go
Tool("delete_file", "Delete a file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})
```

### Lier à

`BindTo("Method")` ou `BindTo("Service", "Method")` associe un outil à une méthode de service Goa.

**Contexte** : À l'intérieur de `Tool`

Lorsqu'un outil est lié à une méthode :

- Le schéma `Args` de l'outil peut différer du schéma `Payload` de la méthode.
- Le schéma `Return` de l'outil peut différer du schéma `Result` de la méthode.
- Les adaptateurs générés se transforment entre les types d'outils et de méthodes

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

`Inject(fields...)` marque des champs de charge utile spécifiques comme « injectés » (infrastructure côté serveur). Les champs injectés sont :

1. Masqué du LLM (exclu du schéma JSON envoyé au modèle)
2. Validé comme champs `String` requis sur la charge utile de la méthode liée
3. Rempli à partir de `runtime.ToolCallMeta` par les exécuteurs générés, avec des hooks `ToolInterceptor.Inject` en option

**Contexte** : À l'intérieur de `Tool`

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

Les noms de champs injectés pris en charge sont fixes : `run_id`, `session_id`, `turn_id`,
`tool_call_id` et `parent_tool_call_id`.

Au moment de l'exécution, les exécuteurs de service générés copient les valeurs correspondantes de
`runtime.ToolCallMeta` avant l'exécution des intercepteurs typés facultatifs :

```go
func (h *Handler) Inject(ctx context.Context, payload any, meta *runtime.ToolCallMeta) error {
    if p, ok := payload.(*dataservice.GetPayload); ok {
        p.SessionID = meta.SessionID
    }
    return nil
}
```

### TerminalExécuter

`TerminalRun()` marque l'outil actuel comme terminal pour l'exécution. Une fois que l'outil s'exécute avec succès, le moteur d'exécution termine l'exécution immédiatement après la publication du résultat de l'outil sans demander un tour de suivi `PlanResume`/finalisation.

**Contexte** : À l'intérieur de `Tool`

Utilisez `TerminalRun()` pour les outils dont le résultat est la sortie du terminal de l'exécution destinée à l'utilisateur, par exemple un moteur de rendu de rapport final ou un outil de « validation de cette exécution ». Le résultat de l'outil est l'artefact terminal de l'exécution ; une narration supplémentaire du modèle n’est ni nécessaire ni souhaitable.

```go
Tool("commit_task", "Commit the terminal task artifact", func() {
    Args(TaskCompletionArgs)
    Return(TaskCompletionResult)
    TerminalRun()
})
```

**Comportement d'exécution :**

- Codegen enregistre le drapeau sur `tools.ToolSpec.TerminalRun`.
- Après un appel réussi à l'outil de terminal, le runtime finalise l'exécution sans appeler `PlanResume`.
- Les outils de terminal composent naturellement avec `Bookkeeping()` (voir ci-dessous) : l'outil typique « valider cette exécution » est à la fois un terminal et une comptabilité, il s'exécute donc toujours même lorsque le budget de récupération est épuisé et termine l'exécution de manière atomique.

### Comptabilité

`Bookkeeping()` marque l'outil actuel comme un outil de comptabilité qui ne consomme pas le budget de récupération `MaxToolCalls` au niveau de l'exécution. Le moteur d'exécution ne décrémente pas `RemainingToolCalls` pour les appels de comptabilité et ne les supprime jamais lors de la réduction d'un lot pour l'adapter au budget restant.

**Contexte** : À l'intérieur de `Tool`

Utilisez `Bookkeeping()` pour les outils structurés de progression, de statut, de recherche et de validation de terminal dont le coût est la tenue de registres plutôt que la récupération ou le travail secondaire. Les exemples classiques sont les mises à jour de statut, les marqueurs de progression et l'outil atomique « valider cette exécution » qui écrit l'artefact final.

```go
Tool("set_step_status", "Update step status", func() {
    Args(SetStepStatusArgs)
    Return(SetStepStatusResult)
    Bookkeeping()
})
```

**Comportement d'exécution :**

- Codegen enregistre le drapeau sur `tools.ToolSpec.Bookkeeping`.
- Les appels de comptabilité ne sont jamais pris en compte dans `MaxToolCalls` et ne sont jamais ignorés lorsque le runtime réduit un lot pour l'adapter au budget restant. Les appels budgétisés (hors comptabilité) sont coupés en premier ; les appels comptables conservent leur position d'origine.
- Les résultats de comptabilité réussis restent cachés aux futurs tours de planification. Placez l'état canonique nécessaire au prochain tour dans une entrée explicite du planificateur plutôt que dans le résultat d'un outil de comptabilité.
- Les outils inconnus sont traités comme budgétisés ; seuls les outils déclarés `Bookkeeping()` dans le DSL (ou la comptabilité marquée sur le runtime `ToolSpec`) sont exonérés.
- Un tour de comptabilité uniquement doit être résolu au cours du même tour (`TerminalRun()`, `FinalResponse`, `FinalToolResult` ou attente/pause).

**Composition avec `TerminalRun()` :**

Un outil de validation de terminal est généralement à la fois un outil de comptabilité et un terminal :

```go
Tool("commit_task", "Commit the terminal task artifact", func() {
    Args(TaskCompletionArgs)
    Return(TaskCompletionResult)
    Bookkeeping()  // always executes, even when the budget is exhausted
    TerminalRun()  // ends the run atomically once it succeeds
})
```

Ce modèle garantit que l'exécution peut toujours se finaliser de manière déterministe : l'outil de validation est exempté du budget de récupération, et une fois qu'il réussit, l'exécution est effectuée sans un tour de suivi du planificateur.

## Fonctions de politique

### Exécuter la politique

`RunPolicy(dsl)` configure les limites d'exécution appliquées au moment de l'exécution. Il est déclaré dans un `Agent` et contient des paramètres de stratégie tels que les plafonds, les budgets de temps, la gestion de l'historique et la gestion des interruptions.

**Contexte** : À l'intérieur de `Agent`

**Fonctions de stratégie disponibles :**

- `DefaultCaps` – limites de ressources (appels d'outils, échecs consécutifs)
- `TimeBudget` – limite d'horloge murale simple pour toute la course
- `Timing` – délais d'attente précis pour les activités liées au budget, à la planification et aux outils (avancé)
- `History` – gestion de l’historique des conversations (fenêtre glissante ou compression)
- `InterruptsAllowed` – activer la pause/reprise pour l'humain dans la boucle
- `OnMissingFields` – comportement de validation pour les champs obligatoires manquants

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

### Caps par défaut

`DefaultCaps(opts...)` applique des plafonds de capacités pour éviter les boucles incontrôlables et appliquer les limites d'exécution.

**Contexte** : À l'intérieur de `RunPolicy`

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

**MaxToolCalls(n)** : définit le nombre maximum d'appels d'outils budgétisés autorisés par exécution. Les outils déclarés `Bookkeeping()` sont exemptés de ce plafond et ne comptent pas pour `n`. Lorsque le budget est épuisé, le runtime arrête la planification des appels budgétisés et finalise l'exécution via le planificateur avec le motif de fin `tool_cap`.

**MaxConsecutiveFailedToolCalls(n)** : définit le nombre maximal d'appels d'outils consécutifs ayant échoué avant l'abandon. Empêche les boucles de tentatives infinies.

### TempsBudget

`TimeBudget(duration)` applique une limite d'horloge murale à l'exécution de l'agent. La durée est spécifiée sous forme de chaîne (par exemple, `"2m"`, `"30s"`).

**Contexte** : À l'intérieur de `RunPolicy`

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

Pour un contrôle précis des délais d’expiration des activités individuelles, utilisez plutôt `Timing`.

### Timing

`Timing(dsl)` fournit une configuration fine du délai d'attente comme alternative à `TimeBudget`. Alors que `TimeBudget` définit une limite globale unique, `Timing` vous permet de contrôler les délais d'attente à trois niveaux : le budget d'exécution global, les activités du planificateur (inférence LLM) et les activités d'exécution de l'outil.

**Contexte** : À l'intérieur de `RunPolicy`

**Quand utiliser Timing vs TimeBudget :**

- Utilisez `TimeBudget` pour les cas simples où une seule limite d'horloge murale est suffisante
- Utilisez `Timing` lorsque vous avez besoin de délais d'attente différents pour la planification et l'exécution des outils, par exemple lorsque les outils effectuent des appels API externes lents mais que vous souhaitez des réponses LLM rapides.

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock budget for the entire run
        Plan("45s")     // timeout for Plan/Resume activities (LLM inference)
        Tools("2m")     // default timeout for ExecuteTool activities
    })
})
```

`Timing` reste au niveau de la couche d'exécution sémantique. `Plan(...)` et `Tools(...)`
lié à la durée pendant laquelle un planificateur ou une tentative d'outil sain peut s'exécuter une fois qu'il a démarré.
Ils ne configurent pas les mécanismes du moteur de workflow tels que les délais d'attente en file d'attente ou
vivacité du rythme cardiaque. Si vous utilisez l'adaptateur Temporal, configurez ces mécanismes
avec `temporal.Options.ActivityDefaults`.

**Fonctions de synchronisation :**


| Fonction           | Description                                | Affecte                                            |
| ------------------ | ------------------------------------------ | -------------------------------------------------- |
| `Budget(duration)` | Budget total de l'horloge murale pour la course        | Cycle de vie complet de l'exécution                               |
| `Plan(duration)`   | Délai d'expiration pour les activités de planification et de reprise     | Appels d'inférence LLM via le planificateur                    |
| `Tools(duration)`  | Délai d'expiration par défaut pour les activités ExecuteTool | Exécution d'outils (appels de service, MCP, agent-as-tool) |


**Comment la synchronisation affecte le comportement d'exécution :**

Le moteur d'exécution traduit ces valeurs DSL en budgets de tentatives indépendants du moteur :

- `Budget` définit le budget d'horloge murale sémantique pour l'exécution. Le runtime applique
ce budget pour le travail du planificateur/outil et dérive le délai d'arrêt du moteur comme
`Budget + FinalizerGrace + engine headroom` pour que le planificateur final reprenne son tour
et le nettoyage du terminal a encore du temps à terminer.
- `Plan` devient le budget d'essai pour `PlanStart` et `PlanResume`
- `Tools` devient le budget de tentative par défaut pour `ExecuteTool`

Le comportement d'attente et d'activité spécifique au temps est superposé séparément par
l'adaptateur Temporal.

**Exemple complet :**

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

`Cache(dsl)` configure le comportement de mise en cache des invites pour l'agent. Il spécifie où le moteur d'exécution doit placer les points de contrôle du cache par rapport aux invites système et aux définitions d'outils pour les fournisseurs prenant en charge la mise en cache.

**Contexte** : À l'intérieur de `RunPolicy`

La mise en cache rapide peut réduire considérablement les coûts d'inférence et la latence en permettant aux fournisseurs de réutiliser le contenu précédemment traité. La fonction Cache vous permet de définir les limites des points de contrôle que les fournisseurs utilisent pour déterminer quel contenu peut être mis en cache.

```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

**Fonctions de point de contrôle du cache :**


| Fonction        | Description                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AfterSystem()` | Place un point de contrôle du cache après tous les messages système. Les fournisseurs interprètent cela comme une limite de cache immédiatement après le préambule du système.         |
| `AfterTools()`  | Place un point de contrôle du cache après les définitions d'outils. Les fournisseurs interprètent cela comme une limite de cache immédiatement après la section de configuration de l'outil. |


**Assistance du fournisseur :**

Tous les fournisseurs ne prennent pas en charge la mise en cache rapide et la prise en charge varie selon le type de point de contrôle :


| Fournisseur                | Après le système | AprèsOutils |
| ----------------------- | ----------- | ---------- |
| Bedrock (modèles Claude) | ✓           | ✓          |
| Bedrock (modèles Nova)   | ✓           | ✗          |


Les fournisseurs qui ne prennent pas en charge la mise en cache ignorent ces options. Le runtime valide les contraintes spécifiques au fournisseur : par exemple, demander `AfterTools` avec un modèle Nova renvoie une erreur.

**Quand utiliser le cache :**

- Utilisez `AfterSystem()` lorsque l'invite de votre système est stable d'un tour à l'autre et que vous souhaitez éviter de la retraiter.
- Utilisez `AfterTools()` lorsque vos définitions d'outils sont stables et que vous souhaitez mettre en cache la configuration de l'outil
- Combinez les deux pour un avantage maximal en matière de mise en cache avec les fournisseurs pris en charge

**Exemple complet :**

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

### Histoire

`History(dsl)` définit la manière dont le runtime gère l'historique des conversations avant chaque appel du planificateur. Les politiques d'historique transforment l'historique des messages tout en préservant :

- Invites du système au début de la conversation
- Limites de virage logiques (utilisateur + assistant + appels/résultats d'outils sous forme d'unités atomiques)

Au plus une politique d'historique peut être configurée par agent.

**Contexte** : À l'intérieur de `RunPolicy`

Deux politiques standards sont disponibles :

**KeepRecentTurns (Fenêtre coulissante) :**

`KeepRecentTurns(n)` conserve uniquement les N tours d'utilisateur/assistant les plus récents tout en préservant les invites du système et les échanges d'outils. Il s’agit de l’approche la plus simple pour limiter la taille du contexte.

```go
RunPolicy(func() {
    History(func() {
        KeepRecentTurns(20) // Keep the last 20 user/assistant turns
    })
})
```

**Paramètres :**

- `n` : Nombre de tours récents à conserver (doit être > 0)

**Compresser (résumé assisté par modèle) :**

`Compress(triggerAt, keepRecent)` résume les tours plus anciens à l'aide d'un modèle tout en conservant les tours récents en toute fidélité. Cela préserve plus de contexte qu'une simple fenêtre coulissante en condensant une conversation plus ancienne en un résumé.

```go
RunPolicy(func() {
    History(func() {
        // When at least 30 turns exist, summarize older turns
        // and keep the most recent 10 in full fidelity
        Compress(30, 10)
    })
})
```

**Paramètres :**

- `triggerAt` : nombre total de tours minimum avant les opérations de compression (doit être > 0)
- `keepRecent` : Nombre de tours les plus récents à conserver en toute fidélité (doit être >= 0 et < triggerAt)

**Exigence du modèle d'historique :**

Lorsque vous utilisez `Compress`, vous devez fournir un `model.Client` via le champ `HistoryModel` généré dans la configuration de l'agent. Le runtime utilise ce client avec `ModelClassSmall` pour résumer les tours plus anciens :

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

Si `HistoryModel` n’est pas fourni lorsque `Compress` est configuré, l’enregistrement échouera.

**Préservation des limites de virage :**

Les deux politiques préservent les limites logiques des virages en tant qu’unités atomiques. Un « tour » consiste :

1. Un message utilisateur
2. La réponse de l'assistant (texto et/ou appels d'outils)
3. Tout outil résulte de cette réponse

Cela garantit que le modèle voit toujours des séquences d'interaction complètes, jamais des virages partiels qui pourraient confondre le contexte.

### Interruptions autorisées

`InterruptsAllowed(bool)` signale que les interruptions humaines dans la boucle doivent être respectées. Lorsqu'il est activé, le runtime prend en charge les opérations de pause/reprise, qui sont essentielles pour les boucles de clarification et les états d'attente durables.

**Contexte** : À l'intérieur de `RunPolicy`

**Principaux avantages :**

- Permet à l'agent de **mettre en pause** l'exécution lorsqu'il manque des informations requises (voir `OnMissingFields`).
- Permet au planificateur d'**attendre** la saisie de l'utilisateur via des outils de clarification.
- Garantit que l'état de l'agent est préservé exclusivement pendant la pause, sans consommer de ressources de calcul jusqu'à la reprise.

```go
RunPolicy(func() {
    // Enable pause/resume capability
    InterruptsAllowed(true)
    
    // Automatically pause when required tool arguments are missing
    OnMissingFields("await_clarification")
})
```

### Sur les champs manquants

`OnMissingFields(action)` configure la façon dont l'agent répond lorsque la validation de l'appel de l'outil détecte des champs obligatoires manquants.

**Contexte** : À l'intérieur de `RunPolicy`

Valeurs valides :

- `"finalize"` : Arrêter l'exécution lorsque les champs obligatoires sont manquants
- `"await_clarification"` : mettre en pause et attendre que l'utilisateur fournisse les informations manquantes
- `"resume"` : poursuivre l'exécution malgré les champs manquants
- `""` (vide) : laissez le planificateur décider en fonction du contexte

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

### Exemple de politique complet

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

Goa-AI fournit des fonctions DSL pour déclarer les serveurs Model Context Protocol (MCP) au sein des services Goa.

### MCP

`MCP(name, version, opts...)` active la prise en charge de MCP pour le service actuel. Il configure le service pour exposer des outils, des ressources et des invites via le protocole MCP.

**Contexte** : À l'intérieur de `Service`

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
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
        Tool("add", "Add two numbers")
    })
})
```

### Version du protocole

`ProtocolVersion(version)` configure la version du protocole MCP prise en charge par le serveur. Il renvoie une fonction de configuration à utiliser avec `MCP`.

**Contexte** : argument d'option pour `MCP`

```go
Service("calculator", func() {
    // Specify protocol version as an option
    MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
})
```

### Outil (dans le contexte de la méthode)

Dans un `Method` dans un service compatible MCP, `Tool(name, description)` marque la méthode actuelle comme un outil MCP. La charge utile de la méthode devient le schéma d'entrée de l'outil et le résultat devient le schéma de sortie.

**Contexte** : à l'intérieur de `Method` (le service doit avoir MCP activé)

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
    Tool("search", "Search documents by query")
})
```

### Jeu d'outils avec `FromMCP` / `FromExternalMCP`

Utilisez `Toolset(FromMCP(service, toolset))` pour les serveurs MCP définis par Goa dans la même conception, ou `Toolset("name", FromExternalMCP(service, toolset), func() { ... })` pour les serveurs MCP externes avec des schémas en ligne.

**Contexte** : niveau supérieur

**Serveur MCP soutenu par Goa :**

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

`FromMCP` doit pointer vers un service Goa dans la même conception que celui qui déclare `MCP(...)`.
Le générateur extrait les schémas d'outils des méthodes MCP de ce service.

**Serveur MCP externe avec schémas en ligne :**

```go
var RemoteSearch = Toolset("remote-search", FromExternalMCP("remote", "search"), func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

`FromExternalMCP` nécessite des déclarations `Tool(...)` en ligne car les
les schémas du serveur ne proviennent pas de la conception locale Goa.

### Ressource et WatchableResource

`Resource(name, uri, mimeType)` marque une méthode comme fournisseur de ressources MCP.

`WatchableResource(name, uri, mimeType)` marque une méthode comme ressource pouvant être soumise à abonnement.

**Contexte** : à l'intérieur de `Method` (le service doit avoir MCP activé)

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

`DynamicPrompt(name, description)` marque une méthode comme générateur d'invites dynamique.

**Contexte** : à l'intérieur de `Service` (statique) ou `Method` (dynamique)

```go
Service("assistant", func() {
    MCP("assistant-mcp", "1.0")
    
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

`Notification(name, description)` marque une méthode comme expéditeur de notification MCP.

`Subscription(resourceName)` marque une méthode comme gestionnaire d'abonnement pour une ressource observable.

**Contexte** : à l'intérieur de `Method` (le service doit avoir MCP activé)

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

### AbonnementMoniteur

`SubscriptionMonitor(name)` marque la méthode actuelle comme moniteur d'événements envoyés par le serveur (SSE) pour les mises à jour d'abonnement. La méthode diffuse les événements de modification d’abonnement aux clients connectés.

**Contexte** : à l'intérieur de `Method` (le service doit avoir MCP activé)

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

**Quand utiliser SubscriptionMonitor :**

- Lorsque les clients ont besoin de mises à jour en temps réel sur les modifications d'abonnement
- Pour implémenter des points de terminaison SSE qui transmettent des événements d'abonnement
- Lors de la création de UIs réactifs qui répondent aux changements de ressources

### Exemple complet de serveur MCP

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
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
        Tool("search", "Search documents by query")
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

## Fonctions de registre

Goa-AI fournit des fonctions DSL pour déclarer et consommer des registres d'outils : des catalogues centralisés de serveurs, d'ensembles d'outils et d'agents MCP qui peuvent être découverts et utilisés par les agents.

### Enregistrement

`Registry(name, dsl)` déclare une source de registre pour la découverte d'outils. Les registres sont des catalogues centralisés qui peuvent être découverts et consommés par les agents goa-ai.

**Contexte** : niveau supérieur

Dans la fonction DSL, utilisez :

- `URL` : définit l'URL du point de terminaison du registre (obligatoire)
- `Description` : définit une description lisible par l'homme
- `APIVersion` : définit la version du registre API (par défaut : "v1")
- `Security` : fait référence aux schémas de sécurité Goa pour l'authentification
- `Timeout` : définit le délai d'expiration de la demande HTTP
- `Retry` : configure la stratégie de nouvelle tentative pour les demandes ayant échoué
- `SyncInterval` : définit la fréquence d'actualisation du catalogue
- `CacheTTL` : définit la durée du cache local
- `Federation` : configure les paramètres d'importation du registre externe

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

**Options de configuration :**


| Fonction                     | Description                      | Exemple                                 |
| ---------------------------- | -------------------------------- | --------------------------------------- |
| `URL(endpoint)`              | URL du point de terminaison du registre (obligatoire) | `URL("https://registry.corp.internal")` |
| `APIVersion(version)`        | Segment de chemin de version API         | `APIVersion("v1")`                      |
| `Timeout(duration)`          | Expiration du délai de demande HTTP             | `Timeout("30s")`                        |
| `Retry(maxRetries, backoff)` | Politique de nouvelle tentative pour les demandes ayant échoué | `Retry(3, "1s")`                        |
| `SyncInterval(duration)`     | Intervalle d'actualisation du catalogue         | `SyncInterval("5m")`                    |
| `CacheTTL(duration)`         | Durée du cache local             | `CacheTTL("1h")`                        |


### Fédération

`Federation(dsl)` configure les paramètres d'importation du registre externe. Utilisez Federation dans une déclaration de Registre pour spécifier les espaces de noms à importer à partir d'une source fédérée.

**Contexte** : À l'intérieur de `Registry`

Dans la fonction Fédération DSL, utilisez :

- `Include` : spécifie les modèles globaux pour les espaces de noms à importer
- `Exclude` : spécifie les modèles globaux à ignorer pour les espaces de noms

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

**Inclure et exclure :**

- `Include(patterns...)` : spécifie les modèles globaux pour les espaces de noms à importer. Si aucun modèle d'inclusion n'est spécifié, tous les espaces de noms sont inclus par défaut.
- `Exclude(patterns...)` : spécifie les modèles globaux à ignorer pour les espaces de noms. Les modèles d'exclusion sont appliqués après les modèles d'inclusion.

### DeRegistre

`FromRegistry(registry, toolset)` configure un ensemble d'outils pour qu'il provienne d'un registre. Utilisez FromRegistry comme option de fournisseur lors de la déclaration d’un ensemble d’outils.

**Contexte** : Argument à `Toolset`

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

Les ensembles d'outils basés sur le registre peuvent être épinglés à une version spécifique à l'aide de la fonction standard `Version()` DSL :

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var PinnedTools = Toolset("stable-tools", FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
})
```

### Publier vers

`PublishTo(registry)` configure la publication du registre pour un jeu d'outils exporté. Utilisez PublishTo dans un Export DSL pour spécifier dans quels registres l'ensemble d'outils doit être publié.

**Contexte** : à l'intérieur de `Toolset` (lors de l'exportation)

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

### Exemple de registre complet

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

- **[Runtime](./runtime.md)** – Comprendre comment les conceptions se traduisent en comportement d'exécution
- **[Ensembles d'outils](./toolsets.md)** – Découvrez en profondeur les modèles d'exécution des ensembles d'outils
- **[Intégration MCP](./mcp-integration.md)** - Câblage d'exécution pour les serveurs MCP
