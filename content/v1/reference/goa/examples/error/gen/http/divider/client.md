+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/error/gen/http/divider/client"
+++


# client
`import "github.com/goadesign/goa/examples/error/gen/http/divider/client"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func BuildDividePayload(dividerDivideA string, dividerDivideB string) (*dividersvc.FloatOperands, error)](#BuildDividePayload)
* [func BuildIntegerDividePayload(dividerIntegerDivideA string, dividerIntegerDivideB string) (*dividersvc.IntOperands, error)](#BuildIntegerDividePayload)
* [func DecodeDivideResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeDivideResponse)
* [func DecodeIntegerDivideResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeIntegerDivideResponse)
* [func DivideDividerPath(a float64, b float64) string](#DivideDividerPath)
* [func IntegerDivideDividerPath(a int, b int) string](#IntegerDivideDividerPath)
* [func NewDivideDivByZero(body *DivideDivByZeroResponseBody) *goa.ServiceError](#NewDivideDivByZero)
* [func NewDivideTimeout(body *DivideTimeoutResponseBody) *goa.ServiceError](#NewDivideTimeout)
* [func NewIntegerDivideDivByZero(body *IntegerDivideDivByZeroResponseBody) *goa.ServiceError](#NewIntegerDivideDivByZero)
* [func NewIntegerDivideHasRemainder(body *IntegerDivideHasRemainderResponseBody) *goa.ServiceError](#NewIntegerDivideHasRemainder)
* [func NewIntegerDivideTimeout(body *IntegerDivideTimeoutResponseBody) *goa.ServiceError](#NewIntegerDivideTimeout)
* [type Client](#Client)
  * [func NewClient(scheme string, host string, doer goahttp.Doer, enc func(*http.Request) goahttp.Encoder, dec func(*http.Response) goahttp.Decoder, restoreBody bool) *Client](#NewClient)
  * [func (c *Client) BuildDivideRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildDivideRequest)
  * [func (c *Client) BuildIntegerDivideRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildIntegerDivideRequest)
  * [func (c *Client) Divide() goa.Endpoint](#Client.Divide)
  * [func (c *Client) IntegerDivide() goa.Endpoint](#Client.IntegerDivide)
* [type DivideDivByZeroResponseBody](#DivideDivByZeroResponseBody)
  * [func (body *DivideDivByZeroResponseBody) Validate() (err error)](#DivideDivByZeroResponseBody.Validate)
* [type DivideTimeoutResponseBody](#DivideTimeoutResponseBody)
  * [func (body *DivideTimeoutResponseBody) Validate() (err error)](#DivideTimeoutResponseBody.Validate)
* [type IntegerDivideDivByZeroResponseBody](#IntegerDivideDivByZeroResponseBody)
  * [func (body *IntegerDivideDivByZeroResponseBody) Validate() (err error)](#IntegerDivideDivByZeroResponseBody.Validate)
* [type IntegerDivideHasRemainderResponseBody](#IntegerDivideHasRemainderResponseBody)
  * [func (body *IntegerDivideHasRemainderResponseBody) Validate() (err error)](#IntegerDivideHasRemainderResponseBody.Validate)
* [type IntegerDivideTimeoutResponseBody](#IntegerDivideTimeoutResponseBody)
  * [func (body *IntegerDivideTimeoutResponseBody) Validate() (err error)](#IntegerDivideTimeoutResponseBody.Validate)


#### <a name="pkg-files">Package files</a>
[cli.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/client/cli.go) [client.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/client/client.go) [encode_decode.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/client/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/client/paths.go) [types.go](/src/github.com/goadesign/goa/examples/error/gen/http/divider/client/types.go) 





## <a name="BuildDividePayload">func</a> [BuildDividePayload](/src/target/cli.go?s=1135:1239#L52)
``` go
func BuildDividePayload(dividerDivideA string, dividerDivideB string) (*dividersvc.FloatOperands, error)
```
BuildDividePayload builds the payload for the divider divide endpoint from
CLI flags.



## <a name="BuildIntegerDividePayload">func</a> [BuildIntegerDividePayload](/src/target/cli.go?s=422:545#L20)
``` go
func BuildIntegerDividePayload(dividerIntegerDivideA string, dividerIntegerDivideB string) (*dividersvc.IntOperands, error)
```
BuildIntegerDividePayload builds the payload for the divider integer_divide
endpoint from CLI flags.



## <a name="DecodeDivideResponse">func</a> [DecodeDivideResponse](/src/target/encode_decode.go?s=4937:5068#L165)
``` go
func DecodeDivideResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeDivideResponse returns a decoder for responses returned by the divider
divide endpoint. restoreBody controls whether the response body should be
restored after having been read.
DecodeDivideResponse may return the following errors:


	- "div_by_zero" (type *goa.ServiceError): http.StatusBadRequest
	- "timeout" (type *goa.ServiceError): http.StatusGatewayTimeout
	- error: internal error



## <a name="DecodeIntegerDivideResponse">func</a> [DecodeIntegerDivideResponse](/src/target/encode_decode.go?s=1660:1798#L57)
``` go
func DecodeIntegerDivideResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeIntegerDivideResponse returns a decoder for responses returned by the
divider integer_divide endpoint. restoreBody controls whether the response
body should be restored after having been read.
DecodeIntegerDivideResponse may return the following errors:


	- "has_remainder" (type *goa.ServiceError): http.StatusExpectationFailed
	- "div_by_zero" (type *goa.ServiceError): http.StatusBadRequest
	- "timeout" (type *goa.ServiceError): http.StatusGatewayTimeout
	- error: internal error



## <a name="DivideDividerPath">func</a> [DivideDividerPath](/src/target/paths.go?s=549:600#L21)
``` go
func DivideDividerPath(a float64, b float64) string
```
DivideDividerPath returns the URL path to the divider service divide HTTP endpoint.



## <a name="IntegerDivideDividerPath">func</a> [IntegerDivideDividerPath](/src/target/paths.go?s=365:415#L16)
``` go
func IntegerDivideDividerPath(a int, b int) string
```
IntegerDivideDividerPath returns the URL path to the divider service integer_divide HTTP endpoint.



## <a name="NewDivideDivByZero">func</a> [NewDivideDivByZero](/src/target/types.go?s=6629:6705#L149)
``` go
func NewDivideDivByZero(body *DivideDivByZeroResponseBody) *goa.ServiceError
```
NewDivideDivByZero builds a divider service divide endpoint div_by_zero
error.



## <a name="NewDivideTimeout">func</a> [NewDivideTimeout](/src/target/types.go?s=6985:7057#L162)
``` go
func NewDivideTimeout(body *DivideTimeoutResponseBody) *goa.ServiceError
```
NewDivideTimeout builds a divider service divide endpoint timeout error.



## <a name="NewIntegerDivideDivByZero">func</a> [NewIntegerDivideDivByZero](/src/target/types.go?s=5866:5956#L121)
``` go
func NewIntegerDivideDivByZero(body *IntegerDivideDivByZeroResponseBody) *goa.ServiceError
```
NewIntegerDivideDivByZero builds a divider service integer_divide endpoint
div_by_zero error.



## <a name="NewIntegerDivideHasRemainder">func</a> [NewIntegerDivideHasRemainder](/src/target/types.go?s=5466:5562#L107)
``` go
func NewIntegerDivideHasRemainder(body *IntegerDivideHasRemainderResponseBody) *goa.ServiceError
```
NewIntegerDivideHasRemainder builds a divider service integer_divide
endpoint has_remainder error.



## <a name="NewIntegerDivideTimeout">func</a> [NewIntegerDivideTimeout](/src/target/types.go?s=6254:6340#L135)
``` go
func NewIntegerDivideTimeout(body *IntegerDivideTimeoutResponseBody) *goa.ServiceError
```
NewIntegerDivideTimeout builds a divider service integer_divide endpoint
timeout error.




## <a name="Client">type</a> [Client](/src/target/client.go?s=366:895#L20)
``` go
type Client struct {
    // IntegerDivide Doer is the HTTP client used to make requests to the
    // integer_divide endpoint.
    IntegerDivideDoer goahttp.Doer

    // Divide Doer is the HTTP client used to make requests to the divide endpoint.
    DivideDoer goahttp.Doer

    // RestoreResponseBody controls whether the response bodies are reset after
    // decoding so they can be read again.
    RestoreResponseBody bool
    // contains filtered or unexported fields
}

```
Client lists the divider service endpoint HTTP clients.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=973:1152#L39)
``` go
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client
```
NewClient instantiates HTTP clients for all the divider service servers.





### <a name="Client.BuildDivideRequest">func</a> (\*Client) [BuildDivideRequest](/src/target/encode_decode.go?s=3927:4021#L133)
``` go
func (c *Client) BuildDivideRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildDivideRequest instantiates a HTTP request object with method and path
set to call the "divider" service "divide" endpoint




### <a name="Client.BuildIntegerDivideRequest">func</a> (\*Client) [BuildIntegerDivideRequest](/src/target/encode_decode.go?s=534:635#L24)
``` go
func (c *Client) BuildIntegerDivideRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildIntegerDivideRequest instantiates a HTTP request object with method and
path set to call the "divider" service "integer_divide" endpoint




### <a name="Client.Divide">func</a> (\*Client) [Divide](/src/target/client.go?s=2072:2110#L80)
``` go
func (c *Client) Divide() goa.Endpoint
```
Divide returns an endpoint that makes HTTP requests to the divider service
divide server.




### <a name="Client.IntegerDivide">func</a> (\*Client) [IntegerDivide](/src/target/client.go?s=1499:1544#L60)
``` go
func (c *Client) IntegerDivide() goa.Endpoint
```
IntegerDivide returns an endpoint that makes HTTP requests to the divider
service integer_divide server.




## <a name="DivideDivByZeroResponseBody">type</a> [DivideDivByZeroResponseBody](/src/target/types.go?s=3484:4356#L71)
``` go
type DivideDivByZeroResponseBody struct {
    // Name is the name of this class of errors.
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID *string `form:"id,omitempty" json:"id,omitempty" xml:"id,omitempty"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message *string `form:"message,omitempty" json:"message,omitempty" xml:"message,omitempty"`
    // Is the error temporary?
    Temporary *bool `form:"temporary,omitempty" json:"temporary,omitempty" xml:"temporary,omitempty"`
    // Is the error a timeout?
    Timeout *bool `form:"timeout,omitempty" json:"timeout,omitempty" xml:"timeout,omitempty"`
    // Is the error a server-side fault?
    Fault *bool `form:"fault,omitempty" json:"fault,omitempty" xml:"fault,omitempty"`
}

```
DivideDivByZeroResponseBody is the type of the "divider" service "divide"
endpoint HTTP response body for the "div_by_zero" error.










### <a name="DivideDivByZeroResponseBody.Validate">func</a> (\*DivideDivByZeroResponseBody) [Validate](/src/target/types.go?s=9579:9642#L245)
``` go
func (body *DivideDivByZeroResponseBody) Validate() (err error)
```
Validate runs the validations defined on DivideDivByZeroResponseBody




## <a name="DivideTimeoutResponseBody">type</a> [DivideTimeoutResponseBody](/src/target/types.go?s=4489:5359#L89)
``` go
type DivideTimeoutResponseBody struct {
    // Name is the name of this class of errors.
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID *string `form:"id,omitempty" json:"id,omitempty" xml:"id,omitempty"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message *string `form:"message,omitempty" json:"message,omitempty" xml:"message,omitempty"`
    // Is the error temporary?
    Temporary *bool `form:"temporary,omitempty" json:"temporary,omitempty" xml:"temporary,omitempty"`
    // Is the error a timeout?
    Timeout *bool `form:"timeout,omitempty" json:"timeout,omitempty" xml:"timeout,omitempty"`
    // Is the error a server-side fault?
    Fault *bool `form:"fault,omitempty" json:"fault,omitempty" xml:"fault,omitempty"`
}

```
DivideTimeoutResponseBody is the type of the "divider" service "divide"
endpoint HTTP response body for the "timeout" error.










### <a name="DivideTimeoutResponseBody.Validate">func</a> (\*DivideTimeoutResponseBody) [Validate](/src/target/types.go?s=10310:10371#L268)
``` go
func (body *DivideTimeoutResponseBody) Validate() (err error)
```
Validate runs the validations defined on DivideTimeoutResponseBody




## <a name="IntegerDivideDivByZeroResponseBody">type</a> [IntegerDivideDivByZeroResponseBody](/src/target/types.go?s=1441:2320#L35)
``` go
type IntegerDivideDivByZeroResponseBody struct {
    // Name is the name of this class of errors.
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID *string `form:"id,omitempty" json:"id,omitempty" xml:"id,omitempty"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message *string `form:"message,omitempty" json:"message,omitempty" xml:"message,omitempty"`
    // Is the error temporary?
    Temporary *bool `form:"temporary,omitempty" json:"temporary,omitempty" xml:"temporary,omitempty"`
    // Is the error a timeout?
    Timeout *bool `form:"timeout,omitempty" json:"timeout,omitempty" xml:"timeout,omitempty"`
    // Is the error a server-side fault?
    Fault *bool `form:"fault,omitempty" json:"fault,omitempty" xml:"fault,omitempty"`
}

```
IntegerDivideDivByZeroResponseBody is the type of the "divider" service
"integer_divide" endpoint HTTP response body for the "div_by_zero" error.










### <a name="IntegerDivideDivByZeroResponseBody.Validate">func</a> (\*IntegerDivideDivByZeroResponseBody) [Validate](/src/target/types.go?s=8096:8166#L199)
``` go
func (body *IntegerDivideDivByZeroResponseBody) Validate() (err error)
```
Validate runs the validations defined on IntegerDivideDivByZeroResponseBody




## <a name="IntegerDivideHasRemainderResponseBody">type</a> [IntegerDivideHasRemainderResponseBody](/src/target/types.go?s=405:1287#L17)
``` go
type IntegerDivideHasRemainderResponseBody struct {
    // Name is the name of this class of errors.
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID *string `form:"id,omitempty" json:"id,omitempty" xml:"id,omitempty"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message *string `form:"message,omitempty" json:"message,omitempty" xml:"message,omitempty"`
    // Is the error temporary?
    Temporary *bool `form:"temporary,omitempty" json:"temporary,omitempty" xml:"temporary,omitempty"`
    // Is the error a timeout?
    Timeout *bool `form:"timeout,omitempty" json:"timeout,omitempty" xml:"timeout,omitempty"`
    // Is the error a server-side fault?
    Fault *bool `form:"fault,omitempty" json:"fault,omitempty" xml:"fault,omitempty"`
}

```
IntegerDivideHasRemainderResponseBody is the type of the "divider" service
"integer_divide" endpoint HTTP response body for the "has_remainder" error.










### <a name="IntegerDivideHasRemainderResponseBody.Validate">func</a> (\*IntegerDivideHasRemainderResponseBody) [Validate](/src/target/types.go?s=7346:7419#L176)
``` go
func (body *IntegerDivideHasRemainderResponseBody) Validate() (err error)
```
Validate runs the validations defined on
IntegerDivideHasRemainderResponseBody




## <a name="IntegerDivideTimeoutResponseBody">type</a> [IntegerDivideTimeoutResponseBody](/src/target/types.go?s=2468:3345#L53)
``` go
type IntegerDivideTimeoutResponseBody struct {
    // Name is the name of this class of errors.
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // ID is a unique identifier for this particular occurrence of the problem.
    ID *string `form:"id,omitempty" json:"id,omitempty" xml:"id,omitempty"`
    // Message is a human-readable explanation specific to this occurrence of the
    // problem.
    Message *string `form:"message,omitempty" json:"message,omitempty" xml:"message,omitempty"`
    // Is the error temporary?
    Temporary *bool `form:"temporary,omitempty" json:"temporary,omitempty" xml:"temporary,omitempty"`
    // Is the error a timeout?
    Timeout *bool `form:"timeout,omitempty" json:"timeout,omitempty" xml:"timeout,omitempty"`
    // Is the error a server-side fault?
    Fault *bool `form:"fault,omitempty" json:"fault,omitempty" xml:"fault,omitempty"`
}

```
IntegerDivideTimeoutResponseBody is the type of the "divider" service
"integer_divide" endpoint HTTP response body for the "timeout" error.










### <a name="IntegerDivideTimeoutResponseBody.Validate">func</a> (\*IntegerDivideTimeoutResponseBody) [Validate](/src/target/types.go?s=8841:8909#L222)
``` go
func (body *IntegerDivideTimeoutResponseBody) Validate() (err error)
```
Validate runs the validations defined on IntegerDivideTimeoutResponseBody








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
