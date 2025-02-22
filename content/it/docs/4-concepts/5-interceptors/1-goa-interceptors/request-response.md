---
title: Richieste e Risposte
weight: 3
description: >
  Impara come gli interceptor Goa possono modificare e arricchire le richieste e le risposte che attraversano il tuo servizio.
---

Gli interceptor Goa possono modificare sia le richieste in ingresso che le risposte in uscita. Questa capacità è fondamentale per implementare funzionalità trasversali come la validazione, l'arricchimento dei dati e la trasformazione.

## Modifica delle Richieste

Gli interceptor possono modificare le richieste prima che raggiungano l'endpoint del servizio:

```go
func RequestModifier(e goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        // Converti la richiesta nel tipo specifico
        payload, ok := req.(*MyPayload)
        if !ok {
            return nil, fmt.Errorf("tipo di richiesta non valido")
        }

        // Modifica il payload
        payload.Timestamp = time.Now()
        payload.ProcessedBy = "request-modifier"

        // Passa la richiesta modificata all'endpoint
        return e(ctx, payload)
    }
}
```

### Casi d'Uso Comuni

1. **Validazione**
   - Verifica dei campi obbligatori
   - Validazione del formato
   - Controlli di business logic

2. **Arricchimento**
   - Aggiunta di timestamp
   - Informazioni di contesto
   - Dati di tracciamento

3. **Trasformazione**
   - Conversione di formati
   - Normalizzazione dei dati
   - Pulizia degli input

## Modifica delle Risposte

Gli interceptor possono anche modificare le risposte prima che vengano restituite al client:

```go
func ResponseModifier(e goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        // Chiama l'endpoint originale
        res, err := e(ctx, req)
        if err != nil {
            return nil, err
        }

        // Converti la risposta nel tipo specifico
        result, ok := res.(*MyResult)
        if !ok {
            return nil, fmt.Errorf("tipo di risposta non valido")
        }

        // Modifica il risultato
        result.ProcessedAt = time.Now()
        result.Version = "1.0"

        return result, nil
    }
}
```

### Casi d'Uso Comuni

1. **Arricchimento**
   - Aggiunta di metadati
   - Informazioni di versione
   - Dati di elaborazione

2. **Trasformazione**
   - Formattazione dei dati
   - Filtro delle informazioni sensibili
   - Conversione di formati

3. **Caching**
   - Memorizzazione dei risultati
   - Invalidazione della cache
   - Gestione delle dipendenze

## Gestione del Contesto

Il contesto è un meccanismo potente per passare dati attraverso la catena degli interceptor:

```go
func ContextEnricher(e goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        // Aggiungi dati al contesto
        ctx = context.WithValue(ctx, "request_id", uuid.New())
        ctx = context.WithValue(ctx, "timestamp", time.Now())

        // Passa il contesto modificato all'endpoint
        return e(ctx, req)
    }
}
```

### Migliori Pratiche

{{< alert title="Gestione del Contesto" color="primary" >}}
**Do**
- Usa chiavi di contesto tipizzate
- Documenta i valori del contesto
- Gestisci i valori mancanti
- Mantieni la coerenza

**Don't**
- Abusare del contesto
- Memorizzare dati di grandi dimensioni
- Usare chiavi non documentate
- Ignorare i valori del contesto
{{< /alert >}}

## Combinazione degli Interceptor

Gli interceptor possono essere combinati per creare catene di elaborazione complesse:

```go
func main() {
    // Crea gli interceptor
    logging := LoggingInterceptor(logger)
    metrics := MetricsInterceptor(metrics)
    validation := ValidationInterceptor()
    enrichment := EnrichmentInterceptor()

    // Crea gli endpoint
    endpoints := service.NewEndpoints(svc)

    // Applica gli interceptor nell'ordine desiderato
    endpoints.Use(logging)      // Prima il logging
    endpoints.Use(metrics)      // Poi le metriche
    endpoints.Use(validation)   // Poi la validazione
    endpoints.Use(enrichment)   // Infine l'arricchimento
}
```

### Considerazioni sull'Ordine

1. **Logging e Metriche**
   - Solitamente primi nella catena
   - Catturano tutte le richieste
   - Registrano tempi accurati

2. **Validazione**
   - Prima della logica di business
   - Fallisce velocemente
   - Previene elaborazioni inutili

3. **Arricchimento**
   - Dopo la validazione
   - Prima della logica di business
   - Aggiunge dati necessari

4. **Trasformazione**
   - Dopo l'arricchimento
   - Prima della logica di business
   - Prepara i dati per l'elaborazione

## Conclusione

Gli interceptor di richiesta e risposta sono strumenti potenti per:
- Implementare funzionalità trasversali
- Mantenere la logica di business pulita
- Garantire la coerenza del servizio
- Semplificare la manutenzione

Usa questi pattern con attenzione e mantieni sempre in considerazione:
- L'impatto sulle prestazioni
- La chiarezza del codice
- La manutenibilità
- La testabilità 