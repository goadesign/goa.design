---
title: "Gestire Viste Multiple nei Risultati di Streaming"
linkTitle: Viste
weight: 6
---

La flessibilità di Goa ti permette di definire viste multiple per i tuoi tipi di risultato,
abilitando diverse rappresentazioni dei dati basate sui requisiti del client.
Quando si ha a che fare con risultati in streaming, gestire queste viste diventa essenziale per
assicurare che i dati in streaming siano presentati appropriatamente. Questa sezione esplora come
gestire viste multiple nei risultati di streaming usando il DSL di Goa e il codice
generato.

## Comprendere le Viste in Goa

Le viste in Goa ti permettono di definire diverse rappresentazioni dei tuoi tipi di risultato.
Ogni vista può includere un sottoinsieme degli attributi del tipo, adattato a
casi d'uso specifici o esigenze del client.

### Esempio

```go
var LogEntry = Type("LogEntry", func() {
    Field(1, "timestamp", String, "Momento in cui la voce di log è stata creata")
    Field(2, "message", String, "Il messaggio di log")
    Field(3, "level", String, "Livello di log (INFO, WARN, ERROR, ecc)")
    Field(4, "source", String, "Sorgente della voce di log")
    Field(5, "metadata", MapOf(String, String), "Metadati aggiuntivi")
    Required("timestamp", "message", "level")

    View("default", func() {
        Attribute("timestamp")
        Attribute("message")
        Attribute("level")
    })
    
    View("detailed", func() {
        Attribute("timestamp")
        Attribute("message")
        Attribute("level")
        Attribute("source")
        Attribute("metadata")
    })
})
```

In questo esempio:

- **Vista default:** Include informazioni di log di base (`timestamp`, `message`, e `level`).
- **Vista detailed:** Include tutte le informazioni di log inclusi `source` e `metadata`.

## Usare `SetView` nelle Implementazioni dei Servizi

Quando si inviano in streaming risultati con viste multiple, devi specificare quale vista usare
quando invii ogni risultato. Questo viene fatto usando il metodo `SetView` generato da
Goa, che imposta il contesto della vista per i dati in streaming.

### Design di Esempio

```go
var _ = Service("logger", func() {
    Method("monitor", func() {
        StreamingPayload(ViewSelector)
        StreamingResult(LogEntry)
        HTTP(func() {
            GET("/logs/monitor")
            Response(StatusOK)
        })
    })
})
```

### Esempio di Implementazione

Questo esempio assume un trasporto HTTP poiché fa uso sia di `Payload` che di
`StreamingPayload` per impostare la vista.

```go
func (s *loggerSvc) Monitor(ctx context.Context, p *logsvc.ViewSelector, stream logsvc.MonitorServerStream) error {
    // Imposta la vista basata sulla richiesta del client
    stream.SetView(p.View)
    
    // Inizia il monitoraggio dei log
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            logEntry := s.getNextLog()
            if err := stream.Send(logEntry); err != nil {
                return err
            }
        }
    }
}
```

### Implementazione Lato Client

```go
func monitorLogsWithView(client logger.Client, view string) error {
    // Inizia lo stream di monitoraggio con la vista desiderata
    stream, err := client.Monitor(context.Background(), &logger.ViewSelector{ View: view })
    if err != nil {
        return fmt.Errorf("impossibile avviare lo stream di monitoraggio: %w", err)
    }
    defer stream.Close()

    // Ricevi ed elabora i log
    for {
        logEntry, err := stream.Recv()
        if err == io.EOF {
            break
        }
        if err != nil {
            return fmt.Errorf("errore nella ricezione del log: %w", err)
        }

        // Elabora la voce di log in base alla vista
        // La vista default avrà solo timestamp, message e level
        // La vista detailed includerà source e metadata
        processLogEntry(logEntry)
    }

    return nil
}
```

## Best Practice per Viste Multiple nello Streaming

- **Selezione della Vista:** Scegli viste appropriate basate sui casi d'uso:
  - Usa la vista `default` per monitoraggio e alerting di base
  - Usa la vista `detailed` per debugging e analisi dettagliata

- **Considerazioni sulle Prestazioni:**
  - La vista default riduce il traffico di rete per il monitoraggio di routine
  - La vista detailed fornisce informazioni complete quando necessario

- **Documentazione:** Documenta le viste disponibili:
```go
// Viste LogEntry:
// - "default": Informazioni di log di base (timestamp, message, level)
// - "detailed": Informazioni di log complete inclusi source e metadata
```

## Riepilogo

Applicando le viste al nostro servizio logger, possiamo fornire rappresentazioni
flessibili dei dati che si adattano a diverse esigenze di monitoraggio. La vista default offre
un monitoraggio di base efficiente, mentre la vista detailed supporta scenari di
debugging completi. Questo approccio ottimizza l'uso della rete mantenendo
la capacità di accedere a informazioni complete quando necessario. 