+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar/gen/http/storage/client"
+++


# client
`import "github.com/goadesign/goa/examples/cellar/gen/http/storage/client"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func AddStoragePath() string](#AddStoragePath)
* [func BuildAddPayload(storageAddBody string) (*storage.Bottle, error)](#BuildAddPayload)
* [func BuildMultiAddPayload(storageMultiAddBody string) ([]*storage.Bottle, error)](#BuildMultiAddPayload)
* [func BuildMultiUpdatePayload(storageMultiUpdateBody string, storageMultiUpdateIds string) (*storage.MultiUpdatePayload, error)](#BuildMultiUpdatePayload)
* [func BuildRemovePayload(storageRemoveID string) (*storage.RemovePayload, error)](#BuildRemovePayload)
* [func BuildShowPayload(storageShowID string, storageShowView string) (*storage.ShowPayload, error)](#BuildShowPayload)
* [func DecodeAddResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeAddResponse)
* [func DecodeListResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeListResponse)
* [func DecodeMultiAddResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeMultiAddResponse)
* [func DecodeMultiUpdateResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeMultiUpdateResponse)
* [func DecodeRateResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeRateResponse)
* [func DecodeRemoveResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeRemoveResponse)
* [func DecodeShowResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeShowResponse)
* [func EncodeAddRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeAddRequest)
* [func EncodeMultiAddRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeMultiAddRequest)
* [func EncodeMultiUpdateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeMultiUpdateRequest)
* [func EncodeRateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeRateRequest)
* [func EncodeShowRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeShowRequest)
* [func ListStoragePath() string](#ListStoragePath)
* [func MultiAddStoragePath() string](#MultiAddStoragePath)
* [func MultiUpdateStoragePath() string](#MultiUpdateStoragePath)
* [func NewListStoredBottleCollectionOK(body ListResponseBody) storageviews.StoredBottleCollectionView](#NewListStoredBottleCollectionOK)
* [func NewShowNotFound(body *ShowNotFoundResponseBody) *storage.NotFound](#NewShowNotFound)
* [func NewShowStoredBottleOK(body *ShowResponseBody) *storageviews.StoredBottleView](#NewShowStoredBottleOK)
* [func NewStorageMultiAddEncoder(encoderFn StorageMultiAddEncoderFunc) func(r *http.Request) goahttp.Encoder](#NewStorageMultiAddEncoder)
* [func NewStorageMultiUpdateEncoder(encoderFn StorageMultiUpdateEncoderFunc) func(r *http.Request) goahttp.Encoder](#NewStorageMultiUpdateEncoder)
* [func RateStoragePath() string](#RateStoragePath)
* [func RemoveStoragePath(id string) string](#RemoveStoragePath)
* [func ShowStoragePath(id string) string](#ShowStoragePath)
* [type AddRequestBody](#AddRequestBody)
  * [func NewAddRequestBody(p *storage.Bottle) *AddRequestBody](#NewAddRequestBody)
* [type BottleRequestBody](#BottleRequestBody)
  * [func NewBottleRequestBody(p []*storage.Bottle) []*BottleRequestBody](#NewBottleRequestBody)
  * [func (body *BottleRequestBody) Validate() (err error)](#BottleRequestBody.Validate)
* [type Client](#Client)
  * [func NewClient(scheme string, host string, doer goahttp.Doer, enc func(*http.Request) goahttp.Encoder, dec func(*http.Response) goahttp.Decoder, restoreBody bool) *Client](#NewClient)
  * [func (c *Client) Add() goa.Endpoint](#Client.Add)
  * [func (c *Client) BuildAddRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildAddRequest)
  * [func (c *Client) BuildListRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildListRequest)
  * [func (c *Client) BuildMultiAddRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildMultiAddRequest)
  * [func (c *Client) BuildMultiUpdateRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildMultiUpdateRequest)
  * [func (c *Client) BuildRateRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildRateRequest)
  * [func (c *Client) BuildRemoveRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildRemoveRequest)
  * [func (c *Client) BuildShowRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildShowRequest)
  * [func (c *Client) List() goa.Endpoint](#Client.List)
  * [func (c *Client) MultiAdd(storageMultiAddEncoderFn StorageMultiAddEncoderFunc) goa.Endpoint](#Client.MultiAdd)
  * [func (c *Client) MultiUpdate(storageMultiUpdateEncoderFn StorageMultiUpdateEncoderFunc) goa.Endpoint](#Client.MultiUpdate)
  * [func (c *Client) Rate() goa.Endpoint](#Client.Rate)
  * [func (c *Client) Remove() goa.Endpoint](#Client.Remove)
  * [func (c *Client) Show() goa.Endpoint](#Client.Show)
* [type ComponentRequestBody](#ComponentRequestBody)
  * [func (body *ComponentRequestBody) Validate() (err error)](#ComponentRequestBody.Validate)
* [type ComponentResponseBody](#ComponentResponseBody)
  * [func (body *ComponentResponseBody) Validate() (err error)](#ComponentResponseBody.Validate)
* [type ListResponseBody](#ListResponseBody)
* [type MultiUpdateRequestBody](#MultiUpdateRequestBody)
  * [func NewMultiUpdateRequestBody(p *storage.MultiUpdatePayload) *MultiUpdateRequestBody](#NewMultiUpdateRequestBody)
* [type ShowNotFoundResponseBody](#ShowNotFoundResponseBody)
  * [func (body *ShowNotFoundResponseBody) Validate() (err error)](#ShowNotFoundResponseBody.Validate)
* [type ShowResponseBody](#ShowResponseBody)
* [type StorageMultiAddEncoderFunc](#StorageMultiAddEncoderFunc)
* [type StorageMultiUpdateEncoderFunc](#StorageMultiUpdateEncoderFunc)
* [type StoredBottleResponseBody](#StoredBottleResponseBody)
  * [func (body *StoredBottleResponseBody) Validate() (err error)](#StoredBottleResponseBody.Validate)
* [type WineryRequestBody](#WineryRequestBody)
  * [func (body *WineryRequestBody) Validate() (err error)](#WineryRequestBody.Validate)
* [type WineryResponseBody](#WineryResponseBody)
  * [func (body *WineryResponseBody) Validate() (err error)](#WineryResponseBody.Validate)


#### <a name="pkg-files">Package files</a>
[cli.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/client/cli.go) [client.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/client/client.go) [encode_decode.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/client/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/client/paths.go) [types.go](/src/github.com/goadesign/goa/examples/cellar/gen/http/storage/client/types.go) 





## <a name="AddStoragePath">func</a> [AddStoragePath](/src/target/paths.go?s=649:677#L26)
``` go
func AddStoragePath() string
```
AddStoragePath returns the URL path to the storage service add HTTP endpoint.



## <a name="BuildAddPayload">func</a> [BuildAddPayload](/src/target/cli.go?s=846:914#L42)
``` go
func BuildAddPayload(storageAddBody string) (*storage.Bottle, error)
```
BuildAddPayload builds the payload for the storage add endpoint from CLI
flags.



## <a name="BuildMultiAddPayload">func</a> [BuildMultiAddPayload](/src/target/cli.go?s=4213:4293#L132)
``` go
func BuildMultiAddPayload(storageMultiAddBody string) ([]*storage.Bottle, error)
```
BuildMultiAddPayload builds the payload for the storage multi_add endpoint
from CLI flags.



## <a name="BuildMultiUpdatePayload">func</a> [BuildMultiUpdatePayload](/src/target/cli.go?s=8211:8337#L170)
``` go
func BuildMultiUpdatePayload(storageMultiUpdateBody string, storageMultiUpdateIds string) (*storage.MultiUpdatePayload, error)
```
BuildMultiUpdatePayload builds the payload for the storage multi_update
endpoint from CLI flags.



## <a name="BuildRemovePayload">func</a> [BuildRemovePayload](/src/target/cli.go?s=3917:3996#L119)
``` go
func BuildRemovePayload(storageRemoveID string) (*storage.RemovePayload, error)
```
BuildRemovePayload builds the payload for the storage remove endpoint from
CLI flags.



## <a name="BuildShowPayload">func</a> [BuildShowPayload](/src/target/cli.go?s=447:544#L22)
``` go
func BuildShowPayload(storageShowID string, storageShowView string) (*storage.ShowPayload, error)
```
BuildShowPayload builds the payload for the storage show endpoint from CLI
flags.



## <a name="DecodeAddResponse">func</a> [DecodeAddResponse](/src/target/encode_decode.go?s=6587:6715#L215)
``` go
func DecodeAddResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeAddResponse returns a decoder for responses returned by the storage
add endpoint. restoreBody controls whether the response body should be
restored after having been read.



## <a name="DecodeListResponse">func</a> [DecodeListResponse](/src/target/encode_decode.go?s=1180:1309#L43)
``` go
func DecodeListResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeListResponse returns a decoder for responses returned by the storage
list endpoint. restoreBody controls whether the response body should be
restored after having been read.



## <a name="DecodeMultiAddResponse">func</a> [DecodeMultiAddResponse](/src/target/encode_decode.go?s=12946:13079#L413)
``` go
func DecodeMultiAddResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeMultiAddResponse returns a decoder for responses returned by the
storage multi_add endpoint. restoreBody controls whether the response body
should be restored after having been read.



## <a name="DecodeMultiUpdateResponse">func</a> [DecodeMultiUpdateResponse](/src/target/encode_decode.go?s=15912:16048#L501)
``` go
func DecodeMultiUpdateResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeMultiUpdateResponse returns a decoder for responses returned by the
storage multi_update endpoint. restoreBody controls whether the response
body should be restored after having been read.



## <a name="DecodeRateResponse">func</a> [DecodeRateResponse](/src/target/encode_decode.go?s=10374:10503#L338)
``` go
func DecodeRateResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeRateResponse returns a decoder for responses returned by the storage
rate endpoint. restoreBody controls whether the response body should be
restored after having been read.



## <a name="DecodeRemoveResponse">func</a> [DecodeRemoveResponse](/src/target/encode_decode.go?s=8345:8476#L275)
``` go
func DecodeRemoveResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeRemoveResponse returns a decoder for responses returned by the storage
remove endpoint. restoreBody controls whether the response body should be
restored after having been read.



## <a name="DecodeShowResponse">func</a> [DecodeShowResponse](/src/target/encode_decode.go?s=3860:3989#L129)
``` go
func DecodeShowResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeShowResponse returns a decoder for responses returned by the storage
show endpoint. restoreBody controls whether the response body should be
restored after having been read.
DecodeShowResponse may return the following errors:


	- "not_found" (type *storage.NotFound): http.StatusNotFound
	- error: internal error



## <a name="EncodeAddRequest">func</a> [EncodeAddRequest](/src/target/encode_decode.go?s=5953:6058#L198)
``` go
func EncodeAddRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeAddRequest returns an encoder for requests sent to the storage add
server.



## <a name="EncodeMultiAddRequest">func</a> [EncodeMultiAddRequest](/src/target/encode_decode.go?s=11690:11800#L379)
``` go
func EncodeMultiAddRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeMultiAddRequest returns an encoder for requests sent to the storage
multi_add server.



## <a name="EncodeMultiUpdateRequest">func</a> [EncodeMultiUpdateRequest](/src/target/encode_decode.go?s=14470:14583#L462)
``` go
func EncodeMultiUpdateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeMultiUpdateRequest returns an encoder for requests sent to the storage
multi_update server.



## <a name="EncodeRateRequest">func</a> [EncodeRateRequest](/src/target/encode_decode.go?s=9641:9747#L316)
``` go
func EncodeRateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeRateRequest returns an encoder for requests sent to the storage rate
server.



## <a name="EncodeShowRequest">func</a> [EncodeShowRequest](/src/target/encode_decode.go?s=3092:3198#L108)
``` go
func EncodeShowRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeShowRequest returns an encoder for requests sent to the storage show
server.



## <a name="ListStoragePath">func</a> [ListStoragePath](/src/target/paths.go?s=348:377#L16)
``` go
func ListStoragePath() string
```
ListStoragePath returns the URL path to the storage service list HTTP endpoint.



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



## <a name="NewListStoredBottleCollectionOK">func</a> [NewListStoredBottleCollectionOK](/src/target/types.go?s=9222:9321#L232)
``` go
func NewListStoredBottleCollectionOK(body ListResponseBody) storageviews.StoredBottleCollectionView
```
NewListStoredBottleCollectionOK builds a "storage" service "list" endpoint
result from a HTTP "OK" response.



## <a name="NewShowNotFound">func</a> [NewShowNotFound](/src/target/types.go?s=10758:10828#L280)
``` go
func NewShowNotFound(body *ShowNotFoundResponseBody) *storage.NotFound
```
NewShowNotFound builds a storage service show endpoint not_found error.



## <a name="NewShowStoredBottleOK">func</a> [NewShowStoredBottleOK](/src/target/types.go?s=10067:10148#L258)
``` go
func NewShowStoredBottleOK(body *ShowResponseBody) *storageviews.StoredBottleView
```
NewShowStoredBottleOK builds a "storage" service "show" endpoint result from
a HTTP "OK" response.



## <a name="NewStorageMultiAddEncoder">func</a> [NewStorageMultiAddEncoder](/src/target/encode_decode.go?s=12254:12360#L394)
``` go
func NewStorageMultiAddEncoder(encoderFn StorageMultiAddEncoderFunc) func(r *http.Request) goahttp.Encoder
```
NewStorageMultiAddEncoder returns an encoder to encode the multipart request
for the "storage" service "multi_add" endpoint.



## <a name="NewStorageMultiUpdateEncoder">func</a> [NewStorageMultiUpdateEncoder](/src/target/encode_decode.go?s=15198:15310#L482)
``` go
func NewStorageMultiUpdateEncoder(encoderFn StorageMultiUpdateEncoderFunc) func(r *http.Request) goahttp.Encoder
```
NewStorageMultiUpdateEncoder returns an encoder to encode the multipart
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




## <a name="AddRequestBody">type</a> [AddRequestBody](/src/target/types.go?s=478:1232#L21)
``` go
type AddRequestBody struct {
    // Name of bottle
    Name string `form:"name" json:"name" xml:"name"`
    // Winery that produces wine
    Winery *WineryRequestBody `form:"winery" json:"winery" xml:"winery"`
    // Vintage of bottle
    Vintage uint32 `form:"vintage" json:"vintage" xml:"vintage"`
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







### <a name="NewAddRequestBody">func</a> [NewAddRequestBody](/src/target/types.go?s=6773:6830#L151)
``` go
func NewAddRequestBody(p *storage.Bottle) *AddRequestBody
```
NewAddRequestBody builds the HTTP request body from the payload of the "add"
endpoint of the "storage" service.





## <a name="BottleRequestBody">type</a> [BottleRequestBody](/src/target/types.go?s=5896:6653#L134)
``` go
type BottleRequestBody struct {
    // Name of bottle
    Name string `form:"name" json:"name" xml:"name"`
    // Winery that produces wine
    Winery *WineryRequestBody `form:"winery" json:"winery" xml:"winery"`
    // Vintage of bottle
    Vintage uint32 `form:"vintage" json:"vintage" xml:"vintage"`
    // Composition is the list of grape varietals and associated percentage.
    Composition []*ComponentRequestBody `form:"composition,omitempty" json:"composition,omitempty" xml:"composition,omitempty"`
    // Description of bottle
    Description *string `form:"description,omitempty" json:"description,omitempty" xml:"description,omitempty"`
    // Rating of bottle from 1 (worst) to 5 (best)
    Rating *uint32 `form:"rating,omitempty" json:"rating,omitempty" xml:"rating,omitempty"`
}

```
BottleRequestBody is used to define fields on request body types.







### <a name="NewBottleRequestBody">func</a> [NewBottleRequestBody](/src/target/types.go?s=7451:7518#L175)
``` go
func NewBottleRequestBody(p []*storage.Bottle) []*BottleRequestBody
```
NewBottleRequestBody builds the HTTP request body from the payload of the
"multi_add" endpoint of the "storage" service.





### <a name="BottleRequestBody.Validate">func</a> (\*BottleRequestBody) [Validate](/src/target/types.go?s=16119:16172#L437)
``` go
func (body *BottleRequestBody) Validate() (err error)
```
Validate runs the validations defined on BottleRequestBody




## <a name="Client">type</a> [Client](/src/target/client.go?s=440:1482#L22)
``` go
type Client struct {
    // List Doer is the HTTP client used to make requests to the list endpoint.
    ListDoer goahttp.Doer

    // Show Doer is the HTTP client used to make requests to the show endpoint.
    ShowDoer goahttp.Doer

    // Add Doer is the HTTP client used to make requests to the add endpoint.
    AddDoer goahttp.Doer

    // Remove Doer is the HTTP client used to make requests to the remove endpoint.
    RemoveDoer goahttp.Doer

    // Rate Doer is the HTTP client used to make requests to the rate endpoint.
    RateDoer goahttp.Doer

    // MultiAdd Doer is the HTTP client used to make requests to the multi_add
    // endpoint.
    MultiAddDoer goahttp.Doer

    // MultiUpdate Doer is the HTTP client used to make requests to the
    // multi_update endpoint.
    MultiUpdateDoer goahttp.Doer

    // RestoreResponseBody controls whether the response bodies are reset after
    // decoding so they can be read again.
    RestoreResponseBody bool
    // contains filtered or unexported fields
}

```
Client lists the storage service endpoint HTTP clients.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=1985:2164#L65)
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
NewClient instantiates HTTP clients for all the storage service servers.





### <a name="Client.Add">func</a> (\*Client) [Add](/src/target/client.go?s=3800:3835#L136)
``` go
func (c *Client) Add() goa.Endpoint
```
Add returns an endpoint that makes HTTP requests to the storage service add
server.




### <a name="Client.BuildAddRequest">func</a> (\*Client) [BuildAddRequest](/src/target/encode_decode.go?s=5486:5577#L183)
``` go
func (c *Client) BuildAddRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildAddRequest instantiates a HTTP request object with method and path set
to call the "storage" service "add" endpoint




### <a name="Client.BuildListRequest">func</a> (\*Client) [BuildListRequest](/src/target/encode_decode.go?s=609:701#L27)
``` go
func (c *Client) BuildListRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildListRequest instantiates a HTTP request object with method and path set
to call the "storage" service "list" endpoint




### <a name="Client.BuildMultiAddRequest">func</a> (\*Client) [BuildMultiAddRequest](/src/target/encode_decode.go?s=11196:11292#L364)
``` go
func (c *Client) BuildMultiAddRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildMultiAddRequest instantiates a HTTP request object with method and path
set to call the "storage" service "multi_add" endpoint




### <a name="Client.BuildMultiUpdateRequest">func</a> (\*Client) [BuildMultiUpdateRequest](/src/target/encode_decode.go?s=13962:14061#L447)
``` go
func (c *Client) BuildMultiUpdateRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildMultiUpdateRequest instantiates a HTTP request object with method and
path set to call the "storage" service "multi_update" endpoint




### <a name="Client.BuildRateRequest">func</a> (\*Client) [BuildRateRequest](/src/target/encode_decode.go?s=9169:9261#L301)
``` go
func (c *Client) BuildRateRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildRateRequest instantiates a HTTP request object with method and path set
to call the "storage" service "rate" endpoint




### <a name="Client.BuildRemoveRequest">func</a> (\*Client) [BuildRemoveRequest](/src/target/encode_decode.go?s=7578:7672#L249)
``` go
func (c *Client) BuildRemoveRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildRemoveRequest instantiates a HTTP request object with method and path
set to call the "storage" service "remove" endpoint




### <a name="Client.BuildShowRequest">func</a> (\*Client) [BuildShowRequest](/src/target/encode_decode.go?s=2444:2536#L83)
``` go
func (c *Client) BuildShowRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildShowRequest instantiates a HTTP request object with method and path set
to call the "storage" service "show" endpoint




### <a name="Client.List">func</a> (\*Client) [List](/src/target/client.go?s=2637:2673#L91)
``` go
func (c *Client) List() goa.Endpoint
```
List returns an endpoint that makes HTTP requests to the storage service
list server.




### <a name="Client.MultiAdd">func</a> (\*Client) [MultiAdd](/src/target/client.go?s=5624:5715#L206)
``` go
func (c *Client) MultiAdd(storageMultiAddEncoderFn StorageMultiAddEncoderFunc) goa.Endpoint
```
MultiAdd returns an endpoint that makes HTTP requests to the storage service
multi_add server.




### <a name="Client.MultiUpdate">func</a> (\*Client) [MultiUpdate](/src/target/client.go?s=6399:6499#L231)
``` go
func (c *Client) MultiUpdate(storageMultiUpdateEncoderFn StorageMultiUpdateEncoderFunc) goa.Endpoint
```
MultiUpdate returns an endpoint that makes HTTP requests to the storage
service multi_update server.




### <a name="Client.Rate">func</a> (\*Client) [Rate](/src/target/client.go?s=4973:5009#L181)
``` go
func (c *Client) Rate() goa.Endpoint
```
Rate returns an endpoint that makes HTTP requests to the storage service
rate server.




### <a name="Client.Remove">func</a> (\*Client) [Remove](/src/target/client.go?s=4440:4478#L161)
``` go
func (c *Client) Remove() goa.Endpoint
```
Remove returns an endpoint that makes HTTP requests to the storage service
remove server.




### <a name="Client.Show">func</a> (\*Client) [Show](/src/target/client.go?s=3160:3196#L111)
``` go
func (c *Client) Show() goa.Endpoint
```
Show returns an endpoint that makes HTTP requests to the storage service
show server.




## <a name="ComponentRequestBody">type</a> [ComponentRequestBody](/src/target/types.go?s=5564:5825#L126)
``` go
type ComponentRequestBody struct {
    // Grape varietal
    Varietal string `form:"varietal" json:"varietal" xml:"varietal"`
    // Percentage of varietal in wine
    Percentage *uint32 `form:"percentage,omitempty" json:"percentage,omitempty" xml:"percentage,omitempty"`
}

```
ComponentRequestBody is used to define fields on request body types.










### <a name="ComponentRequestBody.Validate">func</a> (\*ComponentRequestBody) [Validate](/src/target/types.go?s=15371:15427#L418)
``` go
func (body *ComponentRequestBody) Validate() (err error)
```
Validate runs the validations defined on ComponentRequestBody




## <a name="ComponentResponseBody">type</a> [ComponentResponseBody](/src/target/types.go?s=4761:5054#L106)
``` go
type ComponentResponseBody struct {
    // Grape varietal
    Varietal *string `form:"varietal,omitempty" json:"varietal,omitempty" xml:"varietal,omitempty"`
    // Percentage of varietal in wine
    Percentage *uint32 `form:"percentage,omitempty" json:"percentage,omitempty" xml:"percentage,omitempty"`
}

```
ComponentResponseBody is used to define fields on response body types.










### <a name="ComponentResponseBody.Validate">func</a> (\*ComponentResponseBody) [Validate](/src/target/types.go?s=13984:14041#L382)
``` go
func (body *ComponentResponseBody) Validate() (err error)
```
Validate runs the validations defined on ComponentResponseBody




## <a name="ListResponseBody">type</a> [ListResponseBody](/src/target/types.go?s=1611:1660#L45)
``` go
type ListResponseBody []*StoredBottleResponseBody
```
ListResponseBody is the type of the "storage" service "list" endpoint HTTP
response body.










## <a name="MultiUpdateRequestBody">type</a> [MultiUpdateRequestBody](/src/target/types.go?s=1343:1513#L38)
``` go
type MultiUpdateRequestBody struct {
    // Array of bottle info that matches the ids attribute
    Bottles []*BottleRequestBody `form:"bottles" json:"bottles" xml:"bottles"`
}

```
MultiUpdateRequestBody is the type of the "storage" service "multi_update"
endpoint HTTP request body.







### <a name="NewMultiUpdateRequestBody">func</a> [NewMultiUpdateRequestBody](/src/target/types.go?s=8269:8354#L202)
``` go
func NewMultiUpdateRequestBody(p *storage.MultiUpdatePayload) *MultiUpdateRequestBody
```
NewMultiUpdateRequestBody builds the HTTP request body from the payload of
the "multi_update" endpoint of the "storage" service.





## <a name="ShowNotFoundResponseBody">type</a> [ShowNotFoundResponseBody](/src/target/types.go?s=2852:3104#L68)
``` go
type ShowNotFoundResponseBody struct {
    // Message of error
    Message *string `form:"message,omitempty" json:"message,omitempty" xml:"message,omitempty"`
    // ID of missing bottle
    ID *string `form:"id,omitempty" json:"id,omitempty" xml:"id,omitempty"`
}

```
ShowNotFoundResponseBody is the type of the "storage" service "show"
endpoint HTTP response body for the "not_found" error.










### <a name="ShowNotFoundResponseBody.Validate">func</a> (\*ShowNotFoundResponseBody) [Validate](/src/target/types.go?s=10988:11048#L289)
``` go
func (body *ShowNotFoundResponseBody) Validate() (err error)
```
Validate runs the validations defined on ShowNotFoundResponseBody




## <a name="ShowResponseBody">type</a> [ShowResponseBody](/src/target/types.go?s=1758:2720#L49)
``` go
type ShowResponseBody struct {
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
ShowResponseBody is the type of the "storage" service "show" endpoint HTTP
response body.










## <a name="StorageMultiAddEncoderFunc">type</a> [StorageMultiAddEncoderFunc](/src/target/client.go?s=1605:1685#L58)
``` go
type StorageMultiAddEncoderFunc func(*multipart.Writer, []*storage.Bottle) error
```
StorageMultiAddEncoderFunc is the type to encode multipart request for the
"storage" service "multi_add" endpoint.










## <a name="StorageMultiUpdateEncoderFunc">type</a> [StorageMultiUpdateEncoderFunc](/src/target/client.go?s=1814:1907#L62)
``` go
type StorageMultiUpdateEncoderFunc func(*multipart.Writer, *storage.MultiUpdatePayload) error
```
StorageMultiUpdateEncoderFunc is the type to encode multipart request for
the "storage" service "multi_update" endpoint.










## <a name="StoredBottleResponseBody">type</a> [StoredBottleResponseBody](/src/target/types.go?s=3183:4153#L76)
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










### <a name="StoredBottleResponseBody.Validate">func</a> (\*StoredBottleResponseBody) [Validate](/src/target/types.go?s=11321:11381#L300)
``` go
func (body *StoredBottleResponseBody) Validate() (err error)
```
Validate runs the validations defined on StoredBottleResponseBody




## <a name="WineryRequestBody">type</a> [WineryRequestBody](/src/target/types.go?s=5125:5490#L114)
``` go
type WineryRequestBody struct {
    // Name of winery
    Name string `form:"name" json:"name" xml:"name"`
    // Region of winery
    Region string `form:"region" json:"region" xml:"region"`
    // Country of winery
    Country string `form:"country" json:"country" xml:"country"`
    // Winery website URL
    URL *string `form:"url,omitempty" json:"url,omitempty" xml:"url,omitempty"`
}

```
WineryRequestBody is used to define fields on request body types.










### <a name="WineryRequestBody.Validate">func</a> (\*WineryRequestBody) [Validate](/src/target/types.go?s=14903:14956#L408)
``` go
func (body *WineryRequestBody) Validate() (err error)
```
Validate runs the validations defined on WineryRequestBody




## <a name="WineryResponseBody">type</a> [WineryResponseBody](/src/target/types.go?s=4226:4685#L94)
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










### <a name="WineryResponseBody.Validate">func</a> (\*WineryResponseBody) [Validate](/src/target/types.go?s=13161:13215#L359)
``` go
func (body *WineryResponseBody) Validate() (err error)
```
Validate runs the validations defined on WineryResponseBody








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
