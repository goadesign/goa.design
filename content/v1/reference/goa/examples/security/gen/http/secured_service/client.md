+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/security/gen/http/secured_service/client"
+++


# client
`import "github.com/goadesign/goa/examples/security/gen/http/secured_service/client"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func AlsoDoublySecureSecuredServicePath() string](#AlsoDoublySecureSecuredServicePath)
* [func BuildAlsoDoublySecurePayload(securedServiceAlsoDoublySecureKey string, securedServiceAlsoDoublySecureOauthToken string, securedServiceAlsoDoublySecureToken string, securedServiceAlsoDoublySecureUsername string, securedServiceAlsoDoublySecurePassword string) (*securedservice.AlsoDoublySecurePayload, error)](#BuildAlsoDoublySecurePayload)
* [func BuildDoublySecurePayload(securedServiceDoublySecureKey string, securedServiceDoublySecureToken string) (*securedservice.DoublySecurePayload, error)](#BuildDoublySecurePayload)
* [func BuildSecurePayload(securedServiceSecureFail string, securedServiceSecureToken string) (*securedservice.SecurePayload, error)](#BuildSecurePayload)
* [func BuildSigninPayload(securedServiceSigninUsername string, securedServiceSigninPassword string) (*securedservice.SigninPayload, error)](#BuildSigninPayload)
* [func DecodeAlsoDoublySecureResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeAlsoDoublySecureResponse)
* [func DecodeDoublySecureResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeDoublySecureResponse)
* [func DecodeSecureResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeSecureResponse)
* [func DecodeSigninResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeSigninResponse)
* [func DoublySecureSecuredServicePath() string](#DoublySecureSecuredServicePath)
* [func EncodeAlsoDoublySecureRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeAlsoDoublySecureRequest)
* [func EncodeDoublySecureRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeDoublySecureRequest)
* [func EncodeSecureRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeSecureRequest)
* [func EncodeSigninRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeSigninRequest)
* [func NewAlsoDoublySecureUnauthorized(body AlsoDoublySecureUnauthorizedResponseBody) securedservice.Unauthorized](#NewAlsoDoublySecureUnauthorized)
* [func NewDoublySecureUnauthorized(body DoublySecureUnauthorizedResponseBody) securedservice.Unauthorized](#NewDoublySecureUnauthorized)
* [func NewSecureUnauthorized(body SecureUnauthorizedResponseBody) securedservice.Unauthorized](#NewSecureUnauthorized)
* [func NewSigninUnauthorized(body SigninUnauthorizedResponseBody) securedservice.Unauthorized](#NewSigninUnauthorized)
* [func SecureSecuredServicePath() string](#SecureSecuredServicePath)
* [func SigninSecuredServicePath() string](#SigninSecuredServicePath)
* [type AlsoDoublySecureUnauthorizedResponseBody](#AlsoDoublySecureUnauthorizedResponseBody)
* [type Client](#Client)
  * [func NewClient(scheme string, host string, doer goahttp.Doer, enc func(*http.Request) goahttp.Encoder, dec func(*http.Response) goahttp.Decoder, restoreBody bool) *Client](#NewClient)
  * [func (c *Client) AlsoDoublySecure() goa.Endpoint](#Client.AlsoDoublySecure)
  * [func (c *Client) BuildAlsoDoublySecureRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildAlsoDoublySecureRequest)
  * [func (c *Client) BuildDoublySecureRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildDoublySecureRequest)
  * [func (c *Client) BuildSecureRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildSecureRequest)
  * [func (c *Client) BuildSigninRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildSigninRequest)
  * [func (c *Client) DoublySecure() goa.Endpoint](#Client.DoublySecure)
  * [func (c *Client) Secure() goa.Endpoint](#Client.Secure)
  * [func (c *Client) Signin() goa.Endpoint](#Client.Signin)
* [type DoublySecureUnauthorizedResponseBody](#DoublySecureUnauthorizedResponseBody)
* [type SecureUnauthorizedResponseBody](#SecureUnauthorizedResponseBody)
* [type SigninUnauthorizedResponseBody](#SigninUnauthorizedResponseBody)


#### <a name="pkg-files">Package files</a>
[cli.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/client/cli.go) [client.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/client/client.go) [encode_decode.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/client/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/client/paths.go) [types.go](/src/github.com/goadesign/goa/examples/security/gen/http/secured_service/client/types.go) 





## <a name="AlsoDoublySecureSecuredServicePath">func</a> [AlsoDoublySecureSecuredServicePath](/src/target/paths.go?s=893:941#L27)
``` go
func AlsoDoublySecureSecuredServicePath() string
```
AlsoDoublySecureSecuredServicePath returns the URL path to the secured_service service also_doubly_secure HTTP endpoint.



## <a name="BuildAlsoDoublySecurePayload">func</a> [BuildAlsoDoublySecurePayload](/src/target/cli.go?s=2274:2585#L90)
``` go
func BuildAlsoDoublySecurePayload(securedServiceAlsoDoublySecureKey string, securedServiceAlsoDoublySecureOauthToken string, securedServiceAlsoDoublySecureToken string, securedServiceAlsoDoublySecureUsername string, securedServiceAlsoDoublySecurePassword string) (*securedservice.AlsoDoublySecurePayload, error)
```
BuildAlsoDoublySecurePayload builds the payload for the secured_service
also_doubly_secure endpoint from CLI flags.



## <a name="BuildDoublySecurePayload">func</a> [BuildDoublySecurePayload](/src/target/cli.go?s=1663:1815#L68)
``` go
func BuildDoublySecurePayload(securedServiceDoublySecureKey string, securedServiceDoublySecureToken string) (*securedservice.DoublySecurePayload, error)
```
BuildDoublySecurePayload builds the payload for the secured_service
doubly_secure endpoint from CLI flags.



## <a name="BuildSecurePayload">func</a> [BuildSecurePayload](/src/target/cli.go?s=935:1064#L38)
``` go
func BuildSecurePayload(securedServiceSecureFail string, securedServiceSecureToken string) (*securedservice.SecurePayload, error)
```
BuildSecurePayload builds the payload for the secured_service secure
endpoint from CLI flags.



## <a name="BuildSigninPayload">func</a> [BuildSigninPayload](/src/target/cli.go?s=444:580#L20)
``` go
func BuildSigninPayload(securedServiceSigninUsername string, securedServiceSigninPassword string) (*securedservice.SigninPayload, error)
```
BuildSigninPayload builds the payload for the secured_service signin
endpoint from CLI flags.



## <a name="DecodeAlsoDoublySecureResponse">func</a> [DecodeAlsoDoublySecureResponse](/src/target/encode_decode.go?s=10576:10717#L320)
``` go
func DecodeAlsoDoublySecureResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeAlsoDoublySecureResponse returns a decoder for responses returned by
the secured_service also_doubly_secure endpoint. restoreBody controls
whether the response body should be restored after having been read.
DecodeAlsoDoublySecureResponse may return the following errors:


	- "unauthorized" (type securedservice.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="DecodeDoublySecureResponse">func</a> [DecodeDoublySecureResponse](/src/target/encode_decode.go?s=7394:7531#L224)
``` go
func DecodeDoublySecureResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeDoublySecureResponse returns a decoder for responses returned by the
secured_service doubly_secure endpoint. restoreBody controls whether the
response body should be restored after having been read.
DecodeDoublySecureResponse may return the following errors:


	- "unauthorized" (type securedservice.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="DecodeSecureResponse">func</a> [DecodeSecureResponse](/src/target/encode_decode.go?s=4492:4623#L137)
``` go
func DecodeSecureResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeSecureResponse returns a decoder for responses returned by the
secured_service secure endpoint. restoreBody controls whether the response
body should be restored after having been read.
DecodeSecureResponse may return the following errors:


	- "unauthorized" (type securedservice.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="DecodeSigninResponse">func</a> [DecodeSigninResponse](/src/target/encode_decode.go?s=1830:1961#L58)
``` go
func DecodeSigninResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeSigninResponse returns a decoder for responses returned by the
secured_service signin endpoint. restoreBody controls whether the response
body should be restored after having been read.
DecodeSigninResponse may return the following errors:


	- "unauthorized" (type securedservice.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="DoublySecureSecuredServicePath">func</a> [DoublySecureSecuredServicePath](/src/target/paths.go?s=701:745#L22)
``` go
func DoublySecureSecuredServicePath() string
```
DoublySecureSecuredServicePath returns the URL path to the secured_service service doubly_secure HTTP endpoint.



## <a name="EncodeAlsoDoublySecureRequest">func</a> [EncodeAlsoDoublySecureRequest](/src/target/encode_decode.go?s=9316:9434#L284)
``` go
func EncodeAlsoDoublySecureRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeAlsoDoublySecureRequest returns an encoder for requests sent to the
secured_service also_doubly_secure server.



## <a name="EncodeDoublySecureRequest">func</a> [EncodeDoublySecureRequest](/src/target/encode_decode.go?s=6340:6454#L196)
``` go
func EncodeDoublySecureRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeDoublySecureRequest returns an encoder for requests sent to the
secured_service doubly_secure server.



## <a name="EncodeSecureRequest">func</a> [EncodeSecureRequest](/src/target/encode_decode.go?s=3458:3566#L109)
``` go
func EncodeSecureRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeSecureRequest returns an encoder for requests sent to the
secured_service secure server.



## <a name="EncodeSigninRequest">func</a> [EncodeSigninRequest](/src/target/encode_decode.go?s=1079:1187#L41)
``` go
func EncodeSigninRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeSigninRequest returns an encoder for requests sent to the
secured_service signin server.



## <a name="NewAlsoDoublySecureUnauthorized">func</a> [NewAlsoDoublySecureUnauthorized](/src/target/types.go?s=2016:2127#L56)
``` go
func NewAlsoDoublySecureUnauthorized(body AlsoDoublySecureUnauthorizedResponseBody) securedservice.Unauthorized
```
NewAlsoDoublySecureUnauthorized builds a secured_service service
also_doubly_secure endpoint unauthorized error.



## <a name="NewDoublySecureUnauthorized">func</a> [NewDoublySecureUnauthorized](/src/target/types.go?s=1738:1841#L49)
``` go
func NewDoublySecureUnauthorized(body DoublySecureUnauthorizedResponseBody) securedservice.Unauthorized
```
NewDoublySecureUnauthorized builds a secured_service service doubly_secure
endpoint unauthorized error.



## <a name="NewSecureUnauthorized">func</a> [NewSecureUnauthorized](/src/target/types.go?s=1481:1572#L42)
``` go
func NewSecureUnauthorized(body SecureUnauthorizedResponseBody) securedservice.Unauthorized
```
NewSecureUnauthorized builds a secured_service service secure endpoint
unauthorized error.



## <a name="NewSigninUnauthorized">func</a> [NewSigninUnauthorized](/src/target/types.go?s=1237:1328#L35)
``` go
func NewSigninUnauthorized(body SigninUnauthorizedResponseBody) securedservice.Unauthorized
```
NewSigninUnauthorized builds a secured_service service signin endpoint
unauthorized error.



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










## <a name="Client">type</a> [Client](/src/target/client.go?s=388:1164#L20)
``` go
type Client struct {
    // Signin Doer is the HTTP client used to make requests to the signin endpoint.
    SigninDoer goahttp.Doer

    // Secure Doer is the HTTP client used to make requests to the secure endpoint.
    SecureDoer goahttp.Doer

    // DoublySecure Doer is the HTTP client used to make requests to the
    // doubly_secure endpoint.
    DoublySecureDoer goahttp.Doer

    // AlsoDoublySecure Doer is the HTTP client used to make requests to the
    // also_doubly_secure endpoint.
    AlsoDoublySecureDoer goahttp.Doer

    // RestoreResponseBody controls whether the response bodies are reset after
    // decoding so they can be read again.
    RestoreResponseBody bool
    // contains filtered or unexported fields
}

```
Client lists the secured_service service endpoint HTTP clients.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=1253:1432#L47)
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
NewClient instantiates HTTP clients for all the secured_service service
servers.





### <a name="Client.AlsoDoublySecure">func</a> (\*Client) [AlsoDoublySecure](/src/target/client.go?s=3933:3981#L145)
``` go
func (c *Client) AlsoDoublySecure() goa.Endpoint
```
AlsoDoublySecure returns an endpoint that makes HTTP requests to the
secured_service service also_doubly_secure server.




### <a name="Client.BuildAlsoDoublySecureRequest">func</a> (\*Client) [BuildAlsoDoublySecureRequest](/src/target/encode_decode.go?s=8757:8861#L269)
``` go
func (c *Client) BuildAlsoDoublySecureRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildAlsoDoublySecureRequest instantiates a HTTP request object with method
and path set to call the "secured_service" service "also_doubly_secure"
endpoint




### <a name="Client.BuildDoublySecureRequest">func</a> (\*Client) [BuildDoublySecureRequest](/src/target/encode_decode.go?s=5804:5904#L181)
``` go
func (c *Client) BuildDoublySecureRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildDoublySecureRequest instantiates a HTTP request object with method and
path set to call the "secured_service" service "doubly_secure" endpoint




### <a name="Client.BuildSecureRequest">func</a> (\*Client) [BuildSecureRequest](/src/target/encode_decode.go?s=2954:3048#L94)
``` go
func (c *Client) BuildSecureRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildSecureRequest instantiates a HTTP request object with method and path
set to call the "secured_service" service "secure" endpoint




### <a name="Client.BuildSigninRequest">func</a> (\*Client) [BuildSigninRequest](/src/target/encode_decode.go?s=574:668#L26)
``` go
func (c *Client) BuildSigninRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildSigninRequest instantiates a HTTP request object with method and path
set to call the "secured_service" service "signin" endpoint




### <a name="Client.DoublySecure">func</a> (\*Client) [DoublySecure](/src/target/client.go?s=3200:3244#L120)
``` go
func (c *Client) DoublySecure() goa.Endpoint
```
DoublySecure returns an endpoint that makes HTTP requests to the
secured_service service doubly_secure server.




### <a name="Client.Secure">func</a> (\*Client) [Secure](/src/target/client.go?s=2513:2551#L95)
``` go
func (c *Client) Secure() goa.Endpoint
```
Secure returns an endpoint that makes HTTP requests to the secured_service
service secure server.




### <a name="Client.Signin">func</a> (\*Client) [Signin](/src/target/client.go?s=1839:1877#L70)
``` go
func (c *Client) Signin() goa.Endpoint
```
Signin returns an endpoint that makes HTTP requests to the secured_service
service signin server.




## <a name="DoublySecureUnauthorizedResponseBody">type</a> [DoublySecureUnauthorizedResponseBody](/src/target/types.go?s=862:910#L26)
``` go
type DoublySecureUnauthorizedResponseBody string
```
DoublySecureUnauthorizedResponseBody is the type of the "secured_service"
service "doubly_secure" endpoint HTTP response body for the "unauthorized"
error.










## <a name="SecureUnauthorizedResponseBody">type</a> [SecureUnauthorizedResponseBody](/src/target/types.go?s=653:695#L21)
``` go
type SecureUnauthorizedResponseBody string
```
SecureUnauthorizedResponseBody is the type of the "secured_service" service
"secure" endpoint HTTP response body for the "unauthorized" error.










## <a name="SigninUnauthorizedResponseBody">type</a> [SigninUnauthorizedResponseBody](/src/target/types.go?s=460:502#L17)
``` go
type SigninUnauthorizedResponseBody string
```
SigninUnauthorizedResponseBody is the type of the "secured_service" service
"signin" endpoint HTTP response body for the "unauthorized" error.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
