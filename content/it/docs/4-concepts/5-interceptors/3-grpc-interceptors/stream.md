---
title: Interceptor di Streaming
weight: 3
description: >
  Impara come implementare interceptor gRPC per gestire chiamate RPC di streaming, inclusi il controllo del flusso, la gestione della connessione e il recupero dagli errori.
---

Gli interceptor di streaming in gRPC gestiscono le chiamate RPC che coinvolgono flussi di dati, sia unidirezionali che bidirezionali. Questi interceptor sono essenziali per implementare funzionalità trasversali per le comunicazioni streaming.

## Struttura Base

Un interceptor di streaming segue questa struttura base:

```go
func StreamInterceptor(srv interface{}, ss grpc.ServerStream,
    info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
    // Pre-processing
    // Configura lo stream o i metadati
    
    // Avvolgi lo stream per intercettare le chiamate
    wrappedStream := &wrappedServerStream{ServerStream: ss}
    
    // Gestisci lo stream
    err := handler(srv, wrappedStream)
    
    // Post-processing
    // Gestisci gli errori o pulisci le risorse
    
    return err
}

type wrappedServerStream struct {
    grpc.ServerStream
}

func (w *wrappedServerStream) RecvMsg(m interface{}) error {
    // Intercetta la ricezione dei messaggi
    return w.ServerStream.RecvMsg(m)
}

func (w *wrappedServerStream) SendMsg(m interface{}) error {
    // Intercetta l'invio dei messaggi
    return w.ServerStream.SendMsg(m)
}
```

## Esempi Pratici

### 1. Interceptor di Logging per Stream

```go
func StreamLoggingInterceptor(logger *log.Logger) grpc.StreamServerInterceptor {
    return func(srv interface{}, ss grpc.ServerStream,
        info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        // Registra l'inizio dello stream
        start := time.Now()
        method := info.FullMethod
        logger.Printf("Stream iniziato: metodo=%s", method)
        
        // Crea uno stream wrappato per il logging
        wrapped := &loggingServerStream{
            ServerStream: ss,
            logger:      logger,
            method:      method,
        }
        
        // Gestisci lo stream
        err := handler(srv, wrapped)
        
        // Registra la fine dello stream
        duration := time.Since(start)
        if err != nil {
            logger.Printf("Stream terminato con errore: metodo=%s durata=%v err=%v",
                method, duration, err)
        } else {
            logger.Printf("Stream completato: metodo=%s durata=%v",
                method, duration)
        }
        
        return err
    }
}

type loggingServerStream struct {
    grpc.ServerStream
    logger *log.Logger
    method string
}

func (s *loggingServerStream) RecvMsg(m interface{}) error {
    err := s.ServerStream.RecvMsg(m)
    if err != nil {
        if err != io.EOF {
            s.logger.Printf("Errore nella ricezione: metodo=%s err=%v", s.method, err)
        }
        return err
    }
    s.logger.Printf("Messaggio ricevuto: metodo=%s msg=%v", s.method, m)
    return nil
}

func (s *loggingServerStream) SendMsg(m interface{}) error {
    err := s.ServerStream.SendMsg(m)
    if err != nil {
        s.logger.Printf("Errore nell'invio: metodo=%s err=%v", s.method, err)
        return err
    }
    s.logger.Printf("Messaggio inviato: metodo=%s msg=%v", s.method, m)
    return nil
}
```

### 2. Interceptor di Rate Limiting per Stream

```go
func StreamRateLimitInterceptor(messagesPerSecond int) grpc.StreamServerInterceptor {
    limiter := rate.NewLimiter(rate.Limit(messagesPerSecond), messagesPerSecond)
    
    return func(srv interface{}, ss grpc.ServerStream,
        info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        wrapped := &rateLimitedServerStream{
            ServerStream: ss,
            limiter:     limiter,
        }
        return handler(srv, wrapped)
    }
}

type rateLimitedServerStream struct {
    grpc.ServerStream
    limiter *rate.Limiter
}

func (s *rateLimitedServerStream) RecvMsg(m interface{}) error {
    if !s.limiter.Allow() {
        return status.Error(codes.ResourceExhausted,
            "limite di velocità superato")
    }
    return s.ServerStream.RecvMsg(m)
}

func (s *rateLimitedServerStream) SendMsg(m interface{}) error {
    if !s.limiter.Allow() {
        return status.Error(codes.ResourceExhausted,
            "limite di velocità superato")
    }
    return s.ServerStream.SendMsg(m)
}
```

### 3. Interceptor di Validazione per Stream

```go
type StreamValidator interface {
    ValidateStream() error
}

func StreamValidationInterceptor() grpc.StreamServerInterceptor {
    return func(srv interface{}, ss grpc.ServerStream,
        info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        wrapped := &validatingServerStream{
            ServerStream: ss,
        }
        return handler(srv, wrapped)
    }
}

type validatingServerStream struct {
    grpc.ServerStream
}

func (s *validatingServerStream) RecvMsg(m interface{}) error {
    if err := s.ServerStream.RecvMsg(m); err != nil {
        return err
    }
    
    if v, ok := m.(StreamValidator); ok {
        if err := v.ValidateStream(); err != nil {
            return status.Error(codes.InvalidArgument,
                fmt.Sprintf("validazione fallita: %v", err))
        }
    }
    
    return nil
}
```

### 4. Interceptor di Monitoraggio per Stream

```go
type StreamMetrics struct {
    activeStreams   *atomic.Int64
    messagesReceived *atomic.Int64
    messagesSent    *atomic.Int64
}

func NewStreamMetrics() *StreamMetrics {
    return &StreamMetrics{
        activeStreams:    atomic.NewInt64(0),
        messagesReceived: atomic.NewInt64(0),
        messagesSent:     atomic.NewInt64(0),
    }
}

func StreamMetricsInterceptor(metrics *StreamMetrics) grpc.StreamServerInterceptor {
    return func(srv interface{}, ss grpc.ServerStream,
        info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        // Incrementa il contatore degli stream attivi
        metrics.activeStreams.Add(1)
        defer metrics.activeStreams.Add(-1)
        
        wrapped := &metricServerStream{
            ServerStream: ss,
            metrics:     metrics,
        }
        
        return handler(srv, wrapped)
    }
}

type metricServerStream struct {
    grpc.ServerStream
    metrics *StreamMetrics
}

func (s *metricServerStream) RecvMsg(m interface{}) error {
    err := s.ServerStream.RecvMsg(m)
    if err == nil {
        s.metrics.messagesReceived.Add(1)
    }
    return err
}

func (s *metricServerStream) SendMsg(m interface{}) error {
    err := s.ServerStream.SendMsg(m)
    if err == nil {
        s.metrics.messagesSent.Add(1)
    }
    return err
}
```

## Gestione degli Errori

Gli interceptor di streaming devono gestire gli errori in modo robusto:

```go
func StreamErrorHandlingInterceptor(logger *log.Logger) grpc.StreamServerInterceptor {
    return func(srv interface{}, ss grpc.ServerStream,
        info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
        wrapped := &errorHandlingServerStream{
            ServerStream: ss,
            logger:      logger,
            method:      info.FullMethod,
        }
        
        // Gestisci i panic
        defer func() {
            if r := recover(); r != nil {
                logger.Printf("Panic recuperato in %s: %v\n%s",
                    info.FullMethod, r, debug.Stack())
                // Termina lo stream con un errore
                ss.Context().Done()
            }
        }()
        
        return handler(srv, wrapped)
    }
}

type errorHandlingServerStream struct {
    grpc.ServerStream
    logger *log.Logger
    method string
}

func (s *errorHandlingServerStream) RecvMsg(m interface{}) error {
    err := s.ServerStream.RecvMsg(m)
    if err != nil && err != io.EOF {
        s.logger.Printf("Errore nella ricezione dello stream %s: %v",
            s.method, err)
    }
    return err
}

func (s *errorHandlingServerStream) SendMsg(m interface{}) error {
    err := s.ServerStream.SendMsg(m)
    if err != nil {
        s.logger.Printf("Errore nell'invio dello stream %s: %v",
            s.method, err)
    }
    return err
}
```

## Combinazione degli Interceptor

Esempio di come combinare diversi interceptor di streaming:

```go
func main() {
    // Inizializza i componenti
    logger := log.New(os.Stdout, "", log.LstdFlags)
    metrics := NewStreamMetrics()
    
    // Crea gli interceptor
    logging := StreamLoggingInterceptor(logger)
    rateLimit := StreamRateLimitInterceptor(100)
    validation := StreamValidationInterceptor()
    monitoring := StreamMetricsInterceptor(metrics)
    errorHandling := StreamErrorHandlingInterceptor(logger)
    
    // Crea il server gRPC con gli interceptor concatenati
    server := grpc.NewServer(
        grpc.ChainStreamInterceptor(
            logging,
            rateLimit,
            validation,
            monitoring,
            errorHandling,
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

{{< alert title="Sviluppo di Interceptor di Streaming" color="primary" >}}
**Design**
- Gestisci correttamente le risorse
- Implementa il controllo del flusso
- Considera la latenza e il throughput
- Documenta il comportamento

**Implementazione**
- Usa buffer appropriati
- Gestisci la concorrenza
- Implementa il cleanup
- Monitora le prestazioni

**Considerazioni Generali**
- Testa gli scenari di errore
- Gestisci i timeout
- Monitora l'utilizzo delle risorse
- Mantieni la compatibilità
{{< /alert >}}

## Conclusione

Gli interceptor di streaming sono essenziali per:
- Gestire flussi di dati complessi
- Implementare controllo del flusso
- Monitorare le prestazioni
- Garantire l'affidabilità

Quando sviluppi interceptor di streaming:
- Gestisci le risorse con attenzione
- Implementa il controllo degli errori
- Monitora le prestazioni
- Testa tutti gli scenari 