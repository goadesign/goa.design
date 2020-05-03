+++
title = "HTTP Transport Mapping"
weight = 2

[menu.main]
name = "HTTP Transport Mapping"
parent = "design"
+++

## Payload to HTTP request mapping

Il tipo Payload descrive la forma dei dati in argomento ai service methods.
Il DSL per il protocollo HTTP definisce come i dati vengono costruiti a 
partire dallo stato delle richieste HTTP in arrivo.

Lo stato della richiesta HTTP comprende quattro parti differenti:

* Gli URL path parameters (per esempio la route `/bottle/{id}` definisce il path parameter `id`)
* I parametri all'interno della querystring
* Gli header HTTP
* Il body della richiesta HTTP

La espressione HTTP generata guida la decodifica della richiesta all'interno
del payload:

* L'espressione `Param` definisce i parametri caricati da path o query string.
* L'espressione `Header` definisce i parametri corrispondenti a valor negli header HTTP.
* L'espressione `Body` definisce i valori all'interno del corpo della richiesta.

Le due sezioni successive descrivono queste espressioni in maggior dettaglio.

Nota che nel codice generato fornisce un decoder di default che dovrebbe essere
sufficiente nella maggior parte dei casi, tuttavia rende anche possibile di integrare
un decoder personalizzato nei (si spera rari) casi in cui questo sia richiesto.

#### Mapping del payload con tipi non-object

Quando il tipo del payload è un tipo primitivo (ad esempio uno fra String, un qualunque tipo di 
Integer o Float, Boolean o Bytes), oppure un array o una map il valore è caricato da:

* il primo URL path parameter definito nel design, se presente, altrimenti
* il primo parametro nella query string definito nel design, se presente, altrimenti
* il primo header definito nel design, se presente, altrimenti
* il body della richiesta.

con le seguenti restrizioni:

* solo i tipi primitivi o gli array possono essere usati per definire header o path parameters.
* solo primitive, array e map possono essere usati per definire i parametri nella query string.
* I tipi array e map usati per definire path parameters, headers o parametri nella query string
  devono usare i tipi primitivi per definire i loro elementi.

Gli array nei path parameters e negli header sono rappresentati come valori separati da virgole.

Esempi:

* un semplice "get by identifier" dove gli identifiers sono interi:

```go
Method("show", func() {
    Payload(Int)
    HTTP(func() {
        GET("/{id}")
    })
})
```

| Metodo Generato  | Richiesta di esempio | Chiamata corrispondente |
| ---------------- | -------------------- | ----------------------- |
| Show(int)        | GET /1               | Show(1)                 |

* "delete by identifiers" in blocco dove gli identifiers sono stringhe:

```go
Method("delete", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        DELETE("/{ids}")
    })
})
```

| Metodo Generato    | Richiesta di esempio | Chiamata corrispondente    |
| ------------------ | -------------------- | -------------------------- |
| Delete([]string)   | DELETE /a,b          | Delete([]string{"a", "b"}) |

> Nota che in entrambi gli esempi precedenti il nome del path parameter non 
> è rilevante.

* array in query string:

```go
Method("list", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        GET("")
        Param("filter")
    })
})
```

| Metodo Generato    | Richiesta di esempio    | Chiamata corrispondente  |
| ------------------ | ----------------------- | ------------------------ |
| List([]string)     | GET /?filter=a&filter=b | List([]string{"a", "b"}) |

* float in header:

```go
Method("list", func() {
    Payload(Float32)
    HTTP(func() {
        GET("")
        Header("version")
    })
})
```

| Metodo Generato  | Richiesta di esempio | Chiamata corrispondente |
| ---------------- | -------------------- | ----------------------- |
| List(float32)    | GET / [version=1.0]  | List(1.0)               |

* map in body:

```go
Method("create", func() {
    Payload(MapOf(String, Int))
    HTTP(func() {
        POST("")
    })
})
```

| Metodo Generato        | Richiesta di esempio    | Chiamata corrispondente                |
| ---------------------- | ----------------------- | -------------------------------------- |
| Create(map[string]int) | POST / {"a": 1, "b": 2} | Create(map[string]int{"a": 1, "b": 2}) |

#### Mapping del payload con object types

L'espressione HTTP descrive come gli attributi del payload sono caricati dallo
stato della richiesta HTTP. Attributi differenti possono essere caricati da parti
differenti della richiesta: alcuni attributi possono essere caricati dalla request
path, dalla query string o dagli header e altri dal body, per esempio. Lo stesso tipo
di restrizioni si applica ad attributi da path, query string e header (gli attributi
che descrivono path parameters o parametri della query string o headers devono
essere tipi primitivi, array o map di primitivi).

L'espressione `Body` rende possibile definire il tipo all'interno del payload che
descrive il bosy della richiesta. In alternativa se l'espressione `Body` è omessa
allora tutti gli attributi che compongono il payload e non sono usati a definire
un path parameter, un parametro della query string o un header implicitamente
descrive il body.

Per esempio, dato il seguente payload:

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
})
```

La seguente espressione HTTP fa in modo che l'attributo `id` venga caricato dal
path parameter mentre `name` e `age` sono caricati dal request body:

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
    HTTP(func() {
        POST("/{id}")
    })
})
```

| Metodo Generato        | Richiesta di esempio            | Chiamata corrispondente                          |
| ---------------------- | ------------------------------- | ------------------------------------------------ |
| Create(*CreatePayload) | POST /1 {"name": "a", "age": 2} | Create(&CreatePayload{ID: 1, Name: "a", Age: 2}) |

`Body` ammette elementi che non sono necessariamente primitivi o objects, come array e map.

Prendiamo ad esempio il seguente payload:

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
})
```

Usando la seguente espressione HTTP il parametro `rates` è caricato dal body:

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
    HTTP(func() {
        PUT("/{id}")
        Body("rates")
    })
})
```

| Metodo Generato    | Richiesta di esempio        | Chiamata corrispondente                                                  |
| ------------------ | --------------------------- | ------------------------------------------------------------------------ |
| Rate(*RatePayload) | PUT /1 {"a": 0.5, "b": 1.0} | Rate(&RatePayload{ID: 1, Rates: map[string]float64{"a": 0.5, "b": 1.0}}) |

Senza `Body` la forma del body sarebbe un oggeto con un unico campo `rates`.

#### Mapping HTTP di elementi ad attributi

Le espressioni come `Param`, `Header` e `Body`, potrebbero avere un mapping 
fra i nomi degli elementi (query string key, nome di un header o di un campo del
body) e il corrispondente attributo all'interno del payload.
Il mapping è definito usando la sintassi `"attribute name:element name"`,
ad esempio:

```go
Header("version:X-Api-Version")
```

L'espressione qui in alto fa in modo che l'attributo `version` venga 
caricato dall'header HTTP `X-Api-Version`.

L'espressione `Body` supporta una sintassi alternativa dove gli attributi che compaiono
nel body vengano listati esplicitamente. Tale sintassi permette di specificare un mapping
fra nomi dei campi e i nomi degli attributi nel payload,
ad esempio:

```go
Method("create", func() {
    Payload(func() {
        Attribute("name", String)
        Attribute("age", Int)
    })
    HTTP(func() {
        POST("")
        Body(func() {
            Attribute("name:n")
            Attribute("age:a")
        })
    })
})
```

| Metodo Generato        | Richiesta di esempio       | Chiamata corrispondente                          |
| ---------------------- | -------------------------- | ------------------------------------------------ |
| Create(*CreatePayload) | POST /1 {"n": "a", "a": 2} | Create(&CreatePayload{ID: 1, Name: "a", Age: 2}) |
