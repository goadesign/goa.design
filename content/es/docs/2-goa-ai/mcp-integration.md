---
title: Integración MCP
weight: 6
description: "Integre servidores MCP externos en sus agentes mediante wrappers y llamadores generados."
llm_optimized: true
aliases:
---

Goa-AI proporciona soporte de primera clase para integrar servidores MCP (Model Context Protocol) en sus agentes. Los conjuntos de herramientas MCP permiten a los agentes consumir herramientas de servidores MCP externos a través de wrappers y callers generados.

Los callers escritos a mano implementan actualmente el contrato de herramientas
MCP `2025-06-18`. Inicializan una sesión, exigen la capacidad de herramientas
del servidor e invocan `tools/call`. Esta página no afirma que se implemente
toda la superficie MCP, como prompts o recursos.

## Visión General

La integración MCP sigue este flujo de trabajo:

1. **Diseño del servicio**: Declare el servidor MCP a través del DSL MCP de Goa
2. **Diseño del agente**: Haga referencia a esa suite mediante un conjunto de herramientas declarado con `FromMCP(...)` o `FromExternalMCP(...)`
3. **Generación de código**: Produce el servidor MCP JSON-RPC (cuando está respaldado por Goa), además de helpers de registro en runtime y specs/codecs del conjunto de herramientas (propiedad de la suite)
4. **Cableado en tiempo de ejecución**: Instancie un `mcpruntime.Caller` HTTP o
   stdio. El caller HTTP acepta una respuesta JSON o un flujo de eventos HTTP.
   Los helpers generados registran el conjunto de herramientas y adaptan los
   errores JSON-RPC a valores `planner.ToolFailure`
5. **Ejecución del planificador**: Los planificadores construyen llamadas con
   descriptores tipados generados; el runtime reenvía el JSON canónico al caller
   MCP, registra los resultados y expone telemetría estructurada

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

## Tipos de caller MCP

Goa-AI admite HTTP y stdio a través del paquete `runtime/mcp`. Ambos callers
implementan la interfaz `Caller`:

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

### Caller HTTP

Para servidores MCP accesibles a través de HTTP JSON-RPC:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient, // Opcional; el valor predeterminado tiene un tiempo de espera de 30 segundos.
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
    InitTimeout: 10 * time.Second, // Tiempo de espera de inicialización opcional.
})
```

El caller HTTP realiza el handshake de inicialización MCP al crearse. Envía
cada mensaje JSON-RPC 2.0 mediante un `POST` HTTP al endpoint configurado.
Acepta respuestas JSON o flujos de eventos HTTP; no hace falta un caller SSE
separado.

### Caller Stdio

Para servidores MCP que se ejecutan como subprocesos y se comunican a través de stdin/stdout:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // Se añade al entorno actual.
    Dir:     "/path/to/workdir",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
    InitTimeout: 10 * time.Second, // Tiempo de espera de inicialización opcional.
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

### Caller JSON-RPC generado por Goa

Para clientes MCP generados por Goa que envuelven métodos de servicio:

```go
caller, err := mcpassistant.NewCaller(ctx, client, mcpruntime.ClientInfo{
    Name:    "my-agent",
    Version: "1.0.0",
})
```

---

## Flujo de ejecución de herramientas

1. El planificador crea llamadas con descriptores tipados generados, o reenvía
   llamadas validadas del modelo mediante `planner.ToolRequestFromModelCall`.
2. El runtime valida el resultado completo del plan y asigna IDs de ejecución,
   produciendo valores `runtime.ToolCall`.
3. El runtime detecta el registro del conjunto de herramientas MCP.
4. Reenvía el payload JSON canónico de la llamada del runtime al caller MCP.
5. El caller MCP usa HTTP o stdio y gestiona el protocolo JSON-RPC. Una respuesta
   HTTP puede ser JSON o un flujo de eventos.
6. Decodifica el resultado mediante el codec generado.
7. Devuelve `ToolResult` al planificador.

---

## Tratamiento de errores

Los helpers generados adaptan los errores JSON-RPC a valores
`planner.ToolFailure`:

- **Errores de validación** → fallos de llamada inválida con evidencia exacta
  para corregirla
- **Errores de red** → fallos de indisponibilidad o timeout con una acción
  explícita de replanificación o finalización
- **Errores del servidor** → causas estructuradas conservadas en el fallo

Así, los conjuntos de herramientas MCP y los nativos comparten el mismo
contrato de recuperación impuesto por el runtime.

Los fallos devueltos por una herramienta se convierten en `ToolFailure`. Un
resultado final inválido del planificador se convierte en
`OutputContractError`: se rechaza sin otra solicitud al modelo y no se presenta
como fallo de herramienta.

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

### Planificador

Su planificador puede hacer referencia a herramientas MCP igual que a los conjuntos de herramientas nativos:

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

Aquí `mcpspecs` es el paquete de specs generado para el conjunto de
herramientas MCP. Para reenviar una llamada validada emitida por el modelo, use
`planner.ToolRequestFromModelCall`; así se conserva su ID de correlación del
proveedor.

---

## Mejores prácticas

- **Deje que codegen gestione el registro**: Utilice el helper generado para
  registrar los conjuntos de herramientas MCP; evite el pegamento escrito a
  mano para mantener coherentes los codecs y la recuperación estructurada de
  fallos
- **Utilice callers tipados**: Prefiera los callers JSON-RPC generados por Goa cuando estén disponibles para obtener seguridad de tipos
- **Gestione los errores explícitamente**: Asigne los errores MCP a valores
  `ToolFailure` con el tipo de fallo y la acción de recuperación correctos
- **Supervise la telemetría**: Las llamadas MCP emiten eventos de telemetría estructurados; utilícelos para la observabilidad
- **Elija el transporte adecuado**: Utilice HTTP para servidores remotos y stdio para servidores basados en subprocesos. El caller HTTP acepta respuestas JSON y flujos de eventos

---

## Próximos pasos

- **[Conjuntos de herramientas](./toolsets.md)** - Comprenda los modelos de ejecución de herramientas
- **[Memoria y sesiones](./memory-sessions.md)** - Gestione el estado con transcripciones y almacenes de memoria
- **[Producción](./production.md)** - Despliegue con Temporal y streaming UI
