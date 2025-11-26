---
title: "UI Streaming"
linkTitle: "UI Streaming"
weight: 2
description: "Costruisci interfacce utente realtime che consumano eventi streaming Goa-AI."
---

Goa-AI fornisce uno stream di eventi strutturati che ti permette di costruire UI responsive e realtime.

## Eventi Stream

Goa-AI emette questi tipi di evento:

- **`AssistantReply`** – Chunk di testo assistente
- **`PlannerThought`** – Blocchi thinking/reasoning
- **`ToolStart`** – Esecuzione tool iniziata
- **`ToolUpdate`** – Aggiornamenti progresso tool
- **`ToolEnd`** – Tool completato con risultato
- **`AgentRunStarted`** – Child agent run (con link)
- **`AwaitClarification`** – In attesa di input utente
- **`AwaitExternalTools`** – In attesa di tool esterni
- **`Usage`** – Metriche token usage
- **`Workflow`** – Cambiamenti stato workflow

## Connessione allo Stream

```go
type MySink struct{}

func (s *MySink) OnEvent(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case *stream.AssistantReply:
        fmt.Printf("Assistente: %s", e.Text)
    case *stream.ToolStart:
        fmt.Printf("Tool avviato: %s", e.ToolID)
    case *stream.ToolEnd:
        fmt.Printf("Tool terminato: %s", e.ToolID)
    case *stream.AgentRunStarted:
        fmt.Printf("Agente figlio: %s (run: %s)", e.AgentID, e.ChildRunID)
    }
    return nil
}

// Sottoscrivi
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil {
    return err
}
defer stop()
```

## Pattern di Design UI

### Messaggi Chat

Bufferizza eventi `AssistantReply` per costruire il contenuto messaggio corrente:

```typescript
const [message, setMessage] = useState("");

onEvent((event) => {
  if (event.type === "assistant_reply") {
    setMessage(prev => prev + event.text);
  }
});
```

### Stato Tool

Traccia `ToolStart` e `ToolEnd` per mostrare indicatori di caricamento:

```typescript
const [activeTools, setActiveTools] = useState<Set<string>>(new Set());

onEvent((event) => {
  if (event.type === "tool_start") {
    setActiveTools(prev => new Set([...prev, event.toolCallId]));
  }
  if (event.type === "tool_end") {
    setActiveTools(prev => {
      const next = new Set(prev);
      next.delete(event.toolCallId);
      return next;
    });
  }
});
```

### Agenti Annidati

Usa `AgentRunStarted` per creare UI agente figlio:

```typescript
onEvent((event) => {
  if (event.type === "agent_run_started") {
    // Sottoscrivi con childRunId per ottenere eventi figlio
    subscribeToRun(event.childRunId);
  }
});
```

## Prossimi Passi

- Impara la struttura eventi completa in [Transcript](../../3-concepts/5-transcripts.md)
- Comprendi gestione stream annidati in [Run Tree](../../3-concepts/8-run-trees-streaming-topology.md)


