+++
date = "2016-08-02T11:01:06-05:00"
title = "Hello, goa"
description = "Announcing goa v1.0.0"
author = "Raphael Simon"
+++

Today I'm very excited to announce the release of [goa
v1.0.0](https://github.com/goadesign/goa/releases/tag/v1.0.0). goa provides a design first approach
for building microservices in Go. It consists of three parts: a DSL for describing the API design, a
code generation tool that generates an [OpenAPI](https://openapis.org) specification as well as
boilerplate code for the service and the clients, and a set of library packages leveraged by both
the generated and non generated code. This release represents the culmination of 2 years of work
spanning 5 complete rewrites. During this time goa evolved from being a pet experiment to becoming a
strategic tool used by many organizations and with a striving and growing community.

The reason for goa's success is clear: anyone working in an environment where multiple teams develop
services concurrently understands its value immediately. In such environments developers need to
document the service APIs continuously and in great details so that other teams can build services
on top. Often times the API design needs to go through a review process where the API developer is
responsible for providing a detailed documentation of the current API and for implementing all the
changes approved during the review.  Designing an API is not a one time activity either - it's an
iterative process. This puts a lot of burden on developers as they need to keep the design
documentation up-to-date and visible to all the stakeholders at all time.

goa provides that real time detailed documentation and more importantly the confidence that the
implementation matches the documented design.

## The Road To V1

goa started as an experiment to reproduce the benefits of the design first approach initially
promoted by the [Praxis](http://praxis-framework.io/) ruby framework developed by the [RightScale
team](http://eng.rightscale.com/).  You can see the evolution of goa by looking at the "archive.vN"
branches in the [repo](https://github.com/goadesign/goa). And if you do you'll note a few key
differences between each version. That's because there were a few important realizations that
contributed to the current design.

### Keep The Design And Implementation Code Separate

First and foremost was the realization that the code that enables the design of the API must be kept
separate from the code that enables the implementation. The
[initial implementation](https://github.com/goadesign/goa/tree/archive.v1) of goa mixed the two
resulting in complex dependency problems and overall confusion. Teasing these apart resulted in
much cleaner code both for the goa packages but also for the user implementation of the service.

### A Design DSL

The various goa iterations used different approaches for making it possible to describe the API
design.  The initial version used Go struct literals which resulted in designs that were impossible
to read thereby defeating the purpose. Other iterations attempted to use struct tags but again the
end result was very poor user experience. Yet another approach consisted of using the Go parser to
parse the design code but that made it very hard to reason about execution versus definition of the
design code.

In the end it became clear that the best approach is to let the designer describe the design simply
by calling functions that goa implements to create design definition structs. This provides both an
opportunity to create a concise and specialized "language" for describing the design and a natural
way for designers to extend the built-in language by implementing their own functions. These
functions can call the built-in functions or manipulate the design structs directly.

### Code Generation

Last but not least was the realization that the best way to enforce the decoupling between design
and implementation would be to generate the implementation code. This provides the needed ability to
update the implementation dynamically depending on the design without having to use any of the
design definitions directly. It also provides for a much more performant approach compared to the
alternative consisting of implementing a generic engine that consumes design definitions to
manipulate runtime data.

So there you have it: clear separation of design and implementation done through a DSL that creates
design definition structs used by code generation algorithms - goa v1.0!

## The Benefits Of Design As Single Source Of Truth

The reality is that not all current goa users fit into the description provided above - that is
teams working concurrently on related services. Many have found goa useful to develop isolated
services as well.  That's because with goa you get to describe your API once and reap the benefits
multiple times. Not only do you get up-to-date generated documentation in the form of an [Open
API](https://openapis.org/) specification but you also get all the service boilerplate code
including encoder and decoder configuration, mux setup, input validation, marshaling and
unmarshaling etc. You get test helpers, a client Go package, a self-documenting client tool - even a
JavaScript client module.

The ability to generate all these outputs wasn't immediately obvious but in retrospect makes a lot
of sense: the design DSL is the single source of truth from which many aspects of the service can be
derived. The DSL provides a nice way for humans to describe the design while the structs that result
from its execution provide a great source for programs.

## V1?

So why release v1 now? As the first wave of goa services hit production at RightScale and many other
places there is a need for establishing a stable base that the teams know they can rely on for
maintaining these services. The current feature set feels complete enough and is nicely self
contained. Also while goa services are already running in production, goa is still young and many of
the ideas being discussed in the [roadmap](https://github.com/goadesign/goa/blob/master/roadmap.md)
require breaking changes. Releasing v1 thus makes it possible to start working on these new features
without having to worry about backwards compatibility.

### How To Use V1

The simplest way to consume goa v1.0.0 is to use vendoring and to pin the version in the vendor
definition file to the git tag `v1.0.0`. The [github repo](https://github.com/goadesign/goa) also
contains [release archives](https://github.com/goadesign/goa/releases) that you may download.

There is also a [v1 branch](https://github.com/goadesign/goa/tree/v1) which contains the current
`v1.0.0` tag and will contain all future `v1.x.y` release tags.

Note that vendoring goa is a bit more complicated than just vendoring a Go package as it is also
important to vendor the [goagen](http://goa.design/implement/goagen/) tool. The website describes a
[strategy](http://goa.design/design/vendoring/) for doing this using
[glide](https://github.com/Masterminds/glide).

Going forward the goal is to follow [Semantic Versioning](http://semver.org/) and to release bug
fixes as needed for v1 while working on vNext.

## The Road To V2

Which brings us to the future of goa. There are a few key areas that keep coming up where extending
goa could provide a lot of value. Note that these are just current ideas, the roadmap is fairly
fluid as the input of the community drives its content.

### Protocol Buffers And gRPC

Today the sweet spot for goa is REST APIs and while non REST APIs can also be designed the end
result must be an HTTP service. Protocol Buffers offer a promising alternative to encodings
such as JSON whose performance can become an issue at scale. It seems interesting to make it
possible to use Protocol Buffers on top of HTTP2 as "just another encoding".

The next step is to make it possible to replace HTTP entirely and substitute it with
[gRPC](https://www.grpc.io). This adds a completely new dimension to goa better suited for people
looking at building microservices using RPC rather than something like REST. The trick is to enable
that integration while also improving the REST support.

### Extending The SSOT

Maybe the most interesting aspect of the DSL is the fact at the DSL engine is nicely decoupled from
the actual syntax. goa makes it easy to [generate custom
outputs](http://goa.design/extend/generators/) from the existing design definition structs. More
interestingly maybe goa also makes it simple to [implement custom
DSLs](http://goa.design/extend/dsls/). Combined together the ability to generate any output and to
define any DSL enables some very interesting use cases such as the
[gorma](http://goa.design/extend/gorma/) plugin which can be used to describe database models and
generate code that loads or renders data.

There are many other applications to the DSL, for example it would be nice to generate mock clients
to enable testing services in isolation or simple UIs that can exercise the API or kubernetes
cluster definition files that bind together multiple services. There are obviously some tradeoffs -
new DSLs also need to be learned and corresponding designs maintain - but if applied well there are
some very interesting and exciting opportunities for new goa plugins.

## The goa Community - Thank You!

This provides for a great transition into what was the biggest surprise to me with goa: The Go
community [took notice](https://twitter.com/bketelsen/status/666786731807662081) last November and
since then has made countless contributions - not only to the code base - but also in terms of
ideas, feedback and in general driving the development of goa. I know how it sounds, you've read it
before and yet it's true: goa is a much better tool today thanks to the Go community. A big thank
you to all of you that have made contributions - you know who you are.

If you would like to hear more about goa I go into more details in
[episode #7](https://changelog.com/gotime-7/) of Go Time.

I am looking forward to seeing goa evolve as others join and start contributing as well, this is
just the beginning!

