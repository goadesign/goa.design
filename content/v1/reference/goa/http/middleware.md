+++
date="2018-09-06T11:21:50-07:00"
description="github.com/goadesign/goa/http/middleware"
+++


# middleware
`import "github.com/goadesign/goa/http/middleware"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [func Debug(mux goahttp.Muxer, w io.Writer) func(http.Handler) http.Handler](#Debug)
* [func Log(l Logger) func(h http.Handler) http.Handler](#Log)
* [func PopulateRequestContext() func(http.Handler) http.Handler](#PopulateRequestContext)
* [func RequestContext(ctx context.Context) func(http.Handler) http.Handler](#RequestContext)
* [func RequestContextKeyVals(keyvals ...interface{}) func(http.Handler) http.Handler](#RequestContextKeyVals)
* [func RequestID(options ...RequestIDOption) func(http.Handler) http.Handler](#RequestID)
* [func Trace(opts ...Option) func(http.Handler) http.Handler](#Trace)
* [func WithSpan(ctx context.Context, traceID, spanID, parentID string) context.Context](#WithSpan)
* [func WithTrace(ctx context.Context, traceID string) context.Context](#WithTrace)
* [type Doer](#Doer)
  * [func WrapDoer(doer Doer) Doer](#WrapDoer)
* [type IDFunc](#IDFunc)
* [type Logger](#Logger)
  * [func NewLogger(l *log.Logger) Logger](#NewLogger)
  * [func WrapLogger(l Logger, traceID string) Logger](#WrapLogger)
* [type Option](#Option)
  * [func MaxSamplingRate(r int) Option](#MaxSamplingRate)
  * [func SampleSize(s int) Option](#SampleSize)
  * [func SamplingPercent(p int) Option](#SamplingPercent)
  * [func SpanIDFunc(f IDFunc) Option](#SpanIDFunc)
  * [func TraceIDFunc(f IDFunc) Option](#TraceIDFunc)
* [type RequestIDOption](#RequestIDOption)
  * [func UseXRequestIDHeaderOption(f bool) RequestIDOption](#UseXRequestIDHeaderOption)
  * [func XRequestHeaderLimitOption(limit int) RequestIDOption](#XRequestHeaderLimitOption)
* [type ResponseCapture](#ResponseCapture)
  * [func CaptureResponse(w http.ResponseWriter) *ResponseCapture](#CaptureResponse)
  * [func (w *ResponseCapture) Hijack() (net.Conn, *bufio.ReadWriter, error)](#ResponseCapture.Hijack)
  * [func (w *ResponseCapture) Write(b []byte) (int, error)](#ResponseCapture.Write)
  * [func (w *ResponseCapture) WriteHeader(code int)](#ResponseCapture.WriteHeader)
* [type Sampler](#Sampler)
  * [func NewAdaptiveSampler(maxSamplingRate, sampleSize int) Sampler](#NewAdaptiveSampler)
  * [func NewFixedSampler(samplingPercent int) Sampler](#NewFixedSampler)


#### <a name="pkg-files">Package files</a>
[capture.go](/src/github.com/goadesign/goa/http/middleware/capture.go) [context.go](/src/github.com/goadesign/goa/http/middleware/context.go) [ctxkeys.go](/src/github.com/goadesign/goa/http/middleware/ctxkeys.go) [debug.go](/src/github.com/goadesign/goa/http/middleware/debug.go) [log.go](/src/github.com/goadesign/goa/http/middleware/log.go) [request.go](/src/github.com/goadesign/goa/http/middleware/request.go) [requestid.go](/src/github.com/goadesign/goa/http/middleware/requestid.go) [sampler.go](/src/github.com/goadesign/goa/http/middleware/sampler.go) [trace.go](/src/github.com/goadesign/goa/http/middleware/trace.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // RequestIDKey is the request context key used to store the request ID
    // created by the RequestID middleware.
    RequestIDKey ctxKey = iota + 1

    // TraceIDKey is the request context key used to store the current Trace
    // ID if any.
    TraceIDKey

    // TraceSpanIDKey is the request context key used to store the current
    // trace span ID if any.
    TraceSpanIDKey

    // TraceParentSpanIDKey is the request context key used to store the current
    // trace parent span ID if any.
    TraceParentSpanIDKey

    // RequestMethodKey is the request context key used to store r.Method created by
    // the PopulateRequestContext middleware.
    RequestMethodKey

    // RequestURIKey is the request context key used to store r.RequestURI created by
    // the PopulateRequestContext middleware.
    RequestURIKey

    // RequestPathKey is the request context key used to store r.URL.Path created by
    // the PopulateRequestContext middleware.
    RequestPathKey

    // RequestProtoKey is the request context key used to store r.Proto created by
    // the PopulateRequestContext middleware.
    RequestProtoKey

    // RequestHostKey is the request context key used to store r.Host created by
    // the PopulateRequestContext middleware.
    RequestHostKey

    // RequestRemoteAddrKey is the request context key used to store r.RemoteAddr
    // created by the PopulateRequestContext middleware.
    RequestRemoteAddrKey

    // RequestXForwardedForKey is the request context key used to store the
    // X-Forwarded-For header created by the PopulateRequestContext middleware.
    RequestXForwardedForKey

    // RequestXForwardedProtoKey is the request context key used to store the
    // X-Forwarded-Proto header created by the PopulateRequestContext middleware.
    RequestXForwardedProtoKey

    // RequestXRealIPKey is the request context key used to store the
    // X-Real-IP header created by the PopulateRequestContext middleware.
    RequestXRealIPKey

    // RequestAuthorizationKey is the request context key used to store the
    // Authorization header created by the PopulateRequestContext middleware.
    RequestAuthorizationKey

    // RequestRefererKey is the request context key used to store Referer header
    // created by the PopulateRequestContext middleware.
    RequestRefererKey

    // RequestUserAgentKey is the request context key used to store the User-Agent
    // header created by the PopulateRequestContext middleware.
    RequestUserAgentKey

    // RequestXRequestIDKey is the request context key used to store the X-Request-Id
    // header created by the PopulateRequestContext middleware.
    RequestXRequestIDKey

    // RequestAcceptKey is the request context key used to store the Accept header
    // created by the PopulateRequestContext middleware.
    RequestAcceptKey

    // RequestXCSRFTokenKey is the request context key used to store X-Csrf-Token header
    // created by the PopulateRequestContext middleware.
    RequestXCSRFTokenKey
)
```
``` go
const (
    // TraceIDHeader is the default name of the HTTP request header
    // containing the current TraceID if any.
    TraceIDHeader = "TraceID"

    // ParentSpanIDHeader is the default name of the HTTP request header
    // containing the parent span ID if any.
    ParentSpanIDHeader = "ParentSpanID"
)
```



## <a name="Debug">func</a> [Debug](/src/target/debug.go?s=491:565#L27)
``` go
func Debug(mux goahttp.Muxer, w io.Writer) func(http.Handler) http.Handler
```
Debug returns a debug middleware which prints detailed information about
incoming requests and outgoing responses including all headers, parameters
and bodies.



## <a name="Log">func</a> [Log](/src/target/log.go?s=1091:1143#L38)
``` go
func Log(l Logger) func(h http.Handler) http.Handler
```
Log returns a middleware that logs incoming HTTP requests and outgoing
responses. The middleware uses the request ID set by the RequestID middleware
or creates a short unique request ID if missing for each incoming request and
logs it with the request and corresponding response details.

The middleware logs the incoming requests HTTP method and path as well as the
originator of the request. The originator is computed by looking at the
X-Forwarded-For HTTP header or - absent of that - the originating IP. The
middleware also logs the response HTTP status code, body length (in bytes) and
timing information.



## <a name="PopulateRequestContext">func</a> [PopulateRequestContext](/src/target/request.go?s=278:339#L11)
``` go
func PopulateRequestContext() func(http.Handler) http.Handler
```
PopulateRequestContext returns a middleware which populates a number of standard HTTP reqeust
values into the request context. Those values may be extracted using the
corresponding ContextKey type in this package.



## <a name="RequestContext">func</a> [RequestContext](/src/target/context.go?s=133:205#L9)
``` go
func RequestContext(ctx context.Context) func(http.Handler) http.Handler
```
RequestContext returns a middleware which initializes the request context.



## <a name="RequestContextKeyVals">func</a> [RequestContextKeyVals](/src/target/context.go?s=484:566#L19)
``` go
func RequestContextKeyVals(keyvals ...interface{}) func(http.Handler) http.Handler
```
RequestContextKeyVals returns a middleware which adds the given key/value pairs to the
request context.



## <a name="RequestID">func</a> [RequestID](/src/target/requestid.go?s=1215:1289#L36)
``` go
func RequestID(options ...RequestIDOption) func(http.Handler) http.Handler
```
RequestID returns a middleware, which initializes the context with a unique
value under the RequestIDKey key. Optionally uses the incoming "X-Request-Id"
header, if present, with or without a length limit to use as request ID. the
default behavior is to always generate a new ID.

examples of use:


	service.Use(middleware.RequestID())
	
	// enable options for using "X-Request-Id" header with length limit.
	service.Use(middleware.RequestID(
	  middleware.UseXRequestIDHeaderOption(true),
	  middleware.XRequestHeaderLimitOption(128)))



## <a name="Trace">func</a> [Trace](/src/target/trace.go?s=1847:1905#L66)
``` go
func Trace(opts ...Option) func(http.Handler) http.Handler
```
Trace returns a trace middleware that initializes the trace information in the
request context.

samplingRate must be a value between 0 and 100. It represents the percentage of
requests that should be traced. If the incoming request has a Trace ID header
then the sampling rate is disregarded and the tracing is enabled.

spanIDFunc and traceIDFunc are the functions used to create Span and Trace
IDs respectively. This is configurable so that the created IDs are compatible
with the various backend tracing systems. The xray package provides
implementations that produce AWS X-Ray compatible IDs.



## <a name="WithSpan">func</a> [WithSpan](/src/target/trace.go?s=5155:5239#L181)
``` go
func WithSpan(ctx context.Context, traceID, spanID, parentID string) context.Context
```
WithSpan returns a context containing the given trace, span and parent span
IDs.



## <a name="WithTrace">func</a> [WithTrace](/src/target/trace.go?s=4932:4999#L174)
``` go
func WithTrace(ctx context.Context, traceID string) context.Context
```
WithTrace returns a context containing the given trace ID.




## <a name="Doer">type</a> [Doer](/src/target/trace.go?s=254:317#L14)
``` go
type Doer interface {
    Do(*http.Request) (*http.Response, error)
}
```
Doer is the http client Do interface.







### <a name="WrapDoer">func</a> [WrapDoer](/src/target/trace.go?s=4610:4639#L163)
``` go
func WrapDoer(doer Doer) Doer
```
WrapDoer wraps a goa client Doer and sets the trace headers so that the
downstream service may properly retrieve the parent span ID and trace ID.





## <a name="IDFunc">type</a> [IDFunc](/src/target/trace.go?s=189:209#L11)
``` go
type IDFunc func() string
```
IDFunc is a function that produces span and trace IDs for consumption
by tracing systems such as Zipkin or AWS X-Ray.










## <a name="Logger">type</a> [Logger](/src/target/log.go?s=177:311#L15)
``` go
type Logger interface {
    // Log creates a log entry using a sequence of alternating keys
    // and values.
    Log(keyvals ...interface{})
}
```
Logger is the logging interface used by the middleware to produce
log entries.







### <a name="NewLogger">func</a> [NewLogger](/src/target/log.go?s=1708:1744#L63)
``` go
func NewLogger(l *log.Logger) Logger
```
NewLogger creates a Logger backed by a stdlib logger.


### <a name="WrapLogger">func</a> [WrapLogger](/src/target/trace.go?s=4765:4813#L169)
``` go
func WrapLogger(l Logger, traceID string) Logger
```
WrapLogger returns a logger which logs the trace ID with every message if
there is one.





## <a name="Option">type</a> [Option](/src/target/trace.go?s=411:441#L20)
``` go
type Option func(*options) *options
```
Option is a constructor option that makes it possible to customize
the middleware.







### <a name="MaxSamplingRate">func</a> [MaxSamplingRate](/src/target/trace.go?s=3972:4006#L139)
``` go
func MaxSamplingRate(r int) Option
```
MaxSamplingRate sets a target sampling rate in requests per second. Setting a
max sampling rate causes the middleware to adjust the sampling percent
dynamically. Defaults to 2 req/s.
SamplingPercent and MaxSamplingRate are mutually exclusive.


### <a name="SampleSize">func</a> [SampleSize](/src/target/trace.go?s=4292:4321#L151)
``` go
func SampleSize(s int) Option
```
SampleSize sets the number of requests between two adjustments of the sampling
rate when MaxSamplingRate is set. Defaults to 1,000.


### <a name="SamplingPercent">func</a> [SamplingPercent](/src/target/trace.go?s=3526:3560#L125)
``` go
func SamplingPercent(p int) Option
```
SamplingPercent sets the tracing sampling rate as a percentage value.
It panics if p is less than 0 or more than 100.
SamplingPercent and MaxSamplingRate are mutually exclusive.


### <a name="SpanIDFunc">func</a> [SpanIDFunc](/src/target/trace.go?s=3232:3264#L115)
``` go
func SpanIDFunc(f IDFunc) Option
```
SpanIDFunc is a constructor option that overrides the function used to
compute span IDs.


### <a name="TraceIDFunc">func</a> [TraceIDFunc](/src/target/trace.go?s=3028:3061#L106)
``` go
func TraceIDFunc(f IDFunc) Option
```
TraceIDFunc is a constructor option that overrides the function used to
compute trace IDs.





## <a name="RequestIDOption">type</a> [RequestIDOption](/src/target/requestid.go?s=134:189#L10)
``` go
type RequestIDOption func(*requestIDOption) *requestIDOption
```
RequestIDOption uses a constructor pattern to customize middleware







### <a name="UseXRequestIDHeaderOption">func</a> [UseXRequestIDHeaderOption](/src/target/requestid.go?s=1951:2005#L61)
``` go
func UseXRequestIDHeaderOption(f bool) RequestIDOption
```
UseXRequestIDHeaderOption enables/disables using "X-Request-Id" header.


### <a name="XRequestHeaderLimitOption">func</a> [XRequestHeaderLimitOption](/src/target/requestid.go?s=2183:2240#L69)
``` go
func XRequestHeaderLimitOption(limit int) RequestIDOption
```
XRequestHeaderLimitOption sets the option for using "X-Request-Id" header.





## <a name="ResponseCapture">type</a> [ResponseCapture](/src/target/capture.go?s=174:264#L12)
``` go
type ResponseCapture struct {
    http.ResponseWriter
    StatusCode    int
    ContentLength int
}

```
ResponseCapture is a http.ResponseWriter which captures the response status
code and content length.







### <a name="CaptureResponse">func</a> [CaptureResponse](/src/target/capture.go?s=348:408#L19)
``` go
func CaptureResponse(w http.ResponseWriter) *ResponseCapture
```
CaptureResponse creates a ResponseCapture that wraps the given ResponseWriter.





### <a name="ResponseCapture.Hijack">func</a> (\*ResponseCapture) [Hijack](/src/target/capture.go?s=887:958#L37)
``` go
func (w *ResponseCapture) Hijack() (net.Conn, *bufio.ReadWriter, error)
```
Hijack supports the http.Hijacker interface.




### <a name="ResponseCapture.Write">func</a> (\*ResponseCapture) [Write](/src/target/capture.go?s=705:759#L30)
``` go
func (w *ResponseCapture) Write(b []byte) (int, error)
```
Write computes the written len and stores it in ContentLength.




### <a name="ResponseCapture.WriteHeader">func</a> (\*ResponseCapture) [WriteHeader](/src/target/capture.go?s=529:576#L24)
``` go
func (w *ResponseCapture) WriteHeader(code int)
```
WriteHeader records the value of the status code before writing it.




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









- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
