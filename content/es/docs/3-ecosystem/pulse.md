---
title: "Pulso"
weight: 2
description: "Distributed event infrastructure - streaming, worker pools, and replicated maps for Go microservices."
llm_optimized: true
---

Pulse proporciona primitivas para construir sistemas distribuidos basados en eventos. Es independiente del transporte y funciona independientemente de Goa, aunque se integra bien con los servicios de Goa.

## Visión general

Pulse consta de tres paquetes principales:

| Paquete | Propósito | Caso de Uso |
|---------|---------|----------|
`streaming` Flujos de eventos Pub/sub, fan-out, fan-in
| `pool` | Worker pools | Background jobs, task dispatch |
`rmap` Mapas replicados, estado compartido entre nodos

Todos los paquetes utilizan Redis como almacén de respaldo para la coordinación distribuida.

## ¿Por qué Pulse?

- **Redis nativo, infraestructura mínima**: Pulse se ejecuta enteramente en Redis Streams y hashes, por lo que si ya ejecuta Redis obtendrá streaming, grupos de trabajadores y estado replicado sin introducir Kafka o nuevos brokers.
- **APIs pequeñas y específicas: `streaming.Stream`, `pool.Node` y `rmap.Map` son pequeños bloques de construcción componibles en lugar de un gran marco, lo que facilita la adopción incremental de Pulse.
- **Ergonomía Go-first**: Las API son Go idiomáticas (`context.Context`, `[]byte` cargas útiles, tipado fuerte a través de sus propios structs), con contratos claros y ganchos de registro estructurados.
- **Compatibilidad por encima de complejidad**: Utiliza streams para eventos, el pool para trabajos de larga duración, y mapas replicados para datos compartidos del plano de control como banderas de características o metadatos de trabajadores.
- **Operacionalmente simple**: Los flujos limitados, la entrega al menos una vez con acks explícitos y el hashing consistente para el enrutamiento de trabajos mantienen el comportamiento en tiempo de ejecución predecible y fácil de razonar en producción.

## Instalación

```bash
go get goa.design/pulse/streaming
go get goa.design/pulse/pool
go get goa.design/pulse/rmap
```

---

## Mapas replicados

El paquete `rmap` proporciona un mapa clave-valor eventualmente consistente y de lectura optimizada replicado a través de nodos distribuidos, respaldado por hashes Redis y canales pub/sub.

### Arquitectura

{{< figure src="/images/diagrams/PulseRmap.svg" alt="Pulse replicated map architecture showing distributed state synchronization" class="img-fluid" >}}

A alto nivel:

- **Almacén autorizado**: El hash de Redis `map:<name>:content` contiene los valores canónicos del mapa.
- **Canal de actualización**: Redis pub/sub `map:<name>:updates` difunde las mutaciones del mapa (`set`, `del`, `reset`).
- **Cachés locales**: cada proceso mantiene una copia en memoria que se mantiene sincronizada con Redis, por lo que las lecturas son locales y rápidas.

### Unir y leer

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/rmap"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // Join a replicated map (loads a snapshot and subscribes to updates)
    m, err := rmap.New(ctx, "config", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer m.Close()

    // Read from the local cache
    value, ok := m.Get("feature.enabled")
    keys := m.Keys()
}
```

Al unir:

- `rmap.New` (a través de `Join`) valida el nombre del mapa, carga y almacena en caché los scripts Lua utilizados para las actualizaciones atómicas,
- se suscribe al canal `map:<name>:updates` y, a continuación
- lee el contenido actual del hash de Redis y siembra la caché local.

Esto hace que el mapa local **eventualmente consistente** con Redis y otros nodos que se han unido al mismo mapa.

### Escribiendo

```go
// Set a value
if _, err := m.Set(ctx, "feature.enabled", "true"); err != nil {
    log.Fatal(err)
}

// Increment a counter
count, err := m.Inc(ctx, "requests.total", 1)

// Append values to a list-like key
_, err = m.AppendValues(ctx, "allowed.regions", "us-east-1", "eu-west-1")

// Compare-and-swap a value
prev, err := m.TestAndSet(ctx, "config.version", "v1", "v2")

// Delete a key
_, err = m.Delete(ctx, "feature.enabled")
```

Todas las operaciones de mutación pasan por scripts Lua que:

- actualizan el hash de Redis en un único comando, y
- publican una notificación binaria compacta en el canal de actualizaciones.

Dado que Redis ejecuta los scripts Lua atómicamente, cada escritura se aplica y difunde como una única operación ordenada.

### Notificaciones de cambios

```go
// Watch for changes
changes := m.Subscribe()

go func() {
    for kind := range changes {
        switch kind {
        case rmap.EventChange:
            log.Info("config changed", "snapshot", m.Map())
        case rmap.EventDelete:
            log.Info("config key deleted")
        case rmap.EventReset:
            log.Info("config reset")
        }
    }
}()
```

- `Subscribe` devuelve un canal de eventos de grano grueso (`EventChange`, `EventDelete`, `EventReset`).
- Las notificaciones **no** incluyen la clave/valor cambiados; los usuarios deben utilizar `Get`, `Map`, o `Keys` para inspeccionar el estado actual.
- Se pueden agrupar varias actualizaciones remotas en una sola notificación, lo que reduce el tráfico de notificaciones incluso cuando el mapa está ocupado.

### Consistencia y modos de fallo

- **Actualizaciones atómicas**: Cada escritura (`Set`, `Inc`, `Append*`, `Delete`, `Reset`, `TestAnd*`) es realizada por un script Lua que actualiza el hash y publica una notificación en un solo paso.
  - Los lectores nunca ven un cambio de hash sin una notificación correspondiente (y viceversa).
- **Coherencia de las uniones**: Al unirse, el mapa
  - se suscribe al canal de actualizaciones, luego
  - carga el hash a través de `HGETALL`.
  Existe una pequeña ventana en la que las actualizaciones pueden verse tanto a través de pub/sub como de la instantánea, pero son idempotentes y conducen al mismo estado final.
- **Redis se desconecta: Si la conexión pub/sub cae, la goroutine `run` en segundo plano registra el error e intenta repetidamente volver a suscribirse.
  - Mientras está desconectada, la caché local deja de recibir actualizaciones remotas pero sigue siendo utilizable para lecturas.
  - Una vez reconectada, las nuevas actualizaciones de Redis vuelven a fluir; las personas que llaman siempre tratan a Redis como la fuente de verdad cuando escriben.
- **Caída del proceso**: Si un proceso que utiliza `Map` sale, el contenido autoritativo permanece en Redis; otros nodos no se ven afectados.
  - Un nuevo proceso puede llamar a `rmap.New` para volver a unirse y reconstruir su caché local desde Redis.
- **Durabilidad de Redis**: Al igual que con las agrupaciones de trabajadores, la durabilidad depende de cómo se configure Redis.
  - Con AOF/snapshots o cluster replicado, el contenido del mapa sobrevive a fallos de procesos y nodos.
  - Si Redis pierde sus datos, todos los mapas son efectivamente reiniciados; el siguiente join verá un mapa vacío.

### Casos de uso

- **Características destacadas**: Distribuir cambios de configuración instantáneamente a través de una flota.
- **Limitación de velocidad**: Compartir contadores entre instancias para aplicar límites globales.
- **Estado de sesión/plano de control**: Mantenga sincronizados los estados pequeños y de lectura frecuente (como los nodos activos o los metadatos de los trabajadores) en todos los servicios.

### Opciones clave de configuración

**Mapas (`rmap.New`)**

| Opción | Descripción |
|--------|-------------|
| `rmap.WithLogger(logger)` | Adjuntar un logger a las operaciones internas de mapas replicados y Redis. |

Ver los [rmap package docs](https://pkg.go.dev/goa.design/pulse/rmap) para la superficie completa de la API.

---

## Streaming

El paquete `streaming` proporciona enrutamiento de eventos a través de microservicios utilizando Redis Streams.

### Arquitectura

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="Pulse streaming architecture showing event producer, streams, and consumer" class="img-fluid" >}}

### Creación de flujos

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/streaming"
)

func main() {
    // Connect to Redis
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    
    // Create a stream
    stream, err := streaming.NewStream(ctx, "events", rdb,
        streaming.WithStreamMaxLen(10000),
    )
    if err != nil {
        log.Fatal(err)
    }
}
```

### Publicación de eventos

```go
type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

// Add strongly-typed event to the stream (payload is JSON-encoded)
payload, err := json.Marshal(UserCreatedEvent{
    UserID: "123",
    Email:  "user@example.com",
})
if err != nil {
    log.Fatal(err)
}

eventID, err := stream.Add(ctx, "user.created", payload)
if err != nil {
    log.Fatal(err)
}
```

### Eventos de consumo

```go
// Create a reader
reader, err := stream.NewReader(ctx, "my-consumer-group",
    streaming.WithReaderBlockDuration(time.Second),
)
if err != nil {
    log.Fatal(err)
}

// Read events
for {
    events, err := reader.Read(ctx)
    if err != nil {
        log.Error(err)
        continue
    }
    
    for _, event := range events {
        if err := processEvent(event); err != nil {
            log.Error(err)
            continue
        }
        reader.Ack(ctx, event.ID)
    }
}
```

### Patrón Fan-Out

Múltiples grupos de consumidores reciben todos los eventos:

```go
// Service A - analytics
analyticsReader, _ := stream.NewReader(ctx, "analytics-group")

// Service B - notifications  
notifyReader, _ := stream.NewReader(ctx, "notify-group")

// Both receive all events independently
```

### Patrón Fan-In

Agrega eventos de múltiples flujos:

```go
// Create readers for multiple streams
ordersReader, _ := ordersStream.NewReader(ctx, "aggregator")
paymentsReader, _ := paymentsStream.NewReader(ctx, "aggregator")

// Process events from both
go processStream(ordersReader)
go processStream(paymentsReader)
```

### Readers vs Sinks

Pulse te ofrece dos formas de consumir streams:

- **Lectores**: cada lector tiene su propio cursor y ve **todos los eventos** del flujo. Son ideales para análisis, proyecciones y cualquier tipo de procesamiento.
- **Sumideros**: todas las instancias de sumideros con el mismo nombre comparten un **cursor de grupo de consumidores**. Cada evento se entrega a **un** consumidor de sumideros, lo que le proporciona una semántica de cola de trabajo de al menos una vez.

| Lectores Fregaderos
|----------------|-------------------------------------------------|-------------------------------------------------------------|
| Cursor Independiente por lector Compartido por nombre de sumidero (grupo de consumidores)
| Entrega Cada lector ve cada evento Cada evento va a un consumidor de sumidero
| Acuse de recibo Opcional (basta con dejar de leer) Explícito `Ack` (a menos que se utilice `WithSinkNoAck`)
| Uso típico: proyecciones, análisis, depuración, repeticiones

### Opciones clave de configuración

**Streams (`streaming.NewStream`)**

| Opción | Descripción |
|--------|-------------|
| `streaming.WithStreamMaxLen(n)` | Limita cuántos eventos se mantienen por flujo antes de recortar los eventos más antiguos. |
| `streaming.WithStreamLogger(logger)` | Inyecta un logger para los internos del flujo, lectores y sumideros. |

**Lectores (`stream.NewReader`)**

| Opción Descripción
|--------|-------------|
| `options.WithReaderBlockDuration(d)` | Controla cuanto tiempo `Read` espera eventos antes de volver. |
| `options.WithReaderStartAtOldest()` | Comienza desde el evento más antiguo en lugar de sólo los nuevos. |
| `options.WithReaderTopic(topic)` / `WithReaderTopicPattern(re)` | Filtra eventos por tema o regex de tema en el lado del cliente. |

**Sumideros (`stream.NewSink`)**

| Opción Descripción
|--------|-------------|
| `options.WithSinkBlockDuration(d)` | Controla cuanto tiempo el fregadero se bloquea esperando trabajo. |
| `options.WithSinkAckGracePeriod(d)` | Ventana de tiempo para que un consumidor acuse recibo antes de que el evento vuelva a estar disponible. |
| `options.WithSinkNoAck()` | Desactiva los acuses de recibo completamente (fire-and-forget consumption). |

**Opciones de evento (`stream.Add`)**

| Opción | Descripción |
|--------|-------------|
| `options.WithTopic(topic)` | Adjuntar un tema al evento para que los lectores/sinks puedan filtrarlo. |
| `options.WithOnlyIfStreamExists()` | Sólo adjuntar el evento si el flujo ya existe (no auto-crear). |

Para ver la lista completa de opciones de lectores, sumideros y flujos, consulta la documentación del paquete Go de
[`goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options).

---

## Pools de Trabajadores

El paquete `pool` implementa pools de trabajadores dedicados con hashing consistente para el envío de trabajos.

### Arquitectura

{{< figure src="/images/diagrams/PulsePool.svg" alt="Pulse worker pool architecture showing job dispatch flow" class="img-fluid" >}}

Los trabajos se enrutan a los trabajadores basándose en una clave usando hashing consistente. Esto asegura:
- Los trabajos con la misma clave van al mismo trabajador
- La carga se distribuye uniformemente entre los trabajadores
- Los fallos de los trabajadores provocan un reequilibrio automático

### Modos de fallo y durabilidad

Los grupos de trabajadores Pulse están diseñados para la entrega **at-least-once**: los trabajos se pueden volver a intentar, pero no se eliminan silenciosamente mientras Redis persista el estado.

**Fallo del proceso de trabajo

- Cada trabajador actualiza periódicamente una marca de tiempo en un mapa replicado.
- Las goroutines de limpieza en segundo plano de los nodos escanean periódicamente este mapa:
  - Los trabajadores que no han actualizado su marca de tiempo en `workerTTL` se marcan como inactivos.
  - Todos los trabajos que pertenecen a un trabajador inactivo se vuelven a poner en cola y se reasignan mediante el mismo enrutamiento consistente-hash utilizado para el envío normal.
- Resultado: si un trabajador muere a mitad de un trabajo, ese trabajo se volverá a ejecutar en otro trabajador activo.

**Fallo de nodo (proceso o host)**

- El estado del trabajo (claves de trabajo, cargas de trabajo, asignaciones de trabajadores e información pendiente de envío) vive en los mapas y flujos replicados de Redis, no en la memoria.
- Si un nodo desaparece
  - Otros nodos detectan su ausencia a través de un mapa keep-alive para nodos.
  - Sus flujos específicos de nodo son recolectados.
  - Los trabajos previamente asignados a los trabajadores de ese nodo se vuelven a poner en cola y se redistribuyen entre los nodos restantes.
- `Close` y `Shutdown` distinguen entre:
  - **Close**: vuelve a poner en cola los trabajos de este nodo para que otros nodos continúen procesando el pool.
  - **Shutdown**: coordina una parada global en todos los nodos, vaciando los trabajos sin volver a ponerlos en cola.

**Fallos de envío y reintentos**

- `DispatchJob` escribe un evento start-job en un flujo del pool y espera por:
  - un reconocimiento de un trabajador (éxito o fracaso de `Start`), o
  - la detección de que ya existe un trabajo con la misma clave.
- Un mapa separado de trabajos pendientes y un TTL basado en marcas de tiempo evitan la duplicación de envíos cuando varios nodos compiten por poner en cola la misma clave de trabajo.
- Si un trabajador no reconoce el inicio de un trabajo dentro del periodo de gracia configurado, ese envío puede ser reintentado por la lógica de limpieza.

**Reequilibrio cuando se incorporan o abandonan trabajadores**

- El pool mantiene un mapa replicado de los trabajadores activos.
- Cuando se añaden o eliminan trabajadores:
  - Los nodos detectan cambios en el mapa de trabajadores y piden a cada trabajador que reequilibre sus trabajos.
  - Los trabajos cuyo cubo consistent-hash se asigna ahora a un trabajador diferente se detienen y se vuelven a poner en cola para que puedan ser recogidos por el nuevo trabajador de destino.
- De este modo, las asignaciones de trabajos se mantienen alineadas con el conjunto de trabajadores actual, al tiempo que se respeta el contrato de enrutamiento basado en claves.

**Durabilidad de Redis

- Pulse se basa en Redis para la durabilidad. Si Redis está configurado con persistencia (AOF/snapshots o cluster con replicación), los trabajos sobreviven a las caídas de procesos y nodos.
- Si Redis pierde sus datos, Pulse no puede recuperar los trabajos ni los metadatos de los trabajadores; en ese caso, el pool empieza de cero.

En la práctica, esto significa:
- Con un Redis duradero, un trabajo que `DispatchJob` ha aceptado se ejecutará correctamente, fallará con un error emergente o se volverá a intentar hasta que un trabajador pueda procesarlo.
- La principal contrapartida es la semántica at-least-once: los manejadores deben ser idempotentes porque los reintentos y reequilibrios pueden hacer que el mismo trabajo se ejecute más de una vez.

### Creación de un pool

```go
import (
    "github.com/redis/go-redis/v9"
    "goa.design/pulse/pool"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // Create a pool node that can run workers
    node, err := pool.AddNode(ctx, "my-pool", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)
}
```

### Despacho de trabajos

```go
type EmailJob struct {
    Email string `json:"email"`
}

// Producer node (often created with pool.WithClientOnly)
payload, err := json.Marshal(EmailJob{
    Email: "user@example.com",
})
if err != nil {
    log.Fatal(err)
}

// Dispatch job with key (determines which worker handles it)
if err := node.DispatchJob(ctx, "user:123", payload); err != nil {
    log.Fatal(err)
}
```

### Procesamiento de trabajos

```go
// Worker implementation: decode strongly-typed jobs from []byte payloads.
type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var payload EmailJob
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    return sendEmail(payload.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    // Optional: clean up resources for the given job key.
    return nil
}

// Attach the handler to a worker in the pool.
_, err := node.AddWorker(ctx, &EmailJobHandler{})
if err != nil {
    log.Fatal(err)
}
```

### Fregaderos (Grupos de consumidores)

Los sumideros en Pulse se construyen sobre el paquete de streaming y son utilizados internamente por el pool
para equilibrar el trabajo entre los trabajadores. Múltiples nodos del pool que se unen al mismo nombre de pool comparten el trabajo:

```go
// Two nodes participating in the same pool
node1, _ := pool.AddNode(ctx, "email-pool", rdb)
node2, _ := pool.AddNode(ctx, "email-pool", rdb)

// Jobs dispatched to "email-pool" are distributed across all active workers.
```

### Opciones de configuración

**Nodos de reserva (`pool.AddNode`)**

| Opción | Descripción |
|--------|-------------|
| `pool.WithWorkerTTL(d)` | Con qué agresividad detectar trabajadores muertos; valores más bajos significan una conmutación por error más rápida, valores más altos significan menos latidos. |
| `pool.WithMaxQueuedJobs(n)` | Límite global de trabajos en cola en vuelo; excederlo hace que las nuevas llamadas `DispatchJob` fallen rápidamente. |
| `pool.WithAckGracePeriod(d)` | Cuánto tiempo espera el pool a que un trabajador reconozca haber iniciado un trabajo antes de poder reasignarlo. |
| `pool.WithClientOnly()` | Crear un nodo que sólo envíe trabajos (sin enrutamiento en segundo plano ni trabajadores). |
| `pool.WithLogger(logger)` | Adjuntar un logger estructurado para todos los internos del pool. |

Para un ajuste más avanzado (TTLs de apagado, duraciones de bloque de sumidero, etc.), consulte la sección
[docs](https://pkg.go.dev/goa.design/pulse/pool).

---

## Configuración de la infraestructura

### Requisitos de Redis

Pulse requiere Redis 5.0+ para soportar Streams. Para producción:

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### Cluster Redis

Para una alta disponibilidad, utilice Redis Cluster:

```go
rdb := redis.NewClusterClient(&redis.ClusterOptions{
    Addrs: []string{
        "redis-1:6379",
        "redis-2:6379",
        "redis-3:6379",
    },
})
```

---

## Patrones

### Event Sourcing

```go
// Append events to a stream
stream.Add(ctx, "order.created", orderCreatedEvent)
stream.Add(ctx, "order.paid", orderPaidEvent)
stream.Add(ctx, "order.shipped", orderShippedEvent)

// Replay events to rebuild state
reader, _ := stream.NewReader(ctx, "replay", streaming.WithStartID("0"))
for {
    events, _ := reader.Read(ctx)
    for _, e := range events {
        applyEvent(state, e)
    }
}
```

### Procesamiento de tareas asíncronas

```go
// Task payload type used on both producer and worker sides.
type ImageTask struct {
    URL string `json:"url"`
}

// Producer: queue tasks into the pool with a strongly-typed payload.
payload, err := json.Marshal(ImageTask{URL: imageURL})
if err != nil {
    log.Fatal(err)
}
if err := node.DispatchJob(ctx, taskID, payload); err != nil {
    log.Fatal(err)
}

// Worker: process tasks in a JobHandler.
type ImageTaskHandler struct{}

func (h *ImageTaskHandler) Start(job *pool.Job) error {
    var task ImageTask
    if err := json.Unmarshal(job.Payload, &task); err != nil {
        return err
    }
    return processImage(task.URL)
}

func (h *ImageTaskHandler) Stop(key string) error {
    return nil
}
```

---

## Ejemplo Completo: Flujo de alta de usuarios

El siguiente esquema muestra cómo combinar flujos, un grupo de trabajadores y un mapa replicado
para implementar un flujo de registro de usuario con confirmación por correo electrónico y banderas de características:

```go
type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

type EmailJob struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    // 1. Shared feature flags / config across services.
    flags, err := rmap.New(ctx, "feature-flags", rdb, rmap.WithLogger(pulse.ClueLogger(ctx)))
    if err != nil {
        log.Fatal(err)
    }
    defer flags.Close()

    // 2. Stream for user lifecycle events.
    userStream, err := streaming.NewStream("users", rdb,
        streaming.WithStreamMaxLen(10_000),
        streaming.WithStreamLogger(pulse.ClueLogger(ctx)),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer userStream.Destroy(ctx)

    // 3. Worker pool for sending emails.
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)

    // 4. Attach a worker that reads jobs from the pool.
    _, err = node.AddWorker(ctx, &EmailJobHandler{})
    if err != nil {
        log.Fatal(err)
    }

    // 5. On user signup, publish an event and dispatch a job.
    created := UserCreatedEvent{
        UserID: "123",
        Email:  "user@example.com",
    }
    payload, _ := json.Marshal(created)
    if _, err := userStream.Add(ctx, "user.created", payload); err != nil {
        log.Fatal(err)
    }

    jobPayload, _ := json.Marshal(EmailJob{
        UserID: created.UserID,
        Email:  created.Email,
    })
    if err := node.DispatchJob(ctx, "email:"+created.UserID, jobPayload); err != nil {
        log.Fatal(err)
    }
}

type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var j EmailJob
    if err := json.Unmarshal(job.Payload, &j); err != nil {
        return err
    }
    // Optionally read feature flags from rmap here before sending.
    return sendWelcomeEmail(j.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}
```

Este patrón se escala de forma natural: puedes añadir más trabajadores de correo electrónico, añadir consumidores adicionales de la función
`users` flujo (análisis, auditoría, etc.), y compartir el estado del plano de control adicional a través de mapas replicados.

---

## Consideraciones de producción

- **Dimensionamiento y durabilidad de Redis**: Utiliza Redis 5+ con la persistencia configurada adecuadamente (AOF o snapshotting) dependiendo de lo críticos que sean los datos del stream y los mapas replicados para tu carga de trabajo.
- **Recorte de flujos**: Establezca `WithStreamMaxLen` lo suficientemente alto como para acomodar las necesidades de repetición (abastecimiento de eventos, depuración) pero lo suficientemente bajo como para evitar el crecimiento ilimitado; recuerde que el recorte es aproximado.
- **Semántica de "al menos una vez": Los flujos y sumideros son at-least-once; diseña los manejadores para que sean idempotentes y seguros de reintentar.
- **TTLs de los trabajadores y apagado**: Ajuste `WithWorkerTTL` y `WithWorkerShutdownTTL` en función de la rapidez con la que desea detectar los trabajadores fallidos y el tiempo que necesitan para drenar el trabajo en el apagado.
- **Trabajos pendientes y atascados**: `WithAckGracePeriod` y el seguimiento interno de trabajos pendientes del pool evitan que los trabajos se queden atascados para siempre, pero aún así deberías monitorizar los trabajos que fallan repetidamente al iniciarse.
- **Observabilidad**: Utiliza `pulse.ClueLogger` o tu propio logger estructurado con `WithStreamLogger`, `WithLogger`, y `rmap.WithLogger` para poder rastrear eventos y ciclos de vida de trabajos en producción.
- **Límites de presión y cola**: Utilice `WithMaxQueuedJobs`, `WithReaderMaxPolled` y `WithSinkMaxPolled` para limitar el uso de memoria y explicitar la contrapresión cuando el sistema esté sobrecargado.
- **Alta disponibilidad**: Para sistemas críticos, ejecute Redis en modo clúster o centinela y ejecute múltiples nodos de pool para que los trabajadores puedan fallar limpiamente.

---

## Solución de problemas

- **No se puede conectar a Redis**: Verifique la dirección, la contraseña y la configuración TLS utilizadas por `redis.NewClient` o `redis.NewClusterClient`; Pulse simplemente propaga estos errores de conexión.
- **No se están entregando eventos**: Compruebe que los lectores y los sumideros utilizan el nombre de flujo, la posición de inicio (`WithReaderStart*` / `WithSinkStart*`) y el patrón de tema/tema correctos; compruebe también que `BlockDuration` no está configurado como `0` por error.
- **Parece que faltan eventos**: Si `WithStreamMaxLen` es demasiado pequeño, es posible que se hayan recortado los eventos más antiguos; aumente la longitud máxima o persista los eventos importantes en otro lugar.
- **Nunca se recogen los trabajos**: Asegúrese de que al menos un nodo que no sea sólo cliente está funcionando con trabajadores activos (`AddWorker`) y que no se ha superado `WithMaxQueuedJobs`.
- **Los trabajos siguen siendo reintentados o movidos entre trabajadores**: Esto suele indicar que el trabajador no se inicia o se bloquea durante el procesamiento; inspeccione los registros de los gestores de trabajos y considere aumentar `WithAckGracePeriod` o arreglar los gestores no idempotentes.
- **Carga desigual del trabajador**: El hash consistente en saltos normalmente equilibra bien las claves; si la mayoría de los trabajos comparten la misma clave, considere fragmentar el espacio de claves o utilizar una estrategia de clave diferente.
- **Cuelgues por apagado**: Si `Close` o el cierre de un pool tarda demasiado, revise `WithWorkerShutdownTTL` y asegúrese de que las implementaciones de `Stop` de los trabajadores vuelven rápidamente incluso cuando el trabajo es lento o los servicios externos están caídos.

### Caché distribuido

```go
// Cache with replicated map
cache, _ := rmap.New(ctx, "cache", rdb)

func GetUser(ctx context.Context, id string) (*User, error) {
    // Check cache
    if data, err := cache.Get(ctx, "user:"+id); err == nil {
        return unmarshalUser(data)
    }
    
    // Fetch from database
    user, err := db.GetUser(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Update cache (propagates to all nodes)
    cache.Set(ctx, "user:"+id, marshalUser(user))
    return user, nil
}
```

---

## Ver también

- [Pulse GitHub Repository](https://github.com/goadesign/pulse) - Código fuente y ejemplos
- [Documentación de Redis Streams](https://redis.io/docs/data-types/streams/) - Conceptos de Redis Streams
