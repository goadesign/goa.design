---
title: Sovrascrivere la Serializzazione degli Errori
linkTitle: Sovrascrivere la Serializzazione
weight: 6
description: "Personalizza come Goa serializza gli errori implementando formattatori di errore personalizzati e gestendo tipi di errore specifici con risposte su misura."
---

In Goa, gli errori sono gestiti automaticamente dal framework, fornendo un
modo coerente per comunicare problemi come errori di validazione, errori interni del
server o errori di logica di business personalizzati. Tuttavia, potrebbero esserci casi in cui
vuoi personalizzare come questi errori vengono serializzati o presentati al client.
Questa sezione spiega come sovrascrivere la serializzazione predefinita degli errori in Goa
per qualsiasi tipo di errore, inclusi gli errori di validazione incorporati.

## Personalizzare la Serializzazione degli Errori

Goa fornisce la capacità di personalizzare come gli errori vengono serializzati implementando una
funzione formattatore di errori personalizzata. Questo formattatore riceve l'oggetto errore e può
ispezionare le sue proprietà per determinare come dovrebbe essere serializzato nella risposta.
Il formattatore può gestire qualsiasi tipo di errore, inclusi:

- Errori di validazione incorporati di Goa
- Errori di servizio personalizzati definiti nel tuo DSL
- Errori Go standard
- Tipi di errore di terze parti

Il formattatore restituisce un oggetto risposta che determina sia la struttura del
payload dell'errore che il codice di stato HTTP da utilizzare. Questo ti dà il controllo completo
su come gli errori vengono presentati ai client dell'API.

### Esempio: Serializzazione degli Errori Personalizzata per Tipi di Errore Specifici

Considera uno scenario in cui vuoi personalizzare la serializzazione di specifici
tipi di errore, come errori di campo mancante o errori di logica di business personalizzati. Puoi
ottenere questo definendo tipi di errore personalizzati e un formattatore di errori
corrispondente.

#### Passo 1: Definire Tipi di Errore Personalizzati

Prima, definisci tipi di errore personalizzati che saranno utilizzati per serializzare errori specifici.
Questi tipi dovrebbero implementare l'interfaccia `Statuser` per restituire l'appropriato
codice di stato HTTP.

```go
// missingFieldError è il tipo usato per serializzare gli errori di campo richiesto mancante.
type missingFieldError string

// StatusCode restituisce 400 (BadRequest).
func (missingFieldError) StatusCode() int {
    return http.StatusBadRequest
}

// customBusinessError è il tipo usato per serializzare errori di logica di business personalizzati.
type customBusinessError string

// StatusCode restituisce 422 (Unprocessable Entity).
func (customBusinessError) StatusCode() int {
    return http.StatusUnprocessableEntity
}
```

#### Passo 2: Implementare il Formattatore di Errori Personalizzato

Successivamente, implementa un formattatore di errori personalizzato che ispeziona l'errore e lo converte
nel tipo di errore personalizzato appropriato basandosi sulle proprietà dell'errore.

```go
// customErrorResponse converte err in un tipo di errore personalizzato basato sulle proprietà dell'errore.
func customErrorResponse(ctx context.Context, err error) Statuser {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        case "missing_field":
            return missingFieldError(serr.Message)
        case "business_error":
            return customBusinessError(serr.Message)
        default:
            // Usa il predefinito di Goa per altri errori
            return goahttp.NewErrorResponse(err)
        }
    }
    // Usa il predefinito di Goa per tutti gli altri tipi di errore
    return goahttp.NewErrorResponse(err)
}
```

#### Passo 3: Usare il Formattatore di Errori Personalizzato

Infine, usa il formattatore di errori personalizzato quando istanzi il tuo server HTTP o
handler. Questo assicura che la tua logica di serializzazione degli errori personalizzata sia applicata a
tutti gli errori restituiti dal tuo servizio.

```go
var (
    appServer *appsvr.Server
)
{
    eh := errorHandler(logger)
    appServer = appsvr.New(appEndpoints, mux, dec, enc, eh, customErrorResponse)
    // ...
}
```

### Benefici della Serializzazione degli Errori Personalizzata

- **Coerenza**: La serializzazione degli errori personalizzata ti permette di mantenere la coerenza in come gli errori vengono presentati attraverso la tua API inclusi gli errori di validazione.
- **Chiarezza**: Puoi fornire messaggi di errore più descrittivi o contesto aggiuntivo che aiuta i client a capire e risolvere problemi specifici per il tuo caso d'uso.
- **Flessibilità**: Puoi adattare le risposte di errore per soddisfare requisiti specifici, come l'integrazione con la logica di gestione degli errori lato client esistente o il supporto di regole di business personalizzate.

## Riepilogo

La serializzazione degli errori personalizzata in Goa fornisce un modo potente per adattare le risposte
di errore alle tue esigenze specifiche mantenendo la coerenza attraverso la tua API.
Implementando formattatori di errore personalizzati e integrandoli con i meccanismi di gestione
degli errori di Goa, puoi creare risposte di errore più significative e azionabili per i tuoi
client.

Ora che hai capito come personalizzare la serializzazione degli errori, procedi alla
prossima sezione sulle [Best Practice](../7-best-practices) per imparare pattern
e strategie raccomandate per implementare una gestione degli errori robusta nei tuoi servizi
Goa. 