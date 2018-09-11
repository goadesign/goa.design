+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/codegen/service/testdata"
+++


# testdata
`import "github.com/goadesign/goa/codegen/service/testdata"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [Variables](#pkg-variables)
* [type ArrayStringT](#ArrayStringT)
* [type ObjectExtraT](#ObjectExtraT)
* [type ObjectFieldT](#ObjectFieldT)
* [type ObjectT](#ObjectT)
* [type StringPointerT](#StringPointerT)
* [type StringT](#StringT)


#### <a name="pkg-files">Package files</a>
[client_code.go](/src/github.com/goadesign/goa/codegen/service/testdata/client_code.go) [convert_dsls.go](/src/github.com/goadesign/goa/codegen/service/testdata/convert_dsls.go) [convert_functions.go](/src/github.com/goadesign/goa/codegen/service/testdata/convert_functions.go) [create_dsls.go](/src/github.com/goadesign/goa/codegen/service/testdata/create_dsls.go) [create_functions.go](/src/github.com/goadesign/goa/codegen/service/testdata/create_functions.go) [endpoint_code.go](/src/github.com/goadesign/goa/codegen/service/testdata/endpoint_code.go) [endpoint_dsls.go](/src/github.com/goadesign/goa/codegen/service/testdata/endpoint_dsls.go) [security_dsls.go](/src/github.com/goadesign/goa/codegen/service/testdata/security_dsls.go) [security_functions.go](/src/github.com/goadesign/goa/codegen/service/testdata/security_functions.go) [service_code.go](/src/github.com/goadesign/goa/codegen/service/testdata/service_code.go) [service_dsls.go](/src/github.com/goadesign/goa/codegen/service/testdata/service_dsls.go) [types.go](/src/github.com/goadesign/goa/codegen/service/testdata/types.go) [views_code.go](/src/github.com/goadesign/goa/codegen/service/testdata/views_code.go) [views_dsls.go](/src/github.com/goadesign/goa/codegen/service/testdata/views_dsls.go) 


## <a name="pkg-constants">Constants</a>
``` go
const BidirectionalStreamingMethod = `
// Service is the BidirectionalStreamingService service interface.
type Service interface {
    // BidirectionalStreamingMethod implements BidirectionalStreamingMethod.
    BidirectionalStreamingMethod(context.Context, *BPayload, BidirectionalStreamingMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "BidirectionalStreamingService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"BidirectionalStreamingMethod"}

// BidirectionalStreamingMethodServerStream is the interface a
// "BidirectionalStreamingMethod" endpoint server stream must satisfy.
type BidirectionalStreamingMethodServerStream interface {
    // Send streams instances of "AResult".
    Send(*AResult) error
    // Recv reads instances of "APayload" from the stream.
    Recv() (*APayload, error)
    // Close closes the stream.
    Close() error
}

// BidirectionalStreamingMethodClientStream is the interface a
// "BidirectionalStreamingMethod" endpoint client stream must satisfy.
type BidirectionalStreamingMethodClientStream interface {
    // Send streams instances of "APayload".
    Send(*APayload) error
    // Recv reads instances of "AResult" from the stream.
    Recv() (*AResult, error)
    // Close closes the stream.
    Close() error
}

// BPayload is the payload type of the BidirectionalStreamingService service
// BidirectionalStreamingMethod method.
type BPayload struct {
    ArrayField  []bool
    MapField    map[int]string
    ObjectField *struct {
        IntField    *int
        StringField *string
    }
    UserTypeField *Parent
}

// APayload is the streaming payload type of the BidirectionalStreamingService
// service BidirectionalStreamingMethod method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// AResult is the result type of the BidirectionalStreamingService service
// BidirectionalStreamingMethod method.
type AResult struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

type Parent struct {
    C *Child
}

type Child struct {
    P *Parent
}
`
```
``` go
const BidirectionalStreamingMethodClient = `// Client is the "BidirectionalStreamingService" service client.
type Client struct {
    BidirectionalStreamingMethodEndpoint goa.Endpoint
}
// NewClient initializes a "BidirectionalStreamingService" service client given
// the endpoints.
func NewClient(bidirectionalStreamingMethod goa.Endpoint) *Client {
    return &Client{
        BidirectionalStreamingMethodEndpoint: bidirectionalStreamingMethod,
    }
}

// BidirectionalStreamingMethod calls the "BidirectionalStreamingMethod"
// endpoint of the "BidirectionalStreamingService" service.
func (c *Client) BidirectionalStreamingMethod(ctx context.Context, p *BPayload)(res BidirectionalStreamingMethodClientStream, err error) {
    var ires interface{}
    ires, err = c.BidirectionalStreamingMethodEndpoint(ctx, p)
    if err != nil {
        return
    }
    return ires.(BidirectionalStreamingMethodClientStream), nil
}
`
```
``` go
const BidirectionalStreamingMethodEndpoint = `// Endpoints wraps the "BidirectionalStreamingEndpoint" service endpoints.
type Endpoints struct {
    BidirectionalStreamingMethod goa.Endpoint
}

// BidirectionalStreamingMethodEndpointInput is the input type of
// "BidirectionalStreamingMethod" endpoint that holds the method payload and
// the server stream.
type BidirectionalStreamingMethodEndpointInput struct {
    // Payload is the method payload.
    Payload *AType
    // Stream is the server stream used by the "BidirectionalStreamingMethod"
    // method to send data.
    Stream BidirectionalStreamingMethodServerStream
}

// NewEndpoints wraps the methods of the "BidirectionalStreamingEndpoint"
// service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        BidirectionalStreamingMethod: NewBidirectionalStreamingMethodEndpoint(s),
    }
}

// Use applies the given middleware to all the "BidirectionalStreamingEndpoint"
// service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.BidirectionalStreamingMethod = m(e.BidirectionalStreamingMethod)
}

// NewBidirectionalStreamingMethodEndpoint returns an endpoint function that
// calls the method "BidirectionalStreamingMethod" of service
// "BidirectionalStreamingEndpoint".
func NewBidirectionalStreamingMethodEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        ep := req.(*BidirectionalStreamingMethodEndpointInput)
        return nil, s.BidirectionalStreamingMethod(ctx, ep.Payload, ep.Stream)
    }
}
`
```
``` go
const BidirectionalStreamingNoPayloadMethod = `
// Service is the BidirectionalStreamingNoPayloadService service interface.
type Service interface {
    // BidirectionalStreamingNoPayloadMethod implements
    // BidirectionalStreamingNoPayloadMethod.
    BidirectionalStreamingNoPayloadMethod(context.Context, BidirectionalStreamingNoPayloadMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "BidirectionalStreamingNoPayloadService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"BidirectionalStreamingNoPayloadMethod"}

// BidirectionalStreamingNoPayloadMethodServerStream is the interface a
// "BidirectionalStreamingNoPayloadMethod" endpoint server stream must satisfy.
type BidirectionalStreamingNoPayloadMethodServerStream interface {
    // Send streams instances of "int".
    Send(int) error
    // Recv reads instances of "string" from the stream.
    Recv() (string, error)
    // Close closes the stream.
    Close() error
}

// BidirectionalStreamingNoPayloadMethodClientStream is the interface a
// "BidirectionalStreamingNoPayloadMethod" endpoint client stream must satisfy.
type BidirectionalStreamingNoPayloadMethodClientStream interface {
    // Send streams instances of "string".
    Send(string) error
    // Recv reads instances of "int" from the stream.
    Recv() (int, error)
    // Close closes the stream.
    Close() error
}
`
```
``` go
const BidirectionalStreamingNoPayloadMethodClient = `// Client is the "BidirectionalStreamingNoPayloadService" service client.
type Client struct {
    BidirectionalStreamingNoPayloadMethodEndpoint goa.Endpoint
}
// NewClient initializes a "BidirectionalStreamingNoPayloadService" service
// client given the endpoints.
func NewClient(bidirectionalStreamingNoPayloadMethod goa.Endpoint) *Client {
    return &Client{
        BidirectionalStreamingNoPayloadMethodEndpoint: bidirectionalStreamingNoPayloadMethod,
    }
}

// BidirectionalStreamingNoPayloadMethod calls the
// "BidirectionalStreamingNoPayloadMethod" endpoint of the
// "BidirectionalStreamingNoPayloadService" service.
func (c *Client) BidirectionalStreamingNoPayloadMethod(ctx context.Context, )(res BidirectionalStreamingNoPayloadMethodClientStream, err error) {
    var ires interface{}
    ires, err = c.BidirectionalStreamingNoPayloadMethodEndpoint(ctx, nil)
    if err != nil {
        return
    }
    return ires.(BidirectionalStreamingNoPayloadMethodClientStream), nil
}
`
```
``` go
const BidirectionalStreamingNoPayloadMethodEndpoint = `// Endpoints wraps the "BidirectionalStreamingNoPayloadService" service
// endpoints.
type Endpoints struct {
    BidirectionalStreamingNoPayloadMethod goa.Endpoint
}

// BidirectionalStreamingNoPayloadMethodEndpointInput is the input type of
// "BidirectionalStreamingNoPayloadMethod" endpoint that holds the method
// payload and the server stream.
type BidirectionalStreamingNoPayloadMethodEndpointInput struct {
    // Stream is the server stream used by the
    // "BidirectionalStreamingNoPayloadMethod" method to send data.
    Stream BidirectionalStreamingNoPayloadMethodServerStream
}

// NewEndpoints wraps the methods of the
// "BidirectionalStreamingNoPayloadService" service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        BidirectionalStreamingNoPayloadMethod: NewBidirectionalStreamingNoPayloadMethodEndpoint(s),
    }
}

// Use applies the given middleware to all the
// "BidirectionalStreamingNoPayloadService" service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.BidirectionalStreamingNoPayloadMethod = m(e.BidirectionalStreamingNoPayloadMethod)
}

// NewBidirectionalStreamingNoPayloadMethodEndpoint returns an endpoint
// function that calls the method "BidirectionalStreamingNoPayloadMethod" of
// service "BidirectionalStreamingNoPayloadService".
func NewBidirectionalStreamingNoPayloadMethodEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        ep := req.(*BidirectionalStreamingNoPayloadMethodEndpointInput)
        return nil, s.BidirectionalStreamingNoPayloadMethod(ctx, ep.Stream)
    }
}
`
```
``` go
const BidirectionalStreamingResultWithExplicitViewMethod = `
// Service is the BidirectionalStreamingResultWithExplicitViewService service
// interface.
type Service interface {
    // BidirectionalStreamingResultWithExplicitViewMethod implements
    // BidirectionalStreamingResultWithExplicitViewMethod.
    BidirectionalStreamingResultWithExplicitViewMethod(context.Context, BidirectionalStreamingResultWithExplicitViewMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "BidirectionalStreamingResultWithExplicitViewService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"BidirectionalStreamingResultWithExplicitViewMethod"}

// BidirectionalStreamingResultWithExplicitViewMethodServerStream is the
// interface a "BidirectionalStreamingResultWithExplicitViewMethod" endpoint
// server stream must satisfy.
type BidirectionalStreamingResultWithExplicitViewMethodServerStream interface {
    // Send streams instances of "MultipleViews".
    Send(*MultipleViews) error
    // Recv reads instances of "[][]byte" from the stream.
    Recv() ([][]byte, error)
    // Close closes the stream.
    Close() error
}

// BidirectionalStreamingResultWithExplicitViewMethodClientStream is the
// interface a "BidirectionalStreamingResultWithExplicitViewMethod" endpoint
// client stream must satisfy.
type BidirectionalStreamingResultWithExplicitViewMethodClientStream interface {
    // Send streams instances of "[][]byte".
    Send([][]byte) error
    // Recv reads instances of "MultipleViews" from the stream.
    Recv() (*MultipleViews, error)
    // Close closes the stream.
    Close() error
}

// MultipleViews is the result type of the
// BidirectionalStreamingResultWithExplicitViewService service
// BidirectionalStreamingResultWithExplicitViewMethod method.
type MultipleViews struct {
    A *string
    B *string
}

// NewMultipleViews initializes result type MultipleViews from viewed result
// type MultipleViews.
func NewMultipleViews(vres *bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViews) *MultipleViews {
    var res *MultipleViews
    switch vres.View {
    case "default", "":
        res = newMultipleViews(vres.Projected)
    case "tiny":
        res = newMultipleViewsTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViews initializes viewed result type MultipleViews from
// result type MultipleViews using the given view.
func NewViewedMultipleViews(res *MultipleViews, view string) *bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViews {
    var vres *bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViews
    switch view {
    case "default", "":
        p := newMultipleViewsView(res)
        vres = &bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViews{p, "default"}
    case "tiny":
        p := newMultipleViewsViewTiny(res)
        vres = &bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViews{p, "tiny"}
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
        B: vres.B,
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViewsView {
    vres := &bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViewsView{
        A: res.A,
        B: res.B,
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViewsView {
    vres := &bidirectionalstreamingresultwithexplicitviewserviceviews.MultipleViewsView{
        A: res.A,
    }
    return vres
}
`
```
``` go
const BidirectionalStreamingResultWithViewsMethod = `
// Service is the BidirectionalStreamingResultWithViewsService service
// interface.
type Service interface {
    // BidirectionalStreamingResultWithViewsMethod implements
    // BidirectionalStreamingResultWithViewsMethod.
    // The "view" return value must have one of the following views
    //	- "default"
    //	- "tiny"
    BidirectionalStreamingResultWithViewsMethod(context.Context, BidirectionalStreamingResultWithViewsMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "BidirectionalStreamingResultWithViewsService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"BidirectionalStreamingResultWithViewsMethod"}

// BidirectionalStreamingResultWithViewsMethodServerStream is the interface a
// "BidirectionalStreamingResultWithViewsMethod" endpoint server stream must
// satisfy.
type BidirectionalStreamingResultWithViewsMethodServerStream interface {
    // Send streams instances of "MultipleViews".
    Send(*MultipleViews) error
    // Recv reads instances of "APayload" from the stream.
    Recv() (*APayload, error)
    // Close closes the stream.
    Close() error
    // SetView sets the view used to render the result before streaming.
    SetView(view string)
}

// BidirectionalStreamingResultWithViewsMethodClientStream is the interface a
// "BidirectionalStreamingResultWithViewsMethod" endpoint client stream must
// satisfy.
type BidirectionalStreamingResultWithViewsMethodClientStream interface {
    // Send streams instances of "APayload".
    Send(*APayload) error
    // Recv reads instances of "MultipleViews" from the stream.
    Recv() (*MultipleViews, error)
    // Close closes the stream.
    Close() error
}

// APayload is the streaming payload type of the
// BidirectionalStreamingResultWithViewsService service
// BidirectionalStreamingResultWithViewsMethod method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// MultipleViews is the result type of the
// BidirectionalStreamingResultWithViewsService service
// BidirectionalStreamingResultWithViewsMethod method.
type MultipleViews struct {
    A *string
    B *string
}

// NewMultipleViews initializes result type MultipleViews from viewed result
// type MultipleViews.
func NewMultipleViews(vres *bidirectionalstreamingresultwithviewsserviceviews.MultipleViews) *MultipleViews {
    var res *MultipleViews
    switch vres.View {
    case "default", "":
        res = newMultipleViews(vres.Projected)
    case "tiny":
        res = newMultipleViewsTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViews initializes viewed result type MultipleViews from
// result type MultipleViews using the given view.
func NewViewedMultipleViews(res *MultipleViews, view string) *bidirectionalstreamingresultwithviewsserviceviews.MultipleViews {
    var vres *bidirectionalstreamingresultwithviewsserviceviews.MultipleViews
    switch view {
    case "default", "":
        p := newMultipleViewsView(res)
        vres = &bidirectionalstreamingresultwithviewsserviceviews.MultipleViews{p, "default"}
    case "tiny":
        p := newMultipleViewsViewTiny(res)
        vres = &bidirectionalstreamingresultwithviewsserviceviews.MultipleViews{p, "tiny"}
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *bidirectionalstreamingresultwithviewsserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
        B: vres.B,
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *bidirectionalstreamingresultwithviewsserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *bidirectionalstreamingresultwithviewsserviceviews.MultipleViewsView {
    vres := &bidirectionalstreamingresultwithviewsserviceviews.MultipleViewsView{
        A: res.A,
        B: res.B,
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *bidirectionalstreamingresultwithviewsserviceviews.MultipleViewsView {
    vres := &bidirectionalstreamingresultwithviewsserviceviews.MultipleViewsView{
        A: res.A,
    }
    return vres
}
`
```
``` go
const EmptyMethod = `
// Service is the Empty service interface.
type Service interface {
    // Empty implements Empty.
    Empty(context.Context) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "Empty"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"Empty"}
`
```
``` go
const EmptyPayloadMethod = `
// Service is the EmptyPayload service interface.
type Service interface {
    // EmptyPayload implements EmptyPayload.
    EmptyPayload(context.Context) (res *AResult, err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "EmptyPayload"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"EmptyPayload"}

// AResult is the result type of the EmptyPayload service EmptyPayload method.
type AResult struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}
`
```
``` go
const EmptyResultMethod = `
// Service is the EmptyResult service interface.
type Service interface {
    // EmptyResult implements EmptyResult.
    EmptyResult(context.Context, *APayload) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "EmptyResult"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"EmptyResult"}

// APayload is the payload type of the EmptyResult service EmptyResult method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}
`
```
``` go
const ForceGenerateType = `
// Service is the ForceGenerateType service interface.
type Service interface {
    // A implements A.
    A(context.Context) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "ForceGenerateType"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"A"}

type ForcedType struct {
    A *string
}
`
```
``` go
const ForceGenerateTypeExplicit = `
// Service is the ForceGenerateTypeExplicit service interface.
type Service interface {
    // A implements A.
    A(context.Context) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "ForceGenerateTypeExplicit"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"A"}

type ForcedType struct {
    A *string
}
`
```
``` go
const MultipleEndpoints = `// Endpoints wraps the "MultipleEndpoints" service endpoints.
type Endpoints struct {
    B goa.Endpoint
    C goa.Endpoint
}

// NewEndpoints wraps the methods of the "MultipleEndpoints" service with
// endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        B: NewBEndpoint(s),
        C: NewCEndpoint(s),
    }
}

// Use applies the given middleware to all the "MultipleEndpoints" service
// endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.B = m(e.B)
    e.C = m(e.C)
}

// NewBEndpoint returns an endpoint function that calls the method "B" of
// service "MultipleEndpoints".
func NewBEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        p := req.(*BType)
        return nil, s.B(ctx, p)
    }
}

// NewCEndpoint returns an endpoint function that calls the method "C" of
// service "MultipleEndpoints".
func NewCEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        p := req.(*CType)
        return nil, s.C(ctx, p)
    }
}
`
```
``` go
const MultipleMethods = `
// Service is the MultipleMethods service interface.
type Service interface {
    // A implements A.
    A(context.Context, *APayload) (res *AResult, err error)
    // B implements B.
    B(context.Context, *BPayload) (res *BResult, err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "MultipleMethods"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [2]string{"A", "B"}

// APayload is the payload type of the MultipleMethods service A method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// AResult is the result type of the MultipleMethods service A method.
type AResult struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// BPayload is the payload type of the MultipleMethods service B method.
type BPayload struct {
    ArrayField  []bool
    MapField    map[int]string
    ObjectField *struct {
        IntField    *int
        StringField *string
    }
    UserTypeField *Parent
}

// BResult is the result type of the MultipleMethods service B method.
type BResult struct {
    ArrayField  []bool
    MapField    map[int]string
    ObjectField *struct {
        IntField    *int
        StringField *string
    }
    UserTypeField *Parent
}

type Parent struct {
    C *Child
}

type Child struct {
    P *Parent
}
`
```
``` go
const MultipleMethodsClient = `// Client is the "MultipleEndpoints" service client.
type Client struct {
    BEndpoint goa.Endpoint
    CEndpoint goa.Endpoint
}
// NewClient initializes a "MultipleEndpoints" service client given the
// endpoints.
func NewClient(b, c goa.Endpoint) *Client {
    return &Client{
        BEndpoint: b,
        CEndpoint: c,
    }
}

// B calls the "B" endpoint of the "MultipleEndpoints" service.
func (c *Client) B(ctx context.Context, p *BType)(err error) {
    _, err = c.BEndpoint(ctx, p)
    return
}

// C calls the "C" endpoint of the "MultipleEndpoints" service.
func (c *Client) C(ctx context.Context, p *CType)(err error) {
    _, err = c.CEndpoint(ctx, p)
    return
}
`
```
``` go
const MultipleMethodsResultMultipleViews = `
// Service is the MultipleMethodsResultMultipleViews service interface.
type Service interface {
    // A implements A.
    // The "view" return value must have one of the following views
    //	- "default"
    //	- "tiny"
    A(context.Context, *APayload) (res *MultipleViews, view string, err error)
    // B implements B.
    B(context.Context) (res *SingleView, err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "MultipleMethodsResultMultipleViews"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [2]string{"A", "B"}

// APayload is the payload type of the MultipleMethodsResultMultipleViews
// service A method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// MultipleViews is the result type of the MultipleMethodsResultMultipleViews
// service A method.
type MultipleViews struct {
    A *string
    B *string
}

// SingleView is the result type of the MultipleMethodsResultMultipleViews
// service B method.
type SingleView struct {
    A *string
    B *string
}

// NewMultipleViews initializes result type MultipleViews from viewed result
// type MultipleViews.
func NewMultipleViews(vres *multiplemethodsresultmultipleviewsviews.MultipleViews) *MultipleViews {
    var res *MultipleViews
    switch vres.View {
    case "default", "":
        res = newMultipleViews(vres.Projected)
    case "tiny":
        res = newMultipleViewsTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViews initializes viewed result type MultipleViews from
// result type MultipleViews using the given view.
func NewViewedMultipleViews(res *MultipleViews, view string) *multiplemethodsresultmultipleviewsviews.MultipleViews {
    var vres *multiplemethodsresultmultipleviewsviews.MultipleViews
    switch view {
    case "default", "":
        p := newMultipleViewsView(res)
        vres = &multiplemethodsresultmultipleviewsviews.MultipleViews{p, "default"}
    case "tiny":
        p := newMultipleViewsViewTiny(res)
        vres = &multiplemethodsresultmultipleviewsviews.MultipleViews{p, "tiny"}
    }
    return vres
}

// NewSingleView initializes result type SingleView from viewed result type
// SingleView.
func NewSingleView(vres *multiplemethodsresultmultipleviewsviews.SingleView) *SingleView {
    var res *SingleView
    switch vres.View {
    case "default", "":
        res = newSingleView(vres.Projected)
    }
    return res
}

// NewViewedSingleView initializes viewed result type SingleView from result
// type SingleView using the given view.
func NewViewedSingleView(res *SingleView, view string) *multiplemethodsresultmultipleviewsviews.SingleView {
    var vres *multiplemethodsresultmultipleviewsviews.SingleView
    switch view {
    case "default", "":
        p := newSingleViewView(res)
        vres = &multiplemethodsresultmultipleviewsviews.SingleView{p, "default"}
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *multiplemethodsresultmultipleviewsviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
        B: vres.B,
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *multiplemethodsresultmultipleviewsviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *multiplemethodsresultmultipleviewsviews.MultipleViewsView {
    vres := &multiplemethodsresultmultipleviewsviews.MultipleViewsView{
        A: res.A,
        B: res.B,
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *multiplemethodsresultmultipleviewsviews.MultipleViewsView {
    vres := &multiplemethodsresultmultipleviewsviews.MultipleViewsView{
        A: res.A,
    }
    return vres
}

// newSingleView converts projected type SingleView to service type SingleView.
func newSingleView(vres *multiplemethodsresultmultipleviewsviews.SingleViewView) *SingleView {
    res := &SingleView{
        A: vres.A,
        B: vres.B,
    }
    return res
}

// newSingleViewView projects result type SingleView into projected type
// SingleViewView using the "default" view.
func newSingleViewView(res *SingleView) *multiplemethodsresultmultipleviewsviews.SingleViewView {
    vres := &multiplemethodsresultmultipleviewsviews.SingleViewView{
        A: res.A,
        B: res.B,
    }
    return vres
}
`
```
``` go
const NoPayloadEndpoint = `// Endpoints wraps the "NoPayload" service endpoints.
type Endpoints struct {
    NoPayload goa.Endpoint
}

// NewEndpoints wraps the methods of the "NoPayload" service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        NoPayload: NewNoPayloadEndpoint(s),
    }
}

// Use applies the given middleware to all the "NoPayload" service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.NoPayload = m(e.NoPayload)
}

// NewNoPayloadEndpoint returns an endpoint function that calls the method
// "NoPayload" of service "NoPayload".
func NewNoPayloadEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        return nil, s.NoPayload(ctx)
    }
}
`
```
``` go
const NoPayloadMethodsClient = `// Client is the "NoPayload" service client.
type Client struct {
    NoPayloadEndpoint goa.Endpoint
}
// NewClient initializes a "NoPayload" service client given the endpoints.
func NewClient(noPayload goa.Endpoint) *Client {
    return &Client{
        NoPayloadEndpoint: noPayload,
    }
}

// NoPayload calls the "NoPayload" endpoint of the "NoPayload" service.
func (c *Client) NoPayload(ctx context.Context, )(err error) {
    _, err = c.NoPayloadEndpoint(ctx, nil)
    return
}
`
```
``` go
const ResultCollectionMultipleViewsCode = `// ResultTypeCollection is the viewed result type that is projected based on a
// view.
type ResultTypeCollection struct {
    // Type to project
    Projected ResultTypeCollectionView
    // View to render
    View string
}

// ResultTypeCollectionView is a type that runs validations on a projected type.
type ResultTypeCollectionView []*ResultTypeView

// ResultTypeView is a type that runs validations on a projected type.
type ResultTypeView struct {
    A *string
    B *string
}

// Validate runs the validations defined on the viewed result type
// ResultTypeCollection.
func (result ResultTypeCollection) Validate() (err error) {
    switch result.View {
    case "default", "":
        err = result.Projected.Validate()
    case "tiny":
        err = result.Projected.ValidateTiny()
    default:
        err = goa.InvalidEnumValueError("view", result.View, []interface{}{"default", "tiny"})
    }
    return
}

// Validate runs the validations defined on ResultTypeCollectionView using the
// "default" view.
func (result ResultTypeCollectionView) Validate() (err error) {
    for _, item := range result {
        if err2 := item.Validate(); err2 != nil {
            err = goa.MergeErrors(err, err2)
        }
    }
    return
}

// ValidateTiny runs the validations defined on ResultTypeCollectionView using
// the "tiny" view.
func (result ResultTypeCollectionView) ValidateTiny() (err error) {
    for _, item := range result {
        if err2 := item.ValidateTiny(); err2 != nil {
            err = goa.MergeErrors(err, err2)
        }
    }
    return
}

// Validate runs the validations defined on ResultTypeView using the "default"
// view.
func (result *ResultTypeView) Validate() (err error) {
    if result.A == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("a", "result"))
    }
    if result.B == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("b", "result"))
    }
    return
}

// ValidateTiny runs the validations defined on ResultTypeView using the "tiny"
// view.
func (result *ResultTypeView) ValidateTiny() (err error) {
    if result.A == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("a", "result"))
    }
    return
}
`
```
``` go
const ResultCollectionMultipleViewsMethod = `
// Service is the ResultCollectionMultipleViewsMethod service interface.
type Service interface {
    // A implements A.
    // The "view" return value must have one of the following views
    //	- "default"
    //	- "tiny"
    A(context.Context) (res MultipleViewsCollection, view string, err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "ResultCollectionMultipleViewsMethod"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"A"}

// MultipleViewsCollection is the result type of the
// ResultCollectionMultipleViewsMethod service A method.
type MultipleViewsCollection []*MultipleViews

type MultipleViews struct {
    A string
    B int
}

// NewMultipleViewsCollection initializes result type MultipleViewsCollection
// from viewed result type MultipleViewsCollection.
func NewMultipleViewsCollection(vres resultcollectionmultipleviewsmethodviews.MultipleViewsCollection) MultipleViewsCollection {
    var res MultipleViewsCollection
    switch vres.View {
    case "default", "":
        res = newMultipleViewsCollection(vres.Projected)
    case "tiny":
        res = newMultipleViewsCollectionTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViewsCollection initializes viewed result type
// MultipleViewsCollection from result type MultipleViewsCollection using the
// given view.
func NewViewedMultipleViewsCollection(res MultipleViewsCollection, view string) resultcollectionmultipleviewsmethodviews.MultipleViewsCollection {
    var vres resultcollectionmultipleviewsmethodviews.MultipleViewsCollection
    switch view {
    case "default", "":
        p := newMultipleViewsCollectionView(res)
        vres = resultcollectionmultipleviewsmethodviews.MultipleViewsCollection{p, "default"}
    case "tiny":
        p := newMultipleViewsCollectionViewTiny(res)
        vres = resultcollectionmultipleviewsmethodviews.MultipleViewsCollection{p, "tiny"}
    }
    return vres
}

// newMultipleViewsCollection converts projected type MultipleViewsCollection
// to service type MultipleViewsCollection.
func newMultipleViewsCollection(vres resultcollectionmultipleviewsmethodviews.MultipleViewsCollectionView) MultipleViewsCollection {
    res := make(MultipleViewsCollection, len(vres))
    for i, n := range vres {
        res[i] = newMultipleViews(n)
    }
    return res
}

// newMultipleViewsCollectionTiny converts projected type
// MultipleViewsCollection to service type MultipleViewsCollection.
func newMultipleViewsCollectionTiny(vres resultcollectionmultipleviewsmethodviews.MultipleViewsCollectionView) MultipleViewsCollection {
    res := make(MultipleViewsCollection, len(vres))
    for i, n := range vres {
        res[i] = newMultipleViewsTiny(n)
    }
    return res
}

// newMultipleViewsCollectionView projects result type MultipleViewsCollection
// into projected type MultipleViewsCollectionView using the "default" view.
func newMultipleViewsCollectionView(res MultipleViewsCollection) resultcollectionmultipleviewsmethodviews.MultipleViewsCollectionView {
    vres := make(resultcollectionmultipleviewsmethodviews.MultipleViewsCollectionView, len(res))
    for i, n := range res {
        vres[i] = newMultipleViewsView(n)
    }
    return vres
}

// newMultipleViewsCollectionViewTiny projects result type
// MultipleViewsCollection into projected type MultipleViewsCollectionView
// using the "tiny" view.
func newMultipleViewsCollectionViewTiny(res MultipleViewsCollection) resultcollectionmultipleviewsmethodviews.MultipleViewsCollectionView {
    vres := make(resultcollectionmultipleviewsmethodviews.MultipleViewsCollectionView, len(res))
    for i, n := range res {
        vres[i] = newMultipleViewsViewTiny(n)
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *resultcollectionmultipleviewsmethodviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{}
    if vres.A != nil {
        res.A = *vres.A
    }
    if vres.B != nil {
        res.B = *vres.B
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *resultcollectionmultipleviewsmethodviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{}
    if vres.A != nil {
        res.A = *vres.A
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *resultcollectionmultipleviewsmethodviews.MultipleViewsView {
    vres := &resultcollectionmultipleviewsmethodviews.MultipleViewsView{
        A: &res.A,
        B: &res.B,
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *resultcollectionmultipleviewsmethodviews.MultipleViewsView {
    vres := &resultcollectionmultipleviewsmethodviews.MultipleViewsView{
        A: &res.A,
    }
    return vres
}
`
```
``` go
const ResultWithMultipleViewsCode = `// ResultType is the viewed result type that is projected based on a view.
type ResultType struct {
    // Type to project
    Projected *ResultTypeView
    // View to render
    View string
}

// ResultTypeView is a type that runs validations on a projected type.
type ResultTypeView struct {
    A *string
    B *string
}

// Validate runs the validations defined on the viewed result type ResultType.
func (result *ResultType) Validate() (err error) {
    switch result.View {
    case "default", "":
        err = result.Projected.Validate()
    case "tiny":
        err = result.Projected.ValidateTiny()
    default:
        err = goa.InvalidEnumValueError("view", result.View, []interface{}{"default", "tiny"})
    }
    return
}

// Validate runs the validations defined on ResultTypeView using the "default"
// view.
func (result *ResultTypeView) Validate() (err error) {
    if result.A == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("a", "result"))
    }
    if result.B == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("b", "result"))
    }
    return
}

// ValidateTiny runs the validations defined on ResultTypeView using the "tiny"
// view.
func (result *ResultTypeView) ValidateTiny() (err error) {
    if result.A == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("a", "result"))
    }
    return
}
`
```
``` go
const ResultWithOtherResultMethod = `
// Service is the ResultWithOtherResult service interface.
type Service interface {
    // A implements A.
    // The "view" return value must have one of the following views
    //	- "default"
    //	- "tiny"
    A(context.Context) (res *MultipleViews, view string, err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "ResultWithOtherResult"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"A"}

// MultipleViews is the result type of the ResultWithOtherResult service A
// method.
type MultipleViews struct {
    A string
    B *MultipleViews2
}

type MultipleViews2 struct {
    A string
    B *string
}

// NewMultipleViews initializes result type MultipleViews from viewed result
// type MultipleViews.
func NewMultipleViews(vres *resultwithotherresultviews.MultipleViews) *MultipleViews {
    var res *MultipleViews
    switch vres.View {
    case "default", "":
        res = newMultipleViews(vres.Projected)
    case "tiny":
        res = newMultipleViewsTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViews initializes viewed result type MultipleViews from
// result type MultipleViews using the given view.
func NewViewedMultipleViews(res *MultipleViews, view string) *resultwithotherresultviews.MultipleViews {
    var vres *resultwithotherresultviews.MultipleViews
    switch view {
    case "default", "":
        p := newMultipleViewsView(res)
        vres = &resultwithotherresultviews.MultipleViews{p, "default"}
    case "tiny":
        p := newMultipleViewsViewTiny(res)
        vres = &resultwithotherresultviews.MultipleViews{p, "tiny"}
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *resultwithotherresultviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{}
    if vres.A != nil {
        res.A = *vres.A
    }
    if vres.B != nil {
        res.B = newMultipleViews2(vres.B)
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *resultwithotherresultviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{}
    if vres.A != nil {
        res.A = *vres.A
    }
    if vres.B != nil {
        res.B = newMultipleViews2(vres.B)
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *resultwithotherresultviews.MultipleViewsView {
    vres := &resultwithotherresultviews.MultipleViewsView{
        A: &res.A,
    }
    if res.B != nil {
        vres.B = newMultipleViews2View(res.B)
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *resultwithotherresultviews.MultipleViewsView {
    vres := &resultwithotherresultviews.MultipleViewsView{
        A: &res.A,
    }
    return vres
}

// newMultipleViews2 converts projected type MultipleViews2 to service type
// MultipleViews2.
func newMultipleViews2(vres *resultwithotherresultviews.MultipleViews2View) *MultipleViews2 {
    res := &MultipleViews2{
        B: vres.B,
    }
    if vres.A != nil {
        res.A = *vres.A
    }
    return res
}

// newMultipleViews2Tiny converts projected type MultipleViews2 to service type
// MultipleViews2.
func newMultipleViews2Tiny(vres *resultwithotherresultviews.MultipleViews2View) *MultipleViews2 {
    res := &MultipleViews2{}
    if vres.A != nil {
        res.A = *vres.A
    }
    return res
}

// newMultipleViews2View projects result type MultipleViews2 into projected
// type MultipleViews2View using the "default" view.
func newMultipleViews2View(res *MultipleViews2) *resultwithotherresultviews.MultipleViews2View {
    vres := &resultwithotherresultviews.MultipleViews2View{
        A: &res.A,
        B: res.B,
    }
    return vres
}

// newMultipleViews2ViewTiny projects result type MultipleViews2 into projected
// type MultipleViews2View using the "tiny" view.
func newMultipleViews2ViewTiny(res *MultipleViews2) *resultwithotherresultviews.MultipleViews2View {
    vres := &resultwithotherresultviews.MultipleViews2View{
        A: &res.A,
    }
    return vres
}
`
```
``` go
const ResultWithRecursiveResultTypeCode = `// RT is the viewed result type that is projected based on a view.
type RT struct {
    // Type to project
    Projected *RTView
    // View to render
    View string
}

// RTView is a type that runs validations on a projected type.
type RTView struct {
    A *RTView
}

// Validate runs the validations defined on the viewed result type RT.
func (result *RT) Validate() (err error) {
    switch result.View {
    case "default", "":
        err = result.Projected.Validate()
    case "tiny":
        err = result.Projected.ValidateTiny()
    default:
        err = goa.InvalidEnumValueError("view", result.View, []interface{}{"default", "tiny"})
    }
    return
}

// Validate runs the validations defined on RTView using the "default" view.
func (result *RTView) Validate() (err error) {
    if result.A == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("a", "result"))
    }
    if result.A != nil {
        if err2 := result.A.ValidateTiny(); err2 != nil {
            err = goa.MergeErrors(err, err2)
        }
    }
    return
}

// ValidateTiny runs the validations defined on RTView using the "tiny" view.
func (result *RTView) ValidateTiny() (err error) {
    if result.A == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("a", "result"))
    }
    if result.A != nil {
        if err2 := result.A.Validate(); err2 != nil {
            err = goa.MergeErrors(err, err2)
        }
    }
    return
}
`
```
``` go
const ResultWithResultTypeCode = `// RT is the viewed result type that is projected based on a view.
type RT struct {
    // Type to project
    Projected *RTView
    // View to render
    View string
}

// RTView is a type that runs validations on a projected type.
type RTView struct {
    A *string
    B *RT2View
    C *RT3View
}

// RT2View is a type that runs validations on a projected type.
type RT2View struct {
    C *string
    D *UserTypeView
    E *string
}

// UserTypeView is a type that runs validations on a projected type.
type UserTypeView struct {
    P *string
}

// RT3View is a type that runs validations on a projected type.
type RT3View struct {
    X []string
    Y map[int]*UserTypeView
    Z *string
}

// Validate runs the validations defined on the viewed result type RT.
func (result *RT) Validate() (err error) {
    switch result.View {
    case "default", "":
        err = result.Projected.Validate()
    case "tiny":
        err = result.Projected.ValidateTiny()
    default:
        err = goa.InvalidEnumValueError("view", result.View, []interface{}{"default", "tiny"})
    }
    return
}

// Validate runs the validations defined on RTView using the "default" view.
func (result *RTView) Validate() (err error) {

    if result.B != nil {
        if err2 := result.B.ValidateExtended(); err2 != nil {
            err = goa.MergeErrors(err, err2)
        }
    }
    if result.C != nil {
        if err2 := result.C.Validate(); err2 != nil {
            err = goa.MergeErrors(err, err2)
        }
    }
    return
}

// ValidateTiny runs the validations defined on RTView using the "tiny" view.
func (result *RTView) ValidateTiny() (err error) {

    if result.B != nil {
        if err2 := result.B.ValidateTiny(); err2 != nil {
            err = goa.MergeErrors(err, err2)
        }
    }
    if result.C != nil {
        if err2 := result.C.Validate(); err2 != nil {
            err = goa.MergeErrors(err, err2)
        }
    }
    return
}

// Validate runs the validations defined on RT2View using the "default" view.
func (result *RT2View) Validate() (err error) {
    if result.C == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("c", "result"))
    }
    if result.D == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("d", "result"))
    }
    return
}

// ValidateExtended runs the validations defined on RT2View using the
// "extended" view.
func (result *RT2View) ValidateExtended() (err error) {
    if result.C == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("c", "result"))
    }
    if result.D == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("d", "result"))
    }
    return
}

// ValidateTiny runs the validations defined on RT2View using the "tiny" view.
func (result *RT2View) ValidateTiny() (err error) {
    if result.D == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("d", "result"))
    }
    return
}

// Validate runs the validations defined on UserTypeView.
func (result *UserTypeView) Validate() (err error) {

    return
}

// Validate runs the validations defined on RT3View using the "default" view.
func (result *RT3View) Validate() (err error) {
    if result.X == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("x", "result"))
    }
    if result.Y == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("y", "result"))
    }
    return
}

// ValidateTiny runs the validations defined on RT3View using the "tiny" view.
func (result *RT3View) ValidateTiny() (err error) {
    if result.X == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("x", "result"))
    }
    return
}
`
```
``` go
const ResultWithUserTypeCode = `// ResultType is the viewed result type that is projected based on a view.
type ResultType struct {
    // Type to project
    Projected *ResultTypeView
    // View to render
    View string
}

// ResultTypeView is a type that runs validations on a projected type.
type ResultTypeView struct {
    A *UserTypeView
    B *string
}

// UserTypeView is a type that runs validations on a projected type.
type UserTypeView struct {
    A *string
}

// Validate runs the validations defined on the viewed result type ResultType.
func (result *ResultType) Validate() (err error) {
    switch result.View {
    case "default", "":
        err = result.Projected.Validate()
    case "tiny":
        err = result.Projected.ValidateTiny()
    default:
        err = goa.InvalidEnumValueError("view", result.View, []interface{}{"default", "tiny"})
    }
    return
}

// Validate runs the validations defined on ResultTypeView using the "default"
// view.
func (result *ResultTypeView) Validate() (err error) {
    if result.A == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("a", "result"))
    }
    return
}

// ValidateTiny runs the validations defined on ResultTypeView using the "tiny"
// view.
func (result *ResultTypeView) ValidateTiny() (err error) {
    if result.A == nil {
        err = goa.MergeErrors(err, goa.MissingFieldError("a", "result"))
    }
    return
}

// Validate runs the validations defined on UserTypeView.
func (result *UserTypeView) Validate() (err error) {

    return
}
`
```
``` go
const ServiceError = `
// Service is the ServiceError service interface.
type Service interface {
    // A implements A.
    A(context.Context) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "ServiceError"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"A"}

// MakeError builds a goa.ServiceError from an error.
func MakeError(err error) *goa.ServiceError {
    return &goa.ServiceError{
        Name:    "error",
        ID:      goa.NewErrorID(),
        Message: err.Error(),
    }
}
`
```
``` go
const SingleEndpoint = `// Endpoints wraps the "SingleEndpoint" service endpoints.
type Endpoints struct {
    A goa.Endpoint
}

// NewEndpoints wraps the methods of the "SingleEndpoint" service with
// endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        A: NewAEndpoint(s),
    }
}

// Use applies the given middleware to all the "SingleEndpoint" service
// endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.A = m(e.A)
}

// NewAEndpoint returns an endpoint function that calls the method "A" of
// service "SingleEndpoint".
func NewAEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        p := req.(*AType)
        return nil, s.A(ctx, p)
    }
}
`
```
``` go
const SingleMethod = `
// Service is the SingleMethod service interface.
type Service interface {
    // A implements A.
    A(context.Context, *APayload) (res *AResult, err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "SingleMethod"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"A"}

// APayload is the payload type of the SingleMethod service A method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// AResult is the result type of the SingleMethod service A method.
type AResult struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}
`
```
``` go
const SingleMethodClient = `// Client is the "SingleEndpoint" service client.
type Client struct {
    AEndpoint goa.Endpoint
}
// NewClient initializes a "SingleEndpoint" service client given the endpoints.
func NewClient(a goa.Endpoint) *Client {
    return &Client{
        AEndpoint: a,
    }
}

// A calls the "A" endpoint of the "SingleEndpoint" service.
func (c *Client) A(ctx context.Context, p *AType)(err error) {
    _, err = c.AEndpoint(ctx, p)
    return
}
`
```
``` go
const StreamingPayloadMethod = `
// Service is the StreamingPayloadService service interface.
type Service interface {
    // StreamingPayloadMethod implements StreamingPayloadMethod.
    StreamingPayloadMethod(context.Context, *BPayload, StreamingPayloadMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingPayloadService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingPayloadMethod"}

// StreamingPayloadMethodServerStream is the interface a
// "StreamingPayloadMethod" endpoint server stream must satisfy.
type StreamingPayloadMethodServerStream interface {
    // SendAndClose streams instances of "AResult" and closes the stream.
    SendAndClose(*AResult) error
    // Recv reads instances of "APayload" from the stream.
    Recv() (*APayload, error)
}

// StreamingPayloadMethodClientStream is the interface a
// "StreamingPayloadMethod" endpoint client stream must satisfy.
type StreamingPayloadMethodClientStream interface {
    // Send streams instances of "APayload".
    Send(*APayload) error
    // CloseAndRecv stops sending messages to the stream and reads instances of
    // "AResult" from the stream.
    CloseAndRecv() (*AResult, error)
}

// BPayload is the payload type of the StreamingPayloadService service
// StreamingPayloadMethod method.
type BPayload struct {
    ArrayField  []bool
    MapField    map[int]string
    ObjectField *struct {
        IntField    *int
        StringField *string
    }
    UserTypeField *Parent
}

// APayload is the streaming payload type of the StreamingPayloadService
// service StreamingPayloadMethod method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// AResult is the result type of the StreamingPayloadService service
// StreamingPayloadMethod method.
type AResult struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

type Parent struct {
    C *Child
}

type Child struct {
    P *Parent
}
`
```
``` go
const StreamingPayloadMethodClient = `// Client is the "StreamingPayloadService" service client.
type Client struct {
    StreamingPayloadMethodEndpoint goa.Endpoint
}
// NewClient initializes a "StreamingPayloadService" service client given the
// endpoints.
func NewClient(streamingPayloadMethod goa.Endpoint) *Client {
    return &Client{
        StreamingPayloadMethodEndpoint: streamingPayloadMethod,
    }
}

// StreamingPayloadMethod calls the "StreamingPayloadMethod" endpoint of the
// "StreamingPayloadService" service.
func (c *Client) StreamingPayloadMethod(ctx context.Context, p *BPayload)(res StreamingPayloadMethodClientStream, err error) {
    var ires interface{}
    ires, err = c.StreamingPayloadMethodEndpoint(ctx, p)
    if err != nil {
        return
    }
    return ires.(StreamingPayloadMethodClientStream), nil
}
`
```
``` go
const StreamingPayloadMethodEndpoint = `// Endpoints wraps the "StreamingPayloadEndpoint" service endpoints.
type Endpoints struct {
    StreamingPayloadMethod goa.Endpoint
}

// StreamingPayloadMethodEndpointInput is the input type of
// "StreamingPayloadMethod" endpoint that holds the method payload and the
// server stream.
type StreamingPayloadMethodEndpointInput struct {
    // Payload is the method payload.
    Payload *BType
    // Stream is the server stream used by the "StreamingPayloadMethod" method to
    // send data.
    Stream StreamingPayloadMethodServerStream
}

// NewEndpoints wraps the methods of the "StreamingPayloadEndpoint" service
// with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        StreamingPayloadMethod: NewStreamingPayloadMethodEndpoint(s),
    }
}

// Use applies the given middleware to all the "StreamingPayloadEndpoint"
// service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.StreamingPayloadMethod = m(e.StreamingPayloadMethod)
}

// NewStreamingPayloadMethodEndpoint returns an endpoint function that calls
// the method "StreamingPayloadMethod" of service "StreamingPayloadEndpoint".
func NewStreamingPayloadMethodEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        ep := req.(*StreamingPayloadMethodEndpointInput)
        return nil, s.StreamingPayloadMethod(ctx, ep.Payload, ep.Stream)
    }
}
`
```
``` go
const StreamingPayloadNoPayloadMethod = `
// Service is the StreamingPayloadNoPayloadService service interface.
type Service interface {
    // StreamingPayloadNoPayloadMethod implements StreamingPayloadNoPayloadMethod.
    StreamingPayloadNoPayloadMethod(context.Context, StreamingPayloadNoPayloadMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingPayloadNoPayloadService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingPayloadNoPayloadMethod"}

// StreamingPayloadNoPayloadMethodServerStream is the interface a
// "StreamingPayloadNoPayloadMethod" endpoint server stream must satisfy.
type StreamingPayloadNoPayloadMethodServerStream interface {
    // SendAndClose streams instances of "string" and closes the stream.
    SendAndClose(string) error
    // Recv reads instances of "interface{}" from the stream.
    Recv() (interface{}, error)
}

// StreamingPayloadNoPayloadMethodClientStream is the interface a
// "StreamingPayloadNoPayloadMethod" endpoint client stream must satisfy.
type StreamingPayloadNoPayloadMethodClientStream interface {
    // Send streams instances of "interface{}".
    Send(interface{}) error
    // CloseAndRecv stops sending messages to the stream and reads instances of
    // "string" from the stream.
    CloseAndRecv() (string, error)
}
`
```
``` go
const StreamingPayloadNoPayloadMethodClient = `// Client is the "StreamingPayloadNoPayloadService" service client.
type Client struct {
    StreamingPayloadNoPayloadMethodEndpoint goa.Endpoint
}
// NewClient initializes a "StreamingPayloadNoPayloadService" service client
// given the endpoints.
func NewClient(streamingPayloadNoPayloadMethod goa.Endpoint) *Client {
    return &Client{
        StreamingPayloadNoPayloadMethodEndpoint: streamingPayloadNoPayloadMethod,
    }
}

// StreamingPayloadNoPayloadMethod calls the "StreamingPayloadNoPayloadMethod"
// endpoint of the "StreamingPayloadNoPayloadService" service.
func (c *Client) StreamingPayloadNoPayloadMethod(ctx context.Context, )(res StreamingPayloadNoPayloadMethodClientStream, err error) {
    var ires interface{}
    ires, err = c.StreamingPayloadNoPayloadMethodEndpoint(ctx, nil)
    if err != nil {
        return
    }
    return ires.(StreamingPayloadNoPayloadMethodClientStream), nil
}
`
```
``` go
const StreamingPayloadNoPayloadMethodEndpoint = `// Endpoints wraps the "StreamingPayloadNoPayloadService" service endpoints.
type Endpoints struct {
    StreamingPayloadNoPayloadMethod goa.Endpoint
}

// StreamingPayloadNoPayloadMethodEndpointInput is the input type of
// "StreamingPayloadNoPayloadMethod" endpoint that holds the method payload and
// the server stream.
type StreamingPayloadNoPayloadMethodEndpointInput struct {
    // Stream is the server stream used by the "StreamingPayloadNoPayloadMethod"
    // method to send data.
    Stream StreamingPayloadNoPayloadMethodServerStream
}

// NewEndpoints wraps the methods of the "StreamingPayloadNoPayloadService"
// service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        StreamingPayloadNoPayloadMethod: NewStreamingPayloadNoPayloadMethodEndpoint(s),
    }
}

// Use applies the given middleware to all the
// "StreamingPayloadNoPayloadService" service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.StreamingPayloadNoPayloadMethod = m(e.StreamingPayloadNoPayloadMethod)
}

// NewStreamingPayloadNoPayloadMethodEndpoint returns an endpoint function that
// calls the method "StreamingPayloadNoPayloadMethod" of service
// "StreamingPayloadNoPayloadService".
func NewStreamingPayloadNoPayloadMethodEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        ep := req.(*StreamingPayloadNoPayloadMethodEndpointInput)
        return nil, s.StreamingPayloadNoPayloadMethod(ctx, ep.Stream)
    }
}
`
```
``` go
const StreamingPayloadNoResultMethod = `
// Service is the StreamingPayloadNoResultService service interface.
type Service interface {
    // StreamingPayloadNoResultMethod implements StreamingPayloadNoResultMethod.
    StreamingPayloadNoResultMethod(context.Context, StreamingPayloadNoResultMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingPayloadNoResultService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingPayloadNoResultMethod"}

// StreamingPayloadNoResultMethodServerStream is the interface a
// "StreamingPayloadNoResultMethod" endpoint server stream must satisfy.
type StreamingPayloadNoResultMethodServerStream interface {
    // Recv reads instances of "int" from the stream.
    Recv() (int, error)
    // Close closes the stream.
    Close() error
}

// StreamingPayloadNoResultMethodClientStream is the interface a
// "StreamingPayloadNoResultMethod" endpoint client stream must satisfy.
type StreamingPayloadNoResultMethodClientStream interface {
    // Send streams instances of "int".
    Send(int) error
    // Close closes the stream.
    Close() error
}
`
```
``` go
const StreamingPayloadNoResultMethodEndpoint = `// Endpoints wraps the "StreamingPayloadNoResultService" service endpoints.
type Endpoints struct {
    StreamingPayloadNoResultMethod goa.Endpoint
}

// StreamingPayloadNoResultMethodEndpointInput is the input type of
// "StreamingPayloadNoResultMethod" endpoint that holds the method payload and
// the server stream.
type StreamingPayloadNoResultMethodEndpointInput struct {
    // Stream is the server stream used by the "StreamingPayloadNoResultMethod"
    // method to send data.
    Stream StreamingPayloadNoResultMethodServerStream
}

// NewEndpoints wraps the methods of the "StreamingPayloadNoResultService"
// service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        StreamingPayloadNoResultMethod: NewStreamingPayloadNoResultMethodEndpoint(s),
    }
}

// Use applies the given middleware to all the
// "StreamingPayloadNoResultService" service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.StreamingPayloadNoResultMethod = m(e.StreamingPayloadNoResultMethod)
}

// NewStreamingPayloadNoResultMethodEndpoint returns an endpoint function that
// calls the method "StreamingPayloadNoResultMethod" of service
// "StreamingPayloadNoResultService".
func NewStreamingPayloadNoResultMethodEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        ep := req.(*StreamingPayloadNoResultMethodEndpointInput)
        return nil, s.StreamingPayloadNoResultMethod(ctx, ep.Stream)
    }
}
`
```
``` go
const StreamingPayloadResultWithExplicitViewMethod = `
// Service is the StreamingPayloadResultWithExplicitViewService service
// interface.
type Service interface {
    // StreamingPayloadResultWithExplicitViewMethod implements
    // StreamingPayloadResultWithExplicitViewMethod.
    StreamingPayloadResultWithExplicitViewMethod(context.Context, StreamingPayloadResultWithExplicitViewMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingPayloadResultWithExplicitViewService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingPayloadResultWithExplicitViewMethod"}

// StreamingPayloadResultWithExplicitViewMethodServerStream is the interface a
// "StreamingPayloadResultWithExplicitViewMethod" endpoint server stream must
// satisfy.
type StreamingPayloadResultWithExplicitViewMethodServerStream interface {
    // SendAndClose streams instances of "MultipleViews" and closes the stream.
    SendAndClose(*MultipleViews) error
    // Recv reads instances of "[]string" from the stream.
    Recv() ([]string, error)
}

// StreamingPayloadResultWithExplicitViewMethodClientStream is the interface a
// "StreamingPayloadResultWithExplicitViewMethod" endpoint client stream must
// satisfy.
type StreamingPayloadResultWithExplicitViewMethodClientStream interface {
    // Send streams instances of "[]string".
    Send([]string) error
    // CloseAndRecv stops sending messages to the stream and reads instances of
    // "MultipleViews" from the stream.
    CloseAndRecv() (*MultipleViews, error)
}

// MultipleViews is the result type of the
// StreamingPayloadResultWithExplicitViewService service
// StreamingPayloadResultWithExplicitViewMethod method.
type MultipleViews struct {
    A *string
    B *string
}

// NewMultipleViews initializes result type MultipleViews from viewed result
// type MultipleViews.
func NewMultipleViews(vres *streamingpayloadresultwithexplicitviewserviceviews.MultipleViews) *MultipleViews {
    var res *MultipleViews
    switch vres.View {
    case "default", "":
        res = newMultipleViews(vres.Projected)
    case "tiny":
        res = newMultipleViewsTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViews initializes viewed result type MultipleViews from
// result type MultipleViews using the given view.
func NewViewedMultipleViews(res *MultipleViews, view string) *streamingpayloadresultwithexplicitviewserviceviews.MultipleViews {
    var vres *streamingpayloadresultwithexplicitviewserviceviews.MultipleViews
    switch view {
    case "default", "":
        p := newMultipleViewsView(res)
        vres = &streamingpayloadresultwithexplicitviewserviceviews.MultipleViews{p, "default"}
    case "tiny":
        p := newMultipleViewsViewTiny(res)
        vres = &streamingpayloadresultwithexplicitviewserviceviews.MultipleViews{p, "tiny"}
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *streamingpayloadresultwithexplicitviewserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
        B: vres.B,
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *streamingpayloadresultwithexplicitviewserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *streamingpayloadresultwithexplicitviewserviceviews.MultipleViewsView {
    vres := &streamingpayloadresultwithexplicitviewserviceviews.MultipleViewsView{
        A: res.A,
        B: res.B,
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *streamingpayloadresultwithexplicitviewserviceviews.MultipleViewsView {
    vres := &streamingpayloadresultwithexplicitviewserviceviews.MultipleViewsView{
        A: res.A,
    }
    return vres
}
`
```
``` go
const StreamingPayloadResultWithViewsMethod = `
// Service is the StreamingPayloadResultWithViewsService service interface.
type Service interface {
    // StreamingPayloadResultWithViewsMethod implements
    // StreamingPayloadResultWithViewsMethod.
    // The "view" return value must have one of the following views
    //	- "default"
    //	- "tiny"
    StreamingPayloadResultWithViewsMethod(context.Context, StreamingPayloadResultWithViewsMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingPayloadResultWithViewsService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingPayloadResultWithViewsMethod"}

// StreamingPayloadResultWithViewsMethodServerStream is the interface a
// "StreamingPayloadResultWithViewsMethod" endpoint server stream must satisfy.
type StreamingPayloadResultWithViewsMethodServerStream interface {
    // SendAndClose streams instances of "MultipleViews" and closes the stream.
    SendAndClose(*MultipleViews) error
    // Recv reads instances of "APayload" from the stream.
    Recv() (*APayload, error)
    // SetView sets the view used to render the result before streaming.
    SetView(view string)
}

// StreamingPayloadResultWithViewsMethodClientStream is the interface a
// "StreamingPayloadResultWithViewsMethod" endpoint client stream must satisfy.
type StreamingPayloadResultWithViewsMethodClientStream interface {
    // Send streams instances of "APayload".
    Send(*APayload) error
    // CloseAndRecv stops sending messages to the stream and reads instances of
    // "MultipleViews" from the stream.
    CloseAndRecv() (*MultipleViews, error)
}

// APayload is the streaming payload type of the
// StreamingPayloadResultWithViewsService service
// StreamingPayloadResultWithViewsMethod method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// MultipleViews is the result type of the
// StreamingPayloadResultWithViewsService service
// StreamingPayloadResultWithViewsMethod method.
type MultipleViews struct {
    A *string
    B *string
}

// NewMultipleViews initializes result type MultipleViews from viewed result
// type MultipleViews.
func NewMultipleViews(vres *streamingpayloadresultwithviewsserviceviews.MultipleViews) *MultipleViews {
    var res *MultipleViews
    switch vres.View {
    case "default", "":
        res = newMultipleViews(vres.Projected)
    case "tiny":
        res = newMultipleViewsTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViews initializes viewed result type MultipleViews from
// result type MultipleViews using the given view.
func NewViewedMultipleViews(res *MultipleViews, view string) *streamingpayloadresultwithviewsserviceviews.MultipleViews {
    var vres *streamingpayloadresultwithviewsserviceviews.MultipleViews
    switch view {
    case "default", "":
        p := newMultipleViewsView(res)
        vres = &streamingpayloadresultwithviewsserviceviews.MultipleViews{p, "default"}
    case "tiny":
        p := newMultipleViewsViewTiny(res)
        vres = &streamingpayloadresultwithviewsserviceviews.MultipleViews{p, "tiny"}
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *streamingpayloadresultwithviewsserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
        B: vres.B,
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *streamingpayloadresultwithviewsserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *streamingpayloadresultwithviewsserviceviews.MultipleViewsView {
    vres := &streamingpayloadresultwithviewsserviceviews.MultipleViewsView{
        A: res.A,
        B: res.B,
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *streamingpayloadresultwithviewsserviceviews.MultipleViewsView {
    vres := &streamingpayloadresultwithviewsserviceviews.MultipleViewsView{
        A: res.A,
    }
    return vres
}
`
```
``` go
const StreamingResultMethod = `
// Service is the StreamingResultService service interface.
type Service interface {
    // StreamingResultMethod implements StreamingResultMethod.
    StreamingResultMethod(context.Context, *APayload, StreamingResultMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingResultService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingResultMethod"}

// StreamingResultMethodServerStream is the interface a "StreamingResultMethod"
// endpoint server stream must satisfy.
type StreamingResultMethodServerStream interface {
    // Send streams instances of "AResult".
    Send(*AResult) error
    // Close closes the stream.
    Close() error
}

// StreamingResultMethodClientStream is the interface a "StreamingResultMethod"
// endpoint client stream must satisfy.
type StreamingResultMethodClientStream interface {
    // Recv reads instances of "AResult" from the stream.
    Recv() (*AResult, error)
}

// APayload is the payload type of the StreamingResultService service
// StreamingResultMethod method.
type APayload struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}

// AResult is the result type of the StreamingResultService service
// StreamingResultMethod method.
type AResult struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}
`
```
``` go
const StreamingResultMethodClient = `// Client is the "StreamingResultService" service client.
type Client struct {
    StreamingResultMethodEndpoint goa.Endpoint
}
// NewClient initializes a "StreamingResultService" service client given the
// endpoints.
func NewClient(streamingResultMethod goa.Endpoint) *Client {
    return &Client{
        StreamingResultMethodEndpoint: streamingResultMethod,
    }
}

// StreamingResultMethod calls the "StreamingResultMethod" endpoint of the
// "StreamingResultService" service.
func (c *Client) StreamingResultMethod(ctx context.Context, p *APayload)(res StreamingResultMethodClientStream, err error) {
    var ires interface{}
    ires, err = c.StreamingResultMethodEndpoint(ctx, p)
    if err != nil {
        return
    }
    return ires.(StreamingResultMethodClientStream), nil
}
`
```
``` go
const StreamingResultMethodEndpoint = `// Endpoints wraps the "StreamingResultEndpoint" service endpoints.
type Endpoints struct {
    StreamingResultMethod goa.Endpoint
}

// StreamingResultMethodEndpointInput is the input type of
// "StreamingResultMethod" endpoint that holds the method payload and the
// server stream.
type StreamingResultMethodEndpointInput struct {
    // Payload is the method payload.
    Payload *AType
    // Stream is the server stream used by the "StreamingResultMethod" method to
    // send data.
    Stream StreamingResultMethodServerStream
}

// NewEndpoints wraps the methods of the "StreamingResultEndpoint" service with
// endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        StreamingResultMethod: NewStreamingResultMethodEndpoint(s),
    }
}

// Use applies the given middleware to all the "StreamingResultEndpoint"
// service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.StreamingResultMethod = m(e.StreamingResultMethod)
}

// NewStreamingResultMethodEndpoint returns an endpoint function that calls the
// method "StreamingResultMethod" of service "StreamingResultEndpoint".
func NewStreamingResultMethodEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        ep := req.(*StreamingResultMethodEndpointInput)
        return nil, s.StreamingResultMethod(ctx, ep.Payload, ep.Stream)
    }
}
`
```
``` go
const StreamingResultNoPayloadMethod = `
// Service is the StreamingResultNoPayloadService service interface.
type Service interface {
    // StreamingResultNoPayloadMethod implements StreamingResultNoPayloadMethod.
    StreamingResultNoPayloadMethod(context.Context, StreamingResultNoPayloadMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingResultNoPayloadService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingResultNoPayloadMethod"}

// StreamingResultNoPayloadMethodServerStream is the interface a
// "StreamingResultNoPayloadMethod" endpoint server stream must satisfy.
type StreamingResultNoPayloadMethodServerStream interface {
    // Send streams instances of "AResult".
    Send(*AResult) error
    // Close closes the stream.
    Close() error
}

// StreamingResultNoPayloadMethodClientStream is the interface a
// "StreamingResultNoPayloadMethod" endpoint client stream must satisfy.
type StreamingResultNoPayloadMethodClientStream interface {
    // Recv reads instances of "AResult" from the stream.
    Recv() (*AResult, error)
}

// AResult is the result type of the StreamingResultNoPayloadService service
// StreamingResultNoPayloadMethod method.
type AResult struct {
    IntField      int
    StringField   string
    BooleanField  bool
    BytesField    []byte
    OptionalField *string
}
`
```
``` go
const StreamingResultNoPayloadMethodClient = `// Client is the "StreamingResultNoPayloadService" service client.
type Client struct {
    StreamingResultNoPayloadMethodEndpoint goa.Endpoint
}
// NewClient initializes a "StreamingResultNoPayloadService" service client
// given the endpoints.
func NewClient(streamingResultNoPayloadMethod goa.Endpoint) *Client {
    return &Client{
        StreamingResultNoPayloadMethodEndpoint: streamingResultNoPayloadMethod,
    }
}

// StreamingResultNoPayloadMethod calls the "StreamingResultNoPayloadMethod"
// endpoint of the "StreamingResultNoPayloadService" service.
func (c *Client) StreamingResultNoPayloadMethod(ctx context.Context, )(res StreamingResultNoPayloadMethodClientStream, err error) {
    var ires interface{}
    ires, err = c.StreamingResultNoPayloadMethodEndpoint(ctx, nil)
    if err != nil {
        return
    }
    return ires.(StreamingResultNoPayloadMethodClientStream), nil
}
`
```
``` go
const StreamingResultNoPayloadMethodEndpoint = `// Endpoints wraps the "StreamingResultNoPayloadEndpoint" service endpoints.
type Endpoints struct {
    StreamingResultNoPayloadMethod goa.Endpoint
}

// StreamingResultNoPayloadMethodEndpointInput is the input type of
// "StreamingResultNoPayloadMethod" endpoint that holds the method payload and
// the server stream.
type StreamingResultNoPayloadMethodEndpointInput struct {
    // Stream is the server stream used by the "StreamingResultNoPayloadMethod"
    // method to send data.
    Stream StreamingResultNoPayloadMethodServerStream
}

// NewEndpoints wraps the methods of the "StreamingResultNoPayloadEndpoint"
// service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        StreamingResultNoPayloadMethod: NewStreamingResultNoPayloadMethodEndpoint(s),
    }
}

// Use applies the given middleware to all the
// "StreamingResultNoPayloadEndpoint" service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.StreamingResultNoPayloadMethod = m(e.StreamingResultNoPayloadMethod)
}

// NewStreamingResultNoPayloadMethodEndpoint returns an endpoint function that
// calls the method "StreamingResultNoPayloadMethod" of service
// "StreamingResultNoPayloadEndpoint".
func NewStreamingResultNoPayloadMethodEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        ep := req.(*StreamingResultNoPayloadMethodEndpointInput)
        return nil, s.StreamingResultNoPayloadMethod(ctx, ep.Stream)
    }
}
`
```
``` go
const StreamingResultWithExplicitViewMethod = `
// Service is the StreamingResultWithExplicitViewService service interface.
type Service interface {
    // StreamingResultWithExplicitViewMethod implements
    // StreamingResultWithExplicitViewMethod.
    StreamingResultWithExplicitViewMethod(context.Context, []int32, StreamingResultWithExplicitViewMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingResultWithExplicitViewService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingResultWithExplicitViewMethod"}

// StreamingResultWithExplicitViewMethodServerStream is the interface a
// "StreamingResultWithExplicitViewMethod" endpoint server stream must satisfy.
type StreamingResultWithExplicitViewMethodServerStream interface {
    // Send streams instances of "MultipleViews".
    Send(*MultipleViews) error
    // Close closes the stream.
    Close() error
}

// StreamingResultWithExplicitViewMethodClientStream is the interface a
// "StreamingResultWithExplicitViewMethod" endpoint client stream must satisfy.
type StreamingResultWithExplicitViewMethodClientStream interface {
    // Recv reads instances of "MultipleViews" from the stream.
    Recv() (*MultipleViews, error)
}

// MultipleViews is the result type of the
// StreamingResultWithExplicitViewService service
// StreamingResultWithExplicitViewMethod method.
type MultipleViews struct {
    A *string
    B *string
}

// NewMultipleViews initializes result type MultipleViews from viewed result
// type MultipleViews.
func NewMultipleViews(vres *streamingresultwithexplicitviewserviceviews.MultipleViews) *MultipleViews {
    var res *MultipleViews
    switch vres.View {
    case "default", "":
        res = newMultipleViews(vres.Projected)
    case "tiny":
        res = newMultipleViewsTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViews initializes viewed result type MultipleViews from
// result type MultipleViews using the given view.
func NewViewedMultipleViews(res *MultipleViews, view string) *streamingresultwithexplicitviewserviceviews.MultipleViews {
    var vres *streamingresultwithexplicitviewserviceviews.MultipleViews
    switch view {
    case "default", "":
        p := newMultipleViewsView(res)
        vres = &streamingresultwithexplicitviewserviceviews.MultipleViews{p, "default"}
    case "tiny":
        p := newMultipleViewsViewTiny(res)
        vres = &streamingresultwithexplicitviewserviceviews.MultipleViews{p, "tiny"}
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *streamingresultwithexplicitviewserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
        B: vres.B,
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *streamingresultwithexplicitviewserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *streamingresultwithexplicitviewserviceviews.MultipleViewsView {
    vres := &streamingresultwithexplicitviewserviceviews.MultipleViewsView{
        A: res.A,
        B: res.B,
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *streamingresultwithexplicitviewserviceviews.MultipleViewsView {
    vres := &streamingresultwithexplicitviewserviceviews.MultipleViewsView{
        A: res.A,
    }
    return vres
}
`
```
``` go
const StreamingResultWithViewsMethod = `
// Service is the StreamingResultWithViewsService service interface.
type Service interface {
    // StreamingResultWithViewsMethod implements StreamingResultWithViewsMethod.
    // The "view" return value must have one of the following views
    //	- "default"
    //	- "tiny"
    StreamingResultWithViewsMethod(context.Context, string, StreamingResultWithViewsMethodServerStream) (err error)
}

// ServiceName is the name of the service as defined in the design. This is the
// same value that is set in the endpoint request contexts under the ServiceKey
// key.
const ServiceName = "StreamingResultWithViewsService"

// MethodNames lists the service method names as defined in the design. These
// are the same values that are set in the endpoint request contexts under the
// MethodKey key.
var MethodNames = [1]string{"StreamingResultWithViewsMethod"}

// StreamingResultWithViewsMethodServerStream is the interface a
// "StreamingResultWithViewsMethod" endpoint server stream must satisfy.
type StreamingResultWithViewsMethodServerStream interface {
    // Send streams instances of "MultipleViews".
    Send(*MultipleViews) error
    // Close closes the stream.
    Close() error
    // SetView sets the view used to render the result before streaming.
    SetView(view string)
}

// StreamingResultWithViewsMethodClientStream is the interface a
// "StreamingResultWithViewsMethod" endpoint client stream must satisfy.
type StreamingResultWithViewsMethodClientStream interface {
    // Recv reads instances of "MultipleViews" from the stream.
    Recv() (*MultipleViews, error)
}

// MultipleViews is the result type of the StreamingResultWithViewsService
// service StreamingResultWithViewsMethod method.
type MultipleViews struct {
    A *string
    B *string
}

// NewMultipleViews initializes result type MultipleViews from viewed result
// type MultipleViews.
func NewMultipleViews(vres *streamingresultwithviewsserviceviews.MultipleViews) *MultipleViews {
    var res *MultipleViews
    switch vres.View {
    case "default", "":
        res = newMultipleViews(vres.Projected)
    case "tiny":
        res = newMultipleViewsTiny(vres.Projected)
    }
    return res
}

// NewViewedMultipleViews initializes viewed result type MultipleViews from
// result type MultipleViews using the given view.
func NewViewedMultipleViews(res *MultipleViews, view string) *streamingresultwithviewsserviceviews.MultipleViews {
    var vres *streamingresultwithviewsserviceviews.MultipleViews
    switch view {
    case "default", "":
        p := newMultipleViewsView(res)
        vres = &streamingresultwithviewsserviceviews.MultipleViews{p, "default"}
    case "tiny":
        p := newMultipleViewsViewTiny(res)
        vres = &streamingresultwithviewsserviceviews.MultipleViews{p, "tiny"}
    }
    return vres
}

// newMultipleViews converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViews(vres *streamingresultwithviewsserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
        B: vres.B,
    }
    return res
}

// newMultipleViewsTiny converts projected type MultipleViews to service type
// MultipleViews.
func newMultipleViewsTiny(vres *streamingresultwithviewsserviceviews.MultipleViewsView) *MultipleViews {
    res := &MultipleViews{
        A: vres.A,
    }
    return res
}

// newMultipleViewsView projects result type MultipleViews into projected type
// MultipleViewsView using the "default" view.
func newMultipleViewsView(res *MultipleViews) *streamingresultwithviewsserviceviews.MultipleViewsView {
    vres := &streamingresultwithviewsserviceviews.MultipleViewsView{
        A: res.A,
        B: res.B,
    }
    return vres
}

// newMultipleViewsViewTiny projects result type MultipleViews into projected
// type MultipleViewsView using the "tiny" view.
func newMultipleViewsViewTiny(res *MultipleViews) *streamingresultwithviewsserviceviews.MultipleViewsView {
    vres := &streamingresultwithviewsserviceviews.MultipleViewsView{
        A: res.A,
    }
    return vres
}
`
```
``` go
const StreamingResultWithViewsMethodEndpoint = `// Endpoints wraps the "StreamingResultWithViewsService" service endpoints.
type Endpoints struct {
    StreamingResultWithViewsMethod goa.Endpoint
}

// StreamingResultWithViewsMethodEndpointInput is the input type of
// "StreamingResultWithViewsMethod" endpoint that holds the method payload and
// the server stream.
type StreamingResultWithViewsMethodEndpointInput struct {
    // Payload is the method payload.
    Payload string
    // Stream is the server stream used by the "StreamingResultWithViewsMethod"
    // method to send data.
    Stream StreamingResultWithViewsMethodServerStream
}

// NewEndpoints wraps the methods of the "StreamingResultWithViewsService"
// service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        StreamingResultWithViewsMethod: NewStreamingResultWithViewsMethodEndpoint(s),
    }
}

// Use applies the given middleware to all the
// "StreamingResultWithViewsService" service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.StreamingResultWithViewsMethod = m(e.StreamingResultWithViewsMethod)
}

// NewStreamingResultWithViewsMethodEndpoint returns an endpoint function that
// calls the method "StreamingResultWithViewsMethod" of service
// "StreamingResultWithViewsService".
func NewStreamingResultWithViewsMethodEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        ep := req.(*StreamingResultWithViewsMethodEndpointInput)
        return nil, s.StreamingResultWithViewsMethod(ctx, ep.Payload, ep.Stream)
    }
}
`
```
``` go
const WithResultEndpoint = `// Endpoints wraps the "WithResult" service endpoints.
type Endpoints struct {
    A goa.Endpoint
}

// NewEndpoints wraps the methods of the "WithResult" service with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        A: NewAEndpoint(s),
    }
}

// Use applies the given middleware to all the "WithResult" service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.A = m(e.A)
}

// NewAEndpoint returns an endpoint function that calls the method "A" of
// service "WithResult".
func NewAEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        res, err := s.A(ctx)
        if err != nil {
            return nil, err
        }
        vres := NewViewedRtype(res, "default")
        return vres, nil
    }
}
`
```
``` go
const WithResultMultipleViewsEndpoint = `// Endpoints wraps the "WithResultMultipleViews" service endpoints.
type Endpoints struct {
    A goa.Endpoint
}

// NewEndpoints wraps the methods of the "WithResultMultipleViews" service with
// endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        A: NewAEndpoint(s),
    }
}

// Use applies the given middleware to all the "WithResultMultipleViews"
// service endpoints.
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.A = m(e.A)
}

// NewAEndpoint returns an endpoint function that calls the method "A" of
// service "WithResultMultipleViews".
func NewAEndpoint(s Service) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        res, view, err := s.A(ctx)
        if err != nil {
            return nil, err
        }
        vres := NewViewedViewtype(res, view)
        return vres, nil
    }
}
`
```

## <a name="pkg-variables">Variables</a>
``` go
var APIKeyAuth = APIKeySecurity("api_key")
```
``` go
var APayload = Type("APayload", func() {
    Attribute("IntField", Int)
    Attribute("StringField", String)
    Attribute("BooleanField", Boolean)
    Attribute("BytesField", Bytes)
    Attribute("OptionalField", String)
    Required("IntField", "StringField", "BooleanField", "BytesField")
})
```
``` go
var AResult = Type("AResult", func() {
    Attribute("IntField", Int)
    Attribute("StringField", String)
    Attribute("BooleanField", Boolean)
    Attribute("BytesField", Bytes)
    Attribute("OptionalField", String)
    Required("IntField", "StringField", "BooleanField", "BytesField")
})
```
``` go
var BPayload = Type("BPayload", func() {
    Attribute("ArrayField", ArrayOf(Boolean))
    Attribute("MapField", MapOf(Int, String))
    Attribute("ObjectField", func() {
        Attribute("IntField", Int)
        Attribute("StringField", String)
    })
    Attribute("UserTypeField", ParentType)
})
```
``` go
var BResult = Type("BResult", func() {
    Attribute("ArrayField", ArrayOf(Boolean))
    Attribute("MapField", MapOf(Int, String))
    Attribute("ObjectField", func() {
        Attribute("IntField", Int)
        Attribute("StringField", String)
    })
    Attribute("UserTypeField", ParentType)
})
```
``` go
var BasicAuth = BasicAuthSecurity("basic")
```
``` go
var BidirectionalStreamingEndpointDSL = func() {
    var AType = Type("AType", func() {
        Attribute("a", String)
    })
    var BType = Type("BType", func() {
        Attribute("x", String)
    })
    Service("BidirectionalStreamingEndpoint", func() {
        Method("BidirectionalStreamingMethod", func() {
            Payload(AType)
            StreamingPayload(BType)
            StreamingResult(AResult)
        })
    })
}
```
``` go
var BidirectionalStreamingMethodDSL = func() {
    Service("BidirectionalStreamingService", func() {
        Method("BidirectionalStreamingMethod", func() {
            Payload(BPayload)
            StreamingPayload(APayload)
            StreamingResult(AResult)
        })
    })
}
```
``` go
var BidirectionalStreamingNoPayloadMethodDSL = func() {
    Service("BidirectionalStreamingNoPayloadService", func() {
        Method("BidirectionalStreamingNoPayloadMethod", func() {
            StreamingPayload(String)
            StreamingResult(Int)
        })
    })
}
```
``` go
var BidirectionalStreamingResultWithExplicitViewMethodDSL = func() {
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("BidirectionalStreamingResultWithExplicitViewService", func() {
        Method("BidirectionalStreamingResultWithExplicitViewMethod", func() {
            StreamingPayload(ArrayOf(Bytes))
            StreamingResult(RTWithViews, func() {
                View("default")
            })
        })
    })
}
```
``` go
var BidirectionalStreamingResultWithViewsMethodDSL = func() {
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("BidirectionalStreamingResultWithViewsService", func() {
        Method("BidirectionalStreamingResultWithViewsMethod", func() {
            StreamingPayload(APayload)
            StreamingResult(RTWithViews)
        })
    })
}
```
``` go
var ChildType = Type("Child", func() {
    Attribute("p", "Parent")
})
```
``` go
var ConvertAliasDSL = func() {
    var StringType = Type("StringType", func() {
        CreateFrom(aliasd.ConvertModel{})
        Attribute("Bar", String)
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var ConvertArrayStringCode = `// ConvertToArrayStringT creates an instance of ArrayStringT initialized from t.
func (t *ArrayStringType) ConvertToArrayStringT() *testdata.ArrayStringT {
    v := &testdata.ArrayStringT{}
    if t.ArrayString != nil {
        v.ArrayString = make([]string, len(t.ArrayString))
        for i, val := range t.ArrayString {
            v.ArrayString[i] = val
        }
    }
    return v
}
`
```
``` go
var ConvertArrayStringDSL = func() {
    var ArrayStringType = Type("ArrayStringType", func() {
        ConvertTo(ArrayStringT{})
        Attribute("ArrayString", ArrayOf(String))
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(ArrayStringType)
        })
    })
}
```
``` go
var ConvertArrayStringRequiredCode = `// ConvertToArrayStringT creates an instance of ArrayStringT initialized from t.
func (t *ArrayStringType) ConvertToArrayStringT() *testdata.ArrayStringT {
    v := &testdata.ArrayStringT{}
    if t.ArrayString != nil {
        v.ArrayString = make([]string, len(t.ArrayString))
        for i, val := range t.ArrayString {
            v.ArrayString[i] = val
        }
    }
    return v
}
`
```
``` go
var ConvertArrayStringRequiredDSL = func() {
    var ArrayStringType = Type("ArrayStringType", func() {
        ConvertTo(ArrayStringT{})
        Attribute("ArrayString", ArrayOf(String))
        Required("ArrayString")
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(ArrayStringType)
        })
    })
}
```
``` go
var ConvertExternalDSL = func() {
    var StringType = Type("StringType", func() {
        CreateFrom(external.ConvertModel{})
        Attribute("Foo", String)
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var ConvertObjectCode = `// ConvertToObjectT creates an instance of ObjectT initialized from t.
func (t *ObjectType) ConvertToObjectT() *testdata.ObjectT {
    v := &testdata.ObjectT{}
    if t.Object != nil {
        v.Object = marshalObjectFieldToObjectFieldT(t.Object)
    }
    return v
}
`
```
``` go
var ConvertObjectDSL = func() {
    var ObjectField = Type("ObjectField", func() {
        Attribute("Bool", Boolean)
        Attribute("Int", Int)
        Attribute("Int32", Int32)
        Attribute("Int64", Int64)
        Attribute("UInt", UInt)
        Attribute("UInt32", UInt32)
        Attribute("UInt64", UInt64)
        Attribute("Float32", Float32)
        Attribute("Float64", Float64)
        Attribute("Bytes", Bytes)
        Attribute("String", String)
        Attribute("Array", ArrayOf(Boolean))
        Attribute("Map", MapOf(String, Boolean))
    })

    var ObjectType = Type("ObjectType", func() {
        ConvertTo(ObjectT{})
        Attribute("Object", ObjectField)
        Required("Object")
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(ObjectType)
        })
    })
}
```
``` go
var ConvertObjectHelperCode = `// marshalObjectFieldToObjectFieldT builds a value of type
// *testdata.ObjectFieldT from a value of type *ObjectField.
func marshalObjectFieldToObjectFieldT(v *ObjectField) *testdata.ObjectFieldT {
    res := &testdata.ObjectFieldT{
        Bytes: v.Bytes,
    }
    if v.Bool != nil {
        res.Bool = *v.Bool
    }
    if v.Int != nil {
        res.Int = *v.Int
    }
    if v.Int32 != nil {
        res.Int32 = *v.Int32
    }
    if v.Int64 != nil {
        res.Int64 = *v.Int64
    }
    if v.UInt != nil {
        res.UInt = *v.UInt
    }
    if v.UInt32 != nil {
        res.UInt32 = *v.UInt32
    }
    if v.UInt64 != nil {
        res.UInt64 = *v.UInt64
    }
    if v.Float32 != nil {
        res.Float32 = *v.Float32
    }
    if v.Float64 != nil {
        res.Float64 = *v.Float64
    }
    if v.String != nil {
        res.String = *v.String
    }
    if v.Array != nil {
        res.Array = make([]bool, len(v.Array))
        for i, val := range v.Array {
            res.Array[i] = val
        }
    }
    if v.Map != nil {
        res.Map = make(map[string]bool, len(v.Map))
        for key, val := range v.Map {
            tk := key
            tv := val
            res.Map[tk] = tv
        }
    }

    return res
}
`
```
``` go
var ConvertObjectRequiredCode = `// ConvertToObjectT creates an instance of ObjectT initialized from t.
func (t *ObjectType) ConvertToObjectT() *testdata.ObjectT {
    v := &testdata.ObjectT{}
    if t.Object != nil {
        v.Object = marshalObjectFieldToObjectFieldT(t.Object)
    }
    return v
}
`
```
``` go
var ConvertObjectRequiredDSL = func() {
    var ObjectField = Type("ObjectField", func() {
        Attribute("Bool", Boolean)
        Attribute("Int", Int)
        Attribute("Int32", Int32)
        Attribute("Int64", Int64)
        Attribute("UInt", UInt)
        Attribute("UInt32", UInt32)
        Attribute("UInt64", UInt64)
        Attribute("Float32", Float32)
        Attribute("Float64", Float64)
        Attribute("Bytes", Bytes)
        Attribute("String", String)
        Attribute("Array", ArrayOf(Boolean))
        Attribute("Map", MapOf(String, Boolean))
        Required("Bool", "Int", "Int32", "Int64", "UInt", "UInt32",
            "UInt64", "Float32", "Float64", "Bytes", "String", "Array", "Map")
    })

    var ObjectType = Type("ObjectType", func() {
        ConvertTo(ObjectT{})
        Attribute("Object", ObjectField)
        Required("Object")
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(ObjectType)
        })
    })
}
```
``` go
var ConvertObjectRequiredHelperCode = `// marshalObjectFieldToObjectFieldT builds a value of type
// *testdata.ObjectFieldT from a value of type *ObjectField.
func marshalObjectFieldToObjectFieldT(v *ObjectField) *testdata.ObjectFieldT {
    res := &testdata.ObjectFieldT{
        Bool:    v.Bool,
        Int:     v.Int,
        Int32:   v.Int32,
        Int64:   v.Int64,
        UInt:    v.UInt,
        UInt32:  v.UInt32,
        UInt64:  v.UInt64,
        Float32: v.Float32,
        Float64: v.Float64,
        Bytes:   v.Bytes,
        String:  v.String,
    }
    if v.Array != nil {
        res.Array = make([]bool, len(v.Array))
        for i, val := range v.Array {
            res.Array[i] = val
        }
    }
    if v.Map != nil {
        res.Map = make(map[string]bool, len(v.Map))
        for key, val := range v.Map {
            tk := key
            tv := val
            res.Map[tk] = tv
        }
    }

    return res
}
`
```
``` go
var ConvertStringCode = `// ConvertToStringT creates an instance of StringT initialized from t.
func (t *StringType) ConvertToStringT() *testdata.StringT {
    v := &testdata.StringT{}
    if t.String != nil {
        v.String = *t.String
    }
    return v
}
`
```
``` go
var ConvertStringDSL = func() {
    var StringType = Type("StringType", func() {
        ConvertTo(StringT{})
        Attribute("String", String)
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var ConvertStringPointerCode = `// ConvertToStringPointerT creates an instance of StringPointerT initialized
// from t.
func (t *StringPointerType) ConvertToStringPointerT() *testdata.StringPointerT {
    v := &testdata.StringPointerT{
        String: t.String,
    }
    return v
}
`
```
``` go
var ConvertStringPointerDSL = func() {
    var StringPointerType = Type("StringPointerType", func() {
        ConvertTo(StringPointerT{})
        Attribute("String", String)
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(StringPointerType)
        })
    })
}
```
``` go
var ConvertStringPointerRequiredCode = `// ConvertToStringPointerT creates an instance of StringPointerT initialized
// from t.
func (t *StringPointerType) ConvertToStringPointerT() *testdata.StringPointerT {
    v := &testdata.StringPointerT{
        String: &t.String,
    }
    return v
}
`
```
``` go
var ConvertStringPointerRequiredDSL = func() {
    var StringPointerType = Type("StringPointerType", func() {
        ConvertTo(StringPointerT{})
        Attribute("String", String)
        Required("String")
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(StringPointerType)
        })
    })
}
```
``` go
var ConvertStringRequiredCode = `// ConvertToStringT creates an instance of StringT initialized from t.
func (t *StringType) ConvertToStringT() *testdata.StringT {
    v := &testdata.StringT{
        String: t.String,
    }
    return v
}
`
```
``` go
var ConvertStringRequiredDSL = func() {
    var StringType = Type("StringType", func() {
        ConvertTo(StringT{})
        Attribute("String", String)
        Required("String")
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var CreateAliasConvert = `// Service service type conversion functions
//
// Command:
// $ goa

package service

import (
    aliasd "goa.design/goa/codegen/service/testdata/alias-external"
)

// CreateFromConvertModel initializes t from the fields of v
func (t *StringType) CreateFromConvertModel(v *aliasd.ConvertModel) {
    temp := &StringType{
        Bar: &v.Bar,
    }
    *t = *temp
}
`
```
``` go
var CreateAliasDSL = func() {
    var StringType = Type("StringType", func() {
        CreateFrom(aliasd.ConvertModel{})
        Attribute("Bar", String)
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var CreateArrayStringCode = `// CreateFromArrayStringT initializes t from the fields of v
func (t *ArrayStringType) CreateFromArrayStringT(v *testdata.ArrayStringT) {
    temp := &ArrayStringType{}
    if v.ArrayString != nil {
        temp.ArrayString = make([]string, len(v.ArrayString))
        for i, val := range v.ArrayString {
            temp.ArrayString[i] = val
        }
    }
    *t = *temp
}
`
```
``` go
var CreateArrayStringDSL = func() {
    var ArrayStringType = Type("ArrayStringType", func() {
        CreateFrom(ArrayStringT{})
        Attribute("ArrayString", ArrayOf(String))
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(ArrayStringType)
        })
    })
}
```
``` go
var CreateArrayStringRequiredCode = `// CreateFromArrayStringT initializes t from the fields of v
func (t *ArrayStringType) CreateFromArrayStringT(v *testdata.ArrayStringT) {
    temp := &ArrayStringType{}
    if v.ArrayString != nil {
        temp.ArrayString = make([]string, len(v.ArrayString))
        for i, val := range v.ArrayString {
            temp.ArrayString[i] = val
        }
    }
    *t = *temp
}
`
```
``` go
var CreateArrayStringRequiredDSL = func() {
    var ArrayStringType = Type("ArrayStringType", func() {
        CreateFrom(ArrayStringT{})
        Attribute("ArrayString", ArrayOf(String))
        Required("ArrayString")
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(ArrayStringType)
        })
    })
}
```
``` go
var CreateExternalConvert = `// Service service type conversion functions
//
// Command:
// $ goa

package service

import (
    external "goa.design/goa/codegen/service/testdata/external"
)

// CreateFromConvertModel initializes t from the fields of v
func (t *StringType) CreateFromConvertModel(v *external.ConvertModel) {
    temp := &StringType{
        Foo: &v.Foo,
    }
    *t = *temp
}
`
```
``` go
var CreateExternalDSL = func() {
    var StringType = Type("StringType", func() {
        CreateFrom(external.ConvertModel{})
        Attribute("Foo", String)
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var CreateObjectCode = `// CreateFromObjectT initializes t from the fields of v
func (t *ObjectType) CreateFromObjectT(v *testdata.ObjectT) {
    temp := &ObjectType{}
    if v.Object != nil {
        temp.Object = marshalObjectFieldTToObjectField(v.Object)
    }
    *t = *temp
}
`
```
``` go
var CreateObjectDSL = func() {
    var ObjectField = Type("ObjectField", func() {
        Attribute("Bool", Boolean)
        Attribute("Int", Int)
        Attribute("Int32", Int32)
        Attribute("Int64", Int64)
        Attribute("UInt", UInt)
        Attribute("UInt32", UInt32)
        Attribute("UInt64", UInt64)
        Attribute("Float32", Float32)
        Attribute("Float64", Float64)
        Attribute("Bytes", Bytes)
        Attribute("String", String)
        Attribute("Array", ArrayOf(Boolean))
        Attribute("Map", MapOf(String, Boolean))
    })

    var ObjectType = Type("ObjectType", func() {
        CreateFrom(ObjectT{})
        Attribute("Object", ObjectField)
        Required("Object")
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(ObjectType)
        })
    })
}
```
``` go
var CreateObjectExtraCode = `// CreateFromObjectExtraT initializes t from the fields of v
func (t *ObjectType) CreateFromObjectExtraT(v *testdata.ObjectExtraT) {
    temp := &ObjectType{}
    if v.Object != nil {
        temp.Object = marshalObjectFieldTToObjectField(v.Object)
    }
    *t = *temp
}
`
```
``` go
var CreateObjectExtraDSL = func() {
    var ObjectField = Type("ObjectField", func() {
        Attribute("Bool", Boolean)
        Attribute("Int", Int)
        Attribute("Int32", Int32)
        Attribute("Int64", Int64)
        Attribute("UInt", UInt)
        Attribute("UInt32", UInt32)
        Attribute("UInt64", UInt64)
        Attribute("Float32", Float32)
        Attribute("Float64", Float64)
        Attribute("Bytes", Bytes)
        Attribute("String", String)
        Attribute("Array", ArrayOf(Boolean))
        Attribute("Map", MapOf(String, Boolean))
    })

    var ObjectType = Type("ObjectType", func() {
        CreateFrom(ObjectExtraT{})
        Attribute("Object", ObjectField)
        Required("Object")
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(ObjectType)
        })
    })
}
```
``` go
var CreateObjectRequiredCode = `// CreateFromObjectT initializes t from the fields of v
func (t *ObjectType) CreateFromObjectT(v *testdata.ObjectT) {
    temp := &ObjectType{}
    if v.Object != nil {
        temp.Object = marshalObjectFieldTToObjectField(v.Object)
    }
    *t = *temp
}
`
```
``` go
var CreateObjectRequiredDSL = func() {
    var ObjectField = Type("ObjectField", func() {
        Attribute("Bool", Boolean)
        Attribute("Int", Int)
        Attribute("Int32", Int32)
        Attribute("Int64", Int64)
        Attribute("UInt", UInt)
        Attribute("UInt32", UInt32)
        Attribute("UInt64", UInt64)
        Attribute("Float32", Float32)
        Attribute("Float64", Float64)
        Attribute("Bytes", Bytes)
        Attribute("String", String)
        Attribute("Array", ArrayOf(Boolean))
        Attribute("Map", MapOf(String, Boolean))
        Required("Bool", "Int", "Int32", "Int64", "UInt", "UInt32",
            "UInt64", "Float32", "Float64", "Bytes", "String", "Array", "Map")
    })

    var ObjectType = Type("ObjectType", func() {
        CreateFrom(ObjectT{})
        Attribute("Object", ObjectField)
        Required("Object")
    })

    Service("Service", func() {
        Method("Method", func() {
            Payload(ObjectType)
        })
    })
}
```
``` go
var CreateStringCode = `// CreateFromStringT initializes t from the fields of v
func (t *StringType) CreateFromStringT(v *testdata.StringT) {
    temp := &StringType{
        String: &v.String,
    }
    *t = *temp
}
`
```
``` go
var CreateStringDSL = func() {
    var StringType = Type("StringType", func() {
        CreateFrom(StringT{})
        Attribute("String", String)
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var CreateStringPointerCode = `// CreateFromStringPointerT initializes t from the fields of v
func (t *StringType) CreateFromStringPointerT(v *testdata.StringPointerT) {
    temp := &StringType{
        String: v.String,
    }
    *t = *temp
}
`
```
``` go
var CreateStringPointerDSL = func() {
    var StringType = Type("StringType", func() {
        CreateFrom(StringPointerT{})
        Attribute("String", String)
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var CreateStringPointerRequiredCode = `// CreateFromStringPointerT initializes t from the fields of v
func (t *StringType) CreateFromStringPointerT(v *testdata.StringPointerT) {
    temp := &StringType{}
    if v.String != nil {
        temp.String = *v.String
    }
    *t = *temp
}
`
```
``` go
var CreateStringPointerRequiredDSL = func() {
    var StringType = Type("StringType", func() {
        CreateFrom(StringPointerT{})
        Attribute("String", String)
        Required("String")
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var CreateStringRequiredCode = `// CreateFromStringT initializes t from the fields of v
func (t *StringType) CreateFromStringT(v *testdata.StringT) {
    temp := &StringType{
        String: v.String,
    }
    *t = *temp
}
`
```
``` go
var CreateStringRequiredDSL = func() {
    var StringType = Type("StringType", func() {
        CreateFrom(StringT{})
        Attribute("String", String)
        Required("String")
    })
    Service("Service", func() {
        Method("Method", func() {
            Payload(StringType)
        })
    })
}
```
``` go
var EmptyMethodDSL = func() {
    Service("Empty", func() {
        Method("Empty", func() {
        })
    })
}
```
``` go
var EmptyPayloadMethodDSL = func() {
    Service("EmptyPayload", func() {
        Method("EmptyPayload", func() {
            Result(AResult)
        })
    })
}
```
``` go
var EmptyResultMethodDSL = func() {
    Service("EmptyResult", func() {
        Method("EmptyResult", func() {
            Payload(APayload)
        })
    })
}
```
``` go
var EndpointInitNoSecurityCode = `// NewEndpoints wraps the methods of the "EndpointNoSecurity" service with
// endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        NoSecurity: NewNoSecurityEndpoint(s),
    }
}
`
```
``` go
var EndpointInitWithRequirementsCode = `// NewEndpoints wraps the methods of the "EndpointsWithRequirements" service
// with endpoints.
func NewEndpoints(s Service, authBasicFn security.AuthBasicFunc, authJWTFn security.AuthJWTFunc) *Endpoints {
    return &Endpoints{
        SecureWithRequirements:       NewSecureWithRequirementsEndpoint(s, authBasicFn),
        DoublySecureWithRequirements: NewDoublySecureWithRequirementsEndpoint(s, authBasicFn, authJWTFn),
    }
}
`
```
``` go
var EndpointInitWithServiceRequirementsCode = `// NewEndpoints wraps the methods of the "EndpointsWithServiceRequirements"
// service with endpoints.
func NewEndpoints(s Service, authBasicFn security.AuthBasicFunc) *Endpoints {
    return &Endpoints{
        SecureWithRequirements:     NewSecureWithRequirementsEndpoint(s, authBasicFn),
        AlsoSecureWithRequirements: NewAlsoSecureWithRequirementsEndpoint(s, authBasicFn),
    }
}
`
```
``` go
var EndpointInitWithoutRequirementCode = `// NewEndpoints wraps the methods of the "EndpointWithoutRequirement" service
// with endpoints.
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        Unsecure: NewUnsecureEndpoint(s),
    }
}
`
```
``` go
var EndpointNoSecurityDSL = func() {
    Service("EndpointNoSecurity", func() {
        Security(BasicAuth)
        Method("NoSecurity", func() {
            NoSecurity()
            HTTP(func() {
                GET("/")
            })
        })
    })
}
```
``` go
var EndpointWithAPIKeyOverrideCode = `// NewSecureWithAPIKeyOverrideEndpoint returns an endpoint function that calls
// the method "SecureWithAPIKeyOverride" of service
// "EndpointWithAPIKeyOverride".
func NewSecureWithAPIKeyOverrideEndpoint(s Service, authAPIKeyFn security.AuthAPIKeyFunc) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        p := req.(*SecureWithAPIKeyOverridePayload)
        var err error
        sc := security.APIKeyScheme{
            Name: "api_key",
        }
        var key string
        if p.Key != nil {
            key = *p.Key
        }
        ctx, err = authAPIKeyFn(ctx, key, &sc)
        if err != nil {
            return nil, err
        }
        return nil, s.SecureWithAPIKeyOverride(ctx, p)
    }
}
`
```
``` go
var EndpointWithAPIKeyOverrideDSL = func() {
    Service("EndpointWithAPIKeyOverride", func() {
        Security(BasicAuth)
        Method("SecureWithAPIKeyOverride", func() {
            Security(APIKeyAuth)
            Payload(func() {
                APIKey("api_key", "key", String)
            })
            HTTP(func() {
                GET("/")
            })
        })
    })
}
```
``` go
var EndpointWithOAuth2Code = `// NewSecureWithOAuth2Endpoint returns an endpoint function that calls the
// method "SecureWithOAuth2" of service "EndpointWithOAuth2".
func NewSecureWithOAuth2Endpoint(s Service, authOAuth2Fn security.AuthOAuth2Func) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        p := req.(*SecureWithOAuth2Payload)
        var err error
        sc := security.OAuth2Scheme{
            Name:           "authCode",
            Scopes:         []string{"api:write", "api:read"},
            RequiredScopes: []string{},
            Flows: []*security.OAuthFlow{
                &security.OAuthFlow{
                    Type:             "authorization_code",
                    AuthorizationURL: "/authorization",
                    TokenURL:         "/token",
                    RefreshURL:       "/refresh",
                },
            },
        }
        var token string
        if p.Token != nil {
            token = *p.Token
        }
        ctx, err = authOAuth2Fn(ctx, token, &sc)
        if err != nil {
            return nil, err
        }
        return nil, s.SecureWithOAuth2(ctx, p)
    }
}
`
```
``` go
var EndpointWithOAuth2DSL = func() {
    Service("EndpointWithOAuth2", func() {
        Method("SecureWithOAuth2", func() {
            Security(OAuth2AuthorizationCode)
            Payload(func() {
                AccessToken("token", String)
            })
            HTTP(func() {
                GET("/")
            })
        })
    })
}
```
``` go
var EndpointWithRequiredScopesCode = `// NewSecureWithRequiredScopesEndpoint returns an endpoint function that calls
// the method "SecureWithRequiredScopes" of service
// "EndpointWithRequiredScopes".
func NewSecureWithRequiredScopesEndpoint(s Service, authJWTFn security.AuthJWTFunc) goa.Endpoint {
    return func(ctx context.Context, req interface{}) (interface{}, error) {
        p := req.(*SecureWithRequiredScopesPayload)
        var err error
        sc := security.JWTScheme{
            Name:           "jwt",
            Scopes:         []string{"api:read", "api:write", "api:admin"},
            RequiredScopes: []string{"api:read", "api:write"},
        }
        var token string
        if p.Token != nil {
            token = *p.Token
        }
        ctx, err = authJWTFn(ctx, token, &sc)
        if err != nil {
            return nil, err
        }
        return nil, s.SecureWithRequiredScopes(ctx, p)
    }
}
`
```
``` go
var EndpointWithRequiredScopesDSL = func() {
    Service("EndpointWithRequiredScopes", func() {
        Method("SecureWithRequiredScopes", func() {
            Security(JWTAuth, func() {
                Scope("api:read")
                Scope("api:write")
            })
            Payload(func() {
                Token("token", String)
            })
            HTTP(func() {
                GET("/")
            })
        })
    })
}
```
``` go
var EndpointWithoutRequirementDSL = func() {
    Service("EndpointWithoutRequirement", func() {
        Method("Unsecure", func() {
            HTTP(func() {
                GET("/")
            })
        })
    })
}
```
``` go
var EndpointsWithRequirementsDSL = func() {
    Service("EndpointsWithRequirements", func() {
        Method("SecureWithRequirements", func() {
            Security(BasicAuth)
            Payload(func() {
                Username("user", String)
                Password("pass", String)
            })
            HTTP(func() {
                GET("/")
            })
        })
        Method("DoublySecureWithRequirements", func() {
            Security(BasicAuth, JWTAuth)
            Payload(func() {
                Username("user", String)
                Password("pass", String)
                Token("token", String)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var EndpointsWithServiceRequirementsDSL = func() {
    Service("EndpointsWithServiceRequirements", func() {
        Security(BasicAuth)
        Method("SecureWithRequirements", func() {
            Payload(func() {
                Username("user", String)
                Password("pass", String)
            })
            HTTP(func() {
                GET("/")
            })
        })
        Method("AlsoSecureWithRequirements", func() {
            Payload(func() {
                Username("user", String)
                Password("pass", String)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ForceGenerateTypeDSL = func() {
    var _ = Type("ForcedType", func() {
        Attribute("a", String)
        Metadata("type:generate:force")
    })
    Service("ForceGenerateType", func() {
        Method("A", func() {})
    })
}
```
``` go
var ForceGenerateTypeExplicitDSL = func() {
    var _ = Type("ForcedType", func() {
        Attribute("a", String)
        Metadata("type:generate:force", "ForceGenerateTypeExplicit")
    })
    Service("ForceGenerateTypeExplicit", func() {
        Method("A", func() {})
    })
}
```
``` go
var JWTAuth = JWTSecurity("jwt", func() {
    Scope("api:read", "Read-only access")
    Scope("api:write", "Read and write access")
    Scope("api:admin", "Admin access")
})
```
``` go
var MultipleEndpointsDSL = func() {
    var BType = Type("BType", func() {
        Attribute("b", String)
    })
    var CType = Type("CType", func() {
        Attribute("c", String)
    })
    Service("MultipleEndpoints", func() {
        Method("B", func() {
            Payload(BType)
        })
        Method("C", func() {
            Payload(CType)
        })
    })
}
```
``` go
var MultipleMethodsDSL = func() {
    Service("MultipleMethods", func() {
        Method("A", func() {
            Payload(APayload)
            Result(AResult)
        })
        Method("B", func() {
            Payload(BPayload)
            Result(BResult)
        })
    })
}
```
``` go
var MultipleMethodsResultMultipleViewsDSL = func() {
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    var RTWithSingleView = ResultType("application/vnd.result.single.view", func() {
        TypeName("SingleView")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
    })
    Service("MultipleMethodsResultMultipleViews", func() {
        Method("A", func() {
            Payload(APayload)
            Result(RTWithViews)
        })
        Method("B", func() {
            Result(RTWithSingleView)
        })
    })
}
```
``` go
var MultipleServicesDSL = func() {
    Service("ServiceWithAPIKeyAuth", func() {
        Method("Method", func() {
            Security(APIKeyAuth)
            Payload(func() {
                APIKey("api_key", "key", String)
            })
            HTTP(func() {
                GET("/")
            })
        })
    })
    Service("ServiceWithJWTAndAPIKey", func() {
        Security(APIKeyAuth, JWTAuth)
        Method("Method", func() {
            Payload(func() {
                APIKey("api_key", "key", String)
                Token("token", String)
            })
            HTTP(func() {
                GET("/")
            })
        })
    })
    Service("ServiceWithNoSecurity", func() {
        Method("Method", func() {
            Payload(func() {
                Attribute("a", String)
            })
            HTTP(func() {
                GET("/{a}")
            })
        })
    })
}
```
``` go
var NoPayloadEndpointDSL = func() {
    Service("NoPayload", func() {
        Method("NoPayload", func() {
        })
    })
}
```
``` go
var OAuth2AuthorizationCode = OAuth2Security("authCode", func() {
    AuthorizationCodeFlow("/authorization", "/token", "/refresh")
    Scope("api:write", "Write acess")
    Scope("api:read", "Read access")
})
```
``` go
var ParentType = Type("Parent", func() {
    Attribute("c", "Child")
})
```
``` go
var ResultCollectionMultipleViewsDSL = func() {
    var RT = ResultType("application/vnd.result", func() {
        TypeName("ResultType")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
            Required("a", "b")
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("ResultCollectionMultipleViews", func() {
        Method("A", func() {
            Result(CollectionOf(RT))
        })
    })
}
```
``` go
var ResultCollectionMultipleViewsMethodDSL = func() {
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Required("a", "b")
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("ResultCollectionMultipleViewsMethod", func() {
        Method("A", func() {
            Result(CollectionOf(RTWithViews))
        })
    })
}
```
``` go
var ResultWithMultipleViewsDSL = func() {
    var RT = ResultType("application/vnd.result", func() {
        TypeName("ResultType")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
            Required("a", "b")
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("ResultWithMultipleViews", func() {
        Method("A", func() {
            Result(RT)
        })
    })
}
```
``` go
var ResultWithOtherResultMethodDSL = func() {
    var RTWithViews2 = ResultType("application/vnd.result.multiple.view.2", func() {
        TypeName("MultipleViews2")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
            Required("a")
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", RTWithViews2)
            Required("a", "b")
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("ResultWithOtherResult", func() {
        Method("A", func() {
            Result(RTWithViews)
        })
    })
}
```
``` go
var ResultWithRecursiveResultTypeDSL = func() {
    var RT = ResultType("application/vnd.result", func() {
        TypeName("RT")
        Attributes(func() {
            Attribute("a", "RT")
            Required("a")
        })
        View("default", func() {
            Attribute("a", func() {
                View("tiny")
            })
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("ResultWithRecursiveResultType", func() {
        Method("A", func() {
            Result(RT)
        })
    })
}
```
``` go
var ResultWithResultTypeDSL = func() {
    var UT = Type("UserType", func() {
        Attribute("p")
    })
    var RT3 = ResultType("application/vnd.result.3", func() {
        TypeName("RT3")
        Attributes(func() {
            Attribute("x", ArrayOf(String))
            Attribute("y", MapOf(Int, UT))
            Attribute("z", String)
            Required("x", "y", "z")
        })
        View("default", func() {
            Attribute("x")
            Attribute("y")
        })
        View("tiny", func() {
            Attribute("x")
        })
    })
    var RT2 = ResultType("application/vnd.result.2", func() {
        TypeName("RT2")
        Attributes(func() {
            Attribute("c", String)
            Attribute("d", UT)
            Attribute("e", String)
            Required("c", "d")
        })
        View("default", func() {
            Attribute("c")
            Attribute("d")
        })
        View("extended", func() {
            Attribute("c")
            Attribute("d")
            Attribute("e")
        })
        View("tiny", func() {
            Attribute("d")
        })
    })
    var RT = ResultType("application/vnd.result", func() {
        TypeName("RT")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", RT2)
            Attribute("c", RT3)
            Required("b", "c")
        })
        View("default", func() {
            Attribute("a")
            Attribute("b", func() {
                View("extended")
            })
            Attribute("c")
        })
        View("tiny", func() {
            Attribute("b", func() {
                View("tiny")
            })
            Attribute("c")
        })
    })
    Service("ResultWithResultType", func() {
        Method("A", func() {
            Result(RT)
        })
    })
}
```
``` go
var ResultWithUserTypeDSL = func() {
    var UT = Type("UserType", func() {
        Attribute("a")
    })
    var RT = ResultType("application/vnd.result", func() {
        TypeName("ResultType")
        Attributes(func() {
            Attribute("a", UT)
            Attribute("b", String)
            Required("a")
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("ResultWithUserType", func() {
        Method("A", func() {
            Result(RT)
        })
    })
}
```
``` go
var ServiceErrorDSL = func() {
    Service("ServiceError", func() {
        Error("error")
        Method("A", func() {})
    })
}
```
``` go
var SingleEndpointDSL = func() {
    var AType = Type("AType", func() {
        Attribute("a", String)
    })
    Service("SingleEndpoint", func() {
        Method("A", func() {
            Payload(AType)
        })
    })
}
```
``` go
var SingleMethodDSL = func() {
    Service("SingleMethod", func() {
        Method("A", func() {
            Payload(APayload)
            Result(AResult)
        })
    })
}
```
``` go
var SingleServiceDSL = func() {
    Service("SingleService", func() {
        Method("Method", func() {
            Security(APIKeyAuth)
            Payload(func() {
                APIKey("api_key", "key", String)
            })
            HTTP(func() {
                GET("/")
            })
        })
    })
}
```
``` go
var StreamingPayloadEndpointDSL = func() {
    var AType = Type("AType", func() {
        Attribute("a", String)
    })
    var BType = Type("BType", func() {
        Attribute("x", String)
    })
    Service("StreamingPayloadEndpoint", func() {
        Method("StreamingPayloadMethod", func() {
            Payload(BType)
            StreamingPayload(AType)
            Result(AResult)
        })
    })
}
```
``` go
var StreamingPayloadMethodDSL = func() {
    Service("StreamingPayloadService", func() {
        Method("StreamingPayloadMethod", func() {
            Payload(BPayload)
            StreamingPayload(APayload)
            Result(AResult)
        })
    })
}
```
``` go
var StreamingPayloadNoPayloadMethodDSL = func() {
    Service("StreamingPayloadNoPayloadService", func() {
        Method("StreamingPayloadNoPayloadMethod", func() {
            StreamingPayload(Any)
            Result(String)
        })
    })
}
```
``` go
var StreamingPayloadNoResultMethodDSL = func() {
    Service("StreamingPayloadNoResultService", func() {
        Method("StreamingPayloadNoResultMethod", func() {
            StreamingPayload(Int)
        })
    })
}
```
``` go
var StreamingPayloadResultWithExplicitViewMethodDSL = func() {
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("StreamingPayloadResultWithExplicitViewService", func() {
        Method("StreamingPayloadResultWithExplicitViewMethod", func() {
            StreamingPayload(ArrayOf(String))
            Result(RTWithViews, func() {
                View("tiny")
            })
        })
    })
}
```
``` go
var StreamingPayloadResultWithViewsMethodDSL = func() {
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("StreamingPayloadResultWithViewsService", func() {
        Method("StreamingPayloadResultWithViewsMethod", func() {
            StreamingPayload(APayload)
            Result(RTWithViews)
        })
    })
}
```
``` go
var StreamingResultEndpointDSL = func() {
    var AType = Type("AType", func() {
        Attribute("a", String)
    })
    var RType = ResultType("application/vnd.withresult", func() {
        TypeName("Rtype")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
        })
    })
    Service("StreamingResultEndpoint", func() {
        Method("StreamingResultMethod", func() {
            Payload(AType)
            StreamingResult(RType)
        })
    })
}
```
``` go
var StreamingResultMethodDSL = func() {
    Service("StreamingResultService", func() {
        Method("StreamingResultMethod", func() {
            Payload(APayload)
            StreamingResult(AResult)
        })
    })
}
```
``` go
var StreamingResultNoPayloadEndpointDSL = func() {
    var RType = ResultType("application/vnd.withresult", func() {
        TypeName("Rtype")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
        })
    })
    Service("StreamingResultNoPayloadEndpoint", func() {
        Method("StreamingResultNoPayloadMethod", func() {
            StreamingResult(RType)
        })
    })
}
```
``` go
var StreamingResultNoPayloadMethodDSL = func() {
    Service("StreamingResultNoPayloadService", func() {
        Method("StreamingResultNoPayloadMethod", func() {
            StreamingResult(AResult)
        })
    })
}
```
``` go
var StreamingResultWithExplicitViewMethodDSL = func() {
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("StreamingResultWithExplicitViewService", func() {
        Method("StreamingResultWithExplicitViewMethod", func() {
            Payload(ArrayOf(Int32))
            StreamingResult(RTWithViews, func() {
                View("tiny")
            })
        })
    })
}
```
``` go
var StreamingResultWithViewsMethodDSL = func() {
    var RTWithViews = ResultType("application/vnd.result.multiple.views", func() {
        TypeName("MultipleViews")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("StreamingResultWithViewsService", func() {
        Method("StreamingResultWithViewsMethod", func() {
            Payload(String)
            StreamingResult(RTWithViews)
        })
    })
}
```
``` go
var WithResultEndpointDSL = func() {
    var RType = ResultType("application/vnd.withresult", func() {
        TypeName("Rtype")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
        })
    })
    Service("WithResult", func() {
        Method("A", func() {
            Result(RType)
        })
    })
}
```
``` go
var WithResultMultipleViewsEndpointDSL = func() {
    var ViewType = ResultType("application/vnd.withresult.multiple.views", func() {
        TypeName("Viewtype")
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
        })
        View("tiny", func() {
            Attribute("a")
        })
    })
    Service("WithResultMultipleViews", func() {
        Method("A", func() {
            Result(ViewType)
        })
    })
}
```



## <a name="ArrayStringT">type</a> [ArrayStringT](/src/target/types.go?s=121:171#L13)
``` go
type ArrayStringT struct {
    ArrayString []string
}

```









## <a name="ObjectExtraT">type</a> [ObjectExtraT](/src/target/types.go?s=220:288#L21)
``` go
type ObjectExtraT struct {
    Object *ObjectFieldT
    // contains filtered or unexported fields
}

```









## <a name="ObjectFieldT">type</a> [ObjectFieldT](/src/target/types.go?s=290:528#L26)
``` go
type ObjectFieldT struct {
    Bool    bool
    Int     int
    Int32   int32
    Int64   int64
    UInt    uint
    UInt32  uint32
    UInt64  uint64
    Float32 float32
    Float64 float64
    Bytes   []byte
    String  string
    Array   []bool
    Map     map[string]bool
}

```









## <a name="ObjectT">type</a> [ObjectT](/src/target/types.go?s=173:218#L17)
``` go
type ObjectT struct {
    Object *ObjectFieldT
}

```









## <a name="StringPointerT">type</a> [StringPointerT](/src/target/types.go?s=73:119#L9)
``` go
type StringPointerT struct {
    String *string
}

```









## <a name="StringT">type</a> [StringT](/src/target/types.go?s=33:71#L5)
``` go
type StringT struct {
    String string
}

```













- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
