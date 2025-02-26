---
title: "Mappatura del Trasporto HTTP"
linkTitle: "Mappatura HTTP"
weight: 4
description: >
  Definisci come i metodi del tuo servizio si mappano agli endpoint HTTP. Impara come mappare i payload alle richieste e risposte HTTP.
---

Questa sezione spiega come i payload dei metodi del servizio vengono mappati agli endpoint HTTP
usando il DSL del trasporto [HTTP](https://pkg.go.dev/goa.design/goa/v3/dsl#HTTP).
I tipi di payload definiscono la forma dei dati passati come argomenti ai metodi
del servizio, mentre le espressioni HTTP specificano come costruire questi dati da varie
parti di una richiesta HTTP in arrivo.

## Stato della Richiesta HTTP

Una richiesta HTTP è composta da quattro parti:

1. **Parametri del Percorso URL**  
   Per esempio, nel percorso `/bottle/{id}`, `{id}` è un parametro del percorso.

2. **Parametri della Stringa di Query URL**

3. **Header HTTP**

4. **Body della Richiesta HTTP**

Le [espressioni HTTP](https://goa.design/reference/dsl/http/) guidano come il codice generato decodifica la richiesta nel payload atteso:

- **Espressione `Param`:** Carica valori da parametri del percorso o della stringa di query.
- **Espressione `Header`:** Carica valori dagli header HTTP.
- **Espressione `Body`:** Carica valori dal body della richiesta.

Le sezioni successive descrivono queste espressioni in dettaglio.

---

## Mappatura di Payload con Tipi Non-Oggetto

Quando il tipo di payload è un primitivo (es. `String`, tipi interi, `Float`,
`Boolean`, o `Bytes`), un array, o una mappa, il valore viene caricato dal primo
elemento definito nel seguente ordine:

1. Il primo parametro del percorso URL (se definito)
2. Altrimenti, il primo parametro della stringa di query (se definito)
3. Altrimenti, il primo header (se definito)
4. Altrimenti, il body della richiesta

### Restrizioni

- **Parametri del Percorso e Header:** Devono essere definiti usando tipi primitivi o array di primitivi.
- **Parametri della Stringa di Query:** Possono essere primitivi, array, o mappe (con primitivi come elementi).
- **Array nei Percorsi e Header:** Rappresentati come valori separati da virgola.

### Esempi

#### 1. Semplice "Ottieni per Identificatore" (Identificatore Intero)

```go
Method("show", func() {
    Payload(Int)
    HTTP(func() {
        GET("/{id}")
    })
})
```

| Metodo generato | Richiesta di esempio | Chiamata corrispondente |
| ---------------- | --------------- | ------------------ |
| `Show(int)`      | `GET /1`      | `Show(1)`          |

#### 2. "Elimina per Identificatori" in Massa (Identificatori Stringa)

```go
Method("delete", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        DELETE("/{ids}")
    })
})
```

| Metodo generato     | Richiesta di esempio | Chiamata corrispondente                     |
| -------------------- | --------------- | -------------------------------------- |
| `Delete([]string)`   | `DELETE /a,b`   | `Delete([]string{"a", "b"})`           |

> **Nota:** Il nome effettivo del parametro del percorso non è significativo.

#### 3. Array nella Stringa di Query

```go
Method("list", func() {
    Payload(ArrayOf(String))
    HTTP(func() {
        GET("")
        Param("filter")
    })
})
```

| Metodo generato   | Richiesta di esempio          | Chiamata corrispondente                  |
| ------------------ | ------------------------ | ----------------------------------- |
| `List([]string)`   | `GET /?filter=a&filter=b`| `List([]string{"a", "b"})`          |

#### 4. Float nell'Header

```go
Method("list", func() {
    Payload(Float32)
    HTTP(func() {
        GET("")
        Header("version")
    })
})
```

| Metodo generato   | Richiesta di esempio          | Chiamata corrispondente |
| ------------------ | ------------------------ | ------------------ |
| `List(float32)`    | `GET /` con header `version=1.0` | `List(1.0)` |

#### 5. Mappa nel Body

```go
Method("create", func() {
    Payload(MapOf(String, Int))
    HTTP(func() {
        POST("")
    })
})
```

| Metodo generato          | Richiesta di esempio                    | Chiamata corrispondente                                         |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `Create(map[string]int)`  | `POST / {"a": 1, "b": 2}`           | `Create(map[string]int{"a": 1, "b": 2})`                   |

---

## Mappatura di Payload con Tipi Oggetto

Per payload definiti come oggetti (con attributi multipli), le espressioni HTTP
permettono di specificare da dove viene caricato ciascun attributo. Alcuni attributi possono
provenire dal percorso URL, altri da parametri di query, header, o il body. Le
stesse restrizioni di tipo si applicano:

- **Attributi del Percorso e Header:** Devono essere primitivi o array di primitivi.
- **Attributi della Stringa di Query:** Possono essere primitivi, array, o mappe (con primitivi come elementi).

### Uso dell'Espressione `Body`

L'espressione `Body` specifica quale attributo del payload corrisponde al body
della richiesta HTTP. Se ometti l'espressione `Body`, qualsiasi attributo non mappato a un
percorso, query, o header viene automaticamente assunto provenire dal body.

#### Esempio: Mischiare Percorso e Body

Dato il payload:

```go
Method("create", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("name", String)
        Attribute("age", Int)
    })
})
```

La seguente espressione HTTP mappa l'attributo `id` a un parametro del percorso e i rimanenti attributi al body della richiesta:

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

| Metodo generato         | Richiesta di esempio                   | Chiamata corrispondente                                  |
| ------------------------ | --------------------------------- | --------------------------------------------------- |
| `Create(*CreatePayload)` | `POST /1 {"name": "a", "age": 2}` | `Create(&CreatePayload{ID: 1, Name: "a", Age: 2})`  |

### Uso di `Body` per Tipi Non-Oggetto

L'espressione `Body` supporta anche casi in cui il body della richiesta non è un oggetto (per esempio, un array o una mappa).

#### Esempio: Mappa nel Body

Considera il seguente payload:

```go
Method("rate", func() {
    Payload(func() {
        Attribute("id", Int)
        Attribute("rates", MapOf(String, Float64))
    })
})
```

Usando l'espressione HTTP sotto, l'attributo `rates` viene caricato direttamente dal body:

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

| Metodo generato         | Richiesta di esempio               | Chiamata corrispondente                                                         | 
| ------------------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `Rate(*RatePayload)`     | `PUT /1 {"a": 0.5, "b": 1.0}` | `Rate(&RatePayload{ID: 1, Rates: map[string]float64{"a": 0.5, "b": 1.0}})` |

Senza l'espressione `Body`, il body della richiesta verrebbe interpretato come un oggetto con un singolo campo chiamato `rates`.

---

## Mappatura dei Nomi degli Elementi HTTP ai Nomi degli Attributi

Le espressioni `Param`, `Header`, e `Body` permettono di mappare i nomi
degli elementi HTTP (es., chiavi della stringa di query, nomi degli header, o nomi dei campi del body) ai nomi
degli attributi del payload. La sintassi di mappatura è:

```go
"nome attributo:nome elemento"
```

Per esempio:

```go
Header("version:X-Api-Version")
```

In questo caso, l'attributo `version` verrà caricato dall'header HTTP `X-Api-Version`.

### Mappatura dei Campi nel Body della Richiesta

L'espressione `Body` supporta anche una sintassi alternativa che elenca esplicitamente
gli attributi del body e i loro corrispondenti nomi di campo HTTP. Questo è utile per
specificare una mappatura tra nomi di campo in arrivo e nomi di attributi del payload. 