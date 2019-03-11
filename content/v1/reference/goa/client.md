+++
date="2019-03-10T18:05:49-07:00"
description="github.com/goadesign/goa/client"
+++


# client
`import "github.com/goadesign/goa/client"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func ContextRequestID(ctx context.Context) string](#ContextRequestID)
* [func ContextWithRequestID(ctx context.Context) (context.Context, string)](#ContextWithRequestID)
* [func HandleResponse(c *Client, resp *http.Response, pretty bool)](#HandleResponse)
* [func SetContextRequestID(ctx context.Context, reqID string) context.Context](#SetContextRequestID)
* [func WSRead(ws *websocket.Conn)](#WSRead)
* [func WSWrite(ws *websocket.Conn)](#WSWrite)
* [type APIKeySigner](#APIKeySigner)
  * [func (s *APIKeySigner) Sign(req *http.Request) error](#APIKeySigner.Sign)
* [type BasicSigner](#BasicSigner)
  * [func (s *BasicSigner) Sign(req *http.Request) error](#BasicSigner.Sign)
* [type Client](#Client)
  * [func New(c Doer) *Client](#New)
  * [func (c *Client) Do(ctx context.Context, req *http.Request) (*http.Response, error)](#Client.Do)
* [type Doer](#Doer)
  * [func HTTPClientDoer(hc *http.Client) Doer](#HTTPClientDoer)
* [type JWTSigner](#JWTSigner)
  * [func (s *JWTSigner) Sign(req *http.Request) error](#JWTSigner.Sign)
* [type OAuth2Signer](#OAuth2Signer)
  * [func (s *OAuth2Signer) Sign(req *http.Request) error](#OAuth2Signer.Sign)
* [type Signer](#Signer)
* [type StaticToken](#StaticToken)
  * [func (t *StaticToken) SetAuthHeader(r *http.Request)](#StaticToken.SetAuthHeader)
  * [func (t *StaticToken) Valid() bool](#StaticToken.Valid)
* [type StaticTokenSource](#StaticTokenSource)
  * [func (s *StaticTokenSource) Token() (Token, error)](#StaticTokenSource.Token)
* [type Token](#Token)
* [type TokenSource](#TokenSource)


#### <a name="pkg-files">Package files</a>
[cli.go](/src/github.com/goadesign/goa/client/cli.go) [client.go](/src/github.com/goadesign/goa/client/client.go) [signers.go](/src/github.com/goadesign/goa/client/signers.go) 





## <a name="ContextRequestID">func</a> [ContextRequestID](/src/target/client.go?s=6270:6319#L228)
``` go
func ContextRequestID(ctx context.Context) string
```
ContextRequestID extracts the Request ID from the context.



## <a name="ContextWithRequestID">func</a> [ContextWithRequestID](/src/target/client.go?s=6565:6637#L239)
``` go
func ContextWithRequestID(ctx context.Context) (context.Context, string)
```
ContextWithRequestID returns ctx and the request ID if it already has one or creates and returns a new context with
a new request ID.



## <a name="HandleResponse">func</a> [HandleResponse](/src/target/cli.go?s=420:484#L23)
``` go
func HandleResponse(c *Client, resp *http.Response, pretty bool)
```
HandleResponse logs the response details and exits the process with a status computed from
the response status code. The mapping of response status code to exit status is as follows:


	401: 1
	402 to 500 (other than 403 and 404): 2
	403: 3
	404: 4
	500+: 5



## <a name="SetContextRequestID">func</a> [SetContextRequestID](/src/target/client.go?s=6872:6947#L249)
``` go
func SetContextRequestID(ctx context.Context, reqID string) context.Context
```
SetContextRequestID sets a request ID in the given context and returns a new context.



## <a name="WSRead">func</a> [WSRead](/src/target/cli.go?s=1901:1932#L87)
``` go
func WSRead(ws *websocket.Conn)
```
WSRead reads from a websocket and print the read messages to STDOUT.



## <a name="WSWrite">func</a> [WSWrite](/src/target/cli.go?s=1656:1688#L77)
``` go
func WSWrite(ws *websocket.Conn)
```
WSWrite sends STDIN lines to a websocket server.




## <a name="APIKeySigner">type</a> [APIKeySigner](/src/target/signers.go?s=455:875#L24)
``` go
type APIKeySigner struct {
    // SignQuery indicates whether to set the API key in the URL query with key KeyName
    // or whether to use a header with name KeyName.
    SignQuery bool
    // KeyName is the name of the HTTP header or query string that contains the API key.
    KeyName string
    // KeyValue stores the actual key.
    KeyValue string
    // Format is the format used to render the key, e.g. "Bearer %s"
    Format string
}

```
APIKeySigner implements API Key auth.










### <a name="APIKeySigner.Sign">func</a> (\*APIKeySigner) [Sign](/src/target/signers.go?s=2673:2725#L93)
``` go
func (s *APIKeySigner) Sign(req *http.Request) error
```
Sign adds the API key header to the request.




## <a name="BasicSigner">type</a> [BasicSigner](/src/target/signers.go?s=255:410#L16)
``` go
type BasicSigner struct {
    // Username is the basic auth user.
    Username string
    // Password is err guess what? the basic auth password.
    Password string
}

```
BasicSigner implements basic auth.










### <a name="BasicSigner.Sign">func</a> (\*BasicSigner) [Sign](/src/target/signers.go?s=2467:2518#L85)
``` go
func (s *BasicSigner) Sign(req *http.Request) error
```
Sign adds the basic auth header to the request.




## <a name="Client">type</a> [Client](/src/target/client.go?s=390:724#L25)
``` go
type Client struct {
    // Doer is the underlying http client.
    Doer
    // Scheme overrides the default action scheme.
    Scheme string
    // Host is the service hostname.
    Host string
    // UserAgent is the user agent set in requests made by the client.
    UserAgent string
    // Dump indicates whether to dump request response.
    Dump bool
}

```
Client is the common client data structure for all goa service clients.







### <a name="New">func</a> [New](/src/target/client.go?s=836:860#L41)
``` go
func New(c Doer) *Client
```
New creates a new API client that wraps c.
If c is nil, the returned client wraps http.DefaultClient.





### <a name="Client.Do">func</a> (\*Client) [Do](/src/target/client.go?s=1605:1688#L65)
``` go
func (c *Client) Do(ctx context.Context, req *http.Request) (*http.Response, error)
```
Do wraps the underlying http client Do method and adds logging.
The logger should be in the context.




## <a name="Doer">type</a> [Doer](/src/target/client.go?s=231:311#L20)
``` go
type Doer interface {
    Do(context.Context, *http.Request) (*http.Response, error)
}
```
Doer defines the Do method of the http client.







### <a name="HTTPClientDoer">func</a> [HTTPClientDoer](/src/target/client.go?s=1060:1101#L49)
``` go
func HTTPClientDoer(hc *http.Client) Doer
```
HTTPClientDoer turns a stdlib http.Client into a Doer. Use it to enable to call New() with an http.Client.





## <a name="JWTSigner">type</a> [JWTSigner](/src/target/signers.go?s=924:1123#L37)
``` go
type JWTSigner struct {
    // TokenSource is a JWT token source.
    // See https://godoc.org/golang.org/x/oauth2/jwt#Config.TokenSource for an example
    // of an implementation.
    TokenSource TokenSource
}

```
JWTSigner implements JSON Web Token auth.










### <a name="JWTSigner.Sign">func</a> (\*JWTSigner) [Sign](/src/target/signers.go?s=3118:3167#L114)
``` go
func (s *JWTSigner) Sign(req *http.Request) error
```
Sign adds the JWT auth header.




## <a name="OAuth2Signer">type</a> [OAuth2Signer](/src/target/signers.go?s=1255:1449#L46)
``` go
type OAuth2Signer struct {
    // TokenSource is an OAuth2 access token source.
    // See package golang/oauth2 and its subpackage for implementations of token
    // sources.
    TokenSource TokenSource
}

```
OAuth2Signer adds a authorization header to the request using the given OAuth2 token
source to produce the header value.










### <a name="OAuth2Signer.Sign">func</a> (\*OAuth2Signer) [Sign](/src/target/signers.go?s=3288:3340#L119)
``` go
func (s *OAuth2Signer) Sign(req *http.Request) error
```
Sign refreshes the access token if needed and adds the OAuth header.




## <a name="Signer">type</a> [Signer](/src/target/signers.go?s=118:213#L10)
``` go
type Signer interface {
    // Sign adds required headers, cookies etc.
    Sign(*http.Request) error
}
```
Signer is the common interface implemented by all signers.










## <a name="StaticToken">type</a> [StaticToken](/src/target/signers.go?s=2281:2412#L76)
``` go
type StaticToken struct {
    // Value used to set the auth header.
    Value string
    // OAuth type, defaults to "Bearer".
    Type string
}

```
StaticToken implements a token that sets the auth header with a given static value.










### <a name="StaticToken.SetAuthHeader">func</a> (\*StaticToken) [SetAuthHeader](/src/target/signers.go?s=3895:3947#L142)
``` go
func (t *StaticToken) SetAuthHeader(r *http.Request)
```
SetAuthHeader sets the Authorization header to r.




### <a name="StaticToken.Valid">func</a> (\*StaticToken) [Valid](/src/target/signers.go?s=4122:4156#L151)
``` go
func (t *StaticToken) Valid() bool
```
Valid reports whether Token can be used to properly sign requests.




## <a name="StaticTokenSource">type</a> [StaticTokenSource](/src/target/signers.go?s=2134:2190#L71)
``` go
type StaticTokenSource struct {
    StaticToken *StaticToken
}

```
StaticTokenSource implements a token source that always returns the same token.










### <a name="StaticTokenSource.Token">func</a> (\*StaticTokenSource) [Token](/src/target/signers.go?s=3759:3809#L137)
``` go
func (s *StaticTokenSource) Token() (Token, error)
```
Token returns the static token.




## <a name="Token">type</a> [Token](/src/target/signers.go?s=1590:1785#L55)
``` go
type Token interface {
    // SetAuthHeader sets the Authorization header to r.
    SetAuthHeader(r *http.Request)
    // Valid reports whether Token can be used to properly sign requests.
    Valid() bool
}
```
Token is the interface to an OAuth2 token implementation.
It can be implemented with <a href="https://godoc.org/golang.org/x/oauth2#Token">https://godoc.org/golang.org/x/oauth2#Token</a>.










## <a name="TokenSource">type</a> [TokenSource](/src/target/signers.go?s=1843:2047#L63)
``` go
type TokenSource interface {
    // Token returns a token or an error.
    // Token must be safe for concurrent use by multiple goroutines.
    // The returned Token must not be modified.
    Token() (Token, error)
}
```
A TokenSource is anything that can return a token.














- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
