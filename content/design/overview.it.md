+++
title = "Panoramica generale"
weight = 1

[menu.main]
name = "Panoramica generale"
parent = "design"
+++

La seguente sezione descrive come usare il DSL goa per descrivere servizi.
Essi forniscono una panoramica dei concetti chiave. Revisiona le 
[GoDocs](https://godoc.org/goa.design/goa/dsl) per una reference completa.

## L'espressione API

L'espressione [API](https://godoc.org/goa.design/goa/dsl#API) è un DSL di 
primo livello opzionale che lista le proprietà globali di una API come nome,
descrizione e numero di versione. `API` può definire uno o più
[Servers](https://godoc.org/goa.design/goa/dsl#Server), esponendo set differenti
di servizi.
Un singolo servizio può essere esposto da un qualunque numero (o nessun) server.
Se `Server` è omesso allora un singolo server di default viene automaticamente
definito ed espone tutti i servizi esplicitati nel design.
L'espressione `Server` è usata quando si generano client da riga di comando o 
specifiche OpenAPI.

```go
var _ = API("calc", func() {
    Title("Calculator Service")
    Description("A service for multiplying numbers, a goa teaser")

    // Server descrive un singolo processo che ascolta le richieste dai client. Il DSL
    // definisce una serie di servizi che il server ospita, così come tutti i dettagli
    // degli host.
    Server("calc", func() {
        Description("calc hosts the Calculator Service.")

        // Lista dei servizi hostati dal server.
        Services("calc")

        // Lista degli Host e i loro URL di trasporto.
        Host("development", func() {
            Description("Development hosts.")
            // URL di trasporto specifici, gli schemi supportati sono:
            // 'http', 'https', 'grpc' and 'grpcs' con le rispettive porte
            // di default: 80, 443, 8080, 8443.
            URI("http://localhost:8000/calc")
            URI("grpc://localhost:8080")
        })

        Host("production", func() {
            Description("Production hosts.")
            // Gli URI possono essere parametrizzati usando la notazione {param}.
            URI("https://{version}.goa.design/calc")
            URI("grpcs://{version}.goa.design")

            // Variable descrive una URI variable.
            Variable("version", String, "API version", func() {
                // Gli URL parameters devono avere un valore di default o
                // una enumerazione.
                Default("v1")
            })
        })
    })
})
```

## L'espressione Service

La funzione [Service](https://godoc.org/goa.design/goa/dsl#Service) definisce un
gruppo di methods. Questo, a sua volta, si mappa con le risorse REST o con una
[service declaration](https://grpc.io/docs/guides/concepts.html#service-definition)
in gRPC. Un servizio può definire risposte di errore comuni a tutti i service methods.
Vedi l'argomento [Gestione degli errori](/design/handling_errors/) per saperne di più.

```go
var _ = Service("calc", func() {
    Description("The calc service performs operations on numbers")

    // Method descrive un service method (endpoint)
    Method("multiply", func() {
        // Payload descrive il payload del metodo.
        // In questo caso, esso consiste di due campi.
        Payload(func() {
            // Field descrive un campo di un oggetto, dato un indice,
            // un nome, un tipo e una descrizione.
            Field(1, "a", Int, "Left operand")
            Field(2, "b", Int, "Right operand")
            // Required elenca i nomi dei campi obbligatori.
            Required("a", "b")
        })

        // Result descrive il risultato della chiamata del metodo.
        // In questo caso è un semplice valore intero.
        Result(Int)

        // HTTP descrive il mapping per il protocollo HTTP.
        HTTP(func() {
            // Le richieste al servizio in questo caso consistono 
            // in richieste HTT GET. I campi del payload sono
            // codificati come path parameters.
            GET("/multiply/{a}/{b}")
            // Le risposte qui usano uno status HTTP "200 OK".
            // Il risultato è codificato nel body (default).
            Response(StatusOK)
        })

        // GRPC descrive il mapping per il protocollo gRPC.
        GRPC(func() {
            // Le risposte qui usano un codice gRPC "OK".
            // Il risultato è codificato nel messaggio di risposta (default).
            Response(CodeOK)
        })
    })

    // Files fornisce i file statici con il path relativo ./gen/http/openapi.json per
    // le richieste mandate a /swagger.json.
    Files("/swagger.json", "./gen/http/openapi.json")
})
```

## L'espressione Method

I service methods sono descritti usando la funzione [Method](https://godoc.org/goa.design/goa/dsl#Method).
Tale funzione definisce il payload (input) e il risultato (output). Può anche
elencare un numero arbitrario di error values. Un error ha un nome e opzionalmente
un tipo.
Omettere il payload o il result ha lo stesso effetto che mapparli usando il 
tipo built-in `Empty`, il quale mappa su un body vuoto in HTTP e al messaggio
`Empty` in gRPC.
Omettere un error type ha lo stesso effetto che usare quello di default [ErrorResult](https://godoc.org/goa.design/goa/expr#ErrorResult).

```go
Method("divide", func() {
    Description("Divide returns the integral division of two integers.")
    Payload(func() {
        Attribute("a", Int, "Left operand")
        Attribute("b", Int, "Right operand")
        Required("a", "b")
    })
    Result(Int)

    // Error definisce un error result.
    Error("DivByZero")

    HTTP(func() {
        GET("/div/{a}/{b}")
        // Lo status di errore per il tipo "DivByZero"
        // corrisponde al 400 Bad Request.
        // La risposta di default per le richieste senza
        // errori è invece 200 OK.
        Response("DivByZero", StatusBadRequest)
    })

    GRPC(func() {
        // Il codice gRPC per l'errore "DivByZero" è 3
        // (INVALID_ARGUMENT).
        // La risposta di default per le richeiste senza
        // errori è 0 OK.
        Response("DivByZero", CodeInvalidArgument)
    })
})
```

I tipi del payload, del risultato o degli errori definiscono input e output
del metodo *indipendentemente dal protocollo di trasporto*. In altre parole, i 
tipi di payload e risultato devono includere tutti i campi che sono obbligatori
per la logica di business, includendo anche quelli mappati a header HTTP, URL
parameters, eccetera.

### L'espressione gRPC

La funzione [gRPC](https://godoc.org/goa.design/goa/dsl#GRPC) definisce il
mapping fra payload e risultato a messaggio e metadata gRPC.

```go
    Method("update", func() {
        Description("Change account name")
        Payload(UpdateAccount)
        Result(Empty)
        Error("NotFound")
        Error("BadRequest")

        // Protocollo di trasporto gRPC.
        GRPC(func() {
            Response("NotFound", CodeNotFound)
            Response("BadRequest", CodeInvalidArgument)
        })
    })
```

### L'espressione HTTP

La funzione [HTTP](https://godoc.org/goa.design/goa/dsl#HTTP) definisce il 
mapping fra payload e risultato per tutti i tipi collegati a campi di richieste
HTTP, ad esempio request path, query string e, ovviamente, il corpo di richiesta
e risposta. La funzione `HTTP` definisce anche proprietà specifiche per il 
protocollo, fra le quali request path e codici di stato HTTP.

```go
    Method("update", func() {
        Description("Change account name")
        Payload(UpdateAccount)
        Result(Empty)
        Error("NotFound")
        Error("BadRequest")

        // Protocollo di trasporto HTTP
        HTTP(func() {
            PUT("/{accountID}")    // "accountID" UpdateAccount attribute
            Body(func() {
                Attribute("name")  // "name" UpdateAccount attribute
                Required("name")
            })
            Response(StatusNoContent)
            Response("NotFound", StatusNotFound)
            Response("BadRequest", StatusBadRequest)
        })
    })
```

### Il tipo di un Payload in un Method

Nell'esempio precedente `accountID` definisce un path parameter all'interno del tipo 
`UpdateAccount`. Il corpo della richiesta HTTP è definito come oggetto che contiene
l'attributo `name` del tipo del payload `UpdateAccount`.

Qualunque attributo non esplicitamente mappato nella funzione `HTTP` viene incluso
nel corpo della rchiesta in modo implicito. Questo rende semplice definire dei 
mappings laddove solo uno dei campi all'interno del payload è mappato in un header
HTTP ad esempio.

Gli attributi del corpo della richiesta possono anche essere elencati esplicitamente
usando la funzione `Body`. Tale funzione accetta sia un DSL che elenca gli attributi
o un payload type che definisce il corpo tutto in una volta.
La seconda permette di usare tipi arbitrari per definire il corpo della richiesta
come (array e map per esempio).

Ecco un esempio di HTTP mapping che definisce la forma del corpo della richiesta
in maniera implicita:

```go
HTTP(func() {
    PUT("/{accountID}")       // l'attributo "accountID" del payload.
    Response(StatusNoContent) // Tutti gli altri attributi sono mappati nel
                              // corpo della richiesta.
})
```

Qui invece un esempio che usa il nome di un payload type per definire il 
corpo della richiesta:

```go
HTTP(func() {
    PUT("/")
    Body("names") // Assume che il payload type abbia 
                  // un attributo "names"
    Response(StatusNoContent)
})
```

### Method Result Type

Mentre i servizi possono solamente definire una espressione `HTTP` può 
definire risposte multiple. Ogni resposta definisce a sua volta un codice
di stato HTTP, corpo della risposta e (se presenti) header HTTP. Il DSL `Tag`
rende possibile definire un attributo di un result type che viene usato per 
decidere quale risposta HTTP inviare. La funzione specifica il nome di un 
attributo del result type e il valore che tale attributo deve avere per 
la risposta nella quale il tag stesso è definito e usato per scrivere la
risposta HTTP.

Di default, la forma del corpo della risposta HTTP con codice di stato 200
è descritta dal result type del metodo. La funzione `HTTP` può opzionalmente
usare attributi di un result type per definire degli header della risposta.
Qualunque attributo non esplicitamente usato per definire un header della
risposta viene implicitamente aggiunto al body della stessa. 
Questo alleggerisce dalla necessità di riscrivere tutti gli altri attributi 
del result type per definire il corpo della risposta, dato che nella 
maggior parte dei casi solo alcuni campi vengono mappati a degli header.

Il corpo della risposta può anche essere definito esplicitamente usando la
funzione `Body`. Essa funziona in maniera identica alla sua controparte nella
richiesta: può ricevere una lista di attributi (o un oggetto) che verranno usati per
definirne la forma oppure il nome di un attributo specifico nel cui caso la forma
della risposta è data dal tipo dello stesso.

Assumendo la seguente definizione di tipo:

```go
var Account = Type("Account", func() {
    Attribute("name", String, "Name of account.")
})
```

e il design qui di seguito:

```go
Method("index", func() {
    Description("Index all accounts")
    Payload(ListAccounts)
    Result(func() {
        Attribute("marker", String, "Pagination marker")
        Attribute("accounts", CollectionOf(Account), "list of accounts")
    })
    HTTP(func() {
        GET("")
        Response(StatusOK, func() {
            Header("marker")
            Body("accounts")
        })
    })
})
```

Il corpo della risposta HTTP per le richieste mandate al metodo `index` sono
nella forma `[{"name":"foo"},{"name":"bar"}]`. Lo stesso esempio, ma senza 
la definizione del corpo della risposta (`Body("accounts")`) produce una risposta
della forma `{"accounts":[{"name":"foo"},{"name":"bar"}]}` dato che ora il corpo
della risposta è un oggetto contenente tutti gli attributi del result type che
non sono usati negli header della risposta (solamente `accounts` è lasciato fuori).

## Data Types

Goa supporta tipi primitivi, array, map e oggetti.

La seguente tabella elenca i tipi **primitivi** supportati e la loro
rappresentazione nei protocolli HTTP e gRPC.

| Primitivo |      HTTP     |   gRPC    |
|-----------|---------------|-----------|
| `Boolean` |   `bool`      |  `bool`   |
| `Int`     |   `int`       |  `sint32` |
| `Int32`   |   `int32`     |  `sint32` |
| `Int64`   |   `int64`     |  `sint64` |
| `UInt`    |   `uint`      |  `uint32` |
| `UInt32`  |   `uint32`    |  `uint32` |
| `UInt64`  |   `uint64`    |  `uint64` |
| `Float32` |   `float32`   |  `float`  |
| `Float64` |   `float64`   |  `double` |
| `String`  |   `string`    |  `string` |
| `Bytes`   |   `[]byte`    |  `bytes`  |
| `Any`     | `interface{}` |     *     |
 \* - Non supportato


**I tipi personalizzati** possono essere definiti in goa usando 
[Type](https://godoc.org/goa.design/goa/dsl#Type) oppure
[ResultType](https://godoc.org/goa.design/goa/dsl#ResultType). Un result type è
un tipo che definisce anche un set di "viste". Ogni vista elenca gli attributi
(campi) che devono essere inclusi quando si decodifica un result type usando 
quella vista.
Per esempio una API HTTP potrebbe definire un endpoint che elenca una collezione
di entità e un'altra che ottiene una specifica entità. Può essere preferibile
limitare i capi che vengono mostrati nella collezione mantenendo allo stesso tempo 
i campi mostrati quando ritorno una entità specifica.
Le viste rendono possibile definire un result type che supporta entrambi gli scenari.
Nota che dato che le viste si applicano al solo rendering dei campi usarlo in un 
payload non avrebbe senso: I tipi da mostrare in un payload possono essere usati 
anche nel result, ma non è vero il viceversa.

Le **Map** possono essere definite con [MapOf](https://godoc.org/goa.design/goa/dsl#MapOf). 
La sintassi è `MapOf(<KeyType>, <ElemType>)` dove `<KeyType>` può essere un tipo primitivo,
array o tipo personalizzato, mentre `<ElemType>` può anche essere una map. Le Map
sono reppresentate come Go `map` nel protocollo HTTP e come protocol buffer
[map](https://developers.google.com/protocol-buffers/docs/proto3#maps) nel protocollo
gRPC. Nota che il protocol buffer language supporta solamente tipi primitivi (eccetto float
o bytes) come chiavi di una map.

Gli **Array** possono essere definiti in due modi:

* [ArrayOf](https://godoc.org/goa.design/goa/dsl#ArrayOf) che accetta un qualunque tipo
  e ritorna un tipo.
* [CollectionOf](https://godoc.org/goa/design/goa/dsl#CollectionOf) che accetta solamente
  result types e returna un result type.

Il result type ritornato da `CollectionOf` contiene le stesse viste del result 
type passato come argomento. Ognuna di queste semplicemente renderizza un array di 
elementi proiettati in tale vista.

## Transport-to-Service Type Mapping

La seguente sezione descrive come richieste e risposte transport-specific sono mappate
a payload e result type che sono transport-indipendent.

### Payload-to-Request Mapping

La funzione [Payload](https://godoc.org/goa.design/goa/dsl#Payload) descrive
la forma dei dati presi come argomento dai service methods. Le funzioni `HTTP`
e `GRPC` definiscono come il payload viene costruito a partire da richieste
in arrivo (server-side) e come costruisce la richiesta nel payload (client-side).

Per quanto riguarda **HTTP**,

* La funzione [Param](https://godoc.org/goa.design/goa/dsl#Param) definisce
  i valori caricati da paramtetri all'interno di path o query string.
* La funzione [Header](https://godoc.org/goa.design/goa/dsl#Header) definisce
  valori caricati dagli header HTTP.
* La funzione [Body](https://godoc.org/goa.design/goa/dsl#Body) definisce i valori
  caricati dal corpo della richiesta.

Di default, gli attributi del payload sono mappati al corpo della richiesta HTTP.
Qualora il payload sia di tipo primitivo, array o map le seguenti restrizioni
vengono applicate:

* solamente `primitivi` o `array` possono essere usati per definire path parameters o
  header. Gli `array` devono usare tipi primitivi per definire i loro elementi.
* solamente `primitivi`, `array`, e `map` possono essere usati per definire parametri 
  nella query string. `array` e `map` devono usare tipi primitivi per definire i loro
  elementi.

Pe rquanto riguarda **gRPC**,

* La funzione [Message](https://godoc.org/goa.design/goa/dsl#Message) definisce
  i valori caricati dal messaggio gRPC.
* La funzione [Metadata](https://godoc.org/goa.design/goa/dsl#Metadata) definisce
  i valori caricati dai [metadata](https://grpc.io/docs/guides/concepts.html#metadata)
  del messaggio gRPC.

Di default, gli attributi del payload vengono mappati al messaggio gRPC.
Qualora il payload sia di tipo primitivo, array o map la seguente restrizione
viene applicata:

* solamente `primitivi` o `array` possono essere usati per definire i metadata gRPC

### Result-To-Response Mapping

La funzione [Result](https://godoc.org/goa.design/goa/dsl#Result) descrive la forma
del dato di ritorno di un service method. le funzioni `HTTP` e `GRPC` definiscono
come la risposta viene costruita (server-side) e come il risultato viene creato
dalla risposta ricevuta (client-side).

Per quanto riguarda **HTTP**,

* La funzione [Header](https://godoc.org/goa.design/goa/dsl#Header) definisce i valori caricati
  dagli header HTTP.
* La funzione [Body](https://godoc.org/goa.design/goa/dsl#Body) definisce i valori caricati
  dal corpo della risposta.

Di default, gli attributi del result sono mappati al corpo della risposta HTTP.
Qualora il result sia di tipo primitivo, array o map le seguenti restrizioni
vengono applicate:

* solamente `primitivi` o `array` possono essere usati per definire gli header della
  risposta. Gli `array` devono usare tipi primitivi per definire i loro elementi.

Per quanto riguarda **gRPC**,

* La funzione [Message](https://godoc.org/goa.design/goa/dsl#Message) definisce i valori caricati
  nel messaggio gRPC.
* La funzione [Headers](https://godoc.org/goa.design/goa/dsl#Headers) definisce i valori caricati
  negli header metadata del messaggio gRPC.
* La funzione [Trailers](https://godoc.org/goa.design/goa/dsl#Trailers) definisce i valori caricati
  negli trailer metadata del messaggio gRPC.

Di default, gli attributi del result sono mappati nel messaggio gRPC. Qualora
il result abbia tipo primitivo, array o map la seguente restrizione viene 
applicata:

* solamente `primitivi` o `array` possono essere usati per definire header/trailer metadata
  in un messaggio gRPC.
