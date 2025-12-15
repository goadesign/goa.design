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

| Outil d'aide à la gestion de l'information
|---------|------|
| Validation de la logique d'affaire - Goa Interceptors
| Transformation des données - Goa Interceptors - Enrichissement des requêtes/réponses - Goa Interceptors - Enjeux
enrichissement des requêtes/réponses | Goa Interceptors | Enrichissement des requêtes/réponses | Goa Interceptors | Enrichissement des requêtes/réponses
| Logging, tracing | Middleware HTTP/gRPC | Compression, CORS | HTTP/gRPC Middleware
| Compression, CORS | Middleware HTTP / gRPC
gestion des métadonnées | Intercepteurs gRPC | Intercepteurs gRPC | Intercepteurs gRPC | Intercepteurs gRPC | Intercepteurs gRPC
intercepteurs gRPC | Limitation de débit | Middleware HTTP/gRPC | Gestion des métadonnées | Intercepteurs gRPC | Limitation de débit

---

## Intercepteurs Goa

Les intercepteurs Goa fournissent un accès sécurisé aux types du domaine de votre service, avec des vérifications à la compilation et des méthodes d'aide générées.

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
func (i *ServerInterceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
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

1. Intercepteurs au niveau du service (dans l'ordre de déclaration)
2. Intercepteurs au niveau de la méthode (dans l'ordre de déclaration)
3. Le point final proprement dit
4. Intercepteurs au niveau de la méthode (ordre inverse)
5. Intercepteurs au niveau du service (ordre inverse)

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
