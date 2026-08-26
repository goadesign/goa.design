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
`ImagePart` | Multimodal image content (bytes or URL/metadata) for providers that support images. |
`DocumentPart` | Document content (text/bytes/URI/chunks) attached to messages for providers that support document parts. |
`CitationsPart` | Structured citations metadata produced by providers (for UI display / audit). |
`ToolUsePart` Appel d'outil initié par l'assistant avec `ID`, `Name` (ID d'outil canonique), et `Input` (charge utile JSON). |
`ToolResultPart` Résultat utilisateur/outil corrélé à une utilisation antérieure de l'outil via `ToolUseID` et `Content` (charge utile JSON). |
`CacheCheckpointPart` | Marker for prompt cache boundaries (provider-dependent, not user-facing). |

**Order is sacred:**
- Un message d'assistant utilisant un outil ressemble typiquement à ce qui suit : `ThinkingPart` (si présent), puis un `TextPart` facultatif, puis un ou plusieurs `ToolUsePart`
- Un message de résultat utilisateur/outil contient généralement un ou plusieurs `ToolResultPart` référençant les ID d'utilisation précédente de l'outil, ainsi qu'un contenu utilisateur facultatif (`TextPart`, `ImagePart`, `DocumentPart`)

Les adaptateurs des fournisseurs de Goa-AI (par exemple, Bedrock Converse) réencodent ces parties dans des blocs spécifiques au fournisseur **sans réorganisation**.

---

## Le contrat de transcription

Le contrat de transcription de haut niveau dans Goa-AI est :

1. L'application (ou le runtime) **persiste chaque événement** pour un run dans l'ordre : pensée de l'assistant, texte, tool_use (ID + args), tool_result de l'utilisateur (tool_use_id + content), messages ultérieurs de l'assistant, et ainsi de suite
2. Avant chaque appel de modèle, l'appelant fournit la **transcription complète** de l'exécution en tant que `[]*model.Message`, le dernier élément étant le nouveau delta (texte de l'utilisateur ou résultat de l'outil)
3. Goa-AI ré-encode cette transcription dans le format de chat du fournisseur dans le même ordre

Il n'y a **pas d'API séparée pour l'historique de l'outil** ; la transcription est l'historique.

Les adaptateurs de modèles ne conservent aucun état entre les appels. Chaque
`model.Request` doit contenir la transcription complète prête pour le
fournisseur ; un ID d'exécution ne leur demande pas de charger les messages
antérieurs. Les clients publics valident la requête et la réponse complète
avant que le planificateur puisse les observer.

### Compression de l'historique

La politique `History(...)` d'un agent peut résumer les anciens tours tout en
conservant une fin exacte et limitée. Les valeurs `CompressAt...` déterminent
le début de la compression ; les valeurs `KeepMax...` déterminent les tours
complets les plus récents qui restent inchangés. Le runtime ne tronque jamais
un tour.

La compression exige un `HistoryModel` configuré. Les déclencheurs et limites
fondés sur les jetons exigent aussi le comptage exact de ce client. Bedrock
Runtime ne peut pas compter les requêtes avec sortie structurée, et certains
modèles Claude actuels exigent l'endpoint Mantle distinct d'AWS. Consultez
[Runtime → Politiques d'historique](../runtime/#history-policies) et
[Référence DSL → History](../dsl-reference/#history).

### Comment cela simplifie les planificateurs et les interfaces utilisateur

- **Les planificateurs** : Reçoivent la transcription actuelle dans `planner.PlanInput.Messages` et `planner.PlanResumeInput.Messages`. Ils peuvent décider de ce qu'il faut faire en se basant uniquement sur les messages, sans passer par un état supplémentaire.
- **UIs** : L'historique du chat, les rubans d'outils et les cartes d'agent peuvent être rendus à partir de la même transcription sous-jacente que celle qui est conservée pour le modèle. Aucune structure séparée de "journal d'outil" n'est nécessaire.
- **Adaptateurs de fournisseurs** : Ne devinent jamais quels outils ont été appelés ou quels résultats appartiennent à quel endroit ; ils mappent simplement les parties de la transcription → les blocs du fournisseur.

---

## Relecture de la transcription depuis le journal d'exécution

Le runtime enregistre les ajouts à la transcription prête pour le fournisseur
sous forme d'événements ordonnés dans le journal d'exécution. Un événement de
transcription contient une tranche de valeurs `model.Message` encodée en JSON.
La relecture ajoute ces tranches dans l'ordre du journal ; elle ne réorganise
pas les parties, n'invente pas de message absent et n'expose pas de
transcription mutable.

### Exigences en matière d'ordre

Les messages enregistrés conservent l'ordre des parties exigé par les
fournisseurs :

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

Les adaptateurs réencodent les parties dans leurs blocs spécifiques en
conservant cette séquence.

### API publique de relecture

Le package `runtime/agent/transcript` expose ces opérations sur le journal :

- `EncodeRunLogDelta(messages)` reçoit les `[]*model.Message` ajoutés à un
  instant de l'exécution et renvoie leur charge utile JSON sous forme de
  `rawjson.Message`. Les erreurs d'encodage sont renvoyées.
- `DecodeRunLogDelta(payload)` décode la charge utile d'un événement et renvoie
  les `[]*model.Message` enregistrés. Un JSON invalide produit une erreur.
- `ReplayRunLogEvents(events)` reçoit une tranche déjà ordonnée de
  `*runlog.Event`. Il ignore les événements autres que les graines et ajouts de
  transcription, concatène les messages dans l'ordre d'entrée et renvoie les
  messages, un booléen indiquant si un événement de transcription a été trouvé
  et une erreur.
- `BuildMessagesFromRunLog(ctx, store, runID)` parcourt les pages du
  `runlog.Store` pour une exécution et renvoie toute sa transcription ordonnée.
  Il échoue si le magasin ou l'ID manque, si la lecture ou le décodage échoue ou
  si l'exécution ne possède aucun événement de transcription.

La plupart des applications laissent le runtime écrire les événements puis
utilisent `BuildMessagesFromRunLog` pour obtenir l'historique prêt pour le
fournisseur :

```go
messages, err := transcript.BuildMessagesFromRunLog(ctx, runEventStore, runID)
if err != nil {
    return err
}
```

Validez les messages après leur construction ou leur relecture :

```go
if err := transcript.ValidatePlannerTranscript(messages); err != nil {
    return err
}
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    return err
}
```

`ValidatePlannerTranscript(messages)` n'accepte que les transcriptions où
chaque groupe d'appels d'outils de l'assistant est immédiatement suivi d'un
message utilisateur contenant exactement un résultat correspondant à chaque
ID. `ValidateBedrock(messages, thinkingEnabled)` ajoute la règle Bedrock :
lorsque le raisonnement est actif, tout message de l'assistant qui contient un
appel d'outil doit commencer par un `ThinkingPart`. Aucun validateur ne modifie
les messages.

### Pourquoi c'est important

- **Relecture déterministe** : Les événements stockés peuvent reconstruire la transcription exacte à des fins de débogage, d'audit ou de réexécution des échecs
- **Stockage indépendant du fournisseur** : les charges utiles du journal
  conservent le JSON de `model.Message` sans dépendre des SDK
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
if _, err := rt.CreateSession(ctx, "chat-session-123"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID` : Regroupe toutes les exécutions pour une conversation ; souvent utilisé comme clé de recherche dans les journaux d'exécution et les tableaux de bord
- `TurnID` : Regroupe les événements d'un seul utilisateur → interaction avec l'assistant ; facultatif mais utile pour les interfaces utilisateur et les journaux

Les sessions se terminent explicitement (par exemple lors de la suppression d’une conversation). Une fois une session terminée, aucune nouvelle exécution ne doit démarrer sous celle-ci.

---

## Memory Store vs Run Log

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

### Run Log (`runlog.Store`)

Conserve le **journal canonique, append-only** des événements d'exécution. Le runtime y ajoute les événements hook au fil de l'exécution, et les consommateurs peuvent paginer via un curseur opaque pour les UI et le diagnostic.

```go
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

`runlog.Page` contient :
- `Events` (ordonnés du plus ancien au plus récent)
- `NextCursor` (vide lorsqu'il n'y a plus d'événements)

Les appels d'outils possèdent deux identifiants distincts.
`ModelToolCallID` est l'ID de transcription du fournisseur qui associe un appel
produit par le modèle à son résultat visible par le modèle. `ToolCallID` est
l'ID d'exécution du runtime utilisé par les activités, les tentatives, le
journal d'exécution et les événements de flux. Un appel produit par le modèle
et suspendu conserve les deux ; ne remplacez jamais l'un par l'autre et ne les
déduisez pas de l'ordre d'exécution.

---

## Câblage des magasins

Avec les implémentations soutenues par MongoDB :

```go
import (
    memorymongo "goa.design/goa-ai/features/memory/mongo"
    memorymongoclient "goa.design/goa-ai/features/memory/mongo/clients/mongo"
    runlogmongo "goa.design/goa-ai/features/runlog/mongo"
    runlogmongoclient "goa.design/goa-ai/features/runlog/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

mongoClient := newMongoClient()

memClient, err := memorymongoclient.New(memorymongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

memStore, err := memorymongo.NewStore(memClient)
if err != nil {
    log.Fatal(err)
}

runlogClient, err := runlogmongoclient.New(runlogmongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

runEventStore, err := runlogmongo.NewStore(runlogClient)
if err != nil {
    log.Fatal(err)
}

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunEventStore(runEventStore),
)
```

Une fois configurés :
- Les abonnés par défaut conservent la mémoire et les événements d'exécution automatiquement
- Vous pouvez reconstruire les transcriptions à partir de `memory.Store` à tout moment pour rappeler les modèles, alimenter les interfaces utilisateur ou effectuer des analyses hors ligne

---

## Magasins personnalisés

Implémenter les interfaces `memory.Store` et `runlog.Store` pour les backends personnalisés :

```go
// Memory store
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}

// Run log store
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
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

- Paginer le `runlog.Store` par `RunID` pour les UI d'audit/debug
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
