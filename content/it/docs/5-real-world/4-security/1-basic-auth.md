---
title: Autenticazione Base
description: Impara come implementare l'Autenticazione Base nella tua API Goa
weight: 1
---

L'Autenticazione Base è uno schema di autenticazione semplice integrato nel protocollo
HTTP. Sebbene sia una delle forme più semplici di autenticazione, è ancora ampiamente
utilizzata, specialmente per API interne o ambienti di sviluppo.

## Come Funziona l'Autenticazione Base

Quando si usa l'Autenticazione Base:

1. Il client combina il nome utente e la password con i due punti (username:password)
2. Questa stringa viene poi codificata in base64
3. La stringa codificata viene inviata nell'header Authorization:
   `Authorization: Basic base64(username:password)`

## Implementare l'Autenticazione Base in Goa

### 1. Definire lo Schema di Sicurezza

Prima, definisci il tuo schema di sicurezza per l'Autenticazione Base nel tuo pacchetto di design:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// BasicAuth definisce il nostro schema di sicurezza
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Usa il tuo nome utente e password per accedere all'API")
})
```

### 2. Applicare lo Schema di Sicurezza

Puoi applicare l'Autenticazione Base a diversi livelli:

```go
// Livello API - si applica a tutti i servizi e metodi
var _ = API("secure_api", func() {
    Security(BasicAuth)
})

// Livello Servizio - si applica a tutti i metodi nel servizio
var _ = Service("secure_service", func() {
    Security(BasicAuth)
})

// Livello Metodo - si applica solo a questo metodo
Method("secure_method", func() {
    Security(BasicAuth)
})
```

### 3. Definire il Payload

Per i metodi che usano l'Autenticazione Base, devi definire il payload per includere
i campi username e password:

```go
Method("login", func() {
    Security(BasicAuth)
    Payload(func() {
        // Queste funzioni DSL speciali sono riconosciute da Goa
        Username("username", String, "Nome utente per l'autenticazione")
        Password("password", String, "Password per l'autenticazione")
        Required("username", "password")
    })
    Result(String)
    HTTP(func() {
        POST("/login")
        // Response definisce cosa succede dopo l'autenticazione riuscita
        Response(StatusOK)
    })
})
```

### 4. Implementare il Gestore di Sicurezza

Quando Goa genera il codice, dovrai implementare un gestore di sicurezza. Ecco un
esempio:

```go
// SecurityBasicAuthFunc implementa la logica di autorizzazione per l'Autenticazione Base
func (s *service) BasicAuth(ctx context.Context, user, pass string) (context.Context, error) {
    // Implementa qui la tua logica di autenticazione
    if user == "admin" && pass == "secret" {
        // Autenticazione riuscita
        return ctx, nil
    }
    // Autenticazione fallita
    return ctx, basic.Unauthorized("credenziali non valide")
}
```

## Best Practice per l'Autenticazione Base

1. **Usa Sempre HTTPS**
   L'Autenticazione Base invia le credenziali codificate in base64 (non crittografate).
   Usa sempre HTTPS per proteggere le credenziali in transito.

2. **Archiviazione Sicura delle Password**
   - Non memorizzare mai le password in chiaro
   - Usa algoritmi di hashing forti (come bcrypt)
   - Aggiungi salt agli hash delle password
   - Considera l'uso di una libreria sicura per la gestione delle password

3. **Rate Limiting**
   Implementa il rate limiting per prevenire attacchi di forza bruta:

   ```go
   var _ = Service("secure_service", func() {
       Security(BasicAuth)
       
       // Aggiungi annotazione di rate limiting
       Meta("ratelimit:limit", "60")
       Meta("ratelimit:window", "1m")
   })
   ```

4. **Messaggi di Errore**
   Non rivelare se il nome utente o la password erano errati. Usa messaggi generici:

   ```go
   return ctx, basic.Unauthorized("credenziali non valide")
   ```

5. **Logging**
   Logga i tentativi di autenticazione ma mai le password:

   ```go
   func (s *service) BasicAuth(ctx context.Context, user, pass string) (context.Context, error) {
       // Bene: Logga solo il nome utente e il risultato
       log.Printf("Tentativo di autenticazione per l'utente: %s", user)
       
       // Male: Non fare mai questo
       // log.Printf("Tentativo password: %s", pass)
   }
   ```

## Esempio di Implementazione

Ecco un esempio completo che mostra come implementare l'Autenticazione Base in un
servizio Goa:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Autenticazione base per l'accesso all'API")
})

var _ = API("secure_api", func() {
    Title("Esempio API Sicura")
    Description("API che dimostra l'Autenticazione Base")
    
    // Applica l'Autenticazione Base a tutti gli endpoint di default
    Security(BasicAuth)
})

var _ = Service("secure_service", func() {
    Description("Un servizio sicuro che richiede autenticazione")
    
    Method("getData", func() {
        Description("Ottieni dati protetti")
        
        // Definisci i requisiti di sicurezza
        Security(BasicAuth)
        
        // Definisci il payload (le credenziali saranno aggiunte automaticamente)
        Payload(func() {
            // Aggiungi qui eventuali campi payload aggiuntivi
            Field(1, "query", String, "Query di ricerca")
        })
        
        // Definisci il risultato
        Result(ArrayOf(String))
        
        // Definisci il trasporto HTTP
        HTTP(func() {
            GET("/data")
            Response(StatusOK)
            Response(StatusUnauthorized, func() {
                Description("Credenziali non valide")
            })
        })
    })
    
    // Esempio di endpoint pubblico
    Method("health", func() {
        Description("Endpoint di controllo salute")
        NoSecurity()
        Result(String)
        HTTP(func() {
            GET("/health")
        })
    })
})
```

## Codice Generato

Goa genera diversi componenti per l'Autenticazione Base:

1. **Tipi di Sicurezza**
   - Tipi per le credenziali
   - Tipi di errore per i fallimenti di autenticazione

2. **Middleware**
   - Estrae le credenziali dalle richieste
   - Chiama il tuo gestore di sicurezza
   - Gestisce gli errori di autenticazione

3. **Documentazione OpenAPI**
   - Documenta i requisiti di sicurezza
   - Mostra i campi richiesti
   - Documenta le risposte di errore

## Problemi Comuni e Soluzioni

### 1. Credenziali Non Inviate

Se le credenziali non vengono inviate, controlla:
- Il formato dell'header `Authorization`
- La codifica base64
- La codifica URL dei caratteri speciali

### 2. Ricezione Continua di Unauthorized

Cause comuni:
- `Security()` mancante nel design
- Implementazione errata del gestore di sicurezza
- Problemi nell'ordine dei middleware

### 3. Problemi CORS

Per client basati su browser, assicura una corretta configurazione CORS:

```go
var _ = Service("secure_service", func() {
    // Configura CORS per permettere l'header Authorization
    HTTP(func() {
        Header("Origin")
        Header("Authorization")
        Options("/")
    })
})
``` 