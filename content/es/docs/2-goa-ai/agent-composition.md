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
- **Proceso cruzado**: Los agentes pueden ejecutarse en diferentes trabajadores manteniendo un árbol de ejecución coherente; los eventos `AgentRunStarted` y los gestores de ejecución vinculan las llamadas de la herramienta padre a las ejecuciones de los agentes hijo para el streaming y la observabilidad

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
  - Seguimiento duradero mediante `run.Record` (estado, marcas de tiempo, etiquetas)

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
- Interfaces de usuario para crear "tarjetas de agente" anidadas que puedan suscribirse al flujo de la ejecución hija
- Herramientas externas para navegar desde una ejecución padre a sus hijas sin adivinar

---

## Flujos por ejecución

Cada ejecución tiene su propio flujo de valores `stream.Event`:

- `AssistantReply`, `PlannerThought`
- `ToolStart`, `ToolUpdate`, `ToolEnd`
- `AwaitClarification`, `AwaitExternalTools`
- `Usage`, `Workflow`
- `AgentRunStarted` (enlace de herramienta padre → herramienta hijo)

Los consumidores se suscriben por ejecución:

```go
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil { /* handle */ }
defer stop()
```

Esto evita firehoses globales y permite UIs:
- Adjuntar una conexión por ejecución (por ejemplo, por sesión de chat)
- Decidir cuándo "profundizar" en los agentes secundarios suscribiéndose a sus ejecuciones mediante metadatos `AgentRunStarted` (`ChildRunID`, `ChildAgentID`)

---

## Perfiles de flujo y políticas de agentes hijo

`stream.StreamProfile` describe lo que ve un público. Cada perfil controla:

- Qué tipos de eventos se incluyen (`Assistant`, `Thoughts`, `ToolStart`, `ToolUpdate`, `ToolEnd`, `AwaitClarification`, `AwaitExternalTools`, `Usage`, `Workflow`, `AgentRuns`)
- Cómo se proyectan las ejecuciones secundarias a través de `ChildStreamPolicy`

### Estructura de StreamProfile

```go
type StreamProfile struct {
    Assistant          bool              // Assistant reply events
    Thoughts           bool              // Planner thinking/reasoning events
    ToolStart          bool              // Tool invocation start events
    ToolUpdate         bool              // Tool progress update events
    ToolEnd            bool              // Tool completion events
    AwaitClarification bool              // Human clarification requests
    AwaitExternalTools bool              // External tool execution requests
    Usage              bool              // Token usage events
    Workflow           bool              // Run lifecycle events
    AgentRuns          bool              // Agent-as-tool link events
    ChildPolicy        ChildStreamPolicy // How child runs are projected
}
```

### Opciones de ChildStreamPolicy

`ChildStreamPolicy` controla cómo aparecen las ejecuciones anidadas del agente en el flujo:

| Política | Constante | Comportamiento |
|--------|----------|----------|
| **Off** | `ChildStreamPolicyOff` | Las ejecuciones hijas se ocultan de esta audiencia; sólo las llamadas a la herramienta padre y los resultados son visibles. Mejor para pipelines de métricas que no necesitan detalles anidados. |
| **Flatten** | `ChildStreamPolicyFlatten` | Los eventos hijos se proyectan en el flujo de ejecución padre, creando una vista "firehose" estilo depuración. Útil para la depuración operativa donde desea todos los eventos en un flujo. |
| **Linked** | `ChildStreamPolicyLinked` | El padre emite eventos de enlace `AgentRunStarted`; los eventos hijos permanecen en sus propios flujos. Las interfaces de usuario pueden suscribirse a los flujos hijos bajo demanda. Ideal para interfaces de chat estructuradas. |

### Perfiles incorporados

Goa-AI proporciona tres perfiles incorporados para casos de uso comunes:

**`stream.UserChatProfile()`** - Interfaces de chat de usuario final

```go
// Returns a profile suitable for end-user chat views
func UserChatProfile() StreamProfile {
    return StreamProfile{
        Assistant:          true,
        Thoughts:           true,
        ToolStart:          true,
        ToolUpdate:         true,
        ToolEnd:            true,
        AwaitClarification: true,
        AwaitExternalTools: true,
        Usage:              true,
        Workflow:           true,
        AgentRuns:          true,
        ChildPolicy:        ChildStreamPolicyLinked,
    }
}
```

- Emite todos los tipos de eventos para una renderización enriquecida de la UI
- Utiliza la política **Linked** child para que las UI puedan renderizar "tarjetas de agente" anidadas y suscribirse a flujos child bajo demanda
- Mantiene el carril de chat principal limpio al tiempo que permite el desglose en agentes anidados

**`stream.AgentDebugProfile()`** - Depuración operativa

```go
// Returns a verbose profile for debugging views
func AgentDebugProfile() StreamProfile {
    p := DefaultProfile()
    p.ChildPolicy = ChildStreamPolicyFlatten
    return p
}
```

- Emite todos los tipos de eventos como `UserChatProfile`
- Utiliza la política **Flatten** child para proyectar todos los eventos child en el stream padre
- Sigue emitiendo enlaces `AgentRunStarted` para la correlación
- Ideal para consolas de depuración y herramientas de solución de problemas

**`stream.MetricsProfile()`** - Canalizaciones de telemetría

```go
// Returns a profile for metrics/telemetry pipelines
func MetricsProfile() StreamProfile {
    return StreamProfile{
        Usage:       true,
        Workflow:    true,
        ChildPolicy: ChildStreamPolicyOff,
    }
}
```

- Sólo emite eventos `Usage` y `Workflow`
- Utiliza la política hija **Off** para ocultar por completo las ejecuciones anidadas
- Gastos generales mínimos para el seguimiento de costes y la supervisión del rendimiento

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
    ChildPolicy: stream.ChildStreamPolicyLinked,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

// Custom profile: flatten child runs but skip thoughts
flatNoThoughts := stream.StreamProfile{
    Assistant:          true,
    ToolStart:          true,
    ToolUpdate:         true,
    ToolEnd:            true,
    AwaitClarification: true,
    AwaitExternalTools: true,
    Usage:              true,
    Workflow:           true,
    AgentRuns:          true,
    ChildPolicy:        stream.ChildStreamPolicyFlatten,
}

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### Pautas de selección de perfiles

| Audiencia | Perfil Recomendado | Justificación |
|----------|---------------------|-----------|
| UI de chat para el usuario final | `UserChatProfile()` | Estructura limpia con tarjetas de agente ampliables | | Consola de administración/depuración | <x id="148"/
| Consola de administración/depuración | `AgentDebugProfile()` | Visibilidad completa con eventos hijo aplanados |
| Métricas/facturación | `MetricsProfile()` | Eventos mínimos para agregación |
| Registro de auditorías | Personalizado (todos los eventos, enlazados) | Registro completo con jerarquía estructurada |
| Cuadros de mando en tiempo real | Personalizados (flujo de trabajo + uso) | Sólo seguimiento de estado y costes |

Las aplicaciones eligen el perfil al cablear los sumideros y los puentes (p. ej., Pulse, SSE, WebSocket) de modo que:
- Las interfaces de usuario de chat se mantienen limpias y estructuradas (ejecuciones secundarias vinculadas, tarjetas de agente)
- Las consolas de depuración pueden ver flujos de eventos anidados completos
- Las canalizaciones de métricas ven lo suficiente para agregar el uso y los estados

---

## Diseño de UIs con Run Trees

Dado el modelo de árbol de ejecución + streaming, una interfaz de usuario de chat típica puede:

1. Suscribirse a la **ejecución de chat raíz** con un perfil de chat de usuario
2. Renderizar:
   - Respuestas del asistente
   - Filas de herramientas de nivel superior
   - eventos "Ejecución de agente iniciada" como **Tarjetas de agente** anidadas
3. Cuando el usuario expande una tarjeta:
   - Suscribirse a la ejecución del agente hijo usando `ChildRunID`
   - Renderiza la propia línea de tiempo de ese agente (pensamientos, herramientas, esperas) dentro de la tarjeta
   - Mantener limpio el carril principal del chat

Las herramientas de depuración pueden suscribirse con un perfil de depuración para ver:
- Eventos hijo aplanados
- Metadatos explícitos padre/hijo
- Árboles de ejecución completos para la resolución de problemas

La idea clave: **la topología de ejecución (árbol de ejecución) siempre se conserva**, y el streaming es sólo un conjunto de proyecciones sobre ese árbol para diferentes públicos.

---

## Próximos Pasos

- **[Integración MCP](./mcp-integration.md)** - Conectar con servidores de herramientas externos
- **[Memoria y sesiones](./memory-sessions.md)** - Gestionar el estado con transcripciones y almacenes de memoria
- **[Producción](./production.md)** - Despliegue con Temporal y streaming UI
