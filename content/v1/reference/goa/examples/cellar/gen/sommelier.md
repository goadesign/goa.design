+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar/gen/sommelier"
+++


# sommelier
`import "github.com/goadesign/goa/examples/cellar/gen/sommelier"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func NewPickEndpoint(s Service) goa.Endpoint](#NewPickEndpoint)
* [func NewViewedStoredBottleCollection(res StoredBottleCollection, view string) sommelierviews.StoredBottleCollection](#NewViewedStoredBottleCollection)
* [type Client](#Client)
  * [func NewClient(pick goa.Endpoint) *Client](#NewClient)
  * [func (c *Client) Pick(ctx context.Context, p *Criteria) (res StoredBottleCollection, err error)](#Client.Pick)
* [type Component](#Component)
* [type Criteria](#Criteria)
* [type Endpoints](#Endpoints)
  * [func NewEndpoints(s Service) *Endpoints](#NewEndpoints)
  * [func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)](#Endpoints.Use)
* [type NoCriteria](#NoCriteria)
  * [func (e NoCriteria) Error() string](#NoCriteria.Error)
  * [func (e NoCriteria) ErrorName() string](#NoCriteria.ErrorName)
* [type NoMatch](#NoMatch)
  * [func (e NoMatch) Error() string](#NoMatch.Error)
  * [func (e NoMatch) ErrorName() string](#NoMatch.ErrorName)
* [type Service](#Service)
* [type StoredBottle](#StoredBottle)
* [type StoredBottleCollection](#StoredBottleCollection)
  * [func NewStoredBottleCollection(vres sommelierviews.StoredBottleCollection) StoredBottleCollection](#NewStoredBottleCollection)
* [type Winery](#Winery)


#### <a name="pkg-files">Package files</a>
[client.go](/src/github.com/goadesign/goa/examples/cellar/gen/sommelier/client.go) [endpoints.go](/src/github.com/goadesign/goa/examples/cellar/gen/sommelier/endpoints.go) [service.go](/src/github.com/goadesign/goa/examples/cellar/gen/sommelier/service.go) 


## <a name="pkg-constants">Constants</a>
``` go
const ServiceName = "sommelier"
```
ServiceName is the name of the service as defined in the design. This is the
same value that is set in the endpoint request contexts under the ServiceKey
key.


## <a name="pkg-variables">Variables</a>
``` go
var MethodNames = [1]string{"pick"}
```
MethodNames lists the service method names as defined in the design. These
are the same values that are set in the endpoint request contexts under the
MethodKey key.



## <a name="NewPickEndpoint">func</a> [NewPickEndpoint](/src/target/endpoints.go?s=798:842#L36)
``` go
func NewPickEndpoint(s Service) goa.Endpoint
```
NewPickEndpoint returns an endpoint function that calls the method "pick" of
service "sommelier".



## <a name="NewViewedStoredBottleCollection">func</a> [NewViewedStoredBottleCollection](/src/target/service.go?s=3155:3270#L125)
``` go
func NewViewedStoredBottleCollection(res StoredBottleCollection, view string) sommelierviews.StoredBottleCollection
```
NewViewedStoredBottleCollection initializes viewed result type
StoredBottleCollection from result type StoredBottleCollection using the
given view.




## <a name="Client">type</a> [Client](/src/target/client.go?s=301:350#L18)
``` go
type Client struct {
    PickEndpoint goa.Endpoint
}

```
Client is the "sommelier" service client.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=427:468#L23)
``` go
func NewClient(pick goa.Endpoint) *Client
```
NewClient initializes a "sommelier" service client given the endpoints.





### <a name="Client.Pick">func</a> (\*Client) [Pick](/src/target/client.go?s=714:809#L34)
``` go
func (c *Client) Pick(ctx context.Context, p *Criteria) (res StoredBottleCollection, err error)
```
Pick calls the "pick" endpoint of the "sommelier" service.
Pick may return the following errors:


	- "no_criteria" (type NoCriteria)
	- "no_match" (type NoMatch)
	- error: internal error




## <a name="Component">type</a> [Component](/src/target/service.go?s=1923:2039#L76)
``` go
type Component struct {
    // Grape varietal
    Varietal string
    // Percentage of varietal in wine
    Percentage *uint32
}

```









## <a name="Criteria">type</a> [Criteria](/src/target/service.go?s=983:1146#L34)
``` go
type Criteria struct {
    // Name of bottle to pick
    Name *string
    // Varietals in preference order
    Varietal []string
    // Winery of bottle to pick
    Winery *string
}

```
Criteria is the payload type of the sommelier service pick method.










## <a name="Endpoints">type</a> [Endpoints](/src/target/endpoints.go?s=313:357#L18)
``` go
type Endpoints struct {
    Pick goa.Endpoint
}

```
Endpoints wraps the "sommelier" service endpoints.







### <a name="NewEndpoints">func</a> [NewEndpoints](/src/target/endpoints.go?s=436:475#L23)
``` go
func NewEndpoints(s Service) *Endpoints
```
NewEndpoints wraps the methods of the "sommelier" service with endpoints.





### <a name="Endpoints.Use">func</a> (\*Endpoints) [Use](/src/target/endpoints.go?s=610:668#L30)
``` go
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)
```
Use applies the given middleware to all the "sommelier" service endpoints.




## <a name="NoCriteria">type</a> [NoCriteria](/src/target/service.go?s=2061:2083#L84)
``` go
type NoCriteria string
```
Missing criteria










### <a name="NoCriteria.Error">func</a> (NoCriteria) [Error](/src/target/service.go?s=2181:2215#L90)
``` go
func (e NoCriteria) Error() string
```
Error returns an error description.




### <a name="NoCriteria.ErrorName">func</a> (NoCriteria) [ErrorName](/src/target/service.go?s=2284:2322#L95)
``` go
func (e NoCriteria) ErrorName() string
```
ErrorName returns "no_criteria".




## <a name="NoMatch">type</a> [NoMatch](/src/target/service.go?s=2121:2140#L87)
``` go
type NoMatch string
```
No bottle matched given criteria










### <a name="NoMatch.Error">func</a> (NoMatch) [Error](/src/target/service.go?s=2389:2420#L100)
``` go
func (e NoMatch) Error() string
```
Error returns an error description.




### <a name="NoMatch.ErrorName">func</a> (NoMatch) [ErrorName](/src/target/service.go?s=2502:2537#L105)
``` go
func (e NoMatch) ErrorName() string
```
ErrorName returns "no_match".




## <a name="Service">type</a> [Service](/src/target/service.go?s=372:498#L18)
``` go
type Service interface {
    // Pick implements pick.
    Pick(context.Context, *Criteria) (res StoredBottleCollection, err error)
}
```
The sommelier service retrieves bottles given a set of criteria.










## <a name="StoredBottle">type</a> [StoredBottle](/src/target/service.go?s=1350:1755#L48)
``` go
type StoredBottle struct {
    // ID is the unique id of the bottle.
    ID string
    // Name of bottle
    Name string
    // Winery that produces wine
    Winery *Winery
    // Vintage of bottle
    Vintage uint32
    // Composition is the list of grape varietals and associated percentage.
    Composition []*Component
    // Description of bottle
    Description *string
    // Rating of bottle from 1 (worst) to 5 (best)
    Rating *uint32
}

```
A StoredBottle describes a bottle retrieved by the storage service.










## <a name="StoredBottleCollection">type</a> [StoredBottleCollection](/src/target/service.go?s=1234:1277#L45)
``` go
type StoredBottleCollection []*StoredBottle
```
StoredBottleCollection is the result type of the sommelier service pick
method.







### <a name="NewStoredBottleCollection">func</a> [NewStoredBottleCollection](/src/target/service.go?s=2689:2786#L111)
``` go
func NewStoredBottleCollection(vres sommelierviews.StoredBottleCollection) StoredBottleCollection
```
NewStoredBottleCollection initializes result type StoredBottleCollection
from viewed result type StoredBottleCollection.





## <a name="Winery">type</a> [Winery](/src/target/service.go?s=1757:1921#L65)
``` go
type Winery struct {
    // Name of winery
    Name string
    // Region of winery
    Region string
    // Country of winery
    Country string
    // Winery website URL
    URL *string
}

```













- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
