---
title: Composición de los agentes
weight: 5
description: "Learn how to compose agents using agent-as-tool patterns, run trees, and streaming topology."
llm_optimized: true
aliases:
---

Esta guía demuestra cómo componer agentes tratando un agente como una herramienta de otro, y explica cómo Goa-AI modela las ejecuciones de los agentes como un árbol con proyecciones en streaming para diferentes audiencias.

## Qué construirás

- Un agente planificador que exporta herramientas de planificación
- Un agente orquestador que utiliza las herramientas del agente planificador
- Composición entre procesos con ejecución en línea

---

## Diseño de Agentes Compuestos

Crear `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var PlanRequest = Type("PlanRequest", func() {
    Attribute("goal", String, "Goal to plan for")
    Required("goal")
})

var PlanResult = Type("PlanResult", func() {
    Attribute("plan", String, "Generated plan")
    Required("plan")
})

var _ = Service("orchestrator", func() {
    // Planning agent that exports tools
    Agent("planner", "Planning agent", func() {
        Export("planning.tools", func() {
            Tool("create_plan", "Create a plan", func() {
                Args(PlanRequest)
                Return(PlanResult)
            })
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(5))
            TimeBudget("1m")
        })
    })
    
    // Orchestrator agent that uses planning tools
    Agent("orchestrator", "Orchestration agent", func() {
        Use(AgentToolset("orchestrator", "planner", "planning.tools"))
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

Generar código:

```bash
goa gen example.com/tutorial/design
```

---

## Implementación de planificadores

El código generado proporciona helpers para ambos agentes. Conéctalos:

```go
package main

import (
    "context"
    
    planner "example.com/tutorial/gen/orchestrator/agents/planner"
    orchestrator "example.com/tutorial/gen/orchestrator/agents/orchestrator"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()
    
    // Register planning agent
    if err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Register orchestrator agent (automatically uses planning tools)
    if err := orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Use orchestrator agent
    client := orchestrator.NewClient(rt)
    // ... run agent ...
}
```

**Conceptos clave

- **Exportación**: Declara conjuntos de herramientas que otros agentes pueden utilizar
- **Conjunto de herramientas del agente Hace referencia a un conjunto de herramientas exportado de otro agente
- **Ejecución en línea**: Desde la perspectiva de quien llama, un agente como herramienta se comporta como una llamada a herramienta normal; el tiempo de ejecución ejecuta el agente proveedor como una ejecución hija y agrega su salida en un único `ToolResult` (con un `RunLink` de vuelta a la ejecución hija)
- **Proceso cruzado**: Los agentes pueden ejecutarse en diferentes trabajadores manteniendo un árbol de ejecución coherente; los eventos `child_run_linked` y los gestores de ejecución vinculan las llamadas de la herramienta padre a las ejecuciones de los agentes hijo para el streaming y la observabilidad

---

## Passthrough: Reenvío determinista de herramientas

Para las herramientas exportadas que deben pasar por alto el planificador por completo y reenviar directamente a un método de servicio, utilice `Passthrough`. Esto es útil cuando:

- Desea un comportamiento determinista y predecible (sin toma de decisiones LLM)
- La herramienta es una simple envoltura alrededor de un método de servicio existente
- Necesita una latencia garantizada sin sobrecarga del planificador

### Cuándo utilizar el Passthrough frente a la ejecución normal

| Escenario | Utilizar Passthrough | Utilizar Ejecución Normal | Escenario | Utilizar Passthrough | Utilizar Ejecución Normal
|----------|-----------------|----------------------|
| Operaciones CRUD simples
| Herramientas de registro/auditoría
| Herramientas que requieren razonamiento LLM

| Herramientas que pueden necesitar reintentos con pistas | | ✓ |

### Declaración DSL

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("level", String, "Log level", func() {
                Enum("debug", "info", "warn", "error")
            })
            Attribute("message", String, "Message to log")
            Required("level", "message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
            Required("logged")
        })
        // Bypass planner, forward directly to LoggingService.LogMessage
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

### Comportamiento en tiempo de ejecución

Cuando un agente consumidor llama a una herramienta passthrough:

1. El tiempo de ejecución recibe la llamada a la herramienta desde el planificador del consumidor
2. En lugar de invocar al planificador del agente proveedor, llama directamente al método del servicio de destino
3. El resultado se devuelve al consumidor sin ningún procesamiento LLM

Esto proporciona:
- **Latencia predecible**: Sin retardo de inferencia LLM
- **Comportamiento determinista**: La misma entrada siempre produce la misma salida
- **Eficiencia de costes**: Sin uso de tokens para operaciones sencillas

---

## Ejecutar árboles y sesiones

Goa-AI modela la ejecución como un **árbol de ejecuciones y herramientas**:

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees" >}}

- **Run** - una ejecución de un agente:
  - Identificada por un `RunID`
  - Descrito por `run.Context` (RunID, SessionID, TurnID, labels, caps)
  - Seguimiento duradero mediante `runlog.Store` (log append-only; paginación por cursor)

- **Sesión**: una conversación o flujo de trabajo que abarca una o más ejecuciones:
  - `SessionID` agrupa ejecuciones relacionadas (por ejemplo, chat multiturno)
  - Las interfaces de usuario suelen mostrar una sesión cada vez

- **Árbol de ejecuciones**: relaciones padre/hijo entre ejecuciones y herramientas:
  - Ejecución de agente de nivel superior (por ejemplo, `chat`)
  - Ejecuciones de agente secundarias (agente como herramienta, por ejemplo, `ada`, `diagnostics`)
  - Herramientas de servicio por debajo de esos agentes

El runtime mantiene este árbol usando:

- `run.Handle` - un manejador ligero con `RunID`, `AgentID`, `ParentRunID`, `ParentToolCallID`
- Ayudantes de agente como herramienta y registros de conjunto de herramientas que **siempre crean ejecuciones hijo reales** para agentes anidados (sin hacks ocultos en línea)

---

## Agente-como-Herramienta y RunLink

Cuando un agente utiliza otro agente como herramienta:

1. El runtime inicia un **child run** para el agente proveedor con su propio `RunID`
2. Realiza un seguimiento de la vinculación padre/hijo en `run.Context`
3. Ejecuta un bucle completo de planificación/ejecución/reanudación en el agente hijo

El resultado de la herramienta padre (`planner.ToolResult`) lleva:

```go
RunLink *run.Handle
```

Este `RunLink` permite:
- Los planificadores razonar sobre la ejecución hija (por ejemplo, para auditoría/registro)
- Interfaces de usuario para crear "tarjetas de agente" anidadas y renderizar eventos de la ejecución hija filtrando el flujo de sesión por `run_id`
- Herramientas externas para navegar desde una ejecución padre a sus hijas sin adivinar

---

## Flujos propiedad de la sesión

Goa-AI publica eventos `stream.Event` en un único **flujo propiedad de la sesión**:

- `session/<session_id>`

Ese flujo contiene eventos para todas las ejecuciones de la sesión, incluidas ejecuciones anidadas de agentes (agent-as-tool). Cada evento lleva `run_id` y `session_id`, y el runtime emite:

- `child_run_linked`: vincula una llamada de herramienta padre (`tool_call_id`) con la ejecución hija (`child_run_id`)
- `run_stream_end`: marcador explícito que significa “no habrá más eventos visibles para esta ejecución”

Los consumidores se suscriben **una vez por sesión** y cierran SSE/WebSocket al observar `run_stream_end` para el `run_id` activo.

```go
import "goa.design/goa-ai/runtime/agent/stream"

events, errs, cancel, err := sub.Subscribe(ctx, "session/session-123")
if err != nil {
    panic(err)
}
defer cancel()

activeRunID := "run-123"
for {
    select {
    case evt, ok := <-events:
        if !ok {
            return
        }
        if evt.Type() == stream.EventRunStreamEnd && evt.RunID() == activeRunID {
            return
        }
    case err := <-errs:
        panic(err)
    }
}
```

---

## Perfiles de flujo

`stream.StreamProfile` describe qué tipos de eventos se emiten para una audiencia.

### Estructura de StreamProfile

```go
type StreamProfile struct {
    Assistant          bool // assistant_reply
    Thoughts           bool // planner_thought
    ToolStart          bool // tool_start
    ToolUpdate         bool // tool_update
    ToolEnd            bool // tool_end
    AwaitClarification bool // await_clarification
    AwaitConfirmation  bool // await_confirmation
    AwaitQuestions     bool // await_questions
    AwaitExternalTools bool // await_external_tools
    ToolAuthorization  bool // tool_authorization
    Usage              bool // usage
    Workflow           bool // workflow
    ChildRuns          bool // child_run_linked (herramienta padre → ejecución hija)
}
```

### Perfiles incorporados

Goa-AI proporciona perfiles incorporados para casos de uso comunes:

- `stream.DefaultProfile()` emite todos los tipos de eventos.
- `stream.UserChatProfile()` es adecuado para UIs de usuario final.
- `stream.AgentDebugProfile()` es adecuado para vistas de depuración/desarrollador.
- `stream.MetricsProfile()` emite sólo `Usage` y `Workflow`.

En el modelo de streaming propiedad de la sesión, no se requieren suscripciones separadas para ejecuciones hijas. `child_run_linked` existe para construir el árbol de ejecuciones y adjuntar eventos al “agent card” correcto mientras se consume un único flujo `session/<session_id>`.

### Cableado de perfiles a suscriptores

Aplique perfiles al crear suscriptores de flujos:

```go
import "goa.design/goa-ai/runtime/agent/stream"

// Create a subscriber with the user chat profile
chatSub, err := stream.NewSubscriberWithProfile(chatSink, stream.UserChatProfile())
if err != nil {
    return err
}

// Create a subscriber with the debug profile
debugSub, err := stream.NewSubscriberWithProfile(debugSink, stream.AgentDebugProfile())
if err != nil {
    return err
}

// Create a subscriber with the metrics profile
metricsSub, err := stream.NewSubscriberWithProfile(metricsSink, stream.MetricsProfile())
if err != nil {
    return err
}
```

### Creación de perfiles personalizados

Para necesidades especializadas, cree perfiles personalizados configurando campos individuales:

```go
// Custom profile: tools and workflow only, no thoughts or assistant replies
toolsOnlyProfile := stream.StreamProfile{
    ToolStart:   true,
    ToolUpdate:  true,
    ToolEnd:     true,
    Workflow:    true,
    ChildRuns:   true,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### Pautas de selección de perfiles

| Audiencia | Perfil Recomendado | Justificación |
|----------|---------------------|---------------|
| UI de chat para el usuario final | `UserChatProfile()` | Estructura limpia con tarjetas de agente anidadas |
| Consola de administración/depuración | `AgentDebugProfile()` | Visibilidad completa de herramientas, esperas y fases |
| Métricas/facturación | `MetricsProfile()` | Eventos mínimos para agregación |
| Registro de auditorías | `DefaultProfile()` | Registro completo con campos de correlación por ejecución |
| Cuadros de mando en tiempo real | Personalizado (workflow + usage) | Sólo seguimiento de estado y costes |

Las aplicaciones eligen el perfil al cablear los sumideros y los puentes (p. ej., Pulse, SSE, WebSocket) de modo que:
- Las interfaces de usuario de chat se mantienen limpias y estructuradas (tarjetas anidadas impulsadas por `child_run_linked`)
- Las consolas de depuración pueden ver el detalle completo en el mismo flujo de sesión
- Las canalizaciones de métricas ven lo suficiente para agregar el uso y los estados

---

## Diseño de UIs con Run Trees

Dado el modelo de árbol de ejecución + streaming, una interfaz de usuario de chat típica puede:

1. Suscribirse al flujo de sesión (`session/<session_id>`) usando un perfil de chat de usuario.
2. Seguir la ejecución activa (`active_run_id`) y renderizar:
   - Respuestas del asistente (`assistant_reply`)
   - Ciclo de vida de herramientas (`tool_start`/`tool_update`/`tool_end`)
   - Enlaces a ejecuciones hijas (`child_run_linked`) como **Tarjetas de agente** anidadas por `child_run_id`
3. Para cada tarjeta, renderizar la línea de tiempo de la ejecución hija filtrando el mismo flujo de sesión por `run_id == child_run_id` (sin suscripciones adicionales).
4. Cerrar SSE/WebSocket cuando observes `run_stream_end` para `active_run_id`.

La idea clave: **la topología de ejecución (árbol de ejecución) se conserva por IDs y eventos de enlace**, y el streaming es un único log ordenado por sesión que proyectas en carriles/tarjetas filtrando por `run_id`.

---

## Próximos Pasos

- **[Integración MCP](./mcp-integration.md)** - Conectar con servidores de herramientas externos
- **[Memoria y sesiones](./memory-sessions.md)** - Gestionar el estado con transcripciones y almacenes de memoria
- **[Producción](./production.md)** - Despliegue con Temporal y streaming UI
