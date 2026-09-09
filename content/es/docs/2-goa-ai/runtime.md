---
title: "Tiempo de ejecución"
linkTitle: "Tiempo de ejecución"
weight: 3
description: "Entiende cómo el runtime de Goa-AI orquesta agentes, aplica políticas y gestiona el estado."
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
| Almacén del runtime host | Guarda juntos el alcance de la sesión, el estado de la ejecución, los checkpoints y los registros inmutables |
| Módulos de características | Integraciones opcionales (MCP, Pulse, memoria y prompts, proveedores de modelos) |

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
    "time"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
    storageinmem "goa.design/goa-ai/runtime/agent/storage/inmem"
)

func main() {
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := store.CreateSession(ctx, "session-1", time.Now().UTC()); err != nil {
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

- tipos de resultado y de unión tipados
- esquemas de resultado privados y codecs generados
- helpers generados `Complete<Name>(ctx, client, req)`
- helpers tipados `StreamComplete<Name>(ctx, client, req)`
- `<Name>Example()` cuando el resultado raíz tiene un `Example(...)` escrito

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

Toda salida estructurada `model.StructuredOutput` de bajo nivel necesita un
nombre no vacío. Los helpers generados lo derivan del DSL validado de la
completion. La completion unaria realiza exactamente una llamada al modelo. Un
JSON inválido devuelve un `planner.OutputContractError` no reintentable y una
respuesta nil; nunca inicia una petición de corrección. Cuando tiene éxito,
`resp.ModelResponse` contiene la respuesta exacta del proveedor y el uso de
tokens.

Las completions en streaming devuelven `completion.Streamer[T]`. `Recv` expone
fragmentos de previsualización, mientras `Value()` no está disponible hasta
que termina el stream y la respuesta terminal coincide con la completion final:

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
    // Render preview completion_delta chunks here when useful.
    _ = chunk
}
value, ok := stream.Value()
if !ok {
    panic("completion stream ended without a typed value")
}
fmt.Println(value.Name)
```

Los helpers de completion tipados son intencionadamente estrictos:

- Los helpers unarios aceptan únicamente peticiones unarias.
- Los nombres de completion se validan en la frontera del DSL: 1-64 caracteres ASCII, solo letras/dígitos/`_`/`-`, y deben empezar por una letra o un dígito.
- Los helpers unarios y de streaming rechazan las peticiones con herramientas habilitadas y cualquier `StructuredOutput` proporcionado por el llamador.
- Los proveedores de streaming pueden emitir previsualizaciones
  `completion_delta*` y exactamente una `completion` final, o rechazar la
  petición explícitamente.
- El wrapper tipado solo publica `Value()` después de un fin de stream limpio y
  una validación completa. No existe un decodificador público que acepte un
  chunk sin comprobar.
- Los streams de completion usan directamente su wrapper tipado generado; los
  helpers de streaming del planificador son para texto de transcripción del
  asistente y llamadas a herramientas.
- Los proveedores que no implementan salida estructurada exponen `model.ErrStructuredOutputUnsupported`.
- Los esquemas generados son canónicos y neutrales frente al proveedor; los adaptadores de proveedor pueden normalizarlos a un subconjunto soportado, pero deben fallar explícitamente cuando no puedan preservar el contrato declarado.

---

## Client-Only vs Worker

Dos roles utilizan el runtime:

- **Sólo-Cliente** (envía ejecuciones): Construye un runtime con un motor apto para clientes y no registra agentes. Usa el `<agent>.NewClient(rt)` generado, que lleva la `AgentDefinition` generada compartida con los workers remotos.
- **Worker** (ejecuta ejecuciones): Construye un runtime con un motor con capacidad de worker, registra toolsets y agentes, y luego sella el registro para que el polling arranque únicamente cuando el registro local del runtime esté completo.

Cada `AgentDefinition` generada es el contrato completo e inmutable de un
agente. Contiene el nombre del workflow, la cola de tareas predeterminada, los
contratos de herramientas generados, las etiquetas obligatorias, la política de
completion y las definiciones de todos los agentes hijo accesibles. Los clientes
la usan para validar y dirigir el trabajo antes de que el motor acepte el
workflow; los workers usan el mismo valor al registrarlo. Una ejecución concreta
puede elegir otra cola con `WithTaskQueue`, pero los registros escritos a mano no
deben definir otra ruta ni otro grafo de agentes hijo.

### Ejemplo sólo cliente

```go
rt := runtime.New(runtimeStore, runtime.WithEngine(temporalClient)) // engine client

// The host session service has already created "s1".
// No agent registration is needed in a caller-only process.
client := chat.NewClient(rt)
out, err := client.Run(ctx, "s1", msgs)
```

### Ejecuciones one-shot sin sesión

Usa `StartOneShot` y `OneShotRun` cuando quieras trabajo duradero que no esté asociado a una sesión existente.

- `Start` / `Run` son con sesión: requieren un `SessionID` concreto, participan en el ciclo de vida de la sesión y emiten eventos de stream con alcance de sesión.
- `StartOneShot` / `OneShotRun` son sin sesión: no reciben `SessionID` ni crean una sesión. Antes de ejecutar el trabajo, el almacenamiento integrado guarda los metadatos completos sin sesión y el registro `RunStarted` para que la ejecución pueda consultarse por `RunID`.
- La aplicación host crea las sesiones antes de enviar trabajo; los runtimes de agentes no crean, terminan ni eliminan sesiones.
- El motor acepta un workflow raíz antes de que su primera activity registre la ejecución. No se crea un estado `pending` antes de la admisión.
- Los inicios raíz, hijo y one-shot usan operaciones distintas. El inicio hijo guarda el vínculo con el padre; one-shot guarda metadatos completos sin sesión.
- Los motivos de cancelación se escriben una sola vez. Un reintento idéntico tiene éxito; un motivo diferente produce un conflicto.
- La suspensión y la finalización guardan el nuevo estado junto con su registro inmutable.
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

El método de nivel inferior `Runtime.RunOneShot` guarda la ejecución antes de
llamar al código de la aplicación. Cuando el callback termina, registra los
prompts renderizados y el resultado final aunque el callback haya cancelado su
contexto. Los errores temporales del almacenamiento reintentan los registros ya
preparados sin volver a ejecutar el callback.

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

rt := runtime.New(runtimeStore, runtime.WithEngine(eng))
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

1. El motor acepta un workflow para el agente, en memoria o en Temporal.
2. La primera actividad guarda la identidad y el primer registro permanente
   mediante `StartRootRun`, `StartChildRun`, `StartOneShotRun` o
   `StartOneShotChildRun`. Todo workflow aceptado guarda `RunStarted`.
   [Memoria y sesiones](../memory-sessions/#cancellation-provenance) define las
   tres formas válidas de guardar los motivos y los registros de intención de
   cancelación.
3. El runtime llama a `PlanStart` con `PrepareMessages` y un `run.Context` que
   contiene `RunID`, `SessionID`, `TurnID`, etiquetas y límites de política.
4. Programa las llamadas a herramientas devueltas por el planificador usando
   los codecs generados.
5. Llama a `PlanResume` con las salidas que siguen visibles para el
   planificador. Las herramientas con presupuesto son visibles por defecto. Un
   fallo de bookkeeping programa otro turno según `ToolFailure.Recovery.Action`:
   corrección, replanificación sin esa herramienta o finalización. El bucle se
   repite hasta que el planificador devuelve una respuesta final, un resultado
   de herramienta final o una herramienta `TerminalRun` correcta completa la
   ejecución. Si los límites o deadlines fuerzan la finalización, el
   planificador puede cerrar mediante herramientas terminales de bookkeeping
   en vez de prosa. La ejecución avanza por los valores de `run.Phase`
   (`prompted`, `planning`, `executing_tools`, `synthesizing` y fases
   terminales).
6. Los hooks y los suscriptores de stream emiten eventos (pensamientos del planificador, inicio/actualización/finalización de herramientas, esperas, uso, workflow, enlaces agente-ejecución) y, cuando están configurados, persisten entradas de transcripción y metadatos de ejecución.

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

- **Estado** (`running`, `suspended`, `completed`, `failed`, `canceled`) es el estado del ciclo de vida de grano grueso almacenado en los metadatos duraderos de la ejecución. No existe un estado `pending` anterior a la admisión.
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
- `debug_error`: texto de diagnóstico del error; la aplicación decide quién puede verlo

**Identidad terminal**

`RunCompleted` incluye `Labels`: las etiquetas con alcance de ejecución
proporcionadas al iniciar la ejecución (`RunInput.Labels`, establecidas con
`runtime.WithLabels(...)`), nil cuando la ejecución no tenía ninguna. Los
suscriptores de finalización pueden atribuir el resultado terminal — success,
failed o canceled — sin mantener su propio mapa de run-ID a identidad. Las
mismas etiquetas se exponen en `run.Snapshot.Labels` para lectores por sondeo,
reconstruidas desde el registro durable `RunStarted`, de modo que la identidad
de la ejecución sobrevive a reinicios del proceso en ambos motores. Las
etiquetas fusionadas por decisiones de política a mitad de la ejecución no se
incluyen; siguen siendo observables mediante eventos `PolicyDecision`.

---

## Diagnóstico de errores

Goa-AI conserva íntegros los mensajes de diagnóstico y el texto de los errores
tipados de proveedor que sean UTF-8 válido, sin límites de longitud por campo.
La aplicación decide qué guarda su instrumentación y quién puede leerlo o
mostrarlo. Los spans del planificador y de las actividades Temporal reciben el
error original antes del transporte del workflow o de la conversión del error.
La reproducción del workflow no vuelve a emitir esos diagnósticos. Los
resúmenes para mostrar, la clasificación, la posibilidad de reintento y la
recuperación del modelo no cambian; el diagnóstico no es una instrucción de
corrección para el modelo.

### Rechazos locales de solicitudes al modelo

Use `model.NewRequestValidationError(cause)` solo cuando una validación de la
aplicación rechace una solicitud al modelo antes de que un proveedor la acepte.
Un adaptador de modelo remoto puede reconstruir este tipo a partir del error
explícito de validación de solicitudes de su servicio. La causa es obligatoria:
`Unwrap()` expone el error original y `Error()` devuelve su diagnóstico completo.
Este tipo no incluye nombre de proveedor, estado HTTP, configuración de
reintento ni instrucciones de recuperación.

No lo use para fallos de red, observadores, cancelación o proveedores. Los
validadores y adaptadores existentes mantienen su comportamiento salvo que su
responsable marque explícitamente un rechazo local. Los rechazos reales del
proveedor siguen usando `model.ProviderError`; la salida no válida del modelo o
del planificador mantiene su contrato independiente de validación de salida.

La ejecución termina con el tipo `model_request`, `Retryable: false` y sin
proveedor, operación, código de proveedor ni estado HTTP. El resumen
predeterminado es “The AI request could not be prepared.” La aplicación puede
cambiar `hooks.PublicErrorModelRequest` al iniciar el proceso; `DebugMessage`
conserva el diagnóstico completo. Ni la ejecución de herramientas ni los
agentes anidados convierten este error en un reintento o una llamada adicional
al modelo para corregirlo. El texto ya publicado por una llamada anterior al
modelo en la misma actividad del planificador se conserva antes de terminar.
Un `ApplicationError` personalizado de Temporal devuelto directamente mantiene
la clasificación y la política de reintento existentes de la aplicación; este
tipo no reemplaza ese error exterior explícito.

Temporal guarda el error como `goa_ai.request_validation_error`, con
`NonRetryable: true` y el diagnóstico válido completo en su mensaje, sin
detalles ni objeto de causa. Los lectores rechazan un valor guardado si permite
reintentos, contiene detalles o una causa, o tiene UTF-8 no válido. La
codificación de diagnósticos y los límites externos de tamaño de fallos siguen
aplicándose; no hay un nuevo límite de texto. No se reinterpretan los fallos de
proveedor, salida, genéricos o de cancelación guardados anteriormente.

Actualice los workers antes de que los adaptadores produzcan este tipo. Los
workers antiguos no pueden leer su clasificación guardada y no deben procesar
historiales que la contengan, tampoco al volver a una versión anterior. Envíe
esos historiales solo a workers actualizados. No hay migración de base de datos,
cambio de API generada ni modo de compatibilidad, y la actualización no cambia
la clasificación de fallos guardados anteriormente.

### Formatos de error guardados

Los nuevos registros `OutputContractFailure`, `ModelOutputRejected` y
`PlannerOutputRejected` usan `ReasonVersion="goa_ai.rejection_reason.v2"`.
`Reason` conserva el texto exacto de la causa seleccionada, identificado por
`ReasonSHA256` y `ReasonSize`. Si el texto es válido, `ReasonOmitted` queda vacío;
si no es UTF-8 válido, `Reason` queda vacío y
`ReasonOmitted="invalid_utf8"`. Los registros nuevos no usan `size_limit` para
omitir una causa larga.

Los nuevos fallos Temporal de proveedor, genéricos, de contrato de salida y de
tipo reservado no válido usan estos cuatro tipos privados de error de aplicación:

- `goa_ai.provider_error.v3`
- `goa_ai.generic_error.v3`
- `goa_ai.output_contract_error.v3`
- `goa_ai.invalid_reserved_error.v3`

El tipo selecciona el formato de los detalles guardados. Los detalles de
proveedor y genéricos conservan su propio texto como cadenas simples, separado
del mensaje de diagnóstico exterior. El UTF-8 no válido se representa mediante
un aviso explícito de texto no disponible, con el hash y el número de bytes
originales, no mediante caracteres de sustitución silenciosos. Estos formatos
no serializan causas Go arbitrarias, objetos de error del SDK ni detalles
personalizados de la aplicación. Conservar texto válido exacto no equivale a
almacenar bytes arbitrarios.

### Límites del transporte y de la aplicación

El límite existente para argumentos y resultados completos de workflow sigue
aplicándose al valor codificado íntegro, incluidos los campos que lo acompañan.
Si un resultado del planificador no cabe, se devuelve un fallo explícito de
presupuesto de transporte; no se guarda el diagnóstico demasiado grande
acortándolo silenciosamente.

Los objetos de fallo nativos de Temporal usan un conversor de fallos del SDK
independiente, no la validación de tamaño de argumentos y resultados del
workflow. Goa-AI no añade un límite de tamaño ni una comprobación previa para
estos fallos nativos. El `FailureConverter` configurado por la aplicación,
incluido su comportamiento de rechazo, sigue bajo su control.

Los límites de solicitudes e historial de Temporal pueden rechazar fallos
grandes; el estado de reintento de una actividad pendiente puede conservar un
fallo acortado por el servidor. La instrumentación también tiene límites de
muestreo, exportación y backend. Conservar texto en el framework no garantiza
almacenamiento ni entrega ilimitados, ni recupera texto omitido anteriormente.

### Actualización de workers e historiales guardados

Los lectores nuevos mantienen el comportamiento de los registros de rechazo
sin versión y v1, y de los tipos Temporal históricos con detalles v1/v2. La
decodificación y la reproducción no reescriben esos registros, no cambian sus
bytes publicados ni restauran texto perdido. Las reglas antiguas de omisión y
validación siguen aplicándose a los formatos antiguos.

Los fallos terminales ya guardados conservan sus bytes originales. Un workflow
que lee metadatos de rechazo antiguos pero termina por primera vez después de
la actualización escribe el tipo actual de fallo terminal. Una reproducción
correcta no demuestra que los comandos de fallo terminal antiguos y nuevos
tengan detalles codificados idénticos.

Actualiza los consumidores de hooks que validan los registros y los workers de
workflows y actividades antes de que reciban los formatos nuevos. No mezcles
escritores nuevos con lectores antiguos incompatibles en las mismas colas de
tareas; usa el enrutamiento por versión de worker o el procedimiento de vaciado
y sustitución verificado de la aplicación. Una reversión debe conservar
lectores capaces de interpretar todos los formatos ya escritos. Mantén los
decodificadores históricos mientras los registros de ejecución o historiales
de workflow admitidos los necesiten; sustituir los workers no elimina por sí
solo ese requisito.

## Políticas, límites y etiquetas

### RunPolicy en tiempo de diseño

En tiempo de diseño, configuras políticas por agente con `RunPolicy`:

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxRecoveryTurns(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

Esto se convierte en un `runtime.RunPolicy` adjunto al registro del agente:

- **Límites**: `MaxToolCalls` limita el total de llamadas a herramientas con presupuesto por ejecución. `MaxRecoveryTurns` limita las nuevas llamadas al planificador después de rechazar el resultado de una herramienta o una respuesta del modelo. Una llamada correcta a una herramienta con presupuesto reinicia este límite. Las herramientas `Bookkeeping()` no consumen ninguno de estos presupuestos.
- **Presupuesto de tiempo**: `TimeBudget` – presupuesto de reloj de pared para la ejecución. `FinalizerGrace` (solo runtime) – ventana reservada opcional para la finalización.
- **Interrupciones**: `InterruptsAllowed` – opt-in para pausa/reanudación.
- **Comportamiento ante campos faltantes**: `OnMissingFields` – rige lo que ocurre cuando la validación indica que faltan campos.
- **Herramientas terminales**: Las herramientas declaradas `TerminalRun()` se
  convierten automáticamente en bookkeeping y completan la ejecución al tener
  éxito, sin programar un turno `PlanResume` posterior. Por tanto, un commit
  terminal puede admitirse sin presupuesto de recuperación restante. Durante
  la finalización forzada, el runtime admite solo llamadas terminales de
  bookkeeping, las ejecuta dentro de la ventana restante del hard deadline y
  cierra la ejecución solo si todos los efectos laterales terminales tienen
  éxito. Antes de ejecutarlas, el runtime escribe el
  `planner.TerminationReason` exacto en
  `runtime.FinalizationReasonLabel` (`goa-ai.finalization_reason`). Las
  etiquetas de ejecución y política, la salida del planificador y la del modelo
  no pueden elegir ni reemplazar este valor. Las llamadas ordinarias no lo
  reciben.

  Los consumidores de llamadas terminales creadas por límites fijos o por el
  planificador, incluido `tool_failure`, usan
  `runtime.FinalizationReasonLabel`. Despliega cualquier cambio de este
  contrato de ejecución conjuntamente en consumidores y workers del runtime.

### Overrides de política en runtime

En algunos entornos puedes querer endurecer o relajar las políticas sin cambiar el diseño. La API `rt.OverridePolicy` permite ajustes locales al proceso:

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxRecoveryTurns: 1,
    InterruptsAllowed:             true,
})
```

**Ámbito**: Los overrides son locales a la instancia actual del runtime y afectan solo a las ejecuciones posteriores. No persisten entre reinicios de proceso ni se propagan a otros workers.

**Campos sobreescribibles**:

| Campo | Descripción |
| --- | --- |
| `MaxToolCalls` | Máximo total de llamadas a herramientas por ejecución |
| `MaxRecoveryTurns` | Nuevas llamadas al planificador después de una salida rechazada |
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

Goa-AI se integra con motores de políticas enchufables mediante
`policy.Engine`. Las políticas reciben metadatos de herramientas (IDs, tags),
el contexto de ejecución (SessionID, TurnID, etiquetas) y el `ToolFailure`
estructurado después de una ejecución fallida.

Las etiquetas fluyen hacia:
- `run.Context.Labels` – disponibles para los planificadores durante una ejecución
- entrada de actividad de herramienta (`api.ToolInput.Labels`) – clonadas en
  las ejecuciones despachadas; las llamadas de finalización también reciben el
  motivo propiedad del runtime en `runtime.FinalizationReasonLabel`
- **El almacén del runtime** (`storage.Store`) añade registros inmutables por `RunID`. Los métodos de ciclo de vida guardan el estado, checkpoint o cancelación junto con su registro correspondiente.
- finalización terminal e instantáneas – las etiquetas de inicio vuelven a salir al final de la ejecución en `hooks.RunCompletedEvent.Labels` y `run.Snapshot.Labels`, de modo que los hooks de finalización y los lectores de `GetRunSnapshot` recuperan la identidad de la ejecución sin seguimiento fuera de banda

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

Esta es una política del llamador para toda la ejecución. Los fallos de
herramienta usan otro contrato: `ToolFailure.Recovery.Action` selecciona corrección,
replanificación o finalización, y el runtime impone el catálogo resultante en
el siguiente turno.

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
- el runtime proyecta bounds propiedad del proveedor en el JSON `tool_result` emitido, los datos de plantilla de result hint bajo `.Bounds`, los payloads de hook y los eventos de stream
- para herramientas paginadas, el código del proveedor establece
  `Bounds.NextCursor` con el cursor opaco de la página siguiente

`tools.ToolSpec.Bounds` usa nombres JSON visibles para el modelo. Una declaración
DSL puede referirse a atributos Goa lower-camel como `NextCursor("nextCursor")`,
pero las specs generadas, los esquemas, la proyección del runtime y los codecs
de resultado usan `next_cursor`.

Campos canónicos proyectados:

- `returned` (requerido)
- `truncated` (requerido)
- `total` (opcional)
- `refinement_hint` (opcional)
- `next_cursor` (opcional cuando `NextCursor(...)` se expone mediante un contrato `Cursor` directo)

`planner.ToolResult.Bounds` sigue siendo el único contrato de proveedor legible por máquina. Los tipos Go de resultado escritos por el autor permanecen semánticos y específicos del dominio; no necesitan duplicar los campos canónicos acotados solo para que los modelos puedan verlos.

`ContinueWith("continue_tool", "cursor")` declara la continuación mecánica como
una acción separada. El runtime la ofrece solo cuando el historial contiene
una única cabeza activa de la cadena con otro cursor. La correspondencia exacta
del cursor avanza páginas secuenciales. Las llamadas fuente en paralelo siguen
siendo válidas, pero varias cabezas activas hacen que la acción sin argumentos
no esté disponible. El modelo la llama con `{}` y el
runtime enlaza el cursor y los campos de consulta retenidos antes de ejecutar.
Un `Cursor("cursor")` directo mantiene el contrato abierto: el modelo repite los
argumentos sin cambios con el cursor opaco devuelto en `next_cursor`.

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
messages, err := input.PrepareMessages()
if err != nil {
    return nil, err
}
content, err := input.Agent.RenderPrompt(ctx, "assistant.system", map[string]any{
    "AssistantName": "Ops Assistant",
})
if err != nil {
    return nil, err
}

resp, err := modelClient.Complete(ctx, &model.Request{
    RunID:      input.RunContext.RunID,
    Messages:   messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` identifica qué versiones renderizadas de prompts influyeron en una solicitud; no forma parte del payload del proveedor. El runtime lo deriva de los registros `prompt_rendered` y de vínculo padre-hijo, sin mantener otra lista que pueda divergir.

El renderizado no escribe en el almacenamiento del runtime. Todas las rutas
usan `prompt.RenderRecorder` para crear el mismo `prompt.RenderEvent` con el ID,
la versión y el scope del prompt resuelto:

- el código de la aplicación que renderiza los mensajes iniciales pasa
  `recorder.Events()` mediante `runtime.WithRenderedPrompts` junto con esos
  mensajes;
- las activities del planificador devuelven sus eventos junto con el resultado;
- la preparación del prompt de un agente hijo se ejecuta en una activity y
  devuelve el texto renderizado y sus eventos en la entrada del hijo;
- `RunOneShot` registra los renderizados realizados por su callback.

El workflow guarda cada evento aceptado como el mismo registro
`PromptRendered`. La ruta inicial no tiene una regla de renderizado distinta;
solo entrega un evento creado antes de iniciar el workflow. La preparación del
hijo se ejecuta en una activity para que Temporal reutilice durante el replay el
texto y los eventos guardados en el historial, sin leer una versión más reciente
del prompt.
`RenderRecorder.Events` devuelve los renderizados completados en un orden
estable por ID de prompt, versión, sesión y scope. Por tanto, el orden en que
terminan renderizados concurrentes no puede cambiar la solicitud exacta de
inicio del workflow.

---

## Memoria, streaming, telemetría

- **El bus de hooks** publica eventos de hook estructurados para todo el ciclo
  de vida del agente: inicio/finalización, cambios de fase, `prompt_rendered`,
  programación/resultados/actualizaciones de herramientas, notas y bloques de
  pensamiento del planificador, esperas, directivas de recuperación de
  `ToolFailure` y enlaces agente-como-herramienta.

- **Los almacenes de memoria** (`memory.Store`) se suscriben y añaden eventos de memoria duraderos (mensajes de usuario/asistente, llamadas a herramientas, resultados de herramientas, notas del planificador, pensamiento) por `(agentID, RunID)`.

- **El almacén del runtime** (`storage.Store`) es único y pertenece a la
  aplicación host. Añade registros que no pueden cambiar después de insertarse
  para cada `RunID`, destinados a las UIs de auditoría y depuración y a consultar
  ejecuciones. Sus métodos de ciclo de vida guardan el estado, checkpoint o
  cambio de cancelación junto con el registro inmutable correspondiente en una
  sola operación.

- **Los sinks de stream** (`stream.Sink`, por ejemplo Pulse o SSE/WebSocket personalizados) reciben valores `stream.Event` tipados producidos por el `stream.Subscriber`. Un `StreamProfile` controla qué tipos de eventos se emiten.

  La transcripción duradera conserva exactamente cada respuesta del proveedor
  seleccionada. Cuando un mensaje del asistente contiene una llamada a una
  herramienta, su texto permanece en la transcripción para reproducirlo ante el
  proveedor, pero no se emite como respuesta visible para el usuario. Los
  eventos de herramienta y de espera presentan ese paso no terminal. Solo los
  mensajes del asistente sin llamadas a herramientas producen eventos de texto
  del asistente confirmados.

- **Telemetría**: logging, métricas y trazas conscientes de OTEL instrumentan workflows y actividades de extremo a extremo.

### Display hints de llamada a herramienta (DisplayHint)

Las llamadas a herramientas pueden llevar un `DisplayHint` orientado al usuario (por ejemplo, para UIs).

Contrato:

- Los constructores de hooks no renderizan hints. Los eventos de programación de llamada a herramienta tienen `DisplayHint==""` por defecto.
- El runtime enriquece y persiste un hint duradero por defecto para la llamada en el momento de la publicación a partir de la plantilla tipada cuando la decodificación del payload tiene éxito.
- El registro de herramientas requiere un título de metadatos no vacío. Cuando falla la decodificación tipada o no hay plantilla registrada, el runtime usa ese título como display hint. Los payloads malformados siguen fallando en el límite de la herramienta; el título de metadatos solo mantiene renderizable el trabajo intentado. Los hints nunca se renderizan contra bytes JSON en bruto.
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
    runtimeStore,
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
- **Temporal**: Ejecución duradera, replay, reintentos de activities, señales y workers; los adaptadores conectan las activities y propagan el contexto

Los workflows de agente de Goa-AI tienen un solo intento. El runtime reintenta
activities individuales cuando sus contratos lo permiten, pero nunca reinicia
un workflow de agente completo después de un fallo. Ese reinicio podría repetir
efectos de herramientas o entrar en conflicto con el registro final que el
primer intento ya guardó.

### Tiempos semánticos vs liveness de Temporal

Goa-AI mantiene el contrato público del runtime agnóstico frente al motor:

- `RunPolicy.Timing.Plan` y `RunPolicy.Timing.Tools` son presupuestos semánticos por intento
- `runtime.WithTiming(...)` sustituye esos presupuestos semánticos para una ejecución
- Los clientes generados usan la cola predeterminada del agente. Pasa
  `runtime.WithTaskQueue("orchestrator.chat")` a una llamada de `Start` o `Run`
  cuando esa ejecución deba usar otra cola

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

### Contratos del adaptador de almacenamiento y finalización

El runtime registra una sola activity tipada llamada `runtime.store`. Cada
`StorageActivityCommand` establece exactamente uno de estos campos: `Append`,
`RootStart`, `ChildStart`, `OneShotStart`, `OneShotChildStart`, `Cancellation`,
`Suspension` o `Terminal`. El `StorageActivityResult` devuelto establece exactamente el campo
correspondiente y ningún otro. Los almacenes personalizados devuelven
`storage.ContractError` cuando repetir el mismo comando no puede funcionar. Los
fallos temporales de base de datos o red siguen siendo errores normales y se
pueden reintentar. `runtime.WithStorageActivityTimeout` fija el tiempo máximo
Start-to-Close de la activity y exige un valor mayor que cero.

`Engine.QueryRunCompletion` devuelve el `Status` actual de la ejecución. Cuando
la ejecución ya está cerrada, el mismo resultado también contiene su instante
estable `CompletedAt` y su `Output` final o `WorkflowError`.
`EnsureRunCompletion` usa `CompletedAt` como marca de tiempo del registro, por
lo que cada reintento envía el mismo valor. El error separado del método indica
que el motor no pudo recuperar esos datos. No existe otra consulta separada
para el estado.

La preparación del prompt de un hijo devuelve exactamente un `Success` o un
`Failure`. El éxito solo contiene los mensajes y los datos de los prompts
renderizados. El workflow obtiene la identidad de la ejecución hija, sesión,
padre, herramienta y etiquetas de la llamada original ya registrada. El motor
en memoria copia y limita la entrada y la salida y aplica la misma política de
reintentos que Temporal.

---

## Contratos de ejecución

- `SessionID` es obligatorio para los inicios con sesión. `Start` y `Run` fallan rápido cuando `SessionID` está vacío o en blanco
- `StartOneShot` y `OneShotRun` son explícitamente sin sesión. No requieren ni crean una sesión y no emiten eventos de stream con alcance de sesión
- El host crea las sesiones antes de enviar trabajo con sesión. Los runtimes de agentes no crean, terminan ni eliminan sesiones
- El motor acepta un workflow raíz antes de que su primera activity guarde la ejecución. El runtime no crea un registro `pending` antes de esa aceptación
- Repetir un inicio con el mismo ID de ejecución y exactamente la misma
  solicitud devuelve el workflow aceptado mientras el motor conserve un
  historial consultable. Reusar el ID con otra entrada se rechaza. Después de
  la retención del historial, la identidad permanente del comando pertenece al
  servicio del producto, no a Goa-AI
- Los inicios raíz, hijo y one-shot usan operaciones de almacenamiento distintas. Los inicios de hijos guardan juntos el vínculo con el padre y el inicio del hijo; los inicios one-shot guardan metadatos completos sin sesión
- Temporal termina un workflow hijo si su workflow padre se cierra primero
- Un hijo nuevo requiere un padre activo. Tanto `StartChildRun` como `StartOneShotChildRun` guardan juntos el vínculo con el padre y el inicio del hijo. Un reintento exacto ya aceptado sigue siendo válido después de que el padre se detenga; un reintento modificado o un hijo nuevo se rechazan
- El primer motivo de cancelación no cambia. Un reintento exacto tiene éxito y otro motivo para la misma ejecución produce un conflicto
- La suspensión y la finalización guardan el nuevo estado junto con el registro correspondiente, que no puede modificarse después
- Los payloads duraderos de `RunStarted`, `RunSuspended`, `RunCompleted` y `ChildRunLinked` deben contener exactamente un valor JSON del tipo correspondiente. Se rechazan los campos desconocidos y los valores JSON adicionales
- Los agentes deben registrarse antes de la primera ejecución. El runtime rechaza el registro después del envío de la primera ejecución con `ErrRegistrationClosed` para mantener deterministas a los workers del motor
- Los ejecutores de herramientas reciben metadatos explícitos por llamada (`ToolCallMeta`) en lugar de extraer valores de `context.Context`
- No confíes en fallbacks implícitos; todos los identificadores de dominio (ejecución, sesión, turno, correlación) deben pasarse explícitamente

### Garantizar el registro final y su entrega {#ensuring-a-final-record-and-its-delivery}

Los workflows normales reintentan las escrituras de suspensión y finalización
hasta que el almacenamiento del runtime las acepta. Un host puede usar dos
comandos explícitos después de que se cierre el historial del motor:

- `Runtime.EnsureRunCompletion(ctx, runID)` guarda una suspensión o un
  resultado final ausente cuando la ejecución todavía está activa en el
  almacenamiento. Si ya está cerrada, o si otro resultado final gana mientras
  se ejecuta el comando, valida y entrega exactamente el resultado guardado.
- `Runtime.EnsureChildRunLink(ctx, runID)` valida y entrega únicamente el
  vínculo exacto con el padre de una ejecución hija asociada a una sesión. Los
  hosts pueden llamarlo en orden de padres a hijos antes de entregar los
  resultados finales de hijos anidados.

`EnsureRunCompletion` entrega el vínculo con el padre antes del evento final de
un hijo. Las claves de evento estables hacen que repetir la entrega al stream
sea seguro, y un resultado ya guardado no produce otra notificación local del
ciclo de vida. Ninguno de los dos comandos cambia el resultado aceptado por el
almacenamiento.

Ambos comandos requieren `Runtime.WithStream` cuando el estado de la sesión
usado para la entrega es activo. `EnsureChildRunLink` obtiene el estado actual
mediante `LoadSessionStatus`. En cambio, `EnsureRunCompletion` usa el
`SessionStatus` devuelto junto con la escritura del registro final o su
reintento exacto. Una sesión recién comprobada como terminada conserva sus
registros y suprime la entrega. Si el almacenamiento aceptó el evento mientras
la sesión estaba activa, el evento sigue pendiente: terminar la sesión durante
los reintentos de esa misma llamada de entrega no lo cancela.

`EnsureRunCompletion` devuelve `ErrRunCompletionNotReady` si el motor aún
informa de un workflow activo. Devuelve `ErrRunCompletionCorrupt` si el
historial del motor o los datos de ciclo de vida guardados no pueden formar un
único resultado válido. Los errores al cargar el historial del motor se
devuelven al código que llamó al comando y nunca se guardan como fallo del
workflow.

Los métodos de listado e instantánea son de solo lectura y nunca llaman a estos
comandos. Los comandos no requieren una migración del esquema de la base de
datos ni cambian un formato público. Sí cambian la interfaz Go de los almacenes
personalizados, y los registros duraderos existentes deben respetar las formas
JSON tipadas y estrictas descritas en [Memoria y sesiones](../memory-sessions/#durable-event-json).

---

## Entrada externa y continuaciones de workflow

Cada entrada aceptada inicia un workflow de nivel superior. El workflow termina
con un resultado final o con un `api.RunSuspension` que contiene las solicitudes
pendientes visibles y un checkpoint privado. Ningún workflow permanece abierto
mientras una persona o un sistema externo prepara la respuesta.

La aplicación conserva el `RunSuspension` completo en almacenamiento de servidor
confiable y envía únicamente `RunSuspension.Pending` a la interfaz o al sistema
externo que debe responder. Nunca envía el checkpoint privado a un cliente no
confiable.

El servicio propietario debe aceptar una sola respuesta de forma atómica. A
continuación inicia un nuevo workflow con el ID de la ejecución completada, un
nuevo ID de ejecución, un nuevo ID de turno y una
`api.PendingInputResponse` que satisface el primer elemento pendiente:

Si la aceptación de la respuesta debe guardarse junto con datos del producto,
llama a `PrepareContinuation`, después a `MarshalBinary`, y guarda esos bytes
con la respuesta en una sola transacción. El proceso que inicia el workflow
carga los bytes, llama a `ParsePreparedRun` y pasa el valor restaurado a
`StartPrepared`. Usa `Continue` solo cuando no haya una escritura de la
aplicación entre la validación y el envío al motor.

```go
next, err := client.Continue(
    ctx,
    "session-1",
    previous.RunID,
    "run-124",
    "turn-2",
    response,
    runtime.WorkflowOptions{},
)
```

La continuación restaura los mensajes, la política, las etiquetas, el
presupuesto de tiempo activo restante y la procedencia exacta de llamadas y
resultados. Los llamadores no pueden reemplazar esos valores.

### Proporcionar resultados externos de herramientas

Algunas esperas se reanudan con **resultados de herramientas proporcionados por un actor externo** en lugar de por `ExecuteToolActivity` directamente. Ejemplos habituales son las herramientas controladas por la UI, como las preguntas estructuradas, o los servicios puente que recopilan resultados de otro sistema y luego despiertan la ejecución.

Construye una respuesta tipada y pásala a `AgentClient.Continue`:

```go
response := &api.PendingInputResponse{
    ToolResults: &api.ToolResultsSet{
        ID: "await-1",
        Results: []*api.ProvidedToolResult{
            {
                Name:       "chat.ask_question.ask_question",
                ToolCallID: pending.Await.ExternalTools.Items[0].ToolCallID,
                Success: &api.ProvidedToolSuccess{
                    Result: rawjson.Message(`{"answers":[{"question_id":"topic","selected_ids":["alarms"]}]}`),
                },
            },
        },
    },
}
```

Al preparar la continuación, la aplicación solo pasa el ID de la ejecución
completada y la respuesta tipada. Goa-AI carga el checkpoint, valida su versión
y la solicitud pendiente, restaura los payloads guardados con los codecs
generados actuales y reanuda la planificación. Los bytes de `PreparedRun`
pueden contener una copia de ese checkpoint y la transcripción completa.
Guárdalos únicamente en almacenamiento de aplicación confiable y con acceso
controlado; nunca los envíes a un cliente no confiable.

El único formato aceptado es `goa-ai.run-suspension.v8`. La versión ocho guarda
los nombres de las herramientas anunciadas cuando un plan de recuperación
aceptado espera una entrada: los nombres de las herramientas fallidas no bastan
para reconstruir las otras opciones ofrecidas en ese turno. La continuación
conserva esas opciones y sigue comprobando la definición actual del agente y la
política de ejecución.

Goa-AI rechaza todas las versiones anteriores del checkpoint. Antes de
actualizar, termina el trabajo guardado con el formato anterior en el runtime
que lo posee. Si debe quedar trabajo sin terminar, el host debe decidir
explícitamente cómo conservarlo y si seguirá siendo reanudable; este runtime
no puede reanudarlo. El framework no proporciona un comando de conversión ni
elimina, cancela o reescribe automáticamente el trabajo guardado.

- Los llamadores proporcionan exactamente uno de estos valores: `Success`, con
  el **JSON de resultado canónico en bruto** y `Bounds` opcional, o `Failure`,
  con `Kind`, `Message`, `Action` e `Issues` opcionales.
- Los llamadores **no** construyen `api.ToolEvent`; ese es el sobre interno del workflow del runtime.
- Para un resultado correcto, el runtime lo decodifica usando la especificación
  registrada de la herramienta, ejecuta la materialización tipada, adjunta
  cualquier sidecar solo del servidor y añade el `tool_result` canónico a la
  transcripción y al run log.
- Para un fallo, el runtime combina los hechos externos con la llamada esperada
  y los metadatos registrados para construir un `planner.ToolFailure`
  canónico. Solo entonces reanuda la planificación.

Cuando una respuesta completa una llamada de herramienta creada por el modelo
en el workflow anterior, el nuevo evento `tool_end` incluye dos identidades:

- su ID de ejecución normal identifica el nuevo workflow que recibió la
  respuesta; y
- `call_run_id` identifica el workflow anterior que emitió el `tool_start`.

Los consumidores del stream deben emparejar esos eventos con `call_run_id` y el
ID de la llamada. No deben buscar ejecuciones anteriores ni suponer que llamada
y resultado pertenecen al mismo workflow.

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
  "tool_name": "facility.commands.change_setpoint",
    "tool_call_id": "toolcall-1",
    "payload": { "...": "canonical tool arguments (JSON)" }
  }
  ```

Contrato:

- `payload` siempre contiene los argumentos JSON canónicos de la herramienta para la llamada pendiente. Si se aprueba, esos son los argumentos que ejecuta el runtime.
- Los overrides de confirmación pueden personalizar el prompt y el renderizado del resultado denegado, pero no introducen un canal separado de payload de visualización ni cambian el significado de `payload`.
- Los productos que necesiten una UI de confirmación más rica deben materializarla en la capa de aplicación a partir del payload canónico y de lecturas propias de la aplicación.

- **Respuesta de continuación**:

  ```go
  response := &api.PendingInputResponse{
      Confirmation: &api.ConfirmationDecision{
          ID:          "await-1",
          Approved:    true, // or false
          RequestedBy: "user:123",
          Labels:      map[string]string{"source": "front-ui"},
          Metadata:    map[string]any{"ticket_id": "INC-42"},
      },
  }
  ```

### Eventos de autorización de herramienta

Cuando se proporciona una decisión, el runtime emite un evento de autorización de primer orden:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

Este evento es el registro canónico "quién/cuándo/qué" para una llamada de herramienta confirmada:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (resumen determinista renderizado por el runtime)
- `approved_by` (copiado de `api.ConfirmationDecision.RequestedBy`, pensado como identificador de principal estable)

El evento se emite inmediatamente tras recibirse la decisión (antes de la ejecución de la herramienta cuando se aprueba, y antes de sintetizar el resultado denegado cuando se rechaza).

Notas:

- Los consumidores deben tratar la confirmación como un protocolo de runtime:
  - Muestra el primer elemento pendiente cuando su tipo sea `confirmation` y
    envía la decisión con `AgentClient.Continue`.
  - No acoples el comportamiento de la UI a un nombre específico de herramienta de confirmación; trátalo como un detalle interno de transporte.
- Las plantillas de confirmación (`PromptTemplate` y `DeniedResultTemplate`) son cadenas Go `text/template` ejecutadas con `missingkey=error`. Además de las funciones de plantilla estándar (por ejemplo, `printf`), Goa-AI proporciona:
  - `json v` → codifica `v` como JSON (útil para campos puntero opcionales o incrustar valores estructurados).
  - `quote s` → devuelve una cadena Go-escaped entre comillas (como `fmt.Sprintf("%q", s)`).

### Validación en runtime

El runtime valida las interacciones de confirmación en la frontera:

- El `ID` de confirmación coincide con el identificador del elemento pendiente.
- La continuación contiene exactamente una variante de respuesta y una decisión
  bien formada.

---

## Contrato del planificador

Los planificadores implementan:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contiene llamadas a herramientas, una respuesta final, un resultado de herramienta final, anotaciones y la transición posterior a herramientas seleccionada. `PlanResumeInput` indica al planner por qué se le llama.

Estos contratos son independientes:

| Contrato | Alcance | Significado sencillo |
| --- | --- | --- |
| `ToolSpec.Tags` | Una herramienta, para cada ejecución | Etiquetas planas disponibles para el filtrado genérico de políticas y UI. |
| `ToolSpec.Meta` | Una herramienta, para cada ejecución | Anotaciones generadas e inertes cuyas semánticas pertenecen al consumidor identificado; los metadatos por sí solos no cambian el runtime. |
| `ToolSpec.Bookkeeping` | Una herramienta, para cada ejecución | La llamada es un registro de control duradero cuyo éxito no necesita otro turno del planner. No consume presupuesto de recuperación ni de fallos consecutivos. |
| `ToolSpec.TerminalRun` | Una herramienta, para cada ejecución | La ejecución correcta finaliza por sí misma la ejecución e implica automáticamente bookkeeping. |
| `ToolFailure.Recovery.Action` | Un resultado fallido | Selecciona la corrección manteniendo disponible la herramienta fallida, la replanificación sin ella o la finalización. |
| `PlanResult.SynthesizeAfterTools` | Un lote seleccionado | Si el lote no tiene un fallo recuperable, el siguiente turno del planner debe responder. |
| `PlanResumeInput.SynthesisOnly` | Una actividad del planner | Devuelve una respuesta final; las llamadas a herramientas no son válidas. |
| `PlanResumeInput.Finalize` | Finalización forzada por el runtime | Un límite o deadline ha prohibido el trabajo normal. |

El runtime elige un único estado siguiente en este orden:

| Paso completado | Estado siguiente |
| --- | --- |
| Un límite o deadline exige finalización | Turno `Finalize` |
| Se completó una herramienta `TerminalRun` correcta | Finaliza inmediatamente |
| Algún resultado fallido tiene `AllowsToolTurn() == true` | Turno normal de recuperación |
| `SynthesizeAfterTools` es true | Turno `SynthesisOnly` |
| En otro caso | Turno normal de continuación |

Esto evita que la intención del planner se convierta en una segunda política de reintentos. Un fallo recuperable se repara primero; un lote final correcto o con fallo terminal pasa a síntesis. El runtime rechaza las llamadas a herramientas devueltas desde un turno `SynthesisOnly`.

Cada `ToolFailure` recuperable también selecciona una `Recovery.Action`:

- `correct_call` mantiene disponible la herramienta que falló y entrega al
  siguiente turno del planner la entrada rechazada, los problemas de validación
  generados, la guía de campos y un ejemplo. No exige una llamada de reemplazo
  por cada fallo. El planner puede combinar trabajo, realizar cualquier número
  de llamadas válidas a herramientas anunciadas, esperar una entrada o responder
  con la evidencia ya recopilada.
- `replan` elimina la herramienta que falló del siguiente turno del planner. El
  planner puede usar otra herramienta anunciada, esperar una entrada o responder.
- `finish` elimina todas las herramientas y exige una respuesta final basada en
  la evidencia disponible.

Un turno normal de `correct_call` combina las herramientas ejecutables del
agente actual con los contratos exactos de las herramientas fallidas. Elimina
duplicados cuando coinciden los nombres y contratos; los contratos en conflicto,
los registros de ejecución ausentes y las herramientas revocadas producen un
error antes de llamar al modelo. Siguen aplicándose las restricciones del
llamador, las de etiquetas de la ejecución y las exclusiones de recuperación.
Una herramienta de corrección denegada provoca un error; el runtime no la
descarta silenciosamente ni la restaura después del filtrado. La autorización
en el servicio ejecutor sigue comprobando cada llamada.

Las consultas sin terminar conservan sus acciones de continuación generadas
por el runtime; las solicitudes fallidas no crean continuaciones. La
finalización forzada solo ofrece para corrección la herramienta terminal exacta
que falló, y los turnos de solo síntesis siguen sin herramientas. Después de la
corrección, los turnos normales vuelven a las herramientas del agente actual.

El runtime registra el catálogo exacto de herramientas mostrado en un turno de
recuperación y rechaza cualquier llamada ejecutable que quede fuera de él,
incluidas las llamadas incorporadas en una solicitud de entrada del usuario o
de un sistema externo. Los codecs generados siguen validando cada payload, y
los límites de herramientas, fallos y tiempo de la ejecución siguen deteniendo
el trabajo inválido repetido. Si un turno de recuperación espera una entrada,
su evidencia de fallo sigue disponible cuando la ejecución continúa; elegir
una llamada o una respuesta final elimina esa evidencia.

Las entradas de las actividades de recuperación y su catálogo anunciado forman
parte del historial duradero del workflow. Un despliegue que cambie este
contrato debe drenar o detener los workers antiguos y los workflows en curso
antes de iniciar el nuevo conjunto de workers. No es seguro mezclar versiones
de workers a través de este límite.

Cuando `PlanResumeInput.Finalize` está presente, los planners pueden devolver herramientas terminales de bookkeeping; esas llamadas no se reproducen en un turno posterior del planner y deben terminar la finalización de forma duradera.

Los planificadores también reciben un `PlannerContext` a través de `input.Agent` que expone servicios del runtime:
- `AdvertisedToolDefinitions()` - obtén las definiciones de herramientas filtradas por el runtime y visibles para el modelo en este turno
- `ModelClient(id string)` - obtén un cliente de modelo crudo agnóstico del proveedor
- `PlannerModelClient(id string)` - obtén un cliente de modelo con alcance de planificador y emisión de eventos gestionada por el runtime
- `RenderPrompt(ctx, id, data)` - resuelve y renderiza contenido de prompt para el scope actual de la ejecución
- `AddReminder(r reminder.Reminder)` - registra recordatorios del sistema con alcance de ejecución
- `RemoveReminder(id string)` - limpia recordatorios cuando las precondiciones dejan de cumplirse
- `Memory()` - accede al historial de conversación

### Preparar los mensajes de conversación {#preparing-conversation-messages}

`PlanInput` y `PlanResumeInput` requieren
`PrepareMessages func() ([]*model.Message, error)`; ya no tienen un campo
`Messages` alternativo. Antes de leer, inspeccionar o transformar el historial,
incluidos los prompts y recordatorios, el planificador debe llamar a
`PrepareMessages()` y comprobar el error. Esto también se aplica al código que
usa mensajes sin llamar a un modelo. Solo las rutas que no necesitan mensajes
pueden omitirlo; en ellas no se ejecuta la política de historial ni sus
recuentos de tokens o resúmenes.

La primera llamada aplica la política a los mensajes y las herramientas
anunciadas con el contexto y el plazo de la actividad. Su cancelación detiene
el recuento de tokens y el resumen. El runtime proporciona la función incluso
sin una política configurada. Las llamadas posteriores, incluso concurrentes, reciben el mismo
slice, los mismos punteros a mensajes y el mismo error durante esa invocación
del planificador. El llamador debe coordinar cualquier modificación concurrente
del slice o de sus mensajes. La función no debe guardarse para después: todas
las llamadas deben terminar antes de que `PlanStart` o `PlanResume` retorne.
Un error de preparación hace fallar la actividad aunque el planificador lo
ignore; el runtime no acepta una decisión basada en historial sin preparar.
Ese error original conserva su clasificación y tiene prioridad sobre errores
posteriores del planificador o del modelo, sin convertirse en recuperación de
salida del modelo. El mismo intento no vuelve a ejecutar una preparación fallida.
La reproducción de una actividad ya completada usa
su resultado guardado sin repetir la preparación. Cada nuevo intento o
invocación prepara sus propios mensajes. El historial guardado, las reglas de
compresión y los límites no cambian.

---

## Módulos de características

- `runtime/agent/storage/inmem` – almacenamiento integrado en memoria para ejemplos y pruebas

- `runtime/mcp` – callers MCP para HTTP y stdio; HTTP acepta respuestas JSON y flujos de eventos
- `features/memory/mongo` – almacén de memoria duradera
- `features/prompt/mongo` – almacén de overrides de prompts respaldado por Mongo
- `features/stream/pulse` – helpers de sink/subscriber de Pulse
- `features/model/{anthropic,bedrock,openai}` – adaptadores de cliente de modelo para planificadores
- `features/model/middleware` – middlewares compartidos de `model.Client` (por ejemplo, limitación de velocidad adaptativa)
- `features/policy/basic` – motor de políticas simple con listas de allow/block y tratamiento de `ToolFailure`

### Throughput y rate limiting del cliente de modelo

Goa-AI incluye un limitador de velocidad adaptativo y agnóstico del proveedor
en `features/model/middleware`. Envuelve cualquier `model.Client`, exige el
recuento exacto de tokens de entrada, encola a los llamadores y ajusta su
presupuesto efectivo de tokens por minuto mediante AIMD cuando el proveedor
reporta throttling. No estima tokens ni mide cuotas de salida.

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
})
if err != nil {
    panic(err)
}

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited, err := rl.Middleware()(bed)
if err != nil {
    panic(err)
}

rt := runtime.New(runtimeStore)
if err := rt.RegisterModel("bedrock", limited); err != nil {
    panic(err)
}
```

La construcción del middleware no comprueba el soporte de recuento. Si el
proveedor o la solicitud no se puede contar exactamente, la primera llamada
`Complete` o `Stream` devuelve `model.ErrTokenCountingUnsupported` antes de la
inferencia. Vertex Gemini permite el recuento exacto; Bedrock solo admite las
solicitudes y modelos aceptados por Runtime `CountTokens`, y OpenAI no tiene un
contador nativo.

---

## Integración LLM

Los planificadores de Goa-AI interactúan con grandes modelos de lenguaje a través de una **interfaz agnóstica frente al proveedor**. Este diseño te permite intercambiar proveedores —AWS Bedrock, OpenAI, Google Vertex AI (Gemini y Claude-on-Vertex) o endpoints personalizados— sin cambiar el código de tu planificador.

### La interfaz model.Client

Todas las interacciones con LLMs pasan por la interfaz `model.Client`:

```go
type Client interface {
    Complete(ctx context.Context, req *Request) (*Response, error)
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

Las llamadas completas a herramientas deben cumplir su esquema anunciado y el
decodificador generado asociado, si lo hay, antes de que el planner las observe.
Los metadatos permiten explicar infracciones independientes de campos obligatorios,
tipos, enumeraciones o longitud de arrays. Un límite de array es inclusivo y se
aplica a ese array, no a toda la ejecución:
`Field "items" must contain at most 3 items.`

El runtime sigue restricciones obligatorias independientes, incluido `allOf`, y
solo la rama de unión elegida por un discriminador válido. No convierte ramas
alternativas de `anyOf`, candidatos de `contains` ni comprobaciones de nombres de
propiedades en requisitos para cambiar cada valor correspondiente. Los índices
y las claves de mapas aparecen como `*`; los campos no declarados se señalan
en su objeto padre sin repetir el nombre enviado.

Las instrucciones se ordenan y deduplican. Se omiten instrucciones distintas para
la misma ruta mostrada, sin intentar combinar sus restricciones. Las instrucciones
útiles de otros campos se conservan aunque otras sean ambiguas, no compatibles o
demasiado grandes. Cada instrucción, con su descripción y enumeraciones, se incluye
entera dentro del límite de bytes; una corrección parcial indica que no detalla
otros errores. Si no cabe ninguna, la guía es genérica. Los argumentos siguen
rechazados antes de ejecutarse; Goa-AI no los divide, recorta ni reescribe. Los
errores originales, las reglas de aceptación y el límite de recuperación no cambian.

Ante un rechazo del esquema o una validación tipada de los argumentos que admita
corrección, el cliente del modelo puede añadir el ejemplo de entrada completo y
validado después de la indicación sobre el campo. Copia el ejemplo junto con el
contrato de validación de la solicitud antes de llamar al modelo; una modificación
posterior de la solicitud no puede sustituirlo. La instrucción adjunta pide al
modelo que elija valores y una rama válida de la unión adecuados para la
solicitud, en lugar de copiar los valores de muestra.

La corrección completa debe caber en el límite existente de 4.096 bytes por cada
invocación del modelo rechazada, incluidos la instrucción, el ejemplo y los bytes
UTF-8. Si el ejemplo falta o es demasiado grande, la indicación sobre el campo
no cambia; el ejemplo se omite entero, nunca se trunca. El límite afecta al
contexto opcional de corrección, no a los argumentos. La validación, los
diagnósticos de respuestas rechazadas, el historial aceptado, las herramientas
disponibles y el límite de turnos de recuperación no cambian; los argumentos
nunca se reparan y no se añade ningún reintento. Consulta el
[contrato del framework](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#model-visible-tool-arguments).

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

**Google Vertex AI (Gemini y Claude-on-Vertex)**

El paquete `features/model/vertex` incluye dos constructores que satisfacen
ambos `model.Client`: un adaptador nativo de Gemini y un helper de
construcción pura que apunta el adaptador de Anthropic a los modelos Claude
alojados en Vertex.

```go
import "goa.design/goa-ai/runtime/agent/runtime"

// Gemini en Vertex, usando Application Default Credentials.
geminiClient, err := rt.NewVertexGeminiModelClient(ctx, runtime.VertexConfig{
    ProjectID:      "my-gcp-project",
    Location:       "us-central1",
    DefaultModel:   "gemini-2.5-flash",
    HighModel:      "gemini-3-pro-preview",
    SmallModel:     "gemini-2.5-flash-lite",
    MaxTokens:      4096,
    ThinkingBudget: 10000,
})

// Claude en Vertex. Esto es construcción pura: crea un cliente del SDK de
// Anthropic sobre el transporte Vertex del SDK y se lo entrega a
// features/model/anthropic, que posee la traducción de Messages y la
// clasificación de errores HTTP para todos los adaptadores alojados por
// Anthropic (API directa y Vertex) — sin capa de traducción separada.
claudeOnVertexClient, err := rt.NewVertexAnthropicModelClient(ctx, runtime.VertexConfig{
    ProjectID:    "my-gcp-project",
    Location:     "us-east5",
    DefaultModel: "claude-sonnet-4-5@20250929",
})
```

Los modelos de la generación Gemini 3 adjuntan una **thought signature** opaca
a las partes `functionCall` (no solo a las partes thought/thinking) para
autenticar la cadena de razonamiento detrás de una llamada a herramienta. El
adaptador de Vertex hace el round-trip de esta firma a través de
`model.ToolCall.ThoughtSignature` / `model.ToolUsePart.ThoughtSignature`
usando la misma convención base64 que `ThinkingPart.Signature`. El runtime
captura esta firma en la frontera del model-client —antes de que cualquiera
de los dos estilos de integración de abajo produzca un `planner.ToolRequest`—
y la vuelve a adjuntar por ID de llamada a herramienta al reconstruir el
transcript orientado al proveedor. `planner.ToolRequest` nunca lleva un campo
de firma; el código del planner no necesita saber que las firmas existen.

### Metadatos canónicos y replay de citas

`model.Message.Meta` contiene datos producidos por el proveedor necesarios para
reproducir una respuesta con exactitud. Las fronteras que persisten o
transportan metadatos deben usar `model.MarshalMetadata` y
`model.UnmarshalMetadata`. Estos codecs exigen un único objeto JSON, conservan
los números decodificados como `json.Number`, rechazan datos posteriores y
canonicalizan nil o un objeto vacío a nil.

El replay de citas es específico de cada proveedor y nunca debe aplanarlas como
texto ordinario. El adaptador de Bedrock puede reproducir valores
`CitationsPart` del asistente como bloques nativos de citas, preservando la
identidad de la fuente, los extractos y las ubicaciones del documento por
caracteres, chunks o páginas. Las citas de sistema de Bedrock siguen sin estar
soportadas porque su unión de contenido de sistema no incluye citas. Anthropic
y Vertex rechazan el replay cuando la parte canónica carece de campos exigidos
por el protocolo del proveedor.

### Uso de clientes de modelo en planificadores

Los planificadores obtienen clientes de modelo a través del `PlannerContext` del runtime. Hay dos estilos de integración explícitos:

- `PlannerModelClient(id)` para streaming con alcance de planificador y emisión de eventos gestionada por el runtime
- `ModelClient(id)` cuando necesitas acceso directo al modelo validado y drenarás el stream devuelto con `planner.ConsumeStream`

#### PlannerModelClient (recomendado)

`PlannerContext.PlannerModelClient(id)` devuelve un cliente con alcance de planificador que es responsable de emitir `AssistantChunk`, `PlannerThinkingBlock` y `UsageDelta`. Su método `Stream(...)` drena el stream del proveedor subyacente y devuelve un `planner.StreamSummary`:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc, ok := input.Agent.PlannerModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    if !ok {
        return nil, errors.New("model not configured")
    }

    messages, err := input.PrepareMessages()
    if err != nil {
        return nil, err
    }
    req := &model.Request{
        Messages: messages,
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
    final := sum.FinalResponse()
    if final == nil {
        return nil, errors.New("model stream ended without a canonical response")
    }
    return &planner.PlanResult{
        FinalResponse: final,
        Streamed: true, // El texto del asistente ya fue transmitido
    }, nil
}
```

Este es el estilo de integración más seguro porque el cliente con alcance de
planificador no expone un `model.Streamer` crudo, por lo que no puede combinarse
accidentalmente con `planner.ConsumeStream`. Devolver `sum.FinalResponse()`
también selecciona la respuesta exacta del proveedor capturada para esa
invocación; reconstruir un mensaje de solo texto descartaría el razonamiento,
las citas, las firmas, los metadatos y los límites de los mensajes.

#### Cliente validado + ConsumeStream

Cuando necesites acceso directo a `model.Client`, obténlo desde
`PlannerContext.ModelClient` y combina su stream validado con
`planner.ConsumeStream`:

```go
mc, ok := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
if !ok {
    return nil, errors.New("model not configured")
}
messages, err := input.PrepareMessages()
if err != nil {
    return nil, err
}
req := &model.Request{
    Messages: messages,
    Tools:    input.Agent.AdvertisedToolDefinitions(),
    Stream:   true,
}
stream, err := mc.Stream(ctx, req)
if err != nil {
    return nil, err
}
sum, err := planner.ConsumeStream(ctx, stream)
if err != nil {
    return nil, err
}
if len(sum.ToolCalls) > 0 {
    return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
}
final := sum.FinalResponse()
if final == nil {
    return nil, errors.New("model stream ended without a canonical response")
}
return &planner.PlanResult{
    FinalResponse: final,
    Streamed:      true,
}, nil
```

Este helper solo drena el stream y devuelve un `StreamSummary` con el texto y
las llamadas a herramientas acumulados. El registro de invocaciones del modelo
del runtime publica después los eventos de presentación y uso aceptados.

Usa la ruta del cliente directo cuando el planificador deba examinar fragmentos
de vista previa validados o hacer varias llamadas al modelo en un mismo turno.
Drena cada stream seleccionado hasta su resultado terminal; cerrarlo antes no
produce una respuesta aceptada. El `PlanResult` devuelto debe reenviar un único
resultado exacto: el conjunto completo `ToolCalls` del resumen o su
`FinalResponse()`. El runtime rechaza resultados modificados, mezclados o
ambiguos. No mezcles `PlannerModelClient.Stream(...)` con
`planner.ConsumeStream`; elige un único propietario del stream por turno del
planificador.

### Retención exacta y cobertura del resumen

La política se aplica al llamar a
[`PrepareMessages`](#preparing-conversation-messages), no antes de cada
invocación del planificador.

Con `CompressAtMaxInputTokens` positivo, un único resumen recibe todos los turnos
anteriores al más reciente. El runtime cuenta juntos los mensajes de sistema,
el resumen real, los turnos completos elegibles y las herramientas actuales. Si
supera el límite, elimina el turno opcional más antiguo y vuelve a contar hasta
encontrar la secuencia final más larga que quepa. La igualdad con el límite es
válida. El turno más reciente nunca se resume ni se divide. `KeepMaxTurns` y
`KeepMaxInputTokens` siguen limitando la retención elegible; el resumen cuenta
contra el límite total, no contra la asignación adicional para turnos antiguos.

Cada turno eliminado ya se entregó al modelo de resumen. Algunos turnos pueden
aparecer tanto en el resumen como en el historial exacto, sin volver a ejecutar
sus herramientas. Esto no garantiza que el modelo interprete correctamente
hechos repetidos o contradictorios. Para `K` turnos elegibles hay como máximo
`K` recuentos finales, además de las comprobaciones iniciales. La entrada más
amplia y los recuentos adicionales pueden aumentar coste y latencia; no se añade
otra llamada de resumen. Si ni siquiera el resumen y el turno más reciente caben,
o falla un recuento o el resumen, la política devuelve el historial original
junto con el error. Ese historial no es una alternativa válida para planificar:
el error de `PrepareMessages()` hace fallar la actividad, sin soluciones
alternativas ni reinicio automático.

Sin límite total, el resumen sigue cubriendo solo el prefijo excluido: no cambian
los turnos conservados ni se añaden solapamientos o recuentos finales. Con límite
positivo, actualiza los prompts personalizados de `WithSummaryPrompt` que digan
"solo historial descartado" para referirse al historial antiguo suministrado.
El enfoque elegido, `%s`, los signos de porcentaje escapados, el modelo y el rol
no cambian; no hay nueva configuración ni migración del historial guardado.
Consulta el [contrato completo en inglés](https://goa.design/docs/2-goa-ai/runtime/#exact-retention-and-summary-coverage).

### Evidencia disponible para el modelo de resumen

`Compress` entrega los mensajes antiguos seleccionados como evidencia, no como
una conversación que deba continuar. Cita el texto, los argumentos y resultados
completos de las herramientas, sus identificadores, el estado y texto completo
de los errores y los campos de las citas mediante el formato JSON canónico de
`model.Message`. Conserva los roles, las posiciones y el orden, sin seleccionar,
redondear ni eliminar valores repetidos. El modelo decide qué datos son relevantes.

`WithSummaryPrompt` sigue insertando la transcripción textual completa en `%s`.
Las imágenes y los documentos se adjuntan una sola vez como contenido nativo en
la misma llamada: un mensaje de adjuntos por cada mensaje de usuario original
que contenía archivos, con referencias a sus posiciones. No se ofrecen
herramientas para ejecutar ni se extraen o recuperan documentos. `Message.Meta`,
el razonamiento, los puntos de control de caché y las firmas de razonamiento de
herramientas no se copian a esta nueva petición. El historial original, los
mensajes conservados sin cambios, los diagnósticos y los errores completos
permanecen intactos.

El resumen mantiene su rol y formato textual. Conserva las frases citadas y
todos sus campos de atribución, en orden, como registros citados. Las coordenadas
pertenecen a la petición que las produjo. Si el nuevo resumen contiene citas y
usó documentos nativos, incluye una descripción de su disposición, sin cuerpos
de documentos, reasignar `DocumentIndex` ni inventar enlaces.

La cobertura y la retención siguen las reglas anteriores; el modelo, los límites
y la única llamada de resumen se mantienen. El contenido no compatible o una
petición de resumen demasiado grande falla explícitamente, sin descartar evidencia
ni generar otro resumen. Los adjuntos no añaden un recuento separado.
Recibir toda la evidencia no garantiza que el modelo conserve todos los hechos.
Consulta el [contrato completo en inglés](https://goa.design/docs/2-goa-ai/runtime/#evidence-supplied-to-the-summary-model).

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
