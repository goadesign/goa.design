---
title: Riferimento DSL
weight: 2
description: "Complete reference for Goa-AI's DSL functions - agents, toolsets, policies, and MCP integration."
llm_optimized: true
aliases:
---

Questo documento fornisce un riferimento completo per le funzioni DSL di Goa-AI. Utilizzalo insieme alla guida [Runtime](./runtime.md) per comprendere in che modo i progetti si traducono in comportamento in fase di esecuzione.

## Riferimento rapido DSL


| Funzione | Contesto | Descrizione || ------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Funzioni dell'agente** |                          |                                                                                                                    || `Agent` | Servizio | Definisce un agente basato su LLM || `Completion` | Servizio | Dichiara contratto di proprietà di tipo assistente diretto-output || `Use` | Agente | Dichiara il consumo del set di strumenti || `Export` | Agente, Servizio | Espone i set di strumenti ad altri agenti || `AgentToolset` | Utilizzare l'argomento | Set di strumenti di riferimento da un altro agente || `UseAgentToolset` | Agente | Alias ​​per AgentToolset + Usa || `Passthrough` | Strumento (in Esportazione) | Metodo di inoltro deterministico al servizio || `DisableAgentDocs` | API | Disabilita la generazione di AGENTS_QUICKSTART.md || **Funzioni del set di strumenti** |                          |                                                                                                                    || `Toolset` | Livello superiore | Dichiara un set di strumenti di proprietà del provider || `FromMCP` | Argomento del set di strumenti | Configura il set di strumenti supportato da MCP || `FromRegistry` | Argomento del set di strumenti | Configura il set di strumenti supportati dal registro || `Description` | Set di strumenti | Imposta la descrizione del set di strumenti || **Funzioni strumento** |                          |                                                                                                                    || `Tool` | Set di strumenti, Metodo | Definisce uno strumento richiamabile || `Args` | Strumento | Definisce lo schema dei parametri di input || `Return` | Strumento, Completamento | Definisce lo schema dei risultati visibili nel modello || `ServerData` | Strumento | Definisce lo schema dei dati solo del server (mai inviato ai fornitori di modelli) || `FromMethodResultField` | Dati server | Proietta i dati del server da un campo risultato del metodo di servizio associato || `AudienceTimeline` | Dati server | Contrassegna i dati del server come idonei per sequenza temporale/interfaccia utente (impostazione predefinita) || `AudienceInternal` | Dati server | Contrassegna i dati del server come allegato di composizione interna || `AudienceEvidence` | Dati server | Contrassegna i dati del server come provenienza o prova di controllo || `BoundedResult` | Strumento | Dichiara un contratto con risultati limitati di proprietà del runtime; il sub-DSL opzionale può dichiarare i campi del cursore di paging || `Cursor` | Risultato limitato | Dichiara quale campo del payload trasporta il cursore di paging (opzionale) || `NextCursor` | Risultato limitato | Dichiara il nome del campo del risultato previsto per il cursore della pagina successiva (facoltativo) || `Idempotent` | Strumento | Contrassegna lo strumento come idempotente all'interno di una trascrizione dell'esecuzione; consente la deduplicazione sicura delle trascrizioni incrociate per chiamate identiche || `Tags` | Strumento, set di strumenti | Allega etichette di metadati || `BindTo` | Strumento | Associa lo strumento al metodo del servizio || `Inject` | Strumento | Contrassegna i campi come inseriti dal runtime || `CallHintTemplate` | Strumento | Modello di visualizzazione per le invocazioni || `ResultHintTemplate` | Strumento | Modello di visualizzazione dei risultati || `ResultReminder` | Strumento | Promemoria di sistema statico dopo il risultato dello strumento || `Confirmation` | Strumento | Richiede una conferma esplicita fuori banda prima dell'esecuzione || `TerminalRun` | Strumento | Contrassegna il terminale dello strumento: l'esecuzione viene completata immediatamente dopo l'esecuzione (nessun turno di pianificazione successivo) || `Bookkeeping` | Strumento | Contrassegna lo strumento come contabilità: le chiamate non consumano il budget di recupero `MaxToolCalls` a livello di esecuzione e rimangono nascoste ai futuri turni di pianificazione per impostazione predefinita || `PlannerVisible` | Strumento | Mantiene visibile un risultato contabile non terminale al turno successivo del pianificatore || **Funzioni politiche** |                          |                                                                                                                    || `RunPolicy` | Agente | Configura i vincoli di esecuzione || `DefaultCaps` | EseguiPolitica | Imposta i limiti delle risorse || `MaxToolCalls` | DefaultCaps | Numero massimo di invocazioni dello strumento || `MaxConsecutiveFailedToolCalls` | DefaultCaps | Numero massimo di guasti consecutivi || `TimeBudget` | EseguiPolitica | Limite semplice dell'orologio da parete || `Timing` | EseguiPolitica | Configurazione dettagliata del timeout || `Budget` | Tempi | Budget di gestione complessivo || `Plan` | Tempi | Timeout attività pianificatore || `Tools` | Tempi | Timeout attività strumento || `History` | EseguiPolitica | Gestione della cronologia delle conversazioni || `KeepRecentTurns` | Storia | Politica della finestra scorrevole || `Compress` | Storia | Riepilogo assistito dal modello || `Cache` | EseguiPolitica | Richiedi configurazione della memorizzazione nella cache || `AfterSystem` | Cache | Punto di controllo dopo i messaggi di sistema || `AfterTools` | Cache | Punto di controllo dopo le definizioni degli strumenti || `InterruptsAllowed` | EseguiPolitica | Abilita pausa/riprendi || `OnMissingFields` | EseguiPolitica | Comportamento di convalida || **Funzioni MCP** |                          |                                                                                                                    || `MCP` | Servizio | Abilita il supporto MCP || `ProtocolVersion` | Opzione MCP | Imposta la versione del protocollo MCP || `Tool` | Metodo | Contrassegna un metodo come strumento MCP in un servizio abilitato per MCP || `Toolset(FromMCP(...))` | Livello superiore | Dichiara un set di strumenti derivati ​​da MCP supportati da Goa || `Toolset("name", FromExternalMCP(...), func() { ... })` | Livello superiore | Dichiara un set di strumenti MCP esterno con schemi in linea || `Resource` | Metodo | Contrassegna il metodo come risorsa MCP || `WatchableResource` | Metodo | Contrassegna il metodo come risorsa sottoscrivibile || `StaticPrompt` | Servizio | Aggiunge il modello di prompt statico || `DynamicPrompt` | Metodo | Contrassegna il metodo come generatore di prompt || `Notification` | Metodo | Contrassegna il metodo come mittente della notifica || `Subscription` | Metodo | Contrassegna il metodo come gestore della sottoscrizione || `SubscriptionMonitor` | Metodo | Monitor SSE per abbonamenti || **Funzioni di registro** |                          |                                                                                                                    || `Registry` | Livello superiore | Dichiara un'origine del registro || `URL` | Registro | Imposta l'endpoint del registro || `APIVersion` | Registro | Imposta la versione API || `Timeout` | Registro | Imposta il timeout HTTP || `Retry` | Registro | Configura la policy di ripetizione || `SyncInterval` | Registro | Imposta l'intervallo di aggiornamento del catalogo || `CacheTTL` | Registro | Imposta la durata della cache locale || `Federation` | Registro | Configura le importazioni del registro esterno || `Include` | Federazione | Modelli globali da importare || `Exclude` | Federazione | Modelli glob da saltare || `PublishTo` | Esporta | Configura la pubblicazione del registro || `Version` | Set di strumenti | Versione del set di strumenti del registro dei pin || **Funzioni dello schema** |                          |                                                                                                                    || `Attribute` | Argomenti, Ritorno, ServerData | Definisce il campo dello schema (uso generale) || `Field` | Argomenti, Ritorno, ServerData | Definisce il campo proto numerato (gRPC) || `Required` | Schema | Contrassegna i campi come obbligatori || `Example` | Schema | Allega un esempio esplicito; gli esempi di payload dello strumento di livello superiore vengono conservati nelle specifiche dello strumento generate e nei suggerimenti per i nuovi tentativi |


## Gestione dei prompt (percorso di integrazione v1)

Goa-AI v1 **non** richiede un prompt DSL dedicato (`Prompt(...)`, `Prompts(...)`).
La gestione dei prompt è attualmente guidata dal runtime:

- Registrare le specifiche del prompt di base in `runtime.PromptRegistry`.
- Configurare le sostituzioni con ambito con `runtime.WithPromptStore(...)`.
- Visualizzare le richieste dei pianificatori utilizzando `PlannerContext.RenderPrompt(...)`.
- Allegare la provenienza immediata resa alle chiamate del modello con `model.Request.PromptRefs`.

Per i flussi agente come strumento, associa gli ID strumento agli ID richiesta utilizzando opzioni di runtime come
`runtime.WithPromptSpec(...)` sulle registrazioni dello strumento agente.
Questo è facoltativo: quando non è configurato alcun contenuto del prompt lato consumatore, il runtime
utilizza il payload dello strumento JSON canonico come messaggio utente e provider nidificati
i pianificatori possono visualizzare i propri suggerimenti con il contesto lato server inserito.

### Campo vs Attributo

Sia `Field` che `Attribute` definiscono campi dello schema, ma hanno scopi diversi:

`**Attribute(name, type, description, dsl)`** - Definizione dello schema per scopi generali:

- Utilizzato per schemi solo JSON
- Nessuna numerazione dei campi richiesta
- Sintassi più semplice per la maggior parte dei casi d'uso

```go
Args(func() {
    Attribute("query", String, "Search query")
    Attribute("limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

`**Field(number, name, type, description, dsl)**` - Campi numerati per gRPC/protobuf:

- Obbligatorio durante la generazione di servizi gRPC
- I numeri dei campi devono essere univoci e stabili
- Da utilizzare quando il servizio espone sia trasporti HTTP che gRPC

```go
Args(func() {
    Field(1, "query", String, "Search query")
    Field(2, "limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**Quando utilizzare quale:**

- Utilizzare `Attribute` per gli strumenti agente che utilizzano solo JSON (caso più comune)
- Utilizza `Field` quando il tuo servizio Goa ha il trasporto gRPC e gli strumenti si collegano a tali metodi
- La mescolanza è consentita ma non consigliata all'interno dello stesso schema

## Panoramica

Goa-AI estende il DSL di Goa con funzioni per la dichiarazione di agenti, set di strumenti e policy di runtime. Il DSL viene valutato dal motore `eval` di Goa, quindi si applicano le stesse regole del DSL di servizio/trasporto standard: le espressioni devono essere invocate nel contesto appropriato e le definizioni degli attributi riutilizzano il sistema di tipi di Goa (`Attribute`, `Field`, convalide, esempi, ecc.).

### Percorso di importazione

Aggiungi gli agenti DSL ai tuoi pacchetti di progettazione Goa:

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### Punto di ingresso

Dichiarare gli agenti all'interno di una normale definizione Goa `Service`. Il DSL aumenta l'albero di progettazione di Goa e viene elaborato durante `goa gen`.

### Risultato

L'esecuzione di `goa gen` produce:

- Pacchetti agente (`gen/<service>/agents/<agent>`) con definizioni del flusso di lavoro, attività di pianificazione e assistenti per la registrazione
- Pacchetti di completamento di proprietà del servizio (`gen/<service>/completions`) quando il servizio dichiara `Completion(...)`
- Pacchetti proprietari del set di strumenti (`gen/<service>/toolset/<toolset>`) con strutture di payload/risultato digitate, specifiche, codec e (se applicabile) trasformazioni
- Gestori di attività per cicli di pianificazione/esecuzione/ripresa
- Aiutanti di registrazione che collegano il progetto al runtime

Un `AGENTS_QUICKSTART.md` contestuale viene scritto nella radice del modulo a meno che non sia disabilitato tramite `DisableAgentDocs()`.

### Esempio di avvio rapido

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var DocsToolset = Toolset("docs.search", func() {
    Tool("search", "Search indexed documentation", func() {
        Args(func() {
            Attribute("query", String, "Search phrase")
            Attribute("limit", Int, "Max results", func() { Default(5) })
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Matched snippets")
            Required("documents")
        })
        Tags("docs", "search")
    })
})

var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Description("Human front door for the knowledge agent.")

    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
        Use(AssistantSuite)
        Export("chat.tools", func() {
            Tool("summarize_status", "Produce operator-ready summaries", func() {
                Args(func() {
                    Attribute("prompt", String, "User instructions")
                    Required("prompt")
                })
                Return(func() {
                    Attribute("summary", String, "Assistant response")
                    Required("summary")
                })
                Tags("chat")
            })
        })
        RunPolicy(func() {
            DefaultCaps(
                MaxToolCalls(8),
                MaxConsecutiveFailedToolCalls(3),
            )
            TimeBudget("2m")
        })
    })
})
```

L'esecuzione di `goa gen example.com/assistant/design` produce:

- `gen/orchestrator/agents/chat`: flusso di lavoro + attività pianificatore + anagrafica agenti
- `gen/orchestrator/agents/chat/specs`: catalogo strumenti agente (aggregato `ToolSpec`s + `tool_schemas.json`)
- `gen/orchestrator/toolset/<toolset>`: tipi/specifiche/codec/trasformazioni di proprietà del set di strumenti per set di strumenti di proprietà del servizio
- `gen/orchestrator/agents/chat/exports/<export>`: pacchetti di set di strumenti esportati (agente come strumento).
- Supporti di registrazione compatibili con MCP quando si fa riferimento a un set di strumenti supportato da MCP tramite `Use`

### Identificatori degli strumenti digitati

Ogni pacchetto di specifiche per set di strumenti definisce gli identificatori dello strumento tipizzati (`tools.Ident`) per ogni strumento generato:

```go
const (
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Utilizza queste costanti ovunque sia necessario fare riferimento agli strumenti.

### Completamenti tipizzati di proprietà del servizio

Gli strumenti non sono l’unico contratto strutturato che Goa-AI può possedere. Utilizzare
`Completion(...)` quando l'assistente deve restituire direttamente una risposta finale digitata
invece di emettere una chiamata allo strumento:

```go
var Draft = Type("Draft", func() {
    Attribute("name", String, "Task name")
    Attribute("goal", String, "Outcome-style goal")
    Required("name", "goal")
})

var _ = Service("tasks", func() {
    Completion("draft_from_transcript", "Produce a task draft directly", func() {
        Return(Draft)
    })
})
```

I nomi di completamento fanno parte del contratto di output strutturato. Devono esserlo
Da 1 a 64 caratteri ASCII, possono contenere lettere, cifre, `_` e `-` e devono
iniziare con una lettera o una cifra.

`goa gen` emette un pacchetto sotto `gen/<service>/completions` con:

- schemi di risultati generati e tipi Go digitati
- codec JSON generati e aiutanti di convalida
- valori `completion.Spec` digitati
- generati helper `Complete<Name>(ctx, client, req)`
- generato `StreamComplete<Name>(ctx, client, req)` e `Decode<Name>Chunk(...)`
aiutanti

Gli aiutanti unari decodificano direttamente la risposta finale dell'assistente. Aiutanti dello streaming
rimanere sulla superficie grezza `model.Streamer`: i pezzi `completion_delta` sono
solo in anteprima, esattamente un pezzo finale `completion` è canonico e
`Decode<Name>Chunk(...)` decodifica solo il payload finale.

Gli aiutanti di completamento generati rifiutano le richieste abilitate allo strumento e fornite dal chiamante
`StructuredOutput`. I provider che non implementano l'output strutturato falliscono
esplicitamente con `model.ErrStructuredOutputUnsupported`.
Lo schema generato rimane il contratto di servizio canonico; gli adattatori del modello possono
normalizzarlo per la decodifica vincolata specifica del provider, ma devono rifiutarlo
fornitori che non possono rappresentare il contratto dichiarato.

### Composizione in linea tra processi

Quando l'agente A dichiara di "utilizzare" un set di strumenti esportato dall'agente B, Goa-AI collega automaticamente la composizione:

- Il pacchetto esportatore (agente B) include gli helper `agenttools` generati
- Il registro degli agenti consumer (agente A) utilizza questi helper quando si utilizza `Use(AgentToolset("service", "agent", "toolset"))`
- La funzione `Execute` generata crea messaggi di pianificazione nidificati, esegue l'agente del provider come flusso di lavoro figlio e adatta `RunOutput` dell'agente nidificato in un `planner.ToolResult`

Ciò produce un singolo flusso di lavoro deterministico per esecuzione dell'agente e un albero di esecuzione collegato per la composizione.

---

## Funzioni dell'agente

### Agente

`Agent(name, description, dsl)` dichiara un agente all'interno di un `Service`. Registra i metadati dell'agente con ambito servizio e collega i set di strumenti tramite `Use` e `Export`.

**Contesto**: All'interno di `Service`

Ogni agente diventa una registrazione runtime con:

- Una definizione del flusso di lavoro e gestori di attività temporali
- Attività PlanStart/PlanResume con opzioni di ripetizione/timeout derivate da DSL
- Un helper `Register<Agent>` che registra flussi di lavoro, attività e set di strumenti

```go
var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(DocsToolset)
        Export("chat.tools", func() {
            // tools defined here
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Utilizzo

`Use(value, dsl)` dichiara che un agente utilizza un set di strumenti. Il set di strumenti può essere:

- Una variabile `Toolset` di livello superiore
- Un set di strumenti dichiarato con `FromMCP(...)` o `FromExternalMCP(...)`
- Una definizione del set di strumenti in linea (nome stringa + DSL)
- Un riferimento `AgentToolset` per la composizione agente come strumento

**Contesto**: All'interno di `Agent`

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference with subsetting
    Use(CommonTools, func() {
        Tool("notify") // consume only this tool from CommonTools
    })
    
    // Reference an MCP toolset declared at top level
    Use(AssistantSuite)
    
    // Inline agent-local toolset definition
    Use("helpers", func() {
        Tool("answer", "Answer a question", func() {
            // tool definition
        })
    })
    
    // Agent-as-tool composition
    Use(AgentToolset("service", "agent", "toolset"))
})
```

### Esporta

`Export(value, dsl)` dichiara i set di strumenti esposti ad altri agenti o servizi. I set di strumenti esportati possono essere utilizzati da altri agenti tramite `Use(AgentToolset(...))`.

**Contesto**: All'interno di `Agent` o `Service`

```go
Agent("planner", "Planning agent", func() {
    Export("planning.tools", func() {
        Tool("create_plan", "Create a plan", func() {
            Args(func() {
                Attribute("goal", String, "Goal to plan for")
                Required("goal")
            })
            Return(func() {
                Attribute("plan", String, "Generated plan")
                Required("plan")
            })
        })
    })
})
```

### Set di strumenti dell'agente

`AgentToolset(service, agent, toolset)` references a toolset exported by another agent. Ciò consente la composizione dell'agente come strumento.

**Contesto**: argomento per `Use`

Utilizzare `AgentToolset` quando:

- Non disponi di un handle di espressione per il set di strumenti esportato
- Più agenti esportano set di strumenti con lo stesso nome
- Vuoi essere esplicito nel design per chiarezza

```go
// Agent A exports tools
Agent("planner", func() {
    Export("planning.tools", func() { /* tools */ })
})

// Agent B uses Agent A's tools
Agent("orchestrator", func() {
    Use(AgentToolset("service", "planner", "planning.tools"))
})
```

**Alias**: `UseAgentToolset(service, agent, toolset)` è un alias che combina `AgentToolset` con `Use` in un'unica chiamata. Preferisci `AgentToolset` nei nuovi design; l'alias esiste per la leggibilità in alcune basi di codice.

```go
// Equivalent to Use(AgentToolset("service", "planner", "planning.tools"))
Agent("orchestrator", func() {
    UseAgentToolset("service", "planner", "planning.tools")
})
```

### Passaggio

`Passthrough(toolName, target, methodName)` definisce l'inoltro deterministico per uno strumento esportato a un metodo di servizio Goa. Questo bypassa completamente il pianificatore.

**Contesto**: all'interno di `Tool` nidificato sotto `Export`

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("message", String, "Message to log")
            Required("message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
        })
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

### DisableAgentDocs

`DisableAgentDocs()` disabilita la generazione di `AGENTS_QUICKSTART.md` nella radice del modulo.

**Contesto**: All'interno di `API`

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

---

## Funzioni del set di strumenti

### Set di strumenti

`Toolset(name, dsl)` dichiara un set di strumenti di proprietà del provider al livello più alto. Quando dichiarato al livello più alto, il set di strumenti diventa riutilizzabile a livello globale; gli agenti vi fanno riferimento tramite `Use`.

**Contesto**: Primo livello

```go
var DocsToolset = Toolset("docs.search", func() {
    Description("Tools for searching documentation")
    Tool("search", "Search indexed documentation", func() {
        Args(func() {
            Attribute("query", String, "Search phrase")
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Matched snippets")
            Required("documents")
        })
    })
})
```

I set di strumenti possono includere una descrizione utilizzando la funzione DSL `Description()` standard:

```go
var DataToolset = Toolset("data-tools", func() {
    Description("Tools for data processing and analysis")
    Tool("analyze", "Analyze dataset", func() {
        Args(func() {
            Attribute("dataset_id", String, "Dataset identifier")
            Required("dataset_id")
        })
        Return(func() {
            Attribute("insights", ArrayOf(String), "Analysis insights")
            Required("insights")
        })
    })
})
```

### Attrezzo

`Tool(name, description, dsl)` definisce una funzionalità richiamabile all'interno di un set di strumenti.

**Contesto**: All'interno di `Toolset` o `Method`

La generazione del codice emette:

- Strutture Go payload/risultato in `tool_specs/types.go`
- Codec JSON (`tool_specs/codecs.go`)
- Definizioni dello schema JSON utilizzate dai pianificatori
- Voci del registro degli strumenti con prompt e metadati di supporto

```go
Tool("search", "Search indexed documentation", func() {
    Title("Document Search")
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() { Default(5) })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Required("documents")
    })
    CallHintTemplate("Searching for: {{ .Query }}")
    ResultHintTemplate("Found {{ len .Result.Documents }} documents")
    Tags("docs", "search")
})
```

### Argomenti e Invio

`Args(...)` e `Return(...)` definiscono i tipi di payload/risultato utilizzando l'attributo Goa standard DSL.

**Contesto**: All'interno di `Tool`

Puoi usare:

- Una funzione per definire uno schema di oggetti in linea con chiamate `Attribute()`
- Un tipo di utente Goa (Tipo, Risultato, ecc.) per riutilizzare le definizioni di tipo esistenti
- Un tipo primitivo (String, Int, ecc.) per input/output semplici a valore singolo

```go
Tool("search", "Search documentation", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Max results", func() {
            Default(5)
            Minimum(1)
            Maximum(100)
        })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Matched snippets")
        Attribute("count", Int, "Number of results")
        Required("documents", "count")
    })
})
```

**Tipi di riutilizzo:**

```go
var SearchParams = Type("SearchParams", func() {
    Attribute("query", String)
    Attribute("limit", Int)
    Required("query")
})

Tool("search", "Search documents", func() {
    Args(SearchParams)
    Return(func() {
        Attribute("results", ArrayOf(String))
    })
})
```

### Dati del server

`ServerData(kind, val, args...)` definisce l'output tipizzato solo del server emesso insieme al risultato dello strumento. I dati del server non vengono mai inviati ai fornitori di modelli.
I dati del server della sequenza temporale vengono in genere proiettati in schede dell'interfaccia utente, grafici, tabelle o mappe rivolte all'osservatore, mantenendo il risultato rivolto al modello delimitato ed efficiente in termini di token. Le prove e il pubblico interno consentono ai consumatori a valle di instradare dati relativi alla provenienza o alla sola composizione senza fare affidamento su convenzioni di denominazione.

**Contesto**: All'interno di `Tool`

**Parametri:**

- `kind`: un identificatore di stringa per il tipo di dati del server (ad esempio, `"atlas.time_series"`, `"atlas.control_narrative"`, `"aura.evidence"`). Ciò consente ai consumatori di identificare e gestire in modo appropriato le diverse proiezioni dei dati del server.
- `val`: la definizione dello schema, seguendo gli stessi modelli di `Args` e `Return`: una funzione con chiamate `Attribute()`, un tipo di utente Goa o un tipo primitivo.

**Instradamento del pubblico (`Audience`*):**

Ogni voce `ServerData` dichiara un pubblico che i consumatori a valle utilizzano per instradare il carico utile senza fare affidamento su convenzioni di denominazione del tipo:

- `"timeline"`: persistente e idoneo per la proiezione rivolta all'osservatore (ad esempio, schede UI/timeline)
- `"internal"`: accessorio composizione utensili; non persistente o reso
- `"evidence"`: riferimenti di provenienza; persisteva separatamente dalle schede della sequenza temporale

Imposta il pubblico all'interno del blocco DSL `ServerData`:

```go
ServerData("atlas.time_series.chart_points", TimeSeriesServerData, func() {
    AudienceInternal()
    FromMethodResultField("chart_sidecar")
})

ServerData("aura.evidence", ArrayOf(Evidence), func() {
    AudienceEvidence()
    FromMethodResultField("evidence")
})
```

**Quando utilizzare ServerData:**

- Quando i risultati dello strumento devono includere dati completi per le interfacce utente (grafici, grafici, tabelle) mantenendo limitati i carichi utili del modello
- Quando si desidera allegare set di risultati di grandi dimensioni che supererebbero i limiti del contesto del modello
- Quando i consumatori a valle necessitano di dati strutturati che il modello non ha bisogno di vedere

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp (RFC3339)")
        Attribute("end_time", String, "End timestamp (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
        Attribute("min_value", Float64, "Minimum value in range")
        Attribute("max_value", Float64, "Maximum value in range")
        Required("summary", "count")
    })
    ServerData("atlas.time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    })
})
```

**Utilizzo di un tipo Goa per lo schema server-data:**

```go
var TimeSeriesServerData = Type("TimeSeriesServerData", func() {
    Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
    Attribute("unit", String, "Measurement unit")
    Attribute("resolution", String, "Data resolution (e.g., '1m', '5m', '1h')")
    Required("data_points")
})

Tool("get_metrics", "Get device metrics", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Required("device_id")
    })
    Return(func() {
        Attribute("summary", String, "Metrics summary for the model")
        Attribute("point_count", Int, "Number of data points")
        Required("summary", "point_count")
    })
    ServerData("atlas.metrics", TimeSeriesServerData)
})
```

**Accesso in fase di esecuzione:**

In fase di esecuzione, vengono eseguiti i dati del server emessi dagli strumenti
`planner.ToolResult.ServerData`. Decodifica quei byte JSON canonici con il file
codec dati server generati per i tipi dichiarati dello strumento:

```go
// In a stream subscriber or result handler
func handleToolResult(result *planner.ToolResult) {
    if len(result.ServerData) > 0 {
        // Decode with the generated server-data codecs for this tool.
    }
}
```

### Risultato delimitato

`BoundedResult()` contrassegna il risultato dello strumento corrente come una vista limitata su un set di dati potenzialmente più grande.
Dichiara un contratto sui limiti di proprietà del runtime mantenendo il tipo di risultato creato semantico e
specifico del dominio.

**Contesto**: All'interno di `Tool`

Campi visibili nel modello canonico:

- `returned` (richiesto, `Int`)
- `truncated` (richiesto, `Boolean`)
- `total` (opzionale, `Int`)
- `refinement_hint` (opzionale, `String`)
- `next_cursor` (opzionale, `String`) se dichiarato tramite `NextCursor(...)`

`BoundedResult` è l'unica fonte di verità per quel contratto:

- codegen lo registra nel `tools.ToolSpec.Bounds` generato
- codegen proietta i campi delimitati canonici nello schema dei risultati JSON generato
- le esecuzioni limitate riuscite devono impostare `planner.ToolResult.Bounds`
- il runtime proietta tali limiti in JSON codificato `tool_result`, dati del modello di suggerimento dei risultati,
hook ed eventi in streaming

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("site_id", String, "Site identifier")
        Attribute("cursor", String, "Opaque pagination cursor")
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "List of devices")
        Required("devices")
    })
    BoundedResult(func() {
        Cursor("cursor")
        NextCursor("next_cursor")
    })
})
```

I tipi di restituzione fronte utensile non devono dichiarare `returned`, `total`, `truncated`,
`refinement_hint` o `next_cursor` solo in modo che il modello possa vederli. Mantieni focalizzato il risultato semantico
sui dati del dominio. Gli strumenti supportati dal metodo possono comunque utilizzare internamente tipi di risultati del metodo di servizio più avanzati, ma
il contratto dello strumento Goa-AI proviene da `BoundedResult(...)`, campi di restituzione dello strumento non duplicati. Dentro
per i risultati del metodo associato, potrebbero essere richiesti solo `returned` e `truncated`; `total`,
`refinement_hint` e `next_cursor` rimangono parti facoltative del contratto vincolante.

**Responsabilità del servizio:**

I servizi sono responsabili di:

1. Applicare la propria logica di troncamento (impaginazione, limiti, limiti di profondità)
2. Compilazione di `planner.ToolResult.Bounds`
3. Impostazione di `Bounds.NextCursor` quando esiste un'altra pagina
4. Facoltativamente fornire `RefinementHint` quando i risultati vengono troncati

Il runtime non calcola i sottoinsiemi o il troncamento stesso. Convalida e proietta solo i limiti
metadati riportati dagli strumenti.

**Quando utilizzare BoundedResult:**

- Strumenti che restituiscono elenchi impaginati (dispositivi, utenti, record)
- Strumenti che interrogano set di dati di grandi dimensioni con limiti di risultati
- Strumenti che applicano limiti di profondità o dimensione alle strutture nidificate
- Qualsiasi strumento in cui il modello deve comprendere che i risultati potrebbero essere incompleti

**Comportamento durante l'esecuzione:**

```go
result := &planner.ToolResult{
    Result: &ListDevicesResult{
        Devices: devices,
    },
    Bounds: &agent.Bounds{
        Returned:       len(devices),
        Total:          ptr(total),
        Truncated:      truncated,
        NextCursor:     nextCursor,
        RefinementHint: refinementHint,
    },
}
```

Quando uno strumento limitato viene eseguito:

1. Il runtime convalida che uno strumento associato con successo ha restituito `planner.ToolResult.Bounds`.
2. Il runtime unisce tali limiti nel JSON emesso utilizzando i nomi dei campi da `BoundedResult(...)`.
3. La stessa struttura `planner.ToolResult.Bounds` rimane il contratto runtime canonico per i pianificatori,
  hook e interfacce utente.

Gli strumenti possono includere un titolo visualizzato utilizzando la funzione DSL `Title()` standard:

```go
Tool("web_search", "Search the web", func() {
    Title("Web Search")
    Args(func() { /* ... */ })
})
```

### Idempotente

`Idempotent()` contrassegna lo strumento corrente come idempotente *all'interno di una trascrizione dell'esecuzione*.
Se impostati, i tempi di esecuzione/pianificazione possono trattare le chiamate ripetute dello strumento con argomenti identici
come ridondanti ed evitare di eseguirli una volta che esiste già un risultato positivo
la trascrizione.

**Contesto**: All'interno di `Tool`

**Quando usarlo**

Utilizzare `Idempotent()` solo quando il risultato dello strumento è una pura funzione dei suoi argomenti
per tutta la durata di una trascrizione di esecuzione (ad esempio, il recupero di una documentazione
sezione per identificatore stabile).

**Quando non usarlo**

Non contrassegnare gli strumenti idempotenti quando il loro risultato dipende dalla modifica dello stato esterno
ma il payload dello strumento non contiene un parametro di ora/versione (ad esempio,
istantanee "ottieni modalità corrente" o "ottieni stato corrente" senza un ingresso `as_of`).

**Generazione del codice**

Quando uno strumento è contrassegnato come `Idempotent()`, codegen emette il tag
`goa-ai.idempotency=transcript` nel file `tools.ToolSpec.Tags` generato. Questo
il tag viene utilizzato dai runtime/pianificatori che implementano la deduplicazione sensibile alla trascrizione.

### Conferma

`Confirmation(dsl)` dichiara che uno strumento deve essere esplicitamente approvato fuori banda prima
esegue. Questo è destinato agli strumenti **sensibili all'operatore** (scritture, eliminazioni, comandi).

**Contesto**: All'interno di `Tool`

Al momento della generazione, Goa-AI registra la politica di conferma nelle specifiche dello strumento generato. In fase di esecuzione, il
il flusso di lavoro emette una richiesta di conferma utilizzando `AwaitConfirmation` ed esegue lo strumento solo dopo un
viene fornita l'approvazione esplicita.

Esempio minimo:

```go
Tool("dangerous_write", "Write a stateful change", func() {
    Args(DangerousWriteArgs)
    Return(DangerousWriteResult)
    Confirmation(func() {
        Title("Confirm change")
        PromptTemplate(`Approve write: set {{ .Key }} to {{ .Value }}`)
        DeniedResultTemplate(`{"summary":"Cancelled","key":"{{ .Key }}"}`)
    })
})
```

Note:

- Il runtime possiede la modalità di richiesta di conferma. Il protocollo di conferma integrato utilizza un protocollo dedicato
`AwaitConfirmation` attendono e viene chiamata una decisione `ProvideConfirmation`. Consulta la guida Runtime per
payload attesi e flusso di esecuzione.
- I modelli di conferma (`PromptTemplate` e `DeniedResultTemplate`) sono stringhe Go `text/template`
eseguito con `missingkey=error`. Oltre alle funzioni del modello standard (ad esempio `printf`),
Goa-AI fornisce:
  - `json v` → JSON codifica `v` (utile per campi puntatore opzionali o per incorporare valori strutturati).
  - `quote s` → restituisce una stringa tra virgolette con escape Go (come `fmt.Sprintf("%q", s)`).
- La conferma può essere abilitata anche dinamicamente in fase di runtime tramite `runtime.WithToolConfirmation(...)`
(utile per policy basate sull'ambiente o override per distribuzione).

### CallHintTemplate e ResultHintTemplate

`CallHintTemplate(template)` e `ResultHintTemplate(template)` configurano modelli di visualizzazione per le chiamate e i risultati degli strumenti. I modelli sono stringhe di testo/modello Go rese con valori Go digitati per produrre suggerimenti concisi mostrati durante e dopo l'esecuzione.

**Contesto**: All'interno di `Tool`

**Punti chiave:**

- I modelli di chiamata ricevono il payload digitato come root del modello (ad esempio, `.Query`, `.DeviceID`)
- I modelli di risultati ricevono un wrapper esplicito in cui i campi semantici risiedono in `.Result` e i metadati delimitati risiedono in `.Bounds`
- Mantieni i suggerimenti concisi: ≤140 caratteri consigliati per una visualizzazione dell'interfaccia utente pulita
- I modelli sono compilati con `missingkey=error`: tutti i campi a cui si fa riferimento devono esistere
- Utilizza i nomi dei campi Vai, non le chiavi JSON
- Utilizzare i blocchi `{{ if .Field }}` o `{{ with .Field }}` per i campi facoltativi

**Contratto runtime:**

- I costruttori di hook non visualizzano i suggerimenti. Gli eventi pianificati delle chiamate dello strumento sono impostati per impostazione predefinita su `DisplayHint==""`.
- Il runtime può arricchire e rendere persistente un suggerimento di chiamata predefinito durevole al momento della pubblicazione decodificando lo strumento digitato
payload ed eseguendo `CallHintTemplate`.
- Quando la decodifica digitata non riesce o non è registrato alcun modello, il runtime lascia vuoto `DisplayHint`. I suggerimenti sono
mai reso rispetto ai byte JSON grezzi.
- Se un produttore imposta esplicitamente `DisplayHint` (non vuoto) prima di pubblicare l'evento hook, il runtime tratta
come autorevole e non lo sovrascrive.
- Per le modifiche alla formulazione per consumatore, configurare `runtime.WithHintOverrides` in fase di runtime. Le sovrascritture richiedono
precedenza sui modelli creati da DSL per gli eventi `tool_start` trasmessi in streaming.

**Esempio di base:**

```go
Tool("search", "Search documents", func() {
    Args(func() {
        Attribute("query", String, "Search phrase")
        Attribute("limit", Int, "Maximum results", func() { Default(10) })
        Required("query")
    })
    Return(func() {
        Attribute("count", Int, "Number of results found")
        Attribute("results", ArrayOf(String), "Matching documents")
        Required("count", "results")
    })
    CallHintTemplate("Searching for: {{ .Query }}")
    ResultHintTemplate("Found {{ .Result.Count }} results")
})
```

**Campi struttura digitati:**

I modelli di chiamata ricevono la struttura del payload Go generata come root del modello.
I modelli di risultati ricevono il wrapper di anteprima di runtime, quindi i campi semantici sono attivi
sotto `.Result` e i metadati delimitati risiedono in `.Bounds`. Seguono i nomi dei campi
Vai alle convenzioni di denominazione (PascalCase), non alle convenzioni JSON (snake_case o camelCase):

```go
// DSL definition
Tool("get_device_status", "Get device status", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")      // JSON: device_id
        Attribute("include_metrics", Boolean, "Include metrics") // JSON: include_metrics
        Required("device_id")
    })
    Return(func() {
        Attribute("device_name", String, "Device name")          // JSON: device_name
        Attribute("is_online", Boolean, "Online status")         // JSON: is_online
        Attribute("last_seen", String, "Last seen timestamp")    // JSON: last_seen
        Required("device_name", "is_online")
    })
    // Use Go field names (PascalCase), not JSON keys
    CallHintTemplate("Checking status of {{ .DeviceID }}")
    ResultHintTemplate("{{ .Result.DeviceName }}: {{ if .Result.IsOnline }}online{{ else }}offline{{ end }}")
})
```

**Gestione dei campi facoltativi:**

Utilizza i blocchi condizionali per i campi facoltativi per evitare errori del modello:

```go
Tool("list_items", "List items with optional filter", func() {
    Args(func() {
        Attribute("category", String, "Optional category filter")
        Attribute("limit", Int, "Maximum items", func() { Default(50) })
    })
    Return(func() {
        Attribute("items", ArrayOf(Item), "Matching items")
        Attribute("total", Int, "Total count")
        Attribute("truncated", Boolean, "Results were truncated")
        Required("items", "total")
    })
    CallHintTemplate("Listing items{{ with .Category }} in {{ . }}{{ end }}")
    ResultHintTemplate("{{ .Result.Total }} items{{ if .Result.Truncated }} (truncated){{ end }}")
})
```

**Funzioni modello integrate:**

Il runtime fornisce queste funzioni di supporto per i modelli di suggerimento:


| Funzione | Descrizione | Esempio || ---------- | -------------------------------- | ---------------------------- |
| `join` | Unisci la sezione di stringa con il separatore | `{{ join .Tags ", " }}` || `count`    | Contare gli elementi in una fetta | `{{ count .Results }} items` || `truncate` | Tronca la stringa a N caratteri | `{{ truncate .Query 20 }}` |


**Esempio completo con tutte le funzionalità:**

```go
Tool("analyze_data", "Analyze dataset", func() {
    Args(func() {
        Attribute("dataset_id", String, "Dataset identifier")
        Attribute("analysis_type", String, "Type of analysis", func() {
            Enum("summary", "detailed", "comparison")
        })
        Attribute("filters", ArrayOf(String), "Optional filters")
        Required("dataset_id", "analysis_type")
    })
    Return(func() {
        Attribute("insights", ArrayOf(String), "Analysis insights")
        Attribute("metrics", MapOf(String, Float64), "Computed metrics")
        Attribute("processing_time_ms", Int, "Processing time in milliseconds")
        Required("insights", "processing_time_ms")
    })
    CallHintTemplate("Analyzing {{ .DatasetID }} ({{ .AnalysisType }})")
    ResultHintTemplate("{{ count .Result.Insights }} insights in {{ .Result.ProcessingTimeMs }}ms")
})
```

### Promemoria risultato

`ResultReminder(text)` configura un promemoria di sistema statico che viene inserito nella conversazione dopo la restituzione del risultato dello strumento. Utilizzalo per fornire indicazioni dietro le quinte al modello su come interpretare o presentare il risultato all'utente.

**Contesto**: All'interno di `Tool`

Il testo del promemoria viene automaticamente racchiuso tra i tag `<system-reminder>` dal runtime. Non includere i tag nel testo.

**Promemoria statici e dinamici:**

`ResultReminder` è per promemoria statici in fase di progettazione che si applicano ogni volta che viene chiamato lo strumento. Per i promemoria dinamici che dipendono dallo stato di runtime o dal contenuto dei risultati dello strumento, utilizzare invece `PlannerContext.AddReminder()` nell'implementazione del pianificatore. Supporto per i promemoria dinamici:

- Limitazione della velocità (giri minimi tra le emissioni)
- Tetti per corsa (emissioni massime per corsa)
- Aggiunta/rimozione di runtime in base alle condizioni
- Livelli di priorità (sicurezza vs guida)

**Esempio di base:**

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp")
        Attribute("end_time", String, "End timestamp")
        Required("device_id", "start_time", "end_time")
    })
    Return(func() {
        Attribute("series", ArrayOf(DataPoint), "Time series data points")
        Attribute("summary", String, "Summary for the model")
        Required("series", "summary")
    })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

**Quando utilizzare il promemoria sui risultati:**

- Quando l'interfaccia utente esegue il rendering dei risultati dello strumento in un modo speciale (grafici, grafici, tabelle) di cui il modello dovrebbe essere a conoscenza
- Quando il modello deve evitare di ripetere informazioni già visibili all'utente
- Quando c'è un contesto importante su come vengono presentati i risultati che influenza il modo in cui il modello dovrebbe rispondere
- Quando si desidera una guida coerente che si applichi a ogni invocazione dello strumento

**Strumenti multipli con promemoria:**

Quando più strumenti in un singolo turno hanno promemoria sui risultati, vengono combinati in un unico messaggio di sistema:

```go
Tool("get_metrics", "Get device metrics", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("Metrics are displayed as a dashboard widget.")
})

Tool("get_alerts", "Get active alerts", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("Alerts are shown in a priority-sorted list with severity indicators.")
})
```

**Promemoria dinamici tramite PlannerContext:**

Per i promemoria che dipendono dalle condizioni di runtime, utilizza invece l'API del pianificatore:

```go
// In your planner implementation
func (p *MyPlanner) PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Add a dynamic reminder based on tool results
    for _, tr := range input.ToolOutputs {
        if tr.Name != "get_time_series" || tr.Error != nil {
            continue
        }
        result, err := specs.UnmarshalGetTimeSeriesResult(tr.Result)
        if err != nil {
            return nil, err
        }
        if hasAnomalies(result) {
            input.Agent.AddReminder(reminder.Reminder{
                ID:   "anomaly_detected",
                Text: "Anomalies were detected in the time series. Highlight these to the user.",
                Priority: reminder.TierGuidance,
            })
        }
    }
    // ... rest of planner logic
}
```

### Tag

`Tags(values...)` annota strumenti o set di strumenti con etichette di metadati. I tag vengono visualizzati nei motori di policy e nella telemetria.

**Contesto**: All'interno di `Tool` o `Toolset`

Modelli di tag comuni:

- Categorie di domini: `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- Tipi di funzionalità: `"read"`, `"write"`, `"search"`, `"transform"`
- Livelli di rischio: `"safe"`, `"destructive"`, `"external"`

```go
Tool("delete_file", "Delete a file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})
```

### Associa a

`BindTo("Method")` o `BindTo("Service", "Method")` associa uno strumento a un metodo di servizio Goa.

**Contesto**: All'interno di `Tool`

Quando uno strumento è associato a un metodo:

- Lo schema `Args` dello strumento può differire dallo schema `Payload` del metodo
- Lo schema `Return` dello strumento può differire dallo schema `Result` del metodo
- Gli adattatori generati si trasformano tra tipi di strumenti e metodi

```go
var _ = Service("orchestrator", func() {
    Method("Search", func() {
        Payload(SearchPayload)
        Result(SearchResult)
    })
    
    Agent("chat", func() {
        Use("docs", func() {
            Tool("search", "Search documentation", func() {
                Args(SearchPayload)
                Return(SearchResult)
                BindTo("Search") // binds to method on same service
            })
        })
    })
})
```

### Iniettare

`Inject(fields...)` contrassegna campi specifici del payload come "iniettati" (infrastruttura lato server). I campi inseriti sono:

1. Nascosto dal LLM (escluso dallo schema JSON inviato al modello)
2. Convalidati come richiesti i campi `String` sul payload del metodo associato
3. Popolato da `runtime.ToolCallMeta` da esecutori generati, con hook `ToolInterceptor.Inject` facoltativi

**Contesto**: All'interno di `Tool`

```go
Tool("get_data", "Get data for current session", func() {
    Args(func() {
        Attribute("session_id", String, "Current session ID")
        Attribute("query", String, "Data query")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String))
    })
    BindTo("data_service", "get")
    Inject("session_id") // hidden from LLM, populated by interceptor
})
```

I nomi dei campi inseriti supportati sono fissi: `run_id`, `session_id`, `turn_id`,
`tool_call_id` e `parent_tool_call_id`.

In fase di esecuzione, gli esecutori del servizio generato copiano i valori corrispondenti da
`runtime.ToolCallMeta` prima dell'esecuzione degli intercettori tipizzati opzionali:

```go
func (h *Handler) Inject(ctx context.Context, payload any, meta *runtime.ToolCallMeta) error {
    if p, ok := payload.(*dataservice.GetPayload); ok {
        p.SessionID = meta.SessionID
    }
    return nil
}
```

### TerminalRun

`TerminalRun()` contrassegna lo strumento corrente come terminale per la corsa. Una volta eseguito correttamente lo strumento, il runtime completa l'esecuzione immediatamente dopo aver pubblicato il risultato dello strumento senza richiedere un turno `PlanResume`/finalizzazione successivo.

**Contesto**: All'interno di `Tool`

Utilizzare `TerminalRun()` per gli strumenti il ​​cui risultato è l'output del terminale rivolto all'utente dell'esecuzione, ad esempio un renderer del report finale o uno strumento "commit this run". Il risultato dello strumento è l'artefatto terminale dell'esecuzione; la narrazione del modello extra non è né necessaria né desiderabile.

```go
Tool("commit_task", "Commit the terminal task artifact", func() {
    Args(TaskCompletionArgs)
    Return(TaskCompletionResult)
    TerminalRun()
})
```

**Comportamento in fase di esecuzione:**

- Codegen registra il flag su `tools.ToolSpec.TerminalRun`.
- Dopo una chiamata allo strumento terminale riuscita, il runtime finalizza l'esecuzione senza chiamare `PlanResume`.
- Gli strumenti terminali si compongono naturalmente con `Bookkeeping()` (vedi sotto): il tipico strumento "commit this run" è sia terminale che contabile, quindi viene sempre eseguito anche quando il budget di recupero è esaurito e termina l'esecuzione in modo atomico.

### Contabilità

`Bookkeeping()` contrassegna lo strumento corrente come strumento di contabilità che non utilizza il budget di recupero `MaxToolCalls` a livello di esecuzione. Il runtime non diminuisce `RemainingToolCalls` per le chiamate di contabilità e non le elimina mai quando si taglia un batch per adattarlo al budget rimanente.

**Contesto**: All'interno di `Tool`

Utilizzare `Bookkeeping()` per strumenti strutturati di avanzamento, stato, ricerca e impegno terminale il cui costo è la tenuta dei registri piuttosto che il recupero o il lavoro con effetti collaterali. Esempi classici sono gli aggiornamenti di stato, gli indicatori di avanzamento e lo strumento atomico "commit this run" che scrive l'artefatto finale.

```go
Tool("set_step_status", "Update step status", func() {
    Args(SetStepStatusArgs)
    Return(SetStepStatusResult)
    Bookkeeping()
})
```

**Comportamento in fase di esecuzione:**

- Codegen registra il flag su `tools.ToolSpec.Bookkeeping`.
- Le chiamate di contabilità non vengono mai conteggiate nei confronti di `MaxToolCalls` e non vengono mai scartate quando il runtime ritaglia un batch per adattarlo al budget rimanente. Le chiamate a budget (non contabili) vengono tagliate per prime; le chiamate contabili mantengono la loro posizione originale.
- I risultati contabili di successo rimangono nascosti ai futuri turni di pianificazione per impostazione predefinita. Aggiungere `PlannerVisible()` quando uno strumento di contabilità emette uno stato canonico su cui si deve ragionare al turno successivo.
- Gli strumenti sconosciuti vengono trattati come preventivati; sono esenti solo gli strumenti dichiarati `Bookkeeping()` nel DSL (o contrassegnati in contabilità sul runtime `ToolSpec`).
- Un turno esclusivamente contabile deve risolversi nello stesso turno (`TerminalRun()`, `FinalResponse`, `FinalToolResult` o attendere/pausa) o produrre almeno un risultato contabile positivo visibile al pianificatore che giustifichi il curriculum successivo.

**Composizione con `TerminalRun()`:**

Uno strumento di commit del terminale è in genere sia contabile che terminale:

```go
Tool("commit_task", "Commit the terminal task artifact", func() {
    Args(TaskCompletionArgs)
    Return(TaskCompletionResult)
    Bookkeeping()  // always executes, even when the budget is exhausted
    TerminalRun()  // ends the run atomically once it succeeds
})
```

Questo modello garantisce che l'esecuzione possa sempre essere finalizzata in modo deterministico: lo strumento di commit è esente dal budget di recupero e, una volta riuscita, l'esecuzione viene eseguita senza un turno di pianificazione successivo.

### PianificatoreVisibile

`PlannerVisible()` mantiene il risultato di uno strumento di contabilità visibile ai futuri pianificatori. Usalo per gli strumenti del piano di controllo che emettono uno stato canonico, come uno snapshot di avanzamento strutturato che dovrebbe guidare il prossimo `PlanResume`.

**Contesto**: All'interno di `Tool`

```go
Tool("set_step_status", "Update task step status", func() {
    Args(SetStepStatusArgs)
    Return(TaskProgressSnapshot)
    Bookkeeping()
    PlannerVisible()
})
```

**Comportamento in fase di esecuzione:**

- `PlannerVisible()` è valido solo su strumenti di contabilità non terminali.
- Le esecuzioni riuscite vengono aggiunte nuovamente alla trascrizione visibile del modello e al futuro `PlanResumeInput.ToolOutputs`.
- Gli errori contabili riprovabili rimangono visibili nel pianificatore anche senza `PlannerVisible()`.
- Gli strumenti con budget non necessitano di `PlannerVisible()` perché sono già visibili nel pianificatore per impostazione predefinita.

---

## Funzioni politiche

### EseguiPolitica

`RunPolicy(dsl)` configura i limiti di esecuzione applicati in fase di esecuzione. Viene dichiarato all'interno di un `Agent` e contiene impostazioni di criteri come limiti, budget temporali, gestione della cronologia e gestione delle interruzioni.

**Contesto**: All'interno di `Agent`

**Funzioni policy disponibili:**

- `DefaultCaps` – limiti delle risorse (chiamate strumento, guasti consecutivi)
- `TimeBudget` – limite semplice dell'orologio a muro per l'intera corsa
- `Timing`: timeout dettagliati per attività di budget, pianificazione e strumenti (avanzato)
- `History` – gestione cronologia conversazioni (finestra scorrevole o compressione)
- `InterruptsAllowed`: abilita la pausa/ripresa per gli operatori umani nel ciclo
- `OnMissingFields` – comportamento di convalida per i campi obbligatori mancanti

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")

        History(func() {
            KeepRecentTurns(20)
        })
    })
})
```

### DefaultCaps

`DefaultCaps(opts...)` applica limiti di capacità per prevenire cicli incontrollati e imporre limiti di esecuzione.

**Contesto**: All'interno di `RunPolicy`

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

**MaxToolCalls(n)**: imposta il numero massimo di invocazioni di strumenti a budget consentite per esecuzione. Gli strumenti dichiarati `Bookkeeping()` sono esenti da questo limite e non contano ai fini di `n`. Quando il budget è esaurito, il runtime interrompe la pianificazione delle chiamate preventivate e finalizza l'esecuzione del pianificatore con motivo di terminazione `tool_cap`.

**MaxConsecutiveFailedToolCalls(n)**: imposta il numero massimo di chiamate consecutive allo strumento non riuscite prima dell'interruzione. Impedisce cicli infiniti di tentativi.

### Budget temporale

`TimeBudget(duration)` applica un limite temporale all'esecuzione dell'agente. La durata è specificata come stringa (ad esempio, `"2m"`, `"30s"`).

**Contesto**: All'interno di `RunPolicy`

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

Per un controllo dettagliato sui timeout delle singole attività, utilizzare invece `Timing`.

### Tempistica

`Timing(dsl)` fornisce una configurazione di timeout dettagliata come alternativa a `TimeBudget`. Mentre `TimeBudget` imposta un unico limite complessivo, `Timing` consente di controllare i timeout su tre livelli: il budget di esecuzione complessivo, le attività del pianificatore (inferenza LLM) e le attività di esecuzione dello strumento.

**Contesto**: All'interno di `RunPolicy`

**Quando utilizzare Timing rispetto a TimeBudget:**

- Utilizzare `TimeBudget` per casi semplici in cui è sufficiente un unico limite di orologio da parete
- Utilizza `Timing` quando hai bisogno di timeout diversi per la pianificazione rispetto all'esecuzione dello strumento, ad esempio quando gli strumenti effettuano chiamate API esterne lente ma desideri risposte LLM veloci

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock budget for the entire run
        Plan("45s")     // timeout for Plan/Resume activities (LLM inference)
        Tools("2m")     // default timeout for ExecuteTool activities
    })
})
```

`Timing` rimane al livello di runtime semantico. `Plan(...)` e `Tools(...)`
limitato per quanto tempo un tentativo di pianificazione o strumento sano può essere eseguito una volta avviato.
Non configurano i meccanismi del motore del flusso di lavoro come i timeout di attesa della coda o
vivacità del battito cardiaco. Se usi l'adattatore temporale, configura questi meccanismi
con `temporal.Options.ActivityDefaults`.

**Funzioni di cronometraggio:**


| Funzione | Descrizione | Colpisce || ------------------ | ------------------------------------------ | -------------------------------------------------- |
| `Budget(duration)` | Budget totale dell'orologio da parete per la corsa | Intero ciclo di vita della corsa || `Plan(duration)` | Timeout per pianificare e riprendere le attività | Chiamate in inferenza LLM tramite pianificatore || `Tools(duration)` | Timeout predefinito per le attività di ExecuteTool | Esecuzione di strumenti (chiamate di servizio, MCP, agente come strumento) |


**In che modo la temporizzazione influisce sul comportamento di runtime:**

Il runtime traduce questi valori DSL in budget di tentativi indipendenti dal motore:

- `Budget` imposta il budget semantico dell'orologio da parete per l'esecuzione. Il runtime impone
quel budget per il lavoro del pianificatore/strumento e ricava il timeout di funzionamento del motore come
`Budget + FinalizerGrace + engine headroom` quindi il pianificatore finale riprenderà il turno
e la pulizia del terminale hanno ancora spazio per finire.
- `Plan` diventa il budget dei tentativi per `PlanStart` e `PlanResume`
- `Tools` diventa il budget di tentativo predefinito per `ExecuteTool`

Il comportamento di attesa della coda e di attività specifico temporale viene stratificato separatamente da
l'adattatore temporale.

**Esempio completo:**

```go
Agent("data-processor", "Processes large datasets", func() {
    Use(DataToolset)
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(20))
        Timing(func() {
            Budget("30m")   // long-running data jobs
            Plan("1m")      // LLM decisions should be quick
            Tools("5m")     // data operations may take time
        })
    })
})
```

### Conserva

`Cache(dsl)` configura il comportamento di memorizzazione nella cache dei prompt per l'agente. Specifica dove il runtime deve posizionare i checkpoint della cache rispetto ai prompt di sistema e alle definizioni degli strumenti per i provider che supportano la memorizzazione nella cache.

**Contesto**: All'interno di `RunPolicy`

La memorizzazione nella cache tempestiva può ridurre significativamente i costi di inferenza e la latenza consentendo ai provider di riutilizzare i contenuti elaborati in precedenza. La funzione Cache consente di definire i limiti del checkpoint utilizzati dai provider per determinare quale contenuto può essere memorizzato nella cache.

```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

**Funzioni checkpoint cache:**


| Funzione | Descrizione || --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AfterSystem()` | Inserisce un checkpoint della cache dopo tutti i messaggi di sistema. I provider lo interpretano come un limite della cache immediatamente successivo al preambolo del sistema.         || `AfterTools()` | Inserisce un checkpoint della cache dopo le definizioni degli strumenti. I provider lo interpretano come un limite della cache immediatamente successivo alla sezione di configurazione dello strumento. |


**Supporto del fornitore:**

Non tutti i provider supportano la memorizzazione nella cache dei prompt e il supporto varia in base al tipo di checkpoint:


| Fornitore | DopoSistema | AfterTools || ----------------------- | ----------- | ---------- |
| Bedrock (modelli Claude) | ✓ | ✓ || Bedrock (modelli Nova) | ✓ | ✗|


I provider che non supportano la memorizzazione nella cache ignorano queste opzioni. Il runtime convalida i vincoli specifici del provider, ad esempio la richiesta di `AfterTools` con un modello Nova restituisce un errore.

**Quando utilizzare la cache:**

- Utilizza `AfterSystem()` quando il prompt del tuo sistema è stabile tra i turni e vuoi evitare di rielaborarlo
- Utilizzare `AfterTools()` quando le definizioni dello strumento sono stabili e si desidera memorizzare nella cache la configurazione dello strumento
- Combina entrambi per il massimo vantaggio della memorizzazione nella cache con i provider supportati

**Esempio completo:**

```go
Agent("assistant", "Conversational assistant", func() {
    Use(DocsToolset)
    Use(SearchToolset)
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(10))
        TimeBudget("5m")
        Cache(func() {
            AfterSystem()  // cache the system prompt
            AfterTools()   // cache tool definitions (Claude only)
        })
    })
})
```

### Storia

`History(dsl)` definisce il modo in cui il runtime gestisce la cronologia delle conversazioni prima di ogni invocazione del pianificatore. Le policy relative alla cronologia trasformano la cronologia dei messaggi preservando:

- Il sistema richiede all'inizio della conversazione
- Confini logici del turno (utente + assistente + chiamate/risultati dello strumento come unità atomiche)

È possibile configurare al massimo una policy della cronologia per agente.

**Contesto**: All'interno di `RunPolicy`

Sono disponibili due policy standard:

**Mantieni giri recenti (finestra scorrevole):**

`KeepRecentTurns(n)` conserva solo gli N turni utente/assistente più recenti preservando i suggerimenti del sistema e gli scambi di strumenti. Questo è l'approccio più semplice per delimitare la dimensione del contesto.

```go
RunPolicy(func() {
    History(func() {
        KeepRecentTurns(20) // Keep the last 20 user/assistant turns
    })
})
```

**Parametri:**

- `n`: Numero di turni recenti da conservare (deve essere > 0)

**Comprimi (riepilogo assistito da modello):**

`Compress(triggerAt, keepRecent)` riepiloga le svolte più vecchie utilizzando un modello mantenendo le svolte recenti in piena fedeltà. Ciò preserva più contesto di una semplice finestra scorrevole condensando le conversazioni più vecchie in un riepilogo.

```go
RunPolicy(func() {
    History(func() {
        // When at least 30 turns exist, summarize older turns
        // and keep the most recent 10 in full fidelity
        Compress(30, 10)
    })
})
```

**Parametri:**

- `triggerAt`: conteggio minimo totale dei giri prima delle corse di compressione (deve essere > 0)
- `keepRecent`: numero di giri più recenti da conservare in tutta fedeltà (deve essere >= 0 e < triggerAt)

**Requisito del modello storico:**

Quando si utilizza `Compress`, è necessario fornire un `model.Client` tramite il campo `HistoryModel` generato nella configurazione dell'agente. Il runtime utilizza questo client con `ModelClassSmall` per riepilogare i turni precedenti:

```go
// Generated agent config includes HistoryModel field when Compress is used
cfg := chat.ChatAgentConfig{
    Planner:      &ChatPlanner{},
    HistoryModel: smallModelClient, // Required: implements model.Client
}
if err := chat.RegisterChatAgent(ctx, rt, cfg); err != nil {
    log.Fatal(err)
}
```

Se `HistoryModel` non viene fornito quando è configurato `Compress`, la registrazione avrà esito negativo.

**Preservazione dei confini della svolta:**

Entrambe le politiche preservano i confini logici dei turni come unità atomiche. Un "turno" è composto da:

1. Un messaggio utente
2. La risposta dell'assistente (chiamate di testo e/o strumenti)
3. Qualsiasi strumento risulta da quella risposta

Ciò garantisce che il modello veda sempre sequenze di interazione complete, mai svolte parziali che potrebbero confondere il contesto.

### Interruzioni consentite

`InterruptsAllowed(bool)` segnala che le interruzioni human-in-the-loop dovrebbero essere rispettate. Se abilitato, il runtime supporta le operazioni di pausa/ripresa, essenziali per i cicli di chiarimento e gli stati di attesa durevoli.

**Contesto**: All'interno di `RunPolicy`

**Vantaggi principali:**

- Consente all'agente di **mettere in pausa** l'esecuzione quando mancano le informazioni richieste (vedere `OnMissingFields`).
- Consente al pianificatore di **attendere** l'input dell'utente tramite strumenti di chiarimento.
- Garantisce che lo stato dell'agente venga preservato esclusivamente durante la pausa, senza consumare risorse di elaborazione fino alla ripresa.

```go
RunPolicy(func() {
    // Enable pause/resume capability
    InterruptsAllowed(true)
    
    // Automatically pause when required tool arguments are missing
    OnMissingFields("await_clarification")
})
```

### Su campi mancanti

`OnMissingFields(action)` configura il modo in cui l'agente risponde quando la convalida dell'invocazione dello strumento rileva campi obbligatori mancanti.

**Contesto**: All'interno di `RunPolicy`

Valori validi:

- `"finalize"`: interrompe l'esecuzione quando mancano i campi obbligatori
- `"await_clarification"`: mette in pausa e attende che l'utente fornisca le informazioni mancanti
- `"resume"`: continua l'esecuzione nonostante i campi mancanti
- `""` (vuoto): lascia che sia il pianificatore a decidere in base al contesto

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

### Esempio di policy completa

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        Timing(func() {
            Budget("5m")
            Plan("30s")
            Tools("1m")
        })
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")
        History(func() {
            Compress(30, 10)
        })
    })
})
```

---

## Funzioni MCP

Goa-AI fornisce funzioni DSL per dichiarare i server MCP (Model Context Protocol) all'interno dei servizi Goa.

###MCP

`MCP(name, version, opts...)` abilita il supporto MCP per il servizio corrente. Configura il servizio per esporre strumenti, risorse e prompt tramite il protocollo MCP.

**Contesto**: All'interno di `Service`

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("add", func() {
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(func() {
            Attribute("sum", Int, "Result of addition")
            Required("sum")
        })
        Tool("add", "Add two numbers")
    })
})
```

###Versioneprotocollo

`ProtocolVersion(version)` configura la versione del protocollo MCP supportata dal server. Restituisce una funzione di configurazione da utilizzare con `MCP`.

**Contesto**: argomento opzionale per `MCP`

```go
Service("calculator", func() {
    // Specify protocol version as an option
    MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
})
```

### Strumento (nel contesto del metodo)

All'interno di un `Method` in un servizio abilitato per MCP, `Tool(name, description)` contrassegna il metodo corrente come strumento MCP. Il carico utile del metodo diventa lo schema di input dello strumento e il risultato diventa lo schema di output.

**Contesto**: All'interno di `Method` (il servizio deve avere MCP abilitato)

```go
Method("search", func() {
    Payload(func() {
        Attribute("query", String, "Search query")
        Attribute("limit", Int, "Maximum results", func() { Default(10) })
        Required("query")
    })
    Result(func() {
        Attribute("results", ArrayOf(String), "Search results")
        Required("results")
    })
    Tool("search", "Search documents by query")
})
```

### Set di strumenti con `FromMCP` / `FromExternalMCP`

Utilizzare `Toolset(FromMCP(service, toolset))` per server MCP definiti da Goa nella stessa progettazione oppure `Toolset("name", FromExternalMCP(service, toolset), func() { ... })` per server MCP esterni con schemi in linea.

**Contesto**: Primo livello

**Server MCP supportato da Goa:**

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

`FromMCP` deve puntare a un servizio Goa con lo stesso design che dichiara `MCP(...)`.
Il generatore estrae gli schemi degli strumenti dai metodi MCP di quel servizio.

**Server MCP esterno con schemi in linea:**

```go
var RemoteSearch = Toolset("remote-search", FromExternalMCP("remote", "search"), func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

`FromExternalMCP` richiede dichiarazioni `Tool(...)` in linea perché le dichiarazioni esterne
gli schemi del server non provengono dal progetto Goa locale.

### Risorsa e risorsa guardabile

`Resource(name, uri, mimeType)` contrassegna un metodo come provider di risorse MCP.

`WatchableResource(name, uri, mimeType)` contrassegna un metodo come risorsa sottoscrivibile.

**Contesto**: All'interno di `Method` (il servizio deve avere MCP abilitato)

```go
Method("readme", func() {
    Result(String)
    Resource("readme", "file:///docs/README.md", "text/markdown")
})

Method("system_status", func() {
    Result(func() {
        Attribute("status", String, "Current system status")
        Attribute("uptime", Int, "Uptime in seconds")
        Required("status", "uptime")
    })
    WatchableResource("status", "status://system", "application/json")
})
```

### StaticPrompt e DynamicPrompt

`StaticPrompt(name, description, messages...)` aggiunge un modello di prompt statico.

`DynamicPrompt(name, description)` contrassegna un metodo come generatore di prompt dinamico.

**Contesto**: All'interno di `Service` (statico) o `Method` (dinamico)

```go
Service("assistant", func() {
    MCP("assistant-mcp", "1.0")
    
    // Static prompt
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    // Dynamic prompt
    Method("code_review", func() {
        Payload(func() {
            Attribute("language", String, "Programming language")
            Attribute("code", String, "Code to review")
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
})
```

### Notifica e iscrizione

`Notification(name, description)` contrassegna un metodo come mittente della notifica MCP.

`Subscription(resourceName)` contrassegna un metodo come gestore di sottoscrizione per una risorsa guardabile.

**Contesto**: All'interno di `Method` (il servizio deve avere MCP abilitato)

```go
Method("progress_update", func() {
    Payload(func() {
        Attribute("task_id", String, "Task identifier")
        Attribute("progress", Int, "Progress percentage (0-100)")
        Required("task_id", "progress")
    })
    Notification("progress", "Task progress notification")
})

Method("subscribe_status", func() {
    Payload(func() {
        Attribute("uri", String, "Resource URI to subscribe to")
        Required("uri")
    })
    Result(String)
    Subscription("status") // Links to WatchableResource named "status"
})
```

### Monitoraggio abbonamenti

`SubscriptionMonitor(name)` contrassegna il metodo corrente come monitoraggio degli eventi inviati dal server (SSE) per gli aggiornamenti della sottoscrizione. Il metodo trasmette gli eventi di modifica della sottoscrizione ai client connessi.

**Contesto**: All'interno di `Method` (il servizio deve avere MCP abilitato)

```go
Method("watch_subscriptions", func() {
    StreamingResult(func() {
        Attribute("resource", String, "Resource URI that changed")
        Attribute("event", String, "Event type (created, updated, deleted)")
        Required("resource", "event")
    })
    SubscriptionMonitor("subscriptions")
})
```

**Quando utilizzare SubscriptionMonitor:**

- Quando i clienti necessitano di aggiornamenti in tempo reale sulle modifiche dell'abbonamento
- Per implementare endpoint SSE che inviano eventi di sottoscrizione
- Quando si creano interfacce utente reattive che rispondono alle modifiche delle risorse

### Esempio completo del server MCP

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
    StaticPrompt("greeting", "Friendly greeting",
        "system", "You are a helpful assistant",
        "user", "Hello!")
    
    Method("search", func() {
        Description("Search documents")
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        Tool("search", "Search documents by query")
    })
    
    Method("get_readme", func() {
        Result(String)
        Resource("readme", "file:///README.md", "text/markdown")
    })
    
    Method("get_status", func() {
        Result(func() {
            Attribute("status", String)
            Attribute("updated_at", String)
        })
        WatchableResource("status", "status://system", "application/json")
    })
    
    Method("subscribe_status", func() {
        Payload(func() { Attribute("uri", String) })
        Result(String)
        Subscription("status")
    })
    
    Method("review_code", func() {
        Payload(func() {
            Attribute("language", String)
            Attribute("code", String)
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Generate code review prompt")
    })
    
    Method("notify_progress", func() {
        Payload(func() {
            Attribute("task_id", String)
            Attribute("progress", Int)
            Required("task_id", "progress")
        })
        Notification("progress", "Task progress update")
    })
})
```

---

## Funzioni del registro

Goa-AI fornisce funzioni DSL per dichiarare e utilizzare registri di strumenti: cataloghi centralizzati di server MCP, set di strumenti e agenti che possono essere rilevati e utilizzati dagli agenti.

### Registro

`Registry(name, dsl)` dichiara un'origine del registro per il rilevamento degli strumenti. I registri sono cataloghi centralizzati che possono essere scoperti e utilizzati dagli agenti goa-ai.

**Contesto**: Primo livello

All'interno della funzione DSL, utilizzare:

- `URL`: imposta l'URL dell'endpoint del registro (richiesto)
- `Description`: imposta una descrizione leggibile dall'uomo
- `APIVersion`: imposta la versione dell'API del registro (il valore predefinito è "v1")
- `Security`: fa riferimento agli schemi di sicurezza di Goa per l'autenticazione
- `Timeout`: imposta il timeout della richiesta HTTP
- `Retry`: configura la politica di ripetizione per le richieste non riuscite
- `SyncInterval`: imposta la frequenza con cui aggiornare il catalogo
- `CacheTTL`: imposta la durata della cache locale
- `Federation`: configura le impostazioni di importazione del registro esterno

```go
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    Security(CorpAPIKey)
    Timeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})
```

**Opzioni di configurazione:**


| Funzione | Descrizione | Esempio || ---------------------------- | -------------------------------- | --------------------------------------- |
| `URL(endpoint)` | URL dell'endpoint del registro (obbligatorio) | `URL("https://registry.corp.internal")` || `APIVersion(version)` | Segmento del percorso della versione API | `APIVersion("v1")` || `Timeout(duration)` | Timeout della richiesta HTTP | `Timeout("30s")` || `Retry(maxRetries, backoff)` | Riprova la policy per le richieste non riuscite | `Retry(3, "1s")` || `SyncInterval(duration)` | Intervallo di aggiornamento del catalogo | `SyncInterval("5m")` || `CacheTTL(duration)` | Durata della cache locale | `CacheTTL("1h")` |


### Federazione

`Federation(dsl)` configura le impostazioni di importazione del registro esterno. Utilizza la federazione all'interno di una dichiarazione del registro per specificare quali spazi dei nomi importare da un'origine federata.

**Contesto**: All'interno di `Registry`

All'interno della funzione Federation DSL, utilizzare:

- `Include`: specifica i modelli glob per gli spazi dei nomi da importare
- `Exclude`: specifica i modelli glob per gli spazi dei nomi da ignorare

```go
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "data-*")
        Exclude("experimental/*", "deprecated/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})
```

**Includi ed escludi:**

- `Include(patterns...)`: specifica i modelli glob per gli spazi dei nomi da importare. Se non viene specificato alcun modello di inclusione, tutti gli spazi dei nomi vengono inclusi per impostazione predefinita.
- `Exclude(patterns...)`: specifica i modelli glob per gli spazi dei nomi da ignorare. I modelli di esclusione vengono applicati dopo i modelli di inclusione.

### Dal registro

`FromRegistry(registry, toolset)` configura un set di strumenti in modo che provenga da un registro. Utilizzare FromRegistry come opzione del provider quando si dichiara un set di strumenti.

**Contesto**: argomento per `Toolset`

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

// Basic usage - toolset name derived from registry toolset name
var RegistryTools = Toolset(FromRegistry(CorpRegistry, "data-tools"))

// With explicit name
var MyTools = Toolset("my-tools", FromRegistry(CorpRegistry, "data-tools"))

// With additional configuration
var ConfiguredTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
    Tags("data", "etl")
})
```

I set di strumenti supportati dal registro possono essere aggiunti a una versione specifica utilizzando la funzione DSL `Version()` standard:

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var PinnedTools = Toolset("stable-tools", FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
})
```

### Pubblica su

`PublishTo(registry)` configura la pubblicazione del registro per un set di strumenti esportato. Utilizzare PublishTo all'interno di un Export DSL per specificare in quali registri deve essere pubblicato il set di strumenti.

**Contesto**: All'interno di `Toolset` (durante l'esportazione)

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var LocalTools = Toolset("utils", func() {
    Tool("summarize", "Summarize text", func() {
        Args(func() { Attribute("text", String) })
        Return(func() { Attribute("summary", String) })
    })
})

Agent("data-agent", "Data processing agent", func() {
    Use(LocalTools)
    Export(LocalTools, func() {
        PublishTo(CorpRegistry)
        Tags("data", "etl")
    })
})
```

### Esempio di registro completo

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Define registries
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    Security(CorpAPIKey)
    Timeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})

var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Federation(func() {
        Include("web-search", "code-execution")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Consume toolsets from registries
var DataTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("2.1.0")
})

var SearchTools = Toolset(FromRegistry(AnthropicRegistry, "web-search"))

// Local toolset to publish
var AnalyticsTools = Toolset("analytics", func() {
    Tool("analyze", "Analyze dataset", func() {
        Args(func() {
            Attribute("dataset_id", String, "Dataset identifier")
            Required("dataset_id")
        })
        Return(func() {
            Attribute("insights", ArrayOf(String), "Analysis insights")
            Required("insights")
        })
    })
})

var _ = Service("orchestrator", func() {
    Agent("analyst", "Data analysis agent", func() {
        Use(DataTools)
        Use(SearchTools)
        Use(AnalyticsTools)
        
        // Export and publish to registry
        Export(AnalyticsTools, func() {
            PublishTo(CorpRegistry)
            Tags("analytics", "data")
        })
        
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

---

## Passaggi successivi

- **[Runtime](./runtime.md)** - Comprendere come i progetti si traducono in comportamento in fase di esecuzione
- **[Toolsets](./toolset.md)** - Approfondimento sui modelli di esecuzione del set di strumenti
- **[MCP Integration](./mcp-integration.md)** - Cablaggio runtime per server MCP
