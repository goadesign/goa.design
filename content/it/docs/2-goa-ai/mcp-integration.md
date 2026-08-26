---
title: Integrazione MCP
weight: 6
description: "Integrate external MCP servers into your agents with generated wrappers and callers."
llm_optimized: true
aliases:
---

Goa-AI fornisce un supporto di prima classe per l'integrazione dei server MCP (Model Context Protocol) negli agenti. I set di strumenti MCP consentono agli agenti di consumare strumenti da server MCP esterni attraverso wrapper e caller generati.

## Panoramica

L'integrazione MCP segue questo flusso di lavoro:

1. **Progettazione del servizio**: Dichiarare il server MCP tramite il DSL MCP di Goa
2. **Progettazione dell'agente**: Fare riferimento alla suite con un toolset dichiarato tramite `FromMCP(...)` o `FromExternalMCP(...)`
3. **Generazione del codice**: Produce il server MCP JSON-RPC (quando è generato da Goa), oltre agli helper di registrazione a runtime e alle specs/codecs di proprietà del toolset (suite)
4. **Cablaggio runtime**: Istanziare un trasporto `mcpruntime.Caller` (HTTP/SSE/stdio). Gli helper generati registrano il toolset e adattano gli errori JSON-RPC in valori `planner.ToolFailure`
5. **Esecuzione del planner**: I planner costruiscono le chiamate con i descrittori tipizzati generati; il runtime inoltra il JSON canonico al chiamante MCP, registra i risultati ed espone telemetria strutturata

---

## Dichiarazione degli insiemi di strumenti MCP

### In Service Design

Innanzitutto, dichiarare il server MCP nel progetto del servizio Goa:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
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
})
```

### Nella progettazione dell'agente

Fare quindi riferimento alla suite MCP nel proprio agente:

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Server MCP esterni con schemi in linea

Per i server MCP esterni (non supportati da Goa), dichiarare gli strumenti con schemi in linea:

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

---

## Cablaggio in fase di esecuzione

In fase di esecuzione, istanziare un chiamante MCP e registrare il set di strumenti:

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
)

// Create an MCP caller (HTTP, SSE, or stdio)
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
    log.Fatal(err)
}
```

---

## Tipi di chiamante MCP

Goa-AI supporta diversi tipi di trasporto MCP attraverso il pacchetto `runtime/mcp`. Tutti i chiamanti implementano l'interfaccia `Caller`:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

### Chiamante HTTP

Per i server MCP accessibili tramite HTTP JSON-RPC:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage with defaults
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})

// Full configuration
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint:        "https://assistant.example.com/mcp",
    Client:          customHTTPClient,        // Optional: custom *http.Client
    ProtocolVersion: "2024-11-05",            // Optional: MCP protocol version
    ClientName:      "my-agent",              // Optional: client name for handshake
    ClientVersion:   "1.0.0",                 // Optional: client version
    InitTimeout:     10 * time.Second,        // Optional: initialize handshake timeout
})
```

Il chiamante HTTP esegue l'handshake di inizializzazione MCP alla creazione e utilizza JSON-RPC sincrono su HTTP POST per le chiamate agli strumenti.

### Chiamante SSE

Per i server MCP che utilizzano lo streaming di eventi inviati dal server:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage
caller, err := mcpruntime.NewSSECaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})

// Full configuration (same options as HTTP)
caller, err := mcpruntime.NewSSECaller(ctx, mcpruntime.HTTPOptions{
    Endpoint:        "https://assistant.example.com/mcp",
    Client:          customHTTPClient,
    ProtocolVersion: "2024-11-05",
    ClientName:      "my-agent",
    ClientVersion:   "1.0.0",
    InitTimeout:     10 * time.Second,
})
```

Il chiamante SSE utilizza HTTP per l'handshake di inizializzazione, ma richiede risposte `text/event-stream` per le chiamate agli strumenti, consentendo ai server di trasmettere eventi di avanzamento prima della risposta finale.

### Chiamante Stdio

Per i server MCP in esecuzione come sottoprocessi che comunicano tramite stdin/stdout:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage
caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
})

// Full configuration
caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command:         "mcp-server",
    Args:            []string{"--config", "config.json"},
    Env:             []string{"MCP_DEBUG=1"},  // Additional environment variables
    Dir:             "/path/to/workdir",       // Working directory
    ProtocolVersion: "2024-11-05",
    ClientName:      "my-agent",
    ClientVersion:   "1.0.0",
    InitTimeout:     10 * time.Second,
})
defer caller.Close() // Clean up subprocess
```

Il chiamante stdio lancia il comando come sottoprocesso, esegue l'handshake di inizializzazione MCP e mantiene la sessione tra le invocazioni dello strumento. Chiamare `Close()` per terminare il sottoprocesso una volta terminato.

### Adattatore CallerFunc

Per implementazioni o test di chiamanti personalizzati:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Adapt a function to the Caller interface
caller := mcpruntime.CallerFunc(func(ctx context.Context, req mcpruntime.CallRequest) (mcpruntime.CallResponse, error) {
    // Custom implementation
    result, err := myCustomMCPCall(ctx, req.Suite, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{Result: result}, nil
})
```

### Chiamante JSON-RPC generato da Goa

Per i client MCP generati da Goa che avvolgono i metodi del servizio:

```go
caller := mcpassistant.NewCaller(client) // Uses Goa-generated client
```

---

## Flusso di esecuzione dello strumento

1. Il planner restituisce chiamate costruite dai descrittori MCP generati oppure inoltra chiamate validate con `planner.ToolRequestFromModelCall`
2. Il runtime valida l'intero risultato e assegna gli ID di esecuzione, producendo valori `runtime.ToolCall`
3. Il runtime rileva la registrazione del toolset MCP
4. Inoltra il payload JSON canonico della chiamata runtime al chiamante MCP
5. Il chiamante MCP gestisce il trasporto (HTTP/SSE/stdio) e il protocollo JSON-RPC
6. Decodifica il risultato utilizzando il codec generato
7. Restituisce `ToolResult` al pianificatore

---

## Gestione degli errori

Gli helper generati adattano gli errori JSON-RPC in valori `planner.ToolFailure`:

- **Errori di validazione** → errori di chiamata non valida con prove esatte per la correzione
- **Errori di rete** → errori di indisponibilità o timeout con un'azione esplicita di nuova pianificazione o finalizzazione
- **Errori del server** → cause strutturate conservate nell'errore

In questo modo MCP e toolset nativi condividono lo stesso contratto di recupero applicato dal runtime.

---

## Esempio completo

### Progettazione

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// MCP server service
var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
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
})

// Agent that uses MCP tools
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Tempo di esecuzione

```go
package main

import (
    "context"
    "log"
    
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    chat "example.com/assistant/gen/orchestrator/agents/chat"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()
    
    // Wire MCP caller
    caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
    })
    if err != nil {
        log.Fatal(err)
    }
    if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
        log.Fatal(err)
    }
    
    // Register agent
    if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &MyPlanner{},
    }); err != nil {
        log.Fatal(err)
    }
    
    // Run agent
    client := chat.NewClient(rt)
    // ... use client ...
}
```

### Pianificatore

Il pianificatore può fare riferimento agli strumenti MCP come ai set di strumenti nativi:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    call, err := planner.NewToolRequest(
        mcpspecs.SearchTool(),
        &mcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{call},
    }, nil
}
```

Qui `mcpspecs` è il package `specs` generato per il toolset MCP. Per inoltrare
invece una chiamata validata emessa dal modello, usare
`planner.ToolRequestFromModelCall`, così il relativo ID di correlazione del
provider viene conservato.

---

## Migliori pratiche

- **Lasciare che codegen gestisca la registrazione**: Usare l'helper generato per registrare i toolset MCP; evitare collegamenti scritti a mano, così codec e recupero strutturato dagli errori restano coerenti
- **Utilizzare chiamanti tipizzati**: Preferire i chiamanti JSON-RPC generati da Goa, quando disponibili, per la sicurezza dei tipi
- **Gestire gli errori in modo strutturato**: Mappare gli errori MCP in `ToolFailure` con l'azione di recupero appropriata
- **Monitorare la telemetria**: Le chiamate MCP emettono eventi di telemetria strutturati; usarli per l'osservabilità
- **Scegliere il trasporto giusto**: Utilizzare HTTP per semplici richieste/risposte, SSE per lo streaming, stdio per i server basati su sottoprocessi

---

## Prossimi passi

- **[Toolsets](./toolsets.md)** - Comprendere i modelli di esecuzione degli strumenti
- **[Memoria e sessioni](./memory-sessions.md)** - Gestire lo stato con le trascrizioni e gli archivi di memoria
- **[Produzione](./production.md)** - Distribuire con UI temporali e streaming
