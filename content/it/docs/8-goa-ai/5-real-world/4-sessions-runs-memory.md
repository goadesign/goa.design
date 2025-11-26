---
title: "Sessioni, Run e Memoria"
linkTitle: "Sessioni & Run"
weight: 4
description: "Comprendi la relazione tra sessioni, run e memoria in Goa-AI."
---

Goa-AI organizza l'esecuzione degli agenti gerarchicamente: le sessioni contengono run, i run contengono turni, e la memoria attraversa tutto.

## Gerarchia

```
Sessione
  └─ Run (una esecuzione di un agente)
       └─ Turno (round-trip di messaggi)
            └─ Chiamate Tool
```

## Sessioni

Una **Sessione** è un'unità di conversazione. Quando un utente inizia una chat, viene creata una sessione. Le sessioni tracciano:

- ID sessione unico
- Timestamp di creazione
- Riferimenti ai run correlati
- Metadati opzionali (ID utente, contesto, ecc.)

```go
session, err := rt.CreateSession(ctx, &session.CreateInput{
    Metadata: map[string]string{
        "user_id": "user-123",
    },
})
```

## Run

Un **Run** è una esecuzione di un agente. Ogni volta che un utente invia un messaggio, viene iniziato un nuovo run. I run includono:

- ID run unico
- Riferimento alla sessione padre
- Stato (running, completed, failed, ecc.)
- Timestamp (inizio, fine)
- Label opzionali (per policy)

```go
result, err := rt.Run(ctx, agentID, prompt, agent.WithSession(sessionID))
```

## Memoria

La **Memoria** è contesto a lungo termine che persiste oltre la cronologia conversazionale. La memoria può essere usata per:

- Preferenze utente
- Fatti appresi
- Contesto condiviso tra agenti

```go
// Salva memoria
err := rt.StoreMemory(ctx, &memory.Entry{
    Key:     "user-preference",
    Value:   "dark mode",
    Scope:   memory.ScopeSession,
    Session: sessionID,
})

// Recupera memoria
entry, err := rt.GetMemory(ctx, "user-preference", sessionID)
```

## Esempio Pratico

Un tipico flusso applicazione chat:

1. Utente inizia chat → **Sessione creata**
2. Utente invia messaggio → **Run iniziato**
3. Agente usa tool → **Chiamata tool registrata**
4. Agente risponde → **Run completato**
5. Utente invia altro messaggio → **Nuovo run iniziato**
6. Sessione termina → **Sessione aggiornata**

Questo modello permette:

- **Debug**: Ispeziona ogni run individualmente
- **Audit**: Traccia tutte le chiamate tool e decisioni
- **Ripresa**: Continua sessioni interrotte


