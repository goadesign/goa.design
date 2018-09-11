+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/security/gen/http/secured_service/server"
+++


# server
`import "github.com/goadesign/goa/examples/security/gen/http/secured_service/server"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func AlsoDoublySecureSecuredServicePath() string](#AlsoDoublySecureSecuredServicePath)
* [func DecodeAlsoDoublySecureRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeAlsoDoublySecureRequest)
* [func DecodeDoublySecureRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeDoublySecureRequest)
* [func DecodeSecureRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeSecureRequest)
* [func DecodeSigninRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeSigninRequest)
* [func DoublySecureSecuredServicePath() string](#DoublySecureSecuredServicePath)
* [func EncodeAlsoDoublySecureError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeAlsoDoublySecureError)
* [func EncodeAlsoDoublySecureResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeAlsoDoublySecureResponse)
* [func EncodeDoublySecureError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeDoublySecureError)
* [func EncodeDoublySecureResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeDoublySecureResponse)
* [func EncodeSecureError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeSecureError)
* [func EncodeSecureResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeSecureResponse)
* [func EncodeSigninError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeSigninError)
* [func EncodeSigninResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeSigninResponse)
* [func Mount(mux goahttp.Muxer, h *Server)](#Mount)
* [func MountAlsoDoublySecureHandler(mux goahttp.Muxer, h http.Handler)](#MountAlsoDoublySecureHandler)
* [func MountDoublySecureHandler(mux goahttp.Muxer, h http.Handler)](#MountDoublySecureHandler)
* [func MountSecureHandler(mux goahttp.Muxer, h http.Handler)](#MountSecureHandler)
* [func MountSigninHandler(mux goahttp.Muxer, h http.Handler)](#MountSigninHandler)
* [func NewAlsoDoublySecureHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewAlsoDoublySecureHandler)
* [func NewAlsoDoublySecurePayload(key *string, oauthToken *string, token *string) *securedservice.AlsoDoublySecurePayload](#NewAlsoDoublySecurePayload)
* [func NewDoublySecureHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewDoublySecureHandler)
* [func NewDoublySecurePayload(key *string, token *string) *securedservice.DoublySecurePayload](#NewDoublySecurePayload)
* [func NewSecureHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewSecureHandler)
* [func NewSecurePayload(fail *bool, token *string) *securedservice.SecurePayload](#NewSecurePayload)
* [func NewSigninHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewSigninHandler)
* [func NewSigninPayload() *securedservice.SigninPayload](#NewSigninPayload)
* [func SecureSecuredServicePath() string](#SecureSecuredServicePath)
* [func SigninSecuredServicePath() string](#SigninSecuredServicePath)
* [type AlsoDoublySecureUnauthorizedResponseBody](#AlsoDoublySecureUnauthorizedResponseBody)
  * [func NewAlsoDoublySecureUnauthorizedResponseBody(res securedservice.Unauthorized) AlsoDoublySecureUnauthorizedResponseBody](#NewAlsoDoublySecureUnauthorizedResponseBody)
* [type DoublySecureUnauthorizedResponseBody](#DoublySecureUnauthorizedResponseBody)
  * [func NewDoublySecureUnauthorizedResponseBody(res securedservice.Unauthorized) DoublySecureUnauthorizedResponseBody](#NewDoublySecureUnauthorizedResponseBody)
* [type ErrorNamer](#ErrorNamer)
* [type MountPoint](#MountPoint)
* [type SecureUnauthorizedResponseBody](#SecureUnauthorizedResponseBody)
  * [func NewSecureUnauthorizedResponseBody(res securedservice.Unauthorized) SecureUnauthorizedResponseBody](#NewSecureUnauthorizedResponseBody)
* [type Server](#Server)
  * [func New(e *securedservice.Endpoints, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) *Server](#New)
  * [func (s *Server) Service() string](#Server.Service)
  * [func (s *Server) Use(m func(http.Handler) http.Handler)](#Server.Use)
* [type SigninUnauthorizedResponseBody](#SigninUnauthorizedResponseBody)
  * [func NewSigninUnauthorizedResponseBody(res securedservice.Unauthorized) SigninUnauthorizedResponseBody](#NewSigninUnauthorizedResponseBody)


#### <a name="pkg-files">Package files</a>
[encode_decode.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/server/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/server/paths.go) [server.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/server/server.go) [types.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/server/types.go) 





## <a name="AlsoDoublySecureSecuredServicePath">func</a> [AlsoDoublySecureSecuredServicePath](/src/target/paths.go?s=893:941#L27)
``` go
func AlsoDoublySecureSecuredServicePath() string
```
AlsoDoublySecureSecuredServicePath returns the URL path to the secured_service service also_doubly_secure HTTP endpoint.



## <a name="DecodeAlsoDoublySecureRequest">func</a> [DecodeAlsoDoublySecureRequest](/src/target/encode_decode.go?s=7135:7274#L222)
``` go
func DecodeAlsoDoublySecureRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeAlsoDoublySecureRequest returns a decoder for requests sent to the
secured_service also_doubly_secure endpoint.



## <a name="DecodeDoublySecureRequest">func</a> [DecodeDoublySecureRequest](/src/target/encode_decode.go?s=4999:5134#L158)
``` go
func DecodeDoublySecureRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeDoublySecureRequest returns a decoder for requests sent to the
secured_service doubly_secure endpoint.



## <a name="DecodeSecureRequest">func</a> [DecodeSecureRequest](/src/target/encode_decode.go?s=2698:2827#L84)
``` go
func DecodeSecureRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeSecureRequest returns a decoder for requests sent to the
secured_service secure endpoint.



## <a name="DecodeSigninRequest">func</a> [DecodeSigninRequest](/src/target/encode_decode.go?s=932:1061#L33)
``` go
func DecodeSigninRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeSigninRequest returns a decoder for requests sent to the
secured_service signin endpoint.



## <a name="DoublySecureSecuredServicePath">func</a> [DoublySecureSecuredServicePath](/src/target/paths.go?s=701:745#L22)
``` go
func DoublySecureSecuredServicePath() string
```
DoublySecureSecuredServicePath returns the URL path to the secured_service service doubly_secure HTTP endpoint.



## <a name="EncodeAlsoDoublySecureError">func</a> [EncodeAlsoDoublySecureError](/src/target/encode_decode.go?s=8209:8365#L259)
``` go
func EncodeAlsoDoublySecureError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeAlsoDoublySecureError returns an encoder for errors returned by the
also_doubly_secure secured_service endpoint.



## <a name="EncodeAlsoDoublySecureResponse">func</a> [EncodeAlsoDoublySecureResponse](/src/target/encode_decode.go?s=6641:6806#L210)
``` go
func EncodeAlsoDoublySecureResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeAlsoDoublySecureResponse returns an encoder for responses returned by
the secured_service also_doubly_secure endpoint.



## <a name="EncodeDoublySecureError">func</a> [EncodeDoublySecureError](/src/target/encode_decode.go?s=5817:5969#L187)
``` go
func EncodeDoublySecureError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeDoublySecureError returns an encoder for errors returned by the
doubly_secure secured_service endpoint.



## <a name="EncodeDoublySecureResponse">func</a> [EncodeDoublySecureResponse](/src/target/encode_decode.go?s=4518:4679#L146)
``` go
func EncodeDoublySecureResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeDoublySecureResponse returns an encoder for responses returned by the
secured_service doubly_secure endpoint.



## <a name="EncodeSecureError">func</a> [EncodeSecureError](/src/target/encode_decode.go?s=3715:3861#L123)
``` go
func EncodeSecureError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeSecureError returns an encoder for errors returned by the secure
secured_service endpoint.



## <a name="EncodeSecureResponse">func</a> [EncodeSecureResponse](/src/target/encode_decode.go?s=2236:2391#L72)
``` go
func EncodeSecureResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeSecureResponse returns an encoder for responses returned by the
secured_service secure endpoint.



## <a name="EncodeSigninError">func</a> [EncodeSigninError](/src/target/encode_decode.go?s=1446:1592#L49)
``` go
func EncodeSigninError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeSigninError returns an encoder for errors returned by the signin
secured_service endpoint.



## <a name="EncodeSigninResponse">func</a> [EncodeSigninResponse](/src/target/encode_decode.go?s=535:690#L24)
``` go
func EncodeSigninResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeSigninResponse returns an encoder for responses returned by the
secured_service signin endpoint.



## <a name="Mount">func</a> [Mount](/src/target/server.go?s=2449:2489#L80)
``` go
func Mount(mux goahttp.Muxer, h *Server)
```
Mount configures the mux to serve the secured_service endpoints.



## <a name="MountAlsoDoublySecureHandler">func</a> [MountAlsoDoublySecureHandler](/src/target/server.go?s=7193:7261#L239)
``` go
func MountAlsoDoublySecureHandler(mux goahttp.Muxer, h http.Handler)
```
MountAlsoDoublySecureHandler configures the mux to serve the
"secured_service" service "also_doubly_secure" endpoint.



## <a name="MountDoublySecureHandler">func</a> [MountDoublySecureHandler](/src/target/server.go?s=5675:5739#L189)
``` go
func MountDoublySecureHandler(mux goahttp.Muxer, h http.Handler)
```
MountDoublySecureHandler configures the mux to serve the "secured_service"
service "doubly_secure" endpoint.



## <a name="MountSecureHandler">func</a> [MountSecureHandler](/src/target/server.go?s=4216:4274#L139)
``` go
func MountSecureHandler(mux goahttp.Muxer, h http.Handler)
```
MountSecureHandler configures the mux to serve the "secured_service" service
"secure" endpoint.



## <a name="MountSigninHandler">func</a> [MountSigninHandler](/src/target/server.go?s=2769:2827#L89)
``` go
func MountSigninHandler(mux goahttp.Muxer, h http.Handler)
```
MountSigninHandler configures the mux to serve the "secured_service" service
"signin" endpoint.



## <a name="NewAlsoDoublySecureHandler">func</a> [NewAlsoDoublySecureHandler](/src/target/server.go?s=7582:7835#L252)
``` go
func NewAlsoDoublySecureHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewAlsoDoublySecureHandler creates a HTTP handler which loads the HTTP
request and calls the "secured_service" service "also_doubly_secure"
endpoint.



## <a name="NewAlsoDoublySecurePayload">func</a> [NewAlsoDoublySecurePayload](/src/target/types.go?s=3254:3373#L86)
``` go
func NewAlsoDoublySecurePayload(key *string, oauthToken *string, token *string) *securedservice.AlsoDoublySecurePayload
```
NewAlsoDoublySecurePayload builds a secured_service service
also_doubly_secure endpoint payload.



## <a name="NewDoublySecureHandler">func</a> [NewDoublySecureHandler](/src/target/server.go?s=6047:6296#L201)
``` go
func NewDoublySecureHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewDoublySecureHandler creates a HTTP handler which loads the HTTP request
and calls the "secured_service" service "doubly_secure" endpoint.



## <a name="NewDoublySecurePayload">func</a> [NewDoublySecurePayload](/src/target/types.go?s=2976:3067#L77)
``` go
func NewDoublySecurePayload(key *string, token *string) *securedservice.DoublySecurePayload
```
NewDoublySecurePayload builds a secured_service service doubly_secure
endpoint payload.



## <a name="NewSecureHandler">func</a> [NewSecureHandler](/src/target/server.go?s=4569:4812#L151)
``` go
func NewSecureHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewSecureHandler creates a HTTP handler which loads the HTTP request and
calls the "secured_service" service "secure" endpoint.



## <a name="NewSecurePayload">func</a> [NewSecurePayload](/src/target/types.go?s=2725:2803#L68)
``` go
func NewSecurePayload(fail *bool, token *string) *securedservice.SecurePayload
```
NewSecurePayload builds a secured_service service secure endpoint payload.



## <a name="NewSigninHandler">func</a> [NewSigninHandler](/src/target/server.go?s=3123:3366#L101)
``` go
func NewSigninHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewSigninHandler creates a HTTP handler which loads the HTTP request and
calls the "secured_service" service "signin" endpoint.



## <a name="NewSigninPayload">func</a> [NewSigninPayload](/src/target/types.go?s=2548:2601#L63)
``` go
func NewSigninPayload() *securedservice.SigninPayload
```
NewSigninPayload builds a secured_service service signin endpoint payload.



## <a name="SecureSecuredServicePath">func</a> [SecureSecuredServicePath](/src/target/paths.go?s=524:562#L17)
``` go
func SecureSecuredServicePath() string
```
SecureSecuredServicePath returns the URL path to the secured_service service secure HTTP endpoint.



## <a name="SigninSecuredServicePath">func</a> [SigninSecuredServicePath](/src/target/paths.go?s=360:398#L12)
``` go
func SigninSecuredServicePath() string
```
SigninSecuredServicePath returns the URL path to the secured_service service signin HTTP endpoint.




## <a name="AlsoDoublySecureUnauthorizedResponseBody">type</a> [AlsoDoublySecureUnauthorizedResponseBody](/src/target/types.go?s=1086:1138#L31)
``` go
type AlsoDoublySecureUnauthorizedResponseBody string
```
AlsoDoublySecureUnauthorizedResponseBody is the type of the
"secured_service" service "also_doubly_secure" endpoint HTTP response body
for the "unauthorized" error.







### <a name="NewAlsoDoublySecureUnauthorizedResponseBody">func</a> [NewAlsoDoublySecureUnauthorizedResponseBody](/src/target/types.go?s=2274:2396#L57)
``` go
func NewAlsoDoublySecureUnauthorizedResponseBody(res securedservice.Unauthorized) AlsoDoublySecureUnauthorizedResponseBody
```
NewAlsoDoublySecureUnauthorizedResponseBody builds the HTTP response body
from the result of the "also_doubly_secure" endpoint of the
"secured_service" service.





## <a name="DoublySecureUnauthorizedResponseBody">type</a> [DoublySecureUnauthorizedResponseBody](/src/target/types.go?s=862:910#L26)
``` go
type DoublySecureUnauthorizedResponseBody string
```
DoublySecureUnauthorizedResponseBody is the type of the "secured_service"
service "doubly_secure" endpoint HTTP response body for the "unauthorized"
error.







### <a name="NewDoublySecureUnauthorizedResponseBody">func</a> [NewDoublySecureUnauthorizedResponseBody](/src/target/types.go?s=1920:2034#L49)
``` go
func NewDoublySecureUnauthorizedResponseBody(res securedservice.Unauthorized) DoublySecureUnauthorizedResponseBody
```
NewDoublySecureUnauthorizedResponseBody builds the HTTP response body from
the result of the "doubly_secure" endpoint of the "secured_service" service.





## <a name="ErrorNamer">type</a> [ErrorNamer](/src/target/server.go?s=763:812#L31)
``` go
type ErrorNamer interface {
    ErrorName() string
}
```
ErrorNamer is an interface implemented by generated error structs that
exposes the name of the error as defined in the design.










## <a name="MountPoint">type</a> [MountPoint](/src/target/server.go?s=875:1197#L36)
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










## <a name="SecureUnauthorizedResponseBody">type</a> [SecureUnauthorizedResponseBody](/src/target/types.go?s=653:695#L21)
``` go
type SecureUnauthorizedResponseBody string
```
SecureUnauthorizedResponseBody is the type of the "secured_service" service
"secure" endpoint HTTP response body for the "unauthorized" error.







### <a name="NewSecureUnauthorizedResponseBody">func</a> [NewSecureUnauthorizedResponseBody](/src/target/types.go?s=1596:1698#L42)
``` go
func NewSecureUnauthorizedResponseBody(res securedservice.Unauthorized) SecureUnauthorizedResponseBody
```
NewSecureUnauthorizedResponseBody builds the HTTP response body from the
result of the "secure" endpoint of the "secured_service" service.





## <a name="Server">type</a> [Server](/src/target/server.go?s=450:628#L21)
``` go
type Server struct {
    Mounts           []*MountPoint
    Signin           http.Handler
    Secure           http.Handler
    DoublySecure     http.Handler
    AlsoDoublySecure http.Handler
}

```
Server lists the secured_service service endpoint HTTP handlers.







### <a name="New">func</a> [New](/src/target/server.go?s=1280:1511#L47)
``` go
func New(
    e *securedservice.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) *Server
```
New instantiates HTTP handlers for all the secured_service service endpoints.





### <a name="Server.Service">func</a> (\*Server) [Service](/src/target/server.go?s=2068:2101#L69)
``` go
func (s *Server) Service() string
```
Service returns the name of the service served.




### <a name="Server.Use">func</a> (\*Server) [Use](/src/target/server.go?s=2192:2247#L72)
``` go
func (s *Server) Use(m func(http.Handler) http.Handler)
```
Use wraps the server handlers with the given middleware.




## <a name="SigninUnauthorizedResponseBody">type</a> [SigninUnauthorizedResponseBody](/src/target/types.go?s=460:502#L17)
``` go
type SigninUnauthorizedResponseBody string
```
SigninUnauthorizedResponseBody is the type of the "secured_service" service
"signin" endpoint HTTP response body for the "unauthorized" error.







### <a name="NewSigninUnauthorizedResponseBody">func</a> [NewSigninUnauthorizedResponseBody](/src/target/types.go?s=1285:1387#L35)
``` go
func NewSigninUnauthorizedResponseBody(res securedservice.Unauthorized) SigninUnauthorizedResponseBody
```
NewSigninUnauthorizedResponseBody builds the HTTP response body from the
result of the "signin" endpoint of the "secured_service" service.









- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
