---
title: "Routing Avanzato"
linkTitle: "Routing Avanzato"
weight: 2
description: "Impara a gestire pattern URL complessi e scenari di routing, inclusi parametri del percorso, gestione delle query string, parametri opzionali e route con caratteri jolly."
---

Il routing avanzato in Goa ti permette di gestire pattern URL complessi e scenari
di routing sofisticati. Questa sezione copre le funzionalità avanzate di routing
disponibili nel DSL HTTP di Goa.

## Parametri del Percorso

I parametri del percorso sono segmenti variabili nell'URL che catturano valori
dinamici. Goa fornisce un supporto completo per la definizione e la gestione dei
parametri del percorso.

### Sintassi di Base

I parametri del percorso sono definiti usando le parentesi graffe `{}`:

```go
var _ = Service("users", func() {
    Method("show", func() {
        HTTP(func() {
            GET("/users/{id}")     // Parametro semplice
            GET("/users/{id}/posts/{postId}") // Parametri multipli
        })
    })
})
```

### Pattern Matching

Puoi applicare pattern di corrispondenza ai parametri del percorso:

```go
var _ = Service("files", func() {
    Method("download", func() {
        HTTP(func() {
            // Corrisponde solo a ID numerici
            GET("/files/{id:[0-9]+}")
            
            // Corrisponde a nomi file con estensione
            GET("/files/{filename:[^/]+\\.(?:jpg|png|gif)}")
        })
    })
})
```

### Parametri Opzionali

I parametri del percorso possono essere resi opzionali usando il carattere `?`:

```go
var _ = Service("blog", func() {
    Method("posts", func() {
        HTTP(func() {
            // Il parametro year è opzionale
            GET("/posts/{year?:[0-9]{4}}")
        })
    })
})
```

## Gestione delle Query String

Le query string permettono di passare parametri opzionali e filtri attraverso l'URL.
Goa fornisce un supporto robusto per la gestione delle query string.

### Parametri di Base

Definisci parametri di query string usando il DSL `Param`:

```go
var _ = Service("products", func() {
    Method("search", func() {
        HTTP(func() {
            GET("/products")
            Param("q")           // Parametro di ricerca
            Param("category")    // Filtro per categoria
            Param("sort")        // Ordinamento
        })
    })
})
```

### Array e Mappe

Goa supporta array e mappe nelle query string:

```go
var _ = Service("filter", func() {
    Method("apply", func() {
        HTTP(func() {
            GET("/filter")
            // Array: ?tags=tag1,tag2,tag3
            Param("tags", ArrayOf(String))
            
            // Mappa: ?filters[color]=red&filters[size]=large
            Param("filters", MapOf(String, String))
        })
    })
})
```

### Parametri Opzionali e Valori Predefiniti

Configura parametri opzionali con valori predefiniti:

```go
var _ = Service("pagination", func() {
    Method("list", func() {
        HTTP(func() {
            GET("/items")
            Param("page", Int32, func() {
                Default(1)       // Valore predefinito
                Minimum(1)       // Validazione
            })
            Param("per_page", Int32, func() {
                Default(20)      // Valore predefinito
                Minimum(1)
                Maximum(100)     // Limiti
            })
        })
    })
})
```

## Route con Caratteri Jolly

Le route con caratteri jolly permettono di catturare segmenti di percorso multipli
o sconosciuti.

### Cattura di Percorsi Multipli

Usa `*` per catturare segmenti di percorso rimanenti:

```go
var _ = Service("files", func() {
    Method("serve", func() {
        HTTP(func() {
            // Cattura qualsiasi percorso sotto /static/
            GET("/static/*filepath")
        })
    })
})
```

### Pattern con Caratteri Jolly

Combina caratteri jolly con pattern matching:

```go
var _ = Service("api", func() {
    Method("proxy", func() {
        HTTP(func() {
            // Cattura percorsi che iniziano con v1 o v2
            GET("/api/{version:v[12]/*}")
        })
    })
})
```

## Migliori Pratiche

{{< alert title="Linee Guida per il Routing" color="primary" >}}
1. **Chiarezza dei Percorsi**
   - Usa nomi descrittivi per i parametri
   - Mantieni una gerarchia logica
   - Documenta il significato dei parametri

2. **Validazione**
   - Applica pattern matching quando possibile
   - Valida i parametri obbligatori
   - Fornisci valori predefiniti sensati

3. **Consistenza**
   - Usa convenzioni di naming coerenti
   - Mantieni una struttura URL uniforme
   - Standardizza i formati dei parametri
{{< /alert >}}

## Argomenti Correlati

- Per la gestione dei contenuti, vedi [Negoziazione dei Contenuti](../1-content)
- Per l'integrazione WebSocket, vedi [Integrazione WebSocket](../3-websocket)
- Per la gestione degli errori, vedi [Gestione degli Errori](../../3-tutorials/3-error-handling)
- Per i pattern di middleware, vedi [Middleware](../../5-interceptors/2-http-middleware) 