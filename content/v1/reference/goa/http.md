+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/http"
+++


# http
`import "github.com/goadesign/goa/http"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [func ErrDecodingError(svc, m string, err error) error](#ErrDecodingError)
* [func ErrEncodingError(svc, m string, err error) error](#ErrEncodingError)
* [func ErrInvalidResponse(svc, m string, code int, body string) error](#ErrInvalidResponse)
* [func ErrInvalidType(svc, m, expected string, actual interface{}) error](#ErrInvalidType)
* [func ErrInvalidURL(svc, m, u string, err error) error](#ErrInvalidURL)
* [func ErrRequestError(svc, m string, err error) error](#ErrRequestError)
* [func ErrValidationError(svc, m string, err error) error](#ErrValidationError)
* [func ErrorEncoder(encoder func(context.Context, http.ResponseWriter) Encoder) func(context.Context, http.ResponseWriter, error) error](#ErrorEncoder)
* [func SetContentType(w http.ResponseWriter, ct string)](#SetContentType)
* [type ClientError](#ClientError)
  * [func (c *ClientError) Error() string](#ClientError.Error)
* [type ConnConfigureFunc](#ConnConfigureFunc)
* [type DebugDoer](#DebugDoer)
  * [func NewDebugDoer(d Doer) DebugDoer](#NewDebugDoer)
* [type Decoder](#Decoder)
  * [func RequestDecoder(r *http.Request) Decoder](#RequestDecoder)
  * [func ResponseDecoder(resp *http.Response) Decoder](#ResponseDecoder)
* [type Dialer](#Dialer)
* [type Doer](#Doer)
* [type Encoder](#Encoder)
  * [func RequestEncoder(r *http.Request) Encoder](#RequestEncoder)
  * [func ResponseEncoder(ctx context.Context, w http.ResponseWriter) Encoder](#ResponseEncoder)
* [type EncodingFunc](#EncodingFunc)
  * [func (f EncodingFunc) Decode(v interface{}) error](#EncodingFunc.Decode)
  * [func (f EncodingFunc) Encode(v interface{}) error](#EncodingFunc.Encode)
* [type ErrorResponse](#ErrorResponse)
  * [func NewErrorResponse(err error) *ErrorResponse](#NewErrorResponse)
  * [func (resp *ErrorResponse) StatusCode() int](#ErrorResponse.StatusCode)
* [type Muxer](#Muxer)
  * [func NewMuxer() Muxer](#NewMuxer)
* [type Upgrader](#Upgrader)


#### <a name="pkg-files">Package files</a>
[client.go](/src/github.com/goadesign/goa/http/client.go) [encoding.go](/src/github.com/goadesign/goa/http/encoding.go) [error.go](/src/github.com/goadesign/goa/http/error.go) [mux.go](/src/github.com/goadesign/goa/http/mux.go) [websocket.go](/src/github.com/goadesign/goa/http/websocket.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // AcceptTypeKey is the context key used to store the value of the HTTP
    // request Accept-Type header. The value may be used by encoders and
    // decoders to implement a content type negotiation algorithm.
    AcceptTypeKey contextKey = iota + 1
)
```



## <a name="ErrDecodingError">func</a> [ErrDecodingError](/src/target/client.go?s=4212:4265#L168)
``` go
func ErrDecodingError(svc, m string, err error) error
```
ErrDecodingError is the error returned when the decoder fails to decode the
response body.



## <a name="ErrEncodingError">func</a> [ErrEncodingError](/src/target/client.go?s=3630:3683#L154)
``` go
func ErrEncodingError(svc, m string, err error) error
```
ErrEncodingError is the error returned when the encoder fails to encode the
request body.



## <a name="ErrInvalidResponse">func</a> [ErrInvalidResponse](/src/target/client.go?s=4854:4921#L182)
``` go
func ErrInvalidResponse(svc, m string, code int, body string) error
```
ErrInvalidResponse is the error returned when the service responded with an
unexpected response status code.



## <a name="ErrInvalidType">func</a> [ErrInvalidType](/src/target/client.go?s=3301:3371#L147)
``` go
func ErrInvalidType(svc, m, expected string, actual interface{}) error
```
ErrInvalidType is the error returned when the wrong type is given to a
method function.



## <a name="ErrInvalidURL">func</a> [ErrInvalidURL](/src/target/client.go?s=3925:3978#L161)
``` go
func ErrInvalidURL(svc, m, u string, err error) error
```
ErrInvalidURL is the error returned when the URL computed for an method is
invalid.



## <a name="ErrRequestError">func</a> [ErrRequestError](/src/target/client.go?s=5640:5692#L206)
``` go
func ErrRequestError(svc, m string, err error) error
```
ErrRequestError is the error returned when the request fails to be sent.



## <a name="ErrValidationError">func</a> [ErrValidationError](/src/target/client.go?s=4543:4598#L175)
``` go
func ErrValidationError(svc, m string, err error) error
```
ErrValidationError is the error returned when the response body is properly
received and decoded but fails validation.



## <a name="ErrorEncoder">func</a> [ErrorEncoder](/src/target/encoding.go?s=4767:4900#L163)
``` go
func ErrorEncoder(encoder func(context.Context, http.ResponseWriter) Encoder) func(context.Context, http.ResponseWriter, error) error
```
ErrorEncoder returns an encoder that encodes errors returned by service
methods. The encoder checks whether the error is a goa ServiceError struct
and if so uses the error temporary and timeout fields to infer a proper HTTP
status code and marshals the error struct to the body using the provided
encoder. If the error is not a goa ServiceError struct then it is encoded
as a permanent internal server error.



## <a name="SetContentType">func</a> [SetContentType](/src/target/encoding.go?s=5648:5701#L182)
``` go
func SetContentType(w http.ResponseWriter, ct string)
```
SetContentType initializes the response Content-Type header given a MIME
type. If the Content-Type header is already set and the MIME type is
"application/json" or "application/xml" then SetContentType appends a suffix
to the header ("+json" or "+xml" respectively).




## <a name="ClientError">type</a> [ClientError](/src/target/client.go?s=666:1079#L37)
``` go
type ClientError struct {
    // Name is a name for this class of errors.
    Name string
    // Message contains the specific error details.
    Message string
    // Service is the name of the service.
    Service string
    // Method is the name of the service method.
    Method string
    // Is the error temporary?
    Temporary bool
    // Is the error a timeout?
    Timeout bool
    // Is the error a server-side fault?
    Fault bool
}

```
ClientError is an error returned by a HTTP service client.










### <a name="ClientError.Error">func</a> (\*ClientError) [Error](/src/target/client.go?s=3098:3134#L141)
``` go
func (c *ClientError) Error() string
```
Error builds an error message.




## <a name="ConnConfigureFunc">type</a> [ConnConfigureFunc](/src/target/websocket.go?s=662:717#L24)
``` go
type ConnConfigureFunc func(*websocket.Conn) *websocket.Conn
```
ConnConfigureFunc is used to configure a websocket connection with
custom handlers.










## <a name="DebugDoer">type</a> [DebugDoer](/src/target/client.go?s=279:388#L21)
``` go
type DebugDoer interface {
    Doer
    // Fprint prints the HTTP request and response details.
    Fprint(io.Writer)
}
```
DebugDoer is a Doer that can print the low level HTTP details.







### <a name="NewDebugDoer">func</a> [NewDebugDoer](/src/target/client.go?s=1185:1220#L57)
``` go
func NewDebugDoer(d Doer) DebugDoer
```
NewDebugDoer wraps the given doer and captures the request and response so
they can be printed.





## <a name="Decoder">type</a> [Decoder](/src/target/encoding.go?s=504:584#L25)
``` go
type Decoder interface {
    // Decode decodes into v.
    Decode(v interface{}) error
}
```
Decoder provides the actual decoding algorithm used to load HTTP
request and response bodies.







### <a name="RequestDecoder">func</a> [RequestDecoder](/src/target/encoding.go?s=1429:1473#L55)
``` go
func RequestDecoder(r *http.Request) Decoder
```
RequestDecoder returns a HTTP request body decoder suitable for the given
request. The decoder handles the following mime types:


	* application/json using package encoding/json
	* application/xml using package encoding/xml
	* application/gob using package encoding/gob

RequestDecoder defaults to the JSON decoder if the request "Content-Type"
header does not match any of the supported mime type or is missing
altogether.


### <a name="ResponseDecoder">func</a> [ResponseDecoder](/src/target/encoding.go?s=3750:3799#L137)
``` go
func ResponseDecoder(resp *http.Response) Decoder
```
ResponseDecoder returns a HTTP response decoder.
The decoder handles the following content types:


	* application/json using package encoding/json (default)
	* application/xml using package encoding/xml
	* application/gob using package encoding/gob





## <a name="Dialer">type</a> [Dialer](/src/target/websocket.go?s=408:567#L17)
``` go
type Dialer interface {
    // Dial creates a client connection to the websocket server.
    Dial(url string, h http.Header) (*websocket.Conn, *http.Response, error)
}
```
Dialer creates a websocket connection to a given URL.










## <a name="Doer">type</a> [Doer](/src/target/client.go?s=146:209#L16)
``` go
type Doer interface {
    Do(*http.Request) (*http.Response, error)
}
```
Doer is the HTTP client interface.










## <a name="Encoder">type</a> [Encoder](/src/target/encoding.go?s=690:765#L32)
``` go
type Encoder interface {
    // Encode encodes v.
    Encode(v interface{}) error
}
```
Encoder provides the actual encoding algorithm used to write HTTP
request and response bodies.







### <a name="RequestEncoder">func</a> [RequestEncoder](/src/target/encoding.go?s=3343:3387#L124)
``` go
func RequestEncoder(r *http.Request) Encoder
```
RequestEncoder returns a HTTP request encoder.
The encoder uses package encoding/json.


### <a name="ResponseEncoder">func</a> [ResponseEncoder](/src/target/encoding.go?s=2463:2535#L88)
``` go
func ResponseEncoder(ctx context.Context, w http.ResponseWriter) Encoder
```
ResponseEncoder returns a HTTP response encoder and the corresponding mime
type suitable for the given request. The encoder supports the following mime
types:


	* application/json using package encoding/json
	* application/xml using package encoding/xml
	* application/gob using package encoding/gob

ResponseEncoder defaults to the JSON encoder if the request "Accept" header
does not match any of the supported mime types or is missing altogether.





## <a name="EncodingFunc">type</a> [EncodingFunc](/src/target/encoding.go?s=863:901#L39)
``` go
type EncodingFunc func(v interface{}) error
```
EncodingFunc allows a function with appropriate signature to act as a
Decoder/Encoder.










### <a name="EncodingFunc.Decode">func</a> (EncodingFunc) [Decode](/src/target/encoding.go?s=5169:5218#L173)
``` go
func (f EncodingFunc) Decode(v interface{}) error
```
Decode implements the Decoder interface. It simply calls f(v).




### <a name="EncodingFunc.Encode">func</a> (EncodingFunc) [Encode](/src/target/encoding.go?s=5302:5351#L176)
``` go
func (f EncodingFunc) Encode(v interface{}) error
```
Encode implements the Encoder interface. It simply calls f(v).




## <a name="ErrorResponse">type</a> [ErrorResponse](/src/target/error.go?s=266:955#L13)
``` go
type ErrorResponse struct {
    // Name is a name for that class of errors.
    Name string `json:"name" xml:"name" form:"name"`
    // ID is the unique error instance identifier.
    ID string `json:"id" xml:"id" form:"id"`
    // Message describes the specific error occurrence.
    Message string `json:"message" xml:"message" form:"message"`
    // Temporary indicates whether the error is temporary.
    Temporary bool `json:"temporary" xml:"temporary" form:"temporary"`
    // Timeout indicates whether the error is a timeout.
    Timeout bool `json:"timeout" xml:"timeout" form:"timeout"`
    // Fault indicates whether the error is a server-side fault.
    Fault bool `json:"fault" xml:"fault" form:"fault"`
}

```
ErrorResponse is the data structure encoded in HTTP responses that
correspond to errors created by the generated code. This struct is
mainly intended for clients to decode error responses.







### <a name="NewErrorResponse">func</a> [NewErrorResponse](/src/target/error.go?s=1025:1072#L30)
``` go
func NewErrorResponse(err error) *ErrorResponse
```
NewErrorResponse creates a HTTP response from the given error.





### <a name="ErrorResponse.StatusCode">func</a> (\*ErrorResponse) [StatusCode](/src/target/error.go?s=1639:1682#L48)
``` go
func (resp *ErrorResponse) StatusCode() int
```
StatusCode implements a heuristic that computes a HTTP response status code
appropriate for the timeout, temporary and fault characteristics of the
error. This method is used by the generated server code when the error is not
described explicitly in the design.




## <a name="Muxer">type</a> [Muxer](/src/target/mux.go?s=1253:1737#L36)
``` go
type Muxer interface {
    // Handle registers the handler function for the given method
    // and pattern.
    Handle(method, pattern string, handler http.HandlerFunc)

    // ServeHTTP dispatches the request to the handler whose method
    // matches the request method and whose pattern most closely
    // matches the request URL.
    ServeHTTP(http.ResponseWriter, *http.Request)

    // Vars returns the path variables captured for the given
    // request.
    Vars(*http.Request) map[string]string
}
```
Muxer is the HTTP request multiplexer interface used by the generated
code. ServerHTTP must match the HTTP method and URL of each incoming
request against the list of registered patterns and call the handler
for the corresponding method and the pattern that most closely
matches the URL.

The patterns may include wildcards that identify URL segments that
must be captured.

There are two forms of wildcards the implementation must support:


	- "{name}" wildcards capture a single path segment, for example the
	  pattern "/images/{name}" captures "/images/favicon.ico" and adds
	  the key "name" with the value "favicon.ico" to the map returned
	  by Vars.
	
	- "{*name}" wildcards must appear at the end of the pattern and
	  captures the entire path starting where the wildcard matches. For
	  example the pattern "/images/{*filename}" captures
	  "/images/public/thumbnail.jpg" and associates the key key
	  "filename" with "public/thumbnail.jpg" in the map returned by
	  Vars.

The names of wildcards must match the regular expression
"[a-zA-Z0-9_]+".







### <a name="NewMuxer">func</a> [NewMuxer](/src/target/mux.go?s=2094:2115#L61)
``` go
func NewMuxer() Muxer
```
NewMuxer returns a Muxer implementation based on the httptreemux router.





## <a name="Upgrader">type</a> [Upgrader](/src/target/websocket.go?s=152:347#L11)
``` go
type Upgrader interface {
    // Upgrade upgrades the HTTP connection to the websocket protocol.
    Upgrade(w http.ResponseWriter, r *http.Request, responseHeader http.Header) (*websocket.Conn, error)
}
```
Upgrader is an HTTP connection that is able to upgrade to websocket.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
