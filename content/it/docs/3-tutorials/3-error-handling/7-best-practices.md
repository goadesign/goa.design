---
title: Best Practice
linkTitle: Best Practice
weight: 7
description: "Linee guida essenziali e pratiche raccomandate per implementare una gestione degli errori robusta nei tuoi servizi Goa, incluse convenzioni di denominazione e strategie di testing."
---

Implementare una gestione degli errori robusta è essenziale per costruire API affidabili e
manutenibili. Ecco alcune best practice da seguire quando si definiscono e
gestiscono gli errori nei tuoi servizi basati su Goa:

## 1. Denominazione Coerente degli Errori

Nomi Descrittivi: Usa nomi chiari e descrittivi per i tuoi errori che
riflettano accuratamente il problema. Questo rende più facile per gli sviluppatori capire
e gestire gli errori appropriatamente.

Esempio Buono:

```go
Error("DivByZero", func() { Description("DivByZero viene restituito quando il divisore è zero.") })
```

Esempio Cattivo:

```go
Error("Error1", func() { Description("Si è verificato un errore non specificato.") })
```

## 2. Preferire ErrorResult Rispetto ai Tipi Personalizzati

**Semplicità:** Usa il tipo ErrorResult predefinito per la maggior parte degli errori per mantenere
semplicità e coerenza attraverso il tuo servizio.

**Quando Usare Tipi Personalizzati:** Riserva i tipi di errore personalizzati per scenari in cui
hai bisogno di includere informazioni contestuali aggiuntive oltre a quelle che ErrorResult
fornisce.

Usando ErrorResult:

```go
var _ = Service("calculator", func() {
    Error("InvalidInput", func() { Description("Input non valido fornito.") })
})
```

oppure:

```go
var _ = Service("calculator", func() {
    Error("InvalidInput", ErrorResult, "Input non valido fornito.")
})
```

Usando Tipi Personalizzati:

```go
var _ = Service("calculator", func() {
    Error("InvalidOperation", InvalidOperation, "Operazione non supportata.")
})
```

## 3. Utilizzare le Funzionalità del DSL

**Flag di Errore:** Sfrutta le funzionalità del DSL come `Temporary()`, `Timeout()` e
`Fault()` per fornire metadati aggiuntivi sugli errori. Questo arricchisce le informazioni
sull'errore e aiuta in una migliore gestione lato client.

Esempio:

```go
Error("ServiceUnavailable", func() { 
    Description("ServiceUnavailable viene restituito quando il servizio è temporaneamente non disponibile.")
    Temporary()
})
```

Descrizioni: Fornisci sempre descrizioni significative per i tuoi errori per aiutare nella
documentazione e nella comprensione da parte del client.

## 4. Documentare gli Errori Accuratamente

**Descrizioni Chiare:** Assicurati che ogni errore abbia una descrizione chiara e concisa.
Questo aiuta i client a capire il contesto e la ragione dell'errore.

**Documentazione Generata:** Approfitta della capacità di Goa di generare
documentazione dalle tue definizioni DSL. Errori ben documentati migliorano l'esperienza
dello sviluppatore per i consumatori dell'API.

Esempio:

```go
Error("AuthenticationFailed", ErrorResult, Description("AuthenticationFailed viene restituito quando le credenziali dell'utente non sono valide."))
```

## 5. Implementare una Corretta Mappatura degli Errori

**Coerenza del Trasporto:** Assicurati che gli errori siano mappati coerentemente su
codici di stato specifici del trasporto appropriati (HTTP, gRPC) per fornire risposte
significative ai client.

**Automatizzare le Mappature:** Usa il DSL di Goa per definire queste mappature, riducendo il rischio
di incoerenze e codice boilerplate.

Esempio: 

```go
var _ = Service("auth", func() {
    Error("InvalidToken", func() {
        Description("InvalidToken viene restituito quando il token fornito non è valido.")
    })

    HTTP(func() {
        Response("InvalidToken", StatusUnauthorized)
    })

    GRPC(func() {
        Response("InvalidToken", CodeUnauthenticated)
    })
})
```

## 6. Testare la Gestione degli Errori

**Test Automatizzati:** Scrivi test automatizzati per assicurarti che gli errori siano correttamente
definiti, mappati e gestiti. Questo aiuta a individuare problemi presto nel processo di
sviluppo.

**Simulazioni Client:** Simula interazioni client per verificare che gli errori siano
comunicati come previsto attraverso diversi trasporti.

Esempio di Caso di Test:

```go
func TestDivideByZero(t *testing.T) {
    svc := internal.NewDividerService()
    _, err := svc.Divide(context.Background(), &divider.DividePayload{A: 10, B: 0})
    if err == nil {
        t.Fatalf("atteso errore, ottenuto nil")
    }
    if serr, ok := err.(*goa.ServiceError); !ok || serr.Name != "DivByZero" {
        t.Fatalf("atteso errore DivByZero, ottenuto %v", err)
    }
}
```

## Conclusione

Aderire a queste best practice assicura che i tuoi servizi basati su Goa abbiano un
meccanismo di gestione degli errori robusto e coerente. Sfruttando le funzionalità
del DSL di Goa, mantenendo definizioni di errore chiare e descrittive e implementando
test approfonditi, puoi costruire API che sono sia amichevoli per gli sviluppatori che
affidabili per gli utenti finali. 