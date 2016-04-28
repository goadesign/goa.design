+++
date = "2016-01-30T11:01:06-05:00"
title = "Implementing goa Services"
+++

Once the [design](/design/overview) of the API is completed and [goagen](/implement/goagen) has
generated the low level handlers the next step consists of implementing the actual action handlers.

`goagen` generates a controller interface for each resource. It also generates `MountXXXController`
methods all in the `app` package. The controller mounting methods accept an instance of an object
that implements the corresponding controller interface and take care of hooking up the low level
HTTP router with the corresponding methods.

The glue code that binds the controller object methods with the HTTP router also takes care of
instantiating the action specific [context](/implement/context) objects. These objects wrap the
request state and make it available through properly typed struct fields. This means that the
handler code does not need to cast or otherwise "bind" the context fields.

The controller methods can also log and send the response using the context methods. The service
implementation may also define [middleware](/implement/middleware) and mount them service-wide or on
specific controllers.
