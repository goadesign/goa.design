---
title: Autenticazione JWT
description: Impara come implementare l'Autenticazione JWT nella tua API Goa
weight: 3
---

# Autenticazione JWT in Goa

I [JSON Web Token (JWT)](https://jwt.io/introduction) forniscono un modo sicuro per
trasmettere claims tra le parti. Sono particolarmente utili nelle architetture a
microservizi dove è necessario passare informazioni di autenticazione e autorizzazione
tra servizi. I JWT sono token auto-contenuti che possono includere informazioni
utente, permessi e altri claims.

## Come Funziona l'Autenticazione JWT

1. Il client si autentica e riceve un JWT
2. Il JWT viene incluso nelle richieste successive (solitamente nell'header Authorization)
3. Il server valida la firma JWT e i claims
4. Se valido, la richiesta viene elaborata con il contesto dei claims

Per una spiegazione dettagliata del flusso di autenticazione JWT, vedi la
[Guida al Flusso di Autenticazione JWT](https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow).

## Struttura JWT

Un JWT è composto da tre parti (vedi [JWT.io Debugger](https://jwt.io/#debugger-io) per esempi live):
1. Header (algoritmo e tipo di token)
2. Payload (claims)
3. Firma

Esempio JWT:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Per maggiori informazioni sui claims JWT, vedi la
[Documentazione Claims JWT](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims).

## Comprendere gli Scope

### Cosa Sono gli Scope?

Gli scope sono permessi che determinano quali azioni un client può eseguire con un'API.
Pensa agli scope come un modo per implementare il controllo degli accessi granulare. Per esempio:
- Un'app mobile potrebbe avere scope `read` per visualizzare i dati
- Una dashboard admin potrebbe avere sia scope `read` che `write`
- Un servizio di backup potrebbe avere scope `backup`

### Come Funzionano gli Scope

1. **Definizione**: Gli scope sono definiti nel tuo schema di sicurezza
2. **Assegnazione**: Quando generi un token, includi gli scope concessi
3. **Validazione**: Quando elabori una richiesta, verifichi che il token abbia gli scope richiesti

Ecco un'analogia del mondo reale:
- Una chiave elettronica dell'hotel (JWT) potrebbe avere diversi livelli di accesso (scope):
  - `room:access` - Accesso solo alla tua stanza
  - `pool:access` - Accesso alla piscina
  - `gym:access` - Accesso alla palestra
  - `all:access` - Accesso completo a tutte le strutture

### Formato degli Scope

Gli scope tipicamente seguono un pattern come `risorsa:azione`. Esempi comuni:
```
api:read        # Accesso in sola lettura all'API
api:write       # Accesso in scrittura all'API
users:create    # Capacità di creare utenti
admin:*         # Accesso admin completo
```

### Ereditarietà degli Scope

Gli scope possono essere gerarchici. Per esempio:
- Se un metodo richiede `api:read`, un token con `admin:*` potrebbe essere valido
- Se un metodo richiede più scope, il token deve avere TUTTI gli scope richiesti

Esempio di gerarchia scope:
```
admin:*           # Accesso admin completo (include tutti gli scope admin)
├── admin:read    # Lettura risorse admin
├── admin:write   # Modifica risorse admin
└── admin:delete  # Eliminazione risorse admin
```

### Implementare gli Scope in Goa

#### 1. Definire gli Scope Disponibili

Prima, definisci quali scope esistono nella tua API:

```go
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Autenticazione JWT con scope")
    
    // Definisci tutti gli scope disponibili
    Scope("api:read", "Accesso in lettura alle risorse API")
    Scope("api:write", "Accesso in scrittura alle risorse API")
    Scope("api:admin", "Accesso amministrativo completo")
    Scope("users:read", "Lettura profili utente")
    Scope("users:write", "Modifica profili utente")
})
```

#### 2. Applicare gli Scope ai Metodi

Poi, specifica quali scope sono richiesti per ogni endpoint:

```go
var _ = Service("users", func() {
    // Lista utenti - richiede accesso in lettura
    Method("list", func() {
        Security(JWTAuth, func() {
            // Necessita solo accesso in lettura
            Scope("users:read")
        })
    })
    
    // Aggiorna utente - richiede accesso in scrittura
    Method("update", func() {
        Security(JWTAuth, func() {
            // Necessita sia accesso in lettura che scrittura
            Scope("users:read", "users:write")
        })
    })
    
    // Elimina utente - richiede accesso admin
    Method("delete", func() {
        Security(JWTAuth, func() {
            Scope("api:admin")
        })
    })
})
```

#### 3. Includere gli Scope nei Token

Quando generi token, includi gli scope concessi:

```go
func GenerateUserToken(user *User) (string, error) {
    // Determina gli scope basati sul ruolo utente
    var scopes []string
    switch user.Role {
    case "admin":
        scopes = []string{"api:admin", "users:read", "users:write"}
    case "editor":
        scopes = []string{"users:read", "users:write"}
    default:
        scopes = []string{"users:read"}
    }
    
    claims := Claims{
        StandardClaims: jwt.StandardClaims{
            ExpiresAt: time.Now().Add(time.Hour * 24).Unix(),
            IssuedAt:  time.Now().Unix(),
            Subject:   user.ID,
        },
        Scopes: scopes,  // Includi scope nel token
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(jwtSecret))
}
```

#### 4. Validare gli Scope

Quando elabori le richieste, valida che il token abbia gli scope richiesti:

```go
func validateScopes(tokenScopes []string, requiredScopes []string) error {
    // Crea una mappa degli scope del token per una ricerca efficiente
    scopeMap := make(map[string]bool)
    for _, scope := range tokenScopes {
        scopeMap[scope] = true
    }
    
    // Caso speciale: scope admin concede tutto l'accesso
    if scopeMap["api:admin"] {
        return nil
    }
    
    // Controlla ogni scope richiesto
    for _, required := range requiredScopes {
        if !scopeMap[required] {
            return fmt.Errorf("scope richiesto mancante: %s", required)
        }
    }
    
    return nil
}
```

### Best Practice per gli Scope

1. **Convenzione di Denominazione**
   - Usa pattern consistenti (`risorsa:azione`)
   - Mantieni i nomi in minuscolo e usa i due punti come separatori
   - Sii descrittivo ma conciso

2. **Granularità**
   - Rendi gli scope abbastanza specifici per un controllo fine
   - Ma non così specifici da diventare ingestibili
   - Considera il raggruppamento di azioni correlate

3. **Documentazione**
   - Documenta cosa permette ogni scope
   - Fornisci esempi di quando usare ogni scope
   - Spiega eventuali gerarchie di scope

4. **Sicurezza**
   - Valida sempre gli scope sul server
   - Non fidarti del controllo scope lato client
   - Considera la scadenza degli scope con i token

5. **Gestione**
   - Implementa la rotazione degli scope per operazioni sensibili
   - Monitora l'utilizzo degli scope
   - Audita regolarmente le assegnazioni degli scope

## Implementare l'Autenticazione JWT in Goa

### 1. Definire lo Schema di Sicurezza

Prima, definisci il tuo schema di sicurezza JWT nel tuo pacchetto di design.

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// JWTAuth definisce il nostro schema di sicurezza
var JWTAuth = JWTSecurity("jwt", func() {
    Description("Autenticazione JWT")
    
    // Definisci scope per l'autorizzazione
    Scope("api:read", "Accesso in lettura all'API")
    Scope("api:write", "Accesso in scrittura all'API")
})
```

### 2. Applicare lo Schema di Sicurezza

L'autenticazione JWT può essere applicata a diversi livelli con requisiti di scope specifici:

```go
// Livello API - si applica a tutti i servizi e metodi
var _ = API("secure_api", func() {
    Security(JWTAuth)
})

// Livello Servizio - si applica a tutti i metodi nel servizio
var _ = Service("secure_service", func() {
    Security(JWTAuth)
})

// Livello Metodo - si applica solo a questo metodo
Method("secure_method", func() {
    Security(JWTAuth)
})
```

### 3. Definire il Payload

Per i metodi che usano l'autenticazione JWT, includi il token nel payload:

```go
Method("getData", func() {
    Security(JWTAuth, func() {
        Scope("api:read")  // Richiede scope di lettura
    })
    Payload(func() {
        Token("token", String, "JWT per l'autenticazione")
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
```

### 4. Implementare il Gestore di Sicurezza

Quando Goa genera il codice, dovrai implementare un gestore di sicurezza:

```go
// SecurityJWTFunc implementa la logica di autorizzazione per l'autenticazione JWT
func (s *service) JWTAuth(ctx context.Context, token string, scheme *security.JWTScheme) (context.Context, error) {
    claims, err := validateJWT(token)
    if err != nil {
        return ctx, err
    }
    
    // Valida gli scope
    if err := validateScopes(claims.Scopes, scheme.RequiredScopes); err != nil {
        return ctx, err
    }
    
    // Aggiungi claims al contesto
    ctx = context.WithValue(ctx, "user_id", claims.Subject)
    ctx = context.WithValue(ctx, "scopes", claims.Scopes)
    return ctx, nil
}

func validateJWT(token string) (*Claims, error) {
    // Implementa qui la tua logica di validazione JWT
    // Questo dovrebbe:
    // 1. Verificare la firma
    // 2. Validare claims standard (exp, iat, ecc.)
    // 3. Estrarre claims personalizzati
    return claims, nil
}
```

## Best Practice per l'Autenticazione JWT

### 1. Sicurezza Token

Genera token sicuri e gestiscili correttamente:

```go
func generateToken(claims jwt.Claims) (string, error) {
    // Usa un algoritmo di firma sicuro
    token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
    
    // Usa una chiave segreta forte
    secret := os.Getenv("JWT_SECRET")
    if len(secret) < 32 {
        return "", fmt.Errorf("chiave segreta JWT troppo corta")
    }
    
    return token.SignedString([]byte(secret))
}
```

### 2. Validazione Token

Implementa una validazione completa:

```go
func validateToken(tokenString string) (*jwt.Token, error) {
    return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        // Verifica metodo di firma
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("metodo di firma non valido: %v", token.Header["alg"])
        }
        
        // Verifica claims
        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            if err := claims.Valid(); err != nil {
                return nil, err
            }
            // Verifica claims aggiuntivi come necessario
        }
        
        return []byte(os.Getenv("JWT_SECRET")), nil
    })
}
```

### 3. Gestione Errori

Gestisci gli errori di autenticazione in modo appropriato:

```go
func handleAuthError(err error) error {
    switch {
    case errors.Is(err, jwt.ErrTokenExpired):
        return genservice.MakeUnauthorized(fmt.Errorf("token scaduto"))
    case errors.Is(err, jwt.ErrTokenNotValidYet):
        return genservice.MakeUnauthorized(fmt.Errorf("token non ancora valido"))
    default:
        return genservice.MakeUnauthorized(fmt.Errorf("token non valido"))
    }
}
```

### 4. Rotazione Token

Implementa un sistema per la rotazione dei token:

```go
func refreshToken(oldToken string) (string, error) {
    // Valida il vecchio token
    claims, err := validateJWT(oldToken)
    if err != nil {
        return "", err
    }
    
    // Crea nuovo token con claims aggiornati
    newClaims := Claims{
        StandardClaims: jwt.StandardClaims{
            ExpiresAt: time.Now().Add(time.Hour * 24).Unix(),
            IssuedAt:  time.Now().Unix(),
            Subject:   claims.Subject,
        },
        Scopes: claims.Scopes,
    }
    
    return generateToken(newClaims)
}
```

## Esempio di Implementazione Completa

Ecco un esempio completo che mostra come implementare l'autenticazione JWT in un
servizio Goa:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var JWTAuth = JWTSecurity("jwt", func() {
    Description("Autenticazione JWT con scope")
    Scope("api:read", "Accesso in lettura")
    Scope("api:write", "Accesso in scrittura")
})

var _ = API("auth_api", func() {
    Title("API Autenticata")
    Description("API che dimostra l'autenticazione JWT")
    
    // Applica JWT di default
    Security(JWTAuth)
})

var _ = Service("documents", func() {
    Description("Servizio gestione documenti")
    
    Method("list", func() {
        Description("Lista documenti")
        Security(JWTAuth, func() {
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
        Security(JWTAuth, func() {
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