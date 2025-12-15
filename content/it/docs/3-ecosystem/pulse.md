---
title: "Impulso"
weight: 2
description: "Distributed event infrastructure - streaming, worker pools, and replicated maps for Go microservices."
llm_optimized: true
---

Pulse fornisce primitive per la costruzione di sistemi distribuiti guidati dagli eventi. È indipendente da Goa, anche se si integra bene con i servizi di Goa.

## Panoramica

Pulse è composto da tre pacchetti principali:

| Pacchetto | Scopo | Caso d'uso |
|---------|---------|----------|
| `streaming` | Flussi di eventi | Pub/sub, fan-out, fan-in |
| `pool` | Worker pool | Lavori in background, task dispatch |
| `rmap` | Mappe replicate | Stato condiviso tra i nodi |

Tutti i pacchetti utilizzano Redis come backing store per la coordinazione distribuita.

## Perché Pulse?

- **Redis-nativo, infrastruttura minima**: Pulse viene eseguito interamente su Redis Streams e hash, quindi se si utilizza già Redis si ottengono streaming, worker pool e stato replicato senza introdurre Kafka o nuovi broker.
- **API piccole e mirate**: `streaming.Stream`, `pool.Node` e `rmap.Map` sono piccoli blocchi componibili invece di un grande framework, che facilita l'adozione incrementale di Pulse.
- **Ergonomia Go-first**: Le API sono idiomatiche di Go (`context.Context`, `[]byte` payload, tipizzazione forte tramite le proprie struct), con contratti chiari e ganci di registrazione strutturati.
- **Componibilità rispetto alla complessità**: Usare gli stream per gli eventi, il pool per i lavori di lunga durata e le mappe replicate per i dati condivisi del piano di controllo, come i flag delle caratteristiche o i metadati dei lavoratori.
- **Semplicità operativa**: Flussi limitati, consegna at-least-once con ack espliciti e hashing coerente per l'instradamento dei lavori mantengono il comportamento del runtime prevedibile e facile da analizzare in produzione.

## Installazione

```bash
go get goa.design/pulse/streaming
go get goa.design/pulse/pool
go get goa.design/pulse/rmap
```

---

## Mappe replicate

Il pacchetto `rmap` fornisce una mappa di valori-chiave ottimizzata per la lettura, replicata su nodi distribuiti e supportata da hash Redis e canali pub/sub.

### Architettura

{{< figure src="/images/diagrams/PulseRmap.svg" alt="Pulse replicated map architecture showing distributed state synchronization" class="img-fluid" >}}

Ad alto livello:

- **Magazzino autorevole**: L'hash di Redis `map:<name>:content` contiene i valori canonici della mappa.
- **Canale di aggiornamento**: Redis pub/sub `map:<name>:updates` trasmette le mutazioni delle mappe (`set`, `del`, `reset`).
- **Cache locale**: ogni processo mantiene una copia in memoria che viene mantenuta sincronizzata da Redis, in modo che le letture siano locali e veloci.

### Unire e leggere

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

Al momento dell'unione:

- `rmap.New` (tramite `Join`) convalida il nome della mappa, carica e mette in cache gli script Lua usati per gli aggiornamenti atomici,
- si iscrive al canale `map:<name>:updates`, quindi
- legge il contenuto corrente dell'hash di Redis e semina la cache locale.

Questo rende la mappa locale **eventualmente coerente** con Redis e con gli altri nodi che si sono uniti alla stessa mappa.

### Scrittura

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

Tutte le operazioni di mutazione passano attraverso script Lua che:

- aggiornano l'hash di Redis con un singolo comando e
- pubblicano una notifica binaria compatta sul canale degli aggiornamenti.

Poiché Redis esegue gli script Lua in modo atomico, ogni scrittura viene applicata e trasmessa come una singola operazione ordinata.

### Notifiche di modifica

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

- `Subscribe` restituisce un canale di eventi a grana grossa (`EventChange`, `EventDelete`, `EventReset`).
- Le notifiche **non** includono la chiave/il valore modificati; i chiamanti devono usare `Get`, `Map` o `Keys` per controllare lo stato attuale.
- Più aggiornamenti remoti possono essere raggruppati in un'unica notifica, in modo da mantenere il traffico di notifiche ridotto anche quando la mappa è occupata.

### Consistenza e modalità di fallimento

- **Aggiornamenti atomici**: Ogni scrittura (`Set`, `Inc`, `Append*`, `Delete`, `Reset`, `TestAnd*`) viene eseguita da uno script Lua che aggiorna l'hash e pubblica una notifica in un unico passaggio.
  - I lettori non vedono mai una modifica dell'hash senza una notifica corrispondente (e viceversa).
- **Consistenza del join**: Al momento del join, la mappa:
  - si iscrive al canale degli aggiornamenti, quindi
  - carica l'hash tramite `HGETALL`.
  Esiste una piccola finestra in cui gli aggiornamenti possono essere visti sia tramite pub/sub che tramite lo snapshot, ma sono idempotenti e portano allo stesso stato finale.
- **Redis si disconnette**: Se la connessione pub/sub cade, la goroutine in background `run` registra l'errore e tenta ripetutamente di riscriversi.
  - Durante la disconnessione, la cache locale smette di ricevere gli aggiornamenti remoti, ma rimane utilizzabile per la lettura.
  - Una volta ricollegata, i nuovi aggiornamenti da Redis riprendono a circolare; i chiamanti trattano sempre Redis come fonte di verità quando scrivono.
- **Arresto anomalo del processo**: Se un processo che utilizza `Map` esce, il contenuto autorevole rimane in Redis; gli altri nodi non sono interessati.
  - Un nuovo processo può chiamare `rmap.New` per rientrare e ricostruire la sua cache locale da Redis.
- **Durata di Redis**: Come per i pool di lavoratori, la durata dipende dalla configurazione di Redis.
  - Con AOF/snapshots o cluster replicato, il contenuto della mappa sopravvive ai guasti dei processi e dei nodi.
  - Se Redis perde i suoi dati, tutte le mappe vengono effettivamente azzerate; il prossimo join vedrà una mappa vuota.

### Casi d'uso

- **Feature flags**: Distribuire istantaneamente le modifiche alla configurazione in un parco macchine.
- **Limitazione della velocità**: Condividere i contatori tra le istanze per applicare i limiti globali.
- **Stato della sessione/piano di controllo**: Mantenere lo stato di piccole dimensioni e di frequente lettura (come i nodi attivi e i metadati dei lavoratori) in sincronia tra i servizi.

### Opzioni chiave di configurazione

**Mappe (`rmap.New`)**

| Opzione | Descrizione |
|--------|-------------|
| `rmap.WithLogger(logger)` | Collegare un logger agli interni delle mappe replicate e alle operazioni di Redis. |

Vedere i [docs del pacchetto rmap] (https://pkg.go.dev/goa.design/pulse/rmap) per la superficie API completa.

---

## Streaming

Il pacchetto `streaming` fornisce il routing degli eventi tra i microservizi, utilizzando Redis Streams.

### Architettura

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="Pulse streaming architecture showing event producer, streams, and consumer" class="img-fluid" >}}

## Creazione di flussi

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

### Pubblicazione di eventi

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

## Consumare gli eventi

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

## Schema Fan-Out

Più gruppi di consumatori ricevono tutti gli eventi:

```go
// Service A - analytics
analyticsReader, _ := stream.NewReader(ctx, "analytics-group")

// Service B - notifications  
notifyReader, _ := stream.NewReader(ctx, "notify-group")

// Both receive all events independently
```

### Schema Fan-In

Aggrega gli eventi da più flussi:

```go
// Create readers for multiple streams
ordersReader, _ := ordersStream.NewReader(ctx, "aggregator")
paymentsReader, _ := paymentsStream.NewReader(ctx, "aggregator")

// Process events from both
go processStream(ordersReader)
go processStream(paymentsReader)
```

### Lettori e lavandini

Pulse offre due modi per consumare i flussi:

- **Lettori**: ogni lettore ha il proprio cursore e vede **ogni evento** nello stream. Sono ideali per analisi, proiezioni e qualsiasi elaborazione in stile fan-out.
- **Sinks**: tutte le istanze di sink con lo stesso nome condividono un **cursore di gruppo di consumatori**. Ogni evento viene consegnato a **un** consumatore di sink, fornendo una semantica di work-queue a meno di una volta.

| Lettori, lavandini, ecc
|----------------|-------------------------------------------------|-------------------------------------------------------------|
| Cursore | Indipendente per lettore | Condiviso per nome del sink (gruppo di consumatori) |
| Consegna | Ogni lettore vede ogni evento | Ogni evento va a un consumatore sink |
| Riconoscimento | Facoltativo (basta interrompere la lettura) | Esplicito `Ack` (a meno che non si usi `WithSinkNoAck`) |
| Uso tipico | Proiezioni, analisi, debug, replay | Elaborazione in background, lavoratori paralleli, distribuzione dei compiti |

### Opzioni chiave di configurazione

**Streams (`streaming.NewStream`)**

| Opzione | Descrizione |
|--------|-------------|
| `streaming.WithStreamMaxLen(n)` | Limita il numero di eventi conservati per flusso prima che gli eventi più vecchi vengano tagliati. 
| `streaming.WithStreamLogger(logger)` | Inietta un logger per gli interni dello stream, i lettori e i sink. |

**Lettori (`stream.NewReader`)**

| Opzione | Descrizione |
|--------|-------------|
| `options.WithReaderBlockDuration(d)` | Controlla per quanto tempo `Read` attende gli eventi prima di tornare. |
| `options.WithReaderStartAtOldest()` | Inizia dall'evento più vecchio invece che solo da quelli nuovi. |
| `options.WithReaderTopic(topic)` / `WithReaderTopicPattern(re)` | Filtra gli eventi per argomento o per regex di argomento sul lato client. |

**Lavandini (`stream.NewSink`)**

| Opzione | Descrizione |
|--------|-------------|
| `options.WithSinkBlockDuration(d)` | Controlla per quanto tempo il lavandino si blocca in attesa di lavoro. |
| `options.WithSinkAckGracePeriod(d)` | Finestra di tempo in cui un consumatore deve fare ack prima che l'evento sia reso nuovamente disponibile. |
| `options.WithSinkNoAck()` | Disabilita completamente i riconoscimenti (consumo fire-and-forget). |

**Opzioni dell'evento (`stream.Add`)**

| Opzione | Descrizione |
|--------|-------------|
| `options.WithTopic(topic)` | Allega un argomento all'evento in modo che i lettori/lavandini possano filtrarlo. |
| `options.WithOnlyIfStreamExists()` | Aggiungere l'evento solo se il flusso esiste già (non creare automaticamente). |

Per l'elenco completo delle opzioni di reader, sink e stream, vedere i documenti del pacchetto Go per
[`goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options).

---

## Pool di lavoratori

Il pacchetto `pool` implementa pool di lavoratori dedicati con hashing coerente per l'invio dei lavori.

### Architettura

{{< figure src="/images/diagrams/PulsePool.svg" alt="Pulse worker pool architecture showing job dispatch flow" class="img-fluid" >}}

I lavori vengono indirizzati ai lavoratori in base a una chiave che utilizza un hashing coerente. Questo garantisce che:
- I lavori con la stessa chiave vadano allo stesso worker
- Il carico è distribuito uniformemente tra i lavoratori
- I guasti dei lavoratori attivano il ribilanciamento automatico

### Modalità di guasto e durata

I pool di worker di Pulse sono progettati per la consegna **almeno una volta**: i lavori possono essere ritentati, ma non vengono abbandonati silenziosamente finché Redis persiste lo stato.

**Arresto del processo worker**

- Ogni worker aggiorna periodicamente un timestamp keep-alive in una mappa replicata.
- Le goroutine di pulizia in background sui nodi analizzano periodicamente questa mappa:
  - I lavoratori che non hanno aggiornato il loro timestamp entro `workerTTL` sono contrassegnati come inattivi.
  - Tutti i lavori di proprietà di un lavoratore inattivo vengono rimessi in coda e riassegnati tramite lo stesso instradamento consistent-hash usato per il normale dispatch.
- Risultato: se un lavoratore muore nel bel mezzo di un lavoro, alla fine il lavoro verrà rieseguito su un altro lavoratore attivo.

**Arresto del nodo (processo o host)**

- Lo stato del lavoro (chiavi del lavoro, payload del lavoro, assegnazioni dei lavoratori e informazioni in attesa di dispacciamento) risiede nelle mappe e nei flussi replicati di Redis, non nella memoria.
- Se un nodo scompare:
  - Gli altri nodi rilevano la sua assenza tramite una mappa keep-alive per i nodi.
  - I flussi specifici del nodo vengono eliminati.
  - I lavori precedentemente assegnati ai lavoratori di quel nodo vengono rimessi in attesa e ridistribuiti sui nodi rimanenti.
- `Close` e `Shutdown` distinguono tra:
  - **Close**: rimette in coda i lavori di questo nodo in modo che gli altri nodi continuino a elaborare il pool.
  - **Shutdown**: coordina un'interruzione globale tra i nodi, svuotando i lavori senza richiedere il requeue.

**Fallimenti e tentativi di dispacciamento**

- `DispatchJob` scrive un evento di avvio del lavoro in un flusso del pool e attende:
  - una conferma da un worker (successo o fallimento di `Start`), oppure
  - che un lavoro con la stessa chiave sia già presente.
- Una mappa separata dei lavori in sospeso e un TTL basato sul timestamp prevengono la duplicazione degli invii quando più nodi si affrettano a mettere in coda la stessa chiave di lavoro.
- Se un worker non conferma l'avvio di un lavoro entro il periodo di tolleranza configurato, l'invio può essere ritentato dalla logica di pulizia.

**Ribilanciamento quando i lavoratori si uniscono o lasciano il lavoro**

- Il pool mantiene una mappa replicata dei lavoratori attivi.
- Quando i lavoratori vengono aggiunti o rimossi:
  - I nodi rilevano le modifiche alla mappa dei lavoratori e chiedono a ciascun lavoratore di riequilibrare i propri lavori.
  - I lavori il cui bucket consistent-hash ora corrisponde a un worker diverso vengono fermati e rimessi in attesa in modo che possano essere raccolti dal nuovo worker di destinazione.
- In questo modo, le assegnazioni dei lavori vengono allineate con l'insieme di lavoratori corrente, rispettando il contratto di routing basato sulle chiavi.

**Durata di Redis**

- Pulse si affida a Redis per la durabilità. Se Redis è configurato con la persistenza (AOF/snapshots o cluster con replica), i lavori sopravvivono ai processi e agli arresti anomali dei nodi.
- Se Redis perde i suoi dati, Pulse non può recuperare i lavori o i metadati dei lavoratori; in questo caso il pool riparte da zero.

In pratica, questo significa che:
- Con un Redis durevole, un lavoro che `DispatchJob` ha accettato sarà eseguito con successo, fallirà con un errore visibile o sarà riprovato finché un worker non sarà in grado di elaborarlo.
- Il principale compromesso è la semantica at-least-once: i gestori devono essere idempotenti, perché i tentativi e i ribilanciamenti possono far sì che lo stesso lavoro venga eseguito più di una volta.

### Creare un pool

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

### Distribuzione dei lavori

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

### Elaborazione dei lavori

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

### Lavelli (Gruppi di consumatori)

I sink in Pulse sono costruiti sopra il pacchetto di streaming e sono usati internamente dal pool per bilanciare il lavoro tra i lavoratori
per bilanciare il lavoro tra i lavoratori. Più nodi del pool che si uniscono allo stesso nome del pool condividono il lavoro:

```go
// Two nodes participating in the same pool
node1, _ := pool.AddNode(ctx, "email-pool", rdb)
node2, _ := pool.AddNode(ctx, "email-pool", rdb)

// Jobs dispatched to "email-pool" are distributed across all active workers.
```

### Opzioni di configurazione chiave

**Nodi di pool (`pool.AddNode`)**

| Opzione | Descrizione |
|--------|-------------|
| `pool.WithWorkerTTL(d)` | Quanto aggressivamente rilevare i lavoratori morti; valori più bassi significano failover più veloce, valori più alti significano meno battiti. |
| `pool.WithMaxQueuedJobs(n)` | Limite globale per i lavori in coda in volo; il suo superamento fa sì che le nuove chiamate `DispatchJob` falliscano rapidamente. |
| `pool.WithAckGracePeriod(d)` | Quanto tempo il pool attende che un lavoratore confermi l'avvio di un lavoro prima di poterlo riassegnare. |
| `pool.WithClientOnly()` | Creare un nodo che si limita a distribuire i lavori (senza routing o lavoratori in background). |
| `pool.WithLogger(logger)` | Collegare un logger strutturato per tutti i dati interni del pool. |

Per una messa a punto più avanzata (TTL di spegnimento, durata dei blocchi di sink, ecc.), vedere il file
[docs del pacchetto pool] (https://pkg.go.dev/goa.design/pulse/pool).

---

## Configurazione dell'infrastruttura

### Requisiti di Redis

Pulse richiede Redis 5.0+ per il supporto di Streams. Per la produzione:

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

Per l'alta disponibilità, utilizzare Redis Cluster:

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

## Modelli

### Sourcing di eventi

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

## Elaborazione di attività asincrone

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

## Esempio completo: Flusso di iscrizione dell'utente

Lo schizzo seguente mostra come si potrebbero combinare flussi, un pool di worker e una mappa replicata
per implementare un flusso di iscrizione dell'utente con conferma via e-mail e flag di funzionalità:

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

Questo schema è scalabile in modo naturale: si possono aggiungere altri worker per le email, aggiungere altri consumatori del flusso
`users` (analytics, audit, ecc.) e condividere altri stati del piano di controllo tramite mappe replicate.

---

## Considerazioni sulla produzione

- **Dimensionamento e durata di Redis**: Utilizzare Redis 5+ con persistenza configurata in modo appropriato (AOF o snapshotting) a seconda di quanto siano critici i dati di flusso e le mappe replicate per il carico di lavoro.
- **Taglio dello stream**: Impostare `WithStreamMaxLen` ad un livello sufficientemente alto per soddisfare le esigenze di replay (event sourcing, debugging) ma sufficientemente basso per evitare una crescita senza limiti; ricordare che il trimming è approssimativo.
- **Semantica dell'at-least-once**: Gli stream e i sink sono at-least-once; progettare i gestori in modo che siano idempotenti e sicuri da riprovare.
- **TL e spegnimento dei gestori**: Regolare `WithWorkerTTL` e `WithWorkerShutdownTTL` in base alla velocità con cui si desidera rilevare i lavoratori falliti e al tempo necessario per scaricare il lavoro allo spegnimento.
- **Lavori in sospeso e bloccati**: `WithAckGracePeriod` e il monitoraggio interno dei lavori in sospeso del pool impediscono che i lavori rimangano bloccati per sempre, ma è comunque necessario monitorare i lavori che falliscono ripetutamente all'avvio.
- **Osservabilità**: Usate `pulse.ClueLogger` o il vostro logger strutturato con `WithStreamLogger`, `WithLogger` e `rmap.WithLogger` per poter tracciare gli eventi e i cicli di vita dei lavori in produzione.
- **Limiti di coda e di pressione**: Usate `WithMaxQueuedJobs`, `WithReaderMaxPolled` e `WithSinkMaxPolled` per limitare l'uso della memoria e rendere esplicita la backpressure quando il sistema è sovraccarico.
- **Alta disponibilità**: Per i sistemi critici, eseguite Redis in modalità cluster o sentinella e gestite più nodi del pool in modo che i lavoratori possano fare fail over in modo pulito.

---

## Risoluzione dei problemi

- **Non è possibile connettersi a Redis**: Verificare l'indirizzo, la password e le impostazioni TLS utilizzate da `redis.NewClient` o `redis.NewClusterClient`; Pulse propaga semplicemente questi errori di connessione.
- **Non vengono consegnati eventi**: Verificare che i lettori e i sink utilizzino il nome corretto dello stream, la posizione iniziale (`WithReaderStart*` / `WithSinkStart*`) e il modello di argomento/topic; verificare inoltre che `BlockDuration` non sia impostato inavvertitamente su `0`.
- **Sembra che manchino degli eventi**: Se `WithStreamMaxLen` è troppo piccolo, gli eventi più vecchi potrebbero essere stati tagliati; aumentare la lunghezza massima o persistere gli eventi importanti altrove.
- **I lavori non vengono mai prelevati**: Assicurarsi che almeno un nodo non client-only sia in esecuzione con lavoratori attivi (`AddWorker`) e che `WithMaxQueuedJobs` non sia stato superato.
- **I lavori continuano a essere ritentati o spostati tra i lavoratori**: Questo di solito indica che il worker non riesce ad avviarsi o si blocca durante l'elaborazione; ispezionare i log dei job handler e considerare di aumentare `WithAckGracePeriod` o di correggere gli handler non idempotenti.
- **Carico irregolare dei lavoratori**: L'hashing coerente del salto normalmente bilancia bene le chiavi; se la maggior parte dei lavori condivide la stessa chiave, considerare la possibilità di suddividere lo spazio delle chiavi o di utilizzare una strategia di codifica diversa.
- **Il sistema si blocca**: Se `Close` o lo spegnimento di un pool richiede troppo tempo, rivedete `WithWorkerShutdownTTL` e assicuratevi che le implementazioni dei lavoratori `Stop` ritornino prontamente anche quando il lavoro è lento o i servizi esterni sono disattivati.

### Caching distribuito

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

## Vedi anche

- [Pulse GitHub Repository](https://github.com/goadesign/pulse) - Codice sorgente ed esempi
- [Documentazione di Redis Streams](https://redis.io/docs/data-types/streams/) - Concetti di Redis Streams
