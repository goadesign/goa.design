+++
date="2018-09-06T11:21:50-07:00"
description="github.com/goadesign/goa/http/middleware/xray"
+++


# xray
`import "github.com/goadesign/goa/http/middleware/xray"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [func New(service, daemon string) (func(http.Handler) http.Handler, error)](#New)
* [func NewID() string](#NewID)
* [func NewTraceID() string](#NewTraceID)
* [func WrapDoer(doer goahttp.Doer) goahttp.Doer](#WrapDoer)
* [type Cause](#Cause)
* [type Exception](#Exception)
* [type HTTP](#HTTP)
* [type Request](#Request)
* [type Response](#Response)
* [type Segment](#Segment)
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
  * [func (s *Segment) RecordError(e error)](#Segment.RecordError)
  * [func (s *Segment) RecordRequest(req *http.Request, namespace string)](#Segment.RecordRequest)
  * [func (s *Segment) RecordResponse(resp *http.Response)](#Segment.RecordResponse)
  * [func (s *Segment) Write(p []byte) (int, error)](#Segment.Write)
  * [func (s *Segment) WriteHeader(code int)](#Segment.WriteHeader)
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
[middleware.go](/src/github.com/goadesign/goa/http/middleware/xray/middleware.go) [net_conn_testing.go](/src/github.com/goadesign/goa/http/middleware/xray/net_conn_testing.go) [segment.go](/src/github.com/goadesign/goa/http/middleware/xray/segment.go) [test_expectations.go](/src/github.com/goadesign/goa/http/middleware/xray/test_expectations.go) [wrap_doer.go](/src/github.com/goadesign/goa/http/middleware/xray/wrap_doer.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // SegKey is the request context key used to store the segments if any.
    SegKey contextKey = iota + 1
)
```



## <a name="New">func</a> [New](/src/target/middleware.go?s=1505:1578#L55)
``` go
func New(service, daemon string) (func(http.Handler) http.Handler, error)
```
New returns a middleware that sends AWS X-Ray segments to the daemon running
at the given address.

service is the name of the service reported to X-Ray. daemon is the hostname
(including port) of the X-Ray daemon collecting the segments.

The middleware works by extracting the trace information from the context
using the tracing middleware package. The tracing middleware must be mounted
first on the service.

The middleware stores the request segment in the context. User code can
further configure the segment for example to set a service version or
record an error.

User code may create child segments using the Segment NewSubsegment method
for tracing requests to external services. Such segments should be closed via
the Close method once the request completes. The middleware takes care of
closing the top level segment. Typical usage:


	if s := ctx.Value(SegKey); s != nil {
	  segment := s.(*Segment)
	}
	sub := segment.NewSubsegment("external-service")
	defer sub.Close()
	err := client.MakeRequest()
	if err != nil {
	    sub.Error = xray.Wrap(err)
	}
	return



## <a name="NewID">func</a> [NewID](/src/target/middleware.go?s=2631:2650#L89)
``` go
func NewID() string
```
NewID is a span ID creation algorithm which produces values that are
compatible with AWS X-Ray.



## <a name="NewTraceID">func</a> [NewTraceID](/src/target/middleware.go?s=2829:2853#L97)
``` go
func NewTraceID() string
```
NewTraceID is a trace ID creation algorithm which produces values that are
compatible with AWS X-Ray.



## <a name="WrapDoer">func</a> [WrapDoer](/src/target/wrap_doer.go?s=343:388#L17)
``` go
func WrapDoer(doer goahttp.Doer) goahttp.Doer
```
WrapDoer wraps a goa HTTP Doer and creates xray subsegments for traced requests.




## <a name="Cause">type</a> [Cause](/src/target/segment.go?s=3512:3925#L100)
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










## <a name="Exception">type</a> [Exception](/src/target/segment.go?s=3962:4190#L112)
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










## <a name="HTTP">type</a> [HTTP](/src/target/segment.go?s=2755:3000#L77)
``` go
type HTTP struct {
    // Request contains the data reported about the incoming request.
    Request *Request `json:"request,omitempty"`
    // Response contains the data reported about the HTTP response.
    Response *Response `json:"response,omitempty"`
}

```
HTTP describes a HTTP request.










## <a name="Request">type</a> [Request](/src/target/segment.go?s=3041:3307#L85)
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










## <a name="Response">type</a> [Response](/src/target/segment.go?s=3350:3454#L94)
``` go
type Response struct {
    Status        int   `json:"status"`
    ContentLength int64 `json:"content_length"`
}

```
Response describes a HTTP response.










## <a name="Segment">type</a> [Segment](/src/target/segment.go?s=201:2717#L19)
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
    StartTime float64 `json:"start_time,omitempty"`
    // EndTime is the segment end time.
    EndTime float64 `json:"end_time,omitempty"`
    // InProgress is true if the segment hasn't completed yet.
    InProgress bool `json:"in_progress"`
    // HTTP contains the HTTP request and response information and is
    // only initialized for the root segment.
    HTTP *HTTP `json:"http,omitempty"`
    // Cause contains information about an error that occurred while
    // processing the request.
    Cause *Cause `json:"cause,omitempty"`
    // Error is true when a request causes an internal error. It is
    // automatically set by Close when the response status code is
    // 500 or more.
    Error bool `json:"error"`
    // Fault is true when a request results in an error that is due
    // to the user. Typically it should be set when the response
    // status code is between 400 and 500 (but not 429).
    Fault bool `json:"fault"`
    // Throttle is true when a request is throttled. It is set to
    // true when the segment closes and the response status code is
    // 429. Client code may set it to true manually as well.
    Throttle bool `json:"throttle"`
    // Annotations contains the segment annotations.
    Annotations map[string]interface{} `json:"annotations,omitempty"`
    // Metadata contains the segment metadata.
    Metadata map[string]map[string]interface{} `json:"metadata,omitempty"`
    // Subsegments contains all the subsegments.
    Subsegments []*Segment `json:"subsegments,omitempty"`
    // Parent is the subsegment parent, it's nil for the root
    // segment.
    Parent *Segment `json:"-"`

    http.ResponseWriter `json:"-"`
    // contains filtered or unexported fields
}

```
Segment represents an AWS X-Ray segment document.







### <a name="NewSegment">func</a> [NewSegment](/src/target/segment.go?s=4919:4988#L153)
``` go
func NewSegment(name, traceID, spanID string, conn net.Conn) *Segment
```
NewSegment creates a new segment that gets written to the given connection
on close.





### <a name="Segment.AddAnnotation">func</a> (\*Segment) [AddAnnotation](/src/target/segment.go?s=8497:8554#L302)
``` go
func (s *Segment) AddAnnotation(key string, value string)
```
AddAnnotation adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddBoolAnnotation">func</a> (\*Segment) [AddBoolAnnotation](/src/target/segment.go?s=8840:8899#L312)
``` go
func (s *Segment) AddBoolAnnotation(key string, value bool)
```
AddBoolAnnotation adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddBoolMetadata">func</a> (\*Segment) [AddBoolMetadata](/src/target/segment.go?s=9734:9791#L340)
``` go
func (s *Segment) AddBoolMetadata(key string, value bool)
```
AddBoolMetadata adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddInt64Annotation">func</a> (\*Segment) [AddInt64Annotation](/src/target/segment.go?s=8667:8728#L307)
``` go
func (s *Segment) AddInt64Annotation(key string, value int64)
```
AddInt64Annotation adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddInt64Metadata">func</a> (\*Segment) [AddInt64Metadata](/src/target/segment.go?s=9567:9626#L335)
``` go
func (s *Segment) AddInt64Metadata(key string, value int64)
```
AddInt64Metadata adds a key-value pair that can be queried by AWS X-Ray.




### <a name="Segment.AddMetadata">func</a> (\*Segment) [AddMetadata](/src/target/segment.go?s=9403:9458#L330)
``` go
func (s *Segment) AddMetadata(key string, value string)
```
AddMetadata adds a key-value pair to the metadata.default attribute.
Metadata is not queryable, but is recorded.




### <a name="Segment.Capture">func</a> (\*Segment) [Capture](/src/target/segment.go?s=8314:8363#L295)
``` go
func (s *Segment) Capture(name string, fn func())
```
Capture creates a subsegment to record the execution of the given function.
Usage:


	s := ctx.Value(SegKey).(*Segment)
	s.Capture("slow-func", func() {
	    // ... some long executing code
	})




### <a name="Segment.Close">func</a> (\*Segment) [Close](/src/target/segment.go?s=10290:10315#L358)
``` go
func (s *Segment) Close()
```
Close closes the segment by setting its EndTime.




### <a name="Segment.NewSubsegment">func</a> (\*Segment) [NewSubsegment](/src/target/segment.go?s=7683:7736#L266)
``` go
func (s *Segment) NewSubsegment(name string) *Segment
```
NewSubsegment creates a subsegment of s.




### <a name="Segment.RecordError">func</a> (\*Segment) [RecordError](/src/target/segment.go?s=6915:6953#L237)
``` go
func (s *Segment) RecordError(e error)
```
RecordError traces an error. The client may also want to initialize the
fault field of s.

The trace contains a stack trace and a cause for the error if the argument
was created using one of the New, Errorf, Wrap or Wrapf functions of the
github.com/pkg/errors package. Otherwise the Stack and Cause fields are empty.




### <a name="Segment.RecordRequest">func</a> (\*Segment) [RecordRequest](/src/target/segment.go?s=5259:5327#L168)
``` go
func (s *Segment) RecordRequest(req *http.Request, namespace string)
```
RecordRequest traces a request.

It sets Http.Request & Namespace (ex: "remote")




### <a name="Segment.RecordResponse">func</a> (\*Segment) [RecordResponse](/src/target/segment.go?s=5557:5610#L183)
``` go
func (s *Segment) RecordResponse(resp *http.Response)
```
RecordResponse traces a response.

It sets Throttle, Fault, Error and HTTP.Response




### <a name="Segment.Write">func</a> (\*Segment) [Write](/src/target/segment.go?s=6259:6305#L214)
``` go
func (s *Segment) Write(p []byte) (int, error)
```
Write records the HTTP response content length and error (if any)
and calls the corresponding ResponseWriter method.




### <a name="Segment.WriteHeader">func</a> (\*Segment) [WriteHeader](/src/target/segment.go?s=5864:5903#L198)
``` go
func (s *Segment) WriteHeader(code int)
```
WriteHeader records the HTTP response code and calls the corresponding
ResponseWriter method.




## <a name="StackEntry">type</a> [StackEntry](/src/target/segment.go?s=4251:4442#L121)
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
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
