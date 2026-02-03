---
title: Referencia DSL
weight: 2
description: "Complete reference for Goa's design language - data modeling, services, methods, HTTP/gRPC mapping, and security."
llm_optimized: true
aliases:
---

El Lenguaje Específico de Dominio (DSL) de Goa es la piedra angular del enfoque de diseño primero. Esta referencia cubre todos los aspectos del DSL, desde las definiciones básicas de tipos hasta las complejas asignaciones de transporte y los esquemas de seguridad.

## Modelado de datos

Goa proporciona un potente sistema de tipos para modelar su dominio con precisión. Desde simples primitivas a complejas estructuras anidadas, el DSL ofrece una forma natural de expresar relaciones de datos, restricciones y reglas de validación.

### Tipos primitivos

Goa proporciona estos tipos primitivos incorporados:

```go
Boolean  // JSON boolean
Int      // Signed integer
Int32    // Signed 32-bit integer 
Int64    // Signed 64-bit integer
UInt     // Unsigned integer
UInt32   // Unsigned 32-bit integer
UInt64   // Unsigned 64-bit integer
Float32  // 32-bit floating number
Float64  // 64-bit floating number
String   // JSON string
Bytes    // Binary data
Any      // Arbitrary JSON value
```

### Definición del tipo

La función `Type` DSL es la forma principal de definir tipos de datos estructurados:

```go
var Person = Type("Person", func() {
    Description("A person")
    
    // Basic attribute
    Attribute("name", String)
    
    // Attribute with validation
    Attribute("age", Int32, func() {
        Minimum(0)
        Maximum(120)
    })
    
    // Required fields
    Required("name", "age")
})
```

### Tipos complejos

#### Matrices

Las matrices definen colecciones ordenadas con validación opcional:

```go
var Names = ArrayOf(String, func() {
    MinLength(1)
    MaxLength(10)
})

var Team = Type("Team", func() {
    Attribute("members", ArrayOf(Person))
})
```

#### Mapas

Los mapas proporcionan asociaciones clave-valor con seguridad de tipo:

```go
var Config = MapOf(String, Int32, func() {
    Key(func() {
        Pattern("^[a-z]+$")
    })
    Elem(func() {
        Minimum(0)
    })
})
```

### Composición de tipos

#### Referencia

Utilice `Reference` para heredar definiciones de atributos de otro tipo:

```go
var Employee = Type("Employee", func() {
    Reference(Person)
    Attribute("name")  // Inherits from Person
    Attribute("age")   // Inherits from Person
    
    Attribute("employeeID", String, func() {
        Format(FormatUUID)
    })
})
```

#### Ampliar

`Extend` crea un nuevo tipo que hereda automáticamente todos los atributos:

```go
var Manager = Type("Manager", func() {
    Extend(Employee)
    Attribute("reports", ArrayOf(Employee))
})
```

### Reglas de validación

#### Validaciones de cadena
- `Pattern(regex)` - Valida frente a una expresión regular
- `MinLength(n)` - Longitud mínima de cadena
- `MaxLength(n)` - Longitud máxima de cadena
- `Format(format)` - Validación con formatos predefinidos

#### Validaciones numéricas
- `Minimum(n)` - Valor mínimo (inclusive)
- `Maximum(n)` - Valor máximo (inclusive)
- `ExclusiveMinimum(n)` - Valor mínimo (excluyente)
- `ExclusiveMaximum(n)` - Valor máximo (excluyente)

#### Validaciones de la colección
- `MinLength(n)` - Número mínimo de elementos
- `MaxLength(n)` - Número máximo de elementos

#### Validaciones de objetos
- `Required("field1", "field2")` - Campos obligatorios

#### Validaciones genéricas
- `Enum(value1, value2)` - Restringe a valores enumerados

Ejemplo combinado:

```go
var UserProfile = Type("UserProfile", func() {
    Attribute("username", String, func() {
        Pattern("^[a-z0-9]+$")
        MinLength(3)
        MaxLength(50)
    })
    
    Attribute("email", String, func() {
        Format(FormatEmail)
    })
    
    Attribute("age", Int32, func() {
        Minimum(18)
        ExclusiveMaximum(150)
    })
    
    Attribute("tags", ArrayOf(String, func() { 
        Enum("tag1", "tag2", "tag3") 
    }), func() {
        MinLength(1)
        MaxLength(10)
    })

    Required("username", "email", "age")
})
```

### Formatos incorporados

Goa incluye formatos predefinidos para patrones de datos comunes:

| Formato | Descripción |
|--------|-------------|
`FormatDate` Valores de fecha RFC3339
`FormatDateTime` Valores de fecha y hora RFC3339
`FormatUUID` Valores UUID RFC4122
`FormatEmail` Direcciones de correo electrónico RFC5322
| RFC1035 Nombres de host de Internet
| RFC2373 Valores de dirección IPv4
`FormatIPv6` Valores de dirección IPv6 RFC2373
| `FormatIP` | Valores de dirección IPv4 o IPv6 RFC2373 | `FormatURI` | Valores de dirección IPv4 o IPv6 RFC2373
| `FormatURI` | Valores de URI de RFC3986 | `FormatMAC` | Valores de dirección IPv6 de RFC2373
`FormatMAC` Direcciones IEEE 802 MAC-48/EUI-48/EUI-64
`FormatCIDR` Notación CIDR RFC4632/RFC4291
`FormatRegexp` Sintaxis de expresiones regulares RE2
`FormatJSON` Texto JSON
`FormatRFC1123` Valores fecha-hora RFC1123

### Atributo vs Campo DSL

Utilice `Attribute` para tipos sólo HTTP. Utilice `Field` cuando necesite soporte gRPC (incluye etiqueta de número de campo):

```go
// HTTP only
var Person = Type("Person", func() {
    Attribute("name", String)
    Attribute("age", Int32)
})

// With gRPC support
var Person = Type("Person", func() {
    Field(1, "name", String)
    Field(2, "age", Int32)
})
```

### Ejemplos

Proporcionar valores de ejemplo para la documentación:

```go
var User = Type("User", func() {
    Attribute("name", String, func() {
        Example("John Doe")
    })
    
    Attribute("email", String, func() {
        Example("work", "john@work.com")
        Example("personal", "john@gmail.com")
        Format(FormatEmail)
    })
})

var Address = Type("Address", func() {
    Attribute("street", String)
    Attribute("city", String)
    Required("street", "city")
    
    Example("Home Address", func() {
        Description("Example of a residential address")
        Value(Val{
            "street": "123 Main St",
            "city": "Boston",
        })
    })
})
```

Cuando se omiten los ejemplos, Goa los genera automáticamente de forma predeterminada usando una semilla aleatoria.

Para generar ejemplos deterministas, utilice la función `Randomizer` para garantizar que los ejemplos sean consistentes y predecibles:

```go
var _ = API("exampleAPI", func() {
    Randomizer(expr.NewDeterministicRandomizer())
})
```

---

## Definición de la API

La función `API` define propiedades globales para su servicio y sirve como raíz de su diseño.

### Estructura Básica

```go
var _ = API("calculator", func() {
    Title("Calculator API")
    Description("A simple calculator service")
    Version("1.0.0")
})
```

### Ejemplo completo

```go
var _ = API("bookstore", func() {
    Title("Bookstore API")
    Description("A modern bookstore management API")
    Version("2.0.0")
    TermsOfService("https://example.com/terms")
    
    Contact(func() {
        Name("API Support")
        Email("support@example.com")
        URL("https://example.com/support")
    })
    
    License(func() {
        Name("Apache 2.0")
        URL("https://www.apache.org/licenses/LICENSE-2.0.html")
    })
    
    Docs(func() {
        Description("Comprehensive API documentation")
        URL("https://example.com/docs")
    })
})
```

### Configuración del servidor

Defina dónde se puede acceder a su API:

```go
var _ = API("bookstore", func() {
    Server("production", func() {
        Description("Production server")
        
        Host("production", func() {
            URI("https://{version}.api.example.com")
            URI("grpcs://{version}.grpc.example.com")
            
            Variable("version", String, "API version", func() {
                Default("v2")
                Enum("v1", "v2")
            })
        })
    })
    
    Server("development", func() {
        Host("localhost", func() {
            URI("http://localhost:8000")
            URI("grpc://localhost:8080")
        })
    })
})
```

### Errores a nivel de API

Define errores reutilizables a nivel de API:

```go
var _ = API("bookstore", func() {
    Error("unauthorized", ErrorResult, "Authentication failed")
    
    HTTP(func() {
        Response("unauthorized", StatusUnauthorized)
    })
    
    GRPC(func() {
        Response("unauthorized", CodeUnauthenticated)
    })
})
```

Los servicios pueden hacer referencia a estos errores por su nombre:

```go
var _ = Service("billing", func() {
    Error("unauthorized")  // Inherits all properties
})
```

---

## Servicios y métodos

Los servicios agrupan métodos relacionados que proporcionan una funcionalidad específica.

### Servicio DSL

```go
var _ = Service("users", func() {
    Description("User management service")
    
    Docs(func() {
        Description("Detailed documentation for the user service")
        URL("https://example.com/docs/users")
    })

    // Service-level errors
    Error("unauthorized", String, "Authentication failed")
    Error("not_found", NotFound, "Resource not found")
    
    // Metadata
    Meta("swagger:tag", "Users")
    
    // Security requirements
    Security(OAuth2, func() {
        Scope("read:users")
        Scope("write:users")
    })
    
    Method("create", func() {
        // ... method definition
    })
    
    Method("list", func() {
        // ... method definition
    })
})
```

### Método DSL

```go
Method("add", func() {
    Description("Add two numbers together")
    
    Payload(func() {
        Field(1, "a", Int32, "First operand")
        Field(2, "b", Int32, "Second operand")
        Required("a", "b")
    })
    
    Result(Int32)
    
    Error("overflow")
})
```

### Tipos de carga útil

```go
// Simple payload
Method("getUser", func() {
    Payload(String, "User ID")
    Result(User)
})

// Structured payload
Method("createUser", func() {
    Payload(func() {
        Field(1, "name", String, "User's full name")
        Field(2, "email", String, "Email address", func() {
            Format(FormatEmail)
        })
        Field(3, "role", String, "User role", func() {
            Enum("admin", "user", "guest")
        })
        Required("name", "email", "role")
    })
    Result(User)
})

// Reference to predefined type
Method("updateUser", func() {
    Payload(UpdateUserPayload)
    Result(User)
})
```

### Tipos de resultado

```go
// Simple result
Method("count", func() {
    Result(Int64)
})

// Structured result
Method("search", func() {
    Result(func() {
        Field(1, "items", ArrayOf(User), "Matching users")
        Field(2, "total", Int64, "Total count")
        Required("items", "total")
    })
})
```

### Métodos de transmisión

```go
Method("streamNumbers", func() {
    Description("Stream a sequence of numbers")
    StreamingPayload(Int32)
    StreamingResult(Int32)
})

Method("processEvents", func() {
    StreamingPayload(func() {
        Field(1, "event_type", String)
        Field(2, "data", Any)
        Required("event_type", "data")
    })
    
    Result(func() {
        Field(1, "processed", Int64)
        Field(2, "errors", Int64)
        Required("processed", "errors")
    })
})
```

---

## Streaming

El streaming permite el intercambio continuo de datos en tiempo real entre clientes y servidores. El DSL de streaming de Goa es independiente del transporte - el mismo diseño funciona tanto para HTTP (WebSocket, Server-Sent Events) como para streaming gRPC.

### Patrones de transmisión

Goa soporta tres patrones de streaming:

| Patrón | DSL | Caso de Uso |
|---------|-----|----------|
| Servidor a cliente `StreamingResult` Transmisión en directo, notificaciones, actualizaciones de progreso
| Cliente-servidor `StreamingPayload` Carga de archivos, ingesta de eventos..
| Chat, colaboración en tiempo real

### StreamingPayload

Utilice `StreamingPayload` cuando los clientes envían un flujo de mensajes al servidor:

```go
// Client streams events, server returns summary
Method("ingestEvents", func() {
    Description("Ingest a stream of analytics events")
    
    StreamingPayload(func() {
        Field(1, "event_type", String, "Type of event")
        Field(2, "timestamp", String, "ISO 8601 timestamp")
        Field(3, "properties", MapOf(String, Any), "Event properties")
        Required("event_type", "timestamp")
    })
    
    Result(func() {
        Field(1, "events_processed", Int64, "Total events ingested")
        Field(2, "errors", Int64, "Events that failed validation")
        Required("events_processed", "errors")
    })
})
```

### StreamingResultado

Utilice `StreamingResult` cuando el servidor envía un flujo de mensajes al cliente:

```go
// Client subscribes, server streams updates
Method("subscribe", func() {
    Description("Subscribe to real-time price updates")
    
    Payload(func() {
        Field(1, "symbols", ArrayOf(String), "Stock symbols to watch")
        Required("symbols")
    })
    
    StreamingResult(func() {
        Field(1, "symbol", String, "Stock symbol")
        Field(2, "price", Float64, "Current price")
        Field(3, "change", Float64, "Price change percentage")
        Field(4, "timestamp", String, "Update timestamp")
        Required("symbol", "price", "timestamp")
    })
})
```

### Streaming bidireccional

Combina ambos para una comunicación full-duplex:

```go
// Real-time chat with structured messages
Method("chat", func() {
    Description("Bidirectional chat stream")
    
    StreamingPayload(func() {
        Field(1, "message", String, "Chat message content")
        Field(2, "room_id", String, "Target chat room")
        Field(3, "reply_to", String, "Message ID being replied to")
        Required("message", "room_id")
    })
    
    StreamingResult(func() {
        Field(1, "id", String, "Message ID")
        Field(2, "sender", String, "Sender username")
        Field(3, "message", String, "Message content")
        Field(4, "room_id", String, "Chat room")
        Field(5, "timestamp", String, "When message was sent")
        Required("id", "sender", "message", "room_id", "timestamp")
    })
})
```

### Asignación de transporte

El mismo diseño de streaming se asigna a diferentes transportes:

```go
Method("watch", func() {
    StreamingResult(Event)
    
    // HTTP: WebSocket by default, or SSE with ServerSentEvents()
    HTTP(func() {
        GET("/events/watch")
        // ServerSentEvents()  // Uncomment for SSE instead of WebSocket
    })
    
    // gRPC: Server-side streaming RPC
    GRPC(func() {
        Response(CodeOK)
    })
})
```

**Véase también:**
- [Guía HTTP: Integración WebSocket](http-guide/#websocket-integration) - Implementación de streaming específica para HTTP
- [Guía HTTP: Eventos enviados por el servidor](http-guide/#server-sent-events) - SSE para streaming de servidor unidireccional
- [Guía gRPC: Patrones de streaming](grpc-guide/#streaming-patterns) - Implementación de streaming gRPC

---

## Archivos estáticos

El DSL `Files` sirve contenido estático directamente desde el sistema de ficheros. Esta es una característica sólo HTTP - gRPC no soporta el servicio de archivos estáticos.

### Uso Básico

```go
var _ = Service("web", func() {
    // Serve a directory
    Files("/static/{*path}", "./public/static")
    
    // Serve a specific file
    Files("/favicon.ico", "./public/favicon.ico")
    
    // Serve index.html for root
    Files("/", "./public/index.html")
})
```

### Servicio de directorios

El comodín `{*path}` captura la ruta URL restante:

```go
// Request: GET /assets/css/style.css
// Serves: ./static/css/style.css
Files("/assets/{*path}", "./static")
```

### Aplicaciones de una sola página

Para SPAs con enrutamiento del lado del cliente, sirva el mismo HTML para todas las rutas:

```go
var _ = Service("spa", func() {
    // API endpoints
    Method("getData", func() {
        HTTP(func() { GET("/api/data") })
    })
    
    // Static assets
    Files("/assets/{*path}", "./dist/assets")
    
    // SPA catch-all — serves index.html for all other routes
    Files("/{*path}", "./dist/index.html")
})
```

**Nota**: `Files` es sólo HTTP. Para obtener patrones detallados, incluida la integración de plantillas, consulte [Guía HTTP: Contenido estático](http-guide/#static-content).

---

## Tratamiento de errores (nivel de diseño)

Los errores en Goa se definen a nivel de diseño y se asignan automáticamente a respuestas específicas del transporte. Esta sección cubre el DSL para definir errores; para detalles de mapeo de transporte, ver [Guía de Manejo de Errores](error-handling/).

### Ámbitos de error

Los errores se pueden definir a tres niveles:

| Ámbito | Disponibilidad | Caso de Uso |
|-------|--------------|----------|
| Nivel de API Todos los servicios Errores comunes (no autorizado, tasa limitada)
| Nivel de servicio Todos los métodos del servicio Errores de dominio (no encontrado, estado no válido)
| Nivel de método: Sólo un método. Errores específicos de la operación

### Errores a nivel de API

Definir una vez, utilizar en todas partes:

```go
var _ = API("myapi", func() {
    // Define common errors
    Error("unauthorized", ErrorResult, "Authentication required")
    Error("rate_limited", ErrorResult, "Too many requests", func() {
        Temporary()  // Client should retry
    })
    
    // Map to transports
    HTTP(func() {
        Response("unauthorized", StatusUnauthorized)
        Response("rate_limited", StatusTooManyRequests)
    })
    
    GRPC(func() {
        Response("unauthorized", CodeUnauthenticated)
        Response("rate_limited", CodeResourceExhausted)
    })
})
```

### Errores a nivel de servicio

Disponible para todos los métodos del servicio:

```go
var _ = Service("users", func() {
    // Service-wide errors
    Error("not_found", ErrorResult, "User not found")
    Error("already_exists", ErrorResult, "User already exists")
    
    HTTP(func() {
        Response("not_found", StatusNotFound)
        Response("already_exists", StatusConflict)
    })
    
    Method("get", func() {
        // Can return not_found without declaring it
    })
    
    Method("create", func() {
        // Can return already_exists without declaring it
    })
})
```

### Errores a nivel de método

Específicos de una sola operación:

```go
Method("transfer", func() {
    Description("Transfer funds between accounts")
    
    Payload(func() {
        Field(1, "from_account", String)
        Field(2, "to_account", String)
        Field(3, "amount", Float64)
        Required("from_account", "to_account", "amount")
    })
    
    Result(TransferResult)
    
    // Method-specific errors
    Error("insufficient_funds", ErrorResult, "Account has insufficient balance")
    Error("account_locked", ErrorResult, "Account is locked for transfers")
    
    HTTP(func() {
        POST("/transfer")
        Response("insufficient_funds", StatusUnprocessableEntity)
        Response("account_locked", StatusForbidden)
    })
})
```

### Propiedades de error

Marcar errores con propiedades semánticas:

```go
Error("service_unavailable", ErrorResult, func() {
    Description("Backend service is temporarily unavailable")
    Temporary()  // Client should retry
})

Error("request_timeout", ErrorResult, func() {
    Description("Request exceeded time limit")
    Timeout()    // Deadline was exceeded
})

Error("internal_error", ErrorResult, func() {
    Description("Unexpected server error")
    Fault()      // Server-side issue
})
```

### Tipos de error personalizados

Para errores que necesitan contexto adicional:

```go
var ValidationError = Type("ValidationError", func() {
    Field(1, "name", String, "Error name", func() {
        Meta("struct:error:name")  // Required for custom error types
    })
    Field(2, "message", String, "Error message")
    Field(3, "field", String, "Field that failed validation")
    Field(4, "value", Any, "Invalid value provided")
    Required("name", "message", "field")
})

Method("create", func() {
    Error("validation_error", ValidationError, "Input validation failed")
})
```

**Véase también:**
- [Guía de manejo de errores](error-handling/) - Patrones completos de manejo de errores
- [Guía HTTP: Respuestas de error](http-guide/#best-practices) - Mapeo de códigos de estado HTTP
- [Guía gRPC: Tratamiento de errores](grpc-guide/#error-handling) - Asignación de códigos de estado gRPC

---

## Asignación de transporte HTTP

El DSL HTTP define cómo se asignan los métodos de servicio a los puntos finales HTTP.

### Componentes de solicitud HTTP

Una petición HTTP tiene cuatro partes que pueden ser asignadas a atributos de carga útil:

1. **URL Path Parameters** - por ejemplo, `/bottle/{id}`
2. **Parámetros de cadena de consulta
3. **Cabeceras HTTP
4. **Cuerpo de la solicitud

Expresiones de asignación:
- `Param` - Carga desde la ruta o cadena de consulta
- `Header` - Se carga desde las cabeceras HTTP
- `Body` - Se carga desde el cuerpo de la solicitud

### Asignación de cargas útiles que no son objetos

Para cargas primitivas, matrices o mapas, los valores se cargan desde el primer elemento definido:

```go
// Path parameter
Method("show", func() {
    Payload(Int)
    HTTP(func() {
        GET("/{id}")
    })
})
// GET /1 → Show(1)

// Array in path (comma-separated)
Method("delete", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        DELETE("/{ids}")
    })
})
// DELETE /a,b → Delete([]string{"a", "b"})

// Array in query string
Method("list", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        GET("")
        Param("filter")
    })
})
// GET /?filter=a&filter=b → List([]string{"a", "b"})

// Header
Method("list", func() {
    Payload(Float32)
    HTTP(func() {
        GET("")
        Header("version")
    })
})
// GET / with header version=1.0 → List(1.0)

// Map in body
Method("create", func() {
    Payload(MapOf(String, Int))
    HTTP(func() {
        POST("")
    })
})
// POST / {"a": 1, "b": 2} → Create(map[string]int{"a": 1, "b": 2})
```

### Asignación de cargas útiles de objetos

Para las cargas útiles de objetos, especifique de dónde procede cada atributo:

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
    HTTP(func() {
        POST("/{id}")
        // id from path, name and age from body
    })
})
// POST /1 {"name": "a", "age": 2} → Create(&CreatePayload{ID: 1, Name: "a", Age: 2})
```

Utilice `Body` para especificar un cuerpo que no sea objeto:

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
    HTTP(func() {
        PUT("/{id}")
        Body("rates")  // Body is the map directly
    })
})
// PUT /1 {"a": 0.5, "b": 1.0} → Rate(&RatePayload{ID: 1, Rates: map[string]float64{...}})
```

### Asignación de nombres de elementos

Mapea nombres de elementos HTTP a nombres de atributos:

```go
Header("version:X-Api-Version")  // version attribute from X-Api-Version header

Body(func() {
    Attribute("name:n")  // name attribute from "n" field in JSON
    Attribute("age:a")   // age attribute from "a" field in JSON
})
```

---

## Mapeo de transporte gRPC

El DSL gRPC define cómo los métodos de servicio se asignan a los procedimientos gRPC.

### Características de gRPC

1. **Message Mapping** - Definir estructuras de petición/respuesta con números de campo
2. **Códigos de estado** - Asignar resultados a códigos de estado gRPC
3. **Metadatos** - Configurar el manejo de metadatos gRPC

### Soporte de Protocolos Mixtos

Los servicios pueden soportar tanto HTTP como gRPC:

```go
Method("create", func() {
    Payload(CreatePayload)
    Result(User)
    
    HTTP(func() {
        POST("/")
        Response(StatusCreated)
    })
    
    GRPC(func() {
        Response(CodeOK)
    })
})
```

Mapeo de recursos RESTful:

```go
Service("users", func() {
    HTTP(func() {
        Path("/users")
    })
    
    Method("list", func() {
        HTTP(func() { GET("/") })           // GET /users
        GRPC(func() { Response(CodeOK) })
    })
    
    Method("show", func() {
        HTTP(func() { GET("/{id}") })       // GET /users/{id}
        GRPC(func() { Response(CodeOK) })
    })
})
```

---

## Seguridad

Goa proporciona construcciones DSL para autenticación y autorización.

### Esquemas de seguridad

#### JWT (Token Web JSON)

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT-based authentication")
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
```

#### Claves API

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("API key-based authorization")
})
```

#### Autenticación básica

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Username/password authentication")
    Scope("api:read", "Read-only access")
})
```

#### OAuth2

```go
var OAuth2Auth = OAuth2Security("oauth2", func() {
    AuthorizationCodeFlow(
        "http://auth.example.com/authorize",
        "http://auth.example.com/token",
        "http://auth.example.com/refresh",
    )
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
```

### Aplicación de la seguridad

#### Nivel de método

```go
Method("secure_endpoint", func() {
    Security(JWTAuth, func() {
        Scope("api:read")
    })
    
    Payload(func() {
        TokenField(1, "token", String)
        Required("token")
    })
    
    HTTP(func() {
        GET("/secure")
        Header("token:Authorization")
    })
})
```

#### Esquemas múltiples

```go
Method("doubly_secure", func() {
    Security(JWTAuth, APIKeyAuth, func() {
        Scope("api:write")
    })
    
    Payload(func() {
        TokenField(1, "token", String)
        APIKeyField(2, "api_key", "key", String)
        Required("token", "key")
    })
    
    HTTP(func() {
        POST("/secure")
        Param("key:k")
    })
})
```

### Implementación de la seguridad

Goa genera una interfaz `Auther` que tu servicio debe implementar:

```go
type Auther interface {
    BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error)
    JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error)
    APIKeyAuth(ctx context.Context, key string, scheme *security.APIKeyScheme) (context.Context, error)
    OAuth2Auth(ctx context.Context, token string, scheme *security.OAuth2Scheme) (context.Context, error)
}
```

Ejemplo de implementación de JWT:

```go
func (s *svc) JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error) {
    claims := make(jwt.MapClaims)
    
    _, err := jwt.ParseWithClaims(token, claims, func(_ *jwt.Token) (interface{}, error) { 
        return Key, nil 
    })
    if err != nil {
        return ctx, ErrInvalidToken
    }

    // Validate required scopes
    scopes, ok := claims["scopes"].([]any)
    if !ok {
        return ctx, ErrInvalidTokenScopes
    }
    scopesInToken := make([]string, len(scopes))
    for _, scp := range scopes {
        scopesInToken = append(scopesInToken, scp.(string))
    }
    if err := scheme.Validate(scopesInToken); err != nil {
        return ctx, ErrInvalidScopes
    }

    return contextWithAuthInfo(ctx, authInfo{claims: claims}), nil
}
```

Ejemplo de implementación de Basic Auth:

```go
func (s *svc) BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error) {
    if user != "goa" || pass != "rocks" {
        return ctx, ErrUnauthorized
    }
    return contextWithAuthInfo(ctx, authInfo{user: user}), nil
}
```

---

## Mejores prácticas

### Organización de tipos
- Agrupar tipos relacionados
- Utilizar nombres de campo y descripciones significativas
- Siga convenciones de nomenclatura coherentes
- Mantener los tipos centrados y cohesionados

### Estrategia de validación
- Añada restricciones adecuadas para cada campo
- Defina explícitamente los campos obligatorios
- Utilice validadores de formato para los formatos estándar
- Considerar reglas de validación específicas del dominio

### Diseño de servicios
- Agrupe las funciones relacionadas en servicios
- Mantener el alcance del servicio centrado y cohesionado
- Utilizar nombres de servicio claros y descriptivos
- Documentar la finalidad y el uso del servicio

### Diseño de métodos
- Utilizar nombres de métodos claros y orientados a la acción
- Proporcionar descripciones detalladas
- Definir respuestas de error adecuadas
- Tener en cuenta los requisitos de validación

### Diseño HTTP
- Utilizar patrones de URL coherentes
- Seguir las convenciones RESTful
- Elegir códigos de estado apropiados
- Gestionar los errores de forma coherente

### Seguridad
- Utilice esquemas de seguridad apropiados para su caso de uso
- Implemente una validación de tokens adecuada
- Defina jerarquías de alcance claras
- Utilice HTTPS en producción
