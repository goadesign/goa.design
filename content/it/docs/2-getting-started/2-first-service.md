---
title: Primo Servizio
weight: 2
description: "Crea il tuo primo servizio Goa con questo tutorial pratico, che copre il design del servizio, la generazione del codice, l'implementazione e il testing di un semplice endpoint HTTP."
---

## Prerequisiti

Pronto a costruire qualcosa di fantastico? Questa guida assume che tu abbia `curl` installato. Qualsiasi altro client HTTP funzionerà altrettanto bene.

## 1. Crea un Nuovo Modulo

Iniziamo il nostro viaggio preparando un nuovo spazio di lavoro per il tuo primo servizio Goa:

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

> Nota: Mentre stiamo usando un nome di modulo semplice `hello` per questa guida, nei progetti
> del mondo reale useresti tipicamente un nome di dominio come `github.com/tuousername/hello-goa`.
> Non preoccuparti - i concetti che imparerai funzionano esattamente allo stesso modo!

## 2. Progetta il Tuo Primo Servizio

Ora arriva la parte eccitante - progettare il tuo servizio! Il potente DSL di Goa ti aiuterà a creare
un'API pulita e professionale in poche righe di codice.

1. **Aggiungi una Cartella `design`**

```bash
mkdir design
```

2. **Crea un File di Design** (`design/design.go`):

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = Service("hello", func() {
    Description("Un semplice servizio che dice ciao.")

    Method("sayHello", func() {
        Payload(String, "Nome da salutare")
        Result(String, "Un messaggio di saluto")

        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Analizziamo cosa fa questo design:

- `Service("hello", ...)` definisce un nuovo servizio chiamato "hello"
- All'interno del servizio, definiamo un singolo metodo `sayHello` che:
  - Prende un `Payload` di tipo string - questo sarà il nome che vogliamo salutare
  - Restituisce un `Result` di tipo string - il nostro messaggio di saluto
  - Si mappa su un endpoint HTTP GET a `/hello/{name}` dove `{name}` sarà automaticamente associato al nostro payload

Questo semplice design mostra l'approccio dichiarativo di Goa - descriviamo _cosa_ vogliamo che la nostra API faccia, e Goa gestisce tutti i dettagli di implementazione come il binding dei parametri, il routing e la documentazione OpenAPI.

## 3. Genera il Codice

Qui è dove avviene la magia! Usiamo il generatore di codice di Goa per trasformare il tuo design in
una struttura di servizio completamente funzionante:

```bash
goa gen hello/design
```

Questo crea una cartella `gen` contenente tutto ciò di cui hai bisogno - endpoint, logica di trasporto e persino
specifiche OpenAPI. Bello, vero?

Ora, creiamo un servizio funzionante con il comando `example`:

```bash
goa example hello/design
```

> Nota: Pensa al comando `example` come al tuo punto di partenza - ti dà un'implementazione funzionante
> su cui puoi costruire. Mentre rieseguirai `gen` quando il tuo design cambia, il codice da `example`
> è tuo da personalizzare e migliorare.

Ecco cosa troverai nella tua cartella `hello-goa`:

```
hello-goa
├── cmd
│   ├── hello
│   │   ├── http.go
│   │   └── main.go
│   └── hello-cli
│       ├── http.go
│       └── main.go
├── design
│   └── design.go
├── gen
│   ├── ...
│   └── http
└── hello.go
```

## 4. Implementa il Servizio

È ora di dare vita al tuo servizio! Modifica il file `hello.go` e sostituisci il
metodo `SayHello` con questa accogliente implementazione:

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
	log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("Ciao, %s!", name), nil
}
```

Ci sei quasi - e non è stato sorprendentemente semplice?

## 5. Esegui e Testa

### Avvia il Server

Prima, mettiamo in ordine tutte le nostre dipendenze:

```bash
go mod tidy
```

Ora per il momento della verità - mettiamo online il tuo servizio:

```bash
go run hello/cmd/hello --http-port=8080
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

### Chiama il Servizio

Apri un nuovo terminale e vediamo il tuo servizio in azione:

```bash
curl http://localhost:8080/hello/Alice
"Ciao, Alice!"
```

🎉 Fantastico! Hai appena creato e distribuito il tuo primo servizio Goa. Questo è solo l'inizio
di ciò che puoi costruire con Goa!

### Uso del Client CLI

Vuoi provare qualcosa di ancora più interessante? Goa ha automaticamente generato un client da riga di comando per te.
Provalo:

```bash
go run hello/cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

Curioso di sapere cos'altro può fare il CLI? Controlla tutte le funzionalità:

```bash
go run hello/cmd/hello-cli --help
```

## 6. Sviluppo Continuo

### Modifica DSL → Rigenera

Man mano che il tuo servizio cresce, vorrai aggiungere nuove funzionalità. Ogni volta che aggiorni il tuo design con
nuovi metodi, campi o errori, esegui semplicemente:

```bash
goa gen hello/design
```

Il codice del tuo servizio è tuo da far evolvere - Goa non toccherà nulla fuori dalla cartella `gen`,
quindi sentiti libero di migliorare e personalizzare quanto vuoi!

## 7. Prossimi Passi

Pronto a portare le tue competenze Goa al livello successivo? Immergiti nei nostri [Tutorial](../3-tutorials) dove
imparerai a costruire potenti API REST, servizi gRPC e molto altro. Le possibilità sono infinite! 