---
title: Best Practice di Sicurezza
description: Scopri le best practice di sicurezza essenziali per la tua API Goa
weight: 5
---

La creazione di un'API sicura coinvolge più che la semplice aggiunta dell'autenticazione. È necessario 
pensare alla sicurezza a ogni livello dell'applicazione, da come gestisci l'input dell'utente 
a come proteggi il tuo server dagli attacchi. Questa guida ti accompagnerà attraverso 
le pratiche di sicurezza essenziali per la tua API Goa, con esempi pratici che puoi 
implementare oggi stesso.

## Principi Fondamentali di Sicurezza

### Difesa in Profondità

La sicurezza non riguarda l'avere una singola serratura forte - si tratta di avere più livelli 
di protezione. Se un livello fallisce, gli altri sono ancora presenti per proteggere la tua 
applicazione. Ecco come implementare più livelli di sicurezza nel tuo servizio Goa:

```go
// Primo livello usa HTTPS
var _ = Service("secure_service", func() {
    Security(JWTAuth, func() { // Secondo livello: Richiede autenticazione valida
        Scope("api:write")     // Terzo livello: Verifica permessi specifici
    })
    
    // Quarto livello: Valida tutti gli input
    Method("secureEndpoint", func() {
        Payload(func() {
            Field(1, "data", String)
            MaxLength("data", 1000)  // Previene payload di grandi dimensioni
        })
    })
})
```

Questo codice dimostra come stratificare più controlli di sicurezza. Pensalo come un 
castello medievale - hai il fossato (HTTPS), il muro esterno (autenticazione), il 
muro interno (autorizzazione) e, infine, l'attenta ispezione di tutti i visitatori 
(validazione dell'input).

Per il rate limiting, vorrai implementarlo utilizzando middleware sul tuo server HTTP
Goa. Ecco come aggiungere il rate limiting al tuo servizio:

```go
package main

import (
    "context"
    "net/http"
    "time"
    
    "golang.org/x/time/rate"
    goahttp "goa.design/goa/v3/http"
    "goa.design/goa/v3/middleware"
)

// RateLimiter crea middleware che limita la frequenza delle richieste
func RateLimiter(limit rate.Limit, burst int) middleware.Middleware {
    limiter := rate.NewLimiter(limit, burst)
    
    return func(h http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.Allow() {
                http.Error(w, "Troppe richieste", http.StatusTooManyRequests)
                return
            }
            h.ServeHTTP(w, r)
        })
    }
}

func main() {
    // ... configurazione logger, strumentazione ...

    // Crea servizio ed endpoint
    svc := NewService()
    endpoints := gen.NewEndpoints(svc)
    
    mux := goahttp.NewMuxer()
    
    // Crea server
    server := gen.NewServer(endpoints, mux, goahttp.RequestDecoder, goahttp.ResponseEncoder, nil, nil)
    
    // Monta gli handler generati
    gen.Mount(mux, server)
    
    // Aggiungi middleware alla catena degli handler del server
    var handler http.Handler = mux
    handler = RateLimiter(rate.Every(time.Second/100), 10)(handler) // 100 req/sec
    handler = log.HTTP(ctx)(handler)                                // Aggiungi logging
    
    // Crea e avvia il server HTTP
    srv := &http.Server{
        Addr:    ":8080",
        Handler: handler,
    }
    
    // ... codice per lo spegnimento controllato ...
}
```

Per il rate limiting per endpoint specifico, puoi applicare il rate limiter direttamente agli endpoint specifici:

```go
// RateLimitEndpoint avvolge un endpoint con il rate limiting
func RateLimitEndpoint(limit rate.Limit, burst int) func(goa.Endpoint) goa.Endpoint {
    limiter := rate.NewLimiter(limit, burst)
    
    return func(endpoint goa.Endpoint) goa.Endpoint {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            if !limiter.Allow() {
                return nil, fmt.Errorf("limite di frequenza superato")
            }
            return endpoint(ctx, req)
        }
    }
}

func main() {
    // ... codice di configurazione del servizio ...

    // Crea endpoint
    endpoints := &gen.Endpoints{
        Forecast: RateLimitEndpoint(rate.Every(time.Second), 10)(
            gen.NewForecastEndpoint(svc),
        ),
        TestAll: gen.NewTestAllEndpoint(svc),  // Nessun rate limit
        TestSmoke: RateLimitEndpoint(rate.Every(time.Minute), 5)(
            gen.NewTestSmokeEndpoint(svc),
        ),
    }

    // ... resto della configurazione del server ...
}
```

Questo approccio:

1. Permette un controllo granulare su quali endpoint hanno il rate limiting
2. Può utilizzare limiti diversi per endpoint diversi
3. Mantiene la logica del rate limiting vicino alla definizione dell'endpoint
4. Segue il pattern del middleware degli endpoint di Goa

### Sicuro di Default

Uno dei principi di sicurezza più importanti è iniziare con impostazioni predefinite sicure. È 
molto più sicuro iniziare con tutto bloccato e poi aprire selettivamente l'accesso, 
piuttosto che iniziare aperti e cercare di bloccare le cose successivamente. Ecco come impostare 
le impostazioni predefinite sicure nella tua API Goa:

```go
var _ = API("secure_api", func() {
    // Richiedi autenticazione di default
    Security(JWTAuth)
})
```

Queste impostazioni assicurano che ogni endpoint nella tua API richieda l'autenticazione per 
impostazione predefinita. Per la sicurezza del trasporto (HTTPS), configurerai questo a livello 
di server nella tua implementazione:

```go
func main() {
    // ... configurazione servizio ed endpoint ...

    // Crea configurazione TLS
    tlsConfig := &tls.Config{
        MinVersion: tls.VersionTLS12,
        CurvePreferences: []tls.CurveID{
            tls.X25519,
            tls.CurveP256,
        },
        PreferServerCipherSuites: true,
        CipherSuites: []uint16{
            tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
            tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
        },
    }

    // Crea server HTTPS con configurazione sicura
    srv := &http.Server{
        Addr:      ":443",
        Handler:   handler,
        TLSConfig: tlsConfig,
        
        // Imposta timeout per prevenire attacchi slow-loris
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }
    
    // Avvia server con TLS
    log.Printf("Server HTTPS in ascolto su %s", srv.Addr)
    if err := srv.ListenAndServeTLS("cert.pem", "key.pem"); err != nil {
        log.Fatalf("impossibile avviare il server HTTPS: %v", err)
    }
}
```

Questa implementazione:

1. Usa TLS 1.2 o superiore
2. Configura suite di cifratura sicure
3. Imposta timeout appropriati
4. Usa curve ellittiche moderne
5. Segue le best practice di sicurezza per la configurazione HTTPS

Puoi anche combinare questo con altri middleware di sicurezza come il rate limiting:

### Principio del Privilegio Minimo

Quando si tratta di permessi, meno è meglio. Ogni utente e servizio dovrebbe avere 
esattamente i permessi necessari per svolgere il proprio lavoro - né più, né meno. Questo limita 
il potenziale danno se un singolo account viene compromesso. Ecco come implementare 
permessi granulari nella tua API:

```go
var _ = Service("user_service", func() {
    // Gli utenti normali possono leggere il proprio profilo
    Method("getProfile", func() {
        Security(OAuth2Auth, func() {
            Scope("profile:read")
        })
        
        // L'implementazione assicura che gli utenti possano leggere solo il proprio profilo
        Payload(func() {
            UserID("id", String, "Profilo da leggere")
        })
    })
    
    // Solo gli utenti con permesso di scrittura possono aggiornare i profili
    Method("updateProfile", func() {
        Security(OAuth2Auth, func() {
            Scope("profile:write")
        })
    })
    
    // Le operazioni amministrative richiedono privilegi speciali
    Method("deleteUser", func() {
        Security(OAuth2Auth, func() {
            Scope("admin")
        })
    })
})
```

Questo esempio mostra come creare una gerarchia di permessi. Gli utenti normali possono leggere 
i propri dati, gli utenti con privilegi elevati possono apportare modifiche e solo gli 
amministratori possono eseguire operazioni pericolose come le cancellazioni.

## Sicurezza dell'Autenticazione

L'autenticazione appropriata è la prima linea di difesa della tua API. Vediamo come 
implementare pratiche di autenticazione sicure.

### Gestione dei Token

I token sono come chiavi digitali per la tua API. Proprio come le chiavi fisiche, devono essere 
create in modo sicuro, controllate attentamente e gestite durante tutto il loro ciclo di vita. Ecco 
come implementare una gestione sicura dei token:

```go
// Genera un nuovo token con misure di sicurezza appropriate
func GenerateToken(user *User) (string, error) {
    now := time.Now()
    claims := &Claims{
        StandardClaims: jwt.StandardClaims{
            // Il token è valido a partire da ora
            IssuedAt:  now.Unix(),
            // Il token scade in 24 ore
            ExpiresAt: now.Add(time.Hour * 24).Unix(),
            // Identifica chi ha emesso il token
            Issuer:    "your-api",
            // Identifica a chi appartiene il token
            Subject:   user.ID,
        },
        // Includi i permessi dell'utente
        Scopes: user.Permissions,
    }
    
    // Usa un metodo di firma sicuro (ECDSA è più sicuro di HMAC)
    token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
    return token.SignedString(privateKey)
}

// Valida accuratamente i token in arrivo
func ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, 
        func(token *jwt.Token) (interface{}, error) {
            // Verifica sempre il metodo di firma
            if _, ok := token.Method.(*jwt.SigningMethodECDSA); !ok {
                return nil, fmt.Errorf("metodo di firma inaspettato")
            }
            return publicKey, nil
        })
    
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        // Esegui validazione aggiuntiva
        if err := validateClaims(claims); err != nil {
            return nil, err
        }
        return claims, nil
    }
    
    return nil, fmt.Errorf("token non valido")
}
```

## Gestione delle Password

Implementa una gestione sicura delle password:

```go
// Hash delle password usando algoritmi forti
func HashPassword(password string) (string, error) {
    // Usa bcrypt con costo appropriato
    hash, err := bcrypt.GenerateFromPassword(
        []byte(password), 
        bcrypt.DefaultCost,
    )
    if err != nil {
        return "", err
    }
    return string(hash), nil
}

// Verifica le password
func VerifyPassword(hashedPassword, password string) error {
    return bcrypt.CompareHashAndPassword(
        []byte(hashedPassword), 
        []byte(password),
    )
}
```

### 3. Gestione delle Chiavi API

Implementa una gestione sicura delle chiavi API:

```go
// Genera chiavi API sicure
func GenerateAPIKey() string {
    // Usa crypto/rand per generazione casuale sicura
    bytes := make([]byte, 32)
    if _, err := rand.Read(bytes); err != nil {
        panic(err)
    }
    return base64.URLEncoding.EncodeToString(bytes)
}

// Memorizza le chiavi API in modo sicuro
func StoreAPIKey(key string) error {
    // Hash della chiave prima della memorizzazione
    hashedKey := sha256.Sum256([]byte(key))
    
    // Memorizza nel database
    return db.StoreKey(hex.EncodeToString(hashedKey[:]))
}
```

## Best Practice di Autorizzazione

### 1. Controllo Accessi Basato sui Ruoli (RBAC)

Implementa RBAC usando gli scope:

```go
var _ = Service("admin", func() {
    // Definisci ruoli e permessi
    Security(OAuth2Auth, func() {
        Scope("admin:read", "Leggi risorse admin")
        Scope("admin:write", "Modifica risorse admin")
        Scope("admin:delete", "Elimina risorse admin")
    })
    
    Method("getUsers", func() {
        Security(OAuth2Auth, func() {
            Scope("admin:read")
        })
    })
    
    Method("createUser", func() {
        Security(OAuth2Auth, func() {
            Scope("admin:write")
        })
    })
    
    Method("deleteUser", func() {
        Security(OAuth2Auth, func() {
            Scope("admin:delete")
        })
    })
})
```

### 2. Autorizzazione Basata sulle Risorse

Implementa l'autorizzazione a livello di risorsa:

```go
func (s *service) authorizeResource(ctx context.Context, 
    resourceID string) error {
    
    // Ottieni utente dal contesto
    user := auth.UserFromContext(ctx)
    
    // Ottieni risorsa
    resource, err := s.db.GetResource(resourceID)
    if err != nil {
        return err
    }
    
    // Controlla proprietà o permessi
    if !canAccess(user, resource) {
        return fmt.Errorf("accesso non autorizzato alla risorsa")
    }
    
    return nil
}
```

## Validazione e Sanificazione degli Input

### 1. Validazione delle Richieste

Definisci regole di validazione complete:

```go
var _ = Type("UserInput", func() {
    Field(1, "username", String, func() {
        Pattern("^[a-zA-Z0-9_]{3,30}$")
        Example("john_doe")
    })
    
    Field(2, "email", String, func() {
        Format(FormatEmail)
        Example("john@example.com")
    })
    
    Field(3, "age", Int, func() {
        Minimum(18)
        Maximum(150)
        Example(25)
    })
    
    Field(4, "website", String, func() {
        Format(FormatURI)
        Example("https://example.com")
    })
    
    Required("username", "email", "age")
})
```

### 2. Sicurezza dei Contenuti

Implementa misure di sicurezza dei contenuti:

```go
var _ = Service("content", func() {
    HTTP(func() {
        Response(func() {
            // Imposta Content Security Policy
            Header("Content-Security-Policy", String, 
                "default-src 'self'")
            
            // Previeni lo sniffing del tipo MIME
            Header("X-Content-Type-Options", String, "nosniff")
            
            // Controlla l'incorporamento dei frame
            Header("X-Frame-Options", String, "DENY")
        })
    })
})
```

## Rate Limiting e Protezione DOS

### 1. Configurazione del Rate Limiting

Implementa il rate limiting a più livelli:

```go
var _ = Service("api", func() {
    // Rate limit globale
    Meta("ratelimit:limit", "1000")
    Meta("ratelimit:window", "1h")
    
    // Rate limit specifici per metodo
    Method("expensive", func() {
        Meta("ratelimit:limit", "10")
        Meta("ratelimit:window", "1m")
    })
})
```

### 2. Protezione DOS

Implementa misure di protezione DOS:

```go
var _ = Service("api", func() {
    // Limita dimensione payload
    MaxLength("request_body", 1024*1024)  // limite 1MB
    
    // Timeout per operazioni lunghe
    Meta("timeout", "30s")
    
    // Limiti di paginazione
    Method("list", func() {
        Payload(func() {
            Field(1, "page", Int, func() {
                Minimum(1)
            })
            Field(2, "per_page", Int, func() {
                Minimum(1)
                Maximum(100)
            })
        })
    })
})
```

## Gestione degli Errori e Logging

### 1. Gestione Sicura degli Errori

Implementa risposte di errore sicure:

```go
var _ = Service("api", func() {
    Error("unauthorized", func() {
        Description("Autenticazione fallita")
        // Non esporre dettagli interni
        Field(1, "message", String, "Autenticazione richiesta")
    })
    
    Error("validation_error", func() {
        Description("Input non valido")
        Field(1, "fields", ArrayOf(String), "Campi non validi")
    })
    
    Method("secure", func() {
        Error("unauthorized")
        Error("validation_error")
        HTTP(func() {
            Response("unauthorized", StatusUnauthorized)
            Response("validation_error", StatusBadRequest)
        })
    })
})
```

### 2. Logging di Sicurezza

Implementa pratiche di logging sicure:

```go
func (s *service) logSecurityEvent(ctx context.Context, 
    eventType string, details map[string]interface{}) {
    
    // Aggiungi contesto di sicurezza
    details["ip_address"] = getClientIP(ctx)
    details["user_id"] = getUserID(ctx)
    details["timestamp"] = time.Now().UTC()
    
    // Non loggare mai dati sensibili
    delete(details, "password")
    delete(details, "token")
    
    // Log con livello appropriato
    s.logger.WithFields(details).Info(eventType)
}
```

## HTTPS e Sicurezza del Trasporto

### 1. Configurazione HTTPS

Forza l'uso di HTTPS:

```go
var _ = API("secure_api", func() {
    // Richiedi HTTPS
    Meta("transport", "https")
    
    HTTP(func() {
        // Reindirizza HTTP a HTTPS
        Meta("redirect_http", "true")
        
        // Imposta header HSTS
        Response(func() {
            Header("Strict-Transport-Security", 
                String, 
                "max-age=31536000; includeSubDomains")
        })
    })
})
```

### 2. Gestione dei Certificati

Implementa una corretta gestione dei certificati:

```go
func setupTLS() *tls.Config {
    return &tls.Config{
        MinVersion: tls.VersionTLS12,
        CurvePreferences: []tls.CurveID{
            tls.X25519,
            tls.CurveP256,
        },
        PreferServerCipherSuites: true,
        CipherSuites: []uint16{
            tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
            tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
        },
    }
}
```

## Test di Sicurezza

### 1. Casi di Test di Sicurezza

Scrivi test focalizzati sulla sicurezza:

```go
func TestSecurityHandling(t *testing.T) {
    tests := []struct {
        name          string
        token         string
        expectedCode  int
        expectedBody  string
    }{
        {
            name: "token_valido",
            token: generateValidToken(),
            expectedCode: http.StatusOK,
        },
        {
            name: "token_scaduto",
            token: generateExpiredToken(),
            expectedCode: http.StatusUnauthorized,
        },
        {
            name: "firma_non_valida",
            token: generateTokenWithInvalidSignature(),
            expectedCode: http.StatusUnauthorized,
        },
        {
            name: "token_mancante",
            token: "",
            expectedCode: http.StatusUnauthorized,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Implementazione del test
        })
    }
}
```

### 2. Scansione di Sicurezza

Implementa la scansione di sicurezza nella tua pipeline:

```yaml
# Esempio di workflow GitHub Actions
name: Scansione di Sicurezza

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Esegui Scanner di Sicurezza Gosec
      uses: securego/gosec@master
      with:
        args: ./...
    
    - name: Esegui Nancy per Scansione Dipendenze
      uses: sonatype-nexus-community/nancy-github-action@main
    
    - name: Esegui Scansione OWASP ZAP
      uses: zaproxy/action-full-scan@v0.3.0
```

## Monitoraggio e Risposta agli Incidenti

### 1. Monitoraggio di Sicurezza

Implementa il monitoraggio di sicurezza:

```go
func monitorSecurityEvents(ctx context.Context) {
    // Monitora fallimenti di autenticazione
    go monitorAuthFailures(ctx)
    
    // Monitora violazioni del rate limit
    go monitorRateLimits(ctx)
    
    // Monitora pattern sospetti
    go monitorSuspiciousActivity(ctx)
}

func monitorAuthFailures(ctx context.Context) {
    threshold := 5
    window := time.Minute * 5
    
    for {
        select {
        case <-ctx.Done():
            return
        default:
            failures := getRecentAuthFailures(window)
            if failures > threshold {
                alertSecurityTeam("Rilevato alto tasso di fallimenti di autenticazione")
            }
            time.Sleep(time.Minute)
        }
    }
}
```

### 2. Risposta agli Incidenti

Prepara gestori di risposta agli incidenti:

```go
func handleSecurityIncident(incident *SecurityIncident) {
    // Logga dettagli dell'incidente
    logSecurityIncident(incident)
    
    // Allerta team di sicurezza
    alertSecurityTeam(incident)
    
    // Prendi azione immediata
    switch incident.Type {
    case "tentativo_forza_bruta":
        blockIP(incident.SourceIP)
    case "compromissione_chiave_api":
        revokeAPIKey(incident.APIKey)
    case "accesso_non_autorizzato":
        terminateUserSessions(incident.UserID)
    }
    
    // Crea report dell'incidente
    createIncidentReport(incident)
}
```

## Prossimi Passi

- Rivedi l'implementazione della sicurezza della tua API rispetto a queste best practice
- Implementa i controlli di sicurezza mancanti
- Aggiorna e testa regolarmente le tue misure di sicurezza
- Rimani informato sulle nuove minacce e mitigazioni di sicurezza
- Considera un audit di sicurezza professionale 