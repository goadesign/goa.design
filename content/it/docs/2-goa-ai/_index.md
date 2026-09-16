---
title: "Goa-AI: agenti da un progetto"
linkTitle: "Goa-AI"
weight: 2
description: "Progetta tool tipizzati e contratti degli agenti in Go. Genera il codice di integrazione e usa un modello di esecuzione esplicito."
llm_optimized: true
---

## Panoramica

Goa-AI estende linguaggio e generatore di Goa alle applicazioni IA. Definisci agenti, input e risultati dei tool, completamenti strutturati, politiche e scenari di valutazione. Genera tipi, schemi, codec e collegamenti; scrivi planner e comportamento applicativo.

**[Crea il primo agente](quickstart/)** o segui il **[flusso con un agente di coding](../ai-development/)**. Non serve distribuire prima un servizio Goa separato.

## Sviluppa con un agente di coding

Schemi e codec Go derivano dallo stesso progetto. Un tool può riusare tipi e implementazione di un servizio tramite `BindTo`. La generazione produce anche **`AGENTS_QUICKSTART.md`**, una guida basata sul tuo progetto. Forniscila all’agente insieme ai file di design, poi implementa planner ed esecutori fuori da `gen/`. Rigenera, compila ed esegui valutazioni a ogni evoluzione.

Questo evita di far scrivere al modello schemi e integrazioni ripetitivi. Non implica una percentuale fissa di risparmio: misura compiti completi, inclusi contesto, tentativi e revisione.

## Integra agenti nel prodotto

### Contratti dei tool {#design-first-agents}

Definisci input e risultati con tipi Goa, descrizioni, esempi e validazione. Il generatore produce schemi JSON e codec tipizzati. Gli argomenti del modello vengono validati prima dell’esecuzione. Vedi [toolset](toolsets/).

### Output strutturato {#typed-direct-completions}

`Completion(...)` dichiara una risposta tipizzata. Gli helper generati, anche streaming, validano il risultato completo. Vedi [DSL](dsl-reference/) e [runtime](runtime/).

### Valutazioni {#generated-evaluations}

Dichiara suite e scenari, genera hook tipizzati e implementa verifiche sugli esiti. La valutazione semantica richiede calibrazione. Vedi [valutazioni generate](evaluations/).

### Composizione {#run-trees-composition}

Esponi un agente come tool di un altro. Le esecuzioni figlie hanno identità, legami al genitore e cronologia. Vedi [composizione](agent-composition/).

### Streaming {#structured-streaming}

Il runtime emette eventi tipizzati per risposte, avanzamento dei tool, input umano e stato. L’applicazione decide cosa esporre e come trasportarlo. Vedi [streaming](production/#interfaccia-utente-di-streaming).

### Esecuzione durevole {#temporal-durability}

Usa il motore in memoria in locale. Configura Temporal per persistenza, ripristino e retry delle attività. Gli effetti esterni richiedono idempotenza e politiche di retry appropriate nell’applicazione. Vedi [produzione](production/).

### Server MCP e tool registry da ospitare {#tool-registries}

**Crea server MCP.** Esponi metodi come tool, pubblica risorse e fornisci template di prompt con gestione del protocollo e adapter generati. Gli agenti possono anche usare tool MCP esterni. Vedi [integrazione MCP](mcp-integration/).

**Ospita un tool registry.** Esegui il server incluso come catalogo condiviso e gateway di invocazione basato su Redis e Pulse. I provider pubblicano toolset e schemi; i consumer scoprono tool e invocano provider sani. Gli helper generati collegano le applicazioni al registry. Vedi [gestione del registry](registry/).

### Modelli e stato {#model-providers}

Sono disponibili adapter per OpenAI, Anthropic, AWS Bedrock e Google Vertex AI. Le capacità variano: consulta il [runtime](runtime/). L’applicazione fornisce storage e controlla sessioni, autorizzazione e memoria. Vedi [memoria e sessioni](memory-sessions/).

## Architettura

Il progetto possiede i contratti statici; il codice generato li rende pacchetti tipizzati. Il runtime coordina l’esecuzione e il motore fornisce workflow locali o durevoli. I planner decidono sul significato; i servizi applicativi possiedono il comportamento di business.

## Guide

Inizia dal quickstart locale, poi aggiungi tool, modelli, stato e distribuzione. Consulta DSL e runtime per i contratti esatti.
