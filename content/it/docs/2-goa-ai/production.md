---
title: "Produzione"
linkTitle: "Produzione"
weight: 8
description: "Set up Temporal for durable workflows, stream events to UIs, apply adaptive rate limiting, and use system reminders."
llm_optimized: true
aliases:
---

## Limitazione della velocità del modello

Ogni fornitore di modelli applica limiti di velocità. Se li superate, le vostre richieste falliscono con 429 errori. Peggio ancora: in un'implementazione multi-replica, ogni replica martella l'API in modo indipendente, causando un throttling *aggregato* invisibile ai singoli processi.

### Il problema

**Scenario:** Si distribuiscono 10 repliche del servizio agente. Ogni replica pensa di avere a disposizione 100K token/minuto. Insieme, inviano 1M di token/minuto, 10 volte la quota effettiva. Il provider applica un throttling aggressivo. Le richieste falliscono in modo casuale su tutte le repliche.

**Senza limitazione della velocità
- Le richieste falliscono in modo imprevedibile con 429 secondi
- Nessuna visibilità sulla capacità residua
- I tentativi peggiorano la congestione
- L'esperienza dell'utente peggiora sotto carico

**Con la limitazione adattiva della velocità:**
- Ogni replica condivide un budget coordinato
- Le richieste vengono messe in coda finché la capacità non è disponibile
- Il backoff si propaga in tutto il cluster
- Degrado graduale invece di guasti

### Panoramica

Il pacchetto `features/model/middleware` fornisce un limitatore di velocità adattativo in stile **AIMD** che si colloca al confine del client del modello. Stima i costi dei token, blocca i chiamanti finché non è disponibile la capacità e regola automaticamente il suo budget di token al minuto in risposta ai segnali di limitazione della velocità da parte dei provider.

### Strategia AIMD

Il limitatore utilizza una strategia **Additive Increase / Multiplicative Decrease (AIMD)**:

| Evento | Azione | Formula |
|-------|--------|---------|
| Successo | Sonda (aumento additivo) | `TPM += recoveryRate` (5% dell'iniziale) |
| `ErrRateLimited` | Backoff (diminuzione moltiplicativa) | `TPM *= 0.5` |

Il numero effettivo di token al minuto (TPM) è limitato da:
- **Minimo**: 10% del TPM iniziale (soglia minima per prevenire l'inedia)
- **Massimo**: Il limite massimo configurato `maxTPM`

### Uso di base

Creare un singolo limitatore per processo e avvolgere il client del modello:

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/goa-ai/features/model/bedrock"
)

func main() {
    ctx := context.Background()

    // Create the adaptive rate limiter
    // Parameters: context, rmap (nil for local), key, initialTPM, maxTPM
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        nil,     // nil = process-local limiter
        "",      // key (unused when rmap is nil)
        60000,   // initial tokens per minute
        120000,  // maximum tokens per minute
    )

    // Create your underlying model client
    bedrockClient, err := bedrock.NewClient(bedrock.Options{
        Region: "us-east-1",
        Model:  "anthropic.claude-sonnet-4-20250514-v1:0",
    })
    if err != nil {
        panic(err)
    }

    // Wrap with rate limiting middleware
    rateLimitedClient := limiter.Middleware()(bedrockClient)

    // Use rateLimitedClient with your runtime or planners
    rt := runtime.New(
        runtime.WithModelClient("claude", rateLimitedClient),
    )
}
```

### Limitazione della velocità consapevole del cluster

Per le distribuzioni multiprocesso, coordinare la limitazione della velocità tra le istanze usando una mappa replicata di Pulse:

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()

    // Create a Pulse replicated map backed by Redis
    rm, err := rmap.NewMap(ctx, "rate-limits", rmap.WithRedis(redisClient))
    if err != nil {
        panic(err)
    }

    // Create cluster-aware limiter
    // All processes sharing this map and key coordinate their budgets
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        rm,
        "claude-sonnet",  // shared key for this model
        60000,            // initial TPM
        120000,           // max TPM
    )

    // Wrap your client as before
    rateLimitedClient := limiter.Middleware()(bedrockClient)
}
```

Quando si usa la limitazione consapevole del cluster:
- **Il backoff si propaga a livello globale**: Quando un processo riceve `ErrRateLimited`, tutti i processi riducono il loro budget
- **Il probing è coordinato**: Le richieste riuscite incrementano il budget condiviso
- **Riconciliazione automatica**: I processi osservano le modifiche esterne e aggiornano i loro limitatori locali

### Stima dei gettoni

Il limitatore stima il costo della richiesta utilizzando una semplice euristica:
- Conta i caratteri nelle parti di testo e nei risultati degli strumenti di stringa
- Converte in token utilizzando ~3 caratteri per token
- Aggiunge un buffer di 500 token per le richieste del sistema e l'overhead del provider

Questa stima è intenzionalmente conservativa per evitare un conteggio insufficiente.

### Integrazione con il runtime

Cablare i client a velocità limitata nel runtime di Goa-AI:

```go
// Create limiters for each model you use
claudeLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 60000, 120000)
gptLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 90000, 180000)

// Wrap underlying clients
claudeClient := claudeLimiter.Middleware()(bedrockClient)
gptClient := gptLimiter.Middleware()(openaiClient)

// Configure runtime with rate-limited clients
rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithModelClient("claude", claudeClient),
    runtime.WithModelClient("gpt-4", gptClient),
)
```

### Cosa succede sotto carico

| Livello di traffico | Senza limitatore | Con limitatore |
|---------------|-----------------|--------------|
| Sotto quota | Le richieste vanno a buon fine | Le richieste vanno a buon fine |
| Alla quota | 429 fallimenti casuali | Le richieste si accodano, poi riescono |
| Burst sopra la quota | Cascata di fallimenti, il provider si blocca | Backoff assorbe il burst, recupero graduale |
| Sovraccarico prolungato | Tutte le richieste falliscono | Richieste in coda con latenza limitata |

### Parametri di regolazione

| Parametro | Predefinito | Descrizione |
|-----------|---------|-------------|
| `initialTPM` | (obbligatorio) | Budget iniziale di tokens-per-minute |
| `maxTPM` | (obbligatorio) | Massimale per il probing |
| Floor | 10% dell'iniziale | Budget minimo (previene la fame) |
| Tasso di recupero | 5% dell'iniziale | Incremento additivo per ogni successo |
| Fattore di backoff | 0,5 | Diminuzione moltiplicativa su 429 |

**Esempio:** Con `initialTPM=60000, maxTPM=120000`:
- Piano: 6.000 TPM
- Recupero: +3.000 TPM per lotto riuscito
- Backoff: dimezzare i TPM correnti su 429

### Monitoraggio

Traccia il comportamento del limitatore di velocità con metriche e registri:

```go
// The limiter logs backoff events at WARN level
// Monitor for sustained throttling by tracking:
// - Wait time distribution (how long requests queue)
// - Backoff frequency (how often 429s occur)
// - Current TPM vs. initial TPM

// Example: export current capacity to Prometheus
currentTPM := limiter.CurrentTPM()
```

### Migliori pratiche

- **Un limitatore per modello/provider**: Creare limitatori separati per i diversi modelli per isolare i loro budget
- **Impostare un TPM iniziale realistico**: Iniziare con il limite di velocità documentato dal provider o con una stima prudente
- **Utilizzare la limitazione consapevole del cluster in produzione**: Coordinarsi tra le repliche per evitare il throttling aggregato
- **Monitorare gli eventi di backoff**: Registrare o emettere metriche quando si verificano i backoff per rilevare il throttling prolungato
- **Impostare il maxTPM al di sopra di quello iniziale**: Lasciare spazio per il probing quando il traffico è al di sotto della quota

---

## Override dei prompt con Mongo Store

In produzione, la gestione dei prompt usa in genere:

- prompt spec baseline registrate in `runtime.PromptRegistry`, e
- record di override con scope persistiti in Mongo tramite `features/prompt/mongo`.

### Wiring

```go
import (
    promptmongo "goa.design/goa-ai/features/prompt/mongo"
    clientmongo "goa.design/goa-ai/features/prompt/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

promptClient, err := clientmongo.New(clientmongo.Options{
    Client:     mongoClient,
    Database:   "aura",
    Collection: "prompt_overrides", // opzionale (default: prompt_overrides)
})
if err != nil {
    panic(err)
}

promptStore, err := promptmongo.NewStore(promptClient)
if err != nil {
    panic(err)
}

rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithPromptStore(promptStore),
)
```

### Risoluzione degli override e rollout

La precedenza degli override e deterministica:

1. scope `session`
2. scope `facility`
3. scope `org`
4. scope globale
5. prompt spec baseline (quando non esiste override)

Strategia di rollout consigliata:

- Registra prima le nuove prompt spec baseline.
- Esegui gli override prima su scope ampio (`org`), poi restringi a `facility`/`session` per i canary.
- Traccia le versioni effettive tramite eventi `prompt_rendered` e `model.Request.PromptRefs`.
- Esegui rollback scrivendo un override piu recente nello stesso scope (o rimuovendo override specifici per tornare al fallback).

---

## Impostazione temporale

Questa sezione tratta l'impostazione di Temporal per i flussi di lavoro degli agenti durevoli negli ambienti di produzione.

### Panoramica

Temporal fornisce un'esecuzione duratura per gli agenti Goa-AI. Le esecuzioni degli agenti diventano flussi di lavoro Temporal con cronologia basata sugli eventi. Le chiamate allo strumento diventano attività con tentativi configurabili. Ogni transizione di stato viene conservata. Un worker riavviato riproduce la cronologia e riprende esattamente da dove si era interrotto.

### Come funziona la durata

| Componente | Ruolo | Durabilità |
|-----------|------|------------|
| **Flusso di lavoro** | Orchestrazione dell'esecuzione dell'agente | Origine evento; sopravvive ai riavvii |
| **Attività di pianificazione** | Chiamata di inferenza LLM | Riprova su fallimenti transitori |
| **Execute Tool Activity** | Invocazione di uno strumento | Politiche di ritentamento per strumento |
| **State** | Cronologia dei turni, risultati degli strumenti | Persistenti nella cronologia del flusso di lavoro |

**Esempio concreto:** L'agente chiama un LLM, che restituisce 3 chiamate allo strumento. Due strumenti vengono completati. Il servizio del terzo strumento si blocca.

- ❌ **Senza Temporale:** L'intera esecuzione fallisce. Si esegue nuovamente l'inferenza ($$$) e si rieseguono i due strumenti che hanno avuto successo.
- ✅ **Con Temporale:** Si riprova solo lo strumento che si è arrestato. Il flusso di lavoro viene riproposto dalla storia: nessuna nuova chiamata a LLM, nessuna riesecuzione di strumenti completati. Costo: un tentativo, non un riavvio completo.

### Cosa sopravvive ai guasti

| Scenario di guasto | Senza Temporal | Con Temporal |
|------------------|------------------|---------------|
| Il processo di lavoro si blocca | Esecuzione persa, riavvio da zero | Riproduzione dalla cronologia, continua |
| La chiamata allo strumento va in time out | L'esecuzione fallisce (o gestione manuale) | Riprova automatica con backoff |
| Limite di velocità (429) | L'esecuzione non riesce | Arretra, riprova automaticamente |
| Partizione di rete | Avanzamento parziale perso | Riprende dopo la riconnessione |
| Distribuzione durante l'esecuzione | Le esecuzioni in volo falliscono | I lavoratori si svuotano, i nuovi lavoratori riprendono |

### Installazione

**Opzione 1: Docker (sviluppo)**

Una sola riga per lo sviluppo locale:
```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**Opzione 2: Temporalite (Sviluppo)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**Opzione 3: Nuvola Temporale (Produzione)**

Registrarsi su [temporal.io] (https://temporal.io) e configurare il client con le credenziali del cloud.

**Opzione 4: Self-Hosted (Produzione)**

Distribuire Temporal utilizzando Docker Compose o Kubernetes. Vedere la [Documentazione di Temporal](https://docs.temporal.io) per le guide alla distribuzione.

### Configurazione del runtime

Goa-AI astrae il backend di esecuzione dietro l'interfaccia `Engine`. È possibile cambiare i motori senza modificare il codice dell'agente:

**In-Memory Engine** (sviluppo):
```go
// Default: no external dependencies
rt := runtime.New()
```

**Motore temporale** (produzione):
```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"

    // Aggregato di specifiche generate per i tuoi tool.
    // Il package generato espone: func Spec(tools.Ident) (*tools.ToolSpec, bool)
    specs "<module>/gen/<service>/agents/<agent>/specs"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
        // Richiesto: far rispettare il contratto di confine dei workflow di goa-ai.
        // I risultati, server-data e artefatti attraversano i confini come JSON canonico (api.ToolEvent/api.ToolArtifact).
        DataConverter: runtimeTemporal.NewAgentDataConverter(specs.Spec),
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
```

### Configurazione dei ritiri di attività

Le chiamate agli strumenti sono attività temporali. Configurare i ritiri per ogni set di strumenti nel DSL:

```go
Use("external_apis", func() {
    // Flaky external services: retry aggressively
    ActivityOptions(engine.ActivityOptions{
        Timeout: 30 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts:        5,
            InitialInterval:    time.Second,
            BackoffCoefficient: 2.0,
        },
    })
    
    Tool("fetch_weather", "Get weather data", func() { /* ... */ })
    Tool("query_database", "Query external DB", func() { /* ... */ })
})

Use("local_compute", func() {
    // Fast local tools: minimal retries
    ActivityOptions(engine.ActivityOptions{
        Timeout: 5 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts: 2,
        },
    })
    
    Tool("calculate", "Pure computation", func() { /* ... */ })
})
```

### Configurazione del lavoratore

I worker eseguono il polling delle code di attività e l'esecuzione di flussi di lavoro/attività. I worker vengono avviati automaticamente per ogni agente registrato; nella maggior parte dei casi non è necessaria una configurazione manuale dei worker.

### Migliori pratiche

- **Usare spazi dei nomi separati** per i diversi ambienti (dev, staging, prod)
- **Configurare i criteri di riprova** per ogni set di strumenti in base alle caratteristiche di affidabilità
- **Monitorare l'esecuzione del flusso di lavoro** utilizzando l'interfaccia utente e gli strumenti di osservabilità di Temporal
- **Impostare timeout** appropriati per le attività - bilanciare l'affidabilità rispetto al rilevamento delle sospensioni
- **Usare Temporal Cloud** per la produzione per evitare oneri operativi

---

## Interfaccia utente di streaming

Questa sezione mostra come trasmettere gli eventi dell'agente alle interfacce utente in tempo reale, utilizzando l'infrastruttura di streaming di Goa-AI.

### Panoramica

Goa-AI pubblica uno stream **di proprietà della sessione** di eventi tipizzati che può essere fornito alle interfacce utente tramite:
- Eventi inviati dal server (SSE)
- WebSocket
- Bus di messaggi (Pulse, Redis Streams, ecc.)

Tutti gli eventi visibili per una sessione vengono aggiunti a un unico stream: `session/<session_id>`. Ogni evento include `run_id` e `session_id` e il runtime emette `child_run_linked` per collegare una chiamata allo strumento padre a un’esecuzione figlia, oltre a `run_stream_end` come marcatore esplicito per chiudere SSE/WebSocket senza timer.

### Interfaccia Stream Sink

Implementare l'interfaccia `stream.Sink`:

```go
type Sink interface {
    Send(ctx context.Context, event stream.Event) error
    Close(ctx context.Context) error
}
```

### Tipi di evento

Il pacchetto `stream` definisce tipi di eventi concreti che implementano `stream.Event`. Quelli più comuni per le interfacce utente sono:

| Tipo di evento | Descrizione |
|------------|-------------|
| `AssistantReply` | Assistente a pezzi di messaggio (testo in streaming) |
| `PlannerThought` | Blocchi di pensiero del pianificatore (note e ragionamenti strutturati) |
| `ToolStart` | Esecuzione dello strumento avviata |
| `ToolUpdate` | Avanzamento dell'esecuzione dello strumento (aggiornamenti previsti del conteggio dei figli) |
| `ToolEnd` | Esecuzione dello strumento completata (risultato, errore, telemetria) |
| `AwaitClarification` | Il pianificatore è in attesa di chiarimenti umani |
| `AwaitExternalTools` | Il pianificatore è in attesa dei risultati dello strumento esterno |
| `Usage` | Utilizzo di token per invocazione del modello |
| `Workflow` | Esecuzione di aggiornamenti del ciclo di vita e delle fasi |
| `ChildRunLinked` | Collegamento da una chiamata allo strumento padre a un'esecuzione dell'agente figlio |

I trasporti di solito commutano di tipo su `stream.Event` per la sicurezza in fase di compilazione:

```go
switch e := evt.(type) {
case stream.AssistantReply:
    // e.Data.Text
case stream.PlannerThought:
    // e.Data.Note or structured thinking fields
case stream.ToolStart:
    // e.Data.ToolCallID, e.Data.ToolName, e.Data.Payload
case stream.ToolEnd:
    // e.Data.Result, e.Data.Error, e.Data.ResultPreview
case stream.ChildRunLinked:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
case stream.RunStreamEnd:
    // run has no more stream-visible events
}
```

### Esempio: Lavello SSE

```go
type SSESink struct {
    w http.ResponseWriter
}

func (s *SSESink) Send(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case stream.AssistantReply:
        fmt.Fprintf(s.w, "data: assistant: %s\n\n", e.Data.Text)
    case stream.PlannerThought:
        if e.Data.Note != "" {
            fmt.Fprintf(s.w, "data: thinking: %s\n\n", e.Data.Note)
        }
    case stream.ToolStart:
        fmt.Fprintf(s.w, "data: tool_start: %s\n\n", e.Data.ToolName)
    case stream.ToolEnd:
        fmt.Fprintf(s.w, "data: tool_end: %s status=%v\n\n",
            e.Data.ToolName, e.Data.Error == nil)
    case stream.ChildRunLinked:
        fmt.Fprintf(s.w, "data: child_run_linked: %s child=%s\n\n",
            e.Data.ToolName, e.Data.ChildRunID)
    case stream.RunStreamEnd:
        fmt.Fprintf(s.w, "data: run_stream_end: %s\n\n", e.RunID())
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

## Abbonamento allo stream di sessione (Pulse)

In produzione, le UI consumano lo stream di sessione (`session/<session_id>`) da un bus condiviso e filtrano per `run_id`. Chiudi SSE/WebSocket quando osservi `run_stream_end` per la run attiva.

### Flusso globale

Per eseguire lo streaming di tutte le corse attraverso un sink globale (ad esempio, Pulse), configurare il runtime con uno stream sink:

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

Il runtime installa un `stream.Subscriber` predefinito che:
- mappa gli eventi hook a valori `stream.Event`
- utilizza il **default `StreamProfile`**, che emette le risposte dell'assistente, i pensieri del pianificatore, l'avvio/aggiornamento/fine dello strumento, le attese, l'utilizzo, il flusso di lavoro, i collegamenti `child_run_linked` e il marcatore terminale `run_stream_end`

### Profili dei flussi

Non tutti i consumatori hanno bisogno di tutti gli eventi. **I profili di flusso** filtrano gli eventi per pubblici diversi, riducendo il rumore e la larghezza di banda per casi d'uso specifici.

| Profilo | Caso d'uso | Eventi inclusi |
|---------|----------|-----------------|
| `UserChatProfile()` | UI della chat dell'utente finale | Risposte dell'assistente, avvio/fine dello strumento, completamento del flusso di lavoro |
| `AgentDebugProfile()` | Debug dello sviluppatore | Tutto, compresi i pensieri del pianificatore |
| `MetricsProfile()` | Pipeline di osservabilità | Solo eventi di utilizzo e flusso di lavoro |

**Utilizzo di profili integrati:**

```go
// User-facing chat: replies, tool status, completion
profile := stream.UserChatProfile()

// Debug view: everything including planner thoughts
profile := stream.AgentDebugProfile()

// Metrics pipeline: just usage and workflow events
profile := stream.MetricsProfile()

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

**Profili personalizzati:**

```go
// Fine-grained control over which events to emit
profile := stream.StreamProfile{
    Assistant:  true,
    Thoughts:   false,  // Skip planner thinking
    ToolStart:  true,
    ToolUpdate: true,
    ToolEnd:    true,
    Usage:      false,  // Skip usage events
    Workflow:   true,
    ChildRuns:  true,   // Include parent tool → child run links
}

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

I profili personalizzati sono utili quando:
- Si ha bisogno di eventi specifici per un utente specializzato (ad esempio, il monitoraggio dei progressi)
- Si desidera ridurre la dimensione del payload per i client mobili
- Si stanno costruendo pipeline di analisi che necessitano solo di determinati eventi

### Avanzato: Ponti di impulsi e flussi

Per le configurazioni di produzione, spesso si desidera:
- pubblicare eventi su un bus condiviso (ad esempio, Pulse)
- utilizzare uno stream **di proprietà della sessione** su quel bus (`session/<session_id>`)

Goa-AI fornisce:
- `features/stream/pulse` - un'implementazione `stream.Sink` supportata da Pulse
- `runtime/agent/stream/bridge` - helper per collegare il bus hook a qualsiasi sink

Cablaggio tipico:

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    // Optional: override stream naming (defaults to `session/<SessionID>`).
    StreamID: func(ev stream.Event) (string, error) {
        if ev.SessionID() == "" {
            return "", errors.New("missing session id")
        }
        return fmt.Sprintf("session/%s", ev.SessionID()), nil
    },
})
if err != nil { log.Fatal(err) }

rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(s),
)
```

---

## Promemoria del sistema

I modelli vanno alla deriva. Dimenticano le istruzioni. Ignorano un contesto che era chiaro 10 turni fa. Quando il vostro agente esegue compiti di lunga durata, avete bisogno di un modo per iniettare *guida dinamica e contestuale* senza inquinare la conversazione con l'utente.

### Il problema

**Scenario:** Il vostro agente gestisce un elenco di cose da fare. Dopo 20 turni, l'utente chiede "cosa c'è dopo?", ma il modello si è allontanato e non ricorda che c'è una cosa in sospeso in corso. È necessario dare una spinta *senza* che l'utente veda un messaggio imbarazzante del tipo "Promemoria: hai un impegno in corso".

**Senza promemoria di sistema
- Si gonfia il prompt di sistema con ogni possibile scenario
- La guida si perde in lunghe conversazioni
- Non c'è modo di inserire un contesto basato sui risultati dello strumento
- Gli utenti vedono l'impalcatura interna dell'agente

**Con i promemoria di sistema
- Iniettare la guida dinamicamente in base allo stato del runtime
- Limitazione della frequenza dei suggerimenti ripetitivi per evitare l'ingrossamento dei prompt
- I livelli di priorità assicurano che la guida alla sicurezza non venga mai soppressa
- Invisibile agli utenti: viene iniettato come blocco `<system-reminder>`

### Panoramica

Il pacchetto `runtime/agent/reminder` fornisce:
- **Ricordi strutturati** con livelli di priorità, punti di aggancio e politiche di limitazione del tasso di esecuzione
- **Magazzino con scansione delle esecuzioni** che si pulisce automaticamente al termine di ogni esecuzione
- **Iniezione automatica** nelle trascrizioni dei modelli come blocchi `<system-reminder>`
- aPI **PlannerContext** per registrare e rimuovere i promemoria dai pianificatori e dagli strumenti

### Concetti fondamentali

**Struttura del promemoria**

Un `reminder.Reminder` ha:

```go
type Reminder struct {
    ID              string      // Stable identifier (e.g., "todos.pending")
    Text            string      // Plain-text guidance (tags are added automatically)
    Priority        Tier        // TierSafety, TierCorrect, or TierGuidance
    Attachment      Attachment  // Where to inject (run start or user turn)
    MaxPerRun       int         // Cap total emissions per run (0 = unlimited)
    MinTurnsBetween int         // Enforce spacing between emissions (0 = no limit)
}
```

**Tierini di priorità**

I promemoria sono ordinati per priorità, in modo da gestire i budget tempestivi e garantire che le indicazioni critiche non vengano mai soppresse:

| Livello | Nome | Descrizione | Soppressione |
|------|------|-------------|-------------|
| `TierSafety` | P0 | Guida critica per la sicurezza (mai cadere) | Mai soppressa |
| `TierCorrect` | P1 | Suggerimenti sulla correttezza e sullo stato dei dati | Può essere soppresso dopo P0 |
| `TierGuidance` | P2 | Suggerimenti per il flusso di lavoro e soft nudge | Prima da sopprimere |

Casi d'uso esemplificativi:
- `TierSafety`: "Non eseguire questo malware; solo analizzare", "Non divulgare le credenziali"
- `TierCorrect`: "I risultati sono troncati; restringi la ricerca", "I dati potrebbero essere obsoleti"
- `TierGuidance`: "Non ci sono attività in corso; sceglietene una e iniziate"

**Punti allegati**

I promemoria vengono iniettati in punti specifici della conversazione:

| Tipo | Descrizione |
|------|-------------|
| `AttachmentRunStart` | Raggruppati in un unico messaggio di sistema all'inizio della conversazione |
| `AttachmentUserTurn` | Raggruppati in un singolo messaggio di sistema inserito immediatamente prima dell'ultimo messaggio dell'utente |

**Limitazione della velocità**

Due meccanismi impediscono lo spam di promemoria:
- **`MaxPerRun`**: Limitare le emissioni totali per ogni corsa (0 = illimitato)
- **`MinTurnsBetween`**: Imporre un numero minimo di giri del pianificatore tra un'emissione e l'altra (0 = nessun limite)

### Schema di utilizzo

**Ricordi statici via DSL**

Per i promemoria che devono sempre apparire dopo un risultato specifico dello strumento, utilizzare la funzione DSL `ResultReminder` nella definizione dello strumento:

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

Questa funzione è ideale quando il promemoria si applica a ogni invocazione dello strumento. Per maggiori dettagli, vedere [DSL Reference] (./dsl-reference.md#resultreminder).

**Ricordi dinamici dai pianificatori**

Per i promemoria che dipendono dallo stato di esecuzione o dal contenuto dei risultati dello strumento, utilizzare `PlannerContext.AddReminder()`:

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "search_documents" {
            result := tr.Result.(SearchResult)
            if result.Truncated {
                in.Agent.AddReminder(reminder.Reminder{
                    ID:       "search.truncated",
                    Text:     "Search results are truncated. Consider narrowing your query.",
                    Priority: reminder.TierCorrect,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun:       3,
                    MinTurnsBetween: 2,
                })
            }
        }
    }
    // Continue with planning...
}
```

**Rimuovere i promemoria**

Usare `RemoveReminder()` quando una precondizione non è più valida:

```go
if allTodosCompleted {
    in.Agent.RemoveReminder("todos.no_active")
}
```

**Preservare i contatori dei limiti di frequenza**

`AddReminder()` preserva i contatori delle emissioni quando si aggiorna un promemoria esistente per ID. Se è necessario modificare il contenuto del promemoria ma mantenere i limiti di velocità:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:              "todos.pending",
    Text:            buildUpdatedText(snap),
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3,
})
```

**Antipattern**: Non chiamate `RemoveReminder()` seguito da `AddReminder()` per lo stesso ID: questo azzera i contatori e bypassa `MinTurnsBetween`.

### Iniezione e formattazione

**Etichettatura automatica**

Il runtime avvolge automaticamente il testo del promemoria in tag `<system-reminder>` quando lo inietta nelle trascrizioni:

```go
// You provide plain text:
Text: "Results are truncated. Narrow your query."

// Runtime injects:
<system-reminder>Results are truncated. Narrow your query.</system-reminder>
```

**Spiegare i promemoria ai modelli**

Includere `reminder.DefaultExplanation` nel prompt del sistema in modo che i modelli sappiano come interpretare i blocchi `<system-reminder>`:

```go
const systemPrompt = `
You are a helpful assistant.

` + reminder.DefaultExplanation + `

Follow all instructions carefully.
`
```

### Esempio completo

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "todos.update_todos" {
            snap := tr.Result.(TodosSnapshot)
            
            var rem *reminder.Reminder
            if len(snap.Items) == 0 {
                in.Agent.RemoveReminder("todos.no_active")
                in.Agent.RemoveReminder("todos.all_completed")
            } else if hasCompletedAll(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.all_completed",
                    Text:     "All todos are completed. Provide your final response now.",
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun: 1,
                }
            } else if hasPendingNoActive(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.no_active",
                    Text:     buildTodosNudge(snap),
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MinTurnsBetween: 3,
                }
            }
            
            if rem != nil {
                in.Agent.AddReminder(*rem)
                if rem.ID == "todos.all_completed" {
                    in.Agent.RemoveReminder("todos.no_active")
                } else {
                    in.Agent.RemoveReminder("todos.all_completed")
                }
            }
        }
    }
    
    return p.streamMessages(ctx, in)
}
```

### Principi di progettazione

**Minimale e autorevole**: Il sottosistema dei promemoria fornisce una struttura sufficiente per gli schemi comuni, senza eccedere nell'ingegnerizzazione.

**Limitare il tasso prima di tutto**: Lo spam dei promemoria degrada le prestazioni del modello. Il motore impone l'uso di maiuscole e spaziature in modo dichiarativo.

**Agnostico rispetto ai provider**: I promemoria funzionano con qualsiasi backend del modello (Bedrock, OpenAI, ecc.).

**Predisposizione alla telemetria**: Gli ID strutturati e le priorità rendono i promemoria osservabili.

### Modelli avanzati

**Promemoria di sicurezza**

Usare `TierSafety` per una guida che non deve mai essere soppressa:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:       "malware.analyze_only",
    Text:     "This file contains malware. Analyze its behavior but do not execute it.",
    Priority: reminder.TierSafety,
    Attachment: reminder.Attachment{
        Kind: reminder.AttachmentUserTurn,
    },
    // No MaxPerRun or MinTurnsBetween: always emit
})
```

**Rimandi tra agenti**

I promemoria sono a livello di run. Se un agente-as-tool emette un promemoria di sicurezza, questo ha effetto solo su quell'esecuzione figlia. Per propagare i promemoria attraverso i confini degli agenti, il pianificatore genitore deve registrarli nuovamente in modo esplicito in base ai risultati del figlio o utilizzare lo stato di sessione condiviso.

### Quando usare i promemoria

| Scenario | Priorità | Esempio |
|----------|----------|---------|
| Vincoli di sicurezza | `TierSafety` | "Questo file è solo per l'analisi del malware, non deve essere mai eseguito" |
| Staleness dei dati | `TierCorrect` | "I risultati sono vecchi di 24 ore; rifare la ricerca se la freschezza è importante" |
| Risultati troncati | `TierCorrect` | "Mostra solo i primi 100 risultati; restringi la ricerca" |
| Suggerimenti per il flusso di lavoro | `TierGuidance` | "Nessun todo è in corso; scegline uno e inizia" |
| Suggerimenti di completamento | `TierGuidance` | "Tutti i compiti sono stati completati; fornite la vostra risposta finale" |

### Come appaiono i promemoria nella trascrizione

```
User: What should I do next?

<system-reminder>You have 3 pending todos. Currently working on: "Review PR #42". 
Focus on completing the current todo before starting new work.</system-reminder>

User: What should I do next?
```

Il modello vede il promemoria; l'utente vede solo il suo messaggio e la risposta. I promemoria sono iniettati in modo trasparente dal runtime.

---

## Passi successivi

- Conoscere [Memoria e sessioni](./memory-sessions/) per la persistenza delle trascrizioni
- Esplorare [Agent Composition](./agent-composition/) per i modelli di agente come strumento
- Leggere [Toolsets](./toolsets/) per i modelli di esecuzione degli strumenti
