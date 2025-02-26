---
title: Errori di Dominio vs Errori di Trasporto
linkTitle: Dominio vs Trasporto
weight: 1
description: "Scopri la distinzione tra errori di dominio ed errori di trasporto in Goa, e come mapparli efficacemente tra loro."
---

Quando si progetta la gestione degli errori in Goa, è importante comprendere la
distinzione tra errori di dominio e la loro rappresentazione a livello di trasporto. Questa
separazione ti permette di mantenere una logica di dominio pulita garantendo al contempo una corretta
comunicazione degli errori attraverso diversi protocolli.

## Errori di Dominio

Gli errori di dominio rappresentano i fallimenti della logica di business nella tua applicazione. Sono
indipendenti dal protocollo e si concentrano su cosa è andato storto dal punto di vista
della logica di business. Il tipo predefinito `ErrorResult` di Goa è spesso sufficiente per esprimere
errori di dominio - i tipi di errore personalizzati sono opzionali e necessari solo per casi
specializzati.

### Uso del Tipo di Errore Predefinito

Il tipo predefinito `ErrorResult` combinato con nomi significativi, descrizioni e
proprietà degli errori può esprimere efficacemente la maggior parte degli errori di dominio:

```go
var _ = Service("payment", func() {
    // Definisci errori di dominio usando il tipo ErrorResult predefinito
    Error("insufficient_funds", ErrorResult, func() {
        Description("Il conto non ha fondi sufficienti per la transazione")
        // Le proprietà dell'errore aiutano a definire le caratteristiche dell'errore
        Temporary()  // L'errore può risolversi se l'utente aggiunge fondi
    })

    Error("card_expired", ErrorResult, func() {
        Description("La carta di pagamento è scaduta")
        // Questo è un errore permanente finché la carta non viene aggiornata
    })

    Error("processing_failed", ErrorResult, func() {
        Description("Sistema di elaborazione pagamenti temporaneamente non disponibile")
        Temporary()  // Si può riprovare più tardi
        Fault()      // Problema lato server
    })
    
    Method("process", func() {
        // ... definizione del metodo
    })
})
```

Gli errori di dominio dovrebbero:
- Avere nomi chiari e descrittivi che riflettono lo scenario di business
- Includere descrizioni significative per la documentazione e il debug
- Usare proprietà degli errori per indicare le caratteristiche dell'errore
- Essere indipendenti da come verranno trasmessi

### Tipi di Errore Personalizzati (Opzionali)

Per i casi in cui sono necessari dati di errore strutturati aggiuntivi, puoi definire tipi di errore personalizzati. Vedi la
[documentazione principale sulla gestione degli errori](../_index.md#tipi-di-errore-personalizzati) per informazioni dettagliate sui
tipi di errore personalizzati, inclusi i requisiti importanti per il campo `name` e i metadati `struct:error:name`.

```go
// Tipo personalizzato per quando è richiesto un contesto di errore extra
var PaymentError = Type("PaymentError", func() {
    Description("PaymentError rappresenta un fallimento nell'elaborazione del pagamento")
    Field(1, "message", String, "Messaggio di errore leggibile")
    Field(2, "code", String, "Codice di errore interno")
    Field(3, "transaction_id", String, "ID della transazione fallita")
    Field(4, "name", String, "Nome dell'errore per la mappatura di trasporto", func() {
        Meta("struct:error:name")
    })
    Required("message", "code", "name")
})
```

## Mappatura dei Trasporti

Le mappature di trasporto definiscono come gli errori di dominio sono rappresentati in specifici
protocolli. Questo include codici di stato, headers e formati di risposta.

### Trasporto HTTP

```go
var _ = Service("payment", func() {
    // Definisci errori di dominio
    Error("insufficient_funds", PaymentError)
    Error("card_expired", PaymentError)
    Error("processing_failed", PaymentError)
    
    HTTP(func() {
        // Mappa gli errori di dominio ai codici di stato HTTP
        Response("insufficient_funds", StatusPaymentRequired, func() {
            // Aggiungi headers specifici per il pagamento
            Header("Retry-After")
            // Personalizza il formato della risposta di errore
            Body(func() {
                Attribute("error_code")
                Attribute("message")
            })
        })
        Response("card_expired", StatusUnprocessableEntity)
        Response("processing_failed", StatusServiceUnavailable)
    })
})
```

### Trasporto gRPC

```go
var _ = Service("payment", func() {
    // Stessi errori di dominio
    Error("insufficient_funds", PaymentError)
    Error("card_expired", PaymentError)
    Error("processing_failed", PaymentError)
    
    GRPC(func() {
        // Mappa ai codici di stato gRPC
        Response("insufficient_funds", CodeFailedPrecondition)
        Response("card_expired", CodeInvalidArgument)
        Response("processing_failed", CodeUnavailable)
    })
})
```

## Vantaggi della Separazione

Questa separazione delle responsabilità fornisce diversi vantaggi:

1. **Indipendenza dal Protocollo**
   - Gli errori di dominio rimangono focalizzati sulla logica di business
   - Lo stesso errore può essere mappato diversamente per protocolli diversi
   - Facile aggiungere nuovi protocolli di trasporto

2. **Gestione Coerente degli Errori**
   - Definizioni di errore centralizzate
   - Gestione uniforme degli errori tra i servizi
   - Mappatura chiara tra errori di dominio e di trasporto

3. **Documentazione Migliore**
   - Gli errori di dominio documentano le regole di business
   - Le mappature di trasporto documentano il comportamento dell'API
   - La separazione chiara aiuta i consumatori dell'API

## Esempio di Implementazione

Ecco come funziona questa separazione nella pratica:

### Uso di ErrorResult Predefinito

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // Logica di dominio
    if !hasEnoughFunds(p.Amount) {
        // Restituisci errore usando la funzione helper generata
        return nil, payment.MakeInsufficientFunds(
            fmt.Errorf("saldo conto %d sotto l'importo richiesto %d", balance, p.Amount))
    }
    
    if isSystemOverloaded() {
        // Restituisci errore per problema temporaneo del sistema
        return nil, payment.MakeProcessingFailed(
            fmt.Errorf("sistema di pagamento temporaneamente non disponibile"))
    }
    
    // Altra elaborazione...
}
```

### Uso di Tipo di Errore Personalizzato (Quando Serve Contesto Aggiuntivo)

```go
func (s *paymentService) Process(ctx context.Context, p *payment.ProcessPayload) (*payment.ProcessResult, error) {
    // Logica di dominio
    if !hasEnoughFunds(p.Amount) {
        // Restituisci errore di dominio con contesto aggiuntivo
        return nil, &payment.PaymentError{
            Name:          "insufficient_funds",
            Message:       "Saldo del conto troppo basso per la transazione",
            Code:         "FUNDS_001",
            TransactionID: txID,
        }
    }
    
    // Altra elaborazione...
}
```

Il layer di trasporto automaticamente:
1. Mappa l'errore di dominio al codice di stato appropriato
2. Formatta la risposta di errore secondo il protocollo
3. Include eventuali headers o metadati specifici del protocollo

## Best Practice

1. **Prima il Dominio**
   - Progetta gli errori basandoti sui requisiti di business
   - Usa terminologia di dominio nei messaggi di errore
   - Includi contesto rilevante per il debug

2. **Mappatura Coerente**
   - Usa codici di stato appropriati per ogni protocollo
   - Mantieni mappature coerenti tra i servizi
   - Documenta la logica delle mappature

3. **Proprietà degli Errori**
   - Usa le proprietà degli errori (`Temporary()`, `Timeout()`, `Fault()`) per indicare le caratteristiche
   - Considera l'implementazione di proprietà simili nei tipi di errore personalizzati
   - Documenta come le proprietà influenzano il comportamento del client

4. **Documentazione**
   - Documenta sia il significato di dominio che il comportamento di trasporto
   - Includi esempi di risposte di errore
   - Spiega strategie di retry e gestione lato client

## Conclusione

Separando gli errori di dominio dalla loro rappresentazione di trasporto, Goa ti permette di:
- Mantenere una logica di dominio pulita
- Fornire risposte di errore appropriate al protocollo
- Supportare più protocolli in modo coerente
- Scalare la gestione degli errori mentre la tua API cresce 