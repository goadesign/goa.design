---
title: "Costruire Backend per Agenti AI con Goa-AI"
linkTitle: "Backend per Agenti AI"
weight: 6
description: >
  Scopri come costruire backend per agenti AI usando Goa-AI, un toolkit design-first che collega Goa con il Model Context Protocol (MCP) per uno sviluppo semplificato.
---

Man mano che gli agenti AI diventano sempre più sofisticati, i backend che li alimentano devono stare al passo. Costruire tradizionalmente questi backend comporta destreggiarsi tra definizioni di strumenti, schemi JSON e codice di implementazione—il tutto mantenendo tutto sincronizzato. Goa-AI elimina questa complessità portando l'approccio design-first di Goa allo sviluppo di agenti AI.

## Comprendere Goa-AI

[Goa-AI](https://github.com/goadesign/goa-ai) è un toolkit design-first per costruire backend per agenti AI in Go. Collega la potenza del framework per microservizi di Goa con il Model Context Protocol (MCP), creando un'esperienza di sviluppo fluida per applicazioni alimentate da AI.

Definendo i tuoi strumenti AI una volta nel DSL di Goa, Goa-AI genera automaticamente:
- Server backend completi con gestori type-safe
- Schemi JSON compatibili con i modelli AI
- Trasporto JSON-RPC su HTTP
- Mappatura ed gestione automatica degli errori
- Supporto per Server-Sent Events (SSE) per aggiornamenti in tempo reale

Per iniziare con Goa-AI, avrai bisogno di:
- Go 1.24 o successivo
- Goa v3.22.2 o successivo

```bash
# Installa Goa-AI
go get goa.design/goa-ai@latest
```

### Perché Goa-AI?

Lo sviluppo tradizionale di backend per agenti AI soffre di diversi problemi:

1. **Deriva degli Schemi**: Le definizioni degli strumenti, gli schemi JSON e le implementazioni possono facilmente perdere la sincronizzazione
2. **Codice Boilerplate**: Scrivere gestori JSON-RPC, mappatura degli errori e codice di validazione è noioso
3. **Sicurezza dei Tipi**: Senza tipizzazione forte, gli errori di runtime sono comuni
4. **Aggiornamenti in Tempo Reale**: Implementare aggiornamenti di progresso in streaming richiede un lavoro significativo di plumbing

Goa-AI risolve questi problemi:
- Definendo tutto in un unico posto usando l'espressivo DSL di Goa
- Generando automaticamente tutto il codice boilerplate
- Sfruttando il sistema di tipi di Go per la sicurezza a tempo di compilazione
- Fornendo supporto di prima classe per streaming e aggiornamenti in tempo reale

## Il Model Context Protocol (MCP)

Il [Model Context Protocol](https://modelcontextprotocol.io) è uno standard aperto che abilita la comunicazione fluida tra modelli linguistici AI e servizi backend. Fornisce un modo strutturato per gli agenti AI di:

- Scoprire strumenti disponibili e le loro capacità
- Invocare funzioni backend con corretta validazione dei tipi
- Ricevere risposte strutturate e informazioni sugli errori
- Trasmettere aggiornamenti di progresso in tempo reale agli utenti

Goa-AI implementa MCP usando JSON-RPC 2.0 su HTTP, rendendo i tuoi strumenti AI accessibili da qualsiasi client compatibile con MCP.

## Creare il Tuo Primo Strumento AI

Creiamo un semplice servizio meteo che gli agenti AI possono usare per ottenere informazioni meteorologiche. Questo esempio dimostra i concetti chiave di Goa-AI:

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("weather", func() {
    Description("Servizio informazioni meteo per agenti AI")

    // Definisci un metodo che gli agenti AI possono chiamare
    Method("get_weather", func() {
        Description("Ottieni il meteo attuale per una località")

        Payload(func() {
            Field(1, "location", String, "Nome della città o coordinate", func() {
                Example("San Francisco")
            })
            Field(2, "units", String, "Unità di temperatura (celsius o fahrenheit)", func() {
                Default("celsius")
            })
            Required("location")
        })

        Result(func() {
            Field(1, "temperature", Float64, "Temperatura attuale")
            Field(2, "conditions", String, "Condizioni meteorologiche")
            Field(3, "humidity", Int, "Percentuale di umidità")
            Required("temperature", "conditions", "humidity")
        })

        Error("not_found", func() {
            Description("Località non trovata")
        })

        HTTP(func() {
            POST("/weather")
            Response(StatusOK)
            Response("not_found", StatusNotFound)
        })
    })
})
```

Da questo singolo design, Goa-AI genera:
- Un'interfaccia di servizio type-safe
- Schemi JSON per il modello AI
- Gestori HTTP con codifica automatica di richiesta/risposta
- Mappatura degli errori tra errori Go e codici di stato HTTP
- Codice client per i test

## Implementare il Servizio

Ecco tutto il codice che devi scrivere per implementare il servizio meteo:

```go
package weather

import (
    "context"
    weather "myapp/gen/weather"
)

type Service struct {
    // Le tue dipendenze (client API, database, ecc.)
}

func (s *Service) GetWeather(ctx context.Context, p *weather.GetWeatherPayload) (*weather.GetWeatherResult, error) {
    // La tua logica di business qui
    temp, conditions, humidity, err := s.fetchWeather(p.Location, p.Units)
    if err != nil {
        return nil, weather.MakeNotFound(err)
    }

    return &weather.GetWeatherResult{
        Temperature: temp,
        Conditions:  conditions,
        Humidity:    humidity,
    }, nil
}
```

Nota quanto è pulito questo codice—niente parsing JSON, nessuna validazione degli schemi, nessuna gestione HTTP. Goa-AI gestisce tutto questo per te.

## Streaming di Aggiornamenti in Tempo Reale

Una delle caratteristiche più potenti di Goa-AI è il supporto di prima classe per Server-Sent Events (SSE), che consente ai tuoi agenti AI di inviare aggiornamenti di progresso in tempo reale agli utenti. Questo è particolarmente utile per operazioni a lungo termine.

Ecco come definire un metodo di streaming:

```go
Method("analyze_document", func() {
    Description("Analizza un documento e trasmetti aggiornamenti di progresso")

    Payload(func() {
        Field(1, "document_url", String, "URL del documento da analizzare")
        Required("document_url")
    })

    StreamingResult(func() {
        Field(1, "progress", Int, "Percentuale di progresso (0-100)")
        Field(2, "status", String, "Messaggio di stato attuale")
        Field(3, "result", String, "Risultato dell'analisi finale")
    })

    HTTP(func() {
        POST("/analyze")
        Response(StatusOK)
    })
})
```

E l'implementazione:

```go
func (s *Service) AnalyzeDocument(ctx context.Context, p *weather.AnalyzeDocumentPayload, stream weather.AnalyzeDocumentServerStream) error {
    // Invia aggiornamenti di progresso mentre il lavoro procede
    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 10,
        Status:   "Download del documento in corso...",
    })

    doc, err := s.downloadDocument(p.DocumentURL)
    if err != nil {
        return err
    }

    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 50,
        Status:   "Analisi del contenuto in corso...",
    })

    result := s.analyzeContent(doc)

    stream.Send(&weather.AnalyzeDocumentResult{
        Progress: 100,
        Status:   "Completato",
        Result:   result,
    })

    return stream.Close()
}
```

L'agente AI e gli utenti finali ricevono questi aggiornamenti in tempo reale, fornendo un'esperienza utente molto migliore per operazioni a lungo termine.

## Sicurezza dei Tipi e Gestione degli Errori

Goa-AI sfrutta il sistema di tipi di Go per garantire che i tuoi strumenti AI siano robusti e affidabili. Il codice generato fornisce:

**Sicurezza dei Tipi a Tempo di Compilazione**
```go
// Interfaccia generata - il tuo contratto con l'AI
type Service interface {
    GetWeather(context.Context, *GetWeatherPayload) (*GetWeatherResult, error)
}

// Se la tua implementazione non corrisponde, non verrà compilata
func (s *service) GetWeather(ctx context.Context, p *GetWeatherPayload) (*GetWeatherResult, error) {
    // Implementazione
}
```

**Mappatura Automatica degli Errori**
```go
// Definisci errori personalizzati nel tuo design
Error("rate_limited", func() {
    Description("Troppe richieste")
})

// Usali nella tua implementazione
if s.isRateLimited(ctx) {
    return nil, weather.MakeRateLimited(errors.New("limite di velocità superato"))
}

// Goa-AI mappa automaticamente ai codici di stato HTTP appropriati
```

**Validazione delle Richieste**
Tutta la validazione delle richieste è automatica. Se il modello AI invia dati non validi, Goa-AI restituisce una risposta di errore appropriata prima che il tuo codice venga eseguito.

## Integrazione con Modelli AI

Goa-AI genera schemi JSON compatibili con le principali piattaforme AI:

**Chiamata di Funzione OpenAI**
```json
{
  "name": "get_weather",
  "description": "Ottieni il meteo attuale per una località",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "Nome della città o coordinate"
      },
      "units": {
        "type": "string",
        "description": "Unità di temperatura (celsius o fahrenheit)",
        "default": "celsius"
      }
    },
    "required": ["location"]
  }
}
```

**Strumenti Anthropic Claude**
Lo stesso schema funziona con la funzione di utilizzo degli strumenti di Claude, consentendo al tuo backend di servire più piattaforme AI.

## Struttura del Progetto

Un tipico progetto Goa-AI segue un'organizzazione chiara:

```
├── design/              # I tuoi design degli strumenti AI
│   └── weather.go      # Definizioni dei servizi
├── gen/                # Codice generato (non modificare mai)
│   └── weather/        # Interfacce e tipi del servizio
│       ├── service.go  # Interfaccia del servizio
│       ├── endpoints.go # Endpoint indipendenti dal trasporto
│       └── http/       # Trasporto HTTP
├── weather.go          # La tua implementazione
└── cmd/
    └── server/
        └── main.go     # Configurazione del server
```

## Best Practice

Quando costruisci backend per agenti AI con Goa-AI:

1. **Design First**: Inizia sempre con il design. Pensa a quali strumenti l'AI ha bisogno e come dovrebbero funzionare insieme.

2. **Descrizioni Ricche**: Usa descrizioni dettagliate nel tuo design. Queste diventano parte della comprensione dell'AI dei tuoi strumenti:
   ```go
   Field(1, "location", String, "Nome della città (es. 'San Francisco') o coordinate (es. '37.7749,-122.4194')")
   ```

3. **Fornisci Esempi**: Gli esempi aiutano i modelli AI a comprendere i formati previsti:
   ```go
   Field(1, "date", String, "Data in formato ISO 8601", func() {
       Example("2025-01-15T10:30:00Z")
   })
   ```

4. **Usa lo Streaming per Operazioni Lunghe**: Se un'operazione richiede più di alcuni secondi, usa lo streaming per fornire aggiornamenti di progresso.

5. **Definisci Errori Appropriati**: Crea tipi di errore specifici per diverse modalità di fallimento:
   ```go
   Error("invalid_location")
   Error("rate_limited")
   Error("service_unavailable")
   ```

6. **Versiona le Tue API**: Man mano che i tuoi strumenti AI evolvono, usa il versionamento per mantenere la compatibilità:
   ```go
   var _ = Service("weather_v2", func() {
       // Nuova versione con funzionalità aggiuntive
   })
   ```

## Esempio: Assistente AI Multi-Strumento

Ecco un esempio più completo che mostra più strumenti che lavorano insieme:

```go
package design

import . "goa.design/goa/v3/dsl"

// Strumento di ricerca documenti
var _ = Service("search", func() {
    Description("Cerca tra i documenti")

    Method("search_documents", func() {
        Payload(func() {
            Field(1, "query", String, "Query di ricerca")
            Field(2, "max_results", Int, "Numero massimo di risultati da restituire", func() {
                Default(10)
            })
            Required("query")
        })

        Result(ArrayOf(func() {
            Field(1, "title", String)
            Field(2, "content", String)
            Field(3, "relevance", Float64)
        }))

        HTTP(func() {
            POST("/search")
        })
    })
})

// Strumento di composizione email
var _ = Service("email", func() {
    Description("Gestione email")

    Method("send_email", func() {
        Payload(func() {
            Field(1, "to", String, "Indirizzo email del destinatario")
            Field(2, "subject", String, "Oggetto dell'email")
            Field(3, "body", String, "Corpo dell'email")
            Required("to", "subject", "body")
        })

        Result(func() {
            Field(1, "message_id", String)
            Field(2, "sent_at", String)
        })

        Error("invalid_address")

        HTTP(func() {
            POST("/email/send")
        })
    })
})

// Strumento di pianificazione calendario
var _ = Service("calendar", func() {
    Description("Calendario e pianificazione")

    Method("create_event", func() {
        Payload(func() {
            Field(1, "title", String, "Titolo dell'evento")
            Field(2, "start_time", String, "Timestamp ISO 8601")
            Field(3, "duration_minutes", Int, "Durata dell'evento")
            Field(4, "attendees", ArrayOf(String), "Email dei partecipanti")
            Required("title", "start_time", "duration_minutes")
        })

        Result(func() {
            Field(1, "event_id", String)
            Field(2, "calendar_url", String)
        })

        Error("time_conflict")

        HTTP(func() {
            POST("/calendar/events")
        })
    })
})
```

Con questi tre servizi, un agente AI può cercare documenti, inviare email e pianificare riunioni—tutto attraverso un'interfaccia type-safe e ben documentata.

## Approfondisci

- [Repository GitHub di Goa-AI](https://github.com/goadesign/goa-ai)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Documentazione di Goa](https://goa.design/docs)
- [Tutorial JSON-RPC](../../3-tutorials/3-jsonrpc-service)

## Prossimi Passi

Ora che comprendi Goa-AI, puoi:
- Esplorare gli [esempi](https://github.com/goadesign/goa-ai/tree/main/examples) nel repository
- Imparare su [JSON-RPC](../../3-tutorials/3-jsonrpc-service) che alimenta Goa-AI
- Partecipare alla discussione in [Goa Slack](https://gophers.slack.com/messages/goa) (canale #goa)
- Leggere sul [Model Context Protocol](https://modelcontextprotocol.io) per comprendere lo standard
