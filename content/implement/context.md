+++
date = "2016-04-17T11:01:06-05:00"
title = "The goa Request Context"
weight = 3

[menu.main]
name = "Request Context"
parent = "implement"
+++

## Overview

The request context is the data structure provided to all goa controller action methods as first
parameter. It leverages the [work done](https://blog.golang.org/context) by the Go team around
passing contexts across interface boundaries by wrapping the
[context.Context](https://godoc.org/golang.org/x/net/context#Context) interface in a generated
struct.

goa leverages code generation to define *action specific* fields that provide access to the request
state using "typed" methods. So for example if a path parameter called `ID` is defined in the design
as being of type `Integer` the corresponding controller action method accepts a context data
structure which exposes a field named `ID` of type `int`. The same goes for the request payload so
that accessing the `Payload` field of an action context returns a data structure that is specific to
that action as described in the design. This alleviates the need for reflection or otherwise
"binding" the context to a struct.

This also applies to writing responses: while the underlying http ResponseWriter is available to
write the response, the action context also provides action specific methods for writing the
responses described in the design. These generated methods take care of writing the correct status
code and content-type header for example. They also make it possible to specify the response body
using custom data structures generated from the media type described in the design.

## Context Functions

The goa package exposes a set of functions all prefixed with `Context` that can be used to extract
data stored in the request context. For example
[ContextResponse](http://goa.design/reference/goa/#func-contextresponse-a-name-goa-responsedata-contextresponse-a)
extracts the response data from the given context. These functions are mainly useful to code that does not
have access to the generated data structures but merely to the raw `context.Context` value such as
middleware.

The goa package also exposes functions prefixed with `With` that accept a context and return a new
context that embeds the additional data provided to the function, for example
[WithLogger](http://goa.design/reference/goa/#func-withlogger-a-name-goa-withlogger-a) sets the
logger in the returned context.

## Setting Deadlines

As mentioned earlier each controller action context wraps a golang package context. This means that
deadlines and cancelation signals are available to all action implementations. The built-in
[Timeout](https://goa.design/reference/goa/middleware/#func-timeout-a-name-middleware-timeout-a)
middleware takes advantage of this ability to let services or controllers define a timeout value
for all requests.
