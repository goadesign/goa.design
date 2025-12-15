---
title: Riferimento DSL
weight: 2
description: "Complete reference for Goa's design language - data modeling, services, methods, HTTP/gRPC mapping, and security."
llm_optimized: true
aliases:
---

Il linguaggio specifico di dominio (DSL) di Goa è la pietra angolare dell'approccio design-first. Questo riferimento copre tutti gli aspetti del DSL, dalle definizioni di base dei tipi alle complesse mappature di trasporto e agli schemi di sicurezza.

## Modellazione dei dati

Goa fornisce un potente sistema di tipi per modellare il dominio con precisione. Dalle semplici primitive alle complesse strutture annidate, il DSL offre un modo naturale per esprimere le relazioni tra i dati, i vincoli e le regole di validazione.

### Tipi primitivi

Goa fornisce questi tipi primitivi incorporati:

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

### Definizione del tipo

La funzione DSL `Type` è il modo principale per definire i tipi di dati strutturati:

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

### Tipi complessi

#### Array

Gli array definiscono collezioni ordinate con convalida opzionale:

```go
var Names = ArrayOf(String, func() {
    MinLength(1)
    MaxLength(10)
})

var Team = Type("Team", func() {
    Attribute("members", ArrayOf(Person))
})
```

#### Mappe

Le mappe forniscono associazioni chiave-valore con sicurezza di tipo:

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

### Composizione di tipi

#### Riferimento

Usare `Reference` per ereditare definizioni di attributi da un altro tipo:

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

#### Estendere

`Extend` crea un nuovo tipo che eredita automaticamente tutti gli attributi:

```go
var Manager = Type("Manager", func() {
    Extend(Employee)
    Attribute("reports", ArrayOf(Employee))
})
```

### Regole di validazione

#### Validazioni delle stringhe
- `Pattern(regex)` - Convalida rispetto a un'espressione regolare
- `MinLength(n)` - Lunghezza minima della stringa
- `MaxLength(n)` - Lunghezza massima della stringa
- `Format(format)` - Convalida rispetto a formati predefiniti

#### Convalide numeriche
- `Minimum(n)` - Valore minimo (incluso)
- `Maximum(n)` - Valore massimo (incluso)
- `ExclusiveMinimum(n)` - Valore minimo (esclusivo)
- `ExclusiveMaximum(n)` - Valore massimo (esclusivo)

#### Validazioni della raccolta
- `MinLength(n)` - Numero minimo di elementi
- `MaxLength(n)` - Numero massimo di elementi

#### Convalide degli oggetti
- `Required("field1", "field2")` - Campi obbligatori

#### Convalide generiche
- `Enum(value1, value2)` - Limita ai valori enumerati

Esempio combinato:

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

### Formati incorporati

Goa include formati predefiniti per i modelli di dati più comuni:

| Formato | Descrizione |
|--------|-------------|
| `FormatDate` | RFC3339 date values |
| `FormatDateTime` | RFC3339 date valori temporali |
| `FormatUUID` | Valori UUID di RFC4122 |
| `FormatEmail` | RFC5322 indirizzi e-mail |
| `FormatHostname` | RFC1035 nomi di host Internet |
| `FormatIPv4` | RFC2373 Valori degli indirizzi IPv4 |
| `FormatIPv6` | RFC2373 Valori degli indirizzi IPv6 |
| `FormatIP` | RFC2373 valori di indirizzi IPv4 o IPv6 |
| `FormatURI` | Valori URI RFC3986 |
| `FormatMAC` | Indirizzi IEEE 802 MAC-48/EUI-48/EUI-64 |
| `FormatCIDR` | RFC4632/RFC4291 Notazione CIDR |
| `FormatRegexp` | Sintassi di espressione regolare RE2 |
| `FormatJSON` | Testo JSON |
| `FormatRFC1123` | Valori di data e ora RFC1123 |

### Attributo vs campo DSL

Usare `Attribute` per i tipi solo HTTP. Usare `Field` quando è necessario il supporto gRPC (include il tag del numero di campo):

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

### Esempi

Fornisce valori di esempio per la documentazione:

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

---

## Definizione API

La funzione `API` definisce le proprietà globali del servizio e serve come radice del progetto.

### Struttura di base

```go
var _ = API("calculator", func() {
    Title("Calculator API")
    Description("A simple calculator service")
    Version("1.0.0")
})
```

### Esempio completo

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

### Configurazione del server

Definire dove si può accedere all'API:

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

### Errori a livello di API

Definire errori riutilizzabili a livello di API:

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

I servizi possono fare riferimento a questi errori per nome:

```go
var _ = Service("billing", func() {
    Error("unauthorized")  // Inherits all properties
})
```

---

## Servizi e metodi

I servizi raggruppano metodi correlati che forniscono funzionalità specifiche.

### Servizio DSL

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

## Metodo DSL

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

### Tipi di carico utile

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

## Tipi di risultato

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

## Metodi di flusso

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

Lo streaming consente lo scambio continuo di dati in tempo reale tra client e server. Il DSL di Goa per lo streaming è indipendente dal trasporto: lo stesso progetto funziona sia per lo streaming HTTP (WebSocket, Server-Sent Events) che per quello gRPC.

### Modelli di streaming

Goa supporta tre modelli di streaming:

| Pattern | DSL | Caso d'uso |
|---------|-----|----------|
| Server-to-Client | `StreamingResult` | Live feed, notifiche, aggiornamenti sull'avanzamento dei lavori |
| Client-to-Server | `StreamingPayload` | Upload di file, ingestione di eventi |
| Bidirezionale | Entrambi | Chat, collaborazione in tempo reale |

### StreamingPayload

Utilizzare `StreamingPayload` quando i client inviano un flusso di messaggi al server:

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

### Risultato del flusso

Utilizzare `StreamingResult` quando il server invia un flusso di messaggi al client:

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

### Flusso bidirezionale

Combina entrambi per una comunicazione full-duplex:

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

### Mappatura del trasporto

Lo stesso progetto di streaming viene mappato su diversi trasporti:

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

**Vedi anche:**
- [Guida HTTP: Integrazione WebSocket](http-guide/#websocket-integration) - implementazione dello streaming specifica per HTTP
- [Guida HTTP: Eventi inviati dal server](http-guide/#server-sent-events) - SSE per lo streaming unidirezionale del server
- [Guida gRPC: Modelli di streaming](grpc-guide/#streaming-patterns) - implementazione dello streaming gRPC

---

## File statici

Il DSL `Files` serve contenuti statici direttamente dal filesystem. Si tratta di una funzione solo HTTP: gRPC non supporta il servizio di file statici.

### Uso di base

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

### Servizio di directory

Il carattere jolly `{*path}` cattura il percorso URL rimanente:

```go
// Request: GET /assets/css/style.css
// Serves: ./static/css/style.css
Files("/assets/{*path}", "./static")
```

### Applicazioni a pagina singola

Per le SPA con routing lato client, servire lo stesso HTML per tutti i percorsi:

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

**Nota**: `Files` è solo HTTP. Per modelli dettagliati, compresa l'integrazione dei template, vedere [Guida HTTP: Contenuto statico] (http-guide/#static-content).

---

## Gestione degli errori (livello di progettazione)

Gli errori in Goa sono definiti a livello di progetto e mappati automaticamente alle risposte specifiche del trasporto. Questa sezione riguarda il DSL per la definizione degli errori; per i dettagli sulla mappatura dei trasporti, vedere [Guida alla gestione degli errori] (error-handling/).

### Scopi degli errori

Gli errori possono essere definiti a tre livelli:

| Ambito di applicazione | Disponibilità | Caso d'uso |
|-------|--------------|----------|
| A livello API | Tutti i servizi | Errori comuni (non autorizzato, tasso limitato) |
| A livello di servizio | Tutti i metodi nel servizio | Errori di dominio (non trovato, stato non valido) |
| A livello di metodo | Solo un metodo singolo | Errori specifici dell'operazione |

### Errori a livello API

Definiti una volta, usati ovunque:

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

### Errori a livello di servizio

Disponibile per tutti i metodi del servizio:

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

### Errori a livello di metodo

Specifici di una singola operazione:

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

### Proprietà di errore

Contrassegnare gli errori con proprietà semantiche:

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

### Tipi di errore personalizzati

Per gli errori che necessitano di un contesto aggiuntivo:

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

**Vedi anche:**
- [Guida alla gestione degli errori](error-handling/) - Schemi completi di gestione degli errori
- [Guida HTTP: Risposte agli errori](http-guide/#best-practices) - Mappatura dei codici di stato HTTP
- [Guida gRPC: Gestione degli errori](grpc-guide/#error-handling) - Mappatura dei codici di stato gRPC

---

## Mappatura del trasporto HTTP

Il DSL HTTP definisce il modo in cui i metodi dei servizi si adattano agli endpoint HTTP.

### Componenti della richiesta HTTP

Una richiesta HTTP ha quattro parti che possono essere mappate agli attributi del payload:

1. **Parametri del percorso dell'URL** - ad esempio, `/bottle/{id}`
2. **Parametri della stringa di richiesta**
3. **Intestazioni HTTP**
4. **Corpo della richiesta**

Espressioni di mappatura:
- `Param` - Carica dal percorso o dalla stringa di query
- `Header` - Carica dalle intestazioni HTTP
- `Body` - Carica dal corpo della richiesta

### Mappatura dei payload non oggetto

Per i payload primitivi, array o mappe, i valori vengono caricati dal primo elemento definito:

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

### Mappatura dei payload degli oggetti

Per i payload degli oggetti, specificare la provenienza di ciascun attributo:

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

Usare `Body` per specificare un corpo non oggetto:

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

### Mappatura dei nomi degli elementi

Mappare i nomi degli elementi HTTP in nomi di attributi:

```go
Header("version:X-Api-Version")  // version attribute from X-Api-Version header

Body(func() {
    Attribute("name:n")  // name attribute from "n" field in JSON
    Attribute("age:a")   // age attribute from "a" field in JSON
})
```

---

## Mappatura del trasporto gRPC

Il DSL gRPC definisce come i metodi dei servizi si adattano alle procedure gRPC.

### Caratteristiche di gRPC

1. **Mappatura dei messaggi** - Definizione di strutture di richiesta/risposta con numeri di campi
2. **Codici di stato** - Mappatura dei risultati con i codici di stato gRPC
3. **Metadati** - Configurare la gestione dei metadati gRPC

### Supporto di protocolli misti

I servizi possono supportare sia HTTP che gRPC:

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

Mappatura delle risorse REST:

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

## Sicurezza

Goa fornisce costrutti DSL per l'autenticazione e l'autorizzazione.

### Schemi di sicurezza

#### JWT (JSON Web Token)

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT-based authentication")
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
```

#### Chiavi API

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("API key-based authorization")
})
```

#### Autenticazione di base

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

### Applicazione della sicurezza

#### Metodo Livello

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

#### Schemi multipli

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

### Implementazione della sicurezza

Goa genera un'interfaccia `Auther` che il servizio deve implementare:

```go
type Auther interface {
    BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error)
    JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error)
    APIKeyAuth(ctx context.Context, key string, scheme *security.APIKeyScheme) (context.Context, error)
    OAuth2Auth(ctx context.Context, token string, scheme *security.OAuth2Scheme) (context.Context, error)
}
```

Esempio di implementazione JWT:

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

Esempio di implementazione di Basic Auth:

```go
func (s *svc) BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error) {
    if user != "goa" || pass != "rocks" {
        return ctx, ErrUnauthorized
    }
    return contextWithAuthInfo(ctx, authInfo{user: user}), nil
}
```

---

## Migliori pratiche

### Organizzazione dei tipi
- Raggruppare i tipi correlati
- Utilizzare nomi e descrizioni dei campi significativi
- Seguire convenzioni di denominazione coerenti
- Mantenere i tipi focalizzati e coesi

strategia di convalida ###
- Aggiungere vincoli appropriati per ogni campo
- Definire esplicitamente i campi obbligatori
- Utilizzare i validatori di formato per i formati standard
- Considerare regole di validazione specifiche per il dominio

### Progettazione del servizio
- Raggruppare le funzionalità correlate in servizi
- Mantenere l'ambito del servizio focalizzato e coeso
- Utilizzare nomi di servizio chiari e descrittivi
- Documentate lo scopo e l'uso del servizio

### Progettazione del metodo
- Utilizzare nomi di metodi chiari e orientati all'azione
- Fornire descrizioni dettagliate
- Definire risposte di errore appropriate
- Considerare i requisiti di convalida

### Progettazione HTTP
- Utilizzare modelli di URL coerenti
- Seguire le convenzioni RESTful
- Scegliere codici di stato appropriati
- Gestire gli errori in modo coerente

### Sicurezza
- Utilizzare schemi di sicurezza appropriati per il proprio caso d'uso
- Implementare una corretta validazione dei token
- Definire chiare gerarchie di ambito
- Utilizzare HTTPS in produzione
