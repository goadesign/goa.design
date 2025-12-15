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
2. **Progettazione dell'agente**: Fare riferimento alla suite con `Use(MCPToolset("service", "suite"))`
3. **Generazione del codice**: Produce sia il classico server MCP JSON-RPC (opzionale) che l'helper di registrazione a runtime, oltre a codec/spec degli strumenti rispecchiati nel pacchetto dell'agente
4. **Cablaggio runtime**: Istanziare un trasporto `mcpruntime.Caller` (HTTP/SSE/stdio). Gli helper generati registrano il set di strumenti e adattano gli errori JSON-RPC in valori `planner.RetryHint`
5. **Esecuzione del pianificatore**: I pianificatori si limitano a inserire le chiamate agli strumenti con i payload JSON canonici; il runtime li inoltra al chiamante MCP, persiste i risultati tramite gli hook e visualizza la telemetria strutturata

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
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
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
})
```

### Nella progettazione dell'agente

Fare quindi riferimento alla suite MCP nel proprio agente:

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

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

1. Il pianificatore restituisce le chiamate agli strumenti che fanno riferimento agli strumenti MCP (il payload è `json.RawMessage`)
2. Il runtime rileva la registrazione del set di strumenti MCP
3. Inoltra il payload JSON canonico al chiamante MCP
4. Invoca il chiamante MCP con il nome dello strumento e il payload
5. Il chiamante MCP gestisce il trasporto (HTTP/SSE/stdio) e il protocollo JSON-RPC
6. Decodifica il risultato utilizzando il codec generato
7. Restituisce `ToolResult` al pianificatore

---

## Gestione degli errori

Gli helper generati adattano gli errori JSON-RPC in valori `planner.RetryHint`:

- **Errori di validazione** → `RetryHint` con indicazioni per i pianificatori
- **Errori di rete** → Suggerimenti per il tentativo con raccomandazioni per il backoff
- **Errori del server** → I dettagli dell'errore sono conservati nei risultati dello strumento

Ciò consente ai pianificatori di recuperare gli errori MCP utilizzando gli stessi schemi di riprova dei set di strumenti nativi.

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
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
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
})

// Agent that uses MCP tools
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

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
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{
            {
                Name:    "assistant.assistant-mcp.search",
                Payload: []byte(`{"query": "golang tutorials"}`),
            },
        },
    }, nil
}
```

---

## Migliori pratiche

- **Lasciare che codegen gestisca la registrazione**: Usare l'helper generato per registrare i set di strumenti MCP; evitare la colla scritta a mano, in modo che i codec e i suggerimenti per i tentativi rimangano coerenti
- **Utilizzare chiamanti tipizzati**: Preferire i chiamanti JSON-RPC generati da Goa, quando disponibili, per la sicurezza dei tipi
- **Gestire gli errori con garbo**: Mappare gli errori MCP in valori `RetryHint` per aiutare i pianificatori a recuperare
- **Monitorare la telemetria**: Le chiamate MCP emettono eventi di telemetria strutturati; usarli per l'osservabilità
- **Scegliere il trasporto giusto**: Utilizzare HTTP per semplici richieste/risposte, SSE per lo streaming, stdio per i server basati su sottoprocessi

---

## Prossimi passi

- **[Toolsets](./toolsets.md)** - Comprendere i modelli di esecuzione degli strumenti
- **[Memoria e sessioni](./memory-sessions.md)** - Gestire lo stato con le trascrizioni e gli archivi di memoria
- **[Produzione](./production.md)** - Distribuire con UI temporali e streaming
