+++
title = "Gestione degli errori"
weight = 3

[menu.main]
name = "Gestione degli errori"
parent = "design"
+++

Goa rende possibile descrivere gli errori che i servizi potrebbero ritornare.
Da questa descrizione Goa puo generare sia il codice che la documentazione. Il codice
fornisce sia la logica di serializzazione che di deserializzazione specifica per il tipo 
di protocollo di trasporto usato.
Gli errori hanno un nome, un tipo che può essere primitivo o definito dall'utente e
una descrizione, la quale è usata per generare commenti e documentazione.

Questo documento descrive come definire errori nei file di design di Goa e come sfruttare
il codice generato per ritornare errori dai service moethods.

## Design

Il DSL di Goa rende possibile definire errori all'interno dei metodi o globalmente
ai servizi attraverso l'espressione [Error](https://pkg.go.dev/goa.design/goa/v3/dsl#Error):

```go
var _ = Service("divider", func() {
    // L'errore "DivByZero" è definito a livello di servizio
    // quindi può essere ritornato sia da "divide" che da "integral_divide".
    Error("DivByZero", func() {
        Description("DivByZero is the error returned by the service methods when the right operand is 0.")
    })

    Method("integral_divide", func() {
        // L'errore "HasRemainder" è definito a livello di service method
        // pertanto è specifico di "integral_divide".
        Error("HasRemainder", func() {
            Description("HasRemainder is the error returned when an integer division has a remainder.")
        })
        // ...
    })

    Method("divide", func() {
        // ...
    })
})
```

In questo esempio sia `DivByZero` che `HasRemainder` usano il tipo di default per gli errori,
chiamato [ErrorResult](https://pkg.go.dev/goa.design/goa/v3/expr#pkg-variables).
Questo tipo ha i seguenti campi:

* `Name` è il nome dell'errore. Il codice generato si prende carico di inizializzare il campo con 
  il nome definito in fase di design durante la deserializzazione della risposta.
* `ID` è l'identificatore univoco per un'istanza specifica dell'errore. L'idea è che tale ID sia
  costruibile, rendendo possibile la correlazione con una richiesta (o un utente) in un servizio
  di log o error tracing.
* `Message` è il messaggio di errore.
* `Temporary` indica se l'errore è considerato temporaneo.
* `Timeout` indica se l'errore è causato da un timeout.
* `Fault` indica se l'errore è causato da un problema nel server.

Il DSL rende possibile di specificare quando un errore denota una condizione 
temporanea e/o un timeout o un problema server-side.

```go
Error("network_failure", func() {
    Temporary()
})

Error("timeout"), func() {
    Timeout()
})

Error("remote_timeout", func() {
    Temporary()
    Timeout()
})

Error("internal_error", func() {
    Fault()
})
```

Il codice generato si occupa di inizializzare `ErrorResult` con i campi
`Temporary`, `Timeout` e `Fault` appropriatamente, durante la creazione della
error response.

## Progettare le error response

La funzione [Response](https://pkg.go.dev/goa.design/goa/v3/dsl#Response) rende possibile
la definizione di logiche delle risposte HTTP/gRPC associate a un determinato errore.

```go
var _ = Service("divider", func() {
    Error("DivByZero")
    HTTP(func() {
        // Usa lo status HTTP 400 Bad Request per gli errori 
        // "DivByZero".
        Response("DivByZero", StatusBadRequest)
    })
    GRPC(func() {
        // Usa il gRPC status code "InvalidArgument" per l'errore
        // "DivByZero".
        Response("DivByZero", CodeInvalidArgument)
    })

    Method("integral_divide", func() {
        Error("HasRemainder")
        HTTP(func() {
            Response("HasRemainder", StatusExpectationFailed)
            // ...
        })
        GRPC(func() {
          Response("HasRemainder", CodeUnknown)
        })
    })
    // ...
})
```

## Return Errors

Dato il design del servizio `divider` qui usato come esempio, Goa genera due 
helper functions che costruiscono i corrispondenti errori: `MakeDivByZero` e
`MakeHasRemainder`. Tali funzioni accettano un go error come parametro, 
rendendo conveniente mappare gli errori della logica di business in specifici
oggetti ErrorResult.

Ecco un esempio di come un implementazione di `integral_divide` potrebbe essere:

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *dividersvc.IntOperands) (int, error) {
    if p.B == 0 {
        // Usa la funzione generata per creare un ErrorResult
        return 0, dividersvc.MakeDivByZero(fmt.Errorf("right operand cannot be 0"))
    }
    if p.A%p.B != 0 {
        return 0, dividersvc.MakeHasRemainder(fmt.Errorf("remainder is %d", p.A%p.B))
    }

    return p.A / p.B, nil
}
```

Ed è fatta! Dato ciò, goa conosce come inizializzare un `ErrorResult` usando 
il go error fornito per inizializzare il campo Message e tutti gli altri campi
usando le informazioni fornite nel file di design. Il codice per il protocollo
di trasporto viene anch'esso generato e comprende i codici di stato HTTP/gRPC 
come definiti nel Response DSL.

Usa il client da riga di comando generato per verificare:

```bash
./dividercli -v divider integer-divide -a 1 -b 2
> GET http://localhost:8080/idiv/1/2
< 417 Expectation Failed
< Content-Length: 68
< Content-Type: application/json
< Date: Thu, 22 Mar 2018 01:34:33 GMT
{"name":"HasRemainder","id":"dlqvenWL","message":"remainder is 1"}
```

## Uso di tipi di errore personalizzati

Il DSL `Error` permette di specificare un tipo di errore per l'error result
specificato, sovrascrivendo il default (corrispondente a `ErrorResult`).
Qualunque tipo può essere usato per dare forma all'error result.
Ecco un esempio di come usare una stringa come tipo di errore di ritorno:

```go
Error("NotFound", String, "NotFound is the error returned when there is no bottle with the given ID.")
```

Nota come la descrizione può essere deifnita inline quando il tipo viene
definito esplicitamente. Il tipo può essere `ErrorResult`, il che rende possibile
definire la descrizione inline anche in quel caso.

Tuttavia ci sono un paio di cose a cui fare attenzione quando si usano tipi di 
errore personalizzati:

* Le espressioni `Temporary`, `Timeout`, e `Fault` non hanno effetto sul codice
   generato in questo caso, poiché setterebbero automaticamente i rispettivi campi,
   ma solo sulla struct `ErrorResult`.

* Se il tipo personalizzato è definito dall'utente e se è usato per definire
   errori multipli sullo stesso metodo, allora goa deve essere informato su
   quale attributo contiene il nome dell'errore. Il valore di tale attributo
   viene confrontato con i nomi degli errori definiti in fase di design dal 
   codice di serializzazione/deserializzazione per inferire le corrette proprietà
   di codifica (es. HTTP status code). 
   L'attributo viene identificato usando lo special tag `struct:error:name`, il quale
   deve essere una stringa e deve essere obbligatorio:

```go
var InsertConflict = ResultType("application/vnd.service.insertconflict", func() {
    Description("InsertConflict is the type of the error values returned when insertion fails because of a conflict")
    Attributes(func() {
        Attribute("conflict_value", String)
        Attribute("name", String, "name of error used by goa to encode response", func() {
            Meta("struct:error:name")
        })
        Required("conflict_value", "name")
    })
    View("default", func() {
        Attribute("conflict_value")
        // Nota: error_name viene omesso dalla default view.
        // In questo esempio error_name è un attributo usato per identificare
        // il campo contenente il nome dell'errore e non è
        // serializzato nella risposta al client.
    })
})
```

* I tipi definiti dall'utente che definiscono errori personalizzati non possono avere un attributo
   chiamato `error_name`, dato che il codice generato crea una funzione chiamata `ErrorName` sulla
   error struct.
