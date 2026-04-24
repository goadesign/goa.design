---
title: "Tiempo de ejecución"
linkTitle: "Tiempo de ejecución"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## Visión general de la arquitectura

El runtime de Goa-AI orquesta el bucle planificar/ejecutar/reanudar, aplica políticas, gestiona el estado y se coordina con motores, planificadores, herramientas, memoria, hooks y módulos de características.

| Capa | Responsabilidad |
| --- | --- |
| DSL + Codegen | Produce registros de agentes, especificaciones/codecs de herramientas, especificaciones/codecs de completions, flujos de trabajo y adaptadores MCP |
| Núcleo del runtime | Orquesta el bucle plan/start/resume, la aplicación de políticas, los hooks, la memoria y el streaming |
| Adaptador de motor de workflow | El adaptador de Temporal implementa `engine.Engine`; otros motores pueden conectarse |
| Módulos de características | Integraciones opcionales (MCP, Pulse, almacenes Mongo, proveedores de modelos) |

---

## Arquitectura agéntica de alto nivel

En tiempo de ejecución, Goa-AI organiza tu sistema en torno a un pequeño conjunto de construcciones componibles:

- **Agentes**: Orquestadores de larga vida identificados por `agent.Ident` (por ejemplo, `service.chat`). Cada agente posee un planificador, una política de ejecución, workflows generados y registros de herramientas.

- **Ejecuciones (runs)**: Una única ejecución de un agente. Las ejecuciones se identifican mediante un `RunID` y se rastrean a través de `run.Context` y `run.Handle`. Las ejecuciones con sesión se agrupan por `SessionID` y `TurnID` para formar conversaciones; las ejecuciones one-shot son explícitamente sin sesión.

- **Toolsets y herramientas**: Colecciones nombradas de capacidades, identificadas por `tools.Ident` (`service.toolset.tool`). Los toolsets respaldados por servicios llaman a APIs; los toolsets respaldados por agentes ejecutan otros agentes como herramientas.

- **Completions**: Contratos tipados de salida directa del asistente que pertenecen al servicio y se generan bajo `gen/<service>/completions`. Los helpers de completion adjuntan una salida estructurada impuesta por el proveedor a las peticiones de modelo unarias y de streaming directo, y luego decodifican el payload canónico tipado mediante los codecs generados.

- **Planificadores**: Tu capa de estrategia impulsada por LLM que implementa `PlanStart` / `PlanResume`. Los planificadores deciden cuándo llamar a herramientas frente a responder directamente; el runtime aplica los límites y presupuestos de tiempo alrededor de esas decisiones.

- **Árbol de ejecuciones y agente-como-herramienta**: Cuando un agente llama a otro agente como herramienta, el runtime inicia una ejecución hija real con su propio `RunID`. El `ToolResult` padre lleva un `RunLink` (`*run.Handle`) que apunta al hijo, y se emite el evento de stream correspondiente `child_run_linked` para que las UI puedan correlacionar las llamadas de herramienta del padre con los `RunID` hijos sin tener que adivinar.

- **Flujos y perfiles propiedad de la sesión**: Goa-AI publica valores `stream.Event` tipados en un **flujo propiedad de la sesión** (`session/<session_id>`). Los eventos llevan tanto `RunID` como `SessionID` e incluyen un marcador explícito de frontera (`run_stream_end`) para que los consumidores puedan cerrar SSE/WebSocket de forma determinista sin temporizadores. `stream.StreamProfile` selecciona qué tipos de eventos son visibles para una audiencia determinada (UI de chat, depuración, métricas).

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

## Completions directas tipadas

No toda interacción estructurada debería modelarse como una llamada a herramienta. Cuando tu servicio necesita una respuesta final tipada del asistente, declara `Completion(...)` en el DSL y regenera.

`goa gen` emite `gen/<service>/completions` con:

- esquemas de resultado y tipos de resultado/union tipados
- codecs JSON generados y helpers de validación
- valores `completion.Spec` tipados
- helpers generados `Complete<Name>(ctx, client, req)`
- helpers generados `StreamComplete<Name>(ctx, client, req)` y `Decode<Name>Chunk(chunk)`

Los servicios pueden declarar completions sin declarar ningún `Agent(...)`. El andamiaje de quickstart/ejemplo de agente solo se emite para servicios que realmente poseen agentes.

Esos helpers clonan la petición, adjuntan metadatos de salida estructurada neutrales frente al proveedor, llaman al `model.Client` subyacente y decodifican el payload canónico tipado mediante el codec generado:

```go
resp, err := taskcompletion.CompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}

fmt.Println(resp.Value.Name)
```

Las completions en streaming permanecen sobre la superficie cruda `model.Streamer` y decodifican únicamente el chunk canónico final `completion`:

```go
stream, err := taskcompletion.StreamCompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if errors.Is(err, io.EOF) {
        break
    }
    if err != nil {
        panic(err)
    }
    value, ok, err := taskcompletion.DecodeDraftFromTranscriptChunk(chunk)
    if err != nil {
        panic(err)
    }
    if ok {
        fmt.Println(value.Name)
    }
}
```

Los helpers de completion tipados son intencionadamente estrictos:

- Los helpers unarios aceptan únicamente peticiones unarias.
- Los nombres de completion se validan en la frontera del DSL: 1-64 caracteres ASCII, solo letras/dígitos/`_`/`-`, y deben empezar por una letra o un dígito.
- Los helpers unarios y de streaming rechazan las peticiones con herramientas habilitadas y cualquier `StructuredOutput` proporcionado por el llamador.
- Los proveedores de streaming emiten fragmentos de previsualización `completion_delta*` más exactamente un único chunk canónico `completion`, o rechazan la petición explícitamente.
- `Decode<Name>Chunk` ignora los chunks de previsualización y decodifica únicamente el `completion` final.
- Los flujos de completion permanecen en la ruta directa `model.Streamer`; no los encamines a través de los helpers de streaming del planificador, que son para el texto de la transcripción del asistente y los eventos de ejecución de herramientas.
- Los proveedores que no implementan salida estructurada exponen `model.ErrStructuredOutputUnsupported`.
- Los esquemas generados son canónicos y neutrales frente al proveedor; los adaptadores de proveedor pueden normalizarlos a un subconjunto soportado, pero deben fallar explícitamente cuando no puedan preservar el contrato declarado.

---

## Client-Only vs Worker

Dos roles utilizan el runtime:

- **Sólo-Cliente** (envía ejecuciones): Construye un runtime con un motor apto para clientes y no registra agentes. Usa el `<agent>.NewClient(rt)` generado que lleva la ruta (workflow + cola) registrada por los trabajadores remotos.
- **Worker** (ejecuta ejecuciones): Construye un runtime con un motor con capacidad de worker, registra toolsets y agentes, y luego sella el registro para que el polling arranque únicamente cuando el registro local del runtime esté completo.

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

### Ejecuciones one-shot sin sesión

Usa `StartOneShot` y `OneShotRun` cuando quieras trabajo duradero que no esté asociado a una sesión existente.

- `Start` / `Run` son con sesión: requieren un `SessionID` concreto, participan en el ciclo de vida de la sesión y emiten eventos de stream con alcance de sesión.
- `StartOneShot` / `OneShotRun` son sin sesión: no reciben `SessionID`, no crean una sesión y solo anexan eventos canónicos al run log para su inspección por `RunID`.
- `StartOneShot` devuelve inmediatamente un `engine.WorkflowHandle`. `OneShotRun` es el wrapper bloqueante que llama a `handle.Wait(ctx)` por ti.

```go
client := chat.NewClient(rt)

handle, err := client.StartOneShot(ctx, msgs,
    runtime.WithRunID("run-123"),
    runtime.WithLabels(map[string]string{"tenant": "acme"}),
)
if err != nil {
    panic(err)
}

out, err := handle.Wait(ctx)
if err != nil {
    panic(err)
}

fmt.Println(out.RunID)
```

### Ejemplo de worker

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "temporal:7233", Namespace: "default"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "orchestrator.chat"},
})
if err != nil {
    panic(err)
}
defer eng.Close()

rt := runtime.New(runtime.WithEngine(eng))
if err := chat.RegisterUsedToolsets(ctx, rt /* executors... */); err != nil {
    panic(err)
}
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner}); err != nil {
    panic(err)
}
if err := rt.Seal(ctx); err != nil {
    panic(err)
}
```

---

## Bucle Plan → Ejecutar → Reanudar

1. El runtime inicia un workflow para el agente (en memoria o Temporal) y registra un nuevo `run.Context` con `RunID`, `SessionID`, `TurnID`, etiquetas y límites de política.
2. Llama al `PlanStart` de tu planificador con los mensajes actuales y el contexto de ejecución.
3. Programa las llamadas a herramientas devueltas por el planificador (el planificador pasa payloads JSON canónicos; el runtime se encarga de la codificación/decodificación mediante los codecs generados).
4. Llama a `PlanResume` con los resultados de herramienta que siguen siendo visibles para el planificador; las herramientas con presupuesto son visibles por defecto, mientras que las herramientas de bookkeeping solo se reproducen cuando declaran `PlannerVisible()` o cuando hay que reparar un fallo reintentable. El bucle se repite hasta que el planificador devuelve una respuesta final o se alcanzan los límites/presupuestos de tiempo. A medida que avanza la ejecución, se pasa por los valores de `run.Phase` (`prompted`, `planning`, `executing_tools`, `synthesizing`, fases terminales).
5. Los hooks y los suscriptores de stream emiten eventos (pensamientos del planificador, inicio/actualización/finalización de herramientas, esperas, uso, workflow, enlaces agente-ejecución) y, cuando están configurados, persisten entradas de transcripción y metadatos de ejecución.

---

## Fases de ejecución

A medida que una ejecución avanza por el bucle plan/ejecutar/reanudar, pasa por una serie de fases del ciclo de vida. Estas fases proporcionan una visibilidad detallada de dónde se encuentra una ejecución dentro de su progreso, permitiendo que las UIs muestren indicadores de progreso de alto nivel.

### Valores de fase

| Fase | Descripción |
| --- | --- |
| `prompted` | Se ha recibido la entrada y la ejecución está a punto de empezar la planificación |
| `planning` | El planificador está decidiendo si y cómo llamar a herramientas o responder directamente |
| `executing_tools` | Las herramientas (incluidos los agentes anidados) se están ejecutando |
| `synthesizing` | El planificador está sintetizando una respuesta final sin programar herramientas adicionales |
| `completed` | La ejecución ha finalizado con éxito |
| `failed` | La ejecución ha fallado |
| `canceled` | Se ha cancelado la ejecución |

### Transiciones de fase

Una ejecución exitosa típica sigue esta progresión:

```
prompted → planning → executing_tools → planning → synthesizing → completed
                          ↑__________________|
                          (loop while tools needed)
```

El runtime emite eventos de hook `RunPhaseChanged` para fases **no terminales** (por ejemplo, `planning`, `executing_tools`, `synthesizing`) para que los suscriptores del stream puedan seguir el progreso en tiempo real.

### Fase vs Estado

Las fases son distintas de `run.Status`:

- **Estado** (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`) es el estado del ciclo de vida de grano grueso almacenado en los metadatos duraderos de la ejecución
- **Fase** proporciona una visibilidad más fina del bucle de ejecución, pensada para superficies de streaming/UX

### Eventos de ciclo de vida: cambios de fase vs finalización terminal

El runtime emite:

- **`RunPhaseChanged`** para transiciones de fase no terminales.
- **`RunCompleted`** una vez por ejecución para el ciclo de vida terminal (éxito / fallo / cancelación).

Los suscriptores del stream traducen ambos en eventos de stream `workflow` (`stream.WorkflowPayload`):

- **Actualizaciones no terminales** (desde `RunPhaseChanged`): solo `phase`.
- **Actualización terminal** (desde `RunCompleted`): `status` + `phase` terminal, más campos de error estructurados en caso de fallo.

**Mapeo de estado terminal**

- `status="success"` → `phase="completed"`
- `status="failed"` → `phase="failed"`
- `status="canceled"` → `phase="canceled"`

**La cancelación no es un error**

Para `status="canceled"`, el payload del stream **no debe** incluir un `error` orientado al usuario. Los consumidores deben tratar la cancelación como un estado terminal sin error.

**Los fallos son estructurados**

Para `status="failed"`, el payload del stream incluye:

- `error_kind`: clasificador estable para UX/decisiones (kinds de proveedor como `rate_limited`, `unavailable`, o kinds de runtime como `timeout`/`internal`)
- `retryable`: si reintentar puede tener éxito sin cambiar la entrada
- `error`: mensaje **seguro para el usuario** apto para mostrar directamente
- `debug_error`: cadena de error cruda para logs/diagnóstico (no para UI)

---

## Políticas, límites y etiquetas

### RunPolicy en tiempo de diseño

En tiempo de diseño, configuras políticas por agente con `RunPolicy`:

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

- **Límites**: `MaxToolCalls` – total de llamadas a herramientas con presupuesto por ejecución. Las herramientas declaradas `Bookkeeping()` en el DSL están **exentas** de este límite: las actualizaciones de estado, marcadores de progreso y herramientas de commit terminal nunca consumen `RemainingToolCalls` y nunca se descartan cuando un lote se recorta para encajar en el presupuesto restante. Por defecto, los resultados correctos de bookkeeping permanecen ocultos para futuros turnos del planificador salvo que la herramienta también declare `PlannerVisible()`. `MaxConsecutiveFailedToolCalls` – fallos consecutivos antes de abortar.
- **Presupuesto de tiempo**: `TimeBudget` – presupuesto de reloj de pared para la ejecución. `FinalizerGrace` (solo runtime) – ventana reservada opcional para la finalización.
- **Interrupciones**: `InterruptsAllowed` – opt-in para pausa/reanudación.
- **Comportamiento ante campos faltantes**: `OnMissingFields` – rige lo que ocurre cuando la validación indica que faltan campos.
- **Herramientas terminales**: Las herramientas declaradas `TerminalRun()` cierran la ejecución atómicamente en cuanto tienen éxito: no se programa un turno `PlanResume` de seguimiento. Combina `Bookkeeping()` con `TerminalRun()` para una herramienta de "hacer commit de esta ejecución" que tiene garantizada su ejecución incluso cuando el presupuesto de recuperación está agotado.
- **Bookkeeping visible al planificador**: `PlannerVisible()` es el equivalente no terminal de `TerminalRun()`. Úsalo en herramientas de bookkeeping que emiten estado canónico del plano de control que debe reproducirse en el siguiente `PlanResume`; no es válido en herramientas con presupuesto ni en herramientas terminales.

### Overrides de política en runtime

En algunos entornos puedes querer endurecer o relajar las políticas sin cambiar el diseño. La API `rt.OverridePolicy` permite ajustes locales al proceso:

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

**Ámbito**: Los overrides son locales a la instancia actual del runtime y afectan solo a las ejecuciones posteriores. No persisten entre reinicios de proceso ni se propagan a otros workers.

**Campos sobreescribibles**:

| Campo | Descripción |
| --- | --- |
| `MaxToolCalls` | Máximo total de llamadas a herramientas por ejecución |
| `MaxConsecutiveFailedToolCalls` | Fallos consecutivos antes de abortar |
| `TimeBudget` | Presupuesto de reloj de pared para la ejecución |
| `FinalizerGrace` | Ventana reservada para finalización |
| `InterruptsAllowed` | Habilitar la capacidad de pausa/reanudación |

Solo se aplican los campos distintos de cero (y `InterruptsAllowed` cuando es `true`). Esto permite overrides selectivos sin afectar a otros parámetros de política.

**Casos de uso**:
- Retrocesos temporales durante el throttling del proveedor
- Pruebas A/B de diferentes configuraciones de política
- Desarrollo/depuración con restricciones relajadas
- Personalización de política por inquilino en runtime

### Etiquetas y motores de políticas

Goa-AI se integra con motores de políticas enchufables a través de `policy.Engine`. Las políticas reciben metadatos de herramientas (IDs, tags), contexto de ejecución (SessionID, TurnID, etiquetas) e información `RetryHint` tras fallos de herramientas.

Las etiquetas fluyen hacia:
- `run.Context.Labels` – disponibles para los planificadores durante una ejecución
- entrada de actividad de herramienta (`api.ToolInput.Labels`) – clonadas en las ejecuciones de herramientas despachadas para que las actividades observen los mismos metadatos con alcance de ejecución, salvo que el planificador sobrescriba las etiquetas para una llamada concreta
- eventos del run log (`runlog.Store`) – persistidos junto con los eventos de ciclo de vida para auditoría/búsqueda/paneles (cuando se indexan)

### Filtrado de herramientas por ejecución

Las tags en tiempo de diseño y las opciones en runtime permiten a los llamadores reducir la superficie de herramientas antes del prompting del planificador y de nuevo antes de la ejecución:

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithAllowedTags([]string{"read", "safe"}),
    runtime.WithDeniedTags([]string{"destructive"}),
    runtime.WithTagPolicyClauses([]runtime.TagPolicyClause{
        {AllowedAny: []string{"docs", "search"}},
        {DeniedAny: []string{"external"}},
    }),
)
```

Usa `WithRestrictToTool` cuando un flujo de reparación deba exponer exactamente una herramienta:

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithRestrictToTool(searchspecs.Search),
)
```

El runtime bloquea los turnos de reparación restringidos a una herramienta cuando un retry hint fija `RestrictToTool`, de modo que el siguiente turno del planificador solo ve la herramienta que necesita un payload corregido. Esto mantiene la reparación de validación enfocada y evita que el modelo se desvíe hacia herramientas no relacionadas.

---

## Ejecución de herramientas

- **Toolsets nativos**: Tú escribes las implementaciones; el runtime se encarga de decodificar los argumentos tipados usando los codecs generados
- **Agente como herramienta**: Los toolsets de agente-herramienta generados ejecutan agentes proveedores como ejecuciones hijas (en línea desde la perspectiva del planificador) y adaptan su `RunOutput` a un `planner.ToolResult` con un handle `RunLink` de vuelta a la ejecución hija
- **Toolsets MCP**: El runtime reenvía el JSON canónico a los callers generados; los callers se encargan del transporte

### Valores por defecto del payload de herramientas

La decodificación del payload de herramientas sigue el patrón **decode-body → transform** de Goa y aplica los valores por defecto de estilo Goa de forma determinista para los payloads de herramientas.

Consulta **[Tool Payload Defaults](tool-payload-defaults/)** para el contrato y los invariantes de codegen.

### Resultados de herramienta acotados

Las herramientas que devuelven vistas parciales de datasets más grandes deberían declarar `BoundedResult(...)` en el DSL. El contrato del runtime para esas herramientas es:

- `tools.ToolSpec.Bounds` generado declara el esquema canónico de resultado acotado
- las ejecuciones correctas deben poblar `planner.ToolResult.Bounds`
- el runtime proyecta esos bounds en el JSON `tool_result` emitido, los datos de plantilla de result hint bajo `.Bounds`, los payloads de hook y los eventos de stream

Campos canónicos proyectados:

- `returned` (requerido)
- `truncated` (requerido)
- `total` (opcional)
- `refinement_hint` (opcional)
- `next_cursor` (opcional, cuando se declara vía `NextCursor(...)`)

`planner.ToolResult.Bounds` sigue siendo el único contrato de runtime legible por máquina. Los tipos Go de resultado escritos por el autor permanecen semánticos y específicos del dominio; no necesitan duplicar los campos canónicos acotados solo para que los modelos puedan verlos.

Para las herramientas `BindTo` respaldadas por un método, el resultado del método de servicio ligado todavía necesita llevar los campos canónicos acotados para que el ejecutor generado pueda construir `planner.ToolResult.Bounds` antes de la proyección. Las formas explícitas `Return(...)` orientadas a herramienta no deben duplicar esos campos canónicos. Dentro del resultado del método ligado, solo `returned` y `truncated` pueden ser requeridos; `total`, `refinement_hint` y `next_cursor` siguen siendo opcionales y se omiten del JSON emitido siempre que los bounds del runtime también los omitan.

Cuando una frontera de servicio debe ensamblar el JSON de resultado canónico fuera de `ExecuteToolActivity`, usa `runtime.EncodeCanonicalToolResult(...)` en lugar de llamar por separado al codec de resultado generado y a los helpers de proyección de resultado acotado.

---

## Contratos de runtime para prompts

La gestión de prompts es nativa del runtime y versionada:

- `runtime.PromptRegistry` almacena registros inmutables de `prompt.PromptSpec` base.
- `runtime.WithPromptStore(prompt.Store)` habilita la resolución de overrides por scope (`session` -> `facility` -> `org` -> global).
- Los planificadores llaman a `PlannerContext.RenderPrompt(ctx, id, data)` para resolver y renderizar contenido de prompt.
- El contenido renderizado incluye metadatos `prompt.PromptRef` para procedencia; los planificadores pueden adjuntarlos a `model.Request.PromptRefs`.

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

`PromptRefs` son metadatos de runtime para auditoría/procedencia y no son campos del payload wire del proveedor.

---

## Memoria, streaming, telemetría

- **El bus de hooks** publica eventos de hook estructurados para todo el ciclo de vida del agente: inicio/finalización de la ejecución, cambios de fase, `prompt_rendered`, programación/resultados/actualizaciones de herramientas, notas del planificador y bloques de pensamiento, esperas, retry hints y enlaces agente-como-herramienta.

- **Los almacenes de memoria** (`memory.Store`) se suscriben y añaden eventos de memoria duraderos (mensajes de usuario/asistente, llamadas a herramientas, resultados de herramientas, notas del planificador, pensamiento) por `(agentID, RunID)`.

- **Los almacenes de eventos de ejecución** (`runlog.Store`) anexan el log canónico de eventos de hook por `RunID` para UIs de auditoría/debug e introspección de ejecuciones.

- **Los sinks de stream** (`stream.Sink`, por ejemplo Pulse o SSE/WebSocket personalizados) reciben valores `stream.Event` tipados producidos por el `stream.Subscriber`. Un `StreamProfile` controla qué tipos de eventos se emiten.

- **Telemetría**: logging, métricas y trazas conscientes de OTEL instrumentan workflows y actividades de extremo a extremo.

### Display hints de llamada a herramienta (DisplayHint)

Las llamadas a herramientas pueden llevar un `DisplayHint` orientado al usuario (por ejemplo, para UIs).

Contrato:

- Los constructores de hooks no renderizan hints. Los eventos de programación de llamada a herramienta tienen `DisplayHint==""` por defecto.
- El runtime puede enriquecer y persistir un hint duradero por defecto para la llamada en el momento de la publicación decodificando el payload tipado de la herramienta y ejecutando el `CallHintTemplate` del DSL.
- Cuando falla la decodificación tipada o no hay plantilla registrada, el runtime deja `DisplayHint` vacío. Los hints nunca se renderizan contra bytes JSON en bruto.
- Si un productor establece explícitamente `DisplayHint` (no vacío) antes de publicar el evento de hook, el runtime lo trata como autoritativo y no lo sobrescribe.
- Para cambios de texto por consumidor, configura `runtime.WithHintOverrides` en el runtime. Los overrides tienen precedencia sobre las plantillas autoradas en DSL para los eventos `tool_start` streameados.

### Consumir un stream de sesión (Pulse)

En producción, el patrón habitual es:

- publicar eventos de stream del runtime en Pulse (Redis Streams) usando un `stream.Sink`
- suscribirse al **stream de sesión** (`session/<session_id>`) desde tu fan-out de UI (SSE/WebSocket)
- dejar de streamear una ejecución cuando observes `type=="run_stream_end"` para el `RunID` activo

```go
import (
    pulsestream "goa.design/goa-ai/features/stream/pulse"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

streams, err := pulsestream.NewRuntimeStreams(pulsestream.RuntimeStreamsOptions{
    Client: pulseClient,
})
if err != nil {
    panic(err)
}
rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(streams.Sink()),
)

sub, err := streams.NewSubscriber(pulsestream.SubscriberOptions{SinkName: "ui"})
if err != nil {
    panic(err)
}
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
        // evt.SessionID(), evt.RunID(), evt.Type(), evt.Payload()
    case err := <-errs:
        panic(err)
    }
}
```

---

## Abstracción del motor

- **En memoria**: Bucle de desarrollo rápido, sin dependencias externas
- **Temporal**: Ejecución duradera, replay, reintentos, señales, workers; los adaptadores cablean actividades y propagación de contexto

### Tiempos semánticos vs liveness de Temporal

Goa-AI mantiene el contrato público del runtime agnóstico frente al motor:

- `RunPolicy.Timing.Plan` y `RunPolicy.Timing.Tools` son presupuestos semánticos por intento
- `runtime.WithTiming(...)` sustituye esos presupuestos semánticos para una ejecución
- `runtime.WithWorker(...)` sirve para la colocación en cola, no para ajustar el motor de workflow

Si usas el adaptador de Temporal y necesitas ajustar la espera en cola o la liveness, configúralo en el propio motor de Temporal:

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "temporal:7233",
        Namespace: "default",
    },
    WorkerOptions: temporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: temporal.ActivityDefaults{
        Planner: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
if err != nil {
    panic(err)
}
```

Esta separación mantiene la mecánica del workflow detrás de la frontera de Temporal, mientras que el runtime genérico permanece honesto tanto con Temporal como con el motor en memoria.

---

## Contratos de ejecución

- `SessionID` es obligatorio para los inicios con sesión. `Start` y `Run` fallan rápido cuando `SessionID` está vacío o en blanco
- `StartOneShot` y `OneShotRun` son explícitamente sin sesión. No requieren ni crean una sesión y no emiten eventos de stream con alcance de sesión
- Los agentes deben registrarse antes de la primera ejecución. El runtime rechaza el registro después del envío de la primera ejecución con `ErrRegistrationClosed` para mantener deterministas a los workers del motor
- Los ejecutores de herramientas reciben metadatos explícitos por llamada (`ToolCallMeta`) en lugar de extraer valores de `context.Context`
- No confíes en fallbacks implícitos; todos los identificadores de dominio (ejecución, sesión, turno, correlación) deben pasarse explícitamente

---

## Pausa y reanudación

Los flujos human-in-loop pueden suspender y reanudar ejecuciones usando los helpers de interrupción del runtime:

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

Entre bastidores, las señales de pausa/reanudación actualizan el almacén de ejecución y emiten eventos de hook `run_paused`/`run_resumed` para que las capas de UI permanezcan sincronizadas.

### Proporcionar resultados externos de herramientas

Algunas esperas se reanudan con **resultados de herramientas proporcionados por un actor externo** en lugar de por `ExecuteToolActivity` directamente. Ejemplos habituales son las herramientas controladas por la UI, como las preguntas estructuradas, o los servicios puente que recopilan resultados de otro sistema y luego despiertan la ejecución.

Usa `ProvideToolResults` con resultados proporcionados en bruto:

```go
err := rt.ProvideToolResults(ctx, interrupt.ToolResultsSet{
    RunID: "run-123",
    ID:    "await-1",
    Results: []*api.ProvidedToolResult{
        {
            Name:       "chat.ask_question.ask_question",
            ToolCallID: "toolcall-1",
            Result:     rawjson.Message(`{"answers":[{"question_id":"topic","selected_ids":["alarms"]}]}`),
        },
    },
})
```

Contrato:

- Los llamadores proporcionan el **JSON de resultado canónico en bruto** más `Bounds`, `Error` y `RetryHint` opcionales.
- Los llamadores **no** construyen `api.ToolEvent`; ese es el sobre interno del workflow del runtime.
- El runtime decodifica el resultado proporcionado usando la especificación registrada de la herramienta, ejecuta la materialización tipada del resultado, adjunta cualquier sidecar solo del servidor, añade el `tool_result` canónico a la transcripción/run log, y solo entonces reanuda la planificación.

Esto mantiene el camino de espera conceptualmente alineado con el camino de ejecución normal: ambos flujos convergen en el mismo contrato tipado `planner.ToolResult` antes de la publicación.

---

## Confirmación de herramienta

Goa-AI soporta **puertas de confirmación impuestas por el runtime** para herramientas sensibles (escrituras, borrados, comandos).

Puedes habilitar la confirmación de dos maneras:

- **En tiempo de diseño (caso común):** declara `Confirmation(...)` dentro del DSL de la herramienta. Codegen almacena la política en `tools.ToolSpec.Confirmation`.
- **En runtime (override/dinámico):** pasa `runtime.WithToolConfirmation(...)` al construir el runtime para requerir confirmación para herramientas adicionales o sobreescribir el comportamiento en tiempo de diseño.

En tiempo de ejecución, el workflow emite una solicitud de confirmación fuera de banda y solo ejecuta la herramienta después de que se proporcione una aprobación explícita. Cuando se deniega, el runtime sintetiza un resultado de herramienta conforme al esquema para que la transcripción siga siendo válida y el planificador pueda reaccionar de forma determinista.

### Protocolo de confirmación

En tiempo de ejecución, la confirmación se implementa como un protocolo dedicado de await/decisión:

- **Payload de espera** (streameado como `await_confirmation`):

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

Contrato:

- `payload` siempre contiene los argumentos JSON canónicos de la herramienta para la llamada pendiente. Si se aprueba, esos son los argumentos que ejecuta el runtime.
- Los overrides de confirmación pueden personalizar el prompt y el renderizado del resultado denegado, pero no introducen un canal separado de payload de visualización ni cambian el significado de `payload`.
- Los productos que necesiten una UI de confirmación más rica deben materializarla en la capa de aplicación a partir del payload canónico y de lecturas propias de la aplicación.

- **Proporcionar decisión** (a través de `ProvideConfirmation` en el runtime):

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

### Eventos de autorización de herramienta

Cuando se proporciona una decisión, el runtime emite un evento de autorización de primer orden:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

Este evento es el registro canónico "quién/cuándo/qué" para una llamada de herramienta confirmada:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (resumen determinista renderizado por el runtime)
- `approved_by` (copiado de `interrupt.ConfirmationDecision.RequestedBy`, pensado como identificador de principal estable)

El evento se emite inmediatamente tras recibirse la decisión (antes de la ejecución de la herramienta cuando se aprueba, y antes de sintetizar el resultado denegado cuando se rechaza).

Notas:

- Los consumidores deben tratar la confirmación como un protocolo de runtime:
  - Usa el motivo `RunPaused` que la acompaña (`await_confirmation`) para decidir cuándo mostrar una UI de confirmación.
  - No acoples el comportamiento de la UI a un nombre específico de herramienta de confirmación; trátalo como un detalle interno de transporte.
- Las plantillas de confirmación (`PromptTemplate` y `DeniedResultTemplate`) son cadenas Go `text/template` ejecutadas con `missingkey=error`. Además de las funciones de plantilla estándar (por ejemplo, `printf`), Goa-AI proporciona:
  - `json v` → codifica `v` como JSON (útil para campos puntero opcionales o incrustar valores estructurados).
  - `quote s` → devuelve una cadena Go-escaped entre comillas (como `fmt.Sprintf("%q", s)`).

### Validación en runtime

El runtime valida las interacciones de confirmación en la frontera:

- El `ID` de confirmación coincide con el identificador de espera pendiente cuando se proporciona.
- El objeto de decisión está bien formado (`RunID` no vacío, valor booleano `Approved`).

---

## Contrato del planificador

Los planificadores implementan:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contiene llamadas a herramientas, respuesta final, anotaciones y `RetryHint` opcional. El runtime aplica los límites, programa las actividades de herramientas y realimenta los resultados en `PlanResume` hasta que se produce una respuesta final.

Los planificadores también reciben un `PlannerContext` a través de `input.Agent` que expone servicios del runtime:
- `AdvertisedToolDefinitions()` - obtén las definiciones de herramientas filtradas por el runtime y visibles para el modelo en este turno
- `ModelClient(id string)` - obtén un cliente de modelo crudo agnóstico del proveedor
- `PlannerModelClient(id string)` - obtén un cliente de modelo con alcance de planificador y emisión de eventos gestionada por el runtime
- `RenderPrompt(ctx, id, data)` - resuelve y renderiza contenido de prompt para el scope actual de la ejecución
- `AddReminder(r reminder.Reminder)` - registra recordatorios del sistema con alcance de ejecución
- `RemoveReminder(id string)` - limpia recordatorios cuando las precondiciones dejan de cumplirse
- `Memory()` - accede al historial de conversación

---

## Módulos de características

- `runtime/mcp` – callers MCP para transportes HTTP, SSE y stdio
- `features/memory/mongo` – almacén de memoria duradera
- `features/prompt/mongo` – almacén de overrides de prompts respaldado por Mongo
- `features/runlog/mongo` – almacén de eventos de ejecución (append-only, paginación por cursor)
- `features/session/mongo` – almacén de metadatos de sesión
- `features/stream/pulse` – helpers de sink/subscriber de Pulse
- `features/model/{anthropic,bedrock,openai}` – adaptadores de cliente de modelo para planificadores
- `features/model/middleware` – middlewares compartidos de `model.Client` (por ejemplo, limitación de velocidad adaptativa)
- `features/policy/basic` – motor de políticas simple con listas de allow/block y gestión de retry hints

### Throughput y rate limiting del cliente de modelo

Goa-AI incluye un limitador de velocidad adaptativo y agnóstico del proveedor en `features/model/middleware`. Envuelve cualquier `model.Client`, estima los tokens por petición, encola a los llamadores usando un cubo de tokens y ajusta su presupuesto efectivo de tokens por minuto usando una estrategia aditiva-incremental/multiplicativa-decremental (AIMD) cuando los proveedores reportan throttling.

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, _ := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
})

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited := rl.Middleware()(bed)

rt := runtime.New()
if err := rt.RegisterModel("bedrock", limited); err != nil {
    panic(err)
}
```

---

## Integración LLM

Los planificadores de Goa-AI interactúan con grandes modelos de lenguaje a través de una **interfaz agnóstica frente al proveedor**. Este diseño te permite intercambiar proveedores —AWS Bedrock, OpenAI o endpoints personalizados— sin cambiar el código de tu planificador.

### La interfaz model.Client

Todas las interacciones con LLMs pasan por la interfaz `model.Client`:

```go
type Client interface {
    Complete(ctx context.Context, req *Request) (*Response, error)
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

### Adaptadores de proveedor

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
})
```

**OpenAI**

```go
import "goa.design/goa-ai/features/model/openai"

modelClient, err := openai.New(openai.Options{
    APIKey:       apiKey,
    DefaultModel: "gpt-5-mini",
    HighModel:    "gpt-5",
    SmallModel:   "gpt-5-nano",
})
```

### Uso de clientes de modelo en planificadores

Los planificadores obtienen clientes de modelo a través del `PlannerContext` del runtime. Hay dos estilos de integración explícitos:

- `PlannerModelClient(id)` para streaming con alcance de planificador y emisión de eventos gestionada por el runtime
- `ModelClient(id)` cuando necesitas acceso crudo al transporte y lo combinarás con `planner.ConsumeStream` o emitirás `PlannerEvents` tú mismo

#### PlannerModelClient (recomendado)

`PlannerContext.PlannerModelClient(id)` devuelve un cliente con alcance de planificador que es responsable de emitir `AssistantChunk`, `PlannerThinkingBlock` y `UsageDelta`. Su método `Stream(...)` drena el stream del proveedor subyacente y devuelve un `planner.StreamSummary`:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc, ok := input.Agent.PlannerModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    if !ok {
        return nil, errors.New("model not configured")
    }

    req := &model.Request{
        Messages: input.Messages,
        Tools:    input.Agent.AdvertisedToolDefinitions(),
        Stream:   true,
    }

    sum, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    if len(sum.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
    }
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: sum.Text}},
            },
        },
        Streamed: true, // Assistant text was already streamed
    }, nil
}
```

Este es el estilo de integración más seguro porque el cliente con alcance de planificador no expone un `model.Streamer` crudo, por lo que no puede combinarse accidentalmente con `planner.ConsumeStream`.

#### Cliente crudo + ConsumeStream

Cuando necesitas el `model.Client` crudo, obténlo desde `PlannerContext.ModelClient` y combínalo con `planner.ConsumeStream`:

```go
mc, ok := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
if !ok {
    return nil, errors.New("model not configured")
}
req := &model.Request{
    Messages: input.Messages,
    Tools:    input.Agent.AdvertisedToolDefinitions(),
    Stream:   true,
}
streamer, err := mc.Stream(ctx, req)
if err != nil {
    return nil, err
}
sum, err := planner.ConsumeStream(ctx, streamer, req, input.Events)
if err != nil {
    return nil, err
}
```

Este helper drena el stream, emite eventos de asistente/pensamiento/uso y devuelve un `StreamSummary` con el texto y las llamadas a herramientas acumulados.

Usa la ruta del cliente crudo cuando necesites control total sobre el consumo del stream, quieras un comportamiento personalizado de parada temprana o quieras gestionar `PlannerEvents` explícitamente. No mezcles `PlannerModelClient.Stream(...)` con `planner.ConsumeStream`; elige un único propietario del stream por turno del planificador.

### Validación de ordenación de mensajes en Bedrock

Cuando se usa AWS Bedrock con el modo de pensamiento habilitado, el runtime valida las restricciones de ordenación de mensajes antes de enviar peticiones. Bedrock requiere:

1. Cualquier mensaje de asistente que contenga `tool_use` debe comenzar con un bloque de pensamiento
2. Cada mensaje de usuario que contenga `tool_result` debe seguir inmediatamente a un mensaje de asistente con bloques `tool_use` coincidentes
3. El número de bloques `tool_result` no puede superar el recuento previo de `tool_use`

El cliente de Bedrock valida estas restricciones de forma anticipada y devuelve un error descriptivo si se infringen:

```
bedrock: invalid message ordering with thinking enabled (run=xxx, model=yyy): 
bedrock: assistant message with tool_use must start with thinking
```

Esta validación garantiza que la reconstrucción del ledger de transcripción produce secuencias de mensajes conformes con el proveedor.

---

## Próximos pasos

- Aprende sobre [Toolsets](./toolsets/) para entender los modelos de ejecución de herramientas
- Explora [Agent Composition](./agent-composition/) para patrones de agente-como-herramienta
- Lee sobre [Memory & Sessions](./memory-sessions/) para la persistencia de transcripciones
