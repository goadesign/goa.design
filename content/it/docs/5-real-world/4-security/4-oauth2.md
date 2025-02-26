---
title: Autenticazione OAuth2
description: Impara come implementare l'Autenticazione OAuth2 nella tua API Goa
weight: 4
---

OAuth2 è un protocollo ampiamente utilizzato che permette alle applicazioni di accedere
in modo sicuro ai dati per conto degli utenti senza bisogno delle loro password. Pensalo
come un sistema di chiavi elettroniche di un hotel - gli ospiti ottengono accesso
temporaneo a specifiche aree senza avere la chiave master.

Goa fornisce due modi per lavorare con OAuth2:

1. **Implementare un Provider OAuth2**: Crea il tuo server di autorizzazione che
   emette token alle applicazioni client. È come essere l'hotel - emetti e
   gestisci le chiavi elettroniche.

2. **Usare OAuth2 per Proteggere i Servizi**: Proteggi i tuoi endpoint API usando
   token OAuth2, tipicamente da un provider esterno come Google o il tuo provider
   OAuth2. È come essere un negozio nell'hotel che accetta le chiavi elettroniche
   dell'hotel.

Esploriamo entrambi gli approcci in dettaglio.

## Parte 1: Implementare un Provider OAuth2

Se vuoi creare il tuo server di autorizzazione OAuth2 (come quello di Google o
GitHub), Goa fornisce un'implementazione completa attraverso il suo pacchetto
[goadesign/oauth2](https://github.com/goadesign/oauth2). Questa implementazione
si concentra sul flusso Authorization Code, che è il flusso OAuth2 più sicuro e
ampiamente utilizzato.

### Comprendere il Flusso del Provider

Quando implementi un provider OAuth2, stai creando un sistema che gestisce tre
tipi principali di richieste:

1. **Richiesta di Autorizzazione** (dall'utente)
   - Esempio: L'utente clicca "Accedi con MyService" su un'app client
   - Il tuo provider mostra una schermata di permessi
   - Dopo l'approvazione, invii un codice di autorizzazione all'app client

2. **Scambio Token** (dall'app client)
   - L'app client rinvia il codice di autorizzazione
   - Il tuo provider lo valida e restituisce token di accesso/refresh

3. **Refresh Token** (dall'app client)
   - L'app client invia un refresh token quando il token di accesso scade
   - Il tuo provider emette un nuovo token di accesso

### Implementare il Provider

#### Passo 1: Definire l'API del Provider

Prima, crea gli endpoint del provider OAuth2 nel tuo design. Questo codice imposta la
struttura base del tuo servizio provider OAuth2:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "github.com/goadesign/oauth2"  // Importa il pacchetto provider OAuth2
)

var _ = API("oauth2_provider", func() {
    Title("API Provider OAuth2")
    Description("Implementazione server di autorizzazione OAuth2")
})

var OAuth2Provider = OAuth2("/oauth2/authorize", "/oauth2/token", func() {
    Description("Endpoint provider OAuth2")
    
    // Configura il flusso authorization code
    AuthorizationCodeFlow("/auth", "/token", "/refresh")
    
    // Definisci gli scope disponibili
    Scope("api:read", "Accesso in lettura all'API")
    Scope("api:write", "Accesso in scrittura all'API")
})
```

Questo codice di design:
- Crea una nuova API specificamente per la funzionalità provider OAuth2
- Definisce due endpoint principali: "/oauth2/authorize" per l'autorizzazione utente e
  "/oauth2/token" per la gestione dei token
- Imposta il flusso authorization code con i suoi endpoint richiesti
- Definisce due scope base che i client possono richiedere

#### Passo 2: Implementare l'Interfaccia Provider

L'interfaccia Provider è il cuore della tua implementazione OAuth2. Definisce i
metodi core che gestiscono il flusso OAuth2:

```go
type Provider interface {
    // Authorize gestisce la richiesta iniziale di permessi
    Authorize(clientID, scope, redirectURI string) (code string, err error)

    // Exchange scambia il codice di autorizzazione con i token
    Exchange(clientID, code, redirectURI string) (refreshToken, accessToken string, 
        expiresIn int, err error)

    // Refresh fornisce nuovi token di accesso
    Refresh(refreshToken, scope string) (newRefreshToken, accessToken string, 
        expiresIn int, err error)

    // Authenticate verifica le credenziali client
    Authenticate(clientID, clientSecret string) error
}
```

Ogni metodo serve uno scopo specifico:
- `Authorize`: Chiamato quando un utente approva l'accesso, genera un codice temporaneo
- `Exchange`: Converte il codice temporaneo in token di accesso e refresh
- `Refresh`: Emette nuovi token di accesso quando quelli vecchi scadono
- `Authenticate`: Valida le credenziali client prima di qualsiasi operazione sui token

#### Passo 3: Creare il Controller Provider

Il controller connette i tuoi endpoint HTTP alla tua implementazione Provider:

```go
func NewOAuth2ProviderController(service *goa.Service, provider oauth2.Provider) *OAuth2ProviderController {
    return &OAuth2ProviderController{
        ProviderController: oauth2.NewProviderController(service, provider),
    }
}
```

Questo controller:
- Prende la tua implementazione Provider come input
- Gestisce tutto il routing HTTP e l'elaborazione delle richieste
- Gestisce le risposte di errore e i codici di stato
- Assicura la conformità al protocollo OAuth2

### Considerazioni di Sicurezza del Provider

Quando implementi un provider OAuth2, hai bisogno di robuste misure di sicurezza. Ecco i
componenti chiave con le loro implementazioni:

#### Gestione Token

Il TokenStore fornisce archiviazione e gestione sicura dei token di accesso e refresh:

```go
type TokenStore struct {
    accessTokens  map[string]*TokenInfo
    refreshTokens map[string]*TokenInfo
    mu           sync.RWMutex
}

func (s *TokenStore) StoreToken(info *TokenInfo) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    s.accessTokens[info.AccessToken] = info
    if info.RefreshToken != "" {
        s.refreshTokens[info.RefreshToken] = info
    }
    return nil
}
```

Questa implementazione:
- Usa mappe separate per token di accesso e refresh
- Implementa archiviazione thread-safe dei token con un mutex
- Gestisce entrambi i tipi di token in una singola operazione
- Fornisce aggiornamenti atomici per prevenire race condition

#### Gestione Client

La struct Client gestisce le informazioni sui client OAuth2 registrati:

```go
type Client struct {
    ID          string   // Identificatore unico per il client
    Secret      string   // Chiave segreta del client per l'autenticazione
    RedirectURI string   // URI di reindirizzamento autorizzato
    Scopes      []string // Scope permessi per questo client
    Type        string   // "confidential" o "public"
}
```

Questa struttura:
- Memorizza le credenziali client essenziali
- Traccia gli URI di reindirizzamento permessi per prevenire il phishing
- Mantiene una lista degli scope permessi
- Distingue tra app confidential (lato server) e public (lato client)

## Parte 2: Usare OAuth2 per Proteggere i Tuoi Servizi

Se vuoi proteggere i tuoi endpoint API usando OAuth2 (sia il tuo provider che
uno esterno come Google), Goa rende questo processo semplice.

### Proteggere la Tua API

#### Passo 1: Definire lo Schema di Sicurezza

Questo codice dice a Goa come proteggere la tua API con OAuth2:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var OAuth2Auth = OAuth2Security("oauth2", func() {
    Description("Autenticazione OAuth2")
    
    // Definisci quali flussi OAuth2 supporti
    AuthorizationCodeFlow("/auth", "/token", "/refresh")
    
    // Definisci gli scope richiesti
    Scope("api:read", "Accesso in lettura all'API")
    Scope("api:write", "Accesso in scrittura all'API")
})
```

Lo schema di sicurezza sopra stabilisce la configurazione core OAuth2 per la tua
API. Nominandolo "oauth2", crei un identificatore chiaro che può essere referenziato
in tutto il design della tua API. Lo schema specifica il tuo flusso OAuth2 supportato,
che in questo caso è il flusso Authorization Code - una delle opzioni più sicure
disponibili. Definisce anche gli scope disponibili che i client possono richiedere
quando accedono alla tua API, permettendo un controllo degli accessi granulare. Infine,
configura gli endpoint di autenticazione necessari con cui i client interagiranno
durante il flusso OAuth2, inclusi gli endpoint di autorizzazione, scambio token e
refresh token. Questa configurazione completa fornisce tutto il necessario per
implementare la sicurezza OAuth2 nella tua API Goa.

#### Passo 2: Proteggere i Tuoi Endpoint

Ecco come applicare la sicurezza OAuth2 ai tuoi endpoint API:

```go
var _ = Service("secure_api", func() {
    Description("API protetta da OAuth2")
    
    Method("getData", func() {
        Description("Ottieni dati protetti")
        
        // Richiedi OAuth2 con scope specifico
        Security(OAuth2Auth, func() {
            Scope("api:read")
        })
        
        Payload(func() {
            AccessToken("token", String, "Token di accesso OAuth2")
            Required("token")
            
            // Campi payload aggiuntivi
            Field(1, "query", String, "Query di ricerca")
        })
        
        Result(ArrayOf(String))
        
        HTTP(func() {
            GET("/data")
            Param("query")
            Response(StatusOK)
            Response(StatusUnauthorized)
        })
    })
})
```

### Implementare il Gestore di Sicurezza

Quando Goa genera il codice, dovrai implementare un gestore di sicurezza:

```go
func (s *service) OAuth2Auth(ctx context.Context, token string, scheme *security.OAuth2Scheme) (context.Context, error) {
    // Valida il token con il tuo provider OAuth2
    tokenInfo, err := s.oauth2Provider.ValidateToken(token)
    if err != nil {
        return ctx, err
    }
    
    // Verifica gli scope
    if err := validateScopes(tokenInfo.Scopes, scheme.RequiredScopes); err != nil {
        return ctx, err
    }
    
    // Aggiungi informazioni utente al contesto
    ctx = context.WithValue(ctx, "user_id", tokenInfo.UserID)
    ctx = context.WithValue(ctx, "scopes", tokenInfo.Scopes)
    return ctx, nil
}
```

### Best Practice per OAuth2

#### 1. Sicurezza Token

Implementa una gestione sicura dei token:

```go
func validateToken(token string) (*TokenInfo, error) {
    // Verifica la firma del token
    if !isValidSignature(token) {
        return nil, errors.New("firma token non valida")
    }
    
    // Verifica la scadenza
    if isExpired(token) {
        return nil, errors.New("token scaduto")
    }
    
    // Estrai e valida le informazioni del token
    return extractTokenInfo(token)
}
```

#### 2. Gestione Errori

Gestisci gli errori OAuth2 in modo appropriato:

```go
func handleOAuth2Error(err error) error {
    switch {
    case errors.Is(err, ErrInvalidToken):
        return genservice.MakeUnauthorized(fmt.Errorf("token non valido"))
    case errors.Is(err, ErrInsufficientScope):
        return genservice.MakeForbidden(fmt.Errorf("scope insufficiente"))
    case errors.Is(err, ErrExpiredToken):
        return genservice.MakeUnauthorized(fmt.Errorf("token scaduto"))
    default:
        return genservice.MakeInternalError(err)
    }
}
```

#### 3. Rate Limiting

Implementa il rate limiting per prevenire abusi:

```go
func (s *service) checkRateLimit(token string) error {
    key := fmt.Sprintf("ratelimit:%s", token)
    count, err := s.redis.Incr(key)
    if err != nil {
        return err
    }
    
    // Imposta limite di 1000 richieste per ora
    if count == 1 {
        s.redis.Expire(key, time.Hour)
    }
    
    if count > 1000 {
        return ErrRateLimitExceeded
    }
    
    return nil
}
```

## Esempio di Implementazione Completa

Ecco un esempio completo che mostra come implementare l'autenticazione OAuth2 in un
servizio Goa:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var OAuth2Auth = OAuth2Security("oauth2", func() {
    Description("Autenticazione OAuth2")
    
    // Configura il flusso authorization code
    AuthorizationCodeFlow("/auth", "/token", "/refresh")
    
    // Definisci gli scope disponibili
    Scope("api:read", "Accesso in lettura")
    Scope("api:write", "Accesso in scrittura")
})

var _ = API("auth_api", func() {
    Title("API Autenticata")
    Description("API che dimostra l'autenticazione OAuth2")
    
    // Applica OAuth2 di default
    Security(OAuth2Auth)
})

var _ = Service("documents", func() {
    Description("Servizio gestione documenti")
    
    Method("list", func() {
        Description("Lista documenti")
        Security(OAuth2Auth, func() {
            Scope("api:read")
        })
        Result(ArrayOf(Document))
        HTTP(func() {
            GET("/documents")
            Response(StatusOK)
            Response(StatusUnauthorized)
        })
    })
    
    Method("create", func() {
        Description("Crea documento")
        Security(OAuth2Auth, func() {
            Scope("api:write")
        })
        Payload(Document)
        Result(Document)
        HTTP(func() {
            POST("/documents")
            Response(StatusCreated)
            Response(StatusUnauthorized)
        })
    })
})
``` 