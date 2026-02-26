---
title: Interceptors
weight: 7
description: "Complete guide to interceptors and middleware in Goa - type-safe Goa interceptors, HTTP middleware, and gRPC interceptors."
llm_optimized: true
aliases:
---

Goa proporciona una solución completa para el procesamiento de peticiones que combina interceptores de tipo seguro con patrones de middleware tradicionales. Esta guía cubre los tres enfoques.

## Visión general

Cuando se procesan peticiones en un servicio Goa, se dispone de tres herramientas complementarias:

1. **Interceptores Goa**: Acceso comprobado en tiempo de compilación a los tipos de dominio de tu servicio
2. **Middleware HTTP**: Patrón estándar `http.Handler` para problemas específicos de HTTP
3. **Interceptores gRPC**: Patrones gRPC estándar para necesidades específicas de RPC

### Cuándo usar cada uno

| Preocupación | Herramienta |
|---------|------|
| Validación de lógica de negocio | Interceptores Goa |
| Transformación de datos | Interceptores Goa |
| Enriquecimiento de petición/respuesta | Interceptores Goa |
| Logging, trazas | Middleware HTTP/gRPC |
| Compresión, CORS | Middleware HTTP |
| Gestión de metadatos | Interceptores gRPC |
| Limitación de velocidad | Middleware HTTP/gRPC |

---

## Interceptores Goa

Los interceptores Goa proporcionan acceso seguro a los tipos de dominio de su servicio, con comprobaciones en tiempo de compilación y métodos de ayuda generados.

### Modelo de ejecución (código generado)

Los interceptores no son “ganchos mágicos” del runtime. En Goa son **wrappers de endpoints generados**. El DSL indica qué campos puede leer/escribir un interceptor y la generación produce:

- **Contrato del lado del servicio** en `gen/<service>/service_interceptors.go`
  - Interfaz `ServerInterceptors`: un método por interceptor
  - Estructuras `*<Interceptor>Info`: metadatos de servicio/método + accesores
  - Interfaces de acceso `*Payload` / `*Result`: solo los campos que declaraste como legibles/escribibles
- **Contrato del lado del cliente** en `gen/<service>/client_interceptors.go`
  - Interfaz `ClientInterceptors` y sus tipos `*Info` + accesores
- **Cadena de wrappers** en `gen/<service>/interceptor_wrappers.go`
  - `Wrap<Method>Endpoint` y `Wrap<Method>ClientEndpoint` por método
  - En streaming, wrappers de stream que interceptan `SendWithContext` / `RecvWithContext`
- **Cableado** en `gen/<service>/endpoints.go` y `gen/<service>/client.go`
  - `NewEndpoints` aplica wrappers del lado servidor alrededor de los endpoints del servicio
  - `NewClient` aplica wrappers del lado cliente alrededor de los endpoints del transporte

La consecuencia importante es: **los interceptores del servidor se ejecutan después del decode del transporte y antes del método del servicio**, y **los interceptores del cliente se ejecutan antes del encode del transporte y después del decode de la respuesta** (porque envuelven el mismo endpoint tipado que llama tu código cliente).

### Contrato del interceptor del servidor

Goa genera una interfaz por servicio. Cada método del interceptor debe llamar a `next` exactamente una vez para continuar (o devolver un error/respuesta antes):

```go
type ServerInterceptors interface {
    RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error)
}
```

En tiempo de ejecución, normalmente:

1. Usas `info.Payload()` / `info.Result(res)` para acceso **type-safe** (recomendado).
2. Usas `info.Service()`, `info.Method()` y `info.CallType()` para etiquetar logs/métricas con identificadores estables.
3. Llamas a `next(ctx, info.RawPayload())` para continuar la cadena.
4. Opcionalmente mutas el payload antes de `next`, o mutas el result después.

Ejemplo (enriquecimiento del result + timing):

```go
type Interceptors struct{}

func (i *Interceptors) RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error) {
    start := time.Now()

    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }

    r := info.Result(res)
    r.SetProcessedAt(time.Now().UTC().Format(time.RFC3339Nano))
    r.SetDuration(int(time.Since(start).Milliseconds()))

    return res, nil
}
```

Por qué importan las interfaces de acceso:

- Si declaras `ReadPayload(Attribute("recordID"))`, Goa genera `RecordID() <type>`.
- Si declaras `WriteResult(Attribute("cachedAt"))`, Goa genera `SetCachedAt(<type>)`.
- El interceptor no puede tocar campos que no declaraste; ese es el contrato en tiempo de compilación.

### Contrato del interceptor del cliente

Los interceptores de cliente son lo mismo, pero del lado cliente: envuelven el endpoint de transporte que pasas a `gen/<service>.NewClient(...)`.

En la práctica eso significa:

- `info.RawPayload()` es el **payload tipado del método** (por ejemplo, `*GetPayload`), no un `*http.Request`.
- Si “escribes” en el payload en el interceptor, el endpoint de transporte codificará esos cambios (headers/body/etc.) según los mapeos del transporte.
- Puedes usar `info.Result(res)` para leer/escribir campos del result tras decodificar la respuesta.

### Orden (qué corre primero de verdad)

Los interceptores se aplican generando una cadena de wrappers. El `Wrap<Method>Endpoint` generado es la fuente de verdad del orden.

Conceptualmente, la generación hace algo así:

```go
func WrapGetEndpoint(endpoint goa.Endpoint, i ServerInterceptors) goa.Endpoint {
    endpoint = wrapGetCache(endpoint, i)
    endpoint = wrapGetJWTAuth(endpoint, i)
    endpoint = wrapGetRequestAudit(endpoint, i)
    endpoint = wrapGetSetDeadline(endpoint, i)
    endpoint = wrapGetTraceRequest(endpoint, i)
    return endpoint
}
```

Cada `wrap...` devuelve un nuevo endpoint que llama al interceptor con `next` apuntando al endpoint anterior. Por eso:

- **En la entrada (petición)**: el **último** wrapper se ejecuta primero.
- **En la salida (respuesta)**: el **primer** wrapper se ejecuta primero.

Si el orden importa, usa este modelo mental en vez de una regla genérica: **mira el wrap generado del método**.

### Interceptores de streaming (Send/Recv)

En streaming bidireccional, la generación envuelve el stream para que cada envío/recepción sea interceptado. Un mismo interceptor puede invocarse con distintos tipos de llamada:

- `goa.InterceptorUnary`: interceptación única de la llamada al endpoint del stream
- `goa.InterceptorStreamingSend`: interceptación de cada `SendWithContext`
- `goa.InterceptorStreamingRecv`: interceptación de cada `RecvWithContext`

Usa `info.CallType()` si necesitas ramificar. En send, `info.RawPayload()` es el mensaje. En recv, el “payload” lo produce `next` (tu interceptor lo ve como valor de retorno).

### Definición de Interceptores

```go
var RequestLogger = Interceptor("RequestLogger", func() {
    Description("Logs incoming requests and their timing")
    
    // Read status from result
    ReadResult(func() {
        Attribute("status")
    })
    
    // Add timing information to result
    WriteResult(func() {
        Attribute("processedAt")
        Attribute("duration")
    })
})
```

### Aplicación de interceptores

Aplicar a nivel de servicio o método:

```go
var _ = Service("calculator", func() {
    // Apply to all methods
    ServerInterceptor(RequestLogger)
    
    Method("add", func() {
        // Method-specific interceptor
        ServerInterceptor(ValidateNumbers)
        
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(func() {
            Attribute("sum", Int)
            Attribute("status", Int)
            Attribute("processedAt", String)
            Attribute("duration", Int)
        })
    })
})
```

### Implementación de interceptores

```go
func (i *Interceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    start := time.Now()
    
    // Call next interceptor or endpoint
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // Access result through type-safe interface
    r := info.Result(res)
    
    // Add timing information
    r.SetProcessedAt(time.Now().Format(time.RFC3339))
    r.SetDuration(int(time.Since(start).Milliseconds()))
    
    return res, nil
}
```

### Patrones de acceso

#### Acceso de sólo lectura

```go
var Monitor = Interceptor("Monitor", func() {
    Description("Collects metrics without modifying data")
    
    ReadPayload(func() {
        Attribute("size")
    })
    
    ReadResult(func() {
        Attribute("status")
    })
})
```

#### Acceso de escritura

```go
var Enricher = Interceptor("Enricher", func() {
    Description("Adds context information")
    
    WritePayload(func() {
        Attribute("requestID")
    })
    
    WriteResult(func() {
        Attribute("processedAt")
    })
})
```

#### Acceso combinado

```go
var DataProcessor = Interceptor("DataProcessor", func() {
    Description("Processes both requests and responses")
    
    ReadPayload(func() {
        Attribute("rawData")
    })
    WritePayload(func() {
        Attribute("processed")
    })
    
    ReadResult(func() {
        Attribute("status")
    })
    WriteResult(func() {
        Attribute("enriched")
    })
})
```

### Interceptores del lado del cliente

```go
var ClientContext = Interceptor("ClientContext", func() {
    Description("Enriches requests with client context")
    
    WritePayload(func() {
        Attribute("clientVersion")
        Attribute("clientID")
    })
    
    ReadResult(func() {
        Attribute("rateLimit")
        Attribute("rateLimitRemaining")
    })
})

var _ = Service("inventory", func() {
    ClientInterceptor(ClientContext)
    // ...
})
```

### Interceptores de flujo

Para los métodos de streaming, utilice variantes de streaming:

```go
var ServerProgressTracker = Interceptor("ServerProgressTracker", func() {
    Description("Adds progress to server stream responses")
    
    WriteStreamingResult(func() {
        Attribute("percentComplete")
        Attribute("itemsProcessed")
    })
})

var ClientMetadataEnricher = Interceptor("ClientMetadataEnricher", func() {
    Description("Enriches outgoing client stream messages")
    
    WriteStreamingPayload(func() {
        Attribute("clientTimestamp")
    })
})
```

### Orden de ejecución

Goa aplica interceptores construyendo una cadena de wrappers alrededor del endpoint de cada método. La forma más sencilla de entender el orden exacto (sobre todo cuando mezclas interceptores a nivel de servicio y de método) es mirar el `Wrap<Method>Endpoint` generado y recordar:

- **El último wrapper se ejecuta primero** en la ruta de petición.
- **El primer wrapper se ejecuta primero** en la ruta de respuesta.

Si necesitas un contrato estable en tu propio código, trata el wrap generado como la especificación canónica del orden para ese método.

---

## Middleware HTTP

El middleware HTTP gestiona los problemas a nivel de protocolo utilizando el patrón estándar `http.Handler`.

### Pila de middleware común

```go
mux := goahttp.NewMuxer()

// Add middleware (outermost to innermost)
mux.Use(debug.HTTP())                               // Debug logging
mux.Use(otelhttp.NewMiddleware("service"))          // OpenTelemetry
mux.Use(log.HTTP(ctx))                              // Request logging
mux.Use(goahttpmiddleware.RequestID())              // Request ID
mux.Use(goahttpmiddleware.PopulateRequestContext()) // Goa context
```

### Creación de middleware personalizado

```go
func ExampleMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Pre-processing
        start := time.Now()
        
        next.ServeHTTP(w, r)
        
        // Post-processing
        log.Printf("Request took %v", time.Since(start))
    })
}
```

### Middleware de cabeceras de seguridad

```go
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        
        next.ServeHTTP(w, r)
    })
}
```

### Middleware de enriquecimiento del contexto

```go
func ContextEnrichmentMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        ctx = context.WithValue(ctx, "request.start", time.Now())
        ctx = context.WithValue(ctx, "request.id", r.Header.Get("X-Request-ID"))
        
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Middleware de gestión de errores

```go
func ErrorHandlingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("panic recovered: %v", err)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        
        next.ServeHTTP(w, r)
    })
}
```

---

## Interceptores gRPC

los interceptores gRPC gestionan los problemas a nivel de protocolo de las llamadas RPC.

### Interceptores Unarios

```go
func LoggingInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        start := time.Now()
        
        resp, err := handler(ctx, req)
        
        log.Printf("Method: %s, Duration: %v, Error: %v",
            info.FullMethod, time.Since(start), err)
        
        return resp, err
    }
}
```

### Interceptores de flujo

```go
func StreamLoggingInterceptor() grpc.StreamServerInterceptor {
    return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        start := time.Now()
        
        err := handler(srv, ss)
        
        log.Printf("Stream: %s, Duration: %v, Error: %v",
            info.FullMethod, time.Since(start), err)
        
        return err
    }
}
```

### Integración con Goa

```go
func main() {
    srv := grpc.NewServer(
        grpc.UnaryInterceptor(grpc_middleware.ChainUnaryServer(
            MetadataInterceptor(),
            LoggingInterceptor(),
            MonitoringInterceptor(),
        )),
        grpc.StreamInterceptor(grpc_middleware.ChainStreamServer(
            StreamMetadataInterceptor(),
            StreamLoggingInterceptor(),
        )),
    )

    pb.RegisterServiceServer(srv, server)
}
```

---

## Combinando los tres

He aquí cómo funcionan los tres enfoques juntos:

```go
func main() {
    // 1. Create service with Goa interceptors
    svc := NewService()
    interceptors := NewInterceptors(log.Default())
    endpoints := NewEndpoints(svc, interceptors)
    
    // 2. Set up HTTP with middleware
    mux := goahttp.NewMuxer()
    mux.Use(otelhttp.NewMiddleware("payment-svc"))
    mux.Use(debug.HTTP())
    mux.Use(log.HTTP(ctx))
    
    httpServer := genhttp.New(endpoints, mux, dec, enc, eh, eh)
    genhttp.Mount(mux, httpServer)
    
    // 3. Set up gRPC with interceptors
    grpcServer := grpc.NewServer(
        grpc.UnaryInterceptor(grpc_middleware.ChainUnaryServer(
            grpc_recovery.UnaryServerInterceptor(),
            grpc_prometheus.UnaryServerInterceptor,
        )),
    )
    
    grpcSvr := gengrpc.New(endpoints, nil)
    genpb.RegisterPaymentServer(grpcServer, grpcSvr)
}
```

### Flujo de ejecución

```
Request Processing:
─────────────────────────────────────────────────────────────────>
HTTP/gRPC Middleware → Goa Interceptors → Service Method

Response Processing:
<─────────────────────────────────────────────────────────────────
Service Method → Goa Interceptors → HTTP/gRPC Middleware
```

---

## Mejores prácticas

### Interceptores Goa
- Usar para validación de lógica de negocio y transformación de datos
- Mantener los interceptores centrados en responsabilidades únicas
- Utilizar patrones de acceso seguros

### Middleware HTTP
- Ordenar cuidadosamente el middleware (primero la recuperación de pánico, luego el logging, etc.)
- Precompile objetos costosos (regex, etc.)
- Utilice sync.Pool para los objetos asignados con frecuencia

### Interceptores gRPC
- Centrarse en las preocupaciones a nivel de protocolo
- Manejar adecuadamente la cancelación de contexto
- Utilizar códigos de estado apropiados

### General
- Probar los interceptores y el middleware de forma aislada
- Considerar el impacto en el rendimiento
- Documente la finalidad de cada interceptor

---

## Véase también

- [Referencia DSL](dsl-reference/) - Definiciones DSL del interceptor
- [Guía HTTP](http-guide/) - Patrones de middleware específicos de HTTP
- [Guía gRPC](grpc-guide/) - Patrones de interceptores gRPC
- [Documentación de Clue](../3-ecosystem/clue/) - Interceptores y middleware de observabilidad
