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

Goa-AI estende la filosofia di Goa, incentrata sul design, ai sistemi ad agenti. Definire agenti, set di strumenti, completamenti di proprietà del servizio e policy in una DSL; generare codice pronto per la produzione con contratti digitati, flussi di lavoro durevoli ed eventi in streaming.

---

## Perché Goa-AI?

### Agenti Design-First {#design-first-agents}

**Smettere di scrivere codice agente fragile. Inizia con i contratti.**

La maggior parte dei framework di agenti prevede il collegamento obbligatorio di prompt, strumenti e chiamate API. Quando le cose si interrompono, e lo faranno, stai eseguendo il debug di codice sparso senza una chiara fonte di verità.

Goa-AI capovolge questo: **definisci le capacità del tuo agente in una DSL digitata**, quindi genera l'implementazione. Il tuo design *è* la tua documentazione. I tuoi contratti *sono* la tua convalida. Le modifiche si propagano automaticamente.

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

Quando un pianificatore chiama questo strumento con argomenti non validi, ad esempio un `code` vuoto
stringa o `language: "cobol"` - Goa-AI rifiuta la chiamata al limite digitato e
restituisce un suggerimento strutturato per il nuovo tentativo. Il tuo pianificatore può utilizzare questo suggerimento per chiedere una risposta precisa
domanda successiva o riprovare con gli argomenti corretti. Nessuna analisi delle stringhe ad hoc
o è richiesto uno schema JSON gestito manualmente.

**Vantaggi:**
- **Fonte unica della verità**: il DSL definisce comportamento, tipologie e documentazione
- **Sicurezza in fase di compilazione**: rileva i payload non corrispondenti prima del runtime
- **Client generati automaticamente**: invocazioni di strumenti indipendenti dai tipi senza cablaggio manuale
- **Modelli coerenti**: ogni agente segue la stessa struttura
- **Chiamate di strumenti riparabili**: gli errori di convalida producono suggerimenti strutturati per nuovi tentativi con feedback

→ Scopri di più nelle sezioni [DSL Reference](dsl-reference/) e [Quickstart](quickstart/)

---

### Completamenti diretti digitati {#typed-direct-completations}

**Non tutte le interazioni strutturate dovrebbero essere una chiamata a uno strumento.**

A volte il contratto giusto è una risposta finale digitata dall'assistente: nessuno strumento
invocazione, nessuna analisi JSON scritta a mano, nessuna definizione di schema parallelo nascosta
testo immediato.

Modelli Goa-AI che esplicitamente con `Completion(...)` su un servizio:

```go
var TaskDraft = Type("TaskDraft", func() {
    Attribute("name", String, "Task name")
    Attribute("goal", String, "Outcome-style goal")
    Required("name", "goal")
})

var _ = Service("tasks", func() {
    Completion("draft_from_transcript", "Produce a task draft directly", func() {
        Return(TaskDraft)
    })
})
```

I nomi di completamento fanno parte del contratto di output strutturato. Devono esserlo
Da 1 a 64 caratteri ASCII, possono contenere lettere, cifre, `_` e `-` e devono
iniziare con una lettera o una cifra.

Codegen emette `gen/<service>/completions/` con lo schema JSON, codec digitati,
e generato aiutanti che richiedono output strutturato imposto dal provider e
decodificare la risposta finale dell'assistente attraverso il codec generato. Streaming
gli aiutanti rimangono sulla superficie grezza `model.Streamer`: i pezzi `completion_delta` sono
solo in anteprima, esattamente un blocco finale `completion` è canonico e generato
Gli helper `Decode<Name>Chunk(...)` decodificano solo il payload finale. Fornitori che
non implementare l'output strutturato in modo esplicito con
`model.ErrStructuredOutputUnsupported`.

**Vantaggi:**
- **Una superficie contrattuale**: riutilizza tipi Goa, convalide e `OneOf` per l'output dell'assistente diretto
- **Nessun JSON analizzato manualmente**: codifica, decodifica e convalida dei codec generati
- **Output strutturato indipendente dal provider**: l'helper nasconde il cablaggio del provider dietro un'API digitata

→ Scopri di più nelle sezioni [DSL Reference](dsl-reference/) e [Runtime](runtime/)

---

### Run Trees {#run-trees-composition}

**Costruisci sistemi complessi partendo da elementi semplici e osservabili.**

Le applicazioni IA del mondo reale non sono singoli agenti: sono flussi di lavoro orchestrati in cui gli agenti delegano ad altri agenti, gli strumenti generano attività secondarie ed è necessario tenere traccia di tutto.

Il **modello run tree** di Goa-AI ti offre un'esecuzione gerarchica con piena osservabilità. Ogni esecuzione dell'agente ha un ID univoco. Il bambino esegue il collegamento ai genitori. Gli eventi vengono trasmessi in tempo reale. Eseguire il debug di eventuali errori camminando sull'albero.

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees showing parent-child relationships" class="img-fluid" >}}

**Vantaggi:**
- **Agent-as-tool**: qualsiasi agente può essere richiamato come strumento da un altro agente
- **Tracciamento gerarchico**: segui l'esecuzione oltre i confini dell'agente
- **Errori isolati**: le esecuzioni secondarie falliscono in modo indipendente; i genitori possono riprovare o recuperare
- **Topologia streaming**: gli eventi scorrono lungo l'albero per interfacce utente in tempo reale

→ Approfondimento su [Agent Composition](agent-composition/) e [Runtime](runtime/)

---

### Streaming strutturato {#streaming-strutturato}

**Visibilità in tempo reale su ogni decisione presa dai tuoi agenti.**

Gli agenti black-box sono una responsabilità. Quando il tuo agente chiama uno strumento, inizia a pensare o riscontra un errore, devi saperlo *immediatamente*, non dopo che la richiesta è scaduta.

Goa-AI emette **eventi tipizzati** durante l'esecuzione: `assistant_reply` per il testo in streaming, `tool_start`/`tool_end` per il ciclo di vita dello strumento, `planner_thought` per la visibilità del ragionamento, `usage` per il tracciamento dei token. Gli eventi fluiscono attraverso una semplice interfaccia **Sink** verso qualsiasi trasporto e le UI di produzione consumano un singolo **flusso di proprietà della sessione** (`session/<session_id>`) e si chiudono quando osservano `run_stream_end` per l'esecuzione attiva.

```go
// Wire a sink at startup — all events from all runs flow through it
rt := runtime.New(runtime.WithStream(mySink))
```

**Profili di flusso** filtrano gli eventi per diversi consumatori: `UserChatProfile()` per le interfacce utente degli utenti finali, `AgentDebugProfile()` per le visualizzazioni sviluppatore, `MetricsProfile()` per le pipeline di osservabilità. I sink integrati per Pulse (Redis Streams) consentono lo streaming distribuito tra servizi.

**Vantaggi:**
- **Indipendente dal trasporto**: gli stessi eventi funzionano su WebSocket, SSE, Pulse o backend personalizzati
- **Contratti digitati** — Nessuna analisi delle stringhe; gli eventi sono fortemente tipizzati con payload documentati
- **Consegna selettiva**: i profili di streaming filtrano gli eventi per consumatore
- **Predisposizione multi-tenant**: gli eventi trasportano `RunID` e `SessionID` per il routing e il filtraggio

→ Dettagli di implementazione in [Production Streaming](production/#streaming-ui)

---

### Durabilità temporale {#temporal-durability}

**Esecuzioni dell'agente che sopravvivono a arresti anomali, riavvii ed errori di rete.**

Senza durabilità, un processo bloccato perde tutti i progressi. Una chiamata API a velocità limitata non riesce l'intera esecuzione. Un errore di rete durante l'esecuzione dello strumento significa rieseguire un'inferenza costosa.

Goa-AI utilizza **Temporal** per un'esecuzione duratura. Le esecuzioni dell'agente diventano flussi di lavoro; le chiamate allo strumento diventano attività con tentativi configurabili. Ogni transizione di stato è persistente. Uno strumento bloccato riprova automaticamente, *senza* rieseguire la chiamata LLM che lo ha prodotto.

```go
// Development: in-memory (no dependencies)
rt := runtime.New()

// Production: Temporal for durability
eng, _ := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtime.WithEngine(eng))
```

**Vantaggi:**
- **Nessuna inferenza sprecata**: gli strumenti non riusciti riprovano senza richiamare LLM
- **Recupero da crash**: riavvia i lavoratori in qualsiasi momento; le corse riprendono dall'ultimo checkpoint
- **Gestione dei limiti di velocità**: il backoff esponenziale assorbe la limitazione delle API
- **Distribuzione sicura**: le distribuzioni ripetute non perdono il lavoro in volo

→ Guida all'installazione e riprovare la configurazione in [Production](production/#temporal-setup)

---

### Registri degli strumenti {#tool-registries}

**Scopri e utilizza strumenti ovunque: dal tuo cluster o dal cloud pubblico.**

Man mano che gli ecosistemi AI crescono, gli strumenti sono ovunque: servizi interni, API di terze parti, registri MCP pubblici. Le definizioni degli strumenti di hardcoding non sono scalabili. Hai bisogno di una scoperta dinamica.

Goa-AI fornisce un **registro interno in cluster** per i tuoi set di strumenti e una **federazione** con registri esterni come il catalogo MCP di Anthropic. Definisci una volta, scopri ovunque.

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

**Clustering del registro interno:**

Più nodi del registro con lo stesso nome formano automaticamente un cluster tramite Redis. Stato condiviso, controlli sanitari coordinati, scalabilità orizzontale: tutto automatico.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Agent-registry-provider topology showing gRPC and Pulse Streams connections" class="img-fluid" >}}

**Vantaggi:**
- **Individuazione dinamica**: gli agenti trovano gli strumenti in fase di esecuzione, non in fase di compilazione
- **Ridimensionamento multi-cluster**: coordinazione automatica dei nodi del registro tramite Redis
- **Federazione di registri pubblici**: importa strumenti da Anthropic, OpenAI o qualsiasi registro MCP
- **Monitoraggio dello stato**: controlli ping/pong automatici con soglie configurabili
- **Importazione selettiva**: includi/escludi modelli per un controllo granulare

→ Ulteriori informazioni in [MCP Integration](mcp-integration/) e [Production](production/)

---

## Riepilogo delle caratteristiche principali

| Caratteristica | Cosa ottieni ||---------|--------------|
| [Design-First Agents](#design-first-agents) | Definire agenti in DSL, generare codice indipendente dai tipi || [MCP Integration](mcp-integration/) | Supporto del protocollo di contesto del modello nativo || [Tool Registries](#tool-registries) | Discovery in cluster + federazione del registro pubblico || [Run Trees](#run-trees-composition) | Agenti che chiamano agenti con tracciabilità completa || [Structured Streaming](#structured-streaming) | Eventi tipizzati in tempo reale per interfaccia utente e osservabilità || [Temporal Durability](#temporal-durability) | Esecuzione con tolleranza agli errori che sopravvive ai guasti || [Typed Contracts](dsl-reference/) | Sicurezza di tipo end-to-end per tutte le operazioni dell'utensile || [Typed Direct Completions](#typed-direct-completions) | Risposte finali strutturate dell'assistente con codec e aiutanti generati || [Bounded Results & Server Data](toolset/#server-data) | Risultati del modello efficiente in termini di token più dati solo server per interfacce utente e audit || [Human-in-the-Loop](runtime/#pause--resume) | Pausa, ripresa, risultati di strumenti esterni e conferma applicata dal runtime || [Bookkeeping & Terminal Tools](dsl-reference/#bookkeeping) | Strumenti di avanzamento/stato che non consumano il budget di recupero e possono terminare le esecuzioni in modo atomico || [Prompt Overrides](production/#prompt-overrides-with-mongo-store) | Specifiche del prompt di base più sostituzioni e provenienza supportate da Mongo |

## Guide alla documentazione

| Guida | Descrizione | ~Gettoni ||-------|-------------|---------|
| [Quickstart](quickstart/) | Installazione e primo agente | ~2.700 || [DSL Reference](dsl-reference/) | DSL completo: agenti, set di strumenti, policy, MCP | ~3.600 || [Runtime](runtime/) | Architettura runtime, ciclo di pianificazione/esecuzione, motori | ~2.400 || [Toolsets](toolset/) | Tipi di set di strumenti, modelli di esecuzione, trasformazioni | ~2.300 || [Agent Composition](agent-composition/) | Agente come strumento, alberi di esecuzione, topologia di streaming | ~1.400 || [MCP Integration](mcp-integration/) | Server MCP, trasporti, wrapper generati | ~1.200 || [Memory & Sessions](memory-sessions/) | Trascrizioni, archivi di memoria, sessioni, corse | ~1.600 || [Production](production/) | Configurazione temporale, interfaccia utente in streaming, integrazione del modello | ~2.200 || [Testing & Troubleshooting](testing/) | Agenti di test, pianificatori, strumenti, errori comuni | ~2.000 |

**Sezione totale:** ~21.400 token

## Architettura

Goa-AI segue una pipeline **definisci → genera → esegui** che trasforma i progetti dichiarativi in ​​sistemi di agenti pronti per la produzione.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**Panoramica dei livelli:**

| Strato | Scopo ||-------|---------|
| **ADSL** | Dichiara agenti, strumenti, policy e integrazioni esterne nel codice Go controllato dalla versione || **Codegene** | Genera specifiche indipendenti dai tipi, codec, definizioni del flusso di lavoro e client del registro: non modificare mai `gen/` || **Durata** | Esegui il ciclo di pianificazione/esecuzione con applicazione delle policy, persistenza della memoria e streaming di eventi || **Motore** | Backend di esecuzione dello scambio: in memoria per lo sviluppo, temporale per la durabilità della produzione || **Caratteristiche** | Collega fornitori di modelli (OpenAI, Anthropic, AWS Bedrock), persistenza (Mongo), streaming (Pulse) e registri |

**Punti chiave di integrazione:**

- **Clienti modello**: fornitori LLM astratti dietro un'interfaccia unificata; passare da OpenAI, Anthropic o Bedrock senza modificare il codice agente
- **Registro**: scopri e richiama set di strumenti oltre i confini del processo; raggruppati tramite Redis per il ridimensionamento orizzontale
- **Pulse Streaming**: bus di eventi in tempo reale per aggiornamenti dell'interfaccia utente, pipeline di osservabilità e comunicazione tra servizi
- **Temporal Engine**: esecuzione duratura del flusso di lavoro con tentativi automatici, riproduzione e ripristino da arresto anomalo

### Provider di modelli ed estensibilità {#model-providers}

Goa-AI fornisce adattatori di prima classe per tre fornitori LLM:

- **OpenAI** (`features/model/openai`)
- **Claude antropico** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)

Tutti e tre implementano la stessa interfaccia `model.Client` utilizzata dai pianificatori. Le applicazioni registrano i client modello con il runtime utilizzando `rt.RegisterModel("provider-id", client)` e fanno riferimento ad essi tramite l'ID dei pianificatori e le configurazioni degli agenti generate, quindi lo scambio di provider è una modifica della configurazione anziché una riprogettazione.

L'aggiunta di un nuovo provider segue lo stesso schema:

1. Implementa `model.Client` per il tuo provider mappando i suoi tipi SDK su `model.Request`, `model.Response` e trasmettendo in streaming `model.Chunk`.
2. Facoltativamente, avvolgere il client con middleware condiviso (ad esempio, `features/model/middleware.NewAdaptiveRateLimiter`) per la limitazione della velocità e le metriche adattive.
3. Chiama `rt.RegisterModel("my-provider", client)` prima di registrare gli agenti, quindi fai riferimento a `"my-provider"` dai tuoi pianificatori o dalle configurazioni degli agenti.

Poiché i pianificatori e il runtime dipendono solo da `model.Client`, i nuovi fornitori si collegano senza modifiche ai progetti Goa o al codice agente generato.

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

Inizia con la guida [Quickstart](quickstart/) per installare Goa-AI e creare il tuo primo agente.

Per una copertura DSL completa, vedere [DSL Reference](dsl-reference/).

Per comprendere l'architettura di runtime, vedere la guida [Runtime](runtime/).