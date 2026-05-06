---
title: "Temps d'exécution"
linkTitle: "Temps d'exécution"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## Présentation de l'architecture

Le runtime Goa-AI orchestre la boucle planifier/exécuter/reprendre, applique les politiques, gère l'état et se coordonne avec les moteurs, les planificateurs, les outils, la mémoire, les hooks et les modules de fonctionnalités.

| Couche | Responsabilité |
| --- | --- |
| DSL + Codegen | Produire des registres d'agents, des spécifications/codecs d'outils, des spécifications/codecs de complétion, des flux de travail, des adaptateurs MCP |
| Noyau d'exécution | Orchestre la boucle de planification/démarrage/reprise, l'application des politiques, les hooks, la mémoire, le streaming |
| Adaptateur de moteur de flux de travail | L'adaptateur Temporal implémente `engine.Engine` ; d'autres moteurs peuvent se brancher |
| Modules de fonctionnalités | Intégrations facultatives (magasins MCP, Pulse, Mongo, fournisseurs de modèles) |

---

## Architecture agentique de haut niveau

Au moment de l'exécution, Goa-AI organise votre système autour d'un petit ensemble de constructions composables :

- **Agents** : orchestrateurs de longue durée identifiés par `agent.Ident` (par exemple, `service.chat`). Chaque agent possède un planificateur, une politique d'exécution, des flux de travail générés et des enregistrements d'outils.

- **Exécutions** : une seule exécution d'un agent. Les courses sont identifiées par un `RunID` et suivies via `run.Context` et `run.Handle`. Les exécutions de session sont regroupées par `SessionID` et `TurnID` pour former des conversations ; Les exécutions ponctuelles sont explicitement sans session.

- **Ensembles d'outils et outils** : collections nommées de fonctionnalités, identifiées par `tools.Ident` (`service.toolset.tool`). Les ensembles d'outils basés sur des services appellent des API ; Les ensembles d'outils soutenus par des agents exécutent d'autres agents en tant qu'outils.

- **Achèvements** : Contrats de sortie d'assistant direct dactylographiés appartenant au service générés sous `gen/<service>/completions`. Les assistants d'achèvement attachent une sortie structurée imposée par le fournisseur aux requêtes de modèle unaire et en streaming direct, puis décodent la charge utile typée canonique via les codecs générés.

- **Planificateurs** : votre couche stratégique basée sur LLM mettant en œuvre `PlanStart` / `PlanResume`. Les planificateurs décident quand appeler les outils plutôt que de répondre directement ; le runtime impose des plafonds et des budgets de temps autour de ces décisions.

- **Arbre d'exécution et agent en tant qu'outil** : lorsqu'un agent appelle un autre agent en tant qu'outil, le moteur d'exécution démarre une véritable exécution enfant avec son propre `RunID`. Le parent `ToolResult` transporte un `RunLink` (`*run.Handle`) pointant vers l'enfant, et un événement de flux `child_run_linked` correspondant est émis afin que UIs puisse corréler les appels d'outil parent avec les ID d'exécution enfant sans deviner.

- **Flux et profils appartenant à la session** : Goa-AI publie les valeurs `stream.Event` saisies dans un **flux appartenant à la session** (`session/<session_id>`). Les événements transportent à la fois `RunID` et `SessionID` et incluent un marqueur de limite explicite (`run_stream_end`) afin que les consommateurs puissent fermer SSE/WebSocket de manière déterministe sans minuterie. `stream.StreamProfile` sélectionne les types d'événements visibles pour une audience donnée (chat UI, débogage, métriques).

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

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
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

## Complétions directes dactylographiées

Toutes les interactions structurées ne doivent pas être modélisées comme un appel d’outil. Quand votre
Le service a besoin d'une réponse finale de l'assistant tapée, déclarez `Completion(...)` dans le
DSL et régénérer.

`goa gen` émet `gen/<service>/completions` avec :

- schémas de résultats et types de résultats/unions typés
- codecs JSON générés et aides à la validation
- valeurs `completion.Spec` saisies
- assistants `Complete<Name>(ctx, client, req)` générés
- Assistants `StreamComplete<Name>(ctx, client, req)` et `Decode<Name>Chunk(chunk)` générés

Les services peuvent déclarer des achèvements sans déclarer de `Agent(...)`. Agent
un échafaudage de démarrage rapide/exemple est émis uniquement pour les services qui possèdent réellement
agents.

Ces assistants clonent la requête et attachent une sortie structurée indépendante du fournisseur.
métadonnées, appelez le `model.Client` sous-jacent et décodez le canonique typé
charge utile via le codec généré :

```go
resp, err := taskcompletion.CompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}

fmt.Println(resp.Value.Name)
```

Les complétions de streaming restent sur la surface brute `model.Streamer` et décodent le
Morceau canonique final `completion` uniquement :

```go
stream, err := taskcompletion.StreamCompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if errors.Is(err, io.EOF) {
        break
    }
    if err != nil {
        panic(err)
    }
    value, ok, err := taskcompletion.DecodeDraftFromTranscriptChunk(chunk)
    if err != nil {
        panic(err)
    }
    if ok {
        fmt.Println(value.Name)
    }
}
```

Les aides à la complétion typées sont intentionnellement strictes :

- Les assistants unaires acceptent uniquement les demandes unaires.
- Les noms de complétion sont validés à la limite DSL : 1 à 64 caractères ASCII,
lettres/chiffres/`_`/`-` uniquement et doit commencer par une lettre ou un chiffre.
- Les assistants unaires et en streaming rejettent les requêtes activées par les outils et le `StructuredOutput` fourni par l'appelant.
- Les fournisseurs de streaming émettent des fragments d'aperçu `completion_delta*` plus exactement un morceau canonique `completion`, ou rejettent explicitement la demande.
- `Decode<Name>Chunk` ignore les morceaux d’aperçu et décode uniquement le `completion` final.
- Les flux d'achèvement restent sur le chemin direct `model.Streamer` ; ne les acheminez pas via les assistants de streaming du planificateur, qui sont destinés aux événements d'exécution de texte/outil de transcription de l'assistant.
- Fournisseurs qui n’implémentent pas la surface de sortie structurée `model.ErrStructuredOutputUnsupported`.
- Les schémas générés sont canoniques et indépendants du fournisseur ; les adaptateurs de fournisseur peuvent les normaliser sur un sous-ensemble pris en charge, mais doivent échouer explicitement lorsqu'ils ne peuvent pas préserver le contrat déclaré.

---

## Client uniquement vs travailleur

Deux rôles utilisent le runtime :

- **Client uniquement** (soumettre des exécutions) : construit un environnement d'exécution avec un moteur compatible client et n'enregistre pas les agents. Utilisez le `<agent>.NewClient(rt)` généré qui transporte l'itinéraire (workflow + file d'attente) enregistré par les travailleurs distants.
- **Worker** (exécutions d'exécution) : construit un environnement d'exécution avec un moteur capable de fonctionner, enregistre les ensembles d'outils et les agents, puis scelle l'enregistrement afin que l'interrogation ne démarre qu'une fois le registre d'exécution local terminé.

### Exemple client uniquement

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // engine client

// No agent registration needed in a caller-only process
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "s1"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "s1", msgs)
```

### Exécutions ponctuelles sans session

Utilisez `StartOneShot` et `OneShotRun` lorsque vous souhaitez un travail durable qui n'est pas attaché à une session existante.

- `Start` / `Run` sont de type session : ils nécessitent un `SessionID` concret, participent au cycle de vie de la session et émettent des événements de flux à l'échelle de la session.
- `StartOneShot` / `OneShotRun` sont sans session : ils ne prennent pas de `SessionID`, n'en créent pas et ajoutent uniquement les événements canoniques du journal d'exécution pour l'introspection par `RunID`.
- `StartOneShot` renvoie immédiatement un `engine.WorkflowHandle`. `OneShotRun` est le wrapper pratique de blocage qui appelle `handle.Wait(ctx)` pour vous.

```go
client := chat.NewClient(rt)

handle, err := client.StartOneShot(ctx, msgs,
    runtime.WithRunID("run-123"),
    runtime.WithLabels(map[string]string{"tenant": "acme"}),
)
if err != nil {
    panic(err)
}

out, err := handle.Wait(ctx)
if err != nil {
    panic(err)
}

fmt.Println(out.RunID)
```

### Exemple de travailleur

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "temporal:7233", Namespace: "default"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "orchestrator.chat"},
})
if err != nil {
    panic(err)
}
defer eng.Close()

rt := runtime.New(runtime.WithEngine(eng))
if err := chat.RegisterUsedToolsets(ctx, rt /* executors... */); err != nil {
    panic(err)
}
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner}); err != nil {
    panic(err)
}
if err := rt.Seal(ctx); err != nil {
    panic(err)
}
```

---

## Planifier → Exécuter → Reprendre la boucle

1. Le runtime démarre un workflow pour l'agent (en mémoire ou Temporal) et enregistre un nouveau `run.Context` avec `RunID`, `SessionID`, `TurnID`, des étiquettes et des limites de stratégie.
2. Il appelle le `PlanStart` de votre planificateur avec les messages actuels et le contexte d'exécution.
3. Il planifie les appels d'outils renvoyés par le planificateur (le planificateur transmet les charges utiles canoniques JSON ; le runtime gère l'encodage/décodage à l'aide des codecs générés).
4. Il appelle `PlanResume` avec les résultats d'outils survivants visibles par le planificateur ; les outils budgétisés sont visibles par défaut, tandis que les outils de comptabilité ne rejouent que lorsqu'un échec réessayable doit être réparé. La boucle se répète jusqu'à ce que le planificateur renvoie une réponse finale ou que les plafonds/budgets de temps soient atteints. Au fur et à mesure que l'exécution progresse, l'exécution avance à travers les valeurs `run.Phase` (`prompted`, `planning`, `executing_tools`, `synthesizing`, phases terminales).
5. Les hooks et les abonnés au flux émettent des événements (pensées du planificateur, démarrage/mise à jour/fin de l'outil, attentes, utilisation, flux de travail, liens exécutés par l'agent) et, une fois configurés, conservent les entrées de transcription et exécutent les métadonnées.

---

## Phases d'exécution

Au fur et à mesure qu’une exécution progresse dans la boucle planifier/exécuter/reprendre, elle passe par une série de phases du cycle de vie. Ces phases offrent une visibilité précise de l'état d'avancement d'une exécution, permettant à UIs d'afficher des indicateurs de progression de haut niveau.

### Valeurs de phase

| Phase | Description |
| --- | --- |
| `prompted` | Les commentaires ont été reçus et l'exécution est sur le point de commencer la planification |
| `planning` | Le planificateur décide si et comment appeler les outils ou répondre directement |
| `executing_tools` | Les outils (y compris les agents imbriqués) sont en cours d'exécution |
| `synthesizing` | Le planificateur synthétise une réponse finale sans planifier d'outils supplémentaires |
| `completed` | L'exécution s'est terminée avec succès |
| `failed` | La course a échoué |
| `canceled` | La course a été annulée |

### Transitions de phases

Une exécution réussie typique suit cette progression :

```
prompted → planning → executing_tools → planning → synthesizing → completed
                          ↑__________________|
                          (loop while tools needed)
```

Le runtime émet des événements hook `RunPhaseChanged` pour les phases **non terminales** (par exemple, `planning`, `executing_tools`, `synthesizing`) afin que les abonnés au flux puissent suivre la progression en temps réel.

### Phase vs Statut

Les phases sont distinctes de `run.Status` :

- **Le statut** (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`) correspond à l'état du cycle de vie à granularité grossière stocké dans les métadonnées d'exécution durables.
- **Phase** offre une visibilité plus fine sur la boucle d'exécution, destinée aux surfaces de streaming/UX

### Événements du cycle de vie : changements de phase ou achèvement du terminal

Le runtime émet :

- **`RunPhaseChanged`** pour les transitions de phase non terminales.
- **`RunCompleted`** une fois par exécution pour le cycle de vie du terminal (succès/échec/annulation).

Les abonnés au flux traduisent les deux en événements de flux `workflow` (`stream.WorkflowPayload`) :

- **Mises à jour non terminales** (à partir de `RunPhaseChanged`) : `phase` uniquement.
- **Mise à jour du terminal** (à partir de `RunCompleted`) : `status` + terminal `phase`, plus champs d'erreur structurés sur les échecs.

**Mappage de l'état du terminal**

- `status="success"` → `phase="completed"`
- `status="failed"` → `phase="failed"`
- `status="canceled"` → `phase="canceled"`

**L'annulation n'est pas une erreur**

Pour `status="canceled"`, la charge utile du flux **ne doit pas** inclure un `error` destiné à l'utilisateur. Les consommateurs devraient considérer l’annulation comme un état final terminal et sans erreur.

**Les échecs sont structurés**

Pour `status="failed"`, la charge utile du flux comprend :

- `error_kind` : classificateur stable pour l'UX/la décision (types de fournisseurs comme `rate_limited`, `unavailable` ou types d'exécution comme `timeout`/`internal`)
- `retryable` : si une nouvelle tentative peut réussir sans modifier l'entrée
- `error` : message **sécurisé pour l'utilisateur** adapté à l'affichage direct
- `debug_error` : chaîne d'erreur brute pour les journaux/diagnostics (pas pour UI)

---

## Politiques, plafonds et étiquettes

### Politique d'exécution au moment de la conception

Au moment de la conception, vous configurez les stratégies par agent avec `RunPolicy` :

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

Celui-ci devient un `runtime.RunPolicy` attaché à l'inscription de l'agent :

- **Caps** : `MaxToolCalls` – nombre total d'appels d'outils budgétisés par exécution. Les outils déclarés `Bookkeeping()` dans le DSL sont **exemptés** de ce plafond : les mises à jour de statut, les marqueurs de progression et les outils de validation de terminal ne consomment jamais `RemainingToolCalls` et ne sont jamais supprimés lorsqu'un lot est réduit pour s'adapter au budget restant. Les résultats de comptabilité réussis restent cachés aux futurs tours du planificateur. `MaxConsecutiveFailedToolCalls` – échecs consécutifs avant l’abandon.
- **Budget temps** : `TimeBudget` – budget d'horloge murale pour la course. `FinalizerGrace` (exécution uniquement) – fenêtre réservée en option pour la finalisation.
- **Interruptions** : `InterruptsAllowed` – option pour la pause/reprise.
- **Comportement des champs manquants** : `OnMissingFields` – régit ce qui se passe lorsque la validation indique des champs manquants.
- **Outils de terminal** : les outils déclarés `TerminalRun()` terminent l'exécution de manière atomique une fois qu'ils réussissent ; aucun tour de suivi `PlanResume` n'est planifié. Associez `Bookkeeping()` à `TerminalRun()` pour obtenir un outil « valider cette exécution » dont l'exécution est garantie même lorsque le budget de récupération est épuisé.

### Remplacements de stratégie d'exécution

Dans certains environnements, vous souhaiterez peut-être renforcer ou assouplir les politiques sans en modifier la conception. Le `rt.OverridePolicy` API permet des ajustements de politique au niveau du processus :

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

**Portée** : les remplacements sont locaux à l'instance d'exécution actuelle et affectent uniquement les exécutions ultérieures. Ils ne persistent pas lors des redémarrages de processus et ne se propagent pas aux autres travailleurs.

**Champs remplaçables** :

| Champ | Description |
| --- | --- |
| `MaxToolCalls` | Nombre total maximum d'appels d'outils par exécution |
| `MaxConsecutiveFailedToolCalls` | Échecs consécutifs avant l'abandon |
| `TimeBudget` | Budget horloger pour la course |
| `FinalizerGrace` | Fenêtre réservée à la finalisation |
| `InterruptsAllowed` | Activer la fonctionnalité pause/reprise |

Seuls les champs non nuls sont appliqués (et `InterruptsAllowed` lorsque `true`). Cela permet des remplacements sélectifs sans affecter les autres paramètres de stratégie.

**Cas d'utilisation** :
- Interruptions temporaires pendant la limitation du fournisseur
- Tests A/B de différentes configurations de politiques
- Développement/débogage avec des contraintes assouplies
- Personnalisation des politiques par locataire au moment de l'exécution

### Étiquettes et moteurs de politiques

Goa-AI s'intègre aux moteurs de politiques enfichables via `policy.Engine`. Les stratégies reçoivent les métadonnées de l'outil (ID, balises), le contexte d'exécution (SessionID, TurnID, étiquettes) et les informations `RetryHint` après les échecs de l'outil.

Les étiquettes arrivent dans :
- `run.Context.Labels` – disponible pour les planificateurs pendant une exécution
- entrée d'activité d'outil (`api.ToolInput.Labels`) - clonée dans des exécutions d'outils distribuées afin que les activités d'outils observent les mêmes métadonnées d'exécution, à moins que le planificateur ne remplace les étiquettes pour un appel spécifique
- exécuter les événements du journal (`runlog.Store`) – conservés avec les événements du cycle de vie pour l'audit/la recherche/les tableaux de bord (là où ils sont indexés)

### Filtrage des outils par exécution

Les balises au moment de la conception et les options d'exécution permettent aux appelants de réduire la surface de l'outil avant
invite du planificateur et encore avant l'exécution :

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithAllowedTags([]string{"read", "safe"}),
    runtime.WithDeniedTags([]string{"destructive"}),
    runtime.WithTagPolicyClauses([]runtime.TagPolicyClause{
        {AllowedAny: []string{"docs", "search"}},
        {DeniedAny: []string{"external"}},
    }),
)
```

Utilisez `WithRestrictToTool` lorsqu'un flux de réparation doit exposer exactement un outil :

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithRestrictToTool(searchspecs.Search),
)
```

Le runtime verrouille les tours de réparation des outils restreints lorsqu'un indice de nouvelle tentative est défini
`RestrictToTool`, de sorte que le planificateur de suivi ne voit que l'outil qui a besoin d'un
charge utile corrigée. Cela permet de concentrer la réparation de validation et d'empêcher le modèle
de dériver vers des outils sans rapport.

---

## Exécution des outils

- **Ensembles d'outils natifs** : vous écrivez des implémentations ; le runtime gère le décodage des arguments tapés à l'aide des codecs générés
- **Agent en tant qu'outil** : les ensembles d'outils d'agent générés exécutent les agents fournisseurs en tant qu'exécutions enfants (en ligne du point de vue du planificateur) et adaptent leur `RunOutput` en un `planner.ToolResult` avec un handle `RunLink` vers l'exécution enfant.
- **Ensembles d'outils MCP** : le runtime transmet le JSON canonique aux appelants générés ; les appelants gèrent le transport

### Valeurs par défaut de la charge utile de l'outil

Le décodage de la charge utile de l'outil suit le modèle **decode-body → transform** de Goa et applique les valeurs par défaut de style Goa de manière déterministe pour les charges utiles de l'outil.

Voir **[Tool Payload Defaults](tool-payload-defaults/)** pour les invariants de contrat et de codegen.

### Résultats d'outils limités

Les outils qui renvoient des vues partielles d'ensembles de données plus volumineux doivent déclarer `BoundedResult(...)`.
dans le DSL. Le contrat d'exécution de ces outils est :

- généré `tools.ToolSpec.Bounds` déclare le schéma canonique de résultat borné
- les exécutions réussies doivent remplir `planner.ToolResult.Bounds`
- le runtime projette ces limites dans les `tool_result` JSON émis, indice de résultat
données de modèle sous `.Bounds`, charges utiles de hook et événements de flux

Champs projetés canoniques :

- `returned` (obligatoire)
- `truncated` (obligatoire)
- `total` (facultatif)
- `refinement_hint` (facultatif)
- `next_cursor` (facultatif, lorsqu'il est déclaré via `NextCursor(...)`)

`planner.ToolResult.Bounds` reste le seul contrat d'exécution lisible par machine.
Les types de résultats Go créés restent sémantiques et spécifiques au domaine ; ils n'ont pas besoin de
dupliquez les champs délimités canoniques juste pour que les modèles puissent les voir.

Pour les outils `BindTo` basés sur une méthode, le résultat de la méthode de service lié doit toujours
transporter les champs délimités canoniques afin que l'exécuteur généré puisse construire
`planner.ToolResult.Bounds` avant projection. `Return(...)` face à l'outil explicite
les formes ne doivent pas dupliquer ces champs canoniques. Dans la méthode liée
Par conséquent, seuls `returned` et `truncated` peuvent être requis ; `total`,
`refinement_hint` et `next_cursor` restent facultatifs et sont omis des émissions
JSON chaque fois que les limites d’exécution les omettent.

Lorsqu'une limite de service doit assembler le résultat canonique JSON à l'extérieur
`ExecuteToolActivity`, utilisez `runtime.EncodeCanonicalToolResult(...)` plutôt que
appeler le codec de résultat généré et les assistants de projection de résultats limités
séparément.

---

## Contrats d'exécution rapide

La gestion des invites est native du runtime et versionnée :

- `runtime.PromptRegistry` stocke les enregistrements `prompt.PromptSpec` de base immuables.
- `runtime.WithPromptStore(prompt.Store)` permet une résolution de remplacement étendue (`session` -> `facility` -> `org` -> global).
- Les planificateurs appellent `PlannerContext.RenderPrompt(ctx, id, data)` pour résoudre et afficher le contenu des invites.
- Le contenu rendu inclut les métadonnées `prompt.PromptRef` pour la provenance ; les planificateurs peuvent les joindre à
`model.Request.PromptRefs`.

```go
content, err := input.Agent.RenderPrompt(ctx, "aura.chat.system", map[string]any{
    "AssistantName": "Ops Assistant",
})
if err != nil {
    return nil, err
}

resp, err := modelClient.Complete(ctx, &model.Request{
    RunID:      input.RunContext.RunID,
    Messages:   input.Messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` sont des métadonnées d'exécution pour l'audit/la provenance et ne sont pas des champs de charge utile de fil de fournisseur.

---

## Mémoire, Streaming, Télémétrie

- **Hook bus** publie des événements de hook structurés pour le cycle de vie complet de l'agent : démarrage/achèvement de l'exécution, changements de phase, `prompt_rendered`, planification/résultats/mises à jour des outils, notes du planificateur et blocs de réflexion, attentes, conseils de nouvelle tentative et liens d'agent en tant qu'outil.

- **Les magasins de mémoire** (`memory.Store`) s'abonnent et ajoutent des événements de mémoire durables (messages utilisateur/assistant, appels d'outils, résultats d'outils, notes de planificateur, réflexion) par `(agentID, RunID)`.

- **Exécuter les magasins d'événements** (`runlog.Store`) ajoutez le journal des événements de hook canonique par `RunID` pour l'audit/débogage de UIs et exécutez l'introspection.

- Les **récepteurs de flux** (`stream.Sink`, par exemple Pulse ou SSE/WebSocket personnalisé) reçoivent les valeurs `stream.Event` typées produites par le `stream.Subscriber`. Un `StreamProfile` contrôle quels types d'événements sont émis.

- **Télémétrie** : les flux de travail et les activités des instruments de journalisation, de métriques et de traçage compatibles OTEL de bout en bout.

### Conseils d'affichage des appels d'outils (DisplayHint)

Les appels d'outils peuvent porter un `DisplayHint` destiné à l'utilisateur (par exemple pour UIs).

Contracter:

- Les constructeurs de hooks ne rendent pas d'indices. Les événements planifiés d’appel d’outil sont par défaut `DisplayHint==""`.
- Le moteur d'exécution peut enrichir et conserver un indice d'appel par défaut durable au moment de la publication en décodant l'outil saisi.
charge utile et exécution du DSL `CallHintTemplate`.
- Lorsque le décodage typé échoue ou qu’aucun modèle n’est enregistré, le runtime laisse `DisplayHint` vide. Les indices sont
jamais rendu sur les octets bruts JSON.
- Si un producteur définit explicitement `DisplayHint` (non vide) avant de publier l'événement hook, le runtime traite
comme faisant autorité et ne l'écrase pas.
- Pour les modifications de formulation par consommateur, configurez `runtime.WithHintOverrides` au moment de l'exécution. Les remplacements prennent
priorité sur les modèles créés par DSL pour les événements `tool_start` diffusés en streaming.

### Consommation d'un flux de session (Pulse)

En production, le modèle courant est le suivant :

- publier des événements de flux d'exécution sur Pulse (flux Redis) à l'aide d'un `stream.Sink`
- abonnez-vous au **flux de session** (`session/<session_id>`) depuis votre diffusion UI (SSE/WebSocket)
- arrêtez de diffuser une analyse lorsque vous observez `type=="run_stream_end"` pour l'ID d'exécution actif

```go
import (
    pulsestream "goa.design/goa-ai/features/stream/pulse"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

streams, err := pulsestream.NewRuntimeStreams(pulsestream.RuntimeStreamsOptions{
    Client: pulseClient,
})
if err != nil {
    panic(err)
}
rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(streams.Sink()),
)

sub, err := streams.NewSubscriber(pulsestream.SubscriberOptions{SinkName: "ui"})
if err != nil {
    panic(err)
}
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
        // evt.SessionID(), evt.RunID(), evt.Type(), evt.Payload()
    case err := <-errs:
        panic(err)
    }
}
```

---

## Abstraction du moteur

- **En mémoire** : boucle de développement rapide, pas de dépôts externes
- **Temporal** : exécution durable, relecture, tentatives, signaux, travailleurs ; activités de fil d'adaptateurs et propagation de contexte

### Synchronisation sémantique vs vivacité du Temporal

Goa-AI maintient le contrat d'exécution public indépendant du moteur :

- `RunPolicy.Timing.Plan` et `RunPolicy.Timing.Tools` sont des budgets de tentatives sémantiques
- `runtime.WithTiming(...)` remplace ces budgets sémantiques pour une exécution
- `runtime.WithWorker(...)` est destiné au placement de file d'attente et non au réglage du moteur de flux de travail

Si vous utilisez l'adaptateur Temporal et avez besoin d'un réglage de l'attente en file d'attente ou de l'activité, configurez
sur le moteur Temporal lui-même :

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "temporal:7233",
        Namespace: "default",
    },
    WorkerOptions: temporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: temporal.ActivityDefaults{
        Planner: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
if err != nil {
    panic(err)
}
```

Cette division maintient les mécanismes de flux de travail derrière la limite Temporal tandis que le
le temps d'exécution générique reste honnête à la fois sur Temporal et sur le moteur en mémoire.

---

## Exécuter des contrats

- `SessionID` est requis pour les démarrages de session. `Start` et `Run` échouent rapidement lorsque `SessionID` est vide ou un espace
- `StartOneShot` et `OneShotRun` sont explicitement sans session. Ils ne nécessitent ni ne créent de session et n'émettent pas d'événements de flux à l'échelle de la session.
- Les agents doivent être enregistrés avant la première exécution. Le moteur d'exécution rejette l'enregistrement après la première soumission d'exécution avec `ErrRegistrationClosed` pour que les opérateurs du moteur restent déterministes.
- Les exécuteurs d'outils reçoivent des métadonnées explicites par appel (`ToolCallMeta`) plutôt que des valeurs de pêche de `context.Context`
- Ne comptez pas sur des solutions de repli implicites ; tous les identifiants de domaine (exécution, session, tour, corrélation) doivent être transmis explicitement

---

## Pause et reprise

Les flux de travail Human-in-loop peuvent suspendre et reprendre les exécutions à l'aide des assistants d'interruption du runtime :

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

En coulisses, les signaux de pause/reprise mettent à jour le magasin d'exécution et émettent des événements de hook `run_paused`/`run_resumed` afin que les couches UI restent synchronisées.

### Fournir des résultats d'outils externes

Certaines attentes reprennent avec des **résultats d'outils fournis par un acteur externe** plutôt que par `ExecuteToolActivity` lui-même. Des exemples courants sont les outils appartenant à l'interface utilisateur, tels que les questions structurées ou les services de pont qui collectent les résultats d'un autre système, puis réactivent la sauvegarde.

Utilisez `ProvideToolResults` avec les résultats bruts fournis :

```go
err := rt.ProvideToolResults(ctx, interrupt.ToolResultsSet{
    RunID: "run-123",
    ID:    "await-1",
    Results: []*api.ProvidedToolResult{
        {
            Name:       "chat.ask_question.ask_question",
            ToolCallID: "toolcall-1",
            Result:     rawjson.Message(`{"answers":[{"question_id":"topic","selected_ids":["alarms"]}]}`),
        },
    },
})
```

Contracter:

- Les appelants fournissent le **résultat canonique brut JSON** plus les `Bounds`, `Error` et `RetryHint` facultatifs.
- Les appelants ne construisent **pas** `api.ToolEvent` ; il s’agit de l’enveloppe de flux de travail interne du runtime.
- Le moteur d'exécution décode le résultat fourni à l'aide de la spécification de l'outil enregistré, exécute la matérialisation des résultats typés, attache tous les side-cars réservés au serveur, ajoute le `tool_result` canonique à la transcription/au journal d'exécution, puis reprend la planification.

Cela maintient le chemin d'attente conceptuellement aligné sur le chemin d'exécution normal : les deux flux convergent vers le même contrat `planner.ToolResult` typé avant la publication.

---

## Confirmation de l'outil

Goa-AI prend en charge les portes de confirmation **appliquées au moment de l'exécution** pour les outils sensibles (écritures, suppressions, commandes).

Vous pouvez activer la confirmation de deux manières :

- **Au moment de la conception (cas courant) :** déclarez `Confirmation(...)` dans l'outil DSL. Magasins Codegen
la politique dans `tools.ToolSpec.Confirmation`.
- **Runtime (remplacement/dynamique) :** passez `runtime.WithToolConfirmation(...)` lors de la construction du runtime
pour exiger une confirmation pour des outils supplémentaires ou remplacer le comportement au moment de la conception.

Au moment de l'exécution, le workflow émet une demande de confirmation hors bande et exécute uniquement l'outil
après qu’une approbation explicite ait été fournie. En cas de refus, le runtime synthétise un outil conforme au schéma
résultat afin que la transcription reste valide et que le planificateur puisse réagir de manière déterministe.

### Protocole de confirmation

Au moment de l'exécution, la confirmation est implémentée sous la forme d'un protocole d'attente/décision dédié :

- **Attendre la charge utile** (diffusé sous le nom `await_confirmation`) :

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

Contracter:

- `payload` contient toujours les arguments canoniques de l'outil JSON pour l'appel en attente. S’ils sont approuvés, ce sont les arguments que le runtime exécute.
- Les remplacements de confirmation peuvent personnaliser le rendu de l'invite et du résultat refusé, mais ils n'introduisent pas de canal de charge utile d'affichage distinct ni ne modifient la signification de `payload`.
- Les produits qui nécessitent une confirmation plus riche UI doivent la matérialiser dans la couche d'application à partir de la charge utile canonique et des lectures appartenant à l'application.

- **Fournir une décision** (via `ProvideConfirmation` lors de l'exécution) :

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

### Événements d’autorisation d’outil

Lorsqu'une décision est fournie, le runtime émet un événement d'autorisation de première classe :

- **Événement crochet** : `hooks.ToolAuthorization`
- **Type d'événement de flux** : `tool_authorization`

Cet événement est l'enregistrement canonique « qui/quand/quoi » pour un appel d'outil confirmé :

- `tool_name`, `tool_call_id`
- `approved` (vrai/faux)
- `summary` (résumé déterministe rendu à l'exécution)
- `approved_by` (copié à partir de `interrupt.ConfirmationDecision.RequestedBy`, destiné à être un identifiant principal stable)

L'événement est émis immédiatement après la réception de la décision (avant l'exécution de l'outil en cas d'approbation, et avant la synthèse du résultat de l'outil refusé en cas de refus).

Remarques :

- Les consommateurs doivent traiter la confirmation comme un protocole d'exécution :
  - Utilisez le motif `RunPaused` associé (`await_confirmation`) pour décider quand afficher une confirmation UI.
  - Ne couplez pas le comportement UI à un nom d’outil de confirmation spécifique ; traitez-le comme un détail de transport interne.
- Les modèles de confirmation (`PromptTemplate` et `DeniedResultTemplate`) sont des chaînes Go `text/template`
exécuté avec `missingkey=error`. En plus des fonctions de modèle standard (par exemple `printf`),
  Goa-AI fournit :
  - `json v` → JSON code `v` (utile pour les champs de pointeur facultatifs ou l'intégration de valeurs structurées).
  - `quote s` → renvoie une chaîne entre guillemets avec échappement Go (comme `fmt.Sprintf("%q", s)`).

### Validation d'exécution

Le runtime valide les interactions de confirmation à la limite :

- La confirmation `ID` correspond à l'identifiant d'attente en attente lorsqu'elle est fournie.
- L'objet de décision est bien formé (`RunID` non vide, valeur booléenne `Approved`).

---

## Contrat de planificateur

Les planificateurs mettent en œuvre :

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contient des appels d'outils, une réponse finale, des annotations et un `RetryHint` facultatif. Le moteur d'exécution applique les plafonds, planifie les activités des outils et renvoie les résultats des outils dans `PlanResume` jusqu'à ce qu'une réponse finale soit produite.

Les planificateurs reçoivent également un `PlannerContext` via `input.Agent` qui expose les services d'exécution :
- `AdvertisedToolDefinitions()` - obtient les définitions d'outils filtrées à l'exécution et visibles par le modèle pour ce tour
- `ModelClient(id string)` - obtenez un client modèle brut indépendant du fournisseur
- `PlannerModelClient(id string)` - obtenez un client modèle à l'échelle du planificateur avec une émission d'événements appartenant au runtime
- `RenderPrompt(ctx, id, data)` - résoudre et afficher le contenu de l'invite pour la portée d'exécution en cours
- `AddReminder(r reminder.Reminder)` - enregistrer les rappels système liés à l'exécution
- `RemoveReminder(id string)` - effacer les rappels lorsque les conditions préalables ne sont plus valables
- `Memory()` - accéder à l'historique des conversations

---

## Modules de fonctionnalités

- `runtime/mcp` – Appelants MCP pour les transports HTTP, SSE et stdio
- `features/memory/mongo` – magasin de mémoire durable
- `features/prompt/mongo` – Magasin de remplacement d'invite soutenu par Mongo
- `features/runlog/mongo` – exécuter le magasin de journaux d'événements (ajout uniquement, pagination du curseur)
- `features/session/mongo` – magasin de métadonnées de session
- `features/stream/pulse` – Assistants récepteurs/abonnés Pulse
- `features/model/{anthropic,bedrock,openai}` – modèles d'adaptateurs client pour les planificateurs
- `features/model/middleware` – middlewares `model.Client` partagés (par exemple, limitation de débit adaptative)
- `features/policy/basic` – moteur de stratégie simple avec listes d'autorisation/blocage et gestion des astuces de nouvelle tentative

### Modéliser le débit client et la limitation du débit

Goa-AI est livré avec un limiteur de débit adaptatif indépendant du fournisseur sous `features/model/middleware`. Il encapsule n'importe quel `model.Client`, estime les jetons par requête, met les appelants en file d'attente à l'aide d'un compartiment de jetons et ajuste son budget effectif de jetons par minute à l'aide d'une stratégie d'augmentation/diminution additive (AIMD) lorsque les fournisseurs signalent une limitation.

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, _ := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
})

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited := rl.Middleware()(bed)

rt := runtime.New()
if err := rt.RegisterModel("bedrock", limited); err != nil {
    panic(err)
}
```

---

## Intégration LLM

Les planificateurs Goa-AI interagissent avec de grands modèles de langage via une **interface indépendante du fournisseur**. Cette conception vous permet d'échanger des fournisseurs (AWS Bedrock, OpenAI ou des points de terminaison personnalisés) sans modifier votre code de planificateur.

### L'interface modèle.Client

Toutes les interactions LLM passent par l'interface `model.Client` :

```go
type Client interface {
    Complete(ctx context.Context, req *Request) (*Response, error)
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

### Adaptateurs de fournisseur

Le Goa-AI est livré avec des adaptateurs pour les fournisseurs LLM populaires :

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
})
```

**OpenAI**

```go
import "goa.design/goa-ai/features/model/openai"

modelClient, err := openai.New(openai.Options{
    APIKey:       apiKey,
    DefaultModel: "gpt-5-mini",
    HighModel:    "gpt-5",
    SmallModel:   "gpt-5-nano",
})
```

### Utilisation de clients modèles dans les planificateurs

Les planificateurs obtiennent des clients modèles via le `PlannerContext` du runtime. Il y a
deux styles d'intégration explicites :

- `PlannerModelClient(id)` pour le streaming à l'échelle du planificateur avec émission d'événements appartenant au runtime
- `ModelClient(id)` lorsque vous avez besoin d'un accès au transport brut et que vous l'associerez à `planner.ConsumeStream` ou émettrez `PlannerEvents` vous-même

#### PlannerModelClient (recommandé)

`PlannerContext.PlannerModelClient(id)` renvoie un client à l'échelle du planificateur qui
possède les émissions `AssistantChunk`, `PlannerThinkingBlock` et `UsageDelta`. C'est
La méthode `Stream(...)` draine le flux du fournisseur sous-jacent et renvoie un
`planner.StreamSummary` :

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc, ok := input.Agent.PlannerModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    if !ok {
        return nil, errors.New("model not configured")
    }

    req := &model.Request{
        Messages: input.Messages,
        Tools:    input.Agent.AdvertisedToolDefinitions(),
        Stream:   true,
    }

    sum, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    if len(sum.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
    }
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: sum.Text}},
            },
        },
        Streamed: true, // Assistant text was already streamed
    }, nil
}
```

Il s'agit du style d'intégration le plus sûr car le client limité au planificateur ne
exposer un `model.Streamer` brut, afin qu'il ne puisse pas être combiné accidentellement avec
`planner.ConsumeStream`.

#### Client brut + ConsumeStream

Lorsque vous avez besoin du `model.Client` brut, récupérez-le sur `PlannerContext.ModelClient`
et associez-le à `planner.ConsumeStream` :

```go
mc, ok := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
if !ok {
    return nil, errors.New("model not configured")
}
req := &model.Request{
    Messages: input.Messages,
    Tools:    input.Agent.AdvertisedToolDefinitions(),
    Stream:   true,
}
streamer, err := mc.Stream(ctx, req)
if err != nil {
    return nil, err
}
sum, err := planner.ConsumeStream(ctx, streamer, req, input.Events)
if err != nil {
    return nil, err
}
```

Cet assistant draine le flux, émet des événements d'assistant/réflexion/utilisation et
renvoie un `StreamSummary` avec du texte et des appels d'outils accumulés.

Utilisez le chemin client brut lorsque vous avez besoin d'un contrôle total sur la consommation de flux, que vous souhaitez
comportement d'arrêt anticipé personnalisé ou si vous souhaitez gérer explicitement `PlannerEvents`. Ne
mélanger `PlannerModelClient.Stream(...)` avec `planner.ConsumeStream` ; choisissez-en un
propriétaire du flux par tour du planificateur.

### Validation de l'ordre des messages Bedrock

Lors de l'utilisation de AWS Bedrock avec le mode réflexion activé, le moteur d'exécution valide les contraintes d'ordre des messages avant d'envoyer les requêtes. Bedrock nécessite :

1. Tout message de l'assistant contenant `tool_use` doit commencer par un bloc de réflexion
2. Chaque message utilisateur contenant `tool_result` doit immédiatement suivre un message d'assistant avec les blocs `tool_use` correspondants.
3. Le nombre de blocs `tool_result` ne peut pas dépasser le nombre `tool_use` précédent.

Le client Bedrock valide ces contraintes plus tôt et renvoie une erreur descriptive en cas de violation :

```
bedrock: invalid message ordering with thinking enabled (run=xxx, model=yyy): 
bedrock: assistant message with tool_use must start with thinking
```

Cette validation garantit que la reconstruction du grand livre de transcription produit des séquences de messages conformes au fournisseur.

---

## Prochaines étapes

- Découvrez les [Ensembles d'outils](./toolsets/) pour comprendre les modèles d'exécution d'outils.
- Explorez [Composition d'agent](./agent-composition/) pour les modèles d'agent en tant qu'outil
- En savoir plus sur [Mémoire et sessions](./memory-sessions/) pour la persistance des transcriptions
