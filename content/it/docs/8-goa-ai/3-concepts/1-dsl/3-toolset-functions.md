---
title: "Funzioni Toolset"
linkTitle: "Funzioni Toolset"
weight: 3
description: "Funzioni per definire toolset e tool."
---

## Toolset

`Toolset(name, dsl)` dichiara un toolset di proprietà del provider a livello superiore. Quando dichiarato a livello superiore, il toolset diventa globalmente riutilizzabile; gli agenti lo referenziano tramite `Use` e i servizi possono esporlo tramite `Export`.

**Posizione**: `dsl/toolset.go`  
**Contesto**: Livello superiore  
**Scopo**: Definisce un toolset di proprietà del provider (riutilizzabile tra agenti).

I toolset possono contenere più tool, ciascuno con schemi payload/result, prompt helper e tag di metadati.

### Esempio

```go
var DocsToolset = Toolset("docs.search", func() {
    ToolsetDescription("Tool per la ricerca nella documentazione")
    Tool("search", "Cerca nella documentazione indicizzata", func() {
        Args(func() {
            Attribute("query", String, "Frase di ricerca")
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Snippet corrispondenti")
            Required("documents")
        })
    })
})
```

## ToolsetDescription

`ToolsetDescription(description)` imposta una descrizione leggibile per il toolset corrente. Questa descrizione documenta lo scopo e le capacità del toolset.

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Toolset`  
**Scopo**: Documenta lo scopo del toolset.

### Esempio

```go
Toolset("data-tools", func() {
    ToolsetDescription("Tool per l'elaborazione e l'analisi dei dati")
    Tool("analyze", "Analizza dataset", func() {
        // definizione del tool
    })
})
```

## MCPToolset

`MCPToolset(service, toolset)` dichiara un toolset definito MCP derivato da un server MCP Goa. È un costrutto di livello superiore che gli agenti referenziano tramite `Use`.

**Posizione**: `dsl/toolset.go`  
**Contesto**: Livello superiore  
**Scopo**: Dichiara una suite MCP provider che gli agenti referenziano tramite `Use`.

Ci sono due pattern di utilizzo:

1. **Server MCP basato su Goa**: Gli schemi dei tool vengono scoperti dalle dichiarazioni `MCPTool` del servizio
2. **Server MCP esterno**: I tool sono dichiarati esplicitamente con schemi inline; richiede un `mcpruntime.Caller` a runtime

### Esempio (basato su Goa)

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

### Esempio (esterno con schemi inline)

```go
var RemoteSearch = MCPToolset("remote", "search", func() {
    Tool("web_search", "Cerca nel web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

## Tool

`Tool(name, description, dsl)` definisce una capacità invocabile all'interno di un toolset. Ha due casi d'uso distinti:

1. **Dentro un Toolset**: Dichiara un tool con schemi di argomenti e ritorno inline
2. **Dentro un Method**: Marca un metodo di servizio Goa come tool MCP (vedi [Riferimento DSL MCP](./5-mcp-functions.md))

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Toolset` o `Method`  
**Scopo**: Definisce un tool (argomenti, risultato, metadati).

La generazione del codice emette:

- Struct Go payload/result in `tool_specs/types.go`
- Codec JSON (`tool_specs/codecs.go`) usati per il marshaling delle attività e la memoria
- Definizioni JSON Schema consumate dai planner e dai livelli di validazione opzionali
- Voci del registry dei tool consumate dal runtime, inclusi prompt helper e metadati

### Esempio

```go
Tool("search", "Cerca nella documentazione indicizzata", func() {
    ToolTitle("Ricerca Documenti")
    Args(func() {
        Attribute("query", String, "Frase di ricerca")
        Attribute("limit", Int, "Risultati massimi", func() { Default(5) })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Snippet corrispondenti")
        Required("documents")
    })
    CallHintTemplate("Ricerca in corso: {{ .Query }}")
    ResultHintTemplate("Trovati {{ len .Documents }} documenti")
    Tags("docs", "search")
})
```

## Args e Return

`Args(...)` e `Return(...)` definiscono tipi payload/result usando il DSL standard degli attributi Goa. Puoi usare:

- Una funzione per definire uno schema oggetto inline con chiamate `Attribute()`
- Un tipo utente Goa (Type, ResultType, ecc.) per riutilizzare definizioni di tipo esistenti
- Un tipo primitivo (String, Int, ecc.) per input/output semplici a valore singolo

Quando usi una funzione per definire lo schema inline, puoi usare:

- `Attribute(name, type, description)` per definire ogni campo
- `Field(index, name, type, description)` per campi posizionali
- `Required(...)` per marcare campi come obbligatori
- `Example(...)` per valori di esempio
- `Default(...)` per valori predefiniti
- `Enum(...)` per valori enumerati
- `MinLength`/`MaxLength` per vincoli sulle stringhe
- `Minimum`/`Maximum` per vincoli numerici

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Tool`  
**Scopo**: Definire tipi payload/result usando il DSL standard degli attributi Goa.

### Esempio

```go
Tool("search", "Cerca documentazione", func() {
    Args(func() {
        Attribute("query", String, "Frase di ricerca")
        Attribute("limit", Int, "Risultati massimi", func() {
            Default(5)
            Minimum(1)
            Maximum(100)
        })
        Required("query")
    })
    Return(func() {
        Attribute("documents", ArrayOf(String), "Snippet corrispondenti")
        Attribute("count", Int, "Numero di risultati")
        Required("documents", "count")
    })
})
```

### Esempio (riuso dei tipi)

```go
var SearchParams = Type("SearchParams", func() {
    Attribute("query", String)
    Attribute("limit", Int)
    Required("query")
})

Tool("search", "Cerca documenti", func() {
    Args(SearchParams)
    Return(func() {
        Attribute("results", ArrayOf(String))
    })
})
```

## Sidecar

`Sidecar(...)` definisce uno schema sidecar tipizzato per i risultati dei tool. I dati sidecar vengono allegati a `planner.ToolResult.Sidecar` ma non vengono mai inviati al provider del modello—sono per artefatti a piena fedeltà che supportano un risultato limitato rivolto al modello.

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Tool`  
**Scopo**: Definisce dati strutturati allegati ai risultati ma nascosti dal modello.

### Esempio

```go
Tool("get_time_series", "Ottieni dati serie temporali", func() {
    Args(func() {
        Attribute("device_id", String, "Identificatore dispositivo")
        Required("device_id")
    })
    Return(func() {
        Attribute("summary", String, "Riepilogo per il modello")
        Attribute("count", Int, "Numero di punti dati")
    })
    Sidecar(func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Dati completi")
        Attribute("metadata", MapOf(String, String), "Metadati aggiuntivi")
    })
})
```

## ToolTitle

`ToolTitle(title)` imposta un titolo di visualizzazione user-friendly per il tool. Se non specificato, il codice generato deriva un titolo dal nome del tool convertendo snake_case o kebab-case in Title Case.

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Tool`  
**Scopo**: Imposta un titolo di visualizzazione per la presentazione UI.

### Esempio

```go
Tool("web_search", "Cerca nel web", func() {
    ToolTitle("Ricerca Web")
    Args(func() { /* ... */ })
})
```

## CallHintTemplate e ResultHintTemplate

`CallHintTemplate(template)` e `ResultHintTemplate(template)` configurano template di visualizzazione per le invocazioni e i risultati dei tool. I template sono template Go renderizzati con il payload o il risultato del tool per produrre hint concisi mostrati durante e dopo l'esecuzione.

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Tool`  
**Scopo**: Fornisce hint di visualizzazione per le UI durante l'esecuzione del tool.

I template sono compilati con `missingkey=error`. Mantieni `CallHintTemplate` conciso (≤140 caratteri raccomandati).

### Esempio

```go
Tool("search", "Cerca documenti", func() {
    Args(func() {
        Attribute("query", String)
        Attribute("limit", Int)
    })
    Return(func() {
        Attribute("count", Int)
        Attribute("results", ArrayOf(String))
    })
    CallHintTemplate("Ricerca: {{ .Query }} (limite: {{ .Limit }})")
    ResultHintTemplate("Trovati {{ .Count }} risultati")
})
```

## Tags

`Tags(values...)` annota tool o toolset con etichette di metadati. I tag vengono esposti ai motori di policy e alla telemetria, permettendo di filtrare o categorizzare i tool.

Pattern di tag comuni:

- Categorie di dominio: `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- Tipi di capacità: `"read"`, `"write"`, `"search"`, `"transform"`
- Livelli di rischio: `"safe"`, `"destructive"`, `"external"`
- Hint di performance: `"slow"`, `"fast"`, `"cached"`

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Tool` o `Toolset`  
**Scopo**: Annota tool/toolset con tag di metadati.

### Esempio

```go
Tool("delete_file", "Elimina un file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})

Toolset("admin-tools", func() {
    Tags("admin", "privileged")
    Tool("reset_system", "Resetta lo stato del sistema", func() {
        // eredita i tag del toolset
    })
})
```

## BindTo

`BindTo("Method")` o `BindTo("Service", "Method")` associa un tool a un metodo di servizio Goa. Durante la valutazione, il DSL risolve il metodo referenziato; il codegen emette spec/codec tipizzati e helper di trasformazione.

Quando un tool è legato a un metodo:

- Lo schema `Args` del tool può differire dal `Payload` del metodo
- Lo schema `Return` del tool può differire dal `Result` del metodo
- Gli adapter generati trasformano tra i tipi tool e metodo
- La validazione payload/result del metodo si applica ancora

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Tool`  
**Scopo**: Associa un tool a un'implementazione di metodo di servizio.

### Esempio

```go
var _ = Service("orchestrator", func() {
    Method("Search", func() {
        Payload(SearchPayload)
        Result(SearchResult)
    })
    
    Agent("chat", func() {
        Use("docs", func() {
            Tool("search", "Cerca documentazione", func() {
                Args(SearchPayload)
                Return(SearchResult)
                BindTo("Search") // lega al metodo sullo stesso servizio
            })
        })
    })
})
```

### Esempio (binding cross-service)

```go
Tool("notify", "Invia notifica", func() {
    Args(func() {
        Attribute("message", String)
    })
    BindTo("notifications", "send")  // metodo notifications.send
})
```

## Inject

`Inject(fields...)` marca campi payload specifici come "iniettati" (infrastruttura server-side). I campi iniettati sono:

1. Nascosti dall'LLM (esclusi dallo schema JSON inviato al modello)
2. Esposti nella struct generata con un metodo Setter
3. Destinati a essere popolati da hook runtime (`ToolInterceptor`)

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Tool`  
**Scopo**: Marca campi come solo-infrastruttura, nascosti dall'LLM.

### Esempio

```go
Tool("get_data", "Ottieni dati per la sessione corrente", func() {
    Args(func() {
        Attribute("session_id", String, "ID sessione corrente")
        Attribute("query", String, "Query dati")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String))
    })
    BindTo("data_service", "get")
    // session_id è richiesto dal servizio ma nascosto dall'LLM
    Inject("session_id")
})
```

A runtime, usa un `ToolInterceptor` per popolare i campi iniettati:

```go
func (h *Handler) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    if call.Name == "data.get_data" {
        call.Payload.SetSessionID(ctx.Value(sessionKey).(string))
    }
    return nil
}
```

## Prossimi Passi

- Impara le [Funzioni Policy](./4-policy-functions.md) per configurare il comportamento runtime
- Leggi i [Concetti Runtime](../2-runtime/) per capire come vengono eseguiti i toolset
