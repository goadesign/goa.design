+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/calc/gen/http/calc/server"
+++


# server
`import "github.com/goadesign/goa/examples/calc/gen/http/calc/server"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func AddCalcPath(a int, b int) string](#AddCalcPath)
* [func DecodeAddRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeAddRequest)
* [func EncodeAddResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeAddResponse)
* [func Mount(mux goahttp.Muxer, h *Server)](#Mount)
* [func MountAddHandler(mux goahttp.Muxer, h http.Handler)](#MountAddHandler)
* [func NewAddHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewAddHandler)
* [func NewAddPayload(a int, b int) *calcsvc.AddPayload](#NewAddPayload)
* [type ErrorNamer](#ErrorNamer)
* [type MountPoint](#MountPoint)
* [type Server](#Server)
  * [func New(e *calcsvc.Endpoints, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) *Server](#New)
  * [func (s *Server) Service() string](#Server.Service)
  * [func (s *Server) Use(m func(http.Handler) http.Handler)](#Server.Use)


#### <a name="pkg-files">Package files</a>
[encode_decode.go](/src/github.com/goadesign/goa/examples/calc/gen/http/calc/server/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/calc/gen/http/calc/server/paths.go) [server.go](/src/github.com/goadesign/goa/examples/calc/gen/http/calc/server/server.go) [types.go](/src/github.com/goadesign/goa/examples/calc/gen/http/calc/server/types.go) 





## <a name="AddCalcPath">func</a> [AddCalcPath](/src/target/paths.go?s=333:370#L16)
``` go
func AddCalcPath(a int, b int) string
```
AddCalcPath returns the URL path to the calc service add HTTP endpoint.



## <a name="DecodeAddRequest">func</a> [DecodeAddRequest](/src/target/encode_decode.go?s=856:982#L34)
``` go
func DecodeAddRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeAddRequest returns a decoder for requests sent to the calc add
endpoint.



## <a name="EncodeAddResponse">func</a> [EncodeAddResponse](/src/target/encode_decode.go?s=417:569#L22)
``` go
func EncodeAddResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeAddResponse returns an encoder for responses returned by the calc add
endpoint.



## <a name="Mount">func</a> [Mount](/src/target/server.go?s=1767:1807#L68)
``` go
func Mount(mux goahttp.Muxer, h *Server)
```
Mount configures the mux to serve the calc endpoints.



## <a name="MountAddHandler">func</a> [MountAddHandler](/src/target/server.go?s=1927:1982#L74)
``` go
func MountAddHandler(mux goahttp.Muxer, h http.Handler)
```
MountAddHandler configures the mux to serve the "calc" service "add"
endpoint.



## <a name="NewAddHandler">func</a> [NewAddHandler](/src/target/server.go?s=2265:2505#L86)
``` go
func NewAddHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewAddHandler creates a HTTP handler which loads the HTTP request and calls
the "calc" service "add" endpoint.



## <a name="NewAddPayload">func</a> [NewAddPayload](/src/target/types.go?s=331:383#L16)
``` go
func NewAddPayload(a int, b int) *calcsvc.AddPayload
```
NewAddPayload builds a calc service add endpoint payload.




## <a name="ErrorNamer">type</a> [ErrorNamer](/src/target/server.go?s=598:647#L28)
``` go
type ErrorNamer interface {
    ErrorName() string
}
```
ErrorNamer is an interface implemented by generated error structs that
exposes the name of the error as defined in the design.










## <a name="MountPoint">type</a> [MountPoint](/src/target/server.go?s=710:1032#L33)
``` go
type MountPoint struct {
    // Method is the name of the service method served by the mounted HTTP handler.
    Method string
    // Verb is the HTTP method used to match requests to the mounted handler.
    Verb string
    // Pattern is the HTTP request path pattern used to match requests to the
    // mounted handler.
    Pattern string
}

```
MountPoint holds information about the mounted endpoints.










## <a name="Server">type</a> [Server](/src/target/server.go?s=398:463#L21)
``` go
type Server struct {
    Mounts []*MountPoint
    Add    http.Handler
}

```
Server lists the calc service endpoint HTTP handlers.







### <a name="New">func</a> [New](/src/target/server.go?s=1104:1328#L44)
``` go
func New(
    e *calcsvc.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) *Server
```
New instantiates HTTP handlers for all the calc service endpoints.





### <a name="Server.Service">func</a> (\*Server) [Service](/src/target/server.go?s=1518:1551#L60)
``` go
func (s *Server) Service() string
```
Service returns the name of the service served.




### <a name="Server.Use">func</a> (\*Server) [Use](/src/target/server.go?s=1631:1686#L63)
``` go
func (s *Server) Use(m func(http.Handler) http.Handler)
```
Use wraps the server handlers with the given middleware.








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
