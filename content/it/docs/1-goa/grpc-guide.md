---
title: Guida gRPC
weight: 5
description: "Complete guide to gRPC transport in Goa - service design, streaming patterns, error handling, and Protocol Buffer integration."
llm_optimized: true
aliases:
---

Goa fornisce un supporto completo per la creazione di servizi gRPC attraverso il suo DSL e la generazione di codice. Questa guida copre la progettazione dei servizi, i modelli di streaming, la gestione degli errori e l'implementazione.

## Panoramica

Il supporto gRPC di Goa include:

- **Generazione automatica del buffer di protocollo**: file `.proto` generati dal progetto
- **Sicurezza dei tipi**: Sicurezza dei tipi end-to-end dalla definizione all'implementazione
- **Generazione di codice**: Codice server e client generato automaticamente
- **Convalida integrata**: Richiesta di convalida basata sul progetto
- **Supporto allo streaming**: Tutti i modelli di streaming gRPC supportati
- **Gestione degli errori**: Gestione completa degli errori con mappatura dei codici di stato

### Mappatura dei tipi

| Tipo Goa | Tipo di buffer del protocollo |
|-----------|---------------------|
| Int | int32 |
| Int32 | int32 |
| Int64 | int64 |
| UInt | uint32 |
| UInt32 | uint32 |
| UInt64 | uint64 |
| Float32 | float |
| Float64 | double |
| Stringa | stringa |
| Boolean | bool |
| Bytes | bytes |
| ArrayOf | ripetuto |
| MapOf | map | map |

---

## Design del servizio

### Struttura di base del servizio

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

### Definizione del metodo

I metodi definiscono operazioni con impostazioni specifiche di gRPC:

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

### Tipi di messaggio

#### Numerazione dei campi

Utilizzare le migliori pratiche del buffer di protocollo:
- Numeri da 1 a 15: Campi frequenti (codifica a 1 byte)
- Numeri 16-2047: campi meno frequenti (codifica a 2 byte)

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

#### Gestione dei metadati

Invio di campi come metadati gRPC invece che come corpo del messaggio:

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

#### Intestazioni e trailer della risposta

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

## Modelli di flusso

> **Recapito della progettazione**: Lo streaming è definito a livello di progetto usando `StreamingPayload` e `StreamingResult`. Il DSL è indipendente dal trasporto: lo stesso progetto funziona sia per HTTP che per gRPC. Si veda [DSL Reference: Streaming] (dsl-reference/#streaming) per i modelli di progettazione. Questa sezione tratta l'implementazione dello streaming specifica per gRPC.

gRPC supporta tre modelli di streaming.

### Streaming lato server

Il server invia più risposte a una singola richiesta del client:

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

Implementazione del server:

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

### Streaming lato client

Il client invia più richieste, il server invia una singola risposta:

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

Implementazione del server:

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

### Flusso bidirezionale

Sia il client che il server inviano flussi simultaneamente:

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

Implementazione del server:

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

## Gestione degli errori

> **Ripresa della progettazione**: Gli errori sono definiti a livello di progetto usando il DSL `Error` a livello di API, servizio o metodo. Vedere [DSL Reference: Error Handling] (dsl-reference/#error-handling-design-level) per i modelli di progettazione. Questa sezione tratta la mappatura dei codici di stato specifici di gRPC.

### Codici di stato

Mappare gli errori ai codici di stato di gRPC:

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

Mappature comuni dei codici di stato:

| Errore Goa | Codice di stato gRPC | Caso d'uso |
|-----------|-----------------|-----------|
| `not_found` | `CodeNotFound` | La risorsa non esiste |
| `invalid_argument` | `CodeInvalidArgument` | Input non valido |
| `internal_error` | `CodeInternal` | Errore del server |
| `unauthenticated` | `CodeUnauthenticated` | Credenziali mancanti/invalide |
| `permission_denied` | `CodePermissionDenied` | Permessi insufficienti |

### Definizioni di errore

Definire gli errori a livello di servizio o di metodo:

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

### Errori di ritorno

Utilizzare i costruttori di errori generati:

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

## Implementazione

### Implementazione del server

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

### Implementazione del client

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

## Integrazione del buffer di protocollo

### Generazione automatica

Goa genera automaticamente i file `.proto` dal progetto:

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

### Configurazione del protocollare

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

## Vedi anche

- [DSL Reference: Streaming](dsl-reference/#streaming) - Modelli di streaming a livello di progettazione
- [DSL Reference: Error Handling](dsl-reference/#error-handling-design-level) - Definizioni di errore a livello di progettazione
- [Guida HTTP](http-guide/) - Caratteristiche del trasporto HTTP
- [Guida alla gestione degli errori](error-handling/) - Modelli completi di gestione degli errori
- [Documentazione Clue](../3-ecosystem/clue/) - Intercettori gRPC per l'osservabilità

---

## Migliori pratiche

### Gestione degli errori
- Utilizzare codici di stato gRPC appropriati
- Includere messaggi di errore significativi
- Gestire la cancellazione del contesto e i timeout

### Streaming
- Mantenere le dimensioni dei messaggi ragionevoli
- Implementare un adeguato controllo del flusso
- Impostare timeout appropriati
- Gestire EOF ed errori con grazia

### Prestazioni
- Utilizzare tipi di campo appropriati
- Considerare la dimensione del messaggio nella progettazione
- Utilizzare lo streaming per grandi insiemi di dati

### Versioni
- Pianificare la retrocompatibilità
- Usare i numeri di campo in modo strategico
- Considerare il versionamento dei pacchetti

### Gestione delle risorse
- Gestire correttamente le connessioni gRPC
- Implementare lo spegnimento graduale
- Pulire le risorse alla cancellazione del contesto
