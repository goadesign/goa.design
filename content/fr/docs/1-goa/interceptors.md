---
title: Intercepteurs
weight: 7
description: "Complete guide to interceptors and middleware in Goa - type-safe Goa interceptors, HTTP middleware, and gRPC interceptors."
llm_optimized: true
aliases:
---

Goa fournit une solution complète pour le traitement des requêtes qui combine des intercepteurs à sécurité de type avec des modèles d'intergiciels traditionnels. Ce guide couvre les trois approches.

## Vue d'ensemble

Lorsque vous traitez des requêtes dans un service Goa, vous disposez de trois outils complémentaires :

1. **Intercepteurs Goa** : Accès aux types du domaine de votre service, sécurisé et vérifié à la compilation
2. **Middleware HTTP** : Modèle standard `http.Handler` pour les problèmes spécifiques à HTTP
3. **Intercepteurs gRPC** : Modèles gRPC standard pour les besoins spécifiques à RPC

### Quand utiliser chacun

| Préoccupation | Outil |
|---------|------|
| Validation de logique métier | Intercepteurs Goa |
| Transformation de données | Intercepteurs Goa |
| Enrichissement requête/réponse | Intercepteurs Goa |
| Journalisation, traçage | Middleware HTTP/gRPC |
| Compression, CORS | Middleware HTTP |
| Gestion des métadonnées | Intercepteurs gRPC |
| Limitation de débit | Middleware HTTP/gRPC |

---

## Intercepteurs Goa

Les intercepteurs Goa fournissent un accès sécurisé aux types du domaine de votre service, avec des vérifications à la compilation et des méthodes d'aide générées.

### Modèle d'exécution (code généré)

Les intercepteurs ne sont pas des « hooks magiques » du runtime. Dans Goa, ce sont des **wrappers d'endpoints générés**. Le DSL décrit quels champs un interceptor peut lire/écrire, et la génération produit :

- **Contrat côté service** dans `gen/<service>/service_interceptors.go`
  - interface `ServerInterceptors` : une méthode par intercepteur
  - structs `*<Interceptor>Info` : métadonnées service/méthode + accesseurs
  - interfaces d'accès `*Payload` / `*Result` : uniquement les champs déclarés en lecture/écriture
- **Contrat côté client** dans `gen/<service>/client_interceptors.go`
  - interface `ClientInterceptors` et ses types `*Info` + accesseurs
- **Chaîne de wrappers** dans `gen/<service>/interceptor_wrappers.go`
  - `Wrap<Method>Endpoint` et `Wrap<Method>ClientEndpoint` par méthode
  - pour le streaming, wrappers de stream qui interceptent `SendWithContext` / `RecvWithContext`
- **Câblage** dans `gen/<service>/endpoints.go` et `gen/<service>/client.go`
  - `NewEndpoints` applique les wrappers côté serveur autour des endpoints du service
  - `NewClient` applique les wrappers côté client autour des endpoints de transport

Conséquence importante : **les intercepteurs serveur s’exécutent après le décodage transport et avant la méthode du service**, et **les intercepteurs client s’exécutent avant l’encodage transport et après le décodage de la réponse** (car ils enveloppent la même abstraction d’endpoint typé appelée par votre code client).

### Contrat de l'intercepteur serveur

Goa génère une interface par service. Chaque méthode d’intercepteur doit appeler `next` exactement une fois pour continuer (ou retourner une erreur/réponse plus tôt) :

```go
type ServerInterceptors interface {
    RequestAudit(ctx context.Context, info *RequestAuditInfo, next goa.Endpoint) (any, error)
}
```

À l’exécution, vous :

1. Utilisez `info.Payload()` / `info.Result(res)` pour un accès **type-safe** (recommandé).
2. Utilisez `info.Service()`, `info.Method()`, et `info.CallType()` pour taguer logs/métriques avec des identifiants stables.
3. Appelez `next(ctx, info.RawPayload())` pour continuer la chaîne.
4. Optionnellement, modifiez le payload avant `next`, ou le résultat après.

Exemple (enrichissement du résultat + timing) :

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

Pourquoi les interfaces d’accès comptent :

- Si vous déclarez `ReadPayload(Attribute("recordID"))`, Goa génère `RecordID() <type>`.
- Si vous déclarez `WriteResult(Attribute("cachedAt"))`, Goa génère `SetCachedAt(<type>)`.
- L’intercepteur ne peut pas accéder à des champs non déclarés : c’est le contrat à la compilation.

### Contrat de l'intercepteur client

Les intercepteurs client suivent le même principe : ils enveloppent l’endpoint de transport que vous passez à `gen/<service>.NewClient(...)`.

En pratique :

- `info.RawPayload()` est le **payload typé de la méthode** (par ex. `*GetPayload`), pas un `*http.Request`.
- Si vous « écrivez » dans le payload côté intercepteur, l’endpoint de transport encodera ces changements (headers/body/etc.) selon vos mappings.
- Vous pouvez utiliser `info.Result(res)` pour lire/écrire des champs après décodage de la réponse.

### Ordre (ce qui s'exécute réellement en premier)

Les intercepteurs sont appliqués via une chaîne de wrappers. Le `Wrap<Method>Endpoint` généré est la source de vérité pour l’ordre.

Conceptuellement, la génération fait ceci :

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

Chaque `wrap...` retourne un nouvel endpoint qui appelle l’intercepteur avec `next` pointant vers l’endpoint précédent. Donc :

- **Aller (requête)** : le **dernier** wrapper s’exécute en premier.
- **Retour (réponse)** : le **premier** wrapper s’exécute en premier.

Si l’ordre est important, utilisez ce modèle mental plutôt qu’une règle générique : **lisez le wrap généré de la méthode**.

### Intercepteurs de streaming (Send/Recv)

En streaming bidirectionnel, la génération enveloppe le stream pour intercepter chaque envoi/réception. Un même intercepteur peut être invoqué selon plusieurs types d’appel :

- `goa.InterceptorUnary` : interception unique de l’appel de l’endpoint de stream
- `goa.InterceptorStreamingSend` : interception de chaque `SendWithContext`
- `goa.InterceptorStreamingRecv` : interception de chaque `RecvWithContext`

Utilisez `info.CallType()` si nécessaire. En send, `info.RawPayload()` est le message. En recv, le « payload » est produit par `next` (votre intercepteur le voit comme valeur de retour).

### Définition des intercepteurs

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

### Application des intercepteurs

Appliquer au niveau du service ou de la méthode :

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

### Implémentation des intercepteurs

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

### Modèles d'accès

#### Accès en lecture seule

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

#### Accès en écriture

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

#### Accès combiné

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

### Intercepteurs côté client

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

### Intercepteurs de flux

Pour les méthodes de diffusion en continu, utilisez les variantes de diffusion en continu :

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

### Ordre d'exécution

Goa applique les intercepteurs en construisant une chaîne de wrappers autour de l’endpoint de chaque méthode. Le moyen le plus simple de comprendre l’ordre exact (surtout lorsque vous mélangez intercepteurs au niveau du service et de la méthode) est de regarder le `Wrap<Method>Endpoint` généré et de se souvenir que :

- **Le dernier wrapper s’exécute en premier** sur le chemin de la requête.
- **Le premier wrapper s’exécute en premier** sur le chemin de la réponse.

Si vous avez besoin d’un contrat stable, traitez le wrap généré comme la spécification canonique de l’ordre pour cette méthode.

---

## Logiciel médiateur HTTP

L'intergiciel HTTP gère les problèmes au niveau du protocole en utilisant le modèle standard `http.Handler`.

### Pile d'intergiciels courants

```go
mux := goahttp.NewMuxer()

// Add middleware (outermost to innermost)
mux.Use(debug.HTTP())                               // Debug logging
mux.Use(otelhttp.NewMiddleware("service"))          // OpenTelemetry
mux.Use(log.HTTP(ctx))                              // Request logging
mux.Use(goahttpmiddleware.RequestID())              // Request ID
mux.Use(goahttpmiddleware.PopulateRequestContext()) // Goa context
```

### Création d'un intergiciel personnalisé

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

### Middleware pour les en-têtes de sécurité

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

### Middleware d'enrichissement du contexte

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

### Middleware de gestion des erreurs

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

## Intercepteurs gRPC

les intercepteurs gRPC gèrent les problèmes liés au protocole pour les appels RPC.

### Intercepteurs unaires

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

### Intercepteurs de flux

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

### Intégration avec Goa

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

## Combinaison des trois

Voici comment les trois approches fonctionnent ensemble :

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

### Flux d'exécution

```
Request Processing:
─────────────────────────────────────────────────────────────────>
HTTP/gRPC Middleware → Goa Interceptors → Service Method

Response Processing:
<─────────────────────────────────────────────────────────────────
Service Method → Goa Interceptors → HTTP/gRPC Middleware
```

---

## Meilleures pratiques

### Intercepteurs Goa
- Utiliser pour la validation de la logique d'entreprise et la transformation des données
- Garder les intercepteurs concentrés sur des responsabilités uniques
- Utiliser des modèles d'accès sûrs

### Logiciel intermédiaire HTTP
- Ordonner soigneusement les intergiciels (récupération de panique d'abord, puis journalisation, etc.)
- Pré-compiler les objets coûteux (regex, etc.)
- Utiliser sync.Pool pour les objets fréquemment alloués

### Intercepteurs gRPC
- Se concentrer sur les problèmes au niveau du protocole
- Gérer correctement l'annulation du contexte
- Utiliser les codes d'état appropriés

### Général
- Tester les intercepteurs/médiateurs de manière isolée
- Tenir compte de l'impact sur les performances
- Documenter l'objectif de chaque intercepteur

---

## Voir aussi

- [Référence DSL](dsl-reference/) - Définitions DSL de l'intercepteur
- [HTTP Guide](http-guide/) - Modèles d'intergiciels spécifiques à HTTP
- [Guide gRPC](grpc-guide/) - Modèles d'intercepteurs gRPC
- [Clue Documentation](../3-ecosystem/clue/) - Intercepteurs et middleware d'observabilité
