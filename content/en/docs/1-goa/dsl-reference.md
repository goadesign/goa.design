---
title: DSL Reference
weight: 2
description: "Complete reference for Goa's design language - data modeling, services, methods, HTTP/gRPC mapping, and security."
llm_optimized: true
aliases:
---

Goa's Domain Specific Language (DSL) is the cornerstone of the design-first approach. This reference covers all aspects of the DSL, from basic type definitions to complex transport mappings and security schemes.

## Data Modeling

Goa provides a powerful type system for modeling your domain with precision. From simple primitives to complex nested structures, the DSL offers a natural way to express data relationships, constraints, and validation rules.

### Primitive Types

Goa provides these built-in primitive types:

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

### Type Definition

The `Type` DSL function is the primary way to define structured data types:

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

### Complex Types

#### Arrays

Arrays define ordered collections with optional validation:

```go
var Names = ArrayOf(String, func() {
    MinLength(1)
    MaxLength(10)
})

var Team = Type("Team", func() {
    Attribute("members", ArrayOf(Person))
})
```

#### Maps

Maps provide key-value associations with type safety:

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

### Type Composition

#### Reference

Use `Reference` to inherit attribute definitions from another type:

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

#### Extend

`Extend` creates a new type that automatically inherits all attributes:

```go
var Manager = Type("Manager", func() {
    Extend(Employee)
    Attribute("reports", ArrayOf(Employee))
})
```

### Validation Rules

#### String Validations
- `Pattern(regex)` - Validates against a regular expression
- `MinLength(n)` - Minimum string length
- `MaxLength(n)` - Maximum string length
- `Format(format)` - Validates against predefined formats

#### Numeric Validations
- `Minimum(n)` - Minimum value (inclusive)
- `Maximum(n)` - Maximum value (inclusive)
- `ExclusiveMinimum(n)` - Minimum value (exclusive)
- `ExclusiveMaximum(n)` - Maximum value (exclusive)

#### Collection Validations
- `MinLength(n)` - Minimum number of elements
- `MaxLength(n)` - Maximum number of elements

#### Object Validations
- `Required("field1", "field2")` - Required fields

#### Generic Validations
- `Enum(value1, value2)` - Restricts to enumerated values

Combined example:

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

### Built-in Formats

Goa includes predefined formats for common data patterns:

| Format | Description |
|--------|-------------|
| `FormatDate` | RFC3339 date values |
| `FormatDateTime` | RFC3339 date time values |
| `FormatUUID` | RFC4122 UUID values |
| `FormatEmail` | RFC5322 email addresses |
| `FormatHostname` | RFC1035 Internet hostnames |
| `FormatIPv4` | RFC2373 IPv4 address values |
| `FormatIPv6` | RFC2373 IPv6 address values |
| `FormatIP` | RFC2373 IPv4 or IPv6 address values |
| `FormatURI` | RFC3986 URI values |
| `FormatMAC` | IEEE 802 MAC-48/EUI-48/EUI-64 addresses |
| `FormatCIDR` | RFC4632/RFC4291 CIDR notation |
| `FormatRegexp` | RE2 regular expression syntax |
| `FormatJSON` | JSON text |
| `FormatRFC1123` | RFC1123 date time values |

### Attribute vs Field DSL

Use `Attribute` for HTTP-only types. Use `Field` when you need gRPC support (includes field number tag):

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

### Examples

Provide sample values for documentation:

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

When examples are omitted, Goa auto-generates them by default using a random seed.

To generate deterministic examples, use the `Randomizer` function to ensure that the examples are consistent and predictable:

```go
var _ = API("exampleAPI", func() {
    Randomizer(expr.NewDeterministicRandomizer())
})
```

---

## API Definition

The `API` function defines global properties for your service and serves as the root of your design.

### Basic Structure

```go
var _ = API("calculator", func() {
    Title("Calculator API")
    Description("A simple calculator service")
    Version("1.0.0")
})
```

### Complete Example

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

### Server Configuration

Define where your API can be accessed:

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

### API-Level Errors

Define reusable errors at the API level:

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

Services can reference these errors by name:

```go
var _ = Service("billing", func() {
    Error("unauthorized")  // Inherits all properties
})
```

---

## Services and Methods

Services group related methods that provide specific functionality.

### Service DSL

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

### Method DSL

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

### Payload Types

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

### Result Types

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

### Streaming Methods

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

Streaming enables real-time, continuous data exchange between clients and servers. Goa's streaming DSL is transport-agnostic — the same design works for both HTTP (WebSocket, Server-Sent Events) and gRPC streaming.

### Streaming Patterns

Goa supports three streaming patterns:

| Pattern | DSL | Use Case |
|---------|-----|----------|
| Server-to-Client | `StreamingResult` | Live feeds, notifications, progress updates |
| Client-to-Server | `StreamingPayload` | File uploads, event ingestion |
| Bidirectional | Both | Chat, real-time collaboration |

### StreamingPayload

Use `StreamingPayload` when clients send a stream of messages to the server:

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

### StreamingResult

Use `StreamingResult` when the server sends a stream of messages to the client:

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

### Bidirectional Streaming

Combine both for full-duplex communication:

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

### Transport Mapping

The same streaming design maps to different transports:

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

**See also:**
- [HTTP Guide: WebSocket Integration](http-guide/#websocket-integration) — HTTP-specific streaming implementation
- [HTTP Guide: Server-Sent Events](http-guide/#server-sent-events) — SSE for one-way server streaming
- [gRPC Guide: Streaming Patterns](grpc-guide/#streaming-patterns) — gRPC streaming implementation

---

## Static Files

The `Files` DSL serves static content directly from the filesystem. This is an HTTP-only feature — gRPC does not support static file serving.

### Basic Usage

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

### Directory Serving

The `{*path}` wildcard captures the remaining URL path:

```go
// Request: GET /assets/css/style.css
// Serves: ./static/css/style.css
Files("/assets/{*path}", "./static")
```

### Single Page Applications

For SPAs with client-side routing, serve the same HTML for all routes:

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

**Note**: `Files` is HTTP-only. For detailed patterns including template integration, see [HTTP Guide: Static Content](http-guide/#static-content).

---

## Error Handling (Design Level)

Errors in Goa are defined at the design level and automatically mapped to transport-specific responses. This section covers the DSL for defining errors; for transport mapping details, see [Error Handling Guide](error-handling/).

### Error Scopes

Errors can be defined at three levels:

| Scope | Availability | Use Case |
|-------|--------------|----------|
| API-level | All services | Common errors (unauthorized, rate limited) |
| Service-level | All methods in service | Domain errors (not found, invalid state) |
| Method-level | Single method only | Operation-specific errors |

### API-Level Errors

Define once, use everywhere:

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

### Service-Level Errors

Available to all methods in the service:

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

### Method-Level Errors

Specific to a single operation:

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

### Error Properties

Mark errors with semantic properties:

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

### Custom Error Types

For errors needing additional context:

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

**See also:**
- [Error Handling Guide](error-handling/) — Complete error handling patterns
- [HTTP Guide: Error Responses](http-guide/#best-practices) — HTTP status code mapping
- [gRPC Guide: Error Handling](grpc-guide/#error-handling) — gRPC status code mapping

---

## HTTP Transport Mapping

The HTTP DSL defines how service methods map to HTTP endpoints.

### HTTP Request Components

An HTTP request has four parts that can be mapped to payload attributes:

1. **URL Path Parameters** - e.g., `/bottle/{id}`
2. **Query String Parameters**
3. **HTTP Headers**
4. **Request Body**

Mapping expressions:
- `Param` - Loads from path or query string
- `Header` - Loads from HTTP headers
- `Body` - Loads from request body

### Mapping Non-Object Payloads

For primitive, array, or map payloads, values load from the first defined element:

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

### Mapping Object Payloads

For object payloads, specify where each attribute comes from:

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

Use `Body` to specify a non-object body:

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

### Element Name Mapping

Map HTTP element names to attribute names:

```go
Header("version:X-Api-Version")  // version attribute from X-Api-Version header

Body(func() {
    Attribute("name:n")  // name attribute from "n" field in JSON
    Attribute("age:a")   // age attribute from "a" field in JSON
})
```

---

## gRPC Transport Mapping

The gRPC DSL defines how service methods map to gRPC procedures.

### gRPC Features

1. **Message Mapping** - Define request/response structures with field numbers
2. **Status Codes** - Map results to gRPC status codes
3. **Metadata** - Configure gRPC metadata handling

### Mixed Protocol Support

Services can support both HTTP and gRPC:

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

RESTful resource mapping:

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

## Security

Goa provides DSL constructs for authentication and authorization.

### Security Schemes

#### JWT (JSON Web Token)

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT-based authentication")
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
```

#### API Keys

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("API key-based authorization")
})
```

#### Basic Authentication

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

### Applying Security

#### Method Level

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

#### Multiple Schemes

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

### Implementing Security

Goa generates an `Auther` interface that your service must implement:

```go
type Auther interface {
    BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error)
    JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error)
    APIKeyAuth(ctx context.Context, key string, scheme *security.APIKeyScheme) (context.Context, error)
    OAuth2Auth(ctx context.Context, token string, scheme *security.OAuth2Scheme) (context.Context, error)
}
```

Example JWT implementation:

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

Example Basic Auth implementation:

```go
func (s *svc) BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error) {
    if user != "goa" || pass != "rocks" {
        return ctx, ErrUnauthorized
    }
    return contextWithAuthInfo(ctx, authInfo{user: user}), nil
}
```

---

## Best Practices

### Type Organization
- Group related types together
- Use meaningful field names and descriptions
- Follow consistent naming conventions
- Keep types focused and cohesive

### Validation Strategy
- Add appropriate constraints for each field
- Define required fields explicitly
- Use format validators for standard formats
- Consider domain-specific validation rules

### Service Design
- Group related functionality into services
- Keep service scope focused and cohesive
- Use clear, descriptive service names
- Document service purpose and usage

### Method Design
- Use clear, action-oriented method names
- Provide detailed descriptions
- Define appropriate error responses
- Consider validation requirements

### HTTP Design
- Use consistent URL patterns
- Follow RESTful conventions
- Choose appropriate status codes
- Handle errors consistently

### Security
- Use appropriate security schemes for your use case
- Implement proper token validation
- Define clear scope hierarchies
- Use HTTPS in production
