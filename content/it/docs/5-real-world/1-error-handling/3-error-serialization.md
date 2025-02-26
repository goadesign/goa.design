---
title: Sovrascrivere la Serializzazione degli Errori
linkTitle: Serializzazione degli Errori
weight: 3
description: "Impara come personalizzare la serializzazione degli errori nei servizi Goa, inclusa la gestione degli errori di validazione e il rispetto degli standard organizzativi."
---

Questa guida spiega come personalizzare il modo in cui gli errori vengono serializzati nei servizi Goa. La
serializzazione degli errori è il processo di conversione degli oggetti errore in un formato che può essere trasmesso via
HTTP o gRPC ai client. Questo è particolarmente importante per gli errori di validazione poiché sono generati automaticamente
da Goa usando un tipo di errore specifico e non possono essere personalizzati al momento della creazione - solo la loro
serializzazione può essere controllata.

## Panoramica

Quando si verifica un errore nel tuo servizio Goa, deve essere convertito in un formato che i client possano
comprendere. Il caso più comune in cui hai bisogno di formattazione personalizzata degli errori è per gli errori di validazione,
che sono generati automaticamente da Goa e usano sempre il tipo `ServiceError`. Non puoi cambiare
come questi errori vengono creati, ma puoi controllare come vengono formattati nella risposta.

Scenari comuni in cui è necessaria la formattazione personalizzata degli errori:

- **Rispettare gli standard di formato degli errori della tua organizzazione**
  - La tua organizzazione potrebbe avere requisiti specifici per le risposte di errore
  - Potresti dover corrispondere alle API esistenti nel tuo ecosistema
  - Potresti voler includere campi aggiuntivi specifici per il tuo caso d'uso

- **Formattare gli errori di validazione in modo coerente**
  - Gestire gli errori di validazione integrati di Goa (`ServiceError`)
  - Presentare gli errori di validazione in un formato user-friendly
  - Includere dettagli di validazione specifici per campo

- **Fornire risposte di errore personalizzate per tipi di errore specifici**
  - Errori diversi potrebbero richiedere formati diversi
  - Alcuni errori potrebbero necessitare di contesto o dettagli aggiuntivi
  - Potresti voler gestire gli errori di validazione diversamente dagli errori di logica di business

## Risposta di Errore Predefinita

Goa usa internamente il tipo `ServiceError` per la validazione e altri errori
integrati. Questo tipo include diversi campi importanti:

```go
// ServiceError è usato da Goa per la validazione e altri errori integrati
type ServiceError struct {
    Name      string   // Nome dell'errore (es., "missing_field")
    ID        string   // ID univoco dell'errore
    Field     *string  // Nome del campo che ha causato l'errore quando rilevante
    Message   string   // Messaggio di errore leggibile
    Timeout   bool     // È un errore di timeout?
    Temporary bool     // È un errore temporaneo?
    Fault     bool     // È un errore del server?
}
```

Per impostazione predefinita, questo viene serializzato in risposte JSON che appaiono così:
```json
{
    "name": "missing_field",
    "id": "abc123",
    "message": "email mancante nel corpo della richiesta",
    "field": "email"
}
```

## Formattatore di Errori Personalizzato

Per sovrascrivere la serializzazione predefinita degli errori, devi fornire un formattatore
di errori personalizzato quando crei il server HTTP.

Il formattatore deve restituire un tipo che implementa l'interfaccia `Statuser`, che
richiede un metodo `StatusCode()`. Questo metodo determina il codice di stato HTTP
che verrà utilizzato nella risposta.

Ecco una spiegazione dettagliata di come implementare la formattazione personalizzata degli errori:

```go
// 1. Definisci il tuo tipo di risposta di errore personalizzato
// Questo tipo determina la struttura JSON delle tue risposte di errore
type CustomErrorResponse struct {
    // Un codice di errore leggibile dalla macchina
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details map[string]string `json:"details,omitempty"`
}

// 2. Implementa l'interfaccia Statuser
// Questo dice a Goa quale codice di stato HTTP usare
func (r *CustomErrorResponse) StatusCode() int {
    // Puoi implementare logica complessa qui per determinare il codice di stato appropriato
    switch r.Code {
    case "VALIDATION_ERROR":
        return http.StatusBadRequest
    case "NOT_FOUND":
        return http.StatusNotFound
    default:
        return http.StatusInternalServerError
    }
}

// 3. Crea una funzione formattatore
// Questa funzione converte qualsiasi errore nel tuo formato personalizzato
func customErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
    // Gestisci il tipo ServiceError integrato di Goa (usato per errori di validazione)
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        // Casi comuni di errori di validazione
        case goa.MissingField:
            return &CustomErrorResponse{
                Code:    "MISSING_FIELD",
                Message: fmt.Sprintf("Il campo '%s' è obbligatorio", *serr.Field),
                Details: map[string]string{
                    "field": *serr.Field,
                },
            }

        case goa.InvalidFieldType:
            return &CustomErrorResponse{
                Code:    "INVALID_TYPE",
                Message: serr.Message,
                Details: map[string]string{
                    "field": *serr.Field,
                },
            }

        case goa.InvalidFormat:
            resp.Details = map[string]string{
                "field": *serr.Field,
                "format_error": serr.Message,
            }

        // Gestisci altri errori di validazione
        default:
            return &CustomErrorResponse{
                Code:    "VALIDATION_ERROR",
                Message: serr.Message,
                Details: map[string]string{
                    "error_id": serr.ID,
                    "field":    *serr.Field,
                },
            }
        }
    }

    // Gestisci altri tipi di errore
    return &CustomErrorResponse{
        Code:    "INTERNAL_ERROR",
        Message: err.Error(),
    }
}

// 4. Usa il formattatore quando crei il server
var server *calcsvr.Server
{
    // Crea il tuo gestore di errori (per errori inaspettati)
    eh := errorHandler(logger)
    
    // Crea il server con il tuo formattatore personalizzato
    server = calcsvr.New(
        endpoints,    // I tuoi endpoint del servizio
        mux,         // Il router HTTP
        dec,         // Decodificatore delle richieste
        enc,         // Codificatore delle risposte
        eh,          // Gestore degli errori
        customErrorFormatter,  // Il tuo formattatore personalizzato
    )
}
```

Questo produrrà risposte JSON che appaiono così:
```json
{
    "code": "MISSING_FIELD",
    "message": "Il campo 'email' è obbligatorio",
    "details": {
        "field": "email"
    }
}
```

## Best Practice

1. **Formato Coerente**
   - Usa un formato di errore coerente in tutta la tua API
   - Definisci una struttura standard per tutte le risposte di errore
   - Includi campi comuni che sono sempre presenti
   - Documenta accuratamente il tuo formato di errore
   
   Esempio di un formato coerente:
   ```json
   {
       "error": {
           "code": "VALIDATION_ERROR",
           "message": "Input non valido fornito",
           "details": {
               "field": "email",
               "reason": "formato_non_valido",
               "help": "Deve essere un indirizzo email valido"
           },
           "trace_id": "abc-123",
           "timestamp": "2024-01-20T10:00:00Z"
       }
   }
   ```

2. **Codici di Stato**
   - Scegli codici di stato HTTP che riflettano accuratamente l'errore
   - Sii coerente nell'uso dei codici di stato
   - Documenta il significato di ogni codice di stato
   - Considera i significati standard dei codici di stato HTTP
   
   Uso comune dei codici di stato:
   ```go
   func (r *CustomErrorResponse) StatusCode() int {
       switch r.Code {
       case "NOT_FOUND":
           return http.StatusNotFound        // 404
       case "VALIDATION_ERROR":
           return http.StatusBadRequest      // 400
       case "UNAUTHORIZED":
           return http.StatusUnauthorized    // 401
       case "FORBIDDEN":
           return http.StatusForbidden       // 403
       case "CONFLICT":
           return http.StatusConflict        // 409
       case "INTERNAL_ERROR":
           return http.StatusInternalServerError // 500
       default:
           return http.StatusInternalServerError
       }
   }
   ```

3. **Sicurezza**
   - Non esporre mai dettagli interni del sistema negli errori
   - Sanifica tutti i messaggi di errore
   - Usa formati di errore diversi per API interne/esterne
   - Registra errori dettagliati internamente ma restituisci messaggi sicuri
   
   Esempio di gestione sicura degli errori:
   ```go
   func secureErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
       // Registra sempre i dettagli completi dell'errore per il debug
       log.Printf("Errore: %+v", err)
       
       if serr, ok := err.(*goa.ServiceError); ok {
           switch serr.Name {
           // Gli errori di validazione sono sicuri da esporre poiché sono problemi di input dell'utente
           case goa.MissingField, goa.InvalidFieldType, goa.InvalidFormat:
               return &CustomErrorResponse{
                   Code:    "VALIDATION_ERROR",
                   Message: serr.Message,
                   Details: map[string]string{
                       "field": *serr.Field,
                   },
               }
           default:
               // Per altri errori, restituisci un messaggio generico
               return &CustomErrorResponse{
                   Code:    "INTERNAL_ERROR",
                   Message: "Si è verificato un errore interno",
               }
           }
       }
       
       // Per errori non ServiceError, usa un messaggio generico
       return &CustomErrorResponse{
           Code:    "INTERNAL_ERROR",
           Message: "Si è verificato un errore interno",
       }
   }
   ```

## Conclusione

La personalizzazione della serializzazione degli errori ti permette di:
- Fornire risposte di errore coerenti e user-friendly
- Rispettare gli standard della tua organizzazione
- Mantenere la sicurezza nascondendo dettagli sensibili
- Migliorare l'esperienza degli sviluppatori che usano la tua API 