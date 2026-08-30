---
title: Integrazione MCP
weight: 6
description: "Integrate external MCP servers into your agents with generated wrappers and callers."
llm_optimized: true
aliases:
---

Goa-AI fornisce un supporto di prima classe per l'integrazione dei server MCP (Model Context Protocol) negli agenti. I set di strumenti MCP consentono agli agenti di consumare strumenti da server MCP esterni attraverso wrapper e caller generati.

I caller scritti a mano implementano attualmente il contratto degli strumenti
MCP `2025-06-18`. Inizializzano una sessione, richiedono la capacità tools del
server e invocano `tools/call`. Questa pagina non dichiara il supporto
dell'intera superficie MCP, come prompt o risorse.

## Panoramica

L'integrazione MCP segue questo flusso di lavoro:

1. **Progettazione del servizio**: Dichiarare il server MCP tramite il DSL MCP di Goa
2. **Progettazione dell'agente**: Fare riferimento alla suite con un toolset dichiarato tramite `FromMCP(...)` o `FromExternalMCP(...)`
3. **Generazione del codice**: Produce il server MCP JSON-RPC (quando è generato da Goa), oltre agli helper di registrazione a runtime e alle specs/codecs di proprietà del toolset (suite)
4. **Cablaggio runtime**: Istanziare un `mcpruntime.Caller` HTTP o stdio. Il caller HTTP accetta una risposta JSON o uno stream di eventi HTTP. Gli helper generati registrano il toolset e adattano gli errori JSON-RPC in valori `planner.ToolFailure`
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
    JSONRPC(func() {
        POST("/mcp")
    })
    
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

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
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

Goa-AI supporta HTTP e stdio attraverso il pacchetto `runtime/mcp`. Entrambi i
chiamanti implementano l'interfaccia `Caller`:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}

type CallRequest struct {
    Tool    string
    Payload json.RawMessage
}

type CallResponse struct {
    Content           []ContentBlock
    StructuredContent json.RawMessage
}
```

### Chiamante HTTP

Per i server MCP accessibili tramite HTTP JSON-RPC:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient, // Facoltativo; il client predefinito ha un timeout di 30 secondi.
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
    InitTimeout: 10 * time.Second, // Timeout di inizializzazione facoltativo.
})
```

Il chiamante HTTP esegue l'handshake di inizializzazione MCP alla creazione.
Invia ogni messaggio JSON-RPC 2.0 con una richiesta HTTP `POST` all'endpoint
configurato. Accetta risposte JSON o flussi di eventi HTTP; non è necessario un
chiamante SSE separato.

### Chiamante Stdio

Per i server MCP in esecuzione come sottoprocessi che comunicano tramite stdin/stdout:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // Aggiunto all'ambiente corrente.
    Dir:     "/path/to/workdir",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
    InitTimeout: 10 * time.Second, // Timeout di inizializzazione facoltativo.
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
    content, structured, err := myCustomMCPCall(ctx, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{
        Content:           content,
        StructuredContent: structured,
    }, nil
})
```

### Chiamante JSON-RPC generato da Goa

Per i client MCP generati da Goa che avvolgono i metodi del servizio:

```go
caller, err := mcpassistant.NewCaller(ctx, client, mcpruntime.ClientInfo{
    Name:    "my-agent",
    Version: "1.0.0",
})
```

---

## Flusso di esecuzione dello strumento

1. Il planner restituisce chiamate costruite dai descrittori MCP generati oppure inoltra chiamate validate con `planner.ToolRequestFromModelCall`
2. Il runtime valida l'intero risultato e assegna gli ID di esecuzione, producendo valori `runtime.ToolCall`
3. Il runtime rileva la registrazione del toolset MCP
4. Inoltra il payload JSON canonico della chiamata runtime al chiamante MCP
5. Il caller MCP usa HTTP o stdio e gestisce il protocollo JSON-RPC. Una risposta HTTP può essere JSON o uno stream di eventi
6. Decodifica il risultato utilizzando il codec generato
7. Restituisce `ToolResult` al pianificatore

---

## Gestione degli errori

Gli helper generati adattano gli errori JSON-RPC in valori `planner.ToolFailure`:

- **Errori di validazione** → errori di chiamata non valida con prove esatte per la correzione
- **Errori di rete** → errori di indisponibilità o timeout con un'azione esplicita di nuova pianificazione o finalizzazione
- **Errori del server** → cause strutturate conservate nell'errore

In questo modo MCP e toolset nativi condividono lo stesso contratto di recupero applicato dal runtime.

Gli errori restituiti da uno strumento diventano `ToolFailure`. Un risultato
finale non valido del planner diventa invece `OutputContractError`: viene
rifiutato senza un'altra richiesta al modello e non viene presentato come errore
dello strumento.

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
    JSONRPC(func() {
        POST("/mcp")
    })
    
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
    storageinmem "goa.design/goa-ai/runtime/agent/storage/inmem"
)

func main() {
    rt := runtime.New(storageinmem.New())
    ctx := context.Background()
    
    // Wire MCP caller
    caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{
            Name:    "my-agent",
            Version: "1.0.0",
        },
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
- **Scegliere il trasporto giusto**: Utilizzare HTTP per i server remoti e stdio per i server avviati come sottoprocessi. Il chiamante HTTP accetta risposte JSON e flussi di eventi

---

## Prossimi passi

- **[Toolsets](./toolsets.md)** - Comprendere i modelli di esecuzione degli strumenti
- **[Memoria e sessioni](./memory-sessions.md)** - Gestire lo stato con le trascrizioni e gli archivi di memoria
- **[Produzione](./production.md)** - Distribuire con UI temporali e streaming
