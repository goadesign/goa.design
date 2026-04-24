---
title: "Producción"
linkTitle: "Producción"
weight: 8
description: "Configura Temporal para workflows duraderos, transmite eventos a las UIs, aplica limitación de tasa adaptativa y utiliza recordatorios del sistema."
llm_optimized: true
aliases:
---

## Limitación de tasa de modelos

Todos los proveedores de modelos aplican límites de tasa. Supéralos y tus peticiones fallarán con errores 429. Peor aún: en un despliegue multi-réplica, cada réplica martillea la API de forma independiente, provocando una limitación *agregada* que es invisible para los procesos individuales.

### El problema

**Escenario:** Despliegas 10 réplicas de tu servicio de agente. Cada réplica cree disponer de 100K tokens/minuto. Combinadas, envían 1M de tokens/minuto —10 veces tu cuota real—. El proveedor estrangula de forma agresiva. Las peticiones fallan aleatoriamente en todas las réplicas.

**Sin limitación de tasa:**
- Las peticiones fallan de forma impredecible con 429
- No hay visibilidad sobre la capacidad restante
- Los reintentos empeoran la congestión
- La experiencia de usuario se degrada bajo carga

**Con limitación de tasa adaptativa:**
- Cada réplica comparte un presupuesto coordinado
- Las peticiones se encolan hasta que hay capacidad disponible
- El backoff se propaga por todo el clúster
- Degradación elegante en lugar de fallos

### Visión general

El paquete `features/model/middleware` proporciona un **limitador de tasa adaptativo estilo AIMD** que se sitúa en la frontera del cliente de modelo. Estima el coste en tokens, bloquea a los llamadores hasta que hay capacidad disponible y ajusta automáticamente su presupuesto de tokens por minuto en respuesta a las señales de limitación de tasa de los proveedores.

### Estrategia AIMD

El limitador utiliza una estrategia de **Incremento Aditivo / Decremento Multiplicativo (AIMD)**:

| Evento | Acción | Fórmula |
|-------|--------|---------|
| Éxito | Sondeo (incremento aditivo) | `TPM += recoveryRate` (5 % del inicial) |
| `ErrRateLimited` | Backoff (decremento multiplicativo) | `TPM *= 0.5` |

El valor efectivo de tokens por minuto (TPM) está acotado por:
- **Mínimo**: 10 % del TPM inicial (suelo para evitar la inanición)
- **Máximo**: el techo configurado mediante `maxTPM`

### Uso básico

Crea un único limitador por proceso y envuelve tu cliente de modelo:

```go
import (
    "context"
    "os"

    "goa.design/goa-ai/features/model/openai"
    "goa.design/goa-ai/features/model/middleware"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    ctx := context.Background()

    // Crea el limitador de tasa adaptativo
    // Parámetros: context, rmap (nil para local), key, initialTPM, maxTPM
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        nil,     // nil = limitador local al proceso
        "",      // clave (no utilizada cuando rmap es nil)
        60000,   // tokens por minuto iniciales
        120000,  // máximo de tokens por minuto
    )

    // Crea tu cliente de modelo subyacente
    modelClient, err := openai.New(openai.Options{
        APIKey:       os.Getenv("OPENAI_API_KEY"),
        DefaultModel: "gpt-5-mini",
        HighModel:    "gpt-5",
        SmallModel:   "gpt-5-nano",
    })
    if err != nil {
        panic(err)
    }

    // Envuelve con el middleware de limitación de tasa
    rateLimitedClient := limiter.Middleware()(modelClient)

    rt := runtime.New()
    if err := rt.RegisterModel("default", rateLimitedClient); err != nil {
        panic(err)
    }
}
```

### Limitación de tasa consciente del clúster

Para despliegues multiproceso, coordina la limitación de tasa entre instancias usando un mapa replicado de Pulse:

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()

    // Crea un mapa replicado de Pulse respaldado por Redis
    rm, err := rmap.NewMap(ctx, "rate-limits", rmap.WithRedis(redisClient))
    if err != nil {
        panic(err)
    }

    // Crea un limitador consciente del clúster
    // Todos los procesos que compartan este mapa y clave coordinan sus presupuestos
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        rm,
        "claude-sonnet",  // clave compartida para este modelo
        60000,            // TPM inicial
        120000,           // TPM máximo
    )

    // Envuelve tu cliente como antes
    rateLimitedClient := limiter.Middleware()(bedrockClient)
}
```

Cuando se utiliza limitación consciente del clúster:
- **El backoff se propaga globalmente**: cuando cualquier proceso recibe `ErrRateLimited`, todos los procesos reducen su presupuesto
- **El sondeo se coordina**: las peticiones exitosas incrementan el presupuesto compartido
- **Reconciliación automática**: los procesos vigilan los cambios externos y actualizan sus limitadores locales

### Estimación de tokens

El limitador estima el coste de la petición mediante una heurística simple:
- Cuenta los caracteres en las partes de texto y en los resultados de herramientas de tipo cadena
- Convierte a tokens usando ~3 caracteres por token
- Añade un búfer de 500 tokens para prompts de sistema y sobrecostes del proveedor

Esta estimación es intencionadamente conservadora para evitar subestimar.

### Integración con el runtime

Conecta los clientes con tasa limitada al runtime de Goa-AI:

```go
// Crea limitadores para cada modelo que utilices
claudeLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 60000, 120000)
gptLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 90000, 180000)

// Envuelve los clientes subyacentes
claudeClient := claudeLimiter.Middleware()(bedrockClient)
gptClient := gptLimiter.Middleware()(openaiClient)

// Configura el runtime con clientes con tasa limitada
rt := runtime.New(runtime.WithEngine(temporalEng))
if err := rt.RegisterModel("claude", claudeClient); err != nil {
    panic(err)
}
if err := rt.RegisterModel("gpt-4", gptClient); err != nil {
    panic(err)
}
```

### Qué ocurre bajo carga

| Nivel de tráfico | Sin limitador | Con limitador |
|---------------|-----------------|--------------|
| Por debajo de la cuota | Las peticiones tienen éxito | Las peticiones tienen éxito |
| En la cuota | Fallos 429 aleatorios | Las peticiones se encolan y luego tienen éxito |
| Ráfaga por encima de la cuota | Cascada de fallos, el proveedor bloquea | El backoff absorbe la ráfaga, recuperación gradual |
| Sobrecarga sostenida | Todas las peticiones fallan | Las peticiones se encolan con latencia acotada |

### Parámetros de ajuste

| Parámetro | Valor por defecto | Descripción |
|-----------|---------|-------------|
| `initialTPM` | (obligatorio) | Presupuesto inicial de tokens por minuto |
| `maxTPM` | (obligatorio) | Techo para sondeo |
| Suelo | 10 % del inicial | Presupuesto mínimo (evita la inanición) |
| Tasa de recuperación | 5 % del inicial | Incremento aditivo por éxito |
| Factor de backoff | 0.5 | Decremento multiplicativo ante 429 |

**Ejemplo:** con `initialTPM=60000, maxTPM=120000`:
- Suelo: 6.000 TPM
- Recuperación: +3.000 TPM por lote exitoso
- Backoff: dividir a la mitad el TPM actual ante un 429

### Monitorización

Sigue el comportamiento del limitador de tasa con métricas y logs:

```go
// El limitador registra los eventos de backoff en nivel WARN
// Monitoriza el estrangulamiento sostenido siguiendo:
// - Distribución del tiempo de espera (cuánto se encolan las peticiones)
// - Frecuencia de backoff (con qué frecuencia ocurren los 429)
// - TPM actual vs. TPM inicial

// Ejemplo: exporta la capacidad actual a Prometheus
currentTPM := limiter.CurrentTPM()
```

### Buenas prácticas

- **Un limitador por modelo/proveedor**: crea limitadores separados para modelos distintos y aísla sus presupuestos
- **Fija un TPM inicial realista**: comienza con el límite de tasa documentado por tu proveedor o con una estimación conservadora
- **Usa limitación consciente del clúster en producción**: coordina las réplicas para evitar el estrangulamiento agregado
- **Monitoriza los eventos de backoff**: registra o emite métricas cuando se produzcan backoffs para detectar un estrangulamiento sostenido
- **Fija `maxTPM` por encima del inicial**: deja margen para sondear cuando el tráfico esté por debajo de la cuota

---

## Overrides de prompts con almacén Mongo

La gestión de prompts en producción suele utilizar:

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

### Resolución de overrides y despliegue progresivo

La precedencia de overrides es determinista:

1. scope `session`
2. scope `facility`
3. scope `org`
4. scope global
5. prompt spec base (cuando no existe override)

Estrategia de rollout recomendada:

- Registra primero las nuevas prompt specs base.
- Despliega los overrides primero con un scope amplio (`org`) y luego restríngelos a `facility`/`session` para canarios.
- Rastrea las versiones efectivas mediante los eventos `prompt_rendered` y `model.Request.PromptRefs`.
- Haz rollback escribiendo un override más reciente en el mismo scope (o eliminando overrides específicos de scope para volver al valor por defecto).

---

## Configuración de Temporal

Esta sección cubre la configuración de Temporal para workflows de agente duraderos en entornos de producción.

### Visión general

Temporal proporciona ejecución duradera para tus agentes Goa-AI. Las ejecuciones de agente se convierten en workflows de Temporal con historial basado en eventos. Las llamadas a herramientas se convierten en actividades con reintentos configurables. Cada transición de estado se persiste. Un worker reiniciado reproduce el historial y continúa exactamente donde se quedó.

### Cómo funciona la durabilidad

| Componente | Rol | Durabilidad |
|-----------|------|------------|
| **Workflow** | Orquestación de la ejecución del agente | Basado en eventos; sobrevive a reinicios |
| **Actividad de planificación** | Llamada de inferencia al LLM | Reintentos ante fallos transitorios |
| **Actividad de ejecución de herramienta** | Invocación de herramienta | Políticas de reintento por herramienta |
| **Estado** | Historial de turnos, resultados de herramientas | Persistido en el historial del workflow |

**Ejemplo concreto:** tu agente llama a un LLM, que devuelve 3 llamadas a herramientas. Dos herramientas se completan. El servicio de la tercera herramienta falla.

- ❌ **Sin Temporal:** toda la ejecución falla. Vuelves a ejecutar la inferencia ($$$) y a reejecutar las dos herramientas que ya habían tenido éxito.
- ✅ **Con Temporal:** solo se reintenta la herramienta caída. El workflow se reproduce desde el historial —sin nueva llamada al LLM, sin reejecutar las herramientas ya completadas—. Coste: un reintento, no un reinicio completo.

### Qué sobrevive a los fallos

| Escenario de fallo | Sin Temporal | Con Temporal |
|------------------|------------------|---------------|
| Crash del proceso worker | Ejecución perdida, reinicio desde cero | Se reproduce desde el historial y continúa |
| Timeout de llamada a herramienta | La ejecución falla (o requiere manejo manual) | Reintento automático con backoff |
| Límite de tasa (429) | La ejecución falla | Hace backoff, reintenta automáticamente |
| Partición de red | Progreso parcial perdido | Se reanuda tras la reconexión |
| Despliegue durante una ejecución | Las ejecuciones en curso fallan | Los workers drenan y los nuevos reanudan |

### Instalación

**Opción 1: Docker (desarrollo)**

Una sola línea para desarrollo local:
```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**Opción 2: Temporalite (desarrollo)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**Opción 3: Temporal Cloud (producción)**

Regístrate en [temporal.io](https://temporal.io) y configura tu cliente con las credenciales de la nube.

**Opción 4: Autohospedado (producción)**

Despliega Temporal usando Docker Compose o Kubernetes. Consulta la [documentación de Temporal](https://docs.temporal.io) para guías de despliegue.

### Configuración del runtime

Goa-AI abstrae el backend de ejecución detrás de la interfaz `Engine`. Intercambia motores sin cambiar el código del agente:

**Motor en memoria** (desarrollo):
```go
// Por defecto: sin dependencias externas
rt := runtime.New()
```

**Motor Temporal** (producción):
```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"

    // Agregado generado de especificaciones de tus herramientas.
    // El paquete generado expone: func Spec(tools.Ident) (*tools.ToolSpec, bool)
    specs "<module>/gen/<service>/agents/<agent>/specs"
)

temporalEng, err := runtimeTemporal.NewWorker(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
        // Obligatorio: hace cumplir el contrato de frontera de workflow de goa-ai.
        // Los resultados de herramientas y server-data atraviesan las fronteras del workflow como bytes JSON canónicos
        // (por ejemplo, payloads api.ToolEvent), no como valores planner.ToolResult decodificados.
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

### Tiempos y reintentos de actividad

Usa el DSL para presupuestos semánticos de ejecución: cuánto puede durar toda la
ejecución, cuánto puede durar un intento de planificación y cuánto puede durar
un intento de herramienta.

```go
Agent("operator", "Production operations agent", func() {
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(20), MaxConsecutiveFailedToolCalls(3))
        Timing(func() {
            Budget("5m")
            Plan("45s")
            Tools("90s")
        })
    })
})
```

El adaptador de Temporal es el propietario de los aspectos mecánicos del motor
de workflows, como la espera en cola y los timeouts de liveness. Configúralos
en el motor, no en el DSL:

```go
temporalEng, err := runtimeTemporal.NewWorker(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: runtimeTemporal.ActivityDefaults{
        Planner: runtimeTemporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: runtimeTemporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
```

Las actividades generadas de plan/resume, execute-tool y publicación de hooks
utilizan políticas de reintento que solo son seguras cuando los reintentos son
lógicamente idempotentes. Los eventos de hook llevan claves de evento estables
y las ejecuciones de herramientas deben persistir o reproducir los resultados
canónicos por `ToolCallID` en lugar de repetir efectos laterales irreversibles.

### Configuración de workers

Los workers sondean colas de tareas y ejecutan workflows/actividades. Los workers se inician automáticamente para cada agente registrado —en la mayoría de los casos no se necesita configuración manual de workers—.

### Buenas prácticas

- **Utiliza namespaces separados** para entornos distintos (dev, staging, prod)
- **Configura políticas de reintento** por toolset basadas en las características de fiabilidad
- **Monitoriza la ejecución de workflows** usando la UI y las herramientas de observabilidad de Temporal
- **Fija timeouts adecuados** para las actividades: equilibra fiabilidad frente a detección de cuelgues
- **Usa Temporal Cloud** en producción para evitar la carga operativa

---

## UI de streaming

Esta sección muestra cómo transmitir eventos del agente a UIs en tiempo real utilizando la infraestructura de streaming de Goa-AI.

### Visión general

Goa-AI publica **streams propiedad de la sesión** de eventos tipados que pueden entregarse a las UIs a través de:
- Server-Sent Events (SSE)
- WebSockets
- Buses de mensajes (Pulse, Redis Streams, etc.)

Todos los eventos visibles en el stream para una sesión se añaden a un único stream: `session/<session_id>`. Cada evento lleva tanto `run_id` como `session_id` para que las UIs puedan agrupar eventos en carriles/tarjetas por ejecución. Las ejecuciones anidadas de agentes se enlazan mediante eventos `child_run_linked`. Las UIs cierran SSE/WebSocket de forma determinista cuando observan `run_stream_end` para la ejecución activa.

### Interfaz Stream Sink

Implementa la interfaz `stream.Sink`:

```go
type Sink interface {
    Send(ctx context.Context, event stream.Event) error
    Close(ctx context.Context) error
}
```

### Tipos de evento

El paquete `stream` define tipos de evento concretos que implementan `stream.Event`. Los más comunes para las UIs son:

| Tipo de evento | Descripción |
|------------|-------------|
| `AssistantReply` | Fragmentos de mensaje del asistente (texto en streaming) |
| `PlannerThought` | Bloques de pensamiento del planner (notas y razonamiento estructurado) |
| `ToolStart` | Ejecución de herramienta iniciada |
| `ToolUpdate` | Progreso de ejecución de herramienta (actualizaciones del número esperado de hijos) |
| `ToolEnd` | Ejecución de herramienta completada (resultado, error, telemetría) |
| `AwaitClarification` | El planner espera una aclaración humana |
| `AwaitExternalTools` | El planner espera resultados de herramientas externas |
| `Usage` | Uso de tokens por invocación de modelo |
| `Workflow` | Actualizaciones de ciclo de vida y fase de la ejecución |
| `ChildRunLinked` | Enlace desde la llamada a una herramienta padre a la ejecución de un agente hijo |
| `RunStreamEnd` | Marcador de frontera explícito del stream para una ejecución (no aparecerán más eventos visibles en el stream para esa ejecución) |

Los transportes suelen hacer type-switch sobre `stream.Event` para obtener seguridad en tiempo de compilación:

```go
switch e := evt.(type) {
case stream.AssistantReply:
    // e.Data.Text
case stream.PlannerThought:
    // e.Data.Note o campos de razonamiento estructurado
case stream.ToolStart:
    // e.Data.ToolCallID, e.Data.ToolName, e.Data.Payload
case stream.ToolEnd:
    // e.Data.Result, e.Data.Error, e.Data.ResultPreview
case stream.ChildRunLinked:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
case stream.RunStreamEnd:
    // la ejecución ya no tiene más eventos visibles en el stream
}
```

### Ejemplo: sumidero SSE

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

### Suscripción al stream de sesión (Pulse)

En producción, las UIs consumen el stream de sesión (`session/<session_id>`) desde un bus compartido (Pulse / Redis Streams) y filtran por `run_id`. Cierra SSE/WebSocket cuando observes `run_stream_end` para la ejecución activa.

### Sumidero global de stream

Para transmitir todas las ejecuciones a través de un sumidero global (por ejemplo, Pulse), configura el runtime con un sumidero de stream:

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // o tu sumidero personalizado
)
```

El runtime instala por defecto un `stream.Subscriber` que:
- mapea eventos de hook a valores `stream.Event`
- usa el **`StreamProfile` por defecto**, que emite respuestas del asistente, pensamientos del planner, start/update/end de herramientas, esperas, uso, workflow, enlaces `child_run_linked` y el marcador terminal `run_stream_end`

### Perfiles de stream

No todos los consumidores necesitan todos los eventos. Los **perfiles de stream** filtran eventos para distintas audiencias, reduciendo el ruido y el ancho de banda para casos de uso específicos.

| Perfil | Caso de uso | Eventos incluidos |
|---------|----------|-----------------|
| `UserChatProfile()` | UI de chat de usuario final | Respuestas del asistente, start/end de herramientas, finalización del workflow |
| `AgentDebugProfile()` | Depuración del desarrollador | Todo, incluidos los pensamientos del planner |
| `MetricsProfile()` | Pipelines de observabilidad | Solo eventos de uso y de workflow |

**Uso de perfiles incorporados:**

```go
// Chat para el usuario: respuestas, estado de herramienta, finalización
profile := stream.UserChatProfile()

// Vista de depuración: todo incluyendo pensamientos del planner
profile := stream.AgentDebugProfile()

// Pipeline de métricas: solo eventos de uso y workflow
profile := stream.MetricsProfile()

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

**Perfiles personalizados:**

```go
// Control granular sobre qué eventos emitir
profile := stream.StreamProfile{
    Assistant:  true,
    Thoughts:   false,  // Omitir pensamientos del planner
    ToolStart:  true,
    ToolUpdate: true,
    ToolEnd:    true,
    Usage:      false,  // Omitir eventos de uso
    Workflow:   true,
    ChildRuns:  true,   // Incluir enlaces herramienta padre → ejecución hija
}

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

Los perfiles personalizados son útiles cuando:
- Necesitas eventos específicos para un consumidor especializado (por ejemplo, seguimiento del progreso)
- Quieres reducir el tamaño de la carga útil para clientes móviles
- Estás construyendo pipelines de analítica que solo necesitan ciertos eventos

### Avanzado: Pulse y puentes de stream

En configuraciones de producción, a menudo querrás:
- publicar eventos en un bus compartido (por ejemplo, Pulse)
- usar un **stream propiedad de la sesión** en ese bus (`session/<session_id>`)

Goa-AI proporciona:
- `features/stream/pulse` – una implementación de `stream.Sink` respaldada por Pulse
- `runtime/agent/stream/bridge` – helpers para cablear el bus de hooks a cualquier sumidero

Cableado típico:

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    // Opcional: sobrescribe la nomenclatura del stream (por defecto, `session/<SessionID>`).
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

Los modelos derivan. Olvidan instrucciones. Ignoran contexto que estaba claro hace 10 turnos. Cuando tu agente ejecuta tareas de larga duración, necesitas una forma de inyectar *orientación dinámica y contextual* sin contaminar la conversación con el usuario.

### El problema

**Escenario:** tu agente gestiona una lista de tareas. Tras 20 turnos, el usuario pregunta "¿qué hago ahora?" pero el modelo ha derivado —no recuerda que hay una tarea pendiente en progreso—. Necesitas darle un empujón *sin* que el usuario vea un incómodo mensaje "RECORDATORIO: tienes una tarea en progreso".

**Sin recordatorios del sistema:**
- Saturas el system prompt con todos los escenarios posibles
- La orientación se pierde en conversaciones largas
- No hay forma de inyectar contexto basado en los resultados de herramientas
- Los usuarios ven el andamiaje interno del agente

**Con recordatorios del sistema:**
- Inyectas orientación dinámicamente en función del estado en ejecución
- Limitas la tasa de pistas repetitivas para evitar saturar el prompt
- Los niveles de prioridad garantizan que la orientación de seguridad nunca se suprima
- Invisibles para los usuarios: se inyectan como bloques `<system-reminder>`

### Visión general

El paquete `runtime/agent/reminder` proporciona:
- **Recordatorios estructurados** con niveles de prioridad, puntos de adjunción y políticas de limitación de tasa
- **Almacenamiento con alcance de ejecución** que se limpia automáticamente tras finalizar cada ejecución
- **Inyección automática** en las transcripciones de modelo como bloques `<system-reminder>`
- **API PlannerContext** para registrar y eliminar recordatorios desde planners y herramientas

### Conceptos básicos

**Estructura de un recordatorio**

Un `reminder.Reminder` tiene:

```go
type Reminder struct {
    ID              string      // Identificador estable (por ejemplo, "todos.pending")
    Text            string      // Orientación en texto plano (las etiquetas se añaden automáticamente)
    Priority        Tier        // TierSafety, TierCorrect o TierGuidance
    Attachment      Attachment  // Dónde inyectar (inicio de la ejecución o turno del usuario)
    MaxPerRun       int         // Límite total de emisiones por ejecución (0 = sin límite)
    MinTurnsBetween int         // Espaciado mínimo entre emisiones (0 = sin límite)
}
```

**Niveles de prioridad**

Los recordatorios se ordenan por prioridad para gestionar los presupuestos del prompt y asegurar que la orientación crítica nunca se suprima:

| Nivel | Nombre | Descripción | Supresión |
|------|------|-------------|-------------|
| `TierSafety` | P0 | Orientación crítica de seguridad (nunca se descarta) | Nunca se suprime |
| `TierCorrect` | P1 | Pistas de corrección y estado de los datos | Puede suprimirse tras P0 |
| `TierGuidance` | P2 | Sugerencias de workflow y empujones suaves | El primero en suprimirse |

Casos de uso de ejemplo:
- `TierSafety`: "No ejecutes este malware; solo analízalo", "No filtres credenciales"
- `TierCorrect`: "Los resultados están truncados; acota tu consulta", "Los datos podrían estar obsoletos"
- `TierGuidance`: "No hay ninguna tarea en curso; elige una y empieza"

**Puntos de adjunción**

Los recordatorios se inyectan en puntos específicos de la conversación:

| Tipo | Descripción |
|------|-------------|
| `AttachmentRunStart` | Agrupados en un único mensaje de sistema al inicio de la conversación |
| `AttachmentUserTurn` | Agrupados en un único mensaje de sistema insertado inmediatamente antes del último mensaje del usuario |

**Limitación de tasa**

Dos mecanismos evitan el spam de recordatorios:
- **`MaxPerRun`**: límite total de emisiones por ejecución (0 = sin límite)
- **`MinTurnsBetween`**: impone un número mínimo de turnos del planner entre emisiones (0 = sin límite)

### Patrón de uso

**Recordatorios estáticos vía DSL**

Para recordatorios que siempre deben aparecer tras un resultado de herramienta específico, usa la función `ResultReminder` del DSL en la definición de tu herramienta:

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

Esto es ideal cuando el recordatorio aplica a cada invocación de la herramienta. Consulta la [Referencia del DSL](./dsl-reference.md#resultreminder) para más detalles.

**Recordatorios dinámicos desde los planners**

Para recordatorios que dependan del estado en ejecución o del contenido de los resultados de herramientas, usa `PlannerContext.AddReminder()`:

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolOutputs {
        if tr.Name == "search_documents" {
            result, err := specs.UnmarshalSearchDocumentsResult(tr.Result)
            if err != nil {
                return nil, err
            }
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
    // Continuar con la planificación...
}
```

**Eliminación de recordatorios**

Usa `RemoveReminder()` cuando una precondición ya no se cumpla:

```go
if allTodosCompleted {
    in.Agent.RemoveReminder("todos.no_active")
}
```

**Preservación de los contadores de limitación de tasa**

`AddReminder()` preserva los contadores de emisión al actualizar un recordatorio existente por ID. Si necesitas cambiar el contenido del recordatorio pero mantener los límites de tasa:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:              "todos.pending",
    Text:            buildUpdatedText(snap),
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3,
})
```

**Antipatrón**: no llames a `RemoveReminder()` seguido de `AddReminder()` para el mismo ID —esto reinicia los contadores y salta `MinTurnsBetween`—.

### Inyección y formato

**Etiquetado automático**

El runtime envuelve automáticamente el texto del recordatorio con etiquetas `<system-reminder>` al inyectarlo en las transcripciones:

```go
// Tú proporcionas texto plano:
Text: "Results are truncated. Narrow your query."

// El runtime inyecta:
<system-reminder>Results are truncated. Narrow your query.</system-reminder>
```

**Explicar los recordatorios a los modelos**

Incluye `reminder.DefaultExplanation` en el system prompt para que los modelos sepan cómo interpretar los bloques `<system-reminder>`:

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
    for _, tr := range in.ToolOutputs {
        if tr.Name == "todos.update_todos" {
            snap, err := specs.UnmarshalUpdateTodosResult(tr.Result)
            if err != nil {
                return nil, err
            }
            
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

**Mínimo y opinado**: el subsistema de recordatorios proporciona la estructura justa para los patrones habituales, sin sobreingeniería.

**La limitación de tasa primero**: el spam de recordatorios degrada el rendimiento del modelo. El motor impone límites y espaciado de forma declarativa.

**Agnóstico al proveedor**: los recordatorios funcionan con cualquier backend de modelo (Bedrock, OpenAI, etc.).

**Listo para telemetría**: los identificadores y prioridades estructurados hacen que los recordatorios sean observables.

### Patrones avanzados

**Recordatorios de seguridad**

Usa `TierSafety` para orientaciones que nunca deben suprimirse:

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:       "malware.analyze_only",
    Text:     "This file contains malware. Analyze its behavior but do not execute it.",
    Priority: reminder.TierSafety,
    Attachment: reminder.Attachment{
        Kind: reminder.AttachmentUserTurn,
    },
    // Sin MaxPerRun ni MinTurnsBetween: emitir siempre
})
```

**Recordatorios entre agentes**

Los recordatorios tienen alcance de ejecución. Si un agente usado como herramienta emite un recordatorio de seguridad, solo afecta a esa ejecución hija. Para propagar los recordatorios a través de las fronteras entre agentes, el planner padre debe re-registrarlos explícitamente en función de los resultados del hijo o utilizar estado de sesión compartido.

### Cuándo utilizar recordatorios

| Escenario | Prioridad | Ejemplo |
|----------|----------|---------|
| Restricciones de seguridad | `TierSafety` | "Este archivo es malware —solo analízalo, nunca lo ejecutes" |
| Datos obsoletos | `TierCorrect` | "Los resultados tienen 24 h; vuelve a consultar si la frescura importa" |
| Resultados truncados | `TierCorrect` | "Solo se muestran los 100 primeros resultados; acota tu búsqueda" |
| Empujones de workflow | `TierGuidance` | "No hay ninguna tarea en curso; elige una y empieza" |
| Pistas de finalización | `TierGuidance` | "Todas las tareas terminadas; proporciona tu respuesta final" |

### Qué aspecto tienen los recordatorios en la transcripción

```
User: What should I do next?

<system-reminder>You have 3 pending todos. Currently working on: "Review PR #42". 
Focus on completing the current todo before starting new work.</system-reminder>

User: What should I do next?
```

El modelo ve el recordatorio; el usuario solo ve su mensaje y la respuesta. Los recordatorios los inyecta el runtime de forma transparente.

---

## Próximos pasos

- Aprende sobre [Memoria y Sesiones](./memory-sessions/) para la persistencia de transcripciones
- Explora [Composición de agentes](./agent-composition/) para patrones de agente como herramienta
- Lee sobre [Toolsets](./toolsets/) para los modelos de ejecución de herramientas
