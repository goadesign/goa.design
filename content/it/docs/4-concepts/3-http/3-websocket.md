---
title: "Integrazione WebSocket"
linkTitle: "Integrazione WebSocket"
weight: 3
description: "Impara ad aggiungere il supporto WebSocket ai tuoi servizi, inclusa la gestione delle connessioni, i formati dei messaggi, la gestione degli errori e le implementazioni client."
---

L'integrazione WebSocket in Goa permette ai tuoi servizi di gestire comunicazioni
bidirezionali in tempo reale. Questa sezione copre come implementare e gestire
connessioni WebSocket nei tuoi servizi Goa.

{{< alert title="Vedi anche" color="info" >}}
Per una panoramica delle opzioni di trasporto e delle combinazioni di streaming valide (HTTP, JSON‑RPC, gRPC), vedi
[Trasporti](../../6-trasporti).
{{< /alert >}}

## Panoramica

WebSocket è un protocollo che fornisce comunicazione full-duplex su una singola
connessione TCP. In Goa, il supporto WebSocket è implementato attraverso il DSL
di streaming e viene utilizzato principalmente per:

- Aggiornamenti in tempo reale
- Notifiche push
- Monitoraggio di dati live
- Chat e messaggistica
- Streaming di dati

## Design del WebSocket

### Definizione del Servizio

Per creare un endpoint WebSocket, usa il DSL di streaming di Goa:

```go
var _ = Service("logger", func() {
    Method("monitor", func() {
        // Payload per l'inizializzazione della connessione
        Payload(func() {
            Field(1, "topic", String, "Argomento da monitorare")
            Field(2, "api_key", String, "Chiave API per l'autenticazione")
            Required("topic", "api_key")
        })

        // Stream bidirezionale
        StreamingPayload(LogFilter)   // Filtri dal client
        StreamingResult(LogEntry)     // Log entries al client

        HTTP(func() {
            GET("/logs/{topic}/monitor")
            Param("api_key")
            Response(StatusOK)
        })
    })
})
```

### Tipi di Streaming

Goa supporta tre pattern di streaming WebSocket:

1. **Streaming Server-Side**
   - Il server invia un flusso di dati al client
   - Utile per feed di dati in tempo reale
   - Il client invia una singola richiesta iniziale

2. **Streaming Client-Side**
   - Il client invia un flusso di dati al server
   - Utile per upload di dati o aggiornamenti continui
   - Il server elabora il flusso e può inviare una risposta finale

3. **Streaming Bidirezionale**
   - Sia client che server possono inviare dati
   - Utile per chat o interazioni in tempo reale
   - Permette comunicazione full-duplex

## Implementazione

### Lato Server

L'implementazione del server gestisce sia l'inizializzazione della connessione che
lo streaming dei dati:

```go
func (s *loggerSvc) Monitor(ctx context.Context, p *logger.MonitorPayload, stream logger.MonitorServerStream) error {
    // Validazione iniziale
    if err := validateAPIKey(p.APIKey); err != nil {
        return err
    }

    // Gestione del flusso bidirezionale
    for {
        // Ricevi filtri dal client
        filter, err := stream.Recv()
        if err == io.EOF {
            return nil
        }
        if err != nil {
            return fmt.Errorf("errore nella ricezione del filtro: %w", err)
        }

        // Applica i filtri e invia i log corrispondenti
        logs := s.filterLogs(p.Topic, filter)
        for _, log := range logs {
            if err := stream.Send(log); err != nil {
                return fmt.Errorf("errore nell'invio del log: %w", err)
            }
        }
    }
}
```

### Lato Client

Il client deve gestire sia l'invio che la ricezione dei dati:

```go
func monitorLogs(client logger.Client) error {
    stream, err := client.Monitor(context.Background(), &logger.MonitorPayload{
        Topic:  "database",
        APIKey: "your-api-key",
    })
    if err != nil {
        return fmt.Errorf("errore nell'inizializzazione dello stream: %w", err)
    }
    defer stream.Close()

    // Goroutine per la ricezione dei log
    go func() {
        for {
            log, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                log.Printf("errore nella ricezione: %v", err)
                return
            }
            processLog(log)
        }
    }()

    // Invio di filtri
    for {
        filter := createFilter()
        if err := stream.Send(filter); err != nil {
            return fmt.Errorf("errore nell'invio del filtro: %w", err)
        }
        time.Sleep(time.Second * 30) // Aggiorna i filtri ogni 30 secondi
    }
}
```

## Gestione degli Errori

La gestione degli errori è cruciale per le connessioni WebSocket:

1. **Errori di Connessione**
   - Gestisci disconnessioni improvvise
   - Implementa la riconnessione automatica
   - Mantieni lo stato della sessione

2. **Errori di Validazione**
   - Valida i dati prima dell'invio
   - Gestisci errori di formato
   - Fornisci feedback significativo

3. **Errori di Timeout**
   - Implementa heartbeat per connessioni lunghe
   - Gestisci timeout di lettura/scrittura
   - Chiudi connessioni inattive

## Migliori Pratiche

{{< alert title="Linee Guida WebSocket" color="primary" >}}
1. **Gestione delle Risorse**
   - Chiudi sempre le connessioni quando non servono più
   - Implementa limiti di rate e concorrenza
   - Monitora l'utilizzo della memoria

2. **Sicurezza**
   - Valida sempre l'autenticazione iniziale
   - Proteggi contro attacchi di flooding
   - Implementa timeout appropriati

3. **Affidabilità**
   - Implementa la riconnessione automatica
   - Gestisci la perdita di messaggi
   - Mantieni la coerenza dei dati
{{< /alert >}}

## Argomenti Correlati

- Per lo streaming di dati binari, vedi [Streaming di Dati Binari](../../3-tutorials/4-streaming/7-raw-binary)
- Per la gestione degli errori, vedi [Gestione degli Errori](../../3-tutorials/3-error-handling)
- Per la sicurezza, vedi [Sicurezza](../../4-concepts/5-security)
- Per il middleware, vedi [Middleware](../../5-interceptors/2-http-middleware) 