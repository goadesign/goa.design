---
title: Referencia DSL
weight: 2
description: "Complete reference for Goa-AI's DSL functions - agents, toolsets, policies, and MCP integration."
llm_optimized: true
aliases:
---

Este documento proporciona una referencia completa de las funciones DSL de Goa-AI. Utilízalo junto con la guía [Runtime](./runtime.md) para entender cómo los diseños se traducen en comportamiento en tiempo de ejecución.

## Referencia Rápida DSL

| Función Contexto Descripción
|----------|---------|-------------|
| **Funciones de Agente** | | | |
| Servicio: Define un agente basado en LLM
| `Use` | Agente | Declara el consumo del conjunto de herramientas |
| `Export` | Agente, Servicio | Expone toolsets a otros agentes |
| `AgentToolset` | Argumento de uso | Hace referencia al conjunto de herramientas de otro agente | `Export` | Agente, servicio | Declara el consumo del conjunto de herramientas a otros agentes
| Agente: Alias para AgentToolset + Use
| `Passthrough` | Herramienta (en Exportación) | Reenvío determinista a método de servicio |
`DisableAgentDocs` API: Desactiva la generación de AGENTS_QUICKSTART.md
| Funciones del conjunto de herramientas
| `Toolset` | De nivel superior | Declara un conjunto de herramientas propiedad del proveedor |
| `FromMCP` | Argumento del conjunto de herramientas | Configura el conjunto de herramientas respaldado por MCP |
| `FromRegistry` | Argumento Toolset | Configura el conjunto de herramientas respaldado por el registro |
| `Description` | Configura la descripción de las herramientas | | **Funciones de las herramientas** | `FromRegistry` | Configura la descripción de las herramientas
| **Funciones de la herramienta** | | | |
| `Tool` | Conjunto de herramientas, método | Define una herramienta invocable |
| `Args` | Herramienta | Define un esquema de parámetros de entrada |
| `Return` | Herramienta | Define el esquema de resultados de salida | `Return` | Herramienta | Define el esquema de resultados de salida
| `Artifact` | Herramienta | Define esquema de datos sidecar (no enviados al modelo) |
| `BoundedResult` | Herramienta | Marca resultado como vista acotada |
| `Tags` | Herramienta, conjunto de herramientas | Adjunta etiquetas de metadatos |
| `BindTo` | Herramienta | Une herramienta a método de servicio |
| Herramienta: marca los campos como inyectados en tiempo de ejecución
| `CallHintTemplate` | Herramienta | Muestra plantilla para invocaciones |
| Herramienta Mostrar plantilla de resultados
| Herramienta: Recordatorio estático del sistema tras el resultado de la herramienta
| Herramienta: requiere confirmación explícita fuera de banda antes de la ejecución
| Funciones de política
| Agente: configura las restricciones de ejecución
| `DefaultCaps` | RunPolicy | Establece límites de recursos |
| `MaxToolCalls` | DefaultCaps | Máximo de invocaciones a herramientas |
| Máximo de fallos consecutivos
`TimeBudget` | RunPolicy | Límite de reloj de pared simple
| `Timing` | RunPolicy | Configuración detallada del tiempo de espera | `Timing` | RunPolicy | Configuración detallada del tiempo de espera

| Tiempo de espera de la actividad del planificador
| Tiempo de espera de la actividad de la herramienta
| Política de ejecución Gestión del historial de conversaciones
| `KeepRecentTurns` | Historial | Política de ventana deslizante | `History` | Gestión del historial de conversación
| `Compress` | Historial | Resumen asistido por modelos |
| `Cache` | Política de ejecución | Configuración de caché de avisos | `Cache` | Política de ejecución | Configuración de caché de avisos
| `AfterSystem` | Caché | Punto de comprobación después de mensajes del sistema | `AfterTools` | Caché de mensajes del sistema
| `AfterTools` | Caché | Punto de control después de definiciones de herramientas | `InterruptsAllowed` | Caché | Punto de control después de definiciones de herramientas | `InterruptsAllowed` | Caché | Punto de control después de definiciones de herramientas
| `InterruptsAllowed` | RunPolicy | Habilitar pausar/reanudar | `OnMissingFields` | Activar pausa/reanudar
| Política de ejecución: Comportamiento de validación
| **Funciones MCP** | | | |
| `MCPServer` | Servicio | Habilita soporte MCP | | `MCPServer` | Servicio | Habilita soporte MCP
| Servicio: Alias para MCPServer
| `ProtocolVersion` | Opción MCP | Establece la versión del protocolo MCP | `MCP` | Servicio | Alias para MCPServer
| `MCPTool` | Método | Marca el método como herramienta MCP | `MCPTool` | Servicio | Alias para MCPServer

| `Resource` | Método | Marca el método como recurso MCP | `Resource` | Método | Marca el método como recurso MCP
| `WatchableResource` | Método | Marca método como recurso subscribible |

| `DynamicPrompt` | Método | Marca el método como generador de avisos | `Notification` | Método | Marca el método como generador de avisos
| `Notification` | Método | Marca el método como emisor de notificaciones | `Notification` | Servicio
| `Subscription` | Método | Marca método como gestor de suscripción |
| `SubscriptionMonitor` | Método | Monitor SSE para suscripciones | `SubscriptionMonitor` | Método | Monitor SSE para suscripciones
| **Funciones de registro** | | | | Funciones de registro
| `Registry` | Nivel superior | Declara una fuente de registro |
| `URL` | Registro | Establece un punto final de registro |
| `APIVersion` | Registro | Establece la versión de API | `APIVersion` | Registro | Establece la versión de API
| Establece el tiempo de espera HTTP
| `Retry` | Registro | Configura la política de reintentos | `SyncInterval` | Registro | Configura la política de reintentos
| `SyncInterval` | Registro | Configura el intervalo de actualización del catálogo | `Required` | Registro | Configura la política de reintentos
| `CacheTTL` | Registro | Configura la duración de la caché local | `CacheTTL` | Registro | Configura la duración de la caché local
| `Federation` | Registro | Configura las importaciones externas del registro | `Federation` | Registro | Configura la duración de la caché local
| `Include` | Federación | Patrones globales a importar | `Federation` | Federación | Patrones globales a importar
| `Exclude` | Federación | Patrones Glob para saltar | `Exclude` | Federación | Patrones Glob para saltar
| `PublishTo` | Exportar | Configura la publicación del registro |
| `Version` | Conjunto de herramientas | Configura la versión del conjunto de herramientas del registro | `Version` | Conjunto de herramientas | Configura la versión del conjunto de herramientas del registro
| **Funciones de Esquema** | | | |
| `Attribute` | Args, Return, Artifact | Define el campo de esquema (uso general) | | `Version` | Funciones de esquema
| `Field` | Args, Return, Artifact | Define campo de proto numerado (gRPC) |
| `Required` | Esquema | Marca campos como obligatorios |

### Campo vs Atributo

Tanto `Field` como `Attribute` definen campos de esquema, pero tienen propósitos diferentes:

**`Attribute(name, type, description, dsl)`** - Definición de esquema de propósito general:
- Se utiliza para esquemas sólo JSON
- No requiere numeración de campos
- Sintaxis más sencilla para la mayoría de los casos

```go
Args(func() {
    Attribute("query", String, "Search query")
    Attribute("limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**`Field(number, name, type, description, dsl)`** - Campos numerados para gRPC/protobuf:
- Obligatorio al generar servicios gRPC
- Los números de campo deben ser únicos y estables
- Utilícelo cuando su servicio exponga tanto transportes HTTP como gRPC

```go
Args(func() {
    Field(1, "query", String, "Search query")
    Field(2, "limit", Int, "Maximum results", func() {
        Default(10)
    })
    Required("query")
})
```

**Cuándo usar cuál:**
- Utilizar `Attribute` para herramientas de agente que sólo utilizan JSON (caso más común)
- Utilice `Field` cuando su servicio Goa tiene transporte gRPC y las herramientas se unen a esos métodos
- La mezcla está permitida pero no se recomienda dentro del mismo esquema

## Resumen

Goa-AI extiende el DSL de Goa con funciones para declarar agentes, conjuntos de herramientas y políticas de tiempo de ejecución. El DSL es evaluado por el motor `eval` de Goa, por lo que se aplican las mismas reglas que con el DSL estándar de servicio/transporte: las expresiones deben ser invocadas en el contexto apropiado, y las definiciones de atributos reutilizan el sistema de tipos de Goa (`Attribute`, `Field`, validaciones, ejemplos, etc.).


### Ruta de importación

Añade los agentes DSL a tus paquetes de diseño Goa:

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### Punto de entrada

Declara agentes dentro de una definición normal de Goa `Service`. El DSL aumenta el árbol de diseño de Goa y se procesa durante `goa gen`.

### Resultado

La ejecución de `goa gen` produce:

- Paquetes de agente (`gen/<service>/agents/<agent>`) con definiciones de flujo de trabajo, actividades del planificador y ayudantes de registro
- Paquetes propietarios del toolset (`gen/<service>/toolsets/<toolset>`) con structs tipados de payload/result, specs, codecs y (cuando corresponda) transforms
- Manejadores de actividad para bucles plan/ejecutar/reanudar
- Ayudantes de registro que conectan el diseño con el tiempo de ejecución

Se escribe un `AGENTS_QUICKSTART.md` contextual en la raíz del módulo a menos que se desactive mediante `DisableAgentDocs()`.

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

var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

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

- `gen/orchestrator/agents/chat`: flujo de trabajo + actividades del planificador + registro de agentes
- `gen/orchestrator/agents/chat/specs`: catálogo de herramientas del agente (agregado de `ToolSpec`s + `tool_schemas.json`)
- `gen/orchestrator/toolsets/<toolset>`: tipos/specs/codecs/transforms del toolset (propiedad del servicio)
- `gen/orchestrator/agents/chat/exports/<export>`: paquetes de toolsets exportados (agent-as-tool)
- Ayudantes de registro compatibles con MCP cuando se hace referencia a un `MCPToolset` a través de `Use`

### Identificadores de herramientas tipificados

Cada paquete de especificaciones por conjunto de herramientas define identificadores de herramientas tipadas (`tools.Ident`) para cada herramienta generada:

```go
const (
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Utilice estas constantes en cualquier lugar donde necesite hacer referencia a herramientas.

### Composición en línea entre procesos

Cuando el agente A declara que "usa" un conjunto de herramientas exportado por el agente B, Goa-AI cablea la composición automáticamente:

- El paquete exportador (agente B) incluye helpers `agenttools` generados
- El registro del agente consumidor (agente A) utiliza esos helpers cuando `Use(AgentToolset("service", "agent", "toolset"))`
- La función `Execute` generada construye mensajes de planificador anidados, ejecuta el agente proveedor como un flujo de trabajo hijo y adapta el `RunOutput` del agente anidado en un `planner.ToolResult`

Esto produce un único flujo de trabajo determinista por agente ejecutado y un árbol de ejecución vinculado para la composición.

---

## Funciones del agente

### Agente

`Agent(name, description, dsl)` declara un agente dentro de un `Service`. Registra los metadatos del agente de ámbito de servicio y adjunta conjuntos de herramientas a través de `Use` y `Export`.

**Contexto**: Dentro de `Service`

Cada agente se convierte en un registro en tiempo de ejecución con:
- Una definición de flujo de trabajo y manejadores de actividad Temporal
- Actividades PlanStart/PlanResume con opciones de reintento/tiempo de espera derivadas de DSL
- Un ayudante `Register<Agent>` que registra flujos de trabajo, actividades y conjuntos de herramientas

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

### Uso

`Use(value, dsl)` declara que un agente consume un conjunto de herramientas. El conjunto de herramientas puede ser:

- Una variable de nivel superior `Toolset`
- Una referencia `MCPToolset`
- Una definición de conjunto de herramientas en línea (nombre de cadena + DSL)
- Una referencia `AgentToolset` para la composición de agentes como herramientas

**Contexto**: Dentro de `Agent`

```go
Agent("chat", "Conversational runner", func() {
    // Reference a top-level toolset
    Use(DocsToolset)
    
    // Reference with subsetting
    Use(CommonTools, func() {
        Tool("notify") // consume only this tool from CommonTools
    })
    
    // Reference an MCP toolset
    Use(MCPToolset("assistant", "assistant-mcp"))
    
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

### Exportar

`Export(value, dsl)` declara conjuntos de herramientas expuestos a otros agentes o servicios. Los conjuntos de herramientas exportados pueden ser consumidos por otros agentes a través de `Use(AgentToolset(...))`.

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

`AgentToolset(service, agent, toolset)` hace referencia a un conjunto de herramientas exportado por otro agente. Esto permite la composición agente-como-herramienta.

**Contexto**: Argumento para `Use`

Utilice `AgentToolset` cuando:
- No tienes un manejador de expresión para el conjunto de herramientas exportado
- Varios agentes exportan conjuntos de herramientas con el mismo nombre
- Quieres ser explícito en el diseño para mayor claridad

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

**Alias**: `UseAgentToolset(service, agent, toolset)` es un alias que combina `AgentToolset` con `Use` en una sola llamada. Prefiera `AgentToolset` en nuevos diseños; el alias existe para facilitar la lectura en algunas bases de código.

```go
// Equivalent to Use(AgentToolset("service", "planner", "planning.tools"))
Agent("orchestrator", func() {
    UseAgentToolset("service", "planner", "planning.tools")
})
```

### Passthrough

`Passthrough(toolName, target, methodName)` define el reenvío determinista para una herramienta exportada a un método de servicio Goa. Esto evita por completo el planificador.

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

**Context**: Dentro de `API`

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

---

## Funciones del conjunto de herramientas

### Herramientas

`Toolset(name, dsl)` declara un conjunto de herramientas propiedad del proveedor en el nivel superior. Cuando se declara en el nivel superior, el conjunto de herramientas se vuelve globalmente reutilizable; los agentes hacen referencia a él a través de `Use`.

**Contexto**: Nivel superior

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

Los conjuntos de herramientas pueden incluir una descripción utilizando la función DSL estándar `Description()`:

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

### Herramienta

`Tool(name, description, dsl)` define una capacidad invocable dentro de un conjunto de herramientas.

**Contexto**: Dentro de `Toolset` o `Method`

Generación de código emite:
- Carga útil/resultado Go structs en `tool_specs/types.go`
- Códecs JSON (`tool_specs/codecs.go`)
- Definiciones de esquema JSON consumidas por los planificadores
- Entradas en el registro de herramientas con mensajes de ayuda y metadatos

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
    ResultHintTemplate("Found {{ len .Documents }} documents")
    Tags("docs", "search")
})
```

### Args y retorno

`Args(...)` y `Return(...)` definen los tipos de carga útil/resultado utilizando el DSL estándar de atributos de Goa.

**Contexto**: Dentro de `Tool`

Se puede utilizar:
- Una función para definir un esquema de objetos en línea con llamadas `Attribute()`
- Un tipo de usuario Goa (Type, ResultType, etc.) para reutilizar definiciones de tipos existentes
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

**Reutilización de tipos:**

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

### Artifact

`Artifact(kind, val, args...)` define un esquema de artefacto tipado para los resultados de la herramienta. Los datos de artefactos (también conocidos como datos sidecar) se adjuntan a `planner.ToolResult.Artifacts` pero nunca se envían al proveedor del modelo: son para datos de fidelidad completa que respaldan un resultado orientado al modelo delimitado.

**Contexto**: Dentro de `Tool`

**Parámetros
- `kind`: Un identificador de cadena para el tipo de artefacto (por ejemplo, `"time_series"`, `"chart_data"`, `"full_results"`). Esto permite a los consumidores identificar y manejar adecuadamente los diferentes tipos de artefactos.
- `val`: La definición del esquema, siguiendo los mismos patrones que `Args` y `Return`-ya sea una función con llamadas `Attribute()`, un tipo de usuario Goa o un tipo primitivo.

**Cuándo utilizar Artifact:**
- Cuando los resultados de la herramienta necesitan incluir datos de fidelidad completa para UIs (cuadros, gráficos, tablas) mientras se mantienen las cargas útiles del modelo acotadas
- Cuando se desea adjuntar grandes conjuntos de resultados que excederían los límites del contexto del modelo
- Cuando los consumidores posteriores necesitan datos estructurados que el modelo no necesita ver

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
    Artifact("time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    })
})
```

**Usando un tipo Goa para el esquema del artefacto:**

```go
var TimeSeriesArtifact = Type("TimeSeriesArtifact", func() {
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
    Artifact("metrics", TimeSeriesArtifact)
})
```

**Acceso en tiempo de ejecución:**

En tiempo de ejecución, los datos del artefacto están disponibles en `planner.ToolResult.Artifacts`:

```go
// In a stream subscriber or result handler
func handleToolResult(result *planner.ToolResult) {
    if result.Artifacts != nil {
        // Access the artifact by kind
        if tsData, ok := result.Artifacts["time_series"]; ok {
            // tsData contains the full time series for UI rendering
        }
    }
}
```

### BoundedResult

`BoundedResult()` marca el resultado de la herramienta actual como una vista acotada sobre un conjunto de datos potencialmente mayor. Es un contrato ligero que indica al tiempo de ejecución y a los servicios que esta herramienta:

1. Puede devolver un subconjunto de datos disponibles
2. Debe mostrar metadatos de truncamiento (`agent.Bounds`) junto con su resultado

**Contexto**: Dentro de `Tool`

`BoundedResult` no cambia el esquema de la herramienta por sí mismo; anota la herramienta para que codegen y los servicios puedan adjuntar y aplicar límites de manera uniforme.

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("filter", String, "Optional filter expression")
        Attribute("limit", Int, "Maximum devices to return", func() {
            Default(100)
            Maximum(1000)
        })
        Attribute("offset", Int, "Pagination offset", func() {
            Default(0)
        })
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "List of devices")
        Attribute("returned", Int, "Number of devices returned")
        Attribute("total", Int, "Total devices matching filter")
        Attribute("truncated", Boolean, "Whether results were truncated")
        Required("devices", "returned", "truncated")
    })
    BoundedResult()
})
```

**El contrato agent.Bounds:**

Cuando una herramienta está marcada con `BoundedResult()`, el tiempo de ejecución espera que el resultado de la herramienta implemente la interfaz `agent.BoundedResult` o incluya campos que puedan asignarse a `agent.Bounds`:

```go
// agent.Bounds describes how a tool result has been bounded
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied
    RefinementHint string // Guidance on how to narrow the query
}

// agent.BoundedResult interface for typed results
type BoundedResult interface {
    ResultBounds() *Bounds
}
```

**Responsabilidad del servicio:**

Los servicios son responsables de:
1. Aplicar su propia lógica de truncamiento (paginación, límites, topes de profundidad)
2. Rellenar los metadatos de límites en el resultado
3. Proporcionar opcionalmente un `RefinementHint` cuando se truncan los resultados

El tiempo de ejecución no calcula los subconjuntos o el truncamiento por sí mismo, sólo obliga a que las herramientas limitadas ofrezcan un contrato `Bounds` coherente en sus resultados.

**Cuándo utilizar BoundedResult:**

- Herramientas que devuelven listas paginadas (dispositivos, usuarios, registros)
- Herramientas que consultan grandes conjuntos de datos con límites de resultados
- Herramientas que aplican límites de profundidad o tamaño a estructuras anidadas
- Cualquier herramienta en la que el modelo deba entender que los resultados pueden estar incompletos

**Ejemplo completo con límites:**

```go
var DeviceToolset = Toolset("devices", func() {
    Tool("list_devices", "List IoT devices", func() {
        Args(func() {
            Attribute("site_id", String, "Site identifier")
            Attribute("status", String, "Filter by status", func() {
                Enum("online", "offline", "unknown")
            })
            Attribute("limit", Int, "Maximum results", func() {
                Default(50)
                Maximum(500)
            })
            Required("site_id")
        })
        Return(func() {
            Attribute("devices", ArrayOf(Device), "Matching devices")
            Attribute("returned", Int, "Count of returned devices")
            Attribute("total", Int, "Total matching devices")
            Attribute("truncated", Boolean, "Results were capped")
            Attribute("refinement_hint", String, "How to narrow results")
            Required("devices", "returned", "truncated")
        })
        BoundedResult()
        BindTo("DeviceService", "ListDevices")
    })
})
```

**Comportamiento en tiempo de ejecución:**

Cuando se ejecuta una herramienta acotada:
1. El tiempo de ejecución decodifica el resultado y comprueba la implementación de `agent.BoundedResult`
2. Si el resultado implementa la interfaz, se llama a `ResultBounds()` para extraer los límites
3. Los metadatos de los límites se adjuntan a `planner.ToolResult.Bounds`
4. Los suscriptores y finalizadores del flujo pueden acceder a los límites para la visualización de la interfaz de usuario o el registro

Las herramientas pueden incluir un título de visualización utilizando la función DSL estándar `Title()`:

```go
Tool("web_search", "Search the web", func() {
    Title("Web Search")
    Args(func() { /* ... */ })
})
```

### Confirmación

`Confirmation(dsl)` declara que una herramienta debe ser explícitamente aprobada fuera de banda antes de que se
ejecutarse. Esto está pensado para herramientas **sensibles al operador** (escrituras, eliminaciones, comandos).

**Contexto Dentro de `Tool`

En tiempo de generación, Goa-AI registra la política de confirmación en la especificación de la herramienta generada. En tiempo de ejecución, el
flujo de trabajo emite una solicitud de confirmación utilizando `AwaitConfirmation` y ejecuta la herramienta sólo después de que se proporcione una
aprobación explícita.

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

- El tiempo de ejecución es dueño de cómo se solicita la confirmación. El protocolo de confirmación incorporado utiliza un
  `AwaitConfirmation` await y una llamada de decisión `ProvideConfirmation`. Consulte la guía de tiempo de ejecución para conocer las
  cargas útiles esperadas y el flujo de ejecución.
- Las plantillas de confirmación (`PromptTemplate` y `DeniedResultTemplate`) son cadenas Go `text/template`
  que se ejecutan con `missingkey=error`. Además de las funciones de plantilla estándar (por ejemplo, `printf`),
  Goa-AI proporciona:
  - `json v` → JSON codifica `v` (útil para campos de puntero opcionales o incrustar valores estructurados).
  - `quote s` → devuelve una cadena entrecomillada Go-escaped (como `fmt.Sprintf("%q", s)`).
- La confirmación también se puede habilitar dinámicamente en tiempo de ejecución mediante `runtime.WithToolConfirmation(...)`
  (útil para políticas basadas en el entorno o anulaciones por despliegue).

### CallHintTemplate y ResultHintTemplate

`CallHintTemplate(template)` y `ResultHintTemplate(template)` configuran plantillas de visualización para invocaciones de herramientas y resultados. Las plantillas son cadenas de texto/plantillas Go que se renderizan con la carga útil o la estructura de resultados de la herramienta para producir sugerencias concisas que se muestran durante y después de la ejecución.

**Contexto**: Dentro de `Tool`

**Puntos clave:**

- Las plantillas reciben structs Go tipificados, no JSON en bruto-utiliza nombres de campo Go (por ejemplo, `.Query`, `.DeviceID`) no claves JSON (por ejemplo, `.query`, `.device_id`)
- Mantenga las pistas concisas: se recomiendan ≤140 caracteres para una visualización limpia de la interfaz de usuario
- Las plantillas se compilan con `missingkey=error`-todos los campos referenciados deben existir
- Utilice los bloques `{{ if .Field }}` o `{{ with .Field }}` para los campos opcionales

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
    ResultHintTemplate("Found {{ .Count }} results")
})
```

**Campos Struct Tipificados:**

Las plantillas reciben los structs de carga útil/resultado generados en Go. Los nombres de campo siguen las convenciones de nomenclatura Go (PascalCase), no las convenciones JSON (snake_case o camelCase):

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
    ResultHintTemplate("{{ .DeviceName }}: {{ if .IsOnline }}online{{ else }}offline{{ end }}")
})
```

**Manejo de campos opcionales

Utilice bloques condicionales para los campos opcionales para evitar errores de plantilla:

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
    ResultHintTemplate("{{ .Total }} items{{ if .Truncated }} (truncated){{ end }}")
})
```

**Funciones de plantilla incorporadas:**

El tiempo de ejecución proporciona estas funciones de ayuda para las plantillas de sugerencias:

| Función Descripción Ejemplo
|----------|-------------|---------|
| Unir cadena con separador
| `count` | Contar elementos en una rebanada | `{{ count .Results }} items` |
| `truncate` | Truncar cadena a N caracteres | `{{ truncate .Query 20 }}` |

**Ejemplo completo con todas las funciones:**

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
    ResultHintTemplate("{{ count .Insights }} insights in {{ .ProcessingTimeMs }}ms")
})
```

### ResultReminder

`ResultReminder(text)` configura un recordatorio estático del sistema que se inyecta en la conversación después de que se devuelva el resultado de la herramienta. Utilícelo para proporcionar orientación entre bastidores al modelo sobre cómo interpretar o presentar el resultado al usuario.

**Contexto**: Dentro de `Tool`

El tiempo de ejecución envuelve automáticamente el texto recordatorio en etiquetas `<system-reminder>`. No incluya las etiquetas en el texto.

**Recordatorios estáticos o dinámicos

`ResultReminder` es para recordatorios estáticos, en tiempo de diseño, que se aplican cada vez que se llama a la herramienta. Para los recordatorios dinámicos que dependen del estado en tiempo de ejecución o del contenido de los resultados de la herramienta, utilice `PlannerContext.AddReminder()` en la implementación del planificador. Los recordatorios dinámicos son compatibles:
- Limitación de velocidad (turnos mínimos entre emisiones)
- Límites por ejecución (emisiones máximas por ejecución)
- Adición/eliminación de tiempo de ejecución basado en condiciones
- Niveles de prioridad (seguridad vs orientación)

**Ejemplo básico

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

**Cuándo utilizar ResultReminder:**

- Cuando la interfaz de usuario muestra los resultados de la herramienta de una manera especial (tablas, gráficos, tablas) que el modelo debe conocer
- Cuando el modelo debe evitar repetir información que ya es visible para el usuario
- Cuando hay un contexto importante sobre cómo se presentan los resultados que afecta a cómo debe responder el modelo
- Cuando se desea una orientación coherente que se aplique a cada invocación de la herramienta

**Múltiples herramientas con recordatorios:**

Cuando varias herramientas de un mismo turno tienen recordatorios de resultados, se combinan en un único mensaje del sistema:

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

**Recordatorios dinámicos a través de PlannerContext:**

Para los recordatorios que dependen de las condiciones de tiempo de ejecución, utilice la API del planificador en su lugar:

```go
// In your planner implementation
func (p *MyPlanner) PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // Add a dynamic reminder based on tool results
    for _, tr := range input.ToolResults {
        if tr.Name == "get_time_series" && hasAnomalies(tr.Result) {
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

### Etiquetas

`Tags(values...)` anota herramientas o conjuntos de herramientas con etiquetas de metadatos. Las etiquetas se muestran a los motores de políticas y telemetría.

**Contexto**: Dentro de `Tool` o `Toolset`

Patrones de etiquetas comunes:
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

**Context**: Dentro de `Tool`

Cuando una herramienta está asociada a un método:
- El esquema `Args` de la herramienta puede diferir del esquema `Payload` del método
- El esquema de la herramienta `Return` puede diferir del esquema del método `Result`
- Los adaptadores generados transforman entre tipos de herramientas y métodos

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

### Inyectar

`Inject(fields...)` marca campos específicos de la carga útil como "inyectados" (infraestructura del lado del servidor). Los campos inyectados son:

1. Ocultos del LLM (excluidos del esquema JSON enviado al modelo)
2. Expuestos en la estructura generada con un método Setter
3. Destinado a ser poblado por ganchos en tiempo de ejecución (`ToolInterceptor`)

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

En tiempo de ejecución, utilice un `ToolInterceptor` para rellenar los campos inyectados:

```go
func (h *Handler) InterceptToolCall(ctx context.Context, call *planner.ToolCall) error {
    if call.Name == "data.get_data" {
        call.Payload.SetSessionID(ctx.Value(sessionKey).(string))
    }
    return nil
}
```

---

## Funciones políticas

### RunPolicy

`RunPolicy(dsl)` configura los límites de ejecución aplicados en tiempo de ejecución. Se declara dentro de `Agent` y contiene ajustes de política como límites, presupuestos de tiempo, gestión del historial y gestión de interrupciones.

**Contexto**: Dentro de `Agent`

**Funciones de política disponibles
- `DefaultCaps` - límites de recursos (llamadas a herramientas, fallos consecutivos)
- `TimeBudget` - límite de reloj de pared simple para toda la ejecución
- `Timing` - límites de tiempo detallados para actividades de presupuesto, planificación y herramientas (avanzado)
- `History` - gestión del historial de conversaciones (ventana deslizante o compresión)
- `InterruptsAllowed` - habilitar pausa/reanudar para humano-en-el-bucle
- `OnMissingFields` - comportamiento de validación para campos obligatorios que faltan

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

`DefaultCaps(opts...)` aplica topes de capacidad para evitar bucles fuera de control y hacer cumplir los límites de ejecución.

**Context**: Dentro de `RunPolicy`

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

**MaxToolCalls(n)**: Establece el número máximo de invocaciones a herramientas permitidas. Si se excede, el tiempo de ejecución aborta.

**MaxConsecutiveFailedToolCalls(n)**: Establece el máximo de llamadas a herramientas fallidas consecutivas antes de abortar. Evita bucles de reintento infinitos.

### TimeBudget

`TimeBudget(duration)` impone un límite de reloj de pared en la ejecución del agente. La duración se especifica como una cadena (por ejemplo, `"2m"`, `"30s"`).

**Contexto**: Dentro de `RunPolicy`

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minutes
})
```

Para un control preciso de los tiempos de espera de las actividades individuales, utilice `Timing` en su lugar.

### Temporización

`Timing(dsl)` proporciona una configuración detallada de los tiempos de espera como alternativa a `TimeBudget`. Mientras que `TimeBudget` establece un único límite global, `Timing` permite controlar los tiempos de espera en tres niveles: el presupuesto global de ejecución, las actividades del planificador (inferencia LLM) y las actividades de ejecución de herramientas.

**Contexto**: Dentro de `RunPolicy`

**Cuándo utilizar Timing vs TimeBudget:**
- Utilice `TimeBudget` para casos sencillos en los que un único límite de reloj de pared es suficiente
- Utilice `Timing` cuando necesite diferentes tiempos de espera para la planificación frente a la ejecución de la herramienta-por ejemplo, cuando las herramientas realizan llamadas a API externas lentas pero desea respuestas LLM rápidas

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock budget for the entire run
        Plan("45s")     // timeout for Plan/Resume activities (LLM inference)
        Tools("2m")     // default timeout for ExecuteTool activities
    })
})
```

**Funciones de temporización

| Función | Descripción | Afecta |
|----------|-------------|---------|
| `Budget(duration)` | Presupuesto total de reloj de pared para la ejecución | Todo el ciclo de vida de la ejecución |
| `Plan(duration)` | Tiempo de espera para las actividades Planificar y Reanudar | Llamadas de inferencia LLM a través del planificador |
| `Tools(duration)` | Tiempo de espera por defecto para actividades ExecuteTool | Ejecución de herramientas (llamadas de servicio, MCP, agent-as-tool) |

**Cómo afecta la temporización al comportamiento en tiempo de ejecución:**

El tiempo de ejecución traduce estos valores DSL en opciones de actividad Temporal (o tiempos de espera del motor equivalentes):
- `Budget` se convierte en el tiempo de espera de ejecución del flujo de trabajo
- `Plan` se convierte en el tiempo de espera de actividad para `PlanStart` y `PlanResume` actividades
- `Tools` se convierte en el tiempo de espera de la actividad por defecto para las actividades `ExecuteTool`

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

### Caché

`Cache(dsl)` configura el comportamiento de caché de avisos para el agente. Especifica dónde debe colocar el tiempo de ejecución los puntos de control de la caché en relación con los avisos del sistema y las definiciones de herramientas para los proveedores que admiten el almacenamiento en caché.

**Contexto**: Dentro de `RunPolicy`

El almacenamiento en caché de avisos puede reducir significativamente los costes de inferencia y la latencia al permitir a los proveedores reutilizar el contenido procesado previamente. La función Caché permite definir los límites de los puntos de comprobación que los proveedores utilizan para determinar qué contenido se puede almacenar en caché.

```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

**Funciones de punto de control de caché:**

| Función Descripción
|----------|-------------|
| `AfterSystem()` | Coloca un punto de control de caché después de todos los mensajes del sistema. Los proveedores interpretan esto como un límite de caché inmediatamente después del preámbulo del sistema. |
| `AfterTools()` | Coloca un punto de control de caché después de las definiciones de herramientas. Los proveedores interpretan esto como un límite de caché inmediatamente después de la sección de configuración de la herramienta. |

**Soporte de proveedores:**

No todos los proveedores soportan prompt caching, y el soporte varía según el tipo de checkpoint:

| Proveedor | AfterSystem | AfterTools |
|----------|-------------|------------|
| Bedrock (modelos Claude)
| Bedrock (modelos Nova)

Los proveedores que no admiten el almacenamiento en caché ignoran estas opciones. El tiempo de ejecución valida las restricciones específicas del proveedor-por ejemplo, solicitar `AfterTools` con un modelo Nova devuelve un error.

**Cuándo utilizar la caché:**

- Utilice `AfterSystem()` cuando la solicitud de su sistema sea estable a lo largo de los turnos y desee evitar volver a procesarla
- Utilice `AfterTools()` cuando sus definiciones de herramienta sean estables y desee almacenar en caché la configuración de la herramienta
- Combine ambos para obtener el máximo beneficio de la caché con los proveedores compatibles

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

### Historia

`History(dsl)` define cómo el tiempo de ejecución gestiona la historia de la conversación antes de cada invocación del planificador. Las políticas de historial transforman el historial de mensajes preservando:

- Las indicaciones del sistema al inicio de la conversación
- Límites lógicos de turno (usuario + asistente + llamadas/resultados de la herramienta como unidades atómicas)

Se puede configurar como máximo una política de historial por agente.

**Contexto**: Dentro de `RunPolicy`

Hay dos políticas estándar disponibles:

**KeepRecentTurns (Ventana deslizante):**

`KeepRecentTurns(n)` retiene sólo los N turnos usuario/asistente más recientes mientras preserva los avisos del sistema y los intercambios de herramientas. Este es el enfoque más simple para limitar el tamaño del contexto.

```go
RunPolicy(func() {
    History(func() {
        KeepRecentTurns(20) // Keep the last 20 user/assistant turns
    })
})
```

**Parámetros:**
- `n`: Número de turnos recientes a mantener (debe ser > 0)

**Comprimir (Resumen asistido por modelos):**

`Compress(triggerAt, keepRecent)` resume los turnos más antiguos usando un modelo mientras mantiene los turnos recientes con total fidelidad. Esto preserva más contexto que una simple ventana deslizante al condensar la conversación más antigua en un resumen.

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
- `triggerAt`: Recuento total mínimo de giros antes de que se ejecute la compresión (debe ser > 0)
- `keepRecent`: Número de turnos más recientes a retener con total fidelidad (debe ser >= 0 y < triggerAt)

**HistoryModel Requirement:**

When using `Compress`, debe suministrar un `model.Client` a través del campo `HistoryModel` generado en la configuración del agente. El tiempo de ejecución utiliza este cliente con `ModelClassSmall` para resumir los turnos más antiguos:

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

Si no se proporciona `HistoryModel` cuando se configura `Compress`, el registro fallará.

**Preservación de los límites de giro:**

Ambas políticas preservan los límites lógicos de giro como unidades atómicas. Un "giro" consiste en:
1. Un mensaje de usuario
2. La respuesta del asistente (texto y/o llamadas a la herramienta)
3. Cualquier resultado de esa respuesta

Esto garantiza que el modelo siempre vea secuencias de interacción completas, nunca giros parciales que podrían confundir el contexto.

### InterruptsAllowed
 
`InterruptsAllowed(bool)` señala que las interrupciones humanas en el bucle deben ser honradas. Cuando está habilitado, el tiempo de ejecución admite operaciones de pausa/reanudación, que son esenciales para los bucles de aclaración y los estados de espera duraderos.
 
**Contexto**: Dentro de `RunPolicy`
 
**Principales ventajas
- Permite al agente **pausar** la ejecución cuando falta información requerida (ver `OnMissingFields`).
- Permite al planificador **esperar** la entrada del usuario a través de herramientas de clarificación.
- Garantiza que el estado del agente se preserve exclusivamente durante la pausa, sin consumir recursos de computación hasta que se reanude.
 
```go
RunPolicy(func() {
    // Enable pause/resume capability
    InterruptsAllowed(true)
    
    // Automatically pause when required tool arguments are missing
    OnMissingFields("await_clarification")
})
```

### OnMissingFields

`OnMissingFields(action)` configura cómo responde el agente cuando la validación de la invocación de la herramienta detecta que faltan campos obligatorios.

**Context**: Dentro de `RunPolicy`

Valores válidos:
- `"finalize"`: Detener la ejecución cuando falten campos obligatorios
- `"await_clarification"`: Hacer una pausa y esperar a que el usuario proporcione la información que falta
- `"resume"`: Continuar la ejecución a pesar de que falten campos
- `""` (vacío): Dejar que el planificador decida en función del contexto

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

### Ejemplo de política completa

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

Goa-AI proporciona funciones DSL para declarar servidores de Protocolo de Contexto de Modelo (MCP) dentro de los servicios Goa.

### Servidor MCPS

`MCPServer(name, version, opts...)` habilita el soporte MCP para el servicio actual. Configura el servicio para exponer herramientas, recursos y avisos a través del protocolo MCP.

**Alias**: `MCP(name, version, opts...)` es un alias de `MCPServer`. Ambas funciones tienen un comportamiento idéntico.

**Contexto**: Dentro de `Service`

```go
Service("calculator", func() {
    Description("Calculator MCP server")
    
    // Using MCPServer
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
    // Or equivalently using the MCP alias
    // MCP("calc", "1.0.0", ProtocolVersion("2025-06-18"))
    
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
        MCPTool("add", "Add two numbers")
    })
})
```

### ProtocolVersion

`ProtocolVersion(version)` configura la versión del protocolo MCP soportada por el servidor. Devuelve una función de configuración para su uso con `MCPServer` o `MCP`.

**Context**: Argumento opcional de `MCPServer` o `MCP`

```go
Service("calculator", func() {
    // Specify protocol version as an option
    MCPServer("calc", "1.0.0", ProtocolVersion("2025-06-18"))
})
```

### MCPTool

`MCPTool(name, description)` marca el método actual como una herramienta MCP. La carga útil del método se convierte en el esquema de entrada de la herramienta y el resultado se convierte en el esquema de salida.

**Contexto**: Dentro de `Method` (el servicio debe tener MCP activado)

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
    MCPTool("search", "Search documents by query")
})
```

### MCPToolset

`MCPToolset(service, toolset)` declara un conjunto de herramientas definido por MCP derivado de un servidor Goa MCP.

**Context**: Nivel superior

Existen dos patrones de uso:

**Servidor MCP respaldado por Goa:**

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
    Agent("chat", func() {
        Use(AssistantSuite)
    })
})
```

**Servidor MCP externo con esquemas en línea:**

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

### Resource y WatchableResource

`Resource(name, uri, mimeType)` marca un método como proveedor de recursos MCP.

`WatchableResource(name, uri, mimeType)` marca un método como recurso suscribible.

**Contexto**: Dentro de `Method` (el servicio debe tener habilitado MCP)

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

`StaticPrompt(name, description, messages...)` añade una plantilla de aviso estática.

`DynamicPrompt(name, description)` marca un método como generador de avisos dinámico.

**Contexto**: Dentro de `Service` (estático) o `Method` (dinámico)

```go
Service("assistant", func() {
    MCPServer("assistant", "1.0")
    
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

### Notificación y suscripción

`Notification(name, description)` marca un método como emisor de notificaciones MCP.

`Subscription(resourceName)` marca un método como gestor de suscripciones para un recurso vigilable.

**Contexto**: Dentro de `Method` (el servicio debe tener habilitado MCP)

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

`SubscriptionMonitor(name)` marca el método actual como un monitor de eventos enviados por servidor (SSE) para actualizaciones de suscripción. El método transmite eventos de cambio de suscripción a los clientes conectados.

**Contexto**: Dentro de `Method` (el servicio debe tener habilitado MCP)

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

**Cuándo utilizar SubscriptionMonitor:**
- Cuando los clientes necesitan actualizaciones en tiempo real sobre los cambios de suscripción
- Para implementar endpoints SSE que empujan eventos de suscripción
- Cuando se construyen UIs reactivas que responden a cambios en los recursos

### Ejemplo completo de servidor MCP

```go
var _ = Service("assistant", func() {
    Description("Full-featured MCP server example")
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
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
        MCPTool("search", "Search documents by query")
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

## Funciones de registro

Goa-AI proporciona funciones DSL para declarar y consumir registros de herramientas - catálogos centralizados de servidores MCP, conjuntos de herramientas y agentes que pueden ser descubiertos y consumidos por los agentes.

### Registro

`Registry(name, dsl)` declara una fuente de registro para el descubrimiento de herramientas. Los registros son catálogos centralizados que pueden ser descubiertos y consumidos por agentes goa-ai.

**Contexto**: Nivel superior

Dentro de la función DSL, utiliza:
- `URL`: establece la URL del punto final del registro (obligatorio)
- `Description`: establece una descripción legible por humanos
- `APIVersion`: establece la versión de la API del registro (por defecto es "v1")
- `Security`: hace referencia a los esquemas de seguridad Goa para la autenticación
- `Timeout`: establece el tiempo de espera de las peticiones HTTP
- `Retry`: configura la política de reintentos para peticiones fallidas
- `SyncInterval`: establece la frecuencia de actualización del catálogo
- `CacheTTL`: establece la duración de la caché local
- `Federation`: configura los ajustes de importación del registro externo

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

| Función | Descripción | Ejemplo |
|----------|-------------|---------|
| `URL(endpoint)` | URL del punto final del registro (obligatorio) | `URL("https://registry.corp.internal")` | | `APIVersion(version)` | Segmento de ruta de la versión de la API
| `APIVersion(version)` | Segmento de ruta de la versión de la API | `APIVersion("v1")` |
| `Timeout(duration)` | Tiempo de espera de solicitud HTTP | `Timeout("30s")` |
| `Retry(maxRetries, backoff)` | Política de reintentos para peticiones fallidas | `Retry(3, "1s")` |
| `SyncInterval(duration)` | Intervalo de actualización del catálogo | `SyncInterval("5m")` |
| `CacheTTL(duration)` | Duración de caché local | `CacheTTL("1h")` |

### Federación

`Federation(dsl)` configura las opciones de importación del registro externo. Utilice Federation dentro de una declaración de Registro para especificar qué espacios de nombres importar desde una fuente federada.

**Contexto**: Dentro de `Registry`

Dentro de la función DSL de Federación, utilice:
- `Include`: especifica patrones glob para espacios de nombres a importar
- `Exclude`: especifica patrones glob para los espacios de nombres a omitir

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

**Incluir y excluir:**

- `Include(patterns...)`: Especifica patrones glob para los espacios de nombres a importar. Si no se especifican patrones Include, todos los espacios de nombres se incluyen por defecto.
- `Exclude(patterns...)`: Especifica patrones glob para espacios de nombres a omitir. Los patrones de exclusión se aplican después de los patrones de inclusión.

### FromRegistry

`FromRegistry(registry, toolset)`: configura un conjunto de herramientas para que se obtenga de un registro. Utilice FromRegistry como opción de proveedor al declarar un conjunto de herramientas.

**Context**: Argumento para `Toolset`

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

Los conjuntos de herramientas respaldados por el registro pueden fijarse a una versión específica utilizando la función DSL estándar `Version()`:

```go
var CorpRegistry = Registry("corp", func() {
    URL("https://registry.corp.internal")
})

var PinnedTools = Toolset("stable-tools", FromRegistry(CorpRegistry, "data-tools"), func() {
    Version("1.2.3")
})
```

### PublishTo

`PublishTo(registry)` configura la publicación en registros para un conjunto de herramientas exportado. Utilice PublishTo dentro de un DSL de exportación para especificar en qué registros debe publicarse el conjunto de herramientas.

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

### Ejemplo de registro completo

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

## Próximos Pasos

- **[Tiempo de ejecución](./runtime.md)** - Entender cómo los diseños se traducen en comportamiento en tiempo de ejecución
- **[Conjuntos de herramientas](./toolsets.md)** - Profundizar en los modelos de ejecución de conjuntos de herramientas
- **[Integración MCP](./mcp-integration.md)** - Cableado en tiempo de ejecución para servidores MCP
