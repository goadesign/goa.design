---
title: Mémoire et sessions
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

Ce guide couvre le modèle de transcription de Goa-AI, la persistance de la mémoire et la façon de modéliser les conversations à plusieurs tours et les flux de travail à long terme.

## Pourquoi les transcriptions sont importantes

Goa-AI traite la **transcription** comme la seule source de vérité pour une exécution : une séquence ordonnée de messages et d'interactions d'outils qui est suffisante pour :

- Reconstruire les charges utiles du fournisseur (Bedrock/OpenAI) pour chaque appel de modèle
- Piloter les planificateurs (y compris les tentatives et les réparations d'outils)
- Alimenter les interfaces utilisateur avec un historique précis

Parce que la transcription fait autorité, vous n'avez **pas** besoin de la gérer manuellement :
- Des listes séparées d'appels d'outils antérieurs et de résultats d'outils
- Des structures ad hoc d'"état de la conversation
- Copies des messages précédents de l'utilisateur ou de l'assistant pour chaque tour

Vous persistez et transmettez **la transcription uniquement** ; Goa-AI et ses adaptateurs de fournisseurs reconstruisent tout ce dont ils ont besoin à partir de cette transcription.

---

## Messages et parties

À la frontière du modèle, Goa-AI utilise des valeurs `model.Message` pour représenter la transcription. Chaque message a un rôle (`user`, `assistant`) et une liste ordonnée de **parties** :

| Type de partie | Description |
|-----------|-------------|
`ThinkingPart` | Contenu du raisonnement du fournisseur (texte en clair + signature ou octets expurgés). Non orienté vers l'utilisateur ; utilisé pour l'audit/la relecture et les interfaces utilisateur optionnelles de "réflexion". |
`TextPart` | Texte visible pour l'utilisateur (questions, réponses, explications). |
`ToolUsePart` Appel d'outil initié par l'assistant avec `ID`, `Name` (ID d'outil canonique), et `Input` (charge utile JSON). |
`ToolResultPart` Résultat utilisateur/outil corrélé à une utilisation antérieure de l'outil via `ToolUseID` et `Content` (charge utile JSON). |

**Order is sacred:**
- Un message d'assistant utilisant un outil ressemble typiquement à ce qui suit : `ThinkingPart`, puis un ou plusieurs `ToolUsePart`, puis un `TextPart` facultatif
- Un message de résultat utilisateur/outil contient généralement un ou plusieurs `ToolResultPart` référençant les ID d'utilisation précédente de l'outil, ainsi qu'un texte utilisateur facultatif

Les adaptateurs des fournisseurs de Goa-AI (par exemple, Bedrock Converse) réencodent ces parties dans des blocs spécifiques au fournisseur **sans réorganisation**.

---

## Le contrat de transcription

Le contrat de transcription de haut niveau dans Goa-AI est :

1. L'application (ou le runtime) **persiste chaque événement** pour un run dans l'ordre : pensée de l'assistant, texte, tool_use (ID + args), tool_result de l'utilisateur (tool_use_id + content), messages ultérieurs de l'assistant, et ainsi de suite
2. Avant chaque appel de modèle, l'appelant fournit la **transcription complète** de l'exécution en tant que `[]*model.Message`, le dernier élément étant le nouveau delta (texte de l'utilisateur ou résultat de l'outil)
3. Goa-AI ré-encode cette transcription dans le format de chat du fournisseur dans le même ordre

Il n'y a **pas d'API séparée pour l'historique de l'outil** ; la transcription est l'historique.

### Comment cela simplifie les planificateurs et les interfaces utilisateur

- **Les planificateurs** : Reçoivent la transcription actuelle dans `planner.PlanInput.Messages` et `planner.PlanResumeInput.Messages`. Ils peuvent décider de ce qu'il faut faire en se basant uniquement sur les messages, sans passer par un état supplémentaire.
- **UIs** : L'historique du chat, les rubans d'outils et les cartes d'agent peuvent être rendus à partir de la même transcription sous-jacente que celle qui est conservée pour le modèle. Aucune structure séparée de "journal d'outil" n'est nécessaire.
- **Adaptateurs de fournisseurs** : Ne devinent jamais quels outils ont été appelés ou quels résultats appartiennent à quel endroit ; ils mappent simplement les parties de la transcription → les blocs du fournisseur.

---

## Registre des transcriptions

Le **registre de transcription** est un enregistrement précis du fournisseur qui conserve l'historique des conversations dans le format exact requis par les fournisseurs de modèles. Il garantit une relecture déterministe et la fidélité du fournisseur sans que les types de SDK du fournisseur ne s'infiltrent dans l'état du flux de travail.

### Fidélité du fournisseur

Les différents fournisseurs de modèles (Bedrock, OpenAI, etc.) ont des exigences strictes concernant l'ordre et la structure des messages. Le grand livre applique ces contraintes :

| Le grand livre applique ces contraintes : - Exigence du fournisseur - Garantie du grand livre - Exigence du fournisseur - Garantie du grand livre - Garantie du grand livre
|---------------------|------------------|
| La pensée doit précéder l'utilisation de l'outil dans les messages de l'assistant. Le grand livre ordonne les parties : pensée → texte → utilisation de l'outil
| Les résultats de l'outil doivent suivre l'utilisation de l'outil correspondant | Le grand livre établit une corrélation entre le résultat de l'outil et l'utilisation de l'outil par le biais de la ToolUseID
| Alternance de messages (assistant → utilisateur → assistant) | Le grand livre efface l'assistant avant d'ajouter les résultats de l'utilisateur |

Pour Bedrock en particulier, lorsque la réflexion est activée :
- Les messages de l'assistant contenant tool_use **doivent** commencer par un bloc de réflexion
- Les messages de l'utilisateur contenant le résultat de l'outil doivent suivre immédiatement le message de l'assistant déclarant l'utilisation de l'outil
- Le nombre de résultats d'outils ne peut pas dépasser le nombre d'utilisations d'outils précédentes

### Exigences en matière d'ordre

Le grand livre stocke les pièces dans l'ordre canonique requis par les fournisseurs :

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

Cet ordre est **sacré** - le grand livre ne réorganise jamais les pièces, et les adaptateurs des fournisseurs les réencodent dans des blocs spécifiques aux fournisseurs dans le même ordre.

### Maintenance automatique du grand livre

Le moteur d'exécution maintient automatiquement le grand livre des transcriptions. Vous n'avez pas besoin de le gérer manuellement :

1. **Capture d'événements** : Au fur et à mesure de l'exécution, le moteur d'exécution conserve les événements de mémoire (`EventThinking`, `EventAssistantMessage`, `EventToolCall`, `EventToolResult`) dans l'ordre suivant

2. **Reconstruction du ledger** : La fonction `BuildMessagesFromEvents` reconstruit les messages prêts pour le fournisseur à partir des événements stockés :

```go
// Reconstruct messages from persisted events
events := loadEventsFromStore(agentID, runID)
messages := transcript.BuildMessagesFromEvents(events)

// Messages are now in canonical provider order
// Ready to pass to model.Client.Complete() or Stream()
```

3. **Validation** : Avant l'envoi aux fournisseurs, le runtime peut valider la structure du message :

```go
// Validate Bedrock constraints when thinking is enabled
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    // Handle constraint violation
}
```

### API du grand livre

Pour les cas d'utilisation avancés, vous pouvez interagir directement avec le grand livre. Le grand livre fournit ces méthodes clés :

| Méthode | Description
|--------|-------------|
`NewLedger()` | Crée un nouveau grand livre vide `NewLedger()` | Crée un nouveau grand livre vide `NewLedger()` | Crée un nouveau grand livre vide
| `AppendThinking(part)` | Ajoute une partie pensante au message de l'assistant en cours |
`AppendText(text)` | Ajoute un texte visible au message de l'assistant en cours
`DeclareToolUse(id, name, args)` | Déclare une invocation d'outil dans le message de l'assistant en cours |
`FlushAssistant()` | Finalise le message de l'assistant en cours et prépare l'entrée de l'utilisateur
| `AppendUserToolResults(results)` | Ajoute les résultats de l'outil dans le message de l'utilisateur
| `BuildMessages()` | Retourne la transcription complète sous la forme `[]*model.Message` | `BuildMessages()` | `BuildMessages()` `[]*model.Message`

**Exemple d'utilisation:**

```go
import "goa.design/goa-ai/runtime/agent/transcript"

// Create a new ledger
l := transcript.NewLedger()

// Record assistant turn
l.AppendThinking(transcript.ThinkingPart{
    Text:      "Let me search for that...",
    Signature: "provider-sig",
    Index:     0,
    Final:     true,
})
l.AppendText("I'll search the database.")
l.DeclareToolUse("tu-1", "search_db", map[string]any{"query": "status"})
l.FlushAssistant()

// Record user tool results
l.AppendUserToolResults([]transcript.ToolResultSpec{{
    ToolUseID: "tu-1",
    Content:   map[string]any{"results": []string{"item1", "item2"}},
    IsError:   false,
}})

// Build provider-ready messages
messages := l.BuildMessages()
```

**Note:** La plupart des utilisateurs n'ont pas besoin d'interagir directement avec le grand livre. Le runtime maintient automatiquement le grand livre à travers la capture et la reconstruction d'événements. N'utilisez l'API du grand livre que pour des scénarios avancés tels que des planificateurs personnalisés ou des outils de débogage.

### Pourquoi c'est important

- **Relecture déterministe** : Les événements stockés peuvent reconstruire la transcription exacte à des fins de débogage, d'audit ou de réexécution des échecs
- **Stockage indépendant du fournisseur** : Le grand livre stocke des parties compatibles avec JSON sans dépendre des SDK des fournisseurs
- **Des planificateurs simplifiés** : Les planificateurs reçoivent des messages correctement ordonnés sans avoir à gérer les contraintes des fournisseurs
- **Validation** : Les violations de l'ordre sont détectées avant qu'elles n'atteignent le fournisseur et ne provoquent des erreurs cryptiques

---

## Sessions, séries et transcriptions

Goa-AI sépare l'état de la conversation en trois couches :

- **Session** (`SessionID`) - une conversation ou un flux de travail dans le temps :
  - par exemple, une session de chat, un ticket de remédiation, une tâche de recherche
  - Plusieurs exécutions peuvent appartenir à la même session

- **Exécution** (`RunID`) - une exécution d'un agent :
  - Chaque appel à un client d'agent (`Run`/`Start`) crée une exécution
  - Les exécutions ont un statut, des phases et des étiquettes

- **Transcript** - l'historique complet des messages et des interactions avec les outils pour une exécution :
  - Représenté par `[]*model.Message`
  - Persisté via `memory.Store` en tant qu'événements de mémoire ordonnés

### SessionID & TurnID en pratique

Lors de l'appel d'un agent :

```go
client := chat.NewClient(rt)
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID` : Regroupe toutes les exécutions pour une conversation ; souvent utilisé comme clé de recherche dans les magasins d'exécutions et les tableaux de bord
- `TurnID` : Regroupe les événements d'un seul utilisateur → interaction avec l'assistant ; facultatif mais utile pour les interfaces utilisateur et les journaux

---

## Memory Store vs Run Store

Les modules de Goa-AI fournissent des mémoires complémentaires :

### Mémoire (`memory.Store`)

Conserve l'historique des événements par exécution :
- Messages de l'utilisateur/assistant
- Appels d'outils et résultats
- Notes et réflexions du planificateur

```go
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}
```

Types de clés :
- **`memory.Snapshot`** - vue immuable de l'historique stocké d'une exécution (`AgentID`, `RunID`, `Events []memory.Event`)
- **`memory.Event`*** - entrée unique persistante avec `Type` (`user_message`, `assistant_message`, `tool_call`, `tool_result`, `planner_note`, `thinking`), `Timestamp`, `Data`, et `Labels`

### Exécuter le magasin (`run.Store`)

Conserve les métadonnées d'exécution à gros grain :
- `RunID`, `AgentID`, `SessionID`, `TurnID`
- État, horodatage, étiquettes

```go
type Store interface {
    Upsert(ctx context.Context, record run.Record) error
    Load(ctx context.Context, runID string) (run.Record, error)
}
```

`run.Record` captures :
- `AgentID`, `RunID`, `SessionID`, `TurnID`
- `Status` (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`)
- `StartedAt`, `UpdatedAt`
- `Labels` (locataire, priorité, etc.)

---

## Câblage des magasins

Avec les implémentations soutenues par MongoDB :

```go
import (
    memorymongo "goa.design/goa-ai/features/memory/mongo"
    runmongo    "goa.design/goa-ai/features/run/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

mongoClient := newMongoClient()

memStore, err := memorymongo.NewStore(memorymongo.Options{Client: mongoClient})
if err != nil {
    log.Fatal(err)
}

runStore, err := runmongo.NewStore(runmongo.Options{Client: mongoClient})
if err != nil {
    log.Fatal(err)
}

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunStore(runStore),
)
```

Une fois configurés :
- Les abonnés par défaut conservent la mémoire et exécutent automatiquement les métadonnées
- Vous pouvez reconstruire les transcriptions à partir de `memory.Store` à tout moment pour rappeler les modèles, alimenter les interfaces utilisateur ou effectuer des analyses hors ligne

---

## Magasins personnalisés

Implémenter les interfaces `memory.Store` et `run.Store` pour les backends personnalisés :

```go
// Memory store
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}

// Run store
type Store interface {
    Upsert(ctx context.Context, record run.Record) error
    Load(ctx context.Context, runID string) (run.Record, error)
}
```

---

## Modèles communs

### Sessions de chat

- Utiliser une `SessionID` par session de chat
- Démarrer une nouvelle exécution par tour d'utilisateur ou par "tâche"
- Persister les transcriptions par exécution ; utiliser les métadonnées de la session pour assembler la conversation

### Flux de travail à long terme

- Utiliser une seule exécution par flux de travail logique (éventuellement avec pause/reprise)
- Utiliser `SessionID` pour regrouper les flux de travail connexes (par exemple, par ticket ou incident)
- S'appuyer sur les événements `run.Phase` et `RunCompleted` pour le suivi de l'état

### Recherche et tableaux de bord

- Interroger `run.Store` par `SessionID`, étiquettes, statut
- Chargement de transcriptions à partir de `memory.Store` à la demande pour les séries sélectionnées

---

## Meilleures pratiques

- **Toujours corréler les résultats des outils** : Assurez-vous que les implémentations d'outils et les planificateurs préservent les ID d'utilisation d'outils et que les résultats des outils sont renvoyés au bon `ToolUsePart` via `ToolResultPart.ToolUseID`

- **Utiliser des schémas solides et descriptifs** : Des types, descriptions et exemples riches en `Args` / `Return` dans votre conception de Goa produisent des charges utiles/résultats d'outils plus clairs dans la transcription

- **Laissez le temps d'exécution s'occuper de l'état** : Évitez de maintenir des tableaux parallèles d'"historique de l'outil" ou des tranches de "messages précédents" dans votre planificateur. Lisez à partir de `PlanInput.Messages` / `PlanResumeInput.Messages` et comptez sur l'exécution pour ajouter de nouvelles parties

- **Les transcriptions ne sont conservées qu'une seule fois et réutilisées partout** : Quel que soit le magasin que vous choisissez, traitez la transcription comme une infrastructure réutilisable - la même transcription soutenant les appels de modèle, l'interface de discussion, l'interface de débogage et l'analyse hors ligne

- **Indexez les champs fréquemment interrogés** : ID de session, ID d'exécution, statut pour des requêtes efficaces

- **Archivage des anciennes transcriptions** : Réduire les coûts de stockage en archivant les exécutions terminées

---

## Prochaines étapes

- **[Production](./production.md)** - Déployer avec Temporal, l'interface utilisateur en continu et l'intégration des modèles
- **[Exécution](./runtime.md)** - Comprendre la boucle plan/exécution
- **[Composition d'agents](./agent-composition.md)** - Construire des graphes d'agents complexes
