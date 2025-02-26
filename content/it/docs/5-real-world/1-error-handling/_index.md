---
linkTitle: Gestione degli Errori
title: Gestione degli Errori
weight: 1
description: "Impara come gestire efficacemente gli errori nei servizi Goa, inclusi definizione degli errori, mappatura dei trasporti e best practice."
---

Goa fornisce un robusto sistema di gestione degli errori che ti permette di definire, gestire e comunicare gli errori efficacemente attraverso i tuoi servizi. Questa guida copre tutto ciò che devi sapere sulla gestione degli errori in Goa.

## Panoramica

Goa adotta un approccio "batterie incluse" alla gestione degli errori dove gli errori possono essere definiti con informazioni minime (solo un nome) supportando anche tipi di errore completamente personalizzati quando necessario. Il framework genera sia codice che documentazione dalle tue definizioni di errore, assicurando consistenza attraverso la tua API.

Caratteristiche chiave della gestione degli errori di Goa:

- Definizioni di errore a livello di servizio e di metodo
- Tipi di errore predefiniti e personalizzati
- Mappatura dei codici di stato specifici per trasporto (HTTP/gRPC)
- Funzioni helper generate per la creazione degli errori
- Generazione automatica della documentazione

## Definizione degli Errori

### Errori a Livello API

Gli errori possono essere definiti a livello API per creare definizioni di errore riutilizzabili.
A differenza degli errori a livello di servizio, gli errori a livello API non si applicano automaticamente a tutti i metodi. Invece, forniscono un modo per definire le proprietà degli errori, incluse le mappature di trasporto, una volta sola e riutilizzarle attraverso servizi e metodi:

```go
var _ = API("calc", func() {
    // Definisci errore riutilizzabile con mappatura di trasporto
    Error("invalid_argument")  // Usa il tipo ErrorResult predefinito
    HTTP(func() {
        Response("invalid_argument", StatusBadRequest)
    })
})

var _ = Service("divider", func() {
    // Riferimento all'errore a livello API
    Error("invalid_argument")  // Riutilizza l'errore definito sopra
                              // Non serve definire di nuovo la mappatura HTTP

    Method("divide", func() {
        Payload(DivideRequest)
        // Errore specifico del metodo con tipo personalizzato
        Error("div_by_zero", DivByZero, "Divisione per zero")
    })
})
```

Questo approccio:
- Abilita definizioni di errore consistenti attraverso la tua API
- Riduce la duplicazione delle mappature di trasporto
- Permette politiche di gestione degli errori centralizzate
- Rende più facile mantenere risposte di errore consistenti

### Errori a Livello Servizio

Gli errori a livello servizio sono disponibili per tutti i metodi all'interno di un servizio. A differenza degli errori a livello API che forniscono definizioni riutilizzabili, gli errori a livello servizio si applicano automaticamente a ogni metodo nel servizio:

```go
var _ = Service("calc", func() {
    // Questo errore può essere restituito da qualsiasi metodo in questo servizio
    Error("invalid_arguments", ErrorResult, "Argomenti non validi forniti") 
    
    Method("divide", func() {
        // Questo metodo può restituire invalid_arguments senza dichiararlo esplicitamente
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        // ... altre definizioni del metodo
    })

    Method("multiply", func() {
        // Anche questo metodo può restituire invalid_arguments
        // ... definizioni del metodo
    })
})
```

Quando si definiscono errori a livello servizio:
- L'errore è disponibile per tutti i metodi nel servizio
- Ogni metodo può restituire l'errore senza dichiararlo esplicitamente
- Le mappature di trasporto definite per l'errore si applicano a tutti i metodi

### Errori a Livello Metodo

Gli errori specifici del metodo sono limitati a un particolare metodo:

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        Result(func() {
            Field(1, "quotient", Int)
            Field(2, "reminder", Int)
            Required("quotient", "reminder")
        })
        Error("div_by_zero") // Errore specifico del metodo
    })
})
```

### Tipi di Errore Personalizzati

Per scenari di errore più complessi, puoi definire tipi di errore personalizzati. I tipi di errore personalizzati ti permettono di includere informazioni contestuali aggiuntive specifiche per i tuoi casi di errore.

#### Tipo di Errore Personalizzato Base

Ecco un semplice tipo di errore personalizzato:

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZero è l'errore restituito quando si usa il valore 0 come divisore.")
    Field(1, "message", String, "la divisione per zero porta all'infinito.")
    Required("message")
})
```

#### Requisito del Campo Nome Errore

Quando si usano tipi di errore personalizzati per errori multipli nello stesso metodo, Goa ha bisogno di sapere quale campo contiene il nome dell'errore. Questo è cruciale per:
- Abbinare gli errori alle loro definizioni nel design
- Determinare i corretti codici di stato HTTP/gRPC
- Generare documentazione appropriata
- Abilitare una corretta gestione degli errori nei client

Per specificare il campo nome errore, usa i metadati `struct:error:name`:

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZero è l'errore restituito quando si usa il valore 0 come divisore.")
    Field(1, "message", String, "la divisione per zero porta all'infinito.")
    Field(2, "name", String, "Nome dell'errore", func() {
        Meta("struct:error:name")  // Dice a Goa che questo campo contiene il nome dell'errore
    })
    Required("message", "name")
})
```

Il campo marcato con `Meta("struct:error:name")`:
- Deve essere di tipo string
- Deve essere un campo obbligatorio
- Deve essere impostato al nome dell'errore come definito nel design
- Non può essere chiamato `"error_name"` (riservato da Goa)

#### Uso di Tipi di Errore Multipli

Quando un metodo può restituire diversi tipi di errore personalizzati, il campo nome diventa particolarmente importante. Ecco perché:

1. **Risoluzione del Tipo di Errore**: Quando sono possibili errori multipli, Goa usa
il campo nome per determinare quale definizione di errore nel design corrisponde all'errore effettivo che viene restituito. Questo permette a Goa di:
   - Applicare la corretta mappatura di trasporto (codici di stato HTTP/gRPC)
   - Generare documentazione API accurata
   - Abilitare una corretta gestione degli errori lato client

2. **Gestione del Layer di Trasporto**: Senza il campo nome, il layer di trasporto
non saprebbe quale codice di stato usare quando sono definiti errori multipli
con codici di stato diversi:
   ```go
   HTTP(func() {
       Response("div_by_zero", StatusBadRequest)        // 400
       Response("overflow", StatusUnprocessableEntity)  // 422
   })
   ```

3. **Asserzione di Tipo Lato Client**: Il campo nome permette a Goa di generare
tipi di errore specifici per ogni errore definito nel tuo design. Questi tipi generati
rendono la gestione degli errori type-safe e forniscono accesso a tutti i campi dell'errore:

Ecco un esempio che mostra come i nomi degli errori nel design devono corrispondere all'implementazione:

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        // Questi nomi ("div_by_zero" e "overflow") devono essere usati esattamente
        // nel campo nome del tipo di errore
        Error("div_by_zero", DivByZero)
        Error("overflow", NumericOverflow)
        // ... altre definizioni del metodo
    })
})

// Esempio di codice client che gestisce questi errori
res, err := client.Divide(ctx, payload)
if err != nil {
    switch err := err.(type) {
    case *calc.DivideDivByZeroError:
        // Questo errore corrisponde a Error("div_by_zero", ...) nel design
        fmt.Printf("Errore divisione per zero: %s\n", err.Message)
        fmt.Printf("Tentativo di dividere %d per zero\n", err.Dividend)
    case *calc.DivideOverflowError:
        // Questo errore corrisponde a Error("overflow", ...) nel design
        fmt.Printf("Errore di overflow: %s\n", err.Message)
        fmt.Printf("Il valore risultante %d ha superato il massimo\n", err.Value)
    case *goa.ServiceError:
        // Gestisce errori di servizio generali (validazione, ecc)
        fmt.Printf("Errore di servizio: %s\n", err.Message)
    default:
        // Gestisce errori sconosciuti
        fmt.Printf("Errore sconosciuto: %s\n", err.Error())
    }
}
```

Per ogni errore definito nel tuo design, Goa genera:
- Un tipo di errore specifico (es., `DivideDivByZeroError` per `"div_by_zero"`)
- Funzioni helper per creare e gestire questi errori
- Corretta conversione del tipo di errore nel layer di trasporto

La connessione tra design e implementazione è mantenuta attraverso i nomi degli errori:
1. Il nome usato in `Error("name", ...)` nel design
2. Il campo nome nel tuo tipo di errore deve corrispondere esattamente
3. Il tipo di errore generato sarà nominato di conseguenza (es., `MethodNameError`)

### Proprietà degli Errori

Le proprietà degli errori sono flag cruciali che informano i client sulla natura degli errori e permettono loro di implementare appropriate strategie di gestione. Queste proprietà sono **disponibili solo quando si usa il tipo predefinito `ErrorResult`** - non hanno effetto quando si usano tipi di errore personalizzati.

Le proprietà sono definite usando funzioni DSL:

- `Temporary()`: Indica che l'errore è transitorio e la stessa richiesta potrebbe avere successo se ripetuta
- `Timeout()`: Indica che l'errore si è verificato perché è stato superato un timeout
- `Fault()`: Indica un errore lato server (bug, problema di configurazione, ecc.)

Quando si usa il tipo predefinito `ErrorResult`, queste proprietà sono automaticamente mappate a campi nella struct `ServiceError` generata, abilitando una sofisticata gestione degli errori lato client:

```go
var _ = Service("calc", func() {
    // Gli errori temporanei suggeriscono al client di riprovare
    Error("db_unavailable", ErrorResult, "Database temporaneamente non disponibile")
    Temporary()  // Indica che l'errore è transitorio

    // Gli errori di timeout suggeriscono di aumentare il timeout
    Error("slow_operation", ErrorResult, "L'operazione ha impiegato troppo tempo")
    Timeout()    // Indica che l'operazione è scaduta

    // Gli errori di fault suggeriscono di segnalare il problema
    Error("internal", ErrorResult, "Errore interno del server")
    Fault()      // Indica un problema lato server
})
```

Lato client, queste proprietà possono essere utilizzate per implementare strategie di retry o di fallback:

```go
res, err := client.Calculate(ctx, payload)
if err != nil {
    switch err := err.(type) {
    case *goa.ServiceError:
        if err.Temporary() {
            // Riprova l'operazione dopo un breve ritardo
            time.Sleep(backoff)
            return retry()
        }
        if err.Timeout() {
            // Aumenta il timeout e riprova
            ctx = context.WithTimeout(ctx, longerTimeout)
            return retry()
        }
        if err.Fault() {
            // Segnala l'errore al sistema di monitoraggio
            metrics.ReportServerError(err)
        }
    }
}
```

## Mappatura dei Trasporti

Goa permette di definire come gli errori vengono tradotti in risposte specifiche per ogni trasporto supportato.

### Mappatura HTTP

Per il trasporto HTTP, puoi specificare:
- Codice di stato HTTP
- Headers personalizzati
- Corpo della risposta personalizzato

```go
var _ = Service("calc", func() {
    Error("invalid_argument")
    HTTP(func() {
        // Mappa l'errore invalid_argument a 400 Bad Request
        Response("invalid_argument", StatusBadRequest)
    })

    Error("not_found", NotFound)
    HTTP(func() {
        // Mappa not_found a 404 con headers personalizzati
        Response("not_found", StatusNotFound, func() {
            Header("reason")  // Header personalizzato
        })
    })
})
```

### Mappatura gRPC

Per il trasporto gRPC, puoi mappare gli errori ai codici di stato gRPC standard:

```go
var _ = Service("calc", func() {
    Error("invalid_argument")
    GRPC(func() {
        // Mappa l'errore a INVALID_ARGUMENT
        Response("invalid_argument", CodeInvalidArgument)
    })

    Error("not_found", NotFound)
    GRPC(func() {
        // Mappa l'errore a NOT_FOUND
        Response("not_found", CodeNotFound)
    })
})
```

## Best Practice

### 1. Usa Errori Specifici del Dominio

Definisci errori che riflettono il dominio del tuo servizio:

```go
var _ = Service("pagamenti", func() {
    Error("fondi_insufficienti", ErrorResult)
    Error("carta_scaduta", ErrorResult)
    Error("limite_superato", ErrorResult)
})
```

### 2. Includi Informazioni Contestuali

Usa tipi di errore personalizzati per fornire dettagli utili:

```go
var LimiteError = Type("LimiteError", func() {
    Description("Errore restituito quando viene superato un limite")
    Field(1, "message", String, "Messaggio di errore")
    Field(2, "limite", Float64, "Il limite superato")
    Field(3, "valore", Float64, "Il valore che ha superato il limite")
    Required("message", "limite", "valore")
})
```

### 3. Mantieni la Coerenza nelle Mappature

Usa codici di stato coerenti per errori simili:

```go
var _ = Service("api", func() {
    // Errori di validazione sempre 400
    Error("invalid_input", ErrorResult)
    HTTP(func() {
        Response("invalid_input", StatusBadRequest)
    })

    // Errori di autenticazione sempre 401
    Error("unauthorized", ErrorResult)
    HTTP(func() {
        Response("unauthorized", StatusUnauthorized)
    })

    // Errori di autorizzazione sempre 403
    Error("forbidden", ErrorResult)
    HTTP(func() {
        Response("forbidden", StatusForbidden)
    })
})
```

### 4. Documenta gli Errori

Fornisci descrizioni chiare per ogni errore:

```go
var _ = Service("api", func() {
    Error("rate_limit", ErrorResult, 
        "Restituito quando il client supera il limite di richieste permesse")
    Error("maintenance", ErrorResult,
        "Restituito durante la manutenzione pianificata del sistema")
})
```

### 5. Usa le Proprietà degli Errori Appropriatamente

Applica le proprietà degli errori in modo significativo:

```go
var _ = Service("api", func() {
    // Errori che potrebbero risolversi da soli
    Error("rate_limit")
    Temporary()  // Il client può riprovare più tardi

    // Errori che richiedono intervento
    Error("config_invalid")
    Fault()      // Richiede attenzione dell'operatore

    // Errori di timeout
    Error("database_slow")
    Timeout()    // Il client può riprovare con timeout più lungo
})
```

## Conclusione

La gestione degli errori efficace è cruciale per costruire API robuste e facili da usare. Goa fornisce un sistema completo che ti permette di:

- Definire errori chiari e specifici del dominio
- Includere informazioni contestuali utili
- Mappare gli errori appropriatamente sui diversi trasporti
- Generare documentazione completa
- Abilitare una gestione degli errori type-safe lato client

Nei prossimi capitoli, esploreremo come propagare questi errori attraverso i layer del servizio e come serializzarli in modo efficace.