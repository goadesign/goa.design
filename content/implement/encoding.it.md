+++
date = "2019-09-08T11:01:06-05:00"
title = "HTTP Encoding"
weight = 2

[menu.main]
name = "HTTP Encoding"
parent = "implement"
+++

## Panoramica

Goa supporta una strategia di encoding e decoding estremamente flessibile, che rende possibile
l'associazione di encoder e decoder arbitrari con le richieste e risposte HTTP date attraverso
diversi content types. Un encoder è una struct che implementa l'interfaccia 
[Encoder](https://godoc.org/goa.design/goa/http#Encoder) mentre un decoder implementa
[Decoder](https://godoc.org/goa.design/goa/http#Decoder).

I costruttori del server generati accettano dei costruttori di encoder e decoder come argomento,
rendendo possibile implementazioni libere. Goa ha anche degli encoder e decoder di default, che
supportano JSON, XML e [gob](https://golang.org/pkg/encoding/gob/).
Ecco un esempio per la firma del costruttore server generata da Goa (dall'esempio
[basic](https://github.com/goadesign/examples/blob/master/basic)):

```go
// New istanzia gli handler HTTP per tutti i service endpoints di calc.
func New(
	e *calc.Endpoints,
	mux goahttp.Muxer,
	dec func(*http.Request) goahttp.Decoder,
	enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
	eh func(context.Context, http.ResponseWriter, error),
) *Server
```

L'argomento `dec` è una funzione che accetta una richiesta e ritorna un decoder. Goa la invoca
per ogni richiesta, rendendo possibile di sfruttare diversi decoder per diverse richieste HTTP.
L'argomento `enc` è una funzione che accetta un context e una writer di risposte HTTP e 
ritorna un encoder.

### Costruttori di Default per Encoder e Decoder

Il package fornito da Goa fornisce dei costruttori di default per HTTP
[encoder](https://godoc.org/goa.design/goa/http#RequestEncoder) e
[decoder](https://godoc.org/goa.design/goa/http#ResponseEncoder) che possono codificare e 
decodificare JSON, XML e gob. 
Ecco un esempio di come il generatore usa questi costruttori:

```go
	var (
		dec = goahttp.RequestDecoder
		enc = goahttp.ResponseEncoder
	)
    //...

	var (
		calcServer *calcsvr.Server
	)
	{
        // ...
		calcServer = calcsvr.New(calcEndpoints, mux, dec, enc, eh)
	}
```

## Decoding

Il decoder di default controlla il `Content-Type` delle richieste ed effettua il match con un decoder

Il valore `application/json` è mappato al decoder JSON, `application/xml` al decoder XML e 
`application/gob` al decoder gob. Il decoder JSON è anche usato quando l'header `Content-Type`
è assente o non ha match con un decoder conosciuto. Se il decoding fallisce Goa
scrive una risposta di errore usando il codice di stato 400 Bad Request e scrive un oggetto
[ErrInvalidEncoding](https://goa.design/v1/reference/goa/#variables) nel corpo della risposta (vedi
[Gestione degli errori](/v1/implement/error_handling/) per avere più informazioni su come gli errori
vendono tradotti in risposte HTTP).

### Implementare un Decoder personalizzato

Come indicato nella [Panoramica](#Overview), scrivere un decoder consiste nell'implementare l'interfaccia
`Decoder` e il costruttore usando la seguente firma:

```go
func(r *http.Request) (goahttp.Decoder, error)
```

dove `goahttp` è un alias per il package `goa.design/goa/http`. Il costruttore
ha accesso al request object e può quindi ispezionare il suo stato per inferire il miglior decoder
possibile. La funzione è quindi passata al costruttore per il server (generato) come mostrato nella panoramica.

## Encoding

L'encoder di default implementa un semplice algoritmo di negoziazione che sfrutta il valore dell'header
`Accept` della richiesta oppure `Content-Type` laddove il primo fosse assente.
L'algoritmo pulisce il valore dell'header e lo confronta con i MIME types JSON, XML
e gob per inferire l'encoder corretto. L'algoritmo ha il suo default su JSON qualora non ci fossero header `Accept` o
`Content-Type` validi o se il valore non ha un match con un encoder conosciuto.

### Implementare un Encoder personalizzato

Ci sono vari motivi per cui il tuo servizio potrebbe usare encoder differenti. Per esempio potresti
voler cambiare e non usare la libreria JSON standard, ma un package diverso con prestazioni migliori
per il tuo caso d'uso. Puoi anche supportare diversi formati di serializzazione, come `msgpack`. 
Come indicato nella panoramica un encoder deve implementare l'interfaccia `Encoder` e può
essere passato al costruttore del server (generato) con la seguente firma:

```go
func(ctx context.Context, w http.ResponseWriter) (goahttp.Encoder, error)
```

Il context dato quando Goa richiama il costruttore contiene sia l'header `Content-Type` che
`Accept` rispettivamente sotto le chiavi[ContentTypeKey](https://godoc.org/goa.design/goa/http#pkg-constants)
e `AcceptTypeKey`. 
Questo rende possibile al costruttore dell'encoder di implementare forme differenti di negoziazione che 
controllano questi 2 valori e restituiscono il miglior encoder possibile.

## Impostare un Content Type di default

Il DSL [Response](https://godoc.org/goa.design/goa/dsl#Response) permette di specificare un
content type usando [ContentType](https://godoc.org/goa.design/goa/dsl#ContentType). Quando
viene impostato, il valore sovrascrive ogni content type specificato nei request headers. 
Nota che questo NON sovrascrive alcun valore specificato nell'header `Accept`.
Questo permette di controllare il content type anche quando tale header è assente.
