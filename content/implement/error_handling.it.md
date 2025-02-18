+++
date = "2020-11-21T11:01:06-05:00"
title = "Gestione degli Errori"
weight = 4

[menu.main]
name = "Gestione degli Errori"
parent = "implement"
+++

## Panoramica

Goa rende possibile descrivere con precisione i potenziali errori ritornati
dai vari service methods. Ciò permette di definire un contratto chiaro fra server e clients,
che viene riflesso nel codice e nella documentazione generata.

Goa ha un approccio "tutto incluso" dove gli errori possono essere definiti
con una informazione minimale quale può essere semplicemente un nome.
Tuttavia il DSL permette anche la definizione di nuovi tipi di errori qualora
quelli definiti di default da Goa non risultino sufficienti.

## Definire gli errori

Gli errori sono definiti attraverso la funzione
[Error](https://pkg.go.dev/goa.design/goa/v3/dsl#Error):

```go
var _ = Service("calc", func() {
    Error("invalid_arguments")
})
```

Gli errori possono anche essere definiti con uno scope specifico per un singolo
metodo:

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(1, "divisor", Int)
            Required("dividend", "divisor")
        })
        Result(func() {
            Field(1, "quotient", Int)
            Field(2, "reminder", Int)
            Required("quotient", "reminder")
        })
        Error("div_by_zero") // Errore specifico per il metodo
    })
})
```

Sia l'errore `invalid_arguments` che `div_by_zero` nell'esempio fanno uso 
del tipo di errore di default
[ErrorResult](https://pkg.go.dev/goa.design/goa/v3/expr#ErrorResult).

Possono essere anche usati tipi Custom per definire gli errori, nel seguente modo:

```go
var DivByZero = Type("DivByZero", func() {
        Description("DivByZero è l'errore ritornato quando si usa 0 come divisore.")
        Field(1, "message", String, "Dividere per 0 fa infinito.")
        Required("message")
})

var _ = Service("calc", func() {
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(1, "divisor", Int)
            Required("dividend", "divisor")
        })
        Result(func() {
            Field(1, "quotient", Int)
            Field(2, "reminder", Int)
            Required("quotient", "reminder")
        })
        Error("div_by_zero", DivByZero, "Divisione per zero") // Usa il tipo di errore DivByZero
    })
})
```

Se un tipo è usato per definire più errori diversi deve definire un attributo che
contiene il nome dell'errore, di modo che il codice generato possa inferire
la definizione di design corrispondente. La definizione deve essere identificata tramite lo struct tag
`struct:error:name` 
[metadata](https://pkg.go.dev/goa.design/goa/v3/dsl#Meta), per esempio:

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZero è l'errore ritornato quando si usa 0 come divisore.")
    Field(1, "message", String, "Dividere per 0 fa infinito.")
    Field(2, "name", String, "Nome dell'errore", func() {
        // Dice a Goa di usare il campo `name`per identificare la definizione
        // dell'errore.
        Meta("struct:error:name")
    })

    Required("message", "name")
})
```

Il campo deve essere inizializzato dal codice nel server che ritorna quell'errore.
Il codice generato lo userà per corrispondenza con la definizione dell'errore stesso
e restituire il corretto status code.

### Temporary Errors, Faults e Timeouts

La funzione `Error` accetta un DSL opzionale come ultimo argomento che rende
possibile specificare proprietà eventuali sull'errore. La funzione DSL `Error`
accetta 3 funzioni figlie:

* `Timeout()` Identifica l'errore come frutto di un timeout del server.
* `Fault()` Identifica l'errore come un problema server side (es. un bug, un panic ecc...).
* `Temporary()` Identifica l'errore come temporaneo (e di conseguenza la richiesta collegata è riprovabile).

La seguente definizione è appropriata per definire un errore di timeout:

```go
Error("Timeout", ErrorResult, "Il timeout della richiesta è stato superato", func() {
    Timeout()
})
```

Le funzioni `Timeout`, `Fault` e `Temporary` istruiscono il generatore Goa ad
inizializzare correttamente i campi con lo stesso nome all'interno della
`ErrorResponse`. Non hanno effetti (a parte la documentazione) quando usati
su un errore custom.

### Mappare gli errori agli status code del Trasporto

La funzione [Response](https://pkg.go.dev/goa.design/goa/v3/dsl#Response)
definisce gli status code HTTP o gRPC che verranno usati per descrivere l'errore:

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
        Error("div_by_zero")
        HTTP(func() {
            POST("/")
            Response("div_by_zero", StatusBadRequest, func() { 
                // Usa il codice di stato HTTP 400 (BadRequest) per gli errori "div_by_zero"
                Description("Response usata per gli errori DivByZero")
            })
        })
        GRPC(func() {
            Response("div_by_zero", CodeInvalidArgument, func() {
                // Usa il codice di stato gRPC 3 (InvalidArgument) per gli errori "div_by_zero"
                Description("Response used for division by zero errors")
            })
        })
    })
})
```

## Produrre Errori

### Usando l'error type di Default

Con il design definito sopra Goa genera una helper function `MakeDivByZero`
che il codice del server può usare per restituire errori. La funzione è generata
nel package specifico del servizio (sotto `gen/calc` in questo esempio).
Accetta un Go error come parametro:

```go
// Code generated by goa v....
// ...

package calc

// ...

// MakeDivByZero builds a goa.ServiceError from an error.
func MakeDivByZero(err error) *goa.ServiceError {
	return &goa.ServiceError{
		Name:    "div_by_zero",
		ID:      goa.NewErrorID(),
		Message: err.Error(),
	}
}

// ...
```

Questa funzione può essere usata come segue per implementare la funzione `Divide`:

```go
func (s *calcsrvc) Divide(ctx context.Context, p *calc.DividePayload) (res *calc.DivideResult, err error) {
    if p.Divisor == 0 {
        return nil, calc.MakeDivByZero(fmt.Errorf("cannot divide by zero"))
    }
    // ...
}
```

Le funzioni `MakeXXX` generate creano istanze del tipo
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError).

### Usando error type personalizzati

Quando si usano tipi personalizzati per definire errori in Goa, non vengono generate le
helper functions in quando il generatore Goa non ha una maniera per mappare go errors e
i tipi generati corrispondenti. In questo caso il metodo deve istanziare l'errore 
direttamente.
Sfruttando l'esempio precedente e usando il tipo `DivByZero`:

```go
Error("div_by_zero", DivByZero, "Division by zero") // Usa DivByZero per la definizione dell'errore
```

Per ritornare l'errore l'implementazione del metodo deve ritornare un'istanza
della struct `DivByZero`, sempre presente nel service package (`calc`
in questo esempio):

```go
func (s *calcsrvc) Divide(ctx context.Context, p *calc.DividePayload) (res *calc.DivideResult, err error) {
    if p.Divisor == 0 {
        return nil, &calc.DivByZero{Message: "cannot divide by zero"}
    }
    // ...
}
```

## Consumare gli errori

Gli error values ritornati al client sono costruiti dalle stesse struct usate dal
server che ritorna gli errori stessi.

### Con il tipo di errore di default

Se l'errore usa la definizione di default allora tali errori sono istanze
di [ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError):

```go
// ... inizializza endpoint, ctx, payload
c := calc.NewClient(endpoint)
res, err := c.Divide(ctx, payload)
if res != nil {
    if dbz, ok := err.(*goa.ServiceError); ok {
        // usa dbz per gestire l'errore
    }
}
// ...
```

### Con tipi di errore personalizzati

Se l'errore ha una definizione di tipo personalizzata allora l'errore client
side è la stessa struct personalizzata:

```go
// ... inizializza endpoint, ctx, payload
c := calc.NewClient(endpoint)
res, err := c.Divide(ctx, payload)
if res != nil {
    if dbz, ok := err.(*calc.DivByZero); ok {
        // usa dbz per gestire l'errore
    }
}
// ...
```
 
## Validazione degli errori

Gli errori di validazione sono essi stessi struct
[ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError).
Il campo `name` della struct rende possibile per il codice del client di
differenziare i diversi tipi di errore.

Qui un esempio di come farlo, che assume che il design usi il tipo di errore
di default per definire l'errore `div_by_zero`:

```go
// ... inizializza endpoint, ctx, payload
c := calc.NewClient(endpoint)
res, err := c.Divide(ctx, payload)
if res != nil {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
            case "missing_field":
                // Gestire l'errore missing operand qui
            case "div_by_zero":
                // Gestire l'errore division by zero qui
            default:
                // Gestire gli altri possibili errori qui
        }
    }
}
// ...
```

Gli errori di validatione sono tutti definiti nel file 
[error.go](https://github.com/goadesign/goa/blob/v3/pkg/error.go), e sono:

* `missing_payload`: prodotto quando alla richiesta manca un payload richiesto.
* `decode_payload`: prodotto quando il body della richiesta non può essere decodificato con successo.
* `invalid_field_type`: prodotto quando un campo non è dello stesso tipo definito nel corrispettivo design.
* `missing_field`: prodotto quando il payload non possiede un campo richiesto.
* `invalid_enum_value`: prodotto quando il valore di un campo nel payload non corrisponde all'enum definito nel design (Enum).
* `invalid_format`: prodotto quando il campo nel payload non passa i check di formato del design (Format).
* `invalid_pattern`: prodotto quando il valore di un campo nel payload non passa i check del pattern regexp specificato nel design (Pattern).
* `invalid_range`: prodotto quando il valore del campo nel payload non è nel range specificato nel design (es. Minimum, Maximum).
* `invalid_length`: prodotto quando il valore del campo non rispetta i requiditi di lunghezza specificati nel design (es. MinLength, MaxLength).

## Sovrascrivere la serializzazione degli errori

Qualche volta è necessario sovrascrivere il formato usato dal codice generato
per validare gli errori. L'handler HTTP e il codice di creazione del server generati
permettono di passare un error formatter personalizzato come parametro:

```go
// Code generated by goa v...

package server

// ...

// New instantiates HTTP handlers for all the calc service endpoints using the                                                                                                                
// provided encoder and decoder. The handlers are mounted on the given mux                                                                                                                    
// using the HTTP verb and path defined in the design. errhandler is called                                                                                                                   
// whenever a response fails to be encoded. formatter is used to format errors
// returned by the service methods prior to encoding. Both errhandler and                                                                                                                     
// formatter are optional and can be nil.                                                                                                                                                     
func New(                                                                                                                                                                                     
        e *calc.Endpoints,                                                                                                                                                                    
        mux goahttp.Muxer,
        decoder func(*http.Request) goahttp.Decoder,                                                                                                                                          
        encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,                                                                                                                   
        errhandler func(context.Context, http.ResponseWriter, error),                                                                                                                         
        formatter func(context.Context, err error) goahttp.Statuser,  // Error formatter function
// ...
```

La funzione fornita deve accettare una istanza di un error come parametro e 
restituire una struct che implementa l'interfaccia
[Statuser](https://pkg.go.dev/goa.design/goa/v3/http#Statuser):

```go
type Statuser interface {
    // StatusCode return the HTTP status code used to encode the response
    // when not defined in the design.
    StatusCode() int
}
```

Il codice generato chiama il metodo `StatusCode` della struct quando deve scrivere
la response HTTP e usa il suo valore di ritorno per scrivere il codice di stato HTTP.
La struct viene poi serializzata nel response body.

L'implementazione di default usata quando il valore `nil` è passato come parametro
`formatter` nella funzione `New` function è
[NewErrorResponse](https://pkg.go.dev/goa.design/goa/v3/http#NewErrorResponse)
che ritorna una istanza di
[ErrorResponse](https://pkg.go.dev/goa.design/goa/v3/pkg#ErrorResponse).

### Sovrascrivere gli errori di validazione della serializzazione

Un formatter custom può ispezionare l'errore in maniera simile a come fa un 
qualsiasi codice client quando gestisce errori differenti, per esempio:

```go
// missingFieldError è il tipo usato per serializzare gli errori di campo obbligatorio
// mancante. Sovrascrive il default fornito da Goa.
type missingFieldError string

// StatusCode restituisce 400 (BadRequest).
func (missingFieldError) StatusCode() int { return http.StatusBadRequest }

// customErrorResponse converte err in un errore MissingField error se err corrisponde
// a un errore di tipo missing required field.
func customErrorResponse(ctx context.Context, err error) Statuser {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
            case "missing_field":
                return missingFieldError(serr.Message)
            default:
                // Usa il default di Goa
                return goahttp.NewErrorResponse(err)
        }
    }
    // Usa il default di Goaper tutti gli altri errori
    return goahttp.NewErrorResponse(err)
}
```

Questo formatter personalizzato può essere usato per istanziare un server HTTP o un handler:

```go
var (
    calcServer *calcsvr.Server
)
{
    eh := errorHandler(logger)
    calcServer = calcsvr.New(calcEndpoints, mux, dec, enc, eh, customErrorResponse)
    // ...
```

## Esempio

L'esempio sulla [gestione degli errori](https://github.com/goadesign/examples/tree/master/error)
mostra come usare tipi di errore personalizzati e come sovrascrivere la error response
predefinita per gli errori di validazione.

