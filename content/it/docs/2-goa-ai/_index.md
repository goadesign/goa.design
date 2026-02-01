---
title: "Struttura Goa-AI"
linkTitle: "Goa-AI"
weight: 2
description: "Design-first framework for building agentic, tool-driven systems in Go."
llm_optimized: true
content_scope: "Complete Goa-AI Documentation"
aliases:
---

## Panoramica

Goa-AI estende la filosofia design-first di Goa ai sistemi agenziali. Definisce agenti, set di strumenti e politiche in un DSL; genera codice pronto per la produzione con contratti tipizzati, flussi di lavoro durevoli ed eventi in streaming.

---

## Perché Goa-AI?

### Agenti Design-First {#design-first-agents}

**Smettere di scrivere codice fragile per gli agenti. Iniziare con i contratti.**

La maggior parte dei framework per agenti prevede il cablaggio di prompt, strumenti e chiamate API in modo imperativo. Quando le cose si rompono - e succederà - ci si ritrova a fare il debug di codice sparso senza una chiara fonte di verità.

Goa-AI ribalta questa situazione: **definire le capacità dell'agente in un DSL tipizzato**, quindi generare l'implementazione. Il vostro progetto *è* la vostra documentazione. I vostri contratti *sono* la vostra convalida. Le modifiche si propagano automaticamente.

```go
Agent("assistant", "A helpful coding assistant", func() {
    Use("code_tools", func() {
        Tool("analyze", "Analyze code for issues", func() {
            Args(func() {
                Attribute("code", String, "Source code to analyze", func() {
                    MinLength(1)           // Can't be empty
                    MaxLength(100000)      // Reasonable size limit
                })
                Attribute("language", String, "Programming language", func() {
                    Enum("go", "python", "javascript", "typescript", "rust", "java")
                })
                Required("code", "language")
            })
            Return(AnalysisResult)
        })
    })
})
```

Quando l'LLM chiama questo strumento con argomenti non validi, ad esempio una stringa `code` vuota o `language: "cobol"`, Goa-AI **ritenta automaticamente** con un messaggio di errore di validazione. L'LLM vede esattamente cosa è andato storto e si corregge. Non è necessario alcun codice di gestione manuale degli errori.

**Vantaggi:**
- **Un'unica fonte di verità** - Il DSL definisce il comportamento, i tipi e la documentazione
- **Sicurezza in fase di compilazione** - Cattura i payload non corrispondenti prima del runtime
- **Client autogenerati** - Invocazioni di strumenti sicure per i tipi senza cablaggio manuale
- **Modelli coerenti** - Ogni agente segue la stessa struttura
- **Agenti auto-riparativi** - Gli errori di convalida attivano tentativi automatici con feedback

→ Per saperne di più, consultare [DSL Reference] (dsl-reference/) e [Quickstart] (quickstart/)

---

### Eseguire gli alberi {#run-trees-composition}

**Costruire sistemi complessi a partire da pezzi semplici e osservabili.**

Le applicazioni di intelligenza artificiale del mondo reale non sono agenti singoli, ma flussi di lavoro orchestrati in cui gli agenti delegano ad altri agenti, gli strumenti generano sottoattività e occorre tracciare tutto.

Il **modello ad albero di esecuzione** di Goa-AI offre un'esecuzione gerarchica con piena osservabilità. Ogni esecuzione dell'agente ha un ID univoco. Le esecuzioni figlio si collegano ai genitori. Il flusso di eventi è in tempo reale. È possibile eseguire il debug di qualsiasi errore percorrendo l'albero.

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees showing parent-child relationships" class="img-fluid" >}}

**Benefici:**
- **Agent-as-tool** - Qualsiasi agente può essere invocato come strumento da un altro agente
- **Tracciamento gerarchico** - Segue l'esecuzione attraverso i confini degli agenti
- **Fallimenti isolati** - Le esecuzioni dei figli falliscono in modo indipendente; i genitori possono riprovare o recuperare
- **Topologia di streaming** - Gli eventi scorrono lungo l'albero per le interfacce utente in tempo reale

→ Approfondimento in [Agent Composition](agent-composition/) e [Runtime](runtime/)

---

### Flusso strutturato {#structured-streaming}

**Visibilità in tempo reale di ogni decisione presa dai vostri agenti **

Gli agenti black-box sono un problema. Quando il vostro agente chiama uno strumento, inizia a pensare o incontra un errore, dovete saperlo *immediatamente*, non dopo il timeout della richiesta.

Goa-AI emette **eventi tipizzati** durante l'esecuzione: `assistant_reply` per lo streaming del testo, `tool_start`/`tool_end` per il ciclo di vita dello strumento, `planner_thought` per la visibilità del ragionamento, `usage` per il tracciamento dei token. Gli eventi fluiscono attraverso una semplice interfaccia **Sink** verso qualsiasi trasporto e, in produzione, le UI consumano un unico stream **di proprietà della sessione** (`session/<session_id>`) e chiudono quando osservano `run_stream_end` per la run attiva.

```go
// Wire a sink at startup — all events from all runs flow through it
rt := runtime.New(runtime.WithStream(mySink))
```

*i *profili di stream** filtrano gli eventi per i diversi consumatori: `UserChatProfile()` per le interfacce utente, `AgentDebugProfile()` per le viste degli sviluppatori, `MetricsProfile()` per le pipeline di osservabilità. I sink integrati per Pulse (Redis Streams) consentono lo streaming distribuito tra i servizi.

**Benefici:**
- **Agnostico al trasporto** - Gli stessi eventi funzionano su WebSocket, SSE, Pulse o backend personalizzati
- **Contratti tipizzati** - Nessun parsing di stringhe; gli eventi sono fortemente tipizzati con payload documentati
- **Consegna selettiva** - I profili di flusso filtrano gli eventi per ogni consumatore
- **Pronto per più tenant** - Gli eventi riportano `RunID` e `SessionID` per l'instradamento e il filtraggio

→ Dettagli di implementazione in [Production Streaming] (production/#streaming-ui)

---

### Durabilità temporale {#temporal-durability}

**Esecuzioni dell'agente che sopravvivono a crash, riavvii e guasti di rete

Senza durabilità, un processo che si blocca perde tutti i progressi. Una chiamata API a velocità limitata fa fallire l'intera esecuzione. Un errore di rete durante l'esecuzione di uno strumento comporta la ripetizione di un'inferenza costosa.

Goa-AI utilizza **Temporal** per l'esecuzione durevole. Le esecuzioni degli agenti diventano flussi di lavoro; le chiamate agli strumenti diventano attività con tentativi configurabili. Ogni transizione di stato viene conservata. Uno strumento che si blocca viene riproposto automaticamente, senza eseguire nuovamente la chiamata LLM che lo ha prodotto.

```go
// Development: in-memory (no dependencies)
rt := runtime.New()

// Production: Temporal for durability
eng, _ := temporal.New(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtime.WithEngine(eng))
```

**Benefici:**
- **Nessuno spreco di inferenza** - Gli strumenti falliti si riprovano senza richiamare l'LLM
- **Recupero in caso di crash** - Riavvio dei lavoratori in qualsiasi momento; le esecuzioni riprendono dall'ultimo checkpoint
- **Gestione dei limiti di velocità** - Il backoff esponenziale assorbe il throttling delle API
- **Sicuro per i deploy** - I deploy in rotazione non perdono il lavoro svolto in volo

→ Guida all'installazione e configurazione dei tentativi in [Produzione] (production/#temporal-setup)

---

### Registri degli strumenti {#tool-registries}

**Scoprire e consumare strumenti da qualsiasi luogo, dal proprio cluster o dal cloud pubblico

Con la crescita degli ecosistemi AI, gli strumenti sono ovunque: servizi interni, API di terze parti, registri MCP pubblici. La codifica rigida delle definizioni degli strumenti non è scalabile. È necessario un rilevamento dinamico.

Goa-AI fornisce un **registro interno raggruppato** per i vostri set di strumenti e una **federazione** con registri esterni come il catalogo MCP di Anthropic. Definite una volta, scoprite ovunque.

```go
// Connect to public registries
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "filesystem")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Or run your own clustered registry
var CorpRegistry = Registry("corp", func() {
    Description("Internal tool registry")
    URL("https://registry.corp.internal")
    Security(CorpAPIKey)
    SyncInterval("5m")
})
```

**Clusterizzazione del registro interno:**

Più nodi del registro con lo stesso nome formano automaticamente un cluster tramite Redis. Stato condiviso, controlli sanitari coordinati, scalabilità orizzontale: tutto automatico.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Agent-registry-provider topology showing gRPC and Pulse Streams connections" class="img-fluid" >}}

**Benefici:**
- **Rilevamento dinamico** - Gli agenti trovano gli strumenti in fase di esecuzione, non in fase di compilazione
- **Scala multi-cluster** - I nodi del registro si coordinano automaticamente tramite Redis
- **Federazione di registri pubblici** - Importazione di strumenti da Anthropic, OpenAI o qualsiasi registro MCP
- **Monitoraggio dello stato di salute** - Controlli automatici di ping/pong con soglie configurabili
- **Importazione selettiva** - Includi/escludi modelli per un controllo granulare

→ Maggiori informazioni in [Integrazione MCP](mcp-integration/) e [Produzione](production/)

---

## Riepilogo delle caratteristiche principali

| Caratteristiche | Cosa si ottiene |
|---------|--------------|
| [Agenti Design-First](#design-first-agents) | Definizione degli agenti in DSL, generazione di codice type-safe |
| [Integrazione MCP](mcp-integration/) | Supporto nativo del Model Context Protocol |
| [Tool Registries](#tool-registries) | Rilevamento in cluster + federazione di registri pubblici |
| [Run Trees](#run-trees-composition) | Agenti che chiamano agenti con tracciabilità completa |
| [Structured Streaming](#structured-streaming) | Eventi digitati in tempo reale per le interfacce utente e osservabilità |
| [Temporal Durability](#temporal-durability) | Esecuzione tollerante ai guasti che sopravvive ai fallimenti |
| [Contratti tipizzati](dsl-reference/) | Sicurezza di tipo end-to-end per tutte le operazioni dello strumento |

## Guide alla documentazione

| Guida | Descrizione | ~Tokens |
|-------|-------------|---------|
| [Quickstart](quickstart/) | Installazione e primo agente | ~2,700 |
| [DSL Reference](dsl-reference/) | DSL completo: agenti, toolset, policy, MCP | ~3.600 |
| [Runtime](runtime/) | Architettura del runtime, ciclo di pianificazione/esecuzione, motori | ~2,400 |
| [Toolsets](toolsets/) | Tipi di toolset, modelli di esecuzione, trasformazioni | ~2,300 |
| [Agent Composition](agent-composition/) | Agent-as-tool, alberi di esecuzione, topologia di streaming | ~1.400 |
| [Integrazione MCP](mcp-integration/) | Server MCP, trasporti, wrapper generati | ~1.200 |
| [Memoria e sessioni](memory-sessions/) | Trascrizioni, archivi di memoria, sessioni, esecuzioni | ~1.600 |
| [Produzione](production/) | Impostazione temporale, UI in streaming, integrazione del modello | ~2.200 |
| [Test e risoluzione dei problemi](testing/) | Agenti di test, pianificatori, strumenti, errori comuni | ~2.000 |

**Sezione totale:** ~21.400 gettoni

## Architettura

Goa-AI segue una pipeline **define → generate → execute** che trasforma i progetti dichiarativi in sistemi di agenti pronti per la produzione.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**Panoramica dei livelli

| Strato | Scopo |
|-------|---------|
| **DSL** | Dichiarare agenti, strumenti, politiche e integrazioni esterne in codice Go controllato dalla versione
| **Codegen** | Generare specifiche, codec, definizioni di workflow e client di registro sicuri per il tipo, senza mai modificare `gen/` |
**Runtime** | Eseguire il ciclo di pianificazione/esecuzione con l'applicazione dei criteri, la persistenza della memoria e lo streaming degli eventi
| **Engine** | Scambia i backend di esecuzione: in-memory per lo sviluppo, Temporal per la durabilità in produzione |
| **Features** | Plug in model provider (OpenAI, Anthropic, AWS Bedrock), persistenza (Mongo), streaming (Pulse) e registri |

**Punti chiave di integrazione

- **Clienti di modello** - Astraggono i provider LLM dietro un'interfaccia unificata; passano da OpenAI, Anthropic o Bedrock senza modificare il codice dell'agente
- **Registro** - Scoprire e invocare set di strumenti attraverso i confini dei processi; clusterizzato tramite Redis per una scalabilità orizzontale
- **Pulse Streaming** - Bus di eventi in tempo reale per aggiornamenti dell'interfaccia utente, pipeline di osservabilità e comunicazione tra servizi
- **Motore temporale** - Esecuzione durevole del flusso di lavoro con tentativi automatici, replay e recupero degli arresti anomali

### Fornitori di modelli ed estensibilità {#model-providers}

Goa-AI fornisce adattatori di prima classe per tre provider LLM:

- **OpenAI** (`features/model/openai`)
- **Anthropic Claude** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)

Tutti e tre implementano la stessa interfaccia `model.Client` utilizzata dai pianificatori. Le applicazioni registrano i client del modello con il runtime usando `rt.RegisterModel("provider-id", client)` e si riferiscono a loro tramite l'ID dai pianificatori e dalle configurazioni degli agenti generati, quindi il cambio di provider è una modifica della configurazione piuttosto che una riprogettazione.

L'aggiunta di un nuovo fornitore segue lo stesso schema:

1. Implementare `model.Client` per il proprio provider, mappando i suoi tipi SDK su `model.Request`, `model.Response` e streaming `model.Chunk`.
2. Opzionalmente, avvolgere il client con un middleware condiviso (ad esempio, `features/model/middleware.NewAdaptiveRateLimiter`) per la limitazione adattiva della velocità e le metriche.
3. Richiamare `rt.RegisterModel("my-provider", client)` prima di registrare gli agenti, quindi fare riferimento a `"my-provider"` dai pianificatori o dalle configurazioni degli agenti.

Poiché i pianificatori e il runtime dipendono solo da `model.Client`, i nuovi provider si inseriscono senza modificare i progetti di Goa o il codice degli agenti generati.

## Esempio rapido

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("calculator", func() {
    Description("Calculator service with an AI assistant")
    
    // Define a service method that the tool will bind to
    Method("add", func() {
        Description("Add two numbers")
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(Int)
    })
    
    // Define the agent within the service
    Agent("assistant", "A helpful assistant agent", func() {
        // Use a toolset with tools bound to service methods
        Use("calculator", func() {
            Tool("add", "Add two numbers", func() {
                Args(func() {
                    Attribute("a", Int, "First number")
                    Attribute("b", Int, "Second number")
                    Required("a", "b")
                })
                Return(Int)
                BindTo("add")  // Bind to the service method
            })
        })
        
        // Configure the agent's run policy
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

## Iniziare

Iniziare con la guida [Quickstart] (quickstart/) per installare Goa-AI e creare il primo agente.

Per una copertura completa del DSL, vedere [DSL Reference](dsl-reference/).

Per comprendere l'architettura del runtime, consultare la guida [Runtime](runtime/).
