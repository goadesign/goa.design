---
title: "Funzioni MCP DSL"
linkTitle: "Funzioni MCP DSL"
weight: 5
description: "Funzioni per dichiarare server MCP, tool, risorse e prompt."
---

## Panoramica

Goa-AI fornisce funzioni DSL per dichiarare server Model Context Protocol (MCP) all'interno dei servizi Goa. Queste funzioni permettono ai servizi di esporre tool, risorse e prompt tramite il protocollo MCP.

Le dichiarazioni MCP generano:

- Codice handler del server MCP con trasporto JSON-RPC
- Registrazioni di tool/risorse/prompt
- Helper client per consumare server MCP
- Integrazione con toolset degli agenti tramite `MCPToolset`

## MCPServer

`MCPServer(name, version, opts...)` abilita il supporto MCP per il servizio corrente. Configura il servizio per esporre tool, risorse e prompt tramite il protocollo MCP.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Service`  
**Scopo**: Dichiara un server MCP per il servizio.

### Argomenti

- `name`: Il nome del server MCP (usato nell'handshake MCP)
- `version`: La stringa di versione del server
- `opts...`: Funzioni di configurazione opzionali (es., `ProtocolVersion`)

### Esempio

```go
Service("calculator", func() {
    Description("Server MCP calcolatrice")
    
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("add", func() {
        Payload(func() {
            Attribute("a", Int, "Primo numero")
            Attribute("b", Int, "Secondo numero")
            Required("a", "b")
        })
        Result(func() {
            Attribute("sum", Int, "Risultato dell'addizione")
            Required("sum")
        })
        MCPTool("add", "Somma due numeri")
    })
})
```

## ProtocolVersion

`ProtocolVersion(version)` configura la versione del protocollo MCP supportata dal server. Restituisce una funzione di configurazione da usare con `MCPServer`.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Argomento di `MCPServer`  
**Scopo**: Imposta la versione del protocollo MCP.

### Esempio

```go
MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
```

## MCPTool

`MCPTool(name, description)` marca il metodo corrente come tool MCP. Il payload del metodo diventa lo schema di input del tool e il risultato del metodo diventa lo schema di output del tool.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Method` (il servizio deve avere MCP abilitato)  
**Scopo**: Espone un metodo di servizio come tool MCP.

### Esempio

```go
Method("search", func() {
    Payload(func() {
        Attribute("query", String, "Query di ricerca")
        Attribute("limit", Int, "Risultati massimi", func() { Default(10) })
        Required("query")
    })
    Result(func() {
        Attribute("results", ArrayOf(String), "Risultati della ricerca")
        Required("results")
    })
    MCPTool("search", "Cerca documenti per query")
})
```

## Resource

`Resource(name, uri, mimeType)` marca il metodo corrente come provider di risorse MCP. Il risultato del metodo diventa il contenuto della risorsa restituito quando i client leggono la risorsa.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Method` (il servizio deve avere MCP abilitato)  
**Scopo**: Espone un metodo di servizio come risorsa MCP.

### Argomenti

- `name`: Il nome della risorsa (usato nella lista risorse MCP)
- `uri`: L'URI della risorsa (es., `"file:///docs/readme.md"`)
- `mimeType`: Il tipo MIME del contenuto (es., `"text/plain"`, `"application/json"`)

### Esempio

```go
Method("readme", func() {
    Result(String)
    Resource("readme", "file:///docs/README.md", "text/markdown")
})
```

## WatchableResource

`WatchableResource(name, uri, mimeType)` marca il metodo corrente come risorsa MCP che supporta le sottoscrizioni. I client possono sottoscriversi per ricevere notifiche quando il contenuto della risorsa cambia.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Method` (il servizio deve avere MCP abilitato)  
**Scopo**: Espone una risorsa osservabile/sottoscrivibile.

### Esempio

```go
Method("system_status", func() {
    Result(func() {
        Attribute("status", String, "Stato attuale del sistema")
        Attribute("uptime", Int, "Uptime in secondi")
        Required("status", "uptime")
    })
    WatchableResource("status", "status://system", "application/json")
})
```

## StaticPrompt

`StaticPrompt(name, description, messages...)` aggiunge un template di prompt statico al server MCP. I prompt statici forniscono sequenze di messaggi predefinite che i client possono usare senza parametri.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Service` (il servizio deve avere MCP abilitato)  
**Scopo**: Dichiara un template di prompt statico.

### Argomenti

- `name`: L'identificatore del prompt
- `description`: Descrizione leggibile del prompt
- `messages...`: Stringhe alternate di ruolo e contenuto (es., `"user"`, `"text"`, `"system"`, `"text"`)

### Esempio

```go
Service("assistant", func() {
    MCPServer("assistant", "1.0")
    
    StaticPrompt("greeting", "Saluto amichevole",
        "system", "Sei un assistente utile",
        "user", "Ciao!")
    
    StaticPrompt("code_help", "Assistenza alla programmazione",
        "system", "Sei un programmatore esperto",
        "user", "Aiutami con il mio codice")
})
```

## DynamicPrompt

`DynamicPrompt(name, description)` marca il metodo corrente come generatore di prompt dinamico. Il payload del metodo definisce i parametri che personalizzano il prompt generato, e il risultato contiene la sequenza di messaggi generata.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Method` (il servizio deve avere MCP abilitato)  
**Scopo**: Dichiara un generatore di prompt parametrizzato.

### Esempio

```go
Method("code_review", func() {
    Payload(func() {
        Attribute("language", String, "Linguaggio di programmazione")
        Attribute("code", String, "Codice da revisionare")
        Required("language", "code")
    })
    Result(ArrayOf(Message))
    DynamicPrompt("code_review", "Genera prompt per code review")
})
```

## Notification

`Notification(name, description)` marca il metodo corrente come mittente di notifiche MCP. Il payload del metodo definisce la struttura del messaggio di notifica.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Method` (il servizio deve avere MCP abilitato)  
**Scopo**: Dichiara un tipo di notifica.

### Esempio

```go
Method("progress_update", func() {
    Payload(func() {
        Attribute("task_id", String, "Identificatore del task")
        Attribute("progress", Int, "Percentuale di progresso (0-100)")
        Required("task_id", "progress")
    })
    Notification("progress", "Notifica di progresso del task")
})
```

## Subscription

`Subscription(resourceName)` marca il metodo corrente come handler di sottoscrizione per una risorsa osservabile. Il metodo viene invocato quando i client si sottoscrivono alla risorsa identificata da `resourceName`.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Method` (il servizio deve avere MCP abilitato)  
**Scopo**: Gestisce le sottoscrizioni alle risorse.

### Esempio

```go
Method("subscribe_status", func() {
    Payload(func() {
        Attribute("uri", String, "URI della risorsa a cui sottoscriversi")
        Required("uri")
    })
    Result(String)
    Subscription("status") // Collega alla WatchableResource chiamata "status"
})
```

## SubscriptionMonitor

`SubscriptionMonitor(name)` marca il metodo corrente come monitor server-sent events (SSE) per gli aggiornamenti delle sottoscrizioni. Il metodo trasmette eventi di cambio sottoscrizione ai client connessi.

**Posizione**: `dsl/mcp.go`  
**Contesto**: Dentro `Method` (il servizio deve avere MCP abilitato)  
**Scopo**: Dichiara uno stream SSE per eventi di sottoscrizione.

### Esempio

```go
Method("watch_subscriptions", func() {
    StreamingResult(func() {
        Attribute("resource", String, "Nome risorsa")
        Attribute("event", String, "Tipo di evento")
        Required("resource", "event")
    })
    SubscriptionMonitor("subscriptions")
})
```

## Esempio Completo di Server MCP

```go
var _ = Service("assistant", func() {
    Description("Esempio di server MCP completo")
    
    // Abilita MCP
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    // Prompt statici
    StaticPrompt("greeting", "Saluto amichevole",
        "system", "Sei un assistente utile",
        "user", "Ciao!")
    
    // Tool esposto tramite MCP
    Method("search", func() {
        Description("Cerca documenti")
        Payload(func() {
            Attribute("query", String, "Query di ricerca")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Risultati della ricerca")
            Required("results")
        })
        MCPTool("search", "Cerca documenti per query")
    })
    
    // Risorsa statica
    Method("get_readme", func() {
        Result(String)
        Resource("readme", "file:///README.md", "text/markdown")
    })
    
    // Risorsa osservabile con sottoscrizione
    Method("get_status", func() {
        Result(func() {
            Attribute("status", String)
            Attribute("updated_at", String)
        })
        WatchableResource("status", "status://system", "application/json")
    })
    
    Method("subscribe_status", func() {
        Payload(func() {
            Attribute("uri", String)
        })
        Result(String)
        Subscription("status")
    })
    
    // Prompt dinamico
    Method("review_code", func() {
        Payload(func() {
            Attribute("language", String)
            Attribute("code", String)
            Required("language", "code")
        })
        Result(ArrayOf(Message))
        DynamicPrompt("code_review", "Genera prompt per code review")
    })
    
    // Notifica
    Method("notify_progress", func() {
        Payload(func() {
            Attribute("task_id", String)
            Attribute("progress", Int)
            Required("task_id", "progress")
        })
        Notification("progress", "Aggiornamento progresso task")
    })
})
```

## Uso dei Tool MCP negli Agenti

Una volta dichiarato un server MCP, gli agenti possono consumare i suoi tool tramite `MCPToolset`:

```go
// Referenzia il toolset del server MCP
var AssistantTools = MCPToolset("assistant", "assistant")

var _ = Service("orchestrator", func() {
    Agent("chat", "Agente chat", func() {
        Use(AssistantTools) // Consuma tutti i tool dal server MCP
    })
})
```

Vedi [Integrazione MCP](../4-mcp-integration/) per dettagli sul wiring runtime.

## Prossimi Passi

- Leggi [Integrazione MCP](../4-mcp-integration/) per la configurazione runtime
- Esplora il [Tutorial MCP Toolsets](../../4-tutorials/3-mcp-toolsets/) per un esempio completo
- Impara le [Funzioni Toolset](./3-toolset-functions.md) per toolset nativi dell'agente

