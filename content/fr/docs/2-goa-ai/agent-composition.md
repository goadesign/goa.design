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
- **Cross-Process** : Les agents peuvent être exécutés sur différents travailleurs tout en conservant un arbre d'exécution cohérent ; les événements `ChildRunLinked` et les gestionnaires d'exécution relient les appels d'outils parents aux exécutions d'agents enfants pour la diffusion en continu et l'observabilité

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
  - Suivi durable via `runlog.Store` (journal append-only; pagination par curseur)

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
- Aux interfaces utilisateur de créer des "cartes d'agent" imbriquées et de rendre les événements en filtrant le flux de session par `run_id`
- Des outils externes pour naviguer d'une exécution parentale à ses enfants sans deviner

---

## Flux détenu par la session

Goa-AI publie les événements `stream.Event` dans un unique **flux détenu par la session** :

- `session/<session_id>`

Ce flux contient les événements pour toutes les exécutions de la session, y compris les exécutions d’agents imbriqués (agent-as-tool). Chaque événement porte `run_id` et `session_id`, et le runtime émet :

- `child_run_linked` : relie un appel d’outil parent (`tool_call_id`) à l’exécution enfant (`child_run_id`)
- `run_stream_end` : marqueur explicite signifiant « plus aucun événement visible ne sera émis pour cette exécution »

Les consommateurs s’abonnent **une fois par session** et ferment SSE/WebSocket lorsqu’ils observent `run_stream_end` pour le `run_id` actif.

```go
import "goa.design/goa-ai/runtime/agent/stream"

events, errs, cancel, err := sub.Subscribe(ctx, "session/session-123")
if err != nil {
    panic(err)
}
defer cancel()

activeRunID := "run-123"
for {
    select {
    case evt, ok := <-events:
        if !ok {
            return
        }
        if evt.Type() == stream.EventRunStreamEnd && evt.RunID() == activeRunID {
            return
        }
    case err := <-errs:
        panic(err)
    }
}
```

---

## Profils de flux

`stream.StreamProfile` décrit quels types d’événements sont émis pour une audience.

### Structure StreamProfile

```go
type StreamProfile struct {
    Assistant          bool // assistant_reply
    Thoughts           bool // planner_thought
    ToolStart          bool // tool_start
    ToolUpdate         bool // tool_update
    ToolEnd            bool // tool_end
    AwaitClarification bool // await_clarification
    AwaitConfirmation  bool // await_confirmation
    AwaitQuestions     bool // await_questions
    AwaitExternalTools bool // await_external_tools
    ToolAuthorization  bool // tool_authorization
    Usage              bool // usage
    Workflow           bool // workflow
    ChildRuns          bool // child_run_linked (outil parent → exécution enfant)
}
```

### Profils intégrés

Goa-AI fournit des profils intégrés pour les cas d’utilisation courants :

- `stream.DefaultProfile()` émet tous les types d’événements.
- `stream.UserChatProfile()` convient aux interfaces utilisateur finales.
- `stream.AgentDebugProfile()` convient aux vues de débogage/développeur.
- `stream.MetricsProfile()` n’émet que `Usage` et `Workflow`.

Dans le modèle de streaming détenu par la session, il n’y a pas de souscriptions séparées pour les exécutions enfants. `child_run_linked` sert à construire l’arbre d’exécution et à attacher les événements à la bonne carte tout en consommant un seul flux `session/<session_id>`.

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
    ChildRuns:   true,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### Lignes directrices pour la sélection des profils

| Audience | Profil recommandé | Justification |
|----------|------------------|---------------|
| UI chat utilisateur final | `UserChatProfile()` | Structure épurée avec des cartes d'agents imbriquées |
| Console d'administration/débogage | `AgentDebugProfile()` | Visibilité complète des outils, attentes et phases |
| Métriques/facturation | `MetricsProfile()` | Événements minimaux pour l'agrégation |
| Audit | `DefaultProfile()` | Enregistrement complet avec champs de corrélation par exécution |
| Tableaux de bord en temps réel | Personnalisé (workflow + usage) | Suivi de l'état et des coûts uniquement |

Les applications choisissent le profil lors du câblage des puits et des ponts (par exemple, Pulse, SSE, WebSocket) :
- Les interfaces de dialogue en ligne restent propres et structurées (cartes imbriquées pilotées par `child_run_linked`)
- Les consoles de débogage peuvent voir le détail complet dans le même flux de session
- Les pipelines de métrologie voient juste assez pour agréger l'utilisation et les statuts

---

## Concevoir des interfaces utilisateur avec des arbres d'exécution

Étant donné l'arbre d'exécution + le modèle de flux, une interface utilisateur de chat typique peut.. :

1. S’abonner au flux de session (`session/<session_id>`) avec un profil chat utilisateur.
2. Suivre l’exécution active (`active_run_id`) et rendre :
   - Réponses de l’assistant (`assistant_reply`)
   - Cycle de vie des outils (`tool_start`/`tool_update`/`tool_end`)
   - Liens d’exécutions enfants (`child_run_linked`) comme **cartes d’agent** imbriquées par `child_run_id`
3. Pour chaque carte, rendre la timeline de l’exécution enfant en filtrant le même flux de session par `run_id == child_run_id` (sans souscriptions supplémentaires).
4. Fermer SSE/WebSocket lorsque vous observez `run_stream_end` pour `active_run_id`.

L’idée clé : **la topologie d’exécution (arbre) est préservée via des IDs et des événements de lien**, et le streaming est un unique log ordonné par session que vous projetez en voies/cartes en filtrant par `run_id`.

---

## Prochaines étapes

- **[Intégration MCP](./mcp-integration.md)** - Connexion aux serveurs d'outils externes
- **[Mémoire et sessions](./memory-sessions.md)** - Gérer l'état avec des transcriptions et des mémoires
- **[Production](./production.md)** - Déployer avec l'interface temporelle et le streaming
