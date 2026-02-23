---
title: Riferimento DSL
weight: 2
description: "Complete reference for Goa-AI's DSL functions - agents, toolsets, policies, and MCP integration."
llm_optimized: true
aliases:
---

Questo documento fornisce un riferimento completo alle funzioni DSL di Goa-AI. Utilizzatelo insieme alla guida [Runtime](./runtime.md) per capire come i progetti si traducono in comportamenti di runtime.

## Riferimento rapido al DSL

| Funzione | Contesto | Descrizione |
|----------|---------|-------------|
| **Funzioni dell'agente** | | | |
| `Agent` | Service | Definisce un agente basato su LLM |
| `Use` | Agent | Dichiara il consumo del toolset |
| `Export` | Agente, Servizio | Espone i toolset ad altri agenti |
| `AgentToolset` | Argomento d'uso | Riferisce il toolset da un altro agente |
| `UseAgentToolset` | Agente | Alias per AgentToolset + Utilizzo |
| `Passthrough` | Tool (in Export) | Inoltro deterministico al metodo di servizio |
| `DisableAgentDocs` | API | Disabilita la generazione di AGENTS_QUICKSTART.md |
| **Funzioni del set di strumenti** | | | |
| `Toolset` | Di primo livello | Dichiara un toolset di proprietà del provider |
| `FromMCP` | Argomento del toolset | Configura il toolset supportato da MCP |
| `FromRegistry` | Argomento Toolset | Configura il toolset supportato dal registro |
| `Description` | Toolset | Imposta la descrizione del toolset |
| **Funzioni degli strumenti** | | |
| `Tool` | Toolset, Method | Definisce uno strumento richiamabile |
| `Args` | Tool | Definisce lo schema dei parametri di input |
| `Return` | Tool | Definisce lo schema dei risultati di output |
| `ServerData` | Tool | Definisce lo schema dei dati server (mai inviati al fornitore del modello) |
| `ServerDataDefault` | Tool | Emissione predefinita dei server-data opzionali quando `server_data` è omesso o vale `"auto"` |
| `BoundedResult` | Strumento | Contrassegna il risultato come vista delimitata; applica la forma canonica dei campi di bounds; un sotto-DSL opzionale può dichiarare i campi cursor |
| `Cursor` | BoundedResult | Dichiara quale campo del payload contiene il cursor di paginazione (opzionale) |
| `NextCursor` | BoundedResult | Dichiara quale campo del risultato contiene il cursor della pagina successiva (opzionale) |
| `Tags` | Tool, Toolset | Allega etichette di metadati |
| `BindTo` | Tool | Lega lo strumento al metodo di servizio |
| `Inject` | Tool | Contrassegna i campi come iniettati a tempo di esecuzione |
| `CallHintTemplate` | Tool | Visualizza il modello per le invocazioni |
| `ResultHintTemplate` | Strumento | Visualizza modello per i risultati |
| `ResultReminder` | Strumento | Promemoria statico del sistema dopo il risultato dello strumento |
| `Confirmation` | Tool | Richiede una conferma esplicita fuori banda prima dell'esecuzione |
| **Funzioni di policy** | | | |
| `RunPolicy` | Agent | Configura i vincoli di esecuzione |
| `DefaultCaps` | RunPolicy | Imposta limiti di risorse |
| `MaxToolCalls` | DefaultCaps | Invocazioni massime di strumenti |
| `MaxConsecutiveFailedToolCalls` | DefaultCaps | Massimo di fallimenti consecutivi |
| `TimeBudget` | RunPolicy | Limite semplice di wall clock |
| `Timing` | RunPolicy | Configurazione timeout a grana fine |
| `Budget` | Timing | Budget complessivo di esecuzione |
| `Plan` | Timing | Timeout dell'attività del pianificatore |
| `Tools` | Temporizzazione | Timeout attività strumento |
| `History` | RunPolicy | Gestione cronologia conversazioni |
| `KeepRecentTurns` | Cronologia | Politica della finestra scorrevole |
| `Compress` | Cronologia | Riassunto assistito da modelli |
| `Cache` | RunPolicy | Configurazione della cache dei prompt |
| `AfterSystem` | Cache | Checkpoint dopo i messaggi di sistema |
| `AfterTools` | Cache | Checkpoint dopo le definizioni degli strumenti |
| `InterruptsAllowed` | RunPolicy | Abilita pausa/ripresa |
| `OnMissingFields` | RunPolicy | Comportamento di convalida |
| **FunzioniMCP** | | | |
| `MCPServer` | Service | Abilita il supporto MCP |
| `MCP` | Servizio | Alias per MCPServer |
| `ProtocolVersion` | Opzione MCP | Imposta la versione del protocollo MCP |
| `MCPTool` | Metodo | Contrassegna il metodo come strumento MCP |
| `MCPToolset` | Top-level | Dichiara il set di strumenti derivati da MCP |
| `Resource` | Metodo | Marca il metodo come risorsa MCP |
| `WatchableResource` | Metodo | Marca il metodo come risorsa sottoscrivibile |
| `StaticPrompt` | Servizio | Aggiunge un modello di prompt statico |
| `DynamicPrompt` | Metodo | Marca il metodo come generatore di prompt |
| `Notification` | Metodo | Contrassegna il metodo come mittente di notifiche |
| `Subscription` | Metodo | Contrassegna il metodo come gestore di sottoscrizioni |
| `SubscriptionMonitor` | Metodo | Monitoraggio SSE per le sottoscrizioni |
| **Funzioni del registro** | | |
| `Registry` | Top-level | Dichiara un'origine del registro |
| `URL` | Registro | Imposta l'endpoint del registro |
| `APIVersion` | Registro | Imposta la versione dell'API |
| `Timeout` | Registry | Imposta timeout HTTP |
| `Retry` | Registro di sistema | Configura la politica di riprova |
| `SyncInterval` | Registro di sistema | Imposta l'intervallo di aggiornamento del catalogo |
| `CacheTTL` | Registro di sistema | Imposta la durata della cache locale |
| `Federation` | Registro di sistema | Configura l'importazione di registri esterni |
| `Include` | Federation | Pattern globali da importare |
| `Exclude` | Federation | Modelli Glob da saltare |
| `PublishTo` | Export | Configura la pubblicazione del registro |
| `Version` | Toolset | Seleziona la versione del set di strumenti del registro |
| **Funzioni dello Schema** | | | |
| `Attribute` | Args, Return, ServerData | Definisce un campo dello schema (uso generale) |
| `Field` | Args, Return, ServerData | Definisce un campo proto numerato (gRPC) |
| `Required` | Schema | Contrassegna i campi come obbligatori |

## Gestione dei prompt (percorso di integrazione v1)

Goa-AI v1 **non** richiede una DSL dedicata ai prompt (`Prompt(...)`, `Prompts(...)`).
La gestione dei prompt e attualmente guidata dal runtime:

- Registra le prompt spec baseline in `runtime.PromptRegistry`.
- Configura override con scope tramite `runtime.WithPromptStore(...)`.
- Esegue il render dei prompt dai planner con `PlannerContext.RenderPrompt(...)`.
- Allega la provenance dei prompt renderizzati in `model.Request.PromptRefs`.

Per i flussi agent-as-tool, mappa gli ID tool agli ID prompt con opzioni runtime
come `runtime.WithPromptSpec(...)` nelle registrazioni degli agent-tools.

### Campo vs Attributo

Sia `Field` che `Attribute` definiscono campi dello schema, ma hanno scopi diversi:

**`Attribute(name, type, description, dsl)`** - Definizione generale dello schema:
- Utilizzato per schemi solo JSON
- Non è richiesta la numerazione dei campi
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

**`Field(number, name, type, description, dsl)`** - Campi numerati per gRPC/protobuf:
- Richiesto quando si generano servizi gRPC
- I numeri dei campi devono essere unici e stabili
- Da utilizzare quando il servizio espone entrambi i trasporti HTTP e gRPC

```go
Args(func() {
    Field(1, "query", String, "Search query")
    Field(2, "limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**Quando usare quale:**
- Usare `Attribute` per gli strumenti dell'agente che usano solo JSON (il caso più comune)
- Usare `Field` quando il servizio Goa ha un trasporto gRPC e gli strumenti si legano a quei metodi
- La mescolanza è consentita ma non raccomandata all'interno dello stesso schema

## Panoramica

Goa-AI estende il DSL di Goa con funzioni per dichiarare agenti, set di strumenti e politiche di runtime. Il DSL è valutato dal motore `eval` di Goa, quindi si applicano le stesse regole del DSL standard per servizi/trasporti: le espressioni devono essere invocate nel contesto appropriato e le definizioni degli attributi riutilizzano il sistema di tipi di Goa (`Attribute`, `Field`, convalide, esempi, ecc.).


### Percorso di importazione

Aggiungere il DSL agenti ai pacchetti di progettazione di Goa:

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

- Pacchetti agente (`gen/<service>/agents/<agent>`) con definizioni di flussi di lavoro, attività di pianificazione e helper di registrazione
- Pacchetti proprietari del toolset (`gen/<service>/toolsets/<toolset>`) con structs tipizzati payload/result, specs, codec e (quando applicabile) transforms
- Gestori di attività per cicli di pianificazione/esecuzione/ripresa
- Aiutanti di registrazione che collegano il progetto al runtime

Un `AGENTS_QUICKSTART.md` contestuale viene scritto nella radice del modulo, a meno che non venga disabilitato tramite `DisableAgentDocs()`.

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

var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

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

- `gen/orchestrator/agents/chat`: flusso di lavoro + attività del pianificatore + registro dell'agente
- `gen/orchestrator/agents/chat/specs`: catalogo strumenti dell'agente (aggregazione di `ToolSpec`s + `tool_schemas.json`)
- `gen/orchestrator/toolsets/<toolset>`: types/specs/codecs/transforms del toolset (di proprietà del servizio)
- `gen/orchestrator/agents/chat/exports/<export>`: pacchetti di toolset esportati (agent-as-tool)
- Aiutanti di registrazione consapevoli di MCP quando un `MCPToolset` è referenziato tramite `Use`

### Identificatori di strumenti tipizzati

Ogni pacchetto di specifiche per gli strumenti definisce identificatori di strumenti tipizzati (`tools.Ident`) per ogni strumento generato:

```go
const (
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Utilizzare queste costanti ovunque sia necessario fare riferimento agli strumenti.

### Composizione in linea tra i processi

Quando l'agente A dichiara di "usare" un set di strumenti esportato dall'agente B, Goa-AI cabla automaticamente la composizione:

- Il pacchetto dell'esportatore (agente B) include gli helper generati `agenttools`
- Il registro dell'agente consumatore (agente A) utilizza tali helper quando `Use(AgentToolset("service", "agent", "toolset"))`
- La funzione `Execute` generata costruisce messaggi di pianificazione annidati, esegue l'agente provider come flusso di lavoro figlio e adatta l'agente annidato `RunOutput` in un `planner.ToolResult`

In questo modo si ottiene un singolo flusso di lavoro deterministico per ogni esecuzione dell'agente e un albero di esecuzione collegato per la composizione.

---

## Funzioni dell'agente

### Agente

`Agent(name, description, dsl)` dichiara un agente all'interno di un `Service`. Registra i metadati dell'agente in base al servizio e allega i set di strumenti tramite `Use` e `Export`.

**Contesto**: All'interno di `Service`

Ogni agente diventa una registrazione runtime con:
- Una definizione di flusso di lavoro e gestori di attività temporali
- Attività PlanStart/PlanResume con opzioni di retry/timeout derivate dal DSL
- Un helper `Register<Agent>` che registra i flussi di lavoro, le attività e i set di strumenti

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

`Use(value, dsl)` dichiara che un agente consuma un set di strumenti. Il set di strumenti può essere:

- Una variabile di primo livello `Toolset`
- Un riferimento `MCPToolset`
- Una definizione di insieme di strumenti in linea (nome della stringa + DSL)
- Un riferimento `AgentToolset` per la composizione di agenti come strumenti

**Contesto**: All'interno di `Agent`

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference with subsetting
    Use(CommonTools, func() {
        Tool("notify") // consume only this tool from CommonTools
    })
    
    // Reference an MCP toolset
    Use(MCPToolset("assistant", "assistant-mcp"))
    
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

### Esportazione

`Export(value, dsl)` dichiara i set di strumenti esposti ad altri agenti o servizi. I set di strumenti esportati possono essere consumati da altri agenti tramite `Use(AgentToolset(...))`.

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

`AgentToolset(service, agent, toolset)` fa riferimento a un set di strumenti esportato da un altro agente. Ciò consente la composizione di agenti come strumenti.

**Contesto**: Argomento di `Use`

Utilizzare `AgentToolset` quando:
- Non si dispone di un handle di espressione per il set di strumenti esportato
- Più agenti esportano set di strumenti con lo stesso nome
- Si desidera essere espliciti nella progettazione per chiarezza

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

**Alias**: `UseAgentToolset(service, agent, toolset)` è un alias che combina `AgentToolset` con `Use` in un'unica chiamata. Preferire `AgentToolset` nei nuovi progetti; l'alias esiste per la leggibilità in alcune basi di codice.

```go
// Equivalent to Use(AgentToolset("service", "planner", "planning.tools"))
Agent("orchestrator", func() {
    UseAgentToolset("service", "planner", "planning.tools")
})
```

### Passaggio

`Passthrough(toolName, target, methodName)` definisce l'inoltro deterministico di uno strumento esportato a un metodo di servizio Goa. Questo bypassa completamente il pianificatore.

**Contesto**: All'interno di `Tool` annidato sotto `Export`

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

### DisabilitaAgentDocs

`DisableAgentDocs()` disabilita la generazione di `AGENTS_QUICKSTART.md` alla radice del modulo.

**Contesto**: All'interno di `API`

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

---

## Funzioni del set di strumenti

### Set di strumenti

`Toolset(name, dsl)` dichiara un set di strumenti di proprietà del fornitore al livello superiore. Quando viene dichiarato al livello superiore, il set di strumenti diventa riutilizzabile a livello globale; gli agenti vi fanno riferimento tramite `Use`.

**Contesto**: Livello superiore

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

Gli insiemi di strumenti possono includere una descrizione utilizzando la funzione DSL standard `Description()`:

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

### Strumento

`Tool(name, description, dsl)` definisce una capacità richiamabile all'interno di un set di strumenti.

**Contesto**: All'interno di `Toolset` o `Method`

La generazione del codice emette:
- Payload/risultato Go structs in `tool_specs/types.go`
- Codec JSON (`tool_specs/codecs.go`)
- Definizioni di schemi JSON consumate dai pianificatori
- Voci del registro dello strumento con richieste di aiuto e metadati

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
    ResultHintTemplate("Found {{ len .Documents }} documents")
    Tags("docs", "search")
})
```

### Args e ritorno

`Args(...)` e `Return(...)` definiscono i tipi di payload/risultato usando il DSL standard degli attributi di Goa.

**Contesto**: All'interno di `Tool`

Si può usare:
- Una funzione per definire uno schema di oggetti in linea con chiamate `Attribute()`
- Un tipo utente Goa (Type, ResultType, ecc.) per riutilizzare le definizioni di tipo esistenti
- Un tipo primitivo (String, Int, ecc.) per semplici input/output a valore singolo

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

**Riutilizzo dei tipi:**

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

### ServerData

`ServerData(kind, val, args...)` definisce dati server tipizzati emessi insieme a un risultato di tool. I server-data non vengono mai inviati al fornitore del modello.

**Contesto**: Dentro `Tool`

**Parametri:**
- `kind`: Un identificatore di stringa per il tipo di artefatto (ad esempio, `"time_series"`, `"chart_data"`, `"full_results"`). Ciò consente ai consumatori di identificare e gestire in modo appropriato i diversi tipi di artefatto.
- `val`: la definizione dello schema, che segue gli stessi schemi di `Args` e `Return`: una funzione con chiamate `Attribute()`, un tipo utente Goa o un tipo primitivo.

**Instradamento per audience (`Audience*`):**

Ogni voce `ServerData` dichiara una audience che i consumer a valle usano per instradare il payload senza dipendere dalle convenzioni di naming del `kind`:

- `"timeline"`: persistita e idonea alla proiezione verso osservatori (ad es. card UI/timeline)
- `"internal"`: allegato per la composizione tra tool; non persistito né renderizzato
- `"evidence"`: riferimenti di provenienza; persistiti separatamente dalle card del timeline

Imposta l’audience nel blocco DSL di `ServerData`:

```go
ServerData("atlas.time_series.chart_points", TimeSeriesServerData, func() {
    AudienceInternal()
    FromMethodResultField("chart_sidecar")
})

ServerData("aura.evidence", ArrayOf(Evidence), func() {
    AudienceEvidence()
    ModeAlways()
    FromMethodResultField("evidence")
})
```

**Quando usare l'artefatto
- Quando i risultati dello strumento devono includere dati a piena fedeltà per le interfacce utente (grafici, diagrammi, tabelle), mantenendo i payload del modello limitati
- Quando si desidera allegare grandi insiemi di risultati che supererebbero i limiti del contesto del modello
- Quando i consumatori a valle hanno bisogno di dati strutturati che il modello non deve vedere

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
    ServerDataDefault("off")
})
```

**Utilizzare un tipo Goa per lo schema dell'artefatto:**

```go
var TimeSeriesArtifact = Type("TimeSeriesArtifact", func() {
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
    ServerData("atlas.metrics", TimeSeriesArtifact)
})
```

**Accesso al runtime:**

In fase di esecuzione, gli artefatti UI (proiettati dai server-data opzionali) sono disponibili su `planner.ToolResult.Artifacts`:

```go
// In a stream subscriber or result handler
func handleToolResult(result *planner.ToolResult) {
    for _, art := range result.Artifacts {
        if art.Kind == "atlas.time_series" {
            // art.Data contains the full time series for UI rendering
        }
    }
}
```

### BoundedResult

`BoundedResult()` contrassegna il risultato dello strumento corrente come una vista delimitata su un insieme di dati potenzialmente più ampio. È un contratto leggero che indica al runtime e ai servizi che questo strumento:

1. Può restituire un sottoinsieme dei dati disponibili
2. Deve far apparire i metadati di troncamento (`agent.Bounds`) accanto al suo risultato

**Contesto**: All'interno di `Tool`

`BoundedResult` impone una forma canonica per i risultati delimitati. Gli strumenti dichiarano
o tutti i campi standard (`returned`, `total`, `truncated`, `refinement_hint`), oppure nessuno e
lasciando che `BoundedResult()` li aggiunga. Le dichiarazioni parziali vengono rifiutate.

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("filter", String, "Optional filter expression")
        Attribute("limit", Int, "Maximum devices to return", func() {
            Default(100)
            Maximum(1000)
        })
        Attribute("offset", Int, "Pagination offset", func() {
            Default(0)
        })
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "List of devices")
        Attribute("returned", Int, "Number of devices returned")
        Attribute("total", Int, "Total devices matching filter")
        Attribute("truncated", Boolean, "Whether results were truncated")
        Required("devices", "returned", "truncated")
    })
    BoundedResult()
})
```

**Il contratto agent.Bounds:**

Quando uno strumento è contrassegnato con `BoundedResult()`, i tipi di risultato generati implementano
`agent.BoundedResult` tramite `ResultBounds()`, e il runtime deriva `planner.ToolResult.Bounds` da questo metodo:

```go
// agent.Bounds describes how a tool result has been bounded
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied
    RefinementHint string // Guidance on how to narrow the query
}

// agent.BoundedResult interface for typed results
type BoundedResult interface {
    ResultBounds() *Bounds
}
```

**Responsabilità del servizio:**

I servizi sono responsabili di:
1. Applicare la propria logica di troncamento (impaginazione, limiti, limiti di profondità)
2. Popolazione dei metadati dei limiti nel risultato
3. Fornendo facoltativamente un `RefinementHint` quando i risultati vengono troncati

Il runtime non calcola i sottoinsiemi o i troncamenti, ma si limita a far sì che gli strumenti vincolati presentino un contratto `Bounds` coerente sui loro risultati.

**Quando usare BoundedResult:**

- Strumenti che restituiscono elenchi paginati (dispositivi, utenti, record)
- Strumenti che interrogano grandi insiemi di dati con limiti di risultato
- Strumenti che applicano limiti di profondità o di dimensione a strutture annidate
- Qualsiasi strumento in cui il modello deve comprendere che i risultati possono essere incompleti

**Esempio completo con limiti:**

```go
var DeviceToolset = Toolset("devices", func() {
    Tool("list_devices", "List IoT devices", func() {
        Args(func() {
            Attribute("site_id", String, "Site identifier")
            Attribute("status", String, "Filter by status", func() {
                Enum("online", "offline", "unknown")
            })
            Attribute("limit", Int, "Maximum results", func() {
                Default(50)
                Maximum(500)
            })
            Required("site_id")
        })
        Return(func() {
            Attribute("devices", ArrayOf(Device), "Matching devices")
            Attribute("returned", Int, "Count of returned devices")
            Attribute("total", Int, "Total matching devices")
            Attribute("truncated", Boolean, "Results were capped")
            Attribute("refinement_hint", String, "How to narrow results")
            Required("devices", "returned", "truncated")
        })
        BoundedResult()
        BindTo("DeviceService", "ListDevices")
    })
})
```

**Comportamento in fase di esecuzione:**

Quando viene eseguito uno strumento delimitato:
1. Il runtime decodifica il risultato e controlla l'implementazione di `agent.BoundedResult`
2. Se il risultato implementa l'interfaccia, viene richiamato `ResultBounds()` per estrarre i limiti
3. I metadati dei limiti vengono allegati a `planner.ToolResult.Bounds`
4. I sottoscrittori e i finalizzatori del flusso possono accedere ai limiti per la visualizzazione dell'interfaccia utente o per la registrazione

Gli strumenti possono includere un titolo di visualizzazione usando la funzione DSL standard `Title()`:

```go
Tool("web_search", "Search the web", func() {
    Title("Web Search")
    Args(func() { /* ... */ })
})
```

### Conferma

`Confirmation(dsl)` dichiara che uno strumento deve essere approvato esplicitamente fuori banda prima di essere eseguito
essere eseguito. Ciò è previsto per gli strumenti **sensibili all'operatore** (scritture, cancellazioni, comandi).

**Contesto**: All'interno di `Tool`

Al momento della generazione, Goa-AI registra la politica di conferma nelle specifiche dello strumento generato. In fase di esecuzione, il
flusso di lavoro emette una richiesta di conferma utilizzando `AwaitConfirmation` ed esegue lo strumento solo dopo che è stata fornita un'approvazione esplicita
approvazione esplicita.

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

- Il runtime è responsabile del modo in cui viene richiesta la conferma. Il protocollo di conferma incorporato utilizza una chiamata dedicata
  `AwaitConfirmation` await e una chiamata decisionale `ProvideConfirmation`. Vedere la guida al runtime per i
  payload previsti e il flusso di esecuzione.
- I modelli di conferma (`PromptTemplate` e `DeniedResultTemplate`) sono stringhe di Go `text/template`
  eseguite con `missingkey=error`. Oltre alle funzioni standard dei template (ad esempio `printf`),
  Goa-AI fornisce:
  - `json v` → codifica JSON `v` (utile per i campi opzionali dei puntatori o per incorporare valori strutturati).
  - `quote s` → restituisce una stringa quotata Go-escaped (come `fmt.Sprintf("%q", s)`).
- La conferma può anche essere attivata dinamicamente in fase di esecuzione tramite `runtime.WithToolConfirmation(...)`
  (utile per le politiche basate sull'ambiente o per le sovrascritture per la distribuzione).

### CallHintTemplate e ResultHintTemplate

`CallHintTemplate(template)` e `ResultHintTemplate(template)` configurano i modelli di visualizzazione per le invocazioni e i risultati degli strumenti. I modelli sono stringhe di testo/template Go rese con il payload o la struttura dei risultati digitati dallo strumento, per produrre suggerimenti concisi mostrati durante e dopo l'esecuzione.

**Contesto**: All'interno di `Tool`

**Punti chiave

- I modelli ricevono strutture Go tipizzate, non JSON grezzo; utilizzare i nomi dei campi Go (ad esempio, `.Query`, `.DeviceID`) e non le chiavi JSON (ad esempio, `.query`, `.device_id`)
- Mantenere i suggerimenti concisi: ≤140 caratteri consigliati per una visualizzazione pulita dell'interfaccia utente
- I modelli sono compilati con `missingkey=error`: tutti i campi di riferimento devono esistere
- Usare i blocchi `{{ if .Field }}` o `{{ with .Field }}` per i campi opzionali

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
    ResultHintTemplate("Found {{ .Count }} results")
})
```

**Campi struttura tipizzati:**

I modelli ricevono le strutture di payload/risultato generate da Go. I nomi dei campi seguono le convenzioni di denominazione di Go (PascalCase), non quelle di JSON (snake_case o camelCase):

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
    ResultHintTemplate("{{ .DeviceName }}: {{ if .IsOnline }}online{{ else }}offline{{ end }}")
})
```

**Gestione dei campi opzionali:**

Utilizzare i blocchi condizionali per i campi opzionali per evitare errori di template:

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
    ResultHintTemplate("{{ .Total }} items{{ if .Truncated }} (truncated){{ end }}")
})
```

**Funzioni integrate nei template:**

Il runtime fornisce queste funzioni di aiuto per i modelli di suggerimento:

| Funzione | Descrizione | Esempio |
|----------|-------------|---------|
| `join` | Unisce slice di stringhe con separatore | `{{ join .Tags ", " }}` |
| `count` | Conta gli elementi in una slice | `{{ count .Results }} items` |
| `truncate` | Tronca la stringa a N caratteri | `{{ truncate .Query 20 }}` |

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
    ResultHintTemplate("{{ count .Insights }} insights in {{ .ProcessingTimeMs }}ms")
})
```

### Promemoria dei risultati

`ResultReminder(text)` configura un promemoria statico di sistema che viene iniettato nella conversazione dopo la restituzione del risultato dello strumento. Si usa per fornire al modello una guida dietro le quinte su come interpretare o presentare il risultato all'utente.

**Contesto**: All'interno di `Tool`

Il testo del promemoria viene automaticamente avvolto nei tag `<system-reminder>` dal runtime. Non includere i tag nel testo.

**Promemoria statici e dinamici

`ResultReminder` è per i promemoria statici, in tempo di progettazione, che si applicano ogni volta che lo strumento viene richiamato. Per i promemoria dinamici che dipendono dallo stato di runtime o dal contenuto dei risultati dello strumento, utilizzare invece `PlannerContext.AddReminder()` nell'implementazione del pianificatore. I promemoria dinamici supportano:
- Limitazione della velocità (turni minimi tra le emissioni)
- Limiti per corsa (emissioni massime per corsa)
- Aggiunta/rimozione di tempo di esecuzione in base alle condizioni
- Livelli di priorità (sicurezza o guida)

**Esempio di base

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

**Quando usare ResultReminder:**

- Quando l'interfaccia utente rende i risultati dello strumento in un modo speciale (grafici, diagrammi, tabelle) di cui il modello deve essere a conoscenza
- Quando il modello deve evitare di ripetere informazioni già visibili all'utente
- Quando c'è un contesto importante nella presentazione dei risultati che influisce sulla risposta del modello
- Quando si desidera una guida coerente che si applichi a ogni invocazione dello strumento

**Strumenti multipli con promemoria:**

Quando più strumenti in un singolo turno hanno dei promemoria sui risultati, vengono combinati in un unico messaggio di sistema:

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

**Ricordi dinamici tramite PlannerContext:**

Per i promemoria che dipendono da condizioni di runtime, utilizzare invece l'API del pianificatore:

```go
// In your planner implementation
func (p *MyPlanner) PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Add a dynamic reminder based on tool results
    for _, tr := range input.ToolResults {
        if tr.Name == "get_time_series" && hasAnomalies(tr.Result) {
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

`Tags(values...)` annota gli strumenti o i set di strumenti con etichette di metadati. I tag vengono visualizzati dai motori delle politiche e dalla telemetria.

**Contesto**: All'interno di `Tool` o `Toolset`

Modelli comuni di tag:
- Categorie di dominio: `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- Tipi di capacità: `"read"`, `"write"`, `"search"`, `"transform"`
- Livelli di rischio: `"safe"`, `"destructive"`, `"external"`

```go
Tool("delete_file", "Delete a file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})
```

### BindTo

`BindTo("Method")` o `BindTo("Service", "Method")` associa uno strumento a un metodo di servizio Goa.

**Contesto**: All'interno di `Tool`

Quando uno strumento è legato a un metodo:
- Lo schema `Args` dello strumento può differire da quello del metodo `Payload`
- Lo schema `Return` dello strumento può differire da quello del metodo `Result`
- Gli adattatori generati trasformano tra i tipi di strumento e di metodo

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

`Inject(fields...)` contrassegna campi specifici del payload come "iniettati" (infrastruttura lato server). I campi iniettati sono:

1. Nascosti dall'LLM (esclusi dallo schema JSON inviato al modello)
2. Esposti nella struct generata con un metodo Setter
3. Destinato a essere popolato dagli hook di runtime (`ToolInterceptor`)

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

In fase di esecuzione, utilizzare un `ToolInterceptor` per popolare i campi iniettati:

```go
func (h *Handler) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    if call.Name == "data.get_data" {
        call.Payload.SetSessionID(ctx.Value(sessionKey).(string))
    }
    return nil
}
```

---

## Funzioni della politica

### EseguiPolitica

`RunPolicy(dsl)` configura i limiti di esecuzione applicati in fase di esecuzione. È dichiarata all'interno di un `Agent` e contiene impostazioni di policy come i limiti massimi, i budget di tempo, la gestione della cronologia e la gestione delle interruzioni.

**Contesto**: All'interno di `Agent`

**Funzioni di criterio disponibili:**
- `DefaultCaps` - limiti di risorse (chiamate di strumenti, fallimenti consecutivi)
- `TimeBudget` - limite semplice di wall-clock per l'intera esecuzione
- `Timing` - timeout a grana fine per attività di budget, pianificazione e strumento (avanzato)
- `History` - gestione della cronologia delle conversazioni (finestra scorrevole o compressione)
- `InterruptsAllowed` - abilitazione della pausa/ripresa per l'operatore nel loop
- `OnMissingFields` - comportamento di convalida per i campi obbligatori mancanti

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

### Capsule predefinite

`DefaultCaps(opts...)` applica i limiti di capacità per prevenire i cicli di fuga e applicare i limiti di esecuzione.

**Contesto**: All'interno di `RunPolicy`

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

**MaxToolCalls(n)**: Imposta il numero massimo di invocazioni di strumenti consentite. Se viene superato, il runtime si interrompe.

**MaxConsecutiveFailedToolCalls(n)**: Imposta il numero massimo di chiamate consecutive fallite allo strumento prima dell'interruzione. Previene i cicli di ripetizione infiniti.

### Bilancio di tempo

`TimeBudget(duration)` impone un limite di tempo all'esecuzione dell'agente. La durata è specificata come stringa (ad esempio, `"2m"`, `"30s"`).

**Contesto**: All'interno di `RunPolicy`

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

Per un controllo a grana fine sui timeout delle singole attività, utilizzare invece `Timing`.

### Temporizzazione

`Timing(dsl)` fornisce una configurazione dei timeout a grana fine come alternativa a `TimeBudget`. Mentre `TimeBudget` imposta un unico limite complessivo, `Timing` consente di controllare i timeout a tre livelli: il budget complessivo dell'esecuzione, le attività del pianificatore (inferenza LLM) e le attività di esecuzione degli strumenti.

**Contesto**: All'interno di `RunPolicy`

**Quando usare Timing vs TimeBudget?
- Usare `TimeBudget` per casi semplici in cui un singolo limite di wall-clock è sufficiente
- Utilizzare `Timing` quando sono necessari timeout diversi per la pianificazione e per l'esecuzione degli strumenti, ad esempio quando gli strumenti effettuano chiamate API esterne lente ma si vogliono risposte LLM veloci

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock budget for the entire run
        Plan("45s")     // timeout for Plan/Resume activities (LLM inference)
        Tools("2m")     // default timeout for ExecuteTool activities
    })
})
```

**Funzioni di temporizzazione

| Funzione | Descrizione | Influenza |
|----------|-------------|---------|
| `Budget(duration)` | Budget totale di wall-clock per la corsa | Intero ciclo di vita della corsa |
| `Plan(duration)` | Timeout per le attività Plan e Resume | Chiamate di inferenza LLM tramite il pianificatore |
| `Tools(duration)` | Timeout predefinito per le attività ExecuteTool | Esecuzione di strumenti (chiamate di servizio, MCP, agent-as-tool) |

**Come la temporizzazione influisce sul comportamento in fase di esecuzione

Il runtime traduce questi valori DSL in opzioni di attività temporali (o timeout equivalenti del motore):
- `Budget` diventa il timeout di esecuzione del flusso di lavoro
- `Plan` diventa il timeout dell'attività per le attività `PlanStart` e `PlanResume`
- `Tools` diventa il timeout predefinito per le attività `ExecuteTool`

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

### Cache

`Cache(dsl)` configura il comportamento della cache dei prompt per l'agente. Specifica dove il runtime deve posizionare i checkpoint della cache rispetto ai prompt di sistema e alle definizioni degli strumenti per i provider che supportano la cache.

**Contesto**: All'interno di `RunPolicy`

La cache dei prompt può ridurre significativamente i costi di inferenza e la latenza, consentendo ai provider di riutilizzare i contenuti precedentemente elaborati. La funzione Cache consente di definire i limiti dei checkpoint che i provider utilizzano per determinare quali contenuti possono essere messi in cache.

```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

**Funzioni di checkpoint della cache:**

| Funzione | Descrizione |
|----------|-------------|
| `AfterSystem()` | Colloca un checkpoint della cache dopo tutti i messaggi di sistema. I provider lo interpretano come un limite della cache immediatamente successivo al preambolo del sistema. |
| `AfterTools()` | Posiziona un checkpoint della cache dopo le definizioni degli strumenti. I provider interpretano questo punto come un limite della cache immediatamente successivo alla sezione di configurazione dello strumento. |

**Supporto dei provider:**

Non tutti i provider supportano la cache immediata e il supporto varia a seconda del tipo di checkpoint:

| Provider | AfterSystem | AfterTools |
|----------|-------------|------------|
bedrock (modelli Claude) | ✓ | ✓ | ✓ |
bedrock (modelli Nova) | ✓ | ✗ | ✗ |

I provider che non supportano la cache ignorano queste opzioni. Il runtime convalida i vincoli specifici del provider. Ad esempio, la richiesta di `AfterTools` con un modello Nova restituisce un errore.

**Quando usare la cache

- Usare `AfterSystem()` quando il prompt del sistema è stabile tra i vari turni e si vuole evitare di rielaborarlo
- Usare `AfterTools()` quando le definizioni degli strumenti sono stabili e si desidera memorizzare nella cache la configurazione degli strumenti
- Combinare entrambi per ottenere il massimo beneficio dalla cache con i provider supportati

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

`History(dsl)` definisce come il runtime gestisce la cronologia delle conversazioni prima di ogni invocazione del pianificatore. Le politiche di cronologia trasformano la cronologia dei messaggi preservando:

- Le richieste del sistema all'inizio della conversazione
- I confini logici del turno (utente + assistente + chiamate/risultati dello strumento come unità atomiche)

Per ogni agente è possibile configurare al massimo un criterio di cronologia.

**Contesto**: All'interno di `RunPolicy`

Sono disponibili due criteri standard:

**RiprendiGiro (finestra scorrevole):**

`KeepRecentTurns(n)` conserva solo gli ultimi N turni dell'utente/assistente, preservando le richieste del sistema e gli scambi di strumenti. Questo è l'approccio più semplice per limitare le dimensioni del contesto.

```go
RunPolicy(func() {
    History(func() {
        KeepRecentTurns(20) // Keep the last 20 user/assistant turns
    })
})
```

**Parametri:**
- `n`: Numero di turni recenti da mantenere (deve essere > 0)

**Compressione (Riassunto assistito dal modello):**

`Compress(triggerAt, keepRecent)` riassume i turni più vecchi usando un modello, mantenendo i turni recenti in piena fedeltà. In questo modo si preserva un contesto maggiore rispetto a una semplice finestra scorrevole, condensando le conversazioni più vecchie in un riassunto.

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
- `triggerAt`: Numero minimo di giri totali prima dell'esecuzione della compressione (deve essere > 0)
- `keepRecent`: Numero di turni più recenti da conservare in piena fedeltà (deve essere >= 0 e < triggerAt)

**HistoryModel Requirement:**

When using `Compress`, è necessario fornire un `model.Client` tramite il campo generato `HistoryModel` nella configurazione dell'agente. Il runtime utilizza questo client con `ModelClassSmall` per riassumere i turni più vecchi:

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

Se `HistoryModel` non viene fornito quando `Compress` è configurato, la registrazione fallirà.

**Preservazione dei confini del giro:**

Entrambe le politiche conservano i confini logici delle svolte come unità atomiche. Un "giro" è costituito da:
1. Un messaggio dell'utente
2. La risposta dell'assistente (testo e/o chiamate allo strumento)
3. Qualsiasi risultato dello strumento derivante dalla risposta

In questo modo si garantisce che il modello veda sempre sequenze di interazione complete, e non turni parziali che potrebbero confondere il contesto.

### Interruzioni consentite
 
`InterruptsAllowed(bool)` segnala che le interruzioni umane nel ciclo devono essere rispettate. Se abilitato, il runtime supporta le operazioni di pausa/ripresa, essenziali per i loop di chiarimento e gli stati di attesa durevoli.
 
**Contesto**: All'interno di `RunPolicy`
 
**Benefici chiave:**
- Consente all'agente di mettere in **pausa** l'esecuzione quando mancano informazioni necessarie (vedere `OnMissingFields`).
- Consente al pianificatore di **attendere** l'input dell'utente tramite strumenti di chiarimento.
- Assicura che lo stato dell'agente sia conservato esclusivamente durante la pausa, senza consumare risorse di calcolo fino alla ripresa.
 
```go
RunPolicy(func() {
    // Enable pause/resume capability
    InterruptsAllowed(true)
    
    // Automatically pause when required tool arguments are missing
    OnMissingFields("await_clarification")
})
```

### OnMissingFields

`OnMissingFields(action)` configura la risposta dell'agente quando la convalida dell'invocazione dello strumento rileva la mancanza di campi obbligatori.

**Contesto**: All'interno di `RunPolicy`

Valori validi:
- `"finalize"`: Interrompe l'esecuzione quando mancano i campi obbligatori
- `"await_clarification"`: Mette in pausa e attende che l'utente fornisca le informazioni mancanti
- `"resume"`: Continua l'esecuzione nonostante i campi mancanti
- `""` (vuoto): Lascia che il pianificatore decida in base al contesto

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

### Esempio di politica completa

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

Goa-AI fornisce funzioni DSL per dichiarare i server Model Context Protocol (MCP) all'interno dei servizi Goa.

### MCPServer

`MCPServer(name, version, opts...)` abilita il supporto MCP per il servizio corrente. Configura il servizio per esporre strumenti, risorse e richieste tramite il protocollo MCP.

**Alias**: `MCP(name, version, opts...)` è un alias di `MCPServer`. Il comportamento di entrambe le funzioni è identico.

**Contesto**: All'interno di `Service`

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    // Using MCPServer
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    // Or equivalently using the MCP alias
    // MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
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
        MCPTool("add", "Add two numbers")
    })
})
```

### ProtocolVersion

`ProtocolVersion(version)` configura la versione del protocollo MCP supportata dal server. Restituisce una funzione di configurazione da usare con `MCPServer` o `MCP`.

**Contesto**: Argomento opzionale di `MCPServer` o `MCP`

```go
Service("calculator", func() {
    // Specify protocol version as an option
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
})
```

### MCPTool

`MCPTool(name, description)` contrassegna il metodo corrente come strumento MCP. Il payload del metodo diventa lo schema di input dello strumento e il risultato diventa lo schema di output.

**Contesto**: All'interno di `Method` (il servizio deve essere abilitato a MCP)

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
    MCPTool("search", "Search documents by query")
})
```

### MCPToolset

`MCPToolset(service, toolset)` dichiara un insieme di strumenti definiti da MCP e derivati da un server MCP Goa.

**Contesto**: Livello superiore

Esistono due modelli di utilizzo:

**Server MCP supportato da Goa:**

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

**Server MCP esterno con schemi in linea:**

```go
var RemoteSearch = MCPToolset("remote", "search", func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

### Risorsa e risorsa guardabile

`Resource(name, uri, mimeType)` contrassegna un metodo come fornitore di risorse MCP.

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
    MCPServer("assistant", "1.0")
    
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

### Notifica e sottoscrizione

`Notification(name, description)` contrassegna un metodo come mittente di notifiche MCP.

`Subscription(resourceName)` contrassegna un metodo come gestore di sottoscrizioni per una risorsa osservabile.

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

### SubscriptionMonitor

`SubscriptionMonitor(name)` contrassegna il metodo corrente come monitor di eventi inviati dal server (SSE) per gli aggiornamenti delle sottoscrizioni. Il metodo trasmette gli eventi di modifica dell'abbonamento ai client connessi.

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

**Quando usare SubscriptionMonitor:**
- Quando i client hanno bisogno di aggiornamenti in tempo reale sulle modifiche agli abbonamenti
- Per l'implementazione di endpoint SSE che inviano eventi di sottoscrizione
- Quando si costruiscono interfacce utente reattive che rispondono alle modifiche delle risorse

### Esempio completo di server MCP

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
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
        MCPTool("search", "Search documents by query")
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

## Funzioni di registro

Goa-AI fornisce funzioni DSL per dichiarare e consumare i registri degli strumenti, ossia cataloghi centralizzati di server MCP, set di strumenti e agenti che possono essere scoperti e consumati dagli agenti.

### Registro

`Registry(name, dsl)` dichiara un'origine di registro per la scoperta degli strumenti. I registri sono cataloghi centralizzati che possono essere scoperti e consumati dagli agenti goa-ai.

**Contesto**: Livello superiore

All'interno della funzione DSL, utilizzare:
- `URL`: imposta l'URL dell'endpoint del registro (obbligatorio)
- `Description`: imposta una descrizione leggibile dall'uomo
- `APIVersion`: imposta la versione dell'API del registro (predefinita a "v1")
- `Security`: fa riferimento agli schemi di sicurezza Goa per l'autenticazione
- `Timeout`: imposta il timeout della richiesta HTTP
- `Retry`: configura la politica di ritentativo per le richieste fallite
- `SyncInterval`: imposta la frequenza di aggiornamento del catalogo
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

| Funzione | Descrizione | Esempio |
|----------|-------------|---------|
| `URL(endpoint)` | URL dell'endpoint del registro (obbligatorio) | `URL("https://registry.corp.internal")` |
| `APIVersion(version)` | Segmento del percorso della versione API | `APIVersion("v1")` |
| `Timeout(duration)` | Timeout della richiesta HTTP | `Timeout("30s")` |
| `Retry(maxRetries, backoff)` | Criterio di riprova per le richieste non andate a buon fine | `Retry(3, "1s")` |
| `SyncInterval(duration)` | Intervallo di aggiornamento del catalogo | `SyncInterval("5m")` |
| `CacheTTL(duration)` | Durata della cache locale | `CacheTTL("1h")` |

### Federazione

`Federation(dsl)` configura le impostazioni di importazione del registro esterno. Usare Federation all'interno di una dichiarazione di registro per specificare quali spazi dei nomi importare da una fonte federata.

**Contesto**: All'interno di `Registry`

All'interno della funzione Federation DSL, utilizzare:
- `Include`: specifica i pattern glob per gli spazi dei nomi da importare
- `Exclude`: specifica i modelli glob per gli spazi dei nomi da saltare

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

**Includere ed escludere:**

- `Include(patterns...)`: Specifica i pattern glob per gli spazi dei nomi da importare. Se non sono specificati pattern di inclusione, tutti gli spazi dei nomi sono inclusi per impostazione predefinita.
- `Exclude(patterns...)`: Specifica i pattern globali per gli spazi dei nomi da saltare. I modelli Exclude vengono applicati dopo i modelli Include.

### FromRegistry

`FromRegistry(registry, toolset)` configura un set di strumenti da cui attingere da un registro. Usare FromRegistry come opzione del fornitore quando si dichiara un set di strumenti.

**Contesto**: Argomento di `Toolset`

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

I set di strumenti supportati dal registro possono essere agganciati a una versione specifica usando la funzione DSL standard `Version()`:

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var PinnedTools = Toolset("stable-tools", FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
})
```

### PubblicaPer

`PublishTo(registry)` configura la pubblicazione del registro per un set di strumenti esportato. Usare PublishTo all'interno di un DSL di esportazione per specificare i registri su cui pubblicare il set di strumenti.

**Contesto**: All'interno di `Toolset` (quando viene esportato)

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

## Passi successivi

- **[Runtime](./runtime.md)** - Capire come i progetti si traducono in comportamenti di runtime
- **[Toolset](./toolsets.md)** - Approfondimento dei modelli di esecuzione dei toolset
- **[Integrazione MCP](./mcp-integration.md)** - Cablaggio runtime per i server MCP
