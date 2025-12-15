---
title: gRPC Guide
weight: 5
description: "Complete guide to gRPC transport in Goa - service design, streaming patterns, error handling, and Protocol Buffer integration."
llm_optimized: true
aliases:
---

Goa fournit un support complet pour la construction de services gRPC grâce à son DSL et à la génération de code. Ce guide couvre la conception des services, les modèles de flux, la gestion des erreurs et la mise en œuvre.

## Aperçu

Le support gRPC de Goa inclut :

- **Génération automatique de tampons de protocole** : fichiers `.proto` générés à partir de votre conception
- **Sécurité de type** : Sécurité de type de bout en bout, de la définition à l'implémentation
- **Génération de code** : Le code du serveur et du client est généré automatiquement
- **Validation intégrée** : Demande de validation basée sur votre conception
- **Prise en charge de la diffusion en continu** : Prise en charge de tous les modèles de flux gRPC
- **Gestion des erreurs** : Gestion complète des erreurs avec correspondance des codes d'état

### Cartographie des types

| Type de Goa | Type de tampon de protocole
|-----------|---------------------|
int32 | int32 | int32 | int32 | int32 | int32 | int32
int32 | int32 | int32 | int32 | int32 | int32 | int32 | int32 | int32 | int32 | int32
int64 | Int64 | Int64 | Int64 | Int64 | Int64 | Int64 | Int64 | Int64 | Int64 | Int64
int64 | int64 | UInt | uint32 | UInt32 | uint32 | uint32 | UInt32 | uint32
| UInt32 | uint32 | | UInt64 | uint64 | | UInt32 | uint32
| UInt64 | uint64 | UInt32 | uint32 | UInt64 | uint64 | UInt32 | uint32
| Float32 | float | Float64 | double | Float64 | double
| Float32 | float | Float64 | double | double
| Chaîne de caractères | Chaîne de caractères | Chaîne de caractères | Chaîne de caractères | Chaîne de caractères | Chaîne de caractères | Chaîne de caractères
| booléen | bool | octets | octets | octets
| Octets | Octets | Octets | Octets | Octets
| Tableau de données - répété - répété
| MapOf | map

---

## Conception des services

### Structure de base du service

```go
var _ = Service("calculator", func() {
    Description("The Calculator service performs arithmetic operations")

    GRPC(func() {
        Metadata("package", "calculator.v1")
        Metadata("go.package", "calculatorpb")
    })

    Method("add", func() {
        Description("Add two numbers")
        
        Payload(func() {
            Field(1, "a", Int, "First operand")
            Field(2, "b", Int, "Second operand")
            Required("a", "b")
        })
        
        Result(func() {
            Field(1, "sum", Int, "Result of addition")
            Required("sum")
        })
    })
})
```

### Définition de la méthode

Les méthodes définissent des opérations avec des paramètres spécifiques à gRPC :

```go
Method("add", func() {
    Description("Add two numbers")

    Payload(func() {
        Field(1, "a", Int, "First operand")
        Field(2, "b", Int, "Second operand")
        Required("a", "b")
    })

    Result(func() {
        Field(1, "sum", Int, "Result of addition")
        Required("sum")
    })

    GRPC(func() {
        Response(CodeOK)
        Response("not_found", CodeNotFound)
        Response("invalid_argument", CodeInvalidArgument)
    })
})
```

### Types de messages

#### Numérotation des champs

Utiliser les meilleures pratiques de la mémoire tampon du protocole :
- Numéros 1 à 15 : Champs fréquents (codage sur 1 octet)
- Numéros 16 à 2047 : champs moins fréquents (codage sur 2 octets)

```go
Method("createUser", func() {
    Payload(func() {
        // Frequently used fields (1-byte encoding)
        Field(1, "id", String)
        Field(2, "name", String)
        Field(3, "email", String)

        // Less frequently used fields (2-byte encoding)
        Field(16, "preferences", func() {
            Field(1, "theme", String)
            Field(2, "language", String)
        })
    })
})
```

#### Traitement des métadonnées

Envoi des champs en tant que métadonnées gRPC au lieu du corps du message :

```go
var CreatePayload = Type("CreatePayload", func() {
    Field(1, "name", String, "Name of account")
    TokenField(2, "token", String, "JWT token")
    Field(3, "metadata", String, "Additional info")
})

Method("create", func() {
    Payload(CreatePayload)
    
    GRPC(func() {
        // Send token in metadata
        Metadata(func() {
            Attribute("token")
        })
        // Only include specific fields in message
        Message(func() {
            Attribute("name")
            Attribute("metadata")
        })
        Response(CodeOK)
    })
})
```

#### En-têtes de réponse et trailers

```go
Method("create", func() {
    Result(CreateResult)
    
    GRPC(func() {
        Response(func() {
            Code(CodeOK)
            Headers(func() {
                Attribute("id")
            })
            Trailers(func() {
                Attribute("status")
            })
        })
    })
})
```

---

## Modèles de flux

**Rappel de la conception** : La diffusion en continu est définie au niveau de la conception à l'aide de `StreamingPayload` et `StreamingResult`. Le DSL est agnostique en matière de transport - la même conception fonctionne pour HTTP et gRPC. Voir [DSL Reference : Streaming](dsl-reference/#streaming) pour les modèles de conception. Cette section couvre la mise en œuvre du streaming spécifique à gRPC.

gRPC prend en charge trois types de flux.

### Streaming côté serveur

Le serveur envoie plusieurs réponses à une seule demande du client :

```go
var _ = Service("monitor", func() {
    Method("watch", func() {
        Description("Stream system metrics")
        
        Payload(func() {
            Field(1, "interval", Int, "Sampling interval in seconds")
            Required("interval")
        })
        
        StreamingResult(func() {
            Field(1, "cpu", Float32, "CPU usage percentage")
            Field(2, "memory", Float32, "Memory usage percentage")
            Required("cpu", "memory")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

Mise en œuvre du serveur :

```go
func (s *monitorService) Watch(ctx context.Context, p *monitor.WatchPayload, stream monitor.WatchServerStream) error {
    ticker := time.NewTicker(time.Duration(p.Interval) * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            metrics := getSystemMetrics()
            if err := stream.Send(&monitor.WatchResult{
                CPU:    metrics.CPU,
                Memory: metrics.Memory,
            }); err != nil {
                return err
            }
        }
    }
}
```

### Streaming côté client

Le client envoie plusieurs demandes, le serveur envoie une seule réponse :

```go
var _ = Service("analytics", func() {
    Method("process", func() {
        Description("Process stream of analytics events")
        
        StreamingPayload(func() {
            Field(1, "event_type", String, "Type of event")
            Field(2, "timestamp", String, "Event timestamp")
            Field(3, "data", Bytes, "Event data")
            Required("event_type", "timestamp", "data")
        })
        
        Result(func() {
            Field(1, "processed_count", Int64, "Number of events processed")
            Required("processed_count")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

Mise en œuvre du serveur :

```go
func (s *analyticsService) Process(ctx context.Context, stream analytics.ProcessServerStream) error {
    var count int64
    
    for {
        event, err := stream.Recv()
        if err == io.EOF {
            return stream.SendAndClose(&analytics.ProcessResult{
                ProcessedCount: count,
            })
        }
        if err != nil {
            return err
        }
        
        if err := processEvent(event); err != nil {
            return err
        }
        count++
    }
}
```

### Flux bidirectionnel

Le client et le serveur envoient des flux simultanément :

```go
var _ = Service("chat", func() {
    Method("connect", func() {
        Description("Establish bidirectional chat connection")
        
        StreamingPayload(func() {
            Field(1, "message", String, "Chat message")
            Field(2, "user_id", String, "User identifier")
            Required("message", "user_id")
        })
        
        StreamingResult(func() {
            Field(1, "message", String, "Chat message")
            Field(2, "user_id", String, "User identifier")
            Field(3, "timestamp", String, "Message timestamp")
            Required("message", "user_id", "timestamp")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

Mise en œuvre du serveur :

```go
func (s *chatService) Connect(ctx context.Context, stream chat.ConnectServerStream) error {
    for {
        msg, err := stream.Recv()
        if err == io.EOF {
            return nil
        }
        if err != nil {
            return err
        }

        response := &chat.ConnectResult{
            Message:   msg.Message,
            UserID:    msg.UserID,
            Timestamp: time.Now().Format(time.RFC3339),
        }
        
        if err := stream.Send(response); err != nil {
            return err
        }
    }
}
```

---

## Gestion des erreurs

**Rappel de la conception** : Les erreurs sont définies au niveau de la conception à l'aide du DSL `Error` au niveau de l'API, du service ou de la méthode. Voir [DSL Reference : Error Handling](dsl-reference/#error-handling-design-level) pour les modèles de conception. Cette section couvre le mappage des codes d'état spécifiques à gRPC.

### Codes d'état

Mettez en correspondance les erreurs avec les codes d'état gRPC :

```go
Method("divide", func() {
    Error("division_by_zero")
    Error("invalid_input")

    GRPC(func() {
        Response(CodeOK)
        Response("division_by_zero", CodeInvalidArgument)
        Response("invalid_input", CodeInvalidArgument)
    })
})
```

Correspondance des codes d'état communs :

| Erreur Goa | Code d'état gRPC | Cas d'utilisation
|-----------|-----------------|-----------|
| `not_found` | `CodeNotFound` La ressource n'existe pas | `invalid_argument` `CodeNotFound` La ressource n'existe pas
| `invalid_argument` | `CodeInvalidArgument` | Entrée non valide
| `internal_error` | `CodeInternal` | Erreur de serveur |
| `unauthenticated` | `CodeUnauthenticated` | Erreur de serveur | `internal_error` `CodeInternal` | Erreur de serveur
| `permission_denied` | `CodePermissionDenied` | Permissions insuffisantes |

### Définitions des erreurs

Définir les erreurs au niveau du service ou de la méthode :

```go
var _ = Service("users", func() {
    // Service-level errors
    Error("not_found", func() {
        Description("User not found")
    })
    Error("invalid_input")

    Method("getUser", func() {
        // Method-specific error
        Error("profile_incomplete")

        GRPC(func() {
            Response(CodeOK)
            Response("not_found", CodeNotFound)
            Response("invalid_input", CodeInvalidArgument)
            Response("profile_incomplete", CodeFailedPrecondition)
        })
    })
})
```

### Renvoi des erreurs

Utilisez les constructeurs d'erreurs générés :

```go
func (s *users) CreateUser(ctx context.Context, p *users.CreateUserPayload) (*users.User, error) {
    exists, err := s.db.EmailExists(ctx, p.Email)
    if err != nil {
        return nil, users.MakeDatabaseError(fmt.Errorf("failed to check email: %w", err))
    }
    if exists {
        return nil, users.MakeDuplicateEmail(fmt.Sprintf("email %s is already registered", p.Email))
    }
    
    user, err := s.db.CreateUser(ctx, p)
    if err != nil {
        return nil, users.MakeDatabaseError(fmt.Errorf("failed to create user: %w", err))
    }
    
    return user, nil
}
```

---

## Mise en œuvre

### Mise en œuvre du serveur

```go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"

    "github.com/yourusername/calc"
    gencalc "github.com/yourusername/calc/gen/calc"
    genpb "github.com/yourusername/calc/gen/grpc/calc/pb"
    gengrpc "github.com/yourusername/calc/gen/grpc/calc/server"
)

func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    svr := grpc.NewServer()
    gensvr := gengrpc.New(endpoints, nil)
    genpb.RegisterCalcServer(svr, gensvr)
    
    lis, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatal(err)
    }
    
    log.Println("gRPC server listening on :8080")
    svr.Serve(lis)
}
```

### Implémentation du client

```go
package main

import (
    "context"
    "log"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    gencalc "github.com/yourusername/calc/gen/calc"
    genclient "github.com/yourusername/calc/gen/grpc/calc/client"
)

func main() {
    conn, err := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    grpcClient := genclient.NewClient(conn)
    client := gencalc.NewClient(
        grpcClient.Add(),
        grpcClient.Multiply(),
    )

    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("1 + 2 = %d", result)
}
```

---

## Intégration de la mémoire tampon du protocole

### Génération automatique

Goa génère automatiquement des fichiers `.proto` à partir de votre conception :

```protobuf
syntax = "proto3";
package calc;

service Calc {
    rpc Add (AddRequest) returns (AddResponse);
    rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
}

message AddRequest {
    int64 a = 1;
    int64 b = 2;
}

message AddResponse {
    int64 result = 1;
}
```

### Configuration du protocole

```go
var _ = Service("calculator", func() {
    GRPC(func() {
        Meta("protoc:path", "protoc")
        Meta("protoc:version", "v3")
        Meta("protoc:plugin", "grpc-gateway")
    })
})
```

---

---

## Voir aussi

- [Référence DSL : Streaming](dsl-reference/#streaming) - Modèles de streaming au niveau de la conception
- [Référence DSL : Traitement des erreurs](dsl-reference/#error-handling-design-level) - Définitions d'erreurs au niveau de la conception
- [Guide HTTP](http-guide/) - Caractéristiques du transport HTTP
- [Guide de gestion des erreurs](error-handling/) - Modèles complets de gestion des erreurs
- [Clue Documentation](../3-ecosystem/clue/) - Intercepteurs gRPC pour l'observabilité

---

## Meilleures pratiques

### Gestion des erreurs
- Utiliser les codes d'état gRPC appropriés
- Inclure des messages d'erreur significatifs
- Gérer l'annulation du contexte et les délais d'attente

### Streaming
- Veiller à ce que la taille des messages reste raisonnable
- Mettre en œuvre un contrôle de flux approprié
- Définir des délais d'attente appropriés
- Gérer les EOF et les erreurs avec élégance

### Performance
- Utiliser des types de champs appropriés
- Tenir compte de la taille des messages lors de la conception
- Utiliser la diffusion en continu pour les grands ensembles de données

### Versionnement
- Prévoir une compatibilité ascendante
- Utiliser les numéros de champ de manière stratégique
- Envisager le versionnement des paquets

### Gestion des ressources
- Gérer correctement les connexions gRPC
- Mise en œuvre de l'arrêt progressif (graceful shutdown)
- Nettoyer les ressources lors de l'annulation du contexte
