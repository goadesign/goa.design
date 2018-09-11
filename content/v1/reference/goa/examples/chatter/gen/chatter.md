+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/chatter/gen/chatter"
+++


# chattersvc
`import "github.com/goadesign/goa/examples/chatter/gen/chatter"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func NewEchoerEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint](#NewEchoerEndpoint)
* [func NewHistoryEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint](#NewHistoryEndpoint)
* [func NewListenerEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint](#NewListenerEndpoint)
* [func NewLoginEndpoint(s Service, authBasicFn security.AuthBasicFunc) goa.Endpoint](#NewLoginEndpoint)
* [func NewSummaryEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint](#NewSummaryEndpoint)
* [func NewViewedChatSummary(res *ChatSummary, view string) *chattersvcviews.ChatSummary](#NewViewedChatSummary)
* [func NewViewedChatSummaryCollection(res ChatSummaryCollection, view string) chattersvcviews.ChatSummaryCollection](#NewViewedChatSummaryCollection)
* [type ChatSummary](#ChatSummary)
  * [func NewChatSummary(vres *chattersvcviews.ChatSummary) *ChatSummary](#NewChatSummary)
* [type ChatSummaryCollection](#ChatSummaryCollection)
  * [func NewChatSummaryCollection(vres chattersvcviews.ChatSummaryCollection) ChatSummaryCollection](#NewChatSummaryCollection)
* [type Client](#Client)
  * [func NewClient(login, echoer, listener, summary, history goa.Endpoint) *Client](#NewClient)
  * [func (c *Client) Echoer(ctx context.Context, p *EchoerPayload) (res EchoerClientStream, err error)](#Client.Echoer)
  * [func (c *Client) History(ctx context.Context, p *HistoryPayload) (res HistoryClientStream, err error)](#Client.History)
  * [func (c *Client) Listener(ctx context.Context, p *ListenerPayload) (res ListenerClientStream, err error)](#Client.Listener)
  * [func (c *Client) Login(ctx context.Context, p *LoginPayload) (res string, err error)](#Client.Login)
  * [func (c *Client) Summary(ctx context.Context, p *SummaryPayload) (res SummaryClientStream, err error)](#Client.Summary)
* [type EchoerClientStream](#EchoerClientStream)
* [type EchoerEndpointInput](#EchoerEndpointInput)
* [type EchoerPayload](#EchoerPayload)
* [type EchoerServerStream](#EchoerServerStream)
* [type Endpoints](#Endpoints)
  * [func NewEndpoints(s Service, authBasicFn security.AuthBasicFunc, authJWTFn security.AuthJWTFunc) *Endpoints](#NewEndpoints)
  * [func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)](#Endpoints.Use)
* [type HistoryClientStream](#HistoryClientStream)
* [type HistoryEndpointInput](#HistoryEndpointInput)
* [type HistoryPayload](#HistoryPayload)
* [type HistoryServerStream](#HistoryServerStream)
* [type InvalidScopes](#InvalidScopes)
  * [func (e InvalidScopes) Error() string](#InvalidScopes.Error)
  * [func (e InvalidScopes) ErrorName() string](#InvalidScopes.ErrorName)
* [type ListenerClientStream](#ListenerClientStream)
* [type ListenerEndpointInput](#ListenerEndpointInput)
* [type ListenerPayload](#ListenerPayload)
* [type ListenerServerStream](#ListenerServerStream)
* [type LoginPayload](#LoginPayload)
* [type Service](#Service)
* [type SummaryClientStream](#SummaryClientStream)
* [type SummaryEndpointInput](#SummaryEndpointInput)
* [type SummaryPayload](#SummaryPayload)
* [type SummaryServerStream](#SummaryServerStream)
* [type Unauthorized](#Unauthorized)
  * [func (e Unauthorized) Error() string](#Unauthorized.Error)
  * [func (e Unauthorized) ErrorName() string](#Unauthorized.ErrorName)


#### <a name="pkg-files">Package files</a>
[client.go](/src/github.com/goadesign/goa/examples/chatter/gen/chatter/client.go) [endpoints.go](/src/github.com/goadesign/goa/examples/chatter/gen/chatter/endpoints.go) [service.go](/src/github.com/goadesign/goa/examples/chatter/gen/chatter/service.go) 


## <a name="pkg-constants">Constants</a>
``` go
const ServiceName = "chatter"
```
ServiceName is the name of the service as defined in the design. This is the
same value that is set in the endpoint request contexts under the ServiceKey
key.


## <a name="pkg-variables">Variables</a>
``` go
var MethodNames = [5]string{"login", "echoer", "listener", "summary", "history"}
```
MethodNames lists the service method names as defined in the design. These
are the same values that are set in the endpoint request contexts under the
MethodKey key.



## <a name="NewEchoerEndpoint">func</a> [NewEchoerEndpoint](/src/target/endpoints.go?s=3062:3140#L102)
``` go
func NewEchoerEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint
```
NewEchoerEndpoint returns an endpoint function that calls the method
"echoer" of service "chatter".



## <a name="NewHistoryEndpoint">func</a> [NewHistoryEndpoint](/src/target/endpoints.go?s=4951:5030#L159)
``` go
func NewHistoryEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint
```
NewHistoryEndpoint returns an endpoint function that calls the method
"history" of service "chatter".



## <a name="NewListenerEndpoint">func</a> [NewListenerEndpoint](/src/target/endpoints.go?s=3690:3770#L121)
``` go
func NewListenerEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint
```
NewListenerEndpoint returns an endpoint function that calls the method
"listener" of service "chatter".



## <a name="NewLoginEndpoint">func</a> [NewLoginEndpoint](/src/target/endpoints.go?s=2576:2657#L85)
``` go
func NewLoginEndpoint(s Service, authBasicFn security.AuthBasicFunc) goa.Endpoint
```
NewLoginEndpoint returns an endpoint function that calls the method "login"
of service "chatter".



## <a name="NewSummaryEndpoint">func</a> [NewSummaryEndpoint](/src/target/endpoints.go?s=4322:4401#L140)
``` go
func NewSummaryEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint
```
NewSummaryEndpoint returns an endpoint function that calls the method
"summary" of service "chatter".



## <a name="NewViewedChatSummary">func</a> [NewViewedChatSummary](/src/target/service.go?s=7097:7182#L237)
``` go
func NewViewedChatSummary(res *ChatSummary, view string) *chattersvcviews.ChatSummary
```
NewViewedChatSummary initializes viewed result type ChatSummary from result
type ChatSummary using the given view.



## <a name="NewViewedChatSummaryCollection">func</a> [NewViewedChatSummaryCollection](/src/target/service.go?s=6197:6310#L209)
``` go
func NewViewedChatSummaryCollection(res ChatSummaryCollection, view string) chattersvcviews.ChatSummaryCollection
```
NewViewedChatSummaryCollection initializes viewed result type
ChatSummaryCollection from result type ChatSummaryCollection using the given
view.




## <a name="ChatSummary">type</a> [ChatSummary](/src/target/service.go?s=4935:5108#L159)
``` go
type ChatSummary struct {
    // Message sent to the server
    Message string
    // Length of the message sent
    Length *int
    // Time at which the message was sent
    SentAt *string
}

```
ChatSummary is the result type of the chatter service history method.







### <a name="NewChatSummary">func</a> [NewChatSummary](/src/target/service.go?s=6729:6796#L224)
``` go
func NewChatSummary(vres *chattersvcviews.ChatSummary) *ChatSummary
```
NewChatSummary initializes result type ChatSummary from viewed result type
ChatSummary.





## <a name="ChatSummaryCollection">type</a> [ChatSummaryCollection](/src/target/service.go?s=4613:4654#L148)
``` go
type ChatSummaryCollection []*ChatSummary
```
ChatSummaryCollection is the result type of the chatter service summary
method.







### <a name="NewChatSummaryCollection">func</a> [NewChatSummaryCollection](/src/target/service.go?s=5739:5834#L195)
``` go
func NewChatSummaryCollection(vres chattersvcviews.ChatSummaryCollection) ChatSummaryCollection
```
NewChatSummaryCollection initializes result type ChatSummaryCollection from
viewed result type ChatSummaryCollection.





## <a name="Client">type</a> [Client](/src/target/client.go?s=300:477#L18)
``` go
type Client struct {
    LoginEndpoint    goa.Endpoint
    EchoerEndpoint   goa.Endpoint
    ListenerEndpoint goa.Endpoint
    SummaryEndpoint  goa.Endpoint
    HistoryEndpoint  goa.Endpoint
}

```
Client is the "chatter" service client.







### <a name="NewClient">func</a> [NewClient](/src/target/client.go?s=552:630#L27)
``` go
func NewClient(login, echoer, listener, summary, history goa.Endpoint) *Client
```
NewClient initializes a "chatter" service client given the endpoints.





### <a name="Client.Echoer">func</a> (\*Client) [Echoer](/src/target/client.go?s=1392:1490#L55)
``` go
func (c *Client) Echoer(ctx context.Context, p *EchoerPayload) (res EchoerClientStream, err error)
```
Echoer calls the "echoer" endpoint of the "chatter" service.
Echoer may return the following errors:


	- "unauthorized" (type Unauthorized)
	- "invalid-scopes" (type InvalidScopes)
	- error: internal error




### <a name="Client.History">func</a> (\*Client) [History](/src/target/client.go?s=2679:2780#L93)
``` go
func (c *Client) History(ctx context.Context, p *HistoryPayload) (res HistoryClientStream, err error)
```
History calls the "history" endpoint of the "chatter" service.
History may return the following errors:


	- "unauthorized" (type Unauthorized)
	- "invalid-scopes" (type InvalidScopes)
	- error: internal error




### <a name="Client.Listener">func</a> (\*Client) [Listener](/src/target/client.go?s=1847:1951#L69)
``` go
func (c *Client) Listener(ctx context.Context, p *ListenerPayload) (res ListenerClientStream, err error)
```
Listener calls the "listener" endpoint of the "chatter" service.
Listener may return the following errors:


	- "unauthorized" (type Unauthorized)
	- "invalid-scopes" (type InvalidScopes)
	- error: internal error




### <a name="Client.Login">func</a> (\*Client) [Login](/src/target/client.go?s=970:1054#L41)
``` go
func (c *Client) Login(ctx context.Context, p *LoginPayload) (res string, err error)
```
Login calls the "login" endpoint of the "chatter" service.
Login may return the following errors:


	- "unauthorized" (type Unauthorized)
	- error: internal error




### <a name="Client.Summary">func</a> (\*Client) [Summary](/src/target/client.go?s=2222:2323#L79)
``` go
func (c *Client) Summary(ctx context.Context, p *SummaryPayload) (res SummaryClientStream, err error)
```
Summary calls the "summary" endpoint of the "chatter" service.
Summary may return the following errors:


	- "unauthorized" (type Unauthorized)
	- "invalid-scopes" (type InvalidScopes)
	- error: internal error




## <a name="EchoerClientStream">type</a> [EchoerClientStream](/src/target/service.go?s=1960:2179#L57)
``` go
type EchoerClientStream interface {
    // Send streams instances of "string".
    Send(string) error
    // Recv reads instances of "string" from the stream.
    Recv() (string, error)
    // Close closes the stream.
    Close() error
}
```
EchoerClientStream is the interface a "echoer" endpoint client stream must
satisfy.










## <a name="EchoerEndpointInput">type</a> [EchoerEndpointInput](/src/target/endpoints.go?s=599:794#L29)
``` go
type EchoerEndpointInput struct {
    // Payload is the method payload.
    Payload *EchoerPayload
    // Stream is the server stream used by the "echoer" method to send data.
    Stream EchoerServerStream
}

```
EchoerEndpointInput is the input type of "echoer" endpoint that holds the
method payload and the server stream.










## <a name="EchoerPayload">type</a> [EchoerPayload](/src/target/service.go?s=4137:4212#L129)
``` go
type EchoerPayload struct {
    // JWT used for authentication
    Token string
}

```
EchoerPayload is the payload type of the chatter service echoer method.










## <a name="EchoerServerStream">type</a> [EchoerServerStream](/src/target/service.go?s=1649:1868#L46)
``` go
type EchoerServerStream interface {
    // Send streams instances of "string".
    Send(string) error
    // Recv reads instances of "string" from the stream.
    Recv() (string, error)
    // Close closes the stream.
    Close() error
}
```
EchoerServerStream is the interface a "echoer" endpoint server stream must
satisfy.










## <a name="Endpoints">type</a> [Endpoints](/src/target/endpoints.go?s=339:479#L19)
``` go
type Endpoints struct {
    Login    goa.Endpoint
    Echoer   goa.Endpoint
    Listener goa.Endpoint
    Summary  goa.Endpoint
    History  goa.Endpoint
}

```
Endpoints wraps the "chatter" service endpoints.







### <a name="NewEndpoints">func</a> [NewEndpoints](/src/target/endpoints.go?s=1840:1947#L64)
``` go
func NewEndpoints(s Service, authBasicFn security.AuthBasicFunc, authJWTFn security.AuthJWTFunc) *Endpoints
```
NewEndpoints wraps the methods of the "chatter" service with endpoints.





### <a name="Endpoints.Use">func</a> (\*Endpoints) [Use](/src/target/endpoints.go?s=2282:2340#L75)
``` go
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint)
```
Use applies the given middleware to all the "chatter" service endpoints.




## <a name="HistoryClientStream">type</a> [HistoryClientStream](/src/target/service.go?s=3811:3938#L117)
``` go
type HistoryClientStream interface {
    // Recv reads instances of "ChatSummary" from the stream.
    Recv() (*ChatSummary, error)
}
```
HistoryClientStream is the interface a "history" endpoint client stream must
satisfy.










## <a name="HistoryEndpointInput">type</a> [HistoryEndpointInput](/src/target/endpoints.go?s=1564:1763#L56)
``` go
type HistoryEndpointInput struct {
    // Payload is the method payload.
    Payload *HistoryPayload
    // Stream is the server stream used by the "history" method to send data.
    Stream HistoryServerStream
}

```
HistoryEndpointInput is the input type of "history" endpoint that holds the
method payload and the server stream.










## <a name="HistoryPayload">type</a> [HistoryPayload](/src/target/service.go?s=4733:4860#L151)
``` go
type HistoryPayload struct {
    // JWT used for authentication
    Token string
    // View to use to render the result
    View *string
}

```
HistoryPayload is the payload type of the chatter service history method.










## <a name="HistoryServerStream">type</a> [HistoryServerStream](/src/target/service.go?s=3472:3717#L106)
``` go
type HistoryServerStream interface {
    // Send streams instances of "ChatSummary".
    Send(*ChatSummary) error
    // Close closes the stream.
    Close() error
    // SetView sets the view used to render the result before streaming.
    SetView(view string)
}
```
HistoryServerStream is the interface a "history" endpoint server stream must
satisfy.










## <a name="InvalidScopes">type</a> [InvalidScopes](/src/target/service.go?s=5163:5188#L171)
``` go
type InvalidScopes string
```









### <a name="InvalidScopes.Error">func</a> (InvalidScopes) [Error](/src/target/service.go?s=5450:5487#L184)
``` go
func (e InvalidScopes) Error() string
```
Error returns an error description.




### <a name="InvalidScopes.ErrorName">func</a> (InvalidScopes) [ErrorName](/src/target/service.go?s=5543:5584#L189)
``` go
func (e InvalidScopes) ErrorName() string
```
ErrorName returns "invalid-scopes".




## <a name="ListenerClientStream">type</a> [ListenerClientStream](/src/target/service.go?s=2532:2675#L77)
``` go
type ListenerClientStream interface {
    // Send streams instances of "string".
    Send(string) error
    // Close closes the stream.
    Close() error
}
```
ListenerClientStream is the interface a "listener" endpoint client stream
must satisfy.










## <a name="ListenerEndpointInput">type</a> [ListenerEndpointInput](/src/target/endpoints.go?s=918:1121#L38)
``` go
type ListenerEndpointInput struct {
    // Payload is the method payload.
    Payload *ListenerPayload
    // Stream is the server stream used by the "listener" method to send data.
    Stream ListenerServerStream
}

```
ListenerEndpointInput is the input type of "listener" endpoint that holds
the method payload and the server stream.










## <a name="ListenerPayload">type</a> [ListenerPayload](/src/target/service.go?s=4293:4370#L135)
``` go
type ListenerPayload struct {
    // JWT used for authentication
    Token string
}

```
ListenerPayload is the payload type of the chatter service listener method.










## <a name="ListenerServerStream">type</a> [ListenerServerStream](/src/target/service.go?s=2275:2436#L68)
``` go
type ListenerServerStream interface {
    // Recv reads instances of "string" from the stream.
    Recv() (string, error)
    // Close closes the stream.
    Close() error
}
```
ListenerServerStream is the interface a "listener" endpoint server stream
must satisfy.










## <a name="LoginPayload">type</a> [LoginPayload](/src/target/service.go?s=3998:4060#L123)
``` go
type LoginPayload struct {
    User     string
    Password string
}

```
Credentials used to authenticate to retrieve JWT token










## <a name="Service">type</a> [Service](/src/target/service.go?s=372:1101#L18)
``` go
type Service interface {
    // Creates a valid JWT token for auth to chat.
    Login(context.Context, *LoginPayload) (res string, err error)
    // Echoes the message sent by the client.
    Echoer(context.Context, *EchoerPayload, EchoerServerStream) (err error)
    // Listens to the messages sent by the client.
    Listener(context.Context, *ListenerPayload, ListenerServerStream) (err error)
    // Summarizes the chat messages sent by the client.
    Summary(context.Context, *SummaryPayload, SummaryServerStream) (err error)
    // Returns the chat messages sent to the server.
    // The "view" return value must have one of the following views
    //	- "tiny"
    //	- "default"
    History(context.Context, *HistoryPayload, HistoryServerStream) (err error)
}
```
The chatter service implements a simple client and server chat.










## <a name="SummaryClientStream">type</a> [SummaryClientStream](/src/target/service.go?s=3111:3378#L96)
``` go
type SummaryClientStream interface {
    // Send streams instances of "string".
    Send(string) error
    // CloseAndRecv stops sending messages to the stream and reads instances of
    // "ChatSummaryCollection" from the stream.
    CloseAndRecv() (ChatSummaryCollection, error)
}
```
SummaryClientStream is the interface a "summary" endpoint client stream must
satisfy.










## <a name="SummaryEndpointInput">type</a> [SummaryEndpointInput](/src/target/endpoints.go?s=1243:1442#L47)
``` go
type SummaryEndpointInput struct {
    // Payload is the method payload.
    Payload *SummaryPayload
    // Stream is the server stream used by the "summary" method to send data.
    Stream SummaryServerStream
}

```
SummaryEndpointInput is the input type of "summary" endpoint that holds the
method payload and the server stream.










## <a name="SummaryPayload">type</a> [SummaryPayload](/src/target/service.go?s=4449:4525#L141)
``` go
type SummaryPayload struct {
    // JWT used for authentication
    Token string
}

```
SummaryPayload is the payload type of the chatter service summary method.










## <a name="SummaryServerStream">type</a> [SummaryServerStream](/src/target/service.go?s=2769:3017#L86)
``` go
type SummaryServerStream interface {
    // SendAndClose streams instances of "ChatSummaryCollection" and closes the
    // stream.
    SendAndClose(ChatSummaryCollection) error
    // Recv reads instances of "string" from the stream.
    Recv() (string, error)
}
```
SummaryServerStream is the interface a "summary" endpoint server stream must
satisfy.










## <a name="Unauthorized">type</a> [Unauthorized](/src/target/service.go?s=5137:5161#L169)
``` go
type Unauthorized string
```
Credentials are invalid










### <a name="Unauthorized.Error">func</a> (Unauthorized) [Error](/src/target/service.go?s=5229:5265#L174)
``` go
func (e Unauthorized) Error() string
```
Error returns an error description.




### <a name="Unauthorized.ErrorName">func</a> (Unauthorized) [ErrorName](/src/target/service.go?s=5342:5382#L179)
``` go
func (e Unauthorized) ErrorName() string
```
ErrorName returns "unauthorized".








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
