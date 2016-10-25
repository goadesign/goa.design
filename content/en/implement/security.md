+++
date = "2016-01-30T11:01:06-05:00"
title = "Security"
weight = 9
aliases = [
    "/implement/security/"
]
+++

Implementing security requires to first define the security schemes in the design, see
[security](https://goa.design/design/security/) in the [Design](https://goa.design/design/) section
for details.

## Service Security

The service generated code define package functions for registering the security middlewares that
actually implement the authorization. The functions are defined in the `app` package (unless the
target package was overridden when running `goagen`) and follow naming pattern `UseXXXMiddleware`
where `XXX` is the name of the security scheme, for example:

```go
func UseAPIKeyMiddleware(service *goa.Service, middleware goa.Middleware)
```

The middleware should either return an error (typically a
[ErrUnauthorized](https://goa.design/reference/goa/#variables)) in case of authentication failure or
proceed to calling the next handler in case of success.

The generated code also includes functions for instantiating security scheme data structures that
contains a copy of the information provided in the design. This contains information that can be
leveraged by the security middleware implementations. These functions follow the naming pattern
`NewXXXSecurity` where `XXX` is the name of the security scheme, for example:

```go
func NewAPIKeySecurity() *goa.APIKeySecurity
```

## Security Middlewares

goa comes either complete or partial implementations of security middlewares for all security
schemes.

### Basic Auth

The
[simplistic implementation](https://GitHub.com/goadesign/goa/blob/master/middleware/security/basicauth/basicauth.go)
of a basic auth middleware can serve as a basis for more sophisticated implementations.

### API Key

There is no security middleware implementation provided for the API key scheme as the validation
simply consists of comparing two values. There is an
[example implementation](https://GitHub.com/goadesign/examples/blob/master/security/api_key.go)
though in the [examples](https://GitHub.com/goadesign/examples) GitHub repository.

### JWT Key

goa comes with a [complete implementation](https://goa.design/reference/goa/middleware/security/jwt/)
for a JWT security middleware. The
[JWT example](https://GitHub.com/goadesign/examples/blob/master/security/jwt.go) also demonstrates
how to load keys to validate tokens.

### OAuth2

Implementing OAuth2 requires more work as OAuth2 is not simply an authentication mechanism, it's
also a way to let third-parties impersonate service users. The
[oauth2](https://GitHub.com/goadesign/oauth2) GitHub repository provides a framework for easily
adding OAuth2 support to a goa service. Consult the
[README](https://GitHub.com/goadesign/oauth2/blob/master/README.md) for additional information.

## Examples

The [security examples](https://github.com/goadesign/examples/tree/master/security) demonstrate
how to implement security middlewares for all the supported schemes.
