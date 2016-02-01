+++
title="middleware/jwt"
description="godoc for middleware/jwt"
categories=["godoc"]
tags=["godoc","jwt"]
+++

# jwt
    import "github.com/goadesign/middleware/jwt"

Package jwt makes it possible to authorize API requests using JSON Web Tokens,
see <a href="https://jwt.io/introduction/">https://jwt.io/introduction/</a>

### Middleware
The package provides a middleware that can be mounted on controllers that require authentication.
The JWT middleware is instantiated using the package Middleware function. This function accepts
a specification that describes the various properties used by the JWT signature and validation
algorithms.


	spec := &jwt.Specification{
		AllowParam:       false,      // Pass tokens in headers only
		AuthOptions:      false,      // Do not authorize OPTIONS requests
		TTLMinutes:       1440,       // Tokens are valid for 24 hours
		Issuer:           "me.com",   // me.com issued the token
		KeySigningMethod: jwt.RSA256, // Use the RSA256 hashing algorithm to sign tokens
		SigningKeyFunc:   privateKey, // privateKey returns the key used to sign tokens
		ValidationFunc:   pubKey,     // pubKey returns the key used to validate tokens
	}
	authorizedController.Use(jwt.Middleware(spec))

### Token Manager
The package also exposes a token manager that creates the JWT tokens. The manager is instantiated
using the same specification used to create the middleware:


	var tm *jwt.TokenManager = jwt.NewTokenManager(spec)
	
	func Login(ctx *goa.Context) error {
		// ...
		// Authorize request using ctx, initialize tenant id if necessary etc.
		// ...
		claims := map[string]interface{}{
			"accountID": accountID,
		}
		token, err := tm.Create(claims)
		if err != nil {
			return err
		}
		return ctx.Respond(200, token) // You'll probably need something different here
	}




## Constants
``` go
const JWTHeader = "Authorization"
```
JWTHeader is the name of the header used to transmit the JWT token.

``` go
const JWTKey middlewareKey = 0
```
JWTKey is the JWT middleware key used to store the token in the context.

``` go
const TokenManagerKey middlewareKey = 1
```
TokenManagerKey is the JWT middleware key used to store the token manager in the context.



## func GetToken
``` go
func GetToken(ctx *goa.Context, spec *Specification) (token *jwt.Token, err error)
```
GetToken extracts the JWT token from the request if there is one.


## func Middleware
``` go
func Middleware(spec *Specification) goa.Middleware
```
Middleware is a middleware that retrieves a JWT token from the request if present and
injects it into the context.  It checks for the token in the HTTP Headers first, then the querystring if
the specification "AllowParam" is true.
Retrieve it using ctx.Value(JWTKey).



## type KeyFunc
``` go
type KeyFunc func() (interface{}, error)
```
KeyFunc is a function that returns the key to sign a
token.  It should return a []byte (for all)
or a *rsa.PrivateKey or *ecdsa.PrivateKey











## type SigningMethod
``` go
type SigningMethod int
```
SigningMethod is the enum that lists the supported token signature hashing algorithms.



``` go
const (

    // RSA256 signing algorithm
    RSA256 SigningMethod = iota + 1
    // RSA384 signing algorithm
    RSA384
    // RSA512 signing algorithm
    RSA512
    // HMAC256 signing algorithm
    HMAC256
    // HMAC384 signing algorithm
    HMAC384
    // HMAC512 signing algorithm
    HMAC512
    // ECDSA256 signing algorithm
    ECDSA256
    // ECDSA384 signing algorithm
    ECDSA384
    // ECDSA512 signing algorithm
    ECDSA512
)
```








## type Specification
``` go
type Specification struct {
    // TokenHeader is the HTTP header to search for the JWT Token
    // Defaults to "Authorization"
    TokenHeader string
    // TokenParam is the request parameter to parse for the JWT Token
    // Defaults to "token"
    TokenParam string
    // AllowParam is a flag that determines whether it is allowable
    // to parse tokens from the querystring
    // Defaults to false
    AllowParam bool
    // ValidationFunc is a function that returns the key to validate the JWT
    // Required, no default
    ValidationFunc ValidationKeyfunc
    // AuthOptions is a flag that determines whether a token is required on OPTIONS
    // requests
    AuthOptions bool
    // TTLMinutes is the TTL for tokens that are generated
    TTLMinutes int
    // RefreshTTLMinutes is the TTL for refresh tokens that are generated
    // and should generally be much longer than TTLMinutes
    RefreshTTLMinutes int
    // Issuer is the name of the issuer that will be inserted into the
    // generated token's claims
    Issuer string
    // KeySigningMethod determines the type of key that will be used to sign
    // Tokens.
    KeySigningMethod SigningMethod
    // SigningKeyFunc is a function that returns the key used to sign the token
    SigningKeyFunc KeyFunc
    // CommonClaims is a list of claims added to all tokens issued
    CommonClaims map[string]interface{}
}
```
Specification describes the JWT authorization properties.
It is used to both instantiate a middleware and a token manager.
The middleware uses the specification properties to authorize the incoming
request while the token manager uses it to create authorization tokens.











## type TokenManager
``` go
type TokenManager struct {
    // contains filtered or unexported fields
}
```
TokenManager provides for the creation of access and refresh JWT Tokens









### func NewTokenManager
``` go
func NewTokenManager(spec *Specification) *TokenManager
```
NewTokenManager returns a TokenManager.  If TTLMinutes isn't specified
it will default to 5 minutes.  Use the same Specification as you use for
Middleware() to ensure your tokens are compatible.




### func (\*TokenManager) Create
``` go
func (tm *TokenManager) Create(claims map[string]interface{}) (string, error)
```
Create makes a new token, adding the claims provided.  It returns
a token as a string.



## type ValidationKeyfunc
``` go
type ValidationKeyfunc func(*jwt.Token) (interface{}, error)
```
ValidationKeyfunc is a function that takes a token and returns the key to validate that
token, which allows it to use inforamtion from the key itself to choose the key
to return.

















- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md))
