+++
title = "Guida per principianti"
weight = 2

[menu.main]
name = "Guida per principianti"
parent = "learn"
+++

Questa guida ti accompegnerà attraverso la scrittura del tuo primo servizio Goa
completo. Puoi trovare l'implementazione completa in questa
[GitHub repository](https://github.com/goadesign/examples/tree/master/basic). 
Le istruzioni assumono l'uso dei Go modules, pertanto richiedono una versione di
Go installata successiva o uguale alla 1.11.

## Pre-requisiti

Le istruzioni qui sotto servono a creare un nuovo progetto sotto la tua home. Puoi
sostituire `$HOME` con qualunque altra cartella, l'unico problema è che se scegli
una cartella sotto il tuo `GOPATH` devi essere sicuro che i moduli Go siano
abilitati impostando la variabile di ambiente `GO111MODULE` al valore `on`.

```bash
cd $HOME
mkdir -p calc/design
cd calc
go mod init calc
```

Ora assicurati che Goa sia installato e aggiornato:

```bash
go get -u goa.design/goa/v3
go get -u goa.design/goa/v3/...
```

Questo servizio usa gRPC e pertanto necessita di `protoc` and
`protoc-gen-go`.

* Scarica il binario `protoc` dalle [release](https://github.com/google/protobuf/releases).
* Assicurati che `protoc` sia nel tuo path.
* Installa il plugin protoc per Go: `go get -u github.com/golang/protobuf/protoc-gen-go`

## Progetta

In questa sezione progetteremo la nostra API. Questo step è uno dei più
caratteristici del Goa framework: Goa ti permette di pensare a come sarà la
tua API senza preoccuparti di come verrà implementata e rivedere il design
con tutti gli stakeholders prima di iniziare a implementare sul serio. Questo
è un valore enorme, soprattutto in grandi società dove team differenti devono 
implementare e consumare servizi. Apri il file `$HOME/calc/design/design.go` e
scrivi il seguente codice:


```go
package design

import (
	. "goa.design/goa/v3/dsl"
)

var _ = API("calc", func() {
	Title("Calculator Service")
	Description("Service for multiplying numbers, a Goa teaser")
    Server("calc", func() {
        Host("localhost", func() {
            URI("http://localhost:8000")
            URI("grpc://localhost:8080")
        })
    })
})

var _ = Service("calc", func() {
	Description("The calc service performs operations on numbers.")

	Method("multiply", func() {
		Payload(func() {
			Field(1, "a", Int, "Left operand")
			Field(2, "b", Int, "Right operand")
			Required("a", "b")
		})

		Result(Int)

		HTTP(func() {
			GET("/multiply/{a}/{b}")
		})

		GRPC(func() {
		})
	})

	Files("/openapi.json", "./gen/http/openapi.json")
})
```

Il design descrive un servizio chiamato `calc`, il quale definisce a sua volta un metodo `multiply`.
`multiply` prende un payload come input che consiste di 2 interi e ritorna un intero a sua volta.
Esso descrive anche i mapping ai livelli di trasporto HTTP e gRPC. Il trasporto
HTTP usa gli parameters per gli input mentre il gRPC usa il message (non è esplicito,
ma è il comportamento di default). Sia HTTP che gRPC usano il codice di stato `OK` nelle
risposte (anch'esso il default).

Infine, il design espone un file server HTTP che fornisce le specifiche
[OpenAPI](https://www.openapis.org/) generate.

>Questo esempio copre solo una frazione di cosa Goa può fare. Puoi trovare più esempi
>nella [repository apposita](https://github.com/goadesign/examples). La
>[documentazione del DSL Goa](https://godoc.org/goa.design/goa/dsl) elenca tutti i DSL
>insieme a una loro descrizione e uno o più esempi di utilizzo.

## Generazione di codice

### Il comando `goa gen`

Ora che avviamo un design per il nostro servizio, possiamo eseguire il comando
`goa gen` per generare il codice di scaffolding. Il comando prende l'import path
del design package come parametro. Accetta anche il path della directory di output,
opzionalmente. Dato che il nostro design package è stato creato sotto il modulo `calc`
il comando da eseguire è:

```bash
goa gen calc/design
```

Il comando stampa a video i nomi dei file che genera. Se la cartella di output
non è specificata, il comando usa la cartella corrente. I file generati dovrebbero
avere una struttura simile alla seguente:

```
gen
├── calc
│   ├── client.go
│   ├── endpoints.go
│   └── service.go
├── grpc
│   ├── calc
│   │   ├── client
│   │   │   ├── cli.go
│   │   │   ├── client.go
│   │   │   ├── encode_decode.go
│   │   │   └── types.go
│   │   ├── pb
│   │   │   ├── calc.pb.go
│   │   │   └── calc.proto
│   │   └── server
│   │       ├── encode_decode.go
│   │       ├── server.go
│   │       └── types.go
│   └── cli
│       └── calc
│           └── cli.go
└── http
    ├── calc
    │   ├── client
    │   │   ├── cli.go
    │   │   ├── client.go
    │   │   ├── encode_decode.go
    │   │   ├── paths.go
    │   │   └── types.go
    │   └── server
    │       ├── encode_decode.go
    │       ├── paths.go
    │       ├── server.go
    │       └── types.go
    ├── cli
    │   └── calc
    │       └── cli.go
    ├── openapi.json
    └── openapi.yaml
```

La cartella `gen` contiene la sotto-cartella `calc` dovesi trova il codice
transport-independent del servizio. Il file `endpoints.go` crea un
[Goa endpoint](https://godoc.org/goa.design/goa#Endpoint) che espone
il codice transport-agnostic ai livelli di trasporto.

La cartella `grpc` contiene il protocol buffer file (`pb/calc.proto`) che
descrive a livello gRPC il servizio `calc`, oltre che l'output del
[tool `protoc`](https://developers.google.com/protocol-buffers/docs/proto3#generating)
(`pb/calc.pb.go`). Questa directory contiene anche il codice di server e client che
si aggancia con i server e client auto generati da protoc, e ciò permette di codificare
e decodificare le richieste e le risposte. Infine la cartella `cli` contiene il
codice della CLI che costruisce le richieste gRPC da riga di comando.

La cartella `http` descrive il livello di trasporto HTTP, il quale definisce codice di server e
client insieme alla logica di codifica e decodifica e il codice della CLI, usata per costruire
richieste HTTP da riga di comando. Essa contiene anche i file di specifica Open API 2.0 sia
in formato JSON che in formato YAML.

### Il comando `goa example`

Ora possiamo eseguire il comando `goa example` per generare un implementazione 
base del servizio che usa i file precedentemente generati.

> Nota: Il codice generato da `goa gen` non può essere editato, dato che viene
> rigenerato completamente ogni volta che il comando viene eseguito (per esempio
> quando il design cambia). Questo è intenzionale e serve a separare codice generato 
> e non e mantenere il codice pulito usando gli standard Go.
> Il codice generato da `goa example`, comunque è codice che andrà a finire lo 
> sviluppatore.
> Andrebbe modificato, testato, eccetera. Questo comando genera un punto di inizio
> per velocizzare lo sviluppo del servizio, e NON è pensato per essere ri-eseguito 
> quando il design cambia. Semplicemente va aggiornato appropriatamente.

```bash
goa example calc/design
```

Il comando `goa example` crea i seguenti file:

```

├── calc.go
├── cmd
│   ├── calc
│   │   ├── grpc.go
│   │   ├── http.go
│   │   └── main.go
│   └── calc-cli
│       ├── grpc.go
│       ├── http.go
│       └── main.go
```

`calc.go` contiene una implementazione vuota del metodo `multiply` descritto dal
design. L'unica cosa rimasta da fare è scrivere il codice che implementa, 
compilarlo, testarlo ed eseguirlo su server e client.

Apri il file `calc.go` e implementa il metodo `Multiply`:

```go
func (s *calcsrvc) Multiply(ctx context.Context, p *calc.MultiplyPayload) (res int, err error) {
  return p.A + p.B, nil
}
```

Il comando `goa example` usa la [DSL Server](https://godoc.org/goa.design/goa/dsl#Server)
opzionalmente definita nel design per generare codice compilabile per server e client.
Lo costruisce nella cartella `cmd` per ogni `Server` specificato nel 
design. Qui abbiamo definito un unico server `calc` che ascolta richieste HTTP sulla porta
8000.

## Costruisci e Esegui il servizio

Il codice generato per server e client è costruito ed eseguito come segue:

```bash
go build ./cmd/calc && go build ./cmd/calc-cli

# Esegui il server

./calc
[calcapi] 21:35:36 HTTP "Multiply" mounted on GET /multiply/{a}/{b}
[calcapi] 21:35:36 HTTP "./gen/http/openapi.json" mounted on GET /openapi.json
[calcapi] 21:35:36 serving gRPC method calc.Calc/Multiply
[calcapi] 21:35:36 HTTP server listening on "localhost:8000"
[calcapi] 21:35:36 gRPC server listening on "localhost:8080"

# Esegui il client

# Contatta il server HTTP
$ ./calc-cli --url="http://localhost:8000" calc multiply --a 1 --b 2
2

# Contatta il server gRPC
$ ./calc-cli --url="grpc://localhost:8080" calc multiply --message '{"a": 1, "b": 2}'
2
```

## Riassunto e Prossimi passi

Come hai potuto vedere Goa accellera lo sviluppo dei servizi permettendo di scrivere
una singola sorgente di verità, da cui server, client e documentazione vengono generati
automaticamente. L'abilità di concentrarsi sulla progettazione dell'API
abilita un processo di sviluppo scalabile e robusto, dove i team possono revisionare
e accordarsi su un API prima di iniziare l'implementazione. Una volta che il design è
finito il codice generato si occupa di tutto il lavoro di codifica, decodifica e
validazione (prova a chiamare il servizio calc passando valori non interi, ad esempio).

Questo esempio copre solo le basi di Goa, la 
<a href="../../design/overview">Panoramica</a> copre molti altri aspetti. Magari vuoi anche
dare un'occhiata agli altri [esempi](https://github.com/goadesign/examples). 
Infine, la
[GoDoc](https://godoc.org/goa.design/goa/dsl) del package DSL include molti snippet di codice
e fornisce un grande riferimento nella progettazione.
