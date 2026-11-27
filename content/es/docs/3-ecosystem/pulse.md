---
title: "Pulse"
weight: 2
description: "Streams de eventos sobre Redis, pools de workers con hash consistente y mapas replicados en memoria para servicios Go."
llm_optimized: true
---

Pulse ofrece tres paquetes Go enfocados en la coordinación distribuida sobre Redis (`*redis.Client`), sin introducir un broker de mensajería adicional. Funciona de forma independiente en cualquier binario Go o junto a servicios Goa y Goa-AI.

{{< anchors "visión-general" "por-qué-pulse" "casos-de-uso" >}}
## Resumen

| Paquete | Tipo principal | Caso de uso |
|---------|----------------|-------------|
| `goa.design/pulse/streaming` | `streaming.Stream`, `Reader`, `Sink` | Streams de eventos, fan-out independiente y colas por grupo de consumidores |
| `goa.design/pulse/pool` | `pool.Node`, `pool.Worker` | Trabajos en segundo plano particionados por clave con failover automático |
| `goa.design/pulse/rmap` | `rmap.Map` | Estado clave-valor replicado y en caché local entre réplicas del servicio |

## Instalación

```bash
go get goa.design/pulse@latest
```

---

{{< anchors "mapas-replicados" "caché-distribuido" >}}
## Mapas replicados (`rmap`)

`rmap` mantiene un mapa clave-valor de lectura local y consistencia eventual entre nodos mediante un hash de Redis (`map:<name>:content`), scripts Lua atómicos de escritura y un canal pub/sub de actualizaciones en Redis (`map:<name>:updates`).

### Arquitectura

{{< figure src="/images/diagrams/PulseRmap.svg" alt="Pulse replicated map architecture showing distributed state synchronization" class="img-fluid" >}}

- **Almacén canónico**: El hash de Redis `map:<name>:content` guarda las entradas clave-valor autoritativas.
- **Escrituras atómicas**: Cada mutación (`Set`, `Inc`, `AppendValues`, `TestAndSet`, `Delete`, `Reset`) se ejecuta en un único script Lua de Redis que actualiza el hash y publica una notificación binaria compacta en `map:<name>:updates`.
- **Lecturas sin red**: Cada proceso unido mantiene una copia en memoria actualizada por pub/sub, de modo que `Get`, `Keys` y `Map` leen memoria local sin viajes de red a Redis.

{{< anchors "unir-y-leer" "escribiendo" >}}
### Unirse, leer y escribir

```go
package main

import (
    "context"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    // Join loads a snapshot from Redis and subscribes to live updates
    m, err := rmap.Join(ctx, "config", rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer m.Close()

    // Mutate state atomically in Redis (propagates to all joined nodes)
    if _, err := m.Set(ctx, "feature.enabled", "true"); err != nil {
        log.Fatal(err)
    }
    _, _ = m.Inc(ctx, "requests.total", 1)
    _, _ = m.AppendValues(ctx, "allowed.regions", "us-east-1", "eu-west-1")
    _, _ = m.TestAndSet(ctx, "config.version", "v1", "v2")

    // Read directly from the local in-memory cache
    if value, ok := m.Get("feature.enabled"); ok {
        log.Printf("feature.enabled = %s (keys: %v)", value, m.Keys())
    }
}
```

{{< anchors "notificaciones-de-cambios" >}}
### Escuchar notificaciones de cambio

```go
changes := m.Subscribe()
defer m.Unsubscribe(changes)

go func() {
    for kind := range changes {
        switch kind {
        case rmap.EventChange:
            log.Printf("config updated: %v", m.Map())
        case rmap.EventDelete:
            log.Println("config key deleted")
        case rmap.EventReset:
            log.Println("config reset")
        }
    }
}()
```

`Subscribe` emite notificaciones `EventKind` de grano grueso (`EventChange`, `EventDelete`, `EventReset`) y agrupa ráfagas rápidas para que los mapas con alta frecuencia de escritura no saturen a los lectores; consulta `m.Get`, `m.Map()` o `m.Keys()` al despertar.

{{< anchors "opciones-clave-de-configuración" >}}
### Consistencia y modos de fallo

- **Orden al unirse**: `rmap.Join` se suscribe a `map:<name>:updates` *antes* de ejecutar `HGETALL`, garantizando que no se pierda ninguna mutación ocurrida entre la instantánea inicial y la suscripción.
- **Desconexiones y caídas**: Si cae la conexión pub/sub de Redis, el bucle en segundo plano reintenta la suscripción automáticamente mientras las lecturas locales siguen sirviendo la última instantánea en caché. Si un proceso termina abruptamente, Redis conserva el estado canónico y los procesos reiniciados llaman a `rmap.Join` para rehidratarse.
- **Opciones**: Pasa `rmap.WithLogger(pulse.ClueLogger(ctx))` (de `goa.design/pulse/pulse`) para adjuntar logs estructurados. Consulta [`pkg.go.dev/goa.design/pulse/rmap`](https://pkg.go.dev/goa.design/pulse/rmap).

---

{{< anchors "streaming" "event-sourcing" >}}
## Streaming (`streaming`)

`streaming` enruta eventos tipados entre microservicios sobre Redis Streams, admitiendo tanto cursores independientes en fan-out (`Reader`) como colas de trabajo compartidas por grupo de consumidores (`Sink`).

### Arquitectura

{{< figure src="/images/diagrams/PulseStreaming.svg" alt="Pulse streaming architecture showing event producer, streams, and consumer" class="img-fluid" >}}

### Retención predeterminada del stream (`1.000` eventos)

Por defecto, `streaming.NewStream` conserva los **`1.000` eventos más recientes** aplicando recorte exacto `MAXLEN =` en Redis Streams:
- Pasa `options.WithStreamMaxLen(n)` (de `goa.design/pulse/streaming/options`) para ampliar o reducir el límite de eventos retenidos.
- Pasa `options.WithUnboundedStream()` cuando las tareas pendientes no deban recortarse nunca de forma automática, y llama a `stream.Remove(ctx, event.ID)` una vez liquidado cada elemento.

{{< anchors "creación-de-flujos" "publicación-de-eventos" >}}
### Crear streams y publicar eventos

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/pulse/streaming"
    "goa.design/pulse/streaming/options"
)

type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func publishSignup(ctx context.Context, rdb *redis.Client) error {
    stream, err := streaming.NewStream("users", rdb,
        options.WithStreamMaxLen(10_000),
    )
    if err != nil {
        return err
    }

    payload, err := json.Marshal(UserCreatedEvent{
        UserID: "123",
        Email:  "user@example.com",
    })
    if err != nil {
        return err
    }

    eventID, err := stream.Add(ctx, "user.created", payload)
    if err != nil {
        return err
    }
    log.Printf("published user.created as %s", eventID)
    return nil
}
```

{{< anchors "eventos-de-consumo" "patrón-fan-out" "patrón-fan-in" "readers-vs-sinks" "fregaderos-grupos-de-consumidores" "patrones" >}}
### Consumir eventos: `Sink` frente a `Reader`

Tanto `Sink` como `Reader` entregan eventos por un canal Go devuelto por `Subscribe() <-chan *streaming.Event`:

| | `Reader` (`stream.NewReader`) | `Sink` (`stream.NewSink`) |
|---|---|---|
| **Cursor** | Independiente por instancia de `Reader` (sin nombre de grupo) | Compartido entre todas las instancias de `Sink` con el mismo `name` |
| **Entrega** | Cada `Reader` recibe **todos** los eventos | Cada evento se entrega a **un único** consumidor del `Sink` |
| **Confirmación** | Ninguna (`reader.Close()` detiene la lectura) | Explícita con `sink.Ack(ctx, event)` (salvo `WithSinkNoAck()`) |
| **Ideal para** | Proyecciones en vivo, invalidación de caché, auditoría y replay | Colas de trabajo at-least-once en segundo plano, workers paralelos |

**`Sink` compartido por grupo de consumidores (cola de trabajo at-least-once):**

```go
sink, err := stream.NewSink(ctx, "billing-workers",
    options.WithSinkBlockDuration(time.Second),
)
if err != nil {
    log.Fatal(err)
}
defer sink.Close(ctx)

for event := range sink.Subscribe() {
    if err := processBilling(event); err != nil {
        log.Printf("billing failed for %s (will retry after ack grace period): %v", event.ID, err)
        continue
    }
    if err := sink.Ack(ctx, event); err != nil {
        log.Printf("ack failed: %v", err)
    }
}
```

**`Reader` independiente (fan-out, repetición desde el inicio y fan-in multi-stream):**

```go
// Replay from the oldest retained event in ordersStream, and fan in paymentsStream
reader, err := ordersStream.NewReader(ctx, options.WithReaderStartAtOldest())
if err != nil {
    log.Fatal(err)
}
defer reader.Close()

if err := reader.AddStream(ctx, paymentsStream); err != nil {
    log.Fatal(err)
}

for event := range reader.Subscribe() {
    applyProjection(event.StreamName, event.EventName, event.Payload)
}
```

{{< anchors "opciones-clave-de-configuración-1" >}}
### Opciones principales de streaming (`goa.design/pulse/streaming/options`)

| Opción | Destino | Descripción |
|--------|---------|-------------|
| `options.WithStreamMaxLen(n)` | `NewStream` | Límite exacto `MAXLEN =` de eventos por stream (por defecto: `1.000`). |
| `options.WithUnboundedStream()` | `NewStream` | Desactiva el recorte `MAXLEN`; combínalo con `stream.Remove(ctx, ids...)`. |
| `options.WithStreamLogger(logger)` | `NewStream` | Adjunta un logger estructurado (`pulse.ClueLogger(ctx)`). |
| `options.WithReaderStartAtOldest()` | `NewReader` | Reproduce desde la entrada retenida más antigua del stream en lugar de las nuevas. |
| `options.WithReaderTopic(t)` / `WithReaderTopicPattern(re)` | `NewReader` | Filtra los eventos entregados por tema exacto o expresión regular. |
| `options.WithSinkAckGracePeriod(d)` | `NewSink` | Ventana de concesión antes de que otro consumidor reclame un evento no confirmado. |
| `options.WithSinkMaxPolled(n)` / `WithReaderMaxPolled(n)` | `NewSink` / `NewReader` | Número máximo de eventos leídos por lote de consulta a Redis. |
| `options.WithTopic(topic)` / `WithOnlyIfStreamExists()` | `stream.Add` | Etiqueta el evento publicado con un tema, u omite crear streams inexistentes. |

Consulta [`pkg.go.dev/goa.design/pulse/streaming/options`](https://pkg.go.dev/goa.design/pulse/streaming/options) para ver el catálogo completo de opciones.

---

{{< anchors "pools-de-trabajadores" "procesamiento-de-tareas-asíncronas" >}}
## Pools de workers (`pool`)

`pool` reparte trabajos con clave entre una flota de procesos worker mediante jump consistent hashing, de forma que los trabajos con la misma clave van siempre al mismo worker y se reequilibran automáticamente cuando entran, salen o dejan de emitir latidos otros workers.

### Arquitectura

{{< figure src="/images/diagrams/PulsePool.svg" alt="Pulse worker pool architecture showing job dispatch flow" class="img-fluid" >}}

{{< anchors "creación-de-un-pool" "despacho-de-trabajos" "procesamiento-de-trabajos" "opciones-de-configuración" >}}
### Crear un nodo de pool, añadir workers y despachar trabajos

```go
type EmailJob struct {
    Email string `json:"email"`
}

type EmailJobHandler struct{}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var payload EmailJob
    if err := json.Unmarshal(job.Payload, &payload); err != nil {
        return err
    }
    return sendEmail(payload.Email)
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}

func runPool(ctx context.Context, rdb *redis.Client) error {
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
        pool.WithMaxQueuedJobs(1_000),
    )
    if err != nil {
        return err
    }
    defer node.Close(ctx)

    if _, err := node.AddWorker(ctx, &EmailJobHandler{}); err != nil {
        return err
    }

    payload, err := json.Marshal(EmailJob{Email: "user@example.com"})
    if err != nil {
        return err
    }
    // Producers that only enqueue jobs can pass pool.WithClientOnly() to AddNode
    return node.DispatchJob(ctx, "user:123", payload)
}
```

{{< anchors "modos-de-fallo-y-durabilidad" >}}
### Semántica de entrega y conmutación por fallo

- **Ejecución at-least-once**: Los workers registran latidos en un `rmap`; si un worker supera `WithWorkerTTL`, los nodos compañeros vuelven a encolar sus trabajos activos hacia los propietarios vivos según el hash consistente. Mantén idempotentes los manejadores `Start`.
- **`Close` frente a `Shutdown`**: `node.Close(ctx)` reencola los trabajos de este nodo en los nodos restantes durante un despliegue progresivo; `node.Shutdown(ctx)` coordina una parada de toda la flota sin reencolar.
- **Contrapresión**: `pool.WithMaxQueuedJobs(n)` acota los envíos en cola para que los pools saturados fallen rápido en lugar de crecer sin límite en Redis.

---

{{< anchors "ejemplo-completo-flujo-de-alta-de-usuarios" >}}
## Ejemplo completo: flujo de registro de usuarios

Combinación de `rmap`, `streaming` y `pool` en un mismo servicio:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
    cluelog "goa.design/clue/log"
    "goa.design/pulse/pool"
    "goa.design/pulse/pulse"
    "goa.design/pulse/rmap"
    "goa.design/pulse/streaming"
    "goa.design/pulse/streaming/options"
)

type UserCreatedEvent struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

type EmailJob struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
}

func main() {
    ctx := cluelog.Context(context.Background())
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    logger := pulse.ClueLogger(ctx)

    // 1. Replicated feature flags across service instances
    flags, err := rmap.Join(ctx, "feature-flags", rdb, rmap.WithLogger(logger))
    if err != nil {
        log.Fatal(err)
    }
    defer flags.Close()

    // 2. Bounded stream for user lifecycle events
    userStream, err := streaming.NewStream("users", rdb,
        options.WithStreamMaxLen(10_000),
        options.WithStreamLogger(logger),
    )
    if err != nil {
        log.Fatal(err)
    }

    // 3. Consistent-hash worker pool for welcome emails
    node, err := pool.AddNode(ctx, "email-pool", rdb,
        pool.WithWorkerTTL(30*time.Second),
        pool.WithAckGracePeriod(20*time.Second),
        pool.WithMaxQueuedJobs(1_000),
        pool.WithLogger(logger),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close(ctx)

    if _, err := node.AddWorker(ctx, &EmailJobHandler{flags: flags}); err != nil {
        log.Fatal(err)
    }

    // 4. Publish lifecycle event and dispatch keyed background job
    created := UserCreatedEvent{UserID: "123", Email: "user@example.com"}
    eventBytes, _ := json.Marshal(created)
    if _, err := userStream.Add(ctx, "user.created", eventBytes); err != nil {
        log.Fatal(err)
    }

    jobBytes, _ := json.Marshal(EmailJob(created))
    if err := node.DispatchJob(ctx, "email:"+created.UserID, jobBytes); err != nil {
        log.Fatal(err)
    }
}

type EmailJobHandler struct {
    flags *rmap.Map
}

func (h *EmailJobHandler) Start(job *pool.Job) error {
    var j EmailJob
    if err := json.Unmarshal(job.Payload, &j); err != nil {
        return err
    }
    if enabled, ok := h.flags.Get("welcome_email"); ok && enabled == "false" {
        return nil
    }
    log.Printf("sending welcome email to %s", j.Email)
    return nil
}

func (h *EmailJobHandler) Stop(key string) error {
    return nil
}
```

---

{{< anchors "configuración-de-la-infraestructura" "requisitos-de-redis" "cluster-redis" "consideraciones-de-producción" "solución-de-problemas" >}}
## Configuración de Redis y lista de control para producción

- **Tipo de cliente y persistencia**: Los constructores de Pulse (`rmap.Join`, `streaming.NewStream`, `pool.AddNode`) reciben `*redis.Client` contra Redis 7.0+ o Valkey (Redis 6.2+ basta si no se usa `rmap.WithTTL` con `EXPIRE NX`; la recuperación de sinks requiere `XAUTOCLAIM` desde Redis 6.2) en instancia única, primario-réplica con Redis Sentinel (`redis.NewFailoverClient`) o endpoints gestionados con persistencia AOF. `*redis.ClusterClient` no está soportado porque los scripts Lua operan directamente sobre las claves de mapas y streams.
- **Recorte exacto de streams**: `NewStream` recorta en `1.000` eventos por defecto mediante `MAXLEN =` exacto. Ajusta `options.WithStreamMaxLen(n)` a tu ventana de replay, o usa `options.WithUnboundedStream()` + `stream.Remove(ctx, id)` explícito cuando cada tarea encolada deba procesarse antes de borrarse.
- **Manejadores idempotentes**: Tanto los consumidores de `Sink` como los workers de `pool` entregan al menos una vez ante caídas y reequilibrios; protege los efectos externos con claves de idempotencia.

{{< anchors "ver-también" >}}
## Véase también

- [Repositorio de Pulse en GitHub](https://github.com/goadesign/pulse) — Código fuente y pruebas
- [Arquitectura de Chorus](../chorus/#architecture) — Ejemplo en producción que combina `pulse/rmap`, `pulse/streaming` y `pulse/semaphore`
