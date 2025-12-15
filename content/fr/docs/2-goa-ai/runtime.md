---
title: "Temps d'exécution"
linkTitle: "Temps d'exécution"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## Aperçu de l'architecture

Le moteur d'exécution de Goa-AI orchestre la boucle plan/exécution/reprise, applique les politiques, gère l'état et coordonne avec les moteurs, les planificateurs, les outils, la mémoire, les crochets et les modules de fonctionnalités.

| Couche | Responsabilité |
| --- | --- |
| DSL + Codegen | Produire des registres d'agents, des spécifications/codecs d'outils, des flux de travail, des adaptateurs MCP..
| L'adaptateur de moteur de flux de travail (Workflow Engine Adapter) produit des registres d'agents, des spécifications/codecs d'outils, des flux de travail, des adaptateurs MCP
| Adaptateur de moteur de flux de travail - L'adaptateur temporel met en œuvre `engine.Engine` ; d'autres moteurs peuvent s'y greffer
| Modules de fonctionnalités | Intégrations optionnelles (MCP, Pulse, magasins Mongo, fournisseurs de modèles) |

---

## Architecture agentique de haut niveau

Au moment de l'exécution, Goa-AI organise votre système autour d'un petit ensemble de constructions composables :

- **Agents** : Orchestrateurs à longue durée de vie identifiés par `agent.Ident` (par exemple, `service.chat`). Chaque agent possède un planificateur, une politique d'exécution, des flux de travail générés et des enregistrements d'outils.

- **Exécutions** : Une exécution unique d'un agent. Les exécutions sont identifiées par un `RunID` et suivies via `run.Context` et `run.Handle`, et sont regroupées par `SessionID` et `TurnID` pour former des conversations.

- **Toolsets & tools** : Collections nommées de capacités, identifiées par `tools.Ident` (`service.toolset.tool`). Les ensembles d'outils soutenus par un service appellent des API ; les ensembles d'outils soutenus par un agent exécutent d'autres agents en tant qu'outils.

- **Planificateurs** : Votre couche de stratégie basée sur le LLM mettant en œuvre `PlanStart` / `PlanResume`. Les planificateurs décident quand appeler les outils plutôt que de répondre directement ; le moteur d'exécution applique des plafonds et des budgets de temps autour de ces décisions.

- **Arbre d'exécution et agent en tant qu'outil** : Lorsqu'un agent appelle un autre agent en tant qu'outil, le runtime démarre un véritable run enfant avec son propre `RunID`. Le `ToolResult` parent porte un `RunLink` (`*run.Handle`) pointant vers l'enfant, et un événement `AgentRunStarted` correspondant est émis dans l'exécution parent afin que les interfaces utilisateur et les débogueurs puissent s'attacher au flux de l'enfant à la demande.

- **Streams et profils** : Chaque exécution a son propre flux de valeurs `stream.Event` (réponses de l'assistant, réflexions du planificateur, démarrage/mise à jour/fin de l'outil, attentes, utilisation, flux de travail et liens entre l'agent et l'exécution). `stream.StreamProfile` sélectionne les types d'événements visibles pour un public donné (interface de discussion, débogage, mesures) et la manière dont les exécutions enfantines sont projetées : désactivées, aplaties ou liées.

---

## Démarrage rapide

```go
package main

import (
    "context"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    rt := runtime.New()
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, "session-1", []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Summarize the latest status."}},
    }})
    if err != nil {
        panic(err)
    }
    // Use out.RunID, out.Final (the assistant message), etc.
}
```

---

## Client-Only vs Worker

Deux rôles utilisent le runtime :

- **Client-only** (submit runs) : Construit un runtime avec un moteur compatible avec le client et n'enregistre pas d'agents. Il utilise le `<agent>.NewClient(rt)` généré qui porte l'itinéraire (flux de travail + file d'attente) enregistré par les travailleurs distants.
- **Worker** (exécuter des exécutions) : Construit un runtime avec un moteur capable de travailler, enregistre des agents (avec des planificateurs réels), et laisse le moteur interroger et exécuter des workflows/activités.

### Exemple réservé au client

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // engine client

// No agent registration needed in a caller-only process
client := chat.NewClient(rt)
out, err := client.Run(ctx, "s1", msgs)
```

### Exemple de travailleur

```go
rt := runtime.New(runtime.WithEngine(temporalWorker)) // worker-enabled engine
err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner})
// Start engine worker loop per engine's integration (for example, Temporal worker.Run()).
```

---

## Plan → Exécuter → Reprendre la boucle

1. Le runtime démarre un workflow pour l'agent (en mémoire ou temporel) et enregistre un nouveau `run.Context` avec `RunID`, `SessionID`, `TurnID`, des labels et des caps de politique.
2. Il appelle le `PlanStart` de votre planificateur avec les messages actuels et le contexte d'exécution.
3. Il planifie les appels d'outils renvoyés par le planificateur (le planificateur transmet des charges utiles JSON canoniques ; le runtime gère l'encodage/décodage à l'aide des codecs générés).
4. Il appelle `PlanResume` avec les résultats de l'outil ; la boucle se répète jusqu'à ce que le planificateur renvoie une réponse finale ou que les plafonds/les budgets de temps soient atteints. Au fur et à mesure que l'exécution progresse, elle passe par les valeurs `run.Phase` (`prompted`, `planning`, `executing_tools`, `synthesizing`, phases terminales).
5. Les crochets et les abonnés au flux émettent des événements (pensées du planificateur, démarrage/mise à jour/fin de l'outil, attentes, utilisation, flux de travail, liens agent-exécution) et, lorsqu'ils sont configurés, conservent les entrées de transcription et les métadonnées d'exécution.

---

## Phases d'exécution

Au fur et à mesure qu'une exécution progresse dans la boucle planifier/exécuter/reprendre, elle passe par une série de phases du cycle de vie. Ces phases offrent une visibilité fine de l'état d'avancement de l'exécution, ce qui permet aux interfaces utilisateur d'afficher des indicateurs de progression de haut niveau.

### Valeurs des phases

| Phase | Description |
| --- | --- |
| Le planificateur est en train de décider comment appeler les outils ou répondre directement
| `planning` Le planificateur est en train de décider s'il doit appeler des outils ou répondre directement, et comment
| `executing_tools` Les outils (y compris les agents imbriqués) sont en cours d'exécution
| `synthesizing` | Le planificateur est en train de synthétiser une réponse finale sans programmer d'outils supplémentaires |
| `completed` | L'exécution s'est terminée avec succès
| `failed` | L'exécution a échoué |
| `canceled` | L'exécution a été annulée | `failed` | L'exécution a échoué

### Transitions de phase

Une exécution réussie typique suit la progression suivante :

```
prompted → planning → executing_tools → planning → synthesizing → completed
                          ↑__________________|
                          (loop while tools needed)
```

Le moteur d'exécution émet des événements de type `RunPhaseChanged` à chaque transition, ce qui permet aux abonnés du flux de suivre la progression en temps réel.

### Phase vs Statut

Les phases sont distinctes des `run.Status` :

- **Status** (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`) est l'état du cycle de vie à gros grain stocké dans les métadonnées d'exécution durables
- **La phase** offre une visibilité plus fine de la boucle d'exécution, destinée aux surfaces de streaming/UX

### Événements RunPhaseChanged

Le moteur d'exécution émet des événements de type `RunPhaseChanged` hook chaque fois qu'une exécution passe d'une phase à l'autre. Les abonnés au flux traduisent ces événements en charges utiles `stream.Workflow` pour les consommateurs externes.

```go
// Hook event emitted by runtime
hooks.NewRunPhaseChangedEvent(runID, agentID, sessionID, run.PhasePlanning)

// Translated to stream event by subscriber
stream.Workflow{
    Data: WorkflowPayload{
        Phase: "planning",
    },
}
```

Le `stream.Subscriber` fait correspondre les événements `RunPhaseChanged` aux événements de flux `EventWorkflow` lorsque l'indicateur `Workflow` du profil est activé. Cela permet aux interfaces utilisateur d'afficher des indicateurs de progression tels que "Planification...", "Exécution des outils..." ou "Synthèse de la réponse..." en fonction de la phase en cours.

---

## Politiques, plafonds et étiquettes

### Politique d'exécution au moment de la conception

Au moment de la conception, vous configurez les politiques par agent avec `RunPolicy` :

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

Cela devient un `runtime.RunPolicy` attaché à l'enregistrement de l'agent :

- **Caps** : `MaxToolCalls` - nombre total d'appels à l'outil par exécution. `MaxConsecutiveFailedToolCalls` - échecs consécutifs avant l'abandon.
- **Budget temps** : `TimeBudget` - budget temps pour l'exécution. `FinalizerGrace` (temps d'exécution uniquement) - fenêtre réservée facultative pour la finalisation.
- **Interruptions** : `InterruptsAllowed` - option de pause/reprise.
- **Comportement en cas de champs manquants** : `OnMissingFields` - régit ce qui se passe lorsque la validation indique des champs manquants.

### Remplacement des politiques d'exécution

Dans certains environnements, vous pouvez souhaiter renforcer ou assouplir les règles sans modifier la conception. L'API `rt.OverridePolicy` permet d'ajuster les politiques au niveau du processus :

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

**Scope** : Les dérogations sont locales à l'instance d'exécution actuelle et n'affectent que les exécutions suivantes. Elles ne persistent pas lors des redémarrages de processus et ne se propagent pas aux autres travailleurs.

**Champs de surcharge** :

| Champ | Description |
| --- | --- |
| `MaxToolCalls` | Total maximum d'appels d'outils par exécution
| `MaxConsecutiveFailedToolCalls` | Échecs consécutifs avant l'abandon
| `TimeBudget` | Budget de l'horloge murale pour l'exécution |
| `FinalizerGrace` `FinalizerGrace` `FinalizerGrace` Fenêtre réservée pour la finalisation
| `InterruptsAllowed` | Activation de la capacité de pause/reprise |

Seuls les champs non nuls sont appliqués (et `InterruptsAllowed` lorsque `true`). Cela permet d'effectuer des remplacements sélectifs sans affecter les autres paramètres de la politique.

**Cas d'utilisation** :
- Remboursements temporaires lors de l'étranglement du fournisseur d'accès
- Tests A/B de différentes configurations de politiques
- Développement/débogage avec des contraintes relâchées
- Personnalisation de la politique par locataire au moment de l'exécution

### Étiquettes et moteurs de politique

Goa-AI s'intègre à des moteurs de politiques enfichables via `policy.Engine`. Les politiques reçoivent les métadonnées des outils (ID, tags), le contexte d'exécution (SessionID, TurnID, étiquettes) et les informations `RetryHint` après les échecs des outils.

Les étiquettes sont transférées dans :
- `run.Context.Labels` - disponibles pour les planificateurs au cours d'une exécution
- `run.Record.Labels` - conservées avec les métadonnées de l'exécution (utiles pour la recherche/les tableaux de bord)

---

## Exécution de l'outil

- **Outils natifs** : Vous écrivez les implémentations ; le runtime gère le décodage des args typés en utilisant les codecs générés
- **Outil généré en tant qu'outil** : Les outils d'agent générés exécutent les agents fournisseurs en tant qu'exécutions enfant (en ligne du point de vue du planificateur) et adaptent leur `RunOutput` en un `planner.ToolResult` avec une poignée `RunLink` renvoyée à l'exécution enfant
- **OutilsMCP** : Le moteur d'exécution transmet le JSON canonique aux appelants générés ; les appelants gèrent le transport

---

## Mémoire, flux, télémétrie

- **Le bus de crochet** publie des événements de crochet structurés pour le cycle de vie complet de l'agent : démarrage/achèvement de l'exécution, changements de phase, programmation/résultats/mises à jour de l'outil, notes du planificateur et blocs de réflexion, attentes, indices de réessai et liens entre l'agent et l'outil.

- **Les magasins de mémoire** (`memory.Store`) souscrivent et ajoutent des événements de mémoire durables (messages de l'utilisateur/assistant, appels d'outils, résultats d'outils, notes du planificateur, réflexion) par `(agentID, RunID)`.

- **Magasins d'exécution** (`run.Store`) suivent les métadonnées d'exécution (statut, phases, étiquettes, horodatages) pour la recherche et les tableaux de bord opérationnels.

- **Les puits de flux** (`stream.Sink`, par exemple Pulse ou SSE/WebSocket personnalisé) reçoivent les valeurs typées `stream.Event` produites par le `stream.Subscriber`. Une `StreamProfile` contrôle les types d'événements émis et la manière dont les parcours enfants sont projetés (désactivés, aplatis, liés).

- **Télémétrie** : La journalisation, la métrologie et le traçage des flux de travail et des activités de bout en bout sont pris en compte par OTEL.

### Observer les événements d'une seule série

En plus des puits globaux, vous pouvez observer le flux d'événements pour un seul ID d'exécution en utilisant l'aide `Runtime.SubscribeRun` :

```go
type mySink struct{}

func (s *mySink) Send(ctx context.Context, e stream.Event) error {
    // deliver event to SSE/WebSocket, logs, etc.
    return nil
}

func (s *mySink) Close(ctx context.Context) error { return nil }

stop, err := rt.SubscribeRun(ctx, "run-123", &mySink{})
if err != nil {
    panic(err)
}
defer stop()
```

---

## Abstraction du moteur

- **En mémoire** : Boucle de développement rapide, pas de développement externe
- **Temporel** : Exécution durable, relecture, tentatives, signaux, travailleurs ; les adaptateurs câblent les activités et la propagation du contexte

---

## Exécuter les contrats

- `SessionID` est requis au début de l'exécution. `Start` échoue rapidement si `SessionID` est vide ou contient des espaces
- Les agents doivent être enregistrés avant la première exécution. Le moteur d'exécution rejette l'enregistrement après la soumission de la première exécution avec `ErrRegistrationClosed` afin de maintenir le caractère déterministe des travailleurs du moteur
- Les exécuteurs d'outils reçoivent des métadonnées explicites par appel (`ToolCallMeta`) plutôt que des valeurs de pêche provenant de `context.Context`
- Ne pas s'appuyer sur des fallbacks implicites ; tous les identifiants de domaine (run, session, turn, correlation) doivent être transmis explicitement

---

## Pause et reprise

Les flux de travail humains en boucle peuvent suspendre et reprendre leur exécution à l'aide des aides à l'interruption du runtime :

```go
import "goa.design/goa-ai/runtime/agent/interrupt"

// Pause
if err := rt.PauseRun(ctx, interrupt.PauseRequest{
    RunID: "session-1-run-1",
    Reason: "human_review",
}); err != nil {
    panic(err)
}

// Resume
if err := rt.ResumeRun(ctx, interrupt.ResumeRequest{
    RunID: "session-1-run-1",
}); err != nil {
    panic(err)
}
```

En coulisses, les signaux de pause/reprise mettent à jour le magasin d'exécution et émettent des événements de type `run_paused`/`run_resumed` pour que les couches de l'interface utilisateur restent synchronisées.

---

## Confirmation de l'outil

Goa-AI supporte des portes de confirmation **forcées par le temps d'exécution** pour les outils sensibles (écritures, suppressions, commandes).

Vous pouvez activer la confirmation de deux manières :

- **Temps de conception (cas courant):** déclarer `Confirmation(...)` à l'intérieur du DSL de l'outil. Codegen stocke
  la politique dans `tools.ToolSpec.Confirmation`.
- **Runtime (override/dynamique):** passer `runtime.WithToolConfirmation(...)` lors de la construction du runtime
  pour exiger la confirmation d'outils supplémentaires ou remplacer le comportement du temps de conception.

Au moment de l'exécution, le flux de travail émet une demande de confirmation hors bande et n'exécute l'outil qu'après avoir reçu une approbation explicite
qu'après avoir reçu une approbation explicite. En cas de refus, la durée d'exécution synthétise un résultat d'outil conforme au schéma, de manière à ce que la transcription reste valide et que l'outil soit exécuté
afin que la transcription reste valide et que le planificateur puisse réagir de manière déterministe.

### Protocole de confirmation

Lors de l'exécution, la confirmation est mise en œuvre sous la forme d'un protocole d'attente/décision dédié :

- **Await payload** (streamed as `await_confirmation`) :

  ```json
  {
    "id": "...",
    "title": "...",
    "prompt": "...",
    "tool_name": "atlas.commands.change_setpoint",
    "tool_call_id": "toolcall-1",
    "payload": { "...": "canonical tool arguments (JSON)" }
  }
  ```

- **Fournir une décision** (via `ProvideConfirmation` sur le runtime) :

  ```go
  err := rt.ProvideConfirmation(ctx, interrupt.ConfirmationDecision{
      RunID:       "run-123",
      ID:         "await-1",
      Approved:    true,              // or false
      RequestedBy: "user:123",
      Labels:      map[string]string{"source": "front-ui"},
      Metadata:    map[string]any{"ticket_id": "INC-42"},
  })
  ```

Notes :

- Les consommateurs doivent traiter la confirmation comme un protocole d'exécution :
  - Utilisez le motif `RunPaused` (`await_confirmation`) qui l'accompagne pour décider quand afficher une interface utilisateur de confirmation.
  - N'associez pas le comportement de l'interface utilisateur à un nom d'outil de confirmation spécifique ; traitez-le comme un détail de transport interne.
- Les modèles de confirmation (`PromptTemplate` et `DeniedResultTemplate`) sont des chaînes Go `text/template`
  exécutées avec `missingkey=error`. Outre les fonctions standard des modèles (par exemple, `printf`),
  Goa-AI fournit :
  - `json v` → JSON encode `v` (utile pour les champs de pointeurs optionnels ou l'intégration de valeurs structurées).
  - `quote s` → renvoie une chaîne entre guillemets Go-escapée (comme `fmt.Sprintf("%q", s)`).

### Validation au moment de l'exécution

Le moteur d'exécution valide les interactions de confirmation à la frontière :

- La confirmation `ID` correspond à l'identifiant de l'attente en cours lorsqu'il est fourni.
- L'objet de décision est bien formé (`RunID` non vide, valeur booléenne `Approved`).

---

## Contrat de planification

Les planificateurs mettent en œuvre :

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contient les appels d'outils, la réponse finale, les annotations et `RetryHint` facultatif. Le moteur d'exécution applique les caps, planifie les activités des outils et renvoie les résultats des outils dans `PlanResume` jusqu'à ce qu'une réponse finale soit produite.

Les planificateurs reçoivent également un `PlannerContext` via `input.Agent` qui expose les services d'exécution :
- `ModelClient(id string)` - obtenir un client de modèle agnostique par rapport au fournisseur
- `AddReminder(r reminder.Reminder)` - enregistrer des rappels de système à l'échelle de l'exécution
- `RemoveReminder(id string)` - effacer les rappels lorsque les conditions préalables ne sont plus remplies
- `Memory()` - accès à l'historique des conversations

---

## Modules de fonctionnalités

- `features/mcp/*` - suite MCP DSL/codegen/appels en temps réel (HTTP/SSE/stdio)
- `features/memory/mongo` - mémoire durable
- `features/run/mongo` - magasin de métadonnées d'exécution + référentiels de recherche
- `features/session/mongo` - magasin de métadonnées de session
- `features/stream/pulse` - aides pour les puits d'impulsion et les abonnés
- `features/model/{anthropic,bedrock,openai}` - adaptateurs de client de modèle pour les planificateurs
- `features/model/middleware` - middlewares partagés `model.Client` (par exemple, limitation adaptative du débit)
- `features/policy/basic` - moteur de politique simple avec listes d'autorisation/de blocage et gestion des indices de réessai

### Modélisation du débit du client et de la limitation du débit

Goa-AI fournit un limiteur de débit adaptatif agnostique au fournisseur sous `features/model/middleware`. Il enveloppe tout `model.Client`, estime les jetons par demande, met les appelants en file d'attente en utilisant un seau de jetons, et ajuste son budget effectif de jetons par minute en utilisant une stratégie additive-incrémentale/multiplicative-décrémentale (AIMD) lorsque les fournisseurs signalent un étranglement.

```go
import (
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, _ := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
}, ledger)

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited := rl.Middleware()(bed)

rt := runtime.New(runtime.Options{
    // Register limited as the model client exposed to planners.
})
```

---

## Intégration LLM

Les planificateurs Goa-AI interagissent avec les grands modèles de langage par le biais d'une **interface agnostique au fournisseur**. Cette conception vous permet de changer de fournisseur - AWS Bedrock, OpenAI, ou des points d'extrémité personnalisés - sans modifier le code de votre planificateur.

### L'interface model.Client

Toutes les interactions LLM passent par l'interface `model.Client` :

```go
type Client interface {
    Complete(ctx context.Context, req *Request) (*Response, error)
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

### Adaptateurs de fournisseurs

Goa-AI est livré avec des adaptateurs pour les fournisseurs LLM les plus courants :

**AWS Bedrock**

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/features/model/bedrock"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
modelClient, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    HighModel:    "anthropic.claude-sonnet-4-20250514-v1:0",
    SmallModel:   "anthropic.claude-3-5-haiku-20241022-v1:0",
    MaxTokens:    4096,
    Temperature:  0.7,
}, ledger)
```

**OpenAI**

```go
import "goa.design/goa-ai/features/model/openai"

modelClient, err := openai.NewFromAPIKey(apiKey, "gpt-4o")
```

### Utilisation de clients modèles dans les planificateurs

Les planificateurs obtiennent des clients de modèle par l'intermédiaire des `PlannerContext` du moteur d'exécution :

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    req := &model.Request{
        RunID:    input.Run.RunID,
        Messages: input.Messages,
        Tools:    input.Tools,
        Stream:   true,
    }
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Drain stream and build response...
}
```

Le runtime enveloppe le `model.Client` sous-jacent avec un client décoré d'événements qui émet des événements de planificateur (blocs de réflexion, morceaux d'assistant, utilisation) au fur et à mesure que vous lisez dans le flux.

### Capture automatique d'événements

Le moteur d'exécution capture automatiquement les événements de flux des clients modèles, ce qui évite aux planificateurs d'émettre manuellement des événements. Lorsque vous appelez `input.Agent.ModelClient(id)`, le moteur d'exécution renvoie un client décoré qui :

- Émet des événements `AssistantChunk` pour le contenu textuel au fur et à mesure que vous lisez dans le flux
- Émet des événements `PlannerThinkingBlock` pour le contenu de raisonnement/réflexion
- Émet des événements `UsageDelta` pour les mesures d'utilisation des jetons

Cette décoration est transparente :

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    // ModelClient returns a decorated client that auto-emits events
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Simply drain the stream - events are emitted automatically
    var text strings.Builder
    var toolCalls []model.ToolCall
    for {
        chunk, err := streamer.Recv()
        if errors.Is(err, io.EOF) {
            break
        }
        if err != nil {
            return nil, err
        }
        // Process chunk for your planner logic
        // Events are already emitted by the decorated client
    }
    // ...
}
```

**Important** : Si vous devez utiliser `planner.ConsumeStream`, obtenez un `model.Client` brut qui n'est pas enveloppé par le runtime. Si vous mélangez le client décoré avec `ConsumeStream`, des événements seront émis deux fois.

### Validation de l'ordre des messages de Bedrock

Lors de l'utilisation de AWS Bedrock avec le mode de pensée activé, le runtime valide les contraintes d'ordre des messages avant d'envoyer des requêtes. Bedrock requiert :

1. Tout message d'assistant contenant `tool_use` doit commencer par un bloc de réflexion
2. Chaque message d'utilisateur contenant `tool_result` doit suivre immédiatement un message d'assistant avec les blocs `tool_use` correspondants
3. Le nombre de blocs `tool_result` ne peut dépasser le nombre de blocs `tool_use` précédents

Le client Bedrock valide ces contraintes en amont et renvoie une erreur descriptive en cas de violation :

```
bedrock: invalid message ordering with thinking enabled (run=xxx, model=yyy): 
bedrock: assistant message with tool_use must start with thinking
```

Cette validation garantit que la reconstruction du grand livre de transcription produit des séquences de messages conformes au fournisseur.

---

## Prochaines étapes

- En savoir plus sur [Toolsets](./toolsets/) pour comprendre les modèles d'exécution d'outils
- Explorer [Composition des agents](./agent-composition/) pour les modèles d'agents en tant qu'outils
- En savoir plus sur [Memory & Sessions](./memory-sessions/) pour la persistance des transcriptions
