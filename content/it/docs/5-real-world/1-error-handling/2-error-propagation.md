---
title: Propagazione degli Errori
weight: 2
---

# Propagazione degli Errori

Questa guida spiega come gli errori si propagano attraverso i diversi layer di un servizio Goa, dalla logica
di business fino al client.

## Panoramica

La propagazione degli errori in Goa segue un percorso chiaro:
1. La logica di business genera un errore
2. L'errore viene abbinato alla sua definizione nel design
3. Il layer di trasporto trasforma l'errore
4. Il client riceve e interpreta l'errore

## Flusso degli Errori

### 1. Layer della Logica di Business

Gli errori tipicamente originano nella tua implementazione del servizio:

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // La logica di business può restituire errori in diversi modi:
    
    // 1. Usando funzioni helper generate (per ErrorResult)
    if !hasEnoughFunds(p.Amount) {
        return nil, payment.MakeInsufficientFunds(
            fmt.Errorf("saldo conto %d sotto l'importo richiesto %d", balance, p.Amount))
    }
    
    // 2. Restituendo tipi di errore personalizzati
    if err := validateCard(p.Card); err != nil {
        return nil, &payment.PaymentError{
            Name:    "card_expired",
            Message: err.Error(),
        }
    }
    
    // 3. Propagando errori da servizi downstream
    result, err := s.processor.ProcessPayment(ctx, p)
    if err != nil {
        // Avvolgi gli errori esterni nei tuoi errori di dominio
        return nil, payment.MakeProcessingFailed(fmt.Errorf("errore processore pagamenti: %w", err))
    }
    
    return result, nil
}
```

### 2. Abbinamento degli Errori

Il runtime di Goa abbina gli errori restituiti alle loro definizioni nel design:

```go
var _ = Service("payment", func() {
    // Gli errori definiti qui sono abbinati per nome
    Error("insufficient_funds")
    Error("card_expired")
    Error("processing_failed", func() {
        // Le proprietà influenzano la gestione degli errori
        Temporary()
        Fault()
    })
})
```

Il processo di abbinamento:
1. Per `ErrorResult`: Usa il nome dell'errore dalla funzione `MakeXXX` generata
2. Per tipi personalizzati: Usa il campo marcato con `struct:error:name`
3. Per errori sconosciuti: Trattati come errori interni del server

### 3. Layer di Trasporto

Una volta abbinati, gli errori vengono trasformati secondo regole specifiche del trasporto:

```go
var _ = Service("payment", func() {
    HTTP(func() {
        // Regole di mappatura HTTP
        Response("insufficient_funds", StatusPaymentRequired)
        Response("card_expired", StatusUnprocessableEntity)
        Response("processing_failed", StatusServiceUnavailable)
    })
    
    GRPC(func() {
        // Regole di mappatura gRPC
        Response("insufficient_funds", CodeFailedPrecondition)
        Response("card_expired", CodeInvalidArgument)
        Response("processing_failed", CodeUnavailable)
    })
})
```

Il layer di trasporto:
1. Applica il codice di stato appropriato
2. Formatta il messaggio di errore e i dettagli
3. Serializza la risposta

### 4. Ricezione del Client

I client ricevono errori fortemente tipizzati che corrispondono al design:

```go
client := payment.NewClient(endpoint)
result, err := client.Process(ctx, payload)
if err != nil {
    switch e := err.(type) {
    case *payment.InsufficientFundsError:
        // Gestisci fondi insufficienti (include proprietà dell'errore)
        if e.Temporary {
            return retry(ctx, payload)
        }
        return promptForTopUp(e.Message)
        
    case *payment.CardExpiredError:
        // Gestisci carta scaduta
        return promptForNewCard(e.Message)
        
    case *payment.ProcessingFailedError:
        // Gestisci fallimento elaborazione
        if e.Temporary {
            return retryWithBackoff(ctx, payload)
        }
        return reportSystemError(e)
        
    default:
        // Gestisci errori inaspettati
        return handleUnknownError(err)
    }
}
```

## Best Practice

1. **Wrapping degli Errori**
   - Avvolgi gli errori esterni nei tuoi errori di dominio
   - Preserva la causa radice usando `fmt.Errorf("...%w", err)`
   - Aggiungi contesto rilevante per il tuo dominio

2. **Propagazione Coerente**
   - Usa funzioni helper generate quando possibile
   - Mantieni le proprietà degli errori attraverso la catena
   - Non mischiare tipi di errore inutilmente

3. **Considerazioni sul Trasporto**
   - Definisci codici di stato appropriati per ogni trasporto
   - Includi headers/metadata rilevanti
   - Considera i requisiti del client

4. **Esperienza del Client**
   - Fornisci errori fortemente tipizzati
   - Includi contesto sufficiente per la gestione
   - Documenta strategie di retry

## Esempio di Trasformazione degli Errori

Ecco un esempio completo di come un errore si trasforma attraverso il sistema:

```go
// 1. Logica di Business (Implementazione del Servizio)
if !hasEnoughFunds(amount) {
    return nil, payment.MakeInsufficientFunds(
        fmt.Errorf("saldo %d sotto il richiesto %d", balance, amount))
}

// 2. Definizione dell'Errore (Design)
var _ = Service("payment", func() {
    Error("insufficient_funds", func() {
        Description("Il conto non ha fondi sufficienti")
        Temporary()  // Può riprovare dopo ricarica
    })
})

// 3. Mappatura del Trasporto (Design)
HTTP(func() {
    Response("insufficient_funds", StatusPaymentRequired)
})

// 4. Ricezione del Client
result, err := client.Process(ctx, payload)
if err != nil {
    if e, ok := err.(*payment.InsufficientFundsError); ok {
        if e.Temporary {
            // Attendi la durata dell'header retry-after
            time.Sleep(retryAfter)
            return retry(ctx, payload)
        }
    }
}
```

## Conclusione

Il sistema di propagazione degli errori di Goa assicura che:
- Gli errori mantengano il loro significato semantico attraverso i layer
- I dettagli specifici del trasporto siano gestiti automaticamente
- I client ricevano errori fortemente tipizzati e azionabili
- La gestione degli errori rimanga coerente attraverso la tua API 