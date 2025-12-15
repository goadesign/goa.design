---
title: "Pulse"
weight: 2
description: "Distributed event infrastructure - streaming, worker pools, and replicated maps for Go microservices."
llm_optimized: true
---

Pulse fournit des primitives pour construire des systèmes distribués pilotés par les événements. Il est agnostique en matière de transport et fonctionne indépendamment de Goa, bien qu'il s'intègre bien aux services Goa.

## Vue d'ensemble

Pulse est constitué de trois paquets principaux :

| Pulse se compose de trois paquets principaux : - Paquet - Objectif - Cas d'utilisation
|---------|---------|----------|
| `streaming` | Flux d'événements | Pub/sub, fan-out, fan-in |
| `pool` | Pools de travailleurs | Travaux en arrière-plan, répartition des tâches |
| `rmap` | Cartes répliquées | État partagé entre les nœuds |

Tous les paquets utilisent Redis comme backing store pour la coordination distribuée.

## Pourquoi Pulse ?

- **Redis-native, infrastructure minimale** : Pulse fonctionne entièrement sur les flux et les hachages Redis, donc si vous utilisez déjà Redis, vous obtenez le flux, les pools de travailleurs et l'état répliqué sans introduire Kafka ou de nouveaux courtiers.
- **Des API petites et ciblées** : `streaming.Stream`, `pool.Node`, et `rmap.Map` sont des blocs de construction minuscules et composables au lieu d'un grand cadre, ce qui facilite l'adoption incrémentale de Pulse.
- **L'ergonomie Go-first** : Les API sont idiomatiques (`context.Context`, `[]byte` payloads, typage fort via vos propres structs), avec des contrats clairs et des crochets de journalisation structurés.
- **La composabilité prime sur la complexité** : Utilisez les flux pour les événements, le pool pour les travaux de longue durée, et les cartes répliquées pour les données partagées du plan de contrôle comme les drapeaux de caractéristiques ou les métadonnées des travailleurs.
- **Simplicité opérationnelle** : Les flux délimités, la livraison au moins une fois avec des acks explicites, et le hachage cohérent pour le routage des tâches maintiennent le comportement d'exécution prévisible et facile à raisonner en production.

## Installation

```bash
go get goa.design/pulse/streaming
go get goa.design/pulse/pool
go get goa.design/pulse/rmap
```

---

## Cartes répliquées

Le paquetage `rmap` fournit une carte clé-valeur optimisée en lecture et cohérente à terme, répliquée sur des nœuds distribués, soutenue par des hachages Redis et des canaux pub/sub.

### Architecture

{{< figure src="/images/diagrams/PulseRmap.svg" alt="Pulse replicated map architecture showing distributed state synchronization" class="img-fluid" >}}

À un niveau élevé :

- **Magasin autoritaire** : Le hachage Redis `map:<name>:content` contient les valeurs canoniques de la carte.
- **Canal de mise à jour** : Redis pub/sub `map:<name>:updates` diffuse les mutations des cartes (`set`, `del`, `reset`).
- **Caches locaux** : chaque processus maintient une copie en mémoire qui est synchronisée avec Redis, de sorte que les lectures sont locales et rapides.

### Rejoindre et lire

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/rmap"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // Join a replicated map (loads a snapshot and subscribes to updates)
    m, err := rmap.New(ctx, "config", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer m.Close()

    // Read from the local cache
    value, ok := m.Get("feature.enabled")
    keys := m.Keys()
}
```

Lors de la jointure :

- `rmap.New` (via `Join`) valide le nom de la carte, charge et met en cache les scripts Lua utilisés pour les mises à jour atomiques,
- s'abonne au canal `map:<name>:updates`, puis
- lit le contenu actuel du hachage Redis et alimente le cache local.

Cela rend la carte locale **évidemment cohérente** avec Redis et les autres noeuds qui ont rejoint la même carte.

### Écriture

```go
// Set a value
if _, err := m.Set(ctx, "feature.enabled", "true"); err != nil {
    log.Fatal(err)
}

// Increment a counter
count, err := m.Inc(ctx, "requests.total", 1)

// Append values to a list-like key
_, err = m.AppendValues(ctx, "allowed.regions", "us-east-1", "eu-west-1")

// Compare-and-swap a value
prev, err := m.TestAndSet(ctx, "config.version", "v1", "v2")

// Delete a key
_, err = m.Delete(ctx, "feature.enabled")
```

Toutes les opérations de mutation passent par des scripts Lua qui :

- mettent à jour le hash Redis en une seule commande, et
- publient une notification binaire compacte sur le canal des mises à jour.

Comme Redis exécute les scripts Lua de manière atomique, chaque écriture est appliquée et diffusée comme une opération unique et ordonnée.

### Notifications de changement

```go
// Watch for changes
changes := m.Subscribe()

go func() {
    for kind := range changes {
        switch kind {
        case rmap.EventChange:
            log.Info("config changed", "snapshot", m.Map())
        case rmap.EventDelete:
            log.Info("config key deleted")
        case rmap.EventReset:
            log.Info("config reset")
        }
    }
}()
```

- `Subscribe` renvoie un canal d'événements à gros grain (`EventChange`, `EventDelete`, `EventReset`).
- Les notifications n'incluent **pas** la clé/valeur modifiée ; les appelants doivent utiliser `Get`, `Map`, ou `Keys` pour inspecter l'état actuel.
- Plusieurs mises à jour à distance peuvent être regroupées en une seule notification, ce qui permet de réduire le trafic de notification même lorsque la carte est occupée.

### Cohérence et modes d'échec

- **Mises à jour atomiques** : Chaque écriture (`Set`, `Inc`, `Append*`, `Delete`, `Reset`, `TestAnd*`) est effectuée par un script Lua qui met à jour le hachage et publie une notification en une seule étape.
  - Les lecteurs ne voient jamais un changement de hachage sans une notification correspondante (et vice versa).
- **Cohérence de jointure** : Lors de la jointure, la carte :
  - s'abonne au canal des mises à jour, puis
  - charge le hachage via `HGETALL`.
  Il existe une petite fenêtre où les mises à jour peuvent être vues à la fois via pub/sub et l'instantané, mais elles sont idempotentes et conduisent au même état final.
- **Redis se déconnecte** : Si la connexion pub/sub est interrompue, la goroutine d'arrière-plan `run` enregistre l'erreur et tente à plusieurs reprises de se réabonner.
  - Pendant la déconnexion, le cache local cesse de recevoir les mises à jour distantes mais reste utilisable pour les lectures.
  - Une fois reconnecté, les nouvelles mises à jour de Redis recommencent à circuler ; les appelants considèrent toujours Redis comme la source de vérité lorsqu'ils écrivent.
- **Rupture de processus** : Si un processus utilisant `Map` se termine, le contenu faisant autorité reste dans Redis ; les autres nœuds ne sont pas affectés.
  - Un nouveau processus peut appeler `rmap.New` pour rejoindre et reconstruire son cache local à partir de Redis.
- **Durabilité de Redis** : Comme pour les pools de travailleurs, la durabilité dépend de la façon dont Redis est configuré.
  - Avec AOF/snapshots ou un cluster répliqué, le contenu de la carte survit aux défaillances des processus et des nœuds.
  - Si Redis perd ses données, toutes les cartes sont effectivement réinitialisées ; la prochaine connexion verra une carte vide.

### Cas d'utilisation

- **Les drapeaux des fonctionnalités** : Distribuer les changements de configuration instantanément à travers une flotte.
- **Limitation du débit** : Partager les compteurs entre les instances pour appliquer des limites globales.
- **État de la session / du plan de contrôle** : Conservez les petits états fréquemment lus (comme les nœuds actifs, les métadonnées des travailleurs) en synchronisation entre les services.

### Options de configuration clés

**Cartes (`rmap.New`)**

| Options de configuration des clés
|--------|-------------|
| `rmap.WithLogger(logger)` | Attacher un logger aux internes des cartes répliquées et aux opérations Redis. 

Voir la [documentation du paquet rmap](https://pkg.go.dev/goa.design/pulse/rmap) pour la surface complète de l'API.

---

## Streaming

Le paquet `streaming` fournit un routage d'événements à travers les microservices en utilisant Redis Streams.

### Architecture

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="Pulse streaming architecture showing event producer, streams, and consumer" class="img-fluid" >}}

### Création de flux

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/streaming"
)

func main() {
    // Connect to Redis
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    
    // Create a stream
    stream, err := streaming.NewStream(ctx, "events", rdb,
        streaming.WithStreamMaxLen(10000),
    )
    if err != nil {
        log.Fatal(err)
    }
}
```

### Publication d'événements

```go
type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

// Add strongly-typed event to the stream (payload is JSON-encoded)
payload, err := json.Marshal(UserCreatedEvent{
    UserID: "123",
    Email:  "user@example.com",
})
if err != nil {
    log.Fatal(err)
}

eventID, err := stream.Add(ctx, "user.created", payload)
if err != nil {
    log.Fatal(err)
}
```

### Consommer des événements

```go
// Create a reader
reader, err := stream.NewReader(ctx, "my-consumer-group",
    streaming.WithReaderBlockDuration(time.Second),
)
if err != nil {
    log.Fatal(err)
}

// Read events
for {
    events, err := reader.Read(ctx)
    if err != nil {
        log.Error(err)
        continue
    }
    
    for _, event := range events {
        if err := processEvent(event); err != nil {
            log.Error(err)
            continue
        }
        reader.Ack(ctx, event.ID)
    }
}
```

### Modèle de sortie en éventail

Plusieurs groupes de consommateurs reçoivent tous les événements :

```go
// Service A - analytics
analyticsReader, _ := stream.NewReader(ctx, "analytics-group")

// Service B - notifications  
notifyReader, _ := stream.NewReader(ctx, "notify-group")

// Both receive all events independently
```

### Modèle d'entrée en éventail

Agrégation d'événements provenant de plusieurs flux :

```go
// Create readers for multiple streams
ordersReader, _ := ordersStream.NewReader(ctx, "aggregator")
paymentsReader, _ := paymentsStream.NewReader(ctx, "aggregator")

// Process events from both
go processStream(ordersReader)
go processStream(paymentsReader)
```

### Lecteurs et puits

Pulse propose deux façons de consommer les flux :

- **Lecteurs** : chaque lecteur a son propre curseur et voit **chaque événement** dans le flux. Ils sont idéaux pour les analyses, les projections et tout traitement de type "fan-out".
- **Puits** : toutes les instances de puits portant le même nom partagent un **curseur de groupe de consommateurs**. Chaque événement est délivré à **un** consommateur sink, ce qui vous donne une sémantique de file d'attente de travail au moins une fois.

| Les consommateurs d'événements sont les suivants : - les lecteurs - les puits - les consommateurs d'événements - les consommateurs d'événements
|----------------|-------------------------------------------------|-------------------------------------------------------------|
| Le lecteur est le seul à avoir accès à l'ensemble des événements
| Les événements sont envoyés à un seul consommateur de l'évier
| Accusé de réception | Facultatif (il suffit d'arrêter la lecture) | Explicite `Ack` (sauf si `WithSinkNoAck` est utilisé) |
| Projections, analyses, débogage, rediffusions | Traitement en arrière-plan, travailleurs parallèles, distribution des tâches |

### Options de configuration clés

**Streams (`streaming.NewStream`)**

| Options de configuration
|--------|-------------|
| `streaming.WithStreamMaxLen(n)` | Limite le nombre d'événements conservés par flux avant que les événements les plus anciens ne soient éliminés. |
`streaming.WithStreamLogger(logger)` | Injecte un logger pour les internes de flux, les lecteurs et les puits. |

**Lecteurs (`stream.NewReader`)**

| Option | Description |
|--------|-------------|
| Contrôle la durée pendant laquelle `Read` attend les événements avant de revenir. |
`options.WithReaderStartAtOldest()` | Commence à partir de l'événement le plus ancien au lieu de ne prendre en compte que les nouveaux événements. |
| `options.WithReaderTopic(topic)` / `WithReaderTopicPattern(re)` Filtre les événements par thème ou par expression rationnelle de thème côté client. |

**Puits (`stream.NewSink`)**

| Option | Description |
|--------|-------------|
| `options.WithSinkBlockDuration(d)` | Contrôle la durée pendant laquelle l'évier est bloqué en attente de travail. |
| `options.WithSinkAckGracePeriod(d)` | Fenêtre de temps pour qu'un consommateur accède à l'événement avant qu'il ne soit à nouveau disponible. |
`options.WithSinkNoAck()` Désactiver entièrement les accusés de réception (consommation "fire-and-forget"). |

**Options d'événement (`stream.Add`)**

| Options d'événements (`stream.Add`)
|--------|-------------|
`options.WithTopic(topic)` | Attachez un sujet à l'événement afin que les lecteurs/les puits puissent filtrer sur celui-ci. |
`options.WithOnlyIfStreamExists()` | N'ajouter l'événement que si le flux existe déjà (ne pas créer automatiquement). |

Pour obtenir la liste complète des options de lecteur, de puits et de flux, consultez la documentation du paquet Go pour
[`goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options).

---

## Pools de travailleurs

Le paquet `pool` implémente des pools de travailleurs dédiés avec un hachage cohérent pour la répartition des tâches.

### Architecture

{{< figure src="/images/diagrams/PulsePool.svg" alt="Pulse worker pool architecture showing job dispatch flow" class="img-fluid" >}}

Les travaux sont acheminés vers les travailleurs sur la base d'une clé utilisant un hachage cohérent. Cela permet de s'assurer que :
- Les travaux ayant la même clé sont acheminés vers le même travailleur
- La charge est répartie uniformément entre les travailleurs
- Les défaillances des travailleurs déclenchent un rééquilibrage automatique

### Modes de défaillance et durabilité

Les pools de travailleurs Pulse sont conçus pour une livraison **au moins une fois** : les travaux peuvent être réessayés, mais ils ne sont pas abandonnés silencieusement tant que Redis conserve l'état.

**Crash du processus de travailleur

- Chaque travailleur met périodiquement à jour un horodatage de maintien en vie dans une carte répliquée.
- Les goroutines de nettoyage en arrière-plan sur les nœuds analysent périodiquement cette carte :
  - Les travailleurs qui n'ont pas mis à jour leur horodatage dans un délai de `workerTTL` sont marqués comme inactifs.
  - Tous les travaux appartenant à un travailleur inactif sont remis en file d'attente et réaffectés via le même routage par hachage cohérent que celui utilisé pour la répartition normale.
- Résultat : si un travailleur meurt au milieu d'un travail, ce travail sera éventuellement réexécuté par un autre travailleur actif.

**Crash d'un nœud (processus ou hôte)**

- L'état d'un travail (clés de travail, charges utiles, affectations de travailleurs et informations de répartition en attente) se trouve dans les cartes et les flux répliqués Redis, et non dans la mémoire.
- Si un nœud disparaît :
  - Les autres nœuds détectent son absence via une carte de maintien en vie des nœuds.
  - Les flux spécifiques à ce nœud sont ramassés à la poubelle.
  - Les tâches précédemment assignées aux travailleurs de ce nœud sont remises en file d'attente et redistribuées sur les autres nœuds.
- `Close` et `Shutdown` font la distinction entre :
  - **Close** : remet en file d'attente les tâches de ce nœud afin que les autres nœuds continuent à traiter le pool.
  - **Shutdown** : coordonne un arrêt global sur les nœuds, vidant les travaux sans les remettre en file d'attente.

**Dispatch failures and retries** (échecs de distribution et nouvelles tentatives)

- `DispatchJob` écrit un événement start-job dans un flux de pool et attend :
  - un accusé de réception d'un travailleur (succès ou échec de `Start`), ou
  - la détection qu'un travail avec la même clé est déjà présent.
- Une carte distincte des travaux en attente et un TTL basé sur l'horodatage empêchent les envois en double lorsque plusieurs nœuds font la course pour mettre en file d'attente la même clé de travail.
- Si un travailleur n'accuse pas réception du lancement d'un travail dans le délai de grâce configuré, cette distribution est susceptible d'être relancée par la logique de nettoyage.

**Rééquilibrage en cas d'arrivée ou de départ d'un travailleur

- Le pool maintient une carte répliquée des travailleurs actifs.
- Lorsque des travailleurs sont ajoutés ou supprimés :
  - Les nœuds détectent les modifications apportées à la carte des travailleurs et demandent à chaque travailleur de rééquilibrer ses tâches.
  - Les travaux dont le panier de données cohérentes correspond désormais à un autre travailleur sont arrêtés et remis en attente afin qu'ils puissent être pris en charge par le nouveau travailleur cible.
- Cela permet d'aligner l'affectation des tâches sur l'ensemble des travailleurs actuels tout en respectant le contrat de routage basé sur les clés.

**Redis durability**

- Pulse s'appuie sur Redis pour la durabilité. Si Redis est configuré avec une persistance (AOF/snapshots ou cluster avec réplication), les travaux survivent aux crashs de processus et de nœuds.
- Si Redis perd ses données, Pulse ne peut pas récupérer les travaux ou les métadonnées des travailleurs ; dans ce cas, le pool repart à zéro.

En pratique, cela signifie que
- Avec un Redis durable, un travail que `DispatchJob` a accepté s'exécutera avec succès, échouera avec une erreur apparente ou sera réessayé jusqu'à ce qu'un travailleur puisse le traiter.
- Le principal compromis est la sémantique "at-least-once" : les gestionnaires doivent être idempotents car les tentatives et les rééquilibrages peuvent entraîner l'exécution du même travail plus d'une fois.

### Création d'un pool

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/pool"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // Create a pool node that can run workers
    node, err := pool.AddNode(ctx, "my-pool", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)
}
```

### Répartition des tâches

```go
type EmailJob struct {
    Email string `json:"email"`
}

// Producer node (often created with pool.WithClientOnly)
payload, err := json.Marshal(EmailJob{
    Email: "user@example.com",
})
if err != nil {
    log.Fatal(err)
}

// Dispatch job with key (determines which worker handles it)
if err := node.DispatchJob(ctx, "user:123", payload); err != nil {
    log.Fatal(err)
}
```

### Emplois de traitement

```go
// Worker implementation: decode strongly-typed jobs from []byte payloads.
type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var payload EmailJob
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    return sendEmail(payload.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    // Optional: clean up resources for the given job key.
    return nil
}

// Attach the handler to a worker in the pool.
_, err := node.AddWorker(ctx, &EmailJobHandler{})
if err != nil {
    log.Fatal(err)
}
```

### Puits (groupes de consommateurs)

Les puits de Pulse sont construits au-dessus du paquetage de streaming et sont utilisés en interne par le pool pour équilibrer le travail entre les travailleurs
pour équilibrer le travail entre les travailleurs. Plusieurs nœuds de pool rejoignant le même nom de pool se partagent le travail :

```go
// Two nodes participating in the same pool
node1, _ := pool.AddNode(ctx, "email-pool", rdb)
node2, _ := pool.AddNode(ctx, "email-pool", rdb)

// Jobs dispatched to "email-pool" are distributed across all active workers.
```

### Options de configuration clés

**Nœuds de pool (`pool.AddNode`)**

| Options de configuration
|--------|-------------|
| | Quelle est l'agressivité de la détection des travailleurs morts ; des valeurs faibles signifient un basculement plus rapide, des valeurs élevées signifient moins de battements de cœur. 
| `pool.WithMaxQueuedJobs(n)` | Plafond global des travaux en file d'attente en vol ; le dépassement de ce plafond entraîne l'échec rapide des nouveaux appels `DispatchJob`. |
`pool.WithAckGracePeriod(d)` `pool.WithAckGracePeriod(d)` Combien de temps le pool attend-il qu'un travailleur reconnaisse avoir commencé un travail avant de pouvoir le réaffecter ? |
`pool.WithClientOnly()` | Créer un nœud qui ne fait que distribuer des tâches (pas de routage ou de travailleurs en arrière-plan). |
| `pool.WithLogger(logger)` | Attacher un logger structuré pour toutes les données internes du pool. |

Pour des réglages plus avancés (TTL d'arrêt, durée des blocs d'arrêt, etc.), voir le document
[documentation du paquet pool](https://pkg.go.dev/goa.design/pulse/pool).

---

## Configuration de l'infrastructure

### Exigences de Redis

Pulse nécessite Redis 5.0+ pour la prise en charge des flux. Pour la production :

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### Cluster Redis

Pour la haute disponibilité, utilisez Redis Cluster :

```go
rdb := redis.NewClusterClient(&redis.ClusterOptions{
    Addrs: []string{
        "redis-1:6379",
        "redis-2:6379",
        "redis-3:6379",
    },
})
```

---

## Modèles

### Event Sourcing

```go
// Append events to a stream
stream.Add(ctx, "order.created", orderCreatedEvent)
stream.Add(ctx, "order.paid", orderPaidEvent)
stream.Add(ctx, "order.shipped", orderShippedEvent)

// Replay events to rebuild state
reader, _ := stream.NewReader(ctx, "replay", streaming.WithStartID("0"))
for {
    events, _ := reader.Read(ctx)
    for _, e := range events {
        applyEvent(state, e)
    }
}
```

### Traitement des tâches asynchrones

```go
// Task payload type used on both producer and worker sides.
type ImageTask struct {
    URL string `json:"url"`
}

// Producer: queue tasks into the pool with a strongly-typed payload.
payload, err := json.Marshal(ImageTask{URL: imageURL})
if err != nil {
    log.Fatal(err)
}
if err := node.DispatchJob(ctx, taskID, payload); err != nil {
    log.Fatal(err)
}

// Worker: process tasks in a JobHandler.
type ImageTaskHandler struct{}

func (h *ImageTaskHandler) Start(job *pool.Job) error {
    var task ImageTask
    if err := json.Unmarshal(job.Payload, &task); err != nil {
        return err
    }
    return processImage(task.URL)
}

func (h *ImageTaskHandler) Stop(key string) error {
    return nil
}
```

---

## Exemple complet : Flux d'inscription de l'utilisateur

L'esquisse suivante montre comment vous pouvez combiner des flux, un pool de travailleurs et une carte répliquée pour mettre en œuvre un flux d'inscription d'utilisateur avec confirmation par courrier électronique et drapeaux de fonctionnalité
pour mettre en œuvre un flux d'inscription d'utilisateur avec confirmation par courrier électronique et drapeaux de fonctionnalité :

```go
type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

type EmailJob struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    // 1. Shared feature flags / config across services.
    flags, err := rmap.New(ctx, "feature-flags", rdb, rmap.WithLogger(pulse.ClueLogger(ctx)))
    if err != nil {
        log.Fatal(err)
    }
    defer flags.Close()

    // 2. Stream for user lifecycle events.
    userStream, err := streaming.NewStream("users", rdb,
        streaming.WithStreamMaxLen(10_000),
        streaming.WithStreamLogger(pulse.ClueLogger(ctx)),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer userStream.Destroy(ctx)

    // 3. Worker pool for sending emails.
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)

    // 4. Attach a worker that reads jobs from the pool.
    _, err = node.AddWorker(ctx, &EmailJobHandler{})
    if err != nil {
        log.Fatal(err)
    }

    // 5. On user signup, publish an event and dispatch a job.
    created := UserCreatedEvent{
        UserID: "123",
        Email:  "user@example.com",
    }
    payload, _ := json.Marshal(created)
    if _, err := userStream.Add(ctx, "user.created", payload); err != nil {
        log.Fatal(err)
    }

    jobPayload, _ := json.Marshal(EmailJob{
        UserID: created.UserID,
        Email:  created.Email,
    })
    if err := node.DispatchJob(ctx, "email:"+created.UserID, jobPayload); err != nil {
        log.Fatal(err)
    }
}

type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var j EmailJob
    if err := json.Unmarshal(job.Payload, &j); err != nil {
        return err
    }
    // Optionally read feature flags from rmap here before sending.
    return sendWelcomeEmail(j.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}
```

Ce modèle est naturellement évolutif : vous pouvez ajouter d'autres travailleurs pour les courriels, ajouter d'autres consommateurs du flux
`users` (analyse, audit, etc.) et partager l'état du plan de contrôle via des cartes répliquées.

---

## Considérations relatives à la production

- **Dimensionnement et durabilité de Redis** : Utilisez Redis 5+ avec une persistance configurée de manière appropriée (AOF ou snapshotting) en fonction de la criticité des données de flux et des cartes répliquées pour votre charge de travail.
- **Élimination des flux** : Réglez `WithStreamMaxLen` suffisamment haut pour répondre aux besoins de relecture (recherche d'événements, débogage), mais suffisamment bas pour éviter une croissance illimitée ; rappelez-vous que le découpage est approximatif.
- **Sémantique "au moins une fois "** : Les flux et les puits sont de type "at-least-once" ; les gestionnaires sont conçus pour être idempotents et pour pouvoir être réessayés en toute sécurité.
- **Les TTL des travailleurs et l'arrêt** : Ajustez `WithWorkerTTL` et `WithWorkerShutdownTTL` en fonction de la rapidité avec laquelle vous souhaitez détecter les travailleurs défaillants et de la durée pendant laquelle ils doivent évacuer le travail lors de l'arrêt.
- **Travaux en attente et bloqués** : `WithAckGracePeriod` et le suivi interne des tâches en attente du pool empêchent les tâches d'être bloquées pour toujours, mais vous devez tout de même surveiller les tâches qui ne démarrent pas de manière répétée.
- **Observabilité** : Utilisez `pulse.ClueLogger` ou votre propre enregistreur structuré avec `WithStreamLogger`, `WithLogger` et `rmap.WithLogger` afin de pouvoir suivre les événements et les cycles de vie des travaux en production.
- **Backpressure et limites de file d'attente** : Utilisez `WithMaxQueuedJobs`, `WithReaderMaxPolled` et `WithSinkMaxPolled` pour limiter l'utilisation de la mémoire et rendre la rétropression explicite lorsque le système est surchargé.
- **Haute disponibilité** : Pour les systèmes critiques, exécutez Redis en mode cluster ou sentinelle et utilisez plusieurs nœuds de pool afin que les travailleurs puissent basculer proprement.

---

## Dépannage

- **Impossible de se connecter à Redis** : Vérifiez l'adresse, le mot de passe et les paramètres TLS utilisés par `redis.NewClient` ou `redis.NewClusterClient` ; Pulse propage simplement ces erreurs de connexion.
- **Aucun événement n'est livré** : Vérifiez que les lecteurs et les puits utilisent le nom de flux, la position de départ (`WithReaderStart*` / `WithSinkStart*`) et le modèle de sujet ; vérifiez également que `BlockDuration` n'est pas défini sur `0` par inadvertance.
- **Des événements semblent manquer** : Si `WithStreamMaxLen` est trop petit, il se peut que des événements plus anciens aient été coupés ; augmentez la longueur maximale ou faites persister les événements importants ailleurs.
- **Les travaux ne sont jamais récupérés** : Assurez-vous qu'au moins un nœud non client est en cours d'exécution avec des travailleurs actifs (`AddWorker`) et que `WithMaxQueuedJobs` n'a pas été dépassé.
- **Les tâches continuent d'être réessayées ou déplacées entre les travailleurs** : Cela indique généralement que le travailleur ne démarre pas ou se bloque en cours de traitement ; inspectez les journaux des gestionnaires de tâches et envisagez d'augmenter `WithAckGracePeriod` ou de corriger les gestionnaires non idempotents.
- **Charge de travail inégale** : Le hachage cohérent des sauts équilibre normalement bien les clés ; si la plupart des travaux partagent la même clé, envisagez de diviser l'espace des clés ou d'utiliser une stratégie de hachage différente.
- **Les arrêts se bloquent** : Si `Close` ou l'arrêt d'un pool prend trop de temps, examinez `WithWorkerShutdownTTL` et assurez-vous que les implémentations `Stop` des travailleurs reviennent rapidement, même lorsque le travail est lent ou que les services externes sont en panne.

### Mise en cache distribuée

```go
// Cache with replicated map
cache, _ := rmap.New(ctx, "cache", rdb)

func GetUser(ctx context.Context, id string) (*User, error) {
    // Check cache
    if data, err := cache.Get(ctx, "user:"+id); err == nil {
        return unmarshalUser(data)
    }
    
    // Fetch from database
    user, err := db.GetUser(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Update cache (propagates to all nodes)
    cache.Set(ctx, "user:"+id, marshalUser(user))
    return user, nil
}
```

---

## Voir aussi

- [Pulse GitHub Repository](https://github.com/goadesign/pulse) - Code source et exemples
- [Documentation Redis Streams](https://redis.io/docs/data-types/streams/) - Concepts Redis Streams
