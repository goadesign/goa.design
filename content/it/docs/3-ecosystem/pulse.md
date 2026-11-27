---
title: "Pulse"
weight: 2
description: "Stream di eventi su Redis, worker pool con consistent hashing e mappe replicate in memoria per servizi Go."
llm_optimized: true
---

Pulse fornisce tre pacchetti Go focalizzati per il coordinamento distribuito sopra Redis (`*redis.Client`), senza introdurre un message broker separato. Funziona in modo autonomo in qualsiasi binario Go oppure accanto ai servizi Goa e Goa-AI.

## Panoramica

| Pacchetto | Tipo principale | Caso d'uso |
|---------|--------------|----------|
| `goa.design/pulse/streaming` | `streaming.Stream`, `Reader`, `Sink` | Stream di eventi, fan-out indipendente, code condivise con consumer group |
| `goa.design/pulse/pool` | `pool.Node`, `pool.Worker` | Job in background partizionati per chiave con failover automatico dei worker inattivi |
| `goa.design/pulse/rmap` | `rmap.Map` | Stato chiave-valore replicato e mantenuto in cache locale tra le repliche del servizio |

## Installazione

```bash
go get goa.design/pulse@latest
```

---

## Mappe replicate (`rmap`)

`rmap` mantiene una mappa chiave-valore a lettura locale ed consistenza eventuale tra i nodi usando un hash Redis (`map:<name>:content`), script Lua atomici per le scritture e un canale pub/sub Redis per gli aggiornamenti (`map:<name>:updates`).

### Architettura

{{< figure src="/images/diagrams/PulseRmap.svg" alt="Architettura delle mappe replicate di Pulse con sincronizzazione dello stato distribuito" class="img-fluid" >}}

- **Store autorevole**: L'hash Redis `map:<name>:content` conserva le coppie chiave-valore canoniche.
- **Scritture atomiche**: Ogni mutazione (`Set`, `Inc`, `AppendValues`, `TestAndSet`, `Delete`, `Reset`) viene eseguita in un singolo script Lua su Redis che aggiorna l'hash e pubblica una notifica binaria compatta su `map:<name>:updates`.
- **Letture a zero chiamate di rete**: Ogni processo connesso mantiene una copia in memoria aggiornata via pub/sub, così `Get`, `Keys` e `Map` leggono dalla memoria locale senza round-trip verso Redis.

### Unirsi, leggere e scrivere

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

### Ascoltare le notifiche di modifica

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

`Subscribe` emette notifiche `EventKind` a grana grossa (`EventChange`, `EventDelete`, `EventReset`) e raggruppa le raffiche ravvicinate affinché le mappe ad alta frequenza di scrittura non saturino i lettori; al risveglio ispeziona `m.Get`, `m.Map()` o `m.Keys()`.

### Consistenza e modalità di guasto

- **Ordine di join**: `rmap.Join` si iscrive a `map:<name>:updates` *prima* di eseguire `HGETALL`, così nessuna mutazione avvenuta tra snapshot e sottoscrizione può andare persa.
- **Disconnessioni e crash**: Se la connessione pub/sub verso Redis cade, il ciclo in background riprova automaticamente la sottoscrizione mentre le letture locali continuano a servire l'ultimo snapshot in cache. Se un processo va in crash, Redis mantiene lo stato canonico e i processi riavviati chiamano `rmap.Join` per riallinearsi.
- **Opzioni**: Passa `rmap.WithLogger(pulse.ClueLogger(ctx))` (da `goa.design/pulse/pulse`) per collegare il logging strutturato. Consulta [`pkg.go.dev/goa.design/pulse/rmap`](https://pkg.go.dev/goa.design/pulse/rmap).

---

## Streaming (`streaming`)

`streaming` instrada eventi tipizzati tra microservizi su Redis Streams, supportando sia cursori indipendenti in fan-out (`Reader`) sia code di lavoro condivise basate su consumer group (`Sink`).

### Architettura

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="Architettura dello streaming di Pulse con produttore di eventi, stream e consumatori" class="img-fluid" >}}

### Limite predefinito di conservazione degli stream (`1.000` eventi)

Per impostazione predefinita, `streaming.NewStream` conserva gli **ultimi `1.000` eventi** applicando un taglio esatto `MAXLEN =` su Redis Streams:
- Passa `options.WithStreamMaxLen(n)` (da `goa.design/pulse/streaming/options`) per alzare o abbassare il limite di eventi conservati.
- Passa `options.WithUnboundedStream()` quando gli elementi di lavoro non ancora consumati non devono mai essere tagliati automaticamente, e chiama `stream.Remove(ctx, event.ID)` una volta completato ciascun elemento.

### Creare stream e pubblicare eventi

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

### Consumare eventi: `Sink` vs `Reader`

Sia `Sink` sia `Reader` consegnano gli eventi su un canale Go restituito da `Subscribe() <-chan *streaming.Event`:

| | `Reader` (`stream.NewReader`) | `Sink` (`stream.NewSink`) |
|---|---|---|
| **Cursore** | Indipendente per istanza di `Reader` (nessun nome gruppo) | Condiviso tra tutte le istanze di `Sink` con lo stesso `name` |
| **Consegna** | Ogni `Reader` vede **ogni** evento | Ogni evento viene consegnato a **un solo** consumer del `Sink` |
| **Ack** | Nessuno (`reader.Close()` interrompe la lettura) | Esplicito con `sink.Ack(ctx, event)` (salvo `WithSinkNoAck()`) |
| **Ideale per** | Proiezioni live, invalidazione cache, audit/replay | Code di lavoro in background at-least-once, worker paralleli |

**`Sink` condiviso con consumer group (coda di lavoro at-least-once):**

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

**`Reader` indipendente (fan-out, replay dal più vecchio e fan-in multi-stream):**

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

### Opzioni principali di streaming (`goa.design/pulse/streaming/options`)

| Opzione | Destinazione | Descrizione |
|--------|--------|-------------|
| `options.WithStreamMaxLen(n)` | `NewStream` | Limite esatto `MAXLEN =` di eventi per stream (predefinito: `1.000`). |
| `options.WithUnboundedStream()` | `NewStream` | Disattiva il taglio `MAXLEN`; da abbinare a `stream.Remove(ctx, ids...)`. |
| `options.WithStreamLogger(logger)` | `NewStream` | Collega un logger strutturato (`pulse.ClueLogger(ctx)`). |
| `options.WithReaderStartAtOldest()` | `NewReader` | Riproduce a partire dalla voce più vecchia conservata invece che dalle nuove. |
| `options.WithReaderTopic(t)` / `WithReaderTopicPattern(re)` | `NewReader` | Filtra gli eventi consegnati per topic esatto o espressione regolare. |
| `options.WithSinkAckGracePeriod(d)` | `NewSink` | Finestra di lease prima che un evento senza ack venga riassegnato a un altro consumer. |
| `options.WithSinkMaxPolled(n)` / `WithReaderMaxPolled(n)` | `NewSink` / `NewReader` | Numero massimo di eventi prelevati per singolo batch di polling su Redis. |
| `options.WithTopic(topic)` / `WithOnlyIfStreamExists()` | `stream.Add` | Etichetta l'evento pubblicato con un topic, o evita la creazione automatica di stream mancanti. |

Consulta [`pkg.go.dev/goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options) per l'elenco completo delle opzioni.

---

## Worker Pool (`pool`)

`pool` distribuisce job con chiave su una flotta di processi worker usando jump consistent hashing: i job con la stessa chiave raggiungono sempre lo stesso worker e vengono ribilanciati automaticamente quando i worker entrano, escono o smettono di inviare heartbeat.

### Architettura

{{< figure src="/images/diagrams/PulsePool.svg" alt="Architettura dei worker pool di Pulse con flusso di distribuzione dei job" class="img-fluid" >}}

### Creare un nodo del pool, aggiungere worker e inviare job

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

### Semantica di consegna e failover

- **Esecuzione at-least-once**: I worker inviano heartbeat in una `rmap`; se un worker supera `WithWorkerTTL`, i nodi pari rimettono in coda i suoi job attivi verso i nuovi responsabili consistent-hash sopravvissuti. Mantieni idempotenti gli handler `Start`.
- **`Close` vs `Shutdown`**: `node.Close(ctx)` rimette in coda i job di questo nodo sui nodi rimanenti durante un rolling deploy; `node.Shutdown(ctx)` coordina l'arresto dell'intero pool senza rimettere i job in coda.
- **Backpressure**: `pool.WithMaxQueuedJobs(n)` limita i job accodati affinché i pool sovraccarichi falliscano rapidamente invece di crescere senza limiti in Redis.

---

## Esempio completo: flusso di registrazione utente

Combinazione di `rmap`, `streaming` e `pool` in un unico servizio:

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

## Configurazione di Redis e checklist per la produzione

- **Tipo di client e persistenza**: I costruttori di Pulse (`rmap.Join`, `streaming.NewStream`, `pool.AddNode`) accettano `*redis.Client` verso Redis 5.0+ o Valkey (standalone, primario-replica con Redis Sentinel tramite `redis.NewFailoverClient`, o endpoint Redis gestiti con persistenza AOF abilitata). `*redis.ClusterClient` non è supportato perché gli script Lua operano direttamente sulle chiavi di mappe e stream.
- **Taglio esatto degli stream**: `NewStream` taglia per impostazione predefinita a `1.000` eventi con `MAXLEN =` esatto. Dimensiona `options.WithStreamMaxLen(n)` in base alla tua finestra di replay, oppure usa `options.WithUnboundedStream()` insieme a `stream.Remove(ctx, id)` esplicito quando ogni elemento accodato deve essere elaborato prima della rimozione.
- **Handler idempotenti**: Sia i consumer `Sink` sia i worker `pool` consegnano at-least-once in caso di crash e ribilanciamenti; proteggi gli effetti collaterali esterni con chiavi di idempotenza.

## Vedi anche

- [Repository GitHub di Pulse](https://github.com/goadesign/pulse) — Codice sorgente e test
- [Architettura di Chorus](../chorus/#architettura) — Esempio di produzione che combina `pulse/rmap`, `pulse/streaming` e `pulse/semaphore`
