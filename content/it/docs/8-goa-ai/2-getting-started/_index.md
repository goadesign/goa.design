---
title: "Per Iniziare"
linkTitle: "Per Iniziare"
weight: 2
description: >
  Inizia rapidamente con Goa-AI - installazione, setup e il tuo primo agente.
menu:
  main:
    weight: 2
---

Questa sezione ti guida attraverso l'inizio dello sviluppo con Goa-AI. Imparerai come:

1. [Configurare il tuo ambiente di sviluppo](./1-installation/) con moduli Go e la CLI Goa
2. [Creare il tuo primo agente](./2-first-agent/) usando l'approccio design-first di Goa-AI

## Cosa Aspettarsi

Quando lavori con Goa-AI, il tuo workflow di sviluppo segue tipicamente questi passi:

1. **Design First**: Scrivi la definizione del tuo agente usando il DSL di Goa-AI in Go
2. **Genera Codice**: Usa la CLI Goa per generare package agente, specifiche tool e workflow
3. **Implementa Planner**: Aggiungi la tua logica planner (integrazione LLM, selezione tool)
4. **Collega Runtime**: Configura il runtime con engine, store e moduli feature
5. **Testa e Esegui**: Usa il client generato per testare il tuo agente

## Scegli il Tuo Percorso

Dopo aver completato le guide per iniziare, puoi:

- Seguire il [Tutorial Agente Semplice](../4-tutorials/1-simple-agent/) per un approfondimento sulla costruzione di agenti base
- Esplorare la [Composizione di Agenti](../4-tutorials/2-agent-composition/) per imparare i pattern agent-as-tool
- Scoprire l'[Integrazione MCP](../4-tutorials/3-mcp-toolsets/) per consumare suite di tool esterni

## Best Practice

- **Mantieni i tuoi file di design in un package `design` separato**: Questa separazione aiuta a mantenere una chiara distinzione tra il design e l'implementazione del tuo agente. Rende più facile gestire le modifiche al contratto dell'agente indipendentemente dalla logica del planner.

- **Esegui `goa gen` dopo qualsiasi modifica al design**: Mantenere il codice generato sincronizzato con il tuo design è cruciale. Eseguire `goa gen` assicura che i tuoi package agente, specifiche tool e workflow riflettano sempre il design corrente dell'agente.

- **Versiona il tuo codice generato**: Mentre il codice generato può essere ricreato, versionarlo aiuta a tracciare l'evoluzione dell'agente, rende i deployment più affidabili e abilita revisioni del codice più facili per le modifiche all'agente.

- **Usa le specifiche tool generate**: Le specifiche tool auto-generate servono come risorsa preziosa sia per lo sviluppo che per la validazione. Forniscono accesso type-safe ai payload e risultati dei tool.

- **Segui convenzioni di naming consistenti**: Usa nomi descrittivi e consistenti per i tuoi agenti, toolset e tool nel tuo design. Questo rende l'architettura del tuo agente più intuitiva e facile da mantenere.

- **Sfrutta il sistema di tipi di Goa**: Approfitta del ricco sistema di tipi di Goa per definire payload tool precisi e regole di validazione nel tuo design. Questo riduce il codice di validazione boilerplate e assicura una gestione dei dati consistente.

Pronto per iniziare? Parti con l'[Installazione](./1-installation/) per configurare il tuo ambiente di sviluppo Goa-AI.
