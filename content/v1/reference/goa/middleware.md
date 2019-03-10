+++
date="2019-03-09T22:12:53-08:00"
description="github.com/goadesign/goa/middleware"
+++


# middleware
`import "github.com/goadesign/goa/middleware"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [func ContextParentSpanID(ctx context.Context) string](#ContextParentSpanID)
* [func ContextRequestID(ctx context.Context) (reqID string)](#ContextRequestID)
* [func ContextSpanID(ctx context.Context) string](#ContextSpanID)
* [func ContextTraceID(ctx context.Context) string](#ContextTraceID)
* [func ErrorHandler(service *goa.Service, verbose bool) goa.Middleware](#ErrorHandler)
* [func LogRequest(verbose bool, sensitiveHeaders ...string) goa.Middleware](#LogRequest)
* [func LogResponse() goa.Middleware](#LogResponse)
* [func NewTracer(opts ...TracerOption) goa.Middleware](#NewTracer)
* [func Recover() goa.Middleware](#Recover)
* [func RequestID() goa.Middleware](#RequestID)
* [func RequestIDWithHeader(requestIDHeader string) goa.Middleware](#RequestIDWithHeader)
* [func RequestIDWithHeaderAndLengthLimit(requestIDHeader string, lengthLimit int) goa.Middleware](#RequestIDWithHeaderAndLengthLimit)
* [func RequireHeader(service *goa.Service, pathPattern *regexp.Regexp, requiredHeaderName string, requiredHeaderValue *regexp.Regexp, failureStatus int) goa.Middleware](#RequireHeader)
* [func Timeout(timeout time.Duration) goa.Middleware](#Timeout)
* [func TraceDoer(doer client.Doer) client.Doer](#TraceDoer)
* [func Tracer(sampleRate int, spanIDFunc, traceIDFunc IDFunc) goa.Middleware](#Tracer)
* [func WithTrace(ctx context.Context, traceID, spanID, parentID string) context.Context](#WithTrace)
* [type IDFunc](#IDFunc)
* [type Sampler](#Sampler)
  * [func NewAdaptiveSampler(maxSamplingRate, sampleSize int) Sampler](#NewAdaptiveSampler)
  * [func NewFixedSampler(samplingPercent int) Sampler](#NewFixedSampler)
* [type TracerOption](#TracerOption)
  * [func MaxSamplingRate(r int) TracerOption](#MaxSamplingRate)
  * [func SampleSize(s int) TracerOption](#SampleSize)
  * [func SamplingPercent(p int) TracerOption](#SamplingPercent)
  * [func SpanIDFunc(f IDFunc) TracerOption](#SpanIDFunc)
  * [func TraceIDFunc(f IDFunc) TracerOption](#TraceIDFunc)


#### <a name="pkg-files">Package files</a>
[context.go](/src/github.com/goadesign/goa/middleware/context.go) [error_handler.go](/src/github.com/goadesign/goa/middleware/error_handler.go) [log_request.go](/src/github.com/goadesign/goa/middleware/log_request.go) [log_response.go](/src/github.com/goadesign/goa/middleware/log_response.go) [recover.go](/src/github.com/goadesign/goa/middleware/recover.go) [request_id.go](/src/github.com/goadesign/goa/middleware/request_id.go) [required_header.go](/src/github.com/goadesign/goa/middleware/required_header.go) [sampler.go](/src/github.com/goadesign/goa/middleware/sampler.go) [timeout.go](/src/github.com/goadesign/goa/middleware/timeout.go) [tracer.go](/src/github.com/goadesign/goa/middleware/tracer.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // RequestIDHeader is the name of the header used to transmit the request ID.
    RequestIDHeader = "X-Request-Id"

    // DefaultRequestIDLengthLimit is the default maximum length for the request ID header value.
    DefaultRequestIDLengthLimit = 128
)
```

## <a name="pkg-variables">Variables</a>
``` go
var (
    // TraceIDHeader is the name of the HTTP request header containing the
    // current TraceID if any.
    TraceIDHeader = "TraceID"

    // ParentSpanIDHeader is the name of the HTTP request header containing
    // the parent span ID if any.
    ParentSpanIDHeader = "ParentSpanID"
)
```


## <a name="ContextParentSpanID">func</a> [ContextParentSpanID](/src/target/tracer.go?s=5590:5642#L190)
``` go
func ContextParentSpanID(ctx context.Context) string
```
ContextParentSpanID returns the parent span ID extracted from the given
context if any, the empty string otherwise.



## <a name="ContextRequestID">func</a> [ContextRequestID](/src/target/request_id.go?s=2418:2475#L76)
``` go
func ContextRequestID(ctx context.Context) (reqID string)
```
ContextRequestID extracts the Request ID from the context.



## <a name="ContextSpanID">func</a> [ContextSpanID](/src/target/tracer.go?s=5342:5388#L181)
``` go
func ContextSpanID(ctx context.Context) string
```
ContextSpanID returns the span ID extracted from the given context if any,
the empty string otherwise.



## <a name="ContextTraceID">func</a> [ContextTraceID](/src/target/tracer.go?s=5105:5152#L172)
``` go
func ContextTraceID(ctx context.Context) string
```
ContextTraceID returns the trace ID extracted from the given context if any,
the empty string otherwise.



## <a name="ErrorHandler">func</a> [ErrorHandler](/src/target/error_handler.go?s=650:718#L18)
``` go
func ErrorHandler(service *goa.Service, verbose bool) goa.Middleware
```
ErrorHandler turns a Go error into an HTTP response. It should be placed in the middleware chain
below the logger middleware so the logger properly logs the HTTP response. ErrorHandler
understands instances of goa.ServiceError and returns the status and response body embodied in
them, it turns other Go error types into a 500 internal error response.
If verbose is false the details of internal errors is not included in HTTP responses.
If you use github.com/pkg/errors then wrapping the error will allow a trace to be printed to the logs



## <a name="LogRequest">func</a> [LogRequest](/src/target/log_request.go?s=430:502#L23)
``` go
func LogRequest(verbose bool, sensitiveHeaders ...string) goa.Middleware
```
LogRequest creates a request logger middleware.
This middleware is aware of the RequestID middleware and if registered after it leverages the
request ID for logging.
If verbose is true then the middlware logs the request and response bodies.



## <a name="LogResponse">func</a> [LogResponse](/src/target/log_response.go?s=727:760#L27)
``` go
func LogResponse() goa.Middleware
```
LogResponse creates a response logger middleware.
Only Logs the raw response data without accumulating any statistics.



## <a name="NewTracer">func</a> [NewTracer](/src/target/tracer.go?s=3476:3527#L121)
``` go
func NewTracer(opts ...TracerOption) goa.Middleware
```
NewTracer returns a trace middleware that initializes the trace information
in the request context. The information can be retrieved using any of the
ContextXXX functions.

samplingPercent must be a value between 0 and 100. It represents the percentage
of requests that should be traced. If the incoming request has a Trace ID
header then the sampling rate is disregarded and the tracing is enabled.

spanIDFunc and traceIDFunc are the functions used to create Span and Trace
IDs respectively. This is configurable so that the created IDs are compatible
with the various backend tracing systems. The xray package provides
implementations that produce AWS X-Ray compatible IDs.



## <a name="Recover">func</a> [Recover](/src/target/recover.go?s=187:216#L15)
``` go
func Recover() goa.Middleware
```
Recover is a middleware that recovers panics and maps them to errors.



## <a name="RequestID">func</a> [RequestID](/src/target/request_id.go?s=2274:2305#L71)
``` go
func RequestID() goa.Middleware
```
RequestID is a middleware that injects a request ID into the context of each request.
Retrieve it using ctx.Value(ReqIDKey). If the incoming request has a RequestIDHeader header then
that value is used else a random value is generated.



## <a name="RequestIDWithHeader">func</a> [RequestIDWithHeader](/src/target/request_id.go?s=1070:1133#L45)
``` go
func RequestIDWithHeader(requestIDHeader string) goa.Middleware
```
RequestIDWithHeader behaves like the middleware RequestID, but it takes the request id header
as the (first) argument.



## <a name="RequestIDWithHeaderAndLengthLimit">func</a> [RequestIDWithHeaderAndLengthLimit](/src/target/request_id.go?s=1506:1600#L52)
``` go
func RequestIDWithHeaderAndLengthLimit(requestIDHeader string, lengthLimit int) goa.Middleware
```
RequestIDWithHeaderAndLengthLimit behaves like the middleware RequestID, but it takes the
request id header as the (first) argument and a length limit for truncation of the request
header value if it exceeds a reasonable length. The limit can be negative for unlimited.



## <a name="RequireHeader">func</a> [RequireHeader](/src/target/required_header.go?s=432:603#L17)
``` go
func RequireHeader(
    service *goa.Service,
    pathPattern *regexp.Regexp,
    requiredHeaderName string,
    requiredHeaderValue *regexp.Regexp,
    failureStatus int) goa.Middleware
```
RequireHeader requires a request header to match a value pattern. If the
header is missing or does not match then the failureStatus is the response
(e.g. http.StatusUnauthorized). If pathPattern is nil then any path is
included. If requiredHeaderValue is nil then any value is accepted so long as
the header is non-empty.



## <a name="Timeout">func</a> [Timeout](/src/target/timeout.go?s=1029:1079#L31)
``` go
func Timeout(timeout time.Duration) goa.Middleware
```
Timeout sets a global timeout for all controller actions.
The timeout notification is made through the context, it is the responsability of the request
handler to handle it. For example:


	func (ctrl *Controller) DoLongRunningAction(ctx *DoLongRunningActionContext) error {
		action := NewLongRunning()      // setup long running action
		c := make(chan error, 1)        // create return channel
		go func() { c <- action.Run() } // Launch long running action goroutine
		select {
		case <- ctx.Done():             // timeout triggered
			action.Cancel()         // cancel long running action
			<-c                     // wait for Run to return.
			return ctx.Err()        // retrieve cancel reason
		case err := <-c:   		// action finished on time
			return err  		// forward its return value
		}
	}

Controller actions can check if a timeout is set by calling the context Deadline method.



## <a name="TraceDoer">func</a> [TraceDoer](/src/target/tracer.go?s=4918:4962#L166)
``` go
func TraceDoer(doer client.Doer) client.Doer
```
TraceDoer wraps a goa client Doer and sets the trace headers so that the
downstream service may properly retrieve the parent span ID and trace ID.



## <a name="Tracer">func</a> [Tracer](/src/target/tracer.go?s=4588:4662#L160)
``` go
func Tracer(sampleRate int, spanIDFunc, traceIDFunc IDFunc) goa.Middleware
```
Tracer is deprecated in favor of NewTracer.



## <a name="WithTrace">func</a> [WithTrace](/src/target/tracer.go?s=5816:5901#L199)
``` go
func WithTrace(ctx context.Context, traceID, spanID, parentID string) context.Context
```
WithTrace returns a context containing the given trace, span and parent span
IDs.




## <a name="IDFunc">type</a> [IDFunc](/src/target/tracer.go?s=530:550#L24)
``` go
type IDFunc func() string
```
IDFunc is a function that produces span and trace IDs for cosumption by
tracing systems such as Zipkin or AWS X-Ray.










## <a name="Sampler">type</a> [Sampler](/src/target/sampler.go?s=162:258#L12)
``` go
type Sampler interface {
    // Sample returns true if the caller should sample now.
    Sample() bool
}
```
Sampler is an interface for computing when a sample falls within a range.







### <a name="NewAdaptiveSampler">func</a> [NewAdaptiveSampler](/src/target/sampler.go?s=1077:1141#L43)
``` go
func NewAdaptiveSampler(maxSamplingRate, sampleSize int) Sampler
```
NewAdaptiveSampler computes the interval for sampling for tracing middleware.
it can also be used by non-web go routines to trace internal API calls.

maxSamplingRate is the desired maximum sampling rate in requests per second.

sampleSize sets the number of requests between two adjustments of the
sampling rate when MaxSamplingRate is set. the sample rate cannot be adjusted
until the sample size is reached at least once.


### <a name="NewFixedSampler">func</a> [NewFixedSampler](/src/target/sampler.go?s=1603:1652#L59)
``` go
func NewFixedSampler(samplingPercent int) Sampler
```
NewFixedSampler sets the tracing sampling rate as a percentage value.





## <a name="TracerOption">type</a> [TracerOption](/src/target/tracer.go?s=650:698#L28)
``` go
type TracerOption func(*tracerOptions) *tracerOptions
```
TracerOption is a constructor option that makes it possible to customize
the middleware.







### <a name="MaxSamplingRate">func</a> [MaxSamplingRate](/src/target/tracer.go?s=2243:2283#L87)
``` go
func MaxSamplingRate(r int) TracerOption
```
MaxSamplingRate sets a target sampling rate in requests per second. Setting a
max sampling rate causes the middleware to adjust the sampling percent
dynamically.
SamplingPercent and MaxSamplingRate are mutually exclusive.


### <a name="SampleSize">func</a> [SampleSize](/src/target/tracer.go?s=2581:2616#L99)
``` go
func SampleSize(s int) TracerOption
```
SampleSize sets the number of requests between two adjustments of the sampling
rate when MaxSamplingRate is set. Defaults to 1,000.


### <a name="SamplingPercent">func</a> [SamplingPercent](/src/target/tracer.go?s=1800:1840#L73)
``` go
func SamplingPercent(p int) TracerOption
```
SamplingPercent sets the tracing sampling rate as a percentage value.
It panics if p is less than 0 or more than 100.
SamplingPercent and MaxSamplingRate are mutually exclusive.


### <a name="SpanIDFunc">func</a> [SpanIDFunc](/src/target/tracer.go?s=1425:1463#L60)
``` go
func SpanIDFunc(f IDFunc) TracerOption
```
SpanIDFunc is a constructor option that overrides the function used to
compute span IDs.


### <a name="TraceIDFunc">func</a> [TraceIDFunc](/src/target/tracer.go?s=1139:1178#L48)
``` go
func TraceIDFunc(f IDFunc) TracerOption
```
TraceIDFunc is a constructor option that overrides the function used to
compute trace IDs.









- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
