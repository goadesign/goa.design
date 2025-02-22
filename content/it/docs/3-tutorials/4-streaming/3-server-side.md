---
title: "Implementare lo Streaming Lato Server"
linkTitle: Lato Server
weight: 3
---

Una volta progettati i tuoi endpoint di streaming server usando il DSL
`StreamingResult` di Goa, il passo successivo è implementare sia la logica lato server
che gestisce lo streaming dei risultati sia il codice lato client che consuma lo
stream. Questa guida illustra l'implementazione di entrambi i lati di un endpoint di streaming
in Goa.

## Implementazione Lato Server

Quando definisci un metodo di streaming server nel DSL, Goa genera specifiche
interfacce di stream che il server deve implementare. Queste interfacce facilitano
l'invio di dati in streaming ai client.

### Interfaccia Stream Server

Assumendo il seguente design:
```go
var _ = Service("logger", func() {
    Method("subscribe", func() {
        StreamingResult(LogEntry)
        HTTP(func() {
            GET("/logs/stream")
            Response(StatusOK)
        })
    })
})
```

L'interfaccia stream server include metodi per inviare dati e chiudere lo stream:

```go
// Interfaccia che il server deve soddisfare
type ListServerStream interface {
    // Send invia in streaming istanze di "StoredBottle"
    Send(*LogEntry) error
    // Close chiude lo stream
    Close() error
}
```

### Metodi Chiave

- **Send:** Invia un'istanza del tipo specificato (`LogEntry`) al client.
  Questo metodo può essere chiamato più volte per inviare in streaming multipli risultati.
- **Close:** Chiude lo stream, segnalando la fine della trasmissione dei dati.
  Dopo aver chiamato `Close`, qualsiasi chiamata successiva a `Send` risulterà in un errore.

### Esempio di Implementazione

Ecco un esempio di implementazione di un endpoint di streaming lato server:

```go
// Lists invia in streaming le voci di log al client
func (s *loggerSvc) Subscribe(ctx context.Context, stream logger.SubscribeServerStream) error {
    logEntries, err := loadLogEntries()
    if err != nil {
        return fmt.Errorf("impossibile caricare le voci di log: %w", err)
    }

    for _, logEntry := range logEntries {
        if err := stream.Send(logEntry); err != nil {
            return fmt.Errorf("impossibile inviare la voce di log: %w", err)
        }
    }

    return stream.Close()
}
```

### Gestione degli Errori

Una corretta gestione degli errori assicura un comportamento di streaming robusto:

- Controlla sempre il valore di ritorno di `Send` per gestire potenziali errori di trasmissione
- Il metodo `Send` restituirà un errore se il client si disconnette o il contesto viene annullato
- Assicurati che gli errori siano avvolti con un contesto appropriato per il debugging
- Considera l'implementazione di logica di retry per fallimenti transitori se appropriato

## Implementazione Lato Client

L'implementazione lato client coinvolge la ricezione e l'elaborazione dei dati
in streaming. Goa genera interfacce client che rendono facile consumare gli stream.

### Interfaccia Stream Client

L'interfaccia client generata include metodi per ricevere dati e gestire lo stream:

```go
// Interfaccia che il client usa per ricevere lo stream
type ListClientStream interface {
    // Recv restituisce il prossimo risultato nello stream
    Recv() (*LogEntry, error)
    // Close chiude lo stream
    Close() error
}
```

### Esempio di Implementazione Client

Ecco come consumare uno stream dal lato client:

```go
func processLogEntryStream(client logger.Client) error {
    stream, err := client.List(context.Background())
    if err != nil {
        return fmt.Errorf("impossibile avviare lo stream: %w", err)
    }
    defer stream.Close()

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
        processLogEntry(logEntry)
    }
}
```

### Considerazioni Chiave per i Client

1. **Inizializzazione dello Stream:**
   - Crea lo stream usando il metodo client generato
   - Controlla gli errori di inizializzazione prima di procedere
   - Usa `defer stream.Close()` per assicurare una corretta pulizia

2. **Ricezione dei Dati:**
   - Usa un ciclo per ricevere continuamente dati fino a EOF o errore
   - Gestisci `io.EOF` come la normale condizione di fine stream
   - Processa altri errori in modo appropriato in base alle esigenze della tua applicazione

3. **Gestione delle Risorse:**
   - Chiudi sempre lo stream quando hai finito
   - Considera l'uso di timeout o scadenze via context se necessario
   - Implementa una corretta gestione degli errori e logging

## Riepilogo

Implementare lo streaming in Goa coinvolge sia lo streaming dei dati lato server che
il consumo dello stream lato client. Seguendo questi pattern e best practice
per la gestione degli errori e delle risorse, puoi costruire endpoint di streaming
robusti che migliorano la reattività e la scalabilità delle tue API.

L'implementazione server si concentra sull'invio efficiente dei dati e sulla gestione
degli errori, mentre l'implementazione client fornisce un'interfaccia pulita per ricevere
ed elaborare i dati in streaming. Insieme, creano un meccanismo potente per
gestire dataset in tempo reale o di grandi dimensioni nei tuoi servizi Goa. 