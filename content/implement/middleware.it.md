+++
title = "Middleware"
weight = 5

[menu.main]
name = "Middleware"
parent = "implement"
+++

Un [middleware](https://pkg.go.dev/goa.design/goa/v3/middleware) è una funzione che accetta
e ritorna un endpoint o un handler per un transport specifico.

## Endpoint Middleware

Gli Endpoint middlewares operano a un endpoint level e sono transport agnostic.
Consistono in funzioni che accettano e ritornano un Goa endpoint. 
Ecco un esempio di un endpoint middleware che stampa gli errori:

```go
// ErrorLogger è un endpoint middleware che stampa gli errori usando il logger
// specificato. Tutte le log entries iniziano con il prefisso specificato.
func ErrorLogger(l *log.Logger, prefix string) func (goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        // Un Goa endpoint è esso stesso una funzione.
        return goa.Endpoint(func (ctx context.Context, req interface{}) (interface{}, error) {
            // Chiama la funzione di endpoint originale.
            res, err := e(ctx, req)
            // Stampa qualunque errore.
            if err != nil {
                l.Printf("%s: %s", prefix, err.Error())
            }
            // Ritorna il risultato dell'endpoint.
            return res, err
        })
    }
}
```

Il codice generato da Goa fornisce un metodo `Use` che applica il middleware
a tutti gli endpoint di un servizio. Alternativamente il middleware può essere 
applicato a uno specifico endpoint racchiudendolo nei campi degli endpoint stessi.

```go
import (
    calcsvc "goa.design/examples/basic/gen/calc"
    calc "goa.design/examples/basic"
)

func main() {
    // ...
    var svc calcsvc.Service
    {
        svc = calc.NewCalc(logger)
    }

    var eps *calcsvc.Endpoints
    {
        eps = calcsvc.NewEndpoints(svc)

        // Applica ErrorLogger a tutti gli endpoints.
        calcsvc.Use(ErrorLogger(logger, "calc"))

        // O applicalo solo a specifici endpoint.
        // eps.Add = ErrorLogger(logger, "add")(eps.Add)
    }
    // ...
}
```

## Transport Middleware

I Transport middlewares operano a livello di trasporto. Si applicano a
handler HTTP o gRPC.

### HTTP Middleware

Un middleware HTTP è una funzione che prende come parametro e ritorna
un [handler](https://golang.org/pkg/net/http/#Handler) HTTP.

Ecco un esempio di middleware HTTP che legge il valore di un header
`X-Request-Id` e lo scrive nel contesto della richiesta, se presente.

```go
// InitRequestID è un middleware server HTTP che legge il valore dell'header
// X-Request-Id e, se presente, lo scrive nel request context.
func InitRequestID() func(http.Handler) http.Handler {
    return func(h http.Handler) http.Handler {
        // Un handler HTTP è una funzione.
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            req := r
            // Ottiene l'header X-Request-Id e inizializza il request context.
            if id := r.Header.Get("X-Request-Id"); id != "" {
                ctx = context.WithValue(r.Context(), RequestIDKey, id)
                req = r.WithContext(ctx)
            }

            // Richiama l'handler iniziale.
            h.ServeHTTP(w, req)
        })
    }
}
```

I middleware HTTP possono essere applicati usando il metoodo `Use` su un server HTTP. 
Questo metodo applica il middleware a tutti i server handler.
In alternativa il middleware si può applicare a specifici server handler
allo stesso modo dei middleware endpoint.
I middleware HTTP possono anche essere montati direttamente sul
[goa Muxer](https://pkg.go.dev/goa.design/goa/v3/http#Muxer) per eseguirlo su
tutte le richieste a prescindere da qualunque handler.

```go
func main() {
    // ...
    var mux goahttp.Muxer
    {
        mux = goahttp.NewMuxer()
    }

    var calcServer *calcsvcsvr.Server
    {
        calcServer = calcsvcsvr.New(calcEndpoints, mux, dec, enc, errorHandler(logger))
        // Applica il middleware InitRequestID a tutti i server handler.
        calcServer.Use(InitRequestID())
    }

    // In alternativa applicalo a tutte le richieste.
    // var handler http.Handler = mux
    // handler = InitRequestID()(handler)
    // ... ora usa l'handler per far partire il server al posto di mux.
}
```

Goa ha delle implementazioni di alcuni middleware HTTP:

* [**Logging**](https://pkg.go.dev/goa.design/goa/v3/http/middleware#Log) server
  middleware.
* [**Request ID**](https://pkg.go.dev/goa.design/goa/v3/http/middleware#RequestID)
  server middleware.
* **Tracing** middleware per [server](https://pkg.go.dev/goa.design/goa/v3/http/middleware#Trace)
  e [client](https://pkg.go.dev/goa.design/goa/v3/http/middleware#WrapDoer)
* [**AWS X-Ray**](https://pkg.go.dev/goa.design/goa/v3/http/middleware/xray)
  middleware per server e client.

### gRPC Middleware

I middleware gRPC sono specifici per gRPC e consistono di interceptors per server e client.

* [UnaryServerInterceptor](https://pkg.go.dev/google.golang.org/grpc#UnaryServerInterceptor)
e [UnaryClientInterceptor](https://pkg.go.dev/google.golang.org/grpc#UnaryClientInterceptor)
per gli unary endpoint.
* [StreamServerInterceptor](https://pkg.go.dev/google.golang.org/grpc#StreamServerInterceptor)
e [StreamClientInterceptor](https://pkg.go.dev/google.golang.org/grpc#StreamClientInterceptor)
per gli streaming endpoint.

Goa implementa i seguenti middleware gRPC:

* **Logging** server middleware per gli [unary](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#UnaryServerLog)
  e per gli [streaming](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#StreamServerLog)
  endpoint.
* **Request ID** server middleware for [unary](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#UnaryRequestID)
  and [streaming](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#StreamRequestID)
  endpoints.
* [**Stream Canceler**](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#StreamCanceler)
  server middleware.
* **Tracing** middleware per gli [unary server](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#UnaryServerTrace)
  e [client](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#UnaryClientTrace), ma anche
  [streaming server](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#StreamServerTrace) e [client](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware#StreamClientTrace).
* [**AWS X-Ray**](https://pkg.go.dev/goa.design/goa/v3/grpc/middleware/xray)
  middleware per gli unary e streaming sia client che server.

Usa come riferimento l'[esempio tracing](https://github.com/goadesign/examples/blob/master/tracing)
per una illustrazione di come i middleware gRPC possono essere applicati agli endpoint gRPC.