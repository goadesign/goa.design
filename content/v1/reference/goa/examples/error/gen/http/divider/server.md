+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/error/gen/http/divider/server"
+++


# server
`import "github.com/goadesign/goa/examples/error/gen/http/divider/server"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func DecodeDivideRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeDivideRequest)
* [func DecodeIntegerDivideRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeIntegerDivideRequest)
* [func DivideDividerPath(a float64, b float64) string](#DivideDividerPath)
* [func EncodeDivideError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeDivideError)
* [func EncodeDivideResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeDivideResponse)
* [func EncodeIntegerDivideError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeIntegerDivideError)
* [func EncodeIntegerDivideResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeIntegerDivideResponse)
* [func IntegerDivideDividerPath(a int, b int) string](#IntegerDivideDividerPath)
* [func Mount(mux goahttp.Muxer, h *Server)](#Mount)
* [func MountDivideHandler(mux goahttp.Muxer, h http.Handler)](#MountDivideHandler)
* [func MountIntegerDivideHandler(mux goahttp.Muxer, h http.Handler)](#MountIntegerDivideHandler)
* [func NewDivideFloatOperands(a float64, b float64) *dividersvc.FloatOperands](#NewDivideFloatOperands)
* [func NewDivideHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewDivideHandler)
* [func NewIntegerDivideHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewIntegerDivideHandler)
* [func NewIntegerDivideIntOperands(a int, b int) *dividersvc.IntOperands](#NewIntegerDivideIntOperands)
* [type DivideDivByZeroResponseBody](#DivideDivByZeroResponseBody)
  * [func NewDivideDivByZeroResponseBody(res *goa.ServiceError) *DivideDivByZeroResponseBody](#NewDivideDivByZeroResponseBody)
* [type DivideTimeoutResponseBody](#DivideTimeoutResponseBody)
  * [func NewDivideTimeoutResponseBody(res *goa.ServiceError) *DivideTimeoutResponseBody](#NewDivideTimeoutResponseBody)
* [type ErrorNamer](#ErrorNamer)
* [type IntegerDivideDivByZeroResponseBody](#IntegerDivideDivByZeroResponseBody)
  * [func NewIntegerDivideDivByZeroResponseBody(res *goa.ServiceError) *IntegerDivideDivByZeroResponseBody](#NewIntegerDivideDivByZeroResponseBody)
* [type IntegerDivideHasRemainderResponseBody](#IntegerDivideHasRemainderResponseBody)
  * [func NewIntegerDivideHasRemainderResponseBody(res *goa.ServiceError) *IntegerDivideHasRemainderResponseBody](#NewIntegerDivideHasRemainderResponseBody)
* [type IntegerDivideTimeoutResponseBody](#IntegerDivideTimeoutResponseBody)
  * [func NewIntegerDivideTimeoutResponseBody(res *goa.ServiceError) *IntegerDivideTimeoutResponseBody](#NewIntegerDivideTimeoutResponseBody)
* [type MountPoint](#MountPoint)
* [type Server](#Server)
  * [func New(e *dividersvc.Endpoints, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) *Server](#New)
  * [func (s *Server) Service() string](#Server.Service)
  * [func (s *Server) Use(m func(http.Handler) http.Handler)](#Server.Use)


#### <a name="pkg-files">Package files</a>
[encode_decode.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/server/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/server/paths.go) [server.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/server/server.go) [types.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/server/types.go) 





## <a name="DecodeDivideRequest">func</a> [DecodeDivideRequest](/src/target/encode_decode.go?s=3562:3691#L119)
``` go
func DecodeDivideRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeDivideRequest returns a decoder for requests sent to the divider
divide endpoint.



## <a name="DecodeIntegerDivideRequest">func</a> [DecodeIntegerDivideRequest](/src/target/encode_decode.go?s=919:1055#L34)
``` go
func DecodeIntegerDivideRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeIntegerDivideRequest returns a decoder for requests sent to the
divider integer_divide endpoint.



## <a name="DivideDividerPath">func</a> [DivideDividerPath](/src/target/paths.go?s=549:600#L21)
``` go
func DivideDividerPath(a float64, b float64) string
```
DivideDividerPath returns the URL path to the divider service divide HTTP endpoint.



## <a name="EncodeDivideError">func</a> [EncodeDivideError](/src/target/encode_decode.go?s=4406:4552#L155)
``` go
func EncodeDivideError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeDivideError returns an encoder for errors returned by the divide
divider endpoint.



## <a name="EncodeDivideResponse">func</a> [EncodeDivideResponse](/src/target/encode_decode.go?s=3107:3262#L107)
``` go
func EncodeDivideResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeDivideResponse returns an encoder for responses returned by the
divider divide endpoint.



## <a name="EncodeIntegerDivideError">func</a> [EncodeIntegerDivideError](/src/target/encode_decode.go?s=1826:1979#L70)
``` go
func EncodeIntegerDivideError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeIntegerDivideError returns an encoder for errors returned by the
integer_divide divider endpoint.



## <a name="EncodeIntegerDivideResponse">func</a> [EncodeIntegerDivideResponse](/src/target/encode_decode.go?s=446:608#L22)
``` go
func EncodeIntegerDivideResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeIntegerDivideResponse returns an encoder for responses returned by the
divider integer_divide endpoint.



## <a name="IntegerDivideDividerPath">func</a> [IntegerDivideDividerPath](/src/target/paths.go?s=365:415#L16)
``` go
func IntegerDivideDividerPath(a int, b int) string
```
IntegerDivideDividerPath returns the URL path to the divider service integer_divide HTTP endpoint.



## <a name="Mount">func</a> [Mount](/src/target/server.go?s=2023:2063#L72)
``` go
func Mount(mux goahttp.Muxer, h *Server)
```
Mount configures the mux to serve the divider endpoints.



## <a name="MountDivideHandler">func</a> [MountDivideHandler](/src/target/server.go?s=3748:3806#L129)
``` go
func MountDivideHandler(mux goahttp.Muxer, h http.Handler)
```
MountDivideHandler configures the mux to serve the "divider" service
"divide" endpoint.



## <a name="MountIntegerDivideHandler">func</a> [MountIntegerDivideHandler](/src/target/server.go?s=2262:2327#L79)
``` go
func MountIntegerDivideHandler(mux goahttp.Muxer, h http.Handler)
```
MountIntegerDivideHandler configures the mux to serve the "divider" service
"integer_divide" endpoint.



## <a name="NewDivideFloatOperands">func</a> [NewDivideFloatOperands](/src/target/types.go?s=7037:7112#L186)
``` go
func NewDivideFloatOperands(a float64, b float64) *dividersvc.FloatOperands
```
NewDivideFloatOperands builds a divider service divide endpoint payload.



## <a name="NewDivideHandler">func</a> [NewDivideHandler](/src/target/server.go?s=4098:4341#L141)
``` go
func NewDivideHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewDivideHandler creates a HTTP handler which loads the HTTP request and
calls the "divider" service "divide" endpoint.



## <a name="NewIntegerDivideHandler">func</a> [NewIntegerDivideHandler](/src/target/server.go?s=2635:2885#L91)
``` go
func NewIntegerDivideHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewIntegerDivideHandler creates a HTTP handler which loads the HTTP request
and calls the "divider" service "integer_divide" endpoint.



## <a name="NewIntegerDivideIntOperands">func</a> [NewIntegerDivideIntOperands](/src/target/types.go?s=6833:6903#L178)
``` go
func NewIntegerDivideIntOperands(a int, b int) *dividersvc.IntOperands
```
NewIntegerDivideIntOperands builds a divider service integer_divide endpoint
payload.




## <a name="DivideDivByZeroResponseBody">type</a> [DivideDivByZeroResponseBody](/src/target/types.go?s=2982:3668#L72)
``` go
type DivideDivByZeroResponseBody struct {
    // Name is the name of this class of errors.
    Name string `form:"name" json:"name" xml:"name"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID string `form:"id" json:"id" xml:"id"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message string `form:"message" json:"message" xml:"message"`
    // Is the error temporary?
    Temporary bool `form:"temporary" json:"temporary" xml:"temporary"`
    // Is the error a timeout?
    Timeout bool `form:"timeout" json:"timeout" xml:"timeout"`
    // Is the error a server-side fault?
    Fault bool `form:"fault" json:"fault" xml:"fault"`
}

```
DivideDivByZeroResponseBody is the type of the "divider" service "divide"
endpoint HTTP response body for the "div_by_zero" error.







### <a name="NewDivideDivByZeroResponseBody">func</a> [NewDivideDivByZeroResponseBody](/src/target/types.go?s=6023:6110#L150)
``` go
func NewDivideDivByZeroResponseBody(res *goa.ServiceError) *DivideDivByZeroResponseBody
```
NewDivideDivByZeroResponseBody builds the HTTP response body from the result
of the "divide" endpoint of the "divider" service.





## <a name="DivideTimeoutResponseBody">type</a> [DivideTimeoutResponseBody](/src/target/types.go?s=3801:4485#L90)
``` go
type DivideTimeoutResponseBody struct {
    // Name is the name of this class of errors.
    Name string `form:"name" json:"name" xml:"name"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID string `form:"id" json:"id" xml:"id"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message string `form:"message" json:"message" xml:"message"`
    // Is the error temporary?
    Temporary bool `form:"temporary" json:"temporary" xml:"temporary"`
    // Is the error a timeout?
    Timeout bool `form:"timeout" json:"timeout" xml:"timeout"`
    // Is the error a server-side fault?
    Fault bool `form:"fault" json:"fault" xml:"fault"`
}

```
DivideTimeoutResponseBody is the type of the "divider" service "divide"
endpoint HTTP response body for the "timeout" error.







### <a name="NewDivideTimeoutResponseBody">func</a> [NewDivideTimeoutResponseBody](/src/target/types.go?s=6451:6534#L164)
``` go
func NewDivideTimeoutResponseBody(res *goa.ServiceError) *DivideTimeoutResponseBody
```
NewDivideTimeoutResponseBody builds the HTTP response body from the result
of the "divide" endpoint of the "divider" service.





## <a name="ErrorNamer">type</a> [ErrorNamer](/src/target/server.go?s=655:704#L29)
``` go
type ErrorNamer interface {
    ErrorName() string
}
```
ErrorNamer is an interface implemented by generated error structs that
exposes the name of the error as defined in the design.










## <a name="IntegerDivideDivByZeroResponseBody">type</a> [IntegerDivideDivByZeroResponseBody](/src/target/types.go?s=1311:2004#L36)
``` go
type IntegerDivideDivByZeroResponseBody struct {
    // Name is the name of this class of errors.
    Name string `form:"name" json:"name" xml:"name"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID string `form:"id" json:"id" xml:"id"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message string `form:"message" json:"message" xml:"message"`
    // Is the error temporary?
    Temporary bool `form:"temporary" json:"temporary" xml:"temporary"`
    // Is the error a timeout?
    Timeout bool `form:"timeout" json:"timeout" xml:"timeout"`
    // Is the error a server-side fault?
    Fault bool `form:"fault" json:"fault" xml:"fault"`
}

```
IntegerDivideDivByZeroResponseBody is the type of the "divider" service
"integer_divide" endpoint HTTP response body for the "div_by_zero" error.







### <a name="NewIntegerDivideDivByZeroResponseBody">func</a> [NewIntegerDivideDivByZeroResponseBody](/src/target/types.go?s=5114:5215#L122)
``` go
func NewIntegerDivideDivByZeroResponseBody(res *goa.ServiceError) *IntegerDivideDivByZeroResponseBody
```
NewIntegerDivideDivByZeroResponseBody builds the HTTP response body from the
result of the "integer_divide" endpoint of the "divider" service.





## <a name="IntegerDivideHasRemainderResponseBody">type</a> [IntegerDivideHasRemainderResponseBody](/src/target/types.go?s=461:1157#L18)
``` go
type IntegerDivideHasRemainderResponseBody struct {
    // Name is the name of this class of errors.
    Name string `form:"name" json:"name" xml:"name"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID string `form:"id" json:"id" xml:"id"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message string `form:"message" json:"message" xml:"message"`
    // Is the error temporary?
    Temporary bool `form:"temporary" json:"temporary" xml:"temporary"`
    // Is the error a timeout?
    Timeout bool `form:"timeout" json:"timeout" xml:"timeout"`
    // Is the error a server-side fault?
    Fault bool `form:"fault" json:"fault" xml:"fault"`
}

```
IntegerDivideHasRemainderResponseBody is the type of the "divider" service
"integer_divide" endpoint HTTP response body for the "has_remainder" error.







### <a name="NewIntegerDivideHasRemainderResponseBody">func</a> [NewIntegerDivideHasRemainderResponseBody](/src/target/types.go?s=4639:4746#L108)
``` go
func NewIntegerDivideHasRemainderResponseBody(res *goa.ServiceError) *IntegerDivideHasRemainderResponseBody
```
NewIntegerDivideHasRemainderResponseBody builds the HTTP response body from
the result of the "integer_divide" endpoint of the "divider" service.





## <a name="IntegerDivideTimeoutResponseBody">type</a> [IntegerDivideTimeoutResponseBody](/src/target/types.go?s=2152:2843#L54)
``` go
type IntegerDivideTimeoutResponseBody struct {
    // Name is the name of this class of errors.
    Name string `form:"name" json:"name" xml:"name"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID string `form:"id" json:"id" xml:"id"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message string `form:"message" json:"message" xml:"message"`
    // Is the error temporary?
    Temporary bool `form:"temporary" json:"temporary" xml:"temporary"`
    // Is the error a timeout?
    Timeout bool `form:"timeout" json:"timeout" xml:"timeout"`
    // Is the error a server-side fault?
    Fault bool `form:"fault" json:"fault" xml:"fault"`
}

```
IntegerDivideTimeoutResponseBody is the type of the "divider" service
"integer_divide" endpoint HTTP response body for the "timeout" error.







### <a name="NewIntegerDivideTimeoutResponseBody">func</a> [NewIntegerDivideTimeoutResponseBody](/src/target/types.go?s=5578:5675#L136)
``` go
func NewIntegerDivideTimeoutResponseBody(res *goa.ServiceError) *IntegerDivideTimeoutResponseBody
```
NewIntegerDivideTimeoutResponseBody builds the HTTP response body from the
result of the "integer_divide" endpoint of the "divider" service.





## <a name="MountPoint">type</a> [MountPoint](/src/target/server.go?s=767:1089#L34)
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










## <a name="Server">type</a> [Server](/src/target/server.go?s=413:520#L21)
``` go
type Server struct {
    Mounts        []*MountPoint
    IntegerDivide http.Handler
    Divide        http.Handler
}

```
Server lists the divider service endpoint HTTP handlers.







### <a name="New">func</a> [New](/src/target/server.go?s=1164:1391#L45)
``` go
func New(
    e *dividersvc.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) *Server
```
New instantiates HTTP handlers for all the divider service endpoints.





### <a name="Server.Service">func</a> (\*Server) [Service](/src/target/server.go?s=1724:1757#L63)
``` go
func (s *Server) Service() string
```
Service returns the name of the service served.




### <a name="Server.Use">func</a> (\*Server) [Use](/src/target/server.go?s=1840:1895#L66)
``` go
func (s *Server) Use(m func(http.Handler) http.Handler)
```
Use wraps the server handlers with the given middleware.








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
