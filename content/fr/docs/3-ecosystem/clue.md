---
title: "Clue"
weight: 3
description: "Instrumentation de microservices Go — journalisation contextuelle, traces, métriques, sondes de santé et débogage à chaud."
llm_optimized: true
---

Clue fournit une instrumentation complète pour les microservices Go construite sur OpenTelemetry. Conçu pour s’intégrer naturellement à Goa, Clue fonctionne avec n’importe quel service Go HTTP ou gRPC.

## Pourquoi Clue ?

Clue résout un problème classique dans les microservices : vous avez besoin de journaux détaillés lorsqu’un incident survient, sans payer le coût d’une journalisation exhaustive en permanence.

Le principe de Clue : **mettre les messages de journal en mémoire tampon et ne les écrire que lorsqu’une erreur survient ou que la requête est tracée**. Les requêtes réussies non tracées ne produisent aucune sortie de journal. En cas d’erreur, vous récupérez l’intégralité du contexte ayant mené à l’échec.

Ce seul choix de conception réduit drastiquement le volume de logs tout en conservant les informations nécessaires au diagnostic.

{{< anchors "aperçu-du-paquet" >}}
## Vue d’ensemble des packages

| Package | Rôle |
|---------|------|
| `clue` | Configuration OpenTelemetry — un seul appel pour initialiser métriques et traçage |
| `log` | Journalisation structurée portée par le contexte avec mise en tampon sélective |
| `health` | Endpoints de contrôle de santé pour Kubernetes et les orchestrateurs |
| `debug` | Débogage à l’exécution — activation dynamique des logs de debug et endpoints `pprof` |
| `mock` | Génération et configuration de doublures de test pour les dépendances |
| `interceptors` | Intercepteurs Goa pour tracer individuellement chaque message d’un flux |

## Installation

Installez uniquement les packages dont vous avez besoin :

```bash
go get goa.design/clue/clue
go get goa.design/clue/log
go get goa.design/clue/health
go get goa.design/clue/debug
go get goa.design/clue/mock
go get goa.design/clue/interceptors
```

---

{{< anchors "le-paquet-de-logs" >}}
## Le package `log`

Le package `log` s’articule autour du `context.Context` de Go. Vous initialisez une seule fois un contexte de journalisation et le propagez dans votre application. Toutes les fonctions de journalisation prennent ce contexte en premier argument.

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

C’est la fonctionnalité centrale de Clue. On distingue deux familles de fonctions de log :

**Fonctions immédiates** — écrivent directement sur la sortie :
- `Print()`, `Printf()` — écrivent toujours immédiatement
- `Error()`, `Errorf()` — vident le tampon, puis écrivent
- `Fatal()`, `Fatalf()` — vident le tampon, écrivent, puis terminent le processus

**Fonctions tamponnées** — conservent les entrées en mémoire jusqu’au vidage :
- `Info()`, `Infof()` — mettent le message en tampon
- `Warn()`, `Warnf()` — mettent le message en tampon
- `Debug()`, `Debugf()` — n’écrivent que lorsque le mode debug est activé (ignorées sinon)

Le tampon est vidé automatiquement lorsque :
1. `Error()` ou `Fatal()` est appelé
2. La requête est tracée (détecté via le contexte de span OpenTelemetry)
3. Le mode debug est activé

**Exemple concret**

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

Pour une requête réussie : **zéro ligne de log**. Pour une requête en échec : **le contexte complet**.

{{< anchors "ajout-de-contexte-avec-with" >}}
### Enrichir le contexte avec `With()`

Enrichissez le contexte de journalisation à mesure que la requête traverse votre service :

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

Deux écritures sont possibles pour fournir des paires clé-valeur :

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

Utilisez `KV` lorsque l’ordre des champs compte pour la lecture visuelle, et `Fields` dans le cas contraire.

Les valeurs acceptées sont les chaînes, nombres, booléens, `nil` ou tranches de ces types.

{{< anchors "formats-des-journaux" >}}
### Formats de sortie

Clue détecte automatiquement les terminaux interactifs et choisit le format adapté :

```go
// Explicit format selection
ctx := log.Context(context.Background(), log.WithFormat(log.FormatJSON))
```

**FormatText** (par défaut hors terminal) — style `logfmt` :
```
time=2024-01-15T10:30:00Z level=info user=alice action=login
```

**FormatTerminal** (par défaut dans un terminal) — coloré avec horodatage relatif :
```
INFO[0042] user=alice action=login
```

**FormatJSON** — JSON structuré :
```json
{"time":"2024-01-15T10:30:00Z","level":"info","user":"alice","action":"login"}
```

**Format personnalisé :**

```go
func myFormat(e *log.Entry) []byte {
    return []byte(fmt.Sprintf("[%s] %v\n", e.Severity, e.KeyVals))
}

ctx := log.Context(context.Background(), log.WithFormat(myFormat))
```

{{< anchors "ajout-didentifiants-de-trace-et-de-portée" >}}
### Ajouter les identifiants de trace et de span

Reliez vos journaux aux traces distribuées :

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

{{< anchors "ajout-de-lemplacement-du-fichier" >}}
### Ajouter l’emplacement du fichier source

Pour le débogage, ajoutez le fichier source et le numéro de ligne :

```go
ctx := log.Context(context.Background(), log.WithFileLocation())
```

La sortie inclut alors : `file=mypackage/handler.go:42`

### Middleware HTTP

Le middleware HTTP remplit deux rôles :
1. Copier le logger de votre contexte de base dans le contexte de chaque requête
2. Journaliser le début et la fin de la requête avec la méthode, l’URL, le code HTTP et la durée

```go
func main() {
    ctx := log.Context(context.Background())
    
    handler := http.HandlerFunc(myHandler)
    handler = log.HTTP(ctx)(handler)  // Note: returns middleware, then apply
    
    http.ListenAndServe(":8080", handler)
}
```

**Options :**

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

{{< anchors "enregistrement-des-clients-http" >}}
### Journalisation du client HTTP

Enveloppez le transport HTTP pour journaliser les requêtes sortantes :

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

{{< anchors "intégration-de-goa" >}}
### Intégration Goa

Ajoutez le nom du service et de la méthode aux journaux :

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(log.Endpoint)  // Adds goa.service and goa.method to context
```

{{< anchors "personnalisation-des-clés-de-journalisation" >}}
### Personnaliser les clés de journalisation

Toutes les clés standards sont exposées comme variables de package modifiables :

```go
log.MessageKey = "message"       // default: "msg"
log.ErrorMessageKey = "error"    // default: "err"
log.TimestampKey = "timestamp"   // default: "time"
log.SeverityKey = "severity"     // default: "level"
log.TraceIDKey = "traceId"       // default: "trace_id"
log.SpanIDKey = "spanId"         // default: "span_id"
```

{{< anchors "adaptateur-pour-dautres-enregistreurs" >}}
### Adaptateurs vers d’autres loggers

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

{{< anchors "le-paquet-dindices" >}}
## Le package `clue`

Le package `clue` configure OpenTelemetry avec des valeurs par défaut pertinentes en un seul appel de fonction.

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

Clue intègre un échantillonneur adaptatif qui ajuste automatiquement le taux d’échantillonnage selon le volume de trafic, évitant de saturer le stockage de traces lors des pics de charge.

Valeurs par défaut :
- **Taux d’échantillonnage maximal :** 2 traces par seconde
- **Taille d’échantillon :** 10 requêtes entre deux ajustements

```go
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter,
    clue.WithMaxSamplingRate(100),  // Up to 100 traces/second
    clue.WithSampleSize(50),        // Adjust rate every 50 requests
)
```

{{< anchors "fonctions-daide-à-lexportation" >}}
### Fonctions utilitaires d’exporteurs

Clue propose des constructeurs d’exporteurs gérant proprement l’arrêt :

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

{{< anchors "désactivation-des-mesures-ou-du-traçage" >}}
### Désactiver les métriques ou le traçage

Passez `nil` pour l’exporteur dont vous n’avez pas besoin :

```go
// Tracing only, no metrics
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", nil, spanExporter)

// Metrics only, no tracing
cfg, err := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, nil)
```

---

{{< anchors "le-paquet-santé" >}}
## Le package `health`

Le package `health` expose des endpoints de contrôle de santé qui vérifient l’état des dépendances du service.

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

{{< anchors "vérification-des-dépendances" >}}
### Vérifier des dépendances HTTP

Utilisez `NewPinger` pour sonder les services HTTP amont exposant un endpoint de santé `/livez` (ou personnalisé) ; pour les bases SQL ou Redis, implémentez l’interface `Pinger` à deux méthodes présentée ci-dessous :

```go
checker := health.NewChecker(
    health.NewPinger("orders-service", "orders.internal:8080", health.WithTimeout(5*time.Second)),
    health.NewPinger("inventory-service", "inventory.internal:8080", health.WithTimeout(5*time.Second)),
    health.NewPinger("auth-api", "auth.example.com:443", health.WithScheme("https"), health.WithTimeout(5*time.Second)),
)
```

**Options de `Pinger` :**

```go
health.NewPinger("service", "host:port",
    health.WithScheme("https"),           // Default: "http"
    health.WithPath("/health"),           // Default: "/livez"
    health.WithTimeout(5 * time.Second),  // Default: no timeout
    health.WithTransport(customTransport),
)
```

{{< anchors "contrôles-de-santé-personnalisés" >}}
### Sondes de santé personnalisées

Implémentez l’interface `Pinger` pour vos contrôles sur mesure :

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

{{< anchors "format-de-la-réponse" >}}
### Format de réponse

Le gestionnaire renvoie du JSON par défaut, ou du XML sur demande :

**Sain (HTTP 200) :**
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

**Dégradé (HTTP 503) :**
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

Renseignez la version à la compilation :

```go
health.Version = "v1.2.3"  // Or use ldflags: -X goa.design/clue/health.Version=v1.2.3
```

---

{{< anchors "le-paquet-de-débogage" >}}
## Le package `debug`

Le package `debug` permet de diagnostiquer un service en cours d’exécution sans redéploiement.

{{< anchors "la-journalisation-dynamique-de-débogage" >}}
### Activation dynamique des logs de debug

Montez un endpoint permettant d’activer ou de désactiver les logs de debug à chaud :

```go
mux := http.NewServeMux()
debug.MountDebugLogEnabler(mux)  // Mounts at /debug
```

Pilotez les logs de debug en HTTP :

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

**Important :** L’endpoint ne modifie qu’un indicateur en mémoire. Vous devez brancher le middleware ou l’intercepteur `debug` pour qu’il prenne effet :

```go
// For HTTP servers
handler = debug.HTTP()(handler)

// For gRPC servers
grpcServer := grpc.NewServer(
    grpc.ChainUnaryInterceptor(debug.UnaryServerInterceptor()),
    grpc.ChainStreamInterceptor(debug.StreamServerInterceptor()),
)
```

**Options :**

```go
debug.MountDebugLogEnabler(mux,
    debug.WithPath("/api/debug"),     // Default: "/debug"
    debug.WithQuery("logging"),        // Default: "debug-logs"
    debug.WithOnValue("enable"),       // Default: "on"
    debug.WithOffValue("disable"),     // Default: "off"
)
```

{{< anchors "pprof-endpoints" >}}
### Endpoints `pprof`

Montez les endpoints de profilage Go :

```go
debug.MountPprofHandlers(mux)  // Mounts at /debug/pprof/
```

Endpoints disponibles :
- `/debug/pprof/` — Page d’index
- `/debug/pprof/heap` — Profil mémoire (tas)
- `/debug/pprof/goroutine` — Profil des goroutines
- `/debug/pprof/profile` — Profil CPU (30 s par défaut)
- `/debug/pprof/trace` — Trace d’exécution
- `/debug/pprof/allocs`, `/debug/pprof/block`, `/debug/pprof/mutex`, etc.

⚠️ **Avertissement de sécurité :** N’exposez jamais les endpoints `pprof` publiquement ; ils révèlent des informations sensibles sur votre application.

```go
debug.MountPprofHandlers(mux, debug.WithPrefix("/internal/pprof/"))
```

{{< anchors "journalisation-des-charges-utiles-pour-goa" >}}
### Journalisation des charges utiles Goa

Journalisez les charges utiles des requêtes et réponses lorsque le mode debug est actif :

```go
endpoints := genservice.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())  // Only logs when debug enabled
endpoints.Use(log.Endpoint)
```

**Options :**

```go
debug.LogPayloads(
    debug.WithMaxSize(2048),  // Max bytes to log, default: 1024
    debug.WithFormat(debug.FormatJSON),  // Custom formatter
    debug.WithClient(),  // Prefix keys with "client-" for client-side logging
)
```

{{< anchors "adaptateur-muxer-goa" >}}
### Adaptateur pour le muxer Goa

Pour le muxer HTTP de Goa :

```go
mux := goahttp.NewMuxer()
debug.MountDebugLogEnabler(debug.Adapt(mux))
debug.MountPprofHandlers(debug.Adapt(mux))
```

---

{{< anchors "le-paquet-fictif" >}}
## Le package `mock`

Le package `mock` facilite l’écriture de doublures de test pour vos dépendances, avec gestion des séquences d’appels et des comportements permanents.

### Concepts

**Séquences :** Définissent les appels attendus dans l’ordre. Chaque appel à `Next()` renvoie la fonction suivante de la séquence.

**Mocks permanents :** Renvoient toujours la même fonction ; utilisés une fois les séquences épuisées ou lorsque l’ordre des appels n’a pas d’importance.

{{< anchors "création-dun-mock" >}}
### Créer un mock

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

{{< anchors "utilisation-des-mocks-dans-les-tests" >}}
### Utiliser les mocks dans les tests

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

Utilisez `Set()` pour les appels devant toujours produire le même comportement :

```go
userMock.SetGetUser(func(ctx context.Context, id string) (*User, error) {
    return &User{ID: id, Name: "Test User"}, nil
})
```

Les séquences sont prioritaires sur les mocks permanents : une fois la séquence consommée, `Next()` renvoie le mock permanent.

{{< anchors "générateur-de-mock-cmg" >}}
### Générateur de mocks (`cmg`)

Générez automatiquement les mocks à partir des interfaces Go :

```bash
go install goa.design/clue/mock/cmd/cmg@latest

# Generate mocks for all interfaces in a package
cmg gen ./services/...

# With testify assertions
cmg gen --testify ./services/...
```

Les mocks générés sont écrits dans un sous-répertoire `mocks/` à côté du fichier source.

---

{{< anchors "le-paquet-dintercepteurs" >}}
## Le package `interceptors`

Le package `interceptors` fournit des intercepteurs Goa capables de tracer individuellement chaque message dans les RPC en streaming. Contrairement à l’instrumentation OpenTelemetry standard (qui trace le flux dans son ensemble), ces intercepteurs propagent le contexte de trace dans chaque message.

{{< anchors "quand-utiliser" >}}
### Quand l’utiliser

Utilisez ces intercepteurs lorsque vous avez besoin de :
- Tracer individuellement chaque message sur des flux de longue durée
- Propager le contexte de trace du client au serveur à travers les messages du flux
- Mesurer la durée et la corrélation message par message

{{< anchors "configuration-de-la-conception" >}}
### Déclaration dans la conception Goa

Dans votre conception Goa, déclarez des intercepteurs dotés d’attributs `TraceMetadata` :

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

Appliquez-les à vos méthodes en streaming :

```go
Method("Chat", func() {
    StreamingPayload(ChatMessage)
    StreamingResult(ChatResponse)
    ClientInterceptor(TraceBidirectionalStream)
    ServerInterceptor(TraceBidirectionalStream)
})
```

{{< anchors "mise-en-œuvre" >}}
### Implémentation

Dans vos implémentations d’intercepteurs, déléguez aux fonctions fournies :

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

{{< anchors "extraction-du-contexte-de-la-trace-à-partir-des-messages-reçus" >}}
### Extraire le contexte de trace des messages reçus

Comme les interfaces de flux générées par Goa ne renvoient pas de contexte, utilisez les fonctions utilitaires fournies :

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

Ou utilisez l’enveloppe (*wrapper*) pour un code plus concis :

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

Un service Goa intégralement instrumenté :

```go
package main

import (
    "context"
    "net/http"
    "time"
    
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
    usersAddr := "localhost:8081"
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

{{< anchors "meilleures-pratiques" >}}
## Bonnes pratiques

### Journalisation

1. **Utilisez `Info()` pendant le traitement des requêtes et `Print()` pour le cycle de vie du processus.** Les journaux de requêtes doivent rester en tampon ; ceux de démarrage et d’arrêt doivent s’écrire immédiatement.

2. **Enrichissez le contexte tôt, journalisez tard.** Appelez `log.With()` pour attacher les identifiants et métadonnées dès qu’ils sont connus.

3. **Activez systématiquement la corrélation de traces.** Utilisez `log.WithFunc(log.Span)` afin de relier chaque ligne de journal à sa trace.

{{< anchors "contrôles-de-santé" >}}
### Sondes de santé

1. **Sondez les vraies dépendances.** Ne renvoyez pas un `200` inconditionnel : vérifiez les connexions aux bases de données et aux services aval.

2. **Configurez des délais d’expiration.** Une sonde de santé qui bloque indéfiniment est pire qu’une sonde qui échoue rapidement.

3. **Séparez vivacité et disponibilité.** Utilisez `/livez` pour vérifier que le processus répond et `/readyz` pour contrôler l’ensemble des dépendances.

### Débogage

1. **N’exposez jamais `pprof` publiquement.** Isolez-le sur un port interne dédié ou via une politique réseau.

2. **Préparez vos logs pour l’activation à chaud.** Structurez les messages afin que le mode debug éclaire le diagnostic sans noyer la sortie.

---

## Voir aussi

- [Guide de mise en production](../../1-goa/production/) — Modèles de déploiement en production
- [Dépôt GitHub Clue](https://github.com/goadesign/clue) — Code source et exemple `weather`
- [Documentation OpenTelemetry](https://opentelemetry.io/docs/) — Concepts OpenTelemetry
