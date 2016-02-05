+++
date = "2016-01-30T11:01:06-05:00"
title = "Implementing goa Services"
+++

Once the [design](../design/overview.md) of the API is completed and [goagen](goagen.md) has
generated the low level handlers the next step consists of implementing the actual action handlers.

`goagen` generates a controller interface for each resource. It also generates `MountXXXController`
methods all in the `app` package. The controller mounting methods accept an instance of an object
that implements the corresponding controller interface and take care of hooking unp the low level
HTTP router with the corresponding methods.

The glue code that binds the controller object methods with the HTTP router also takes care of
instantiating the action specific [context](context.md) objects. These objects wrap the request
state and make it available through properly types struct fields. This means that the handler code
does not need to cast or otherwise "bind" the context fields.

The controller methods can also log and send the response using the context methods. The service
implementation may also define [middleware](middleware.md) and mount them service-wide or on
specific controllers.
