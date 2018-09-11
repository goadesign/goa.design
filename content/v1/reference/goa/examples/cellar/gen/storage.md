+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar/gen/storage"
+++


# storage
`import "github.com/goadesign/goa/examples/cellar/gen/storage"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func NewAddEndpoint(s Service) goa.Endpoint](#NewAddEndpoint)
* [func NewListEndpoint(s Service) goa.Endpoint](#NewListEndpoint)
* [func NewMultiAddEndpoint(s Service) goa.Endpoint](#NewMultiAddEndpoint)
* [func NewMultiUpdateEndpoint(s Service) goa.Endpoint](#NewMultiUpdateEndpoint)
* [func NewRateEndpoint(s Service) goa.Endpoint](#NewRateEndpoint)
* [func NewRemoveEndpoint(s Service) goa.Endpoint](#NewRemoveEndpoint)
* [func NewShowEndpoint(s Service) goa.Endpoint](#NewShowEndpoint)
* [func NewViewedStoredBottle(res *StoredBottle, view string) *storageviews.StoredBottle](#NewViewedStoredBottle)
* [func NewViewedStoredBottleCollection(res StoredBottleCollection, view string) storageviews.StoredBottleCollection](#NewViewedStoredBottleCollection)
* [type Bottle](#Bottle)
* [type Client](#Client)
  * [func NewClient(list, show, add, remove, rate, multiAdd, multiUpdate goa.Endpoint) *Client](#NewClient)
  * [func (c *Client) Add(ctx context.Context, p *Bottle) (res string, err error)](#Client.Add)
  * [func (c *Client) List(ctx context.Context) (res StoredBottleCollection, err error)](#Client.List)
  * [func (c *Client) MultiAdd(ctx context.Context, p []*Bottle) (res []string, err error)](#Client.MultiAdd)
  * [func (c *Client) MultiUpdate(ctx context.Context, p *MultiUpdatePayload) (err error)](#Client.MultiUpdate)
  * [func (c *Client) Rate(ctx context.Context, p map[uint32][]string) (err error)](#Client.Rate)
  * [func (c *Client) Remove(ctx context.Context, p *RemovePayload) (err error)](#Client.Remove)
  * [func (c *Client) Show(ctx context.Context, p *ShowPayload) (res *StoredBottle, err error)](#Client.Show)
* [type Component](#Component)
* [type Endpoints](#Endpoints)
  * [func NewEndpoints(s Service) *Endpoints](#NewEndpoints)
  * [func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)](#Endpoints.Use)
* [type MultiUpdatePayload](#MultiUpdatePayload)
* [type NotFound](#NotFound)
  * [func (e *NotFound) Error() string](#NotFound.Error)
  * [func (e *NotFound) ErrorName() string](#NotFound.ErrorName)
* [type RemovePayload](#RemovePayload)
* [type Service](#Service)
* [type ShowPayload](#ShowPayload)
* [type StoredBottle](#StoredBottle)
  * [func NewStoredBottle(vres *storageviews.StoredBottle) *StoredBottle](#NewStoredBottle)
* [type StoredBottleCollection](#StoredBottleCollection)
  * [func NewStoredBottleCollection(vres storageviews.StoredBottleCollection) StoredBottleCollection](#NewStoredBottleCollection)
* [type Winery](#Winery)


#### <a name="pkg-files">Package files</a>
[client.go](/src/github.com/goadesign/goa/examples/cellar/gen/storage/client.go) [endpoints.go](/src/github.com/goadesign/goa/examples/cellar/gen/storage/endpoints.go) [service.go](/src/github.com/goadesign/goa/examples/cellar/gen/storage/service.go) 


## <a name="pkg-constants">Constants</a>
``` go
const ServiceName = "storage"
```
ServiceName is the name of the service as defined in the design. This is the
same value that is set in the endpoint request contexts under the ServiceKey
key.


## <a name="pkg-variables">Variables</a>
``` go
var MethodNames = [7]string{"list", "show", "add", "remove", "rate", "multi_add", "multi_update"}
```
MethodNames lists the service method names as defined in the design. These
are the same values that are set in the endpoint request contexts under the
MethodKey key.



## <a name="NewAddEndpoint">func</a> [NewAddEndpoint](/src/target/endpoints.go?s=2083:2126#L81)
``` go
func NewAddEndpoint(s Service) goa.Endpoint
```
NewAddEndpoint returns an endpoint function that calls the method "add" of
service "storage".



## <a name="NewListEndpoint">func</a> [NewListEndpoint](/src/target/endpoints.go?s=1322:1366#L54)
``` go
func NewListEndpoint(s Service) goa.Endpoint
```
NewListEndpoint returns an endpoint function that calls the method "list" of
service "storage".



## <a name="NewMultiAddEndpoint">func</a> [NewMultiAddEndpoint](/src/target/endpoints.go?s=2949:2997#L108)
``` go
func NewMultiAddEndpoint(s Service) goa.Endpoint
```
NewMultiAddEndpoint returns an endpoint function that calls the method
"multi_add" of service "storage".



## <a name="NewMultiUpdateEndpoint">func</a> [NewMultiUpdateEndpoint](/src/target/endpoints.go?s=3248:3299#L117)
``` go
func NewMultiUpdateEndpoint(s Service) goa.Endpoint
```
NewMultiUpdateEndpoint returns an endpoint function that calls the method
"multi_update" of service "storage".



## <a name="NewRateEndpoint">func</a> [NewRateEndpoint](/src/target/endpoints.go?s=2649:2693#L99)
``` go
func NewRateEndpoint(s Service) goa.Endpoint
```
NewRateEndpoint returns an endpoint function that calls the method "rate" of
service "storage".



## <a name="NewRemoveEndpoint">func</a> [NewRemoveEndpoint](/src/target/endpoints.go?s=2359:2405#L90)
``` go
func NewRemoveEndpoint(s Service) goa.Endpoint
```
NewRemoveEndpoint returns an endpoint function that calls the method
"remove" of service "storage".



## <a name="NewShowEndpoint">func</a> [NewShowEndpoint](/src/target/endpoints.go?s=1692:1736#L67)
``` go
func NewShowEndpoint(s Service) goa.Endpoint
```
NewShowEndpoint returns an endpoint function that calls the method "show" of
service "storage".



## <a name="NewViewedStoredBottle">func</a> [NewViewedStoredBottle](/src/target/service.go?s=5795:5880#L193)
``` go
func NewViewedStoredBottle(res *StoredBottle, view string) *storageviews.StoredBottle
```
NewViewedStoredBottle initializes viewed result type StoredBottle from
result type StoredBottle using the given view.



## <a name="NewViewedStoredBottleCollection">func</a> [NewViewedStoredBottleCollection](/src/target/service.go?s=4890:5003#L165)
``` go
func NewViewedStoredBottleCollection(res StoredBottleCollection, view string) storageviews.StoredBottleCollection
```
NewViewedStoredBottleCollection initializes viewed result type
StoredBottleCollection from result type StoredBottleCollection using the
given view.




## <a name="Bottle">type</a> [Bottle](/src/target/service.go?s=2794:3143#L82)
``` go
type Bottle struct {
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
Bottle is the payload type of the storage service add method.










## <a name="Client">type</a> [Client](/src/target/client.go?s=295:555#L18)
``` go
type Client struct {
    ListEndpoint        goa.Endpoint
    ShowEndpoint        goa.Endpoint
    AddEndpoint         goa.Endpoint
    RemoveEndpoint      goa.Endpoint
    RateEndpoint        goa.Endpoint
    MultiAddEndpoint    goa.Endpoint
    MultiUpdateEndpoint goa.Endpoint
}

```
Client is the "storage" service client.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=630:719#L29)
``` go
func NewClient(list, show, add, remove, rate, multiAdd, multiUpdate goa.Endpoint) *Client
```
NewClient initializes a "storage" service client given the endpoints.





### <a name="Client.Add">func</a> (\*Client) [Add](/src/target/client.go?s=1694:1770#L65)
``` go
func (c *Client) Add(ctx context.Context, p *Bottle) (res string, err error)
```
Add calls the "add" endpoint of the "storage" service.




### <a name="Client.List">func</a> (\*Client) [List](/src/target/client.go?s=1020:1102#L42)
``` go
func (c *Client) List(ctx context.Context) (res StoredBottleCollection, err error)
```
List calls the "list" endpoint of the "storage" service.




### <a name="Client.MultiAdd">func</a> (\*Client) [MultiAdd](/src/target/client.go?s=2451:2536#L90)
``` go
func (c *Client) MultiAdd(ctx context.Context, p []*Bottle) (res []string, err error)
```
MultiAdd calls the "multi_add" endpoint of the "storage" service.




### <a name="Client.MultiUpdate">func</a> (\*Client) [MultiUpdate](/src/target/client.go?s=2737:2821#L100)
``` go
func (c *Client) MultiUpdate(ctx context.Context, p *MultiUpdatePayload) (err error)
```
MultiUpdate calls the "multi_update" endpoint of the "storage" service.




### <a name="Client.Rate">func</a> (\*Client) [Rate](/src/target/client.go?s=2258:2335#L84)
``` go
func (c *Client) Rate(ctx context.Context, p map[uint32][]string) (err error)
```
Rate calls the "rate" endpoint of the "storage" service.




### <a name="Client.Remove">func</a> (\*Client) [Remove](/src/target/client.go?s=2075:2149#L78)
``` go
func (c *Client) Remove(ctx context.Context, p *RemovePayload) (err error)
```
Remove calls the "remove" endpoint of the "storage" service.
Remove may return the following errors:


	- "not_found" (type *NotFound): Bottle not found
	- error: internal error




### <a name="Client.Show">func</a> (\*Client) [Show](/src/target/client.go?s=1420:1509#L55)
``` go
func (c *Client) Show(ctx context.Context, p *ShowPayload) (res *StoredBottle, err error)
```
Show calls the "show" endpoint of the "storage" service.
Show may return the following errors:


	- "not_found" (type *NotFound): Bottle not found
	- error: internal error




## <a name="Component">type</a> [Component](/src/target/service.go?s=3706:3822#L123)
``` go
type Component struct {
    // Grape varietal
    Varietal string
    // Percentage of varietal in wine
    Percentage *uint32
}

```









## <a name="Endpoints">type</a> [Endpoints](/src/target/endpoints.go?s=307:514#L18)
``` go
type Endpoints struct {
    List        goa.Endpoint
    Show        goa.Endpoint
    Add         goa.Endpoint
    Remove      goa.Endpoint
    Rate        goa.Endpoint
    MultiAdd    goa.Endpoint
    MultiUpdate goa.Endpoint
}

```
Endpoints wraps the "storage" service endpoints.







### <a name="NewEndpoints">func</a> [NewEndpoints](/src/target/endpoints.go?s=591:630#L29)
``` go
func NewEndpoints(s Service) *Endpoints
```
NewEndpoints wraps the methods of the "storage" service with endpoints.





### <a name="Endpoints.Use">func</a> (\*Endpoints) [Use](/src/target/endpoints.go?s=992:1050#L42)
``` go
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)
```
Use applies the given middleware to all the "storage" service endpoints.




## <a name="MultiUpdatePayload">type</a> [MultiUpdatePayload](/src/target/service.go?s=3378:3538#L105)
``` go
type MultiUpdatePayload struct {
    // IDs of the bottles to be updated
    Ids []string
    // Array of bottle info that matches the ids attribute
    Bottles []*Bottle
}

```
MultiUpdatePayload is the payload type of the storage service multi_update
method.










## <a name="NotFound">type</a> [NotFound](/src/target/service.go?s=3924:4021#L132)
``` go
type NotFound struct {
    // Message of error
    Message string
    // ID of missing bottle
    ID string
}

```
NotFound is the type returned when attempting to show or delete a bottle
that does not exist.










### <a name="NotFound.Error">func</a> (\*NotFound) [Error](/src/target/service.go?s=4062:4095#L140)
``` go
func (e *NotFound) Error() string
```
Error returns an error description.




### <a name="NotFound.ErrorName">func</a> (\*NotFound) [ErrorName](/src/target/service.go?s=4238:4275#L145)
``` go
func (e *NotFound) ErrorName() string
```
ErrorName returns "NotFound".




## <a name="RemovePayload">type</a> [RemovePayload](/src/target/service.go?s=3220:3287#L98)
``` go
type RemovePayload struct {
    // ID of bottle to remove
    ID string
}

```
RemovePayload is the payload type of the storage service remove method.










## <a name="Service">type</a> [Service](/src/target/service.go?s=374:1481#L18)
``` go
type Service interface {
    // List all stored bottles
    List(context.Context) (res StoredBottleCollection, err error)
    // Show bottle by ID
    // The "view" return value must have one of the following views
    //	- "default"
    //	- "tiny"
    Show(context.Context, *ShowPayload) (res *StoredBottle, view string, err error)
    // Add new bottle and return its ID.
    Add(context.Context, *Bottle) (res string, err error)
    // Remove bottle from storage
    Remove(context.Context, *RemovePayload) (err error)
    // Rate bottles by IDs
    Rate(context.Context, map[uint32][]string) (err error)
    // Add n number of bottles and return their IDs. This is a multipart request
    // and each part has field name 'bottle' and contains the encoded bottle info
    // to be added.
    MultiAdd(context.Context, []*Bottle) (res []string, err error)
    // Update bottles with the given IDs. This is a multipart request and each part
    // has field name 'bottle' and contains the encoded bottle info to be updated.
    // The IDs in the query parameter is mapped to each part in the request.
    MultiUpdate(context.Context, *MultiUpdatePayload) (err error)
}
```
The storage service makes it possible to view, add or remove wine bottles.










## <a name="ShowPayload">type</a> [ShowPayload](/src/target/service.go?s=2153:2249#L56)
``` go
type ShowPayload struct {
    // ID of bottle to show
    ID string
    // View to render
    View *string
}

```
ShowPayload is the payload type of the storage service show method.










## <a name="StoredBottle">type</a> [StoredBottle](/src/target/service.go?s=2322:2727#L64)
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
StoredBottle is the result type of the storage service show method.







### <a name="NewStoredBottle">func</a> [NewStoredBottle](/src/target/service.go?s=5421:5488#L180)
``` go
func NewStoredBottle(vres *storageviews.StoredBottle) *StoredBottle
```
NewStoredBottle initializes result type StoredBottle from viewed result type
StoredBottle.





## <a name="StoredBottleCollection">type</a> [StoredBottleCollection](/src/target/service.go?s=2037:2080#L53)
``` go
type StoredBottleCollection []*StoredBottle
```
StoredBottleCollection is the result type of the storage service list method.







### <a name="NewStoredBottleCollection">func</a> [NewStoredBottleCollection](/src/target/service.go?s=4426:4521#L151)
``` go
func NewStoredBottleCollection(vres storageviews.StoredBottleCollection) StoredBottleCollection
```
NewStoredBottleCollection initializes result type StoredBottleCollection
from viewed result type StoredBottleCollection.





## <a name="Winery">type</a> [Winery](/src/target/service.go?s=3540:3704#L112)
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
