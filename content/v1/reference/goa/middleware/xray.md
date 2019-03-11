+++
date="2019-03-10T18:05:50-07:00"
description="github.com/goadesign/goa/middleware/xray"
+++


# xray
`import "github.com/goadesign/goa/middleware/xray"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [func New(service, daemon string) (goa.Middleware, error)](#New)
* [func NewID() string](#NewID)
* [func NewTraceID() string](#NewTraceID)
* [func WithSegment(ctx context.Context, s *Segment) context.Context](#WithSegment)
* [func WrapDoer(wrapped client.Doer) client.Doer](#WrapDoer)
* [func WrapTransport(rt http.RoundTripper) http.RoundTripper](#WrapTransport)
* [type Cause](#Cause)
* [type Exception](#Exception)
* [type HTTP](#HTTP)
* [type Request](#Request)
* [type Response](#Response)
* [type Segment](#Segment)
  * [func ContextSegment(ctx context.Context) *Segment](#ContextSegment)
  * [func NewSegment(name, traceID, spanID string, conn net.Conn) *Segment](#NewSegment)
  * [func (s *Segment) AddAnnotation(key string, value string)](#Segment.AddAnnotation)
  * [func (s *Segment) AddBoolAnnotation(key string, value bool)](#Segment.AddBoolAnnotation)
  * [func (s *Segment) AddBoolMetadata(key string, value bool)](#Segment.AddBoolMetadata)
  * [func (s *Segment) AddInt64Annotation(key string, value int64)](#Segment.AddInt64Annotation)
  * [func (s *Segment) AddInt64Metadata(key string, value int64)](#Segment.AddInt64Metadata)
  * [func (s *Segment) AddMetadata(key string, value string)](#Segment.AddMetadata)
  * [func (s *Segment) Capture(name string, fn func())](#Segment.Capture)
  * [func (s *Segment) Close()](#Segment.Close)
  * [func (s *Segment) NewSubsegment(name string) *Segment](#Segment.NewSubsegment)
  * [func (s *Segment) RecordContextResponse(ctx context.Context)](#Segment.RecordContextResponse)
  * [func (s *Segment) RecordError(e error)](#Segment.RecordError)
  * [func (s *Segment) RecordRequest(req *http.Request, namespace string)](#Segment.RecordRequest)
  * [func (s *Segment) RecordResponse(resp *http.Response)](#Segment.RecordResponse)
  * [func (s *Segment) SubmitInProgress()](#Segment.SubmitInProgress)
* [type StackEntry](#StackEntry)
* [type TestClientExpectation](#TestClientExpectation)
  * [func NewTestClientExpectation() *TestClientExpectation](#NewTestClientExpectation)
  * [func (c *TestClientExpectation) Expect(fn string, e interface{})](#TestClientExpectation.Expect)
  * [func (c *TestClientExpectation) ExpectNTimes(n int, fn string, e interface{})](#TestClientExpectation.ExpectNTimes)
  * [func (c *TestClientExpectation) Expectation(fn string) interface{}](#TestClientExpectation.Expectation)
  * [func (c *TestClientExpectation) MetExpectations() error](#TestClientExpectation.MetExpectations)
* [type TestNetConn](#TestNetConn)
  * [func NewTestNetConn() *TestNetConn](#NewTestNetConn)
  * [func (c *TestNetConn) Close() error](#TestNetConn.Close)
  * [func (c *TestNetConn) LocalAddr() net.Addr](#TestNetConn.LocalAddr)
  * [func (c *TestNetConn) Read(b []byte) (n int, err error)](#TestNetConn.Read)
  * [func (c *TestNetConn) RemoteAddr() net.Addr](#TestNetConn.RemoteAddr)
  * [func (c *TestNetConn) SetDeadline(t time.Time) error](#TestNetConn.SetDeadline)
  * [func (c *TestNetConn) SetReadDeadline(t time.Time) error](#TestNetConn.SetReadDeadline)
  * [func (c *TestNetConn) SetWriteDeadline(t time.Time) error](#TestNetConn.SetWriteDeadline)
  * [func (c *TestNetConn) Write(b []byte) (n int, err error)](#TestNetConn.Write)


#### <a name="pkg-files">Package files</a>
[middleware.go](/src/github.com/goadesign/goa/middleware/xray/middleware.go) [net_conn_testing.go](/src/github.com/goadesign/goa/middleware/xray/net_conn_testing.go) [segment.go](/src/github.com/goadesign/goa/middleware/xray/segment.go) [test_expectations.go](/src/github.com/goadesign/goa/middleware/xray/test_expectations.go) [transport.go](/src/github.com/goadesign/goa/middleware/xray/transport.go) [wrap_doer.go](/src/github.com/goadesign/goa/middleware/xray/wrap_doer.go) 





## <a name="New">func</a> [New](/src/target/middleware.go?s=2214:2270#L65)
``` go
func New(service, daemon string) (goa.Middleware, error)
```
New returns a middleware that sends AWS X-Ray segments to the daemon running
at the given address.

service is the name of the service reported to X-Ray. daemon is the hostname
(including port) of the X-Ray daemon collecting the segments.

The middleware works by extracting the trace information from the context
using the tracing middleware package. The tracing middleware must be mounted
first on the service.

The middleware stores the request segment in the context. Use ContextSegment
to retrieve it. User code can further configure the segment for example to set
a service version or record an error.

User code may create child segments using the Segment NewSubsegment method
for tracing requests to external services. Such segments should be closed via
the Close method once the request completes. The middleware takes care of
closing the top level segment. Typical usage:


	segment := xray.ContextSegment(ctx)
	sub := segment.NewSubsegment("external-service")
	defer sub.Close()
	err := client.MakeRequest()
	if err != nil {
	    sub.Error = xray.Wrap(err)
	}
	return

An X-Ray trace is limited to 500 KB of segment data (JSON) being submitted
for it. See: <a href="https://aws.amazon.com/xray/pricing/">https://aws.amazon.com/xray/pricing/</a>

Traces running for multiple minutes may encounter additional dynamic limits,
resulting in the trace being limited to less than 500 KB. The workaround is
to send less data -- fewer segments, subsegments, annotations, or metadata.
And perhaps split up a single large trace into several different traces.

Here are some observations of the relationship between trace duration and
the number of bytes that could be sent successfully:


	- 49 seconds: 543 KB
	- 2.4 minutes: 51 KB
	- 6.8 minutes: 14 KB
	- 1.4 hours:   14 KB

Besides those varying size limitations, a trace may be open for up to 7 days.



## <a name="NewID">func</a> [NewID](/src/target/middleware.go?s=3195:3214#L106)
``` go
func NewID() string
```
NewID is a span ID creation algorithm which produces values that are
compatible with AWS X-Ray.



## <a name="NewTraceID">func</a> [NewTraceID](/src/target/middleware.go?s=3393:3417#L114)
``` go
func NewTraceID() string
```
NewTraceID is a trace ID creation algorithm which produces values that are
compatible with AWS X-Ray.



## <a name="WithSegment">func</a> [WithSegment](/src/target/middleware.go?s=3637:3702#L122)
``` go
func WithSegment(ctx context.Context, s *Segment) context.Context
```
WithSegment creates a context containing the given segment. Use ContextSegment
to retrieve it.



## <a name="WrapDoer">func</a> [WrapDoer](/src/target/wrap_doer.go?s=391:437#L19)
``` go
func WrapDoer(wrapped client.Doer) client.Doer
```
WrapDoer wraps a goa client Doer, and creates xray subsegments for traced requests.



## <a name="WrapTransport">func</a> [WrapTransport](/src/target/transport.go?s=500:558#L16)
``` go
func WrapTransport(rt http.RoundTripper) http.RoundTripper
```
WrapTransport wraps a http RoundTripper with a RoundTripper which creates subsegments of the
segment in each request's context. The subsegments created this way have their namespace set to
"remote". The request's ctx must be set and contain the current request segment as set by the
xray middleware.

Example of how to wrap http.Client's transport:


	httpClient := &http.Client{
	  Transport: WrapTransport(http.DefaultTransport),
	}




## <a name="Cause">type</a> [Cause](/src/target/segment.go?s=3490:3903#L98)
``` go
type Cause struct {
    // ID to segment where error originated, exclusive with other
    // fields.
    ID string `json:"id,omitempty"`
    // WorkingDirectory when error occurred. Exclusive with ID.
    WorkingDirectory string `json:"working_directory,omitempty"`
    // Exceptions contains the details on the error(s) that occurred
    // when the request as processing.
    Exceptions []*Exception `json:"exceptions,omitempty"`
}

```
Cause list errors that happens during the request.










## <a name="Exception">type</a> [Exception](/src/target/segment.go?s=3940:4168#L110)
``` go
type Exception struct {
    // Message contains the error message.
    Message string `json:"message"`
    // Stack is the error stack trace as initialized via the
    // github.com/pkg/errors package.
    Stack []*StackEntry `json:"stack"`
}

```
Exception describes an error.










## <a name="HTTP">type</a> [HTTP](/src/target/segment.go?s=2733:2978#L75)
``` go
type HTTP struct {
    // Request contains the data reported about the incoming request.
    Request *Request `json:"request,omitempty"`
    // Response contains the data reported about the HTTP response.
    Response *Response `json:"response,omitempty"`
}

```
HTTP describes a HTTP request.










## <a name="Request">type</a> [Request](/src/target/segment.go?s=3019:3285#L83)
``` go
type Request struct {
    Method        string `json:"method,omitempty"`
    URL           string `json:"url,omitempty"`
    UserAgent     string `json:"user_agent,omitempty"`
    ClientIP      string `json:"client_ip,omitempty"`
    ContentLength int64  `json:"content_length"`
}

```
Request describes a HTTP request.










## <a name="Response">type</a> [Response](/src/target/segment.go?s=3328:3432#L92)
``` go
type Response struct {
    Status        int   `json:"status"`
    ContentLength int64 `json:"content_length"`
}

```
Response describes a HTTP response.










## <a name="Segment">type</a> [Segment](/src/target/segment.go?s=231:2695#L20)
``` go
type Segment struct {
    // Mutex used to synchronize access to segment.
    *sync.Mutex
    // Name is the name of the service reported to X-Ray.
    Name string `json:"name"`
    // Namespace identifies the source that created the segment.
    Namespace string `json:"namespace"`
    // Type is either the empty string or "subsegment".
    Type string `json:"type,omitempty"`
    // ID is a unique ID for the segment.
    ID string `json:"id"`
    // TraceID is the ID of the root trace.
    TraceID string `json:"trace_id,omitempty"`
    // ParentID is the ID of the parent segment when it is from a
    // remote service. It is only initialized for the root segment.
    ParentID string `json:"parent_id,omitempty"`
    // StartTime is the segment start time.
    StartTime float64 `json:"start_time"`
    // EndTime is the segment end time.
    EndTime float64 `json:"end_time,omitempty"`
    // InProgress is true if the segment hasn't completed yet.
    InProgress bool `json:"in_progress,omitempty""`
    // HTTP contains the HTTP request and response information and is
    // only initialized for the root segment.
    HTTP *HTTP `json:"http,omitempty"`
    // Cause contains information about an error that occurred while
    // processing the request.
    Cause *Cause `json:"cause,omitempty"`
    // Error is true when a request causes an internal error. It is
    // automatically set by Close when the response status code is
    // 500 or more.
    Error bool `json:"error,omitempty""`
    // Fault is true when a request results in an error that is due
    // to the user. Typically it should be set when the response
    // status code is between 400 and 500 (but not 429).
    Fault bool `json:"fault,omitempty""`
    // Throttle is true when a request is throttled. It is set to
    // true when the segment closes and the response status code is
    // 429. Client code may set it to true manually as well.
    Throttle bool `json:"throttle,omitempty""`
    // Annotations contains the segment annotations.
    Annotations map[string]interface{} `json:"annotations,omitempty"`
    // Metadata contains the segment metadata.
    Metadata map[string]map[string]interface{} `json:"metadata,omitempty"`
    // Parent is the subsegment parent, it's nil for the root
    // segment.
    Parent *Segment `json:"-"`
    // contains filtered or unexported fields
}

```
Segment represents a AWS X-Ray segment document.







### <a name="ContextSegment">func</a> [ContextSegment](/src/target/middleware.go?s=3826:3875#L127)
``` go
func ContextSegment(ctx context.Context) *Segment
```
ContextSegment extracts the segment set in the context with WithSegment.


### <a name="NewSegment">func</a> [NewSegment](/src/target/segment.go?s=4897:4966#L151)
``` go
func NewSegment(name, traceID, spanID string, conn net.Conn) *Segment
```
NewSegment creates a new segment that gets written to the given connection
on close.





### <a name="Segment.AddAnnotation">func</a> (\*Segment) [AddAnnotation](/src/target/segment.go?s=8052:8109#L284)
``` go
func (s *Segment) AddAnnotation(key string, value string)
```
AddAnnotation adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddBoolAnnotation">func</a> (\*Segment) [AddBoolAnnotation](/src/target/segment.go?s=8395:8454#L294)
``` go
func (s *Segment) AddBoolAnnotation(key string, value bool)
```
AddBoolAnnotation adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddBoolMetadata">func</a> (\*Segment) [AddBoolMetadata](/src/target/segment.go?s=9289:9346#L322)
``` go
func (s *Segment) AddBoolMetadata(key string, value bool)
```
AddBoolMetadata adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddInt64Annotation">func</a> (\*Segment) [AddInt64Annotation](/src/target/segment.go?s=8222:8283#L289)
``` go
func (s *Segment) AddInt64Annotation(key string, value int64)
```
AddInt64Annotation adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddInt64Metadata">func</a> (\*Segment) [AddInt64Metadata](/src/target/segment.go?s=9122:9181#L317)
``` go
func (s *Segment) AddInt64Metadata(key string, value int64)
```
AddInt64Metadata adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddMetadata">func</a> (\*Segment) [AddMetadata](/src/target/segment.go?s=8958:9013#L312)
``` go
func (s *Segment) AddMetadata(key string, value string)
```
AddMetadata adds a key-value pair to the metadata.default attribute.
Metadata is not queryable, but is recorded.




### <a name="Segment.Capture">func</a> (\*Segment) [Capture](/src/target/segment.go?s=7845:7894#L276)
``` go
func (s *Segment) Capture(name string, fn func())
```
Capture creates a subsegment to record the execution of the given function.
Usage:


	s := xray.ContextSegment(ctx)
	s.Capture("slow-func", func() {
	    // ... some long executing code
	})




### <a name="Segment.Close">func</a> (\*Segment) [Close](/src/target/segment.go?s=9845:9870#L340)
``` go
func (s *Segment) Close()
```
Close closes the segment by setting its EndTime.




### <a name="Segment.NewSubsegment">func</a> (\*Segment) [NewSubsegment](/src/target/segment.go?s=7275:7328#L249)
``` go
func (s *Segment) NewSubsegment(name string) *Segment
```
NewSubsegment creates a subsegment of s.




### <a name="Segment.RecordContextResponse">func</a> (\*Segment) [RecordContextResponse](/src/target/segment.go?s=5874:5934#L197)
``` go
func (s *Segment) RecordContextResponse(ctx context.Context)
```
RecordContextResponse traces a context response if present in the context

It sets Throttle, Fault, Error and HTTP.Response




### <a name="Segment.RecordError">func</a> (\*Segment) [RecordError](/src/target/segment.go?s=6507:6545#L220)
``` go
func (s *Segment) RecordError(e error)
```
RecordError traces an error. The client may also want to initialize the
fault field of s.

The trace contains a stack trace and a cause for the error if the argument
was created using one of the New, Errorf, Wrap or Wrapf functions of the
github.com/pkg/errors package. Otherwise the Stack and Cause fields are empty.




### <a name="Segment.RecordRequest">func</a> (\*Segment) [RecordRequest](/src/target/segment.go?s=5237:5305#L166)
``` go
func (s *Segment) RecordRequest(req *http.Request, namespace string)
```
RecordRequest traces a request.

It sets Http.Request & Namespace (ex: "remote")




### <a name="Segment.RecordResponse">func</a> (\*Segment) [RecordResponse](/src/target/segment.go?s=5535:5588#L181)
``` go
func (s *Segment) RecordResponse(resp *http.Response)
```
RecordResponse traces a response.

It sets Throttle, Fault, Error and HTTP.Response




### <a name="Segment.SubmitInProgress">func</a> (\*Segment) [SubmitInProgress](/src/target/segment.go?s=10465:10501#L356)
``` go
func (s *Segment) SubmitInProgress()
```
SubmitInProgress sends this in-progress segment to the AWS X-Ray daemon.
This way, the segment will be immediately visible in the UI, with status "Pending".
When this segment is closed, the final version will overwrite any in-progress version.
This method should be called no more than once for this segment. Subsequent calls will have no effect.

See the `in_progress` docs:


	<a href="https://docs.aws.amazon.com/xray/latest/devguide/xray-api-segmentdocuments.html#api-segmentdocuments-fields">https://docs.aws.amazon.com/xray/latest/devguide/xray-api-segmentdocuments.html#api-segmentdocuments-fields</a>




## <a name="StackEntry">type</a> [StackEntry](/src/target/segment.go?s=4229:4420#L119)
``` go
type StackEntry struct {
    // Path to code file
    Path string `json:"path"`
    // Line number
    Line int `json:"line"`
    // Label is the line label if any
    Label string `json:"label,omitempty"`
}

```
StackEntry represents an entry in a error stacktrace.










## <a name="TestClientExpectation">type</a> [TestClientExpectation](/src/target/test_expectations.go?s=147:252#L14)
``` go
type TestClientExpectation struct {
    // contains filtered or unexported fields
}

```
TestClientExpectation is a generic mock.







### <a name="NewTestClientExpectation">func</a> [NewTestClientExpectation](/src/target/test_expectations.go?s=475:529#L26)
``` go
func NewTestClientExpectation() *TestClientExpectation
```
NewTestClientExpectation creates a new *TestClientExpectation





### <a name="TestClientExpectation.Expect">func</a> (\*TestClientExpectation) [Expect](/src/target/test_expectations.go?s=705:769#L34)
``` go
func (c *TestClientExpectation) Expect(fn string, e interface{})
```
Expect records the request handler in the list of expected request calls.




### <a name="TestClientExpectation.ExpectNTimes">func</a> (\*TestClientExpectation) [ExpectNTimes](/src/target/test_expectations.go?s=944:1021#L41)
``` go
func (c *TestClientExpectation) ExpectNTimes(n int, fn string, e interface{})
```
ExpectNTimes records the request handler n times in the list of expected request calls.




### <a name="TestClientExpectation.Expectation">func</a> (\*TestClientExpectation) [Expectation](/src/target/test_expectations.go?s=1374:1440#L53)
``` go
func (c *TestClientExpectation) Expectation(fn string) interface{}
```
Expectation removes the expectation for the function with the given name from the expected calls
if there is one and returns it. If there is no (more) expectations for the function,
it prints a warning to stderr and returns nil.




### <a name="TestClientExpectation.MetExpectations">func</a> (\*TestClientExpectation) [MetExpectations](/src/target/test_expectations.go?s=2054:2109#L75)
``` go
func (c *TestClientExpectation) MetExpectations() error
```
MetExpectations returns nil if there no expectation left to be called and if there is no call
that was made that did not match an expectation. It returns an error describing what is left to
be called or what was called with no expectation otherwise.




## <a name="TestNetConn">type</a> [TestNetConn](/src/target/net_conn_testing.go?s=75:126#L9)
``` go
type TestNetConn struct {
    *TestClientExpectation
}

```
TestNetConn is a mock net.Conn







### <a name="NewTestNetConn">func</a> [NewTestNetConn](/src/target/net_conn_testing.go?s=326:360#L18)
``` go
func NewTestNetConn() *TestNetConn
```
NewTestNetConn creates a mock net.Conn which uses expectations set by the
tests to implement the behavior.





### <a name="TestNetConn.Close">func</a> (\*TestNetConn) [Close](/src/target/net_conn_testing.go?s=874:909#L39)
``` go
func (c *TestNetConn) Close() error
```
Close runs any preset expectation.




### <a name="TestNetConn.LocalAddr">func</a> (\*TestNetConn) [LocalAddr](/src/target/net_conn_testing.go?s=1044:1086#L47)
``` go
func (c *TestNetConn) LocalAddr() net.Addr
```
LocalAddr runs any preset expectation.




### <a name="TestNetConn.Read">func</a> (\*TestNetConn) [Read](/src/target/net_conn_testing.go?s=452:507#L23)
``` go
func (c *TestNetConn) Read(b []byte) (n int, err error)
```
Read runs any preset expectation.




### <a name="TestNetConn.RemoteAddr">func</a> (\*TestNetConn) [RemoteAddr](/src/target/net_conn_testing.go?s=1229:1272#L55)
``` go
func (c *TestNetConn) RemoteAddr() net.Addr
```
RemoteAddr runs any preset expectation.




### <a name="TestNetConn.SetDeadline">func</a> (\*TestNetConn) [SetDeadline](/src/target/net_conn_testing.go?s=1417:1469#L63)
``` go
func (c *TestNetConn) SetDeadline(t time.Time) error
```
SetDeadline runs any preset expectation.




### <a name="TestNetConn.SetReadDeadline">func</a> (\*TestNetConn) [SetReadDeadline](/src/target/net_conn_testing.go?s=1628:1684#L71)
``` go
func (c *TestNetConn) SetReadDeadline(t time.Time) error
```
SetReadDeadline runs any preset expectation.




### <a name="TestNetConn.SetWriteDeadline">func</a> (\*TestNetConn) [SetWriteDeadline](/src/target/net_conn_testing.go?s=1848:1905#L79)
``` go
func (c *TestNetConn) SetWriteDeadline(t time.Time) error
```
SetWriteDeadline runs any preset expectation.




### <a name="TestNetConn.Write">func</a> (\*TestNetConn) [Write](/src/target/net_conn_testing.go?s=662:718#L31)
``` go
func (c *TestNetConn) Write(b []byte) (n int, err error)
```
Write runs any preset expectation.








- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
