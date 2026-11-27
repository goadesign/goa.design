---
title: "Clue"
weight: 3
description: "Instrumentación de microservicios para Go: logs, trazas, métricas, comprobaciones de salud y depuración."
llm_optimized: true
---

Clue proporciona instrumentación integral para microservicios Go basada en OpenTelemetry. Aunque está diseñado para integrarse de forma nativa con Goa, Clue funciona con cualquier servicio HTTP o gRPC en Go.

## ¿Por qué Clue?

Clue resuelve un dilema habitual en microservicios: necesitas logs detallados cuando algo falla, pero no quieres pagar el coste de registrarlo todo continuamente.

El enfoque de Clue consiste en **acumular los mensajes de log en memoria y escribirlos únicamente cuando ocurre un error o la petición está siendo trazada**. Las peticiones exitosas sin traza no generan ninguna salida de log. Cuando se produce un fallo, obtienes todo el contexto previo que condujo al error.

Esta decisión de diseño reduce drásticamente el volumen de logs conservando intacta la información necesaria para depurar.

## Resumen de paquetes

| Paquete | Propósito |
|---------|-----------|
| `clue` | Configuración de OpenTelemetry: una sola llamada para activar métricas y trazas |
| `log` | Logging estructurado basado en contexto con almacenamiento inteligente en búfer |
| `health` | Endpoints de comprobación de salud para Kubernetes y sistemas de orquestación |
| `debug` | Depuración en vivo: activación dinámica de logs de depuración y endpoints pprof |
| `mock` | Generación y configuración de dobles de prueba para dependencias |
| `interceptors` | Interceptores Goa para trazar mensajes individuales en streams |

## Instalación

Instala únicamente los paquetes que necesites:

```bash
go get goa.design/clue/clue
go get goa.design/clue/log
go get goa.design/clue/health
go get goa.design/clue/debug
go get goa.design/clue/mock
go get goa.design/clue/interceptors
```

---

## El paquete `log`

El paquete `log` gira en torno a `context.Context` de Go. Inicializas una vez el contexto de logging y lo propagas por tu aplicación. Todas las funciones de log reciben ese contexto como primer argumento.

### Inicio rápido

```go
import "goa.design/clue/log"

func main() {
    // Initialize the logging context
    ctx := log.Context(context.Background())
    
    // Log a message
    log.Printf(ctx, "server starting on port %d", 8080)
    
    // Log structured key-value pairs
    log.Print(ctx, log.KV{K: "event", V: "startup"}, log.KV{K: "port", V: 8080})
}
```

### Cómo funciona el búfer

Esta es la capacidad central de Clue. Existen dos familias de funciones de log:

**Funciones inmediatas** — escriben directamente en la salida:
- `Print()`, `Printf()` — escriben siempre de inmediato
- `Error()`, `Errorf()` — vuelcan el búfer y después escriben
- `Fatal()`, `Fatalf()` — vuelcan el búfer, escriben y terminan el proceso

**Funciones con búfer** — guardan en memoria hasta que se vuelca el búfer:
- `Info()`, `Infof()` — almacenan el mensaje en el búfer
- `Warn()`, `Warnf()` — almacenan el mensaje en el búfer
- `Debug()`, `Debugf()` — se escriben solo cuando el modo de depuración está activo (se descartan en caso contrario)

El búfer se vuelca automáticamente cuando:
1. Se llama a `Error()` o `Fatal()`
2. La petición está siendo trazada (detectado mediante el contexto de span de OpenTelemetry)
3. El modo de depuración está activado

**Ejemplo práctico:**

```go
func HandleRequest(ctx context.Context, req *Request) error {
    log.Infof(ctx, "received request for user %s", req.UserID)  // buffered
    
    user, err := db.GetUser(ctx, req.UserID)
    if err != nil {
        // Error flushes the buffer - you see BOTH log lines
        log.Errorf(ctx, err, "failed to get user")
        return err
    }
    
    log.Infof(ctx, "user found: %s", user.Name)  // buffered
    
    // Request succeeds - no logs written (buffer discarded)
    return nil
}
```

En una petición exitosa: **cero líneas de log**. En una petición fallida: **todo el contexto**.

### Añadir contexto con `With()`

Enriquece el contexto de logging a medida que la petición atraviesa el servicio:

```go
func HandleOrder(ctx context.Context, orderID string) error {
    // Add order ID to all subsequent logs
    ctx = log.With(ctx, log.KV{K: "order_id", V: orderID})
    
    log.Info(ctx, log.KV{K: "msg", V: "processing order"})
    // Output includes: order_id=abc123 msg="processing order"
    
    return processPayment(ctx)
}

func processPayment(ctx context.Context) error {
    // order_id is already in context
    log.Info(ctx, log.KV{K: "msg", V: "charging card"})
    // Output includes: order_id=abc123 msg="charging card"
    return nil
}
```

### Pares clave-valor

Dos formas de expresar pares clave-valor:

```go
// KV - deterministic order, slice-backed
log.Print(ctx,
    log.KV{K: "user", V: "alice"},
    log.KV{K: "action", V: "login"},
    log.KV{K: "ip", V: "192.168.1.1"},
)

// Fields - map-backed, order not guaranteed
log.Print(ctx, log.Fields{
    "user":   "alice",
    "action": "login",
    "ip":     "192.168.1.1",
})
```

Usa `KV` cuando importe el orden de los campos (más fácil de leer). Usa `Fields` cuando no sea relevante.

Los valores admitidos son cadenas, números, booleanos, `nil` o slices de cualquiera de ellos.

### Formatos de log

Clue detecta automáticamente si la salida es una terminal y elige el formato adecuado:

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText** (por defecto fuera de terminales) — estilo logfmt:
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal** (por defecto en terminales) — con color y marcas de tiempo relativas:
```
INFO[0042] user=alice action=login
```

**FormatJSON** — JSON estructurado:
```json
{"time":"2024-01-15T10:30:00Z","level":"info","user":"alice","action":"login"}
```

**Formato personalizado:**

```go
func myFormat(e *log.Entry) []byte {
    return []byte(fmt.Sprintf("[%s] %v\n", e.Severity, e.KeyVals))
}

ctx := log.Context(context.Background(), log.WithFormat(myFormat))
```

### Añadir IDs de traza y span

Vincula cada línea de log con sus trazas distribuidas:

```go
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatJSON),
    log.WithFunc(log.Span),  // Adds trace_id and span_id to every log
)
```

Salida:
```json
{"time":"...","level":"info","trace_id":"abc123","span_id":"def456","msg":"hello"}
```

### Añadir ubicación del archivo fuente

Para facilitar la depuración, incluye el archivo fuente y el número de línea:

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

La salida añade: `file=mypackage/handler.go:42`

### Middleware HTTP

El middleware HTTP cumple dos funciones:
1. Copia el logger del contexto base en el contexto de cada petición
2. Registra el inicio y fin de la petición con método, URL, código de estado y duración

```go
func main() {
    ctx := log.Context(context.Background())
    
    handler := http.HandlerFunc(myHandler)
    handler = log.HTTP(ctx)(handler)  // Note: returns middleware, then apply
    
    http.ListenAndServe(":8080", handler)
}
```

**Opciones:**

```go
// Skip logging for certain paths (e.g., health checks)
handler = log.HTTP(ctx, log.WithPathFilter(regexp.MustCompile(`^/healthz$`)))(handler)

// Disable request logging entirely (still sets up context)
handler = log.HTTP(ctx, log.WithDisableRequestLogging())(handler)

// Disable request ID generation
handler = log.HTTP(ctx, log.WithDisableRequestID())(handler)
```

### Interceptores gRPC

En servidores gRPC:

```go
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(log.UnaryServerInterceptor(ctx)),
    grpc.ChainStreamInterceptor(log.StreamServerInterceptor(ctx)),
)
```

En clientes gRPC:

```go
conn, err := grpc.Dial(addr,
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
    grpc.WithStreamInterceptor(log.StreamClientInterceptor()),
)
```

### Logging en clientes HTTP

Envuelve el transporte HTTP para registrar las peticiones salientes:

```go
client := &http.Client{
    Transport: log.Client(http.DefaultTransport),
}

// With OpenTelemetry tracing
client := &http.Client{
    Transport: log.Client(
        otelhttp.NewTransport(http.DefaultTransport),
    ),
}
```

### Integración con Goa

Añade el nombre del servicio y del método a los logs:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)  // Adds goa.service and goa.method to context
```

### Personalizar las claves de log

Todas las claves de log son variables de paquete que puedes redefinir:

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

### Adaptadores para otros loggers

```go
// Standard library log.Logger compatible
stdLogger := log.AsStdLogger(ctx)

// AWS SDK logger
awsLogger := log.AsAWSLogger(ctx)

// logr.LogSink (for Kubernetes controllers, etc.)
sink := log.ToLogrSink(ctx)

// Goa middleware logger
goaLogger := log.AsGoaMiddlewareLogger(ctx)
```

---

## El paquete `clue`

El paquete `clue` configura OpenTelemetry con valores predeterminados razonables en una sola llamada.

### Configuración básica

```go
import (
    "goa.design/clue/clue"
    "goa.design/clue/log"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
)

func main() {
    ctx := log.Context(context.Background())
    
    // Create exporters
    spanExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("localhost:4317"),
        otlpmetricgrpc.WithInsecure())
    if err != nil {
        log.Fatal(ctx, err)
    }
    
    // Configure OpenTelemetry
    cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
    if err != nil {
        log.Fatal(ctx, err)
    }
    clue.ConfigureOpenTelemetry(ctx, cfg)
}
```

### Muestreo adaptativo

Clue incorpora un muestreador adaptativo que ajusta automáticamente la tasa de muestreo según el volumen de tráfico, evitando saturar el almacenamiento de trazas durante picos de carga.

Valores por defecto:
- **Tasa máxima de muestreo:** 2 trazas por segundo
- **Tamaño de muestra:** 10 peticiones entre ajustes

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

### Funciones auxiliares para exportadores

Clue incluye constructores auxiliares que crean exportadores con cierre ordenado:

```go
// gRPC exporters
metricExporter, shutdown, err := clue.NewGRPCMetricExporter(ctx,
    otlpmetricgrpc.WithEndpoint("localhost:4317"))
defer shutdown()

spanExporter, shutdown, err := clue.NewGRPCSpanExporter(ctx,
    otlptracegrpc.WithEndpoint("localhost:4317"))
defer shutdown()

// HTTP exporters
metricExporter, shutdown, err := clue.NewHTTPMetricExporter(ctx,
    otlpmetrichttp.WithEndpoint("localhost:4318"))
defer shutdown()

spanExporter, shutdown, err := clue.NewHTTPSpanExporter(ctx,
    otlptracehttp.WithEndpoint("localhost:4318"))
defer shutdown()
```

### Opciones de configuración

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),
    clue.WithSampleSize(50),
    clue.WithReaderInterval(30 * time.Second),  // Metric export interval
    clue.WithPropagators(propagation.TraceContext{}),  // Custom propagators
    clue.WithResource(resource.NewWithAttributes(...)),  // Additional resource attributes
    clue.WithErrorHandler(myErrorHandler),
)
```

### Desactivar métricas o trazas

Pasa `nil` en el exportador que no necesites:

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

## El paquete `health`

El paquete `health` construye endpoints de comprobación de salud que informan del estado de las dependencias del servicio.

### Uso básico

```go
import "goa.design/clue/health"

func main() {
    checker := health.NewChecker()
    
    mux := http.NewServeMux()
    mux.Handle("/healthz", health.Handler(checker))
    mux.Handle("/livez", health.Handler(checker))
}
```

### Comprobar dependencias de servicios HTTP

Usa `NewPinger` para sondear servicios HTTP aguas arriba que expongan un endpoint de salud `/livez` (o personalizado; para bases de datos SQL o Redis, implementa la interfaz `Pinger` de dos métodos mostrada más abajo):

```go
checker := health.NewChecker(
    health.NewPinger("orders-service", "orders.internal:8080", health.WithTimeout(5*time.Second)),
    health.NewPinger("inventory-service", "inventory.internal:8080", health.WithTimeout(5*time.Second)),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https"), health.WithTimeout(5*time.Second)),
)
```

**Opciones de `NewPinger`:**

```go
health.NewPinger("service", "host:port",
    health.WithScheme("https"),           // Default: "http"
    health.WithPath("/health"),           // Default: "/livez"
    health.WithTimeout(5 * time.Second),  // Default: no timeout
    health.WithTransport(customTransport),
)
```

### Comprobaciones de salud personalizadas

Implementa la interfaz `Pinger` para verificaciones propias:

```go
type DBChecker struct {
    db *sql.DB
}

func (c *DBChecker) Name() string {
    return "postgresql"
}

func (c *DBChecker) Ping(ctx context.Context) error {
    return c.db.PingContext(ctx)
}

// Usage
checker := health.NewChecker(&DBChecker{db: db})
```

### Formato de respuesta

El manejador devuelve JSON por defecto y XML si se solicita:

**Sano (HTTP 200):**
```json
{
    "uptime": 3600,
    "version": "abc123",
    "status": {
        "postgresql": "OK",
        "redis": "OK"
    }
}
```

**Degradado (HTTP 503):**
```json
{
    "uptime": 3600,
    "version": "abc123",
    "status": {
        "postgresql": "OK",
        "redis": "NOT OK"
    }
}
```

Fija la versión en tiempo de compilación:

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

## El paquete `debug`

El paquete `debug` permite diagnosticar problemas en tiempo de ejecución sin volver a desplegar.

### Activación dinámica de logs de depuración

Monta un endpoint para encender o apagar los logs de depuración en caliente:

```go
mux := http.NewServeMux()
debug.MountDebugLogEnabler(mux)  // Mounts at /debug
```

Controla el estado por HTTP:

```bash
# Check current state
curl http://localhost:8080/debug
# {"debug-logs":"off"}

# Enable debug logging
curl "http://localhost:8080/debug?debug-logs=on"
# {"debug-logs":"on"}

# Disable debug logging
curl "http://localhost:8080/debug?debug-logs=off"
# {"debug-logs":"off"}
```

**Importante:** El endpoint solo cambia un indicador; debes instalar el middleware de `debug` para que surta efecto:

```go
// For HTTP servers
handler = debug.HTTP()(handler)

// For gRPC servers
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(debug.UnaryServerInterceptor()),
    grpc.ChainStreamInterceptor(debug.StreamServerInterceptor()),
)
```

**Opciones:**

```go
debug.MountDebugLogEnabler(mux,
    debug.WithPath("/api/debug"),     // Default: "/debug"
    debug.WithQuery("logging"),        // Default: "debug-logs"
    debug.WithOnValue("enable"),       // Default: "on"
    debug.WithOffValue("disable"),     // Default: "off"
)
```

### Endpoints `pprof`

Monta los endpoints de perfilado de Go:

```go
debug.MountPprofHandlers(mux)  // Mounts at /debug/pprof/
```

Endpoints disponibles:
- `/debug/pprof/` — Página índice
- `/debug/pprof/heap` — Perfil de memoria (heap)
- `/debug/pprof/goroutine` — Perfil de goroutines
- `/debug/pprof/profile` — Perfil de CPU (30 s por defecto)
- `/debug/pprof/trace` — Traza de ejecución
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex`, etc.

⚠️ **Aviso de seguridad:** Nunca expongas los endpoints `pprof` públicamente; revelan detalles internos sensibles de la aplicación.

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

### Registro de cargas útiles en Goa

Registra las cargas útiles de entrada y respuesta cuando la depuración está activa:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())  // Only logs when debug enabled
endpoints.Use(log.Endpoint)
```

**Opciones:**

```go
debug.LogPayloads(
    debug.WithMaxSize(2048),  // Max bytes to log, default: 1024
    debug.WithFormat(debug.FormatJSON),  // Custom formatter
    debug.WithClient(),  // Prefix keys with "client-" for client-side logging
)
```

### Adaptador para el muxer de Goa

Con el muxer HTTP de Goa:

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

## El paquete `mock`

El paquete `mock` facilita crear dobles de prueba para tus dependencias con soporte para secuencias ordenadas de llamadas y mocks permanentes.

### Conceptos

**Secuencias:** Definen las llamadas esperadas en orden. Cada invocación a `Next()` devuelve la siguiente función de la secuencia.

**Mocks permanentes:** Devuelven siempre la misma función; se utilizan una vez agotadas las secuencias o cuando el orden no importa.

### Crear un mock

```go
type MockUserService struct {
    *mock.Mock
    t *testing.T
}

func NewMockUserService(t *testing.T) *MockUserService {
    return &MockUserService{mock.New(), t}
}

func (m *MockUserService) GetUser(ctx context.Context, id string) (*User, error) {
    if f := m.Next("GetUser"); f != nil {
        return f.(func(context.Context, string) (*User, error))(ctx, id)
    }
    m.t.Error("unexpected GetUser call")
    return nil, errors.New("unexpected call")
}

func (m *MockUserService) AddGetUser(f func(context.Context, string) (*User, error)) {
    m.Add("GetUser", f)
}

func (m *MockUserService) SetGetUser(f func(context.Context, string) (*User, error)) {
    m.Set("GetUser", f)
}
```

### Usar mocks en pruebas

```go
func TestOrderService(t *testing.T) {
    userMock := NewMockUserService(t)
    
    // Add sequence: first call returns user, second returns error
    userMock.AddGetUser(func(ctx context.Context, id string) (*User, error) {
        return &User{ID: id, Name: "Alice"}, nil
    })
    userMock.AddGetUser(func(ctx context.Context, id string) (*User, error) {
        return nil, errors.New("not found")
    })
    
    svc := NewOrderService(userMock)
    
    // First call succeeds
    _, err := svc.CreateOrder(ctx, "user1", items)
    require.NoError(t, err)
    
    // Second call fails
    _, err = svc.CreateOrder(ctx, "user2", items)
    require.Error(t, err)
    
    // Verify all expected calls were made
    if userMock.HasMore() {
        t.Error("not all expected calls were made")
    }
}
```

### Mocks permanentes

Usa `Set()` para llamadas que deban comportarse siempre igual:

```go
userMock.SetGetUser(func(ctx context.Context, id string) (*User, error) {
    return &User{ID: id, Name: "Test User"}, nil
})
```

Las secuencias tienen prioridad sobre los mocks permanentes. Cuando la secuencia se agota, `Next()` devuelve el mock permanente.

### Generador de mocks (`cmg`)

Genera mocks automáticamente a partir de interfaces Go:

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

Los mocks generados se escriben en un subdirectorio `mocks/` junto al archivo de origen.

---

## El paquete `interceptors`

El paquete `interceptors` ofrece interceptores Goa para trazar mensajes individuales en RPCs de streaming. A diferencia de la instrumentación estándar de OpenTelemetry (que traza el stream completo como una sola unidad), estos interceptores propagan el contexto de traza en cada mensaje.

### Cuándo usarlos

Utilízalos cuando necesites:
- Trazas por mensaje en streams de larga duración
- Propagar el contexto de traza del cliente al servidor en cada mensaje del stream
- Medición de tiempos y correlación mensaje a mensaje

### Configuración en el diseño

En tu diseño Goa, declara interceptores con atributos `TraceMetadata`:

```go
var TraceBidirectionalStream = Interceptor("TraceBidirectionalStream", func() {
    WriteStreamingPayload(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    ReadStreamingPayload(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    WriteStreamingResult(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
    ReadStreamingResult(func() {
        Attribute("TraceMetadata", MapOf(String, String))
    })
})
```

Aplícalos a los métodos en streaming:

```go
Method("Chat", func() {
    StreamingPayload(ChatMessage)
    StreamingResult(ChatResponse)
    ClientInterceptor(TraceBidirectionalStream)
    ServerInterceptor(TraceBidirectionalStream)
})
```

### Implementación

En las implementaciones de tus interceptores, delega en las funciones incluidas:

```go
import "goa.design/clue/interceptors"

// Client-side
func (i *ClientInterceptors) TraceBidirectionalStream(
    ctx context.Context,
    info *genservice.TraceBidirectionalStreamInfo,
    next goa.Endpoint,
) (any, error) {
    return interceptors.TraceBidirectionalStreamClient(ctx, info, next)
}

// Server-side
func (i *ServerInterceptors) TraceBidirectionalStream(
    ctx context.Context,
    info *genservice.TraceBidirectionalStreamInfo,
    next goa.Endpoint,
) (any, error) {
    return interceptors.TraceBidirectionalStreamServer(ctx, info, next)
}
```

### Extraer el contexto de traza de los mensajes recibidos

Como las interfaces de stream generadas por Goa no devuelven un `context.Context`, usa las funciones auxiliares:

```go
func (s *Service) Chat(ctx context.Context, stream genservice.ChatServerStream) error {
    for {
        ctx = interceptors.SetupTraceStreamRecvContext(ctx)
        msg, err := stream.RecvWithContext(ctx)
        if err != nil {
            return err
        }
        ctx = interceptors.GetTraceStreamRecvContext(ctx)
        
        // ctx now contains trace context from the received message
        log.Info(ctx, log.KV{K: "received", V: msg.Text})
    }
}
```

O utiliza el envoltorio para simplificar el código:

```go
wrapped := interceptors.WrapTraceBidirectionalStreamServerStream(stream)

for {
    ctx, msg, err := wrapped.RecvAndReturnContext(ctx)
    if err != nil {
        return err
    }
    // ctx contains trace context
}
```

---

## Ejemplo completo

Un servicio Goa completamente instrumentado:

```go
package main

import (
    "context"
    "net/http"
    
    "goa.design/clue/clue"
    "goa.design/clue/debug"
    "goa.design/clue/health"
    "goa.design/clue/log"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    
    genservice "myapp/gen/myservice"
)

func main() {
    // 1. Initialize logging context with trace correlation
    ctx := log.Context(context.Background(),
        log.WithFormat(log.FormatJSON),
        log.WithFunc(log.Span))
    
    // 2. Configure OpenTelemetry
    spanExporter, _ := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure())
    metricExporter, _ := otlpmetricgrpc.New(ctx, otlpmetricgrpc.WithInsecure())
    cfg, _ := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
    clue.ConfigureOpenTelemetry(ctx, cfg)
    
    // 3. Create service and endpoints
    svc := NewService()
    endpoints := genservice.NewEndpoints(svc)
    endpoints.Use(debug.LogPayloads())  // Log payloads when debug enabled
    endpoints.Use(log.Endpoint)          // Add service/method to logs
    
    // 4. Create HTTP handler with middleware stack
    handler := genservice.NewHandler(endpoints)
    handler = otelhttp.NewHandler(handler, "myservice")  // OpenTelemetry
    handler = debug.HTTP()(handler)                       // Debug log control
    handler = log.HTTP(ctx)(handler)                      // Request logging
    
    // 5. Mount on mux
    mux := http.NewServeMux()
    mux.Handle("/", handler)
    
    // 6. Mount operational endpoints
    debug.MountDebugLogEnabler(mux)
    debug.MountPprofHandlers(mux)
    mux.Handle("/healthz", health.Handler(
        health.NewChecker(
            health.NewPinger("users-service", usersAddr, health.WithTimeout(5*time.Second)),
        ),
    ))
    
    // 7. Start server
    log.Printf(ctx, "starting server on :8080")
    http.ListenAndServe(":8080", mux)
}
```

---

## Buenas prácticas

### Logging

1. **Usa `Info()` al procesar peticiones y `Print()` para eventos de ciclo de vida.** Los logs de peticiones deben ir al búfer; el arranque y la parada deben escribirse al instante.

2. **Añade contexto pronto y registra tarde.** Usa `log.With()` para incorporar IDs y metadatos en cuanto estén disponibles.

3. **Activa siempre la correlación con trazas.** Usa `log.WithFunc(log.Span)` para enlazar cada línea de log con su traza.

### Comprobaciones de salud

1. **Comprueba las dependencias reales.** No devuelvas `200` sin más: verifica conexiones a bases de datos y servicios aguas arriba.

2. **Configura tiempos límite.** Una sonda de salud que se queda colgada es peor que una que falla rápido.

3. **Separa liveness y readiness.** Usa `/livez` para la salud básica del proceso y `/readyz` para verificar todas las dependencias.

### Depuración

1. **Nunca expongas `pprof` públicamente.** Utiliza un puerto interno separado o políticas de red.

2. **Diseña pensando en activar `debug` en caliente.** Estructura los logs `Debug()` para que aporten diagnóstico útil sin inundar la salida.

---

## Véase también

- [Guía de producción](../../1-goa/production/) — Patrones de despliegue en producción
- [Repositorio de Clue en GitHub](https://github.com/goadesign/clue) — Código fuente y ejemplo `weather`
- [Documentación de OpenTelemetry](https://opentelemetry.io/docs/) — Conceptos de OpenTelemetry
