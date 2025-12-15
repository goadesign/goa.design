---
title: "Indice"
weight: 3
description: "Microservice instrumentation for Go - logging, tracing, metrics, health checks, and debugging."
llm_optimized: true
---

Clue fournit une instrumentation complète pour les microservices Go construits sur OpenTelemetry. Bien que conçu pour s'intégrer de manière transparente avec Goa, Clue fonctionne avec n'importe quel service Go HTTP ou gRPC.

## Pourquoi Clue ?

Clue résout un problème courant dans les microservices : vous avez besoin de journaux détaillés lorsque les choses vont mal, mais vous ne voulez pas payer le coût de tout enregistrer en permanence.

L'approche de Clue : **mettre en mémoire tampon les messages de logs et ne les écrire que lorsqu'une erreur se produit ou que la requête est en cours de traçage**. Les requêtes réussies et non tracées ne génèrent aucune sortie de journal. Lorsque des erreurs se produisent, vous obtenez le contexte complet de ce qui a conduit à l'échec.

Cette simple décision de conception réduit considérablement le volume des journaux tout en préservant les informations de débogage dont vous avez besoin.

## Aperçu du paquet

| Package | Objectif |
|---------|---------|
| `clue` | OpenTelemetry configuration - un seul appel pour configurer les métriques et le traçage |
| `log` | Journalisation structurée basée sur le contexte avec mise en mémoire tampon intelligente |
| `health` Points d'extrémité de contrôle de santé pour Kubernetes et les systèmes d'orchestration | `health` `debug` Les points d'extrémité de contrôle de santé
| `debug` | Débogage en cours d'exécution - basculement des journaux de débogage, points d'extrémité pprof |
| `mock` | Générer et configurer des doubles de test pour les dépendances |
| `interceptors` | Intercepteurs Goa pour le traçage des messages de flux individuels |

## Installation

N'installez que les paquets dont vous avez besoin :

```bash
go get goa.design/clue/clue
go get goa.design/clue/log
go get goa.design/clue/health
go get goa.design/clue/debug
go get goa.design/clue/mock
go get goa.design/clue/interceptors
```

---

## Le paquet de logs

Le paquet `log` est construit autour du paquet `context.Context` de Go. Vous initialisez un contexte de journalisation une seule fois et vous le transmettez à votre application. Toutes les fonctions de journalisation prennent ce contexte comme premier argument.

### Démarrage rapide

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

### Comprendre la mise en mémoire tampon

C'est la fonction clé de Clue. Il existe deux types de fonctions logarithmiques :

**Fonctions immédiates** - écrivent directement sur la sortie :
- `Print()`, `Printf()` - écrivent toujours immédiatement
- `Error()`, `Errorf()` - effacer le tampon, puis écrire
- `Fatal()`, `Fatalf()` - rincer la mémoire tampon, écrire, puis quitter

**Fonctions tamponnées** - stockage en mémoire jusqu'à ce que la mémoire soit vidée :
- `Info()`, `Infof()` - mise en mémoire tampon du message
- `Warn()`, `Warnf()` - mise en mémoire tampon du message
- `Debug()`, `Debugf()` - mise en mémoire tampon si le débogage est activé

La mémoire tampon se vide automatiquement lorsque
1. `Error()` ou `Fatal()` est appelé
2. La requête est tracée (détectée via le contexte OpenTelemetry span)
3. Le mode débogage est activé

**Exemple : Pourquoi c'est important**

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

Pour une demande réussie : **zéro sortie de journal**. Pour une requête échouée : **contexte complet**.

### Ajout de contexte avec With()

Construisez un contexte de journalisation au fur et à mesure que les requêtes transitent par votre service :

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

### Paires clé-valeur

Il existe deux façons de spécifier des paires clé-valeur :

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

Utilisez `KV` lorsque l'ordre des champs du journal est important (plus facile à analyser). Utilisez `Fields` lorsque ce n'est pas le cas.

Les valeurs peuvent être des chaînes, des nombres, des booléens, nil ou des tranches de ces types.

### Formats des journaux

Clue détecte automatiquement les terminaux et sélectionne le format approprié :

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText** (par défaut pour les non-terminaux) - style logfmt :
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal** (par défaut pour les terminaux) - horodatage coloré et relatif :
```
INFO[0042] user=alice action=login
```

**FormatJSON** - JSON structuré :
```json
{"time":"2024-01-15T10:30:00Z","level":"info","user":"alice","action":"login"}
```

**Custom format:**

```go
func myFormat(e *log.Entry) []byte {
    return []byte(fmt.Sprintf("[%s] %v\n", e.Severity, e.KeyVals))
}

ctx := log.Context(context.Background(), log.WithFormat(myFormat))
```

### Ajout d'identifiants de trace et de portée

Connecter les journaux aux traces distribuées :

```go
ctx := log.Context(context.Background(),
    log.WithFormat(log.FormatJSON),
    log.WithFunc(log.Span),  // Adds trace_id and span_id to every log
)
```

Sortie :
```json
{"time":"...","level":"info","trace_id":"abc123","span_id":"def456","msg":"hello"}
```

### Ajout de l'emplacement du fichier

Pour le débogage, ajoutez le fichier source et les numéros de ligne :

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

La sortie comprend : `file=mypackage/handler.go:42`

### Middleware HTTP

L'intergiciel HTTP a deux fonctions :
1. Copier l'enregistreur de votre contexte de base dans le contexte de chaque requête
2. Il enregistre le début et la fin de la requête avec la méthode, l'URL, le statut et la durée

```go
func main() {
    ctx := log.Context(context.Background())
    
    handler := http.HandlerFunc(myHandler)
    handler = log.HTTP(ctx)(handler)  // Note: returns middleware, then apply
    
    http.ListenAndServe(":8080", handler)
}
```

**Options:**

```go
// Skip logging for certain paths (e.g., health checks)
handler = log.HTTP(ctx, log.WithPathFilter(regexp.MustCompile(`^/healthz$`)))(handler)

// Disable request logging entirely (still sets up context)
handler = log.HTTP(ctx, log.WithDisableRequestLogging())(handler)

// Disable request ID generation
handler = log.HTTP(ctx, log.WithDisableRequestID())(handler)
```

### Intercepteurs gRPC

Pour les serveurs gRPC :

```go
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(log.UnaryServerInterceptor(ctx)),
    grpc.ChainStreamInterceptor(log.StreamServerInterceptor(ctx)),
)
```

Pour les clients gRPC :

```go
conn, err := grpc.Dial(addr,
    grpc.WithUnaryInterceptor(log.UnaryClientInterceptor()),
    grpc.WithStreamInterceptor(log.StreamClientInterceptor()),
)
```

### Enregistrement des clients HTTP

Enveloppez les transports HTTP pour enregistrer les demandes sortantes :

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

### Intégration de Goa

Ajouter les noms des services et des méthodes aux journaux :

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)  // Adds goa.service and goa.method to context
```

### Personnalisation des clés de journalisation

Toutes les clés de journalisation sont des variables de paquetage que vous pouvez remplacer :

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

### Adaptateur pour d'autres enregistreurs

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

## Le paquet d'indices

Le paquet `clue` configure OpenTelemetry avec des valeurs par défaut raisonnables en un seul appel de fonction.

### Configuration de base

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

### Échantillonnage adaptatif

Clue comprend un échantillonneur adaptatif qui ajuste automatiquement le taux d'échantillonnage en fonction du volume de trafic. Cela permet d'éviter que le stockage des traces ne soit saturé lors des pics de trafic.

Paramètres par défaut :
- **Taux d'échantillonnage maximum:** 2 traces par seconde
- **Taille de l'échantillon:** 10 requêtes entre les ajustements

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

### Fonctions d'aide à l'exportation

Clue fournit des fonctions d'aide qui créent des exportateurs avec une gestion appropriée des arrêts :

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

### Options de configuration

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

### Désactivation des mesures ou du traçage

Passez `nil` pour l'exportateur dont vous n'avez pas besoin :

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

## Le paquet santé

Le paquet `health` crée des points de contrôle de santé qui rendent compte des dépendances des services.

### Utilisation de base

```go
import "goa.design/clue/health"

func main() {
    checker := health.NewChecker()
    
    mux := http.NewServeMux()
    mux.Handle("/healthz", health.Handler(checker))
    mux.Handle("/livez", health.Handler(checker))
}
```

### Vérification des dépendances

Utilisez `NewPinger` pour vérifier les services qui exposent des points de terminaison de santé :

```go
checker := health.NewChecker(
    health.NewPinger("database-service", "db.internal:8080"),
    health.NewPinger("cache-service", "cache.internal:8080"),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https")),
)
```

**Pinger options:**

```go
health.NewPinger("service", "host:port",
    health.WithScheme("https"),           // Default: "http"
    health.WithPath("/health"),           // Default: "/livez"
    health.WithTimeout(5 * time.Second),  // Default: no timeout
    health.WithTransport(customTransport),
)
```

### Contrôles de santé personnalisés

Mettre en œuvre l'interface `Pinger` pour les contrôles personnalisés :

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

### Format de la réponse

Le gestionnaire renvoie JSON par défaut, XML si demandé :

**Santé (HTTP 200):**
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

**Malsain (HTTP 503):**
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

Définir la version au moment de la construction :

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

## Le paquet de débogage

Le paquet `debug` permet de résoudre les problèmes d'exécution sans redéploiement.

### La journalisation dynamique de débogage

Monter un point de terminaison pour basculer les journaux de débogage au moment de l'exécution :

```go
mux := http.NewServeMux()
debug.MountDebugLogEnabler(mux)  // Mounts at /debug
```

Contrôler les journaux de débogage via HTTP :

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

**Important:** Le point de terminaison ne contrôle qu'un drapeau. Vous devez utiliser l'intergiciel de débogage pour qu'il prenne effet :

```go
// For HTTP servers
handler = debug.HTTP()(handler)

// For gRPC servers
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(debug.UnaryServerInterceptor()),
    grpc.ChainStreamInterceptor(debug.StreamServerInterceptor()),
)
```

**Options:**

```go
debug.MountDebugLogEnabler(mux,
    debug.WithPath("/api/debug"),     // Default: "/debug"
    debug.WithQuery("logging"),        // Default: "debug-logs"
    debug.WithOnValue("enable"),       // Default: "on"
    debug.WithOffValue("disable"),     // Default: "off"
)
```

### pprof Endpoints

Monter les points d'extrémité de profilage de Go :

```go
debug.MountPprofHandlers(mux)  // Mounts at /debug/pprof/
```

Points d'accès disponibles :
- `/debug/pprof/` - Page d'index
- `/debug/pprof/heap` - Profil du tas
- `/debug/pprof/goroutine` - Profil Goroutine
- `/debug/pprof/profile` - Profil CPU (30s par défaut)
- `/debug/pprof/trace` - Trace d'exécution
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex`, etc.

⚠️ **Avertissement de sécurité:** N'exposez pas les points de terminaison pprof publiquement. Ils révèlent des informations sensibles sur votre application.

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

### Journalisation des charges utiles pour Goa

Enregistre les données utiles des requêtes et des réponses lorsque le débogage est activé :

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())  // Only logs when debug enabled
endpoints.Use(log.Endpoint)
```

**Options:**

```go
debug.LogPayloads(
    debug.WithMaxSize(2048),  // Max bytes to log, default: 1024
    debug.WithFormat(debug.FormatJSON),  // Custom formatter
    debug.WithClient(),  // Prefix keys with "client-" for client-side logging
)
```

### Adaptateur Muxer Goa

Pour le muxer HTTP de Goa :

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

## Le paquet fictif

Le paquet `mock` permet de créer des doubles de test pour les dépendances avec un support pour les séquences d'appel et les mocks permanents.

### Concepts

**Séquences:** Définir les appels attendus dans l'ordre. Chaque appel à `Next()` renvoie la fonction suivante dans la séquence.

**Mocks permanents:** renvoient toujours la même fonction, utilisés lorsque les séquences sont épuisées ou lorsque l'ordre n'a pas d'importance.

### Création d'un Mock

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

### Utilisation des Mocks dans les tests

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

### Mocks permanents

Utilisez `Set()` pour les appels qui doivent toujours se comporter de la même manière :

```go
userMock.SetGetUser(func(ctx context.Context, id string) (*User, error) {
    return &User{ID: id, Name: "Test User"}, nil
})
```

Les séquences ont la priorité sur les objets fantaisie permanents. Une fois la séquence épuisée, `Next()` renvoie l'image permanente.

### Générateur de mock (cmg)

Génère automatiquement des mocks à partir d'interfaces :

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

Les mocks générés sont placés dans un sous-répertoire `mocks/` à côté du fichier source.

---

## Le paquet d'intercepteurs

Le paquet `interceptors` fournit des intercepteurs Goa pour tracer les messages individuels dans les RPCs en streaming. Contrairement à l'instrumentation standard d'OpenTelemetry (qui trace le flux entier), ces intercepteurs propagent le contexte de trace à travers chaque message.

### Quand utiliser

Utilisez ces intercepteurs lorsque vous en avez besoin :
- Traçage par message dans des flux de longue durée
- Tracer le contexte du flux entre le client et le serveur par le biais de messages de flux
- Corrélation et synchronisation des messages individuels

### Configuration de la conception

Dans votre conception Goa, définissez des intercepteurs avec des attributs `TraceMetadata` :

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

Appliquer aux méthodes de streaming :

```go
Method("Chat", func() {
    StreamingPayload(ChatMessage)
    StreamingResult(ChatResponse)
    ClientInterceptor(TraceBidirectionalStream)
    ServerInterceptor(TraceBidirectionalStream)
})
```

### Mise en œuvre

Dans vos implémentations d'intercepteurs, appelez les fonctions fournies :

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

### Extraction du contexte de la trace à partir des messages reçus

Puisque les interfaces de flux générées par Goa ne renvoient pas de contexte, utilisez les fonctions d'aide :

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

Ou utilisez le wrapper pour un code plus propre :

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

## Exemple complet

Un service Goa entièrement instrumenté :

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

## Meilleures pratiques

### Journalisation

1. **Utilisez `Info()` pour le traitement des demandes, `Print()` pour les événements du cycle de vie ** Les journaux des demandes doivent être mis en mémoire tampon ; les journaux de démarrage/arrêt doivent être écrits immédiatement.

2. **Utilisez `log.With()` pour ajouter des ID et des métadonnées dès que vous les avez.

3. **Utilisez `log.WithFunc(log.Span)` pour que les journaux puissent être corrélés avec les traces.

### Contrôles de santé

1. **Vérifiez les dépendances réelles.** Ne vous contentez pas de renvoyer 200. Vérifier les connexions à la base de données, les services en aval.

2. **Un bilan de santé qui se bloque est pire qu'un bilan de santé qui échoue.

3. **Utilisez `/livez` pour l'état de santé de base du processus, `/readyz` pour les contrôles de dépendance complets.

### Débogage

1. **N'exposez jamais pprof publiquement.** Utilisez un port interne séparé ou une politique de réseau.

2. **Concevoir pour le basculement de débogage.** Structurer la journalisation de sorte que le mode débogage révèle des informations utiles sans pour autant submerger.

---

## Voir aussi

- [Guide de production](../../1-goa/production/) - Modèles de déploiement en production
- [Clue GitHub Repository](https://github.com/goadesign/clue) - Code source et exemple de météo
- [Documentation OpenTelemetry](https://opentelemetry.io/docs/) - Concepts OpenTelemetry
