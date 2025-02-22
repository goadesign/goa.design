---
title: "Guida Introduttiva"
linkTitle: "Guida Introduttiva"
weight: 2
description: >
  Inizia rapidamente con Goa - installazione, configurazione e la tua prima API.
menu:
  main:
    weight: 2
---

Questa sezione ti guida attraverso i primi passi con lo sviluppo in Goa. Imparerai come:

1. [Configurare il tuo ambiente di sviluppo](./1-installation/) con i moduli Go e la CLI di Goa
2. [Creare il tuo primo servizio](./2-first-service/) usando l'approccio design-first di Goa

## Cosa Aspettarsi

Quando lavori con Goa, il tuo flusso di sviluppo tipicamente segue questi passi:

1. **Design First**: Scrivi la definizione del tuo servizio usando il DSL di Goa in Go
2. **Genera Codice**: Usa la CLI di Goa per generare il boilerplate, il layer di trasporto e la documentazione
3. **Implementa la Logica**: Aggiungi la tua logica di business alle interfacce di servizio generate
4. **Testa ed Esegui**: Usa il client e il server generati per testare la tua implementazione

## Scegli il Tuo Percorso

Dopo aver completato le guide introduttive, puoi:

- Seguire il [Tutorial API REST](../3-tutorials/1-rest-api/) per un'immersione profonda nella costruzione di servizi HTTP
- Esplorare i [Servizi gRPC](../3-tutorials/2-grpc-service/) per creare API efficienti basate su RPC
- Imparare la [Gestione degli Errori](../3-tutorials/3-error-handling/) per un design robusto dei servizi

## Best Practice

- Mantieni i tuoi file di design in un package `design` separato
- Esegui `goa gen` dopo ogni modifica al design
- Versiona il tuo codice generato
- Usa la documentazione OpenAPI generata per validare il design della tua API

Scegli [Installazione](./1-installation/) per iniziare il tuo viaggio con Goa. 