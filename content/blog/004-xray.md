+++
date = "2017-01-19T11:01:06-05:00"
title = "Tracing goa Services with AWS X-Ray"
description = "Introducing the new Tracer and X-Ray goa middlewares"
author = "Raphael Simon"
weight = 9
layout = "blog"

[menu.main]
name = "Tracing with AWS X-Ray"
parent = "blog"
+++

AWS announced the availability of [X-Ray](https://aws.amazon.com/xray/) in beta
as one of the many [product announcements](https://aws.amazon.com/new/reinvent/)
that were made at the [re:Invent](https://reinvent.awsevents.com/) conference.

Like most (all?) tracing solutions AWS X-Ray follows the architecture initially
described in the [Google Dapper](https://research.google.com/pubs/pub36356.html)
paper. It even comes with a daemon that collects the metrics locally before
shipping them as described in the paper (and as opposed to something like
[Zipkin](https://zipkin.io)).

The AWS X-Ray console allows running some pretty sophisticated queries against
all the traces which is probably one of the most interesting aspect. Queries can
use the values of annotations attached to the traces so that one may correlate
fairly easily requests with other application specific identifiers such as
user IDs, session IDs etc.

After getting my hands on the bits (a simple matter of requesting access on the
AWS site) I set out to try it out with goa.

## Go? :(

It didn't go very far... there are currently three AWS X-Ray
[SDKs](https://aws.amazon.com/documentation/xray/): one for Node, another for
Java and the last one for C#. Notably absent is Go. And that's a problem
because while the generic [AWS SDK for Go](https://aws.amazon.com/sdk-for-go/)
does support the new X-Ray APIs, properly using X-Ray requires a lot more than
simply making API requests. The client code needs to assemble the information
on traces before shipping them and that takes a fair amount of work.

## Building Traces

At a high level tracing requests consists of:

* Keeping track of a unique *trace ID* that flows through all the services
  involved in serving the initial request.

* Creating a unique *segment* (a.k.a span) in each service. Requests made
  to downstream services point back to the parent segment so the tracing
  service (X-Ray) may rebuild the entire tree with timing information.

* Adding annotations and metadata to the segments. In X-Ray annotations can be
  used to build queries against the traced requests while metadata cannot.

* Reporting the completion of segments.

Each service receives the trace ID and parent segment ID in the incoming request
headers and reports them to X-Ray. It then creates a unique segment for the
request and sends the segment ID as parent segment ID alongside the trace ID to
all the downstream services in the request headers.

One case to consider here is when a service that is traced does not receive a
trace ID in the incoming request. This happens when the service is an externally
facing service that handles requests from external clients for example. In this
case the service is in charge of generating the trace ID. Typically when running
at scale it is not feasible to trace all requests - instead the algorithm that
creates the initial trace ID is given a sample rate and only generates IDs for
the given sample.

### The goa Tracer Middleware

The new
[Tracer](https://goa.design/v1/reference/goa/middleware/#func-tracer-a-name-middleware-tracer-a)
middleware implements the logic that looks for the trace and parent segment
headers. If the headers are found it stores them in the request context
otherwise it generates a new trace ID. It only generates an ID for a sample of
requests corresponding to the percentage value given to the middleware
constructor.

Both the trace ID and parent segment ID are available via the corresponding
[ContextXXX functions](https://goa.design/v1/reference/goa/middleware/#func-contexttraceid-a-name-middleware-contexttraceid-a).

## Integrating with AWS X-Ray

Using AWS X-Ray requires running
a [daemon](http://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html)
which accepts the trace information in the form of UDP packets and takes care of
aggregating multiple traces before shipping them to the AWS service.

Note: technically the daemon is not required and the traced service can make
direct requests to the AWS X-Ray APIs. However using the daemon is the preferred
way as it takes care of handling the aggregation of traces and timing of
requests - both difficult problems to solve with no intimate knowledge of the
APIs and the X-Ray service performance limits.

The traced service makes UDP requests to the daemon whenever a segment or
subsegment completes. The daemon then ships the traces to AWS X-Ray in batches.

### The goa X-Ray Middleware

Back to goa, writing the new [xray](https://goa.design/v1/reference/goa/middleware/xray/)
middleware was an exercise in reverse engineering of JavaScript code as the
documentation on X-Ray is still rather poor (the JSON schema for the segment
type is not documented for example). The only reliable source of information
is the source code for the Node.js SDK which can be retrieved via the
corresponding [npm package](https://www.npmjs.com/package/aws-xray-sdk).

The middleware leverages the Tracer middleware described above to retrieve the
trace and parent span IDs so it can build a
[segment](https://goa.design/v1/reference/goa/middleware/xray/#type-segment-a-name-xray-segment-a)
and store it in the request context. The segment can then be retrieved using the
[ContextSegment](https://goa.design/v1/reference/goa/middleware/xray/#func-contextsegment-a-name-xray-segment-contextsegment-a)
function.

Using the context segment one can:

* trace requests made to external services via [WrapClient](https://goa.design/v1/reference/goa/middleware/xray/#func-wrapclient-a-name-xray-doer-wrapclient-a)
* trace arbitrary section of code via [Capture](https://goa.design/v1/reference/goa/middleware/xray/#func-segment-capture-a-name-xray-segment-capture-a)
* add annotations via [AddAnnotation](https://goa.design/v1/reference/goa/middleware/xray/#func-segment-addannotation-a-name-xray-segment-addannotation-a)
* add metadata via [AddMetadata](https://goa.design/v1/reference/goa/middleware/xray/#func-segment-addmetadata-a-name-xray-segment-addmetadata-a)
* create child segments via [NewSubsegment](https://goa.design/v1/reference/goa/middleware/xray/#func-segment-newsubsegment-a-name-xray-segment-newsubsegment-a)

The tracer middleware also exposes [TraceDoer](https://goa.design/v1/reference/goa/middleware/#func-tracedoer-a-name-middleware-tracedoer-a)
which takes care of setting the trace headers for requests made to other traced services.

## Putting It All Together

So to recap, using AWS X-Ray in a goa service requires:

* mounting the Tracer middleware
* mounting the X-Ray middleware
* using `TraceDoer` when making requests to other traced services
* using `WrapClient` when making requests to external services
* optionally using `AddAnnotation` and `AddMetadata` to add annotation and metadata
* optionally using `Capture` to trace the execution of internal modules

### The xray Example

The new [xray](https://github.com/goadesign/examples/tree/master/xray) example
implements two services:

* The `archiver` service exposes an endpoint for archiving HTTP responses
* The `fetcher` service makes a request to an external service and a subsequent
  request to the `archiver` to store the resulting HTTP response.

This somewhat artificial example exercises both external and internal requests.
The code also annotates the traces with the request URL and response status code.

Here is the code that sets up the tracing middlewares in both services:

```
	// Setup Tracer middleware
	service.Use(middleware.Tracer(100, xray.NewID, xray.NewTraceID))

	// Setup AWS X-Ray middleware
	m, err := xray.New("fetcher", *daemon)
	if err != nil {
		service.LogError("xray", "err", err)
		os.Exit(1)
	}
	service.Use(m)
```
The code sets up the tracer middleware to sample `100%` of the requests.

The fetcher uses `WrapClient` to create the HTTP client it uses to make the
external requests:

```
func (c *FetcherController) Fetch(ctx *app.FetchFetcherContext) error {
	// Create traced client
	cl := xray.WrapClient(ctx, http.DefaultClient)
	// ...
```
It also uses `TraceDoer` to wrap the goa generated `archiver` client:
```
// Archive stores a HTTP response in the archiver service and returns the
// corresponding resource href.
func (a *archiver) Archive(ctx context.Context, status int, body string) (string, error) {
	// Wrap client with xray to trace request
	c := client.New(middleware.TraceDoer(ctx, a.doer))
	// ...
```

With that setup AWS X-Ray is able to build the trace tree and service graph,
pretty cool!

![X-Ray trace](https://raw.githubusercontent.com/goadesign/examples/master/xray/trace.png "AWS X-Ray trace")

### Limitations

The AWS X-Ray SDKs all provide "plugins" that one can use to wrap requests made
to backend databases or AWS services to build rich traces. This is not
implemented (yet?) in the goa package.

## Conclusion

So far AWS X-Ray seems to check all the boxes, as always though it's going to
take some time to properly understand the tool, what it's good at and what its
limitations are. But at least now it's possible to integrate with AWS X-Ray
using Go and goa. So go ahead, check out the new
[xray example](https://github.com/goadesign/examples/tree/master/xray) and add
traces to your goa micro-services which a few lines of code!
