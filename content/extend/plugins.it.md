+++
title = "Plugins"
weight = 1

[menu.main]
name = "Plugins"
parent = "extend"
+++

I [plugin di Goa](https://godoc.org/github.com/goadesign/plugins) permettono di
creare nuovi DSL e i relativi generatori di codice. Vengono eseguiti prima del
rendering degli artefatti finali e rendono possibile l'alterazione dei template
esposti dai generatori di default di Goa e , di conseguenza, di produrre nuovi
output da qualunque DSL.

La [repository dei plugin](https://github.com/goadesign/plugins) ingloba una serie
di plugin Goa pubblici. Attieniti ai README dei vari plugin per istruzioni su come
usarli.

## Costruisci il tuo Plugin

I plugin possono essere utilizzati per fare le cose più disparate:

* Un plugin può aggiungere nuovi DSL a fianco di quelli esistenti. Tali DSL
  possono produrre codice completamente diverso o modificare quello creato 
  dai generatori di Goa.

* Ogni plugin può avere una
  [GenerateFunc](https://godoc.org/goa.design/goa/v3/codegen#GenerateFunc) per modificare
  i file generati da Goa o generare nuovi file da aggiungere agli artefatti finali.

```go
type GenerateFunc func(genpkg string, roots []eval.Root, files []*File) ([]*File, error)
```

* Ogni plugin può avere una
  [PrepareFunc](https://godoc.org/goa.design/goa/v3/codegen#PrepareFunc), per alterare
  il design prima della generazione del codice.

```go
type PrepareFunc func(genpkg string, roots []eval.Root) error
```

I plugin si auto-registrano usando una fra le funzioni
[RegisterPlugin](https://godoc.org/goa.design/goa/v3/codegen#RegisterPlugin),
[RegisterPluginFirst](https://godoc.org/goa.design/goa/v3/codegen#RegisterPluginFirst),
oppure
[RegisterPluginLast](https://godoc.org/goa.design/goa/v3/codegen#RegisterPlugin).

## CORS Plugin

Uno dei plugin ufficiali è il [CORS plugin](https://github.com/goadesign/plugins/tree/v3/cors) 
che aggiunge la possibilità di definire CORS properties sugli endpoint HTTP e usa
le corrispondenti espressioni per implementare i controlli CORS sulla API.

Il plugin CORS aggiunge il suo 
[DSL](https://godoc.org/github.com/goadesign/plugins/cors/dsl)
personale, il quale può essere integrato come segue:

```go
package design

import (
	. "goa.design/goa/v3/dsl"
	cors "goa.design/plugins/v3/cors/dsl"
)

var _ = Service("calc", func() {
	Description("The calc service exposes public endpoints that defines CORS policy.")
	// Aggiungi la CORS policy usando il DSL
	cors.Origin("/.*localhost.*/", func() {
		cors.Headers("X-Shared-Secret")
		cors.Methods("GET", "POST")
		cors.Expose("X-Time", "X-Api-Version")
		cors.MaxAge(100)
		cors.Credentials()
	})

	Method("multiply", func() {
		Description("Multiply multiplies up the two integer parameters and returns the results.")
		Payload(func() {
			Attribute("a", Int, func() {
				Description("Left operand")
			})
			Attribute("b", Int, func() {
				Description("Right operand")
			})
			Required("a", "b")
		})
		Result(Int)
		HTTP(func() {
			GET("/multiply/{a}/{b}")
			Response(StatusOK)
		})
	})
})
```

Il design precedente imposta una CORS policy su tutti gli endpoint definiti nel
servizio `calc`.

Il plugin CORS si auto-registra chiamando `RegisterPlugin` nel package `codegen` di Goa
e aggiunge il proprio
[generatore di codice](https://godoc.org/github.com/goadesign/plugins/cors#Generate) che
implementa la funzione `GenerateFunc`.

```go
package cors

import (
	"goa.design/goa/v3/codegen"
	"goa.design/goa/v3/eval"
)

func init() {
	codegen.RegisterPlugin("cors", "gen", nil, Generate)
}

// Generate produce del codice server code che gestisce le richieste e le risposte preflight e aggiorna
// le risposte HTTP con gli header CORS appropriati.
func Generate(genpkg string, roots []eval.Root, files []*codegen.File) ([]*codegen.File, error) {
...
}
```
```go
// cors/dsl/cors.go

package dsl

// Registra i code generators per il plugin CORS
import _ "goa.design/plugins/v3/cors"
```

Tale generatore modifica il codice HTTP server side generato per gestire le richieste
preflight montando l'endpoint `CORS`.

L'algoritmo di generazione di Goa invoca quindi la funzione che modifica il package
creato per il server HTTP della API.
