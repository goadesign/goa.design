+++
date = "2016-01-30T11:01:06-05:00"
title = "The goa Request Context"
+++

The action context is a data structure that is provided to all goa controller action implementations
as first parameter. It leverages the [work done](https://blog.golang.org/context) at Google around
passing contexts across interface boundaries and adds to it by providing additional methods tailored
to the goa use case.

The context exposes methods to access the request state and write the response in a generic way like
many other Go web frameworks. For example path parameters or querystring values can be accessed
using the method `Get` which returns a string. However goa goes one step further and leverages the
code generation provided by `goagen` to define *action specific* fields that provide access to
the same state using "typed" methods. So for example if a path parameter called `ID` is defined in
the design as being of type `Integer` the corresponding controller action method accepts a context
data structure which exposes a field named `ID` of type `int`. The same goes for the request payload
so that accessing the `Payload` field of an action context returns a data structure that is specific
to that action as described in the design. This alleviates the need for reflection or otherwise
"binding" the context to a struct.

The same goes for writing responses: while the underlying http ResponseWriter is available to write
the response, the action context also provides action specific methods for writing the responses
described in the design. These generated methods take care of writing the correct status code and
content-type header for example. They also make it possible to specify the response payload using
custom data structures generated from the media type described in the design.

As mentioned earlier each controller action context wraps a golang package context. This means that
deadlines and cancelation signals are available to all action implementations. The built-in
[Timeout](http://goa.design/reference/goa/middleware.html#func-timeout-a-name-middleware-timeout-a:37ab2f15ff048f67959bcac0a6032f32)
middleware takes advantage of this ability to let services or controllers define a timeout value
for all requests.
