---
title: "Goa: servizi da un progetto"
linkTitle: "Goa"
weight: 1
description: "Definisci il contratto API in Go. Genera tipi, trasporti, client, validazione e documentazione."
llm_optimized: true
---

## Panoramica

Goa crea servizi Go a partire da un progetto. Descrivi tipi, operazioni, errori e mapping di trasporto in un linguaggio specifico del dominio (DSL) scritto in Go. Il generatore produce il codice derivato da quelle decisioni; tu implementi il comportamento dietro le interfacce generate.

**[Crea il primo servizio](quickstart/)** oppure segui il **[flusso con un agente di coding](../ai-development/)**.

## Perché aiuta gli agenti di coding

L’agente parte dal contratto invece di ricostruirlo da handler, client e schemi mantenuti separatamente. Modifica il progetto, genera e usa gli errori del compilatore per aggiornare l’applicazione. Il generatore scrive il codice ripetitivo senza farlo produrre al modello. Fornisci il progetto, l’interfaccia rilevante e l’implementazione; consulta i trasporti generati quando il compito lo richiede.

## Come funziona Goa

### Progetta {#phase-1-design-you-write}

Definisci metodi, payload, risultati, validazione e mapping HTTP, gRPC o JSON-RPC in `design/*.go`. Descrizioni ed esempi alimentano la documentazione API.

### Genera {#phase-2-generate-automated}

```bash
goa gen example.com/myservice/design
```

I trasporti scelti determinano l’output: tipi e interfacce Go, server, client, validazione, OpenAPI e, quando applicabile, definizioni Protocol Buffer. Non modificare `gen/`: viene sostituito. `goa example` crea lo scaffolding iniziale senza sovrascrivere i file esistenti.

### Implementa {#phase-3-implement-you-write}

Scrivi logica, autorizzazione, persistenza e test. Dopo una modifica alla firma di un metodo, rigenera e compila per individuare chiamanti e implementazioni incompatibili.

## Responsabilità {#whats-hand-written-vs-auto-generated}

Tu e l’agente mantenete progetto, decisioni di dominio, logica, autorizzazione, avvio e test. Goa genera tipi, interfacce, routing, codec, validazione, client e specifiche API. La validazione generata controlla i vincoli dichiarati: correttezza del business, sicurezza e compatibilità con client già distribuiti richiedono progettazione e test.

## Aggiungi capacità IA

[Goa-AI](../2-goa-ai/) usa lo stesso modello per tool tipizzati, risposte strutturate e agenti. Un tool può riusare tipi e metodi di servizio, mantenendo collegati i contratti.

## Guide

Inizia dal quickstart, poi usa le guide di trasporto per i compiti pratici e il riferimento DSL per modificare i progetti.
