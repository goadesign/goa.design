+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/security/gen/secured_service"
+++


# securedservice
`import "github.com/goadesign/goa/examples/security/gen/secured_service"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func NewAlsoDoublySecureEndpoint(s Service, authJWTFn security.AuthJWTFunc, authAPIKeyFn security.AuthAPIKeyFunc, authOAuth2Fn security.AuthOAuth2Func, authBasicFn security.AuthBasicFunc) goa.Endpoint](#NewAlsoDoublySecureEndpoint)
* [func NewDoublySecureEndpoint(s Service, authJWTFn security.AuthJWTFunc, authAPIKeyFn security.AuthAPIKeyFunc) goa.Endpoint](#NewDoublySecureEndpoint)
* [func NewSecureEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint](#NewSecureEndpoint)
* [func NewSigninEndpoint(s Service, authBasicFn security.AuthBasicFunc) goa.Endpoint](#NewSigninEndpoint)
* [type AlsoDoublySecurePayload](#AlsoDoublySecurePayload)
* [type Client](#Client)
  * [func NewClient(signin, secure, doublySecure, alsoDoublySecure goa.Endpoint) *Client](#NewClient)
  * [func (c *Client) AlsoDoublySecure(ctx context.Context, p *AlsoDoublySecurePayload) (res string, err error)](#Client.AlsoDoublySecure)
  * [func (c *Client) DoublySecure(ctx context.Context, p *DoublySecurePayload) (res string, err error)](#Client.DoublySecure)
  * [func (c *Client) Secure(ctx context.Context, p *SecurePayload) (res string, err error)](#Client.Secure)
  * [func (c *Client) Signin(ctx context.Context, p *SigninPayload) (err error)](#Client.Signin)
* [type DoublySecurePayload](#DoublySecurePayload)
* [type Endpoints](#Endpoints)
  * [func NewEndpoints(s Service, authBasicFn security.AuthBasicFunc, authJWTFn security.AuthJWTFunc, authAPIKeyFn security.AuthAPIKeyFunc, authOAuth2Fn security.AuthOAuth2Func) *Endpoints](#NewEndpoints)
  * [func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)](#Endpoints.Use)
* [type SecurePayload](#SecurePayload)
* [type Service](#Service)
* [type SigninPayload](#SigninPayload)
* [type Unauthorized](#Unauthorized)
  * [func (e Unauthorized) Error() string](#Unauthorized.Error)
  * [func (e Unauthorized) ErrorName() string](#Unauthorized.ErrorName)


#### <a name="pkg-files">Package files</a>
[client.go](/src/github.com/goadesign/goa/examples/security/gen/secured_service/client.go) [endpoints.go](/src/github.com/goadesign/goa/examples/security/gen/secured_service/endpoints.go) [service.go](/src/github.com/goadesign/goa/examples/security/gen/secured_service/service.go) 


## <a name="pkg-constants">Constants</a>
``` go
const ServiceName = "secured_service"
```
ServiceName is the name of the service as defined in the design. This is the
same value that is set in the endpoint request contexts under the ServiceKey
key.


## <a name="pkg-variables">Variables</a>
``` go
var MethodNames = [4]string{"signin", "secure", "doubly_secure", "also_doubly_secure"}
```
MethodNames lists the service method names as defined in the design. These
are the same values that are set in the endpoint request contexts under the
MethodKey key.



## <a name="NewAlsoDoublySecureEndpoint">func</a> [NewAlsoDoublySecureEndpoint](/src/target/endpoints.go?s=3569:3769#L121)
``` go
func NewAlsoDoublySecureEndpoint(s Service, authJWTFn security.AuthJWTFunc, authAPIKeyFn security.AuthAPIKeyFunc, authOAuth2Fn security.AuthOAuth2Func, authBasicFn security.AuthBasicFunc) goa.Endpoint
```
NewAlsoDoublySecureEndpoint returns an endpoint function that calls the
method "also_doubly_secure" of service "secured_service".



## <a name="NewDoublySecureEndpoint">func</a> [NewDoublySecureEndpoint](/src/target/endpoints.go?s=2651:2773#L88)
``` go
func NewDoublySecureEndpoint(s Service, authJWTFn security.AuthJWTFunc, authAPIKeyFn security.AuthAPIKeyFunc) goa.Endpoint
```
NewDoublySecureEndpoint returns an endpoint function that calls the method
"doubly_secure" of service "secured_service".



## <a name="NewSecureEndpoint">func</a> [NewSecureEndpoint](/src/target/endpoints.go?s=1994:2072#L65)
``` go
func NewSecureEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint
```
NewSecureEndpoint returns an endpoint function that calls the method
"secure" of service "secured_service".



## <a name="NewSigninEndpoint">func</a> [NewSigninEndpoint](/src/target/endpoints.go?s=1488:1570#L48)
``` go
func NewSigninEndpoint(s Service, authBasicFn security.AuthBasicFunc) goa.Endpoint
```
NewSigninEndpoint returns an endpoint function that calls the method
"signin" of service "secured_service".




## <a name="AlsoDoublySecurePayload">type</a> [AlsoDoublySecurePayload](/src/target/service.go?s=2113:2357#L68)
``` go
type AlsoDoublySecurePayload struct {
    // Username used to perform signin
    Username *string
    // Password used to perform signin
    Password *string
    // API key
    Key *string
    // JWT used for authentication
    Token      *string
    OauthToken *string
}

```
AlsoDoublySecurePayload is the payload type of the secured_service service
also_doubly_secure method.










## <a name="Client">type</a> [Client](/src/target/client.go?s=322:500#L18)
``` go
type Client struct {
    SigninEndpoint           goa.Endpoint
    SecureEndpoint           goa.Endpoint
    DoublySecureEndpoint     goa.Endpoint
    AlsoDoublySecureEndpoint goa.Endpoint
}

```
Client is the "secured_service" service client.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=583:666#L26)
``` go
func NewClient(signin, secure, doublySecure, alsoDoublySecure goa.Endpoint) *Client
```
NewClient initializes a "secured_service" service client given the endpoints.





### <a name="Client.AlsoDoublySecure">func</a> (\*Client) [AlsoDoublySecure](/src/target/client.go?s=1738:1844#L64)
``` go
func (c *Client) AlsoDoublySecure(ctx context.Context, p *AlsoDoublySecurePayload) (res string, err error)
```
AlsoDoublySecure calls the "also_doubly_secure" endpoint of the
"secured_service" service.




### <a name="Client.DoublySecure">func</a> (\*Client) [DoublySecure](/src/target/client.go?s=1415:1513#L53)
``` go
func (c *Client) DoublySecure(ctx context.Context, p *DoublySecurePayload) (res string, err error)
```
DoublySecure calls the "doubly_secure" endpoint of the "secured_service"
service.




### <a name="Client.Secure">func</a> (\*Client) [Secure](/src/target/client.go?s=1119:1205#L42)
``` go
func (c *Client) Secure(ctx context.Context, p *SecurePayload) (res string, err error)
```
Secure calls the "secure" endpoint of the "secured_service" service.




### <a name="Client.Signin">func</a> (\*Client) [Signin](/src/target/client.go?s=924:998#L36)
``` go
func (c *Client) Signin(ctx context.Context, p *SigninPayload) (err error)
```
Signin calls the "signin" endpoint of the "secured_service" service.




## <a name="DoublySecurePayload">type</a> [DoublySecurePayload](/src/target/service.go?s=1896:2003#L59)
``` go
type DoublySecurePayload struct {
    // API key
    Key *string
    // JWT used for authentication
    Token *string
}

```
DoublySecurePayload is the payload type of the secured_service service
doubly_secure method.










## <a name="Endpoints">type</a> [Endpoints](/src/target/endpoints.go?s=361:510#L19)
``` go
type Endpoints struct {
    Signin           goa.Endpoint
    Secure           goa.Endpoint
    DoublySecure     goa.Endpoint
    AlsoDoublySecure goa.Endpoint
}

```
Endpoints wraps the "secured_service" service endpoints.







### <a name="NewEndpoints">func</a> [NewEndpoints](/src/target/endpoints.go?s=598:781#L28)
``` go
func NewEndpoints(s Service, authBasicFn security.AuthBasicFunc, authJWTFn security.AuthJWTFunc, authAPIKeyFn security.AuthAPIKeyFunc, authOAuth2Fn security.AuthOAuth2Func) *Endpoints
```
NewEndpoints wraps the methods of the "secured_service" service with
endpoints.





### <a name="Endpoints.Use">func</a> (\*Endpoints) [Use](/src/target/endpoints.go?s=1182:1240#L39)
``` go
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)
```
Use applies the given middleware to all the "secured_service" service
endpoints.




## <a name="SecurePayload">type</a> [SecurePayload](/src/target/service.go?s=1651:1795#L50)
``` go
type SecurePayload struct {
    // Whether to force auth failure even with a valid JWT
    Fail *bool
    // JWT used for authentication
    Token *string
}

```
SecurePayload is the payload type of the secured_service service secure
method.










## <a name="Service">type</a> [Service](/src/target/service.go?s=339:898#L17)
``` go
type Service interface {
    // Creates a valid JWT
    Signin(context.Context, *SigninPayload) (err error)
    // This action is secured with the jwt scheme
    Secure(context.Context, *SecurePayload) (res string, err error)
    // This action is secured with the jwt scheme and also requires an API key
    // query string.
    DoublySecure(context.Context, *DoublySecurePayload) (res string, err error)
    // This action is secured with the jwt scheme and also requires an API key
    // header.
    AlsoDoublySecure(context.Context, *AlsoDoublySecurePayload) (res string, err error)
}
```
The secured service exposes endpoints that require valid authorization
credentials.










## <a name="SigninPayload">type</a> [SigninPayload](/src/target/service.go?s=1428:1563#L41)
``` go
type SigninPayload struct {
    // Username used to perform signin
    Username string
    // Password used to perform signin
    Password string
}

```
Credentials used to authenticate to retrieve JWT token










## <a name="Unauthorized">type</a> [Unauthorized](/src/target/service.go?s=2386:2410#L81)
``` go
type Unauthorized string
```
Credentials are invalid










### <a name="Unauthorized.Error">func</a> (Unauthorized) [Error](/src/target/service.go?s=2451:2487#L84)
``` go
func (e Unauthorized) Error() string
```
Error returns an error description.




### <a name="Unauthorized.ErrorName">func</a> (Unauthorized) [ErrorName](/src/target/service.go?s=2564:2604#L89)
``` go
func (e Unauthorized) ErrorName() string
```
ErrorName returns "unauthorized".








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
