+++
title = "Aggiorna da v1 a v2 o v3"
weight = 3

[menu.main]
name = "Aggiorna"
parent = "learn"
+++

# Aggiornare da v2 a v3

v2 e v3 hanno funzionalità equivalenti e ciò rende la procedura di upgrade abbastanza semplice. Goa v3
richiede il supporto ai moduli Go, pertanto è richiesto Go 1.11 o successivo. 

Aggiornare da v2 a v3 è semplice come:

* Abilitare i Go modules sul tuo progetto (`env GO111MODULE=on go mod init`)
* Aggiornare la import path del package goa package a `goa.design/goa/v3/pkg`
* Aggiornare la import path del package Goa X da `goa.design/goa/X` a `goa.design/goa/v3/X`

Ed è fatta! Nota che anche il tool `goa` nella v3 è retrocompatibile e può generare
codice a partire da design v2. Ciò rende possibile di lavorare concorrentemente
sia su progetti v2 che v3 mantenendo la v2 in `GOPATH` e usando la v3 nei Go
modules.

# Aggiornare da v1 a v2 o v3

Goa v2 e v3 portano molte nuove funzionalità e molti miglioramenti rispetto alla v1, in particolare:

* una architettura modulare che separa chiaramente i concetti di trasporto e logica di business
* supporto a gRPC
* meno dipendenze esterne
* un plugin system migliore, che include il supporto a [Go kit](https://gokit.io)

Molti dei cambiamenti sono fondamentali e hanno impatto su come vengono creati i 
design, tuttavia vengono seguiti gli stessi principi e value proposition:

* una singola sorgente di verità creata dai DSL dei design
* un generatore di codice che dati i DSL crea documentazione, server e client

Questo documento descrive i cambiamenti e fornisce alcune linee guida su come aggiornare.

>Nota: Goa v2 e v3 sono equivalenti, l'unica differenza è che la v3 sfrutta e supporta i
>Go modules mentre la v2 non lo fa. Il resto di questo documento si riferisce alla v3
>ma si può anche applicare per la v2.

## Cambiamenti al DSL

Goa v3 promuove una netta separazione dei layer rendendo possibile progettare le API di servizio
indipendentemente dal livello d trasporto sottostante. I DSL specifici di trasporto permettono di 
mappare ogni livello (HTTP o gRPC), quindi invece di `Resources` e `Actions` i DSL si concentrano
su `Services` e `Methods`. Ogni metodo descrive input e output. I DSL transport-specific descrivono 
come vengono come essi vengono costruiti da richieste HTTP o messaggi gRPC e come gli output sono 
construiti e scrivono risposte HTTP o messaggi gRPC in uscita.

> NOTA: I DSL v3 sono documentati nei [godoc](https://godoc.org/goa.design/goa/dsl).

### Types

Per la maggior parte i DSL non hanno molte differenze nella definizione dei tipi:

* `MediaType` ora è [ResultType](https://godoc.org/goa.design/goa/dsl#ResultType) per rendere chiaro che
  il tipo usato da questo DSL descrive il risultato di un metodo. Nota che i tipi standard definiti usando
  il DSL [Type](https://godoc.org/goa.design/goa/dsl#Type) possono anche essere utilizzati per i
  result types.
* I result types possono omettere le viste. Se lo fanno una vista di default viene creata con
  tutti gli attributi.
* Il nuovo DSL [Field](https://godoc.org/goa.design/goa/dsl#Field) è identico a
  [Attribute](https://godoc.org/goa.design/goa/dsl#Attribute), ma permette di specificare un
  indice per il campo da far corrispondere al field number gRPC.
* `HashOf` ora è [MapOf](https://godoc.org/goa.design/goa/dsl#MapOf), più intuitivo per gli 
  sviluppatori Go.
* Ci sono nuovi primitivi per descrivere più precisamente il layout dei dati:
  [Int](https://godoc.org/goa.design/goa/dsl#Int),
  [Int32](https://godoc.org/goa.design/goa/dsl#Int32),
  [Int64](https://godoc.org/goa.design/goa/dsl#Int64),
  [UInt](https://godoc.org/goa.design/goa/dsl#UInt),
  [UInt32](https://godoc.org/goa.design/goa/dsl#UInt32),
  [UInt64](https://godoc.org/goa.design/goa/dsl#UInt64),
  [Float32](https://godoc.org/goa.design/goa/dsl#Float32),
  [Float64](https://godoc.org/goa.design/goa/dsl#Float64)
  and [Bytes](https://godoc.org/goa.design/goa/dsl#Bytes).
* I tipi `DateTime` e `UUID` vengono deprecati in favore di
  [String](https://godoc.org/goa.design/goa/dsl#String) e un corrispondente
  validazione [Format](https://godoc.org/goa.design/goa/dsl#Format).

#### Esempio

Questo v1 media type:

```go
var Person = MediaType("application/vnd.goa.person", func() {
	Description("A person")
	Attributes(func() {
		Attribute("name", String, "Name of person")
		Attribute("age", Integer, "Age of person")
		Required("name")
	})
	View("default", func() {  // View defines a rendering of the media type.
		Attribute("name") // Media types may have multiple views and must
		Attribute("age")  // have a "default" view.
	})
})
```

Corrisponde al seguente v3 result type:

```go
var Person = ResultType("application/vnd.goa.person", func() {
	Description("A person")
	Attributes(func() {
		Attribute("name", String, "Name of person")
		Attribute("age", Int, "Age of person")
		Required("name")
	})
})
```

O a questo v3 result type con campi esplicitamente definiti:

```go
var Person = ResultType("application/vnd.goa.person", func() {
	Description("A person")
	Attributes(func() {
		Field(1, "name", String, "Name of person")
		Field(2, "age", Int, "Age of person")
		Required("name")
	})
})
```

### API

Sono stati apportati i seguenti cambiamenti al DSL [API](https://godoc.org/goa.design/goa/dsl#API):

* I DSL `Host`, `Scheme` e `BasePath` sono rimpiazzati con [Server](https://godoc.org/goa.design/goa/dsl#Server).
* Il DSL [Server](https://godoc.org/goa.design/goa/dsl#Server) permette di definire proprietà del server per ambienti differenti
  Ogni server può elencare i servizi che ospita e si possono definire più server in un unico design.
* `Origin` ora fa parte del [plugin CORS](https://github.com/goadesign/plugins/tree/v3/cors).
* `ResponseTemplate` e `Trait` sono stati deprecati.

#### Esempio

Questa v1 API section:

```go
var _ = API("cellar", func() {
	Title("Cellar Service")
	Description("HTTP service for managing your wine cellar")
	Scheme("http")
	Host("localhost:8080")
	BasePath("/cellar")
})
```

Corrisponde alla seguente v3 section:

```go
var _ = API("cellar", func() {
	Title("Cellar Service")
	Description("HTTP service for managing your wine cellar")
	Server("app", func() {
		Host("localhost", func() {
			URI("http://localhost:8080/cellar")
		})
	})
})
```

Oppure a questa v3 section che usa più server:

```go
var _ = API("cellar", func() {
	Title("Cellar Service")
	Description("HTTP service for managing your wine cellar")
	Server("app", func() {
		Description("App server hosts the storage and sommelier services.")
		Services("sommelier", "storage")
		Host("localhost", func() {
			Description("default host")
			URI("http://localhost:8080/cellar")
		})
	})
	Server("swagger", func() {
		Description("Swagger server hosts the service OpenAPI specification.")
		Services("swagger")
		Host("localhost", func() {
			Description("default host")
			URI("http://localhost:8088/swagger")
		})
	})
})
```

### Services

La funzione `Resource` ora si chiama [Service](https://godoc.org/goa.design/goa/dsl#Service). I
DSL ora sono organizzati in sezioni che non dipendono più dal livello di trasporto, la quale
elenca anche i potenziali errori ritornati dai metodi. Ci pensa il codice specifico per il trasporto 
a tradurre questi errori o risultati in risposte HTTP o messaggi gRPC con gli stati corretti.

* `BasePath` ora è [Path](https://godoc.org/goa.design/goa/dsl#Path) e appare sotto il DSL
  [HTTP](https://godoc.org/goa.design/goa/dsl#HTTP).
* `CanonicalActionName` ora si chiama [CanonicalMethod](https://godoc.org/goa.design/goa/dsl#CanonicalMethod)
  e appare sotto la DSL [HTTP](https://godoc.org/goa.design/goa/dsl#HTTP).
* `Response` viene rimpiazzata da [Error](https://godoc.org/goa.design/goa/dsl#Error).
* `Origin` ora fa parte del [plugin CORS](https://github.com/goadesign/plugins/tree/v3/cors).
* `DefaultMedia` viene deprecato.

#### Esempio

Questo v1 design:

```go
	Resource("bottle", func() {
		Description("A wine bottle")
		BasePath("/bottles")
		Parent("account")
		CanonicalActionName("get")

		Response(Unauthorized, ErrorMedia)
		Response(BadRequest, ErrorMedia)
		// ... Actions
	})
```

Equivalent v3 design:

```go
	Service("bottle", func() {
		Description("A wine bottle")
		Error("Unauthorized")
		Error("BadRequest")

		HTTP(func() {
			Path("/bottles")
			Parent("account")
			CanonicalMethod("get")
		})
		// ... Methods
	})
```

### Methods

La funzione `Action` viene rimpiazzata da [Method](https://godoc.org/goa.design/goa/dsl#Method). Come per i
servizi i DSL sono organizzati in sezioni agnostiche al livello di trasporto e sezioni specifiche ad essi.
Le sezioni agnostic definiscono payload e risultati così come gli errori non definiti a livello di servizio.
I DSL specifiche di trasporto mappano payload e risultati a costrutti specifici come header HTTP, corpo, 
eccetera.

* La maggior parte dei DSL presenti nella v1 sono specifici per HTTP e sono stati spostati sotto il DSL [HTTP](https://godoc.org/goa.design/goa/dsl#HTTP).
* [Param](https://godoc.org/goa.design/goa/dsl#Param) e [Header](https://godoc.org/goa.design/goa/dsl#Header) ora richiedono un semplice
  elenco di attributi del payload o dei result type.
* Le error response ora usano il DSL [Error](https://godoc.org/goa.design/goa/dsl#Error).
* I path parameters HTTP ora sono definiti con le parentesi graffe invece dei due punti: `/foo/{id}` anziché `/foo/:id`.

### Mapping di input e output

Questo esempio di v1 action design:

```go
	Action("update", func() {
		Description("Change account name")
		Routing(
			PUT("/:accountID"),
		)
		Params(func() {
			Param("accountID", Integer, "Account ID")
		})
		Payload(func() {
			Attribute("name", String, "Account name")
			Required("name")
		})
		Response(NoContent)
		Response(NotFound)
		Response(BadRequest, ErrorMedia)
	})
```

Equivale al seguente v3 design:

```go
	Method("update", func() {
		Description("Change account name")
		Payload(func() {
			Attribute("accountID", Int, "Account ID")
			Attribute("name", String, "Account name")
			Required("name")
		})
		Result(Empty)
		Error("NotFound")
		Error("BadRequest")

		HTTP(func() {
			PUT("/{accountID}")
		})
	})
```
