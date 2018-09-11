+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/chatter/gen/http/chatter/client"
+++


# client
`import "github.com/goadesign/goa/examples/chatter/gen/http/chatter/client"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func BuildEchoerPayload(chatterEchoerToken string) (*chattersvc.EchoerPayload, error)](#BuildEchoerPayload)
* [func BuildHistoryPayload(chatterHistoryView string, chatterHistoryToken string) (*chattersvc.HistoryPayload, error)](#BuildHistoryPayload)
* [func BuildListenerPayload(chatterListenerToken string) (*chattersvc.ListenerPayload, error)](#BuildListenerPayload)
* [func BuildLoginPayload(chatterLoginUser string, chatterLoginPassword string) (*chattersvc.LoginPayload, error)](#BuildLoginPayload)
* [func BuildSummaryPayload(chatterSummaryToken string) (*chattersvc.SummaryPayload, error)](#BuildSummaryPayload)
* [func DecodeEchoerResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeEchoerResponse)
* [func DecodeHistoryResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeHistoryResponse)
* [func DecodeListenerResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeListenerResponse)
* [func DecodeLoginResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeLoginResponse)
* [func DecodeSummaryResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)](#DecodeSummaryResponse)
* [func EchoerChatterPath() string](#EchoerChatterPath)
* [func EncodeEchoerRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeEchoerRequest)
* [func EncodeHistoryRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeHistoryRequest)
* [func EncodeListenerRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeListenerRequest)
* [func EncodeLoginRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeLoginRequest)
* [func EncodeSummaryRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error](#EncodeSummaryRequest)
* [func HistoryChatterPath() string](#HistoryChatterPath)
* [func ListenerChatterPath() string](#ListenerChatterPath)
* [func LoginChatterPath() string](#LoginChatterPath)
* [func NewEchoerInvalidScopes(body EchoerInvalidScopesResponseBody) chattersvc.InvalidScopes](#NewEchoerInvalidScopes)
* [func NewEchoerUnauthorized(body EchoerUnauthorizedResponseBody) chattersvc.Unauthorized](#NewEchoerUnauthorized)
* [func NewHistoryChatSummaryOK(body *HistoryResponseBody) *chattersvcviews.ChatSummaryView](#NewHistoryChatSummaryOK)
* [func NewHistoryInvalidScopes(body HistoryInvalidScopesResponseBody) chattersvc.InvalidScopes](#NewHistoryInvalidScopes)
* [func NewHistoryUnauthorized(body HistoryUnauthorizedResponseBody) chattersvc.Unauthorized](#NewHistoryUnauthorized)
* [func NewListenerInvalidScopes(body ListenerInvalidScopesResponseBody) chattersvc.InvalidScopes](#NewListenerInvalidScopes)
* [func NewListenerUnauthorized(body ListenerUnauthorizedResponseBody) chattersvc.Unauthorized](#NewListenerUnauthorized)
* [func NewLoginUnauthorized(body LoginUnauthorizedResponseBody) chattersvc.Unauthorized](#NewLoginUnauthorized)
* [func NewSummaryChatSummaryCollectionOK(body SummaryResponseBody) chattersvcviews.ChatSummaryCollectionView](#NewSummaryChatSummaryCollectionOK)
* [func NewSummaryInvalidScopes(body SummaryInvalidScopesResponseBody) chattersvc.InvalidScopes](#NewSummaryInvalidScopes)
* [func NewSummaryUnauthorized(body SummaryUnauthorizedResponseBody) chattersvc.Unauthorized](#NewSummaryUnauthorized)
* [func SummaryChatterPath() string](#SummaryChatterPath)
* [type ChatSummaryResponseBody](#ChatSummaryResponseBody)
  * [func (body *ChatSummaryResponseBody) Validate() (err error)](#ChatSummaryResponseBody.Validate)
* [type Client](#Client)
  * [func NewClient(scheme string, host string, doer goahttp.Doer, enc func(*http.Request) goahttp.Encoder, dec func(*http.Response) goahttp.Decoder, restoreBody bool, dialer goahttp.Dialer, connConfigFn goahttp.ConnConfigureFunc) *Client](#NewClient)
  * [func (c *Client) BuildEchoerRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildEchoerRequest)
  * [func (c *Client) BuildHistoryRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildHistoryRequest)
  * [func (c *Client) BuildListenerRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildListenerRequest)
  * [func (c *Client) BuildLoginRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildLoginRequest)
  * [func (c *Client) BuildSummaryRequest(ctx context.Context, v interface{}) (*http.Request, error)](#Client.BuildSummaryRequest)
  * [func (c *Client) Echoer() goa.Endpoint](#Client.Echoer)
  * [func (c *Client) History() goa.Endpoint](#Client.History)
  * [func (c *Client) Listener() goa.Endpoint](#Client.Listener)
  * [func (c *Client) Login() goa.Endpoint](#Client.Login)
  * [func (c *Client) Summary() goa.Endpoint](#Client.Summary)
* [type EchoerInvalidScopesResponseBody](#EchoerInvalidScopesResponseBody)
* [type EchoerUnauthorizedResponseBody](#EchoerUnauthorizedResponseBody)
* [type HistoryInvalidScopesResponseBody](#HistoryInvalidScopesResponseBody)
* [type HistoryResponseBody](#HistoryResponseBody)
* [type HistoryUnauthorizedResponseBody](#HistoryUnauthorizedResponseBody)
* [type ListenerInvalidScopesResponseBody](#ListenerInvalidScopesResponseBody)
* [type ListenerUnauthorizedResponseBody](#ListenerUnauthorizedResponseBody)
* [type LoginUnauthorizedResponseBody](#LoginUnauthorizedResponseBody)
* [type SummaryInvalidScopesResponseBody](#SummaryInvalidScopesResponseBody)
* [type SummaryResponseBody](#SummaryResponseBody)
* [type SummaryUnauthorizedResponseBody](#SummaryUnauthorizedResponseBody)


#### <a name="pkg-files">Package files</a>
[cli.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/client/cli.go) [client.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/client/client.go) [encode_decode.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/client/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/client/paths.go) [types.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/client/types.go) 





## <a name="BuildEchoerPayload">func</a> [BuildEchoerPayload](/src/target/cli.go?s=812:897#L35)
``` go
func BuildEchoerPayload(chatterEchoerToken string) (*chattersvc.EchoerPayload, error)
```
BuildEchoerPayload builds the payload for the chatter echoer endpoint from
CLI flags.



## <a name="BuildHistoryPayload">func</a> [BuildHistoryPayload](/src/target/cli.go?s=1780:1895#L74)
``` go
func BuildHistoryPayload(chatterHistoryView string, chatterHistoryToken string) (*chattersvc.HistoryPayload, error)
```
BuildHistoryPayload builds the payload for the chatter history endpoint from
CLI flags.



## <a name="BuildListenerPayload">func</a> [BuildListenerPayload](/src/target/cli.go?s=1131:1222#L48)
``` go
func BuildListenerPayload(chatterListenerToken string) (*chattersvc.ListenerPayload, error)
```
BuildListenerPayload builds the payload for the chatter listener endpoint
from CLI flags.



## <a name="BuildLoginPayload">func</a> [BuildLoginPayload](/src/target/cli.go?s=392:502#L17)
``` go
func BuildLoginPayload(chatterLoginUser string, chatterLoginPassword string) (*chattersvc.LoginPayload, error)
```
BuildLoginPayload builds the payload for the chatter login endpoint from CLI
flags.



## <a name="BuildSummaryPayload">func</a> [BuildSummaryPayload](/src/target/cli.go?s=1458:1546#L61)
``` go
func BuildSummaryPayload(chatterSummaryToken string) (*chattersvc.SummaryPayload, error)
```
BuildSummaryPayload builds the payload for the chatter summary endpoint from
CLI flags.



## <a name="DecodeEchoerResponse">func</a> [DecodeEchoerResponse](/src/target/encode_decode.go?s=4438:4569#L139)
``` go
func DecodeEchoerResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeEchoerResponse returns a decoder for responses returned by the chatter
echoer endpoint. restoreBody controls whether the response body should be
restored after having been read.
DecodeEchoerResponse may return the following errors:


	- "invalid-scopes" (type chattersvc.InvalidScopes): http.StatusForbidden
	- "unauthorized" (type chattersvc.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="DecodeHistoryResponse">func</a> [DecodeHistoryResponse](/src/target/encode_decode.go?s=13529:13661#L415)
``` go
func DecodeHistoryResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeHistoryResponse returns a decoder for responses returned by the
chatter history endpoint. restoreBody controls whether the response body
should be restored after having been read.
DecodeHistoryResponse may return the following errors:


	- "invalid-scopes" (type chattersvc.InvalidScopes): http.StatusForbidden
	- "unauthorized" (type chattersvc.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="DecodeListenerResponse">func</a> [DecodeListenerResponse](/src/target/encode_decode.go?s=7389:7522#L230)
``` go
func DecodeListenerResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeListenerResponse returns a decoder for responses returned by the
chatter listener endpoint. restoreBody controls whether the response body
should be restored after having been read.
DecodeListenerResponse may return the following errors:


	- "invalid-scopes" (type chattersvc.InvalidScopes): http.StatusForbidden
	- "unauthorized" (type chattersvc.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="DecodeLoginResponse">func</a> [DecodeLoginResponse](/src/target/encode_decode.go?s=1792:1922#L58)
``` go
func DecodeLoginResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeLoginResponse returns a decoder for responses returned by the chatter
login endpoint. restoreBody controls whether the response body should be
restored after having been read.
DecodeLoginResponse may return the following errors:


	- "unauthorized" (type chattersvc.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="DecodeSummaryResponse">func</a> [DecodeSummaryResponse](/src/target/encode_decode.go?s=10168:10300#L313)
``` go
func DecodeSummaryResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error)
```
DecodeSummaryResponse returns a decoder for responses returned by the
chatter summary endpoint. restoreBody controls whether the response body
should be restored after having been read.
DecodeSummaryResponse may return the following errors:


	- "invalid-scopes" (type chattersvc.InvalidScopes): http.StatusForbidden
	- "unauthorized" (type chattersvc.Unauthorized): http.StatusUnauthorized
	- error: internal error



## <a name="EchoerChatterPath">func</a> [EchoerChatterPath](/src/target/paths.go?s=473:504#L17)
``` go
func EchoerChatterPath() string
```
EchoerChatterPath returns the URL path to the chatter service echoer HTTP endpoint.



## <a name="EncodeEchoerRequest">func</a> [EncodeEchoerRequest](/src/target/encode_decode.go?s=3530:3638#L117)
``` go
func EncodeEchoerRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeEchoerRequest returns an encoder for requests sent to the chatter
echoer server.



## <a name="EncodeHistoryRequest">func</a> [EncodeHistoryRequest](/src/target/encode_decode.go?s=12493:12602#L388)
``` go
func EncodeHistoryRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeHistoryRequest returns an encoder for requests sent to the chatter
history server.



## <a name="EncodeListenerRequest">func</a> [EncodeListenerRequest](/src/target/encode_decode.go?s=6467:6577#L208)
``` go
func EncodeListenerRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeListenerRequest returns an encoder for requests sent to the chatter
listener server.



## <a name="EncodeLoginRequest">func</a> [EncodeLoginRequest](/src/target/encode_decode.go?s=1080:1187#L41)
``` go
func EncodeLoginRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeLoginRequest returns an encoder for requests sent to the chatter login
server.



## <a name="EncodeSummaryRequest">func</a> [EncodeSummaryRequest](/src/target/encode_decode.go?s=9253:9362#L291)
``` go
func EncodeSummaryRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error
```
EncodeSummaryRequest returns an encoder for requests sent to the chatter
summary server.



## <a name="HistoryChatterPath">func</a> [HistoryChatterPath](/src/target/paths.go?s=913:945#L32)
``` go
func HistoryChatterPath() string
```
HistoryChatterPath returns the URL path to the chatter service history HTTP endpoint.



## <a name="ListenerChatterPath">func</a> [ListenerChatterPath](/src/target/paths.go?s=619:652#L22)
``` go
func ListenerChatterPath() string
```
ListenerChatterPath returns the URL path to the chatter service listener HTTP endpoint.



## <a name="LoginChatterPath">func</a> [LoginChatterPath](/src/target/paths.go?s=333:363#L12)
``` go
func LoginChatterPath() string
```
LoginChatterPath returns the URL path to the chatter service login HTTP endpoint.



## <a name="NewEchoerInvalidScopes">func</a> [NewEchoerInvalidScopes](/src/target/types.go?s=3552:3642#L87)
``` go
func NewEchoerInvalidScopes(body EchoerInvalidScopesResponseBody) chattersvc.InvalidScopes
```
NewEchoerInvalidScopes builds a chatter service echoer endpoint
invalid-scopes error.



## <a name="NewEchoerUnauthorized">func</a> [NewEchoerUnauthorized](/src/target/types.go?s=3784:3871#L94)
``` go
func NewEchoerUnauthorized(body EchoerUnauthorizedResponseBody) chattersvc.Unauthorized
```
NewEchoerUnauthorized builds a chatter service echoer endpoint unauthorized
error.



## <a name="NewHistoryChatSummaryOK">func</a> [NewHistoryChatSummaryOK](/src/target/types.go?s=5434:5522#L143)
``` go
func NewHistoryChatSummaryOK(body *HistoryResponseBody) *chattersvcviews.ChatSummaryView
```
NewHistoryChatSummaryOK builds a "chatter" service "history" endpoint result
from a HTTP "OK" response.



## <a name="NewHistoryInvalidScopes">func</a> [NewHistoryInvalidScopes](/src/target/types.go?s=5748:5840#L154)
``` go
func NewHistoryInvalidScopes(body HistoryInvalidScopesResponseBody) chattersvc.InvalidScopes
```
NewHistoryInvalidScopes builds a chatter service history endpoint
invalid-scopes error.



## <a name="NewHistoryUnauthorized">func</a> [NewHistoryUnauthorized](/src/target/types.go?s=5984:6073#L161)
``` go
func NewHistoryUnauthorized(body HistoryUnauthorizedResponseBody) chattersvc.Unauthorized
```
NewHistoryUnauthorized builds a chatter service history endpoint
unauthorized error.



## <a name="NewListenerInvalidScopes">func</a> [NewListenerInvalidScopes](/src/target/types.go?s=4019:4113#L101)
``` go
func NewListenerInvalidScopes(body ListenerInvalidScopesResponseBody) chattersvc.InvalidScopes
```
NewListenerInvalidScopes builds a chatter service listener endpoint
invalid-scopes error.



## <a name="NewListenerUnauthorized">func</a> [NewListenerUnauthorized](/src/target/types.go?s=4259:4350#L108)
``` go
func NewListenerUnauthorized(body ListenerUnauthorizedResponseBody) chattersvc.Unauthorized
```
NewListenerUnauthorized builds a chatter service listener endpoint
unauthorized error.



## <a name="NewLoginUnauthorized">func</a> [NewLoginUnauthorized](/src/target/types.go?s=3323:3408#L80)
``` go
func NewLoginUnauthorized(body LoginUnauthorizedResponseBody) chattersvc.Unauthorized
```
NewLoginUnauthorized builds a chatter service login endpoint unauthorized
error.



## <a name="NewSummaryChatSummaryCollectionOK">func</a> [NewSummaryChatSummaryCollectionOK](/src/target/types.go?s=4522:4628#L115)
``` go
func NewSummaryChatSummaryCollectionOK(body SummaryResponseBody) chattersvcviews.ChatSummaryCollectionView
```
NewSummaryChatSummaryCollectionOK builds a "chatter" service "summary"
endpoint result from a HTTP "OK" response.



## <a name="NewSummaryInvalidScopes">func</a> [NewSummaryInvalidScopes](/src/target/types.go?s=4947:5039#L129)
``` go
func NewSummaryInvalidScopes(body SummaryInvalidScopesResponseBody) chattersvc.InvalidScopes
```
NewSummaryInvalidScopes builds a chatter service summary endpoint
invalid-scopes error.



## <a name="NewSummaryUnauthorized">func</a> [NewSummaryUnauthorized](/src/target/types.go?s=5183:5272#L136)
``` go
func NewSummaryUnauthorized(body SummaryUnauthorizedResponseBody) chattersvc.Unauthorized
```
NewSummaryUnauthorized builds a chatter service summary endpoint
unauthorized error.



## <a name="SummaryChatterPath">func</a> [SummaryChatterPath](/src/target/paths.go?s=767:799#L27)
``` go
func SummaryChatterPath() string
```
SummaryChatterPath returns the URL path to the chatter service summary HTTP endpoint.




## <a name="ChatSummaryResponseBody">type</a> [ChatSummaryResponseBody](/src/target/types.go?s=2823:3234#L69)
``` go
type ChatSummaryResponseBody struct {
    // Message sent to the server
    Message *string `form:"message,omitempty" json:"message,omitempty" xml:"message,omitempty"`
    // Length of the message sent
    Length *int `form:"length,omitempty" json:"length,omitempty" xml:"length,omitempty"`
    // Time at which the message was sent
    SentAt *string `form:"sent_at,omitempty" json:"sent_at,omitempty" xml:"sent_at,omitempty"`
}

```
ChatSummaryResponseBody is used to define fields on response body types.










### <a name="ChatSummaryResponseBody.Validate">func</a> (\*ChatSummaryResponseBody) [Validate](/src/target/types.go?s=6193:6252#L167)
``` go
func (body *ChatSummaryResponseBody) Validate() (err error)
```
Validate runs the validations defined on ChatSummaryResponseBody




## <a name="Client">type</a> [Client](/src/target/client.go?s=535:1469#L24)
``` go
type Client struct {
    // Login Doer is the HTTP client used to make requests to the login endpoint.
    LoginDoer goahttp.Doer

    // Echoer Doer is the HTTP client used to make requests to the echoer endpoint.
    EchoerDoer goahttp.Doer

    // Listener Doer is the HTTP client used to make requests to the listener
    // endpoint.
    ListenerDoer goahttp.Doer

    // Summary Doer is the HTTP client used to make requests to the summary
    // endpoint.
    SummaryDoer goahttp.Doer

    // History Doer is the HTTP client used to make requests to the history
    // endpoint.
    HistoryDoer goahttp.Doer

    // RestoreResponseBody controls whether the response bodies are reset after
    // decoding so they can be read again.
    RestoreResponseBody bool
    // contains filtered or unexported fields
}

```
Client lists the chatter service endpoint HTTP clients.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=2407:2651#L84)
``` go
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
    dialer goahttp.Dialer,
    connConfigFn goahttp.ConnConfigureFunc,
) *Client
```
NewClient instantiates HTTP clients for all the chatter service servers.





### <a name="Client.BuildEchoerRequest">func</a> (\*Client) [BuildEchoerRequest](/src/target/encode_decode.go?s=3053:3147#L102)
``` go
func (c *Client) BuildEchoerRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildEchoerRequest instantiates a HTTP request object with method and path
set to call the "chatter" service "echoer" endpoint




### <a name="Client.BuildHistoryRequest">func</a> (\*Client) [BuildHistoryRequest](/src/target/encode_decode.go?s=12011:12106#L373)
``` go
func (c *Client) BuildHistoryRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildHistoryRequest instantiates a HTTP request object with method and path
set to call the "chatter" service "history" endpoint




### <a name="Client.BuildListenerRequest">func</a> (\*Client) [BuildListenerRequest](/src/target/encode_decode.go?s=5980:6076#L193)
``` go
func (c *Client) BuildListenerRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildListenerRequest instantiates a HTTP request object with method and path
set to call the "chatter" service "listener" endpoint




### <a name="Client.BuildLoginRequest">func</a> (\*Client) [BuildLoginRequest](/src/target/encode_decode.go?s=603:696#L26)
``` go
func (c *Client) BuildLoginRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildLoginRequest instantiates a HTTP request object with method and path
set to call the "chatter" service "login" endpoint




### <a name="Client.BuildSummaryRequest">func</a> (\*Client) [BuildSummaryRequest](/src/target/encode_decode.go?s=8771:8866#L276)
``` go
func (c *Client) BuildSummaryRequest(ctx context.Context, v interface{}) (*http.Request, error)
```
BuildSummaryRequest instantiates a HTTP request object with method and path
set to call the "chatter" service "summary" endpoint




### <a name="Client.Echoer">func</a> (\*Client) [Echoer](/src/target/client.go?s=3788:3826#L137)
``` go
func (c *Client) Echoer() goa.Endpoint
```
Echoer returns an endpoint that makes HTTP requests to the chatter service
echoer server.




### <a name="Client.History">func</a> (\*Client) [History](/src/target/client.go?s=8765:8804#L318)
``` go
func (c *Client) History() goa.Endpoint
```
History returns an endpoint that makes HTTP requests to the chatter service
history server.




### <a name="Client.Listener">func</a> (\*Client) [Listener](/src/target/client.go?s=5465:5505#L203)
``` go
func (c *Client) Listener() goa.Endpoint
```
Listener returns an endpoint that makes HTTP requests to the chatter service
listener server.




### <a name="Client.Login">func</a> (\*Client) [Login](/src/target/client.go?s=3136:3173#L112)
``` go
func (c *Client) Login() goa.Endpoint
```
Login returns an endpoint that makes HTTP requests to the chatter service
login server.




### <a name="Client.Summary">func</a> (\*Client) [Summary](/src/target/client.go?s=6792:6831#L251)
``` go
func (c *Client) Summary() goa.Endpoint
```
Summary returns an endpoint that makes HTTP requests to the chatter service
summary server.




## <a name="EchoerInvalidScopesResponseBody">type</a> [EchoerInvalidScopesResponseBody](/src/target/types.go?s=1371:1414#L38)
``` go
type EchoerInvalidScopesResponseBody string
```
EchoerInvalidScopesResponseBody is the type of the "chatter" service
"echoer" endpoint HTTP response body for the "invalid-scopes" error.










## <a name="EchoerUnauthorizedResponseBody">type</a> [EchoerUnauthorizedResponseBody](/src/target/types.go?s=1557:1599#L42)
``` go
type EchoerUnauthorizedResponseBody string
```
EchoerUnauthorizedResponseBody is the type of the "chatter" service "echoer"
endpoint HTTP response body for the "unauthorized" error.










## <a name="HistoryInvalidScopesResponseBody">type</a> [HistoryInvalidScopesResponseBody](/src/target/types.go?s=2513:2557#L62)
``` go
type HistoryInvalidScopesResponseBody string
```
HistoryInvalidScopesResponseBody is the type of the "chatter" service
"history" endpoint HTTP response body for the "invalid-scopes" error.










## <a name="HistoryResponseBody">type</a> [HistoryResponseBody](/src/target/types.go?s=636:1043#L23)
``` go
type HistoryResponseBody struct {
    // Message sent to the server
    Message *string `form:"message,omitempty" json:"message,omitempty" xml:"message,omitempty"`
    // Length of the message sent
    Length *int `form:"length,omitempty" json:"length,omitempty" xml:"length,omitempty"`
    // Time at which the message was sent
    SentAt *string `form:"sent_at,omitempty" json:"sent_at,omitempty" xml:"sent_at,omitempty"`
}

```
HistoryResponseBody is the type of the "chatter" service "history" endpoint
HTTP response body.










## <a name="HistoryUnauthorizedResponseBody">type</a> [HistoryUnauthorizedResponseBody](/src/target/types.go?s=2702:2745#L66)
``` go
type HistoryUnauthorizedResponseBody string
```
HistoryUnauthorizedResponseBody is the type of the "chatter" service
"history" endpoint HTTP response body for the "unauthorized" error.










## <a name="ListenerInvalidScopesResponseBody">type</a> [ListenerInvalidScopesResponseBody](/src/target/types.go?s=1749:1794#L46)
``` go
type ListenerInvalidScopesResponseBody string
```
ListenerInvalidScopesResponseBody is the type of the "chatter" service
"listener" endpoint HTTP response body for the "invalid-scopes" error.










## <a name="ListenerUnauthorizedResponseBody">type</a> [ListenerUnauthorizedResponseBody](/src/target/types.go?s=1941:1985#L50)
``` go
type ListenerUnauthorizedResponseBody string
```
ListenerUnauthorizedResponseBody is the type of the "chatter" service
"listener" endpoint HTTP response body for the "unauthorized" error.










## <a name="LoginUnauthorizedResponseBody">type</a> [LoginUnauthorizedResponseBody](/src/target/types.go?s=1184:1225#L34)
``` go
type LoginUnauthorizedResponseBody string
```
LoginUnauthorizedResponseBody is the type of the "chatter" service "login"
endpoint HTTP response body for the "unauthorized" error.










## <a name="SummaryInvalidScopesResponseBody">type</a> [SummaryInvalidScopesResponseBody](/src/target/types.go?s=2133:2177#L54)
``` go
type SummaryInvalidScopesResponseBody string
```
SummaryInvalidScopesResponseBody is the type of the "chatter" service
"summary" endpoint HTTP response body for the "invalid-scopes" error.










## <a name="SummaryResponseBody">type</a> [SummaryResponseBody](/src/target/types.go?s=481:532#L19)
``` go
type SummaryResponseBody []*ChatSummaryResponseBody
```
SummaryResponseBody is the type of the "chatter" service "summary" endpoint
HTTP response body.










## <a name="SummaryUnauthorizedResponseBody">type</a> [SummaryUnauthorizedResponseBody](/src/target/types.go?s=2322:2365#L58)
``` go
type SummaryUnauthorizedResponseBody string
```
SummaryUnauthorizedResponseBody is the type of the "chatter" service
"summary" endpoint HTTP response body for the "unauthorized" error.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
