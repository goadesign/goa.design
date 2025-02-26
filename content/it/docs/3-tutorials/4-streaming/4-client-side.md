---
title: "Implementare lo Streaming Lato Client"
linkTitle: Lato Client
weight: 4
---

Una volta progettati i tuoi endpoint di streaming client usando il DSL
`StreamingPayload` di Goa, il passo successivo è implementare sia la logica lato client
che gestisce lo streaming dei dati sia il codice lato server che elabora lo
stream. Questa guida illustra l'implementazione di entrambi i lati di un endpoint di streaming
in Goa.

## Implementazione Lato Client

Quando definisci un metodo di streaming client nel DSL, Goa genera specifiche
interfacce di stream che il client deve implementare. Queste interfacce facilitano
l'invio di dati in streaming al server.

### Interfaccia Stream Client

Assumendo il seguente design:

```go
var _ = Service("logger", func() {
    Method("upload", func() {
        StreamingPayload(LogEntry)
        HTTP(func() {
            GET("/logs/upload")
            Response(StatusOK)
        })
        GRPC(func() {})
    })
})
```

L'interfaccia stream client include metodi per inviare dati e chiudere lo stream:

```go
// Interfaccia che il client deve soddisfare
type UploadClientStream interface {
    // Send invia in streaming istanze di "LogEntry"
    Send(*LogEntry) error
    // Close chiude lo stream
    Close() error
}
```

### Metodi Chiave

- **Send:** Invia un'istanza del tipo specificato (`LogEntry`) al server.
  Questo metodo può essere chiamato più volte per inviare in streaming multipli payload.
- **Close:** Chiude lo stream, `Send` restituirà un errore dopo aver chiamato `Close`.

### Esempio di Implementazione

Ecco un esempio di implementazione di un endpoint di streaming lato client:

```go
func uploadLogEntries(client *logger.Client, logEntries []*LogEntry) error {
    stream, err := client.Upload(context.Background())
    if err != nil {
        return fmt.Errorf("impossibile avviare lo stream di upload: %w", err)
    }

    for _, logEntry := range logEntries {
        if err := stream.Send(logEntry); err != nil {
            return fmt.Errorf("impossibile inviare la voce di log: %w", err)
        }
    }

    if err := stream.Close(); err != nil {
        return fmt.Errorf("impossibile chiudere lo stream: %w", err)
    }

    return nil
}
```

### Gestione degli Errori

Una corretta gestione degli errori assicura un comportamento di streaming robusto:

- Controlla sempre il valore di ritorno di `Send` per gestire potenziali errori di trasmissione
- Il metodo `Send` restituirà un errore se il server si disconnette o il contesto viene annullato
- Assicurati che gli errori siano avvolti con un contesto appropriato per il debugging
- Considera l'implementazione di logica di retry per fallimenti transitori se appropriato

## Implementazione Lato Server

L'implementazione lato server coinvolge la ricezione e l'elaborazione dei dati
in streaming. Goa genera interfacce server che rendono facile gestire gli stream
in arrivo.

### Interfaccia Stream Server

L'interfaccia server generata include metodi per ricevere dati e gestire lo stream:

```go
// Interfaccia che il server usa per ricevere lo stream
type UploadServerStream interface {
    // Recv restituisce il prossimo payload nello stream
    Recv() (*LogEntry, error)
    // Close chiude lo stream
    Close() error
}
```

### Esempio di Implementazione Server

Ecco come elaborare uno stream sul lato server:

```go
func (s *loggerSvc) Upload(ctx context.Context, stream logger.UploadServerStream) error {
    for {
        logEntry, err := stream.Recv()
        if err == io.EOF {
            // Lo stream è terminato
            return nil
        }
        if err != nil {
            return fmt.Errorf("errore nella ricezione della voce di log: %w", err)
        }

        // Elabora la voce di log ricevuta
        if err := s.processLogEntry(logEntry); err != nil {
            return fmt.Errorf("errore nell'elaborazione della voce di log: %w", err)
        }
    }
}
```

### Considerazioni Chiave per i Server

1. **Elaborazione dello Stream:**
   - Usa un ciclo per ricevere continuamente dati fino a EOF o errore
   - Gestisci `io.EOF` come la normale condizione di fine stream
   - Elabora i dati in arrivo mentre arrivano

2. **Gestione delle Risorse:**
   - Considera l'implementazione di rate limiting per i dati in arrivo
   - Monitora l'uso della memoria quando elabori stream grandi
   - Implementa una corretta gestione degli errori e logging

3. **Gestione degli Errori:**
   - Restituisci errori appropriati per fallimenti di validazione
   - Gestisci l'annullamento del contesto in modo appropriato
   - Considera l'implementazione di risposte di successo parziale

## Riepilogo

Implementare lo streaming lato client in Goa coinvolge sia l'invio dei dati
lato client che l'elaborazione dello stream lato server. Seguendo questi pattern e
best practice per la gestione degli errori e delle risorse, puoi costruire endpoint
di streaming robusti che migliorano l'efficienza delle tue API.

L'implementazione client si concentra sull'invio efficiente dei dati e sulla gestione
degli errori, mentre l'implementazione server fornisce un'interfaccia pulita per ricevere
ed elaborare i dati in streaming. Insieme, creano un meccanismo potente per
gestire upload o ingestione di dati in tempo reale nei tuoi servizi Goa. 