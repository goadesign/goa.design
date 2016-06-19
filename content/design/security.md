+++
date = "2016-01-30T11:01:06-05:00"
title = "Security"
weight = 3
+++

goa has built-in support for multiple security schemes: basic auth, API key (a.k.a.  shared secret),
JWT and OAuth2. Security schemes can be attached to the entire API, a resource or a single action.
Actions that have security scheme(s) attached to them require clients to perform authentication as
described by the scheme(s). Individual actions may also override the need for doing auth.

## Security DSL

A security scheme is defined using one of
[BasicAuthSecurity](http://goa.design/reference/goa/design/apidsl/#func-basicauthsecurity-a-name-apidsl-basicauthsecurity-a),
[APIKeySecurity](http://goa.design/reference/goa/design/apidsl/#func-apikeysecurity-a-name-apidsl-apikeysecurity-a),
[JWTSecurity](http://goa.design/reference/goa/design/apidsl/#func-jwtsecurity-a-name-apidsl-jwtsecurity-a) or
[OAuth2Security](http://goa.design/reference/goa/design/apidsl/#func-oauth2security-a-name-apidsl-oauth2security-a).
The scheme is then attached to the API, resource or action using
[Security](http://goa.design/reference/goa/design/apidsl/#func-security-a-name-apidsl-security-a).
For example:

```go
var BasicAuth = BasicAuthSecurity("BasicAuth", func() {
    Description("Use client ID and client secret to authenticate")
})

var _ = Resource("secured", func() {
    Security(BasicAuth)
    // ...
})
```

Each scheme uses a DSL specific to the corresponding authentication mechanism, for example the API
key scheme allows specifying whether the key should be set in the query string or a header. Check
the [reference](http://goa.design/reference/goa/design/apidsl) for details on each DSL.

## Scopes

Both the `JWT` and `OAuth2` schemes allow specifying scopes that must be set in the tokens
presented by clients. The
[Security](http://goa.design/reference/goa/design/apidsl/#func-security-a-name-apidsl-security-a)
function allows specifying the scopes that are required for the actions attached to it. For example,
a `OAuth2` scheme using the `OAuth2` authorization code flow may be defined as follows:

```go
var OAuth2 = OAuth2Security("OAuth2", func() {
    Description("Use OAuth2 to authenticate")
    AccessCodeFlow("/authorization", "/token")
    Scope("api:read", "Provides read access")
    Scope("api:write", "Provides write access")
})
```

The scheme defines two possible scopes. A resource may then declare that clients must present tokens
with the "api:read" scope set:

```go
var _ = Resource("secured", func() {
    Security(OAuth2, func() {
        Scope("api:read") // All resource actions require "api:read" scope
    })
    // ...
})
```

An action may then additionally require the "api:write" scope:

```go
    Action("write", func() {
        Security(OAuth2, func() {
            Scope("api:write") // Require "api:write" scope on top of scopes already required by
        })                     // the resource or API.
        // ...
    })
```

Actions may also opt-out of auth entirely using
[NoSecurity](http://goa.design/reference/goa/design/apidsl/#func-nosecurity-a-name-apidsl-nosecurity-a),
for example:

```go
    Action("health-check", func() {
        NoSecurity()
        // ...
    })
```

## Effects On Code Generation

Defininig security schemes and attaching them to the API, a resource or an action causes the code
generation to require clients to authenticate. It also causes the client package to use the
corresponding signers. Finally the generated Swagger also reflects the security schemes.

The generated code that implements authentication accepts middleware that does the actual
enforcement. This makes it possible to customize the behavior as needed. goa comes with a set of
security middleware that either partially or fully implement the security scheme.

See [security](https://goa.design/implement/security/) in the
[Implement](https://goa.design/implement/) section for details on how to implement the security
middlewares.
