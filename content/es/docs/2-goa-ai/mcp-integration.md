---
nav_group: guides
title: Integración MCP
weight: 50
description: "Crea servidores MCP con herramientas, recursos y prompts, y consume herramientas MCP externas."
llm_optimized: true
aliases:
---

Goa-AI permite **crear servidores MCP** y **consumir herramientas MCP externas**. Añade declaraciones MCP a un servicio Goa para exponer métodos como herramientas, publicar recursos y proporcionar plantillas de prompts. El generador produce el manejo del protocolo JSON-RPC y los adaptadores de servicio. Alojar un servidor MCP no requiere ejecutar un agente Goa-AI.

Los callers HTTP y stdio envían solicitudes independientes con metadatos del protocolo. No hay negociación de inicialización ni sesión del protocolo. La interfaz `Caller` invoca herramientas; `Listen` recibe notificaciones de cambios. Los clientes JSON-RPC generados por Goa también exponen las operaciones de recursos, prompts, descubrimiento y completado declaradas por el servicio.

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
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    StaticPrompt("find-docs", "Help a user find documentation",
        "user", "Find relevant documentation for the user's question.")

    Method("readme", func() {
        Result(String)
        Resource("readme", "file:///docs/README.md", "text/markdown")
    })

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
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

## Valores de URL y atributos mapeados

Use la notación `Param("payload_field:url_name")` de Goa para distinguir un campo del payload de un parámetro de la URL:

```go
JSONRPC(func() {
    POST("/organizations/{organization}/mcp")
    Param("organization_id:organization")
})
```

La URL proporciona `organization_id`. Los argumentos de herramientas y prompts, sus esquemas, ejemplos y codecs generados excluyen ese campo. Un campo de dominio independiente llamado `organization` sigue siendo un argumento. Cada método conserva su tipo, nombre de campo Go y validación. Los valores de URL inválidos se rechazan antes de ejecutar el endpoint configurado. Se conservan las rutas completas de la API y del servicio padre.

Los clientes de protocolo generados transportan estos valores fuera de los parámetros JSON-RPC. `NewCaller` generado los recibe en el orden de la ruta después de la política de reintentos; para esta ruta, pase `"blue"` al final. Ese caller mantiene la misma dirección en cada llamada. `NewHTTPCaller` recibe la URL completa, como `https://example.com/organizations/blue/mcp`. Regenere juntos clientes, servidores y contratos de agentes.

---

## Alojar el servidor generado

Pase los endpoints Goa originales ya configurados a `NewMCPAdapter` y construya el servidor HTTP generado. Pase los orígenes de navegador permitidos como argumentos de cadena finales de su constructor `New`, por ejemplo `"https://app.example.com"`. Sin orígenes, se aceptan solicitudes sin la cabecera `Origin` y se rechazan las que la incluyen.

Use `Server.Use` para instalar middleware HTTP antes de recibir solicitudes. `Mount(mux)` y las llamadas directas a `ServeHTTP` comparten las comprobaciones de origen, método HTTP, cabeceras MCP y metadatos antes del middleware o del trabajo del servicio. La lista de orígenes se copia durante la construcción. Sustituya `MountWithOrigins` por argumentos del constructor y use `ServeHTTP` en lugar del campo interno `Handler`, que se elimina. Regenere los servidores y actualice sus llamadores juntos.

---

## Cableado en tiempo de ejecución

En tiempo de ejecución, instancie un caller MCP y registre el conjunto de herramientas:

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
)

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
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
if err := genchat.RegisterUsedToolsets(ctx, rt,
    genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
); err != nil {
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
```

`CallRequest` contiene el nombre de la herramienta, los argumentos JSON y una continuación opcional propiedad del host. `CallResponse.Content` usa `content.Blocks` de `runtime/content`: valores ordenados de texto, imagen, audio, enlace a recurso o recurso incorporado. El JSON estructurado se conserva por separado en `StructuredContent`. `InputRequired` deja la operación sin terminar; el host proporciona la entrada solicitada antes de continuar.

### Caller HTTP

Para servidores MCP accesibles a través de HTTP JSON-RPC:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient,
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
```

El constructor valida el endpoint y la identidad de la aplicación sin realizar solicitudes de red. Cada operación envía JSON-RPC mediante HTTP `POST` y acepta JSON o un flujo de eventos. Si se omite `Client`, usa `http.DefaultClient`; la aplicación define los plazos mediante el contexto y el cliente HTTP.

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
})
if err != nil {
    return err
}
defer func() {
    if err := caller.Close(shutdownContext); err != nil {
        log.Print(err)
    }
}()
```

El caller stdio inicia un subproceso y correlaciona operaciones concurrentes por ID de solicitud. Cada solicitud lleva sus metadatos. Cierre el caller con un contexto de cierre definido por la aplicación y gestione el error devuelto.

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
import genmcpclient "example.com/assistant/gen/jsonrpc/mcp_assistant/client"

caller, err := genmcpclient.NewCaller(client, mcpruntime.ClientInfo{
    Name: "my-agent", Version: "1.0.0",
}, mcpruntime.InputSupport{}, mcpruntime.HTTPRetryPolicy{})
if err != nil {
    return err
}
```

## Progreso y cambios de recursos

Use `WithProgress(ctx, handler)` para recibir progreso antes del resultado final. El servicio llama a `ReportProgress`; el transporte proporciona los identificadores de correlación. Un error del callback detiene esa operación y debe gestionarse.

```go
err := caller.Listen(ctx, mcpruntime.SubscriptionFilter{
    ResourceSubscriptions: []string{"file:///docs/README.md"},
}, func(ctx context.Context, event mcpruntime.SubscriptionEvent) error {
    return handleResourceChange(ctx, event)
})
if err != nil {
    return err
}
```

Use `Listen` para recibir una confirmación seguida de los cambios aceptados. Compruebe el filtro confirmado: puede omitir tipos no compatibles. La aplicación implementa `handleResourceChange`, vuelve a cargar los datos correspondientes y respeta la cancelación. Perder la conexión produce un error; el caller no se reconecta automáticamente.

Para un cliente JSON-RPC generado, use `WithSubscriptionEvents(ctx, handler)` e invoque su endpoint tipado `SubscriptionsListen`. El endpoint devuelve el resultado final y el handler recibe eventos validados. Sin handler, falla antes de enviar la solicitud.

### Declarar una fuente de suscripciones a recursos

Un servicio MCP HTTP con recursos puede marcar un método de streaming del servidor con `ResourceSubscription()`. La entrada opcional `resources` contiene URI. La unión obligatoria `change` contiene `acknowledged` con un array opcional `resources`, o `updated` con un `uri` obligatorio. Declare `Format(FormatURI)` para cada URI. La fuente autoriza y confirma un subconjunto antes de enviar cambios hasta terminar o cancelar la solicitud.

Solo una fuente de recursos vinculada anuncia soporte de suscripciones. La fuente controla la autorización, la detección de cambios y la selección de subrecursos relacionados. El generador conserva el endpoint Goa configurado, incluidas credenciales, ámbitos, interceptores y middleware. El transporte compartido controla el orden y los identificadores. Los catálogos fijos no emiten cambios de catálogo.

### Recursos, prompts y contenido enriquecido

`ResourceTemplate` vincula un URI parametrizado a un método de lectura tipado. `Prompt` vincula un método que devuelve mensajes. `ResourceCompletion` y `PromptCompletion` vinculan sugerencias de argumentos tipadas. `ToolContent` selecciona un campo de contenido enriquecido junto al resultado estructurado. Estos contratos siguen el mismo flujo de diseño y generación Goa que los métodos ordinarios.

### Reintentar una respuesta de herramienta interrumpida

HTTP realiza un intento por defecto. El host puede configurar `HTTPRetryPolicy` para un endpoint de confianza. Solo se reintenta una respuesta interrumpida si la herramienta declara comportamiento de solo lectura o idempotente y la política confía en esas declaraciones. El nuevo intento usa otro ID y puede ejecutar la herramienta otra vez. Los errores, respuestas inválidas, fallos de callbacks e interrupciones de suscripciones no autorizan reintentos.

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
    
    MCP("assistant-mcp", "1.0.0")
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

Pase el ejecutor generado a `RegisterUsedToolsets` antes de registrar el agente. El ejemplo recibe un runtime ya construido y su planificador.

```go
package main

import (
    "context"

    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    mcpruntime "goa.design/goa-ai/runtime/mcp"
)

func registerChat(ctx context.Context, rt *runtime.Runtime, p planner.Planner) error {
    caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{Name: "my-agent", Version: "1.0.0"},
    })
    if err != nil {
        return err
    }
    if err := genchat.RegisterUsedToolsets(ctx, rt,
        genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
    ); err != nil {
        return err
    }
    return genchat.RegisterChatAgent(ctx, rt, genchat.ChatAgentConfig{Planner: p})
}
```

### Planificador

Su planificador puede hacer referencia a herramientas MCP igual que a los conjuntos de herramientas nativos:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    call, err := planner.NewToolRequest(
        genmcpspecs.SearchTool(),
        &genmcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{ToolCalls: []planner.ToolRequest{call}}, nil
}
```

`genmcpspecs` importa `example.com/assistant/gen/assistant/toolsets/assistant_mcp`. Use `planner.ToolRequestFromModelCall` para conservar el ID de correlación del proveedor al reenviar una llamada validada del modelo.

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
