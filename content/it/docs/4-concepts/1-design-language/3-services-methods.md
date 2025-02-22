---
title: "Servizi e Metodi"
linkTitle: "Servizi e Metodi"
weight: 3
description: >
  Definisci i servizi e i metodi della tua API usando il DSL di definizione dei servizi di Goa. Crea endpoint chiari e ben documentati con payload e risultati fortemente tipizzati.
---

## Servizi

Un servizio in Goa rappresenta una collezione di metodi correlati che lavorano insieme
per fornire funzionalità specifiche. I servizi aiutano a organizzare la tua API in
raggruppamenti logici.

### DSL dei Servizi

Il DSL dei Servizi supporta diverse opzioni per configurare e documentare il tuo servizio:

```go
var _ = Service("users", func() {
    // Documentazione base
    Description("Servizio di gestione utenti")
    
    // Documentazione dettagliata
    Docs(func() {
        Description("Documentazione dettagliata per il servizio utenti")
        URL("https://example.com/docs/users")
    })

    // Definizioni di errore a livello di servizio
    Error("unauthorized", String, "Autenticazione fallita")
    Error("not_found", NotFound, "Risorsa non trovata")
    
    // Metadati a livello di servizio
    Meta("swagger:tag", "Utenti")
    Meta("rpc:package", "usersvc")
    
    // Requisiti di sicurezza
    Security(OAuth2, func() {
        Scope("read:users")
        Scope("write:users")
    })
    
    // Variabili a livello di servizio
    Variable("version", String, func() {
        Description("Versione API")
        Default("v1")
        Enum("v1", "v2")
    })
    
    // Metodi
    Method("create", func() {
        // ... definizione metodo
    })
    
    Method("list", func() {
        // ... definizione metodo
    })
    
    // File serviti dal servizio
    Files("/docs", "./swagger", func() {
        Description("Documentazione API")
    })
})
```

### Errori a Livello di Servizio

Definisci errori che possono essere restituiti da tutti i metodi nel servizio:

```go
var _ = Service("orders", func() {
    // Tutti i metodi nel servizio restituiranno questo errore
    Error("unauthorized")
})
```

> **Nota:** Il DSL `Error` è usato per definire errori che possono essere restituiti da tutti
> i metodi nel servizio. Non è appropriato per definire errori che sono
> specifici per un sottoinsieme di metodi. Invece, usa il DSL `Error` all'interno della
> definizione del metodo o dell'API per questo scopo.

### Documentazione del Servizio

Usa il DSL Docs per fornire documentazione dettagliata:

```go
var _ = Service("payments", func() {
    Description("Servizio di elaborazione pagamenti")
    
    Docs(func() {
        Description(`Il servizio pagamenti gestisce tutte le operazioni relative ai pagamenti.
            
Fornisce metodi per:
- Elaborare pagamenti
- Rimborsare transazioni
- Interrogare lo stato dei pagamenti
- Gestire metodi di pagamento`)
        
        URL("https://example.com/docs/payments")
        
        // Metadati di documentazione aggiuntivi
        Meta("doc:section", "Servizi Finanziari")
        Meta("doc:category", "API Core")
    })
})
```

### Servizi Multipli

API complesse possono essere organizzate in servizi multipli:

```go
var _ = Service("users", func() {
    Description("Servizio di gestione utenti")
    // ... metodi relativi agli utenti
})

var _ = Service("billing", func() {
    Description("Servizio di fatturazione e pagamento")
    // ... metodi relativi alla fatturazione
})
```

## Metodi

I metodi definiscono le operazioni che possono essere eseguite all'interno di un servizio. Ogni
metodo specifica il suo input (payload), output (risultato) e condizioni di errore.

### Struttura Base del Metodo

```go
Method("add", func() {
    Description("Somma due numeri insieme")
    
    // Parametri di input
    Payload(func() {
        Field(1, "a", Int32, "Primo operando")
        Field(2, "b", Int32, "Secondo operando")
        Required("a", "b")
    })
    
    // Risposta di successo
    Result(Int32)
    
    // Risposte di errore
    Error("overflow")
})
```

### Tipi di Payload

I metodi possono accettare diversi tipi di payload:

```go
// Payload semplice usando tipo esistente
Method("getUser", func() {
    Payload(String, "ID Utente")
    Result(User)
})

// Payload strutturato definito inline
Method("createUser", func() {
    Payload(func() {
        Field(1, "name", String, "Nome completo dell'utente")
        Field(2, "email", String, "Indirizzo email", func() {
            Format(FormatEmail)
        })
        Field(3, "role", String, "Ruolo utente", func() {
            Enum("admin", "user", "guest")
        })
        Required("name", "email", "role")
    })
    Result(User)
})

// Riferimento a tipo di payload predefinito
Method("updateUser", func() {
    Payload(UpdateUserPayload)
    Result(User)
})
```

### Tipi di Risultato

I metodi possono restituire diversi tipi di risultati:

```go
// Risultato primitivo semplice
Method("count", func() {
    Result(Int64)
})

// Risultato strutturato definito inline
Method("search", func() {
    Result(func() {
        Field(1, "items", ArrayOf(User), "Utenti corrispondenti")
        Field(2, "total", Int64, "Conteggio totale")
        Required("items", "total")
    })
})
```

### Gestione degli Errori

Definisci condizioni di errore attese per i metodi:

```go
Method("divide", func() {
    Payload(func() {
        Field(1, "a", Float64, "Dividendo")
        Field(2, "b", Float64, "Divisore")
        Required("a", "b")
    })
    Result(Float64)
    
    // Errori specifici del metodo
    Error("division_by_zero", func() {
        Description("Tentativo di divisione per zero")
    })
})
```

### Metodi di Streaming

Goa supporta lo streaming sia per i payload che per i risultati:

```go
Method("streamNumbers", func() {
    Description("Stream di una sequenza di numeri")
    
    // Stream di interi come input
    StreamingPayload(Int32)
    
    // Stream di interi come output
    StreamingResult(Int32)
})

Method("processEvents", func() {
    Description("Elabora uno stream di eventi")
    
    // Stream di dati strutturati
    StreamingPayload(func() {
        Field(1, "event_type", String)
        Field(2, "data", Any)
        Required("event_type", "data")
    })
    
    // Restituisce risultato riepilogativo
    Result(func() {
        Field(1, "processed", Int64, "Numero di eventi elaborati")
        Field(2, "errors", Int64, "Numero di errori")
        Required("processed", "errors")
    })
})
``` 