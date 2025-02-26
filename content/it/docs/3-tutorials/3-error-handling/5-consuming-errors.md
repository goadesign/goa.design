---
title: Produrre e Consumare Errori
linkTitle: Produrre Errori
weight: 5
description: "Guida alla generazione e gestione degli errori nei servizi Goa, incluso l'uso di funzioni helper generate e la gestione degli errori lato client."
---

Produrre e consumare errori sono aspetti essenziali della gestione degli errori nei
servizi basati su Goa. Questa sezione descrive in dettaglio come generare errori all'interno delle tue
implementazioni di servizio e come gestire questi errori sul lato client
efficacemente.

## Produrre Errori

### Usare le Funzioni Helper Generate

Goa genera funzioni helper per gli errori definiti, semplificando il processo di
creazione di risposte di errore standardizzate. Queste funzioni helper assicurano che gli errori
siano coerenti e formattati correttamente secondo il design del servizio. Le
funzioni helper sono chiamate `Make<NomeErrore>` dove `<NomeErrore>` è il nome
dell'errore come definito nel DSL. Inizializzano i campi dell'errore basandosi sul
design del servizio (es. se l'errore è un timeout, temporaneo, ecc.).

Dato il seguente design del servizio:

```go
var _ = Service("divider", func() {
    Method("IntegralDivide", func() {
        Payload(IntOperands)
        Result(Int)
        Error("DivByZero", ErrorResult, "Il divisore non può essere zero")
        Error("HasRemainder", ErrorResult, "Il resto non è zero")
        HTTP(func() {
            POST("/divide")
            Response(StatusOK)
            Response("DivByZero", StatusBadRequest)
            Response("HasRemainder", StatusUnprocessableEntity)
        })
    })
})

 var IntOperands = Type("IntOperands", func() {
    Attribute("dividend", Int, "Dividendo")
    Attribute("divisor", Int, "Divisore")
    Required("dividend", "divisor")
 })
```

Esempio di Implementazione:

```go
//...
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if p.Divisor == 0 {
        return 0, gendivider.MakeDivByZero(fmt.Errorf("il divisore non può essere zero"))
    }
    if p.Dividend%p.Divisor != 0 {
        return 0, gendivider.MakeHasRemainder(fmt.Errorf("il resto è %d", p.Dividend%p.Divisor))
    }
    return p.Dividend / p.Divisor, nil
}
```

In questo esempio:

- Il package `gendivider` è generato da Goa (sotto `gen/divider`).
- La funzione `MakeDivByZero` crea un errore `DivByZero` standardizzato.
- La funzione `MakeHasRemainder` crea un errore `HasRemainder` standardizzato.

Queste funzioni helper gestiscono l'inizializzazione dei campi dell'errore basandosi sul
design del servizio, assicurando che gli errori siano correttamente serializzati e mappati su
codici di stato specifici del trasporto (400 per `DivByZero` e 422 per
`HasRemainder` in questo esempio).

### Usare Tipi di Errore Personalizzati

Per scenari di errore più complessi, potresti aver bisogno di definire tipi di errore personalizzati.
A differenza dell'`ErrorResult` predefinito, i tipi di errore personalizzati ti permettono di includere
informazioni contestuali aggiuntive rilevanti per l'errore.

Dato il seguente design del servizio:

```go
var _ = Service("divider", func() {
    Method("IntegralDivide", func() {
        Payload(IntOperands)
        Result(Int)
        Error("DivByZero", DivByZero, "Il divisore non può essere zero")
        HTTP(func() {
            POST("/divide")
            Response(StatusOK)
            Response("DivByZero", StatusBadRequest)
        })
    })
})

var DivByZero = Type("DivByZero", func() {
    Description("DivByZero è l'errore restituito quando si usa il valore 0 come divisore.")
    Field(1, "name", String, "Nome dell'errore", func() {
        Meta("struct:error:name")
    })
    Field(2, "message", String, "Messaggio di errore per la divisione per zero.")
    Field(3, "dividend", Int, "Dividendo che è stato usato nell'operazione.")
    Required("name", "message", "dividend")
})
```

Esempio di Implementazione:

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if p.Divisor == 0 {
        return 0, &gendivider.DivByZero{Name: "DivByZero", Message: "il divisore non può essere zero", Dividend: p.Dividend}
    }
    // Logica aggiuntiva...
}
```

In questo esempio:

- La struct `DivByZero` è un tipo di errore personalizzato definito nel design del servizio.
- Restituendo un'istanza di `DivByZero`, puoi fornire informazioni di errore dettagliate personalizzate.
- Nota: Quando usi tipi di errore personalizzati, assicurati che la tua struct di errore includa un
  attributo con `Meta("struct:error:name")` per permettere a Goa di mappare correttamente
  l'errore. Questo attributo deve essere impostato con il nome dell'errore come definito nel
  design del servizio.

## Consumare Errori

Gestire gli errori sul lato client è importante tanto quanto produrli sul
server. Una corretta gestione degli errori assicura che i client possano rispondere appropriatamente a
diversi scenari di errore.

### Gestire Errori Predefiniti

Quando si usa il tipo `ErrorResult` predefinito, gli errori lato client sono istanze di
`goa.ServiceError`. Puoi controllare il tipo di errore e gestirlo basandoti sul
nome dell'errore.

Esempio:

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        case "HasRemainder":
            // Gestisci l'errore di resto
        case "DivByZero":
            // Gestisci l'errore di divisione per zero
        default:
            // Gestisci errori sconosciuti
        }
    }
}
```

### Gestire Errori Personalizzati

Quando si usano tipi di errore personalizzati, gli errori lato client sono istanze delle
struct Go generate corrispondenti. Puoi fare l'asserzione di tipo dell'errore al
tipo personalizzato specifico e gestirlo di conseguenza.

Esempio:

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if dbz, ok := err.(*gendivider.DivByZero); ok {
        // Gestisci l'errore di divisione per zero
    }
}
```

## Riepilogo

Producendo e consumando efficacemente gli errori, assicuri che i tuoi servizi
basati su Goa comunichino i fallimenti in modo chiaro e coerente. Utilizzare
funzioni helper generate per errori standard e tipi di errore personalizzati per scenari
più complessi permette una gestione degli errori flessibile e robusta. Una corretta gestione
degli errori lato client migliora ulteriormente l'affidabilità e l'usabilità delle tue API,
fornendo feedback significativi agli utenti e permettendo appropriate azioni
correttive. 