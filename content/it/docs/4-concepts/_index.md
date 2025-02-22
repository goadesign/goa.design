---
title: "Concetti Fondamentali"
linkTitle: "Concetti"
weight: 4
description: >
  Approfondimento dei concetti fondamentali, principi di design e architettura di Goa.
menu:
  main:
    weight: 4
---

Scopri i concetti fondamentali e i principi architetturali di Goa. Questa sezione spiega i componenti chiave e i pattern che rendono Goa potente e flessibile.

## Concetti Fondamentali

### 1. [Linguaggio di Design](./1-design-language)
Padroneggia il DSL di Goa per la definizione delle API:
- [Modellazione dei Dati](./1-design-language/1-data-modeling) - Definire tipi e strutture
- [Servizi e Metodi](./1-design-language/2-services-methods) - Creare endpoint dei servizi
- [Mappatura dei Trasporti](./1-design-language/3-transport-mapping) - Configurare binding HTTP/gRPC

### 2. [Generazione del Codice](./2-code-generation)
Comprendi il codice generato:
- [Layout del Codice](./2-code-generation/1-code-layout) - Struttura dei file generati
- [Guida all'Implementazione](./2-code-generation/2-implementing) - Implementazione dei servizi
- [Strutture Dati](./2-code-generation/3-data-structures) - Lavorare con i tipi

### 3. [Middleware e Interceptor](./2-interceptors)
Scopri l'elaborazione delle richieste/risposte:
- [Interceptor Goa](./2-interceptors/1-goa-interceptors) - Middleware indipendente dal trasporto
- [Middleware HTTP](./2-interceptors/2-http-middleware) - Handler specifici per HTTP
- [Interceptor gRPC](./2-interceptors/3-grpc-interceptors) - Interceptor specifici per gRPC

### 4. [Codifica HTTP](./4-http-encoding)
Padroneggia la gestione dei dati HTTP:
- Negoziazione del contenuto
- Encoder/decoder personalizzati
- Implementazioni predefinite

## Architettura Fondamentale

{{< alert title="Architettura Pulita" color="primary" >}}
Goa segue i principi dell'architettura pulita con una chiara separazione delle responsabilità:

**1. Livello di Trasporto**
- Gestisce i protocolli HTTP/gRPC
- Gestisce la codifica/decodifica
- Valida le richieste in arrivo

**2. Livello degli Endpoint**
- Fornisce interfacce indipendenti dal trasporto
- Abilita l'integrazione dei middleware
- Gestisce il flusso di richieste/risposte

**3. Livello dei Servizi**
- Contiene la logica di business
- Implementa le interfacce dei servizi
- Rimane indipendente dal protocollo
{{< /alert >}}

Comprendendo questi concetti, sarai in grado di:
- Progettare API pulite e manutenibili
- Generare codice efficiente e pronto per la produzione
- Implementare una logica di servizio robusta
- Gestire efficacemente le problematiche trasversali

---

Inizia con la sezione [Linguaggio di Design](./1-design-language) per imparare come definire i tuoi servizi usando il DSL di Goa. 