---
title: Concetti Fondamentali
weight: 3
description: "Esplora i concetti fondamentali di Goa inclusi la filosofia design-first, i servizi, i metodi, il sistema di tipi e le mappature di trasporto per costruire API ben strutturate e indipendenti dal trasporto."
---

Esploriamo come Goa ti aiuta a progettare e implementare i servizi. Comprendere questi concetti fondamentali ti aiuterà a creare API ben strutturate che sono indipendenti dal trasporto, type-safe e manutenibili.

## La Filosofia Design-First

{{< alert title="Concetto Chiave" color="primary" >}}
Goa ti incoraggia a pensare al design della tua API prima dell'implementazione. Descrivi l'intera architettura del tuo servizio usando il Linguaggio Specifico di Dominio (DSL) di Goa, che diventa l'unica fonte di verità per il tuo sistema.
{{< /alert >}}

### Perché Design First?
- I team possono concordare sulle interfacce prima di scrivere il codice di implementazione
- I contratti API sono chiari e non ambigui
- Le modifiche possono essere riviste a livello di design
- Il codice generato assicura che l'implementazione corrisponda al design

## Servizi e Metodi

{{< alert title="Blocchi di Costruzione" color="primary" >}}
Un design Goa consiste in uno o più servizi. Ogni servizio è una collezione di metodi che definiscono le operazioni che la tua API può eseguire. I metodi sono descritti in modo indipendente dal trasporto, concentrandosi sulla loro interfaccia logica piuttosto che su come sono esposti ai client.
{{< /alert >}}

Ecco un design di servizio base:

```go
var _ = Service("calculator", func() {
    // Impostazioni a livello di servizio
    Description("Un semplice servizio di calcolatrice")

    // Definisci i metodi
    Method("add", func() {
        Description("Somma due numeri")
        
        // Interfaccia indipendente dal trasporto
        Payload(func() {
            Attribute("x", Int, "Primo operando")
            Attribute("y", Int, "Secondo operando")
            Required("x", "y")
        })
        Result(Int, "Somma degli operandi")
        Error("overflow")
    })
})
```

### Servizi Multipli in Un Design

Una delle potenti caratteristiche di Goa è la capacità di progettare insieme più servizi correlati:

```go
var _ = Service("users", func() {
    Description("Servizio di gestione utenti")
    
    Method("create", func() { /* ... */ })
    Method("get", func() { /* ... */ })
})

var _ = Service("orders", func() {
    Description("Servizio di elaborazione ordini")
    
    Method("place", func() { /* ... */ })
    Method("track", func() { /* ... */ })
})
```

Questo approccio ti permette di:
- Progettare interi sistemi con chiari confini tra i servizi
- Mantenere la coerenza tra servizi correlati
- Condividere tipi e pattern tra i servizi
- Generare librerie client che possono interagire con tutti i servizi

## Il Sistema di Tipi

{{< alert title="Modellazione Dati Ricca" color="primary" >}}
Il sistema di tipi di Goa è espressivo quanto JSON Schema, permettendoti di definire strutture dati complesse con regole di validazione, documentazione ed esempi. Questi tipi possono essere riutilizzati tra servizi e metodi.
{{< /alert >}}

### Definizione dei Tipi

```go
// Definisci un tipo riutilizzabile chiamato "User" che può essere referenziato dai servizi
var User = Type("User", func() {
    // Aggiungi una descrizione che appare nella documentazione generata
    Description("Informazioni account utente")
    
    // Definisci attributi con i loro tipi e descrizioni
    Attribute("id", Int, "ID utente univoco")
    // Usa func() annidata per aggiungere configurazioni extra agli attributi
    Attribute("email", String, func() {
        // Aggiungi validazione del formato
        Format(FormatEmail)
        // Fornisci esempio per la documentazione
        Example("user@example.com")
        Description("Indirizzo email dell'utente")
    })
    // Gli enum restringono i valori a un insieme predefinito
    Attribute("role", String, func() {
        Enum("admin", "user", "guest")
        Description("Ruolo dell'utente nel sistema")
    })
    // ArrayOf crea un tipo array
    Attribute("preferences", ArrayOf(String))
    // MapOf crea un tipo mappa con chiavi string e valori qualsiasi
    Attribute("metadata", MapOf(String, Any))
    
    // Indica quali attributi devono essere presenti
    Required("id", "email", "role")
})
```

### Uso dei Tipi nei Metodi

I tipi possono essere usati per payload dei metodi, risultati e definizioni di errore:

```go
Method("create", func() {
    Description("Crea un nuovo account utente")
    
    // Usa il tipo User sia per input che per output
    Payload(func() {
        Reference(User)
        Attribute("email") // Eredita l'attributo email dal tipo User
        Attribute("role")  // Eredita l'attributo role dal tipo User
        Required("email", "role")
    })
    Result(User)
    
    // Definisci possibili errori
    Error("invalid_email")
})
```

## Mappature di Trasporto

Dopo aver definito l'interfaccia del tuo servizio, la mappi su specifici protocolli di trasporto. Questa separazione ti permette di esporre i tuoi servizi tramite protocolli multipli senza cambiare il design core.

Per HTTP, puoi mappare i tuoi metodi su endpoint REST specificando:
- Verbi HTTP (GET, POST, PUT, DELETE, ecc.)
- Percorsi URL e parametri di percorso
- Parametri di query
- Header di richiesta/risposta
- Codici di stato
- Tipi di contenuto e codifiche

Gli attributi di payload e risultato possono essere mappati su header HTTP, parametri di query e corpi di richiesta e risposta.

Similmente, per gRPC, puoi mappare i tuoi metodi su metodi gRPC e mappare gli attributi di payload e risultato su messaggi di richiesta e risposta e metadata. Puoi anche specificare i codici di stato gRPC per gli errori.

Continuando con l'esempio precedente, ecco come puoi mappare il metodo `create` su HTTP e gRPC:

```go
HTTP(func() {
    POST("/users")
    Body(User)
    Response(StatusCreated)
})

gRPC(func() {
    Message(User)
    Response(CodeOK)
})
```

## Generazione del Codice e Implementazione

Goa genera tutto il codice infrastrutturale necessario per servire la tua API, permettendoti di concentrarti sull'implementazione della logica di business. Il codice generato segue un pattern di architettura pulita con chiara separazione delle responsabilità.

### Struttura del Codice Generato
```
gen/
├── users/
│   ├── service.go      # Definizioni delle interfacce di servizio
│   ├── endpoints.go    # Endpoint indipendenti dal trasporto
│   └── client.go       # Package client
├── http/
│   ├── server/        # Codice server HTTP
│   ├── client/        # Codice client HTTP
│   └── openapi.json   # Documentazione API
└── grpc/
    ├── server/        # Codice server gRPC
    ├── client/        # Codice client gRPC
    └── pb/            # Protocol buffers
```

### 1. Interfaccia Generata
Goa genera interfacce di servizio che definiscono il contratto tra il tuo layer di trasporto e la logica di business. Queste interfacce sono type-safe e includono tutti i metodi che hai definito nel tuo design.

Per esempio, dato un design di servizio utenti:

```go
// gen/users/service.go
type Service interface {
    Create(context.Context, *CreatePayload) (*User, error)
    Get(context.Context, *GetPayload) (*User, error)
}
```

### 2. La Tua Implementazione

Implementi il tuo servizio creando una struct che soddisfa l'interfaccia generata. Questo è dove scrivi la tua logica di business effettiva:

```go
// services/users.go
type usersService struct {
    db *Database
}

func (s *usersService) Create(ctx context.Context, p *users.CreatePayload) (*users.User, error) {
    // La tua logica di business qui
    user := &users.User{
        Name: p.Name,
        Age:  p.Age,
    }

    // Salva l'utente nel database
    err := s.db.Save(user)
    if err != nil {
        return nil, err
    }

    return user, nil
}
```

### 3. Applicazione Principale

Infine, componi tutto insieme nella tua applicazione principale. Il codice generato fornisce factory e costruttori che rendono facile collegare tutti i componenti:

```go
// cmd/server/main.go
func main() {
    // Crea la tua implementazione del servizio
    svc := &usersService{db: initDB()}
    
    // Usa le factory generate da Goa
    endpoints := genusers.NewEndpoints(svc)
    
    // Crea e configura il server HTTP
    // Crea un nuovo Muxer HTTP
    mux := goahttp.NewMuxer()
    // Usa il metodo factory generato per creare il server HTTP
    httpServer := genhttp.New(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    // Monta il server HTTP sul Muxer
    genhttp.Mount(mux, httpServer)
    
    // Crea e configura il server gRPC
``` 