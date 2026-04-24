---
title: Integración MCP
weight: 6
description: "Integre servidores MCP externos en sus agentes mediante wrappers y llamadores generados."
llm_optimized: true
aliases:
---

Goa-AI proporciona soporte de primera clase para integrar servidores MCP (Model Context Protocol) en sus agentes. Los conjuntos de herramientas MCP permiten a los agentes consumir herramientas de servidores MCP externos a través de wrappers y callers generados.

## Visión General

La integración MCP sigue este flujo de trabajo:

1. **Diseño del servicio**: Declare el servidor MCP a través del DSL MCP de Goa
2. **Diseño del agente**: Haga referencia a esa suite mediante un conjunto de herramientas declarado con `FromMCP(...)` o `FromExternalMCP(...)`
3. **Generación de código**: Produce el servidor MCP JSON-RPC (cuando está respaldado por Goa), además de helpers de registro en runtime y specs/codecs del conjunto de herramientas (propiedad de la suite)
4. **Cableado en tiempo de ejecución**: Instancie un transporte `mcpruntime.Caller` (HTTP/SSE/stdio). Los helpers generados registran el conjunto de herramientas y adaptan los errores JSON-RPC a valores `planner.RetryHint`
5. **Ejecución del planificador**: Los planificadores simplemente ponen en cola las llamadas a herramientas con cargas útiles JSON canónicas; el runtime las reenvía al caller MCP, persiste los resultados mediante hooks y expone telemetría estructurada

---

## Declaración de conjuntos de herramientas MCP

### En el diseño del servicio

En primer lugar, declare el servidor MCP en su diseño de servicio Goa:

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

### En el diseño del agente

A continuación, haga referencia a la suite MCP en su agente:

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

### Servidores MCP externos con esquemas en línea

Para servidores MCP externos (no respaldados por Goa), declare las herramientas con esquemas en línea:

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

## Cableado en tiempo de ejecución

En tiempo de ejecución, instancie un caller MCP y registre el conjunto de herramientas:

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

## Tipos de caller MCP

Goa-AI admite múltiples tipos de transporte MCP a través del paquete `runtime/mcp`. Todos los callers implementan la interfaz `Caller`:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

### Caller HTTP

Para servidores MCP accesibles a través de HTTP JSON-RPC:

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

El caller HTTP realiza el handshake de inicialización MCP al crearse y utiliza JSON-RPC síncrono sobre HTTP POST para las llamadas a herramientas.

### Caller SSE

Para servidores MCP que utilizan transmisión mediante Server-Sent Events:

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

El caller SSE utiliza HTTP para el handshake de inicialización pero solicita respuestas `text/event-stream` para las llamadas a herramientas, permitiendo a los servidores transmitir eventos de progreso antes de la respuesta final.

### Caller Stdio

Para servidores MCP que se ejecutan como subprocesos y se comunican a través de stdin/stdout:

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

El caller stdio lanza el comando como un subproceso, realiza el handshake de inicialización MCP y mantiene la sesión entre las invocaciones de herramientas. Llame a `Close()` para terminar el subproceso al finalizar.

### Adaptador CallerFunc

Para implementaciones personalizadas de caller o para pruebas:

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

### Caller JSON-RPC generado por Goa

Para clientes MCP generados por Goa que envuelven métodos de servicio:

```go
caller := mcpassistant.NewCaller(client) // Uses Goa-generated client
```

---

## Flujo de ejecución de herramientas

1. El planificador devuelve llamadas a herramientas que referencian herramientas MCP (la carga útil es `json.RawMessage`)
2. El runtime detecta el registro del conjunto de herramientas MCP
3. Reenvía la carga útil JSON canónica al caller MCP
4. Invoca al caller MCP con el nombre de la herramienta y la carga útil
5. El caller MCP gestiona el transporte (HTTP/SSE/stdio) y el protocolo JSON-RPC
6. Decodifica el resultado utilizando el códec generado
7. Devuelve `ToolResult` al planificador

---

## Tratamiento de errores

Los helpers generados adaptan los errores JSON-RPC a valores `planner.RetryHint`:

- **Errores de validación** → `RetryHint` con orientación para los planificadores
- **Errores de red** → Sugerencias de reintento con recomendaciones de backoff
- **Errores del servidor** → Detalles del error preservados en los resultados de la herramienta

Esto permite a los planificadores recuperarse de los errores MCP utilizando los mismos patrones de reintento que los conjuntos de herramientas nativos.

---

## Ejemplo Completo

### Diseño

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

### Tiempo de ejecución

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

### Planificador

Su planificador puede hacer referencia a herramientas MCP igual que a los conjuntos de herramientas nativos:

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

## Mejores prácticas

- **Deje que codegen gestione el registro**: Utilice el helper generado para registrar los conjuntos de herramientas MCP; evite el pegamento escrito a mano para que los códecs y las sugerencias de reintento permanezcan consistentes
- **Utilice callers tipados**: Prefiera los callers JSON-RPC generados por Goa cuando estén disponibles para obtener seguridad de tipos
- **Gestione los errores con elegancia**: Asigne los errores MCP a valores `RetryHint` para ayudar a los planificadores a recuperarse
- **Supervise la telemetría**: Las llamadas MCP emiten eventos de telemetría estructurados; utilícelos para la observabilidad
- **Elija el transporte adecuado**: Utilice HTTP para peticiones/respuestas simples, SSE para streaming y stdio para servidores basados en subprocesos

---

## Próximos pasos

- **[Conjuntos de herramientas](./toolsets.md)** - Comprenda los modelos de ejecución de herramientas
- **[Memoria y sesiones](./memory-sessions.md)** - Gestione el estado con transcripciones y almacenes de memoria
- **[Producción](./production.md)** - Despliegue con Temporal y streaming UI
