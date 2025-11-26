---
title: "Integrazione MCP"
linkTitle: "Integrazione MCP"
weight: 4
description: "Integra server MCP esterni nei tuoi agenti."
---

Goa-AI fornisce supporto di prima classe per integrare server MCP (Model Context Protocol) nei tuoi agenti. I toolset MCP permettono agli agenti di consumare tool da server MCP esterni attraverso wrapper e caller generati.

## Panoramica

L'integrazione MCP segue questo workflow:

1. **Design del servizio**: Dichiara il server MCP tramite il DSL MCP di Goa
2. **Design dell'agente**: Referenzia quella suite con `Use(MCPToolset("service", "suite"))`
3. **Generazione codice**: Produce sia il classico server JSON-RPC MCP (opzionale) che l'helper di registrazione runtime, più codec/spec dei tool mirrorati nel package dell'agente
4. **Wiring runtime**: Istanzia un trasporto `mcpruntime.Caller` (HTTP/SSE/stdio). Gli helper generati registrano il toolset e adattano errori JSON-RPC in valori `planner.RetryHint`
5. **Esecuzione planner**: I planner semplicemente accodano chiamate tool con payload JSON canonici; il runtime le inoltra al caller MCP, persiste i risultati tramite hook e mostra telemetria strutturata

## Dichiarare Toolset MCP

### Nel Design del Servizio

Prima, dichiara il server MCP nel tuo design del servizio Goa:

```go
var _ = Service("assistant", func() {
    Description("Server MCP per tool dell'assistente")
    
    // Dichiarazione server MCP
    // ... DSL MCP qui ...
})
```

### Nel Design dell'Agente

Poi referenzia la suite MCP nel tuo agente:

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", "Runner conversazionale", func() {
        Use(AssistantSuite)
    })
})
```

## Wiring Runtime

A runtime, istanzia un caller MCP e registra il toolset:

```go
import (
    "goa.design/goa-ai/features/mcp"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
)

// Crea un caller MCP (HTTP, SSE, o stdio)
caller := featuresmcp.NewHTTPCaller("https://assistant.example.com/mcp")

// Registra il toolset MCP
if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
    log.Fatal(err)
}
```

## Helper Generati

La generazione del codice produce:

- Funzioni `Register<Service><Suite>Toolset` che adattano i metadati dei tool MCP in registrazioni runtime
- Codec/spec dei tool mirrorati nel package dell'agente
- Helper `client.NewCaller` così i client MCP generati da Goa possono essere collegati direttamente al runtime

## Tipi di Caller MCP

Goa-AI supporta diversi tipi di trasporto MCP:

### Caller HTTP

```go
caller := featuresmcp.NewHTTPCaller("https://assistant.example.com/mcp")
```

### Caller SSE

```go
caller := featuresmcp.NewSSECaller("https://assistant.example.com/mcp")
```

### Caller Stdio

```go
caller := featuresmcp.NewStdioCaller(cmd)
```

### Caller JSON-RPC Generato da Goa

```go
caller := mcpassistant.NewCaller(client) // Usa client generato da Goa
```

## Gestione Errori

Gli helper generati adattano gli errori JSON-RPC in valori `planner.RetryHint`:

- Errori di validazione → `RetryHint` con guida per i planner
- Errori di rete → Hint di retry con raccomandazioni di backoff
- Errori del server → Dettagli errore preservati nei risultati dei tool

## Flusso di Esecuzione Tool

1. Il planner restituisce chiamate tool che referenziano tool MCP (il payload è `json.RawMessage`)
2. Il runtime rileva la registrazione del toolset MCP
3. Inoltra il payload JSON canonico al caller MCP
4. Invoca il caller MCP con nome tool e payload
5. Il caller MCP gestisce trasporto (HTTP/SSE/stdio) e protocollo JSON-RPC
6. Decodifica il risultato usando il codec generato
7. Restituisce `ToolResult` al planner

## Best Practice

- **Lascia al codegen gestire la registrazione**: Usa l'helper generato per registrare i toolset MCP; evita glue code scritto a mano così codec e retry hint restano consistenti
- **Usa caller tipizzati**: Preferisci i caller JSON-RPC generati da Goa quando disponibili per type safety
- **Gestisci gli errori con grazia**: Mappa gli errori MCP a valori `RetryHint` per aiutare i planner a recuperare
- **Monitora la telemetria**: Le chiamate MCP emettono eventi di telemetria strutturata; usali per l'osservabilità

## Prossimi Passi

- Impara i [Toolset](../3-toolsets/) per capire i modelli di esecuzione dei tool
- Esplora il [Tutorial Toolset MCP](../../4-tutorials/3-mcp-toolsets/) per un esempio completo
- Leggi i [Concetti Runtime](../2-runtime/) per capire il flusso di esecuzione

