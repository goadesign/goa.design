---
linkTitle: Interceptor gRPC
title: Interceptor gRPC
weight: 2
description: >
  Scopri come utilizzare gli interceptor gRPC in Goa per gestire aspetti specifici del protocollo gRPC come la gestione delle chiamate unarie e di streaming.
---

Gli interceptor gRPC in Goa sono componenti che operano specificamente sul livello di trasporto gRPC. Questi interceptor possono intercettare e modificare le chiamate RPC, gestire i metadati e implementare funzionalità specifiche per gRPC.

## Tipi di Interceptor

### 1. [Interceptor Unari](./unary)
Gli interceptor unari gestiscono le chiamate RPC singole:
- Gestione delle richieste/risposte
- Validazione dei metadati
- Logging e monitoraggio
- Gestione degli errori

### 2. [Interceptor di Streaming](./stream)
Gli interceptor di streaming gestiscono le chiamate RPC di streaming:
- Gestione dei flussi bidirezionali
- Controllo del flusso
- Gestione della connessione
- Recupero dagli errori

## Implementazione

Gli interceptor gRPC in Goa seguono il pattern standard di gRPC:

```go
func UnaryInterceptor(ctx context.Context, req interface{},
    info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    // Pre-processing
    // Modifica la richiesta o i metadati
    
    resp, err := handler(ctx, req)
    
    // Post-processing
    // Modifica la risposta o gestisci gli errori
    
    return resp, err
}

func StreamInterceptor(srv interface{}, ss grpc.ServerStream,
    info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
    // Pre-processing
    // Configura lo stream o i metadati
    
    err := handler(srv, ss)
    
    // Post-processing
    // Gestisci gli errori o pulisci le risorse
    
    return err
}
```

## Migliori Pratiche

{{< alert title="Linee Guida per gli Interceptor gRPC" color="primary" >}}
**Design**
- Mantieni gli interceptor focalizzati
- Gestisci correttamente i metadati
- Considera la sicurezza
- Documenta il comportamento

**Implementazione**
- Gestisci tutti i tipi di chiamate
- Implementa una gestione robusta degli errori
- Mantieni le prestazioni sotto controllo
- Testa tutti gli scenari

**Considerazioni Generali**
- Rispetta le convenzioni gRPC
- Gestisci correttamente i timeout
- Mantieni la compatibilità con i client
- Monitora il comportamento
{{< /alert >}}

## Catena degli Interceptor

Gli interceptor gRPC vengono eseguiti in un ordine specifico:
1. Interceptor di sicurezza
2. Interceptor di logging
3. Interceptor di validazione
4. Interceptor applicativi
5. Handler del servizio

Questo permette di:
- Garantire la sicurezza prima di tutto
- Registrare tutte le chiamate
- Validare le richieste
- Mantenere una chiara separazione delle responsabilità

## Esempi Comuni

Alcuni scenari comuni di utilizzo degli interceptor gRPC includono:
- Autenticazione e autorizzazione
- Logging delle chiamate RPC
- Validazione delle richieste
- Gestione dei timeout
- Rate limiting
- Caching delle risposte
- Tracciamento delle chiamate
- Metriche e monitoraggio

---

Inizia con gli [Interceptor Unari](./unary) per imparare come gestire le chiamate RPC singole. 