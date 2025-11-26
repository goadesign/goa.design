---
title: "Funzioni Policy"
linkTitle: "Funzioni Policy"
weight: 4
description: "Funzioni per configurare policy runtime e limiti di esecuzione."
---

## RunPolicy

`RunPolicy(dsl)` configura i limiti di esecuzione applicati a runtime. È dichiarato dentro un `Agent` e contiene impostazioni di policy come cap, budget temporali, timing e gestione delle interruzioni.

**Posizione**: `dsl/policy.go`  
**Contesto**: Dentro `Agent`  
**Scopo**: Configura cap e comportamento runtime.

Questi valori appaiono nella configurazione del workflow generato e il runtime li applica ad ogni turno.

### Esempio

```go
Agent("chat", "Runner conversazionale", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
        OnMissingFields("await_clarification")
    })
})
```

## DefaultCaps

`DefaultCaps(opts...)` applica cap di capacità per prevenire loop fuori controllo e imporre limiti di esecuzione. Accetta opzioni come `MaxToolCalls` e `MaxConsecutiveFailedToolCalls`.

**Posizione**: `dsl/policy.go`  
**Contesto**: Dentro `RunPolicy`  
**Scopo**: Applica cap di capacità (chiamate massime, fallimenti consecutivi).

### Esempio

```go
RunPolicy(func() {
    DefaultCaps(
        MaxToolCalls(8),
        MaxConsecutiveFailedToolCalls(3),
    )
})
```

## MaxToolCalls

`MaxToolCalls(n)` imposta il numero massimo di invocazioni tool consentite durante l'esecuzione dell'agente. Se superato, il runtime interrompe e restituisce un errore.

**Posizione**: `dsl/policy.go`  
**Contesto**: Argomento di `DefaultCaps`  
**Scopo**: Opzione helper per cap massimo chiamate tool.

### Esempio

```go
DefaultCaps(MaxToolCalls(8))
```

## MaxConsecutiveFailedToolCalls

`MaxConsecutiveFailedToolCalls(n)` imposta il numero massimo di chiamate tool consecutive fallite consentite prima che il runtime interrompa il run. Questo previene loop di retry infiniti.

**Posizione**: `dsl/policy.go`  
**Contesto**: Argomento di `DefaultCaps`  
**Scopo**: Opzione helper per cap fallimenti consecutivi.

### Esempio

```go
DefaultCaps(MaxConsecutiveFailedToolCalls(3))
```

## TimeBudget

`TimeBudget(duration)` impone un limite wall-clock sull'esecuzione dell'agente. Il runtime monitora il tempo trascorso e interrompe quando viene superato. La durata è specificata come stringa (es., `"2m"`, `"30s"`).

**Posizione**: `dsl/policy.go`  
**Contesto**: Dentro `RunPolicy`  
**Scopo**: Imposta il tempo massimo di esecuzione wall-clock.

### Esempio

```go
RunPolicy(func() {
    TimeBudget("2m") // 2 minuti
})
```

## InterruptsAllowed

`InterruptsAllowed(bool)` segnala al runtime che le interruzioni human-in-the-loop devono essere onorate. Quando abilitato, il runtime supporta operazioni di pausa/ripresa tramite l'API di interrupt.

**Posizione**: `dsl/policy.go`  
**Contesto**: Dentro `RunPolicy`  
**Scopo**: Abilita la gestione dell'interruzione del run.

### Esempio

```go
RunPolicy(func() {
    InterruptsAllowed(true)
})
```

## OnMissingFields

`OnMissingFields(action)` configura come l'agente risponde quando la validazione dell'invocazione tool rileva campi obbligatori mancanti. Questo permette di controllare se l'agente deve fermarsi, attendere input utente, o continuare l'esecuzione.

**Posizione**: `dsl/policy.go`  
**Contesto**: Dentro `RunPolicy`  
**Scopo**: Configura la risposta ai fallimenti di validazione.

Valori validi:

- `"finalize"`: Ferma l'esecuzione quando mancano campi obbligatori
- `"await_clarification"`: Pausa e attende che l'utente fornisca le informazioni mancanti
- `"resume"`: Continua l'esecuzione nonostante i campi mancanti
- `""` (vuoto): Lascia decidere al planner in base al contesto

### Esempio

```go
RunPolicy(func() {
    OnMissingFields("await_clarification")
})
```

## Timing

`Timing(dsl)` definisce la configurazione dettagliata del timing di run per un agente. Usalo per configurare timeout granulari per diverse fasi di esecuzione.

**Posizione**: `dsl/timing.go`  
**Contesto**: Dentro `RunPolicy`  
**Scopo**: Configura impostazioni di timeout granulari.

### Esempio

```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // wall-clock complessivo
        Plan("45s")     // timeout per attività Plan/Resume
        Tools("2m")     // timeout predefinito per attività tool
    })
})
```

## Budget

`Budget(duration)` imposta il budget wall-clock totale per un run. Questa è un'alternativa a `TimeBudget` quando si usa il blocco `Timing`.

**Posizione**: `dsl/timing.go`  
**Contesto**: Dentro `Timing`  
**Scopo**: Imposta il budget temporale di esecuzione complessivo.

### Esempio

```go
Timing(func() {
    Budget("10m")
})
```

## Plan

`Plan(duration)` imposta il timeout sia per le attività Plan che Resume. Queste sono le chiamate di inferenza LLM che producono richieste tool.

**Posizione**: `dsl/timing.go`  
**Contesto**: Dentro `Timing`  
**Scopo**: Imposta il timeout per le attività del planner.

### Esempio

```go
Timing(func() {
    Plan("45s") // 45 secondi per ogni step di pianificazione
})
```

## Tools

`Tools(duration)` imposta il timeout predefinito per le attività ExecuteTool. Le singole esecuzioni tool che superano questa durata vengono interrotte.

**Posizione**: `dsl/timing.go`  
**Contesto**: Dentro `Timing`  
**Scopo**: Imposta il timeout predefinito per l'esecuzione dei tool.

### Esempio

```go
Timing(func() {
    Tools("2m") // 2 minuti per esecuzione tool
})
```

## Esempio di Policy Completa

```go
Agent("chat", "Runner conversazionale", func() {
    RunPolicy(func() {
        // Limita il numero di chiamate tool
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        
        // Configura timing dettagliato
        Timing(func() {
            Budget("5m")    // budget totale run
            Plan("30s")     // timeout planner
            Tools("1m")     // timeout esecuzione tool
        })
        
        // Permetti interruzioni human-in-the-loop
        InterruptsAllowed(true)
        
        // Gestisci fallimenti di validazione
        OnMissingFields("await_clarification")
    })
})
```

## Prossimi Passi

- Impara i [Concetti Runtime](../2-runtime/) per capire come vengono applicate le policy
- Esplora le [Funzioni Toolset](./3-toolset-functions.md) per definire tool
- Leggi le [Funzioni MCP DSL](./5-mcp-functions.md) per l'integrazione con server MCP
