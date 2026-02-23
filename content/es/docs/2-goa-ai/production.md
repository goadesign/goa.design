---
title: "Producción"
linkTitle: "Producción"
weight: 8
description: "Set up Temporal for durable workflows, stream events to UIs, apply adaptive rate limiting, and use system reminders."
llm_optimized: true
aliases:
---

## Model Rate Limiting

Todos los proveedores de modelos aplican límites de velocidad. Sobrepásalos y tus peticiones fallarán con 429 errores. Peor aún: en un despliegue de múltiples réplicas, cada réplica martillea la API de forma independiente, causando una limitación *agregada* que es invisible para los procesos individuales.

### El problema

**Escenario:** Despliegas 10 réplicas de tu servicio de agente. Cada réplica piensa que tiene 100K tokens/minuto disponibles. Combinadas, envían 1M de tokens/minuto - 10 veces su cuota real. El proveedor estrangula agresivamente. Las solicitudes fallan aleatoriamente en todas las réplicas.

**Sin limitación de velocidad:**
- Las solicitudes fallan de forma impredecible con 429s
- No hay visibilidad de la capacidad restante
- Los reintentos empeoran la congestión
- La experiencia del usuario se degrada bajo carga

**Con limitación adaptativa de velocidad:**
- Cada réplica comparte un presupuesto coordinado
- Las solicitudes se ponen en cola hasta que hay capacidad disponible
- El backoff se propaga por todo el clúster
- Degradación gradual en lugar de fallos

### Visión general

El paquete `features/model/middleware` proporciona un **limitador de tasa adaptativo estilo AIMD** que se sitúa en el límite del cliente modelo. Estima el coste de los tokens, bloquea las llamadas hasta que hay capacidad disponible y ajusta automáticamente su presupuesto de tokens por minuto en respuesta a las señales de limitación de velocidad de los proveedores.

### Estrategia AIMD

El limitador utiliza una estrategia **Aumento Aditivo/Disminución Multiplicativa (AIMD)**:

| Evento | Acción | Fórmula |
|-------|--------|---------|
| Éxito | Sonda (incremento aditivo) | `TPM += recoveryRate` (5% del inicial) |
| `ErrRateLimited` | Backoff (disminución multiplicativa) | `TPM *= 0.5` |

El número efectivo de tokens por minuto (TPM) está limitado por:
- **Mínimo**: 10% del TPM inicial (mínimo para evitar la inanición)
- **Máximo**: El límite máximo configurado `maxTPM`

### Uso Básico

Crear un único limitador por proceso y envolver su cliente modelo:

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/goa-ai/features/model/bedrock"
)

func main() {
    ctx := context.Background()

    // Create the adaptive rate limiter
    // Parameters: context, rmap (nil for local), key, initialTPM, maxTPM
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        nil,     // nil = process-local limiter
        "",      // key (unused when rmap is nil)
        60000,   // initial tokens per minute
        120000,  // maximum tokens per minute
    )

    // Create your underlying model client
    bedrockClient, err := bedrock.NewClient(bedrock.Options{
        Region: "us-east-1",
        Model:  "anthropic.claude-sonnet-4-20250514-v1:0",
    })
    if err != nil {
        panic(err)
    }

    // Wrap with rate limiting middleware
    rateLimitedClient := limiter.Middleware()(bedrockClient)

    // Use rateLimitedClient with your runtime or planners
    rt := runtime.New(
        runtime.WithModelClient("claude", rateLimitedClient),
    )
}
```

### Cluster-Aware Rate Limiting

Para despliegues multiproceso, coordine la limitación de velocidad entre instancias utilizando un mapa replicado Pulse:

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()

    // Create a Pulse replicated map backed by Redis
    rm, err := rmap.NewMap(ctx, "rate-limits", rmap.WithRedis(redisClient))
    if err != nil {
        panic(err)
    }

    // Create cluster-aware limiter
    // All processes sharing this map and key coordinate their budgets
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        rm,
        "claude-sonnet",  // shared key for this model
        60000,            // initial TPM
        120000,           // max TPM
    )

    // Wrap your client as before
    rateLimitedClient := limiter.Middleware()(bedrockClient)
}
```

Cuando se utiliza la limitación basada en clústeres:
- **Backoff se propaga globalmente**: Cuando cualquier proceso recibe `ErrRateLimited`, todos los procesos reducen su presupuesto
- **Las solicitudes se coordinan**: Las peticiones exitosas incrementan el presupuesto compartido
- **Conciliación automática: Los procesos vigilan los cambios externos y actualizan sus limitadores locales

### Estimación de fichas

El limitador estima el coste de la petición utilizando una heurística simple:
- Cuenta los caracteres de las partes de texto y los resultados de la herramienta de cadenas
- Convierte a tokens utilizando ~3 caracteres por token
- Añade un búfer de 500 tokens para los avisos del sistema y los gastos generales del proveedor

Esta estimación es intencionadamente conservadora para evitar una infravaloración.

### Integración con el tiempo de ejecución

Cablear clientes con velocidad limitada en el tiempo de ejecución de Goa-AI:

```go
// Create limiters for each model you use
claudeLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 60000, 120000)
gptLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 90000, 180000)

// Wrap underlying clients
claudeClient := claudeLimiter.Middleware()(bedrockClient)
gptClient := gptLimiter.Middleware()(openaiClient)

// Configure runtime with rate-limited clients
rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithModelClient("claude", claudeClient),
    runtime.WithModelClient("gpt-4", gptClient),
)
```

### Qué ocurre bajo carga

| Nivel de Tráfico | Sin Limitador | Con Limitador | Con Limitador
|---------------|-----------------|--------------|
| Por debajo de la cuota, las solicitudes tienen éxito
| Por encima de la cuota: 429 fallos aleatorios
| Ráfaga por encima de la cuota Cascada de fallos, bloqueos del proveedor Backoff absorbe la ráfaga, recuperación gradual
| Sobrecarga sostenida Todas las peticiones fallan Cola de peticiones con latencia limitada

### Parámetros de ajuste

| Parámetro por defecto Descripción
|-----------|---------|-------------|
| `initialTPM` | (requerido) | Presupuesto inicial de tokens-por-minuto |
| `maxTPM` | (requerido) | Techo para sondeo |
| Suelo | 10% del inicial | Presupuesto mínimo (evita la inanición) | Tasa de recuperación | 5% del inicial
| Tasa de recuperación: 5% de la inicial. Incremento aditivo por éxito
| Factor de retroceso 0,5 Disminución multiplicativa en 429

**Ejemplo:** Con `initialTPM=60000, maxTPM=120000`:
- Suelo: 6.000 TPM
- Recuperación: +3,000 TPM por lote exitoso
- Backoff: reducir a la mitad el TPM actual en 429

### Monitorización

Seguimiento del comportamiento del limitador de velocidad con métricas y registros:

```go
// The limiter logs backoff events at WARN level
// Monitor for sustained throttling by tracking:
// - Wait time distribution (how long requests queue)
// - Backoff frequency (how often 429s occur)
// - Current TPM vs. initial TPM

// Example: export current capacity to Prometheus
currentTPM := limiter.CurrentTPM()
```

### Mejores prácticas

- **Un limitador por modelo/proveedor**: Crear limitadores separados para diferentes modelos para aislar sus presupuestos
- **Fije un TPM inicial realista**: Comience con el límite de tarifa documentado de su proveedor o con una estimación conservadora
- **Utilizar la limitación en función del clúster en producción**: Coordine las réplicas para evitar la limitación agregada
- **Monitorizar los eventos de backoff**: Registre o emita métricas cuando se produzcan backoffs para detectar un estrangulamiento sostenido
- **Establecer maxTPM por encima del inicial**: Dejar margen para sondear cuando el tráfico esté por debajo de la cuota

---

## Overrides de prompts con Mongo Store

La gestion de prompts en produccion suele usar:

- prompt specs base registradas en `runtime.PromptRegistry`, y
- registros de override con scope persistidos en Mongo mediante `features/prompt/mongo`.

### Cableado

```go
import (
    promptmongo "goa.design/goa-ai/features/prompt/mongo"
    clientmongo "goa.design/goa-ai/features/prompt/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

promptClient, err := clientmongo.New(clientmongo.Options{
    Client:     mongoClient,
    Database:   "aura",
    Collection: "prompt_overrides", // opcional (por defecto: prompt_overrides)
})
if err != nil {
    panic(err)
}

promptStore, err := promptmongo.NewStore(promptClient)
if err != nil {
    panic(err)
}

rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithPromptStore(promptStore),
)
```

### Resolucion de overrides y despliegue progresivo

La precedencia de overrides es determinista:

1. alcance `session`
2. alcance `facility`
3. alcance `org`
4. alcance global
5. prompt spec base (cuando no existe override)

Estrategia recomendada de rollout:

- Registra primero las nuevas prompt specs base.
- Aplica overrides primero en alcance amplio (`org`) y luego reduce a `facility`/`session` para canarios.
- Rastrea versiones efectivas con eventos `prompt_rendered` y `model.Request.PromptRefs`.
- Haz rollback escribiendo un override mas nuevo en el mismo scope (o eliminando overrides especificos para volver al fallback).

---

## Configuración temporal

Esta sección cubre la configuración de Temporal para flujos de trabajo de agentes duraderos en entornos de producción.

### Visión general

Temporal proporciona una ejecución duradera para sus agentes Goa-AI. Las ejecuciones de agentes se convierten en flujos de trabajo Temporal con historial de eventos. Las llamadas a las herramientas se convierten en actividades con reintentos configurables. Cada transición de estado se mantiene. Un trabajador reiniciado reproduce la historia y se reanuda exactamente donde lo dejó.

### Cómo funciona la durabilidad

| Componente | Rol | Durabilidad |
|-----------|------|------------|
| Flujo de trabajo: orquestación de la ejecución del agente: fuente de eventos; sobrevive a reinicios
| Actividad de planificación. Llamada de inferencia LLM. Reintentos en fallos transitorios
| Ejecutar actividad de herramienta: invocación de herramienta; políticas de reintento por herramienta
| **Estado** | Historial de giros, resultados de herramientas | Persistido en historial de flujo de trabajo |

**Ejemplo concreto:** Su agente llama a un LLM, que devuelve 3 llamadas a herramientas. Dos herramientas se completan. El servicio de la tercera herramienta se bloquea.

- ❌ **Sin Temporal:** La ejecución completa falla. Se vuelve a ejecutar la inferencia ($$$) y se vuelven a ejecutar las dos herramientas que han tenido éxito.
- ✅ **Con Temporal:** Sólo se reintenta la herramienta bloqueada. El flujo de trabajo se repite desde el historial: no hay nueva llamada LLM, no se vuelven a ejecutar las herramientas completadas. Coste: un reintento, no un reinicio completo.

### Lo que sobrevive a los fallos

| Sin Temporal Con Temporal
|------------------|------------------|---------------|
| El proceso de trabajo se bloquea, se pierde la ejecución y se reinicia desde cero
| La llamada a la herramienta se agota. La ejecución falla (o se maneja manualmente)
| Límite de velocidad (429) Falla la ejecución
| Partición de red Pérdida parcial de progreso Reanudación tras reconexión
| Despliegue durante la ejecución. Fallan las ejecuciones en vuelo. Se agotan los trabajadores, se reanudan los nuevos

### Instalación

**Opción 1: Docker (Desarrollo)**

One-liner para desarrollo local:
```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**Opción 2: Temporalite (Desarrollo)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**Opción 3: Nube Temporal (Producción)**

Regístrate en [temporal.io](https://temporal.io) y configura tu cliente con las credenciales de la nube.

**Opción 4: Autoalojado (Producción)**

Despliega Temporal usando Docker Compose o Kubernetes. Consulte la [Documentación de Temporal](https://docs.temporal.io) para obtener guías de implementación.

### Configuración del tiempo de ejecución

Goa-AI abstrae el backend de ejecución detrás de la interfaz `Engine`. Intercambia motores sin cambiar el código del agente:

**Motor en memoria** (desarrollo):
```go
// Default: no external dependencies
rt := runtime.New()
```

**Motor Temporal** (producción):
```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"

    // Agregado de especificaciones generado para tus herramientas.
    // El paquete generado expone: func Spec(tools.Ident) (*tools.ToolSpec, bool)
    specs "<module>/gen/<service>/agents/<agent>/specs"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
        // Requerido: hacer cumplir el contrato de límites de workflow de goa-ai.
        // Los resultados, server-data y artefactos cruzan límites como bytes JSON canónicos (api.ToolEvent/api.ToolArtifact).
        DataConverter: runtimeTemporal.NewAgentDataConverter(specs.Spec),
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
```

### Configuración de los reintentos de actividad

Las llamadas a herramientas son actividades Temporal. Configure los reintentos por conjunto de herramientas en el DSL:

```go
Use("external_apis", func() {
    // Flaky external services: retry aggressively
    ActivityOptions(engine.ActivityOptions{
        Timeout: 30 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts:        5,
            InitialInterval:    time.Second,
            BackoffCoefficient: 2.0,
        },
    })
    
    Tool("fetch_weather", "Get weather data", func() { /* ... */ })
    Tool("query_database", "Query external DB", func() { /* ... */ })
})

Use("local_compute", func() {
    // Fast local tools: minimal retries
    ActivityOptions(engine.ActivityOptions{
        Timeout: 5 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts: 2,
        },
    })
    
    Tool("calculate", "Pure computation", func() { /* ... */ })
})
```

### Configuración del trabajador

Los trabajadores sondean colas de tareas y ejecutan flujos de trabajo/actividades. Los trabajadores se inician automáticamente para cada agente registrado, sin necesidad de configuración manual en la mayoría de los casos.

### Mejores prácticas

- **Utilizar espacios de nombres separados** para diferentes entornos (dev, staging, prod)
- **Configurar políticas de reintento** por conjunto de herramientas basadas en características de fiabilidad
- **Monitorear la ejecución del flujo de trabajo** usando la UI de Temporal y herramientas de observabilidad
- **Establezca tiempos de espera adecuados** para las actividades: equilibre la fiabilidad frente a la detección de cuelgues
- **Utilizar Temporal Cloud** para la producción a fin de evitar la carga operativa

---

## Streaming UI

Esta sección muestra cómo transmitir eventos de agente a UIs en tiempo real usando la infraestructura de streaming de Goa-AI.

### Visión General

Goa-AI publica un **flujo propiedad de la sesión** de eventos tipificados que puede entregarse a las UIs vía:
- Eventos enviados por el servidor (SSE)
- WebSockets
- Buses de mensajes (Pulse, Redis Streams, etc.)

Todos los eventos visibles para una sesión se anexan a un único flujo: `session/<session_id>`. Cada evento lleva `run_id` y `session_id`, y el runtime emite `child_run_linked` para vincular llamadas de herramienta padre con ejecuciones hijas, además de `run_stream_end` como marcador explícito para cerrar SSE/WebSocket sin temporizadores.

### Interfaz Stream Sink

Implementa la interfaz `stream.Sink`:

```go
type Sink interface {
    Send(ctx context.Context, event stream.Event) error
    Close(ctx context.Context) error
}
```

### Tipos de eventos

El paquete `stream` define tipos de eventos concretos que implementan `stream.Event`. Los más comunes para UIs son:

| Tipo de evento | Descripción |
|------------|-------------|
| `AssistantReply` | Asistente de trozos de mensajes (streaming de texto) |
`PlannerThought` Bloques de pensamiento del planificador (notas y razonamiento estructurado)
| `ToolStart` | Ejecución de la herramienta iniciada | `ToolUpdate` | Ejecución de la herramienta iniciada
| `ToolUpdate` | Progreso de la ejecución de la herramienta (actualizaciones esperadas del recuento de hijos) | | `ToolEnd`
| `ToolEnd` | Ejecución de la herramienta finalizada (resultado, error, telemetría) | `AwaitClarification` | Ejecución de la herramienta finalizada (resultado, error, telemetría)
| `AwaitClarification` | El planificador está esperando una aclaración humana | `AwaitExternalTools` | El planificador está esperando una aclaración humana
| `AwaitExternalTools` | El planificador está esperando los resultados de la herramienta externa | `Usage` | El planificador está esperando los resultados de la herramienta externa | `Usage` | `Usage` | El planificador está esperando los resultados de la herramienta externa
| `Usage` | Uso de tokens por invocación del modelo | | `Workflow` | El planificador está esperando una aclaración humana
| `Workflow` | Ejecutar actualizaciones de ciclo de vida y fase |
| `ChildRunLinked` | Enlace desde una llamada a una herramienta padre a la ejecución de un agente hijo |
| `RunStreamEnd` | Marcador explícito: no se esperan más eventos visibles para esa ejecución |

Los transportes suelen cambiar de tipo en `stream.Event` por seguridad en tiempo de compilación:

```go
switch e := evt.(type) {
case stream.AssistantReply:
    // e.Data.Text
case stream.PlannerThought:
    // e.Data.Note or structured thinking fields
case stream.ToolStart:
    // e.Data.ToolCallID, e.Data.ToolName, e.Data.Payload
case stream.ToolEnd:
    // e.Data.Result, e.Data.Error, e.Data.ResultPreview
case stream.ChildRunLinked:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
case stream.RunStreamEnd:
    // run has no more stream-visible events
}
```

### Ejemplo: Sumidero SSE

```go
type SSESink struct {
    w http.ResponseWriter
}

func (s *SSESink) Send(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case stream.AssistantReply:
        fmt.Fprintf(s.w, "data: assistant: %s\n\n", e.Data.Text)
    case stream.PlannerThought:
        if e.Data.Note != "" {
            fmt.Fprintf(s.w, "data: thinking: %s\n\n", e.Data.Note)
        }
    case stream.ToolStart:
        fmt.Fprintf(s.w, "data: tool_start: %s\n\n", e.Data.ToolName)
    case stream.ToolEnd:
        fmt.Fprintf(s.w, "data: tool_end: %s status=%v\n\n",
            e.Data.ToolName, e.Data.Error == nil)
    case stream.ChildRunLinked:
        fmt.Fprintf(s.w, "data: child_run_linked: %s child=%s\n\n",
            e.Data.ToolName, e.Data.ChildRunID)
    case stream.RunStreamEnd:
        fmt.Fprintf(s.w, "data: run_stream_end: %s\n\n", e.RunID())
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

### Suscripción al flujo de sesión (Pulse)

En producción, las UIs consumen el flujo de sesión (`session/<session_id>`) desde un bus compartido y filtran por `run_id`. Cierra SSE/WebSocket cuando observes `run_stream_end` para la ejecución activa.

### Sumidero Global de Corridas

Para transmitir todas las ejecuciones a través de un sumidero global (por ejemplo, Pulse), configure el tiempo de ejecución con un sumidero de flujo:

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

El tiempo de ejecución instala un `stream.Subscriber` por defecto que:
- asigna eventos de gancho a valores `stream.Event`
- utiliza el **default `StreamProfile`**, que emite respuestas del asistente, pensamientos del planificador, inicio/actualización/finalización de herramientas, esperas, uso, flujo de trabajo, enlaces `child_run_linked` y el marcador terminal `run_stream_end`

### Stream Profiles

No todos los consumidores necesitan todos los eventos. **Los perfiles de flujo filtran los eventos para diferentes audiencias, reduciendo el ruido y el ancho de banda para casos de uso específicos.

| Perfil | Caso de Uso | Eventos Incluidos |
|---------|----------|-----------------|
`UserChatProfile()` Interfaz de usuario del chat del usuario final: respuestas del asistente, inicio/finalización de la herramienta, finalización del flujo de trabajo
| `AgentDebugProfile()` | Depuración del desarrollador | Todo, incluidos los pensamientos del planificador |
| `MetricsProfile()` | Canalizaciones de observabilidad | Sólo eventos de uso y flujo de trabajo |

**Utilizando perfiles incorporados:**

```go
// User-facing chat: replies, tool status, completion
profile := stream.UserChatProfile()

// Debug view: everything including planner thoughts
profile := stream.AgentDebugProfile()

// Metrics pipeline: just usage and workflow events
profile := stream.MetricsProfile()

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

**Perfiles personalizados:**

```go
// Fine-grained control over which events to emit
profile := stream.StreamProfile{
    Assistant:  true,
    Thoughts:   false,  // Skip planner thinking
    ToolStart:  true,
    ToolUpdate: true,
    ToolEnd:    true,
    Usage:      false,  // Skip usage events
    Workflow:   true,
    ChildRuns:  true,   // Include parent tool → child run links
}

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

Los perfiles personalizados son útiles cuando:
- Necesitas eventos específicos para un consumidor especializado (por ejemplo, seguimiento del progreso)
- Desea reducir el tamaño de la carga útil para clientes móviles
- Estás construyendo pipelines de análisis que sólo necesitan ciertos eventos

### Avanzado: Pulse & Stream Bridges

En las configuraciones de producción, a menudo se desea
- publicar eventos en un bus compartido (por ejemplo, Pulse)
- utilizar un **flujo propiedad de la sesión** en ese bus (`session/<session_id>`)

Goa-AI proporciona:
- `features/stream/pulse` - una implementación `stream.Sink` respaldada por Pulse
- `runtime/agent/stream/bridge` - helpers para cablear el hook bus a cualquier sink

Cableado típico:

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    // Optional: override stream naming (defaults to `session/<SessionID>`).
    StreamID: func(ev stream.Event) (string, error) {
        if ev.SessionID() == "" {
            return "", errors.New("missing session id")
        }
        return fmt.Sprintf("session/%s", ev.SessionID()), nil
    },
})
if err != nil { log.Fatal(err) }

rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(s),
)
```

---

## Recordatorios del sistema

Los modelos van a la deriva. Olvidan las instrucciones. Ignoran el contexto que estaba claro hace 10 turnos. Cuando su agente ejecuta tareas de larga duración, necesita una forma de inyectar *orientación dinámica y contextual* sin contaminar la conversación con el usuario.

### El problema

**Escenario:** Su agente gestiona una lista de tareas. Después de 20 turnos, el usuario pregunta "¿qué es lo siguiente?" pero el modelo se ha desviado-no recuerda que hay una tarea pendiente en progreso. Necesitas darle un empujón *sin* que el usuario vea un incómodo mensaje de "RECORDATORIO: tienes una tarea pendiente".

**Sin recordatorios del sistema:**
- Se sobrecarga el sistema de avisos con todas las situaciones posibles
- La orientación se pierde en largas conversaciones
- No hay forma de inyectar contexto basado en los resultados de la herramienta
- Los usuarios ven el andamiaje interno del agente

**Con recordatorios del sistema:**
- Inyección dinámica de orientación basada en el estado de ejecución
- Limitación de las sugerencias repetitivas para evitar la saturación de los avisos
- Los niveles de prioridad garantizan que la orientación de seguridad nunca se suprima
- Invisibles para los usuarios: se inyectan como bloques `<system-reminder>`

### Visión general

El paquete `runtime/agent/reminder` proporciona:
- **Recordatorios estructurados** con niveles de prioridad, puntos de conexión y políticas de limitación de velocidad
- **Almacenamiento de ámbito de ejecución** que se limpia automáticamente después de que finalice cada ejecución
- **Inyección automática** en transcripciones de modelos como bloques `<system-reminder>`
- **API PlannerContext** para registrar y eliminar recordatorios de planificadores y herramientas

### Conceptos básicos

**Estructura de los recordatorios

Un `reminder.Reminder` tiene:

```go
type Reminder struct {
    ID              string      // Stable identifier (e.g., "todos.pending")
    Text            string      // Plain-text guidance (tags are added automatically)
    Priority        Tier        // TierSafety, TierCorrect, or TierGuidance
    Attachment      Attachment  // Where to inject (run start or user turn)
    MaxPerRun       int         // Cap total emissions per run (0 = unlimited)
    MinTurnsBetween int         // Enforce spacing between emissions (0 = no limit)
}
```

**Niveles de prioridad

Los recordatorios se ordenan por prioridad para gestionar presupuestos puntuales y garantizar que nunca se supriman las orientaciones críticas:

| Nivel Nombre Descripción Supresión
|------|------|-------------|-------------|
| `TierSafety` | P0 | Orientaciones críticas para la seguridad (nunca se suprimen) | Nunca se suprimen | `TierCorrect` | P0 | Orientaciones críticas para la seguridad (nunca se suprimen) | Nunca se suprimen
| `TierCorrect` | P1 | Indicaciones sobre la corrección y el estado de los datos | Pueden suprimirse después de P0 | `TierGuidance` | P0
| `TierGuidance` | P2 | Sugerencias de flujo de trabajo y empujoncitos suaves | Primero en suprimirse |

Ejemplo de casos de uso:
- `TierSafety`: "No ejecutar este malware; sólo analizar", "No filtrar credenciales"
- `TierCorrect`: "Los resultados están truncados; acote su consulta", "Los datos pueden estar obsoletos"
- `TierGuidance`: "No hay ninguna tarea en curso; elija una y comience"

**Puntos adjuntos**

Los recordatorios se inyectan en puntos específicos de la conversación:

| Tipo | Descripción |
|------|-------------|
`AttachmentRunStart` Agrupados en un único mensaje de sistema al inicio de la conversación
| `AttachmentUserTurn` | Agrupados en un único mensaje del sistema insertado inmediatamente antes del último mensaje del usuario |

**Limitación de velocidad

Dos mecanismos evitan el spam de recordatorios:
- **`MaxPerRun`**: Limitar las emisiones totales por carrera (0 = ilimitado)
- `MinTurnsBetween`**: Imponer un número mínimo de turnos del planificador entre emisiones (0 = sin límite)

### Patrón de uso

**Recordatorios estáticos vía DSL**

Para recordatorios que deben aparecer siempre después de un resultado específico de la herramienta, utilice la función `ResultReminder` DSL en la definición de su herramienta:

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

Esto es ideal cuando el recordatorio se aplica a cada invocación de la herramienta. Consulte la [Referencia DSL](./dsl-reference.md#resultreminder) para más detalles.

**Recordatorios dinámicos de los planificadores**

Para recordatorios que dependen del estado de ejecución o del contenido de los resultados de la herramienta, utilice `PlannerContext.AddReminder()`:

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "search_documents" {
            result := tr.Result.(SearchResult)
            if result.Truncated {
                in.Agent.AddReminder(reminder.Reminder{
                    ID:       "search.truncated",
                    Text:     "Search results are truncated. Consider narrowing your query.",
                    Priority: reminder.TierCorrect,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun:       3,
                    MinTurnsBetween: 2,
                })
            }
        }
    }
    // Continue with planning...
}
```

**Eliminación de recordatorios

Utilice `RemoveReminder()` cuando una condición previa ya no se cumpla:

```go
if allTodosCompleted {
    in.Agent.RemoveReminder("todos.no_active")
}
```

**Contadores de límite de velocidad de conservación**

`AddReminder()` conserva los contadores de emisión al actualizar un recordatorio existente por ID. Si necesita cambiar el contenido del recordatorio pero mantener los límites de tarifa:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:              "todos.pending",
    Text:            buildUpdatedText(snap),
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3,
})
```

**Anti-patrón**: No llame a `RemoveReminder()` seguido de `AddReminder()` para el mismo ID-esto reinicia los contadores y pasa por alto `MinTurnsBetween`.

### Inyección y formato

**Etiquetado automático

El tiempo de ejecución envuelve automáticamente el texto recordatorio en etiquetas `<system-reminder>` cuando se inyecta en transcripciones:

```go
// You provide plain text:
Text: "Results are truncated. Narrow your query."

// Runtime injects:
<system-reminder>Results are truncated. Narrow your query.</system-reminder>
```

**Explicación de los recordatorios a los modelos**

Incluya `reminder.DefaultExplanation` en el aviso de su sistema para que los modelos sepan cómo interpretar los bloques `<system-reminder>`:

```go
const systemPrompt = `
You are a helpful assistant.

` + reminder.DefaultExplanation + `

Follow all instructions carefully.
`
```

### Ejemplo completo

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "todos.update_todos" {
            snap := tr.Result.(TodosSnapshot)
            
            var rem *reminder.Reminder
            if len(snap.Items) == 0 {
                in.Agent.RemoveReminder("todos.no_active")
                in.Agent.RemoveReminder("todos.all_completed")
            } else if hasCompletedAll(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.all_completed",
                    Text:     "All todos are completed. Provide your final response now.",
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun: 1,
                }
            } else if hasPendingNoActive(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.no_active",
                    Text:     buildTodosNudge(snap),
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MinTurnsBetween: 3,
                }
            }
            
            if rem != nil {
                in.Agent.AddReminder(*rem)
                if rem.ID == "todos.all_completed" {
                    in.Agent.RemoveReminder("todos.no_active")
                } else {
                    in.Agent.RemoveReminder("todos.all_completed")
                }
            }
        }
    }
    
    return p.streamMessages(ctx, in)
}
```

### Principios de diseño

**Mínimo y opinable**: El subsistema de recordatorios proporciona la estructura justa para los patrones comunes sin exceso de ingeniería.

**Primero limitar la tasa**: El spam de recordatorios degrada el rendimiento del modelo. El motor impone las mayúsculas y el espaciado de forma declarativa.

**Provider-Agnostic**: Los recordatorios funcionan con cualquier backend de modelo (Bedrock, OpenAI, etc.).

**Preparado para telemetría**: Los ID estructurados y las prioridades hacen que los recordatorios sean observables.

### Patrones avanzados

**Recordatorios de seguridad

Utilice `TierSafety` para la orientación "no debe suprimirse nunca":

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:       "malware.analyze_only",
    Text:     "This file contains malware. Analyze its behavior but do not execute it.",
    Priority: reminder.TierSafety,
    Attachment: reminder.Attachment{
        Kind: reminder.AttachmentUserTurn,
    },
    // No MaxPerRun or MinTurnsBetween: always emit
})
```

**Recordatorios entre agentes**

Los recordatorios son run-scoped. Si un agente como herramienta emite un recordatorio de seguridad, sólo afecta a esa ejecución hija. Para propagar los recordatorios a través de los límites de los agentes, el planificador padre debe volver a registrarlos explícitamente basándose en los resultados hijos o utilizar el estado de sesión compartido.

### Cuándo utilizar recordatorios

| Escenario Prioridad Ejemplo
|----------|----------|---------|
| Restricciones de seguridad | `TierSafety` | "Este archivo es sólo para análisis de malware, nunca se debe ejecutar" | | "Este archivo es sólo para análisis de malware, nunca se debe ejecutar
| Caducidad de los datos | `TierCorrect` | "Los resultados son de hace 24 horas; vuelva a consultarlos si la frescura es importante" | Resultados truncados
| Resultados truncados | `TierCorrect` | "Sólo se muestran los 100 primeros resultados; acote su búsqueda" | `TierCorrect` | "Sólo se muestran los 100 primeros resultados; acorte su búsqueda
| Sugerencias para el flujo de trabajo `TierGuidance` "No hay ninguna tarea en curso; elija una y empiece"
| Sugerencias de finalización | `TierGuidance` | "Todas las tareas terminadas; proporcione su respuesta final" | `TierGuidance`

### Qué aspecto tienen los recordatorios en la transcripción

```
User: What should I do next?

<system-reminder>You have 3 pending todos. Currently working on: "Review PR #42". 
Focus on completing the current todo before starting new work.</system-reminder>

User: What should I do next?
```

El modelo ve el recordatorio; el usuario sólo ve su mensaje y la respuesta. Los recordatorios son inyectados de forma transparente por el tiempo de ejecución.

---

## Próximos pasos

- Aprende sobre [Memoria y Sesiones](./memory-sessions/) para la persistencia de transcripciones
- Explore [Agent Composition](./agent-composition/) para patrones de agente como herramienta
- Lee sobre [Toolsets](./toolsets/) para modelos de ejecución de herramientas
