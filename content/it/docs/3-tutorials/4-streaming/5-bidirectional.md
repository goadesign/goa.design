---
title: "Implementare lo Streaming Bidirezionale"
linkTitle: Bidirezionale
weight: 5
---

Una volta progettati i tuoi endpoint di streaming bidirezionale usando i DSL
`StreamingPayload` e `StreamingResult` di Goa, il passo successivo è implementare entrambi
i lati della connessione di streaming. Questa guida illustra l'implementazione di entrambi
i componenti client e server di un endpoint di streaming bidirezionale in Goa.

## Design

Assumendo il seguente design:

```go
var _ = Service("logger", func() {
    Method("monitor", func() {
        StreamingPayload(LogFilter)
        StreamingResult(LogEntry)
        HTTP(func() {
            GET("/logs/monitor")
            Response(StatusOK)
        })
        GRPC(func() {})
    })
})
```

## Implementazione Lato Client

Quando definisci un metodo di streaming bidirezionale, Goa genera specifiche
interfacce di stream che il client deve implementare. Queste interfacce facilitano sia l'invio
che la ricezione dei dati in streaming.

### Interfaccia Stream Client

L'interfaccia stream client include metodi sia per inviare che per ricevere dati:

```go
// Interfaccia che il client deve soddisfare
type MonitorClientStream interface {
    // Send invia in streaming istanze di "LogFilter"
    Send(*LogFilter) error
    // Recv restituisce il prossimo risultato nello stream
    Recv() (*LogEntry, error)
    // Close chiude lo stream
    Close() error
}
```

### Metodi Chiave

- **Send:** Invia aggiornamenti dei filtri al server. Può essere chiamato più volte per aggiornare i criteri di filtraggio.
- **Recv:** Riceve voci di log dal server che corrispondono ai filtri correnti.
- **Close:** Chiude lo stream bidirezionale. Dopo aver chiamato Close, sia Send che Recv restituiranno errori.

### Esempio di Implementazione

Ecco un esempio di implementazione di un endpoint di streaming bidirezionale lato client:

```go
func monitorLogs(client logger.Client, initialFilter *LogFilter) error {
    stream, err := client.Monitor(context.Background())
    if err != nil {
        return fmt.Errorf("impossibile avviare lo stream di monitoraggio: %w", err)
    }
    defer stream.Close()

    // Avvia una goroutine per gestire la ricezione dei log
    go func() {
        for {
            logEntry, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                log.Printf("errore nella ricezione della voce di log: %v", err)
                return
            }
            processLogEntry(logEntry)
        }
    }()

    // Invia il filtro iniziale
    if err := stream.Send(initialFilter); err != nil {
        return fmt.Errorf("impossibile inviare il filtro iniziale: %w", err)
    }

    // Aggiorna i filtri in base a qualche condizione
    for {
        newFilter := waitForFilterUpdate()
        if err := stream.Send(newFilter); err != nil {
            return fmt.Errorf("impossibile aggiornare il filtro: %w", err)
        }
    }
}
```

## Implementazione Lato Server

L'implementazione lato server gestisce sia gli aggiornamenti dei filtri in arrivo che lo streaming
delle voci di log corrispondenti di ritorno al client.

### Interfaccia Stream Server

```go
// Interfaccia che il server deve soddisfare
type MonitorServerStream interface {
    // Send invia in streaming istanze di "LogEntry"
    Send(*LogEntry) error
    // Recv restituisce il prossimo filtro nello stream
    Recv() (*LogFilter, error)
    // Close chiude lo stream
    Close() error
}
```

### Esempio di Implementazione Server

Ecco come implementare lo streaming bidirezionale sul lato server:

```go
func (s *loggerSvc) Monitor(ctx context.Context, stream logger.MonitorServerStream) error {
    // Avvia una goroutine per gestire gli aggiornamenti dei filtri
    filterCh := make(chan *LogFilter, 1)
    go func() {
        defer close(filterCh)
        for {
            filter, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                log.Printf("errore nella ricezione dell'aggiornamento del filtro: %v", err)
                return
            }
            filterCh <- filter
        }
    }()

    // Loop principale per l'elaborazione dei log e l'applicazione dei filtri
    var currentFilter *LogFilter
    for {
        select {
        case filter, ok := <-filterCh:
            if !ok {
                // Canale chiuso, interrompi l'elaborazione
                return nil
            }
            currentFilter = filter
        case <-ctx.Done():
            // Contesto annullato, interrompi l'elaborazione
            return ctx.Err()
        default:
            if currentFilter != nil {
                logEntry := s.getNextMatchingLog(currentFilter)
                if err := stream.Send(logEntry); err != nil {
                    return fmt.Errorf("errore nell'invio della voce di log: %w", err)
                }
            }
        }
    }
}
```

### Considerazioni Chiave

1. **Operazioni Concorrenti:**
   - Usa goroutine per gestire l'invio e la ricezione in modo indipendente
   - Implementa una corretta sincronizzazione per lo stato condiviso
   - Gestisci lo spegnimento graceful in entrambe le direzioni

2. **Gestione delle Risorse:**
   - Monitora l'uso della memoria per gli stream sia in entrata che in uscita
   - Implementa il rate limiting in entrambe le direzioni
   - Pulisci le risorse quando uno dei due lati chiude lo stream

3. **Gestione degli Errori:**
   - Gestisci gli errori da entrambe le operazioni Send e Recv
   - Propaga gli errori appropriatamente a entrambi i lati
   - Considera l'implementazione di logica di riconnessione per fallimenti transitori

4. **Gestione del Contesto:**
   - Rispetta l'annullamento del contesto in entrambe le direzioni
   - Implementa timeout appropriati
   - Pulisci le risorse quando il contesto viene annullato

## Riepilogo

Implementare lo streaming bidirezionale in Goa richiede un'attenta coordinazione delle
operazioni sia di invio che di ricezione su entrambi i lati client e server. Seguendo
questi pattern e best practice per le operazioni concorrenti, la gestione degli errori
e la gestione delle risorse, puoi costruire endpoint di streaming bidirezionale robusti
che abilitano una comunicazione in tempo reale e interattiva tra client e server.

L'implementazione permette aggiornamenti dinamici al comportamento dello streaming attraverso
filtri inviati dal client mentre mantiene un flusso continuo di risposte dal server,
creando un meccanismo flessibile e potente per lo scambio di dati in tempo reale nei tuoi
servizi Goa. 