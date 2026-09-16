---
title: "Costruisci con Goa"
linkTitle: "Documentazione"
weight: 1
description: "Un linguaggio di progettazione per servizi Go e agenti IA. Un flusso di lavoro chiaro per sviluppatori e agenti di coding."
hide_children: true
---

Goa è un framework Go che offre agli agenti di sviluppo meno codice da scrivere e un unico contratto su cui ragionare. Genera API, client e validazione. Crea agenti AI, server MCP e tool registry con Goa-AI.

## Scegli da dove iniziare

- **[Crea un servizio con Goa](1-goa/quickstart/).** Definisci un’API in Go, genera server e client HTTP, poi implementa la logica di business.
- **[Crea un agente IA con Goa-AI](2-goa-ai/quickstart/).** Definisci tool tipizzati, genera un agente locale e collega il tuo planner e modello.
- **[Sviluppa con un agente di coding](ai-development/).** Fornisci un progetto mirato, confini di modifica espliciti e un ciclo ripetibile di generazione e test.

Goa e Goa-AI condividono linguaggio e generatore. Puoi usare Goa da solo, iniziare direttamente con Goa-AI oppure esporre un metodo di servizio come tool con gli stessi tipi.

## Come si collegano le parti

**Il progetto descrive il contratto.** Tipi, descrizioni, regole di validazione, esempi e operazioni vivono nel codice Go. Goa-AI aggiunge agenti, toolset, completamenti strutturati e suite di valutazione.

**Il generatore deriva il codice.** `goa gen` produce interfacce, trasporti, client, schemi e collegamenti. `gen/` contiene codice generato; il codice dell’applicazione vive altrove.

**L’applicazione implementa il comportamento.** Tu e il tuo agente scrivete logica dei servizi, planner, persistenza, autorizzazione e test. Dopo una modifica al contratto, rigenera e usa compilatore e test per guidare l’aggiornamento.

## Documentazione per persone e agenti

La navigazione distingue guide introduttive, guide pratiche e riferimenti. Ogni pagina offre **Copia pagina** e una versione **Markdown**. L’[indice per gli agenti](/it/llms.txt) collega le pagine da fornire come contesto mirato.

Esplora l’[ecosistema Goa](3-ecosystem/) per osservabilità, eventi distribuiti e diagrammi. Consulta [come contribuire](contributing/) per segnalare problemi o migliorare le guide.
