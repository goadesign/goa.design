---
title: "Scopri Goa"
linkTitle: "Scopri Goa"
weight: 20
description: >
  Documentazione di Goa, un framework design-first per costruire microservizi e API in Go.
---

## Trasforma il Tuo Sviluppo API

Nel mondo dei microservizi e delle API, il divario tra design e implementazione è sempre stato una sfida. Goa colma questo divario con un approccio innovativo che trasforma il modo in cui costruisci i servizi in Go. Mettendo il design in primo piano, Goa elimina il noioso vai e vieni tra specifiche, implementazione e documentazione che affligge lo sviluppo tradizionale.

Immagina di descrivere la tua API una volta sola e generare automaticamente tutto ciò di cui hai bisogno: codice server, librerie client, documentazione e altro ancora. Non è solo un sogno: è ciò che Goa offre. Sfruttando il sistema di tipi di Go e i principi di design moderni, Goa ti aiuta a costruire servizi robusti e pronti per la produzione in una frazione del tempo.

## Cosa Rende Goa Diverso?

Goa si distingue trattando il design della tua API come un contratto vivente. Questo approccio design-first significa:

* La tua documentazione API è sempre sincronizzata con il tuo codice, perché provengono dalla stessa fonte
* La tua implementazione è garantita corrispondere al tuo design attraverso interfacce type-safe
* Puoi passare da HTTP a gRPC senza cambiare la tua logica di business
* Ti concentri su ciò che conta: costruire funzionalità che apportano valore

## Come Funziona Goa

![L'architettura a strati di Goa](/img/docs/layers.png)

Ecco dove avviene la magia. Da un singolo file di design, Goa scatena una cascata di codice generato che tipicamente richiederebbe settimane per scrivere e mantenere manualmente. Tu ti concentri sul descrivere cosa vuoi, e Goa si occupa del lavoro pesante:

1. Codice di Implementazione - Le Fondamenta
    * Interfacce di servizio e client pronte per la produzione
    * Endpoint indipendenti dal trasporto che mantengono il tuo codice pulito
    * Handler HTTP e gRPC che funzionano e basta
    * Tutta la codifica di richieste/risposte che preferiresti non scrivere

2. Documentazione Che Si Vende Da Sola
    * Specifiche OpenAPI belle e complete
    * Definizioni protocol buffer pronte per l'uso cross-platform
    * Documentazione che evolve con il tuo codice, non come un ripensamento

3. Il Miglio Extra
    * Validazione degli input solida come una roccia
    * Gestione degli errori di livello produzione
    * Librerie client per cui i tuoi utenti ti ringrazieranno

La parte migliore? Mentre Goa genera migliaia di righe di codice boilerplate, test e documentazione, tu scrivi solo il codice che conta - la tua logica di business. Tre righe del tuo codice possono trasformarsi in un servizio completo pronto per la produzione con supporto HTTP e gRPC, strumenti da riga di comando e documentazione API completa.

## Un Esempio Semplice
Ecco come appare la progettazione di un'API con Goa:

```go
var _ = Service("calculator", func() {
    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int, "Primo numero")
            Field(2, "b", Int, "Secondo numero")
            Required("a", "b")
        })
        Result(Int)

        HTTP(func() {
            GET("/add/{a}/{b}")
            Response(StatusOK)
        })
    })
})
```

Ed ecco tutto il codice che devi scrivere per implementarlo:

```go
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

## Concetti Chiave

### Design-First: La Tua Unica Fonte di Verità

Smetti di destreggiarti tra multiple specifiche API, documentazione e file di implementazione. Con Goa, il tuo design è il tuo contratto - una specifica chiara ed eseguibile che mantiene tutti sulla stessa pagina. I team amano questo approccio perché elimina per sempre le conversazioni del tipo "ma non è quello che diceva la specifica".

### Architettura Pulita Che Scala

Goa genera codice che anche gli architetti senior sognano. Ogni componente vive nel suo posto perfetto:
* Layer di Servizio: La tua logica di dominio, pura e pulita
* Layer di Endpoint: Flussi di business indipendenti dal trasporto
* Layer di Trasporto: Handler HTTP/gRPC che si adattano alle tue esigenze

Questa non è solo teoria dell'architettura - è codice funzionante che rende i tuoi servizi più facili da testare, modificare e scalare mentre le tue esigenze evolvono.

### Type Safety Che Ti Copre le Spalle

Dimentica le sorprese a runtime. Goa sfrutta il sistema di tipi di Go per catturare i problemi in fase di compilazione:

```go
// Interfaccia generata - il tuo contratto
type Service interface {
    Add(context.Context, *AddPayload) (int, error)
}

// La tua implementazione - pulita e focalizzata
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

Se la tua implementazione non corrisponde al design, lo saprai prima che il tuo codice arrivi in produzione.

### Struttura del Progetto Che Ha Senso

Basta indovinare dove dovrebbero andare i file. I progetti Goa seguono un'organizzazione cristallina:

```
├── design/         # Il tuo design API - la fonte di verità
├── gen/            # Codice generato - non modificare mai
│   ├── calculator/ # Interfacce del servizio
│   ├── http/       # Layer di trasporto HTTP
│   └── grpc/       # Layer di trasporto gRPC
└── calculator.go   # La tua implementazione - dove avviene la magia
```

Ogni file ha il suo posto, e ogni sviluppatore nel tuo team saprà esattamente dove guardare.

## Prossimi Passi

* Segui la [guida Primi Passi](2-getting-started)
* Esplora i [Tutorial Core](3-tutorials)
* Unisciti alla community:
    * [Gophers Slack](https://gophers.slack.com/messages/goa)
    * [GitHub Discussions](https://github.com/goadesign/goa/discussions)
    * [Bluesky](https://goadesign.bsky.social) 