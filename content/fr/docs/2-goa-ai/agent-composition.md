---
title: Composition de l'agent
weight: 5
description: "Learn how to compose agents using agent-as-tool patterns, run trees, and streaming topology."
llm_optimized: true
aliases:
---

Ce guide montre comment composer des agents en traitant un agent comme un outil d'un autre, et explique comment Goa-AI modélise les exécutions d'agents comme un arbre avec des projections en continu pour différents publics.

## Ce que vous allez construire

- Un agent de planification qui exporte des outils de planification
- Un agent orchestrateur qui utilise les outils de l'agent de planification
- Composition inter-processus avec exécution en ligne

---

## Conception d'agents composés

Créer `design/design.go` :

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var PlanRequest = Type("PlanRequest", func() {
    Attribute("goal", String, "Goal to plan for")
    Required("goal")
})

var PlanResult = Type("PlanResult", func() {
    Attribute("plan", String, "Generated plan")
    Required("plan")
})

var _ = Service("orchestrator", func() {
    // Planning agent that exports tools
    Agent("planner", "Planning agent", func() {
        Export("planning.tools", func() {
            Tool("create_plan", "Create a plan", func() {
                Args(PlanRequest)
                Return(PlanResult)
            })
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(5))
            TimeBudget("1m")
        })
    })
    
    // Orchestrator agent that uses planning tools
    Agent("orchestrator", "Orchestration agent", func() {
        Use(AgentToolset("orchestrator", "planner", "planning.tools"))
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

Générer le code :

```bash
goa gen example.com/tutorial/design
```

---

## Mise en œuvre des planificateurs

Le code généré fournit des aides pour les deux agents. Câblez-les ensemble :

```go
package main

import (
    "context"
    
    planner "example.com/tutorial/gen/orchestrator/agents/planner"
    orchestrator "example.com/tutorial/gen/orchestrator/agents/orchestrator"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()
    
    // Register planning agent
    if err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Register orchestrator agent (automatically uses planning tools)
    if err := orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Use orchestrator agent
    client := orchestrator.NewClient(rt)
    // ... run agent ...
}
```

**Key Concepts:**

- **Export** : Déclare les ensembles d'outils que d'autres agents peuvent utiliser
- **AgentToolset** : Fait référence à un jeu d'outils exporté d'un autre agent
- **Inline Execution** : Du point de vue de l'appelant, un agent-as-tool se comporte comme un appel d'outil normal ; le runtime exécute l'agent fournisseur en tant que run enfant et agrège ses résultats en un seul `ToolResult` (avec un `RunLink` renvoyant au run enfant)
- **Cross-Process** : Les agents peuvent être exécutés sur différents travailleurs tout en conservant un arbre d'exécution cohérent ; les événements `AgentRunStarted` et les gestionnaires d'exécution relient les appels d'outils parents aux exécutions d'agents enfants pour la diffusion en continu et l'observabilité

---

## Passthrough : Transfert d'outils déterministe

Pour les outils exportés qui doivent contourner entièrement le planificateur et passer directement à une méthode de service, utilisez `Passthrough`. Ceci est utile lorsque :

- Vous voulez un comportement déterministe et prévisible (pas de prise de décision LLM)
- L'outil est une simple enveloppe autour d'une méthode de service existante
- Vous avez besoin d'une latence garantie sans surcharge du planificateur

### Quand utiliser Passthrough vs Exécution Normale

| Scénario d'exécution : utiliser le Passthrough, utiliser l'exécution normale
|----------|-----------------|----------------------|
| Opérations CRUD simples | ✓ | | Outils de journalisation et d'audit
| Outils de journalisation/audit | ✓ | | Outils nécessitant un raisonnement LLM
| Outils nécessitant un raisonnement LLM | | ✓ | | Outils nécessitant un raisonnement LLM | ✓ | | Outils nécessitant un raisonnement LLM
| Outils nécessitant un raisonnement LLM
| Outils pouvant nécessiter des tentatives avec indices | | ✓ |

### Déclaration DSL

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("level", String, "Log level", func() {
                Enum("debug", "info", "warn", "error")
            })
            Attribute("message", String, "Message to log")
            Required("level", "message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
            Required("logged")
        })
        // Bypass planner, forward directly to LoggingService.LogMessage
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

### Comportement en cours d'exécution

Lorsqu'un agent consommateur appelle un outil passthrough :

1. Le runtime reçoit l'appel de l'outil de la part du planificateur du consommateur
2. Au lieu d'invoquer le planificateur de l'agent fournisseur, il appelle directement la méthode du service cible
3. Le résultat est renvoyé au consommateur sans aucun traitement LLM

Cela permet d'obtenir
- **une latence prévisible** : Pas de délai d'inférence LLM
- **Un comportement déterministe** : La même entrée produit toujours la même sortie
- **Rendement économique** : Pas d'utilisation de jetons pour les opérations simples

---

## Exécuter les arbres et les sessions

Goa-AI modélise l'exécution comme un **arbre d'exécutions et d'outils** :

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees" >}}

- **Run** - une exécution d'un agent :
  - Identifié par un `RunID`
  - Décrit par `run.Context` (RunID, SessionID, TurnID, labels, caps)
  - Suivi durable via `run.Record` (statut, horodatage, étiquettes)

- **Session** - une conversation ou un flux de travail couvrant une ou plusieurs exécutions :
  - `SessionID` regroupe des runs liés (par exemple, chat multi-tours)
  - Les interfaces utilisateur affichent généralement une session à la fois

- **Arbre d'exécution** - relations parents/enfants entre les exécutions et les outils :
  - Exécution d'agent de niveau supérieur (par exemple, `chat`)
  - Exécutions d'agents enfants (agents en tant qu'outils, par exemple, `ada`, `diagnostics`)
  - Outils de service sous ces agents

Le moteur d'exécution maintient cette arborescence à l'aide de :

- `run.Handle` - une poignée légère avec `RunID`, `AgentID`, `ParentRunID`, `ParentToolCallID`
- Les agents en tant qu'outils et les enregistrements de jeux d'outils qui **créent toujours de véritables exécutions enfant** pour les agents imbriqués (pas de hacks cachés en ligne)

---

## Agent-as-Tool et RunLink

Lorsqu'un agent utilise un autre agent comme outil :

1. Le runtime démarre un **child run** pour l'agent fournisseur avec son propre `RunID`
2. Il suit les liens parent/enfant dans `run.Context`
3. Il exécute une boucle complète de planification/exécution/reprise dans l'enfant

Le résultat de l'outil parent (`planner.ToolResult`) est transmis :

```go
RunLink *run.Handle
```

Ce `RunLink` permet :
- Aux planificateurs de raisonner sur l'exécution de l'enfant (par exemple, pour l'audit/l'enregistrement)
- Aux interfaces utilisateur de créer des "cartes d'agent" imbriquées qui peuvent s'abonner au flux de l'exécution enfant
- Des outils externes pour naviguer d'une exécution parentale à ses enfants sans deviner

---

## Flux par exécution

Chaque exécution a son **propre flux** de valeurs `stream.Event` :

- `AssistantReply`, `PlannerThought`, `ToolStart`, `ToolUpdate`, `PlannerThought`
- `ToolStart`, `ToolUpdate`, `ToolEnd`
- `AwaitClarification`, `AwaitExternalTools`
- `Usage`, `Workflow`
- `AgentRunStarted` (lien de l'outil parent → exécution enfant)

Les consommateurs s'inscrivent pour chaque exécution :

```go
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil { /* handle */ }
defer stop()
```

Cette méthode permet d'éviter les casques d'incendie globaux et laisse les interfaces utilisateur libres :
- D'attacher une connexion par exécution (par exemple, par session de chat)
- Décider du moment où il convient d'explorer les agents enfants en s'abonnant à leurs exécutions à l'aide des métadonnées `AgentRunStarted` (`ChildRunID`, `ChildAgentID`)

---

## Profils de flux et politiques pour les enfants

`stream.StreamProfile` décrit ce qu'un public voit. Chaque profil contrôle :

- Les types d'événements inclus (`Assistant`, `Thoughts`, `ToolStart`, `ToolUpdate`, `ToolEnd`, `AwaitClarification`, `AwaitExternalTools`, `Usage`, `Workflow`, `AgentRuns`)
- Comment les courses des enfants sont projetées via `ChildStreamPolicy`

### Structure StreamProfile

```go
type StreamProfile struct {
    Assistant          bool              // Assistant reply events
    Thoughts           bool              // Planner thinking/reasoning events
    ToolStart          bool              // Tool invocation start events
    ToolUpdate         bool              // Tool progress update events
    ToolEnd            bool              // Tool completion events
    AwaitClarification bool              // Human clarification requests
    AwaitExternalTools bool              // External tool execution requests
    Usage              bool              // Token usage events
    Workflow           bool              // Run lifecycle events
    AgentRuns          bool              // Agent-as-tool link events
    ChildPolicy        ChildStreamPolicy // How child runs are projected
}
```

### Options de ChildStreamPolicy

L'option `ChildStreamPolicy` contrôle la manière dont les agents imbriqués apparaissent dans le flux :

| Politique - Constante - Comportement - Politique - Politique - Constante - Comportement - Politique - Politique - Politique - Constante - Comportement - Politique - Politique
|--------|----------|----------|
| La politique de l'agent est la suivante : `ChildStreamPolicy` | Les exécutions enfants sont cachées à cette audience ; seuls les appels à l'outil parent et les résultats sont visibles. C'est la meilleure solution pour les pipelines de métriques qui n'ont pas besoin de détails imbriqués. |
| Les événements des enfants sont projetés dans le flux d'exécution parent, ce qui crée une vue de débogage de type "tuyau d'arrosage". Utile pour le débogage opérationnel lorsque vous souhaitez que tous les événements soient regroupés dans un seul flux. |
`ChildStreamPolicyLinked` Le parent émet des événements de lien `AgentRunStarted` ; les événements des enfants restent sur leurs propres flux. Les interfaces utilisateur peuvent s'abonner aux flux enfants à la demande. Idéal pour les interfaces de chat structurées. |

### Profils intégrés

Goa-AI propose trois profils intégrés pour les cas d'utilisation courants :

**`stream.UserChatProfile()`** - Interfaces de chat pour l'utilisateur final

```go
// Returns a profile suitable for end-user chat views
func UserChatProfile() StreamProfile {
    return StreamProfile{
        Assistant:          true,
        Thoughts:           true,
        ToolStart:          true,
        ToolUpdate:         true,
        ToolEnd:            true,
        AwaitClarification: true,
        AwaitExternalTools: true,
        Usage:              true,
        Workflow:           true,
        AgentRuns:          true,
        ChildPolicy:        ChildStreamPolicyLinked,
    }
}
```

- Emet tous les types d'événements pour un rendu riche de l'interface utilisateur
- Utilise la politique **Linked** pour les enfants afin que les interfaces utilisateur puissent rendre des "cartes d'agent" imbriquées et s'abonner à des flux d'enfants à la demande
- Maintient la voie de discussion principale propre tout en permettant d'explorer les agents imbriqués

**`stream.AgentDebugProfile()`** - Débogage opérationnel

```go
// Returns a verbose profile for debugging views
func AgentDebugProfile() StreamProfile {
    p := DefaultProfile()
    p.ChildPolicy = ChildStreamPolicyFlatten
    return p
}
```

- Emet tous les types d'événements comme `UserChatProfile`
- Utilise la politique **Flatten** pour projeter tous les événements enfants dans le flux parent
- Emet toujours des liens `AgentRunStarted` pour la corrélation
- Idéal pour les consoles de débogage et les outils de dépannage

**`stream.MetricsProfile()`** - Pipelines de télémétrie

```go
// Returns a profile for metrics/telemetry pipelines
func MetricsProfile() StreamProfile {
    return StreamProfile{
        Usage:       true,
        Workflow:    true,
        ChildPolicy: ChildStreamPolicyOff,
    }
}
```

- N'émet que les événements `Usage` et `Workflow`
- Utilise la politique **Off** pour les enfants afin de masquer entièrement les exécutions imbriquées
- Frais généraux minimes pour le suivi des coûts et des performances

### Câblage des profils aux abonnés

Appliquer des profils lors de la création d'abonnés à des flux :

```go
import "goa.design/goa-ai/runtime/agent/stream"

// Create a subscriber with the user chat profile
chatSub, err := stream.NewSubscriberWithProfile(chatSink, stream.UserChatProfile())
if err != nil {
    return err
}

// Create a subscriber with the debug profile
debugSub, err := stream.NewSubscriberWithProfile(debugSink, stream.AgentDebugProfile())
if err != nil {
    return err
}

// Create a subscriber with the metrics profile
metricsSub, err := stream.NewSubscriberWithProfile(metricsSink, stream.MetricsProfile())
if err != nil {
    return err
}
```

### Création de profils personnalisés

Pour des besoins spécifiques, créez des profils personnalisés en définissant des champs individuels :

```go
// Custom profile: tools and workflow only, no thoughts or assistant replies
toolsOnlyProfile := stream.StreamProfile{
    ToolStart:   true,
    ToolUpdate:  true,
    ToolEnd:     true,
    Workflow:    true,
    ChildPolicy: stream.ChildStreamPolicyLinked,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

// Custom profile: flatten child runs but skip thoughts
flatNoThoughts := stream.StreamProfile{
    Assistant:          true,
    ToolStart:          true,
    ToolUpdate:         true,
    ToolEnd:            true,
    AwaitClarification: true,
    AwaitExternalTools: true,
    Usage:              true,
    Workflow:           true,
    AgentRuns:          true,
    ChildPolicy:        stream.ChildStreamPolicyFlatten,
}

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### Lignes directrices pour la sélection des profils

| Profil recommandé - Raison d'être - Public - Profil recommandé - Raison d'être - Profil recommandé - Raison d'être - Raison d'être
|----------|---------------------|-----------|
| `UserChatProfile()` | Structure épurée avec des cartes d'agents extensibles
| Console d'administration/débogage `AgentDebugProfile()` | Visibilité complète avec des événements enfants aplatis |
| | Métriques/facturation | `MetricsProfile()` | Evénements minimaux pour l'agrégation |
| Enregistrement d'audit | Personnalisé (tous les événements, liés) | Enregistrement complet avec hiérarchie structurée |
| Tableaux de bord en temps réel | Personnalisé (flux de travail + utilisation) | Suivi de l'état et des coûts uniquement |

Les applications choisissent le profil lors du câblage des puits et des ponts (par exemple, Pulse, SSE, WebSocket) :
- Les interfaces de dialogue en ligne restent propres et structurées (parcours d'enfants liés, cartes d'agent)
- Les consoles de débogage peuvent voir les flux d'événements imbriqués complets
- Les pipelines de métrologie voient juste assez pour agréger l'utilisation et les statuts

---

## Concevoir des interfaces utilisateur avec des arbres d'exécution

Étant donné l'arbre d'exécution + le modèle de flux, une interface utilisateur de chat typique peut.. :

1. S'abonner à l'exécution **root chat** avec un profil de chat utilisateur
2. Rendre :
   - Réponses de l'assistant
   - Lignes d'outils pour les outils de premier niveau
   - événements "Agent run started" sous forme de **Cartes d'agent** imbriquées
3. Lorsque l'utilisateur développe une carte :
   - S'abonner à l'exécution de l'enfant en utilisant `ChildRunID`
   - Rendre la ligne temporelle de cet agent (pensées, outils, attentes) à l'intérieur de la carte
   - Garder la voie de discussion principale propre

Les outils de débogage peuvent s'abonner avec un profil de débogage pour voir :
- Les événements enfants aplatis
- Les métadonnées explicites parent/enfant
- Les arbres d'exécution complets pour le dépannage

L'idée clé : **La topologie de l'exécution (arbre d'exécution) est toujours préservée**, et la diffusion en continu n'est qu'un ensemble de projections sur cet arbre pour différents publics.

---

## Prochaines étapes

- **[Intégration MCP](./mcp-integration.md)** - Connexion aux serveurs d'outils externes
- **[Mémoire et sessions](./memory-sessions.md)** - Gérer l'état avec des transcriptions et des mémoires
- **[Production](./production.md)** - Déployer avec l'interface temporelle et le streaming
