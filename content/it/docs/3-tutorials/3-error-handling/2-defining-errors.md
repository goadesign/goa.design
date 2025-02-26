---
title: Definire gli Errori
linkTitle: Definire gli Errori
weight: 2
description: "Padroneggia l'arte di definire errori a livello di servizio e di metodo in Goa usando il suo DSL, inclusi i tipi di errore personalizzati e le definizioni di errore riutilizzabili."
---

Goa fornisce un modo flessibile e potente per definire gli errori all'interno dei tuoi
design di servizio. Sfruttando il Linguaggio Specifico di Dominio (DSL) di Goa, puoi specificare
errori sia a livello di servizio che di metodo, personalizzare i tipi di errore e assicurare
che la tua API comunichi i fallimenti in modo chiaro e coerente attraverso diversi
trasporti come HTTP e gRPC.

## Errori a Livello di Servizio

Gli errori a livello di servizio sono definiti nell'ambito del servizio e possono essere restituiti da qualsiasi
metodo all'interno del servizio. Questo è utile per errori che sono comuni tra
più metodi.

### Esempio

```go
var _ = Service("divider", func() {
    // L'errore "DivByZero" è definito a livello di servizio e
    // quindi può essere restituito sia da "divide" che da "integral_divide".
    Error("DivByZero", func() {
        Description("DivByZero è l'errore restituito dai metodi del servizio quando l'operando destro è 0.")
    })

    Method("integral_divide", func() {
        // Definizioni specifiche del metodo...
    })

    Method("divide", func() {
        // Definizioni specifiche del metodo...
    })
})
```

In questo esempio, definiamo un errore a livello di servizio chiamato `DivByZero` che può
essere utilizzato da qualsiasi metodo all'interno del servizio `divider`. Questo è particolarmente utile
per condizioni di errore comuni che potrebbero verificarsi in più metodi, come
le operazioni di divisione per zero in questo caso.

## Errori a Livello di Metodo

Gli errori a livello di metodo sono definiti nell'ambito di un metodo specifico e sono
applicabili solo a quel metodo. Questo permette una gestione degli errori più granulare
adattata alle singole operazioni.

### Esempio

```go
var _ = Service("divider", func() {
    Method("integral_divide", func() {
        // L'errore "HasRemainder" è definito a livello di
        // metodo ed è quindi specifico per "integral_divide".
        Error("HasRemainder", func() {
            Description("HasRemainder è l'errore restituito quando una divisione intera ha un resto.")
        })
        // Definizioni aggiuntive del metodo...
    })

    Method("divide", func() {
        // Definizioni specifiche del metodo...
    })
})
```

In questo esempio, definiamo un errore a livello di metodo chiamato `HasRemainder` che è
specifico per il metodo `integral_divide`. Questo errore verrebbe utilizzato quando
l'operazione di divisione risulta in un resto, che è particolarmente rilevante per
le operazioni di divisione intera.

## Definizioni di Errore Riutilizzabili

Goa permette di riutilizzare le definizioni di errore tra più servizi e metodi.
Questo è particolarmente utile per definire errori comuni che sono utilizzati in più
parti della tua API. Tali definizioni devono apparire nel DSL `API`:

### Esempio

```go
var _ = API("example", func() {
    Error("NotFound", func() {
        Description("La risorsa non è stata trovata nel sistema.")
    })
    HTTP(func() {
        Response("NotFound", StatusNotFound)
    })
    GRPC(func() {
        Response("NotFound", CodeNotFound)
    })
})

var _ = Service("example", func() {
    Method("get", func() {
        Payload(func() {
            Field(1, "id", String, "L'ID del concerto da ottenere.")
        })
        Result(Concert)
        Error("NotFound")
        HTTP(func() {
            GET("/concerts/{id}")
        })
        GRPC(func() {})
    })
})
```

In questo esempio, definiamo un errore riutilizzabile chiamato `NotFound` che può essere utilizzato
da qualsiasi metodo all'interno del servizio `example`. Questo errore è definito nel DSL
`API` ed è quindi disponibile per tutti i servizi e metodi all'interno dell'API. L'errore
`NotFound` è mappato sul codice di stato HTTP `404` e sul codice di stato gRPC
`NotFound`, questa mappatura viene fatta nel DSL `API` e non deve essere
ripetuta nei DSL `Service` o `Method`.

## Tipi di Errore Personalizzati e Descrizioni

Il DSL Error in Goa fornisce diversi modi per personalizzare come gli errori sono definiti e
documentati. Puoi specificare descrizioni, stato temporaneo/permanente e persino
definire strutture di risposta personalizzate.

### Definizione Base di Errore

La forma più semplice di definizione di errore include un nome e una descrizione:

```go
Error("NotFound", func() {
    Description("La risorsa non è stata trovata nel sistema.")
})
```

La definizione sopra è equivalente a:

```go
Error("NotFound", ErrorResult, "La risorsa non è stata trovata nel sistema.")
```

Il tipo predefinito per gli errori è `ErrorResult` che viene mappato sul tipo
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError)
nel codice generato.

### Temporary, Timeout e Fault

Puoi indicare se un errore è temporaneo, un timeout o un fault - o qualsiasi
combinazione di questi usando le funzioni `Temporary`, `Timeout` e `Fault`:

```go
Error("ServiceUnavailable", func() {
    Description("Il servizio è temporaneamente non disponibile.")
    Temporary()
})

Error("RequestTimeout", func() {
    Description("La richiesta è scaduta.")
    Timeout()
})

Error("InternalServerError", func() {
    Description("Errore interno del server.")
    Fault()
})
```

I client possono quindi cercare i campi corrispondenti dall'oggetto
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError) per
determinare se l'errore è temporaneo, un timeout o un fault.

> Nota: questo è supportato solo per gli errori `ErrorResult` per i quali il tipo runtime
> è [ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError).

### Tipi di Errore Personalizzati

Goa rende anche facile progettare tipi di errore personalizzati, per esempio:

```go
Error("ValidationError", DivByZero, "DivByZero è l'errore restituito quando si usa il valore 0 come divisore.")
```

Questo esempio assume che `DivByZero` sia un tipo di errore personalizzato definito altrove
nel file, per esempio:

```go
var DivByZero = Type("DivByZero", func() {
    Field(1, "name", String, "Il nome dell'errore.", func() {
        Meta("struct:error:name")
    })
    Field(2, "message", String, "Il messaggio di errore.")
    Required("name", "message")
})
```

Queste definizioni di errore possono essere utilizzate sia a livello di servizio che di metodo, fornendo
flessibilità in come strutturi la gestione degli errori della tua API. Il DSL Error
si integra con la generazione del codice di Goa per produrre risposte di errore coerenti
attraverso diversi protocolli di trasporto.

Vedi [Tipi di Errore](../3-error-types) per maggiori dettagli sui tipi di errore personalizzati.

## Riepilogo

Definire gli errori in Goa è un processo semplice che si integra perfettamente
con il design del tuo servizio. Utilizzando definizioni di errore a livello di servizio e di metodo,
sfruttando il tipo ErrorResult predefinito o creando tipi di errore personalizzati,
puoi assicurarti che le tue API gestiscano i fallimenti con grazia e li comunichino
efficacemente ai client. Definizioni di errore appropriate non solo migliorano la
robustezza dei tuoi servizi ma migliorano anche l'esperienza dello sviluppatore
fornendo meccanismi di gestione degli errori chiari e coerenti. 