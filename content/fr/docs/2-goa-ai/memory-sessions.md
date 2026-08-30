---
title: Mémoire et sessions
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

Ce guide couvre le modèle de transcription de Goa-AI, la persistance de la mémoire et la façon de modéliser les conversations à plusieurs tours et les flux de travail à long terme.

## Pourquoi les transcriptions sont importantes
Goa-AI considère la **transcription** comme la source de vérité de la conversation visible par le modèle : une suite ordonnée de messages et d’interactions avec les outils suffisante pour :

- Reconstruire les payloads du fournisseur pour chaque appel du modèle
- Piloter les planificateurs, y compris les nouvelles tentatives et la réparation d’outils
- Alimenter les interfaces avec un historique exact

Comme la transcription fait autorité pour l’entrée du modèle, vous n’avez pas besoin de gérer manuellement :

- des listes séparées d’appels et de résultats d’outils antérieurs
- des structures ad hoc d’état de conversation
- des copies par tour des anciens messages

Pour l’historique de conversation, conservez et transmettez **uniquement la transcription** ; Goa-AI et ses adaptateurs reconstruisent l’entrée du fournisseur. L’état d’exécution, l’annulation, les points de reprise et les enregistrements immuables appartiennent au stockage distinct du runtime décrit plus bas.

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

## Relecture de la transcription du runtime

Le runtime enregistre des ajouts canoniques de `model.Message` dans les
enregistrements ordonnés de l’exécution. `transcript_messages_seeded` contient
les messages qui existaient avant le début de l’exécution ;
`transcript_messages_appended` contient les messages acceptés pendant son
exécution. Les enregistrements initiaux reconstruisent l’entrée du modèle, mais
ne sont pas publiés comme une nouvelle réponse de l’assistant.

Utilisez la fonction publique de relecture lorsque la récupération ou
l’inspection nécessite la séquence exacte des messages préparés pour le
fournisseur :

```go
import "goa.design/goa-ai/runtime/agent/transcript"

messages, err := transcript.BuildMessagesFromRunLog(ctx, runtimeStore, runID)
if err != nil {
    return err
}
```

`BuildMessagesFromRunLog` parcourt les pages de
`storage.Store.ListRunRecords` et relit uniquement les enregistrements
canoniques de transcription dans leur ordre de stockage. Si les enregistrements
sont déjà chargés, `ReplayRunLogEvents` effectue la même projection. Les
adaptateurs de fournisseur préservent l’ordre des parties ;
`ValidatePlannerTranscript` et `ValidateBedrock` permettent de vérifier une
transcription à la frontière appropriée.

`ValidatePlannerTranscript` exige que chaque groupe d’appels d’outil de
l’assistant soit suivi immédiatement d’un seul message utilisateur contenant
exactement un résultat pour chaque identifiant d’appel. Lorsque le raisonnement
est activé, `ValidateBedrock` exige en plus que chaque message de l’assistant
qui appelle un outil commence par un `ThinkingPart`. Aucun validateur ne
modifie les messages.

Ces enregistrements servent à la reprise et à l’inspection des workflows. Ils ne
remplacent pas la transcription détenue par le produit pour l’historique du
chat, les évaluations, la recherche, la conservation ou la suppression des
données client.

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
store := storageinmem.New()
if _, err := store.CreateSession(ctx, "chat-session-123", time.Now().UTC()); err != nil {
    panic(err)
}
rt := runtime.New(store)
client := chat.NewClient(rt)
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID` : Regroupe toutes les exécutions pour une conversation ; souvent utilisé comme clé de recherche dans les runtime records et les tableaux de bord
- `TurnID` : Regroupe les événements d'un seul utilisateur → interaction avec l'assistant ; facultatif mais utile pour les interfaces utilisateur et les journaux

Les sessions se terminent explicitement (par exemple lors de la suppression d’une conversation). Une fois une session terminée, aucune nouvelle exécution ne doit démarrer sous celle-ci.

---

## Mémoire produit et stockage du runtime {#runtime-store}

Goa-AI sépare deux catégories de données durables parce qu’elles ont des propriétaires différents :

- **La mémoire produit** contient la transcription et les données applicatives qui en découlent. Le produit décide quoi conserver, afficher, rechercher ou supprimer.
- **Le stockage du runtime** contient l’état nécessaire à Goa-AI pour exécuter et reprendre les exécutions : état de session, métadonnées d’exécution, points de reprise privés et enregistrements immuables.

Par exemple, un service de chat peut garder la conversation complète, les évaluations et les champs de recherche dans sa propre base de données. Le stockage du runtime note que `run-42` a commencé, quelle exécution enfant il a lancée, si une annulation a été demandée et comment il s’est terminé. Il ne devient pas la base de données des transcriptions du chat.

### Stockage mémoire (`memory.Store`)

Il conserve l’historique de chaque exécution :

- messages utilisateur et assistant
- appels d’outils et résultats
- notes et raisonnement du planificateur

Ces événements permettent de reconstruire un `model.Transcript` et les messages envoyés au fournisseur. Le produit possède ces données visibles par le modèle.

### Stockage du runtime (`storage.Store`)

L’hôte fournit une implémentation de `storage.Store`. Cette implémentation unique possède toutes les écritures du runtime :

- portée de la session et état actif, terminé ou supprimé définitivement
- identité, parenté, libellés, décision initiale et état courant de l’exécution
- octets privés requis pour reprendre une exécution suspendue
- enregistrements ordonnés et immuables utilisés pour l’inspection et pour retrouver les versions de prompts ayant influencé l’exécution

Le runtime exige cette dépendance :

```go
store := newRuntimeStore()
rt := runtime.New(store, runtime.WithEngine(eng))
```

Dans une application monoprocessus, `store` peut être un adaptateur local. Dans une application distribuée, un service unique possède la base de données et expose des méthodes typées ; les workers implémentent `storage.Store` en appelant ce service. Des services distincts n’écrivent pas directement dans les mêmes collections.

Les appels d'outils possèdent deux identifiants distincts.
`ModelToolCallID` est l'ID de transcription du fournisseur qui associe un appel
produit par le modèle à son résultat visible par le modèle. `ToolCallID` est
l'ID d'exécution du runtime utilisé par les activités, les tentatives, le
journal d'exécution et les événements de flux. Un appel produit par le modèle
et suspendu conserve les deux ; ne remplacez jamais l'un par l'autre et ne les
déduisez pas de l'ordre d'exécution.

---

## Enregistrer ensemble les changements de cycle de vie et leurs preuves {#store-lifecycle-changes-and-records-together}

Chaque méthode de cycle de vie enregistre l’état et l’enregistrement correspondant dans la même opération :

- `StartRootRun` enregistre les métadonnées d’une exécution racine et son premier enregistrement.
- `StartChildRun` enregistre le lien parent, les métadonnées de l’enfant et son premier enregistrement.
- `StartOneShotRun` enregistre une exécution sans session et son premier enregistrement.
- `StartOneShotChildRun` enregistre ensemble le lien vers le parent sans session et le démarrage de l'enfant.
- `RecordRunCancellation` enregistre le premier motif d’annulation et son enregistrement.
- `RecordRunSuspension` enregistre le point de reprise privé, l’état suspendu et son enregistrement.
- `RecordRunTerminal` enregistre l’état final et son enregistrement.

Une panne de base de données ne peut donc pas laisser une exécution terminée sans son enregistrement de fin, ni un point de reprise sauvegardé alors que l’exécution paraît encore active.

Les enregistrements ordinaires utilisent `AppendRunRecord`. `ListRunRecords` et `ListSessionRunRecords` les lisent. Le curseur est une position produite par le stockage et renvoyée sans modification pour obtenir la page suivante.

### Nouvelles tentatives exactes

Une activity de workflow peut s’exécuter plusieurs fois. Une répétition exacte réussit donc et renvoie l’identifiant d’origine. Elle doit répéter exactement l’identité, l’heure, les libellés, la clé et le payload de l’événement, le point de reprise, l’état et le motif d’annulation.

Pour chaque démarrage, annulation, suspension et fin, le stockage mémorise aussi
l’enregistrement exact choisi par la première écriture réussie. Répéter le
changement de cycle de vie avec un autre enregistrement produit un conflit,
même si l’état et les autres champs du cycle de vie sont identiques.

Toute valeur différente de la première écriture produit un conflit. Le stockage ne choisit pas la valeur la plus récente et n’écrase pas la première. Le premier motif d’annulation est permanent : une répétition exacte réussit, un motif différent échoue.

### Démarrage d'une continuation

Une continuation exige une exécution précédente existante dont le statut est
`suspended`. Le successeur doit reprendre la même session, le même agent et la
même exécution parente. Le stockage vérifie ces quatre faits dans la transaction
qui créerait le successeur. Toute différence est rejetée avant d'écrire le
démarrage du successeur ou un lien vers le parent.

L'enregistrement `RunStarted` du successeur conserve `PredecessorRunID`.
`RunMeta` ne duplique pas cette relation. Les lecteurs reconstruisent
l'historique des continuations à partir des enregistrements qui l'ont établi.

### Ordre de démarrage

Pour les exécutions racines, le moteur accepte le workflow avant toute écriture
dans le stockage du runtime. Aucun enregistrement `pending` n'est créé avant
cette acceptation. La première activité durable du workflow appelle
`StartRootRun` :

- si la session est active, le stockage écrit `RunStarted`, marque l'exécution
  comme active et le workflow continue ;
- si la session s'est terminée après l'acceptation du workflow par le moteur,
  le stockage écrit tout de même `RunStarted`, le fait immédiatement suivre
  d'un `RunCompleted` annulé et le workflow s'arrête avant le planificateur ou
  les outils.

Les workflows enfants utilisent `StartChildRun`. Le stockage écrit
`ChildRunLinked` sur le parent, puis `RunStarted` sur l'enfant. Si la session est
terminée, il écrit aussi le `RunCompleted` annulé de l'enfant. Chaque workflow
accepté par le moteur possède donc un enregistrement `RunStarted`, y compris un
travail arrêté parce que sa session était terminée.

Un travail racine sans session utilise `StartOneShotRun` : il reçoit les
métadonnées normales de l'exécution et `RunStarted`, mais ne crée ni ne rejoint
une session. Un agent appelé comme outil depuis cette exécution utilise
`StartOneShotChildRun`. Lors du premier appel, le parent doit déjà exister, ne
pas avoir de session et être encore actif. Le stockage écrit `ChildRunLinked`
sur ce parent et `RunStarted` sur l'enfant sans session en une seule opération.

Une nouvelle tentative strictement identique de `StartOneShotChildRun` réussit
même si le parent s'est terminé après la première écriture, car la relation avec
l'enfant avait déjà été acceptée. Elle doit reprendre la même identité d'enfant
ainsi que les clés et les contenus des deux enregistrements. Une tentative
modifiée provoque un conflit et aucun nouvel enfant ne peut être ajouté après la
fin du parent.

Le résultat du démarrage rapporte la décision d'origine, pas l'état courant de
l'exécution. Une nouvelle tentative après la fin renvoie donc la même décision
que celle prise lors de la première écriture.

---

## Cycle de vie et suppression des sessions

L’application hôte administre les sessions, pas les workers. Elle crée une session avant un travail avec session, la termine lorsqu’aucun nouveau travail ne doit commencer et la supprime définitivement seulement après la fin de toutes ses exécutions.

Terminer et purger sont deux opérations distinctes :

- **Terminer** empêche un nouveau travail du planificateur ou des outils, tout en autorisant les exécutions en cours à enregistrer leur fin.
- **Purger** supprime la session, ses exécutions, points de reprise et enregistrements après leur fin. L’identifiant supprimé reste inutilisable afin qu’une tentative tardive ne recrée pas l’ancien état.

L’implémentation en mémoire `runtime/agent/storage/inmem` expose `CreateSession`, `EndSession` et `PurgeSession` pour les exemples et tests. En production, le service propriétaire de la base de données implémente ces opérations.

Les versions de prompts sont déduites des enregistrements `prompt_rendered` et des liens parent-enfant. Le stockage ne maintient pas une seconde liste susceptible de contredire l’historique.

---

## Migration depuis les stockages séparés

Ce contrat rompt l’API précédente. Sont supprimés :

- `session.Store` et `runlog.Store`
- `runtime.WithSessionStore` et `runtime.WithRunEventStore`
- les méthodes d’administration de session du runtime, comme `CreateSession`, `EndSession` et `PurgeSession`
- les packages intégrés `features/session/mongo` et `features/runlog/mongo`

Implémentez un seul `runtime/agent/storage.Store` et passez-le en premier argument de `runtime.New`. Déplacez la création, la fin et la suppression des sessions dans le service hôte propriétaire des données. Les workers situés dans d’autres services appellent ce propriétaire par une API typée au lieu d’importer son adaptateur de base de données.

Avant que le nouveau runtime écrive, les données existantes doivent respecter
le contrat du stockage intégré. Les métadonnées, points de reprise et
enregistrements doivent prendre en charge les opérations de cycle de vie
ci-dessus, et les anciens writers des stockages séparés ne doivent pas se
chevaucher avec les nouveaux. L’application hôte choisit la procédure de
conversion et de récupération adaptée à sa base de données et à son
environnement, puis déploie ensemble le propriétaire et tous ses workers.

## Modèles communs

### Sessions de chat

- Utiliser une `SessionID` par session de chat
- Démarrer une nouvelle exécution par tour d'utilisateur ou par "tâche"
- Conservez la transcription produit dans le service de chat ; utilisez les enregistrements du runtime pour l’état, la reprise et l’inspection

### Flux de travail à long terme

- Utiliser une exécution pour chaque workflow accepté par le moteur
- Lorsqu’une exécution demande une entrée externe, son workflow se termine ; la réponse démarre une nouvelle exécution dans la même session à partir du point de reprise enregistré
- Utiliser `SessionID` pour regrouper les flux de travail connexes (par exemple, par ticket ou incident)
- S'appuyer sur les événements `run.Phase` et `RunCompleted` pour le suivi de l'état

### Recherche et tableaux de bord

- Paginer le `storage.Store` par `RunID` pour les UI d'audit/debug
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
