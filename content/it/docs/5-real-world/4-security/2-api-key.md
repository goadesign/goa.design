---
title: Autenticazione con Chiave API
description: Impara come implementare l'Autenticazione con Chiave API nella tua API Goa
weight: 2
---

L'autenticazione con chiave API è un modo semplice e popolare per proteggere le API.
Prevede la distribuzione di chiavi uniche ai client che poi includono queste chiavi
nelle loro richieste. Questo metodo è particolarmente utile per API pubbliche dove
vuoi tracciare l'utilizzo, implementare rate limiting o fornire diversi livelli di
accesso a diversi client.

## Come Funziona l'Autenticazione con Chiave API

Le chiavi API possono essere trasmesse in diversi modi:
1. Come header (più comune)
2. Come parametro query
3. Nel body della richiesta

Il metodo più sicuro è l'uso di header, tipicamente con un nome come `X-API-Key`
o `Authorization`.

## Implementare l'Autenticazione con Chiave API in Goa

### 1. Definire lo Schema di Sicurezza

Prima, definisci il tuo schema di sicurezza per chiave API nel tuo pacchetto di design:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// APIKeyAuth definisce il nostro schema di sicurezza
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Sicurezza con chiave API")
    Header("X-API-Key")  // Specifica nome header
})
```

Puoi anche usare parametri query invece degli header:

```go
var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Sicurezza con chiave API")
    Query("api_key")  // Specifica nome parametro query
})
```

### 2. Applicare lo Schema di Sicurezza

Come altri schemi di sicurezza, l'autenticazione con chiave API può essere applicata
a diversi livelli:

```go
// Livello API - si applica a tutti i servizi e metodi
var _ = API("secure_api", func() {
    Security(APIKeyAuth)
})

// Livello Servizio - si applica a tutti i metodi nel servizio
var _ = Service("secure_service", func() {
    Security(APIKeyAuth)
})

// Livello Metodo - si applica solo a questo metodo
Method("secure_method", func() {
    Security(APIKeyAuth)
})
```

### 3. Definire il Payload

Per i metodi che usano l'autenticazione con chiave API, includi la chiave nel payload:

```go
Method("getData", func() {
    Security(APIKeyAuth)
    Payload(func() {
        APIKey("api_key", "key", String, func() {
            Description("Chiave API per l'autenticazione")
            Example("abcdef123456")
        })
        Required("key")
        
        // Campi payload aggiuntivi
        Field(1, "query", String, "Query di ricerca")
    })
    Result(ArrayOf(String))
    Error("unauthorized")
    HTTP(func() {
        GET("/data")
        // Mappa la chiave sull'header
        Header("key:X-API-Key")
        Response("unauthorized", StatusUnauthorized)
    })
})
```

### 4. Implementare il Gestore di Sicurezza

Quando Goa genera il codice, dovrai implementare un gestore di sicurezza:

```go
// SecurityAPIKeyFunc implementa la logica di autorizzazione per l'autenticazione con chiave API
func (s *service) APIKeyAuth(ctx context.Context, key string) (context.Context, error) {
    // Implementa qui la tua logica di validazione chiave
    valid, err := s.validateAPIKey(key)
    if err != nil {
        return ctx, err
    }
    if !valid {
        return ctx, genservice.MakeUnauthorized(fmt.Errorf("chiave API non valida"))
    }
    
    // Puoi aggiungere dati specifici della chiave al contesto
    ctx = context.WithValue(ctx, "api_key_id", key)
    return ctx, nil
}

func (s *service) validateAPIKey(key string) (bool, error) {
    // Implementazione della validazione chiave
    // Questo potrebbe controllare contro un database, cache, ecc.
    return key == "valid-key", nil
}
```

## Best Practice per l'Autenticazione con Chiave API

### 1. Generazione Chiavi

Genera chiavi API forti e casuali:

```go
func GenerateAPIKey() string {
    // Genera 32 byte casuali
    bytes := make([]byte, 32)
    if _, err := rand.Read(bytes); err != nil {
        panic(err)
    }
    // Codifica in base64
    return base64.URLEncoding.EncodeToString(bytes)
}
```

### 2. Archiviazione Chiavi

Archivia le chiavi API in modo sicuro:
- Fai l'hash delle chiavi prima di archiviarle
- Usa store chiave-valore o database sicuri
- Implementa meccanismi di rotazione chiavi

Esempio di schema archiviazione chiavi:

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL,
    client_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

### 3. Metadati Chiave

Associa metadati alle chiavi API per un migliore controllo:

```go
type APIKeyMetadata struct {
    ClientID    string
    Plan        string    // es. "free", "premium"
    Permissions []string  // es. ["read", "write"]
    ExpiresAt   time.Time
}

func (s *service) APIKeyAuth(ctx context.Context, key string) (context.Context, error) {
    metadata, err := s.getAPIKeyMetadata(key)
    if err != nil {
        return ctx, err
    }
    
    // Aggiungi metadati al contesto
    ctx = context.WithValue(ctx, "api_key_metadata", metadata)
    return ctx, nil
}
```

## Esempio di Implementazione

Ecco un esempio completo che mostra come implementare l'autenticazione con chiave API
in un servizio Goa:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var APIKeyAuth = APIKeySecurity("api_key", func() {
    Description("Autentica usando una chiave API")
    Header("X-API-Key")
})

var _ = API("weather_api", func() {
    Title("API Meteo")
    Description("API previsioni meteo con autenticazione chiave API")
    
    // Applica autenticazione chiave API di default
    Security(APIKeyAuth)
})

var _ = Service("weather", func() {
    Description("Servizio previsioni meteo")
    
    Method("forecast", func() {
        Description("Ottieni previsioni meteo")
        
        Payload(func() {
            // La chiave API sarà inclusa automaticamente
            Field(1, "location", String, "Località per cui ottenere le previsioni")
            Field(2, "days", Int, "Numero di giorni da prevedere")
            Required("location")
        })
        
        Result(func() {
            Field(1, "location", String, "Località")
            Field(2, "forecast", ArrayOf(WeatherDay))
        })
        
        HTTP(func() {
            GET("/forecast/{location}")
            Param("days")
            Response(StatusOK)
            Response(StatusUnauthorized, func() {
                Description("Chiave API non valida o mancante")
            })
            Response(StatusTooManyRequests, func() {
                Description("Limite di velocità superato")
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

## Gestione delle Chiavi API

### 1. Rotazione delle Chiavi

Implementa un sistema per la rotazione periodica delle chiavi:

```go
func (s *service) rotateAPIKey(clientID string) error {
    // Genera nuova chiave
    newKey := GenerateAPIKey()
    
    // Archivia nuova chiave con periodo di grazia
    if err := s.storeNewAPIKey(clientID, newKey); err != nil {
        return err
    }
    
    // Notifica client della nuova chiave
    return s.notifyClientOfNewKey(clientID, newKey)
}
```

### 2. Rate Limiting

Implementa rate limiting basato sulla chiave API:

```go
func (s *service) checkRateLimit(key string) error {
    // Ottieni limiti per questa chiave
    limits, err := s.getAPIKeyLimits(key)
    if err != nil {
        return err
    }
    
    // Controlla e aggiorna conteggi richieste
    if exceeded := s.rateLimit.Check(key, limits); exceeded {
        return ErrRateLimitExceeded
    }
    
    return nil
}
```

### 3. Monitoraggio e Logging

Traccia l'utilizzo delle chiavi API:

```go
func (s *service) logAPIKeyUsage(ctx context.Context, key string) {
    metadata := ctx.Value("api_key_metadata").(APIKeyMetadata)
    
    s.metrics.RecordAPICall(metadata.ClientID, metadata.Plan)
    s.logger.Info("API call",
        "client_id", metadata.ClientID,
        "plan", metadata.Plan,
        "endpoint", ctx.Value("endpoint"),
    )
}
``` 