+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar/gen/http/sommelier/client"
+++


# client
`import "github.com/goadesign/goa/examples/cellar/gen/http/sommelier/client"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func BuildPickPayload(sommelierPickBody string) (*sommelier.Criteria, error)](#BuildPickPayload)
* [func DecodePickResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodePickResponse)
* [func EncodePickRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodePickRequest)
* [func NewPickNoCriteria(body PickNoCriteriaResponseBody) sommelier.NoCriteria](#NewPickNoCriteria)
* [func NewPickNoMatch(body PickNoMatchResponseBody) sommelier.NoMatch](#NewPickNoMatch)
* [func NewPickStoredBottleCollectionOK(body PickResponseBody) sommelierviews.StoredBottleCollectionView](#NewPickStoredBottleCollectionOK)
* [func PickSommelierPath() string](#PickSommelierPath)
* [type Client](#Client)
  * [func NewClient(scheme string, host string, doer goahttp.Doer, enc func(*http.Request) goahttp.Encoder, dec func(*http.Response) goahttp.Decoder, restoreBody bool) *Client](#NewClient)
  * [func (c *Client) BuildPickRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildPickRequest)
  * [func (c *Client) Pick() goa.Endpoint](#Client.Pick)
* [type ComponentResponseBody](#ComponentResponseBody)
  * [func (body *ComponentResponseBody) Validate() (err error)](#ComponentResponseBody.Validate)
* [type PickNoCriteriaResponseBody](#PickNoCriteriaResponseBody)
* [type PickNoMatchResponseBody](#PickNoMatchResponseBody)
* [type PickRequestBody](#PickRequestBody)
  * [func NewPickRequestBody(p *sommelier.Criteria) *PickRequestBody](#NewPickRequestBody)
* [type PickResponseBody](#PickResponseBody)
* [type StoredBottleResponseBody](#StoredBottleResponseBody)
  * [func (body *StoredBottleResponseBody) Validate() (err error)](#StoredBottleResponseBody.Validate)
* [type WineryResponseBody](#WineryResponseBody)
  * [func (body *WineryResponseBody) Validate() (err error)](#WineryResponseBody.Validate)


#### <a name="pkg-files">Package files</a>
[cli.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/client/cli.go) [client.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/client/client.go) [encode_decode.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/client/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/client/paths.go) [types.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/client/types.go) 





## <a name="BuildPickPayload">func</a> [BuildPickPayload](/src/target/cli.go?s=417:493#L20)
``` go
func BuildPickPayload(sommelierPickBody string) (*sommelier.Criteria, error)
```
BuildPickPayload builds the payload for the sommelier pick endpoint from CLI
flags.



## <a name="DecodePickResponse">func</a> [DecodePickResponse](/src/target/encode_decode.go?s=1938:2067#L61)
``` go
func DecodePickResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodePickResponse returns a decoder for responses returned by the sommelier
pick endpoint. restoreBody controls whether the response body should be
restored after having been read.
DecodePickResponse may return the following errors:


	- "no_criteria" (type sommelier.NoCriteria): http.StatusBadRequest
	- "no_match" (type sommelier.NoMatch): http.StatusNotFound
	- error: internal error



## <a name="EncodePickRequest">func</a> [EncodePickRequest](/src/target/encode_decode.go?s=1070:1176#L40)
``` go
func EncodePickRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodePickRequest returns an encoder for requests sent to the sommelier pick
server.



## <a name="NewPickNoCriteria">func</a> [NewPickNoCriteria](/src/target/types.go?s=4687:4763#L123)
``` go
func NewPickNoCriteria(body PickNoCriteriaResponseBody) sommelier.NoCriteria
```
NewPickNoCriteria builds a sommelier service pick endpoint no_criteria error.



## <a name="NewPickNoMatch">func</a> [NewPickNoMatch](/src/target/types.go?s=4887:4954#L129)
``` go
func NewPickNoMatch(body PickNoMatchResponseBody) sommelier.NoMatch
```
NewPickNoMatch builds a sommelier service pick endpoint no_match error.



## <a name="NewPickStoredBottleCollectionOK">func</a> [NewPickStoredBottleCollectionOK](/src/target/types.go?s=3856:3957#L98)
``` go
func NewPickStoredBottleCollectionOK(body PickResponseBody) sommelierviews.StoredBottleCollectionView
```
NewPickStoredBottleCollectionOK builds a "sommelier" service "pick" endpoint
result from a HTTP "OK" response.



## <a name="PickSommelierPath">func</a> [PickSommelierPath](/src/target/paths.go?s=335:366#L12)
``` go
func PickSommelierPath() string
```
PickSommelierPath returns the URL path to the sommelier service pick HTTP endpoint.




## <a name="Client">type</a> [Client](/src/target/client.go?s=372:762#L20)
``` go
type Client struct {
    // Pick Doer is the HTTP client used to make requests to the pick endpoint.
    PickDoer goahttp.Doer

    // RestoreResponseBody controls whether the response bodies are reset after
    // decoding so they can be read again.
    RestoreResponseBody bool
    // contains filtered or unexported fields
}

```
Client lists the sommelier service endpoint HTTP clients.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=842:1021#L35)
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
NewClient instantiates HTTP clients for all the sommelier service servers.





### <a name="Client.BuildPickRequest">func</a> (\*Client) [BuildPickRequest](/src/target/encode_decode.go?s=592:684#L25)
``` go
func (c *Client) BuildPickRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildPickRequest instantiates a HTTP request object with method and path set
to call the "sommelier" service "pick" endpoint




### <a name="Client.Pick">func</a> (\*Client) [Pick](/src/target/client.go?s=1322:1358#L55)
``` go
func (c *Client) Pick() goa.Endpoint
```
Pick returns an endpoint that makes HTTP requests to the sommelier service
pick server.




## <a name="ComponentResponseBody">type</a> [ComponentResponseBody](/src/target/types.go?s=3030:3323#L73)
``` go
type ComponentResponseBody struct {
    // Grape varietal
    Varietal *string `form:"varietal,omitempty" json:"varietal,omitempty" xml:"varietal,omitempty"`
    // Percentage of varietal in wine
    Percentage *uint32 `form:"percentage,omitempty" json:"percentage,omitempty" xml:"percentage,omitempty"`
}

```
ComponentResponseBody is used to define fields on response body types.










### <a name="ComponentResponseBody.Validate">func</a> (\*ComponentResponseBody) [Validate](/src/target/types.go?s=7732:7789#L217)
``` go
func (body *ComponentResponseBody) Validate() (err error)
```
Validate runs the validations defined on ComponentResponseBody




## <a name="PickNoCriteriaResponseBody">type</a> [PickNoCriteriaResponseBody](/src/target/types.go?s=1168:1206#L36)
``` go
type PickNoCriteriaResponseBody string
```
PickNoCriteriaResponseBody is the type of the "sommelier" service "pick"
endpoint HTTP response body for the "no_criteria" error.










## <a name="PickNoMatchResponseBody">type</a> [PickNoMatchResponseBody](/src/target/types.go?s=1338:1373#L40)
``` go
type PickNoMatchResponseBody string
```
PickNoMatchResponseBody is the type of the "sommelier" service "pick"
endpoint HTTP response body for the "no_match" error.










## <a name="PickRequestBody">type</a> [PickRequestBody](/src/target/types.go?s=492:881#L21)
``` go
type PickRequestBody struct {
    // Name of bottle to pick
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // Varietals in preference order
    Varietal []string `form:"varietal,omitempty" json:"varietal,omitempty" xml:"varietal,omitempty"`
    // Winery of bottle to pick
    Winery *string `form:"winery,omitempty" json:"winery,omitempty" xml:"winery,omitempty"`
}

```
PickRequestBody is the type of the "sommelier" service "pick" endpoint HTTP
request body.







### <a name="NewPickRequestBody">func</a> [NewPickRequestBody](/src/target/types.go?s=3447:3510#L82)
``` go
func NewPickRequestBody(p *sommelier.Criteria) *PickRequestBody
```
NewPickRequestBody builds the HTTP request body from the payload of the
"pick" endpoint of the "sommelier" service.





## <a name="PickResponseBody">type</a> [PickResponseBody](/src/target/types.go?s=981:1030#L32)
``` go
type PickResponseBody []*StoredBottleResponseBody
```
PickResponseBody is the type of the "sommelier" service "pick" endpoint HTTP
response body.










## <a name="StoredBottleResponseBody">type</a> [StoredBottleResponseBody](/src/target/types.go?s=1452:2422#L43)
``` go
type StoredBottleResponseBody struct {
    // ID is the unique id of the bottle.
    ID *string `form:"id,omitempty" json:"id,omitempty" xml:"id,omitempty"`
    // Name of bottle
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // Winery that produces wine
    Winery *WineryResponseBody `form:"winery,omitempty" json:"winery,omitempty" xml:"winery,omitempty"`
    // Vintage of bottle
    Vintage *uint32 `form:"vintage,omitempty" json:"vintage,omitempty" xml:"vintage,omitempty"`
    // Composition is the list of grape varietals and associated percentage.
    Composition []*ComponentResponseBody `form:"composition,omitempty" json:"composition,omitempty" xml:"composition,omitempty"`
    // Description of bottle
    Description *string `form:"description,omitempty" json:"description,omitempty" xml:"description,omitempty"`
    // Rating of bottle from 1 (worst) to 5 (best)
    Rating *uint32 `form:"rating,omitempty" json:"rating,omitempty" xml:"rating,omitempty"`
}

```
StoredBottleResponseBody is used to define fields on response body types.










### <a name="StoredBottleResponseBody.Validate">func</a> (\*StoredBottleResponseBody) [Validate](/src/target/types.go?s=5069:5129#L135)
``` go
func (body *StoredBottleResponseBody) Validate() (err error)
```
Validate runs the validations defined on StoredBottleResponseBody




## <a name="WineryResponseBody">type</a> [WineryResponseBody](/src/target/types.go?s=2495:2954#L61)
``` go
type WineryResponseBody struct {
    // Name of winery
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // Region of winery
    Region *string `form:"region,omitempty" json:"region,omitempty" xml:"region,omitempty"`
    // Country of winery
    Country *string `form:"country,omitempty" json:"country,omitempty" xml:"country,omitempty"`
    // Winery website URL
    URL *string `form:"url,omitempty" json:"url,omitempty" xml:"url,omitempty"`
}

```
WineryResponseBody is used to define fields on response body types.










### <a name="WineryResponseBody.Validate">func</a> (\*WineryResponseBody) [Validate](/src/target/types.go?s=6909:6963#L194)
``` go
func (body *WineryResponseBody) Validate() (err error)
```
Validate runs the validations defined on WineryResponseBody








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
