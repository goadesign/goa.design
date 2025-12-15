---
title: Avvio rapido
weight: 1
description: "Complete guide to installing Goa and building your first service - from setup to running a working HTTP endpoint."
llm_optimized: true
aliases:
---

Questa guida vi guida attraverso l'installazione di Goa e la creazione del vostro primo servizio. Alla fine, avrete un'API HTTP funzionante che potrete estendere e personalizzare.

## Prerequisiti

Prima di iniziare, assicuratevi che il vostro ambiente soddisfi questi requisiti:

- **Go 1.18 o successivo** - Goa sfrutta le moderne funzionalità di Go
- **Moduli Go abilitati** - Questo è l'impostazione predefinita in Go 1.16+, ma verificare con `GO111MODULE=on` se necessario
- **curl o qualsiasi client HTTP** - Per testare il proprio servizio

## Installazione

Installare i pacchetti Goa e lo strumento CLI:

```bash
# Pull the Goa packages
go get goa.design/goa/v3/...

# Install the Goa CLI
go install goa.design/goa/v3/cmd/goa@latest

# Verify the installation
goa version
```

Dovrebbe essere visualizzata la versione corrente di Goa (ad esempio, `v3.x.x`). Se il comando `goa` non viene trovato, assicurarsi che la cartella Go bin sia nel PATH:

```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

---

## Creare il primo servizio

Ora costruiamo un semplice servizio "hello world" che dimostri l'approccio design-first di Goa.

### 1. Impostazione del progetto

Creare una nuova cartella e inizializzare un modulo Go:

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

> **Nota:** Per questa guida usiamo un semplice nome di modulo `hello`. Nei progetti reali, in genere si usa un nome di dominio come `github.com/yourusername/hello-goa`. I concetti funzionano esattamente allo stesso modo.

### 2. Progettare l'API

Goa utilizza un potente DSL (Domain Specific Language) per descrivere la vostra API. Creare una cartella e un file di progettazione:

```bash
mkdir design
```

Creare `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = Service("hello", func() {
    Description("A simple service that says hello.")

    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "A greeting message")

        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Vediamo cosa fa questo progetto:

- **`Service("hello", ...)`** - Definisce un nuovo servizio chiamato "hello"
- **`Method("sayHello", ...)`** - Definisce un metodo all'interno del servizio
- **`Payload(String, ...)`** - Specifica l'input: una stringa che rappresenta il nome da salutare
- **`Result(String, ...)`** - Specifica l'output: un messaggio di saluto
- **`HTTP(func() { GET("/hello/{name}") })`** - Mappa il metodo a un endpoint HTTP GET, dove `{name}` è automaticamente legato al payload

Questo approccio dichiarativo significa che si descrive *cosa* fa la propria API e Goa gestisce i dettagli dell'implementazione: binding dei parametri, routing, validazione e documentazione OpenAPI.

### 3. Generare il codice

Trasformate il progetto in una struttura di servizio completamente funzionale:

```bash
goa gen hello/design
```

Questo crea una cartella `gen` contenente:
- Interfacce ed endpoint del servizio
- Livello di trasporto HTTP (gestori, codificatori, decodificatori)
- Specifiche OpenAPI/Swagger
- Codice client

Ora si crea un'implementazione funzionante:

```bash
goa example hello/design
```

> **Importante:** Il comando `gen` rigenera la cartella `gen/` ogni volta che lo si esegue. Il comando `example` crea file di implementazione iniziali che sono di vostra proprietà e personalizzabili; Goa non li sovrascriverà nelle esecuzioni successive.

La struttura del progetto appare ora come segue:

```
hello-goa/
├── cmd/
│   ├── hello/           # Server executable
│   │   ├── http.go
│   │   └── main.go
│   └── hello-cli/       # CLI client
│       ├── http.go
│       └── main.go
├── design/
│   └── design.go        # Your API design
├── gen/                 # Generated code (don't edit)
│   ├── hello/
│   └── http/
└── hello.go             # Your service implementation
```

### 4. Implementare il servizio

Aprire `hello.go` e trovare il metodo `SayHello`. Sostituirlo con la propria implementazione:

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
    log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("Hello, %s!", name), nil
}
```

Questa è tutta la logica aziendale necessaria: Goa gestisce tutto il resto.

### 5. Eseguire e testare

Per prima cosa, scaricare le dipendenze:

```bash
go mod tidy
```

Avviare il server:

```bash
go run ./cmd/hello --http-port=8080
```

Si dovrebbe vedere:

```
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

Testate con curl (in un nuovo terminale):

```bash
curl http://localhost:8080/hello/Alice
```

Risposta:

```
"Hello, Alice!"
```

🎉 Congratulazioni! Avete costruito il vostro primo servizio Goa.

#### Usare il client CLI generato

Goa ha anche generato un client a riga di comando. Provatelo:

```bash
go run ./cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

Esplora i comandi disponibili:

```bash
go run ./cmd/hello-cli --help
```

---

## Sviluppo in corso

Man mano che il servizio si evolve, si modifica il progetto e si rigenera il codice:

```bash
# After updating design/design.go
goa gen hello/design
```

Punti chiave:
- cartella **`gen/` - Rigenerata ogni volta; non modificate mai direttamente questi file
- **I vostri file di implementazione** - Personalizzati da voi; Goa non li sovrascriverà
- **Nuovi metodi** - Aggiungere al progetto, rigenerare, quindi implementare i nuovi stub dei metodi

---

## Prossimi passi

Avete appreso i fondamenti dell'approccio "design-first" di Goa. Continuate il vostro viaggio:

- **[DSL di riferimento](./dsl-reference.md)** - Guida completa al linguaggio di progettazione di Goa
- **[Guida HTTP](./http-guide.md)** - Approfondimento sulle caratteristiche del trasporto HTTP
- **[Guida gRPC](./grpc-guide.md)** - Costruire servizi gRPC con Goa
- **[Gestione degli errori](./error-handling.md)** - Definire e gestire correttamente gli errori
- **[Generazione del codice](./code-generation.md)** - Capire cosa genera Goa e come personalizzarlo
