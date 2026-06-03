---
title: Referencia DSL
weight: 2
description: "Referencia completa de las funciones DSL de Goa-AI: agentes, toolsets, políticas e integración MCP."
llm_optimized: true
aliases:
---

Este documento proporciona una referencia completa de las funciones DSL de Goa-AI. Utilízalo junto con la guía [Runtime](./runtime.md) para entender cómo los diseños se traducen en comportamiento en tiempo de ejecución.

## Referencia rápida del DSL


| Función                                                 | Contexto                 | Descripción                                                                                                        |
| ------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Funciones de agente**                                 |                          |                                                                                                                    |
| `Agent`                                                 | Service                  | Define un agente basado en LLM                                                                                     |
| `Completion`                                            | Service                  | Declara un contrato tipado de salida directa del asistente, propiedad del servicio                                 |
| `Use`                                                   | Agent                    | Declara el consumo de un toolset                                                                                   |
| `Export`                                                | Agent, Service           | Expone toolsets a otros agentes                                                                                    |
| `AgentToolset`                                          | Argumento de Use         | Referencia a un toolset de otro agente                                                                             |
| `UseAgentToolset`                                       | Agent                    | Alias de AgentToolset + Use                                                                                        |
| `Passthrough`                                           | Tool (dentro de Export)  | Reenvío determinista al método del servicio                                                                        |
| `DisableAgentDocs`                                      | API                      | Desactiva la generación de AGENTS_QUICKSTART.md                                                                    |
| **Funciones de Toolset**                                |                          |                                                                                                                    |
| `Toolset`                                               | Top-level                | Declara un toolset propiedad del proveedor                                                                         |
| `FromMCP`                                               | Argumento de Toolset     | Configura un toolset respaldado por MCP                                                                            |
| `FromRegistry`                                          | Argumento de Toolset     | Configura un toolset respaldado por un registry                                                                    |
| `Description`                                           | Toolset                  | Establece la descripción del toolset                                                                               |
| **Funciones de Tool**                                   |                          |                                                                                                                    |
| `Tool`                                                  | Toolset, Method          | Define una herramienta invocable                                                                                   |
| `Args`                                                  | Tool                     | Define el esquema de parámetros de entrada                                                                         |
| `Return`                                                | Tool, Completion         | Define el esquema de resultado visible para el modelo                                                              |
| `ServerData`                                            | Tool                     | Define el esquema de datos exclusivos del servidor (nunca se envían a los proveedores de modelo)                   |
| `FromMethodResultField`                                 | ServerData               | Proyecta datos de servidor desde un campo del resultado del método vinculado                                       |
| `AudienceTimeline`                                      | ServerData               | Marca los datos de servidor como aptos para timeline/UI (por defecto)                                              |
| `AudienceInternal`                                      | ServerData               | Marca los datos de servidor como adjunto de composición interna                                                    |
| `AudienceEvidence`                                      | ServerData               | Marca los datos de servidor como procedencia o evidencia de auditoría                                              |
| `BoundedResult`                                         | Tool                     | Declara un contrato de resultado acotado propiedad del runtime; un sub-DSL opcional puede declarar los campos de cursor de paginación |
| `Cursor`                                                | BoundedResult            | Declara qué campo del payload lleva la referencia de continuación del runtime (opcional)                           |
| `NextCursor`                                            | BoundedResult            | Declara el nombre del campo de resultado proyectado para la referencia de continuación de la siguiente página (opcional) |
| `Idempotent`                                            | Tool                     | Marca la herramienta como idempotente dentro de una transcripción de ejecución; habilita la de-duplicación segura entre transcripciones para llamadas idénticas |
| `Tags`                                                  | Tool, Toolset            | Adjunta etiquetas de metadatos                                                                                     |
| `BindTo`                                                | Tool                     | Vincula la herramienta a un método del servicio                                                                    |
| `Inject`                                                | Tool                     | Marca campos como inyectados por el runtime                                                                        |
| `CallHintTemplate`                                      | Tool                     | Plantilla de visualización para las invocaciones                                                                   |
| `ResultHintTemplate`                                    | Tool                     | Plantilla de visualización para los resultados                                                                     |
| `ResultReminder`                                        | Tool                     | Recordatorio de sistema estático tras el resultado de la herramienta                                               |
| `Confirmation`                                          | Tool                     | Requiere confirmación explícita fuera de banda antes de ejecutarse                                                 |
| `TerminalRun`                                           | Tool                     | Marca la herramienta como terminal: la ejecución finaliza inmediatamente tras ejecutarla (sin un turno de planner de seguimiento) |
| `Bookkeeping`                                           | Tool                     | Marca la herramienta como bookkeeping: las llamadas no consumen el presupuesto de recuperación `MaxToolCalls` a nivel de ejecución y permanecen ocultas para los turnos futuros del planner por defecto |
| **Funciones de política**                               |                          |                                                                                                                    |
| `RunPolicy`                                             | Agent                    | Configura las restricciones de ejecución                                                                           |
| `DefaultCaps`                                           | RunPolicy                | Establece los límites de recursos                                                                                  |
| `MaxToolCalls`                                          | DefaultCaps              | Número máximo de invocaciones de herramienta                                                                       |
| `MaxConsecutiveFailedToolCalls`                         | DefaultCaps              | Número máximo de fallos consecutivos                                                                               |
| `TimeBudget`                                            | RunPolicy                | Límite simple de tiempo real                                                                                       |
| `Timing`                                                | RunPolicy                | Configuración fina de timeouts                                                                                     |
| `Budget`                                                | Timing                   | Presupuesto global de la ejecución                                                                                 |
| `Plan`                                                  | Timing                   | Timeout de la actividad del planner                                                                                |
| `Tools`                                                 | Timing                   | Timeout de la actividad de herramientas                                                                            |
| `History`                                               | RunPolicy                | Gestión del historial de conversación                                                                              |
| `KeepRecentTurns`                                       | History                  | Política de ventana deslizante                                                                                     |
| `Compress`                                              | History                  | Resumen asistido por modelo                                                                                        |
| `Cache`                                                 | RunPolicy                | Configuración del caché de prompts                                                                                 |
| `AfterSystem`                                           | Cache                    | Punto de control tras los mensajes de sistema                                                                      |
| `AfterTools`                                            | Cache                    | Punto de control tras las definiciones de herramientas                                                             |
| `InterruptsAllowed`                                     | RunPolicy                | Habilita pausar/reanudar                                                                                           |
| `OnMissingFields`                                       | RunPolicy                | Comportamiento de validación                                                                                       |
| **Funciones MCP**                                       |                          |                                                                                                                    |
| `MCP`                                                   | Service                  | Habilita el soporte MCP                                                                                            |
| `ProtocolVersion`                                       | Opción de MCP            | Establece la versión del protocolo MCP                                                                             |
| `Tool`                                                  | Method                   | Marca un método como herramienta MCP en un servicio con MCP habilitado                                             |
| `Toolset(FromMCP(...))`                                 | Top-level                | Declara un toolset derivado de MCP respaldado por Goa                                                              |
| `Toolset("name", FromExternalMCP(...), func() { ... })` | Top-level                | Declara un toolset MCP externo con esquemas en línea                                                               |
| `Resource`                                              | Method                   | Marca el método como recurso MCP                                                                                   |
| `WatchableResource`                                     | Method                   | Marca el método como recurso suscribible                                                                           |
| `StaticPrompt`                                          | Service                  | Añade una plantilla de prompt estática                                                                             |
| `DynamicPrompt`                                         | Method                   | Marca el método como generador de prompts                                                                          |
| `Notification`                                          | Method                   | Marca el método como emisor de notificaciones                                                                      |
| `Subscription`                                          | Method                   | Marca el método como manejador de suscripciones                                                                    |
| `SubscriptionMonitor`                                   | Method                   | Monitor SSE para suscripciones                                                                                     |
| **Funciones de Registry**                               |                          |                                                                                                                    |
| `Registry`                                              | Top-level                | Declara una fuente de registry                                                                                     |
| `URL`                                                   | Registry                 | Establece el endpoint del registry                                                                                 |
| `APIVersion`                                            | Registry                 | Establece la versión de la API                                                                                     |
| `Timeout`                                               | Registry                 | Establece el timeout HTTP                                                                                          |
| `Retry`                                                 | Registry                 | Configura la política de reintentos                                                                                |
| `SyncInterval`                                          | Registry                 | Establece el intervalo de refresco del catálogo                                                                    |
| `CacheTTL`                                              | Registry                 | Establece la duración del caché local                                                                              |
| `Federation`                                            | Registry                 | Configura la importación de registries externos                                                                    |
| `Include`                                               | Federation               | Patrones glob para importar                                                                                        |
| `Exclude`                                               | Federation               | Patrones glob a omitir                                                                                             |
| `PublishTo`                                             | Export                   | Configura la publicación en el registry                                                                            |
| `Version`                                               | Toolset                  | Fija la versión del toolset del registry                                                                           |
| **Funciones de esquema**                                |                          |                                                                                                                    |
| `Attribute`                                             | Args, Return, ServerData | Define un campo del esquema (uso general)                                                                          |
| `Field`                                                 | Args, Return, ServerData | Define un campo proto numerado (gRPC)                                                                              |
| `Required`                                              | Esquema                  | Marca los campos como obligatorios                                                                                 |
| `Example`                                               | Esquema                  | Adjunta un ejemplo explícito; los ejemplos raíz de payload de herramienta declarados se convierten en ejemplos nativos del proveedor y pistas de reintento |


### Ejemplos de payload de herramientas

Para los esquemas de payload de herramientas, un `Example(...)` de Goa de nivel
superior declarado es la fuente de los ejemplos de nivel superior expuestos al
proveedor. Codegen conserva ese ejemplo en la especificación generada como JSON
sin procesar y como objeto de entrada parseado, y también emite el esquema
anotado y un esquema con solo el `example` raíz eliminado.

Los adaptadores de proveedor usan esas proyecciones directamente. Los proveedores
basados en anotaciones de esquema usan el JSON Schema anotado. Anthropic directo
y Bedrock Claude usan `input_examples` nativos con la proyección sin ejemplo
raíz; Bedrock transmite los campos de Anthropic mediante
`additionalModelRequestFields` cuando lo exige el contrato beta. Los ejemplos
generados o sintetizados nunca se promocionan a ejemplos de proveedor de nivel
superior.

## Gestión de prompts (ruta de integración v1)

Goa-AI v1 **no** requiere un DSL dedicado para prompts (`Prompt(...)`, `Prompts(...)`).
La gestión de prompts se impulsa actualmente desde el runtime:

- Registra las specs de prompt base en `runtime.PromptRegistry`.
- Configura sobrescrituras con alcance mediante `runtime.WithPromptStore(...)`.
- Renderiza prompts desde los planners usando `PlannerContext.RenderPrompt(...)`.
- Adjunta la procedencia del prompt renderizado a las llamadas al modelo con `model.Request.PromptRefs`.

Para los flujos agent-as-tool, mapea los IDs de herramientas a IDs de prompt usando opciones del runtime como
`runtime.WithPromptSpec(...)` en los registros agent-tool.
Esto es opcional: cuando no hay contenido de prompt configurado en el consumidor, el runtime
utiliza el payload JSON canónico de la herramienta como mensaje de usuario anidado y los
planners del proveedor pueden renderizar sus propios prompts con contexto del lado del servidor inyectado.

### Field vs Attribute

Tanto `Field` como `Attribute` definen campos del esquema, pero cumplen propósitos distintos:

`**Attribute(name, type, description, dsl)`** - Definición de esquema de propósito general:

- Se utiliza para esquemas solo JSON
- No requiere numeración de campos
- Sintaxis más simple para la mayoría de casos de uso

```go
Args(func() {
    Attribute("query", String, "Search query")
    Attribute("limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

`**Field(number, name, type, description, dsl)**` - Campos numerados para gRPC/protobuf:

- Obligatorio al generar servicios gRPC
- Los números de campo deben ser únicos y estables
- Úsalos cuando tu servicio expone transportes HTTP y gRPC

```go
Args(func() {
    Field(1, "query", String, "Search query")
    Field(2, "limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**Cuándo usar cada uno:**

- Usa `Attribute` para las herramientas de agente que solo usan JSON (el caso más común)
- Usa `Field` cuando tu servicio Goa tenga transporte gRPC y las herramientas se vinculen a esos métodos
- Mezclarlos está permitido pero no se recomienda dentro del mismo esquema

## Visión general

Goa-AI amplía el DSL de Goa con funciones para declarar agentes, toolsets y políticas de runtime. El DSL es evaluado por el motor `eval` de Goa, por lo que se aplican las mismas reglas que con el DSL estándar de servicio/transporte: las expresiones deben invocarse en el contexto apropiado y las definiciones de atributos reutilizan el sistema de tipos de Goa (`Attribute`, `Field`, validaciones, ejemplos, etc.).

### Ruta de importación

Añade el DSL de agents a tus paquetes de diseño Goa:

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### Punto de entrada

Declara los agentes dentro de una definición normal de `Service` de Goa. El DSL enriquece el árbol de diseño de Goa y se procesa durante `goa gen`.

### Resultado

Ejecutar `goa gen` produce:

- Paquetes de agente (`gen/<service>/agents/<agent>`) con definiciones de workflow, actividades del planner y helpers de registro
- Paquetes de completion propiedad del servicio (`gen/<service>/completions`) cuando el servicio declara `Completion(...)`
- Paquetes propietarios del toolset (`gen/<service>/toolsets/<toolset>`) con structs tipados de payload/result, specs, codecs y (cuando aplica) transforms
- Manejadores de actividad para los bucles plan/execute/resume
- Helpers de registro que integran el diseño con el runtime

Se escribe un `AGENTS_QUICKSTART.md` contextual en la raíz del módulo, a menos que se deshabilite mediante `DisableAgentDocs()`.

### Ejemplo de inicio rápido

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

var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

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

Ejecutar `goa gen example.com/assistant/design` produce:

- `gen/orchestrator/agents/chat`: workflow + actividades del planner + registro de agentes
- `gen/orchestrator/agents/chat/specs`: catálogo de herramientas del agente (`ToolSpec`s agregados + `tool_schemas.json`)
- `gen/orchestrator/toolsets/<toolset>`: tipos/specs/codecs/transforms propiedad del toolset para los toolsets propiedad del servicio
- `gen/orchestrator/agents/chat/exports/<export>`: paquetes de toolsets exportados (agent-as-tool)
- Helpers de registro con soporte MCP cuando se referencia un toolset respaldado por MCP mediante `Use`

### Identificadores tipados de herramientas

Cada paquete specs por toolset define identificadores tipados de herramientas (`tools.Ident`) para cada herramienta generada:

```go
const (
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Usa estas constantes en cualquier lugar donde necesites referenciar herramientas.

### Completions tipadas propiedad del servicio

Las herramientas no son el único contrato estructurado del que Goa-AI puede ser propietario. Usa
`Completion(...)` cuando el asistente deba devolver directamente una respuesta final tipada
en lugar de emitir una llamada a herramienta:

```go
var Draft = Type("Draft", func() {
    Attribute("name", String, "Task name")
    Attribute("goal", String, "Outcome-style goal")
    Required("name", "goal")
})

var _ = Service("tasks", func() {
    Completion("draft_from_transcript", "Produce a task draft directly", func() {
        Return(Draft)
    })
})
```

Los nombres de completion forman parte del contrato de salida estructurada. Deben tener
entre 1 y 64 caracteres ASCII, pueden contener letras, dígitos, `_` y `-`, y deben
comenzar con una letra o un dígito.

`goa gen` emite un paquete en `gen/<service>/completions` con:

- esquemas de resultado generados y tipos Go tipados
- codecs JSON generados y helpers de validación
- valores tipados `completion.Spec`
- helpers `Complete<Name>(ctx, client, req)` generados
- helpers `StreamComplete<Name>(ctx, client, req)` y `Decode<Name>Chunk(...)`
generados

Los helpers unary decodifican la respuesta final del asistente directamente. Los helpers
de streaming se mantienen sobre la superficie cruda `model.Streamer`: los chunks
`completion_delta` son solo vista previa, exactamente un chunk final `completion` es
canónico, y `Decode<Name>Chunk(...)` decodifica solo ese payload final.

Los helpers de completion generados rechazan las solicitudes con herramientas habilitadas y
las `StructuredOutput` suministradas por el llamador. Los proveedores que no implementan
salida estructurada fallan explícitamente con `model.ErrStructuredOutputUnsupported`.
El esquema generado sigue siendo el contrato de servicio canónico; los adaptadores de modelo
pueden normalizarlo para la decodificación restringida específica del proveedor, pero deben rechazar
los proveedores que no puedan representar el contrato declarado.

### Composición inline entre procesos

Cuando el agente A declara que "usa" un toolset exportado por el agente B, Goa-AI cablea la composición automáticamente:

- El paquete del exportador (agente B) incluye los helpers generados `agenttools`
- El registro del agente consumidor (agente A) usa esos helpers cuando haces `Use(AgentToolset("service", "agent", "toolset"))`
- La función `Execute` generada construye los mensajes anidados del planner, ejecuta el agente proveedor como un workflow hijo y adapta el `RunOutput` del agente anidado a un `planner.ToolResult`

Esto produce un único workflow determinista por ejecución de agente y un árbol de ejecuciones enlazado para la composición.

---

## Funciones de agente

### Agent

`Agent(name, description, dsl)` declara un agente dentro de un `Service`. Registra los metadatos del agente con alcance de servicio y adjunta toolsets mediante `Use` y `Export`.

**Contexto**: Dentro de `Service`

Cada agente se convierte en un registro de runtime con:

- Una definición de workflow y manejadores de actividad de Temporal
- Actividades PlanStart/PlanResume con opciones de reintento/timeout derivadas del DSL
- Un helper `Register<Agent>` que registra workflows, actividades y toolsets

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

### Use

`Use(value, dsl)` declara que un agente consume un toolset. El toolset puede ser:

- Una variable `Toolset` de nivel superior
- Un toolset declarado con `FromMCP(...)` o `FromExternalMCP(...)`
- Una definición de toolset en línea (nombre como cadena + DSL)
- Una referencia `AgentToolset` para composición agent-as-tool

**Contexto**: Dentro de `Agent`

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference with subsetting
    Use(CommonTools, func() {
        Tool("notify") // consume only this tool from CommonTools
    })
    
    // Reference an MCP toolset declared at top level
    Use(AssistantSuite)
    
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

### Export

`Export(value, dsl)` declara los toolsets expuestos a otros agentes o servicios. Los toolsets exportados pueden ser consumidos por otros agentes mediante `Use(AgentToolset(...))`.

**Contexto**: Dentro de `Agent` o `Service`

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

### AgentToolset

`AgentToolset(service, agent, toolset)` referencia un toolset exportado por otro agente. Esto habilita la composición agent-as-tool.

**Contexto**: Argumento de `Use`

Usa `AgentToolset` cuando:

- No dispongas de un handle de expresión al toolset exportado
- Varios agentes exporten toolsets con el mismo nombre
- Desees ser explícito en el diseño por claridad

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

**Alias**: `UseAgentToolset(service, agent, toolset)` es un alias que combina `AgentToolset` con `Use` en una sola llamada. Prefiere `AgentToolset` en diseños nuevos; el alias existe para mejorar la legibilidad en algunas bases de código.

```go
// Equivalent to Use(AgentToolset("service", "planner", "planning.tools"))
Agent("orchestrator", func() {
    UseAgentToolset("service", "planner", "planning.tools")
})
```

### Passthrough

`Passthrough(toolName, target, methodName)` define un reenvío determinista de una herramienta exportada a un método de servicio Goa. Esto omite por completo al planner.

**Contexto**: Dentro de `Tool` anidado bajo `Export`

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

### DisableAgentDocs

`DisableAgentDocs()` desactiva la generación de `AGENTS_QUICKSTART.md` en la raíz del módulo.

**Contexto**: Dentro de `API`

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

---

## Funciones de Toolset

### Toolset

`Toolset(name, dsl)` declara un toolset propiedad del proveedor en el nivel superior. Cuando se declara en el nivel superior, el toolset se vuelve reutilizable globalmente; los agentes lo referencian mediante `Use`.

**Contexto**: Top-level

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

Los toolsets pueden incluir una descripción usando la función estándar del DSL `Description()`:

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

### Tool

`Tool(name, description, dsl)` define una capacidad invocable dentro de un toolset.

**Contexto**: Dentro de `Toolset` o `Method`

La generación de código emite:

- Structs Go de payload/result en `tool_specs/types.go`
- Codecs JSON (`tool_specs/codecs.go`)
- Definiciones JSON Schema consumidas por los planners
- Entradas del registry de herramientas con prompts auxiliares y metadatos

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
    ResultHintTemplate("Found {{ len .Result.Documents }} documents")
    Tags("docs", "search")
})
```

### Args y Return

`Args(...)` y `Return(...)` definen los tipos de payload/result utilizando el DSL estándar de atributos de Goa.

**Contexto**: Dentro de `Tool`

Puedes usar:

- Una función para definir un esquema de objeto en línea con llamadas `Attribute()`
- Un tipo de usuario de Goa (Type, ResultType, etc.) para reutilizar definiciones de tipos existentes
- Un tipo primitivo (String, Int, etc.) para entradas/salidas simples de un solo valor

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

**Reutilizar tipos:**

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

`ServerData(kind, val, args...)` define una salida tipada exclusiva del servidor emitida junto con el resultado de la herramienta. Los server-data nunca se envían a los proveedores de modelo.
Los server-data tipo timeline suelen proyectarse en tarjetas, gráficos, tablas o mapas de UI orientados a observadores, mientras mantienen el resultado orientado al modelo acotado y eficiente en tokens. Las audiencias evidence e internal permiten a los consumidores posteriores enrutar procedencia o datos de solo composición sin depender de convenciones de nombres de kind.

**Contexto**: Dentro de `Tool`

**Parámetros:**

- `kind`: Un identificador de cadena para el tipo de server-data (p. ej., `"atlas.time_series"`, `"atlas.control_narrative"`, `"aura.evidence"`). Esto permite a los consumidores identificar y manejar distintas proyecciones de server-data apropiadamente.
- `val`: La definición del esquema, siguiendo los mismos patrones que `Args` y `Return`: una función con llamadas `Attribute()`, un tipo de usuario de Goa o un tipo primitivo.

**Enrutamiento por audiencia (`Audience`*):**

Cada entrada `ServerData` declara una audiencia que los consumidores posteriores utilizan para enrutar el payload sin depender de convenciones de nombre de kind:

- `"timeline"`: persistido y apto para proyección orientada al observador (p. ej., tarjetas UI/timeline)
- `"internal"`: adjunto de composición de herramientas; no se persiste ni se renderiza
- `"evidence"`: referencias de procedencia; se persisten por separado de las tarjetas de timeline

Configura la audiencia dentro del bloque DSL `ServerData`:

```go
ServerData("atlas.time_series.chart_points", TimeSeriesServerData, func() {
    AudienceInternal()
    FromMethodResultField("chart_sidecar")
})

ServerData("aura.evidence", ArrayOf(Evidence), func() {
    AudienceEvidence()
    FromMethodResultField("evidence")
})
```

**Cuándo usar ServerData:**

- Cuando los resultados de la herramienta deban incluir datos de alta fidelidad para las UIs (gráficos, tablas) manteniendo acotados los payloads para el modelo
- Cuando quieras adjuntar grandes conjuntos de resultados que superarían los límites de contexto del modelo
- Cuando los consumidores posteriores necesiten datos estructurados que el modelo no necesita ver

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
})
```

**Usar un tipo Goa para el esquema de server-data:**

```go
var TimeSeriesServerData = Type("TimeSeriesServerData", func() {
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
    ServerData("atlas.metrics", TimeSeriesServerData)
})
```

**Acceso en tiempo de ejecución:**

En tiempo de ejecución, los server-data emitidos por las herramientas se transportan en
`planner.ToolResult.ServerData`. Decodifica esos bytes JSON canónicos con los
codecs de server-data generados para los kinds declarados por la herramienta:

```go
// In a stream subscriber or result handler
func handleToolResult(result *planner.ToolResult) {
    if len(result.ServerData) > 0 {
        // Decode with the generated server-data codecs for this tool.
    }
}
```

### BoundedResult

`BoundedResult()` marca el resultado de la herramienta actual como una vista acotada sobre un conjunto de datos potencialmente mayor.
Declara un contrato de bounds propiedad del runtime manteniendo el tipo de resultado autorizado con significado semántico y
específico del dominio.

**Contexto**: Dentro de `Tool`

Campos canónicos visibles para el modelo:

- `returned` (obligatorio, `Int`)
- `truncated` (obligatorio, `Boolean`)
- `total` (opcional, `Int`)
- `refinement_hint` (opcional, `String`)
- `next_cursor` (opcional, `String`) cuando se declara mediante `NextCursor(...)`; es una referencia de continuación del runtime, no el cursor del proveedor

`BoundedResult` es la única fuente de verdad para ese contrato:

- codegen lo registra en `tools.ToolSpec.Bounds` generado
- codegen proyecta los campos acotados canónicos en el esquema JSON de resultado generado
- las ejecuciones acotadas exitosas deben establecer `planner.ToolResult.Bounds`
- el runtime proyecta bounds propiedad del proveedor en el JSON `tool_result` codificado, los datos de plantilla de result-hint,
los hooks y los eventos de stream
- para herramientas paginadas por cursor, el `next_cursor` visible para el modelo es el `tool_call_id` que produjo el resultado; el cursor del proveedor permanece privado en el historial del runtime

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("site_id", String, "Site identifier")
        Attribute("cursor", String, "Runtime continuation reference returned by the previous page")
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "List of devices")
        Required("devices")
    })
    BoundedResult(func() {
        Cursor("cursor")
        NextCursor("next_cursor")
    })
})
```

Los tipos de retorno orientados a la herramienta no deben declarar `returned`, `total`, `truncated`,
`refinement_hint` ni `next_cursor` simplemente para que el modelo los vea. Mantén el resultado semántico centrado
en los datos del dominio. Las herramientas respaldadas por método pueden usar internamente tipos de resultado de método de servicio más ricos, pero
el contrato de herramienta de Goa-AI proviene de `BoundedResult(...)`, no de campos duplicados en el retorno de la herramienta. Dentro de
esos resultados de método acotado, solo `returned` y `truncated` pueden ser obligatorios; `total`,
`refinement_hint` y `next_cursor` siguen siendo partes opcionales del contrato de bounds.

**Responsabilidad del servicio:**

Los servicios son responsables de:

1. Aplicar su propia lógica de truncamiento (paginación, límites, tope de profundidad)
2. Poblar `planner.ToolResult.Bounds`
3. Establecer `Bounds.NextCursor` con el cursor del proveedor cuando existe otra página
4. Proveer opcionalmente un `RefinementHint` cuando los resultados se truncan

El runtime no calcula por sí mismo subconjuntos ni truncamientos. Solo valida y proyecta los metadatos de bounds
que las herramientas reportan.

**Cuándo usar BoundedResult:**

- Herramientas que devuelven listas paginadas (dispositivos, usuarios, registros)
- Herramientas que consultan grandes conjuntos de datos con límites de resultado
- Herramientas que aplican topes de profundidad o tamaño a estructuras anidadas
- Cualquier herramienta en la que el modelo necesite entender que los resultados pueden ser incompletos

**Comportamiento en tiempo de ejecución:**

```go
result := &planner.ToolResult{
    Result: &ListDevicesResult{
        Devices: devices,
    },
    Bounds: &agent.Bounds{
        Returned:       len(devices),
        Total:          ptr(total),
        Truncated:      truncated,
        NextCursor:     nextCursor,
        RefinementHint: refinementHint,
    },
}
```

Cuando se ejecuta una herramienta acotada:

1. El runtime valida que una herramienta acotada exitosa devolvió `planner.ToolResult.Bounds`.
2. El runtime fusiona esos bounds en el JSON emitido utilizando los nombres de campo de `BoundedResult(...)`.
   Cuando `Bounds.NextCursor` está presente, el `next_cursor` emitido es la referencia de continuación `tool_call_id` que produjo el resultado.
3. El cursor del proveedor permanece como estado privado del runtime para hidratar la siguiente llamada; planners, hooks,
  streams y UIs reciben los bounds visibles para el modelo.

Las herramientas pueden incluir un título de visualización usando la función estándar del DSL `Title()`:

```go
Tool("web_search", "Search the web", func() {
    Title("Web Search")
    Args(func() { /* ... */ })
})
```

### Idempotent

`Idempotent()` marca la herramienta actual como idempotente *dentro de una transcripción de ejecución*.
Cuando se establece, los runtimes/planners pueden tratar las llamadas repetidas a la herramienta con argumentos idénticos
como redundantes y evitar ejecutarlas una vez que ya exista un resultado exitoso en
la transcripción.

**Contexto**: Dentro de `Tool`

**Cuándo usar**

Usa `Idempotent()` solo cuando el resultado de la herramienta sea una función pura de sus argumentos
durante el tiempo de vida de una transcripción de ejecución (por ejemplo, recuperar una sección de documentación
por identificador estable).

**Cuándo no usar**

No marques herramientas como idempotentes cuando su resultado dependa de un estado externo cambiante
pero el payload de la herramienta no lleve un parámetro de tiempo/versión (por ejemplo,
"obtener modo actual" u "obtener estado actual" sin una entrada `as_of`).

**Generación de código**

Cuando una herramienta se marca como `Idempotent()`, codegen emite la etiqueta
`goa-ai.idempotency=transcript` en las `tools.ToolSpec.Tags` generadas. Esta
etiqueta es consumida por los runtimes/planners que implementan de-duplicación consciente de la transcripción.

### Confirmation

`Confirmation(dsl)` declara que una herramienta debe ser aprobada explícitamente fuera de banda antes de
ejecutarse. Está destinada a herramientas **sensibles para el operador** (escrituras, eliminaciones, comandos).

**Contexto**: Dentro de `Tool`

En tiempo de generación, Goa-AI registra la política de confirmación en la tool spec generada. En tiempo de ejecución, el
workflow emite una solicitud de confirmación usando `AwaitConfirmation` y ejecuta la herramienta solo después de que se
proporcione una aprobación explícita.

Ejemplo mínimo:

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

Notas:

- El runtime posee cómo se solicita la confirmación. El protocolo de confirmación integrado utiliza un
`AwaitConfirmation` dedicado y una llamada de decisión `ProvideConfirmation`. Consulta la guía de Runtime para los
payloads esperados y el flujo de ejecución.
- Las plantillas de confirmación (`PromptTemplate` y `DeniedResultTemplate`) son cadenas de `text/template` de Go
ejecutadas con `missingkey=error`. Además de las funciones de plantilla estándar (p. ej., `printf`),
Goa-AI provee:
  - `json v` → codifica `v` como JSON (útil para campos puntero opcionales o para incrustar valores estructurados).
  - `quote s` → devuelve una cadena entrecomillada al estilo Go (como `fmt.Sprintf("%q", s)`).
- La confirmación también puede habilitarse dinámicamente en tiempo de ejecución mediante `runtime.WithToolConfirmation(...)`
(útil para políticas basadas en entorno o sobrescrituras por despliegue).

### CallHintTemplate y ResultHintTemplate

`CallHintTemplate(template)` y `ResultHintTemplate(template)` configuran plantillas de visualización para las invocaciones y resultados de las herramientas. Las plantillas son cadenas de Go text/template renderizadas con valores Go tipados para producir pistas concisas mostradas durante y tras la ejecución.

**Contexto**: Dentro de `Tool`

**Puntos clave:**

- Las plantillas de llamada reciben el payload tipado como raíz de la plantilla (por ejemplo, `.Query`, `.DeviceID`)
- Las plantillas de resultado reciben un envoltorio explícito donde los campos semánticos viven bajo `.Result` y los metadatos acotados viven bajo `.Bounds`
- Mantén las pistas concisas: ≤140 caracteres recomendados para una visualización limpia en UI
- Las plantillas se compilan con `missingkey=error`: todos los campos referenciados deben existir
- Usa nombres de campo Go, no claves JSON
- Usa bloques `{{ if .Field }}` o `{{ with .Field }}` para los campos opcionales

**Contrato en tiempo de ejecución:**

- Los constructores de hooks no renderizan pistas. Los eventos tool call scheduled tienen por defecto `DisplayHint==""`.
- El runtime enriquece y persiste una pista de llamada por defecto duradera en el momento de publicación a partir de la plantilla tipada cuando la decodificación del payload tiene éxito.
- El registro de herramientas requiere un título de metadatos no vacío. Cuando la decodificación tipada falla o no hay plantilla registrada, el runtime usa ese título como display hint. Los payloads malformados siguen fallando en el límite de la herramienta; el título de metadatos solo mantiene renderizable el trabajo intentado. Las pistas nunca se renderizan sobre bytes JSON crudos.
- Si un productor establece explícitamente `DisplayHint` (no vacío) antes de publicar el evento del hook, el runtime lo trata
como autoritativo y no lo sobrescribe.
- Para cambios de redacción por consumidor, configura `runtime.WithHintOverrides` en el runtime. Las sobrescrituras toman
precedencia sobre las plantillas autoradas en DSL para los eventos `tool_start` streameados.

**Ejemplo básico:**

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
    ResultHintTemplate("Found {{ .Result.Count }} results")
})
```

**Campos de struct tipado:**

Las plantillas de llamada reciben el struct de payload Go generado como raíz de la plantilla.
Las plantillas de resultado reciben el envoltorio de preview del runtime, por lo que los campos semánticos viven
bajo `.Result` y los metadatos acotados viven bajo `.Bounds`. Los nombres de campo siguen las
convenciones de nombres de Go (PascalCase), no las convenciones JSON (snake_case o camelCase):

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
    ResultHintTemplate("{{ .Result.DeviceName }}: {{ if .Result.IsOnline }}online{{ else }}offline{{ end }}")
})
```

**Manejo de campos opcionales:**

Usa bloques condicionales para los campos opcionales para evitar errores de plantilla:

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
    ResultHintTemplate("{{ .Result.Total }} items{{ if .Result.Truncated }} (truncated){{ end }}")
})
```

**Funciones de plantilla integradas:**

El runtime provee estas funciones auxiliares para las plantillas de pistas:


| Función    | Descripción                           | Ejemplo                      |
| ---------- | ------------------------------------- | ---------------------------- |
| `join`     | Une un slice de cadenas con separador | `{{ join .Tags ", " }}`      |
| `count`    | Cuenta los elementos de un slice      | `{{ count .Results }} items` |
| `truncate` | Trunca una cadena a N caracteres      | `{{ truncate .Query 20 }}`   |


**Ejemplo completo con todas las funcionalidades:**

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
    ResultHintTemplate("{{ count .Result.Insights }} insights in {{ .Result.ProcessingTimeMs }}ms")
})
```

### ResultReminder

`ResultReminder(text)` configura un recordatorio de sistema estático que se inyecta en la conversación después de que se devuelve el resultado de la herramienta. Úsalo para proporcionar una guía entre bastidores al modelo sobre cómo interpretar o presentar el resultado al usuario.

**Contexto**: Dentro de `Tool`

El texto del recordatorio se envuelve automáticamente en etiquetas `<system-reminder>` por el runtime. No incluyas las etiquetas en el texto.

**Recordatorios estáticos vs dinámicos:**

`ResultReminder` es para recordatorios estáticos, en tiempo de diseño, que aplican cada vez que se llama la herramienta. Para recordatorios dinámicos que dependen del estado en tiempo de ejecución o del contenido del resultado de la herramienta, usa `PlannerContext.AddReminder()` en tu implementación de planner. Los recordatorios dinámicos soportan:

- Limitación de frecuencia (turnos mínimos entre emisiones)
- Topes por ejecución (número máximo de emisiones por ejecución)
- Adición/eliminación en tiempo de ejecución según condiciones
- Niveles de prioridad (seguridad vs guía)

**Ejemplo básico:**

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

**Cuándo usar ResultReminder:**

- Cuando la UI renderiza los resultados de la herramienta de una manera especial (gráficos, tablas) sobre la que el modelo debería saber
- Cuando el modelo debería evitar repetir información que ya es visible al usuario
- Cuando hay contexto importante sobre cómo se presentan los resultados que afecta cómo debería responder el modelo
- Cuando quieres una guía consistente que aplique a cada invocación de la herramienta

**Múltiples herramientas con recordatorios:**

Cuando varias herramientas en un mismo turno tienen recordatorios de resultado, se combinan en un solo mensaje de sistema:

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

**Recordatorios dinámicos mediante PlannerContext:**

Para recordatorios que dependen de condiciones en tiempo de ejecución, usa la API del planner en su lugar:

```go
// In your planner implementation
func (p *MyPlanner) PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Add a dynamic reminder based on tool results
    for _, tr := range input.ToolOutputs {
        if tr.Name != "get_time_series" || tr.Error != nil {
            continue
        }
        result, err := specs.UnmarshalGetTimeSeriesResult(tr.Result)
        if err != nil {
            return nil, err
        }
        if hasAnomalies(result) {
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

### Tags

`Tags(values...)` anota herramientas o toolsets con etiquetas de metadatos. Las etiquetas se exponen a los motores de políticas y a la telemetría.

**Contexto**: Dentro de `Tool` o `Toolset`

Patrones de etiquetas habituales:

- Categorías de dominio: `"nlp"`, `"database"`, `"api"`, `"filesystem"`
- Tipos de capacidad: `"read"`, `"write"`, `"search"`, `"transform"`
- Niveles de riesgo: `"safe"`, `"destructive"`, `"external"`

```go
Tool("delete_file", "Delete a file", func() {
    Args(func() { /* ... */ })
    Tags("filesystem", "write", "destructive")
})
```

### BindTo

`BindTo("Method")` o `BindTo("Service", "Method")` asocia una herramienta con un método de servicio Goa.

**Contexto**: Dentro de `Tool`

Cuando una herramienta se vincula a un método:

- El esquema `Args` de la herramienta puede diferir del `Payload` del método
- El esquema `Return` de la herramienta puede diferir del `Result` del método
- Los adaptadores generados transforman entre los tipos de herramienta y de método

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

### Inject

`Inject(fields...)` marca determinados campos del payload como "inyectados" (infraestructura del lado del servidor). Los campos inyectados son:

1. Ocultos al LLM (excluidos del esquema JSON enviado al modelo)
2. Validados como campos `String` obligatorios en el payload del método vinculado
3. Poblados desde `runtime.ToolCallMeta` por los ejecutores generados, con hooks opcionales `ToolInterceptor.Inject`

**Contexto**: Dentro de `Tool`

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

Los nombres de campo inyectados soportados son fijos: `run_id`, `session_id`, `turn_id`,
`tool_call_id` y `parent_tool_call_id`.

En tiempo de ejecución, los ejecutores de servicio generados copian los valores coincidentes desde
`runtime.ToolCallMeta` antes de que se ejecuten los interceptores tipados opcionales:

```go
func (h *Handler) Inject(ctx context.Context, payload any, meta *runtime.ToolCallMeta) error {
    if p, ok := payload.(*dataservice.GetPayload); ok {
        p.SessionID = meta.SessionID
    }
    return nil
}
```

### TerminalRun

`TerminalRun()` marca la herramienta actual como terminal para la ejecución. Una vez que la herramienta se ejecuta con éxito, el runtime finaliza la ejecución inmediatamente después de publicar el resultado de la herramienta sin solicitar un turno de seguimiento `PlanResume`/finalización.

**Contexto**: Dentro de `Tool`

Usa `TerminalRun()` para herramientas cuyo resultado es la salida terminal, orientada al usuario, de la ejecución: por ejemplo, un renderizador de informe final o una herramienta "commit this run". El resultado de la herramienta es el artefacto terminal de la ejecución; una narración adicional del modelo no es necesaria ni deseable.

```go
Tool("commit_task", "Commit the terminal task artifact", func() {
    Args(TaskCompletionArgs)
    Return(TaskCompletionResult)
    TerminalRun()
})
```

**Comportamiento en tiempo de ejecución:**

- Codegen registra la bandera en `tools.ToolSpec.TerminalRun`.
- Tras una llamada exitosa a una herramienta terminal, el runtime finaliza la ejecución sin llamar a `PlanResume`.
- Las herramientas terminales componen de forma natural con `Bookkeeping()` (ver abajo): la típica herramienta "commit this run" es a la vez terminal y bookkeeping, por lo que siempre se ejecuta incluso cuando el presupuesto de recuperación está agotado y finaliza la ejecución de forma atómica.

### Bookkeeping

`Bookkeeping()` marca la herramienta actual como una herramienta de bookkeeping que no consume el presupuesto de recuperación `MaxToolCalls` a nivel de ejecución. El runtime no decrementa `RemainingToolCalls` para las llamadas de bookkeeping y nunca las descarta al recortar un batch para ajustarlo al presupuesto restante.

**Contexto**: Dentro de `Tool`

Usa `Bookkeeping()` para herramientas estructuradas de progreso, estado, hallazgos y commit terminal, cuyo coste es de registro en lugar de recuperación o trabajo con efectos secundarios. Ejemplos clásicos son las actualizaciones de estado, los marcadores de progreso y la herramienta atómica "commit this run" que escribe el artefacto final.

```go
Tool("set_step_status", "Update step status", func() {
    Args(SetStepStatusArgs)
    Return(SetStepStatusResult)
    Bookkeeping()
})
```

**Comportamiento en tiempo de ejecución:**

- Codegen registra la bandera en `tools.ToolSpec.Bookkeeping`.
- Las llamadas de bookkeeping nunca cuentan contra `MaxToolCalls` y nunca se descartan cuando el runtime recorta un batch para ajustarlo al presupuesto restante. Las llamadas presupuestadas (no bookkeeping) se recortan primero; las llamadas de bookkeeping conservan su posición original.
- Los resultados exitosos de bookkeeping permanecen ocultos para los futuros turnos del planner. Coloca el estado canónico sobre el que deba razonar el siguiente turno en una entrada explícita del planner, no en el resultado de una herramienta de bookkeeping.
- Las herramientas desconocidas se tratan como presupuestadas; solo las herramientas declaradas `Bookkeeping()` en el DSL (o marcadas como bookkeeping en la `ToolSpec` del runtime) quedan exentas.
- Un turno solo de bookkeeping debe resolverse en el mismo turno (`TerminalRun()`, `FinalResponse`, `FinalToolResult`, o await/pausa).

**Composición con `TerminalRun()`:**

Una herramienta de commit terminal suele ser a la vez bookkeeping y terminal:

```go
Tool("commit_task", "Commit the terminal task artifact", func() {
    Args(TaskCompletionArgs)
    Return(TaskCompletionResult)
    Bookkeeping()  // always executes, even when the budget is exhausted
    TerminalRun()  // ends the run atomically once it succeeds
})
```

Este patrón garantiza que la ejecución siempre pueda finalizar de forma determinista: la herramienta de commit está exenta del presupuesto de recuperación, y una vez que tiene éxito la ejecución queda concluida sin un turno de planner de seguimiento.

## Funciones de política

### RunPolicy

`RunPolicy(dsl)` configura los límites de ejecución aplicados en tiempo de ejecución. Se declara dentro de un `Agent` y contiene ajustes de política como caps, presupuestos de tiempo, gestión del historial y manejo de interrupciones.

**Contexto**: Dentro de `Agent`

**Funciones de política disponibles:**

- `DefaultCaps` – límites de recursos (llamadas a herramientas, fallos consecutivos)
- `TimeBudget` – límite simple de tiempo real para toda la ejecución
- `Timing` – timeouts finos para budget, planificación y actividades de herramientas (avanzado)
- `History` – gestión del historial de conversación (ventana deslizante o compresión)
- `InterruptsAllowed` – habilita pausar/reanudar para human-in-the-loop
- `OnMissingFields` – comportamiento de validación ante campos obligatorios faltantes

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

### DefaultCaps

`DefaultCaps(opts...)` aplica topes de capacidad para evitar bucles descontrolados y aplicar límites de ejecución.

**Contexto**: Dentro de `RunPolicy`

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

**MaxToolCalls(n)**: Establece el número máximo de invocaciones de herramientas presupuestadas permitidas por ejecución. Las herramientas declaradas `Bookkeeping()` están exentas de este tope y no cuentan contra `n`. Cuando el presupuesto se agota, el runtime deja de programar llamadas presupuestadas y finaliza la ejecución a través del planner con motivo de terminación `tool_cap`.

**MaxConsecutiveFailedToolCalls(n)**: Establece el número máximo de llamadas a herramienta fallidas consecutivas antes de abortar. Previene bucles infinitos de reintento.

### TimeBudget

`TimeBudget(duration)` aplica un límite de tiempo real a la ejecución del agente. La duración se especifica como cadena (p. ej., `"2m"`, `"30s"`).

**Contexto**: Dentro de `RunPolicy`

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

Para control fino sobre los timeouts de actividades individuales, usa `Timing` en su lugar.

### Timing

`Timing(dsl)` provee configuración fina de timeouts como alternativa a `TimeBudget`. Mientras que `TimeBudget` establece un único límite global, `Timing` te permite controlar timeouts en tres niveles: el presupuesto global de la ejecución, las actividades del planner (inferencia del LLM) y las actividades de ejecución de herramientas.

**Contexto**: Dentro de `RunPolicy`

**Cuándo usar Timing vs TimeBudget:**

- Usa `TimeBudget` para casos simples donde un único límite de tiempo real es suficiente
- Usa `Timing` cuando necesites timeouts distintos para planificación vs ejecución de herramientas: por ejemplo, cuando las herramientas hagan llamadas lentas a APIs externas pero quieras respuestas LLM rápidas

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock budget for the entire run
        Plan("45s")     // timeout for Plan/Resume activities (LLM inference)
        Tools("2m")     // default timeout for ExecuteTool activities
    })
})
```

`Timing` se mantiene en la capa semántica del runtime. `Plan(...)` y `Tools(...)`
acotan cuánto tiempo puede ejecutar un intento sano de planner o herramienta una vez iniciado.
No configuran mecánicas del motor de workflows como timeouts de espera en cola o
liveness por heartbeat. Si usas el adaptador Temporal, configura esas mecánicas
con `temporal.Options.ActivityDefaults`.

**Funciones de Timing:**


| Función            | Descripción                                        | Afecta a                                              |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| `Budget(duration)` | Presupuesto total de tiempo real para la ejecución | Todo el ciclo de vida de la ejecución                 |
| `Plan(duration)`   | Timeout para las actividades Plan y Resume         | Llamadas de inferencia del LLM vía planner            |
| `Tools(duration)`  | Timeout por defecto para las actividades ExecuteTool | Ejecución de herramientas (servicios, MCP, agent-as-tool) |


**Cómo afecta Timing al comportamiento en tiempo de ejecución:**

El runtime traduce estos valores DSL en presupuestos de intento agnósticos del motor:

- `Budget` establece el presupuesto semántico de tiempo real para la ejecución. El runtime aplica
ese presupuesto al trabajo del planner/herramientas y deriva el timeout de ejecución del motor como
`Budget + FinalizerGrace + margen del motor` para que el turno final de resume del planner
y la limpieza terminal aún tengan espacio para finalizar.
- `Plan` se convierte en el presupuesto de intento para `PlanStart` y `PlanResume`
- `Tools` se convierte en el presupuesto de intento por defecto para `ExecuteTool`

El comportamiento específico de Temporal de espera en cola y liveness se superpone por separado mediante
el adaptador Temporal.

**Ejemplo completo:**

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

`Cache(dsl)` configura el comportamiento de caché de prompts para el agente. Especifica dónde debe colocar el runtime los puntos de control de caché relativos a los prompts de sistema y las definiciones de herramientas para los proveedores que soportan caché.

**Contexto**: Dentro de `RunPolicy`

El caché de prompts puede reducir significativamente los costes de inferencia y la latencia al permitir a los proveedores reutilizar contenido previamente procesado. La función Cache te permite definir los límites de checkpoint que los proveedores utilizan para determinar qué contenido puede cachearse.

```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

**Funciones de checkpoint de caché:**


| Función         | Descripción                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AfterSystem()` | Coloca un checkpoint de caché tras todos los mensajes de sistema. Los proveedores lo interpretan como un límite de caché inmediatamente tras el preámbulo del sistema. |
| `AfterTools()`  | Coloca un checkpoint de caché tras las definiciones de herramientas. Los proveedores lo interpretan como un límite de caché inmediatamente tras la sección de configuración de herramientas. |


**Soporte del proveedor:**

No todos los proveedores soportan caché de prompts, y el soporte varía por tipo de checkpoint:


| Proveedor               | AfterSystem | AfterTools |
| ----------------------- | ----------- | ---------- |
| Bedrock (modelos Claude) | ✓           | ✓          |
| Bedrock (modelos Nova)   | ✓           | ✗          |


Los proveedores que no soportan caché ignoran estas opciones. El runtime valida las restricciones específicas del proveedor: por ejemplo, solicitar `AfterTools` con un modelo Nova devuelve un error.

**Cuándo usar Cache:**

- Usa `AfterSystem()` cuando tu prompt de sistema sea estable entre turnos y quieras evitar reprocesarlo
- Usa `AfterTools()` cuando tus definiciones de herramientas sean estables y quieras cachear la configuración de herramientas
- Combina ambos para obtener el máximo beneficio de caché con los proveedores compatibles

**Ejemplo completo:**

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

### History

`History(dsl)` define cómo el runtime gestiona el historial de conversación antes de cada invocación al planner. Las políticas de historial transforman el historial de mensajes preservando:

- Los prompts de sistema al inicio de la conversación
- Los límites lógicos de turno (usuario + asistente + llamadas/resultados de herramientas como unidades atómicas)

Se puede configurar como máximo una política de historial por agente.

**Contexto**: Dentro de `RunPolicy`

Hay dos políticas estándar disponibles:

**KeepRecentTurns (Ventana deslizante):**

`KeepRecentTurns(n)` retiene solo los N turnos de usuario/asistente más recientes mientras preserva los prompts de sistema y los intercambios de herramientas. Es el enfoque más simple para acotar el tamaño del contexto.

```go
RunPolicy(func() {
    History(func() {
        KeepRecentTurns(20) // Keep the last 20 user/assistant turns
    })
})
```

**Parámetros:**

- `n`: Número de turnos recientes a mantener (debe ser > 0)

**Compress (Resumen asistido por modelo):**

`Compress(triggerAt, keepRecent)` resume los turnos antiguos usando un modelo mientras mantiene los turnos recientes con fidelidad completa. Esto preserva más contexto que una ventana deslizante simple al condensar la conversación antigua en un resumen.

```go
RunPolicy(func() {
    History(func() {
        // When at least 30 turns exist, summarize older turns
        // and keep the most recent 10 in full fidelity
        Compress(30, 10)
    })
})
```

**Parámetros:**

- `triggerAt`: Conteo total mínimo de turnos antes de que se ejecute la compresión (debe ser > 0)
- `keepRecent`: Número de turnos más recientes a retener con fidelidad completa (debe ser >= 0 y < triggerAt)

**Requisito HistoryModel:**

Al usar `Compress`, debes suministrar un `model.Client` mediante el campo generado `HistoryModel` en la configuración del agente. El runtime usa este cliente con `ModelClassSmall` para resumir los turnos antiguos:

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

Si no se provee `HistoryModel` cuando `Compress` está configurado, el registro fallará.

**Preservación de límites de turno:**

Ambas políticas preservan los límites lógicos de turno como unidades atómicas. Un "turno" consiste en:

1. Un mensaje del usuario
2. La respuesta del asistente (texto y/o llamadas a herramientas)
3. Cualquier resultado de herramienta de esa respuesta

Esto garantiza que el modelo siempre vea secuencias de interacción completas, nunca turnos parciales que podrían confundir el contexto.

### InterruptsAllowed

`InterruptsAllowed(bool)` señala que las interrupciones human-in-the-loop deben ser respetadas. Cuando está habilitado, el runtime soporta operaciones de pausa/reanudación, que son esenciales para los bucles de clarificación y los estados de await durables.

**Contexto**: Dentro de `RunPolicy`

**Beneficios clave:**

- Permite al agente **pausar** la ejecución cuando falte información obligatoria (ver `OnMissingFields`).
- Permite al planner **esperar** entrada del usuario mediante herramientas de clarificación.
- Asegura que el estado del agente se preserva exclusivamente durante la pausa, sin consumir recursos de cómputo hasta reanudarse.

```go
RunPolicy(func() {
    // Enable pause/resume capability
    InterruptsAllowed(true)
    
    // Automatically pause when required tool arguments are missing
    OnMissingFields("await_clarification")
})
```

### OnMissingFields

`OnMissingFields(action)` configura cómo responde el agente cuando la validación de invocación de herramientas detecta campos obligatorios faltantes.

**Contexto**: Dentro de `RunPolicy`

Valores válidos:

- `"finalize"`: Detiene la ejecución cuando faltan campos obligatorios
- `"await_clarification"`: Pausa y espera a que el usuario proporcione la información faltante
- `"resume"`: Continúa la ejecución a pesar de los campos faltantes
- `""` (vacío): Deja que el planner decida según el contexto

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

### Ejemplo completo de política

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

## Funciones MCP

Goa-AI provee funciones DSL para declarar servidores Model Context Protocol (MCP) dentro de los servicios Goa.

### MCP

`MCP(name, version, opts...)` habilita el soporte MCP para el servicio actual. Configura el servicio para exponer herramientas, recursos y prompts mediante el protocolo MCP.

**Contexto**: Dentro de `Service`

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
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
        Tool("add", "Add two numbers")
    })
})
```

### ProtocolVersion

`ProtocolVersion(version)` configura la versión del protocolo MCP soportada por el servidor. Devuelve una función de configuración para usar con `MCP`.

**Contexto**: Argumento de opción a `MCP`

```go
Service("calculator", func() {
    // Specify protocol version as an option
    MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
})
```

### Tool (en contexto de Method)

Dentro de un `Method` en un servicio con MCP habilitado, `Tool(name, description)` marca el método actual como una herramienta MCP. El payload del método se convierte en el esquema de entrada de la herramienta y el result en el esquema de salida.

**Contexto**: Dentro de `Method` (el servicio debe tener MCP habilitado)

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
    Tool("search", "Search documents by query")
})
```

### Toolset con `FromMCP` / `FromExternalMCP`

Usa `Toolset(FromMCP(service, toolset))` para servidores MCP definidos en Goa en el mismo diseño, o `Toolset("name", FromExternalMCP(service, toolset), func() { ... })` para servidores MCP externos con esquemas en línea.

**Contexto**: Top-level

**Servidor MCP respaldado por Goa:**

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

`FromMCP` debe apuntar a un servicio Goa en el mismo diseño que declare `MCP(...)`.
El generador eleva los esquemas de herramientas desde los métodos MCP de ese servicio.

**Servidor MCP externo con esquemas en línea:**

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

`FromExternalMCP` requiere declaraciones `Tool(...)` en línea porque los esquemas del servidor
externo no provienen del diseño local de Goa.

### Resource y WatchableResource

`Resource(name, uri, mimeType)` marca un método como proveedor de recurso MCP.

`WatchableResource(name, uri, mimeType)` marca un método como recurso suscribible.

**Contexto**: Dentro de `Method` (el servicio debe tener MCP habilitado)

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

### StaticPrompt y DynamicPrompt

`StaticPrompt(name, description, messages...)` añade una plantilla de prompt estática.

`DynamicPrompt(name, description)` marca un método como generador de prompts dinámicos.

**Contexto**: Dentro de `Service` (estático) o `Method` (dinámico)

```go
Service("assistant", func() {
    MCP("assistant-mcp", "1.0")
    
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

### Notification y Subscription

`Notification(name, description)` marca un método como emisor de notificaciones MCP.

`Subscription(resourceName)` marca un método como manejador de suscripciones para un recurso watchable.

**Contexto**: Dentro de `Method` (el servicio debe tener MCP habilitado)

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

`SubscriptionMonitor(name)` marca el método actual como monitor de server-sent events (SSE) para las actualizaciones de suscripción. El método transmite eventos de cambio de suscripción a los clientes conectados.

**Contexto**: Dentro de `Method` (el servicio debe tener MCP habilitado)

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

**Cuándo usar SubscriptionMonitor:**

- Cuando los clientes necesiten actualizaciones en tiempo real sobre los cambios de suscripción
- Para implementar endpoints SSE que empujen eventos de suscripción
- Al construir UIs reactivas que respondan a los cambios de recursos

### Ejemplo completo de servidor MCP

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
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
        Tool("search", "Search documents by query")
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

## Funciones de Registry

Goa-AI provee funciones DSL para declarar y consumir registries de herramientas: catálogos centralizados de servidores MCP, toolsets y agentes que pueden ser descubiertos y consumidos por los agentes.

### Registry

`Registry(name, dsl)` declara una fuente de registry para el descubrimiento de herramientas. Los registries son catálogos centralizados que pueden ser descubiertos y consumidos por los agentes goa-ai.

**Contexto**: Top-level

Dentro de la función DSL, usa:

- `URL`: establece la URL del endpoint del registry (obligatorio)
- `Description`: establece una descripción legible por humanos
- `APIVersion`: establece la versión de la API del registry (por defecto "v1")
- `Security`: referencia esquemas de seguridad de Goa para autenticación
- `Timeout`: establece el timeout de las solicitudes HTTP
- `Retry`: configura la política de reintentos para las solicitudes fallidas
- `SyncInterval`: establece cada cuánto refrescar el catálogo
- `CacheTTL`: establece la duración del caché local
- `Federation`: configura los ajustes de importación de registry externo

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

**Opciones de configuración:**


| Función                      | Descripción                            | Ejemplo                                 |
| ---------------------------- | -------------------------------------- | --------------------------------------- |
| `URL(endpoint)`              | URL del endpoint del registry (obligatoria) | `URL("https://registry.corp.internal")` |
| `APIVersion(version)`        | Segmento de ruta de la versión de la API | `APIVersion("v1")`                      |
| `Timeout(duration)`          | Timeout de la solicitud HTTP           | `Timeout("30s")`                        |
| `Retry(maxRetries, backoff)` | Política de reintentos para solicitudes fallidas | `Retry(3, "1s")`                        |
| `SyncInterval(duration)`     | Intervalo de refresco del catálogo     | `SyncInterval("5m")`                    |
| `CacheTTL(duration)`         | Duración del caché local               | `CacheTTL("1h")`                        |


### Federation

`Federation(dsl)` configura los ajustes de importación de registries externos. Usa Federation dentro de una declaración Registry para especificar qué namespaces importar desde una fuente federada.

**Contexto**: Dentro de `Registry`

Dentro de la función DSL de Federation, usa:

- `Include`: especifica los patrones glob para los namespaces a importar
- `Exclude`: especifica los patrones glob para los namespaces a omitir

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

**Include y Exclude:**

- `Include(patterns...)`: Especifica patrones glob para los namespaces a importar. Si no se especifican patrones Include, se incluyen por defecto todos los namespaces.
- `Exclude(patterns...)`: Especifica patrones glob para los namespaces a omitir. Los patrones Exclude se aplican después de los Include.

### FromRegistry

`FromRegistry(registry, toolset)` configura un toolset para que sea suministrado desde un registry. Usa FromRegistry como opción de proveedor al declarar un Toolset.

**Contexto**: Argumento de `Toolset`

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

Los toolsets respaldados por registry pueden fijarse a una versión específica usando la función estándar del DSL `Version()`:

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var PinnedTools = Toolset("stable-tools", FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
})
```

### PublishTo

`PublishTo(registry)` configura la publicación en el registry para un toolset exportado. Usa PublishTo dentro de un DSL Export para especificar a qué registries debe publicarse el toolset.

**Contexto**: Dentro de `Toolset` (cuando se exporta)

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

### Ejemplo completo de Registry

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

## Siguientes pasos

- **[Runtime](./runtime.md)** - Entiende cómo los diseños se traducen en comportamiento en tiempo de ejecución
- **[Toolsets](./toolsets.md)** - Análisis en profundidad de los modelos de ejecución de toolsets
- **[Integración MCP](./mcp-integration.md)** - Cableado en runtime para servidores MCP
