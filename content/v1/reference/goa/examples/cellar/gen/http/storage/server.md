+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar/gen/http/storage/server"
+++


# server
`import "github.com/goadesign/goa/examples/cellar/gen/http/storage/server"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func AddStoragePath() string](#AddStoragePath)
* [func DecodeAddRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeAddRequest)
* [func DecodeMultiAddRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeMultiAddRequest)
* [func DecodeMultiUpdateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeMultiUpdateRequest)
* [func DecodeRateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeRateRequest)
* [func DecodeRemoveRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeRemoveRequest)
* [func DecodeShowRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeShowRequest)
* [func EncodeAddResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeAddResponse)
* [func EncodeListResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeListResponse)
* [func EncodeMultiAddResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeMultiAddResponse)
* [func EncodeMultiUpdateResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeMultiUpdateResponse)
* [func EncodeRateResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeRateResponse)
* [func EncodeRemoveResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeRemoveResponse)
* [func EncodeShowError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeShowError)
* [func EncodeShowResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeShowResponse)
* [func ListStoragePath() string](#ListStoragePath)
* [func Mount(mux goahttp.Muxer, h *Server)](#Mount)
* [func MountAddHandler(mux goahttp.Muxer, h http.Handler)](#MountAddHandler)
* [func MountListHandler(mux goahttp.Muxer, h http.Handler)](#MountListHandler)
* [func MountMultiAddHandler(mux goahttp.Muxer, h http.Handler)](#MountMultiAddHandler)
* [func MountMultiUpdateHandler(mux goahttp.Muxer, h http.Handler)](#MountMultiUpdateHandler)
* [func MountRateHandler(mux goahttp.Muxer, h http.Handler)](#MountRateHandler)
* [func MountRemoveHandler(mux goahttp.Muxer, h http.Handler)](#MountRemoveHandler)
* [func MountShowHandler(mux goahttp.Muxer, h http.Handler)](#MountShowHandler)
* [func MultiAddStoragePath() string](#MultiAddStoragePath)
* [func MultiUpdateStoragePath() string](#MultiUpdateStoragePath)
* [func NewAddBottle(body *AddRequestBody) *storage.Bottle](#NewAddBottle)
* [func NewAddHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewAddHandler)
* [func NewListHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewListHandler)
* [func NewMultiAddBottle(body []*BottleRequestBody) []*storage.Bottle](#NewMultiAddBottle)
* [func NewMultiAddHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewMultiAddHandler)
* [func NewMultiUpdateHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewMultiUpdateHandler)
* [func NewMultiUpdatePayload(body *MultiUpdateRequestBody, ids []string) *storage.MultiUpdatePayload](#NewMultiUpdatePayload)
* [func NewRateHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewRateHandler)
* [func NewRemoveHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewRemoveHandler)
* [func NewRemovePayload(id string) *storage.RemovePayload](#NewRemovePayload)
* [func NewShowHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewShowHandler)
* [func NewShowPayload(id string, view *string) *storage.ShowPayload](#NewShowPayload)
* [func NewStorageMultiAddDecoder(mux goahttp.Muxer, storageMultiAddDecoderFn StorageMultiAddDecoderFunc) func(r *http.Request) goahttp.Decoder](#NewStorageMultiAddDecoder)
* [func NewStorageMultiUpdateDecoder(mux goahttp.Muxer, storageMultiUpdateDecoderFn StorageMultiUpdateDecoderFunc) func(r *http.Request) goahttp.Decoder](#NewStorageMultiUpdateDecoder)
* [func RateStoragePath() string](#RateStoragePath)
* [func RemoveStoragePath(id string) string](#RemoveStoragePath)
* [func ShowStoragePath(id string) string](#ShowStoragePath)
* [type AddRequestBody](#AddRequestBody)
  * [func (body *AddRequestBody) Validate() (err error)](#AddRequestBody.Validate)
* [type BottleRequestBody](#BottleRequestBody)
  * [func (body *BottleRequestBody) Validate() (err error)](#BottleRequestBody.Validate)
* [type ComponentRequestBody](#ComponentRequestBody)
  * [func (body *ComponentRequestBody) Validate() (err error)](#ComponentRequestBody.Validate)
* [type ComponentResponseBody](#ComponentResponseBody)
  * [func (body *ComponentResponseBody) Validate() (err error)](#ComponentResponseBody.Validate)
* [type ErrorNamer](#ErrorNamer)
* [type MountPoint](#MountPoint)
* [type MultiUpdateRequestBody](#MultiUpdateRequestBody)
  * [func (body *MultiUpdateRequestBody) Validate() (err error)](#MultiUpdateRequestBody.Validate)
* [type Server](#Server)
  * [func New(e *storage.Endpoints, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error), storageMultiAddDecoderFn StorageMultiAddDecoderFunc, storageMultiUpdateDecoderFn StorageMultiUpdateDecoderFunc) *Server](#New)
  * [func (s *Server) Service() string](#Server.Service)
  * [func (s *Server) Use(m func(http.Handler) http.Handler)](#Server.Use)
* [type ShowNotFoundResponseBody](#ShowNotFoundResponseBody)
  * [func NewShowNotFoundResponseBody(res *storage.NotFound) *ShowNotFoundResponseBody](#NewShowNotFoundResponseBody)
* [type ShowResponseBody](#ShowResponseBody)
  * [func NewShowResponseBody(res *storageviews.StoredBottleView) *ShowResponseBody](#NewShowResponseBody)
* [type ShowResponseBodyTiny](#ShowResponseBodyTiny)
  * [func NewShowResponseBodyTiny(res *storageviews.StoredBottleView) *ShowResponseBodyTiny](#NewShowResponseBodyTiny)
* [type StorageMultiAddDecoderFunc](#StorageMultiAddDecoderFunc)
* [type StorageMultiUpdateDecoderFunc](#StorageMultiUpdateDecoderFunc)
* [type StoredBottleResponseBodyTiny](#StoredBottleResponseBodyTiny)
  * [func (body *StoredBottleResponseBodyTiny) Validate() (err error)](#StoredBottleResponseBodyTiny.Validate)
* [type StoredBottleResponseBodyTinyCollection](#StoredBottleResponseBodyTinyCollection)
  * [func NewStoredBottleResponseBodyTinyCollection(res storageviews.StoredBottleCollectionView) StoredBottleResponseBodyTinyCollection](#NewStoredBottleResponseBodyTinyCollection)
* [type WineryRequestBody](#WineryRequestBody)
  * [func (body *WineryRequestBody) Validate() (err error)](#WineryRequestBody.Validate)
* [type WineryResponseBodyTiny](#WineryResponseBodyTiny)


#### <a name="pkg-files">Package files</a>
[encode_decode.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/server/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/server/paths.go) [server.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/server/server.go) [types.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/server/types.go) 





## <a name="AddStoragePath">func</a> [AddStoragePath](/src/target/paths.go?s=649:677#L26)
``` go
func AddStoragePath() string
```
AddStoragePath returns the URL path to the storage service add HTTP endpoint.



## <a name="DecodeAddRequest">func</a> [DecodeAddRequest](/src/target/encode_decode.go?s=3711:3837#L121)
``` go
func DecodeAddRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeAddRequest returns a decoder for requests sent to the storage add
endpoint.



## <a name="DecodeMultiAddRequest">func</a> [DecodeMultiAddRequest](/src/target/encode_decode.go?s=6846:6977#L226)
``` go
func DecodeMultiAddRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeMultiAddRequest returns a decoder for requests sent to the storage
multi_add endpoint.



## <a name="DecodeMultiUpdateRequest">func</a> [DecodeMultiUpdateRequest](/src/target/encode_decode.go?s=8310:8444#L266)
``` go
func DecodeMultiUpdateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeMultiUpdateRequest returns a decoder for requests sent to the storage
multi_update endpoint.



## <a name="DecodeRateRequest">func</a> [DecodeRateRequest](/src/target/encode_decode.go?s=5525:5652#L180)
``` go
func DecodeRateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeRateRequest returns a decoder for requests sent to the storage rate
endpoint.



## <a name="DecodeRemoveRequest">func</a> [DecodeRemoveRequest](/src/target/encode_decode.go?s=4734:4863#L155)
``` go
func DecodeRemoveRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeRemoveRequest returns a decoder for requests sent to the storage
remove endpoint.



## <a name="DecodeShowRequest">func</a> [DecodeShowRequest](/src/target/encode_decode.go?s=1762:1889#L56)
``` go
func DecodeShowRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeShowRequest returns a decoder for requests sent to the storage show
endpoint.



## <a name="EncodeAddResponse">func</a> [EncodeAddResponse](/src/target/encode_decode.go?s=3261:3413#L109)
``` go
func EncodeAddResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeAddResponse returns an encoder for responses returned by the storage
add endpoint.



## <a name="EncodeListResponse">func</a> [EncodeListResponse](/src/target/encode_decode.go?s=554:707#L25)
``` go
func EncodeListResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeListResponse returns an encoder for responses returned by the storage
list endpoint.



## <a name="EncodeMultiAddResponse">func</a> [EncodeMultiAddResponse](/src/target/encode_decode.go?s=6383:6540#L214)
``` go
func EncodeMultiAddResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeMultiAddResponse returns an encoder for responses returned by the
storage multi_add endpoint.



## <a name="EncodeMultiUpdateResponse">func</a> [EncodeMultiUpdateResponse](/src/target/encode_decode.go?s=7905:8065#L257)
``` go
func EncodeMultiUpdateResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeMultiUpdateResponse returns an encoder for responses returned by the
storage multi_update endpoint.



## <a name="EncodeRateResponse">func</a> [EncodeRateResponse](/src/target/encode_decode.go?s=5149:5302#L171)
``` go
func EncodeRateResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeRateResponse returns an encoder for responses returned by the storage
rate endpoint.



## <a name="EncodeRemoveResponse">func</a> [EncodeRemoveResponse](/src/target/encode_decode.go?s=4345:4500#L146)
``` go
func EncodeRemoveResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeRemoveResponse returns an encoder for responses returned by the
storage remove endpoint.



## <a name="EncodeShowError">func</a> [EncodeShowError](/src/target/encode_decode.go?s=2513:2657#L86)
``` go
func EncodeShowError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeShowError returns an encoder for errors returned by the show storage
endpoint.



## <a name="EncodeShowResponse">func</a> [EncodeShowResponse](/src/target/encode_decode.go?s=1091:1244#L37)
``` go
func EncodeShowResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeShowResponse returns an encoder for responses returned by the storage
show endpoint.



## <a name="ListStoragePath">func</a> [ListStoragePath](/src/target/paths.go?s=348:377#L16)
``` go
func ListStoragePath() string
```
ListStoragePath returns the URL path to the storage service list HTTP endpoint.



## <a name="Mount">func</a> [Mount](/src/target/server.go?s=3401:3441#L103)
``` go
func Mount(mux goahttp.Muxer, h *Server)
```
Mount configures the mux to serve the storage endpoints.



## <a name="MountAddHandler">func</a> [MountAddHandler](/src/target/server.go?s=6455:6510#L209)
``` go
func MountAddHandler(mux goahttp.Muxer, h http.Handler)
```
MountAddHandler configures the mux to serve the "storage" service "add"
endpoint.



## <a name="MountListHandler">func</a> [MountListHandler](/src/target/server.go?s=3778:3834#L115)
``` go
func MountListHandler(mux goahttp.Muxer, h http.Handler)
```
MountListHandler configures the mux to serve the "storage" service "list"
endpoint.



## <a name="MountMultiAddHandler">func</a> [MountMultiAddHandler](/src/target/server.go?s=10714:10774#L359)
``` go
func MountMultiAddHandler(mux goahttp.Muxer, h http.Handler)
```
MountMultiAddHandler configures the mux to serve the "storage" service
"multi_add" endpoint.



## <a name="MountMultiUpdateHandler">func</a> [MountMultiUpdateHandler](/src/target/server.go?s=12178:12241#L409)
``` go
func MountMultiUpdateHandler(mux goahttp.Muxer, h http.Handler)
```
MountMultiUpdateHandler configures the mux to serve the "storage" service
"multi_update" endpoint.



## <a name="MountRateHandler">func</a> [MountRateHandler](/src/target/server.go?s=9291:9347#L309)
``` go
func MountRateHandler(mux goahttp.Muxer, h http.Handler)
```
MountRateHandler configures the mux to serve the "storage" service "rate"
endpoint.



## <a name="MountRemoveHandler">func</a> [MountRemoveHandler](/src/target/server.go?s=7861:7919#L259)
``` go
func MountRemoveHandler(mux goahttp.Muxer, h http.Handler)
```
MountRemoveHandler configures the mux to serve the "storage" service
"remove" endpoint.



## <a name="MountShowHandler">func</a> [MountShowHandler](/src/target/server.go?s=5049:5105#L159)
``` go
func MountShowHandler(mux goahttp.Muxer, h http.Handler)
```
MountShowHandler configures the mux to serve the "storage" service "show"
endpoint.



## <a name="MultiAddStoragePath">func</a> [MultiAddStoragePath](/src/target/paths.go?s=1108:1141#L41)
``` go
func MultiAddStoragePath() string
```
MultiAddStoragePath returns the URL path to the storage service multi_add HTTP endpoint.



## <a name="MultiUpdateStoragePath">func</a> [MultiUpdateStoragePath](/src/target/paths.go?s=1274:1310#L46)
``` go
func MultiUpdateStoragePath() string
```
MultiUpdateStoragePath returns the URL path to the storage service multi_update HTTP endpoint.



## <a name="NewAddBottle">func</a> [NewAddBottle](/src/target/types.go?s=8493:8548#L219)
``` go
func NewAddBottle(body *AddRequestBody) *storage.Bottle
```
NewAddBottle builds a storage service add endpoint payload.



## <a name="NewAddHandler">func</a> [NewAddHandler](/src/target/server.go?s=6793:7033#L221)
``` go
func NewAddHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewAddHandler creates a HTTP handler which loads the HTTP request and calls
the "storage" service "add" endpoint.



## <a name="NewListHandler">func</a> [NewListHandler](/src/target/server.go?s=4118:4359#L127)
``` go
func NewListHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewListHandler creates a HTTP handler which loads the HTTP request and calls
the "storage" service "list" endpoint.



## <a name="NewMultiAddBottle">func</a> [NewMultiAddBottle](/src/target/types.go?s=9274:9341#L247)
``` go
func NewMultiAddBottle(body []*BottleRequestBody) []*storage.Bottle
```
NewMultiAddBottle builds a storage service multi_add endpoint payload.



## <a name="NewMultiAddHandler">func</a> [NewMultiAddHandler](/src/target/server.go?s=11078:11323#L371)
``` go
func NewMultiAddHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewMultiAddHandler creates a HTTP handler which loads the HTTP request and
calls the "storage" service "multi_add" endpoint.



## <a name="NewMultiUpdateHandler">func</a> [NewMultiUpdateHandler](/src/target/server.go?s=12553:12801#L421)
``` go
func NewMultiUpdateHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewMultiUpdateHandler creates a HTTP handler which loads the HTTP request
and calls the "storage" service "multi_update" endpoint.



## <a name="NewMultiUpdatePayload">func</a> [NewMultiUpdatePayload](/src/target/types.go?s=9989:10087#L271)
``` go
func NewMultiUpdatePayload(body *MultiUpdateRequestBody, ids []string) *storage.MultiUpdatePayload
```
NewMultiUpdatePayload builds a storage service multi_update endpoint payload.



## <a name="NewRateHandler">func</a> [NewRateHandler](/src/target/server.go?s=9637:9878#L321)
``` go
func NewRateHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewRateHandler creates a HTTP handler which loads the HTTP request and calls
the "storage" service "rate" endpoint.



## <a name="NewRemoveHandler">func</a> [NewRemoveHandler](/src/target/server.go?s=8215:8458#L271)
``` go
func NewRemoveHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewRemoveHandler creates a HTTP handler which loads the HTTP request and
calls the "storage" service "remove" endpoint.



## <a name="NewRemovePayload">func</a> [NewRemovePayload](/src/target/types.go?s=9094:9149#L240)
``` go
func NewRemovePayload(id string) *storage.RemovePayload
```
NewRemovePayload builds a storage service remove endpoint payload.



## <a name="NewShowHandler">func</a> [NewShowHandler](/src/target/server.go?s=5394:5635#L171)
``` go
func NewShowHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewShowHandler creates a HTTP handler which loads the HTTP request and calls
the "storage" service "show" endpoint.



## <a name="NewShowPayload">func</a> [NewShowPayload](/src/target/types.go?s=8300:8365#L211)
``` go
func NewShowPayload(id string, view *string) *storage.ShowPayload
```
NewShowPayload builds a storage service show endpoint payload.



## <a name="NewStorageMultiAddDecoder">func</a> [NewStorageMultiAddDecoder](/src/target/encode_decode.go?s=7333:7473#L239)
``` go
func NewStorageMultiAddDecoder(mux goahttp.Muxer, storageMultiAddDecoderFn StorageMultiAddDecoderFunc) func(r *http.Request) goahttp.Decoder
```
NewStorageMultiAddDecoder returns a decoder to decode the multipart request
for the "storage" service "multi_add" endpoint.



## <a name="NewStorageMultiUpdateDecoder">func</a> [NewStorageMultiUpdateDecoder](/src/target/encode_decode.go?s=8816:8965#L279)
``` go
func NewStorageMultiUpdateDecoder(mux goahttp.Muxer, storageMultiUpdateDecoderFn StorageMultiUpdateDecoderFunc) func(r *http.Request) goahttp.Decoder
```
NewStorageMultiUpdateDecoder returns a decoder to decode the multipart
request for the "storage" service "multi_update" endpoint.



## <a name="RateStoragePath">func</a> [RateStoragePath](/src/target/paths.go?s=957:986#L36)
``` go
func RateStoragePath() string
```
RateStoragePath returns the URL path to the storage service rate HTTP endpoint.



## <a name="RemoveStoragePath">func</a> [RemoveStoragePath](/src/target/paths.go?s=789:829#L31)
``` go
func RemoveStoragePath(id string) string
```
RemoveStoragePath returns the URL path to the storage service remove HTTP endpoint.



## <a name="ShowStoragePath">func</a> [ShowStoragePath](/src/target/paths.go?s=485:523#L21)
``` go
func ShowStoragePath(id string) string
```
ShowStoragePath returns the URL path to the storage service show HTTP endpoint.




## <a name="AddRequestBody">type</a> [AddRequestBody](/src/target/types.go?s=478:1324#L21)
``` go
type AddRequestBody struct {
    // Name of bottle
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // Winery that produces wine
    Winery *WineryRequestBody `form:"winery,omitempty" json:"winery,omitempty" xml:"winery,omitempty"`
    // Vintage of bottle
    Vintage *uint32 `form:"vintage,omitempty" json:"vintage,omitempty" xml:"vintage,omitempty"`
    // Composition is the list of grape varietals and associated percentage.
    Composition []*ComponentRequestBody `form:"composition,omitempty" json:"composition,omitempty" xml:"composition,omitempty"`
    // Description of bottle
    Description *string `form:"description,omitempty" json:"description,omitempty" xml:"description,omitempty"`
    // Rating of bottle from 1 (worst) to 5 (best)
    Rating *uint32 `form:"rating,omitempty" json:"rating,omitempty" xml:"rating,omitempty"`
}

```
AddRequestBody is the type of the "storage" service "add" endpoint HTTP
request body.










### <a name="AddRequestBody.Validate">func</a> (\*AddRequestBody) [Validate](/src/target/types.go?s=10817:10867#L297)
``` go
func (body *AddRequestBody) Validate() (err error)
```
Validate runs the validations defined on AddRequestBody




## <a name="BottleRequestBody">type</a> [BottleRequestBody](/src/target/types.go?s=5356:6205#L131)
``` go
type BottleRequestBody struct {
    // Name of bottle
    Name *string `form:"name,omitempty" json:"name,omitempty" xml:"name,omitempty"`
    // Winery that produces wine
    Winery *WineryRequestBody `form:"winery,omitempty" json:"winery,omitempty" xml:"winery,omitempty"`
    // Vintage of bottle
    Vintage *uint32 `form:"vintage,omitempty" json:"vintage,omitempty" xml:"vintage,omitempty"`
    // Composition is the list of grape varietals and associated percentage.
    Composition []*ComponentRequestBody `form:"composition,omitempty" json:"composition,omitempty" xml:"composition,omitempty"`
    // Description of bottle
    Description *string `form:"description,omitempty" json:"description,omitempty" xml:"description,omitempty"`
    // Rating of bottle from 1 (worst) to 5 (best)
    Rating *uint32 `form:"rating,omitempty" json:"rating,omitempty" xml:"rating,omitempty"`
}

```
BottleRequestBody is used to define fields on request body types.










### <a name="BottleRequestBody.Validate">func</a> (\*BottleRequestBody) [Validate](/src/target/types.go?s=15850:15903#L447)
``` go
func (body *BottleRequestBody) Validate() (err error)
```
Validate runs the validations defined on BottleRequestBody




## <a name="ComponentRequestBody">type</a> [ComponentRequestBody](/src/target/types.go?s=4993:5285#L123)
``` go
type ComponentRequestBody struct {
    // Grape varietal
    Varietal *string `form:"varietal,omitempty" json:"varietal,omitempty" xml:"varietal,omitempty"`
    // Percentage of varietal in wine
    Percentage *uint32 `form:"percentage,omitempty" json:"percentage,omitempty" xml:"percentage,omitempty"`
}

```
ComponentRequestBody is used to define fields on request body types.










### <a name="ComponentRequestBody.Validate">func</a> (\*ComponentRequestBody) [Validate](/src/target/types.go?s=14932:14988#L421)
``` go
func (body *ComponentRequestBody) Validate() (err error)
```
Validate runs the validations defined on ComponentRequestBody




## <a name="ComponentResponseBody">type</a> [ComponentResponseBody](/src/target/types.go?s=4128:4390#L103)
``` go
type ComponentResponseBody struct {
    // Grape varietal
    Varietal string `form:"varietal" json:"varietal" xml:"varietal"`
    // Percentage of varietal in wine
    Percentage *uint32 `form:"percentage,omitempty" json:"percentage,omitempty" xml:"percentage,omitempty"`
}

```
ComponentResponseBody is used to define fields on response body types.










### <a name="ComponentResponseBody.Validate">func</a> (\*ComponentResponseBody) [Validate](/src/target/types.go?s=13362:13419#L379)
``` go
func (body *ComponentResponseBody) Validate() (err error)
```
Validate runs the validations defined on ComponentResponseBody




## <a name="ErrorNamer">type</a> [ErrorNamer](/src/target/server.go?s=797:846#L35)
``` go
type ErrorNamer interface {
    ErrorName() string
}
```
ErrorNamer is an interface implemented by generated error structs that
exposes the name of the error as defined in the design.










## <a name="MountPoint">type</a> [MountPoint](/src/target/server.go?s=909:1231#L40)
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










## <a name="MultiUpdateRequestBody">type</a> [MultiUpdateRequestBody](/src/target/types.go?s=1435:1635#L38)
``` go
type MultiUpdateRequestBody struct {
    // Array of bottle info that matches the ids attribute
    Bottles []*BottleRequestBody `form:"bottles,omitempty" json:"bottles,omitempty" xml:"bottles,omitempty"`
}

```
MultiUpdateRequestBody is the type of the "storage" service "multi_update"
endpoint HTTP request body.










### <a name="MultiUpdateRequestBody.Validate">func</a> (\*MultiUpdateRequestBody) [Validate](/src/target/types.go?s=12561:12619#L353)
``` go
func (body *MultiUpdateRequestBody) Validate() (err error)
```
Validate runs the validations defined on MultiUpdateRequestBody




## <a name="Server">type</a> [Server](/src/target/server.go?s=431:662#L22)
``` go
type Server struct {
    Mounts      []*MountPoint
    List        http.Handler
    Show        http.Handler
    Add         http.Handler
    Remove      http.Handler
    Rate        http.Handler
    MultiAdd    http.Handler
    MultiUpdate http.Handler
}

```
Server lists the storage service endpoint HTTP handlers.







### <a name="New">func</a> [New](/src/target/server.go?s=1733:2071#L59)
``` go
func New(
    e *storage.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    storageMultiAddDecoderFn StorageMultiAddDecoderFunc,
    storageMultiUpdateDecoderFn StorageMultiUpdateDecoderFunc,
) *Server
```
New instantiates HTTP handlers for all the storage service endpoints.





### <a name="Server.Service">func</a> (\*Server) [Service](/src/target/server.go?s=3000:3033#L89)
``` go
func (s *Server) Service() string
```
Service returns the name of the service served.




### <a name="Server.Use">func</a> (\*Server) [Use](/src/target/server.go?s=3116:3171#L92)
``` go
func (s *Server) Use(m func(http.Handler) http.Handler)
```
Use wraps the server handlers with the given middleware.




## <a name="ShowNotFoundResponseBody">type</a> [ShowNotFoundResponseBody](/src/target/types.go?s=3296:3486#L79)
``` go
type ShowNotFoundResponseBody struct {
    // Message of error
    Message string `form:"message" json:"message" xml:"message"`
    // ID of missing bottle
    ID string `form:"id" json:"id" xml:"id"`
}

```
ShowNotFoundResponseBody is the type of the "storage" service "show"
endpoint HTTP response body for the "not_found" error.







### <a name="NewShowNotFoundResponseBody">func</a> [NewShowNotFoundResponseBody](/src/target/types.go?s=8052:8133#L202)
``` go
func NewShowNotFoundResponseBody(res *storage.NotFound) *ShowNotFoundResponseBody
```
NewShowNotFoundResponseBody builds the HTTP response body from the result of
the "show" endpoint of the "storage" service.





## <a name="ShowResponseBody">type</a> [ShowResponseBody](/src/target/types.go?s=1928:2771#L49)
``` go
type ShowResponseBody struct {
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
ShowResponseBody is the type of the "storage" service "show" endpoint HTTP
response body.







### <a name="NewShowResponseBody">func</a> [NewShowResponseBody](/src/target/types.go?s=6895:6973#L164)
``` go
func NewShowResponseBody(res *storageviews.StoredBottleView) *ShowResponseBody
```
NewShowResponseBody builds the HTTP response body from the result of the
"show" endpoint of the "storage" service.





## <a name="ShowResponseBodyTiny">type</a> [ShowResponseBodyTiny](/src/target/types.go?s=2873:3164#L68)
``` go
type ShowResponseBodyTiny struct {
    // ID is the unique id of the bottle.
    ID string `form:"id" json:"id" xml:"id"`
    // Name of bottle
    Name string `form:"name" json:"name" xml:"name"`
    // Winery that produces wine
    Winery *WineryResponseBodyTiny `form:"winery" json:"winery" xml:"winery"`
}

```
ShowResponseBodyTiny is the type of the "storage" service "show" endpoint
HTTP response body.







### <a name="NewShowResponseBodyTiny">func</a> [NewShowResponseBodyTiny](/src/target/types.go?s=7650:7736#L189)
``` go
func NewShowResponseBodyTiny(res *storageviews.StoredBottleView) *ShowResponseBodyTiny
```
NewShowResponseBodyTiny builds the HTTP response body from the result of the
"show" endpoint of the "storage" service.





## <a name="StorageMultiAddDecoderFunc">type</a> [StorageMultiAddDecoderFunc](/src/target/server.go?s=1354:1435#L52)
``` go
type StorageMultiAddDecoderFunc func(*multipart.Reader, *[]*storage.Bottle) error
```
StorageMultiAddDecoderFunc is the type to decode multipart request for the
"storage" service "multi_add" endpoint.










## <a name="StorageMultiUpdateDecoderFunc">type</a> [StorageMultiUpdateDecoderFunc](/src/target/server.go?s=1564:1658#L56)
``` go
type StorageMultiUpdateDecoderFunc func(*multipart.Reader, **storage.MultiUpdatePayload) error
```
StorageMultiUpdateDecoderFunc is the type to decode multipart request for
the "storage" service "multi_update" endpoint.










## <a name="StoredBottleResponseBodyTiny">type</a> [StoredBottleResponseBodyTiny](/src/target/types.go?s=3569:3868#L87)
``` go
type StoredBottleResponseBodyTiny struct {
    // ID is the unique id of the bottle.
    ID string `form:"id" json:"id" xml:"id"`
    // Name of bottle
    Name string `form:"name" json:"name" xml:"name"`
    // Winery that produces wine
    Winery *WineryResponseBodyTiny `form:"winery" json:"winery" xml:"winery"`
}

```
StoredBottleResponseBodyTiny is used to define fields on response body types.










### <a name="StoredBottleResponseBodyTiny.Validate">func</a> (\*StoredBottleResponseBodyTiny) [Validate](/src/target/types.go?s=12947:13011#L368)
``` go
func (body *StoredBottleResponseBodyTiny) Validate() (err error)
```
Validate runs the validations defined on StoredBottleResponseBodyTiny




## <a name="StoredBottleResponseBodyTinyCollection">type</a> [StoredBottleResponseBodyTinyCollection](/src/target/types.go?s=1755:1830#L45)
``` go
type StoredBottleResponseBodyTinyCollection []*StoredBottleResponseBodyTiny
```
StoredBottleResponseBodyTinyCollection is the type of the "storage" service
"list" endpoint HTTP response body.







### <a name="NewStoredBottleResponseBodyTinyCollection">func</a> [NewStoredBottleResponseBodyTinyCollection](/src/target/types.go?s=6350:6480#L148)
``` go
func NewStoredBottleResponseBodyTinyCollection(res storageviews.StoredBottleCollectionView) StoredBottleResponseBodyTinyCollection
```
NewStoredBottleResponseBodyTinyCollection builds the HTTP response body from
the result of the "list" endpoint of the "storage" service.





## <a name="WineryRequestBody">type</a> [WineryRequestBody](/src/target/types.go?s=4461:4919#L111)
``` go
type WineryRequestBody struct {
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
WineryRequestBody is used to define fields on request body types.










### <a name="WineryRequestBody.Validate">func</a> (\*WineryRequestBody) [Validate](/src/target/types.go?s=14111:14164#L398)
``` go
func (body *WineryRequestBody) Validate() (err error)
```
Validate runs the validations defined on WineryRequestBody




## <a name="WineryResponseBodyTiny">type</a> [WineryResponseBodyTiny](/src/target/types.go?s=3945:4052#L97)
``` go
type WineryResponseBodyTiny struct {
    // Name of winery
    Name string `form:"name" json:"name" xml:"name"`
}

```
WineryResponseBodyTiny is used to define fields on response body types.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
