+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/error/gen/divider"
+++


# dividersvc
`import "github.com/goadesign/goa/examples/error/gen/divider"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func MakeDivByZero(err error) *goa.ServiceError](#MakeDivByZero)
* [func MakeHasRemainder(err error) *goa.ServiceError](#MakeHasRemainder)
* [func MakeTimeout(err error) *goa.ServiceError](#MakeTimeout)
* [func NewDivideEndpoint(s Service) goa.Endpoint](#NewDivideEndpoint)
* [func NewIntegerDivideEndpoint(s Service) goa.Endpoint](#NewIntegerDivideEndpoint)
* [type Client](#Client)
  * [func NewClient(integerDivide, divide goa.Endpoint) *Client](#NewClient)
  * [func (c *Client) Divide(ctx context.Context, p *FloatOperands) (res float64, err error)](#Client.Divide)
  * [func (c *Client) IntegerDivide(ctx context.Context, p *IntOperands) (res int, err error)](#Client.IntegerDivide)
* [type Endpoints](#Endpoints)
  * [func NewEndpoints(s Service) *Endpoints](#NewEndpoints)
  * [func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)](#Endpoints.Use)
* [type FloatOperands](#FloatOperands)
* [type IntOperands](#IntOperands)
* [type Service](#Service)


#### <a name="pkg-files">Package files</a>
[client.go](/src/github.com/goadesign/goa/examples/error/gen/divider/client.go) [endpoints.go](/src/github.com/goadesign/goa/examples/error/gen/divider/endpoints.go) [service.go](/src/github.com/goadesign/goa/examples/error/gen/divider/service.go) 


## <a name="pkg-constants">Constants</a>
``` go
const ServiceName = "divider"
```
ServiceName is the name of the service as defined in the design. This is the
same value that is set in the endpoint request contexts under the ServiceKey
key.


## <a name="pkg-variables">Variables</a>
``` go
var MethodNames = [2]string{"integer_divide", "divide"}
```
MethodNames lists the service method names as defined in the design. These
are the same values that are set in the endpoint request contexts under the
MethodKey key.



## <a name="MakeDivByZero">func</a> [MakeDivByZero](/src/target/service.go?s=1342:1389#L52)
``` go
func MakeDivByZero(err error) *goa.ServiceError
```
MakeDivByZero builds a goa.ServiceError from an error.



## <a name="MakeHasRemainder">func</a> [MakeHasRemainder](/src/target/service.go?s=1821:1871#L72)
``` go
func MakeHasRemainder(err error) *goa.ServiceError
```
MakeHasRemainder builds a goa.ServiceError from an error.



## <a name="MakeTimeout">func</a> [MakeTimeout](/src/target/service.go?s=1560:1605#L61)
``` go
func MakeTimeout(err error) *goa.ServiceError
```
MakeTimeout builds a goa.ServiceError from an error.



## <a name="NewDivideEndpoint">func</a> [NewDivideEndpoint](/src/target/endpoints.go?s=1243:1289#L48)
``` go
func NewDivideEndpoint(s Service) goa.Endpoint
```
NewDivideEndpoint returns an endpoint function that calls the method
"divide" of service "divider".



## <a name="NewIntegerDivideEndpoint">func</a> [NewIntegerDivideEndpoint](/src/target/endpoints.go?s=942:995#L39)
``` go
func NewIntegerDivideEndpoint(s Service) goa.Endpoint
```
NewIntegerDivideEndpoint returns an endpoint function that calls the method
"integer_divide" of service "divider".




## <a name="Client">type</a> [Client](/src/target/client.go?s=296:390#L18)
``` go
type Client struct {
    IntegerDivideEndpoint goa.Endpoint
    DivideEndpoint        goa.Endpoint
}

```
Client is the "divider" service client.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=465:523#L24)
``` go
func NewClient(integerDivide, divide goa.Endpoint) *Client
```
NewClient initializes a "divider" service client given the endpoints.





### <a name="Client.Divide">func</a> (\*Client) [Divide](/src/target/client.go?s=1134:1221#L45)
``` go
func (c *Client) Divide(ctx context.Context, p *FloatOperands) (res float64, err error)
```
Divide calls the "divide" endpoint of the "divider" service.




### <a name="Client.IntegerDivide">func</a> (\*Client) [IntegerDivide](/src/target/client.go?s=856:944#L35)
``` go
func (c *Client) IntegerDivide(ctx context.Context, p *IntOperands) (res int, err error)
```
IntegerDivide calls the "integer_divide" endpoint of the "divider" service.
IntegerDivide may return the following errors:


	- "has_remainder" (type *goa.ServiceError): integer division has remainder
	- error: internal error




## <a name="Endpoints">type</a> [Endpoints](/src/target/endpoints.go?s=308:389#L18)
``` go
type Endpoints struct {
    IntegerDivide goa.Endpoint
    Divide        goa.Endpoint
}

```
Endpoints wraps the "divider" service endpoints.







### <a name="NewEndpoints">func</a> [NewEndpoints](/src/target/endpoints.go?s=466:505#L24)
``` go
func NewEndpoints(s Service) *Endpoints
```
NewEndpoints wraps the methods of the "divider" service with endpoints.





### <a name="Endpoints.Use">func</a> (\*Endpoints) [Use](/src/target/endpoints.go?s=695:753#L32)
``` go
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)
```
Use applies the given middleware to all the "divider" service endpoints.




## <a name="FloatOperands">type</a> [FloatOperands](/src/target/service.go?s=1196:1282#L44)
``` go
type FloatOperands struct {
    // Left operand
    A float64
    // Right operand
    B float64
}

```
FloatOperands is the payload type of the divider service divide method.










## <a name="IntOperands">type</a> [IntOperands](/src/target/service.go?s=1043:1119#L36)
``` go
type IntOperands struct {
    // Left operand
    A int
    // Right operand
    B int
}

```
IntOperands is the payload type of the divider service integer_divide method.










## <a name="Service">type</a> [Service](/src/target/service.go?s=295:529#L18)
``` go
type Service interface {
    // IntegerDivide implements integer_divide.
    IntegerDivide(context.Context, *IntOperands) (res int, err error)
    // Divide implements divide.
    Divide(context.Context, *FloatOperands) (res float64, err error)
}
```
Service is the divider service interface.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
