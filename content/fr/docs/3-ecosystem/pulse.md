---
title: "Pulse"
weight: 2
description: "Flux d’événements adossés à Redis, pools de workers à hachage cohérent et cartes répliquées en mémoire pour les services Go."
llm_optimized: true
---

Pulse réunit trois packages Go dédiés à la coordination distribuée au-dessus de Redis (`*redis.Client`), sans introduire de courtier de messages séparé. Il fonctionne de manière autonome dans n’importe quel binaire Go ou aux côtés de services Goa et Goa-AI.

{{< anchors "pourquoi-pulse-" "cas-dutilisation" >}}
## Vue d’ensemble

| Package | Type principal | Cas d’usage |
|---------|----------------|-------------|
| `goa.design/pulse/streaming` | `streaming.Stream`, `Reader`, `Sink` | Flux d’événements, diffusion multiple indépendante (*fan-out*), files de groupes de consommateurs |
| `goa.design/pulse/pool` | `pool.Node`, `pool.Worker` | Tâches de fond routées par clé avec bascule automatique sur panne d’un worker |
| `goa.design/pulse/rmap` | `rmap.Map` | État clé-valeur répliqué et mis en cache localement entre les réplicas d’un service |

## Installation

```bash
go get goa.design/pulse@latest
```

---

{{< anchors "cartes-répliquées" "mise-en-cache-distribuée" >}}
## Cartes répliquées (`rmap`)

`rmap` maintient une carte clé-valeur à lecture locale et cohérence finale entre les nœuds à l’aide d’un hash Redis (`map:<name>:content`), de scripts d’écriture Lua atomiques et d’un canal pub/sub Redis de mise à jour (`map:<name>:updates`).

### Architecture

{{< figure src="/images/diagrams/PulseRmap.svg" alt="Architecture de carte répliquée Pulse montrant la synchronisation d’état distribué" class="img-fluid" >}}

- **Stockage de référence** : Le hash Redis `map:<name>:content` conserve les entrées clé-valeur canoniques.
- **Écritures atomiques** : Chaque mutation (`Set`, `Inc`, `AppendValues`, `TestAndSet`, `Delete`, `Reset`) s’exécute dans un unique script Lua Redis qui met à jour le hash et publie une notification binaire compacte sur `map:<name>:updates`.
- **Lectures sans appel réseau** : Chaque processus ayant rejoint la carte conserve une copie en mémoire alimentée par pub/sub ; `Get`, `Keys` et `Map` lisent ainsi la mémoire locale sans aller-retour vers Redis.

{{< anchors "rejoindre-et-lire" "écriture" >}}
### Rejoindre, lire et écrire

```go
package main

import (
    "context"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    // Join loads a snapshot from Redis and subscribes to live updates
    m, err := rmap.Join(ctx, "config", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer m.Close()

    // Mutate state atomically in Redis (propagates to all joined nodes)
    if _, err := m.Set(ctx, "feature.enabled", "true"); err != nil {
        log.Fatal(err)
    }
    _, _ = m.Inc(ctx, "requests.total", 1)
    _, _ = m.AppendValues(ctx, "allowed.regions", "us-east-1", "eu-west-1")
    _, _ = m.TestAndSet(ctx, "config.version", "v1", "v2")

    // Read directly from the local in-memory cache
    if value, ok := m.Get("feature.enabled"); ok {
        log.Printf("feature.enabled = %s (keys: %v)", value, m.Keys())
    }
}
```

{{< anchors "notifications-de-changement" >}}
### Observer les notifications de changement

```go
changes := m.Subscribe()
defer m.Unsubscribe(changes)

go func() {
    for kind := range changes {
        switch kind {
        case rmap.EventChange:
            log.Printf("config updated: %v", m.Map())
        case rmap.EventDelete:
            log.Println("config key deleted")
        case rmap.EventReset:
            log.Println("config reset")
        }
    }
}()
```

`Subscribe` émet des notifications `EventKind` globales (`EventChange`, `EventDelete`, `EventReset`) et regroupe les rafales rapprochées afin que les cartes à forte fréquence d’écriture ne saturent jamais les lecteurs ; inspectez `m.Get`, `m.Map()` ou `m.Keys()` à chaque réveil.

{{< anchors "cohérence-et-modes-déchec" "options-de-configuration-clés" >}}
### Cohérence et modes de défaillance

- **Ordre de souscription** : `rmap.Join` s’abonne à `map:<name>:updates` *avant* d’exécuter `HGETALL`, garantissant qu’aucune mutation survenant entre l’instantané et l’abonnement ne soit perdue.
- **Déconnexions et pannes** : Si la connexion pub/sub Redis s’interrompt, la boucle d’arrière-plan retente automatiquement le réabonnement tandis que les lectures locales continuent de servir le dernier instantané en cache. En cas d’arrêt brutal d’un processus, Redis conserve l’état canonique et les processus redémarrés appellent `rmap.Join` pour reconstituer leur cache.
- **Options** : Passez `rmap.WithLogger(pulse.ClueLogger(ctx))` (depuis `goa.design/pulse/pulse`) pour attacher une journalisation structurée. Voir [`pkg.go.dev/goa.design/pulse/rmap`](https://pkg.go.dev/goa.design/pulse/rmap).

---

{{< anchors "streaming" "event-sourcing" >}}
## Flux d’événements (`streaming`)

`streaming` achemine des événements typés entre microservices via Redis Streams, avec prise en charge à la fois de curseurs indépendants en diffusion multiple (`Reader`) et de files de travail partagées en groupes de consommateurs (`Sink`).

### Architecture

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="Architecture de streaming Pulse montrant producteur d’événements, flux et consommateur" class="img-fluid" >}}

### Rétention par défaut des flux (`1 000` événements)

Par défaut, `streaming.NewStream` conserve les **`1 000` événements les plus récents** grâce à une troncature exacte `MAXLEN =` sur Redis Streams :
- Passez `options.WithStreamMaxLen(n)` (depuis `goa.design/pulse/streaming/options`) pour augmenter ou réduire le plafond d’événements conservés.
- Passez `options.WithUnboundedStream()` lorsque les éléments en attente ne doivent jamais être purgés automatiquement, puis appelez `stream.Remove(ctx, event.ID)` une fois chaque élément traité.

{{< anchors "création-de-flux" "publication-dévénements" >}}
### Créer des flux et publier des événements

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/pulse/streaming"
    "goa.design/pulse/streaming/options"
)

type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func publishSignup(ctx context.Context, rdb *redis.Client) error {
    stream, err := streaming.NewStream("users", rdb,
        options.WithStreamMaxLen(10_000),
    )
    if err != nil {
        return err
    }

    payload, err := json.Marshal(UserCreatedEvent{
        UserID: "123",
        Email:  "user@example.com",
    })
    if err != nil {
        return err
    }

    eventID, err := stream.Add(ctx, "user.created", payload)
    if err != nil {
        return err
    }
    log.Printf("published user.created as %s", eventID)
    return nil
}
```

{{< anchors "consommer-des-événements" "modèle-de-sortie-en-éventail" "modèle-dentrée-en-éventail" "lecteurs-et-puits" "puits-groupes-de-consommateurs" "modèles" >}}
### Consommer des événements : `Sink` vs `Reader`

`Sink` et `Reader` livrent tous deux leurs événements sur un canal Go renvoyé par `Subscribe() <-chan *streaming.Event` :

| | `Reader` (`stream.NewReader`) | `Sink` (`stream.NewSink`) |
|---|---|---|
| **Curseur** | Indépendant par instance de `Reader` (aucun nom de groupe) | Partagé entre toutes les instances de `Sink` portant le même `name` |
| **Livraison** | Chaque `Reader` reçoit **tous** les événements | Chaque événement est livré à **un seul** consommateur `Sink` |
| **Acquittement** | Aucun (`reader.Close()` arrête la lecture) | `sink.Ack(ctx, event)` explicite (sauf avec `WithSinkNoAck()`) |
| **Idéal pour** | Projections en direct, invalidation de cache, audit et relecture | Files de tâches au-moins-une-fois, workers parallèles |

**`Sink` partagé en groupe de consommateurs (file de travail au-moins-une-fois) :**

```go
sink, err := stream.NewSink(ctx, "billing-workers",
    options.WithSinkBlockDuration(time.Second),
)
if err != nil {
    log.Fatal(err)
}
defer sink.Close(ctx)

for event := range sink.Subscribe() {
    if err := processBilling(event); err != nil {
        log.Printf("billing failed for %s (will retry after ack grace period): %v", event.ID, err)
        continue
    }
    if err := sink.Ack(ctx, event); err != nil {
        log.Printf("ack failed: %v", err)
    }
}
```

**`Reader` indépendant (diffusion multiple, relecture depuis le plus ancien et agrégation multi-flux) :**

```go
// Replay from the oldest retained event in ordersStream, and fan in paymentsStream
reader, err := ordersStream.NewReader(ctx, options.WithReaderStartAtOldest())
if err != nil {
    log.Fatal(err)
}
defer reader.Close()

if err := reader.AddStream(ctx, paymentsStream); err != nil {
    log.Fatal(err)
}

for event := range reader.Subscribe() {
    applyProjection(event.StreamName, event.EventName, event.Payload)
}
```

{{< anchors "options-de-configuration-clés-1" >}}
### Options principales de streaming (`goa.design/pulse/streaming/options`)

| Option | Cible | Description |
|--------|-------|-------------|
| `options.WithStreamMaxLen(n)` | `NewStream` | Plafond exact `MAXLEN =` d’événements par flux (par défaut : `1 000`). |
| `options.WithUnboundedStream()` | `NewStream` | Désactive la troncature `MAXLEN` ; à associer à `stream.Remove(ctx, ids...)`. |
| `options.WithStreamLogger(logger)` | `NewStream` | Attache un logger structuré (`pulse.ClueLogger(ctx)`). |
| `options.WithReaderStartAtOldest()` | `NewReader` | Relit depuis l’entrée la plus ancienne conservée au lieu de la plus récente. |
| `options.WithReaderTopic(t)` / `WithReaderTopicPattern(re)` | `NewReader` | Filtre les événements livrés par sujet exact ou expression régulière. |
| `options.WithSinkAckGracePeriod(d)` | `NewSink` | Délai de bail avant qu’un événement non acquitté soit repris par un autre consommateur. |
| `options.WithSinkMaxPolled(n)` / `WithReaderMaxPolled(n)` | `NewSink` / `NewReader` | Nombre maximal d’événements récupérés par lot de lecture Redis. |
| `options.WithTopic(topic)` / `WithOnlyIfStreamExists()` | `stream.Add` | Étiquette l’événement publié avec un sujet, ou évite de créer automatiquement un flux absent. |

Voir [`pkg.go.dev/goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options) pour l’ensemble complet des options.

---

{{< anchors "pools-de-travailleurs" "traitement-des-tâches-asynchrones" >}}
## Pools de workers (`pool`)

`pool` répartit des tâches identifiées par clé sur une flotte de processus workers à l’aide du hachage cohérent par saut (*jump consistent hashing*) : les tâches partageant la même clé arrivent sur le même worker et sont rééquilibrées automatiquement lorsque des workers rejoignent le pool, le quittent ou cessent d’émettre leur battement de cœur.

### Architecture

{{< figure src="/images/diagrams/PulsePool.svg" alt="Architecture du pool de workers Pulse montrant le flux de répartition des tâches" class="img-fluid" >}}

{{< anchors "création-dun-pool" "répartition-des-tâches" "emplois-de-traitement" "options-de-configuration-clés-2" >}}
### Créer un nœud de pool, ajouter des workers et distribuer des tâches

```go
type EmailJob struct {
    Email string `json:"email"`
}

type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var payload EmailJob
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    return sendEmail(payload.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}

func runPool(ctx context.Context, rdb *redis.Client) error {
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
        pool.WithMaxQueuedJobs(1_000),
    )
    if err != nil {
        return err
    }
    defer node.Close(ctx)

    if _, err := node.AddWorker(ctx, &EmailJobHandler{}); err != nil {
        return err
    }

    payload, err := json.Marshal(EmailJob{Email: "user@example.com"})
    if err != nil {
        return err
    }
    // Producers that only enqueue jobs can pass pool.WithClientOnly() to AddNode
    return node.DispatchJob(ctx, "user:123", payload)
}
```

{{< anchors "modes-de-défaillance-et-durabilité" >}}
### Sémantique de livraison et bascule

- **Exécution au-moins-une-fois** : Les workers publient leur battement de cœur dans une `rmap` ; si un worker dépasse `WithWorkerTTL`, les nœuds pairs remettent ses tâches actives en file d’attente vers les propriétaires suivants désignés par le hachage cohérent. Gardez vos gestionnaires `Start` idempotents.
- **`Close` vs `Shutdown`** : `node.Close(ctx)` réaffecte les tâches de ce nœud aux nœuds restants lors d’un déploiement progressif ; `node.Shutdown(ctx)` coordonne un arrêt complet de la flotte sans réaffectation.
- **Contre-pression** : `pool.WithMaxQueuedJobs(n)` plafonne le nombre d’envois en attente afin qu’un pool saturé échoue immédiatement au lieu de croître indéfiniment dans Redis.

---

{{< anchors "exemple-complet--flux-dinscription-de-lutilisateur" >}}
## Exemple complet : flux d’inscription utilisateur

Combinaison de `rmap`, `streaming` et `pool` au sein d’un même service :

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
    cluelog "goa.design/clue/log"
    "goa.design/pulse/pool"
    "goa.design/pulse/pulse"
    "goa.design/pulse/rmap"
    "goa.design/pulse/streaming"
    "goa.design/pulse/streaming/options"
)

type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

type EmailJob struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func main() {
    ctx := cluelog.Context(context.Background())
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    logger := pulse.ClueLogger(ctx)

    // 1. Replicated feature flags across service instances
    flags, err := rmap.Join(ctx, "feature-flags", rdb, rmap.WithLogger(logger))
    if err != nil {
        log.Fatal(err)
    }
    defer flags.Close()

    // 2. Bounded stream for user lifecycle events
    userStream, err := streaming.NewStream("users", rdb,
        options.WithStreamMaxLen(10_000),
        options.WithStreamLogger(logger),
    )
    if err != nil {
        log.Fatal(err)
    }

    // 3. Consistent-hash worker pool for welcome emails
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
        pool.WithMaxQueuedJobs(1_000),
        pool.WithLogger(logger),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)

    if _, err := node.AddWorker(ctx, &EmailJobHandler{flags: flags}); err != nil {
        log.Fatal(err)
    }

    // 4. Publish lifecycle event and dispatch keyed background job
    created := UserCreatedEvent{UserID: "123", Email: "user@example.com"}
    eventBytes, _ := json.Marshal(created)
    if _, err := userStream.Add(ctx, "user.created", eventBytes); err != nil {
        log.Fatal(err)
    }

    jobBytes, _ := json.Marshal(EmailJob(created))
    if err := node.DispatchJob(ctx, "email:"+created.UserID, jobBytes); err != nil {
        log.Fatal(err)
    }
}

type EmailJobHandler struct {
    flags *rmap.Map
}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var j EmailJob
    if err := json.Unmarshal(job.Payload, &j); err != nil {
        return err
    }
    if enabled, ok := h.flags.Get("welcome_email"); ok && enabled == "false" {
        return nil
    }
    log.Printf("sending welcome email to %s", j.Email)
    return nil
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}
```

---

{{< anchors "configuration-de-linfrastructure" "exigences-de-redis" "cluster-redis" "considérations-relatives-à-la-production" "dépannage" >}}
## Configuration Redis et points de contrôle en production

- **Type de client et persistance** : Les constructeurs Pulse (`rmap.Join`, `streaming.NewStream`, `pool.AddNode`) acceptent un `*redis.Client` connecté à Redis 6.2+ ou Valkey (instance autonome, primaire-réplica avec Redis Sentinel via `redis.NewFailoverClient`, ou service Redis managé avec persistance AOF activée). `*redis.ClusterClient` n’est pas pris en charge car les scripts Lua accèdent directement aux clés de cartes et de flux.
- **Troncature exacte des flux** : `NewStream` tronque par défaut à `1 000` événements avec `MAXLEN =` exact. Dimensionnez `options.WithStreamMaxLen(n)` selon votre fenêtre de relecture, ou combinez `options.WithUnboundedStream()` et `stream.Remove(ctx, id)` explicite lorsque chaque élément en file doit impérativement être traité avant suppression.
- **Gestionnaires idempotents** : Les consommateurs `Sink` comme les workers `pool` garantissent une livraison au-moins-une-fois lors des pannes et rééquilibrages ; protégez les effets de bord externes avec des clés d’idempotence.

## Voir aussi

- [Dépôt GitHub Pulse](https://github.com/goadesign/pulse) — Code source et tests
- [Architecture Chorus](../chorus/#architecture) — Exemple de production combinant `pulse/rmap`, `pulse/streaming` et `pulse/semaphore`
