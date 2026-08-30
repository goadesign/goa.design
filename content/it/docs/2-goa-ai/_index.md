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

Quando il codice del planner costruisce questa chiamata con
`planner.NewToolRequest`, gli errori di codifica generati vengono restituiti
direttamente al planner. Quando un modello emette argomenti non conformi allo
schema, per esempio una stringa `code` vuota o `language: "cobol"`, il client
del modello validato restituisce `model.OutputValidationError`; il
planner/runtime espone `planner.OutputContractError` prima che venga eseguito
il codice dell'executor o del servizio.

`ToolFailure` e `RecoveryCorrectCall` si applicano in un momento successivo:
una chiamata prodotta dal modello deve prima superare la validazione ed essere
ammessa, quindi il suo executor o il confine di dominio deve restituire un
errore recuperabile. Il runtime usa quell'errore per guidare il turno
successivo del planner, senza analisi ad hoc delle stringhe né schemi JSON
gestiti manualmente.

**Vantaggi:**
- **Fonte unica della verità**: il DSL definisce comportamento, tipologie e documentazione
- **Sicurezza in fase di compilazione**: rileva i payload non corrispondenti prima del runtime
- **Client generati automaticamente**: invocazioni di strumenti indipendenti dai tipi senza cablaggio manuale
- **Modelli coerenti**: ogni agente segue la stessa struttura
- **Errori di esecuzione riparabili**: le chiamate del modello già ammesse possono restituire dettagli tipizzati dell'errore e direttive di recupero

→ Scopri di più nelle sezioni [DSL Reference](dsl-reference/) e [Quickstart](quickstart/)

---

### Valutazioni generate {#generated-evaluations}

**L'agente è cambiato. Le sue risposte sono peggiorate?**

Le valutazioni sono test ripetibili che eseguono l'agente reale e verificano
che il risultato resti corretto. Goa-AI genera l'infrastruttura di valutazione
dallo stesso design che definisce l'agente:

```go
Agent("chat", "Answers product questions.", func() {
    Suite("chat", func() {
        Description("Exercises production Chat outcomes.")
        Timeout("2m")
        Scenario("alarm_inventory", func() {
            Description("Retrieves every alarm in a fixed window.")
            Input(ChatEvalInput)          // typed, validated scenario input
            Tags("production", "alarm")
        })
    })
})
```

`goa gen` trasforma ogni scenario in un metodo di interfaccia Go tipizzato:
aggiungere uno scenario interrompe la compilazione finché l'applicazione non lo
implementa. `goa example` crea una volta il comando eseguibile
`cmd/<suite>-evals`. Gli hook restituiscono verifiche esatte pass/fail e
affermazioni in linguaggio naturale sulla risposta; un giudice basato su
modello valuta ogni affermazione solo dopo aver superato un test di
calibrazione.

**Vantaggi:**
- **Scenari posseduti dal design**: casi di test accanto all'agente, con input tipizzati e validati
- **Nessuna deriva silenziosa**: uno scenario senza implementazione è un errore di compilazione
- **Nessuna valutazione con espressioni regolari**: affermazioni chiare valutate da un modello calibrato
- **Pronto per la CI**: selezione per scenario e tag, concorrenza limitata e report JSON stabili nell'ordine del design

→ Scopri di più in [Valutazioni generate](evaluations/)

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

Codegen emette `gen/<service>/completions/` con schema e codec privati e helper
pubblici tipizzati. Gli helper unary restituiscono il valore tipizzato
accettato. Gli helper di streaming restituiscono `completion.Streamer[T]`:
`Recv` produce frammenti `completion_delta` validi solo come anteprima e
`Value()` restituisce il risultato tipizzato soltanto dopo che il provider ha
chiuso uno stream valido. I provider che non implementano lo structured output
falliscono esplicitamente con `model.ErrStructuredOutputUnsupported`; un output
malformato fallisce con un `planner.OutputContractError` non riprovabile.

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
rt := runtime.New(runtimeStore, runtime.WithStream(mySink))
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
rt := runtime.New(storageinmem.New())

// Production: Temporal for durability
eng, _ := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtimeStore, runtime.WithEngine(eng))
```

**Vantaggi:**
- **Nessuna inferenza sprecata**: gli strumenti non riusciti riprovano senza richiamare LLM
- **Recupero da crash**: riavvia i lavoratori in qualsiasi momento; le corse riprendono dall'ultimo checkpoint
- **Gestione dei limiti di velocità**: il backoff esponenziale assorbe la limitazione delle API
- **Distribuzione consapevole delle versioni**: seguire il [contratto di rollout in produzione](production/#transparent-rollouts) per release rolling compatibili e modifiche generate incompatibili

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

| Funzionalità | Cosa offre |
|---|---|
| [Agenti design-first](#design-first-agents) | Agenti dichiarati nel DSL e codice generato tipizzato |
| [Valutazioni generate](#generated-evaluations) | Scenari dichiarati nel design, hook tipizzati e report valutati da un giudice calibrato |
| [Integrazione MCP](mcp-integration/) | Supporto nativo del Model Context Protocol |
| [Registri degli strumenti](#tool-registries) | Individuazione in cluster e federazione con registri pubblici |
| [Alberi dei run](#run-trees-composition) | Agenti che chiamano altri agenti con tracciabilità completa |
| [Streaming strutturato](#structured-streaming) | Eventi tipizzati in tempo reale per UI e osservabilità |
| [Durabilità Temporal](#temporal-durability) | Esecuzione resistente agli errori |
| [Storage del runtime](memory-sessions/#runtime-store) | Un unico storage dell'host per stato delle esecuzioni, checkpoint di continuazione e record immutabili |
| [Contratti tipizzati](dsl-reference/) | Sicurezza dei tipi end-to-end per le operazioni degli strumenti |
| [Completion dirette tipizzate](#typed-direct-completions) | Risposte finali strutturate con codec e helper generati |
| [Risultati limitati e server-data](toolsets/#server-data) | Risultati compatti per il modello e dati solo server per UI e audit |
| [Input umano](runtime/#external-input-and-workflow-continuations) | Continuazioni tipizzate, risultati esterni e conferme applicate dal runtime |
| [Strumenti bookkeeping e terminali](dsl-reference/#bookkeeping) | Record di stato senza costo di retrieval e commit terminali atomici |
| [Override dei prompt](production/#prompt-overrides-with-mongo-store) | Prompt baseline, override Mongo con scope e provenienza |

## Guide alla documentazione

| Guida | Descrizione | ~Token |
|---|---|---|
| [Quickstart](quickstart/) | Installazione e primo agente | ~2.700 |
| [Riferimento DSL](dsl-reference/) | DSL completo: agenti, toolset, policy, MCP | ~3.600 |
| [Runtime](runtime/) | Architettura, ciclo plan/execute e engine | ~2.400 |
| [Toolset](toolsets/) | Tipi, modelli di esecuzione e trasformazioni | ~2.300 |
| [Composizione degli agenti](agent-composition/) | Agent-as-tool, alberi dei run e streaming | ~1.400 |
| [Valutazioni generate](evaluations/) | Suite tipizzate, hook, calibrazione e report | ~2.600 |
| [Integrazione MCP](mcp-integration/) | Server MCP, trasporti e wrapper generati | ~1.200 |
| [Memoria e sessioni](memory-sessions/) | Trascrizioni, store, sessioni e run | ~1.600 |
| [Produzione](production/) | Temporal, streaming UI e modelli | ~2.200 |
| [Test e risoluzione dei problemi](testing/) | Test di agenti, planner e strumenti | ~2.000 |

**Totale sezione:** ~24.000 token

## Architettura

Goa-AI segue una pipeline **definisci → genera → esegui** che trasforma i progetti dichiarativi in ​​sistemi di agenti pronti per la produzione.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**Panoramica dei livelli:**

| Livello | Scopo |
|---|---|
| **DSL** | Dichiara agenti, strumenti, policy e integrazioni esterne in codice Go versionato |
| **Codegen** | Genera specifiche, codec, workflow e client del registro tipizzati; non modificare mai `gen/` |
| **Runtime** | Esegue il ciclo plan/execute con policy, storage del runtime obbligatorio di proprietà dell'host, memoria di prodotto facoltativa e streaming |
| **Engine** | Sostituisce il backend: in memoria per lo sviluppo, Temporal per la durabilità |
| **Funzionalità** | Integra provider di modelli, Mongo, Pulse e registri |

**Punti chiave di integrazione:**

- **Clienti modello**: fornitori LLM astratti dietro un'interfaccia unificata; passare da OpenAI, Anthropic, Bedrock o Vertex AI (Gemini o Claude-on-Vertex) senza modificare il codice agente
- **Registro**: scopri e richiama set di strumenti oltre i confini del processo; raggruppati tramite Redis per il ridimensionamento orizzontale
- **Pulse Streaming**: bus di eventi in tempo reale per aggiornamenti dell'interfaccia utente, pipeline di osservabilità e comunicazione tra servizi
- **Temporal Engine**: esecuzione durevole con retry delle activity, replay e ripristino dopo un arresto anomalo

### Provider di modelli ed estensibilità {#model-providers}

Goa-AI fornisce adattatori di prima classe per quattro fornitori LLM:

- **OpenAI** (`features/model/openai`)
- **Claude antropico** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)
- **Google Vertex AI** (`features/model/vertex`) — un adattatore Gemini nativo più un helper di pura costruzione per i modelli Claude ospitati su Vertex (che delega traduzione e classificazione degli errori a `features/model/anthropic`)

Tutti e quattro implementano la stessa interfaccia `model.Client` utilizzata dai pianificatori. Le applicazioni registrano i client modello con il runtime utilizzando `rt.RegisterModel("provider-id", client)` e fanno riferimento ad essi tramite l'ID dei pianificatori e le configurazioni degli agenti generate, quindi lo scambio di provider è una modifica della configurazione anziché una riprogettazione.

I modelli di classe Gemini 3 allegano una thought signature opaca alle parti di
chiamata strumento (`functionCall`) per autenticare il ragionamento che le ha
prodotte. Il runtime cattura e ricollega questa firma interamente per conto
proprio — non è mai esposta sui tipi rivolti al pianificatore — quindi il
codice del pianificatore è identico indipendentemente dal fatto che il modello
configurato usi questa funzionalità. Vedi
[Runtime → Integrazione LLM](./runtime/#integrazione-llm) per i dettagli.

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
