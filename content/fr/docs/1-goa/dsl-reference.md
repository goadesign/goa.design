---
title: Référence DSL
weight: 2
description: "Complete reference for Goa's design language - data modeling, services, methods, HTTP/gRPC mapping, and security."
llm_optimized: true
aliases:
---

Le langage spécifique au domaine (DSL) de Goa est la pierre angulaire de l'approche "conception d'abord". Cette référence couvre tous les aspects du DSL, depuis les définitions de type de base jusqu'aux mappages de transport complexes et aux schémas de sécurité.

## Modélisation des données

Goa fournit un système de types puissant pour modéliser votre domaine avec précision. Des simples primitives aux structures complexes imbriquées, le DSL offre un moyen naturel d'exprimer les relations entre les données, les contraintes et les règles de validation.

### Types primitifs

Goa fournit ces types primitifs intégrés :

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

### Définition du type

La fonction DSL `Type` est le principal moyen de définir des types de données structurées :

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

### Types complexes

#### Tableaux

Les tableaux définissent des collections ordonnées avec validation facultative :

```go
var Names = ArrayOf(String, func() {
    MinLength(1)
    MaxLength(10)
})

var Team = Type("Team", func() {
    Attribute("members", ArrayOf(Person))
})
```

#### Cartes

Les cartes fournissent des associations clé-valeur avec une sécurité de type :

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

### Composition des types

#### Référence

Utilisez `Reference` pour hériter des définitions d'attributs d'un autre type :

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

#### Étendre

`Extend` crée un nouveau type qui hérite automatiquement de tous les attributs :

```go
var Manager = Type("Manager", func() {
    Extend(Employee)
    Attribute("reports", ArrayOf(Employee))
})
```

### Règles de validation

#### Validations de chaînes
- `Pattern(regex)` - Validation par rapport à une expression régulière
- `MinLength(n)` - Longueur minimale de la chaîne
- `MaxLength(n)` - Longueur maximale de la chaîne
- `Format(format)` - Validation par rapport à des formats prédéfinis

#### Validations numériques
- `Minimum(n)` - Valeur minimale (incluse)
- `Maximum(n)` - Valeur maximale (incluse)
- `ExclusiveMinimum(n)` - Valeur minimale (exclusive)
- `ExclusiveMaximum(n)` - Valeur maximale (exclusive)

#### Validations de la collection
- `MinLength(n)` - Nombre minimal d'éléments
- `MaxLength(n)` - Nombre maximal d'éléments

#### Validations d'objets
- `Required("field1", "field2")` - Champs obligatoires

#### Validations génériques
- `Enum(value1, value2)` - Restreint aux valeurs énumérées

Exemple combiné :

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

### Formats intégrés

Goa comprend des formats prédéfinis pour les modèles de données courants :

| Format | Description |
|--------|-------------|
| `FormatDate` `FormatDateTime` Valeurs de date RFC3339
| `FormatDateTime` RFC3339 date time values | `FormatUUID` RFC3339 date time values |
| `FormatUUID` Valeurs UUID RFC4122 | `FormatEmail` Valeurs UUID RFC4122
| `FormatEmail` RFC5322 adresses électroniques | `FormatHostname` RFC5322 adresses électroniques
| `FormatHostname` RFC1035 Noms d'hôtes Internet | `FormatIPv4` RFC4122
| `FormatIPv4` RFC2373 Valeurs d'adresses IPv4 | `FormatIPv6` RFC2373 Valeurs d'adresses IPv4
| `FormatIPv6` RFC2373 Valeurs des adresses IPv6 |
| `FormatIP` Valeurs d'adresses IPv4 ou IPv6 RFC2373 | `FormatURI` Valeurs d'adresses IPv4 ou IPv6 RFC2373
| `FormatURI` Valeurs d'URI RFC3986 | `FormatMAC` Valeurs d'URI RFC3986
| IEEE 802 MAC-48/EUI-48/EUI-64 adresses | `FormatMAC` IEEE 802 MAC-48/EUI-48/EUI-64 adresses | `FormatCIDR` RFC2373
| `FormatCIDR` RFC4632/RFC4291 notation CIDR |
| `FormatRegexp` Syntaxe des expressions régulières RE2 |
| `FormatJSON` Texte JSON | `FormatRFC1123` Texte JSON | `FormatJSON` Texte JSON
| `FormatRFC1123` RFC1123 date time values | `FormatJSON` JSON text

### Attribut vs Champ DSL

Utilisez `Attribute` pour les types HTTP uniquement. Utilisez `Field` lorsque vous avez besoin d'un support gRPC (y compris la balise de numéro de champ) :

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

### Exemples

Fournir des exemples de valeurs pour la documentation :

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

## Définition de l'API

La fonction `API` définit les propriétés globales de votre service et sert de racine à votre conception.

### Structure de base

```go
var _ = API("calculator", func() {
    Title("Calculator API")
    Description("A simple calculator service")
    Version("1.0.0")
})
```

### Exemple complet

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

### Configuration du serveur

Définissez l'endroit où l'on peut accéder à votre API :

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

### Erreurs au niveau de l'API

Définir des erreurs réutilisables au niveau de l'API :

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

Les services peuvent faire référence à ces erreurs par leur nom :

```go
var _ = Service("billing", func() {
    Error("unauthorized")  // Inherits all properties
})
```

---

## Services et méthodes

Les services regroupent des méthodes apparentées qui fournissent des fonctionnalités spécifiques.

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

### Méthode DSL

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

### Types de charge utile

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

### Types de résultats

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

### Méthodes de diffusion en continu

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

Le streaming permet l'échange de données en temps réel et en continu entre les clients et les serveurs. Le DSL de streaming de Goa est agnostique en matière de transport - la même conception fonctionne pour le streaming HTTP (WebSocket, Server-Sent Events) et gRPC.

### Modèles de diffusion en continu

Goa prend en charge trois types de flux :

| Modèle de flux de données - DSL - Cas d'utilisation - Modèle de flux de données - DSL - Cas d'utilisation - Cas d'utilisation
|---------|-----|----------|
| Serveur à client - `StreamingResult` | Flux en direct, notifications, mises à jour de l'état d'avancement
| Client-à-Serveur | `StreamingPayload` | Téléchargement de fichiers, ingestion d'événements |
| Bidirectionnel | Les deux | Chat, collaboration en temps réel |

### StreamingPayload

Utilisez `StreamingPayload` lorsque les clients envoient un flux de messages au serveur :

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

Utilisez `StreamingResult` lorsque le serveur envoie un flux de messages au client :

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

### Flux bidirectionnel

Combinez les deux pour une communication en duplex intégral :

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

### Mappage du transport

La même conception de diffusion en continu s'applique à différents modes de transport :

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

**Voir aussi :**
- [Guide HTTP : Intégration WebSocket](http-guide/#websocket-integration) - Mise en œuvre de la diffusion en continu spécifique à HTTP
- [Guide HTTP : Événements envoyés par le serveur](http-guide/#server-sent-events) - SSE pour le streaming serveur unidirectionnel
- [Guide gRPC : modèles de diffusion en continu](grpc-guide/#streaming-patterns) - Mise en œuvre de la diffusion en continu gRPC

---

## Fichiers statiques

Le DSL `Files` sert le contenu statique directement à partir du système de fichiers. Il s'agit d'une fonctionnalité HTTP uniquement - gRPC ne prend pas en charge le service de fichiers statiques.

### Utilisation de base

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

### Service de répertoire

Le caractère générique `{*path}` capture le reste du chemin d'accès à l'URL :

```go
// Request: GET /assets/css/style.css
// Serves: ./static/css/style.css
Files("/assets/{*path}", "./static")
```

### Applications à page unique

Pour les SPA avec routage côté client, servez le même HTML pour tous les itinéraires :

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

**Note** : `Files` est HTTP uniquement. Pour des modèles détaillés incluant l'intégration de modèles, voir [Guide HTTP : contenu statique](http-guide/#static-content).

---

## Gestion des erreurs (niveau conception)

Les erreurs dans Goa sont définies au niveau de la conception et automatiquement mises en correspondance avec les réponses spécifiques au transport. Cette section couvre le DSL pour la définition des erreurs ; pour les détails sur le mappage des transports, voir le [Guide de gestion des erreurs] (error-handling/).

### Portée des erreurs

Les erreurs peuvent être définies à trois niveaux :

| Les erreurs peuvent être définies à trois niveaux : - Portée - Disponibilité - Cas d'utilisation
|-------|--------------|----------|
| Au niveau de l'API, tous les services, les erreurs courantes (non autorisé, taux limité), les erreurs de domaine (non trouvé, état invalide), les erreurs de service (non trouvé, état invalide)
| Au niveau de l'API, toutes les méthodes dans le service, les erreurs de domaine (non trouvé, état invalide), les erreurs de service, les erreurs de service, les erreurs de service
| Au niveau de l'API | Toutes les méthodes du service | Erreurs de domaine (introuvable, état invalide)

### Erreurs au niveau de l'API

Définir une fois, utiliser partout :

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

### Erreurs au niveau du service

Disponible pour toutes les méthodes du service :

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

### Erreurs au niveau de la méthode

Spécifiques à une seule opération :

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

### Propriétés de l'erreur

Marquez les erreurs avec des propriétés sémantiques :

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

### Types d'erreurs personnalisés

Pour les erreurs nécessitant un contexte supplémentaire :

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

**Voir aussi:**
- [Guide de gestion des erreurs](error-handling/) - Modèles complets de gestion des erreurs
- [Guide HTTP : Réponses aux erreurs](http-guide/#best-practices) - Correspondance des codes d'état HTTP
- [Guide gRPC : Gestion des erreurs](grpc-guide/#error-handling) - Correspondance des codes d'état gRPC

---

## Mappage du transport HTTP

Le DSL HTTP définit la correspondance entre les méthodes de service et les points d'extrémité HTTP.

### Composants des requêtes HTTP

Une requête HTTP comporte quatre parties qui peuvent être associées à des attributs de charge utile :

1. **Paramètres du chemin d'accès à l'URL** - par exemple, `/bottle/{id}`
2. **Paramètres de la chaîne de requête**
3. **En-têtes HTTP**
4. **Corps de la requête**

Expressions de mappage :
- `Param` - Chargement à partir du chemin ou de la chaîne de requête
- `Header` - Chargement à partir des en-têtes HTTP
- `Body` - Chargement à partir du corps de la requête

### Mapping Non-Object Payloads

Pour les données utiles primitives, les tableaux ou les cartes, les valeurs sont chargées à partir du premier élément défini :

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

### Charges utiles d'objets de mappage

Pour les charges utiles d'objets, spécifiez l'origine de chaque attribut :

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

Utilisez `Body` pour spécifier un corps qui n'est pas un objet :

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

### Correspondance des noms d'éléments

Mettez en correspondance les noms des éléments HTTP avec les noms des attributs :

```go
Header("version:X-Api-Version")  // version attribute from X-Api-Version header

Body(func() {
    Attribute("name:n")  // name attribute from "n" field in JSON
    Attribute("age:a")   // age attribute from "a" field in JSON
})
```

---

## Mappage du transport gRPC

Le DSL gRPC définit la correspondance entre les méthodes de service et les procédures gRPC.

### Fonctionnalités gRPC

1. **Mappage des messages** - Définir des structures de demande/réponse avec des numéros de champ
2. **Codes d'état** - Correspondance des résultats avec les codes d'état gRPC
3. **Métadonnées** - Configurer la gestion des métadonnées gRPC

### Support des protocoles mixtes

Les services peuvent prendre en charge à la fois HTTP et gRPC :

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

Cartographie des ressources RESTful :

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

## Sécurité

Goa fournit des constructions DSL pour l'authentification et l'autorisation.

### Schémas de sécurité

#### JWT (JSON Web Token)

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("JWT-based authentication")
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
})
```

#### Clés API

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("API key-based authorization")
})
```

#### Authentification de base

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

### Application de la sécurité

#### Niveau de la méthode

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

#### Schémas multiples

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

### Mise en œuvre de la sécurité

Goa génère une interface `Auther` que votre service doit implémenter :

```go
type Auther interface {
    BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error)
    JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error)
    APIKeyAuth(ctx context.Context, key string, scheme *security.APIKeyScheme) (context.Context, error)
    OAuth2Auth(ctx context.Context, token string, scheme *security.OAuth2Scheme) (context.Context, error)
}
```

Exemple de mise en œuvre de JWT :

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

Exemple de mise en œuvre de l'authentification de base :

```go
func (s *svc) BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error) {
    if user != "goa" || pass != "rocks" {
        return ctx, ErrUnauthorized
    }
    return contextWithAuthInfo(ctx, authInfo{user: user}), nil
}
```

---

## Meilleures pratiques

### Organisation des types
- Regrouper les types apparentés
- Utiliser des noms de champs et des descriptions significatifs
- Suivre des conventions de dénomination cohérentes
- Garder les types concentrés et cohérents

### Stratégie de validation
- Ajouter des contraintes appropriées pour chaque champ
- Définir explicitement les champs obligatoires
- Utiliser des validateurs de format pour les formats standard
- Tenir compte des règles de validation spécifiques au domaine

### Conception des services
- Regrouper les fonctionnalités connexes dans des services
- Maintenir l'étendue des services ciblée et cohérente
- Utiliser des noms de services clairs et descriptifs
- Documenter l'objectif et l'utilisation du service

conception de la méthode ###
- Utiliser des noms de méthodes clairs et orientés vers l'action
- Fournir des descriptions détaillées
- Définir des réponses d'erreur appropriées
- Tenir compte des exigences de validation

### Conception HTTP
- Utiliser des modèles d'URL cohérents
- Suivre les conventions RESTful
- Choisir les codes d'état appropriés
- Traiter les erreurs de manière cohérente

### Sécurité
- Utiliser des schémas de sécurité appropriés pour votre cas d'utilisation
- Mettre en œuvre une validation correcte des jetons
- Définir des hiérarchies d'étendue claires
- Utiliser HTTPS en production
