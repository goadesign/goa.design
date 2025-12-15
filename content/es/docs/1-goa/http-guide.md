---
title: Guía HTTP
weight: 4
description: "Complete guide to HTTP transport in Goa - routing, content negotiation, WebSocket, SSE, CORS, and static content."
llm_optimized: true
aliases:
---

Esta guía cubre las características específicas de HTTP en Goa, desde el enrutamiento básico hasta temas avanzados como el streaming WebSocket y la negociación de contenidos.

## Enrutamiento HTTP

### Enrutamiento Básico

Las rutas se definen utilizando la función `HTTP` dentro de un Servicio:

```go
var _ = Service("calculator", func() {
    HTTP(func() {
        Path("/calculator")  // Base path for all endpoints
    })

    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int, "First operand")
            Field(2, "b", Int, "Second operand")
        })
        Result(Int)
        HTTP(func() {
            POST("/add")  // POST /calculator/add
        })
    })
})
```

Goa soporta todos los métodos HTTP estándar: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `TRACE`.

Un único método puede manejar varios métodos o rutas HTTP:

```go
Method("manage_user", func() {
    Payload(User)
    Result(User)
    HTTP(func() {
        POST("/users")          // Create
        PUT("/users/{user_id}") // Update
        Response(StatusOK)
        Response(StatusCreated)
    })
})
```

### Parámetros de ruta

Captura valores dinámicos de la URL:

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "user_id", String, "User ID")
    })
    Result(User)
    HTTP(func() {
        GET("/users/{user_id}")  // Maps to payload.UserID
    })
})
```

Asignar nombres de parámetros de URL a nombres de campo de carga útil:

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "id", Int, "User ID")
    })
    HTTP(func() {
        GET("/users/{user_id:id}")  // URL uses user_id, maps to payload.ID
    })
})
```

### Parámetros de consulta

Define parámetros de consulta con la función `Param`:

```go
Method("list_users", func() {
    Payload(func() {
        Field(1, "page", Int, "Page number", func() {
            Default(1)
            Minimum(1)
        })
        Field(2, "per_page", Int, "Items per page", func() {
            Default(20)
            Minimum(1)
            Maximum(100)
        })
    })
    Result(CollectionOf(User))
    HTTP(func() {
        GET("/users")
        Param("page")
        Param("per_page")
    })
})
```

### Comodines

Captura todos los segmentos de ruta restantes:

```go
Method("serve_files", func() {
    Payload(func() {
        Field(1, "path", String, "Path to file")
    })
    HTTP(func() {
        GET("/files/*path")  // Matches /files/docs/image.png
    })
})
```

### Relaciones de servicio

Utilice `Parent` para establecer jerarquías de servicios:

```go
var _ = Service("users", func() {
    HTTP(func() {
        Path("/users/{user_id}")
        CanonicalMethod("get")  // Override default "show"
    })
    
    Method("get", func() {
        Payload(func() {
            Field(1, "user_id", String)
        })
        HTTP(func() {
            GET("")  // GET /users/{user_id}
        })
    })
})

var _ = Service("posts", func() {
    Parent("users")  // Inherit parent's path
    
    Method("list", func() {
        // user_id inherited from parent
        HTTP(func() {
            GET("/posts")  // GET /users/{user_id}/posts
        })
    })
})
```

### Jerarquía de prefijos de ruta

Combina prefijos a nivel de API y de servicio:

```go
var _ = API("myapi", func() {
    HTTP(func() {
        Path("/api")  // Global prefix
    })
})

var _ = Service("users", func() {
    HTTP(func() {
        Path("/v1/users")  // Service prefix
    })
    
    Method("show", func() {
        HTTP(func() {
            GET("/{id}")  // Final: /api/v1/users/{id}
        })
    })
})
```

---

## Negociación de contenidos

### Codificadores incorporados

Los codificadores por defecto de Goa soportan:
- JSON (`application/json`, `*+json`)
- XML (`application/xml`, `*+xml`)
- Gob (`application/gob`, `*+gob`)
- HTML (`text/html`)
- Texto sin formato (`text/plain`)

El tipo de contenido de la respuesta viene determinado por:
1. `Accept` encabezado
2. `Content-Type` encabezado (si no hay Accept)
3. Por defecto (JSON)

Establece un tipo de contenido de respuesta predeterminado:

```go
Method("create", func() {
    HTTP(func() {
        POST("/media")
        Response(StatusCreated, func() {
            ContentType("application/json")
        })
    })
})
```

### Codificadores personalizados

Cree codificadores personalizados para formatos especializados:

```go
type MessagePackEncoder struct {
    w http.ResponseWriter
}

func (enc *MessagePackEncoder) Encode(v interface{}) error {
    enc.w.Header().Set("Content-Type", "application/msgpack")
    return msgpack.NewEncoder(enc.w).Encode(v)
}

func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

Registre los codificadores personalizados al crear el servidor:

```go
func main() {
    decoder := func(r *http.Request) goahttp.Decoder {
        switch r.Header.Get("Content-Type") {
        case "application/msgpack":
            return NewMessagePackDecoder(r)
        default:
            return goahttp.RequestDecoder(r)
        }
    }
    
    encoder := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        if accept := ctx.Value(goahttp.AcceptTypeKey).(string); accept == "application/msgpack" {
            return NewMessagePackEncoder(ctx, w)
        }
        return goahttp.ResponseEncoder(ctx, w)
    }
    
    server := myapi.NewServer(endpoints, mux, decoder, encoder, nil, nil)
}
```

---

## Integración WebSocket

> **Recapitulación del diseño**: El streaming se define a nivel de diseño usando `StreamingPayload` y `StreamingResult`. El DSL es independiente del transporte - el mismo diseño funciona para HTTP (WebSocket/SSE) y gRPC. Ver [Referencia DSL: Streaming](dsl-reference/#streaming) para patrones de diseño. Esta sección cubre la implementación de WebSocket específica para HTTP.

WebSocket permite la comunicación bidireccional en tiempo real. Goa implementa WebSocket a través de su DSL de streaming.

### Streaming Patterns

**Client-to-Server Streaming:**

```go
Method("listener", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message content")
        Required("message")
    })
    HTTP(func() {
        GET("/listen")  // WebSocket endpoints must use GET
    })
})
```

**Streaming de servidor a cliente:** ```go
Method("listener", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message content")
        Required("message")
    })
    HTTP(func() {
        GET("/listen")  // WebSocket endpoints must use GET
    })
})
```

```go
Method("subscribe", func() {
    StreamingResult(func() {
        Field(1, "message", String, "Update content")
        Field(2, "action", String, "Action type")
        Field(3, "timestamp", String, "When it happened")
        Required("message", "action", "timestamp")
    })
    HTTP(func() {
        GET("/subscribe")
    })
})
```

**Streaming bidireccional:**

```go
Method("echo", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message to echo")
        Required("message")
    })
    StreamingResult(func() {
        Field(1, "message", String, "Echoed message")
        Required("message")
    })
    HTTP(func() {
        GET("/echo")
    })
})
```

### Implementación de WebSocket

Implementación del lado del servidor:

```go
func (s *service) handleStream(ctx context.Context, stream Stream) error {
    connID := generateConnectionID()
    s.registerConnection(connID, stream)
    defer s.cleanupConnection(connID)

    errChan := make(chan error, 1)
    go func() {
        errChan <- s.handleIncoming(stream)
    }()

    select {
    case <-ctx.Done():
        return ctx.Err()
    case err := <-errChan:
        return err
    }
}
```

Gestión de la conexión:

```go
type ConnectionManager struct {
    connections map[string]*ManagedConnection
    mu          sync.RWMutex
}

func (cm *ConnectionManager) AddConnection(id string, stream Stream) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.connections[id] = &ManagedConnection{
        ID:       id,
        Stream:   stream,
        LastPing: time.Now(),
    }
}
```

---

## Eventos enviados por el servidor

> **Recapitulación del diseño**: SSE utiliza `StreamingResult` a nivel de diseño con `ServerSentEvents()` en el mapeo HTTP. Ver [DSL Reference: Streaming](dsl-reference/#streaming) para patrones de diseño.

SSE proporciona streaming unidireccional de servidor a cliente sobre HTTP. Es ideal para:
- Notificaciones en tiempo real
- Transmisión de datos en directo
- Actualizaciones de progreso
- Transmisión de eventos

### Diseño de la ESS

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("timestamp", Int, "Unix timestamp")
    Required("message", "timestamp")
})

var _ = Service("sse", func() {
    Method("stream", func() {
        StreamingResult(Event)
        HTTP(func() {
            GET("/events/stream")
            ServerSentEvents()  // Use SSE instead of WebSocket
        })
    })
})
```

Personalizar eventos SSE:

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("type", String, "Event type")
    Attribute("id", String, "Event ID")
    Attribute("retry", Int, "Reconnection delay in ms")
    Required("message", "type", "id")
})

Method("stream", func() {
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSEEventData("message")
            SSEEventType("type")
            SSEEventID("id")
            SSEEventRetry("retry")
        })
    })
})
```

Manejar Last-Event-Id para flujos reanudables:

```go
Method("stream", func() {
    Payload(func() {
        Attribute("startID", String, "Last event ID received")
    })
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSERequestID("startID")  // Maps Last-Event-Id header
        })
    })
})
```

### Implementación SSE

```go
func (s *Service) Stream(ctx context.Context, stream sse.StreamServerStream) error {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            event := &sse.Event{
                Message:   "Hello from server!",
                Timestamp: time.Now().Unix(),
            }
            if err := stream.Send(event); err != nil {
                return err
            }
        case <-ctx.Done():
            return nil
        }
    }
}
```

Cliente del navegador:

```javascript
const eventSource = new EventSource('/events/stream');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
    eventSource.close();
};
```

---

## Configuración CORS

El plugin CORS gestiona las peticiones de origen cruzado. Impórtelo:

```go
import (
    cors "goa.design/plugins/v3/cors/dsl"
    . "goa.design/goa/v3/dsl"
)
```

CORS a nivel de API:

```go
var _ = API("calc", func() {
    cors.Origin("http://127.0.0.1", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
        cors.MaxAge(600)
        cors.Credentials()
    })
})
```

CORS a nivel de servicio:

```go
var _ = Service("calc", func() {
    // Allow specific origin
    cors.Origin("localhost")

    // Allow subdomain pattern
    cors.Origin("*.domain.com", func() {
        cors.Headers("X-Shared-Secret", "X-Api-Version")
        cors.MaxAge(100)
        cors.Credentials()
    })

    // Allow all origins
    cors.Origin("*")

    // Allow regex pattern
    cors.Origin("/.*domain.*/", func() {
        cors.Headers("*")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
    })
})
```

---

## Contenido estático

> **Recapitulación del diseño**: El servicio de archivos estáticos utiliza la función DSL `Files`. Se trata de una función exclusiva de HTTP. Ver [DSL Reference: Static Files](dsl-reference/#static-files) para patrones de diseño.

Sirve archivos estáticos usando la función `Files`:

```go
var _ = Service("web", func() {
    // Serve files from a directory
    Files("/static/{*path}", "./public")
    
    // Serve a specific file
    Files("/favicon.ico", "./public/favicon.ico")
})
```

Para aplicaciones de una sola página, servir el index.html para todas las rutas:

```go
var _ = Service("spa", func() {
    // API endpoints
    Method("api", func() {
        HTTP(func() {
            GET("/api/data")
        })
    })
    
    // Serve SPA - catch-all for client-side routing
    Files("/{*path}", "./dist/index.html")
})
```

---

---

## See Also

- [Referencia DSL: Streaming](dsl-reference/#streaming) - Patrones de streaming a nivel de diseño
- [Referencia DSL: Archivos estáticos](dsl-reference/#static-files) - DSL de archivos para contenido estático
- [DSL Reference: Error Handling](dsl-reference/#error-handling-design-level) - Definiciones de errores a nivel de diseño
- [Guía gRPC](grpc-guide/) - Características del transporte gRPC
- [Guía de manejo de errores](error-handling/) - Patrones completos de manejo de errores
- [Documentación de Clue](../3-ecosystem/clue/) - Middleware HTTP para observabilidad

---

## Mejores prácticas

### Diseño de URL
- Utilice sustantivos para los recursos: `/articles`, no `/list-articles`
- Utilice sustantivos plurales de forma coherente
- Deje que los métodos HTTP definan las acciones
- Mantenga las URL jerárquicas y predecibles

### Tratamiento de errores
- Asignar los errores a los códigos de estado HTTP apropiados
- Utilizar formatos de respuesta de error coherentes
- Incluir mensajes de error significativos

### Rendimiento
- Utilizar tamaños de búfer adecuados para WebSocket
- Implementar la agrupación de conexiones para servicios de alto tráfico
- Considerar la agrupación de mensajes para los puntos finales de streaming

### Seguridad
- Utilice siempre HTTPS en producción
- Configure CORS adecuadamente
- Valide todos los parámetros de entrada
- Establezca tiempos de espera adecuados para conexiones de larga duración
