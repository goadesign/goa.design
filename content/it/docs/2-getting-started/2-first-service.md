---
title: Primo Servizio
weight: 2
description: "Crea il tuo primo servizio Goa con questo tutorial pratico, che copre il design del servizio, la generazione del codice, l'implementazione e il testing di un semplice endpoint HTTP."
---

## Prerequisiti

Questa guida assume che tu abbia `curl` installato. Qualsiasi altro client HTTP funzionerà altrettanto bene.

## 1. Crea un Nuovo Modulo

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

> Nota: Tipicamente i moduli Go sono identificati da un nome di dominio, es.
> `github.com/tuousername/hello-goa`. Tuttavia, per semplicità in questa guida,
> useremo un nome di modulo semplice.

## 2. Progetta il Tuo Primo Servizio

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

## 3. Genera il Codice

Esegui il generatore di codice Goa per produrre lo scaffolding nella root del modulo
(cartella `hello-goa`):

```bash
goa gen hello/design
```

Questo crea una cartella `gen` contenente endpoint, logica di trasporto e specifiche
OpenAPI.

Esegui il comando `example` per creare un package `main` predefinito per client e server.

```bash
goa example hello/design
```

> Nota: Il comando `example` genera un'implementazione predefinita e un package `main`.
> È pensato per essere usato come punto di partenza per il tuo servizio. Solo il
> comando `gen` dovrebbe essere usato quando si modifica il design, il codice generato dal
> comando `example` dovrebbe essere mantenuto 'manualmente' come qualsiasi altro codice utente.

Il contenuto della cartella `hello-goa` dovrebbe apparire così:

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

Modifica il file `hello.go` generato dal comando `example` e sostituisci il
metodo `SayHello` con il seguente:

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
	log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("Ciao, %s!", name), nil
}
```

Questo è tutto!

## 5. Esegui e Testa

### Avvia il Server

Prima installiamo le dipendenze:

```bash
go mod tidy
```

Poi esegui il server sulla porta 8080:

```bash
go run hello/cmd/hello --http-port=8080
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

### Chiama il Servizio

In un terminale diverso, esegui:

```bash
curl http://localhost:8080/hello/Alice
"Ciao, Alice!"
```

Congratulazioni! Hai appena creato il tuo primo servizio Goa.

### Uso del Client CLI

Il comando `example` ha anche creato un client da riga di comando `hello-cli`. Puoi
usarlo per chiamare il servizio:

```bash
go run hello/cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

Il comando `hello-cli` è un semplice client che usa il trasporto `http`, il
flag `--help` mostra i comandi disponibili:

```bash
go run hello/cmd/hello-cli --help
```

## 6. Sviluppo Continuo

### Modifica DSL → Rigenera

Ogni volta che modifichi il design (aggiungendo metodi, campi o errori), esegui:

```bash
goa gen hello/design
```

Modifica i package main e service secondo necessità - goa non sovrascriverà nulla
fuori dalla cartella `gen`.

## 7. Prossimi Passi

Leggi i [Tutorial](../3-tutorials) per imparare come costruire un'API REST, un servizio gRPC e altro ancora. 