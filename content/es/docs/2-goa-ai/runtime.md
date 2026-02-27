---
title: "Tiempo de ejecución"
linkTitle: "Tiempo de ejecución"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## Visión general de la arquitectura

El tiempo de ejecución de Goa-AI orquesta el bucle planificar/ejecutar/reanudar, impone políticas, gestiona el estado y se coordina con motores, planificadores, herramientas, memoria, ganchos y módulos de características.

| Capa Responsabilidad
| --- | --- |
| DSL + Codegen Produce registros de agentes, especificaciones/codecs de herramientas, flujos de trabajo, adaptadores MCP
| Runtime Core: orquesta el bucle plan/start/resume, aplicación de políticas, ganchos, memoria, streaming
| Adaptador de motor de flujo de trabajo Adaptador temporal que implementa `engine.Engine`; otros motores pueden conectarse
| Módulos de funciones Integraciones opcionales (MCP, Pulse, almacenes Mongo, proveedores de modelos)

---

## Arquitectura Agentica de Alto Nivel

En tiempo de ejecución, Goa-AI organiza su sistema en torno a un pequeño conjunto de construcciones componibles:

- **Agentes**: Orquestadores de larga vida identificados por `agent.Ident` (por ejemplo, `service.chat`). Cada agente posee un planificador, una política de ejecución, flujos de trabajo generados y registros de herramientas.

- **Ejecuciones**: Una única ejecución de un agente. Las ejecuciones se identifican mediante `RunID` y se rastrean a través de `run.Context` y `run.Handle`, y se agrupan mediante `SessionID` y `TurnID` para formar conversaciones.

- **Conjuntos de herramientas y herramientas**: Colecciones nombradas de capacidades, identificadas por `tools.Ident` (`service.toolset.tool`). Los conjuntos de herramientas respaldados por servicios llaman a APIs; los conjuntos de herramientas respaldados por agentes ejecutan otros agentes como herramientas.

- **Planificadores**: Su capa de estrategia impulsada por LLM que implementa `PlanStart` / `PlanResume`. Los planificadores deciden cuándo llamar a las herramientas en lugar de responder directamente; el tiempo de ejecución impone límites y presupuestos de tiempo en torno a esas decisiones.

- **Árbol de ejecución y agente como herramienta**: Cuando un agente llama a otro agente como herramienta, el tiempo de ejecución inicia una ejecución hija real con su propio `RunID`. El `ToolResult` padre lleva un `RunLink` (`*run.Handle`) apuntando al hijo, y se emite un evento de streaming `child_run_linked` para correlacionar la llamada de herramienta padre con el `RunID` hijo.

- **Flujos y perfiles**: Goa-AI publica valores `stream.Event` tipados en un **flujo propiedad de la sesión** (`session/<session_id>`). Los eventos llevan `RunID` y `SessionID` y el runtime emite `run_stream_end` como marcador explícito para cerrar SSE/WebSocket sin temporizadores. `stream.StreamProfile` selecciona qué tipos de eventos son visibles para un público determinado (interfaz de chat, depuración, métricas).

---

## Inicio rápido

```go
package main

import (
    "context"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    rt := runtime.New()
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, "session-1", []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Summarize the latest status."}},
    }})
    if err != nil {
        panic(err)
    }
    // Use out.RunID, out.Final (the assistant message), etc.
}
```

---

## Client-Only vs Worker

Dos roles utilizan el tiempo de ejecución:

- **Sólo-Cliente** (envía ejecuciones): Construye un runtime con un motor apto para clientes y no registra agentes. Utiliza el `<agent>.NewClient(rt)` generado que lleva la ruta (workflow + cola) registrada por los trabajadores remotos.
- **Worker** (ejecutar ejecuciones): Construye un runtime con un motor con capacidad worker, registra agentes (con planificadores reales) y deja que el motor sondee y ejecute workflows/actividades.

### Ejemplo sólo cliente

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // engine client

// No agent registration needed in a caller-only process
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "s1"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "s1", msgs)
```

### Ejemplo de trabajador

```go
rt := runtime.New(runtime.WithEngine(temporalWorker)) // worker-enabled engine
err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner})
// Start engine worker loop per engine's integration (for example, Temporal worker.Run()).
```

---

## Plan → Ejecutar → Reanudar bucle

1. El tiempo de ejecución inicia un flujo de trabajo para el agente (en memoria o Temporal) y registra un nuevo `run.Context` con `RunID`, `SessionID`, `TurnID`, etiquetas y topes de política.
2. Llama al `PlanStart` de su planificador con los mensajes actuales y el contexto de ejecución.
3. Programa las llamadas a herramientas devueltas por el planificador (el planificador pasa cargas útiles JSON canónicas; el tiempo de ejecución se encarga de la codificación/decodificación mediante códecs generados).
4. Llama a `PlanResume` con los resultados de la herramienta; el bucle se repite hasta que el planificador devuelve una respuesta final o se alcanzan los límites/presupuestos de tiempo. A medida que avanza la ejecución, se pasa por los valores de `run.Phase` (`prompted`, `planning`, `executing_tools`, `synthesizing`, fases terminales).
5. Los ganchos y los suscriptores de flujo emiten eventos (pensamientos del planificador, inicio/actualización/finalización de la herramienta, esperas, uso, flujo de trabajo, enlaces agente-ejecución) y, cuando están configurados, persisten las entradas de transcripción y los metadatos de ejecución.

---

## Fases de ejecución

A medida que una ejecución avanza por el bucle plan/ejecutar/reanudar, pasa por una serie de fases del ciclo de vida. Estas fases proporcionan una visibilidad detallada de dónde se encuentra una ejecución en su ejecución, permitiendo que las interfaces de usuario muestren indicadores de progreso de alto nivel.

### Valores de fase

| Fase Descripción
| --- | --- |

| `planning` | El planificador está decidiendo si y cómo llamar a las herramientas o responder directamente |
| `executing_tools` | Las herramientas (incluidos los agentes anidados) se están ejecutando |
| `synthesizing` | El planificador está sintetizando una respuesta final sin programar herramientas adicionales |
| `completed` | La ejecución ha finalizado con éxito | `failed` | El planificador está sintetizando la respuesta final sin programar herramientas adicionales
| `failed` | La ejecución ha fallado | `canceled` | El planificador está sintetizando la respuesta final sin programar herramientas adicionales
| `canceled` | Se ha cancelado la ejecución | `canceled` | Se ha cancelado la ejecución

### Transiciones de fase

Una ejecución exitosa típica sigue esta progresión:

```
prompted → planning → executing_tools → planning → synthesizing → completed
                          ↑__________________|
                          (loop while tools needed)
```

El runtime emite eventos `RunPhaseChanged` para fases **no terminales** (por ejemplo `planning`, `executing_tools`, `synthesizing`) para que los suscriptores del stream puedan seguir el progreso en tiempo real.

### Fase vs Estado

Las fases son distintas de `run.Status`:

- **Estado** (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`) es el estado del ciclo de vida de grano grueso almacenado en metadatos de ejecución duraderos
- **Fase** proporciona una visibilidad más detallada del bucle de ejecución, pensada para superficies de streaming/UX

### Eventos de ciclo de vida: cambios de fase vs finalización

El runtime emite:

- **`RunPhaseChanged`** para transiciones de fase no terminales.
- **`RunCompleted`** una vez por run para el estado terminal (success / failed / canceled).

Los suscriptores del stream traducen ambos en eventos `workflow` (`stream.WorkflowPayload`):

- **Actualizaciones no terminales** (desde `RunPhaseChanged`): solo `phase`.
- **Actualización terminal** (desde `RunCompleted`): `status` + `phase` terminal, y campos de error estructurados en fallos.

**Mapping de status terminal**

- `status="success"` → `phase="completed"`
- `status="failed"` → `phase="failed"`
- `status="canceled"` → `phase="canceled"`

**Cancelar no es un error**

Para `status="canceled"`, el payload del stream **no debe** incluir un `error` para el usuario. Los consumidores deben tratar la cancelación como un estado terminal sin error.

**Los fallos son estructurados**

Para `status="failed"`, el payload del stream incluye:

- `error_kind`: clasificador estable para UX/decisiones (kinds provider como `rate_limited`, `unavailable`, o kinds runtime como `timeout`/`internal`)
- `retryable`: si reintentar puede funcionar sin cambiar la entrada
- `error`: mensaje **seguro para el usuario** (mostrar directamente)
- `debug_error`: error crudo para logs/diagnóstico (no para UI)

---

## Políticas, límites y etiquetas

### Design-Time RunPolicy

En tiempo de diseño, se configuran políticas por agente con `RunPolicy`:

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

Esto se convierte en un `runtime.RunPolicy` adjunto al registro del agente:

- **Caps**: `MaxToolCalls` - total de llamadas a la herramienta por ejecución. `MaxConsecutiveFailedToolCalls` - fallos consecutivos antes de abortar.
- **Presupuesto de tiempo**: `TimeBudget` - presupuesto de reloj de pared para la ejecución. `FinalizerGrace` (sólo tiempo de ejecución) - ventana reservada opcional para la finalización.
- **Interrupciones**: `InterruptsAllowed` - opción para pausar/reanudar.
- **Comportamiento de los campos perdidos**: `OnMissingFields` - rige lo que ocurre cuando la validación indica que faltan campos.

### Anulaciones de la política de tiempo de ejecución

En algunos entornos es posible que desee endurecer o relajar las políticas sin cambiar el diseño. La API `rt.OverridePolicy` permite realizar ajustes en las políticas locales del proceso:

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

**Ámbito**: Las anulaciones son locales a la instancia de tiempo de ejecución actual y afectan sólo a las ejecuciones posteriores. No persisten en los reinicios del proceso ni se propagan a otros trabajadores.

**Campos anulables**:

| Campo Descripción
| --- | --- |
| Máximo total de llamadas a la herramienta por ejecución
`MaxConsecutiveFailedToolCalls` `MaxConsecutiveFailedToolCalls` `MaxConsecutiveFailedToolCalls` `MaxConsecutiveFailedToolCalls` `MaxConsecutiveFailedToolCalls` Fallos consecutivos antes de abortar
| `TimeBudget` | Presupuesto de reloj de pared para la ejecución | | `TimeBudget` | Presupuesto de reloj de pared para la ejecución
| `FinalizerGrace` | Ventana reservada para finalización |
| `InterruptsAllowed` | Habilitar la capacidad de pausa/reanudación |

Sólo se aplican los campos distintos de cero (y `InterruptsAllowed` cuando `true`). Esto permite anulaciones selectivas sin afectar a otras configuraciones de políticas.

**Casos prácticos**:
- Retrocesos temporales durante el estrangulamiento del proveedor
- Pruebas A/B de diferentes configuraciones de políticas
- Desarrollo/depuración con restricciones relajadas
- Personalización de políticas por inquilino en tiempo de ejecución

### Etiquetas y motores de políticas

Goa-AI se integra con motores de políticas enchufables a través de `policy.Engine`. Las políticas reciben metadatos de herramientas (IDs, etiquetas), contexto de ejecución (SessionID, TurnID, etiquetas), e información `RetryHint` tras fallos de herramientas.

Las etiquetas fluyen hacia:
- `run.Context.Labels` - disponibles para los planificadores durante una ejecución
- eventos del log de ejecución (`runlog.Store`) - persistidos junto con eventos de ciclo de vida para auditoría/búsqueda/paneles (cuando se indexan)

---

## Ejecución de la herramienta

- **Conjuntos de herramientas nativas**: Tú escribes las implementaciones; el tiempo de ejecución se encarga de decodificar los args tipados usando los codecs generados
- **Agente como herramienta**: Los conjuntos de herramientas de agentes generados ejecutan agentes proveedores como ejecuciones secundarias (en línea desde la perspectiva del planificador) y adaptan su `RunOutput` a un `planner.ToolResult` con un `RunLink` de vuelta a la ejecución secundaria
- **Conjuntos de herramientas MCP**: El tiempo de ejecución reenvía el JSON canónico a las llamadas generadas; las llamadas se encargan del transporte

### Tool payload defaults

Tool payload decoding follows Goa’s **decode-body → transform** pattern and applies Goa-style defaults deterministically for tool payloads.

See **[Tool Payload Defaults](tool-payload-defaults/)** for the contract and codegen invariants.

## Contratos de runtime para prompts

La gestion de prompts es nativa del runtime y versionada:

- `runtime.PromptRegistry` almacena registros inmutables de `prompt.PromptSpec` base.
- `runtime.WithPromptStore(prompt.Store)` habilita la resolucion de overrides por scope (`session` -> `facility` -> `org` -> global).
- Los planners llaman `PlannerContext.RenderPrompt(ctx, id, data)` para resolver y renderizar contenido.
- El contenido renderizado incluye metadatos `prompt.PromptRef` para procedencia; los planners pueden adjuntarlos en `model.Request.PromptRefs`.

```go
content, err := input.Agent.RenderPrompt(ctx, "aura.chat.system", map[string]any{
    "AssistantName": "Ops Assistant",
})
if err != nil {
    return nil, err
}

resp, err := modelClient.Complete(ctx, &model.Request{
    RunID:      input.RunContext.RunID,
    Messages:   input.Messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` son metadatos de runtime para auditoria/procedencia y no forman parte del payload wire del proveedor.

---

## Memoria, Streaming, Telemetría

- **El bus hook** publica eventos hook estructurados para el ciclo de vida completo del agente: inicio/terminación de la ejecución, cambios de fase, `prompt_rendered`, programación/resultados/actualizaciones de herramientas, notas del planificador y bloques de pensamiento, esperas, pistas de reintento y enlaces agente-como-herramienta.

- **Los almacenes de memoria** (`memory.Store`) suscriben y añaden eventos de memoria duraderos (mensajes de usuario/asistente, llamadas a herramientas, resultados de herramientas, notas del planificador, pensamiento) por `(agentID, RunID)`.

- **Almacenes de eventos de ejecución** (`runlog.Store`): anexan el log canónico de eventos hook por `RunID` para UI de auditoría/debug e introspección.

- **Los sumideros de flujos** (`stream.Sink`, por ejemplo Pulse o SSE/WebSocket personalizados) reciben valores `stream.Event` producidos por el `stream.Subscriber`. Un `StreamProfile` controla qué tipos de eventos se emiten.

- **Telemetría**: El registro, las métricas y el seguimiento de los flujos de trabajo y las actividades de OTEL de principio a fin.

### Pistas de llamada de herramienta (DisplayHint)

Las llamadas a herramientas pueden llevar un `DisplayHint` orientado al usuario (por ejemplo, para UIs).

Contrato:

- Los constructores de hooks no renderizan pistas. Los eventos de planificación de herramientas tienen `DisplayHint==""` por defecto.
- El runtime puede enriquecer y persistir una pista de llamada **duradera** en el momento de publicación decodificando la carga útil tipificada y ejecutando el `CallHintTemplate` del DSL.
- Si falla la decodificación tipificada o no hay plantilla registrada, el runtime deja `DisplayHint` vacío. Las pistas nunca se renderizan contra JSON en bruto.
- Si un productor establece explícitamente `DisplayHint` (no vacío) antes de publicar el evento de hook, el runtime lo trata como autoritativo y no lo sobrescribe.
- Para cambios por consumidor (por ejemplo, texto UI), configure `runtime.WithHintOverrides` en el runtime. Los overrides tienen precedencia sobre las plantillas DSL para eventos `tool_start` streameados.

### Consumir el flujo de sesión (Pulse)

En producción, el patrón habitual es:

- consumir el flujo de sesión (`session/<session_id>`) desde un bus compartido (Pulse / Redis Streams)
- filtrar por `run_id` para construir tarjetas/líneas por ejecución
- cerrar SSE/WebSocket al observar `run_stream_end` para el `run_id` activo

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

## Abstracción del motor

- **En memoria**: Bucle de desarrollo rápido, sin desarrollo externo
- **Temporal**: Ejecución duradera, repetición, reintentos, señales, trabajadores; actividades de cableado de adaptadores y propagación de contexto

---

## Contratos de ejecución

- `SessionID` se requiere al inicio de la ejecución. `Start` falla rápido cuando `SessionID` está vacío o es un espacio en blanco
- Los agentes deben registrarse antes de la primera ejecución. El tiempo de ejecución rechaza el registro después del envío de la primera ejecución con `ErrRegistrationClosed` para mantener deterministas a los trabajadores del motor
- Los ejecutores de herramientas reciben metadatos explícitos por llamada (`ToolCallMeta`) en lugar de pescar valores de `context.Context`
- No confíe en fallbacks implícitos; todos los identificadores de dominio (ejecución, sesión, turno, correlación) deben pasarse explícitamente

---

## Pausa y Reanudación

Los flujos de trabajo humanos en bucle pueden suspender y reanudar ejecuciones utilizando los ayudantes de interrupción del tiempo de ejecución:

```go
import "goa.design/goa-ai/runtime/agent/interrupt"

// Pause
if err := rt.PauseRun(ctx, interrupt.PauseRequest{
    RunID: "session-1-run-1",
    Reason: "human_review",
}); err != nil {
    panic(err)
}

// Resume
if err := rt.ResumeRun(ctx, interrupt.ResumeRequest{
    RunID: "session-1-run-1",
}); err != nil {
    panic(err)
}
```

Entre bastidores, las señales de pausa/reanudación actualizan el almacén de ejecución y emiten eventos de enganche `run_paused`/`run_resumed` para que las capas de la interfaz de usuario permanezcan sincronizadas.

---

## Confirmación de la herramienta

Goa-AI soporta **puertas de confirmación forzadas en tiempo de ejecución** para herramientas sensibles (escrituras, borrados, comandos).

Puede activar la confirmación de dos maneras:

- **En tiempo de diseño (caso común):** declarar `Confirmation(...)` dentro de la herramienta DSL. Codegen almacena
  la política en `tools.ToolSpec.Confirmation`.
- **Tiempo de ejecución (sobreescritura/dinámica):** pasar `runtime.WithToolConfirmation(...)` al construir el tiempo de ejecución
  para requerir confirmación para herramientas adicionales o anular el comportamiento en tiempo de diseño.

En tiempo de ejecución, el flujo de trabajo emite una solicitud de confirmación fuera de banda y sólo ejecuta la herramienta
después de que se proporcione una aprobación explícita. Cuando se deniega, el tiempo de ejecución sintetiza un resultado de la herramienta conforme al esquema
para que la transcripción siga siendo válida y el planificador pueda reaccionar de forma determinista.

### Protocolo de confirmación

En tiempo de ejecución, la confirmación se implementa como un protocolo await/decisión dedicado:

- **Carga útil de espera** (transmitida como `await_confirmation`):

  ```json
  {
    "id": "...",
    "title": "...",
    "prompt": "...",
    "tool_name": "atlas.commands.change_setpoint",
    "tool_call_id": "toolcall-1",
    "payload": { "...": "canonical tool arguments (JSON)" }
  }
  ```

- **Proporcionar decisión** (a través de `ProvideConfirmation` en el tiempo de ejecución):

  ```go
  err := rt.ProvideConfirmation(ctx, interrupt.ConfirmationDecision{
      RunID:       "run-123",
      ID:         "await-1",
      Approved:    true,              // or false
      RequestedBy: "user:123",
      Labels:      map[string]string{"source": "front-ui"},
      Metadata:    map[string]any{"ticket_id": "INC-42"},
  })
  ```

### Eventos de autorización de herramientas

Cuando se proporciona una decisión, el runtime emite un evento de autorización de primer orden:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

Este evento es el registro canónico “quién/cuándo/qué” para una llamada de herramienta confirmada:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (resumen determinista renderizado por el runtime)
- `approved_by` (copiado de `interrupt.ConfirmationDecision.RequestedBy`, identificador de principal estable)

El evento se emite inmediatamente después de recibir la decisión (antes de ejecutar la herramienta si se aprueba y antes de sintetizar el resultado denegado si se rechaza).

Notas:

- Los consumidores deben tratar la confirmación como un protocolo en tiempo de ejecución:
  - Utiliza la razón `RunPaused` que la acompaña (`await_confirmation`) para decidir cuándo mostrar una IU de confirmación.
  - No acople el comportamiento de la IU a un nombre de herramienta de confirmación específico; trátelo como un detalle de transporte interno.
- Las plantillas de confirmación (`PromptTemplate` y `DeniedResultTemplate`) son cadenas Go `text/template`
  que se ejecutan con `missingkey=error`. Además de las funciones de plantilla estándar (por ejemplo, `printf`),
  Goa-AI proporciona:
  - `json v` → JSON codifica `v` (útil para campos de puntero opcionales o incrustar valores estructurados).
  - `quote s` → devuelve una cadena Go-escaped entre comillas (como `fmt.Sprintf("%q", s)`).

### Validación en tiempo de ejecución

El tiempo de ejecución valida las interacciones de confirmación en el límite:

- La confirmación `ID` coincide con el identificador de espera pendiente cuando se proporciona.
- El objeto de decisión está bien formado (valor `RunID`, booleano `Approved` no vacío).

---

## Contrato de planificación

Planificadores implementar:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contiene llamadas a herramientas, respuesta final, anotaciones y `RetryHint` opcional. El tiempo de ejecución impone límites, programa actividades de la herramienta y devuelve los resultados de la herramienta a `PlanResume` hasta que se produce una respuesta final.

Los planificadores también reciben un `PlannerContext` a través de `input.Agent` que expone los servicios del tiempo de ejecución:
- `ModelClient(id string)` - obtener un cliente de modelo agnóstico del proveedor
- `RenderPrompt(ctx, id, data)` - resolver y renderizar contenido de prompt para el scope actual de la ejecución
- `AddReminder(r reminder.Reminder)` - registrar recordatorios del sistema en tiempo de ejecución
- `RemoveReminder(id string)` - borrar recordatorios cuando las condiciones previas dejan de cumplirse
- `Memory()` - acceder al historial de conversaciones

---

## Módulos de funciones

- `features/mcp/*` - MCP suite DSL/codegen/runtime callers (HTTP/SSE/stdio)
- `features/memory/mongo` - almacén de memoria duradera
- `features/prompt/mongo` - almacén de overrides de prompts respaldado por Mongo
- `features/runlog/mongo` - almacén de eventos de ejecución (append-only, paginación por cursor)
- `features/session/mongo` - almacén de metadatos de sesión
- `features/stream/pulse` - ayudantes de receptor/suscriptor de pulsos
- `features/model/{anthropic,bedrock,openai}` - adaptadores de cliente modelo para planificadores
- `features/model/middleware` - middlewares compartidos `model.Client` (por ejemplo, limitación de velocidad adaptativa)
- `features/policy/basic` - motor de políticas simple con listas de permitidos/bloqueados y gestión de sugerencias de reintento

### Model Client Throughput & Rate Limiting

Goa-AI incluye un limitador de velocidad adaptativo independiente del proveedor en `features/model/middleware`. Envuelve cualquier `model.Client`, estima los tokens por petición, pone en cola a las personas que llaman usando un cubo de tokens, y ajusta su presupuesto efectivo de tokens por minuto usando una estrategia aditiva-incremental/multiplicativa-decremental (AIMD) cuando los proveedores informan del estrangulamiento.

```go
import (
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, _ := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
}, ledger)

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited := rl.Middleware()(bed)

rt := runtime.New(runtime.Options{
    // Register limited as the model client exposed to planners.
})
```

---

## Integración LLM

Los planificadores de Goa-AI interactúan con grandes modelos lingüísticos a través de una interfaz **agnóstica en cuanto a proveedores**. Este diseño le permite intercambiar proveedores -AWS Bedrock, OpenAI o puntos finales personalizados- sin cambiar el código de su planificador.

### La interfaz model.Client

Todas las interacciones LLM pasan por la interfaz `model.Client`:

```go
type Client interface {
    Complete(ctx context.Context, req *Request) (*Response, error)
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

### Adaptadores de proveedores

Goa-AI incluye adaptadores para los proveedores LLM más populares:

**AWS Bedrock**

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/features/model/bedrock"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
modelClient, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    HighModel:    "anthropic.claude-sonnet-4-20250514-v1:0",
    SmallModel:   "anthropic.claude-3-5-haiku-20241022-v1:0",
    MaxTokens:    4096,
    Temperature:  0.7,
}, ledger)
```

**OpenAI**

```go
import "goa.design/goa-ai/features/model/openai"

modelClient, err := openai.NewFromAPIKey(apiKey, "gpt-4o")
```

### Uso de clientes modelo en planificadores

Los planificadores obtienen clientes modelo a través del `PlannerContext` del tiempo de ejecución:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    req := &model.Request{
        RunID:    input.Run.RunID,
        Messages: input.Messages,
        Tools:    input.Tools,
        Stream:   true,
    }
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Drain stream and build response...
}
```

El tiempo de ejecución envuelve el `model.Client` subyacente con un cliente decorado con eventos que emite eventos del planificador (bloques de pensamiento, trozos de asistente, uso) a medida que lee del flujo.

### Captura automática de eventos

El tiempo de ejecución captura automáticamente los eventos de flujo de los clientes modelo, eliminando la necesidad de que los planificadores emitan eventos manualmente. Cuando se llama a `input.Agent.ModelClient(id)`, el tiempo de ejecución devuelve un cliente decorado que:

- Emite eventos `AssistantChunk` para el contenido de texto a medida que se lee del flujo
- Emite eventos `PlannerThinkingBlock` para el contenido de razonamiento/pensamiento
- Emite eventos `UsageDelta` para métricas de uso de tokens

Esta decoración ocurre de forma transparente:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    // ModelClient returns a decorated client that auto-emits events
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Simply drain the stream - events are emitted automatically
    var text strings.Builder
    var toolCalls []model.ToolCall
    for {
        chunk, err := streamer.Recv()
        if errors.Is(err, io.EOF) {
            break
        }
        if err != nil {
            return nil, err
        }
        // Process chunk for your planner logic
        // Events are already emitted by the decorated client
    }
    // ...
}
```

**Importante**: Si necesitas usar `planner.ConsumeStream`, obtén un `model.Client` en bruto que no esté envuelto por el runtime. Mezclar el cliente decorado con `ConsumeStream` emitirá eventos dobles.

### Validación de Ordenación de Mensajes Bedrock

Cuando se utiliza AWS Bedrock con el modo de pensamiento habilitado, el tiempo de ejecución valida las restricciones de ordenación de mensajes antes de enviar solicitudes. Bedrock requiere:

1. Cualquier mensaje de asistente que contenga `tool_use` debe comenzar con un bloque de pensamiento
2. Cada mensaje de usuario que contenga `tool_result` debe seguir inmediatamente a un mensaje de asistente con bloques `tool_use` coincidentes
3. El número de bloques `tool_result` no puede superar el recuento anterior de `tool_use`

El cliente Bedrock valida estas restricciones de forma anticipada y devuelve un error descriptivo si se infringen:

```
bedrock: invalid message ordering with thinking enabled (run=xxx, model=yyy): 
bedrock: assistant message with tool_use must start with thinking
```

Esta validación garantiza que la reconstrucción del libro de transcripciones produzca secuencias de mensajes conformes con el proveedor.

---

## Próximos pasos

- Aprende sobre [Toolsets](./toolsets/) para entender los modelos de ejecución de herramientas
- Explore [Agent Composition](./agent-composition/) para patrones de agentes como herramientas
- Lee sobre [Memory & Sessions](./memory-sessions/) para la persistencia de transcripciones
