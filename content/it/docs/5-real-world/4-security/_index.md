---
linkTitle: Sicurezza
title: Sicurezza
weight: 4
description: Impara come proteggere le tue API HTTP Goa usando vari metodi di autenticazione
---

Goa fornisce robuste funzionalità di sicurezza che ti permettono di proteggere le tue
API a più livelli. Che tu abbia bisogno di autenticazione base, chiavi API, token JWT
o OAuth2, il DSL di sicurezza di Goa rende semplice implementare endpoint sicuri.

Questa sezione ti guiderà attraverso le funzionalità di sicurezza di Goa, dai concetti
base alle implementazioni avanzate. Copriremo ogni metodo di autenticazione in dettaglio
e forniremo best practice per proteggere le tue API.

## Comprendere la Sicurezza in Goa

La sicurezza in Goa è implementata attraverso schemi di sicurezza - definizioni
riutilizzabili che specificano come dovrebbero funzionare l'autenticazione e
l'autorizzazione. Pensa a questi schemi come template che definiscono come la tua
API verificherà l'identità dei client che cercano di accedere ai tuoi endpoint.

Questi schemi possono essere applicati a tre diversi livelli, fornendo una
configurazione di sicurezza flessibile:

- **Livello API**: Quando applicato a livello API, lo schema di sicurezza diventa
  il default per tutti gli endpoint nella tua API. Questo è utile quando vuoi una
  sicurezza consistente attraverso tutta la tua API.

- **Livello Servizio**: I servizi possono sovrascrivere la sicurezza a livello API
  o definire la propria sicurezza se nessuna è definita a livello API. Questo ti
  permette di avere requisiti di sicurezza diversi per diversi gruppi di endpoint
  correlati.

- **Livello Metodo**: I singoli metodi (endpoint) possono sovrascrivere sia la
  sicurezza a livello API che servizio. Questo ti dà il livello più fine di
  controllo, permettendo a specifici endpoint di usare schemi di sicurezza
  diversi o nessuna sicurezza.

## Schemi di Sicurezza Disponibili

Goa supporta diversi meccanismi di sicurezza comuni attraverso funzioni DSL dedicate.
Ogni schema è progettato per casi d'uso specifici:

### Autenticazione Base

L'autenticazione base è una delle forme più semplici di sicurezza API, dove i client
forniscono un nome utente e una password. Sebbene semplice, dovrebbe essere usata
solo su HTTPS per assicurare che le credenziali siano crittografate durante la
trasmissione.

[Scopri di più sull'Autenticazione Base →](1-basic-auth.md)

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Autenticazione base usando nome utente e password")
})
```

### Autenticazione con Chiave API

Le chiavi API forniscono un modo semplice per autenticare i client usando un singolo
token. Sono comunemente passate negli header o nei parametri query. Questo metodo è
popolare per API pubbliche che necessitano di tracciare l'utilizzo o implementare
rate limiting.

[Scopri di più sull'Autenticazione con Chiave API →](2-api-key.md)

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Protegge l'endpoint richiedendo una chiave API.")
})
```

### Autenticazione JWT (JSON Web Token)

L'autenticazione JWT è ideale per l'autenticazione stateless usando token firmati
che possono trasportare claims. I JWT sono perfetti per architetture a microservizi
dove hai bisogno di passare informazioni di autenticazione e autorizzazione tra
servizi.

[Scopri di più sull'Autenticazione JWT →](3-jwt.md)

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Protegge l'endpoint richiedendo un token JWT valido.")
    Scope("api:read", "Accesso in lettura all'API")
    Scope("api:write", "Accesso in scrittura all'API")
})
```

### Autenticazione OAuth2

OAuth2 fornisce una soluzione completa per l'autorizzazione delegata. È ideale quando
hai bisogno di permettere ad applicazioni di terze parti di accedere alla tua API
per conto dei tuoi utenti.

[Scopri di più sull'Autenticazione OAuth2 →](4-oauth2.md)

```go
var OAuth2 = OAuth2Security("oauth2", func() {
    Description("Autenticazione OAuth2")
    ImplicitFlow("/authorization")
    Scope("api:write", "Accesso in scrittura")
    Scope("api:read", "Accesso in lettura")
})
```

## Esempio di Gerarchia di Sicurezza

Esaminiamo un esempio completo che dimostra come gli schemi di sicurezza possono
essere applicati a diversi livelli. Questo esempio mostra la flessibilità del
sistema di sicurezza di Goa e come diversi requisiti di sicurezza possono essere
combinati:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// Definisci i nostri schemi di sicurezza
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Autenticazione base")
})

var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Protegge l'endpoint richiedendo una chiave API.")
})

var JWTAuth = JWTSecurity("jwt", func() {
    Description("Protegge l'endpoint richiedendo un token JWT valido.")
})

// Applica sicurezza a livello API
var _ = API("hierarchy", func() {
    Title("API di Esempio Sicurezza")
    Description("Questa API dimostra l'effetto dell'uso di Security ai livelli " +
        "API, Servizio o Metodo")

    // Imposta l'autenticazione base come schema di sicurezza default per tutti gli endpoint
    Security(BasicAuth)
})
```

### Servizio Default con Autenticazione Base

Questo servizio eredita l'autenticazione base a livello API. Nota come il payload
deve includere campi username e password:

```go
var _ = Service("default_service", func() {
    Method("default", func() {
        Description("Il metodo default del servizio default è protetto con " +
            "autenticazione base")
        // Definisce il payload atteso per l'autenticazione base
        Payload(func() {
            Username("username")  // DSL speciale per campo username
            Password("password")  // DSL speciale per campo password
            Required("username", "password")
        })
        HTTP(func() { GET("/default") })
    })
})
```

### Servizio con Sicurezza Mista

Questo servizio dimostra come sovrascrivere la sicurezza sia a livello servizio
che metodo, mostrando la flessibilità del sistema di sicurezza di Goa:

```go
var _ = Service("api_key_service", func() {
    Description("Il servizio svc è protetto con autenticazione basata su chiave API")
    HTTP(func() { Path("/svc") })

    // Sovrascrive la sicurezza a livello API per questo intero servizio
    Security(APIKeyAuth)

    Method("default", func() {
        // Questo metodo usa la sicurezza con chiave API a livello servizio
        Payload(func() {
            APIKey("api_key", "key", String, func() {
                Description("Chiave API usata per l'autenticazione")
            })
            Required("key")
        })
        HTTP(func() { GET("/default") })
    })

    Method("secure", func() {
        // Sovrascrive la sicurezza a livello servizio per questo specifico metodo
        Security(JWTAuth)
        Description("Questo metodo richiede un token JWT valido.")
        Payload(func() {
            Token("token", String, func() {
                Description("JWT usato per l'autenticazione")
            })
            Required("token")
        })
        HTTP(func() { GET("/secure") })
    })

    Method("unsecure", func() {
        Description("Questo metodo non è protetto.")
        // Rimuove tutti i requisiti di sicurezza per questo metodo
        NoSecurity()
    })
})
```

## Rimuovere la Sicurezza con NoSecurity()

A volte hai bisogno di rendere certi endpoint pubblicamente accessibili, come
controlli di salute o endpoint di documentazione pubblica. La funzione `NoSecurity()`
rimuove qualsiasi requisito di sicurezza da un metodo:

```go
Method("health", func() {
    Description("Endpoint pubblico di controllo salute")
    NoSecurity()
    HTTP(func() { GET("/health") })
})
```

## Best Practice

Quando implementi la sicurezza nei tuoi servizi Goa, segui queste linee guida per
i migliori risultati:

[Scopri di più sulle Best Practice di Sicurezza →](5-best-practices.md)

1. Definisci schemi di sicurezza a livello API per un comportamento default consistente
2. Sovrascrivi la sicurezza a livello servizio solo quando un servizio necessita di
   autenticazione diversa
3. Usa la sicurezza a livello metodo con parsimonia, per casi eccezionali
4. Usa sempre `NoSecurity()` esplicitamente quando rendi gli endpoint pubblici
5. Includi descrizioni chiare nei tuoi schemi di sicurezza per aiutare i consumatori
   dell'API
6. Usa sempre HTTPS in produzione
7. Implementa rate limiting per l'autenticazione con chiave API
8. Usa tempi di scadenza appropriati per i token JWT
9. Ruota regolarmente segreti e chiavi
10. Logga e monitora i fallimenti di autenticazione

## Codice Generato

Goa genera automaticamente il codice necessario per applicare i tuoi requisiti di
sicurezza. Il codice generato fornisce diversi benefici:

### Funzionalità di Sicurezza Generate

Quando definisci requisiti di sicurezza nel tuo design Goa, il framework genera
middleware di sicurezza completi che gestiscono tutti i compiti essenziali di
autenticazione. Questo middleware estrae automaticamente le credenziali da
richieste HTTP, valida token e gestisce errori di autenticazione. 