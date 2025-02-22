---
title: "Cos'è Goa?"
linkTitle: "Cos'è Goa?"
weight: 1
description: "Scopri Goa, un framework design-first per la creazione di microservizi e API in Go, con un potente DSL e capacità di generazione del codice."
---

**Goa** è un framework design-first che rivoluziona il modo in cui costruisci microservizi e API in Go. Al suo centro c'è un elegante linguaggio specifico di dominio (DSL) che ti permette di definire l'intera architettura del tuo servizio in modo chiaro e manutenibile.

## Il Potere dello Sviluppo Design-First

L'approccio design-first di Goa trasforma il modo in cui costruisci le API partendo da una definizione del servizio chiara e precisa. Utilizzando il DSL espressivo di Goa, descrivi l'intera architettura della tua API in un modo comprensibile sia per gli umani che per le macchine.

{{< alert title="Elementi Chiave del Design" color="primary" >}}
**Servizi e Metodi**  
Definisci i comportamenti principali che la tua API fornisce con una sintassi pulita e leggibile. Ogni endpoint, ogni operazione e ogni interazione è chiaramente specificata.

**Strutture Dati**  
Descrivi i tuoi payload, risultati e tipi di errore con precisione type-safe. Goa assicura che i tuoi dati fluiscano esattamente come progettato, dalla validazione degli input alla formattazione delle risposte.

**Mappature di Trasporto**  
Specifica come i tuoi servizi sono esposti - HTTP, gRPC o entrambi. Passa da un protocollo all'altro o supporta più trasporti senza modificare la logica di base del tuo servizio.
{{< /alert >}}

Da queste definizioni, Goa genera codice pronto per la produzione che gestisce tutta la complessa logica di trasporto, permettendoti di concentrarti esclusivamente sulla tua implementazione business. Niente più codice ripetitivo tedioso o traduzioni manuali soggette a errori tra il design della tua API e l'implementazione.

## Perché Questo Approccio è Importante

Quando definisci le tue API prima di implementarle, succede qualcosa di magico:

{{< alert title="Benefici" color="primary" >}}
**Allineamento del Team**  
I contratti di servizio sono concordati prima che venga scritta una singola riga di codice

**Sincronizzazione Perfetta**  
I team frontend e backend lavorano con sicurezza condividendo la stessa comprensione

**Evoluzione Prevedibile**  
Le modifiche alle API diventano gestibili e ben documentate

**Coerenza Naturale**  
Un'unica fonte di verità garantisce pattern uniformi in tutto il sistema
{{< /alert >}}

La filosofia design-first significa individuare potenziali problemi in anticipo, quando sono più facili da risolvere. Il tuo team può rivedere e validare l'interfaccia API prima di investire tempo nell'implementazione.

## Come Funziona Goa

Il percorso dal design al servizio in esecuzione è semplice:

### 1. Progetta il Tuo Servizio
Crea il blueprint del tuo servizio nel DSL di Goa, tipicamente in un package `design`. Questo diventa la tua unica fonte di verità per l'intero servizio.

Ecco come appare la progettazione di un'API con Goa:

```go
var _ = Service("calculator", func() {             // Un servizio raggruppa metodi correlati
   Method("add", func() {                          // Un metodo (endpoint)
        Payload(func() {                           // Il payload del metodo (corpo della richiesta)
            Attribute("a", Int, "Primo numero")    
            Attribute("b", Int, "Secondo numero")
            Required("a", "b")                     // Validazione del payload
        })
        Result(Int)                                // Il risultato del metodo (corpo della risposta)

        HTTP(func() {                              // Dettagli del trasporto HTTP
            GET("/add/{a}/{b}")                    // Verbo e percorso HTTP
            Response(StatusOK)                     // Stato della risposta HTTP
        })
    })
})
```

### 2. Genera il Framework
Esegui `goa gen` e osserva mentre Goa crea il tuo package `gen` contenente:

- **Interfacce di servizio** - Contratti type-safe per implementare la tua logica di business
- **Gestori di trasporto** - Server HTTP/gRPC con gestione completa di richieste/risposte
- **Codificatori/decodificatori** - Serializzazione efficiente dei tuoi tipi di dati
- **Package client** - Librerie client pronte all'uso per i tuoi servizi
- **Specifiche OpenAPI** - Documentazione API completa in formato OpenAPI/Swagger
- **Strumenti da riga di comando** - Client CLI per testare i tuoi servizi
- **Hook middleware** - Punti di estensione per logging, metriche, auth, ecc.

Questo codice generato gestisce tutti i dettagli complessi del trasporto come routing, parsing dei parametri, negoziazione del contenuto e gestione degli errori. È pronto per la produzione, accuratamente testato e segue le migliori pratiche - fornendoti una base solida su cui costruire.

### 3. Aggiungi la Tua Logica
Ora arriva la parte divertente - implementare la tua logica di business. Semplicemente:
- Istanzia i componenti generati
- Implementa le interfacce del servizio
- Collega tutto nella tua applicazione principale

![L'architettura a strati di Goa](/img/layers.png)

{{< alert title="Architettura Pulita" color="primary" >}}
Goa mantiene una chiara separazione tra il codice di trasporto generato e la tua logica di business. Questo significa che puoi far evolvere il tuo servizio senza rimanere impigliato nei dettagli di rete di basso livello.
{{< /alert >}}

## Pronto per Saperne di Più?

Continua con [Perché Goa?](./2-why-goa/) per scoprire come Goa si confronta con altri framework e perché potrebbe essere la scelta perfetta per il tuo prossimo progetto. 