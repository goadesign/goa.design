---
title: "gRPC"
linkTitle: "gRPC"
weight: 4
description: >
  Impara come Goa supporta gRPC, inclusa la generazione di definizioni protobuf, l'implementazione del server e del client, e la gestione degli errori.
---

Goa fornisce un supporto completo per gRPC, permettendoti di esporre i tuoi servizi attraverso questo protocollo efficiente e moderno. Questa sezione copre tutti gli aspetti dell'utilizzo di gRPC in Goa.

{{< alert title="Vedi anche" color="info" >}}
Per le regole trasversali ai trasporti e le modalità di streaming valide per ciascun trasporto, vedi
[Trasporti](../6-trasporti).
{{< /alert >}}

## Concetti Chiave

### 1. Definizioni Protobuf
Goa genera automaticamente le definizioni protobuf per i tuoi servizi, gestendo:
- Mappatura dei tipi Goa sui tipi protobuf
- Numerazione dei campi
- Opzioni protobuf
- Compatibilità con i tipi well-known

### 2. Implementazione del Server
Il codice del server generato include:
- Gestori gRPC per ogni metodo del servizio
- Gestione degli errori e dei codici di stato
- Supporto per lo streaming unario e bidirezionale
- Integrazione dei middleware

### 3. Implementazione del Client
Il codice del client generato fornisce:
- Client gRPC fortemente tipizzati
- Gestione delle connessioni
- Supporto per le opzioni di chiamata
- Integrazione con il livello degli endpoint

### 4. Gestione degli Errori
Goa fornisce un sistema robusto per:
- Mappare gli errori del servizio sui codici di stato gRPC
- Gestire i dettagli degli errori
- Propagare i metadati degli errori
- Mantenere la coerenza tra i trasporti

## Migliori Pratiche

{{< alert title="Linee Guida gRPC" color="primary" >}}
**Design del Servizio**
- Definisci interfacce chiare e concise
- Usa nomi descrittivi per servizi e metodi
- Pianifica per la compatibilità futura
- Documenta il comportamento del servizio

**Implementazione**
- Gestisci correttamente gli errori
- Implementa il controllo del flusso
- Ottimizza le prestazioni
- Testa tutti gli scenari

**Considerazioni Generali**
- Segui le convenzioni gRPC
- Mantieni la compatibilità all'indietro
- Gestisci correttamente le risorse
- Monitora le prestazioni del servizio
{{< /alert >}}

## Integrazione con Altri Trasporti

Goa supporta l'esposizione simultanea dei servizi tramite gRPC e HTTP:
- Definisci mappature per entrambi i trasporti
- Mantieni la coerenza tra i protocolli
- Riutilizza la logica di business
- Gestisci gli errori in modo uniforme

---

Inizia con la [Mappatura dei Trasporti](../1-design-language/5-grpc-mapping) per imparare come definire le tue interfacce gRPC. 