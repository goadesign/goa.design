---
title: "Sicurezza"
linkTitle: "Sicurezza"
weight: 6
description: "Definisci schemi di autenticazione e autorizzazione per i tuoi servizi utilizzando il DSL di sicurezza di Goa, inclusi JWT, chiavi API, Basic Auth e OAuth2."
---

## Panoramica della Sicurezza

Quando si proteggono le API, è importante comprendere due concetti distinti:

- **Autenticazione** (AuthN): Verifica l'identità di un client ("Chi sei?")
- **Autorizzazione** (AuthZ): Determina cosa può fare un client autenticato ("Cosa ti è permesso fare?")

Goa fornisce costrutti DSL per definire sia i requisiti di autenticazione che di autorizzazione per i tuoi servizi.

## Schemi di Sicurezza

### JWT (JSON Web Token)

JWT è uno standard aperto ([RFC 7519](https://tools.ietf.org/html/rfc7519)) che definisce un modo compatto per trasmettere informazioni in modo sicuro tra le parti come oggetto JSON. I JWT sono spesso utilizzati sia per l'autenticazione che per l'autorizzazione:

1. **Autenticazione**: Il JWT stesso dimostra che il portatore è stato autenticato perché è stato emesso da un'autorità fidata (firmato con una chiave segreta)
2. **Autorizzazione**: Il JWT può contenere claims (come ruoli utente o permessi) che i servizi possono utilizzare per prendere decisioni di autorizzazione

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Autenticazione e autorizzazione basata su JWT")
    // Gli scope definiscono i permessi che possono essere verificati contro i claims JWT
    Scope("api:read", "Accesso in sola lettura")
    Scope("api:write", "Accesso in lettura e scrittura")
})
```

#### Comprensione degli Scope

Gli scope sono permessi nominati che rappresentano quali azioni un client può eseguire. Quando si utilizzano i JWT:

1. Il server di autenticazione include gli scope concessi nel JWT quando viene emesso
2. Il tuo servizio valida questi scope rispetto agli scope richiesti per ogni endpoint
3. Se il JWT non contiene gli scope richiesti, la richiesta viene negata

### Chiavi API

Le chiavi API sono semplici token di stringa che i client includono con le loro richieste. Sebbene comunemente chiamate "Autenticazione con Chiave API", sono più accuratamente descritte come un meccanismo di autorizzazione:

- Non provano l'identità (possono essere facilmente condivise o rubate)
- Servono principalmente per identificare la fonte delle richieste e applicare limiti di velocità
- Sono più semplici dei JWT ma offrono meno sicurezza e flessibilità

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Autorizzazione delle richieste basata su chiave API")
})
```

Usi comuni per le chiavi API:
- Limitazione della velocità per client
- Tracciamento dell'utilizzo
- Identificazione semplice di progetto/team
- Controllo di accesso base per API pubbliche

### Autenticazione Base

L'Autenticazione Base è un semplice schema di autenticazione integrato nel protocollo HTTP:

- I client inviano credenziali (nome utente/password) con ogni richiesta
- Le credenziali sono codificate in Base64, ma non crittografate (richiede HTTPS)
- Fornisce vera autenticazione ma nessun meccanismo di autorizzazione integrato

```go
var BasicAuth = BasicAuthSecurity("basic", func() {
    Description("Autenticazione tramite nome utente/password")
    // Gli scope qui definiscono i permessi che possono essere concessi dopo l'autenticazione riuscita
    Scope("api:read", "Accesso in sola lettura")
})
```

### OAuth2

OAuth2 è un framework di autorizzazione completo che supporta flussi multipli per diversi tipi di applicazioni. Separa:

1. Autenticazione (gestita da un server di autorizzazione)
2. Autorizzazione (concede permessi specifici tramite token di accesso)
3. Accesso alle risorse (utilizzando i token di accesso)

```go
var OAuth2Auth = OAuth2Security("oauth2", func() {
    // Definisci gli endpoint del flusso OAuth2
    AuthorizationCodeFlow(
        "http://auth.example.com/authorize",  // Dove richiedere l'autorizzazione
        "http://auth.example.com/token",      // Dove scambiare il codice per il token
        "http://auth.example.com/refresh",    // Dove aggiornare i token scaduti
    )
    // Definisci i permessi disponibili
    Scope("api:read", "Accesso in sola lettura")
    Scope("api:write", "Accesso in lettura e scrittura")
})
```

## Applicazione degli Schemi di Sicurezza

Gli schemi di sicurezza possono essere applicati a diversi livelli:

### Sicurezza a Livello di Metodo

Proteggi metodi individuali con uno o più schemi:

```go
Method("secure_endpoint", func() {
    Security(JWTAuth, func() {
        Scope("api:read")
    })
    
    Payload(func() {
        TokenField(1, "token", String)
        Required("token")
    })
    
    HTTP(func() {
        GET("/secure")
        Response(StatusOK)
    })
})
```

### Schemi Multipli

Combina più schemi di sicurezza per una sicurezza potenziata:

```go
Method("doubly_secure", func() {
    Security(JWTAuth, APIKeyAuth, func() {
        Scope("api:write")
    })
    
    Payload(func() {
        TokenField(1, "token", String)
        APIKeyField(2, "api_key", "key", String)
        Required("token", "key")
    })
    
    HTTP(func() {
        POST("/secure")
        Param("key:k")  // Chiave API nel parametro di query
        Response(StatusOK)
    })
})
```

## Configurazione Specifica per Trasporto

### Configurazione Sicurezza HTTP

Configura come le credenziali di sicurezza vengono trasmesse su HTTP:

```go
Method("secure_endpoint", func() {
    Security(JWTAuth)
    Payload(func() {
        TokenField(1, "token", String)
        Required("token")
    })
    HTTP(func() {
        GET("/secure")
        Header("token:Authorization") // JWT nell'header Authorization
        Response(StatusOK)
        Response("unauthorized", StatusUnauthorized)
    })
})
```

### Configurazione Sicurezza gRPC

Configura la sicurezza per il trasporto gRPC:

```go
Method("secure_endpoint", func() {
    Security(JWTAuth, APIKeyAuth)
    Payload(func() {
        TokenField(1, "token", String)
        APIKeyField(2, "api_key", "key", String)
        Required("token", "key")
    })
    GRPC(func() {
        Metadata(func() {
            Attribute("token:authorization")  // JWT nei metadati
            Attribute("api_key:x-api-key")   // Chiave API nei metadati
        })
        Response(CodeOK)
        Response("unauthorized", CodeUnauthenticated)
    })
})
```

## Gestione degli Errori

Definisci gli errori relativi alla sicurezza in modo coerente:

```go
Service("secure_service", func() {
    Error("unauthorized", String, "Credenziali non valide")
    Error("forbidden", String, "Scope non validi")
    
    HTTP(func() {
        Response("unauthorized", StatusUnauthorized)
        Response("forbidden", StatusForbidden)
    })
    
    GRPC(func() {
        Response("unauthorized", CodeUnauthenticated)
        Response("forbidden", CodePermissionDenied)
    })
})
```

## Best Practice

{{< alert title="Linee Guida per l'Implementazione della Sicurezza" color="primary" >}}
**Design dell'Autenticazione**
- Usa schemi di sicurezza appropriati per il tuo caso d'uso
- Implementa una corretta validazione dei token
- Archiviazione sicura delle credenziali
- Usa HTTPS in produzione

**Design dell'Autorizzazione**
- Definisci chiare gerarchie di scope
- Usa permessi granulari
- Implementa controllo di accesso basato sui ruoli
- Valida tutti i requisiti di sicurezza

**Suggerimenti Generali**
- Documenta i requisiti di sicurezza
- Implementa una corretta gestione degli errori
- Usa impostazioni predefinite sicure
- Audit di sicurezza regolari
{{< /alert >}}

## Implementazione della Sicurezza

Quando definisci schemi di sicurezza nel tuo design, Goa genera un'interfaccia
`Auther` specifica per il tuo design che il tuo servizio deve implementare. Questa
interfaccia definisce metodi per ogni schema di sicurezza che hai specificato:

```go
// Auther definisce i requisiti di sicurezza per il servizio.
type Auther interface {
    // BasicAuth implementa la logica di autorizzazione per l'auth base.
    BasicAuth(context.Context, string, string, *security.BasicScheme) (context.Context, error)
    
    // JWTAuth implementa la logica di autorizzazione per i token JWT.
    JWTAuth(context.Context, string, *security.JWTScheme) (context.Context, error)
    
    // APIKeyAuth implementa la logica di autorizzazione per le chiavi API.
    APIKeyAuth(context.Context, string, *security.APIKeyScheme) (context.Context, error)
    
    // OAuth2Auth implementa la logica di autorizzazione per OAuth2.
    OAuth2Auth(context.Context, string, *security.OAuth2Scheme) (context.Context, error)
}
```

Il tuo servizio deve implementare questi metodi per gestire la logica di
autenticazione/autorizzazione. Ecco come implementare ciascuno:

### Implementazione Basic Auth

```go
// BasicAuth implementa la logica di autorizzazione per lo schema di sicurezza "basic".
func (s *svc) BasicAuth(ctx context.Context, user, pass string, scheme *security.BasicScheme) (context.Context, error) {
    if user != "goa" || pass != "rocks" {
        return ctx, ErrUnauthorized
    }
    // Memorizza le info di auth nel contesto per uso successivo
    ctx = contextWithAuthInfo(ctx, authInfo{
        user: user,
    })
    return ctx, nil
}
```

### Implementazione JWT

```go
// JWTAuth implementa la logica di autorizzazione per lo schema di sicurezza "jwt".
func (s *svc) JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error) {
    claims := make(jwt.MapClaims)
    
    // Analizza e valida il token JWT
    _, err := jwt.ParseWithClaims(token, claims, func(_ *jwt.Token) (interface{}, error) { 
        return Key, nil 
    })
    if err != nil {
        return ctx, ErrInvalidToken
    }

    // Valida gli scope richiesti
    if claims["scopes"] == nil {
        return ctx, ErrInvalidTokenScopes
    }
    scopes, ok := claims["scopes"].([]any)
    if !ok {
        return ctx, ErrInvalidTokenScopes
    }
    scopesInToken := make([]string, len(scopes))
    for _, scp := range scopes {
        scopesInToken = append(scopesInToken, scp.(string))
    }
    if err := scheme.Validate(scopesInToken); err != nil {
        return ctx, securedservice.InvalidScopes(err.Error())
    }

    // Memorizza i claims nel contesto
    ctx = contextWithAuthInfo(ctx, authInfo{
        claims: claims,
    })
    return ctx, nil
}
```

### Implementazione Chiave API

```go
// APIKeyAuth implementa la logica di autorizzazione per il servizio "secured_service"
// per lo schema di sicurezza "api_key".
func (s *securedServicesrvc) APIKeyAuth(ctx context.Context, key string, scheme *security.APIKeyScheme) (context.Context, error) {
    if key != "my_awesome_api_key" {
        return ctx, ErrUnauthorized
    }
    ctx = contextWithAuthInfo(ctx, authInfo{
        key: key,
    })
    return ctx, nil
}
```

### Creazione di Token JWT

Quando si implementa un endpoint di accesso che emette token:

```go
// Signin crea un token JWT valido per l'autenticazione
func (s *svc) Signin(ctx context.Context, p *gensvc.SigninPayload) (*gensvc.Creds, error) {
    // Crea token JWT con claims
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "nbf":    time.Date(2015, 10, 10, 12, 0, 0, 0, time.UTC).Unix(),
        "iat":    time.Now().Unix(),
        "scopes": []string{"api:read", "api:write"},
    })

    // Firma il token
    t, err := token.SignedString(Key)
    if err != nil {
        return nil, err
    }
    
    return &gensvc.Creds{
        JWT:        t,
        OauthToken: t,
        APIKey:     "my_awesome_api_key",
    }, nil
}
```

### Come Funziona
Quando implementi schemi di sicurezza nel tuo servizio Goa, ecco come funziona il flusso di autenticazione e autorizzazione:

1. Goa genera wrapper di endpoint che gestiscono la validazione dello schema di sicurezza
2. Ogni wrapper di endpoint chiama le appropriate funzioni di auth che hai implementato
3. Le tue funzioni di auth validano le credenziali e restituiscono un contesto potenziato
4. Se l'auth ha successo, l'handler dell'endpoint viene chiamato con il contesto potenziato
5. Se l'auth fallisce, viene restituito un errore al client

Per esempio, con schemi multipli:

```go
// Wrapper di endpoint generato
func NewDoublySecureEndpoint(s Service, authJWTFn security.AuthJWTFunc, authAPIKeyFn security.AuthAPIKeyFunc) goa.Endpoint {
    return func(ctx context.Context, req any) (any, error) {
        p := req.(*DoublySecurePayload)
        
        // Valida prima JWT
        ctx, err = authJWTFn(ctx, p.Token, &sc)
        if err == nil {
            // Poi valida la chiave API
            ctx, err = authAPIKeyFn(ctx, p.Key, &sc)
        }
        if err != nil {
            return nil, err
        }
        
        // Chiama il metodo del servizio se entrambi i controlli auth passano
        return s.DoublySecure(ctx, p)
    }
}
``` 