+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar/gen/http/sommelier/server"
+++


# server
`import "github.com/goadesign/goa/examples/cellar/gen/http/sommelier/server"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func DecodePickRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodePickRequest)
* [func EncodePickError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodePickError)
* [func EncodePickResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodePickResponse)
* [func Mount(mux goahttp.Muxer, h *Server)](#Mount)
* [func MountPickHandler(mux goahttp.Muxer, h http.Handler)](#MountPickHandler)
* [func NewPickCriteria(body *PickRequestBody) *sommelier.Criteria](#NewPickCriteria)
* [func NewPickHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewPickHandler)
* [func PickSommelierPath() string](#PickSommelierPath)
* [type ComponentResponseBody](#ComponentResponseBody)
  * [func (body *ComponentResponseBody) Validate() (err error)](#ComponentResponseBody.Validate)
* [type ErrorNamer](#ErrorNamer)
* [type MountPoint](#MountPoint)
* [type PickNoCriteriaResponseBody](#PickNoCriteriaResponseBody)
  * [func NewPickNoCriteriaResponseBody(res sommelier.NoCriteria) PickNoCriteriaResponseBody](#NewPickNoCriteriaResponseBody)
* [type PickNoMatchResponseBody](#PickNoMatchResponseBody)
  * [func NewPickNoMatchResponseBody(res sommelier.NoMatch) PickNoMatchResponseBody](#NewPickNoMatchResponseBody)
* [type PickRequestBody](#PickRequestBody)
* [type Server](#Server)
  * [func New(e *sommelier.Endpoints, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) *Server](#New)
  * [func (s *Server) Service() string](#Server.Service)
  * [func (s *Server) Use(m func(http.Handler) http.Handler)](#Server.Use)
* [type StoredBottleResponseBody](#StoredBottleResponseBody)
  * [func (body *StoredBottleResponseBody) Validate() (err error)](#StoredBottleResponseBody.Validate)
* [type StoredBottleResponseBodyCollection](#StoredBottleResponseBodyCollection)
  * [func NewStoredBottleResponseBodyCollection(res sommelierviews.StoredBottleCollectionView) StoredBottleResponseBodyCollection](#NewStoredBottleResponseBodyCollection)
* [type WineryResponseBodyTiny](#WineryResponseBodyTiny)


#### <a name="pkg-files">Package files</a>
[encode_decode.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/server/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/server/paths.go) [server.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/server/server.go) [types.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/sommelier/server/types.go) 





## <a name="DecodePickRequest">func</a> [DecodePickRequest](/src/target/encode_decode.go?s=1085:1212#L36)
``` go
func DecodePickRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodePickRequest returns a decoder for requests sent to the sommelier pick
endpoint.



## <a name="EncodePickError">func</a> [EncodePickError](/src/target/encode_decode.go?s=1651:1795#L57)
``` go
func EncodePickError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodePickError returns an encoder for errors returned by the pick sommelier
endpoint.



## <a name="EncodePickResponse">func</a> [EncodePickResponse](/src/target/encode_decode.go?s=555:708#L24)
``` go
func EncodePickResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodePickResponse returns an encoder for responses returned by the
sommelier pick endpoint.



## <a name="Mount">func</a> [Mount](/src/target/server.go?s=1812:1852#L68)
``` go
func Mount(mux goahttp.Muxer, h *Server)
```
Mount configures the mux to serve the sommelier endpoints.



## <a name="MountPickHandler">func</a> [MountPickHandler](/src/target/server.go?s=1981:2037#L74)
``` go
func MountPickHandler(mux goahttp.Muxer, h http.Handler)
```
MountPickHandler configures the mux to serve the "sommelier" service "pick"
endpoint.



## <a name="NewPickCriteria">func</a> [NewPickCriteria](/src/target/types.go?s=4415:4478#L117)
``` go
func NewPickCriteria(body *PickRequestBody) *sommelier.Criteria
```
NewPickCriteria builds a sommelier service pick endpoint payload.



## <a name="NewPickHandler">func</a> [NewPickHandler](/src/target/server.go?s=2326:2567#L86)
``` go
func NewPickHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewPickHandler creates a HTTP handler which loads the HTTP request and calls
the "sommelier" service "pick" endpoint.



## <a name="PickSommelierPath">func</a> [PickSommelierPath](/src/target/paths.go?s=335:366#L12)
``` go
func PickSommelierPath() string
```
PickSommelierPath returns the URL path to the sommelier service pick HTTP endpoint.




## <a name="ComponentResponseBody">type</a> [ComponentResponseBody](/src/target/types.go?s=2599:2861#L67)
``` go
type ComponentResponseBody struct {
    // Grape varietal
    Varietal string `form:"varietal" json:"varietal" xml:"varietal"`
    // Percentage of varietal in wine
    Percentage *uint32 `form:"percentage,omitempty" json:"percentage,omitempty" xml:"percentage,omitempty"`
}

```
ComponentResponseBody is used to define fields on response body types.










### <a name="ComponentResponseBody.Validate">func</a> (\*ComponentResponseBody) [Validate](/src/target/types.go?s=6122:6179#L171)
``` go
func (body *ComponentResponseBody) Validate() (err error)
```
Validate runs the validations defined on ComponentResponseBody




## <a name="ErrorNamer">type</a> [ErrorNamer](/src/target/server.go?s=621:670#L28)
``` go
type ErrorNamer interface {
    ErrorName() string
}
```
ErrorNamer is an interface implemented by generated error structs that
exposes the name of the error as defined in the design.










## <a name="MountPoint">type</a> [MountPoint](/src/target/server.go?s=733:1055#L33)
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










## <a name="PickNoCriteriaResponseBody">type</a> [PickNoCriteriaResponseBody](/src/target/types.go?s=1204:1242#L36)
``` go
type PickNoCriteriaResponseBody string
```
PickNoCriteriaResponseBody is the type of the "sommelier" service "pick"
endpoint HTTP response body for the "no_criteria" error.







### <a name="NewPickNoCriteriaResponseBody">func</a> [NewPickNoCriteriaResponseBody](/src/target/types.go?s=3934:4021#L104)
``` go
func NewPickNoCriteriaResponseBody(res sommelier.NoCriteria) PickNoCriteriaResponseBody
```
NewPickNoCriteriaResponseBody builds the HTTP response body from the result
of the "pick" endpoint of the "sommelier" service.





## <a name="PickNoMatchResponseBody">type</a> [PickNoMatchResponseBody](/src/target/types.go?s=1374:1409#L40)
``` go
type PickNoMatchResponseBody string
```
PickNoMatchResponseBody is the type of the "sommelier" service "pick"
endpoint HTTP response body for the "no_match" error.







### <a name="NewPickNoMatchResponseBody">func</a> [NewPickNoMatchResponseBody](/src/target/types.go?s=4211:4289#L111)
``` go
func NewPickNoMatchResponseBody(res sommelier.NoMatch) PickNoMatchResponseBody
```
NewPickNoMatchResponseBody builds the HTTP response body from the result of
the "pick" endpoint of the "sommelier" service.





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










## <a name="Server">type</a> [Server](/src/target/server.go?s=421:486#L21)
``` go
type Server struct {
    Mounts []*MountPoint
    Pick   http.Handler
}

```
Server lists the sommelier service endpoint HTTP handlers.







### <a name="New">func</a> [New](/src/target/server.go?s=1132:1358#L44)
``` go
func New(
    e *sommelier.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) *Server
```
New instantiates HTTP handlers for all the sommelier service endpoints.





### <a name="Server.Service">func</a> (\*Server) [Service](/src/target/server.go?s=1551:1584#L60)
``` go
func (s *Server) Service() string
```
Service returns the name of the service served.




### <a name="Server.Use">func</a> (\*Server) [Use](/src/target/server.go?s=1669:1724#L63)
``` go
func (s *Server) Use(m func(http.Handler) http.Handler)
```
Use wraps the server handlers with the given middleware.




## <a name="StoredBottleResponseBody">type</a> [StoredBottleResponseBody](/src/target/types.go?s=1488:2339#L43)
``` go
type StoredBottleResponseBody struct {
    // ID is the unique id of the bottle.
    ID string `form:"id" json:"id" xml:"id"`
    // Name of bottle
    Name string `form:"name" json:"name" xml:"name"`
    // Winery that produces wine
    Winery *WineryResponseBodyTiny `form:"winery" json:"winery" xml:"winery"`
    // Vintage of bottle
    Vintage uint32 `form:"vintage" json:"vintage" xml:"vintage"`
    // Composition is the list of grape varietals and associated percentage.
    Composition []*ComponentResponseBody `form:"composition,omitempty" json:"composition,omitempty" xml:"composition,omitempty"`
    // Description of bottle
    Description *string `form:"description,omitempty" json:"description,omitempty" xml:"description,omitempty"`
    // Rating of bottle from 1 (worst) to 5 (best)
    Rating *uint32 `form:"rating,omitempty" json:"rating,omitempty" xml:"rating,omitempty"`
}

```
StoredBottleResponseBody is used to define fields on response body types.










### <a name="StoredBottleResponseBody.Validate">func</a> (\*StoredBottleResponseBody) [Validate](/src/target/types.go?s=4782:4842#L132)
``` go
func (body *StoredBottleResponseBody) Validate() (err error)
```
Validate runs the validations defined on StoredBottleResponseBody




## <a name="StoredBottleResponseBodyCollection">type</a> [StoredBottleResponseBodyCollection](/src/target/types.go?s=999:1066#L32)
``` go
type StoredBottleResponseBodyCollection []*StoredBottleResponseBody
```
StoredBottleResponseBodyCollection is the type of the "sommelier" service
"pick" endpoint HTTP response body.







### <a name="NewStoredBottleResponseBodyCollection">func</a> [NewStoredBottleResponseBodyCollection](/src/target/types.go?s=3004:3128#L76)
``` go
func NewStoredBottleResponseBodyCollection(res sommelierviews.StoredBottleCollectionView) StoredBottleResponseBodyCollection
```
NewStoredBottleResponseBodyCollection builds the HTTP response body from the
result of the "pick" endpoint of the "sommelier" service.





## <a name="WineryResponseBodyTiny">type</a> [WineryResponseBodyTiny](/src/target/types.go?s=2416:2523#L61)
``` go
type WineryResponseBodyTiny struct {
    // Name of winery
    Name string `form:"name" json:"name" xml:"name"`
}

```
WineryResponseBodyTiny is used to define fields on response body types.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
