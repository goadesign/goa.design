---
title: Interceptor Unari
weight: 3
description: >
  Impara come implementare interceptor gRPC per gestire chiamate RPC unarie, inclusi logging, validazione e gestione degli errori.
---

Gli interceptor unari in gRPC gestiscono le chiamate RPC singole, dove il client invia una singola richiesta e riceve una singola risposta. Questi interceptor sono fondamentali per implementare funzionalità trasversali per le chiamate RPC tradizionali.

## Struttura Base

Un interceptor unario segue questa struttura base:

```go
func UnaryInterceptor(ctx context.Context, req interface{},
    info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    // Pre-processing
    // Modifica la richiesta o i metadati
    
    resp, err := handler(ctx, req)
    
    // Post-processing
    // Modifica la risposta o gestisci gli errori
    
    return resp, err
}
```

## Esempi Pratici

### 1. Interceptor di Logging

```go
func LoggingInterceptor(logger *log.Logger) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{},
        info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        // Registra i dettagli della richiesta
        start := time.Now()
        method := info.FullMethod
        logger.Printf("Richiesta ricevuta: metodo=%s", method)
        
        // Aggiungi ID di tracciamento
        requestID := uuid.New().String()
        ctx = metadata.AppendToOutgoingContext(ctx, "request-id", requestID)
        
        // Gestisci la richiesta
        resp, err := handler(ctx, req)
        
        // Registra il risultato
        duration := time.Since(start)
        if err != nil {
            logger.Printf("Errore: metodo=%s durata=%v err=%v", method, duration, err)
        } else {
            logger.Printf("Successo: metodo=%s durata=%v", method, duration)
        }
        
        return resp, err
    }
}
```

### 2. Interceptor di Validazione

```go
type Validator interface {
    Validate() error
}

func ValidationInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{},
        info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        // Verifica se la richiesta implementa l'interfaccia Validator
        if v, ok := req.(Validator); ok {
            if err := v.Validate(); err != nil {
                return nil, status.Error(codes.InvalidArgument,
                    fmt.Sprintf("validazione fallita: %v", err))
            }
        }
        
        return handler(ctx, req)
    }
}
```

### 3. Interceptor di Autenticazione

```go
func AuthInterceptor(authClient *AuthClient) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{},
        info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        // Estrai il token dai metadati
        md, ok := metadata.FromIncomingContext(ctx)
        if !ok {
            return nil, status.Error(codes.Unauthenticated, "metadati mancanti")
        }
        
        tokens := md.Get("authorization")
        if len(tokens) == 0 {
            return nil, status.Error(codes.Unauthenticated, "token mancante")
        }
        
        // Verifica il token
        token := strings.TrimPrefix(tokens[0], "Bearer ")
        user, err := authClient.ValidateToken(ctx, token)
        if err != nil {
            return nil, status.Error(codes.Unauthenticated,
                fmt.Sprintf("token non valido: %v", err))
        }
        
        // Aggiungi l'utente al contesto
        ctx = context.WithValue(ctx, "user", user)
        
        return handler(ctx, req)
    }
}
```

### 4. Interceptor di Rate Limiting

```go
func RateLimitInterceptor(limit rate.Limit, burst int) grpc.UnaryServerInterceptor {
    limiter := rate.NewLimiter(limit, burst)
    
    return func(ctx context.Context, req interface{},
        info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        if !limiter.Allow() {
            return nil, status.Error(codes.ResourceExhausted,
                "limite di velocità superato")
        }
        
        return handler(ctx, req)
    }
}
```

## Gestione degli Errori

Gli interceptor unari devono gestire gli errori in modo appropriato:

```go
func ErrorHandlingInterceptor(logger *log.Logger) grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{},
        info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        resp, err := handler(ctx, req)
        if err != nil {
            // Registra l'errore
            logger.Printf("Errore in %s: %v", info.FullMethod, err)
            
            // Converti errori interni in errori gRPC appropriati
            if _, ok := status.FromError(err); !ok {
                err = status.Error(codes.Internal,
                    "errore interno del server")
            }
        }
        return resp, err
    }
}
```

## Gestione dei Metadati

Gli interceptor possono manipolare i metadati della chiamata:

```go
func MetadataInterceptor() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{},
        info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
        // Estrai i metadati in arrivo
        md, ok := metadata.FromIncomingContext(ctx)
        if ok {
            // Aggiungi nuovi metadati
            newMD := metadata.Pairs(
                "timestamp", time.Now().Format(time.RFC3339),
                "method", info.FullMethod,
            )
            md = metadata.Join(md, newMD)
            
            // Crea un nuovo contesto con i metadati aggiornati
            ctx = metadata.NewIncomingContext(ctx, md)
        }
        
        return handler(ctx, req)
    }
}
```

## Combinazione degli Interceptor

Esempio di come combinare diversi interceptor unari:

```go
func main() {
    // Inizializza i componenti
    logger := log.New(os.Stdout, "", log.LstdFlags)
    authClient := NewAuthClient()
    
    // Crea gli interceptor
    logging := LoggingInterceptor(logger)
    validation := ValidationInterceptor()
    auth := AuthInterceptor(authClient)
    rateLimit := RateLimitInterceptor(100, 10)
    errorHandling := ErrorHandlingInterceptor(logger)
    metadata := MetadataInterceptor()
    
    // Crea il server gRPC con gli interceptor concatenati
    server := grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            logging,
            validation,
            auth,
            rateLimit,
            errorHandling,
            metadata,
        ),
    )
    
    // Registra i servizi
    pb.RegisterYourServiceServer(server, &YourService{})
    
    // Avvia il server
    lis, _ := net.Listen("tcp", ":50051")
    server.Serve(lis)
}
```

## Migliori Pratiche

{{< alert title="Sviluppo di Interceptor Unari" color="primary" >}}
**Design**
- Mantieni gli interceptor focalizzati
- Gestisci correttamente i timeout
- Implementa il recupero dagli errori
- Documenta il comportamento

**Implementazione**
- Usa i codici di stato gRPC appropriati
- Gestisci i metadati in modo coerente
- Implementa il logging strutturato
- Mantieni le prestazioni

**Considerazioni Generali**
- Segui le convenzioni gRPC
- Testa tutti gli scenari di errore
- Monitora le prestazioni
- Mantieni la compatibilità
{{< /alert >}}

## Conclusione

Gli interceptor unari sono fondamentali per:
- Implementare funzionalità trasversali
- Gestire gli errori in modo coerente
- Mantenere il codice pulito e modulare
- Garantire la sicurezza e l'affidabilità

Quando sviluppi interceptor unari:
- Segui le migliori pratiche
- Mantieni il codice testabile
- Documenta il comportamento
- Considera le prestazioni 