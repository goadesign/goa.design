---
title: "Toolset MCP"
linkTitle: "Toolset MCP"
weight: 3
description: "Integra server Model Context Protocol (MCP) con agenti Goa-AI."
---

Questo tutorial mostra come integrare server Model Context Protocol (MCP) con agenti Goa-AI. MCP è un protocollo standardizzato per esporre tool, prompt e risorse a sistemi esterni.

## Cos'è MCP

MCP è un protocollo aperto per agenti AI che interagiscono con servizi esterni. Goa-AI supporta integrazione **consumer** con server MCP, permettendo ai tuoi agenti di usare tool esposti da server MCP.

## Configurare MCP nel Design

```go
package design

import (
    . "goa.design/goa-ai/dsl"
    . "goa.design/goa/v3/dsl"
)

var _ = Service("assistant", func() {
    Agent("helper", "Assistente che usa tool MCP", func() {
        // Connetti a un server MCP
        UseMCP("filesystem", func() {
            Description("Operazioni filesystem")
            Server("npx", "@modelcontextprotocol/server-filesystem", "/allowed/path")
        })
    })
})
```

## Come Funziona

Quando configuri un server MCP:

- Goa-AI avvia il processo server e parla il protocollo MCP
- Scopre i tool che il server espone
- Aggiunge questi tool alla lista tool disponibili dell'agente
- Proxy le chiamate tool come richieste MCP e converte le risposte in formato Goa-AI

## Funzionalità Chiave

- **Auto-discovery**: I tool del server MCP diventano automaticamente disponibili all'agente
- **Conversione tipi**: Gli schemi MCP vengono convertiti in tipi Goa-AI
- **Gestione errori**: Gli errori MCP sono propriamente convertiti in `ToolError`
- **Gestione lifecycle**: Il runtime gestisce avvio e shutdown del processo server

## Prossimi Passi

- Impara le funzionalità MCP dettagliate in [Concetti Integrazione MCP](../../3-concepts/4-mcp-integration.md)
- Vedi [Funzioni DSL MCP](../../3-concepts/1-dsl/5-mcp-functions.md) per costruire server MCP


