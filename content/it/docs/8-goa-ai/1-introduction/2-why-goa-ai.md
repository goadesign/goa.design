---
title: "Perché Goa-AI?"
linkTitle: "Perché Goa-AI?"
weight: 2
description: "Scopri perché Goa-AI è la scelta giusta per costruire sistemi agentici robusti."
---

`goa-ai` è un **framework design-first con opinioni precise** per costruire agenti production-grade in Go.

Mentre molti framework si concentrano su *prompt engineering* (catene, template) o *prototipazione rapida*, `goa-ai` si concentra sul **software engineering**: architettura, type safety, affidabilità e componibilità.

Ecco perché lo useresti al posto di una libreria LLM generica:

## 1. Contratti Design-First (Il Modo "Goa")

Definisci i tuoi agenti, tool e policy in un **DSL** (Domain Specific Language). `goa-ai` poi genera il codice di collegamento.

*   **Perché conta**: Non scrivi mai codice fragile di "parsing di stringhe" per gli argomenti dei tool.
*   **Il risultato**: I tuoi tool hanno **schemi forti**. Se un LLM chiama un tool con campi mancanti, il *codice generato* lo cattura al confine e fornisce un **Suggerimento di Auto-Riparazione** strutturato (`RetryHint`) così il planner può correggerlo automaticamente. Ottieni sicurezza a compile-time per l'interfaccia del tuo agente.

## 2. Agenti come Attori di Prima Classe

In `goa-ai`, un agente non è solo un loop di prompt. È un **servizio**.

*   **Agent-as-Tool**: Puoi registrare un intero agente (es. `ResearchAgent`) come *tool* per un altro agente (es. `ChatAgent`).
*   **Alberi di Esecuzione**: Il runtime traccia questa gerarchia. Non "appiattisce" l'esecuzione; mantiene un **Albero di Esecuzione** (Genitore → Figlio → Tool).
*   **Perché conta**: Puoi costruire sistemi complessi da agenti piccoli e specializzati che si compongono in modo pulito. Il runtime gestisce l'"idraulica" del passaggio del contesto e del collegamento delle esecuzioni.

## 3. Streaming Strutturato (Non Solo Testo)

La maggior parte dei framework streamma token di testo grezzi. `goa-ai` streamma **Eventi Tipizzati**.

*   **L'Esperienza**: La tua UI riceve eventi specifici: `AssistantReply`, `PlannerThought`, `ToolStart`, `AgentRunStarted`.
*   **Consapevole della Topologia**: Lo stream dice alla UI *esattamente* cosa sta succedendo: "L'Agente Chat ha appena avviato un'esecuzione figlia dell'Agente di Ricerca."
*   **Perché conta**: Questo abilita **UI Ricche** (come "Card degli Agenti" o "Accordion del Pensiero") invece di solo una bolla di chat. Puoi renderizzare la *struttura* del processo di pensiero, non solo l'output.

## 4. Runtime Pronto per la Produzione

È costruito per le operazioni del "Giorno 2", non solo per le demo.

*   **Durabilità**: Supporto di prima classe per workflow **Temporal**. I tuoi agenti possono funzionare per giorni (es. "Monitora questo incidente") e sopravvivere ai riavvii.
*   **Policy e Cap**: Applica limiti rigorosi (es. "Max 5 chiamate tool", "budget di 2 minuti").
*   **Osservabilità**: Ogni esecuzione è tracciata con `RunID`, `SessionID` e `TurnID`. Puoi persistere i transcript su Mongo e cercarli in seguito.
*   **Integrazione MCP**: Supporto nativo per il **Model Context Protocol**, così i tuoi agenti possono usare istantaneamente server di tool esterni (GitHub, Slack, Postgres).

## Riassunto: Sistemi vs Script

Usa `goa-ai` se stai costruendo **sistemi**, non solo script.

*   **Se vuoi**: Mettere insieme un veloce script per "chattare con un PDF" o prototipare un'idea in un pomeriggio -> Usa una libreria di linguaggio dinamico.
*   **Se vuoi**: Costruire una piattaforma affidabile e scalabile dove gli agenti sono servizi, i tool sono fortemente tipizzati e le UI riflettono lo stato reale del sistema -> **Usa `goa-ai`**.
