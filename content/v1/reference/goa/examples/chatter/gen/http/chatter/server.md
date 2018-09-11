+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/chatter/gen/http/chatter/server"
+++


# server
`import "github.com/goadesign/goa/examples/chatter/gen/http/chatter/server"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func DecodeEchoerRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeEchoerRequest)
* [func DecodeHistoryRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeHistoryRequest)
* [func DecodeListenerRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeListenerRequest)
* [func DecodeLoginRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeLoginRequest)
* [func DecodeSummaryRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)](#DecodeSummaryRequest)
* [func EchoerChatterPath() string](#EchoerChatterPath)
* [func EncodeEchoerError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeEchoerError)
* [func EncodeHistoryError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeHistoryError)
* [func EncodeListenerError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeListenerError)
* [func EncodeLoginError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeLoginError)
* [func EncodeLoginResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error](#EncodeLoginResponse)
* [func EncodeSummaryError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error](#EncodeSummaryError)
* [func HistoryChatterPath() string](#HistoryChatterPath)
* [func ListenerChatterPath() string](#ListenerChatterPath)
* [func LoginChatterPath() string](#LoginChatterPath)
* [func Mount(mux goahttp.Muxer, h *Server)](#Mount)
* [func MountEchoerHandler(mux goahttp.Muxer, h http.Handler)](#MountEchoerHandler)
* [func MountHistoryHandler(mux goahttp.Muxer, h http.Handler)](#MountHistoryHandler)
* [func MountListenerHandler(mux goahttp.Muxer, h http.Handler)](#MountListenerHandler)
* [func MountLoginHandler(mux goahttp.Muxer, h http.Handler)](#MountLoginHandler)
* [func MountSummaryHandler(mux goahttp.Muxer, h http.Handler)](#MountSummaryHandler)
* [func NewEchoerHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error), up goahttp.Upgrader, connConfigFn goahttp.ConnConfigureFunc) http.Handler](#NewEchoerHandler)
* [func NewEchoerPayload(token string) *chattersvc.EchoerPayload](#NewEchoerPayload)
* [func NewHistoryHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error), up goahttp.Upgrader, connConfigFn goahttp.ConnConfigureFunc) http.Handler](#NewHistoryHandler)
* [func NewHistoryPayload(view *string, token string) *chattersvc.HistoryPayload](#NewHistoryPayload)
* [func NewListenerHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error), up goahttp.Upgrader, connConfigFn goahttp.ConnConfigureFunc) http.Handler](#NewListenerHandler)
* [func NewListenerPayload(token string) *chattersvc.ListenerPayload](#NewListenerPayload)
* [func NewLoginHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error)) http.Handler](#NewLoginHandler)
* [func NewLoginPayload() *chattersvc.LoginPayload](#NewLoginPayload)
* [func NewSummaryHandler(endpoint goa.Endpoint, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error), up goahttp.Upgrader, connConfigFn goahttp.ConnConfigureFunc) http.Handler](#NewSummaryHandler)
* [func NewSummaryPayload(token string) *chattersvc.SummaryPayload](#NewSummaryPayload)
* [func SummaryChatterPath() string](#SummaryChatterPath)
* [type ChatSummaryResponseBody](#ChatSummaryResponseBody)
  * [func (body *ChatSummaryResponseBody) Validate() (err error)](#ChatSummaryResponseBody.Validate)
* [type ChatSummaryResponseBodyCollection](#ChatSummaryResponseBodyCollection)
  * [func NewChatSummaryResponseBodyCollection(res chattersvcviews.ChatSummaryCollectionView) ChatSummaryResponseBodyCollection](#NewChatSummaryResponseBodyCollection)
* [type EchoerInvalidScopesResponseBody](#EchoerInvalidScopesResponseBody)
  * [func NewEchoerInvalidScopesResponseBody(res chattersvc.InvalidScopes) EchoerInvalidScopesResponseBody](#NewEchoerInvalidScopesResponseBody)
* [type EchoerUnauthorizedResponseBody](#EchoerUnauthorizedResponseBody)
  * [func NewEchoerUnauthorizedResponseBody(res chattersvc.Unauthorized) EchoerUnauthorizedResponseBody](#NewEchoerUnauthorizedResponseBody)
* [type ErrorNamer](#ErrorNamer)
* [type HistoryInvalidScopesResponseBody](#HistoryInvalidScopesResponseBody)
  * [func NewHistoryInvalidScopesResponseBody(res chattersvc.InvalidScopes) HistoryInvalidScopesResponseBody](#NewHistoryInvalidScopesResponseBody)
* [type HistoryResponseBody](#HistoryResponseBody)
  * [func NewHistoryResponseBody(res *chattersvcviews.ChatSummaryView) *HistoryResponseBody](#NewHistoryResponseBody)
* [type HistoryResponseBodyTiny](#HistoryResponseBodyTiny)
  * [func NewHistoryResponseBodyTiny(res *chattersvcviews.ChatSummaryView) *HistoryResponseBodyTiny](#NewHistoryResponseBodyTiny)
* [type HistoryUnauthorizedResponseBody](#HistoryUnauthorizedResponseBody)
  * [func NewHistoryUnauthorizedResponseBody(res chattersvc.Unauthorized) HistoryUnauthorizedResponseBody](#NewHistoryUnauthorizedResponseBody)
* [type ListenerInvalidScopesResponseBody](#ListenerInvalidScopesResponseBody)
  * [func NewListenerInvalidScopesResponseBody(res chattersvc.InvalidScopes) ListenerInvalidScopesResponseBody](#NewListenerInvalidScopesResponseBody)
* [type ListenerUnauthorizedResponseBody](#ListenerUnauthorizedResponseBody)
  * [func NewListenerUnauthorizedResponseBody(res chattersvc.Unauthorized) ListenerUnauthorizedResponseBody](#NewListenerUnauthorizedResponseBody)
* [type LoginUnauthorizedResponseBody](#LoginUnauthorizedResponseBody)
  * [func NewLoginUnauthorizedResponseBody(res chattersvc.Unauthorized) LoginUnauthorizedResponseBody](#NewLoginUnauthorizedResponseBody)
* [type MountPoint](#MountPoint)
* [type Server](#Server)
  * [func New(e *chattersvc.Endpoints, mux goahttp.Muxer, dec func(*http.Request) goahttp.Decoder, enc func(context.Context, http.ResponseWriter) goahttp.Encoder, eh func(context.Context, http.ResponseWriter, error), up goahttp.Upgrader, connConfigFn goahttp.ConnConfigureFunc) *Server](#New)
  * [func (s *Server) Service() string](#Server.Service)
  * [func (s *Server) Use(m func(http.Handler) http.Handler)](#Server.Use)
* [type SummaryInvalidScopesResponseBody](#SummaryInvalidScopesResponseBody)
  * [func NewSummaryInvalidScopesResponseBody(res chattersvc.InvalidScopes) SummaryInvalidScopesResponseBody](#NewSummaryInvalidScopesResponseBody)
* [type SummaryUnauthorizedResponseBody](#SummaryUnauthorizedResponseBody)
  * [func NewSummaryUnauthorizedResponseBody(res chattersvc.Unauthorized) SummaryUnauthorizedResponseBody](#NewSummaryUnauthorizedResponseBody)


#### <a name="pkg-files">Package files</a>
[encode_decode.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/server/encode_decode.go) [paths.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/server/paths.go) [server.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/server/server.go) [types.go](/src/github.com/goadesign/goa/examples/chatter/gen/http/chatter/server/types.go) 





## <a name="DecodeEchoerRequest">func</a> [DecodeEchoerRequest](/src/target/encode_decode.go?s=2209:2338#L74)
``` go
func DecodeEchoerRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeEchoerRequest returns a decoder for requests sent to the chatter
echoer endpoint.



## <a name="DecodeHistoryRequest">func</a> [DecodeHistoryRequest](/src/target/encode_decode.go?s=7581:7711#L242)
``` go
func DecodeHistoryRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeHistoryRequest returns a decoder for requests sent to the chatter
history endpoint.



## <a name="DecodeListenerRequest">func</a> [DecodeListenerRequest](/src/target/encode_decode.go?s=3994:4125#L130)
``` go
func DecodeListenerRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeListenerRequest returns a decoder for requests sent to the chatter
listener endpoint.



## <a name="DecodeLoginRequest">func</a> [DecodeLoginRequest](/src/target/encode_decode.go?s=942:1070#L35)
``` go
func DecodeLoginRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeLoginRequest returns a decoder for requests sent to the chatter login
endpoint.



## <a name="DecodeSummaryRequest">func</a> [DecodeSummaryRequest](/src/target/encode_decode.go?s=5791:5921#L186)
``` go
func DecodeSummaryRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error)
```
DecodeSummaryRequest returns a decoder for requests sent to the chatter
summary endpoint.



## <a name="EchoerChatterPath">func</a> [EchoerChatterPath](/src/target/paths.go?s=473:504#L17)
``` go
func EchoerChatterPath() string
```
EchoerChatterPath returns the URL path to the chatter service echoer HTTP endpoint.



## <a name="EncodeEchoerError">func</a> [EncodeEchoerError](/src/target/encode_decode.go?s=2963:3109#L100)
``` go
func EncodeEchoerError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeEchoerError returns an encoder for errors returned by the echoer
chatter endpoint.



## <a name="EncodeHistoryError">func</a> [EncodeHistoryError](/src/target/encode_decode.go?s=8445:8592#L273)
``` go
func EncodeHistoryError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeHistoryError returns an encoder for errors returned by the history
chatter endpoint.



## <a name="EncodeListenerError">func</a> [EncodeListenerError](/src/target/encode_decode.go?s=4756:4904#L156)
``` go
func EncodeListenerError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeListenerError returns an encoder for errors returned by the listener
chatter endpoint.



## <a name="EncodeLoginError">func</a> [EncodeLoginError](/src/target/encode_decode.go?s=1440:1585#L51)
``` go
func EncodeLoginError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeLoginError returns an encoder for errors returned by the login chatter
endpoint.



## <a name="EncodeLoginResponse">func</a> [EncodeLoginResponse](/src/target/encode_decode.go?s=491:645#L23)
``` go
func EncodeLoginResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error
```
EncodeLoginResponse returns an encoder for responses returned by the chatter
login endpoint.



## <a name="EncodeSummaryError">func</a> [EncodeSummaryError](/src/target/encode_decode.go?s=6549:6696#L212)
``` go
func EncodeSummaryError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error
```
EncodeSummaryError returns an encoder for errors returned by the summary
chatter endpoint.



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



## <a name="Mount">func</a> [Mount](/src/target/server.go?s=4769:4809#L154)
``` go
func Mount(mux goahttp.Muxer, h *Server)
```
Mount configures the mux to serve the chatter endpoints.



## <a name="MountEchoerHandler">func</a> [MountEchoerHandler](/src/target/server.go?s=6502:6560#L214)
``` go
func MountEchoerHandler(mux goahttp.Muxer, h http.Handler)
```
MountEchoerHandler configures the mux to serve the "chatter" service
"echoer" endpoint.



## <a name="MountHistoryHandler">func</a> [MountHistoryHandler](/src/target/server.go?s=11484:11543#L394)
``` go
func MountHistoryHandler(mux goahttp.Muxer, h http.Handler)
```
MountHistoryHandler configures the mux to serve the "chatter" service
"history" endpoint.



## <a name="MountListenerHandler">func</a> [MountListenerHandler](/src/target/server.go?s=8153:8213#L274)
``` go
func MountListenerHandler(mux goahttp.Muxer, h http.Handler)
```
MountListenerHandler configures the mux to serve the "chatter" service
"listener" endpoint.



## <a name="MountLoginHandler">func</a> [MountLoginHandler](/src/target/server.go?s=5088:5145#L164)
``` go
func MountLoginHandler(mux goahttp.Muxer, h http.Handler)
```
MountLoginHandler configures the mux to serve the "chatter" service "login"
endpoint.



## <a name="MountSummaryHandler">func</a> [MountSummaryHandler](/src/target/server.go?s=9824:9883#L334)
``` go
func MountSummaryHandler(mux goahttp.Muxer, h http.Handler)
```
MountSummaryHandler configures the mux to serve the "chatter" service
"summary" endpoint.



## <a name="NewEchoerHandler">func</a> [NewEchoerHandler](/src/target/server.go?s=6847:7153#L226)
``` go
func NewEchoerHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler
```
NewEchoerHandler creates a HTTP handler which loads the HTTP request and
calls the "chatter" service "echoer" endpoint.



## <a name="NewEchoerPayload">func</a> [NewEchoerPayload](/src/target/types.go?s=7538:7599#L188)
``` go
func NewEchoerPayload(token string) *chattersvc.EchoerPayload
```
NewEchoerPayload builds a chatter service echoer endpoint payload.



## <a name="NewHistoryHandler">func</a> [NewHistoryHandler](/src/target/server.go?s=11833:12140#L406)
``` go
func NewHistoryHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler
```
NewHistoryHandler creates a HTTP handler which loads the HTTP request and
calls the "chatter" service "history" endpoint.



## <a name="NewHistoryPayload">func</a> [NewHistoryPayload](/src/target/types.go?s=8128:8205#L209)
``` go
func NewHistoryPayload(view *string, token string) *chattersvc.HistoryPayload
```
NewHistoryPayload builds a chatter service history endpoint payload.



## <a name="NewListenerHandler">func</a> [NewListenerHandler](/src/target/server.go?s=8506:8814#L286)
``` go
func NewListenerHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler
```
NewListenerHandler creates a HTTP handler which loads the HTTP request and
calls the "chatter" service "listener" endpoint.



## <a name="NewListenerPayload">func</a> [NewListenerPayload](/src/target/types.go?s=7733:7798#L195)
``` go
func NewListenerPayload(token string) *chattersvc.ListenerPayload
```
NewListenerPayload builds a chatter service listener endpoint payload.



## <a name="NewLoginHandler">func</a> [NewLoginHandler](/src/target/server.go?s=5430:5672#L176)
``` go
func NewLoginHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler
```
NewLoginHandler creates a HTTP handler which loads the HTTP request and
calls the "chatter" service "login" endpoint.



## <a name="NewLoginPayload">func</a> [NewLoginPayload](/src/target/types.go?s=7380:7427#L183)
``` go
func NewLoginPayload() *chattersvc.LoginPayload
```
NewLoginPayload builds a chatter service login endpoint payload.



## <a name="NewSummaryHandler">func</a> [NewSummaryHandler](/src/target/server.go?s=10173:10480#L346)
``` go
func NewSummaryHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler
```
NewSummaryHandler creates a HTTP handler which loads the HTTP request and
calls the "chatter" service "summary" endpoint.



## <a name="NewSummaryPayload">func</a> [NewSummaryPayload](/src/target/types.go?s=7932:7995#L202)
``` go
func NewSummaryPayload(token string) *chattersvc.SummaryPayload
```
NewSummaryPayload builds a chatter service summary endpoint payload.



## <a name="SummaryChatterPath">func</a> [SummaryChatterPath](/src/target/paths.go?s=767:799#L27)
``` go
func SummaryChatterPath() string
```
SummaryChatterPath returns the URL path to the chatter service summary HTTP endpoint.




## <a name="ChatSummaryResponseBody">type</a> [ChatSummaryResponseBody](/src/target/types.go?s=3060:3440#L76)
``` go
type ChatSummaryResponseBody struct {
    // Message sent to the server
    Message string `form:"message" json:"message" xml:"message"`
    // Length of the message sent
    Length *int `form:"length,omitempty" json:"length,omitempty" xml:"length,omitempty"`
    // Time at which the message was sent
    SentAt *string `form:"sent_at,omitempty" json:"sent_at,omitempty" xml:"sent_at,omitempty"`
}

```
ChatSummaryResponseBody is used to define fields on response body types.










### <a name="ChatSummaryResponseBody.Validate">func</a> (\*ChatSummaryResponseBody) [Validate](/src/target/types.go?s=8349:8408#L217)
``` go
func (body *ChatSummaryResponseBody) Validate() (err error)
```
Validate runs the validations defined on ChatSummaryResponseBody




## <a name="ChatSummaryResponseBodyCollection">type</a> [ChatSummaryResponseBodyCollection](/src/target/types.go?s=495:560#L19)
``` go
type ChatSummaryResponseBodyCollection []*ChatSummaryResponseBody
```
ChatSummaryResponseBodyCollection is the type of the "chatter" service
"summary" endpoint HTTP response body.







### <a name="NewChatSummaryResponseBodyCollection">func</a> [NewChatSummaryResponseBodyCollection](/src/target/types.go?s=3583:3705#L87)
``` go
func NewChatSummaryResponseBodyCollection(res chattersvcviews.ChatSummaryCollectionView) ChatSummaryResponseBodyCollection
```
NewChatSummaryResponseBodyCollection builds the HTTP response body from the
result of the "summary" endpoint of the "chatter" service.





## <a name="EchoerInvalidScopesResponseBody">type</a> [EchoerInvalidScopesResponseBody](/src/target/types.go?s=1608:1651#L45)
``` go
type EchoerInvalidScopesResponseBody string
```
EchoerInvalidScopesResponseBody is the type of the "chatter" service
"echoer" endpoint HTTP response body for the "invalid-scopes" error.







### <a name="NewEchoerInvalidScopesResponseBody">func</a> [NewEchoerInvalidScopesResponseBody](/src/target/types.go?s=4998:5099#L128)
``` go
func NewEchoerInvalidScopesResponseBody(res chattersvc.InvalidScopes) EchoerInvalidScopesResponseBody
```
NewEchoerInvalidScopesResponseBody builds the HTTP response body from the
result of the "echoer" endpoint of the "chatter" service.





## <a name="EchoerUnauthorizedResponseBody">type</a> [EchoerUnauthorizedResponseBody](/src/target/types.go?s=1794:1836#L49)
``` go
type EchoerUnauthorizedResponseBody string
```
EchoerUnauthorizedResponseBody is the type of the "chatter" service "echoer"
endpoint HTTP response body for the "unauthorized" error.







### <a name="NewEchoerUnauthorizedResponseBody">func</a> [NewEchoerUnauthorizedResponseBody](/src/target/types.go?s=5301:5399#L135)
``` go
func NewEchoerUnauthorizedResponseBody(res chattersvc.Unauthorized) EchoerUnauthorizedResponseBody
```
NewEchoerUnauthorizedResponseBody builds the HTTP response body from the
result of the "echoer" endpoint of the "chatter" service.





## <a name="ErrorNamer">type</a> [ErrorNamer](/src/target/server.go?s=769:818#L36)
``` go
type ErrorNamer interface {
    ErrorName() string
}
```
ErrorNamer is an interface implemented by generated error structs that
exposes the name of the error as defined in the design.










## <a name="HistoryInvalidScopesResponseBody">type</a> [HistoryInvalidScopesResponseBody](/src/target/types.go?s=2750:2794#L69)
``` go
type HistoryInvalidScopesResponseBody string
```
HistoryInvalidScopesResponseBody is the type of the "chatter" service
"history" endpoint HTTP response body for the "invalid-scopes" error.







### <a name="NewHistoryInvalidScopesResponseBody">func</a> [NewHistoryInvalidScopesResponseBody](/src/target/types.go?s=6839:6942#L170)
``` go
func NewHistoryInvalidScopesResponseBody(res chattersvc.InvalidScopes) HistoryInvalidScopesResponseBody
```
NewHistoryInvalidScopesResponseBody builds the HTTP response body from the
result of the "history" endpoint of the "chatter" service.





## <a name="HistoryResponseBody">type</a> [HistoryResponseBody](/src/target/types.go?s=904:1280#L30)
``` go
type HistoryResponseBody struct {
    // Message sent to the server
    Message string `form:"message" json:"message" xml:"message"`
    // Length of the message sent
    Length *int `form:"length,omitempty" json:"length,omitempty" xml:"length,omitempty"`
    // Time at which the message was sent
    SentAt *string `form:"sent_at,omitempty" json:"sent_at,omitempty" xml:"sent_at,omitempty"`
}

```
HistoryResponseBody is the type of the "chatter" service "history" endpoint
HTTP response body.







### <a name="NewHistoryResponseBody">func</a> [NewHistoryResponseBody](/src/target/types.go?s=4356:4442#L110)
``` go
func NewHistoryResponseBody(res *chattersvcviews.ChatSummaryView) *HistoryResponseBody
```
NewHistoryResponseBody builds the HTTP response body from the result of the
"history" endpoint of the "chatter" service.





## <a name="HistoryResponseBodyTiny">type</a> [HistoryResponseBodyTiny](/src/target/types.go?s=668:800#L23)
``` go
type HistoryResponseBodyTiny struct {
    // Message sent to the server
    Message string `form:"message" json:"message" xml:"message"`
}

```
HistoryResponseBodyTiny is the type of the "chatter" service "history"
endpoint HTTP response body.







### <a name="NewHistoryResponseBodyTiny">func</a> [NewHistoryResponseBodyTiny](/src/target/types.go?s=4053:4147#L101)
``` go
func NewHistoryResponseBodyTiny(res *chattersvcviews.ChatSummaryView) *HistoryResponseBodyTiny
```
NewHistoryResponseBodyTiny builds the HTTP response body from the result of
the "history" endpoint of the "chatter" service.





## <a name="HistoryUnauthorizedResponseBody">type</a> [HistoryUnauthorizedResponseBody](/src/target/types.go?s=2939:2982#L73)
``` go
type HistoryUnauthorizedResponseBody string
```
HistoryUnauthorizedResponseBody is the type of the "chatter" service
"history" endpoint HTTP response body for the "unauthorized" error.







### <a name="NewHistoryUnauthorizedResponseBody">func</a> [NewHistoryUnauthorizedResponseBody](/src/target/types.go?s=7147:7247#L177)
``` go
func NewHistoryUnauthorizedResponseBody(res chattersvc.Unauthorized) HistoryUnauthorizedResponseBody
```
NewHistoryUnauthorizedResponseBody builds the HTTP response body from the
result of the "history" endpoint of the "chatter" service.





## <a name="ListenerInvalidScopesResponseBody">type</a> [ListenerInvalidScopesResponseBody](/src/target/types.go?s=1986:2031#L53)
``` go
type ListenerInvalidScopesResponseBody string
```
ListenerInvalidScopesResponseBody is the type of the "chatter" service
"listener" endpoint HTTP response body for the "invalid-scopes" error.







### <a name="NewListenerInvalidScopesResponseBody">func</a> [NewListenerInvalidScopesResponseBody](/src/target/types.go?s=5605:5710#L142)
``` go
func NewListenerInvalidScopesResponseBody(res chattersvc.InvalidScopes) ListenerInvalidScopesResponseBody
```
NewListenerInvalidScopesResponseBody builds the HTTP response body from the
result of the "listener" endpoint of the "chatter" service.





## <a name="ListenerUnauthorizedResponseBody">type</a> [ListenerUnauthorizedResponseBody](/src/target/types.go?s=2178:2222#L57)
``` go
type ListenerUnauthorizedResponseBody string
```
ListenerUnauthorizedResponseBody is the type of the "chatter" service
"listener" endpoint HTTP response body for the "unauthorized" error.







### <a name="NewListenerUnauthorizedResponseBody">func</a> [NewListenerUnauthorizedResponseBody](/src/target/types.go?s=5918:6020#L149)
``` go
func NewListenerUnauthorizedResponseBody(res chattersvc.Unauthorized) ListenerUnauthorizedResponseBody
```
NewListenerUnauthorizedResponseBody builds the HTTP response body from the
result of the "listener" endpoint of the "chatter" service.





## <a name="LoginUnauthorizedResponseBody">type</a> [LoginUnauthorizedResponseBody](/src/target/types.go?s=1421:1462#L41)
``` go
type LoginUnauthorizedResponseBody string
```
LoginUnauthorizedResponseBody is the type of the "chatter" service "login"
endpoint HTTP response body for the "unauthorized" error.







### <a name="NewLoginUnauthorizedResponseBody">func</a> [NewLoginUnauthorizedResponseBody](/src/target/types.go?s=4701:4797#L121)
``` go
func NewLoginUnauthorizedResponseBody(res chattersvc.Unauthorized) LoginUnauthorizedResponseBody
```
NewLoginUnauthorizedResponseBody builds the HTTP response body from the
result of the "login" endpoint of the "chatter" service.





## <a name="MountPoint">type</a> [MountPoint](/src/target/server.go?s=881:1203#L41)
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










## <a name="Server">type</a> [Server](/src/target/server.go?s=473:634#L25)
``` go
type Server struct {
    Mounts   []*MountPoint
    Login    http.Handler
    Echoer   http.Handler
    Listener http.Handler
    Summary  http.Handler
    History  http.Handler
}

```
Server lists the chatter service endpoint HTTP handlers.







### <a name="New">func</a> [New](/src/target/server.go?s=3464:3754#L116)
``` go
func New(
    e *chattersvc.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) *Server
```
New instantiates HTTP handlers for all the chatter service endpoints.





### <a name="Server.Service">func</a> (\*Server) [Service](/src/target/server.go?s=4406:4439#L142)
``` go
func (s *Server) Service() string
```
Service returns the name of the service served.




### <a name="Server.Use">func</a> (\*Server) [Use](/src/target/server.go?s=4522:4577#L145)
``` go
func (s *Server) Use(m func(http.Handler) http.Handler)
```
Use wraps the server handlers with the given middleware.




## <a name="SummaryInvalidScopesResponseBody">type</a> [SummaryInvalidScopesResponseBody](/src/target/types.go?s=2370:2414#L61)
``` go
type SummaryInvalidScopesResponseBody string
```
SummaryInvalidScopesResponseBody is the type of the "chatter" service
"summary" endpoint HTTP response body for the "invalid-scopes" error.







### <a name="NewSummaryInvalidScopesResponseBody">func</a> [NewSummaryInvalidScopesResponseBody](/src/target/types.go?s=6226:6329#L156)
``` go
func NewSummaryInvalidScopesResponseBody(res chattersvc.InvalidScopes) SummaryInvalidScopesResponseBody
```
NewSummaryInvalidScopesResponseBody builds the HTTP response body from the
result of the "summary" endpoint of the "chatter" service.





## <a name="SummaryUnauthorizedResponseBody">type</a> [SummaryUnauthorizedResponseBody](/src/target/types.go?s=2559:2602#L65)
``` go
type SummaryUnauthorizedResponseBody string
```
SummaryUnauthorizedResponseBody is the type of the "chatter" service
"summary" endpoint HTTP response body for the "unauthorized" error.







### <a name="NewSummaryUnauthorizedResponseBody">func</a> [NewSummaryUnauthorizedResponseBody](/src/target/types.go?s=6534:6634#L163)
``` go
func NewSummaryUnauthorizedResponseBody(res chattersvc.Unauthorized) SummaryUnauthorizedResponseBody
```
NewSummaryUnauthorizedResponseBody builds the HTTP response body from the
result of the "summary" endpoint of the "chatter" service.









- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
