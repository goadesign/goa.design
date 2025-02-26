---
title: "Definizione dell'API"
linkTitle: "API"
weight: 2
description: >
  Definisci le proprietà globali della tua API usando il DSL API di Goa. Configura metadati, documentazione, server e impostazioni globali.
---

## Definizione dell'API

La funzione `API` è un DSL di alto livello che definisce le proprietà globali del tuo servizio. Agisce come la radice del tuo design e stabilisce le fondamenta per tutti gli altri componenti. Ogni pacchetto di design può contenere una sola dichiarazione API, che serve come punto di ingresso per la definizione del tuo servizio.

### Scopo e Utilizzo

La definizione dell'API serve diversi scopi importanti:
- Fornisce metadati per la documentazione dell'API
- Configura endpoint del server e variabili
- Stabilisce impostazioni globali per tutti i servizi
- Definisce documentazione e informazioni sulla licenza
- Imposta dettagli di contatto e supporto

### Struttura Base

Ecco una definizione API minima:

```go
var _ = API("calculator", func() {
    Title("API Calcolatrice")
    Description("Un servizio calcolatrice semplice")
    Version("1.0.0")
})
```

Questo crea un'API chiamata "calculator" con documentazione base. Il nome dell'API dovrebbe essere un identificatore Go valido poiché viene usato nel codice generato.

### Esempio Completo

Ecco un esempio completo che mostra tutte le opzioni API disponibili con spiegazioni dettagliate:

```go
var _ = API("bookstore", func() {
    // Informazioni base dell'API - usate nella documentazione OpenAPI
    Title("API Libreria")
    Description(`Un'API moderna per la gestione di una libreria.
    
Questa API fornisce endpoint per:
- Gestione libri e inventario
- Elaborazione ordini
- Gestione clienti
- Analisi e reportistica`)
    Version("2.0.0")
    
    // Termini di servizio - requisiti legali e termini di utilizzo
    TermsOfService("https://example.com/terms")
    
    // Informazioni di contatto - chi contattare per supporto
    Contact(func() {
        Name("Supporto API")
        Email("support@example.com")
        URL("https://example.com/support")
    })
    
    // Informazioni sulla licenza - come l'API può essere usata
    License(func() {
        Name("Apache 2.0")
        URL("https://www.apache.org/licenses/LICENSE-2.0.html")
    })
    
    // Documentazione - guide dettagliate e riferimenti
    Docs(func() {
        Description(`Documentazione completa dell'API che include:
- Guide per iniziare
- Dettagli di autenticazione
- Riferimento API
- Best practice
- Codice di esempio`)
        URL("https://example.com/docs")
    })
    
    // Definizioni server - dove l'API può essere acceduta
    Server("production", func() {
        Description("Server di produzione")
        
        // Host multipli con variabili
        Host("production", func() {
            Description("Host di produzione")
            // Le variabili negli URI vengono sostituite a runtime
            URI("https://{version}.api.example.com")
            URI("grpcs://{version}.grpc.example.com")
            
            // Definisci la variabile version
            Variable("version", String, "Versione API", func() {
                Default("v2")
                Enum("v1", "v2")
            })
        })
    })
    
    // Server di sviluppo per i test
    Server("development", func() {
        Description("Server di sviluppo")
        
        Host("localhost", func() {
            // Endpoint di sviluppo locale
            URI("http://localhost:8000")
            URI("grpc://localhost:8080")
        })
    })
})
```

### Proprietà API in Dettaglio

#### Metadati Base
Queste proprietà sono essenziali per la documentazione e la scoperta dell'API:

- `Title`: Un nome breve e descrittivo per la tua API
- `Description`: Una spiegazione dettagliata di cosa fa la tua API
- `Version`: La versione dell'API, tipicamente seguendo il versionamento semantico
- `TermsOfService`: Link al tuo documento dei termini di servizio

Esempio con supporto markdown:
```go
Title("API Gestione Ordini")
Description(`
# API Gestione Ordini

Questa API ti permette di:
- Creare e gestire ordini
- Tracciare spedizioni
- Elaborare resi
- Generare fatture

## Limiti di Velocità
- 1000 richieste all'ora per utenti autenticati
- 100 richieste all'ora per utenti anonimi
`)
```

#### Informazioni di Contatto
Le informazioni di contatto aiutano i consumatori dell'API a richiedere supporto:

```go
Contact(func() {
    Name("Team API")
    Email("api@example.com")
    URL("https://example.com/contact")
})
```

Queste informazioni appaiono nella documentazione dell'API e aiutano gli utenti a ottenere assistenza quando necessario.

#### Informazioni sulla Licenza
Specifica come la tua API può essere usata:

```go
License(func() {
    Name("MIT")
    URL("https://opensource.org/licenses/MIT")
})
```

Le informazioni sulla licenza sono cruciali per gli utenti per comprendere diritti e restrizioni di utilizzo.

#### Link alla Documentazione
Fornisci risorse di documentazione aggiuntive:

```go
Docs(func() {
    Description(`Documentazione dettagliata che include:
- Riferimento API
- Guide di Integrazione
- Best Practice
- Codice di Esempio`)
    URL("https://example.com/docs")
})
```

### Configurazione Server

I server definiscono gli endpoint dove la tua API può essere acceduta. Puoi definire server multipli per ambienti diversi:

```go
Server("main", func() {
    Description("Server API principale")
    
    // Host di produzione
    Host("production", func() {
        Description("Endpoint di produzione")
        // Supporta sia HTTP che gRPC
        URI("https://api.example.com")
        URI("grpcs://grpc.example.com")
    })
    
    // Host regionale con variabili
    Host("regional", func() {
        Description("Endpoint regionali")
        URI("https://{region}.api.example.com")
        
        // Definisci la variabile region
        Variable("region", String, "Regione geografica", func() {
            Description("Regione AWS per l'endpoint API")
            Default("us-east")
            Enum("us-east", "us-west", "eu-central")
        })
    })
})
```

Le variabili negli URI permettono una configurazione flessibile e possono essere usate per:
- Supportare regioni multiple
- Gestire diverse versioni dell'API
- Configurare impostazioni specifiche per ambiente
- Gestire tenant multipli

### Best Practice

{{< alert title="Linee Guida Design API" color="primary" >}}
**Documentazione**
- Fornisci titoli e descrizioni chiari e concisi
- Usa la formattazione markdown per documentazione ricca
- Includi informazioni di contatto complete
- Collega a documentazione esterna dettagliata
- Specifica chiaramente licenza e termini di servizio

**Versionamento**
- Usa il versionamento semantico (MAJOR.MINOR.PATCH)
- Includi la versione negli URL del server per il versionamento API
- Pianifica le transizioni di versione e la compatibilità all'indietro
- Documenta i cambiamenti che rompono la compatibilità tra versioni

**Configurazione Server**
- Definisci tutti i server di produzione e sviluppo
- Usa variabili per configurazione flessibile
- Includi endpoint sia HTTP che gRPC quando necessario
- Documenta gli ambienti server e i loro scopi
- Fornisci valori predefiniti sensati per le variabili
- Considera requisiti regionali e di scalabilità

**Suggerimenti Generali**
- Mantieni le descrizioni focalizzate e rilevanti
- Usa convenzioni di denominazione coerenti
- Pianifica per espansione futura
- Considera implicazioni di sicurezza
- Documenta limiti di velocità e quote di utilizzo
{{< /alert >}}

### Errori a Livello API

Il DSL API ti permette di definire errori a livello API che possono essere riutilizzati in tutti i servizi e metodi. Questo promuove la coerenza nella gestione degli errori e riduce la duplicazione nel tuo design. 