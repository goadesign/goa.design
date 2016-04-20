+++
date = "2016-04-20T11:01:06-05:00"
title = "Working with Data Types"
+++
An impotant aspect of the goa DSL resides around how types are defined and used. The
[Overview](overview) covers the basics of working with types and media types. This document takes
a step back and explains the rationale for the DSL.

Data structures are described in the design using the
[Attribute](http://goa.design/reference/goa/design/apidsl/#func-attribute-a-name-apidsl-attribute-a)
function or one of its aliases (`Member`, `Header` or `Param`). This description exists in the
absolute - that is it is not relative to a given language (e.g. `Go`) or technology. This makes it
possible to generate many outputs ranging from `Go` code to documentation in the form of JSON schema
and Swagger or binding to other languages (e.g. JavaScript clients). The design language includes a
number of primitive types listed in the [Overview](overview) but also makes it possible to describe
arbitrary data structures recursively via the
[Type](http://goa.design/reference/goa/design/apidsl/#func-type-a-name-apidsl-type-a) function.

# Request Payload

One of the main application for types defined that way is to describe the request payload of a
given action. The request payload describes the shape of the request body. `goagen` uses that
description to generate the corresponding `Go` struct that the action method receives in its
request context. Payloads may be defined inline as follows:

```go
Action("create", func() {
	Routing(POST(""))
	Payload(func() {
		Member("name")
	})
	Response(Created, "/accounts/[0-9]+")
})
```

or can use a predefined type:

```go
var CreatePayload = Type("CreatePayload", func() {
	Attribute("name")
})

Action("create", func() {
	Routing(POST(""))
	Payload(CreatePayload)
	Response(Created, "/accounts/[0-9]+")
})
```

The former notation ends up creating an anonymous type used internally by the generators. Note that
the DSL is recursive, the example above does not specify a type for the `name` attribute thereby
defaulting to `String`. But it could have used any other type including a data structure defined
inline or via a predefined type:

```go
Action("create", func() {
	Routing(POST(""))
	Payload(func() {
		Member("address", func() {
            Attribute("street")
            Attribute("number", Integer)
        })
	})
	Response(Created, "/accounts/[0-9]+")
})
```

or:

```go
Action("create", func() {
	Routing(POST(""))
	Payload(func() {
		Member("name", Address) // where Address is a predefined type
	})
	Response(Created, "/accounts/[0-9]+")
})
```

That same flexibility exists wherever attributes are used. Predefined types may be referred to using
a variable as shown above or using their name, that is `Payload(CreatePayload)` could also be
written as `Payload("CreatePayload")` because that's the name given in the `CreatePayload` type
definition. This makes it possible to define types that depend on each other and not have the `Go`
compiler complain about the cycle.

# Media Types

Another common use for types is for describing response media types. A response media type defines
the shape of response bodies. Media types differ from types in that they also define *views* and
*links*, see the [Overview](overview) for details. Media types are defined using the
[MediaType](http://goa.design/reference/goa/design/apidsl/#func-mediatype-a-name-apidsl-mediatype-a)
function.

A basic media type definition may looks like this:

```go
var MT = MediaType("application/vnd.app.mt", func() {
	Attributes(func() {
		Attribute("name")
	})
	View("default", func() {
		Attribute("name")
	})
})
```

The first argument of `MediaType` is the media type identifier as defined by 
[RFC 6838](https://tools.ietf.org/html/rfc6838). The DSL lists the attributes similarly to how
attributes are defined in types, the views - here only the `default` view - and optionally links to
other media types.

Such a media type may then be used to define the response of an action as follows:

```go
Action("show", func() {
	Routing(GET("/:accountID"))
	Params(func() {
		Param("accountID", Integer, "Account ID")
	})
	Response(OK, func() {
		Media(MT)
	})
	Response(NotFound)
})
```

which is equivalent to:

```go
Action("show", func() {
	Routing(GET("/:accountID"))
	Params(func() {
		Param("accountID", Integer, "Account ID")
	})
	Response(OK, MT)
	Response(NotFound)
})
```

or:

```go
Action("show", func() {
	Routing(GET("/:accountID"))
	Params(func() {
		Param("accountID", Integer, "Account ID")
	})
	Response(OK, "application/vnd.app.mt")
	Response(NotFound)
})
```

Media types can be referred to using variables or the media type identifier similarly to how types
can be referred to using variables or their names.

It is often the case that the same attributes are used to define an action request payload and a
response media type. This is especially true with REST APIs where sending a requet to create a 
resource often times returns a representation of it in the response. The goa design language helps
with this common case by providing a `Reference` function that may be used in both `Type` and
`MediaType` function calls alike. This function takes one argument which is either a variable
holding a type or a media type or the name of a type or media type. Using the `Reference` function
makes it possible to reuse the attributes of the type being referred to without having to
redefine all its properties (type, description, example, validations etc.).

Given the following type definition:

```go
var CreatePayload = Type("CreatePayload", func() {
	Attribute("name", String, "Name of thingy", func() {
		MinLength(5)
		MaxLength(256)
		Pattern("^[a-zA-Z]([a-zA-Z ]+)")
	})
})
```

A media type may take advantage of the `name` attribute definition like this:

```go
var MT = MediaType("application/vnd.app.mt", func() {
	Reference(CreatePayload)
	Attributes(func() {
		Attribute("name")
	})
	View("default", func() {
		Attribute("name")
	})
})
```

The `name` attribute automatically inherits from the type, description and validations defined in
the corresponding `CreatePayload` attribute. Note that the media type definition still needs to list
the names of attributes being referred to, this makes it possible to pick and choose which
attributes to "inherit". Also the media type may override properties of the `name` attribute if
needed (e.g. to change the type, description, validations etc.).

# Mixing Types and Media Types

We've already seen how `Reference` makes it possible to reuse attribute definitions across types
and media types. Media types are a specialized form of types. This means that they may be used in
place of types wherever types can be used (anywhere an attribute is defined).

The best practice though consists of using media types solely for defining the response bodies as
shown above and use types for everything else. This is because media types define additional
properties such as an identifier, views and links that only apply to that use case. So define
types and take advantage of the `Reference` keyword when the same attributes are shared between
types and media types.
