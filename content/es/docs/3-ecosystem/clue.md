---
title: "Pista"
weight: 3
description: "Microservice instrumentation for Go - logging, tracing, metrics, health checks, and debugging."
llm_optimized: true
---

Clue proporciona instrumentación completa para microservicios Go construidos sobre OpenTelemetry. Aunque está diseñado para integrarse perfectamente con Goa, Clue funciona con cualquier servicio Go HTTP o gRPC.

## ¿Por qué Clue?

Clue resuelve un problema común en microservicios: necesitas registros detallados cuando las cosas van mal, pero no quieres pagar el coste de registrar todo todo el tiempo.

El enfoque de Clue: **Almacena los mensajes de registro en memoria y sólo los escribe cuando se produce un error o la solicitud está siendo rastreada**. Las peticiones exitosas y no rastreadas no generan salida de registro. Cuando se producen errores, se obtiene el contexto completo de lo que condujo al fracaso.

Esta única decisión de diseño reduce drásticamente el volumen de registro al tiempo que conserva la información de depuración que necesita.

## Visión general del paquete

| Paquete | Propósito |
|---------|---------|
| `clue` | Configuración de OpenTelemetry - una llamada para configurar métricas y rastreo |
| `log` | Registro estructurado basado en el contexto con almacenamiento inteligente |
| `health` | Puntos finales de comprobación de estado para Kubernetes y sistemas de orquestación |
| `debug` | Depuración en tiempo de ejecución: alternar registros de depuración, puntos finales de pprof | `mock`
| `mock` | Generar y configurar dobles de prueba para las dependencias |
| `interceptors` | Interceptores Goa para rastrear mensajes de flujo individuales |

## Instalación

Instale sólo los paquetes que necesita:

```bash
go get goa.design/clue/clue
go get goa.design/clue/log
go get goa.design/clue/health
go get goa.design/clue/debug
go get goa.design/clue/mock
go get goa.design/clue/interceptors
```

---

## El paquete de registro

El paquete `log` está construido alrededor de `context.Context` de Go. Inicializas un contexto de registro una vez y lo pasas a través de tu aplicación. Todas las funciones de registro toman este contexto como primer argumento.

### Inicio Rápido

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

### Entendiendo el Buffering

Esta es la característica clave de Clue. Hay dos tipos de funciones de registro:

**Funciones inmediatas** - escriben directamente a la salida:
- `Print()`, `Printf()` - escriben siempre inmediatamente
- `Error()`, `Errorf()` - vacía el buffer, luego escribe
- `Fatal()`, `Fatalf()` - vacía la memoria intermedia, escribe y luego sale

**Funciones con búfer** - almacenar en memoria hasta que se vacíe:
- `Info()`, `Infof()` - almacenar el mensaje en la memoria intermedia
- `Warn()`, `Warnf()` - almacena el mensaje en la memoria intermedia
- `Debug()`, `Debugf()` - almacenan el mensaje si está activada la depuración

El búfer se vacía automáticamente cuando:
1. `Error()` o `Fatal()` se llama
2. La solicitud está siendo rastreada (detectada a través del contexto OpenTelemetry span)
3. El modo de depuración está activado

**Ejemplo: Por qué es importante**

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

Para una petición con éxito: **cero salida de registro**. Para una petición fallida: **contexto completo**.

### Añadir contexto con With()

Construye el contexto de registro a medida que las peticiones fluyen a través de tu servicio:

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

Dos formas de especificar pares clave-valor:

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

Utilice `KV` cuando el orden de los campos de registro sea importante (más fácil de escanear). Utilice `Fields` cuando no importe.

Los valores pueden ser: cadenas, números, booleanos, nil, o trozos de estos tipos.

### Formatos de registro

Clue detecta automáticamente los terminales y selecciona el formato apropiado:

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText** (por defecto para no terminales) - estilo logfmt:
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal** (por defecto para terminales) - color, marcas de tiempo relativas:
```
INFO[0042] user=alice action=login
```

**FormatJSON** - JSON estructurado:
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

### Añadir IDs de Trace y Span

Conectar logs a trazas distribuidas:

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

### Añadir ubicación del archivo

Para depuración, añada el archivo fuente y los números de línea:

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

La salida incluye: `file=mypackage/handler.go:42`

### Middleware HTTP

El middleware HTTP hace dos cosas:
1. Copia el logger de su contexto base en el contexto de cada petición
2. Registra el inicio/final de la solicitud con método, URL, estado y duración

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

Para servidores gRPC:

```go
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(log.UnaryServerInterceptor(ctx)),
    grpc.ChainStreamInterceptor(log.StreamServerInterceptor(ctx)),
)
```

Para clientes gRPC:

```go
conn, err := grpc.Dial(addr,
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
    grpc.WithStreamInterceptor(log.StreamClientInterceptor()),
)
```

### Registro de clientes HTTP

Envuelva los transportes HTTP para registrar las peticiones salientes:

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

Añadir nombres de servicios y métodos a los logs:

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)  // Adds goa.service and goa.method to context
```

### Personalización de las claves de registro

Todas las claves de registro son variables de paquete que puede anular:

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

### Adaptador para otros registradores

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

## El paquete de pistas

El paquete `clue` configura OpenTelemetry con valores predeterminados sensibles en una sola llamada a la función.

### Configuración Básica

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

Clue incluye un muestreador adaptativo que ajusta automáticamente la frecuencia de muestreo en función del volumen de tráfico. Esto evita que el almacenamiento de trazas se sature durante los picos de tráfico.

Ajustes por defecto:
- **Velocidad máxima de muestreo:** 2 trazas por segundo
- **Tamaño de la muestra:** 10 peticiones entre ajustes

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

### Funciones de ayuda al exportador

Clue proporciona funciones de ayuda que crean exportadores con un manejo adecuado de los cierres:

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

### Desactivación de métricas o rastreo

Pasa `nil` para el exportador que no necesites:

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

## El paquete de salud

El paquete `health` crea puntos finales de comprobación de salud que informan sobre las dependencias de los servicios.

### Uso Básico

```go
import "goa.design/clue/health"

func main() {
    checker := health.NewChecker()
    
    mux := http.NewServeMux()
    mux.Handle("/healthz", health.Handler(checker))
    mux.Handle("/livez", health.Handler(checker))
}
```

### Comprobación de dependencias

Utilice `NewPinger` para comprobar los servicios que exponen puntos finales de salud:

```go
checker := health.NewChecker(
    health.NewPinger("database-service", "db.internal:8080"),
    health.NewPinger("cache-service", "cache.internal:8080"),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https")),
)
```

**Opciones de llamada:**

```go
health.NewPinger("service", "host:port",
    health.WithScheme("https"),           // Default: "http"
    health.WithPath("/health"),           // Default: "/livez"
    health.WithTimeout(5 * time.Second),  // Default: no timeout
    health.WithTransport(customTransport),
)
```

### Controles de salud personalizados

Implementa la interfaz `Pinger` para comprobaciones personalizadas:

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

El manejador devuelve JSON por defecto, XML si se solicita:

**Saludable (HTTP 200):**
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

**No saludable (HTTP 503):**
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

Establecer la versión en tiempo de compilación:

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

## El paquete de depuración

El paquete `debug` permite la resolución de problemas en tiempo de ejecución sin necesidad de volver a desplegar.

### Registro dinámico de depuración

Montar un punto final para alternar los registros de depuración en tiempo de ejecución:

```go
mux := http.NewServeMux()
debug.MountDebugLogEnabler(mux)  // Mounts at /debug
```

Controlar los registros de depuración a través de HTTP:

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

**Importante:** El endpoint sólo controla una bandera. Debe utilizar el middleware de depuración para que tenga efecto:

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

### pprof Endpoints

Monta los endpoints de perfilado de Go:

```go
debug.MountPprofHandlers(mux)  // Mounts at /debug/pprof/
```

Endpoints disponibles:
- `/debug/pprof/` - Página de índice
- `/debug/pprof/heap` - Perfil de montón
- `/debug/pprof/goroutine` - Perfil Goroutine
- `/debug/pprof/profile` - Perfil de CPU (30s por defecto)
- `/debug/pprof/trace` - Traza de ejecución
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex`, etc.

⚠️ **Advertencia de seguridad:** No expongas públicamente los endpoints pprof. Revelan información sensible sobre tu aplicación.

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

### Registro de carga útil para Goa

Registra las cargas útiles de solicitud y respuesta cuando la depuración está activada:

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

### Adaptador Goa Muxer

Para el muxer HTTP de Goa:

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

## El paquete falso

El paquete `mock` ayuda a crear dobles de prueba para dependencias con soporte para secuencias de llamada y mocks permanentes.

### Conceptos

**Secuencias:** Define las llamadas esperadas en orden. Cada llamada a `Next()` devuelve la siguiente función de la secuencia.

**Mocks permanentes:** Siempre devuelven la misma función, se usan después de agotar las secuencias o cuando el orden no importa.

### Creando un Mock

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

### Uso de Mocks en Pruebas

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

Utilice `Set()` para las llamadas que deben comportarse siempre igual:

```go
userMock.SetGetUser(func(ctx context.Context, id string) (*User, error) {
    return &User{ID: id, Name: "Test User"}, nil
})
```

Las secuencias tienen prioridad sobre los mocks permanentes. Una vez agotada la secuencia, `Next()` devuelve el mock permanente.

### Generador de simulacros (cmg)

Genera mocks automáticamente a partir de interfaces:

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

Los mocks generados van en un subdirectorio `mocks/` junto al fichero fuente.

---

## El paquete de interceptores

El paquete `interceptors` proporciona interceptores Goa para rastrear mensajes individuales en RPCs de flujo. A diferencia de la instrumentación estándar de OpenTelemetry (que rastrea todo el flujo), estos interceptores propagan el contexto de rastreo a través de cada mensaje.

### Cuando Usar

Utilice estos interceptores cuando necesite
- Rastreo por mensaje en flujos de larga duración
- Contexto de rastreo para fluir del cliente al servidor a través de mensajes de flujo
- Cronometraje y correlación de mensajes individuales

### Configuración del diseño

En su diseño Goa, defina interceptores con atributos `TraceMetadata`:

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

Aplicar a los métodos de streaming:

```go
Method("Chat", func() {
    StreamingPayload(ChatMessage)
    StreamingResult(ChatResponse)
    ClientInterceptor(TraceBidirectionalStream)
    ServerInterceptor(TraceBidirectionalStream)
})
```

### Implementación

En tus implementaciones de interceptores, llama a las funciones proporcionadas:

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

### Extracción del contexto de rastreo de los mensajes recibidos

Dado que las interfaces de flujo generadas por Goa no devuelven un contexto, utilice las funciones de ayuda:

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

O usa el wrapper para un código más limpio:

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
            health.NewPinger("database", dbAddr),
        ),
    ))
    
    // 7. Start server
    log.Printf(ctx, "starting server on :8080")
    http.ListenAndServe(":8080", mux)
}
```

---

## Mejores prácticas

### Registro

1. **Utilice `Info()` para el procesamiento de solicitudes, `Print()` para los eventos del ciclo de vida.** Los registros de solicitudes deben almacenarse en búfer; los registros de inicio/apagado deben escribirse inmediatamente.

2. **Utilice `log.With()` para añadir IDs y metadatos tan pronto como los tenga.

3. **Utilice `log.WithFunc(log.Span)` para correlacionar los registros con las trazas.

### Health Checks

1. **Comprueba dependencias reales.** No devuelvas sólo 200. Verifique las conexiones de la base de datos, servicios aguas abajo.

2. **Un chequeo que se cuelga es peor que uno que falla.

3. **Utilice `/livez` para la salud básica del proceso, `/readyz` para comprobaciones completas de dependencia.

### Depuración

1. **Nunca exponga pprof públicamente.** Use un puerto interno separado o una política de red.

2. **Estructurar el registro de modo que el modo de depuración revele información útil sin abrumar.

---

## Ver también

- [Guía de producción](../../1-goa/production/) - Patrones de despliegue de producción
- [Clue GitHub Repository](https://github.com/goadesign/clue) - Código fuente y ejemplo meteorológico
- [Documentación de OpenTelemetry](https://opentelemetry.io/docs/) - Conceptos de OpenTelemetry
