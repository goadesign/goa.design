+++
date="2018-09-06T11:21:50-07:00"
description="github.com/goadesign/goa/http/codegen/testdata"
+++


# testdata
`import "github.com/goadesign/goa/http/codegen/testdata"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Variables](#pkg-variables)


#### <a name="pkg-files">Package files</a>
[error_encoder_code.go](/src/github.com/goadesign/goa/http/codegen/testdata/error_encoder_code.go) [error_response_dsls.go](/src/github.com/goadesign/goa/http/codegen/testdata/error_response_dsls.go) [handler_init_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/handler_init_functions.go) [multi_endpoint_dsls.go](/src/github.com/goadesign/goa/http/codegen/testdata/multi_endpoint_dsls.go) [multipart_code.go](/src/github.com/goadesign/goa/http/codegen/testdata/multipart_code.go) [parse_endpoint_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/parse_endpoint_functions.go) [path_dsls.go](/src/github.com/goadesign/goa/http/codegen/testdata/path_dsls.go) [path_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/path_functions.go) [payload_constructor_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/payload_constructor_functions.go) [payload_decode_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/payload_decode_functions.go) [payload_dsls.go](/src/github.com/goadesign/goa/http/codegen/testdata/payload_dsls.go) [payload_encode_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/payload_encode_functions.go) [result_decode_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/result_decode_functions.go) [result_dsls.go](/src/github.com/goadesign/goa/http/codegen/testdata/result_dsls.go) [result_encode_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/result_encode_functions.go) [server_dsls.go](/src/github.com/goadesign/goa/http/codegen/testdata/server_dsls.go) [server_init_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/server_init_functions.go) [streaming_code.go](/src/github.com/goadesign/goa/http/codegen/testdata/streaming_code.go) [streaming_dsls.go](/src/github.com/goadesign/goa/http/codegen/testdata/streaming_dsls.go) [transform_helper_functions.go](/src/github.com/goadesign/goa/http/codegen/testdata/transform_helper_functions.go) 



## <a name="pkg-variables">Variables</a>
``` go
var BidirectionalStreamingClientEndpointCode = `// BidirectionalStreamingMethod returns an endpoint that makes HTTP requests to
// the BidirectionalStreamingService service BidirectionalStreamingMethod
// server.
func (c *Client) BidirectionalStreamingMethod() goa.Endpoint {
    var (
        encodeRequest  = EncodeBidirectionalStreamingMethodRequest(c.encoder)
        decodeResponse = DecodeBidirectionalStreamingMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildBidirectionalStreamingMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        err = encodeRequest(req, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("BidirectionalStreamingService", "BidirectionalStreamingMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &BidirectionalStreamingMethodClientStream{conn: conn}
        return stream, nil
    }
}
`
```
``` go
var BidirectionalStreamingClientStreamCloseCode = `// Close closes the "BidirectionalStreamingMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingMethodClientStream) Close() error {
    defer s.conn.Close()
    var err error
    // Send a nil payload to the server implying client closing connection.
    if err = s.conn.WriteJSON(nil); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var BidirectionalStreamingClientStreamRecvCode = `// Recv reads instances of "bidirectionalstreamingservice.UserType" from the
// "BidirectionalStreamingMethod" endpoint websocket connection.
func (s *BidirectionalStreamingMethodClientStream) Recv() (*bidirectionalstreamingservice.UserType, error) {
    var (
        rv   *bidirectionalstreamingservice.UserType
        body BidirectionalStreamingMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewBidirectionalStreamingMethodUserTypeOK(&body)
    return res, nil
}
`
```
``` go
var BidirectionalStreamingClientStreamSendCode = `// Send streams instances of "bidirectionalstreamingservice.Request" to the
// "BidirectionalStreamingMethod" endpoint websocket connection.
func (s *BidirectionalStreamingMethodClientStream) Send(v *bidirectionalstreamingservice.Request) error {
    body := NewBidirectionalStreamingMethodStreamingBody(v)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var PayloadType = Type("Payload", func() {
        Attribute("p", String)
        Attribute("q", String)
        Attribute("r", String)
    })
    var ResultType = Type("UserType", func() {
        Attribute("a", String)
    })
    Service("BidirectionalStreamingService", func() {
        Method("BidirectionalStreamingMethod", func() {
            Payload(PayloadType)
            StreamingPayload(Request)
            StreamingResult(ResultType)
            HTTP(func() {
                GET("/{p}")
                Param("q")
                Header("r:Location")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingNoPayloadClientEndpointCode = `// BidirectionalStreamingNoPayloadMethod returns an endpoint that makes HTTP
// requests to the BidirectionalStreamingNoPayloadService service
// BidirectionalStreamingNoPayloadMethod server.
func (c *Client) BidirectionalStreamingNoPayloadMethod() goa.Endpoint {
    var (
        decodeResponse = DecodeBidirectionalStreamingNoPayloadMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildBidirectionalStreamingNoPayloadMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("BidirectionalStreamingNoPayloadService", "BidirectionalStreamingNoPayloadMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &BidirectionalStreamingNoPayloadMethodClientStream{conn: conn}
        return stream, nil
    }
}
`
```
``` go
var BidirectionalStreamingNoPayloadClientStreamCloseCode = `// Close closes the "BidirectionalStreamingNoPayloadMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingNoPayloadMethodClientStream) Close() error {
    defer s.conn.Close()
    var err error
    // Send a nil payload to the server implying client closing connection.
    if err = s.conn.WriteJSON(nil); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var BidirectionalStreamingNoPayloadClientStreamRecvCode = `// Recv reads instances of "bidirectionalstreamingnopayloadservice.UserType"
// from the "BidirectionalStreamingNoPayloadMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingNoPayloadMethodClientStream) Recv() (*bidirectionalstreamingnopayloadservice.UserType, error) {
    var (
        rv   *bidirectionalstreamingnopayloadservice.UserType
        body BidirectionalStreamingNoPayloadMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewBidirectionalStreamingNoPayloadMethodUserTypeOK(&body)
    return res, nil
}
`
```
``` go
var BidirectionalStreamingNoPayloadClientStreamSendCode = `// Send streams instances of "bidirectionalstreamingnopayloadservice.Request"
// to the "BidirectionalStreamingNoPayloadMethod" endpoint websocket connection.
func (s *BidirectionalStreamingNoPayloadMethodClientStream) Send(v *bidirectionalstreamingnopayloadservice.Request) error {
    body := NewBidirectionalStreamingNoPayloadMethodStreamingBody(v)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingNoPayloadDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var ResultType = Type("UserType", func() {
        Attribute("a", String)
    })
    Service("BidirectionalStreamingNoPayloadService", func() {
        Method("BidirectionalStreamingNoPayloadMethod", func() {
            StreamingPayload(Request)
            StreamingResult(ResultType)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingNoPayloadServerHandlerInitCode = `// NewBidirectionalStreamingNoPayloadMethodHandler creates a HTTP handler which
// loads the HTTP request and calls the
// "BidirectionalStreamingNoPayloadService" service
// "BidirectionalStreamingNoPayloadMethod" endpoint.
func NewBidirectionalStreamingNoPayloadMethodHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler {
    var (
        encodeError = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "BidirectionalStreamingNoPayloadMethod")
        ctx = context.WithValue(ctx, goa.ServiceKey, "BidirectionalStreamingNoPayloadService")

        v := &bidirectionalstreamingnopayloadservice.BidirectionalStreamingNoPayloadMethodEndpointInput{
            Stream: &BidirectionalStreamingNoPayloadMethodServerStream{
                upgrader:     up,
                connConfigFn: connConfigFn,
                w:            w,
                r:            r,
            },
        }
        _, err = endpoint(ctx, v)

        if err != nil {
            if _, ok := err.(websocket.HandshakeError); ok {
                return
            }
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
    })
}
`
```
``` go
var BidirectionalStreamingNoPayloadServerStreamCloseCode = `// Close closes the "BidirectionalStreamingNoPayloadMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingNoPayloadMethodServerStream) Close() error {
    defer s.conn.Close()
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Close().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    if err = s.conn.WriteControl(
        websocket.CloseMessage,
        websocket.FormatCloseMessage(websocket.CloseNormalClosure, "server closing connection"),
        time.Now().Add(time.Second),
    ); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var BidirectionalStreamingPrimitiveArrayClientStreamRecvCode = `// Recv reads instances of "[]string" from the
// "BidirectionalStreamingPrimitiveArrayMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveArrayMethodClientStream) Recv() ([]string, error) {
    var (
        rv   []string
        body []string
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var BidirectionalStreamingPrimitiveArrayClientStreamSendCode = `// Send streams instances of "[]int32" to the
// "BidirectionalStreamingPrimitiveArrayMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveArrayMethodClientStream) Send(v []int32) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var BidirectionalStreamingPrimitiveArrayDSL = func() {
    Service("BidirectionalStreamingPrimitiveArrayService", func() {
        Method("BidirectionalStreamingPrimitiveArrayMethod", func() {
            StreamingPayload(ArrayOf(Int32))
            StreamingResult(ArrayOf(String))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingPrimitiveArrayServerStreamRecvCode = `// Recv reads instances of "[]int32" from the
// "BidirectionalStreamingPrimitiveArrayMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveArrayMethodServerStream) Recv() ([]int32, error) {
    var (
        rv  []int32
        msg *[]int32
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var BidirectionalStreamingPrimitiveArrayServerStreamSendCode = `// Send streams instances of "[]string" to the
// "BidirectionalStreamingPrimitiveArrayMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveArrayMethodServerStream) Send(v []string) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var BidirectionalStreamingPrimitiveClientStreamRecvCode = `// Recv reads instances of "string" from the
// "BidirectionalStreamingPrimitiveMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveMethodClientStream) Recv() (string, error) {
    var (
        rv   string
        body string
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var BidirectionalStreamingPrimitiveClientStreamSendCode = `// Send streams instances of "string" to the
// "BidirectionalStreamingPrimitiveMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveMethodClientStream) Send(v string) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var BidirectionalStreamingPrimitiveDSL = func() {
    Service("BidirectionalStreamingPrimitiveService", func() {
        Method("BidirectionalStreamingPrimitiveMethod", func() {
            StreamingPayload(String)
            StreamingResult(String)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingPrimitiveMapClientStreamRecvCode = `// Recv reads instances of "map[int]int" from the
// "BidirectionalStreamingPrimitiveMapMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveMapMethodClientStream) Recv() (map[int]int, error) {
    var (
        rv   map[int]int
        body map[int]int
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var BidirectionalStreamingPrimitiveMapClientStreamSendCode = `// Send streams instances of "map[string]int32" to the
// "BidirectionalStreamingPrimitiveMapMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveMapMethodClientStream) Send(v map[string]int32) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var BidirectionalStreamingPrimitiveMapDSL = func() {
    Service("BidirectionalStreamingPrimitiveMapService", func() {
        Method("BidirectionalStreamingPrimitiveMapMethod", func() {
            StreamingPayload(MapOf(String, Int32))
            StreamingResult(MapOf(Int, Int))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingPrimitiveMapServerStreamRecvCode = `// Recv reads instances of "map[string]int32" from the
// "BidirectionalStreamingPrimitiveMapMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveMapMethodServerStream) Recv() (map[string]int32, error) {
    var (
        rv  map[string]int32
        msg *map[string]int32
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var BidirectionalStreamingPrimitiveMapServerStreamSendCode = `// Send streams instances of "map[int]int" to the
// "BidirectionalStreamingPrimitiveMapMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveMapMethodServerStream) Send(v map[int]int) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var BidirectionalStreamingPrimitiveServerStreamRecvCode = `// Recv reads instances of "string" from the
// "BidirectionalStreamingPrimitiveMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveMethodServerStream) Recv() (string, error) {
    var (
        rv  string
        msg *string
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var BidirectionalStreamingPrimitiveServerStreamSendCode = `// Send streams instances of "string" to the
// "BidirectionalStreamingPrimitiveMethod" endpoint websocket connection.
func (s *BidirectionalStreamingPrimitiveMethodServerStream) Send(v string) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithExplicitViewClientStreamRecvCode = `// Recv reads instances of
// "bidirectionalstreamingresultcollectionwithexplicitviewservice.UsertypeCollection"
// from the "BidirectionalStreamingResultCollectionWithExplicitViewMethod"
// endpoint websocket connection.
func (s *BidirectionalStreamingResultCollectionWithExplicitViewMethodClientStream) Recv() (bidirectionalstreamingresultcollectionwithexplicitviewservice.UsertypeCollection, error) {
    var (
        rv   bidirectionalstreamingresultcollectionwithexplicitviewservice.UsertypeCollection
        body BidirectionalStreamingResultCollectionWithExplicitViewMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewBidirectionalStreamingResultCollectionWithExplicitViewMethodUsertypeCollectionOK(body)
    vres := bidirectionalstreamingresultcollectionwithexplicitviewserviceviews.UsertypeCollection{res, "tiny"}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("BidirectionalStreamingResultCollectionWithExplicitViewService", "BidirectionalStreamingResultCollectionWithExplicitViewMethod", err)
    }
    return bidirectionalstreamingresultcollectionwithexplicitviewservice.NewUsertypeCollection(vres), nil
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithExplicitViewClientStreamSendCode = `// Send streams instances of "interface{}" to the
// "BidirectionalStreamingResultCollectionWithExplicitViewMethod" endpoint
// websocket connection.
func (s *BidirectionalStreamingResultCollectionWithExplicitViewMethodClientStream) Send(v interface{}) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithExplicitViewDSL = func() {
    var ResultT = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("BidirectionalStreamingResultCollectionWithExplicitViewService", func() {
        Method("BidirectionalStreamingResultCollectionWithExplicitViewMethod", func() {
            StreamingPayload(Any)
            StreamingResult(CollectionOf(ResultT), func() {
                View("tiny")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingResultCollectionWithExplicitViewServerStreamRecvCode = `// Recv reads instances of "interface{}" from the
// "BidirectionalStreamingResultCollectionWithExplicitViewMethod" endpoint
// websocket connection.
func (s *BidirectionalStreamingResultCollectionWithExplicitViewMethodServerStream) Recv() (interface{}, error) {
    var (
        rv  interface{}
        msg *interface{}
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithExplicitViewServerStreamSendCode = `// Send streams instances of
// "bidirectionalstreamingresultcollectionwithexplicitviewservice.UsertypeCollection"
// to the "BidirectionalStreamingResultCollectionWithExplicitViewMethod"
// endpoint websocket connection.
func (s *BidirectionalStreamingResultCollectionWithExplicitViewMethodServerStream) Send(v bidirectionalstreamingresultcollectionwithexplicitviewservice.UsertypeCollection) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := bidirectionalstreamingresultcollectionwithexplicitviewservice.NewViewedUsertypeCollection(v, "tiny")
    body := NewUsertypeResponseBodyTinyCollection(res.Projected)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithViewsClientStreamRecvCode = `// Recv reads instances of
// "bidirectionalstreamingresultcollectionwithviewsservice.UsertypeCollection"
// from the "BidirectionalStreamingResultCollectionWithViewsMethod" endpoint
// websocket connection.
func (s *BidirectionalStreamingResultCollectionWithViewsMethodClientStream) Recv() (bidirectionalstreamingresultcollectionwithviewsservice.UsertypeCollection, error) {
    var (
        rv   bidirectionalstreamingresultcollectionwithviewsservice.UsertypeCollection
        body BidirectionalStreamingResultCollectionWithViewsMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewBidirectionalStreamingResultCollectionWithViewsMethodUsertypeCollectionOK(body)
    vres := bidirectionalstreamingresultcollectionwithviewsserviceviews.UsertypeCollection{res, s.view}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("BidirectionalStreamingResultCollectionWithViewsService", "BidirectionalStreamingResultCollectionWithViewsMethod", err)
    }
    return bidirectionalstreamingresultcollectionwithviewsservice.NewUsertypeCollection(vres), nil
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithViewsClientStreamSendCode = `// Send streams instances of "interface{}" to the
// "BidirectionalStreamingResultCollectionWithViewsMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultCollectionWithViewsMethodClientStream) Send(v interface{}) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithViewsClientStreamSetViewCode = `// SetView sets the view to render the interface{} type before sending to the
// "BidirectionalStreamingResultCollectionWithViewsMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultCollectionWithViewsMethodClientStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithViewsDSL = func() {
    var ResultT = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("BidirectionalStreamingResultCollectionWithViewsService", func() {
        Method("BidirectionalStreamingResultCollectionWithViewsMethod", func() {
            StreamingPayload(Any)
            StreamingResult(CollectionOf(ResultT))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingResultCollectionWithViewsServerStreamRecvCode = `// Recv reads instances of "interface{}" from the
// "BidirectionalStreamingResultCollectionWithViewsMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultCollectionWithViewsMethodServerStream) Recv() (interface{}, error) {
    var (
        rv  interface{}
        msg *interface{}
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithViewsServerStreamSendCode = `// Send streams instances of
// "bidirectionalstreamingresultcollectionwithviewsservice.UsertypeCollection"
// to the "BidirectionalStreamingResultCollectionWithViewsMethod" endpoint
// websocket connection.
func (s *BidirectionalStreamingResultCollectionWithViewsMethodServerStream) Send(v bidirectionalstreamingresultcollectionwithviewsservice.UsertypeCollection) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        respHdr := make(http.Header)
        respHdr.Add("goa-view", s.view)
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, respHdr)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := bidirectionalstreamingresultcollectionwithviewsservice.NewViewedUsertypeCollection(v, s.view)
    var body interface{}
    switch s.view {
    case "tiny":
        body = NewUsertypeResponseBodyTinyCollection(res.Projected)
    case "extended":
        body = NewUsertypeResponseBodyExtendedCollection(res.Projected)
    case "default", "":
        body = NewUsertypeResponseBodyCollection(res.Projected)
    }
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingResultCollectionWithViewsServerStreamSetViewCode = `// SetView sets the view to render the
// bidirectionalstreamingresultcollectionwithviewsservice.UsertypeCollection
// type before sending to the
// "BidirectionalStreamingResultCollectionWithViewsMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultCollectionWithViewsMethodServerStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var BidirectionalStreamingResultWithExplicitViewClientStreamRecvCode = `// Recv reads instances of
// "bidirectionalstreamingresultwithexplicitviewservice.Usertype" from the
// "BidirectionalStreamingResultWithExplicitViewMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultWithExplicitViewMethodClientStream) Recv() (*bidirectionalstreamingresultwithexplicitviewservice.Usertype, error) {
    var (
        rv   *bidirectionalstreamingresultwithexplicitviewservice.Usertype
        body BidirectionalStreamingResultWithExplicitViewMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewBidirectionalStreamingResultWithExplicitViewMethodUsertypeOK(&body)
    vres := &bidirectionalstreamingresultwithexplicitviewserviceviews.Usertype{res, "extended"}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("BidirectionalStreamingResultWithExplicitViewService", "BidirectionalStreamingResultWithExplicitViewMethod", err)
    }
    return bidirectionalstreamingresultwithexplicitviewservice.NewUsertype(vres), nil
}
`
```
``` go
var BidirectionalStreamingResultWithExplicitViewClientStreamSendCode = `// Send streams instances of "float32" to the
// "BidirectionalStreamingResultWithExplicitViewMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultWithExplicitViewMethodClientStream) Send(v float32) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var BidirectionalStreamingResultWithExplicitViewDSL = func() {
    var ResultT = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("BidirectionalStreamingResultWithExplicitViewService", func() {
        Method("BidirectionalStreamingResultWithExplicitViewMethod", func() {
            StreamingPayload(Float32)
            StreamingResult(ResultT, func() {
                View("extended")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingResultWithExplicitViewServerStreamRecvCode = `// Recv reads instances of "float32" from the
// "BidirectionalStreamingResultWithExplicitViewMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultWithExplicitViewMethodServerStream) Recv() (float32, error) {
    var (
        rv  float32
        msg *float32
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var BidirectionalStreamingResultWithExplicitViewServerStreamSendCode = `// Send streams instances of
// "bidirectionalstreamingresultwithexplicitviewservice.Usertype" to the
// "BidirectionalStreamingResultWithExplicitViewMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultWithExplicitViewMethodServerStream) Send(v *bidirectionalstreamingresultwithexplicitviewservice.Usertype) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := bidirectionalstreamingresultwithexplicitviewservice.NewViewedUsertype(v, "extended")
    body := NewBidirectionalStreamingResultWithExplicitViewMethodResponseBodyExtended(res.Projected)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingResultWithViewsClientStreamCloseCode = `// Close closes the "BidirectionalStreamingResultWithViewsMethod" endpoint
// websocket connection.
func (s *BidirectionalStreamingResultWithViewsMethodClientStream) Close() error {
    defer s.conn.Close()
    var err error
    // Send a nil payload to the server implying client closing connection.
    if err = s.conn.WriteJSON(nil); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var BidirectionalStreamingResultWithViewsClientStreamRecvCode = `// Recv reads instances of
// "bidirectionalstreamingresultwithviewsservice.Usertype" from the
// "BidirectionalStreamingResultWithViewsMethod" endpoint websocket connection.
func (s *BidirectionalStreamingResultWithViewsMethodClientStream) Recv() (*bidirectionalstreamingresultwithviewsservice.Usertype, error) {
    var (
        rv   *bidirectionalstreamingresultwithviewsservice.Usertype
        body BidirectionalStreamingResultWithViewsMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewBidirectionalStreamingResultWithViewsMethodUsertypeOK(&body)
    vres := &bidirectionalstreamingresultwithviewsserviceviews.Usertype{res, s.view}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("BidirectionalStreamingResultWithViewsService", "BidirectionalStreamingResultWithViewsMethod", err)
    }
    return bidirectionalstreamingresultwithviewsservice.NewUsertype(vres), nil
}
`
```
``` go
var BidirectionalStreamingResultWithViewsClientStreamSendCode = `// Send streams instances of "float32" to the
// "BidirectionalStreamingResultWithViewsMethod" endpoint websocket connection.
func (s *BidirectionalStreamingResultWithViewsMethodClientStream) Send(v float32) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var BidirectionalStreamingResultWithViewsClientStreamSetViewCode = `// SetView sets the view to render the float32 type before sending to the
// "BidirectionalStreamingResultWithViewsMethod" endpoint websocket connection.
func (s *BidirectionalStreamingResultWithViewsMethodClientStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var BidirectionalStreamingResultWithViewsDSL = func() {
    var ResultT = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("BidirectionalStreamingResultWithViewsService", func() {
        Method("BidirectionalStreamingResultWithViewsMethod", func() {
            StreamingPayload(Float32)
            StreamingResult(ResultT)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingResultWithViewsServerStreamCloseCode = `// Close closes the "BidirectionalStreamingResultWithViewsMethod" endpoint
// websocket connection.
func (s *BidirectionalStreamingResultWithViewsMethodServerStream) Close() error {
    defer s.conn.Close()
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Close().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    if err = s.conn.WriteControl(
        websocket.CloseMessage,
        websocket.FormatCloseMessage(websocket.CloseNormalClosure, "server closing connection"),
        time.Now().Add(time.Second),
    ); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var BidirectionalStreamingResultWithViewsServerStreamRecvCode = `// Recv reads instances of "float32" from the
// "BidirectionalStreamingResultWithViewsMethod" endpoint websocket connection.
func (s *BidirectionalStreamingResultWithViewsMethodServerStream) Recv() (float32, error) {
    var (
        rv  float32
        msg *float32
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var BidirectionalStreamingResultWithViewsServerStreamSendCode = `// Send streams instances of
// "bidirectionalstreamingresultwithviewsservice.Usertype" to the
// "BidirectionalStreamingResultWithViewsMethod" endpoint websocket connection.
func (s *BidirectionalStreamingResultWithViewsMethodServerStream) Send(v *bidirectionalstreamingresultwithviewsservice.Usertype) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        respHdr := make(http.Header)
        respHdr.Add("goa-view", s.view)
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, respHdr)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := bidirectionalstreamingresultwithviewsservice.NewViewedUsertype(v, s.view)
    var body interface{}
    switch s.view {
    case "tiny":
        body = NewBidirectionalStreamingResultWithViewsMethodResponseBodyTiny(res.Projected)
    case "extended":
        body = NewBidirectionalStreamingResultWithViewsMethodResponseBodyExtended(res.Projected)
    case "default", "":
        body = NewBidirectionalStreamingResultWithViewsMethodResponseBody(res.Projected)
    }
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingResultWithViewsServerStreamSetViewCode = `// SetView sets the view to render the
// bidirectionalstreamingresultwithviewsservice.Usertype type before sending to
// the "BidirectionalStreamingResultWithViewsMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingResultWithViewsMethodServerStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var BidirectionalStreamingServerHandlerInitCode = `// NewBidirectionalStreamingMethodHandler creates a HTTP handler which loads
// the HTTP request and calls the "BidirectionalStreamingService" service
// "BidirectionalStreamingMethod" endpoint.
func NewBidirectionalStreamingMethodHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler {
    var (
        decodeRequest = DecodeBidirectionalStreamingMethodRequest(mux, dec)
        encodeError   = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "BidirectionalStreamingMethod")
        ctx = context.WithValue(ctx, goa.ServiceKey, "BidirectionalStreamingService")
        payload, err := decodeRequest(r)
        if err != nil {
            eh(ctx, w, err)
            return
        }

        v := &bidirectionalstreamingservice.BidirectionalStreamingMethodEndpointInput{
            Stream: &BidirectionalStreamingMethodServerStream{
                upgrader:     up,
                connConfigFn: connConfigFn,
                w:            w,
                r:            r,
            },
            Payload: payload.(*bidirectionalstreamingservice.Payload),
        }
        _, err = endpoint(ctx, v)

        if err != nil {
            if _, ok := err.(websocket.HandshakeError); ok {
                return
            }
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
    })
}
`
```
``` go
var BidirectionalStreamingServerStreamCloseCode = `// Close closes the "BidirectionalStreamingMethod" endpoint websocket
// connection.
func (s *BidirectionalStreamingMethodServerStream) Close() error {
    defer s.conn.Close()
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Close().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    if err = s.conn.WriteControl(
        websocket.CloseMessage,
        websocket.FormatCloseMessage(websocket.CloseNormalClosure, "server closing connection"),
        time.Now().Add(time.Second),
    ); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var BidirectionalStreamingServerStreamRecvCode = `// Recv reads instances of "bidirectionalstreamingservice.Request" from the
// "BidirectionalStreamingMethod" endpoint websocket connection.
func (s *BidirectionalStreamingMethodServerStream) Recv() (*bidirectionalstreamingservice.Request, error) {
    var (
        rv  *bidirectionalstreamingservice.Request
        msg **BidirectionalStreamingMethodStreamingBody
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return NewBidirectionalStreamingMethodStreamingBody(body), nil
}
`
```
``` go
var BidirectionalStreamingServerStreamSendCode = `// Send streams instances of "bidirectionalstreamingservice.UserType" to the
// "BidirectionalStreamingMethod" endpoint websocket connection.
func (s *BidirectionalStreamingMethodServerStream) Send(v *bidirectionalstreamingservice.UserType) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    body := NewBidirectionalStreamingMethodResponseBody(res)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingUserTypeArrayClientStreamRecvCode = `// Recv reads instances of
// "[]*bidirectionalstreamingusertypearrayservice.ResultType" from the
// "BidirectionalStreamingUserTypeArrayMethod" endpoint websocket connection.
func (s *BidirectionalStreamingUserTypeArrayMethodClientStream) Recv() ([]*bidirectionalstreamingusertypearrayservice.ResultType, error) {
    var (
        rv   []*bidirectionalstreamingusertypearrayservice.ResultType
        body BidirectionalStreamingUserTypeArrayMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewBidirectionalStreamingUserTypeArrayMethodResultTypeOK(body)
    return res, nil
}
`
```
``` go
var BidirectionalStreamingUserTypeArrayClientStreamSendCode = `// Send streams instances of
// "[]*bidirectionalstreamingusertypearrayservice.RequestType" to the
// "BidirectionalStreamingUserTypeArrayMethod" endpoint websocket connection.
func (s *BidirectionalStreamingUserTypeArrayMethodClientStream) Send(v []*bidirectionalstreamingusertypearrayservice.RequestType) error {
    body := NewRequestType(v)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingUserTypeArrayDSL = func() {
    var RequestType = Type("RequestType", func() {
        Attribute("a", String)
    })
    var ResultT = Type("ResultType", func() {
        Attribute("b", String)
    })
    Service("BidirectionalStreamingUserTypeArrayService", func() {
        Method("BidirectionalStreamingUserTypeArrayMethod", func() {
            StreamingPayload(ArrayOf(RequestType))
            StreamingResult(ArrayOf(ResultT))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingUserTypeArrayServerStreamRecvCode = `// Recv reads instances of
// "[]*bidirectionalstreamingusertypearrayservice.RequestType" from the
// "BidirectionalStreamingUserTypeArrayMethod" endpoint websocket connection.
func (s *BidirectionalStreamingUserTypeArrayMethodServerStream) Recv() ([]*bidirectionalstreamingusertypearrayservice.RequestType, error) {
    var (
        rv  []*bidirectionalstreamingusertypearrayservice.RequestType
        msg *[]*RequestType
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return NewBidirectionalStreamingUserTypeArrayMethodArray(body), nil
}
`
```
``` go
var BidirectionalStreamingUserTypeArrayServerStreamSendCode = `// Send streams instances of
// "[]*bidirectionalstreamingusertypearrayservice.ResultType" to the
// "BidirectionalStreamingUserTypeArrayMethod" endpoint websocket connection.
func (s *BidirectionalStreamingUserTypeArrayMethodServerStream) Send(v []*bidirectionalstreamingusertypearrayservice.ResultType) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    body := NewResultTypeResponseBody(res)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingUserTypeMapClientStreamRecvCode = `// Recv reads instances of
// "map[string]*bidirectionalstreamingusertypemapservice.ResultType" from the
// "BidirectionalStreamingUserTypeMapMethod" endpoint websocket connection.
func (s *BidirectionalStreamingUserTypeMapMethodClientStream) Recv() (map[string]*bidirectionalstreamingusertypemapservice.ResultType, error) {
    var (
        rv   map[string]*bidirectionalstreamingusertypemapservice.ResultType
        body BidirectionalStreamingUserTypeMapMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewBidirectionalStreamingUserTypeMapMethodMapStringResultTypeOK(body)
    return res, nil
}
`
```
``` go
var BidirectionalStreamingUserTypeMapClientStreamSendCode = `// Send streams instances of
// "map[string]*bidirectionalstreamingusertypemapservice.RequestType" to the
// "BidirectionalStreamingUserTypeMapMethod" endpoint websocket connection.
func (s *BidirectionalStreamingUserTypeMapMethodClientStream) Send(v map[string]*bidirectionalstreamingusertypemapservice.RequestType) error {
    body := NewMapStringRequestType(v)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BidirectionalStreamingUserTypeMapDSL = func() {
    var RequestType = Type("RequestType", func() {
        Attribute("a", String)
    })
    var ResultT = Type("ResultType", func() {
        Attribute("b", String)
    })
    Service("BidirectionalStreamingUserTypeMapService", func() {
        Method("BidirectionalStreamingUserTypeMapMethod", func() {
            StreamingPayload(MapOf(String, RequestType))
            StreamingResult(MapOf(String, ResultT))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var BidirectionalStreamingUserTypeMapServerStreamRecvCode = `// Recv reads instances of
// "map[string]*bidirectionalstreamingusertypemapservice.RequestType" from the
// "BidirectionalStreamingUserTypeMapMethod" endpoint websocket connection.
func (s *BidirectionalStreamingUserTypeMapMethodServerStream) Recv() (map[string]*bidirectionalstreamingusertypemapservice.RequestType, error) {
    var (
        rv  map[string]*bidirectionalstreamingusertypemapservice.RequestType
        msg *map[string]*RequestType
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return NewBidirectionalStreamingUserTypeMapMethodMap(body), nil
}
`
```
``` go
var BidirectionalStreamingUserTypeMapServerStreamSendCode = `// Send streams instances of
// "map[string]*bidirectionalstreamingusertypemapservice.ResultType" to the
// "BidirectionalStreamingUserTypeMapMethod" endpoint websocket connection.
func (s *BidirectionalStreamingUserTypeMapMethodServerStream) Send(v map[string]*bidirectionalstreamingusertypemapservice.ResultType) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    body := NewMapStringResultTypeResponseBody(res)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var BodyQueryPathObjectBuildCode = `// BuildMethodBodyQueryPathObjectPayload builds the payload for the
// ServiceBodyQueryPathObject MethodBodyQueryPathObject endpoint from CLI flags.
func BuildMethodBodyQueryPathObjectPayload(serviceBodyQueryPathObjectMethodBodyQueryPathObjectBody string, serviceBodyQueryPathObjectMethodBodyQueryPathObjectC string, serviceBodyQueryPathObjectMethodBodyQueryPathObjectB string) (*servicebodyquerypathobject.MethodBodyQueryPathObjectPayload, error) {
    var err error
    var body MethodBodyQueryPathObjectRequestBody
    {
        err = json.Unmarshal([]byte(serviceBodyQueryPathObjectMethodBodyQueryPathObjectBody), &body)
        if err != nil {
            return nil, fmt.Errorf("invalid JSON for body, example of valid JSON:\n%s", "'{\n      \"a\": \"Ullam aut.\"\n   }'")
        }
    }
    var c *string
    {
        if serviceBodyQueryPathObjectMethodBodyQueryPathObjectC != "" {
            c = &serviceBodyQueryPathObjectMethodBodyQueryPathObjectC
        }
    }
    var b *string
    {
        if serviceBodyQueryPathObjectMethodBodyQueryPathObjectB != "" {
            b = &serviceBodyQueryPathObjectMethodBodyQueryPathObjectB
        }
    }
    if err != nil {
        return nil, err
    }
    v := &servicebodyquerypathobject.MethodBodyQueryPathObjectPayload{
        A: body.A,
    }
    v.C = c
    v.B = b
    return v, nil
}
`
```
``` go
var DefaultErrorResponseDSL = func() {
    Service("ServiceDefaultErrorResponse", func() {
        Method("MethodDefaultErrorResponse", func() {
            Error("bad_request")
            HTTP(func() {
                GET("/one/two")
                Response("bad_request", StatusBadRequest)
            })
        })
    })
}
```
``` go
var DefaultErrorResponseEncoderCode = `// EncodeMethodDefaultErrorResponseError returns an encoder for errors returned
// by the MethodDefaultErrorResponse ServiceDefaultErrorResponse endpoint.
func EncodeMethodDefaultErrorResponseError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error {
    encodeError := goahttp.ErrorEncoder(encoder)
    return func(ctx context.Context, w http.ResponseWriter, v error) error {
        en, ok := v.(ErrorNamer)
        if !ok {
            return encodeError(ctx, w, v)
        }
        switch en.ErrorName() {
        case "bad_request":
            res := v.(*goa.ServiceError)
            enc := encoder(ctx, w)
            body := NewMethodDefaultErrorResponseBadRequestResponseBody(res)
            w.Header().Set("goa-error", "bad_request")
            w.WriteHeader(http.StatusBadRequest)
            return enc.Encode(body)
        default:
            return encodeError(ctx, w, v)
        }
    }
}
`
```
``` go
var EmptyBodyBuildCode = `// BuildMethodBodyPrimitiveArrayUserPayload builds the payload for the
// ServiceBodyPrimitiveArrayUser MethodBodyPrimitiveArrayUser endpoint from CLI
// flags.
func BuildMethodBodyPrimitiveArrayUserPayload(serviceBodyPrimitiveArrayUserMethodBodyPrimitiveArrayUserA string) (*servicebodyprimitivearrayuser.PayloadType, error) {
    var err error
    var a []string
    {
        if serviceBodyPrimitiveArrayUserMethodBodyPrimitiveArrayUserA != "" {
            err = json.Unmarshal([]byte(serviceBodyPrimitiveArrayUserMethodBodyPrimitiveArrayUserA), &a)
            if err != nil {
                return nil, fmt.Errorf("invalid JSON for a, example of valid JSON:\n%s", "'[\n      \"Perspiciatis repellendus harum et est.\",\n      \"Nisi quibusdam nisi sint sunt beatae.\"\n   ]'")
            }
        }
    }
    if err != nil {
        return nil, err
    }
    payload := &servicebodyprimitivearrayuser.PayloadType{
        A: a,
    }
    return payload, nil
}
`
```
``` go
var EmptyBodyResultMultipleViewsDSL = func() {
    var ResultType = ResultType("ResultTypeMultipleViews", func() {
        Attribute("a", String)
        Attribute("b", String)
        Attribute("c", String)
        View("default", func() {
            Attribute("a")
            Attribute("c")
        })
        View("tiny", func() {
            Attribute("c")
        })
    })
    Service("ServiceEmptyBodyResultMultipleView", func() {
        Method("MethodEmptyBodyResultMultipleView", func() {
            Result(ResultType)
            HTTP(func() {
                POST("/")
                Response(StatusOK, func() {
                    Header("c:Location")
                    Body(Empty)
                })
            })
        })
    })
}
```
``` go
var EmptyBodyResultMultipleViewsDecodeCode = `// DecodeMethodEmptyBodyResultMultipleViewResponse returns a decoder for
// responses returned by the ServiceEmptyBodyResultMultipleView
// MethodEmptyBodyResultMultipleView endpoint. restoreBody controls whether the
// response body should be restored after having been read.
func DecodeMethodEmptyBodyResultMultipleViewResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error) {
    return func(resp *http.Response) (interface{}, error) {
        if restoreBody {
            b, err := ioutil.ReadAll(resp.Body)
            if err != nil {
                return nil, err
            }
            resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            defer func() {
                resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            }()
        } else {
            defer resp.Body.Close()
        }
        switch resp.StatusCode {
        case http.StatusOK:
            var (
                c *string
            )
            cRaw := resp.Header.Get("Location")
            if cRaw != "" {
                c = &cRaw
            }
            p := NewMethodEmptyBodyResultMultipleViewResulttypemultipleviewsOK(c)
            view := resp.Header.Get("goa-view")
            vres := &serviceemptybodyresultmultipleviewviews.Resulttypemultipleviews{p, view}
            return serviceemptybodyresultmultipleview.NewResulttypemultipleviews(vres), nil
        default:
            body, _ := ioutil.ReadAll(resp.Body)
            return nil, goahttp.ErrInvalidResponse("ServiceEmptyBodyResultMultipleView", "MethodEmptyBodyResultMultipleView", resp.StatusCode, string(body))
        }
    }
}
`
```
``` go
var EmptyBodyResultMultipleViewsEncodeCode = `// EncodeMethodEmptyBodyResultMultipleViewResponse returns an encoder for
// responses returned by the ServiceEmptyBodyResultMultipleView
// MethodEmptyBodyResultMultipleView endpoint.
func EncodeMethodEmptyBodyResultMultipleViewResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceemptybodyresultmultipleviewviews.Resulttypemultipleviews)
        w.Header().Set("goa-view", res.View)
        if res.Projected.C != nil {
            w.Header().Set("Location", *res.Projected.C)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var EmptyServerResponseDSL = func() {
    Service("ServiceEmptyServerResponse", func() {
        Method("MethodEmptyServerResponse", func() {
            Result(func() {
                Attribute("h", String)
                Required("h")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Body(Empty)
                })
            })
        })
    })
}
```
``` go
var EmptyServerResponseDecodeCode = `// DecodeMethodEmptyServerResponseResponse returns a decoder for responses
// returned by the ServiceEmptyServerResponse MethodEmptyServerResponse
// endpoint. restoreBody controls whether the response body should be restored
// after having been read.
func DecodeMethodEmptyServerResponseResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error) {
    return func(resp *http.Response) (interface{}, error) {
        if restoreBody {
            b, err := ioutil.ReadAll(resp.Body)
            if err != nil {
                return nil, err
            }
            resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            defer func() {
                resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            }()
        } else {
            defer resp.Body.Close()
        }
        switch resp.StatusCode {
        case http.StatusOK:
            return NewMethodEmptyServerResponseResultOK(), nil
        default:
            body, _ := ioutil.ReadAll(resp.Body)
            return nil, goahttp.ErrInvalidResponse("ServiceEmptyServerResponse", "MethodEmptyServerResponse", resp.StatusCode, string(body))
        }
    }
}
`
```
``` go
var EmptyServerResponseEncodeCode = `// EncodeMethodEmptyServerResponseResponse returns an encoder for responses
// returned by the ServiceEmptyServerResponse MethodEmptyServerResponse
// endpoint.
func EncodeMethodEmptyServerResponseResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ExplicitBodyPrimitiveResultMultipleViewsDSL = func() {
    var ResultType = ResultType("ResultTypeMultipleViews", func() {
        Attribute("a", String)
        Attribute("b", String)
        Attribute("c", String)
        View("default", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
        View("tiny", func() {
            Attribute("a")
            Attribute("c")
        })
    })
    Service("ServiceExplicitBodyPrimitiveResultMultipleView", func() {
        Method("MethodExplicitBodyPrimitiveResultMultipleView", func() {
            Result(ResultType)
            HTTP(func() {
                POST("/")
                Response(StatusOK, func() {
                    Header("c:Location")
                    Body("a")
                })
            })
        })
    })
}
```
``` go
var ExplicitBodyPrimitiveResultMultipleViewsEncodeCode = `// EncodeMethodExplicitBodyPrimitiveResultMultipleViewResponse returns an
// encoder for responses returned by the
// ServiceExplicitBodyPrimitiveResultMultipleView
// MethodExplicitBodyPrimitiveResultMultipleView endpoint.
func EncodeMethodExplicitBodyPrimitiveResultMultipleViewResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceexplicitbodyprimitiveresultmultipleviewviews.Resulttypemultipleviews)
        w.Header().Set("goa-view", res.View)
        enc := encoder(ctx, w)
        body := res.Projected.A
        if res.Projected.C != nil {
            w.Header().Set("Location", *res.Projected.C)
        }
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ExplicitBodyUserResultMultipleViewsDSL = func() {
    var UserType = Type("UserType", func() {
        Attribute("x", String)
        Attribute("y", Int)
    })
    var ResultType = ResultType("ResultTypeMultipleViews", func() {
        Attribute("a", UserType)
        Attribute("b", String)
        Attribute("c", String)
        View("default", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
        View("tiny", func() {
            Attribute("a")
            Attribute("c")
        })
    })
    Service("ServiceExplicitBodyUserResultMultipleView", func() {
        Method("MethodExplicitBodyUserResultMultipleView", func() {
            Result(ResultType)
            HTTP(func() {
                POST("/")
                Response(StatusOK, func() {
                    Header("c:Location")
                    Body("a")
                })
            })
        })
    })
}
```
``` go
var ExplicitBodyUserResultMultipleViewsDecodeCode = `// DecodeMethodExplicitBodyUserResultMultipleViewResponse returns a decoder for
// responses returned by the ServiceExplicitBodyUserResultMultipleView
// MethodExplicitBodyUserResultMultipleView endpoint. restoreBody controls
// whether the response body should be restored after having been read.
func DecodeMethodExplicitBodyUserResultMultipleViewResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error) {
    return func(resp *http.Response) (interface{}, error) {
        if restoreBody {
            b, err := ioutil.ReadAll(resp.Body)
            if err != nil {
                return nil, err
            }
            resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            defer func() {
                resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            }()
        } else {
            defer resp.Body.Close()
        }
        switch resp.StatusCode {
        case http.StatusOK:
            var (
                body UserType
                err  error
            )
            err = decoder(resp).Decode(&body)
            if err != nil {
                return nil, goahttp.ErrDecodingError("ServiceExplicitBodyUserResultMultipleView", "MethodExplicitBodyUserResultMultipleView", err)
            }
            var (
                c *string
            )
            cRaw := resp.Header.Get("Location")
            if cRaw != "" {
                c = &cRaw
            }
            p := NewMethodExplicitBodyUserResultMultipleViewResulttypemultipleviewsOK(&body, c)
            view := resp.Header.Get("goa-view")
            vres := &serviceexplicitbodyuserresultmultipleviewviews.Resulttypemultipleviews{p, view}
            if err = vres.Validate(); err != nil {
                return nil, goahttp.ErrValidationError("ServiceExplicitBodyUserResultMultipleView", "MethodExplicitBodyUserResultMultipleView", err)
            }
            return serviceexplicitbodyuserresultmultipleview.NewResulttypemultipleviews(vres), nil
        default:
            body, _ := ioutil.ReadAll(resp.Body)
            return nil, goahttp.ErrInvalidResponse("ServiceExplicitBodyUserResultMultipleView", "MethodExplicitBodyUserResultMultipleView", resp.StatusCode, string(body))
        }
    }
}
`
```
``` go
var ExplicitBodyUserResultMultipleViewsEncodeCode = `// EncodeMethodExplicitBodyUserResultMultipleViewResponse returns an encoder
// for responses returned by the ServiceExplicitBodyUserResultMultipleView
// MethodExplicitBodyUserResultMultipleView endpoint.
func EncodeMethodExplicitBodyUserResultMultipleViewResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceexplicitbodyuserresultmultipleviewviews.Resulttypemultipleviews)
        w.Header().Set("goa-view", res.View)
        enc := encoder(ctx, w)
        body := NewUserType(res.Projected)
        if res.Projected.C != nil {
            w.Header().Set("Location", *res.Projected.C)
        }
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var MapQueryObjectBuildCode = `// BuildMethodMapQueryObjectPayload builds the payload for the
// ServiceMapQueryObject MethodMapQueryObject endpoint from CLI flags.
func BuildMethodMapQueryObjectPayload(serviceMapQueryObjectMethodMapQueryObjectBody string, serviceMapQueryObjectMethodMapQueryObjectA string, serviceMapQueryObjectMethodMapQueryObjectC string) (*servicemapqueryobject.PayloadType, error) {
    var err error
    var body MethodMapQueryObjectRequestBody
    {
        err = json.Unmarshal([]byte(serviceMapQueryObjectMethodMapQueryObjectBody), &body)
        if err != nil {
            return nil, fmt.Errorf("invalid JSON for body, example of valid JSON:\n%s", "'{\n      \"b\": \"patternb\"\n   }'")
        }
        if body.B != nil {
            err = goa.MergeErrors(err, goa.ValidatePattern("body.b", *body.B, "patternb"))
        }
        if err != nil {
            return nil, err
        }
    }
    var a string
    {
        a = serviceMapQueryObjectMethodMapQueryObjectA
    }
    var c map[int][]string
    {
        err = json.Unmarshal([]byte(serviceMapQueryObjectMethodMapQueryObjectC), &c)
        if err != nil {
            return nil, fmt.Errorf("invalid JSON for c, example of valid JSON:\n%s", "'{\n      \"1484745265794365762\": [\n         \"Similique aspernatur.\",\n         \"Error explicabo.\",\n         \"Minima cumque voluptatem et distinctio aliquam.\",\n         \"Blanditiis ut eaque.\"\n      ],\n      \"4925854623691091547\": [\n         \"Eos aut ipsam.\",\n         \"Aliquam tempora.\"\n      ],\n      \"7174751143827362498\": [\n         \"Facilis minus explicabo nemo eos vel repellat.\",\n         \"Voluptatum magni aperiam qui.\"\n      ]\n   }'")
        }
        err = goa.MergeErrors(err, goa.ValidatePattern("c.a", c.A, "patterna"))
        if c.B != nil {
            err = goa.MergeErrors(err, goa.ValidatePattern("c.b", *c.B, "patternb"))
        }
        if err != nil {
            return nil, err
        }
    }
    if err != nil {
        return nil, err
    }
    v := &servicemapqueryobject.PayloadType{
        B: body.B,
    }
    v.A = a
    v.C = c
    return v, nil
}
`
```
``` go
var MapQueryParseCode = `// ParseEndpoint returns the endpoint and payload as specified on the command
// line.
func ParseEndpoint(
    scheme, host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restore bool,
) (goa.Endpoint, interface{}, error) {
    var (
        serviceMapQueryPrimitiveArrayFlags = flag.NewFlagSet("service-map-query-primitive-array", flag.ContinueOnError)

        serviceMapQueryPrimitiveArrayMapQueryPrimitiveArrayFlags = flag.NewFlagSet("map-query-primitive-array", flag.ExitOnError)
        serviceMapQueryPrimitiveArrayMapQueryPrimitiveArrayPFlag = serviceMapQueryPrimitiveArrayMapQueryPrimitiveArrayFlags.String("p", "REQUIRED", "map[string][]uint is the payload type of the ServiceMapQueryPrimitiveArray service MapQueryPrimitiveArray method.")
    )
    serviceMapQueryPrimitiveArrayFlags.Usage = serviceMapQueryPrimitiveArrayUsage
    serviceMapQueryPrimitiveArrayMapQueryPrimitiveArrayFlags.Usage = serviceMapQueryPrimitiveArrayMapQueryPrimitiveArrayUsage

    if err := flag.CommandLine.Parse(os.Args[1:]); err != nil {
        return nil, nil, err
    }

    if len(os.Args) < flag.NFlag()+3 {
        return nil, nil, fmt.Errorf("not enough arguments")
    }

    var (
        svcn string
        svcf *flag.FlagSet
    )
    {
        svcn = os.Args[1+flag.NFlag()]
        switch svcn {
        case "service-map-query-primitive-array":
            svcf = serviceMapQueryPrimitiveArrayFlags
        default:
            return nil, nil, fmt.Errorf("unknown service %q", svcn)
        }
    }
    if err := svcf.Parse(os.Args[2+flag.NFlag():]); err != nil {
        return nil, nil, err
    }

    var (
        epn string
        epf *flag.FlagSet
    )
    {
        epn = os.Args[2+flag.NFlag()+svcf.NFlag()]
        switch svcn {
        case "service-map-query-primitive-array":
            switch epn {
            case "map-query-primitive-array":
                epf = serviceMapQueryPrimitiveArrayMapQueryPrimitiveArrayFlags

            }

        }
    }
    if epf == nil {
        return nil, nil, fmt.Errorf("unknown %q endpoint %q", svcn, epn)
    }

    // Parse endpoint flags if any
    if len(os.Args) > 2+flag.NFlag()+svcf.NFlag() {
        if err := epf.Parse(os.Args[3+flag.NFlag()+svcf.NFlag():]); err != nil {
            return nil, nil, err
        }
    }

    var (
        data     interface{}
        endpoint goa.Endpoint
        err      error
    )
    {
        switch svcn {
        case "service-map-query-primitive-array":
            c := servicemapqueryprimitivearrayc.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "map-query-primitive-array":
                endpoint = c.MapQueryPrimitiveArray()
                var err error
                var val map[string][]uint
                err = json.Unmarshal([]byte(*serviceMapQueryPrimitiveArrayMapQueryPrimitiveArrayPFlag), &val)
                data = val
                if err != nil {
                    return nil, nil, fmt.Errorf("invalid JSON for serviceMapQueryPrimitiveArrayMapQueryPrimitiveArrayPFlag, example of valid JSON:\n%s", "'{\n      \"Iste perspiciatis.\": [\n         567408540461384614,\n         5721637919286150856\n      ],\n      \"Itaque inventore optio.\": [\n         944964629895926327,\n         593430823343775997\n      ],\n      \"Molestias recusandae doloribus qui quia.\": [\n         6921210467234244263,\n         3742304935485895874,\n         4170793618430505438,\n         7388093990298529880\n      ]\n   }'")
                }
            }
        }
    }
    if err != nil {
        return nil, nil, err
    }

    return endpoint, data, nil
}
`
```
``` go
var MultiBuildCode = `// BuildMethodMultiPayloadPayload builds the payload for the ServiceMulti
// MethodMultiPayload endpoint from CLI flags.
func BuildMethodMultiPayloadPayload(serviceMultiMethodMultiPayloadBody string, serviceMultiMethodMultiPayloadB string, serviceMultiMethodMultiPayloadA string) (*servicemulti.MethodMultiPayloadPayload, error) {
    var err error
    var body MethodMultiPayloadRequestBody
    {
        err = json.Unmarshal([]byte(serviceMultiMethodMultiPayloadBody), &body)
        if err != nil {
            return nil, fmt.Errorf("invalid JSON for body, example of valid JSON:\n%s", "'{\n      \"c\": {\n         \"att\": false,\n         \"att10\": \"Aspernatur quo error explicabo pariatur.\",\n         \"att11\": \"Q3VtcXVlIHZvbHVwdGF0ZW0u\",\n         \"att12\": \"Distinctio aliquam nihil blanditiis ut.\",\n         \"att13\": [\n            \"Nihil excepturi deserunt quasi omnis sed.\",\n            \"Sit maiores aperiam autem non ea rem.\"\n         ],\n         \"att14\": {\n            \"Excepturi totam.\": \"Ut aut facilis vel ipsam.\",\n            \"Minima et aut non sunt consequuntur.\": \"Et consequuntur porro quasi.\",\n            \"Quis voluptates quaerat et temporibus facere.\": \"Ipsam eaque sunt maxime suscipit.\"\n         },\n         \"att15\": {\n            \"inline\": \"Ea alias repellat nobis veritatis.\"\n         },\n         \"att2\": 3504438334001971349,\n         \"att3\": 2005839040,\n         \"att4\": 5845720715558772393,\n         \"att5\": 2900634008447043830,\n         \"att6\": 1865618013,\n         \"att7\": 1484745265794365762,\n         \"att8\": 0.11815318,\n         \"att9\": 0.30907290919538355\n      }\n   }'")
        }
    }
    var b *string
    {
        if serviceMultiMethodMultiPayloadB != "" {
            b = &serviceMultiMethodMultiPayloadB
        }
    }
    var a *bool
    {
        if serviceMultiMethodMultiPayloadA != "" {
            val, err := strconv.ParseBool(serviceMultiMethodMultiPayloadA)
            a = &val
            if err != nil {
                err = fmt.Errorf("invalid value for a, must be BOOL")
            }
        }
    }
    if err != nil {
        return nil, err
    }
    v := &servicemulti.MethodMultiPayloadPayload{}
    if body.C != nil {
        v.C = marshalUserTypeRequestBodyToUserType(body.C)
    }
    v.B = b
    v.A = a
    return v, nil
}
`
```
``` go
var MultiDSL = func() {
    var UserType = Type("UserType", func() {
        Attribute("att", Boolean)
        Attribute("att2", Int)
        Attribute("att3", Int32)
        Attribute("att4", Int64)
        Attribute("att5", UInt)
        Attribute("att6", UInt32)
        Attribute("att7", UInt64)
        Attribute("att8", Float32)
        Attribute("att9", Float64)
        Attribute("att10", String)
        Attribute("att11", Bytes)
        Attribute("att12", Any)
        Attribute("att13", ArrayOf(String))
        Attribute("att14", MapOf(String, String))
        Attribute("att15", func() {
            Attribute("inline")
        })
        Attribute("att16", "UserType")
    })

    Service("ServiceMulti", func() {
        Method("MethodMultiNoPayload", func() {
            HTTP(func() {
                GET("/")
            })
        })
        Method("MethodMultiPayload", func() {
            Payload(func() {
                Attribute("a", Boolean)
                Attribute("b", String)
                Attribute("c", UserType)
            })
            HTTP(func() {
                Header("a")
                Param("b")
                POST("/")
            })
        })
    })
}
```
``` go
var MultiNoPayloadDSL = func() {
    Service("ServiceMultiNoPayload1", func() {
        Method("MethodServiceNoPayload11", func() {
            HTTP(func() {
                GET("/11")
            })
        })
        Method("MethodServiceNoPayload12", func() {
            HTTP(func() {
                GET("/12")
            })
        })
    })
    Service("ServiceMultiNoPayload2", func() {
        Method("MethodServiceNoPayload21", func() {
            HTTP(func() {
                GET("/21")
            })
        })
        Method("MethodServiceNoPayload22", func() {
            HTTP(func() {
                GET("/22")
            })
        })
    })
}
```
``` go
var MultiNoPayloadParseCode = `// ParseEndpoint returns the endpoint and payload as specified on the command
// line.
func ParseEndpoint(
    scheme, host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restore bool,
) (goa.Endpoint, interface{}, error) {
    var (
        serviceMultiNoPayload1Flags = flag.NewFlagSet("service-multi-no-payload1", flag.ContinueOnError)

        serviceMultiNoPayload1MethodServiceNoPayload11Flags = flag.NewFlagSet("method-service-no-payload11", flag.ExitOnError)

        serviceMultiNoPayload1MethodServiceNoPayload12Flags = flag.NewFlagSet("method-service-no-payload12", flag.ExitOnError)

        serviceMultiNoPayload2Flags = flag.NewFlagSet("service-multi-no-payload2", flag.ContinueOnError)

        serviceMultiNoPayload2MethodServiceNoPayload21Flags = flag.NewFlagSet("method-service-no-payload21", flag.ExitOnError)

        serviceMultiNoPayload2MethodServiceNoPayload22Flags = flag.NewFlagSet("method-service-no-payload22", flag.ExitOnError)
    )
    serviceMultiNoPayload1Flags.Usage = serviceMultiNoPayload1Usage
    serviceMultiNoPayload1MethodServiceNoPayload11Flags.Usage = serviceMultiNoPayload1MethodServiceNoPayload11Usage
    serviceMultiNoPayload1MethodServiceNoPayload12Flags.Usage = serviceMultiNoPayload1MethodServiceNoPayload12Usage

    serviceMultiNoPayload2Flags.Usage = serviceMultiNoPayload2Usage
    serviceMultiNoPayload2MethodServiceNoPayload21Flags.Usage = serviceMultiNoPayload2MethodServiceNoPayload21Usage
    serviceMultiNoPayload2MethodServiceNoPayload22Flags.Usage = serviceMultiNoPayload2MethodServiceNoPayload22Usage

    if err := flag.CommandLine.Parse(os.Args[1:]); err != nil {
        return nil, nil, err
    }

    if len(os.Args) < flag.NFlag()+3 {
        return nil, nil, fmt.Errorf("not enough arguments")
    }

    var (
        svcn string
        svcf *flag.FlagSet
    )
    {
        svcn = os.Args[1+flag.NFlag()]
        switch svcn {
        case "service-multi-no-payload1":
            svcf = serviceMultiNoPayload1Flags
        case "service-multi-no-payload2":
            svcf = serviceMultiNoPayload2Flags
        default:
            return nil, nil, fmt.Errorf("unknown service %q", svcn)
        }
    }
    if err := svcf.Parse(os.Args[2+flag.NFlag():]); err != nil {
        return nil, nil, err
    }

    var (
        epn string
        epf *flag.FlagSet
    )
    {
        epn = os.Args[2+flag.NFlag()+svcf.NFlag()]
        switch svcn {
        case "service-multi-no-payload1":
            switch epn {
            case "method-service-no-payload11":
                epf = serviceMultiNoPayload1MethodServiceNoPayload11Flags

            case "method-service-no-payload12":
                epf = serviceMultiNoPayload1MethodServiceNoPayload12Flags

            }

        case "service-multi-no-payload2":
            switch epn {
            case "method-service-no-payload21":
                epf = serviceMultiNoPayload2MethodServiceNoPayload21Flags

            case "method-service-no-payload22":
                epf = serviceMultiNoPayload2MethodServiceNoPayload22Flags

            }

        }
    }
    if epf == nil {
        return nil, nil, fmt.Errorf("unknown %q endpoint %q", svcn, epn)
    }

    // Parse endpoint flags if any
    if len(os.Args) > 2+flag.NFlag()+svcf.NFlag() {
        if err := epf.Parse(os.Args[3+flag.NFlag()+svcf.NFlag():]); err != nil {
            return nil, nil, err
        }
    }

    var (
        data     interface{}
        endpoint goa.Endpoint
        err      error
    )
    {
        switch svcn {
        case "service-multi-no-payload1":
            c := servicemultinopayload1c.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-service-no-payload11":
                endpoint = c.MethodServiceNoPayload11()
                data = nil
            case "method-service-no-payload12":
                endpoint = c.MethodServiceNoPayload12()
                data = nil
            }
        case "service-multi-no-payload2":
            c := servicemultinopayload2c.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-service-no-payload21":
                endpoint = c.MethodServiceNoPayload21()
                data = nil
            case "method-service-no-payload22":
                endpoint = c.MethodServiceNoPayload22()
                data = nil
            }
        }
    }
    if err != nil {
        return nil, nil, err
    }

    return endpoint, data, nil
}
`
```
``` go
var MultiParseCode = `// ParseEndpoint returns the endpoint and payload as specified on the command
// line.
func ParseEndpoint(
    scheme, host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restore bool,
) (goa.Endpoint, interface{}, error) {
    var (
        serviceMultiFlags = flag.NewFlagSet("service-multi", flag.ContinueOnError)

        serviceMultiMethodMultiNoPayloadFlags = flag.NewFlagSet("method-multi-no-payload", flag.ExitOnError)

        serviceMultiMethodMultiPayloadFlags    = flag.NewFlagSet("method-multi-payload", flag.ExitOnError)
        serviceMultiMethodMultiPayloadBodyFlag = serviceMultiMethodMultiPayloadFlags.String("body", "REQUIRED", "")
        serviceMultiMethodMultiPayloadBFlag    = serviceMultiMethodMultiPayloadFlags.String("b", "", "")
        serviceMultiMethodMultiPayloadAFlag    = serviceMultiMethodMultiPayloadFlags.String("a", "", "")
    )
    serviceMultiFlags.Usage = serviceMultiUsage
    serviceMultiMethodMultiNoPayloadFlags.Usage = serviceMultiMethodMultiNoPayloadUsage
    serviceMultiMethodMultiPayloadFlags.Usage = serviceMultiMethodMultiPayloadUsage

    if err := flag.CommandLine.Parse(os.Args[1:]); err != nil {
        return nil, nil, err
    }

    if len(os.Args) < flag.NFlag()+3 {
        return nil, nil, fmt.Errorf("not enough arguments")
    }

    var (
        svcn string
        svcf *flag.FlagSet
    )
    {
        svcn = os.Args[1+flag.NFlag()]
        switch svcn {
        case "service-multi":
            svcf = serviceMultiFlags
        default:
            return nil, nil, fmt.Errorf("unknown service %q", svcn)
        }
    }
    if err := svcf.Parse(os.Args[2+flag.NFlag():]); err != nil {
        return nil, nil, err
    }

    var (
        epn string
        epf *flag.FlagSet
    )
    {
        epn = os.Args[2+flag.NFlag()+svcf.NFlag()]
        switch svcn {
        case "service-multi":
            switch epn {
            case "method-multi-no-payload":
                epf = serviceMultiMethodMultiNoPayloadFlags

            case "method-multi-payload":
                epf = serviceMultiMethodMultiPayloadFlags

            }

        }
    }
    if epf == nil {
        return nil, nil, fmt.Errorf("unknown %q endpoint %q", svcn, epn)
    }

    // Parse endpoint flags if any
    if len(os.Args) > 2+flag.NFlag()+svcf.NFlag() {
        if err := epf.Parse(os.Args[3+flag.NFlag()+svcf.NFlag():]); err != nil {
            return nil, nil, err
        }
    }

    var (
        data     interface{}
        endpoint goa.Endpoint
        err      error
    )
    {
        switch svcn {
        case "service-multi":
            c := servicemultic.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-multi-no-payload":
                endpoint = c.MethodMultiNoPayload()
                data = nil
            case "method-multi-payload":
                endpoint = c.MethodMultiPayload()
                data, err = servicemultic.BuildMethodMultiPayloadPayload(*serviceMultiMethodMultiPayloadBodyFlag, *serviceMultiMethodMultiPayloadBFlag, *serviceMultiMethodMultiPayloadAFlag)
            }
        }
    }
    if err != nil {
        return nil, nil, err
    }

    return endpoint, data, nil
}
`
```
``` go
var MultiRequiredPayloadDSL = func() {
    Service("ServiceMultiRequired1", func() {
        Method("MethodMultiRequiredPayload", func() {
            Payload(func() {
                Attribute("a", Boolean)
                Required("a")
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
    Service("ServiceMultiRequired2", func() {
        Method("MethodMultiRequiredNoPayload", func() {
            HTTP(func() {
                GET("/2")
            })
        })
        Method("MethodMultiRequiredPayload", func() {
            Payload(func() {
                Attribute("a", Boolean)
                Required("a")
            })
            HTTP(func() {
                POST("/2")
                Param("a")
            })
        })
    })
}
```
``` go
var MultiRequiredPayloadParseCode = `// ParseEndpoint returns the endpoint and payload as specified on the command
// line.
func ParseEndpoint(
    scheme, host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restore bool,
) (goa.Endpoint, interface{}, error) {
    var (
        serviceMultiRequired1Flags = flag.NewFlagSet("service-multi-required1", flag.ContinueOnError)

        serviceMultiRequired1MethodMultiRequiredPayloadFlags    = flag.NewFlagSet("method-multi-required-payload", flag.ExitOnError)
        serviceMultiRequired1MethodMultiRequiredPayloadBodyFlag = serviceMultiRequired1MethodMultiRequiredPayloadFlags.String("body", "REQUIRED", "")

        serviceMultiRequired2Flags = flag.NewFlagSet("service-multi-required2", flag.ContinueOnError)

        serviceMultiRequired2MethodMultiRequiredNoPayloadFlags = flag.NewFlagSet("method-multi-required-no-payload", flag.ExitOnError)

        serviceMultiRequired2MethodMultiRequiredPayloadFlags = flag.NewFlagSet("method-multi-required-payload", flag.ExitOnError)
        serviceMultiRequired2MethodMultiRequiredPayloadAFlag = serviceMultiRequired2MethodMultiRequiredPayloadFlags.String("a", "REQUIRED", "")
    )
    serviceMultiRequired1Flags.Usage = serviceMultiRequired1Usage
    serviceMultiRequired1MethodMultiRequiredPayloadFlags.Usage = serviceMultiRequired1MethodMultiRequiredPayloadUsage

    serviceMultiRequired2Flags.Usage = serviceMultiRequired2Usage
    serviceMultiRequired2MethodMultiRequiredNoPayloadFlags.Usage = serviceMultiRequired2MethodMultiRequiredNoPayloadUsage
    serviceMultiRequired2MethodMultiRequiredPayloadFlags.Usage = serviceMultiRequired2MethodMultiRequiredPayloadUsage

    if err := flag.CommandLine.Parse(os.Args[1:]); err != nil {
        return nil, nil, err
    }

    if len(os.Args) < flag.NFlag()+3 {
        return nil, nil, fmt.Errorf("not enough arguments")
    }

    var (
        svcn string
        svcf *flag.FlagSet
    )
    {
        svcn = os.Args[1+flag.NFlag()]
        switch svcn {
        case "service-multi-required1":
            svcf = serviceMultiRequired1Flags
        case "service-multi-required2":
            svcf = serviceMultiRequired2Flags
        default:
            return nil, nil, fmt.Errorf("unknown service %q", svcn)
        }
    }
    if err := svcf.Parse(os.Args[2+flag.NFlag():]); err != nil {
        return nil, nil, err
    }

    var (
        epn string
        epf *flag.FlagSet
    )
    {
        epn = os.Args[2+flag.NFlag()+svcf.NFlag()]
        switch svcn {
        case "service-multi-required1":
            switch epn {
            case "method-multi-required-payload":
                epf = serviceMultiRequired1MethodMultiRequiredPayloadFlags

            }

        case "service-multi-required2":
            switch epn {
            case "method-multi-required-no-payload":
                epf = serviceMultiRequired2MethodMultiRequiredNoPayloadFlags

            case "method-multi-required-payload":
                epf = serviceMultiRequired2MethodMultiRequiredPayloadFlags

            }

        }
    }
    if epf == nil {
        return nil, nil, fmt.Errorf("unknown %q endpoint %q", svcn, epn)
    }

    // Parse endpoint flags if any
    if len(os.Args) > 2+flag.NFlag()+svcf.NFlag() {
        if err := epf.Parse(os.Args[3+flag.NFlag()+svcf.NFlag():]); err != nil {
            return nil, nil, err
        }
    }

    var (
        data     interface{}
        endpoint goa.Endpoint
        err      error
    )
    {
        switch svcn {
        case "service-multi-required1":
            c := servicemultirequired1c.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-multi-required-payload":
                endpoint = c.MethodMultiRequiredPayload()
                data, err = servicemultirequired1c.BuildMethodMultiRequiredPayloadPayload(*serviceMultiRequired1MethodMultiRequiredPayloadBodyFlag)
            }
        case "service-multi-required2":
            c := servicemultirequired2c.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-multi-required-no-payload":
                endpoint = c.MethodMultiRequiredNoPayload()
                data = nil
            case "method-multi-required-payload":
                endpoint = c.MethodMultiRequiredPayload()
                data, err = servicemultirequired2c.BuildMethodMultiRequiredPayloadPayload(*serviceMultiRequired2MethodMultiRequiredPayloadAFlag)
            }
        }
    }
    if err != nil {
        return nil, nil, err
    }

    return endpoint, data, nil
}
`
```
``` go
var MultiSimpleBuildCode = `// BuildMethodMultiSimplePayloadPayload builds the payload for the
// ServiceMultiSimple1 MethodMultiSimplePayload endpoint from CLI flags.
func BuildMethodMultiSimplePayloadPayload(serviceMultiSimple1MethodMultiSimplePayloadBody string) (*servicemultisimple1.MethodMultiSimplePayloadPayload, error) {
    var err error
    var body MethodMultiSimplePayloadRequestBody
    {
        err = json.Unmarshal([]byte(serviceMultiSimple1MethodMultiSimplePayloadBody), &body)
        if err != nil {
            return nil, fmt.Errorf("invalid JSON for body, example of valid JSON:\n%s", "'{\n      \"a\": false\n   }'")
        }
    }
    if err != nil {
        return nil, err
    }
    v := &servicemultisimple1.MethodMultiSimplePayloadPayload{
        A: body.A,
    }
    return v, nil
}
`
```
``` go
var MultiSimpleDSL = func() {
    Service("ServiceMultiSimple1", func() {
        Method("MethodMultiSimpleNoPayload", func() {
            HTTP(func() {
                GET("/")
            })
        })
        Method("MethodMultiSimplePayload", func() {
            Payload(func() {
                Attribute("a", Boolean)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
    Service("ServiceMultiSimple2", func() {
        Method("MethodMultiSimpleNoPayload", func() {
            HTTP(func() {
                GET("/2")
            })
        })
        Method("MethodMultiSimplePayload", func() {
            Payload(func() {
                Attribute("a", Boolean)
            })
            HTTP(func() {
                POST("/2")
            })
        })
    })
}
```
``` go
var MultiSimpleParseCode = `// ParseEndpoint returns the endpoint and payload as specified on the command
// line.
func ParseEndpoint(
    scheme, host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restore bool,
) (goa.Endpoint, interface{}, error) {
    var (
        serviceMultiSimple1Flags = flag.NewFlagSet("service-multi-simple1", flag.ContinueOnError)

        serviceMultiSimple1MethodMultiSimpleNoPayloadFlags = flag.NewFlagSet("method-multi-simple-no-payload", flag.ExitOnError)

        serviceMultiSimple1MethodMultiSimplePayloadFlags    = flag.NewFlagSet("method-multi-simple-payload", flag.ExitOnError)
        serviceMultiSimple1MethodMultiSimplePayloadBodyFlag = serviceMultiSimple1MethodMultiSimplePayloadFlags.String("body", "REQUIRED", "")

        serviceMultiSimple2Flags = flag.NewFlagSet("service-multi-simple2", flag.ContinueOnError)

        serviceMultiSimple2MethodMultiSimpleNoPayloadFlags = flag.NewFlagSet("method-multi-simple-no-payload", flag.ExitOnError)

        serviceMultiSimple2MethodMultiSimplePayloadFlags    = flag.NewFlagSet("method-multi-simple-payload", flag.ExitOnError)
        serviceMultiSimple2MethodMultiSimplePayloadBodyFlag = serviceMultiSimple2MethodMultiSimplePayloadFlags.String("body", "REQUIRED", "")
    )
    serviceMultiSimple1Flags.Usage = serviceMultiSimple1Usage
    serviceMultiSimple1MethodMultiSimpleNoPayloadFlags.Usage = serviceMultiSimple1MethodMultiSimpleNoPayloadUsage
    serviceMultiSimple1MethodMultiSimplePayloadFlags.Usage = serviceMultiSimple1MethodMultiSimplePayloadUsage

    serviceMultiSimple2Flags.Usage = serviceMultiSimple2Usage
    serviceMultiSimple2MethodMultiSimpleNoPayloadFlags.Usage = serviceMultiSimple2MethodMultiSimpleNoPayloadUsage
    serviceMultiSimple2MethodMultiSimplePayloadFlags.Usage = serviceMultiSimple2MethodMultiSimplePayloadUsage

    if err := flag.CommandLine.Parse(os.Args[1:]); err != nil {
        return nil, nil, err
    }

    if len(os.Args) < flag.NFlag()+3 {
        return nil, nil, fmt.Errorf("not enough arguments")
    }

    var (
        svcn string
        svcf *flag.FlagSet
    )
    {
        svcn = os.Args[1+flag.NFlag()]
        switch svcn {
        case "service-multi-simple1":
            svcf = serviceMultiSimple1Flags
        case "service-multi-simple2":
            svcf = serviceMultiSimple2Flags
        default:
            return nil, nil, fmt.Errorf("unknown service %q", svcn)
        }
    }
    if err := svcf.Parse(os.Args[2+flag.NFlag():]); err != nil {
        return nil, nil, err
    }

    var (
        epn string
        epf *flag.FlagSet
    )
    {
        epn = os.Args[2+flag.NFlag()+svcf.NFlag()]
        switch svcn {
        case "service-multi-simple1":
            switch epn {
            case "method-multi-simple-no-payload":
                epf = serviceMultiSimple1MethodMultiSimpleNoPayloadFlags

            case "method-multi-simple-payload":
                epf = serviceMultiSimple1MethodMultiSimplePayloadFlags

            }

        case "service-multi-simple2":
            switch epn {
            case "method-multi-simple-no-payload":
                epf = serviceMultiSimple2MethodMultiSimpleNoPayloadFlags

            case "method-multi-simple-payload":
                epf = serviceMultiSimple2MethodMultiSimplePayloadFlags

            }

        }
    }
    if epf == nil {
        return nil, nil, fmt.Errorf("unknown %q endpoint %q", svcn, epn)
    }

    // Parse endpoint flags if any
    if len(os.Args) > 2+flag.NFlag()+svcf.NFlag() {
        if err := epf.Parse(os.Args[3+flag.NFlag()+svcf.NFlag():]); err != nil {
            return nil, nil, err
        }
    }

    var (
        data     interface{}
        endpoint goa.Endpoint
        err      error
    )
    {
        switch svcn {
        case "service-multi-simple1":
            c := servicemultisimple1c.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-multi-simple-no-payload":
                endpoint = c.MethodMultiSimpleNoPayload()
                data = nil
            case "method-multi-simple-payload":
                endpoint = c.MethodMultiSimplePayload()
                data, err = servicemultisimple1c.BuildMethodMultiSimplePayloadPayload(*serviceMultiSimple1MethodMultiSimplePayloadBodyFlag)
            }
        case "service-multi-simple2":
            c := servicemultisimple2c.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-multi-simple-no-payload":
                endpoint = c.MethodMultiSimpleNoPayload()
                data = nil
            case "method-multi-simple-payload":
                endpoint = c.MethodMultiSimplePayload()
                data, err = servicemultisimple2c.BuildMethodMultiSimplePayloadPayload(*serviceMultiSimple2MethodMultiSimplePayloadBodyFlag)
            }
        }
    }
    if err != nil {
        return nil, nil, err
    }

    return endpoint, data, nil
}
`
```
``` go
var MultipartArrayTypeDecoderFuncCode = `// NewServiceMultipartArrayTypeMethodMultipartArrayTypeDecoder returns a
// decoder to decode the multipart request for the "ServiceMultipartArrayType"
// service "MethodMultipartArrayType" endpoint.
func NewServiceMultipartArrayTypeMethodMultipartArrayTypeDecoder(mux goahttp.Muxer, ServiceMultipartArrayTypeMethodMultipartArrayTypeDecoderFn ServiceMultipartArrayTypeMethodMultipartArrayTypeDecoderFunc) func(r *http.Request) goahttp.Decoder {
    return func(r *http.Request) goahttp.Decoder {
        return goahttp.EncodingFunc(func(v interface{}) error {
            mr, merr := r.MultipartReader()
            if merr != nil {
                return merr
            }
            p := v.(*[]*servicemultipartarraytype.PayloadType)
            if err := ServiceMultipartArrayTypeMethodMultipartArrayTypeDecoderFn(mr, p); err != nil {
                return err
            }
            return nil
        })
    }
}
`
```
``` go
var MultipartArrayTypeDecoderFuncTypeCode = `// ServiceMultipartArrayTypeMethodMultipartArrayTypeDecoderFunc is the type to
// decode multipart request for the "ServiceMultipartArrayType" service
// "MethodMultipartArrayType" endpoint.
type ServiceMultipartArrayTypeMethodMultipartArrayTypeDecoderFunc func(*multipart.Reader, *[]*servicemultipartarraytype.PayloadType) error
`
```
``` go
var MultipartArrayTypeEncoderFuncCode = `// NewServiceMultipartArrayTypeMethodMultipartArrayTypeEncoder returns an
// encoder to encode the multipart request for the "ServiceMultipartArrayType"
// service "MethodMultipartArrayType" endpoint.
func NewServiceMultipartArrayTypeMethodMultipartArrayTypeEncoder(encoderFn ServiceMultipartArrayTypeMethodMultipartArrayTypeEncoderFunc) func(r *http.Request) goahttp.Encoder {
    return func(r *http.Request) goahttp.Encoder {
        body := &bytes.Buffer{}
        mw := multipart.NewWriter(body)
        return goahttp.EncodingFunc(func(v interface{}) error {
            p := v.([]*servicemultipartarraytype.PayloadType)
            if err := encoderFn(mw, p); err != nil {
                return err
            }
            r.Body = ioutil.NopCloser(body)
            r.Header.Set("Content-Type", mw.FormDataContentType())
            return mw.Close()
        })
    }
}
`
```
``` go
var MultipartArrayTypeEncoderFuncTypeCode = `// ServiceMultipartArrayTypeMethodMultipartArrayTypeEncoderFunc is the type to
// encode multipart request for the "ServiceMultipartArrayType" service
// "MethodMultipartArrayType" endpoint.
type ServiceMultipartArrayTypeMethodMultipartArrayTypeEncoderFunc func(*multipart.Writer, []*servicemultipartarraytype.PayloadType) error
`
```
``` go
var MultipartMapTypeDecoderFuncCode = `// NewServiceMultipartMapTypeMethodMultipartMapTypeDecoder returns a decoder to
// decode the multipart request for the "ServiceMultipartMapType" service
// "MethodMultipartMapType" endpoint.
func NewServiceMultipartMapTypeMethodMultipartMapTypeDecoder(mux goahttp.Muxer, ServiceMultipartMapTypeMethodMultipartMapTypeDecoderFn ServiceMultipartMapTypeMethodMultipartMapTypeDecoderFunc) func(r *http.Request) goahttp.Decoder {
    return func(r *http.Request) goahttp.Decoder {
        return goahttp.EncodingFunc(func(v interface{}) error {
            mr, merr := r.MultipartReader()
            if merr != nil {
                return merr
            }
            p := v.(*map[string]int)
            if err := ServiceMultipartMapTypeMethodMultipartMapTypeDecoderFn(mr, p); err != nil {
                return err
            }
            return nil
        })
    }
}
`
```
``` go
var MultipartMapTypeDecoderFuncTypeCode = `// ServiceMultipartMapTypeMethodMultipartMapTypeDecoderFunc is the type to
// decode multipart request for the "ServiceMultipartMapType" service
// "MethodMultipartMapType" endpoint.
type ServiceMultipartMapTypeMethodMultipartMapTypeDecoderFunc func(*multipart.Reader, *map[string]int) error
`
```
``` go
var MultipartMapTypeEncoderFuncCode = `// NewServiceMultipartMapTypeMethodMultipartMapTypeEncoder returns an encoder
// to encode the multipart request for the "ServiceMultipartMapType" service
// "MethodMultipartMapType" endpoint.
func NewServiceMultipartMapTypeMethodMultipartMapTypeEncoder(encoderFn ServiceMultipartMapTypeMethodMultipartMapTypeEncoderFunc) func(r *http.Request) goahttp.Encoder {
    return func(r *http.Request) goahttp.Encoder {
        body := &bytes.Buffer{}
        mw := multipart.NewWriter(body)
        return goahttp.EncodingFunc(func(v interface{}) error {
            p := v.(map[string]int)
            if err := encoderFn(mw, p); err != nil {
                return err
            }
            r.Body = ioutil.NopCloser(body)
            r.Header.Set("Content-Type", mw.FormDataContentType())
            return mw.Close()
        })
    }
}
`
```
``` go
var MultipartMapTypeEncoderFuncTypeCode = `// ServiceMultipartMapTypeMethodMultipartMapTypeEncoderFunc is the type to
// encode multipart request for the "ServiceMultipartMapType" service
// "MethodMultipartMapType" endpoint.
type ServiceMultipartMapTypeMethodMultipartMapTypeEncoderFunc func(*multipart.Writer, map[string]int) error
`
```
``` go
var MultipartPrimitiveDecoderFuncCode = `// NewServiceMultipartPrimitiveMethodMultipartPrimitiveDecoder returns a
// decoder to decode the multipart request for the "ServiceMultipartPrimitive"
// service "MethodMultipartPrimitive" endpoint.
func NewServiceMultipartPrimitiveMethodMultipartPrimitiveDecoder(mux goahttp.Muxer, ServiceMultipartPrimitiveMethodMultipartPrimitiveDecoderFn ServiceMultipartPrimitiveMethodMultipartPrimitiveDecoderFunc) func(r *http.Request) goahttp.Decoder {
    return func(r *http.Request) goahttp.Decoder {
        return goahttp.EncodingFunc(func(v interface{}) error {
            mr, merr := r.MultipartReader()
            if merr != nil {
                return merr
            }
            p := v.(*string)
            if err := ServiceMultipartPrimitiveMethodMultipartPrimitiveDecoderFn(mr, p); err != nil {
                return err
            }
            return nil
        })
    }
}
`
```
``` go
var MultipartPrimitiveDecoderFuncTypeCode = `// ServiceMultipartPrimitiveMethodMultipartPrimitiveDecoderFunc is the type to
// decode multipart request for the "ServiceMultipartPrimitive" service
// "MethodMultipartPrimitive" endpoint.
type ServiceMultipartPrimitiveMethodMultipartPrimitiveDecoderFunc func(*multipart.Reader, *string) error
`
```
``` go
var MultipartPrimitiveEncoderFuncCode = `// NewServiceMultipartPrimitiveMethodMultipartPrimitiveEncoder returns an
// encoder to encode the multipart request for the "ServiceMultipartPrimitive"
// service "MethodMultipartPrimitive" endpoint.
func NewServiceMultipartPrimitiveMethodMultipartPrimitiveEncoder(encoderFn ServiceMultipartPrimitiveMethodMultipartPrimitiveEncoderFunc) func(r *http.Request) goahttp.Encoder {
    return func(r *http.Request) goahttp.Encoder {
        body := &bytes.Buffer{}
        mw := multipart.NewWriter(body)
        return goahttp.EncodingFunc(func(v interface{}) error {
            p := v.(string)
            if err := encoderFn(mw, p); err != nil {
                return err
            }
            r.Body = ioutil.NopCloser(body)
            r.Header.Set("Content-Type", mw.FormDataContentType())
            return mw.Close()
        })
    }
}
`
```
``` go
var MultipartPrimitiveEncoderFuncTypeCode = `// ServiceMultipartPrimitiveMethodMultipartPrimitiveEncoderFunc is the type to
// encode multipart request for the "ServiceMultipartPrimitive" service
// "MethodMultipartPrimitive" endpoint.
type ServiceMultipartPrimitiveMethodMultipartPrimitiveEncoderFunc func(*multipart.Writer, string) error
`
```
``` go
var MultipartUserTypeDecoderFuncCode = `// NewServiceMultipartUserTypeMethodMultipartUserTypeDecoder returns a decoder
// to decode the multipart request for the "ServiceMultipartUserType" service
// "MethodMultipartUserType" endpoint.
func NewServiceMultipartUserTypeMethodMultipartUserTypeDecoder(mux goahttp.Muxer, ServiceMultipartUserTypeMethodMultipartUserTypeDecoderFn ServiceMultipartUserTypeMethodMultipartUserTypeDecoderFunc) func(r *http.Request) goahttp.Decoder {
    return func(r *http.Request) goahttp.Decoder {
        return goahttp.EncodingFunc(func(v interface{}) error {
            mr, merr := r.MultipartReader()
            if merr != nil {
                return merr
            }
            p := v.(**servicemultipartusertype.MethodMultipartUserTypePayload)
            if err := ServiceMultipartUserTypeMethodMultipartUserTypeDecoderFn(mr, p); err != nil {
                return err
            }
            return nil
        })
    }
}
`
```
``` go
var MultipartUserTypeDecoderFuncTypeCode = `// ServiceMultipartUserTypeMethodMultipartUserTypeDecoderFunc is the type to
// decode multipart request for the "ServiceMultipartUserType" service
// "MethodMultipartUserType" endpoint.
type ServiceMultipartUserTypeMethodMultipartUserTypeDecoderFunc func(*multipart.Reader, **servicemultipartusertype.MethodMultipartUserTypePayload) error
`
```
``` go
var MultipartUserTypeEncoderFuncCode = `// NewServiceMultipartUserTypeMethodMultipartUserTypeEncoder returns an encoder
// to encode the multipart request for the "ServiceMultipartUserType" service
// "MethodMultipartUserType" endpoint.
func NewServiceMultipartUserTypeMethodMultipartUserTypeEncoder(encoderFn ServiceMultipartUserTypeMethodMultipartUserTypeEncoderFunc) func(r *http.Request) goahttp.Encoder {
    return func(r *http.Request) goahttp.Encoder {
        body := &bytes.Buffer{}
        mw := multipart.NewWriter(body)
        return goahttp.EncodingFunc(func(v interface{}) error {
            p := v.(*servicemultipartusertype.MethodMultipartUserTypePayload)
            if err := encoderFn(mw, p); err != nil {
                return err
            }
            r.Body = ioutil.NopCloser(body)
            r.Header.Set("Content-Type", mw.FormDataContentType())
            return mw.Close()
        })
    }
}
`
```
``` go
var MultipartUserTypeEncoderFuncTypeCode = `// ServiceMultipartUserTypeMethodMultipartUserTypeEncoderFunc is the type to
// encode multipart request for the "ServiceMultipartUserType" service
// "MethodMultipartUserType" endpoint.
type ServiceMultipartUserTypeMethodMultipartUserTypeEncoderFunc func(*multipart.Writer, *servicemultipartusertype.MethodMultipartUserTypePayload) error
`
```
``` go
var MultipartWithParamDecoderFuncCode = `// NewServiceMultipartWithParamMethodMultipartWithParamDecoder returns a
// decoder to decode the multipart request for the "ServiceMultipartWithParam"
// service "MethodMultipartWithParam" endpoint.
func NewServiceMultipartWithParamMethodMultipartWithParamDecoder(mux goahttp.Muxer, ServiceMultipartWithParamMethodMultipartWithParamDecoderFn ServiceMultipartWithParamMethodMultipartWithParamDecoderFunc) func(r *http.Request) goahttp.Decoder {
    return func(r *http.Request) goahttp.Decoder {
        return goahttp.EncodingFunc(func(v interface{}) error {
            mr, merr := r.MultipartReader()
            if merr != nil {
                return merr
            }
            p := v.(**servicemultipartwithparam.PayloadType)
            if err := ServiceMultipartWithParamMethodMultipartWithParamDecoderFn(mr, p); err != nil {
                return err
            }

            var (
                c   map[int][]string
                err error
            )
            {
                cRaw := r.URL.Query()
                if len(cRaw) == 0 {
                    err = goa.MergeErrors(err, goa.MissingFieldError("c", "query string"))
                }
                c = make(map[int][]string, len(cRaw))
                for keyRaw, val := range cRaw {
                    var key int
                    {
                        v, err2 := strconv.ParseInt(keyRaw, 10, strconv.IntSize)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "integer"))
                        }
                        key = int(v)
                    }
                    c[key] = val
                }
            }
            if err != nil {
                return err
            }
            (*p).C = c
            return nil
        })
    }
}
`
```
``` go
var MultipartWithParamEncoderFuncCode = `// NewServiceMultipartWithParamMethodMultipartWithParamEncoder returns an
// encoder to encode the multipart request for the "ServiceMultipartWithParam"
// service "MethodMultipartWithParam" endpoint.
func NewServiceMultipartWithParamMethodMultipartWithParamEncoder(encoderFn ServiceMultipartWithParamMethodMultipartWithParamEncoderFunc) func(r *http.Request) goahttp.Encoder {
    return func(r *http.Request) goahttp.Encoder {
        body := &bytes.Buffer{}
        mw := multipart.NewWriter(body)
        return goahttp.EncodingFunc(func(v interface{}) error {
            p := v.(*servicemultipartwithparam.PayloadType)
            if err := encoderFn(mw, p); err != nil {
                return err
            }
            r.Body = ioutil.NopCloser(body)
            r.Header.Set("Content-Type", mw.FormDataContentType())
            return mw.Close()
        })
    }
}
`
```
``` go
var MultipartWithParamsAndHeadersDecoderFuncCode = `// NewServiceMultipartWithParamsAndHeadersMethodMultipartWithParamsAndHeadersDecoder
// returns a decoder to decode the multipart request for the
// "ServiceMultipartWithParamsAndHeaders" service
// "MethodMultipartWithParamsAndHeaders" endpoint.
func NewServiceMultipartWithParamsAndHeadersMethodMultipartWithParamsAndHeadersDecoder(mux goahttp.Muxer, ServiceMultipartWithParamsAndHeadersMethodMultipartWithParamsAndHeadersDecoderFn ServiceMultipartWithParamsAndHeadersMethodMultipartWithParamsAndHeadersDecoderFunc) func(r *http.Request) goahttp.Decoder {
    return func(r *http.Request) goahttp.Decoder {
        return goahttp.EncodingFunc(func(v interface{}) error {
            mr, merr := r.MultipartReader()
            if merr != nil {
                return merr
            }
            p := v.(**servicemultipartwithparamsandheaders.PayloadType)
            if err := ServiceMultipartWithParamsAndHeadersMethodMultipartWithParamsAndHeadersDecoderFn(mr, p); err != nil {
                return err
            }
            var (
                a   string
                c   map[int][]string
                b   *string
                err error

                params = mux.Vars(r)
            )
            a = params["a"]
            err = goa.MergeErrors(err, goa.ValidatePattern("a", a, "patterna"))
            {
                cRaw := r.URL.Query()
                if len(cRaw) == 0 {
                    err = goa.MergeErrors(err, goa.MissingFieldError("c", "query string"))
                }
                c = make(map[int][]string, len(cRaw))
                for keyRaw, val := range cRaw {
                    var key int
                    {
                        v, err2 := strconv.ParseInt(keyRaw, 10, strconv.IntSize)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "integer"))
                        }
                        key = int(v)
                    }
                    c[key] = val
                }
            }
            bRaw := r.Header.Get("Authorization")
            if bRaw != "" {
                b = &bRaw
            }
            if b != nil {
                err = goa.MergeErrors(err, goa.ValidatePattern("b", *b, "patternb"))
            }
            if err != nil {
                return err
            }
            (*p).A = a
            (*p).C = c
            (*p).B = b
            return nil
        })
    }
}
`
```
``` go
var MultipartWithParamsAndHeadersEncoderFuncCode = `// NewServiceMultipartWithParamsAndHeadersMethodMultipartWithParamsAndHeadersEncoder
// returns an encoder to encode the multipart request for the
// "ServiceMultipartWithParamsAndHeaders" service
// "MethodMultipartWithParamsAndHeaders" endpoint.
func NewServiceMultipartWithParamsAndHeadersMethodMultipartWithParamsAndHeadersEncoder(encoderFn ServiceMultipartWithParamsAndHeadersMethodMultipartWithParamsAndHeadersEncoderFunc) func(r *http.Request) goahttp.Encoder {
    return func(r *http.Request) goahttp.Encoder {
        body := &bytes.Buffer{}
        mw := multipart.NewWriter(body)
        return goahttp.EncodingFunc(func(v interface{}) error {
            p := v.(*servicemultipartwithparamsandheaders.PayloadType)
            if err := encoderFn(mw, p); err != nil {
                return err
            }
            r.Body = ioutil.NopCloser(body)
            r.Header.Set("Content-Type", mw.FormDataContentType())
            return mw.Close()
        })
    }
}
`
```
``` go
var PathAlternativesCode = `// MethodPathAlternativesServicePathAlternativesPath returns the URL path to the ServicePathAlternatives service MethodPathAlternatives HTTP endpoint.
func MethodPathAlternativesServicePathAlternativesPath(a string, b string) string {
    return fmt.Sprintf("/one/%v/two/%v/three", a, b)
}

// MethodPathAlternativesServicePathAlternativesPath2 returns the URL path to the ServicePathAlternatives service MethodPathAlternatives HTTP endpoint.
func MethodPathAlternativesServicePathAlternativesPath2(b string, a string) string {
    return fmt.Sprintf("/one/two/%v/three/%v", b, a)
}
`
```
``` go
var PathAlternativesDSL = func() {
    Service("ServicePathAlternatives", func() {
        Method("MethodPathAlternatives", func() {
            Payload(func() {
                Attribute("a", String)
                Attribute("b", String)
            })
            HTTP(func() {
                GET("one/{a}/two/{b}/three")
                POST("one/two/{b}/three/{a}")
            })
        })
    })
}
```
``` go
var PathBoolSliceParamCode = `// MethodPathBoolSliceParamServicePathBoolSliceParamPath returns the URL path to the ServicePathBoolSliceParam service MethodPathBoolSliceParam HTTP endpoint.
func MethodPathBoolSliceParamServicePathBoolSliceParamPath(a []bool) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatBool(v)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathBoolSliceParamDSL = func() {
    Service("ServicePathBoolSliceParam", func() {
        Method("MethodPathBoolSliceParam", func() {
            Payload(ArrayOf(Boolean))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathFloat32SliceParamCode = `// MethodPathFloat32SliceParamServicePathFloat32SliceParamPath returns the URL path to the ServicePathFloat32SliceParam service MethodPathFloat32SliceParam HTTP endpoint.
func MethodPathFloat32SliceParamServicePathFloat32SliceParamPath(a []float32) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatFloat(float64(v), 'f', -1, 32)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathFloat32SliceParamDSL = func() {
    Service("ServicePathFloat32SliceParam", func() {
        Method("MethodPathFloat32SliceParam", func() {
            Payload(ArrayOf(Float32))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathFloat64SliceParamCode = `// MethodPathFloat64SliceParamServicePathFloat64SliceParamPath returns the URL path to the ServicePathFloat64SliceParam service MethodPathFloat64SliceParam HTTP endpoint.
func MethodPathFloat64SliceParamServicePathFloat64SliceParamPath(a []float64) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatFloat(v, 'f', -1, 64)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathFloat64SliceParamDSL = func() {
    Service("ServicePathFloat64SliceParam", func() {
        Method("MethodPathFloat64SliceParam", func() {
            Payload(ArrayOf(Float64))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathInt32SliceParamCode = `// MethodPathInt32SliceParamServicePathInt32SliceParamPath returns the URL path to the ServicePathInt32SliceParam service MethodPathInt32SliceParam HTTP endpoint.
func MethodPathInt32SliceParamServicePathInt32SliceParamPath(a []int32) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatInt(int64(v), 10)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathInt32SliceParamDSL = func() {
    Service("ServicePathInt32SliceParam", func() {
        Method("MethodPathInt32SliceParam", func() {
            Payload(ArrayOf(Int32))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathInt64SliceParamCode = `// MethodPathInt64SliceParamServicePathInt64SliceParamPath returns the URL path to the ServicePathInt64SliceParam service MethodPathInt64SliceParam HTTP endpoint.
func MethodPathInt64SliceParamServicePathInt64SliceParamPath(a []int64) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatInt(v, 10)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathInt64SliceParamDSL = func() {
    Service("ServicePathInt64SliceParam", func() {
        Method("MethodPathInt64SliceParam", func() {
            Payload(ArrayOf(Int64))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathIntSliceParamCode = `// MethodPathIntSliceParamServicePathIntSliceParamPath returns the URL path to the ServicePathIntSliceParam service MethodPathIntSliceParam HTTP endpoint.
func MethodPathIntSliceParamServicePathIntSliceParamPath(a []int) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatInt(int64(v), 10)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathIntSliceParamDSL = func() {
    Service("ServicePathIntSliceParam", func() {
        Method("MethodPathIntSliceParam", func() {
            Payload(ArrayOf(Int))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathInterfaceSliceParamCode = `// MethodPathInterfaceSliceParamServicePathInterfaceSliceParamPath returns the URL path to the ServicePathInterfaceSliceParam service MethodPathInterfaceSliceParam HTTP endpoint.
func MethodPathInterfaceSliceParamServicePathInterfaceSliceParamPath(a []interface{}) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = url.QueryEscape(fmt.Sprintf("%v", v))
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathInterfaceSliceParamDSL = func() {
    Service("ServicePathInterfaceSliceParam", func() {
        Method("MethodPathInterfaceSliceParam", func() {
            Payload(ArrayOf(Any))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathMultipleParamsCode = `// MethodPathMultipleParamServicePathMultipleParamPath returns the URL path to the ServicePathMultipleParam service MethodPathMultipleParam HTTP endpoint.
func MethodPathMultipleParamServicePathMultipleParamPath(a string, b string) string {
    return fmt.Sprintf("/one/%v/two/%v/three", a, b)
}
`
```
``` go
var PathMultipleParamsDSL = func() {
    Service("ServicePathMultipleParam", func() {
        Method("MethodPathMultipleParam", func() {
            Payload(func() {
                Attribute("a", String)
                Attribute("b", String)
            })
            HTTP(func() {
                GET("one/{a}/two/{b}/three")
            })
        })
    })
}
```
``` go
var PathNoParamCode = `// MethodPathNoParamServicePathNoParamPath returns the URL path to the ServicePathNoParam service MethodPathNoParam HTTP endpoint.
func MethodPathNoParamServicePathNoParamPath() string {
    return "/one/two"
}
`
```
``` go
var PathNoParamDSL = func() {
    Service("ServicePathNoParam", func() {
        Method("MethodPathNoParam", func() {
            HTTP(func() {
                GET("/one/two")
            })
        })
    })
}
```
``` go
var PathOneParamCode = `// MethodPathOneParamServicePathOneParamPath returns the URL path to the ServicePathOneParam service MethodPathOneParam HTTP endpoint.
func MethodPathOneParamServicePathOneParamPath(a string) string {
    return fmt.Sprintf("/one/%v/two", a)
}
`
```
``` go
var PathOneParamDSL = func() {
    Service("ServicePathOneParam", func() {
        Method("MethodPathOneParam", func() {
            Payload(String)
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathStringSliceParamCode = `// MethodPathStringSliceParamServicePathStringSliceParamPath returns the URL path to the ServicePathStringSliceParam service MethodPathStringSliceParam HTTP endpoint.
func MethodPathStringSliceParamServicePathStringSliceParamPath(a []string) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = url.QueryEscape(v)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathStringSliceParamDSL = func() {
    Service("ServicePathStringSliceParam", func() {
        Method("MethodPathStringSliceParam", func() {
            Payload(ArrayOf(String))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathUint32SliceParamCode = `// MethodPathUint32SliceParamServicePathUint32SliceParamPath returns the URL path to the ServicePathUint32SliceParam service MethodPathUint32SliceParam HTTP endpoint.
func MethodPathUint32SliceParamServicePathUint32SliceParamPath(a []uint32) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatUint(uint64(v), 10)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathUint32SliceParamDSL = func() {
    Service("ServicePathUint32SliceParam", func() {
        Method("MethodPathUint32SliceParam", func() {
            Payload(ArrayOf(UInt32))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathUint64SliceParamCode = `// MethodPathUint64SliceParamServicePathUint64SliceParamPath returns the URL path to the ServicePathUint64SliceParam service MethodPathUint64SliceParam HTTP endpoint.
func MethodPathUint64SliceParamServicePathUint64SliceParamPath(a []uint64) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatUint(v, 10)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathUint64SliceParamDSL = func() {
    Service("ServicePathUint64SliceParam", func() {
        Method("MethodPathUint64SliceParam", func() {
            Payload(ArrayOf(UInt64))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PathUintSliceParamCode = `// MethodPathUintSliceParamServicePathUintSliceParamPath returns the URL path to the ServicePathUintSliceParam service MethodPathUintSliceParam HTTP endpoint.
func MethodPathUintSliceParamServicePathUintSliceParamPath(a []uint) string {
    aSlice := make([]string, len(a))
    for i, v := range a {
        aSlice[i] = strconv.FormatUint(uint64(v), 10)
    }
    return fmt.Sprintf("/one/%v/two", strings.Join(aSlice, ", "))
}
`
```
``` go
var PathUintSliceParamDSL = func() {
    Service("ServicePathUintSliceParam", func() {
        Method("MethodPathUintSliceParam", func() {
            Payload(ArrayOf(UInt))
            HTTP(func() {
                GET("one/{a}/two")
            })
        })
    })
}
```
``` go
var PayloadArrayPrimitiveTypeParseCode = `// ParseEndpoint returns the endpoint and payload as specified on the command
// line.
func ParseEndpoint(
    scheme, host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restore bool,
) (goa.Endpoint, interface{}, error) {
    var (
        serviceBodyPrimitiveArrayStringValidateFlags = flag.NewFlagSet("service-body-primitive-array-string-validate", flag.ContinueOnError)

        serviceBodyPrimitiveArrayStringValidateMethodBodyPrimitiveArrayStringValidateFlags = flag.NewFlagSet("method-body-primitive-array-string-validate", flag.ExitOnError)
        serviceBodyPrimitiveArrayStringValidateMethodBodyPrimitiveArrayStringValidatePFlag = serviceBodyPrimitiveArrayStringValidateMethodBodyPrimitiveArrayStringValidateFlags.String("p", "REQUIRED", "[]string is the payload type of the ServiceBodyPrimitiveArrayStringValidate service MethodBodyPrimitiveArrayStringValidate method.")
    )
    serviceBodyPrimitiveArrayStringValidateFlags.Usage = serviceBodyPrimitiveArrayStringValidateUsage
    serviceBodyPrimitiveArrayStringValidateMethodBodyPrimitiveArrayStringValidateFlags.Usage = serviceBodyPrimitiveArrayStringValidateMethodBodyPrimitiveArrayStringValidateUsage

    if err := flag.CommandLine.Parse(os.Args[1:]); err != nil {
        return nil, nil, err
    }

    if len(os.Args) < flag.NFlag()+3 {
        return nil, nil, fmt.Errorf("not enough arguments")
    }

    var (
        svcn string
        svcf *flag.FlagSet
    )
    {
        svcn = os.Args[1+flag.NFlag()]
        switch svcn {
        case "service-body-primitive-array-string-validate":
            svcf = serviceBodyPrimitiveArrayStringValidateFlags
        default:
            return nil, nil, fmt.Errorf("unknown service %q", svcn)
        }
    }
    if err := svcf.Parse(os.Args[2+flag.NFlag():]); err != nil {
        return nil, nil, err
    }

    var (
        epn string
        epf *flag.FlagSet
    )
    {
        epn = os.Args[2+flag.NFlag()+svcf.NFlag()]
        switch svcn {
        case "service-body-primitive-array-string-validate":
            switch epn {
            case "method-body-primitive-array-string-validate":
                epf = serviceBodyPrimitiveArrayStringValidateMethodBodyPrimitiveArrayStringValidateFlags

            }

        }
    }
    if epf == nil {
        return nil, nil, fmt.Errorf("unknown %q endpoint %q", svcn, epn)
    }

    // Parse endpoint flags if any
    if len(os.Args) > 2+flag.NFlag()+svcf.NFlag() {
        if err := epf.Parse(os.Args[3+flag.NFlag()+svcf.NFlag():]); err != nil {
            return nil, nil, err
        }
    }

    var (
        data     interface{}
        endpoint goa.Endpoint
        err      error
    )
    {
        switch svcn {
        case "service-body-primitive-array-string-validate":
            c := servicebodyprimitivearraystringvalidatec.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-body-primitive-array-string-validate":
                endpoint = c.MethodBodyPrimitiveArrayStringValidate()
                var err error
                var val []string
                err = json.Unmarshal([]byte(*serviceBodyPrimitiveArrayStringValidateMethodBodyPrimitiveArrayStringValidatePFlag), &val)
                data = val
                if err != nil {
                    return nil, nil, fmt.Errorf("invalid JSON for serviceBodyPrimitiveArrayStringValidateMethodBodyPrimitiveArrayStringValidatePFlag, example of valid JSON:\n%s", "'[\n      \"val\",\n      \"val\",\n      \"val\"\n   ]'")
                }
            }
        }
    }
    if err != nil {
        return nil, nil, err
    }

    return endpoint, data, nil
}
`
```
``` go
var PayloadArrayUserTypeBuildCode = `// BuildMethodBodyInlineArrayUserPayload builds the payload for the
// ServiceBodyInlineArrayUser MethodBodyInlineArrayUser endpoint from CLI flags.
func BuildMethodBodyInlineArrayUserPayload(serviceBodyInlineArrayUserMethodBodyInlineArrayUserBody string) ([]*servicebodyinlinearrayuser.ElemType, error) {
    var err error
    var body []*ElemTypeRequestBody
    {
        err = json.Unmarshal([]byte(serviceBodyInlineArrayUserMethodBodyInlineArrayUserBody), &body)
        if err != nil {
            return nil, fmt.Errorf("invalid JSON for body, example of valid JSON:\n%s", "'[\n      {\n         \"a\": \"patterna\",\n         \"b\": \"patternb\"\n      },\n      {\n         \"a\": \"patterna\",\n         \"b\": \"patternb\"\n      }\n   ]'")
        }
    }
    if err != nil {
        return nil, err
    }
    v := make([]*servicebodyinlinearrayuser.ElemType, len(body))
    for i, val := range body {
        v[i] = &servicebodyinlinearrayuser.ElemType{
            A: val.A,
            B: val.B,
        }
    }
    return v, nil
}
`
```
``` go
var PayloadBodyArrayStringDSL = func() {
    Service("ServiceBodyArrayString", func() {
        Method("MethodBodyArrayString", func() {
            Payload(func() {
                Attribute("b", ArrayOf(String))
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyArrayStringDecodeCode = `// DecodeMethodBodyArrayStringRequest returns a decoder for requests sent to
// the ServiceBodyArrayString MethodBodyArrayString endpoint.
func DecodeMethodBodyArrayStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyArrayStringRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        payload := NewMethodBodyArrayStringPayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyArrayStringEncodeCode = `// EncodeMethodBodyArrayStringRequest returns an encoder for requests sent to
// the ServiceBodyArrayString MethodBodyArrayString server.
func EncodeMethodBodyArrayStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyarraystring.MethodBodyArrayStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyArrayString", "MethodBodyArrayString", "*servicebodyarraystring.MethodBodyArrayStringPayload", v)
        }
        body := NewMethodBodyArrayStringRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyArrayString", "MethodBodyArrayString", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyArrayStringValidateDSL = func() {
    Service("ServiceBodyArrayStringValidate", func() {
        Method("MethodBodyArrayStringValidate", func() {
            Payload(func() {
                Attribute("b", ArrayOf(String), func() {
                    MinLength(2)
                    Elem(func() {
                        MinLength(3)
                    })
                })
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyArrayStringValidateDecodeCode = `// DecodeMethodBodyArrayStringValidateRequest returns a decoder for requests
// sent to the ServiceBodyArrayStringValidate MethodBodyArrayStringValidate
// endpoint.
func DecodeMethodBodyArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyArrayStringValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyArrayStringValidatePayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyArrayStringValidateEncodeCode = `// EncodeMethodBodyArrayStringValidateRequest returns an encoder for requests
// sent to the ServiceBodyArrayStringValidate MethodBodyArrayStringValidate
// server.
func EncodeMethodBodyArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyarraystringvalidate.MethodBodyArrayStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyArrayStringValidate", "MethodBodyArrayStringValidate", "*servicebodyarraystringvalidate.MethodBodyArrayStringValidatePayload", v)
        }
        body := NewMethodBodyArrayStringValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyArrayStringValidate", "MethodBodyArrayStringValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyArrayUserDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("apattern")
        })
    })
    Service("ServiceBodyArrayUser", func() {
        Method("MethodBodyArrayUser", func() {
            Payload(func() {
                Attribute("b", ArrayOf(PayloadType))
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyArrayUserDecodeCode = `// DecodeMethodBodyArrayUserRequest returns a decoder for requests sent to the
// ServiceBodyArrayUser MethodBodyArrayUser endpoint.
func DecodeMethodBodyArrayUserRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyArrayUserRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyArrayUserPayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyArrayUserEncodeCode = `// EncodeMethodBodyArrayUserRequest returns an encoder for requests sent to the
// ServiceBodyArrayUser MethodBodyArrayUser server.
func EncodeMethodBodyArrayUserRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyarrayuser.MethodBodyArrayUserPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyArrayUser", "MethodBodyArrayUser", "*servicebodyarrayuser.MethodBodyArrayUserPayload", v)
        }
        body := NewMethodBodyArrayUserRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyArrayUser", "MethodBodyArrayUser", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyArrayUserValidateDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("apattern")
        })
    })
    Service("ServiceBodyArrayUserValidate", func() {
        Method("MethodBodyArrayUserValidate", func() {
            Payload(func() {
                Attribute("b", ArrayOf(PayloadType), func() {
                    MinLength(2)
                })
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyArrayUserValidateDecodeCode = `// DecodeMethodBodyArrayUserValidateRequest returns a decoder for requests sent
// to the ServiceBodyArrayUserValidate MethodBodyArrayUserValidate endpoint.
func DecodeMethodBodyArrayUserValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyArrayUserValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyArrayUserValidatePayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyArrayUserValidateEncodeCode = `// EncodeMethodBodyArrayUserValidateRequest returns an encoder for requests
// sent to the ServiceBodyArrayUserValidate MethodBodyArrayUserValidate server.
func EncodeMethodBodyArrayUserValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyarrayuservalidate.MethodBodyArrayUserValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyArrayUserValidate", "MethodBodyArrayUserValidate", "*servicebodyarrayuservalidate.MethodBodyArrayUserValidatePayload", v)
        }
        body := NewMethodBodyArrayUserValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyArrayUserValidate", "MethodBodyArrayUserValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyInlineArrayUserConstructorCode = `// NewMethodBodyInlineArrayUserElemType builds a ServiceBodyInlineArrayUser
// service MethodBodyInlineArrayUser endpoint payload.
func NewMethodBodyInlineArrayUserElemType(body []*ElemTypeRequestBody) []*servicebodyinlinearrayuser.ElemType {
    v := make([]*servicebodyinlinearrayuser.ElemType, len(body))
    for i, val := range body {
        v[i] = &servicebodyinlinearrayuser.ElemType{
            A: *val.A,
            B: val.B,
        }
    }
    return v
}
`
```
``` go
var PayloadBodyInlineArrayUserDSL = func() {
    var ElemType = Type("ElemType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Required("a")
    })
    Service("ServiceBodyInlineArrayUser", func() {
        Method("MethodBodyInlineArrayUser", func() {
            Payload(ArrayOf(ElemType))
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyInlineMapUserConstructorCode = `// NewMethodBodyInlineMapUserMapKeyTypeElemType builds a
// ServiceBodyInlineMapUser service MethodBodyInlineMapUser endpoint payload.
func NewMethodBodyInlineMapUserMapKeyTypeElemType(body map[*KeyTypeRequestBody]*ElemTypeRequestBody) map[*servicebodyinlinemapuser.KeyType]*servicebodyinlinemapuser.ElemType {
    v := make(map[*servicebodyinlinemapuser.KeyType]*servicebodyinlinemapuser.ElemType, len(body))
    for key, val := range body {
        tk := &servicebodyinlinemapuser.KeyType{
            A: *key.A,
            B: key.B,
        }
        tv := &servicebodyinlinemapuser.ElemType{
            A: *val.A,
            B: val.B,
        }
        v[tk] = tv
    }
    return v
}
`
```
``` go
var PayloadBodyInlineMapUserDSL = func() {
    var KeyType = Type("KeyType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Required("a")
    })
    var ElemType = Type("ElemType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Required("a")
    })
    Service("ServiceBodyInlineMapUser", func() {
        Method("MethodBodyInlineMapUser", func() {
            Payload(MapOf(KeyType, ElemType))
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyInlineRecursiveUserConstructorCode = `// NewMethodBodyInlineRecursiveUserPayloadType builds a
// ServiceBodyInlineRecursiveUser service MethodBodyInlineRecursiveUser
// endpoint payload.
func NewMethodBodyInlineRecursiveUserPayloadType(body *MethodBodyInlineRecursiveUserRequestBody, a string, b *string) *servicebodyinlinerecursiveuser.PayloadType {
    v := &servicebodyinlinerecursiveuser.PayloadType{}
    v.C = unmarshalPayloadTypeRequestBodyToPayloadType(body.C)
    v.A = a
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyInlineRecursiveUserDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Attribute("c", "PayloadType")
        Required("a", "c")
    })

    Service("ServiceBodyInlineRecursiveUser", func() {
        Method("MethodBodyInlineRecursiveUser", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/{a}")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyInlineRecursiveUserTransformCode1 = `// unmarshalPayloadTypeRequestBodyToPayloadType builds a value of type
// *servicebodyinlinerecursiveuser.PayloadType from a value of type
// *PayloadTypeRequestBody.
func unmarshalPayloadTypeRequestBodyToPayloadType(v *PayloadTypeRequestBody) *servicebodyinlinerecursiveuser.PayloadType {
    res := &servicebodyinlinerecursiveuser.PayloadType{
        A: *v.A,
        B: v.B,
    }
    res.C = unmarshalPayloadTypeRequestBodyToPayloadType(v.C)

    return res
}
`
```
``` go
var PayloadBodyInlineRecursiveUserTransformCode2 = `// unmarshalPayloadTypeRequestBodyToPayloadType builds a value of type
// *servicebodyinlinerecursiveuser.PayloadType from a value of type
// *PayloadTypeRequestBody.
func unmarshalPayloadTypeRequestBodyToPayloadType(v *PayloadTypeRequestBody) *servicebodyinlinerecursiveuser.PayloadType {
    res := &servicebodyinlinerecursiveuser.PayloadType{
        A: *v.A,
        B: v.B,
    }
    res.C = unmarshalPayloadTypeRequestBodyToPayloadType(v.C)

    return res
}
`
```
``` go
var PayloadBodyInlineRecursiveUserTransformCodeCLI1 = `// marshalPayloadTypeRequestBodyToPayloadType builds a value of type
// *servicebodyinlinerecursiveuser.PayloadType from a value of type
// *PayloadTypeRequestBody.
func marshalPayloadTypeRequestBodyToPayloadType(v *PayloadTypeRequestBody) *servicebodyinlinerecursiveuser.PayloadType {
    res := &servicebodyinlinerecursiveuser.PayloadType{
        A: v.A,
        B: v.B,
    }
    if v.C != nil {
        res.C = marshalPayloadTypeRequestBodyToPayloadType(v.C)
    }

    return res
}
`
```
``` go
var PayloadBodyInlineRecursiveUserTransformCodeCLI2 = `// marshalPayloadTypeToPayloadTypeRequestBody builds a value of type
// *PayloadTypeRequestBody from a value of type
// *servicebodyinlinerecursiveuser.PayloadType.
func marshalPayloadTypeToPayloadTypeRequestBody(v *servicebodyinlinerecursiveuser.PayloadType) *PayloadTypeRequestBody {
    res := &PayloadTypeRequestBody{
        A: v.A,
        B: v.B,
    }
    if v.C != nil {
        res.C = marshalPayloadTypeToPayloadTypeRequestBody(v.C)
    }

    return res
}
`
```
``` go
var PayloadBodyMapStringDSL = func() {
    Service("ServiceBodyMapString", func() {
        Method("MethodBodyMapString", func() {
            Payload(func() {
                Attribute("b", MapOf(String, String))
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyMapStringDecodeCode = `// DecodeMethodBodyMapStringRequest returns a decoder for requests sent to the
// ServiceBodyMapString MethodBodyMapString endpoint.
func DecodeMethodBodyMapStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyMapStringRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        payload := NewMethodBodyMapStringPayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyMapStringEncodeCode = `// EncodeMethodBodyMapStringRequest returns an encoder for requests sent to the
// ServiceBodyMapString MethodBodyMapString server.
func EncodeMethodBodyMapStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodymapstring.MethodBodyMapStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyMapString", "MethodBodyMapString", "*servicebodymapstring.MethodBodyMapStringPayload", v)
        }
        body := NewMethodBodyMapStringRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyMapString", "MethodBodyMapString", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyMapStringValidateDSL = func() {
    Service("ServiceBodyMapStringValidate", func() {
        Method("MethodBodyMapStringValidate", func() {
            Payload(func() {
                Attribute("b", MapOf(String, String), func() {
                    Elem(func() {
                        MinLength(2)
                    })
                })
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyMapStringValidateDecodeCode = `// DecodeMethodBodyMapStringValidateRequest returns a decoder for requests sent
// to the ServiceBodyMapStringValidate MethodBodyMapStringValidate endpoint.
func DecodeMethodBodyMapStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyMapStringValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyMapStringValidatePayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyMapStringValidateEncodeCode = `// EncodeMethodBodyMapStringValidateRequest returns an encoder for requests
// sent to the ServiceBodyMapStringValidate MethodBodyMapStringValidate server.
func EncodeMethodBodyMapStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodymapstringvalidate.MethodBodyMapStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyMapStringValidate", "MethodBodyMapStringValidate", "*servicebodymapstringvalidate.MethodBodyMapStringValidatePayload", v)
        }
        body := NewMethodBodyMapStringValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyMapStringValidate", "MethodBodyMapStringValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyMapUserDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("apattern")
        })
    })
    Service("ServiceBodyMapUser", func() {
        Method("MethodBodyMapUser", func() {
            Payload(func() {
                Attribute("b", MapOf(String, PayloadType))
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyMapUserDecodeCode = `// DecodeMethodBodyMapUserRequest returns a decoder for requests sent to the
// ServiceBodyMapUser MethodBodyMapUser endpoint.
func DecodeMethodBodyMapUserRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyMapUserRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyMapUserPayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyMapUserEncodeCode = `// EncodeMethodBodyMapUserRequest returns an encoder for requests sent to the
// ServiceBodyMapUser MethodBodyMapUser server.
func EncodeMethodBodyMapUserRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodymapuser.MethodBodyMapUserPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyMapUser", "MethodBodyMapUser", "*servicebodymapuser.MethodBodyMapUserPayload", v)
        }
        body := NewMethodBodyMapUserRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyMapUser", "MethodBodyMapUser", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyMapUserValidateDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("apattern")
        })
    })
    Service("ServiceBodyMapUserValidate", func() {
        Method("MethodBodyMapUserValidate", func() {
            Payload(func() {
                Attribute("b", MapOf(String, PayloadType), func() {
                    Key(func() {
                        MinLength(2)
                    })
                })
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyMapUserValidateDecodeCode = `// DecodeMethodBodyMapUserValidateRequest returns a decoder for requests sent
// to the ServiceBodyMapUserValidate MethodBodyMapUserValidate endpoint.
func DecodeMethodBodyMapUserValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyMapUserValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyMapUserValidatePayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyMapUserValidateEncodeCode = `// EncodeMethodBodyMapUserValidateRequest returns an encoder for requests sent
// to the ServiceBodyMapUserValidate MethodBodyMapUserValidate server.
func EncodeMethodBodyMapUserValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodymapuservalidate.MethodBodyMapUserValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyMapUserValidate", "MethodBodyMapUserValidate", "*servicebodymapuservalidate.MethodBodyMapUserValidatePayload", v)
        }
        body := NewMethodBodyMapUserValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyMapUserValidate", "MethodBodyMapUserValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPathObjectConstructorCode = `// NewMethodBodyPathObjectPayload builds a ServiceBodyPathObject service
// MethodBodyPathObject endpoint payload.
func NewMethodBodyPathObjectPayload(body *MethodBodyPathObjectRequestBody, b string) *servicebodypathobject.MethodBodyPathObjectPayload {
    v := &servicebodypathobject.MethodBodyPathObjectPayload{
        A: body.A,
    }
    v.B = &b
    return v
}
`
```
``` go
var PayloadBodyPathObjectDSL = func() {
    Service("ServiceBodyPathObject", func() {
        Method("MethodBodyPathObject", func() {
            Payload(func() {
                Attribute("a", String)
                Attribute("b", String)
            })
            HTTP(func() {
                POST("/{b}")
            })
        })
    })
}
```
``` go
var PayloadBodyPathObjectDecodeCode = `// DecodeMethodBodyPathObjectRequest returns a decoder for requests sent to the
// ServiceBodyPathObject MethodBodyPathObject endpoint.
func DecodeMethodBodyPathObjectRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyPathObjectRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }

        var (
            b string

            params = mux.Vars(r)
        )
        b = params["b"]
        payload := NewMethodBodyPathObjectPayload(&body, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPathObjectEncodeCode = `// EncodeMethodBodyPathObjectRequest returns an encoder for requests sent to
// the ServiceBodyPathObject MethodBodyPathObject server.
func EncodeMethodBodyPathObjectRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodypathobject.MethodBodyPathObjectPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPathObject", "MethodBodyPathObject", "*servicebodypathobject.MethodBodyPathObjectPayload", v)
        }
        body := NewMethodBodyPathObjectRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPathObject", "MethodBodyPathObject", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPathObjectValidateConstructorCode = `// NewMethodBodyPathObjectValidatePayload builds a
// ServiceBodyPathObjectValidate service MethodBodyPathObjectValidate endpoint
// payload.
func NewMethodBodyPathObjectValidatePayload(body *MethodBodyPathObjectValidateRequestBody, b string) *servicebodypathobjectvalidate.MethodBodyPathObjectValidatePayload {
    v := &servicebodypathobjectvalidate.MethodBodyPathObjectValidatePayload{
        A: *body.A,
    }
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyPathObjectValidateDSL = func() {
    Service("ServiceBodyPathObjectValidate", func() {
        Method("MethodBodyPathObjectValidate", func() {
            Payload(func() {
                Attribute("a", String, func() {
                    Pattern("patterna")
                })
                Attribute("b", String, func() {
                    Pattern("patternb")
                })
                Required("a", "b")
            })
            HTTP(func() {
                POST("/{b}")
            })
        })
    })
}
```
``` go
var PayloadBodyPathObjectValidateDecodeCode = `// DecodeMethodBodyPathObjectValidateRequest returns a decoder for requests
// sent to the ServiceBodyPathObjectValidate MethodBodyPathObjectValidate
// endpoint.
func DecodeMethodBodyPathObjectValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyPathObjectValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }

        var (
            b string

            params = mux.Vars(r)
        )
        b = params["b"]
        err = goa.MergeErrors(err, goa.ValidatePattern("b", b, "patternb"))
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyPathObjectValidatePayload(&body, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPathObjectValidateEncodeCode = `// EncodeMethodBodyPathObjectValidateRequest returns an encoder for requests
// sent to the ServiceBodyPathObjectValidate MethodBodyPathObjectValidate
// server.
func EncodeMethodBodyPathObjectValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodypathobjectvalidate.MethodBodyPathObjectValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPathObjectValidate", "MethodBodyPathObjectValidate", "*servicebodypathobjectvalidate.MethodBodyPathObjectValidatePayload", v)
        }
        body := NewMethodBodyPathObjectValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPathObjectValidate", "MethodBodyPathObjectValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPathUserConstructorCode = `// NewMethodBodyPathUserPayloadType builds a ServiceBodyPathUser service
// MethodBodyPathUser endpoint payload.
func NewMethodBodyPathUserPayloadType(body *MethodBodyPathUserRequestBody, b string) *servicebodypathuser.PayloadType {
    v := &servicebodypathuser.PayloadType{
        A: body.A,
    }
    v.B = &b
    return v
}
`
```
``` go
var PayloadBodyPathUserDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String)
        Attribute("b", String)
    })
    Service("ServiceBodyPathUser", func() {
        Method("MethodBodyPathUser", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/{b}")
            })
        })
    })
}
```
``` go
var PayloadBodyPathUserDecodeCode = `// DecodeMethodBodyPathUserRequest returns a decoder for requests sent to the
// ServiceBodyPathUser MethodBodyPathUser endpoint.
func DecodeMethodBodyPathUserRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyPathUserRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }

        var (
            b string

            params = mux.Vars(r)
        )
        b = params["b"]
        payload := NewMethodBodyPathUserPayloadType(&body, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPathUserEncodeCode = `// EncodeMethodBodyPathUserRequest returns an encoder for requests sent to the
// ServiceBodyPathUser MethodBodyPathUser server.
func EncodeMethodBodyPathUserRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodypathuser.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPathUser", "MethodBodyPathUser", "*servicebodypathuser.PayloadType", v)
        }
        body := NewMethodBodyPathUserRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPathUser", "MethodBodyPathUser", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPathUserValidateConstructorCode = `// NewMethodUserBodyPathValidatePayloadType builds a
// ServiceBodyPathUserValidate service MethodUserBodyPathValidate endpoint
// payload.
func NewMethodUserBodyPathValidatePayloadType(body *MethodUserBodyPathValidateRequestBody, b string) *servicebodypathuservalidate.PayloadType {
    v := &servicebodypathuservalidate.PayloadType{
        A: *body.A,
    }
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyPathUserValidateDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Required("a", "b")
    })
    Service("ServiceBodyPathUserValidate", func() {
        Method("MethodUserBodyPathValidate", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/{b}")
            })
        })
    })
}
```
``` go
var PayloadBodyPathUserValidateDecodeCode = `// DecodeMethodUserBodyPathValidateRequest returns a decoder for requests sent
// to the ServiceBodyPathUserValidate MethodUserBodyPathValidate endpoint.
func DecodeMethodUserBodyPathValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodUserBodyPathValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }

        var (
            b string

            params = mux.Vars(r)
        )
        b = params["b"]
        err = goa.MergeErrors(err, goa.ValidatePattern("b", b, "patternb"))
        if err != nil {
            return nil, err
        }
        payload := NewMethodUserBodyPathValidatePayloadType(&body, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPathUserValidateEncodeCode = `// EncodeMethodUserBodyPathValidateRequest returns an encoder for requests sent
// to the ServiceBodyPathUserValidate MethodUserBodyPathValidate server.
func EncodeMethodUserBodyPathValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodypathuservalidate.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPathUserValidate", "MethodUserBodyPathValidate", "*servicebodypathuservalidate.PayloadType", v)
        }
        body := NewMethodUserBodyPathValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPathUserValidate", "MethodUserBodyPathValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveArrayBoolValidateDSL = func() {
    Service("ServiceBodyPrimitiveArrayBoolValidate", func() {
        Method("MethodBodyPrimitiveArrayBoolValidate", func() {
            Payload(ArrayOf(Boolean), func() {
                MinLength(1)
                Elem(func() {
                    Enum(true)
                })
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyPrimitiveArrayBoolValidateDecodeCode = `// DecodeMethodBodyPrimitiveArrayBoolValidateRequest returns a decoder for
// requests sent to the ServiceBodyPrimitiveArrayBoolValidate
// MethodBodyPrimitiveArrayBoolValidate endpoint.
func DecodeMethodBodyPrimitiveArrayBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body []bool
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        if len(body) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("body", body, len(body), 1, true))
        }
        for _, e := range body {
            if !(e == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("body[*]", e, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := body

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveArrayBoolValidateEncodeCode = `// EncodeMethodBodyPrimitiveArrayBoolValidateRequest returns an encoder for
// requests sent to the ServiceBodyPrimitiveArrayBoolValidate
// MethodBodyPrimitiveArrayBoolValidate server.
func EncodeMethodBodyPrimitiveArrayBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.([]bool)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPrimitiveArrayBoolValidate", "MethodBodyPrimitiveArrayBoolValidate", "[]bool", v)
        }
        body := p
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPrimitiveArrayBoolValidate", "MethodBodyPrimitiveArrayBoolValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveArrayStringValidateDSL = func() {
    Service("ServiceBodyPrimitiveArrayStringValidate", func() {
        Method("MethodBodyPrimitiveArrayStringValidate", func() {
            Payload(ArrayOf(String), func() {
                MinLength(1)
                Elem(func() {
                    Enum("val")
                })
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyPrimitiveArrayStringValidateDecodeCode = `// DecodeMethodBodyPrimitiveArrayStringValidateRequest returns a decoder for
// requests sent to the ServiceBodyPrimitiveArrayStringValidate
// MethodBodyPrimitiveArrayStringValidate endpoint.
func DecodeMethodBodyPrimitiveArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body []string
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        if len(body) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("body", body, len(body), 1, true))
        }
        for _, e := range body {
            if !(e == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("body[*]", e, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := body

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveArrayStringValidateEncodeCode = `// EncodeMethodBodyPrimitiveArrayStringValidateRequest returns an encoder for
// requests sent to the ServiceBodyPrimitiveArrayStringValidate
// MethodBodyPrimitiveArrayStringValidate server.
func EncodeMethodBodyPrimitiveArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.([]string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPrimitiveArrayStringValidate", "MethodBodyPrimitiveArrayStringValidate", "[]string", v)
        }
        body := p
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPrimitiveArrayStringValidate", "MethodBodyPrimitiveArrayStringValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveArrayUserValidateDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("pattern")
        })
        Required("a")
    })
    Service("ServiceBodyPrimitiveArrayUserValidate", func() {
        Method("MethodBodyPrimitiveArrayUserValidate", func() {
            Payload(ArrayOf(PayloadType), func() {
                MinLength(1)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyPrimitiveArrayUserValidateDecodeCode = `// DecodeMethodBodyPrimitiveArrayUserValidateRequest returns a decoder for
// requests sent to the ServiceBodyPrimitiveArrayUserValidate
// MethodBodyPrimitiveArrayUserValidate endpoint.
func DecodeMethodBodyPrimitiveArrayUserValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body []*PayloadTypeRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        if len(body) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("body", body, len(body), 1, true))
        }
        for _, e := range body {
            if e != nil {
                if err2 := e.Validate(); err2 != nil {
                    err = goa.MergeErrors(err, err2)
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyPrimitiveArrayUserValidatePayloadType(body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveArrayUserValidateEncodeCode = `// EncodeMethodBodyPrimitiveArrayUserValidateRequest returns an encoder for
// requests sent to the ServiceBodyPrimitiveArrayUserValidate
// MethodBodyPrimitiveArrayUserValidate server.
func EncodeMethodBodyPrimitiveArrayUserValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.([]*servicebodyprimitivearrayuservalidate.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPrimitiveArrayUserValidate", "MethodBodyPrimitiveArrayUserValidate", "[]*servicebodyprimitivearrayuservalidate.PayloadType", v)
        }
        body := NewPayloadTypeRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPrimitiveArrayUserValidate", "MethodBodyPrimitiveArrayUserValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveBoolValidateDSL = func() {
    Service("ServiceBodyPrimitiveBoolValidate", func() {
        Method("MethodBodyPrimitiveBoolValidate", func() {
            Payload(Boolean, func() {
                Enum(true)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyPrimitiveBoolValidateDecodeCode = `// DecodeMethodBodyPrimitiveBoolValidateRequest returns a decoder for requests
// sent to the ServiceBodyPrimitiveBoolValidate MethodBodyPrimitiveBoolValidate
// endpoint.
func DecodeMethodBodyPrimitiveBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body bool
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        if body != nil {
            if !(*body == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("body", *body, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := body

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveBoolValidateEncodeCode = `// EncodeMethodBodyPrimitiveBoolValidateRequest returns an encoder for requests
// sent to the ServiceBodyPrimitiveBoolValidate MethodBodyPrimitiveBoolValidate
// server.
func EncodeMethodBodyPrimitiveBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(bool)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPrimitiveBoolValidate", "MethodBodyPrimitiveBoolValidate", "bool", v)
        }
        body := p
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPrimitiveBoolValidate", "MethodBodyPrimitiveBoolValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveFieldArrayUserDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", ArrayOf(String))
    })
    Service("ServiceBodyPrimitiveArrayUser", func() {
        Method("MethodBodyPrimitiveArrayUser", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
                Body("a")
            })
        })
    })
}
```
``` go
var PayloadBodyPrimitiveFieldArrayUserDecodeCode = `// DecodeMethodBodyPrimitiveArrayUserRequest returns a decoder for requests
// sent to the ServiceBodyPrimitiveArrayUser MethodBodyPrimitiveArrayUser
// endpoint.
func DecodeMethodBodyPrimitiveArrayUserRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body []string
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        payload := NewMethodBodyPrimitiveArrayUserPayloadType(body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveFieldArrayUserEncodeCode = `// EncodeMethodBodyPrimitiveArrayUserRequest returns an encoder for requests
// sent to the ServiceBodyPrimitiveArrayUser MethodBodyPrimitiveArrayUser
// server.
func EncodeMethodBodyPrimitiveArrayUserRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyprimitivearrayuser.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPrimitiveArrayUser", "MethodBodyPrimitiveArrayUser", "*servicebodyprimitivearrayuser.PayloadType", v)
        }
        body := p
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPrimitiveArrayUser", "MethodBodyPrimitiveArrayUser", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveFieldArrayUserValidateDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", ArrayOf(String), func() {
            MinLength(1)
            Elem(func() {
                Pattern("pattern")
            })
        })
        Required("a")
    })
    Service("ServiceBodyPrimitiveArrayUserValidate", func() {
        Method("MethodBodyPrimitiveArrayUserValidate", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
                Body("a")
            })
        })
    })
}
```
``` go
var PayloadBodyPrimitiveFieldArrayUserValidateDecodeCode = `// DecodeMethodBodyPrimitiveArrayUserValidateRequest returns a decoder for
// requests sent to the ServiceBodyPrimitiveArrayUserValidate
// MethodBodyPrimitiveArrayUserValidate endpoint.
func DecodeMethodBodyPrimitiveArrayUserValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body []string
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        if len(body) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("body", body, len(body), 1, true))
        }
        for _, e := range body {
            err = goa.MergeErrors(err, goa.ValidatePattern("body[*]", e, "pattern"))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyPrimitiveArrayUserValidatePayloadType(body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveFieldArrayUserValidateEncodeCode = `// EncodeMethodBodyPrimitiveArrayUserValidateRequest returns an encoder for
// requests sent to the ServiceBodyPrimitiveArrayUserValidate
// MethodBodyPrimitiveArrayUserValidate server.
func EncodeMethodBodyPrimitiveArrayUserValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyprimitivearrayuservalidate.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPrimitiveArrayUserValidate", "MethodBodyPrimitiveArrayUserValidate", "*servicebodyprimitivearrayuservalidate.PayloadType", v)
        }
        body := p
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPrimitiveArrayUserValidate", "MethodBodyPrimitiveArrayUserValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveFieldEmptyDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", ArrayOf(String))
    })
    Service("ServiceBodyPrimitiveArrayUser", func() {
        Method("MethodBodyPrimitiveArrayUser", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
                Param("a")
                Body(Empty)
            })
        })
    })
}
```
``` go
var PayloadBodyPrimitiveStringValidateDSL = func() {
    Service("ServiceBodyPrimitiveStringValidate", func() {
        Method("MethodBodyPrimitiveStringValidate", func() {
            Payload(String, func() {
                Enum("val")
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyPrimitiveStringValidateDecodeCode = `// DecodeMethodBodyPrimitiveStringValidateRequest returns a decoder for
// requests sent to the ServiceBodyPrimitiveStringValidate
// MethodBodyPrimitiveStringValidate endpoint.
func DecodeMethodBodyPrimitiveStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body string
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        if body != nil {
            if !(*body == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("body", *body, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := body

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyPrimitiveStringValidateEncodeCode = `// EncodeMethodBodyPrimitiveStringValidateRequest returns an encoder for
// requests sent to the ServiceBodyPrimitiveStringValidate
// MethodBodyPrimitiveStringValidate server.
func EncodeMethodBodyPrimitiveStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyPrimitiveStringValidate", "MethodBodyPrimitiveStringValidate", "string", v)
        }
        body := p
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyPrimitiveStringValidate", "MethodBodyPrimitiveStringValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyQueryObjectConstructorCode = `// NewMethodBodyQueryObjectPayload builds a ServiceBodyQueryObject service
// MethodBodyQueryObject endpoint payload.
func NewMethodBodyQueryObjectPayload(body *MethodBodyQueryObjectRequestBody, b *string) *servicebodyqueryobject.MethodBodyQueryObjectPayload {
    v := &servicebodyqueryobject.MethodBodyQueryObjectPayload{
        A: body.A,
    }
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyQueryObjectDSL = func() {
    Service("ServiceBodyQueryObject", func() {
        Method("MethodBodyQueryObject", func() {
            Payload(func() {
                Attribute("a", String)
                Attribute("b", String)
            })
            HTTP(func() {
                POST("/")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyQueryObjectDecodeCode = `// DecodeMethodBodyQueryObjectRequest returns a decoder for requests sent to
// the ServiceBodyQueryObject MethodBodyQueryObject endpoint.
func DecodeMethodBodyQueryObjectRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyQueryObjectRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }

        var (
            b *string
        )
        bRaw := r.URL.Query().Get("b")
        if bRaw != "" {
            b = &bRaw
        }
        payload := NewMethodBodyQueryObjectPayload(&body, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyQueryObjectEncodeCode = `// EncodeMethodBodyQueryObjectRequest returns an encoder for requests sent to
// the ServiceBodyQueryObject MethodBodyQueryObject server.
func EncodeMethodBodyQueryObjectRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyqueryobject.MethodBodyQueryObjectPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyQueryObject", "MethodBodyQueryObject", "*servicebodyqueryobject.MethodBodyQueryObjectPayload", v)
        }
        values := req.URL.Query()
        if p.B != nil {
            values.Add("b", *p.B)
        }
        req.URL.RawQuery = values.Encode()
        body := NewMethodBodyQueryObjectRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyQueryObject", "MethodBodyQueryObject", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyQueryObjectValidateConstructorCode = `// NewMethodBodyQueryObjectValidatePayload builds a
// ServiceBodyQueryObjectValidate service MethodBodyQueryObjectValidate
// endpoint payload.
func NewMethodBodyQueryObjectValidatePayload(body *MethodBodyQueryObjectValidateRequestBody, b string) *servicebodyqueryobjectvalidate.MethodBodyQueryObjectValidatePayload {
    v := &servicebodyqueryobjectvalidate.MethodBodyQueryObjectValidatePayload{
        A: *body.A,
    }
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyQueryObjectValidateDSL = func() {
    Service("ServiceBodyQueryObjectValidate", func() {
        Method("MethodBodyQueryObjectValidate", func() {
            Payload(func() {
                Attribute("a", String, func() {
                    Pattern("patterna")
                })
                Attribute("b", String, func() {
                    Pattern("patternb")
                })
                Required("a", "b")
            })
            HTTP(func() {
                POST("/")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyQueryObjectValidateDecodeCode = `// DecodeMethodBodyQueryObjectValidateRequest returns a decoder for requests
// sent to the ServiceBodyQueryObjectValidate MethodBodyQueryObjectValidate
// endpoint.
func DecodeMethodBodyQueryObjectValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyQueryObjectValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }

        var (
            b string
        )
        b = r.URL.Query().Get("b")
        if b == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("b", "query string"))
        }
        err = goa.MergeErrors(err, goa.ValidatePattern("b", b, "patternb"))
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyQueryObjectValidatePayload(&body, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyQueryObjectValidateEncodeCode = `// EncodeMethodBodyQueryObjectValidateRequest returns an encoder for requests
// sent to the ServiceBodyQueryObjectValidate MethodBodyQueryObjectValidate
// server.
func EncodeMethodBodyQueryObjectValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyqueryobjectvalidate.MethodBodyQueryObjectValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyQueryObjectValidate", "MethodBodyQueryObjectValidate", "*servicebodyqueryobjectvalidate.MethodBodyQueryObjectValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("b", p.B)
        req.URL.RawQuery = values.Encode()
        body := NewMethodBodyQueryObjectValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyQueryObjectValidate", "MethodBodyQueryObjectValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyQueryPathObjectConstructorCode = `// NewMethodBodyQueryPathObjectPayload builds a ServiceBodyQueryPathObject
// service MethodBodyQueryPathObject endpoint payload.
func NewMethodBodyQueryPathObjectPayload(body *MethodBodyQueryPathObjectRequestBody, c string, b *string) *servicebodyquerypathobject.MethodBodyQueryPathObjectPayload {
    v := &servicebodyquerypathobject.MethodBodyQueryPathObjectPayload{
        A: body.A,
    }
    v.C = &c
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyQueryPathObjectDSL = func() {
    Service("ServiceBodyQueryPathObject", func() {
        Method("MethodBodyQueryPathObject", func() {
            Payload(func() {
                Attribute("a", String)
                Attribute("b", String)
                Attribute("c", String)
            })
            HTTP(func() {
                POST("/{c}")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyQueryPathObjectDecodeCode = `// DecodeMethodBodyQueryPathObjectRequest returns a decoder for requests sent
// to the ServiceBodyQueryPathObject MethodBodyQueryPathObject endpoint.
func DecodeMethodBodyQueryPathObjectRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyQueryPathObjectRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }

        var (
            c string
            b *string

            params = mux.Vars(r)
        )
        c = params["c"]
        bRaw := r.URL.Query().Get("b")
        if bRaw != "" {
            b = &bRaw
        }
        payload := NewMethodBodyQueryPathObjectPayload(&body, c, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyQueryPathObjectEncodeCode = `// EncodeMethodBodyQueryPathObjectRequest returns an encoder for requests sent
// to the ServiceBodyQueryPathObject MethodBodyQueryPathObject server.
func EncodeMethodBodyQueryPathObjectRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyquerypathobject.MethodBodyQueryPathObjectPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyQueryPathObject", "MethodBodyQueryPathObject", "*servicebodyquerypathobject.MethodBodyQueryPathObjectPayload", v)
        }
        values := req.URL.Query()
        if p.B != nil {
            values.Add("b", *p.B)
        }
        req.URL.RawQuery = values.Encode()
        body := NewMethodBodyQueryPathObjectRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyQueryPathObject", "MethodBodyQueryPathObject", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyQueryPathObjectValidateConstructorCode = `// NewMethodBodyQueryPathObjectValidatePayload builds a
// ServiceBodyQueryPathObjectValidate service MethodBodyQueryPathObjectValidate
// endpoint payload.
func NewMethodBodyQueryPathObjectValidatePayload(body *MethodBodyQueryPathObjectValidateRequestBody, c string, b string) *servicebodyquerypathobjectvalidate.MethodBodyQueryPathObjectValidatePayload {
    v := &servicebodyquerypathobjectvalidate.MethodBodyQueryPathObjectValidatePayload{
        A: *body.A,
    }
    v.C = c
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyQueryPathObjectValidateDSL = func() {
    Service("ServiceBodyQueryPathObjectValidate", func() {
        Method("MethodBodyQueryPathObjectValidate", func() {
            Payload(func() {
                Attribute("a", String, func() {
                    Pattern("patterna")
                })
                Attribute("b", String, func() {
                    Pattern("patternb")
                })
                Attribute("c", String, func() {
                    Pattern("patternc")
                })
                Required("a", "b", "c")
            })
            HTTP(func() {
                POST("/{c}")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyQueryPathObjectValidateDecodeCode = `// DecodeMethodBodyQueryPathObjectValidateRequest returns a decoder for
// requests sent to the ServiceBodyQueryPathObjectValidate
// MethodBodyQueryPathObjectValidate endpoint.
func DecodeMethodBodyQueryPathObjectValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyQueryPathObjectValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }

        var (
            c string
            b string

            params = mux.Vars(r)
        )
        c = params["c"]
        err = goa.MergeErrors(err, goa.ValidatePattern("c", c, "patternc"))
        b = r.URL.Query().Get("b")
        if b == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("b", "query string"))
        }
        err = goa.MergeErrors(err, goa.ValidatePattern("b", b, "patternb"))
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyQueryPathObjectValidatePayload(&body, c, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyQueryPathObjectValidateEncodeCode = `// EncodeMethodBodyQueryPathObjectValidateRequest returns an encoder for
// requests sent to the ServiceBodyQueryPathObjectValidate
// MethodBodyQueryPathObjectValidate server.
func EncodeMethodBodyQueryPathObjectValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyquerypathobjectvalidate.MethodBodyQueryPathObjectValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyQueryPathObjectValidate", "MethodBodyQueryPathObjectValidate", "*servicebodyquerypathobjectvalidate.MethodBodyQueryPathObjectValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("b", p.B)
        req.URL.RawQuery = values.Encode()
        body := NewMethodBodyQueryPathObjectValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyQueryPathObjectValidate", "MethodBodyQueryPathObjectValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyQueryPathUserConstructorCode = `// NewMethodBodyQueryPathUserPayloadType builds a ServiceBodyQueryPathUser
// service MethodBodyQueryPathUser endpoint payload.
func NewMethodBodyQueryPathUserPayloadType(body *MethodBodyQueryPathUserRequestBody, c string, b *string) *servicebodyquerypathuser.PayloadType {
    v := &servicebodyquerypathuser.PayloadType{
        A: body.A,
    }
    v.C = &c
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyQueryPathUserDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String)
        Attribute("b", String)
        Attribute("c", String)
    })
    Service("ServiceBodyQueryPathUser", func() {
        Method("MethodBodyQueryPathUser", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/{c}")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyQueryPathUserDecodeCode = `// DecodeMethodBodyQueryPathUserRequest returns a decoder for requests sent to
// the ServiceBodyQueryPathUser MethodBodyQueryPathUser endpoint.
func DecodeMethodBodyQueryPathUserRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyQueryPathUserRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }

        var (
            c string
            b *string

            params = mux.Vars(r)
        )
        c = params["c"]
        bRaw := r.URL.Query().Get("b")
        if bRaw != "" {
            b = &bRaw
        }
        payload := NewMethodBodyQueryPathUserPayloadType(&body, c, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyQueryPathUserEncodeCode = `// EncodeMethodBodyQueryPathUserRequest returns an encoder for requests sent to
// the ServiceBodyQueryPathUser MethodBodyQueryPathUser server.
func EncodeMethodBodyQueryPathUserRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyquerypathuser.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyQueryPathUser", "MethodBodyQueryPathUser", "*servicebodyquerypathuser.PayloadType", v)
        }
        values := req.URL.Query()
        if p.B != nil {
            values.Add("b", *p.B)
        }
        req.URL.RawQuery = values.Encode()
        body := NewMethodBodyQueryPathUserRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyQueryPathUser", "MethodBodyQueryPathUser", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyQueryPathUserValidateConstructorCode = `// NewMethodBodyQueryPathUserValidatePayloadType builds a
// ServiceBodyQueryPathUserValidate service MethodBodyQueryPathUserValidate
// endpoint payload.
func NewMethodBodyQueryPathUserValidatePayloadType(body *MethodBodyQueryPathUserValidateRequestBody, c string, b string) *servicebodyquerypathuservalidate.PayloadType {
    v := &servicebodyquerypathuservalidate.PayloadType{
        A: *body.A,
    }
    v.C = c
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyQueryPathUserValidateDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Attribute("c", String, func() {
            Pattern("patternc")
        })
        Required("a", "b", "c")
    })
    Service("ServiceBodyQueryPathUserValidate", func() {
        Method("MethodBodyQueryPathUserValidate", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/{c}")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyQueryPathUserValidateDecodeCode = `// DecodeMethodBodyQueryPathUserValidateRequest returns a decoder for requests
// sent to the ServiceBodyQueryPathUserValidate MethodBodyQueryPathUserValidate
// endpoint.
func DecodeMethodBodyQueryPathUserValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyQueryPathUserValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }

        var (
            c string
            b string

            params = mux.Vars(r)
        )
        c = params["c"]
        err = goa.MergeErrors(err, goa.ValidatePattern("c", c, "patternc"))
        b = r.URL.Query().Get("b")
        if b == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("b", "query string"))
        }
        err = goa.MergeErrors(err, goa.ValidatePattern("b", b, "patternb"))
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyQueryPathUserValidatePayloadType(&body, c, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyQueryPathUserValidateEncodeCode = `// EncodeMethodBodyQueryPathUserValidateRequest returns an encoder for requests
// sent to the ServiceBodyQueryPathUserValidate MethodBodyQueryPathUserValidate
// server.
func EncodeMethodBodyQueryPathUserValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyquerypathuservalidate.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyQueryPathUserValidate", "MethodBodyQueryPathUserValidate", "*servicebodyquerypathuservalidate.PayloadType", v)
        }
        values := req.URL.Query()
        values.Add("b", p.B)
        req.URL.RawQuery = values.Encode()
        body := NewMethodBodyQueryPathUserValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyQueryPathUserValidate", "MethodBodyQueryPathUserValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyQueryUserConstructorCode = `// NewMethodBodyQueryUserPayloadType builds a ServiceBodyQueryUser service
// MethodBodyQueryUser endpoint payload.
func NewMethodBodyQueryUserPayloadType(body *MethodBodyQueryUserRequestBody, b *string) *servicebodyqueryuser.PayloadType {
    v := &servicebodyqueryuser.PayloadType{
        A: body.A,
    }
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyQueryUserDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String)
        Attribute("b", String)
    })
    Service("ServiceBodyQueryUser", func() {
        Method("MethodBodyQueryUser", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyQueryUserDecodeCode = `// DecodeMethodBodyQueryUserRequest returns a decoder for requests sent to the
// ServiceBodyQueryUser MethodBodyQueryUser endpoint.
func DecodeMethodBodyQueryUserRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyQueryUserRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }

        var (
            b *string
        )
        bRaw := r.URL.Query().Get("b")
        if bRaw != "" {
            b = &bRaw
        }
        payload := NewMethodBodyQueryUserPayloadType(&body, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyQueryUserEncodeCode = `// EncodeMethodBodyQueryUserRequest returns an encoder for requests sent to the
// ServiceBodyQueryUser MethodBodyQueryUser server.
func EncodeMethodBodyQueryUserRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyqueryuser.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyQueryUser", "MethodBodyQueryUser", "*servicebodyqueryuser.PayloadType", v)
        }
        values := req.URL.Query()
        if p.B != nil {
            values.Add("b", *p.B)
        }
        req.URL.RawQuery = values.Encode()
        body := NewMethodBodyQueryUserRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyQueryUser", "MethodBodyQueryUser", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyQueryUserValidateConstructorCode = `// NewMethodBodyQueryUserValidatePayloadType builds a
// ServiceBodyQueryUserValidate service MethodBodyQueryUserValidate endpoint
// payload.
func NewMethodBodyQueryUserValidatePayloadType(body *MethodBodyQueryUserValidateRequestBody, b string) *servicebodyqueryuservalidate.PayloadType {
    v := &servicebodyqueryuservalidate.PayloadType{
        A: *body.A,
    }
    v.B = b
    return v
}
`
```
``` go
var PayloadBodyQueryUserValidateDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Required("a", "b")
    })
    Service("ServiceBodyQueryUserValidate", func() {
        Method("MethodBodyQueryUserValidate", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
                Param("b")
            })
        })
    })
}
```
``` go
var PayloadBodyQueryUserValidateDecodeCode = `// DecodeMethodBodyQueryUserValidateRequest returns a decoder for requests sent
// to the ServiceBodyQueryUserValidate MethodBodyQueryUserValidate endpoint.
func DecodeMethodBodyQueryUserValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyQueryUserValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }

        var (
            b string
        )
        b = r.URL.Query().Get("b")
        if b == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("b", "query string"))
        }
        err = goa.MergeErrors(err, goa.ValidatePattern("b", b, "patternb"))
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyQueryUserValidatePayloadType(&body, b)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyQueryUserValidateEncodeCode = `// EncodeMethodBodyQueryUserValidateRequest returns an encoder for requests
// sent to the ServiceBodyQueryUserValidate MethodBodyQueryUserValidate server.
func EncodeMethodBodyQueryUserValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyqueryuservalidate.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyQueryUserValidate", "MethodBodyQueryUserValidate", "*servicebodyqueryuservalidate.PayloadType", v)
        }
        values := req.URL.Query()
        values.Add("b", p.B)
        req.URL.RawQuery = values.Encode()
        body := NewMethodBodyQueryUserValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyQueryUserValidate", "MethodBodyQueryUserValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyStringDSL = func() {
    Service("ServiceBodyString", func() {
        Method("MethodBodyString", func() {
            Payload(func() {
                Attribute("b", String)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyStringDecodeCode = `// DecodeMethodBodyStringRequest returns a decoder for requests sent to the
// ServiceBodyString MethodBodyString endpoint.
func DecodeMethodBodyStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyStringRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        payload := NewMethodBodyStringPayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyStringEncodeCode = `// EncodeMethodBodyStringRequest returns an encoder for requests sent to the
// ServiceBodyString MethodBodyString server.
func EncodeMethodBodyStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodystring.MethodBodyStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyString", "MethodBodyString", "*servicebodystring.MethodBodyStringPayload", v)
        }
        body := NewMethodBodyStringRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyString", "MethodBodyString", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyStringValidateDSL = func() {
    Service("ServiceBodyStringValidate", func() {
        Method("MethodBodyStringValidate", func() {
            Payload(func() {
                Attribute("b", String, func() {
                    Pattern("pattern")
                })
                Required("b")
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyStringValidateDecodeCode = `// DecodeMethodBodyStringValidateRequest returns a decoder for requests sent to
// the ServiceBodyStringValidate MethodBodyStringValidate endpoint.
func DecodeMethodBodyStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyStringValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyStringValidatePayload(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyStringValidateEncodeCode = `// EncodeMethodBodyStringValidateRequest returns an encoder for requests sent
// to the ServiceBodyStringValidate MethodBodyStringValidate server.
func EncodeMethodBodyStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodystringvalidate.MethodBodyStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyStringValidate", "MethodBodyStringValidate", "*servicebodystringvalidate.MethodBodyStringValidatePayload", v)
        }
        body := NewMethodBodyStringValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyStringValidate", "MethodBodyStringValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyUserDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String)
    })
    Service("ServiceBodyUser", func() {
        Method("MethodBodyUser", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyUserDecodeCode = `// DecodeMethodBodyUserRequest returns a decoder for requests sent to the
// ServiceBodyUser MethodBodyUser endpoint.
func DecodeMethodBodyUserRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyUserRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        payload := NewMethodBodyUserPayloadType(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyUserEncodeCode = `// EncodeMethodBodyUserRequest returns an encoder for requests sent to the
// ServiceBodyUser MethodBodyUser server.
func EncodeMethodBodyUserRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyuser.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyUser", "MethodBodyUser", "*servicebodyuser.PayloadType", v)
        }
        body := NewMethodBodyUserRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyUser", "MethodBodyUser", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadBodyUserInnerConstructorCode = `// NewMethodBodyUserInnerPayloadType builds a ServiceBodyUserInner service
// MethodBodyUserInner endpoint payload.
func NewMethodBodyUserInnerPayloadType(body *MethodBodyUserInnerRequestBody) *servicebodyuserinner.PayloadType {
    v := &servicebodyuserinner.PayloadType{}
    if body.Inner != nil {
        v.Inner = unmarshalInnerTypeRequestBodyToInnerType(body.Inner)
    }
    return v
}
`
```
``` go
var PayloadBodyUserInnerDSL = func() {
    var InnerType = Type("InnerType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Required("a")
    })
    var PayloadType = Type("PayloadType", func() {
        Attribute("inner", InnerType)
    })
    Service("ServiceBodyUserInner", func() {
        Method("MethodBodyUserInner", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyUserInnerDefaultConstructorCode = `// NewMethodBodyUserInnerDefaultPayloadType builds a
// ServiceBodyUserInnerDefault service MethodBodyUserInnerDefault endpoint
// payload.
func NewMethodBodyUserInnerDefaultPayloadType(body *MethodBodyUserInnerDefaultRequestBody) *servicebodyuserinnerdefault.PayloadType {
    v := &servicebodyuserinnerdefault.PayloadType{}
    if body.Inner != nil {
        v.Inner = unmarshalInnerTypeRequestBodyToInnerType(body.Inner)
    }
    return v
}
`
```
``` go
var PayloadBodyUserInnerDefaultDSL = func() {
    var InnerType = Type("InnerType", func() {
        Attribute("a", String, func() {
            Default("defaulta")
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Default("defaultb")
            Pattern("patternb")
        })
        Required("a")
    })
    var PayloadType = Type("PayloadType", func() {
        Attribute("inner", InnerType)
    })
    Service("ServiceBodyUserInnerDefault", func() {
        Method("MethodBodyUserInnerDefault", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyUserInnerDefaultTransformCode1 = `// unmarshalInnerTypeRequestBodyToInnerType builds a value of type
// *servicebodyuserinnerdefault.InnerType from a value of type
// *InnerTypeRequestBody.
func unmarshalInnerTypeRequestBodyToInnerType(v *InnerTypeRequestBody) *servicebodyuserinnerdefault.InnerType {
    if v == nil {
        return nil
    }
    res := &servicebodyuserinnerdefault.InnerType{
        A: *v.A,
    }
    if v.B != nil {
        res.B = *v.B
    }
    if v.A == nil {
        res.A = "defaulta"
    }
    if v.B == nil {
        res.B = "defaultb"
    }

    return res
}
`
```
``` go
var PayloadBodyUserInnerDefaultTransformCode2 = `// unmarshalInnerTypeRequestBodyToInnerType builds a value of type
// *servicebodyuserinnerdefault.InnerType from a value of type
// *InnerTypeRequestBody.
func unmarshalInnerTypeRequestBodyToInnerType(v *InnerTypeRequestBody) *servicebodyuserinnerdefault.InnerType {
    if v == nil {
        return nil
    }
    res := &servicebodyuserinnerdefault.InnerType{
        A: *v.A,
    }
    if v.B != nil {
        res.B = *v.B
    }
    if v.A == nil {
        res.A = "defaulta"
    }
    if v.B == nil {
        res.B = "defaultb"
    }

    return res
}
`
```
``` go
var PayloadBodyUserInnerDefaultTransformCodeCLI1 = `// marshalInnerTypeRequestBodyToInnerType builds a value of type
// *servicebodyuserinnerdefault.InnerType from a value of type
// *InnerTypeRequestBody.
func marshalInnerTypeRequestBodyToInnerType(v *InnerTypeRequestBody) *servicebodyuserinnerdefault.InnerType {
    if v == nil {
        return nil
    }
    res := &servicebodyuserinnerdefault.InnerType{
        A: v.A,
        B: v.B,
    }

    return res
}
`
```
``` go
var PayloadBodyUserInnerDefaultTransformCodeCLI2 = `// marshalInnerTypeToInnerTypeRequestBody builds a value of type
// *InnerTypeRequestBody from a value of type
// *servicebodyuserinnerdefault.InnerType.
func marshalInnerTypeToInnerTypeRequestBody(v *servicebodyuserinnerdefault.InnerType) *InnerTypeRequestBody {
    if v == nil {
        return nil
    }
    res := &InnerTypeRequestBody{
        A: v.A,
        B: v.B,
    }

    return res
}
`
```
``` go
var PayloadBodyUserValidateDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("apattern")
        })
    })
    Service("ServiceBodyUserValidate", func() {
        Method("MethodBodyUserValidate", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var PayloadBodyUserValidateDecodeCode = `// DecodeMethodBodyUserValidateRequest returns a decoder for requests sent to
// the ServiceBodyUserValidate MethodBodyUserValidate endpoint.
func DecodeMethodBodyUserValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodBodyUserValidateRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }
        payload := NewMethodBodyUserValidatePayloadType(&body)

        return payload, nil
    }
}
`
```
``` go
var PayloadBodyUserValidateEncodeCode = `// EncodeMethodBodyUserValidateRequest returns an encoder for requests sent to
// the ServiceBodyUserValidate MethodBodyUserValidate server.
func EncodeMethodBodyUserValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicebodyuservalidate.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceBodyUserValidate", "MethodBodyUserValidate", "*servicebodyuservalidate.PayloadType", v)
        }
        body := NewMethodBodyUserValidateRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceBodyUserValidate", "MethodBodyUserValidate", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadHeaderArrayStringConstructorCode = `// NewMethodHeaderArrayStringPayload builds a ServiceHeaderArrayString service
// MethodHeaderArrayString endpoint payload.
func NewMethodHeaderArrayStringPayload(h []string) *serviceheaderarraystring.MethodHeaderArrayStringPayload {
    return &serviceheaderarraystring.MethodHeaderArrayStringPayload{
        H: h,
    }
}
`
```
``` go
var PayloadHeaderArrayStringDSL = func() {
    Service("ServiceHeaderArrayString", func() {
        Method("MethodHeaderArrayString", func() {
            Payload(func() {
                Attribute("h", ArrayOf(String))
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderArrayStringDecodeCode = `// DecodeMethodHeaderArrayStringRequest returns a decoder for requests sent to
// the ServiceHeaderArrayString MethodHeaderArrayString endpoint.
func DecodeMethodHeaderArrayStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h []string
        )
        h = r.Header["H"]
        payload := NewMethodHeaderArrayStringPayload(h)

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderArrayStringEncodeCode = `// EncodeMethodHeaderArrayStringRequest returns an encoder for requests sent to
// the ServiceHeaderArrayString MethodHeaderArrayString server.
func EncodeMethodHeaderArrayStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*serviceheaderarraystring.MethodHeaderArrayStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderArrayString", "MethodHeaderArrayString", "*serviceheaderarraystring.MethodHeaderArrayStringPayload", v)
        }
        req.Header.Set("h", p.H)
        return nil
    }
}
`
```
``` go
var PayloadHeaderArrayStringValidateConstructorCode = `// NewMethodHeaderArrayStringValidatePayload builds a
// ServiceHeaderArrayStringValidate service MethodHeaderArrayStringValidate
// endpoint payload.
func NewMethodHeaderArrayStringValidatePayload(h []string) *serviceheaderarraystringvalidate.MethodHeaderArrayStringValidatePayload {
    return &serviceheaderarraystringvalidate.MethodHeaderArrayStringValidatePayload{
        H: h,
    }
}
`
```
``` go
var PayloadHeaderArrayStringValidateDSL = func() {
    Service("ServiceHeaderArrayStringValidate", func() {
        Method("MethodHeaderArrayStringValidate", func() {
            Payload(func() {
                Attribute("h", ArrayOf(String, func() {
                    Enum("val")
                }))
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderArrayStringValidateDecodeCode = `// DecodeMethodHeaderArrayStringValidateRequest returns a decoder for requests
// sent to the ServiceHeaderArrayStringValidate MethodHeaderArrayStringValidate
// endpoint.
func DecodeMethodHeaderArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h   []string
            err error
        )
        h = r.Header["H"]
        for _, e := range h {
            if !(e == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("h[*]", e, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodHeaderArrayStringValidatePayload(h)

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderArrayStringValidateEncodeCode = `// EncodeMethodHeaderArrayStringValidateRequest returns an encoder for requests
// sent to the ServiceHeaderArrayStringValidate MethodHeaderArrayStringValidate
// server.
func EncodeMethodHeaderArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*serviceheaderarraystringvalidate.MethodHeaderArrayStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderArrayStringValidate", "MethodHeaderArrayStringValidate", "*serviceheaderarraystringvalidate.MethodHeaderArrayStringValidatePayload", v)
        }
        req.Header.Set("h", p.H)
        return nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveArrayBoolValidateDSL = func() {
    Service("ServiceHeaderPrimitiveArrayBoolValidate", func() {
        Method("MethodHeaderPrimitiveArrayBoolValidate", func() {
            Payload(ArrayOf(Boolean), func() {
                MinLength(1)
                Elem(func() {
                    Enum(true)
                })
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderPrimitiveArrayBoolValidateDecodeCode = `// DecodeMethodHeaderPrimitiveArrayBoolValidateRequest returns a decoder for
// requests sent to the ServiceHeaderPrimitiveArrayBoolValidate
// MethodHeaderPrimitiveArrayBoolValidate endpoint.
func DecodeMethodHeaderPrimitiveArrayBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h   []bool
            err error
        )
        {
            hRaw := r.Header["H"]
            if hRaw == nil {
                err = goa.MergeErrors(err, goa.MissingFieldError("h", "header"))
            }
            h = make([]bool, len(hRaw))
            for i, rv := range hRaw {
                v, err2 := strconv.ParseBool(rv)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("h", hRaw, "array of booleans"))
                }
                h[i] = v
            }
        }
        if len(h) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("h", h, len(h), 1, true))
        }
        for _, e := range h {
            if !(e == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("h[*]", e, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := h

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveArrayBoolValidateEncodeCode = `// EncodeMethodHeaderPrimitiveArrayBoolValidateRequest returns an encoder for
// requests sent to the ServiceHeaderPrimitiveArrayBoolValidate
// MethodHeaderPrimitiveArrayBoolValidate server.
func EncodeMethodHeaderPrimitiveArrayBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.([]bool)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderPrimitiveArrayBoolValidate", "MethodHeaderPrimitiveArrayBoolValidate", "[]bool", v)
        }
        return nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveArrayStringValidateDSL = func() {
    Service("ServiceHeaderPrimitiveArrayStringValidate", func() {
        Method("MethodHeaderPrimitiveArrayStringValidate", func() {
            Payload(ArrayOf(String), func() {
                MinLength(1)
                Elem(func() {
                    Pattern("val")
                })
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderPrimitiveArrayStringValidateDecodeCode = `// DecodeMethodHeaderPrimitiveArrayStringValidateRequest returns a decoder for
// requests sent to the ServiceHeaderPrimitiveArrayStringValidate
// MethodHeaderPrimitiveArrayStringValidate endpoint.
func DecodeMethodHeaderPrimitiveArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h   []string
            err error
        )
        h = r.Header["H"]
        if h == nil {
            err = goa.MergeErrors(err, goa.MissingFieldError("h", "header"))
        }
        if len(h) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("h", h, len(h), 1, true))
        }
        for _, e := range h {
            err = goa.MergeErrors(err, goa.ValidatePattern("h[*]", e, "val"))
        }
        if err != nil {
            return nil, err
        }
        payload := h

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveArrayStringValidateEncodeCode = `// EncodeMethodHeaderPrimitiveArrayStringValidateRequest returns an encoder for
// requests sent to the ServiceHeaderPrimitiveArrayStringValidate
// MethodHeaderPrimitiveArrayStringValidate server.
func EncodeMethodHeaderPrimitiveArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.([]string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderPrimitiveArrayStringValidate", "MethodHeaderPrimitiveArrayStringValidate", "[]string", v)
        }
        return nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveBoolValidateDSL = func() {
    Service("ServiceHeaderPrimitiveBoolValidate", func() {
        Method("MethodHeaderPrimitiveBoolValidate", func() {
            Payload(Boolean, func() {
                Enum(true)
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderPrimitiveBoolValidateDecodeCode = `// DecodeMethodHeaderPrimitiveBoolValidateRequest returns a decoder for
// requests sent to the ServiceHeaderPrimitiveBoolValidate
// MethodHeaderPrimitiveBoolValidate endpoint.
func DecodeMethodHeaderPrimitiveBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h   bool
            err error
        )
        {
            hRaw := r.Header.Get("h")
            if hRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("h", "header"))
            }
            v, err2 := strconv.ParseBool(hRaw)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("h", hRaw, "boolean"))
            }
            h = v
        }
        if !(h == true) {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("h", h, []interface{}{true}))
        }
        if err != nil {
            return nil, err
        }
        payload := h

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveBoolValidateEncodeCode = `// EncodeMethodHeaderPrimitiveBoolValidateRequest returns an encoder for
// requests sent to the ServiceHeaderPrimitiveBoolValidate
// MethodHeaderPrimitiveBoolValidate server.
func EncodeMethodHeaderPrimitiveBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(bool)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderPrimitiveBoolValidate", "MethodHeaderPrimitiveBoolValidate", "bool", v)
        }
        return nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveStringDefaultDSL = func() {
    Service("ServiceHeaderPrimitiveStringDefault", func() {
        Method("MethodHeaderPrimitiveStringDefault", func() {
            Payload(String, func() {
                Default("def")
            })
            HTTP(func() {
                GET("")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderPrimitiveStringDefaultDecodeCode = `// DecodeMethodHeaderPrimitiveStringDefaultRequest returns a decoder for
// requests sent to the ServiceHeaderPrimitiveStringDefault
// MethodHeaderPrimitiveStringDefault endpoint.
func DecodeMethodHeaderPrimitiveStringDefaultRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h   string
            err error
        )
        h = r.Header.Get("h")
        if h == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("h", "header"))
        }
        if err != nil {
            return nil, err
        }
        payload := h

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveStringDefaultEncodeCode = `// EncodeMethodHeaderPrimitiveStringDefaultRequest returns an encoder for
// requests sent to the ServiceHeaderPrimitiveStringDefault
// MethodHeaderPrimitiveStringDefault server.
func EncodeMethodHeaderPrimitiveStringDefaultRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderPrimitiveStringDefault", "MethodHeaderPrimitiveStringDefault", "string", v)
        }
        return nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveStringValidateDSL = func() {
    Service("ServiceHeaderPrimitiveStringValidate", func() {
        Method("MethodHeaderPrimitiveStringValidate", func() {
            Payload(String, func() {
                Enum("val")
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderPrimitiveStringValidateDecodeCode = `// DecodeMethodHeaderPrimitiveStringValidateRequest returns a decoder for
// requests sent to the ServiceHeaderPrimitiveStringValidate
// MethodHeaderPrimitiveStringValidate endpoint.
func DecodeMethodHeaderPrimitiveStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h   string
            err error
        )
        h = r.Header.Get("h")
        if h == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("h", "header"))
        }
        if !(h == "val") {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("h", h, []interface{}{"val"}))
        }
        if err != nil {
            return nil, err
        }
        payload := h

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderPrimitiveStringValidateEncodeCode = `// EncodeMethodHeaderPrimitiveStringValidateRequest returns an encoder for
// requests sent to the ServiceHeaderPrimitiveStringValidate
// MethodHeaderPrimitiveStringValidate server.
func EncodeMethodHeaderPrimitiveStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderPrimitiveStringValidate", "MethodHeaderPrimitiveStringValidate", "string", v)
        }
        return nil
    }
}
`
```
``` go
var PayloadHeaderStringConstructorCode = `// NewMethodHeaderStringPayload builds a ServiceHeaderString service
// MethodHeaderString endpoint payload.
func NewMethodHeaderStringPayload(h *string) *serviceheaderstring.MethodHeaderStringPayload {
    return &serviceheaderstring.MethodHeaderStringPayload{
        H: h,
    }
}
`
```
``` go
var PayloadHeaderStringDSL = func() {
    Service("ServiceHeaderString", func() {
        Method("MethodHeaderString", func() {
            Payload(func() {
                Attribute("h", String)
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderStringDecodeCode = `// DecodeMethodHeaderStringRequest returns a decoder for requests sent to the
// ServiceHeaderString MethodHeaderString endpoint.
func DecodeMethodHeaderStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h *string
        )
        hRaw := r.Header.Get("h")
        if hRaw != "" {
            h = &hRaw
        }
        payload := NewMethodHeaderStringPayload(h)

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderStringDefaultDSL = func() {
    Service("ServiceHeaderStringDefault", func() {
        Method("MethodHeaderStringDefault", func() {
            Payload(func() {
                Attribute("h", String, func() {
                    Default("def")
                })
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderStringDefaultDecodeCode = `// DecodeMethodHeaderStringDefaultRequest returns a decoder for requests sent
// to the ServiceHeaderStringDefault MethodHeaderStringDefault endpoint.
func DecodeMethodHeaderStringDefaultRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h string
        )
        hRaw := r.Header.Get("h")
        if hRaw != "" {
            h = hRaw
        } else {
            h = "def"
        }
        payload := NewMethodHeaderStringDefaultPayload(h)

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderStringDefaultEncodeCode = `// EncodeMethodHeaderStringDefaultRequest returns an encoder for requests sent
// to the ServiceHeaderStringDefault MethodHeaderStringDefault server.
func EncodeMethodHeaderStringDefaultRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*serviceheaderstringdefault.MethodHeaderStringDefaultPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderStringDefault", "MethodHeaderStringDefault", "*serviceheaderstringdefault.MethodHeaderStringDefaultPayload", v)
        }
        req.Header.Set("h", p.H)
        return nil
    }
}
`
```
``` go
var PayloadHeaderStringDefaultValidateDSL = func() {
    Service("ServiceHeaderStringDefaultValidate", func() {
        Method("MethodHeaderStringDefaultValidate", func() {
            Payload(func() {
                Attribute("h", String, func() {
                    Default("def")
                    Enum("def")
                })
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderStringDefaultValidateDecodeCode = `// DecodeMethodHeaderStringDefaultValidateRequest returns a decoder for
// requests sent to the ServiceHeaderStringDefaultValidate
// MethodHeaderStringDefaultValidate endpoint.
func DecodeMethodHeaderStringDefaultValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h   string
            err error
        )
        hRaw := r.Header.Get("h")
        if hRaw != "" {
            h = hRaw
        } else {
            h = "def"
        }
        if !(h == "def") {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("h", h, []interface{}{"def"}))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodHeaderStringDefaultValidatePayload(h)

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderStringEncodeCode = `// EncodeMethodHeaderStringRequest returns an encoder for requests sent to the
// ServiceHeaderString MethodHeaderString server.
func EncodeMethodHeaderStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*serviceheaderstring.MethodHeaderStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderString", "MethodHeaderString", "*serviceheaderstring.MethodHeaderStringPayload", v)
        }
        if p.H != nil {
            req.Header.Set("h", *p.H)
        }
        return nil
    }
}
`
```
``` go
var PayloadHeaderStringValidateConstructorCode = `// NewMethodHeaderStringValidatePayload builds a ServiceHeaderStringValidate
// service MethodHeaderStringValidate endpoint payload.
func NewMethodHeaderStringValidatePayload(h *string) *serviceheaderstringvalidate.MethodHeaderStringValidatePayload {
    return &serviceheaderstringvalidate.MethodHeaderStringValidatePayload{
        H: h,
    }
}
`
```
``` go
var PayloadHeaderStringValidateDSL = func() {
    Service("ServiceHeaderStringValidate", func() {
        Method("MethodHeaderStringValidate", func() {
            Payload(func() {
                Attribute("h", String, func() {
                    Pattern("header")
                })
            })
            HTTP(func() {
                GET("/")
                Header("h")
            })
        })
    })
}
```
``` go
var PayloadHeaderStringValidateDecodeCode = `// DecodeMethodHeaderStringValidateRequest returns a decoder for requests sent
// to the ServiceHeaderStringValidate MethodHeaderStringValidate endpoint.
func DecodeMethodHeaderStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            h   *string
            err error
        )
        hRaw := r.Header.Get("h")
        if hRaw != "" {
            h = &hRaw
        }
        if h != nil {
            err = goa.MergeErrors(err, goa.ValidatePattern("h", *h, "header"))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodHeaderStringValidatePayload(h)

        return payload, nil
    }
}
`
```
``` go
var PayloadHeaderStringValidateEncodeCode = `// EncodeMethodHeaderStringValidateRequest returns an encoder for requests sent
// to the ServiceHeaderStringValidate MethodHeaderStringValidate server.
func EncodeMethodHeaderStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*serviceheaderstringvalidate.MethodHeaderStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceHeaderStringValidate", "MethodHeaderStringValidate", "*serviceheaderstringvalidate.MethodHeaderStringValidatePayload", v)
        }
        if p.H != nil {
            req.Header.Set("h", *p.H)
        }
        return nil
    }
}
`
```
``` go
var PayloadMapQueryObjectDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Attribute("c", MapOf(Int, ArrayOf(String)))
        Required("a", "c")
    })

    Service("ServiceMapQueryObject", func() {
        Method("MethodMapQueryObject", func() {
            Payload(PayloadType)
            HTTP(func() {
                POST("/{a}")
                MapParams("c")
            })
        })
    })
}
```
``` go
var PayloadMapQueryObjectDecodeCode = `// DecodeMethodMapQueryObjectRequest returns a decoder for requests sent to the
// ServiceMapQueryObject MethodMapQueryObject endpoint.
func DecodeMethodMapQueryObjectRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            body MethodMapQueryObjectRequestBody
            err  error
        )
        err = decoder(r).Decode(&body)
        if err != nil {
            if err == io.EOF {
                return nil, goa.MissingPayloadError()
            }
            return nil, goa.DecodePayloadError(err.Error())
        }
        err = body.Validate()
        if err != nil {
            return nil, err
        }

        var (
            a string
            c map[int][]string

            params = mux.Vars(r)
        )
        a = params["a"]
        err = goa.MergeErrors(err, goa.ValidatePattern("a", a, "patterna"))
        {
            cRaw := r.URL.Query()
            if len(cRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("c", "query string"))
            }
            c = make(map[int][]string, len(cRaw))
            for keyRaw, val := range cRaw {
                var key int
                {
                    v, err2 := strconv.ParseInt(keyRaw, 10, strconv.IntSize)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "integer"))
                    }
                    key = int(v)
                }
                c[key] = val
            }
        }
        err = goa.MergeErrors(err, goa.ValidatePattern("c.a", c.A, "patterna"))
        if c.B != nil {
            err = goa.MergeErrors(err, goa.ValidatePattern("c.b", *c.B, "patternb"))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodMapQueryObjectPayloadType(&body, a, c)

        return payload, nil
    }
}
`
```
``` go
var PayloadMapQueryObjectEncodeCode = `// EncodeMethodMapQueryObjectRequest returns an encoder for requests sent to
// the ServiceMapQueryObject MethodMapQueryObject server.
func EncodeMethodMapQueryObjectRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicemapqueryobject.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceMapQueryObject", "MethodMapQueryObject", "*servicemapqueryobject.PayloadType", v)
        }
        values := req.URL.Query()
        for key, value := range p.C {
            keyStr := strconv.Itoa(key)
            for _, val := range value {
                valStr := val
                values.Add(keyStr, valStr)
            }
        }
        req.URL.RawQuery = values.Encode()
        body := NewMethodMapQueryObjectRequestBody(p)
        if err := encoder(req).Encode(&body); err != nil {
            return goahttp.ErrEncodingError("ServiceMapQueryObject", "MethodMapQueryObject", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadMapQueryPrimitiveArrayDSL = func() {
    Service("ServiceMapQueryPrimitiveArray", func() {
        Method("MapQueryPrimitiveArray", func() {
            Payload(MapOf(String, ArrayOf(UInt)))
            HTTP(func() {
                POST("/")
                MapParams()
            })
        })
    })
}
```
``` go
var PayloadMapQueryPrimitiveArrayDecodeCode = `// DecodeMapQueryPrimitiveArrayRequest returns a decoder for requests sent to
// the ServiceMapQueryPrimitiveArray MapQueryPrimitiveArray endpoint.
func DecodeMapQueryPrimitiveArrayRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            query map[string][]uint
            err   error
        )
        {
            queryRaw := r.URL.Query()
            if len(queryRaw) != 0 {
                query = make(map[string][]uint, len(queryRaw))
                for key, valRaw := range queryRaw {
                    var val []uint
                    {
                        val = make([]uint, len(valRaw))
                        for i, rv := range valRaw {
                            v, err2 := strconv.ParseUint(rv, 10, strconv.IntSize)
                            if err2 != nil {
                                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "array of unsigned integers"))
                            }
                            val[i] = uint(v)
                        }
                    }
                    query[key] = val
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := query

        return payload, nil
    }
}
`
```
``` go
var PayloadMapQueryPrimitiveArrayEncodeCode = `// EncodeMapQueryPrimitiveArrayRequest returns an encoder for requests sent to
// the ServiceMapQueryPrimitiveArray MapQueryPrimitiveArray server.
func EncodeMapQueryPrimitiveArrayRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(map[string][]uint)
        if !ok {
            return goahttp.ErrInvalidType("ServiceMapQueryPrimitiveArray", "MapQueryPrimitiveArray", "map[string][]uint", v)
        }
        values := req.URL.Query()
        for key, value := range p {
            keyStr := key
            for _, val := range value {
                valStr := strconv.FormatUint(uint64(val), 10)
                values.Add(keyStr, valStr)
            }
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadMapQueryPrimitivePrimitiveDSL = func() {
    Service("ServiceMapQueryPrimitivePrimitive", func() {
        Method("MapQueryPrimitivePrimitive", func() {
            Payload(MapOf(String, String))
            HTTP(func() {
                POST("/")
                MapParams()
            })
        })
    })
}
```
``` go
var PayloadMapQueryPrimitivePrimitiveDecodeCode = `// DecodeMapQueryPrimitivePrimitiveRequest returns a decoder for requests sent
// to the ServiceMapQueryPrimitivePrimitive MapQueryPrimitivePrimitive endpoint.
func DecodeMapQueryPrimitivePrimitiveRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            query map[string]string
        )
        {
            queryRaw := r.URL.Query()
            if len(queryRaw) != 0 {
                query = make(map[string]string, len(queryRaw))
                for key, va := range queryRaw {
                    var val string
                    {
                        val = va[0]
                    }
                    query[key] = val
                }
            }
        }
        payload := query

        return payload, nil
    }
}
`
```
``` go
var PayloadMapQueryPrimitivePrimitiveEncodeCode = `// EncodeMapQueryPrimitivePrimitiveRequest returns an encoder for requests sent
// to the ServiceMapQueryPrimitivePrimitive MapQueryPrimitivePrimitive server.
func EncodeMapQueryPrimitivePrimitiveRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(map[string]string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceMapQueryPrimitivePrimitive", "MapQueryPrimitivePrimitive", "map[string]string", v)
        }
        values := req.URL.Query()
        for key, value := range p {
            keyStr := key
            valueStr := value
            values.Add(keyStr, valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadMapUserTypeBuildCode = `// BuildMethodBodyInlineMapUserPayload builds the payload for the
// ServiceBodyInlineMapUser MethodBodyInlineMapUser endpoint from CLI flags.
func BuildMethodBodyInlineMapUserPayload(serviceBodyInlineMapUserMethodBodyInlineMapUserBody string) (map[*servicebodyinlinemapuser.KeyType]*servicebodyinlinemapuser.ElemType, error) {
    var err error
    var body map[*KeyTypeRequestBody]*ElemTypeRequestBody
    {
        err = json.Unmarshal([]byte(serviceBodyInlineMapUserMethodBodyInlineMapUserBody), &body)
        if err != nil {
            return nil, fmt.Errorf("invalid JSON for body, example of valid JSON:\n%s", "null")
        }
    }
    if err != nil {
        return nil, err
    }
    v := make(map[*servicebodyinlinemapuser.KeyType]*servicebodyinlinemapuser.ElemType, len(body))
    for key, val := range body {
        tk := &servicebodyinlinemapuser.KeyType{
            A: key.A,
            B: key.B,
        }
        tv := &servicebodyinlinemapuser.ElemType{
            A: val.A,
            B: val.B,
        }
        v[tk] = tv
    }
    return v, nil
}
`
```
``` go
var PayloadMultipartArrayTypeDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Attribute("c", MapOf(Int, ArrayOf(String)))
        Required("a", "c")
    })
    Service("ServiceMultipartArrayType", func() {
        Method("MethodMultipartArrayType", func() {
            Payload(ArrayOf(PayloadType))
            HTTP(func() {
                POST("/")
                MultipartRequest()
            })
        })
    })
}
```
``` go
var PayloadMultipartArrayTypeDecodeCode = `// DecodeMethodMultipartArrayTypeRequest returns a decoder for requests sent to
// the ServiceMultipartArrayType MethodMultipartArrayType endpoint.
func DecodeMethodMultipartArrayTypeRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var payload []*servicemultipartarraytype.PayloadType
        if err := decoder(r).Decode(&payload); err != nil {
            return nil, goa.DecodePayloadError(err.Error())
        }

        return payload, nil
    }
}
`
```
``` go
var PayloadMultipartBodyArrayTypeEncodeCode = `// EncodeMethodMultipartArrayTypeRequest returns an encoder for requests sent
// to the ServiceMultipartArrayType MethodMultipartArrayType server.
func EncodeMethodMultipartArrayTypeRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.([]*servicemultipartarraytype.PayloadType)
        if !ok {
            return goahttp.ErrInvalidType("ServiceMultipartArrayType", "MethodMultipartArrayType", "[]*servicemultipartarraytype.PayloadType", v)
        }
        if err := encoder(req).Encode(p); err != nil {
            return goahttp.ErrEncodingError("ServiceMultipartArrayType", "MethodMultipartArrayType", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadMultipartBodyMapTypeEncodeCode = `// EncodeMethodMultipartMapTypeRequest returns an encoder for requests sent to
// the ServiceMultipartMapType MethodMultipartMapType server.
func EncodeMethodMultipartMapTypeRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(map[string]int)
        if !ok {
            return goahttp.ErrInvalidType("ServiceMultipartMapType", "MethodMultipartMapType", "map[string]int", v)
        }
        if err := encoder(req).Encode(p); err != nil {
            return goahttp.ErrEncodingError("ServiceMultipartMapType", "MethodMultipartMapType", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadMultipartBodyPrimitiveEncodeCode = `// EncodeMethodMultipartPrimitiveRequest returns an encoder for requests sent
// to the ServiceMultipartPrimitive MethodMultipartPrimitive server.
func EncodeMethodMultipartPrimitiveRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceMultipartPrimitive", "MethodMultipartPrimitive", "string", v)
        }
        if err := encoder(req).Encode(p); err != nil {
            return goahttp.ErrEncodingError("ServiceMultipartPrimitive", "MethodMultipartPrimitive", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadMultipartBodyUserTypeEncodeCode = `// EncodeMethodMultipartUserTypeRequest returns an encoder for requests sent to
// the ServiceMultipartUserType MethodMultipartUserType server.
func EncodeMethodMultipartUserTypeRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicemultipartusertype.MethodMultipartUserTypePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceMultipartUserType", "MethodMultipartUserType", "*servicemultipartusertype.MethodMultipartUserTypePayload", v)
        }
        if err := encoder(req).Encode(p); err != nil {
            return goahttp.ErrEncodingError("ServiceMultipartUserType", "MethodMultipartUserType", err)
        }
        return nil
    }
}
`
```
``` go
var PayloadMultipartMapTypeDSL = func() {
    Service("ServiceMultipartMapType", func() {
        Method("MethodMultipartMapType", func() {
            Payload(MapOf(String, Int))
            HTTP(func() {
                POST("/")
                MultipartRequest()
            })
        })
    })
}
```
``` go
var PayloadMultipartMapTypeDecodeCode = `// DecodeMethodMultipartMapTypeRequest returns a decoder for requests sent to
// the ServiceMultipartMapType MethodMultipartMapType endpoint.
func DecodeMethodMultipartMapTypeRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var payload map[string]int
        if err := decoder(r).Decode(&payload); err != nil {
            return nil, goa.DecodePayloadError(err.Error())
        }

        return payload, nil
    }
}
`
```
``` go
var PayloadMultipartPrimitiveDSL = func() {
    Service("ServiceMultipartPrimitive", func() {
        Method("MethodMultipartPrimitive", func() {
            Payload(String)
            HTTP(func() {
                POST("/")
                MultipartRequest()
            })
        })
    })
}
```
``` go
var PayloadMultipartPrimitiveDecodeCode = `// DecodeMethodMultipartPrimitiveRequest returns a decoder for requests sent to
// the ServiceMultipartPrimitive MethodMultipartPrimitive endpoint.
func DecodeMethodMultipartPrimitiveRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var payload string
        if err := decoder(r).Decode(&payload); err != nil {
            return nil, goa.DecodePayloadError(err.Error())
        }

        return payload, nil
    }
}
`
```
``` go
var PayloadMultipartUserTypeDSL = func() {
    Service("ServiceMultipartUserType", func() {
        Method("MethodMultipartUserType", func() {
            Payload(func() {
                Attribute("b", String, func() {
                    Pattern("patternb")
                })
                Attribute("c", MapOf(Int, ArrayOf(String)))
                Required("b", "c")
            })
            HTTP(func() {
                POST("/")
                MultipartRequest()
            })
        })
    })
}
```
``` go
var PayloadMultipartUserTypeDecodeCode = `// DecodeMethodMultipartUserTypeRequest returns a decoder for requests sent to
// the ServiceMultipartUserType MethodMultipartUserType endpoint.
func DecodeMethodMultipartUserTypeRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var payload *servicemultipartusertype.MethodMultipartUserTypePayload
        if err := decoder(r).Decode(&payload); err != nil {
            return nil, goa.DecodePayloadError(err.Error())
        }

        return payload, nil
    }
}
`
```
``` go
var PayloadMultipartWithParamDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Attribute("c", MapOf(Int, ArrayOf(String)))
        Required("a", "c")
    })
    Service("ServiceMultipartWithParam", func() {
        Method("MethodMultipartWithParam", func() {
            Payload(PayloadType)
            Result(String)
            HTTP(func() {
                POST("/")
                Param("c")
                MultipartRequest()
            })
        })
    })
}
```
``` go
var PayloadMultipartWithParamsAndHeadersDSL = func() {
    var PayloadType = Type("PayloadType", func() {
        Attribute("a", String, func() {
            Pattern("patterna")
        })
        Attribute("b", String, func() {
            Pattern("patternb")
        })
        Attribute("c", MapOf(Int, ArrayOf(String)))
        Required("a", "c")
    })
    Service("ServiceMultipartWithParamsAndHeaders", func() {
        Method("MethodMultipartWithParamsAndHeaders", func() {
            Payload(PayloadType)
            Result(String)
            HTTP(func() {
                POST("/{a}")
                Param("c")
                Header("b:Authorization", String)
                MultipartRequest()
            })
        })
    })
}
```
``` go
var PayloadPathArrayStringConstructorCode = `// NewMethodPathArrayStringPayload builds a ServicePathArrayString service
// MethodPathArrayString endpoint payload.
func NewMethodPathArrayStringPayload(p []string) *servicepatharraystring.MethodPathArrayStringPayload {
    return &servicepatharraystring.MethodPathArrayStringPayload{
        P: p,
    }
}
`
```
``` go
var PayloadPathArrayStringDSL = func() {
    Service("ServicePathArrayString", func() {
        Method("MethodPathArrayString", func() {
            Payload(func() {
                Attribute("p", ArrayOf(String))
            })
            HTTP(func() {
                GET("/{p}")
            })
        })
    })
}
```
``` go
var PayloadPathArrayStringDecodeCode = `// DecodeMethodPathArrayStringRequest returns a decoder for requests sent to
// the ServicePathArrayString MethodPathArrayString endpoint.
func DecodeMethodPathArrayStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            p []string

            params = mux.Vars(r)
        )
        {
            pRaw := params["p"]
            pRawSlice := strings.Split(pRaw, ",")
            p = make([]string, len(pRawSlice))
            for i, rv := range pRawSlice {
                p[i] = rv
            }
        }
        payload := NewMethodPathArrayStringPayload(p)

        return payload, nil
    }
}
`
```
``` go
var PayloadPathArrayStringValidateConstructorCode = `// NewMethodPathArrayStringValidatePayload builds a
// ServicePathArrayStringValidate service MethodPathArrayStringValidate
// endpoint payload.
func NewMethodPathArrayStringValidatePayload(p []string) *servicepatharraystringvalidate.MethodPathArrayStringValidatePayload {
    return &servicepatharraystringvalidate.MethodPathArrayStringValidatePayload{
        P: p,
    }
}
`
```
``` go
var PayloadPathArrayStringValidateDSL = func() {
    Service("ServicePathArrayStringValidate", func() {
        Method("MethodPathArrayStringValidate", func() {
            Payload(func() {
                Attribute("p", ArrayOf(String), func() {
                    Enum([]string{"val"})
                })
            })
            HTTP(func() {
                GET("/{p}")
            })
        })
    })
}
```
``` go
var PayloadPathArrayStringValidateDecodeCode = `// DecodeMethodPathArrayStringValidateRequest returns a decoder for requests
// sent to the ServicePathArrayStringValidate MethodPathArrayStringValidate
// endpoint.
func DecodeMethodPathArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            p   []string
            err error

            params = mux.Vars(r)
        )
        {
            pRaw := params["p"]
            pRawSlice := strings.Split(pRaw, ",")
            p = make([]string, len(pRawSlice))
            for i, rv := range pRawSlice {
                p[i] = rv
            }
        }
        if !(p == []string{"val"}) {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("p", p, []interface{}{[]string{"val"}}))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodPathArrayStringValidatePayload(p)

        return payload, nil
    }
}
`
```
``` go
var PayloadPathPrimitiveArrayBoolValidateDSL = func() {
    Service("ServicePathPrimitiveArrayBoolValidate", func() {
        Method("MethodPathPrimitiveArrayBoolValidate", func() {
            Payload(ArrayOf(Boolean), func() {
                MinLength(1)
                Elem(func() {
                    Enum(true)
                })
            })
            HTTP(func() {
                GET("/{p}")
            })
        })
    })
}
```
``` go
var PayloadPathPrimitiveArrayBoolValidateDecodeCode = `// DecodeMethodPathPrimitiveArrayBoolValidateRequest returns a decoder for
// requests sent to the ServicePathPrimitiveArrayBoolValidate
// MethodPathPrimitiveArrayBoolValidate endpoint.
func DecodeMethodPathPrimitiveArrayBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            p   []bool
            err error

            params = mux.Vars(r)
        )
        {
            pRaw := params["p"]
            pRawSlice := strings.Split(pRaw, ",")
            p = make([]bool, len(pRawSlice))
            for i, rv := range pRawSlice {
                v, err2 := strconv.ParseBool(rv)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("p", pRaw, "array of booleans"))
                }
                p[i] = v
            }
        }
        if len(p) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("p", p, len(p), 1, true))
        }
        for _, e := range p {
            if !(e == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("p[*]", e, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := p

        return payload, nil
    }
}
`
```
``` go
var PayloadPathPrimitiveArrayStringValidateDSL = func() {
    Service("ServicePathPrimitiveArrayStringValidate", func() {
        Method("MethodPathPrimitiveArrayStringValidate", func() {
            Payload(ArrayOf(String), func() {
                MinLength(1)
                Elem(func() {
                    Enum("val")
                })
            })
            HTTP(func() {
                GET("/{p}")
            })
        })
    })
}
```
``` go
var PayloadPathPrimitiveArrayStringValidateDecodeCode = `// DecodeMethodPathPrimitiveArrayStringValidateRequest returns a decoder for
// requests sent to the ServicePathPrimitiveArrayStringValidate
// MethodPathPrimitiveArrayStringValidate endpoint.
func DecodeMethodPathPrimitiveArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            p   []string
            err error

            params = mux.Vars(r)
        )
        {
            pRaw := params["p"]
            pRawSlice := strings.Split(pRaw, ",")
            p = make([]string, len(pRawSlice))
            for i, rv := range pRawSlice {
                p[i] = rv
            }
        }
        if len(p) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("p", p, len(p), 1, true))
        }
        for _, e := range p {
            if !(e == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("p[*]", e, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := p

        return payload, nil
    }
}
`
```
``` go
var PayloadPathPrimitiveBoolValidateDSL = func() {
    Service("ServicePathPrimitiveBoolValidate", func() {
        Method("MethodPathPrimitiveBoolValidate", func() {
            Payload(Boolean, func() {
                Enum(true)
            })
            HTTP(func() {
                GET("/{p}")
            })
        })
    })
}
```
``` go
var PayloadPathPrimitiveBoolValidateDecodeCode = `// DecodeMethodPathPrimitiveBoolValidateRequest returns a decoder for requests
// sent to the ServicePathPrimitiveBoolValidate MethodPathPrimitiveBoolValidate
// endpoint.
func DecodeMethodPathPrimitiveBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            p   bool
            err error

            params = mux.Vars(r)
        )
        {
            pRaw := params["p"]
            v, err2 := strconv.ParseBool(pRaw)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("p", pRaw, "boolean"))
            }
            p = v
        }
        if !(p == true) {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("p", p, []interface{}{true}))
        }
        if err != nil {
            return nil, err
        }
        payload := p

        return payload, nil
    }
}
`
```
``` go
var PayloadPathPrimitiveStringValidateDSL = func() {
    Service("ServicePathPrimitiveStringValidate", func() {
        Method("MethodPathPrimitiveStringValidate", func() {
            Payload(String, func() {
                Enum("val")
            })
            HTTP(func() {
                GET("/{p}")
            })
        })
    })
}
```
``` go
var PayloadPathPrimitiveStringValidateDecodeCode = `// DecodeMethodPathPrimitiveStringValidateRequest returns a decoder for
// requests sent to the ServicePathPrimitiveStringValidate
// MethodPathPrimitiveStringValidate endpoint.
func DecodeMethodPathPrimitiveStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            p   string
            err error

            params = mux.Vars(r)
        )
        p = params["p"]
        if !(p == "val") {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("p", p, []interface{}{"val"}))
        }
        if err != nil {
            return nil, err
        }
        payload := p

        return payload, nil
    }
}
`
```
``` go
var PayloadPathStringConstructorCode = `// NewMethodPathStringPayload builds a ServicePathString service
// MethodPathString endpoint payload.
func NewMethodPathStringPayload(p string) *servicepathstring.MethodPathStringPayload {
    return &servicepathstring.MethodPathStringPayload{
        P: &p,
    }
}
`
```
``` go
var PayloadPathStringDSL = func() {
    Service("ServicePathString", func() {
        Method("MethodPathString", func() {
            Payload(func() {
                Attribute("p", String)
            })
            HTTP(func() {
                GET("/{p}")
            })
        })
    })
}
```
``` go
var PayloadPathStringDecodeCode = `// DecodeMethodPathStringRequest returns a decoder for requests sent to the
// ServicePathString MethodPathString endpoint.
func DecodeMethodPathStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            p string

            params = mux.Vars(r)
        )
        p = params["p"]
        payload := NewMethodPathStringPayload(p)

        return payload, nil
    }
}
`
```
``` go
var PayloadPathStringValidateConstructorCode = `// NewMethodPathStringValidatePayload builds a ServicePathStringValidate
// service MethodPathStringValidate endpoint payload.
func NewMethodPathStringValidatePayload(p string) *servicepathstringvalidate.MethodPathStringValidatePayload {
    return &servicepathstringvalidate.MethodPathStringValidatePayload{
        P: p,
    }
}
`
```
``` go
var PayloadPathStringValidateDSL = func() {
    Service("ServicePathStringValidate", func() {
        Method("MethodPathStringValidate", func() {
            Payload(func() {
                Attribute("p", String, func() {
                    Enum("val")
                })
                Required("p")
            })
            HTTP(func() {
                GET("/{p}")
            })
        })
    })
}
```
``` go
var PayloadPathStringValidateDecodeCode = `// DecodeMethodPathStringValidateRequest returns a decoder for requests sent to
// the ServicePathStringValidate MethodPathStringValidate endpoint.
func DecodeMethodPathStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            p   string
            err error

            params = mux.Vars(r)
        )
        p = params["p"]
        if !(p == "val") {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("p", p, []interface{}{"val"}))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodPathStringValidatePayload(p)

        return payload, nil
    }
}
`
```
``` go
var PayloadPrimitiveTypeParseCode = `// ParseEndpoint returns the endpoint and payload as specified on the command
// line.
func ParseEndpoint(
    scheme, host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restore bool,
) (goa.Endpoint, interface{}, error) {
    var (
        serviceBodyPrimitiveBoolValidateFlags = flag.NewFlagSet("service-body-primitive-bool-validate", flag.ContinueOnError)

        serviceBodyPrimitiveBoolValidateMethodBodyPrimitiveBoolValidateFlags = flag.NewFlagSet("method-body-primitive-bool-validate", flag.ExitOnError)
        serviceBodyPrimitiveBoolValidateMethodBodyPrimitiveBoolValidatePFlag = serviceBodyPrimitiveBoolValidateMethodBodyPrimitiveBoolValidateFlags.String("p", "REQUIRED", "bool is the payload type of the ServiceBodyPrimitiveBoolValidate service MethodBodyPrimitiveBoolValidate method.")
    )
    serviceBodyPrimitiveBoolValidateFlags.Usage = serviceBodyPrimitiveBoolValidateUsage
    serviceBodyPrimitiveBoolValidateMethodBodyPrimitiveBoolValidateFlags.Usage = serviceBodyPrimitiveBoolValidateMethodBodyPrimitiveBoolValidateUsage

    if err := flag.CommandLine.Parse(os.Args[1:]); err != nil {
        return nil, nil, err
    }

    if len(os.Args) < flag.NFlag()+3 {
        return nil, nil, fmt.Errorf("not enough arguments")
    }

    var (
        svcn string
        svcf *flag.FlagSet
    )
    {
        svcn = os.Args[1+flag.NFlag()]
        switch svcn {
        case "service-body-primitive-bool-validate":
            svcf = serviceBodyPrimitiveBoolValidateFlags
        default:
            return nil, nil, fmt.Errorf("unknown service %q", svcn)
        }
    }
    if err := svcf.Parse(os.Args[2+flag.NFlag():]); err != nil {
        return nil, nil, err
    }

    var (
        epn string
        epf *flag.FlagSet
    )
    {
        epn = os.Args[2+flag.NFlag()+svcf.NFlag()]
        switch svcn {
        case "service-body-primitive-bool-validate":
            switch epn {
            case "method-body-primitive-bool-validate":
                epf = serviceBodyPrimitiveBoolValidateMethodBodyPrimitiveBoolValidateFlags

            }

        }
    }
    if epf == nil {
        return nil, nil, fmt.Errorf("unknown %q endpoint %q", svcn, epn)
    }

    // Parse endpoint flags if any
    if len(os.Args) > 2+flag.NFlag()+svcf.NFlag() {
        if err := epf.Parse(os.Args[3+flag.NFlag()+svcf.NFlag():]); err != nil {
            return nil, nil, err
        }
    }

    var (
        data     interface{}
        endpoint goa.Endpoint
        err      error
    )
    {
        switch svcn {
        case "service-body-primitive-bool-validate":
            c := servicebodyprimitiveboolvalidatec.NewClient(scheme, host, doer, enc, dec, restore)
            switch epn {
            case "method-body-primitive-bool-validate":
                endpoint = c.MethodBodyPrimitiveBoolValidate()
                var err error
                data, err = strconv.ParseBool(*serviceBodyPrimitiveBoolValidateMethodBodyPrimitiveBoolValidatePFlag)
                if err != nil {
                    return nil, nil, fmt.Errorf("invalid value for serviceBodyPrimitiveBoolValidateMethodBodyPrimitiveBoolValidatePFlag, must be BOOL")
                }
            }
        }
    }
    if err != nil {
        return nil, nil, err
    }

    return endpoint, data, nil
}
`
```
``` go
var PayloadQueryAnyConstructorCode = `// NewMethodQueryAnyPayload builds a ServiceQueryAny service MethodQueryAny
// endpoint payload.
func NewMethodQueryAnyPayload(q interface{}) *servicequeryany.MethodQueryAnyPayload {
    return &servicequeryany.MethodQueryAnyPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryAnyDSL = func() {
    Service("ServiceQueryAny", func() {
        Method("MethodQueryAny", func() {
            Payload(func() {
                Attribute("q", Any)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryAnyDecodeCode = `// DecodeMethodQueryAnyRequest returns a decoder for requests sent to the
// ServiceQueryAny MethodQueryAny endpoint.
func DecodeMethodQueryAnyRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q interface{}
        )
        qRaw := r.URL.Query().Get("q")
        if qRaw != "" {
            q = qRaw
        }
        payload := NewMethodQueryAnyPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryAnyEncodeCode = `// EncodeMethodQueryAnyRequest returns an encoder for requests sent to the
// ServiceQueryAny MethodQueryAny server.
func EncodeMethodQueryAnyRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryany.MethodQueryAnyPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryAny", "MethodQueryAny", "*servicequeryany.MethodQueryAnyPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryAnyValidateConstructorCode = `// NewMethodQueryAnyValidatePayload builds a ServiceQueryAnyValidate service
// MethodQueryAnyValidate endpoint payload.
func NewMethodQueryAnyValidatePayload(q interface{}) *servicequeryanyvalidate.MethodQueryAnyValidatePayload {
    return &servicequeryanyvalidate.MethodQueryAnyValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryAnyValidateDSL = func() {
    Service("ServiceQueryAnyValidate", func() {
        Method("MethodQueryAnyValidate", func() {
            Payload(func() {
                Attribute("q", Any, func() {
                    Enum("val", 1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryAnyValidateDecodeCode = `// DecodeMethodQueryAnyValidateRequest returns a decoder for requests sent to
// the ServiceQueryAnyValidate MethodQueryAnyValidate endpoint.
func DecodeMethodQueryAnyValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   interface{}
            err error
        )
        q = r.URL.Query().Get("q")
        if q == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
        }
        if !(q == "val" || q == 1) {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("q", q, []interface{}{"val", 1}))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryAnyValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryAnyValidateEncodeCode = `// EncodeMethodQueryAnyValidateRequest returns an encoder for requests sent to
// the ServiceQueryAnyValidate MethodQueryAnyValidate server.
func EncodeMethodQueryAnyValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryanyvalidate.MethodQueryAnyValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryAnyValidate", "MethodQueryAnyValidate", "*servicequeryanyvalidate.MethodQueryAnyValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayAnyConstructorCode = `// NewMethodQueryArrayAnyPayload builds a ServiceQueryArrayAny service
// MethodQueryArrayAny endpoint payload.
func NewMethodQueryArrayAnyPayload(q []interface{}) *servicequeryarrayany.MethodQueryArrayAnyPayload {
    return &servicequeryarrayany.MethodQueryArrayAnyPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayAnyDSL = func() {
    Service("ServiceQueryArrayAny", func() {
        Method("MethodQueryArrayAny", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Any))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayAnyDecodeCode = `// DecodeMethodQueryArrayAnyRequest returns a decoder for requests sent to the
// ServiceQueryArrayAny MethodQueryArrayAny endpoint.
func DecodeMethodQueryArrayAnyRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q []interface{}
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]interface{}, len(qRaw))
                for i, rv := range qRaw {
                    q[i] = rv
                }
            }
        }
        payload := NewMethodQueryArrayAnyPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayAnyEncodeCode = `// EncodeMethodQueryArrayAnyRequest returns an encoder for requests sent to the
// ServiceQueryArrayAny MethodQueryArrayAny server.
func EncodeMethodQueryArrayAnyRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayany.MethodQueryArrayAnyPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayAny", "MethodQueryArrayAny", "*servicequeryarrayany.MethodQueryArrayAnyPayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := fmt.Sprintf("%v", value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayAnyValidateConstructorCode = `// NewMethodQueryArrayAnyValidatePayload builds a ServiceQueryArrayAnyValidate
// service MethodQueryArrayAnyValidate endpoint payload.
func NewMethodQueryArrayAnyValidatePayload(q []interface{}) *servicequeryarrayanyvalidate.MethodQueryArrayAnyValidatePayload {
    return &servicequeryarrayanyvalidate.MethodQueryArrayAnyValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayAnyValidateDSL = func() {
    Service("ServiceQueryArrayAnyValidate", func() {
        Method("MethodQueryArrayAnyValidate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Any), func() {
                    MinLength(1)
                    Elem(func() {
                        Enum("val", 1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayAnyValidateDecodeCode = `// DecodeMethodQueryArrayAnyValidateRequest returns a decoder for requests sent
// to the ServiceQueryArrayAnyValidate MethodQueryArrayAnyValidate endpoint.
func DecodeMethodQueryArrayAnyValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []interface{}
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]interface{}, len(qRaw))
            for i, rv := range qRaw {
                q[i] = rv
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if !(e == "val" || e == 1) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[*]", e, []interface{}{"val", 1}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayAnyValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayAnyValidateEncodeCode = `// EncodeMethodQueryArrayAnyValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayAnyValidate MethodQueryArrayAnyValidate server.
func EncodeMethodQueryArrayAnyValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayanyvalidate.MethodQueryArrayAnyValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayAnyValidate", "MethodQueryArrayAnyValidate", "*servicequeryarrayanyvalidate.MethodQueryArrayAnyValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := fmt.Sprintf("%v", value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayBoolConstructorCode = `// NewMethodQueryArrayBoolPayload builds a ServiceQueryArrayBool service
// MethodQueryArrayBool endpoint payload.
func NewMethodQueryArrayBoolPayload(q []bool) *servicequeryarraybool.MethodQueryArrayBoolPayload {
    return &servicequeryarraybool.MethodQueryArrayBoolPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayBoolDSL = func() {
    Service("ServiceQueryArrayBool", func() {
        Method("MethodQueryArrayBool", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Boolean))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayBoolDecodeCode = `// DecodeMethodQueryArrayBoolRequest returns a decoder for requests sent to the
// ServiceQueryArrayBool MethodQueryArrayBool endpoint.
func DecodeMethodQueryArrayBoolRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []bool
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]bool, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseBool(rv)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of booleans"))
                    }
                    q[i] = v
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayBoolPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayBoolEncodeCode = `// EncodeMethodQueryArrayBoolRequest returns an encoder for requests sent to
// the ServiceQueryArrayBool MethodQueryArrayBool server.
func EncodeMethodQueryArrayBoolRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarraybool.MethodQueryArrayBoolPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayBool", "MethodQueryArrayBool", "*servicequeryarraybool.MethodQueryArrayBoolPayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatBool(value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayBoolValidateConstructorCode = `// NewMethodQueryArrayBoolValidatePayload builds a
// ServiceQueryArrayBoolValidate service MethodQueryArrayBoolValidate endpoint
// payload.
func NewMethodQueryArrayBoolValidatePayload(q []bool) *servicequeryarrayboolvalidate.MethodQueryArrayBoolValidatePayload {
    return &servicequeryarrayboolvalidate.MethodQueryArrayBoolValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayBoolValidateDSL = func() {
    Service("ServiceQueryArrayBoolValidate", func() {
        Method("MethodQueryArrayBoolValidate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Boolean), func() {
                    MinLength(1)
                    Elem(func() {
                        Enum(true)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayBoolValidateDecodeCode = `// DecodeMethodQueryArrayBoolValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayBoolValidate MethodQueryArrayBoolValidate
// endpoint.
func DecodeMethodQueryArrayBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []bool
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]bool, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseBool(rv)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of booleans"))
                }
                q[i] = v
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if !(e == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[*]", e, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayBoolValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayBoolValidateEncodeCode = `// EncodeMethodQueryArrayBoolValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayBoolValidate MethodQueryArrayBoolValidate
// server.
func EncodeMethodQueryArrayBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayboolvalidate.MethodQueryArrayBoolValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayBoolValidate", "MethodQueryArrayBoolValidate", "*servicequeryarrayboolvalidate.MethodQueryArrayBoolValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatBool(value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayBytesConstructorCode = `// NewMethodQueryArrayBytesPayload builds a ServiceQueryArrayBytes service
// MethodQueryArrayBytes endpoint payload.
func NewMethodQueryArrayBytesPayload(q [][]byte) *servicequeryarraybytes.MethodQueryArrayBytesPayload {
    return &servicequeryarraybytes.MethodQueryArrayBytesPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayBytesDSL = func() {
    Service("ServiceQueryArrayBytes", func() {
        Method("MethodQueryArrayBytes", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Bytes))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayBytesDecodeCode = `// DecodeMethodQueryArrayBytesRequest returns a decoder for requests sent to
// the ServiceQueryArrayBytes MethodQueryArrayBytes endpoint.
func DecodeMethodQueryArrayBytesRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q [][]byte
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([][]byte, len(qRaw))
                for i, rv := range qRaw {
                    q[i] = []byte(rv)
                }
            }
        }
        payload := NewMethodQueryArrayBytesPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayBytesEncodeCode = `// EncodeMethodQueryArrayBytesRequest returns an encoder for requests sent to
// the ServiceQueryArrayBytes MethodQueryArrayBytes server.
func EncodeMethodQueryArrayBytesRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarraybytes.MethodQueryArrayBytesPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayBytes", "MethodQueryArrayBytes", "*servicequeryarraybytes.MethodQueryArrayBytesPayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := string(value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayBytesValidateConstructorCode = `// NewMethodQueryArrayBytesValidatePayload builds a
// ServiceQueryArrayBytesValidate service MethodQueryArrayBytesValidate
// endpoint payload.
func NewMethodQueryArrayBytesValidatePayload(q [][]byte) *servicequeryarraybytesvalidate.MethodQueryArrayBytesValidatePayload {
    return &servicequeryarraybytesvalidate.MethodQueryArrayBytesValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayBytesValidateDSL = func() {
    Service("ServiceQueryArrayBytesValidate", func() {
        Method("MethodQueryArrayBytesValidate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Bytes), func() {
                    MinLength(1)
                    Elem(func() {
                        MinLength(2)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayBytesValidateDecodeCode = `// DecodeMethodQueryArrayBytesValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayBytesValidate MethodQueryArrayBytesValidate
// endpoint.
func DecodeMethodQueryArrayBytesValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   [][]byte
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([][]byte, len(qRaw))
            for i, rv := range qRaw {
                q[i] = []byte(rv)
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if len(e) < 2 {
                err = goa.MergeErrors(err, goa.InvalidLengthError("q[*]", e, len(e), 2, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayBytesValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayBytesValidateEncodeCode = `// EncodeMethodQueryArrayBytesValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayBytesValidate MethodQueryArrayBytesValidate
// server.
func EncodeMethodQueryArrayBytesValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarraybytesvalidate.MethodQueryArrayBytesValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayBytesValidate", "MethodQueryArrayBytesValidate", "*servicequeryarraybytesvalidate.MethodQueryArrayBytesValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := string(value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayFloat32ConstructorCode = `// NewMethodQueryArrayFloat32Payload builds a ServiceQueryArrayFloat32 service
// MethodQueryArrayFloat32 endpoint payload.
func NewMethodQueryArrayFloat32Payload(q []float32) *servicequeryarrayfloat32.MethodQueryArrayFloat32Payload {
    return &servicequeryarrayfloat32.MethodQueryArrayFloat32Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayFloat32DSL = func() {
    Service("ServiceQueryArrayFloat32", func() {
        Method("MethodQueryArrayFloat32", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Float32))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayFloat32DecodeCode = `// DecodeMethodQueryArrayFloat32Request returns a decoder for requests sent to
// the ServiceQueryArrayFloat32 MethodQueryArrayFloat32 endpoint.
func DecodeMethodQueryArrayFloat32Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []float32
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]float32, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseFloat(rv, 32)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of floats"))
                    }
                    q[i] = float32(v)
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayFloat32Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayFloat32EncodeCode = `// EncodeMethodQueryArrayFloat32Request returns an encoder for requests sent to
// the ServiceQueryArrayFloat32 MethodQueryArrayFloat32 server.
func EncodeMethodQueryArrayFloat32Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayfloat32.MethodQueryArrayFloat32Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayFloat32", "MethodQueryArrayFloat32", "*servicequeryarrayfloat32.MethodQueryArrayFloat32Payload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatFloat(float64(value), 'f', -1, 32)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayFloat32ValidateConstructorCode = `// NewMethodQueryArrayFloat32ValidatePayload builds a
// ServiceQueryArrayFloat32Validate service MethodQueryArrayFloat32Validate
// endpoint payload.
func NewMethodQueryArrayFloat32ValidatePayload(q []float32) *servicequeryarrayfloat32validate.MethodQueryArrayFloat32ValidatePayload {
    return &servicequeryarrayfloat32validate.MethodQueryArrayFloat32ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayFloat32ValidateDSL = func() {
    Service("ServiceQueryArrayFloat32Validate", func() {
        Method("MethodQueryArrayFloat32Validate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Float32), func() {
                    MinLength(1)
                    Elem(func() {
                        Minimum(1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayFloat32ValidateDecodeCode = `// DecodeMethodQueryArrayFloat32ValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayFloat32Validate MethodQueryArrayFloat32Validate
// endpoint.
func DecodeMethodQueryArrayFloat32ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []float32
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]float32, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseFloat(rv, 32)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of floats"))
                }
                q[i] = float32(v)
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if e < 1 {
                err = goa.MergeErrors(err, goa.InvalidRangeError("q[*]", e, 1, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayFloat32ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayFloat32ValidateEncodeCode = `// EncodeMethodQueryArrayFloat32ValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayFloat32Validate MethodQueryArrayFloat32Validate
// server.
func EncodeMethodQueryArrayFloat32ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayfloat32validate.MethodQueryArrayFloat32ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayFloat32Validate", "MethodQueryArrayFloat32Validate", "*servicequeryarrayfloat32validate.MethodQueryArrayFloat32ValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatFloat(float64(value), 'f', -1, 32)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayFloat64ConstructorCode = `// NewMethodQueryArrayFloat64Payload builds a ServiceQueryArrayFloat64 service
// MethodQueryArrayFloat64 endpoint payload.
func NewMethodQueryArrayFloat64Payload(q []float64) *servicequeryarrayfloat64.MethodQueryArrayFloat64Payload {
    return &servicequeryarrayfloat64.MethodQueryArrayFloat64Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayFloat64DSL = func() {
    Service("ServiceQueryArrayFloat64", func() {
        Method("MethodQueryArrayFloat64", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Float64))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayFloat64DecodeCode = `// DecodeMethodQueryArrayFloat64Request returns a decoder for requests sent to
// the ServiceQueryArrayFloat64 MethodQueryArrayFloat64 endpoint.
func DecodeMethodQueryArrayFloat64Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []float64
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]float64, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseFloat(rv, 64)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of floats"))
                    }
                    q[i] = v
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayFloat64Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayFloat64EncodeCode = `// EncodeMethodQueryArrayFloat64Request returns an encoder for requests sent to
// the ServiceQueryArrayFloat64 MethodQueryArrayFloat64 server.
func EncodeMethodQueryArrayFloat64Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayfloat64.MethodQueryArrayFloat64Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayFloat64", "MethodQueryArrayFloat64", "*servicequeryarrayfloat64.MethodQueryArrayFloat64Payload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatFloat(value, 'f', -1, 64)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayFloat64ValidateConstructorCode = `// NewMethodQueryArrayFloat64ValidatePayload builds a
// ServiceQueryArrayFloat64Validate service MethodQueryArrayFloat64Validate
// endpoint payload.
func NewMethodQueryArrayFloat64ValidatePayload(q []float64) *servicequeryarrayfloat64validate.MethodQueryArrayFloat64ValidatePayload {
    return &servicequeryarrayfloat64validate.MethodQueryArrayFloat64ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayFloat64ValidateDSL = func() {
    Service("ServiceQueryArrayFloat64Validate", func() {
        Method("MethodQueryArrayFloat64Validate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Float64), func() {
                    MinLength(1)
                    Elem(func() {
                        Minimum(1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayFloat64ValidateDecodeCode = `// DecodeMethodQueryArrayFloat64ValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayFloat64Validate MethodQueryArrayFloat64Validate
// endpoint.
func DecodeMethodQueryArrayFloat64ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []float64
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]float64, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseFloat(rv, 64)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of floats"))
                }
                q[i] = v
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if e < 1 {
                err = goa.MergeErrors(err, goa.InvalidRangeError("q[*]", e, 1, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayFloat64ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayFloat64ValidateEncodeCode = `// EncodeMethodQueryArrayFloat64ValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayFloat64Validate MethodQueryArrayFloat64Validate
// server.
func EncodeMethodQueryArrayFloat64ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayfloat64validate.MethodQueryArrayFloat64ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayFloat64Validate", "MethodQueryArrayFloat64Validate", "*servicequeryarrayfloat64validate.MethodQueryArrayFloat64ValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatFloat(value, 'f', -1, 64)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayInt32ConstructorCode = `// NewMethodQueryArrayInt32Payload builds a ServiceQueryArrayInt32 service
// MethodQueryArrayInt32 endpoint payload.
func NewMethodQueryArrayInt32Payload(q []int32) *servicequeryarrayint32.MethodQueryArrayInt32Payload {
    return &servicequeryarrayint32.MethodQueryArrayInt32Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayInt32DSL = func() {
    Service("ServiceQueryArrayInt32", func() {
        Method("MethodQueryArrayInt32", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Int32))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayInt32DecodeCode = `// DecodeMethodQueryArrayInt32Request returns a decoder for requests sent to
// the ServiceQueryArrayInt32 MethodQueryArrayInt32 endpoint.
func DecodeMethodQueryArrayInt32Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []int32
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]int32, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseInt(rv, 10, 32)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of integers"))
                    }
                    q[i] = int32(v)
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayInt32Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayInt32EncodeCode = `// EncodeMethodQueryArrayInt32Request returns an encoder for requests sent to
// the ServiceQueryArrayInt32 MethodQueryArrayInt32 server.
func EncodeMethodQueryArrayInt32Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayint32.MethodQueryArrayInt32Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayInt32", "MethodQueryArrayInt32", "*servicequeryarrayint32.MethodQueryArrayInt32Payload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatInt(int64(value), 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayInt32ValidateConstructorCode = `// NewMethodQueryArrayInt32ValidatePayload builds a
// ServiceQueryArrayInt32Validate service MethodQueryArrayInt32Validate
// endpoint payload.
func NewMethodQueryArrayInt32ValidatePayload(q []int32) *servicequeryarrayint32validate.MethodQueryArrayInt32ValidatePayload {
    return &servicequeryarrayint32validate.MethodQueryArrayInt32ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayInt32ValidateDSL = func() {
    Service("ServiceQueryArrayInt32Validate", func() {
        Method("MethodQueryArrayInt32Validate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Int32), func() {
                    MinLength(1)
                    Elem(func() {
                        Minimum(1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayInt32ValidateDecodeCode = `// DecodeMethodQueryArrayInt32ValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayInt32Validate MethodQueryArrayInt32Validate
// endpoint.
func DecodeMethodQueryArrayInt32ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []int32
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]int32, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseInt(rv, 10, 32)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of integers"))
                }
                q[i] = int32(v)
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if e < 1 {
                err = goa.MergeErrors(err, goa.InvalidRangeError("q[*]", e, 1, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayInt32ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayInt32ValidateEncodeCode = `// EncodeMethodQueryArrayInt32ValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayInt32Validate MethodQueryArrayInt32Validate
// server.
func EncodeMethodQueryArrayInt32ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayint32validate.MethodQueryArrayInt32ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayInt32Validate", "MethodQueryArrayInt32Validate", "*servicequeryarrayint32validate.MethodQueryArrayInt32ValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatInt(int64(value), 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayInt64ConstructorCode = `// NewMethodQueryArrayInt64Payload builds a ServiceQueryArrayInt64 service
// MethodQueryArrayInt64 endpoint payload.
func NewMethodQueryArrayInt64Payload(q []int64) *servicequeryarrayint64.MethodQueryArrayInt64Payload {
    return &servicequeryarrayint64.MethodQueryArrayInt64Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayInt64DSL = func() {
    Service("ServiceQueryArrayInt64", func() {
        Method("MethodQueryArrayInt64", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Int64))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayInt64DecodeCode = `// DecodeMethodQueryArrayInt64Request returns a decoder for requests sent to
// the ServiceQueryArrayInt64 MethodQueryArrayInt64 endpoint.
func DecodeMethodQueryArrayInt64Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []int64
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]int64, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseInt(rv, 10, 64)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of integers"))
                    }
                    q[i] = v
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayInt64Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayInt64EncodeCode = `// EncodeMethodQueryArrayInt64Request returns an encoder for requests sent to
// the ServiceQueryArrayInt64 MethodQueryArrayInt64 server.
func EncodeMethodQueryArrayInt64Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayint64.MethodQueryArrayInt64Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayInt64", "MethodQueryArrayInt64", "*servicequeryarrayint64.MethodQueryArrayInt64Payload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatInt(value, 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayInt64ValidateConstructorCode = `// NewMethodQueryArrayInt64ValidatePayload builds a
// ServiceQueryArrayInt64Validate service MethodQueryArrayInt64Validate
// endpoint payload.
func NewMethodQueryArrayInt64ValidatePayload(q []int64) *servicequeryarrayint64validate.MethodQueryArrayInt64ValidatePayload {
    return &servicequeryarrayint64validate.MethodQueryArrayInt64ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayInt64ValidateDSL = func() {
    Service("ServiceQueryArrayInt64Validate", func() {
        Method("MethodQueryArrayInt64Validate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Int64), func() {
                    MinLength(1)
                    Elem(func() {
                        Minimum(1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayInt64ValidateDecodeCode = `// DecodeMethodQueryArrayInt64ValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayInt64Validate MethodQueryArrayInt64Validate
// endpoint.
func DecodeMethodQueryArrayInt64ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []int64
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]int64, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseInt(rv, 10, 64)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of integers"))
                }
                q[i] = v
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if e < 1 {
                err = goa.MergeErrors(err, goa.InvalidRangeError("q[*]", e, 1, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayInt64ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayInt64ValidateEncodeCode = `// EncodeMethodQueryArrayInt64ValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayInt64Validate MethodQueryArrayInt64Validate
// server.
func EncodeMethodQueryArrayInt64ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayint64validate.MethodQueryArrayInt64ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayInt64Validate", "MethodQueryArrayInt64Validate", "*servicequeryarrayint64validate.MethodQueryArrayInt64ValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatInt(value, 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayIntConstructorCode = `// NewMethodQueryArrayIntPayload builds a ServiceQueryArrayInt service
// MethodQueryArrayInt endpoint payload.
func NewMethodQueryArrayIntPayload(q []int) *servicequeryarrayint.MethodQueryArrayIntPayload {
    return &servicequeryarrayint.MethodQueryArrayIntPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayIntDSL = func() {
    Service("ServiceQueryArrayInt", func() {
        Method("MethodQueryArrayInt", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Int))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayIntDecodeCode = `// DecodeMethodQueryArrayIntRequest returns a decoder for requests sent to the
// ServiceQueryArrayInt MethodQueryArrayInt endpoint.
func DecodeMethodQueryArrayIntRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []int
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]int, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseInt(rv, 10, strconv.IntSize)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of integers"))
                    }
                    q[i] = int(v)
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayIntPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayIntEncodeCode = `// EncodeMethodQueryArrayIntRequest returns an encoder for requests sent to the
// ServiceQueryArrayInt MethodQueryArrayInt server.
func EncodeMethodQueryArrayIntRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayint.MethodQueryArrayIntPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayInt", "MethodQueryArrayInt", "*servicequeryarrayint.MethodQueryArrayIntPayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.Itoa(value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayIntValidateConstructorCode = `// NewMethodQueryArrayIntValidatePayload builds a ServiceQueryArrayIntValidate
// service MethodQueryArrayIntValidate endpoint payload.
func NewMethodQueryArrayIntValidatePayload(q []int) *servicequeryarrayintvalidate.MethodQueryArrayIntValidatePayload {
    return &servicequeryarrayintvalidate.MethodQueryArrayIntValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayIntValidateDSL = func() {
    Service("ServiceQueryArrayIntValidate", func() {
        Method("MethodQueryArrayIntValidate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(Int), func() {
                    MinLength(1)
                    Elem(func() {
                        Minimum(1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayIntValidateDecodeCode = `// DecodeMethodQueryArrayIntValidateRequest returns a decoder for requests sent
// to the ServiceQueryArrayIntValidate MethodQueryArrayIntValidate endpoint.
func DecodeMethodQueryArrayIntValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []int
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]int, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseInt(rv, 10, strconv.IntSize)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of integers"))
                }
                q[i] = int(v)
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if e < 1 {
                err = goa.MergeErrors(err, goa.InvalidRangeError("q[*]", e, 1, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayIntValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayIntValidateEncodeCode = `// EncodeMethodQueryArrayIntValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayIntValidate MethodQueryArrayIntValidate server.
func EncodeMethodQueryArrayIntValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayintvalidate.MethodQueryArrayIntValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayIntValidate", "MethodQueryArrayIntValidate", "*servicequeryarrayintvalidate.MethodQueryArrayIntValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.Itoa(value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayStringConstructorCode = `// NewMethodQueryArrayStringPayload builds a ServiceQueryArrayString service
// MethodQueryArrayString endpoint payload.
func NewMethodQueryArrayStringPayload(q []string) *servicequeryarraystring.MethodQueryArrayStringPayload {
    return &servicequeryarraystring.MethodQueryArrayStringPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayStringDSL = func() {
    Service("ServiceQueryArrayString", func() {
        Method("MethodQueryArrayString", func() {
            Payload(func() {
                Attribute("q", ArrayOf(String))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayStringDecodeCode = `// DecodeMethodQueryArrayStringRequest returns a decoder for requests sent to
// the ServiceQueryArrayString MethodQueryArrayString endpoint.
func DecodeMethodQueryArrayStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q []string
        )
        q = r.URL.Query()["q"]
        payload := NewMethodQueryArrayStringPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayStringEncodeCode = `// EncodeMethodQueryArrayStringRequest returns an encoder for requests sent to
// the ServiceQueryArrayString MethodQueryArrayString server.
func EncodeMethodQueryArrayStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarraystring.MethodQueryArrayStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayString", "MethodQueryArrayString", "*servicequeryarraystring.MethodQueryArrayStringPayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            values.Add("q", value)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayStringValidateConstructorCode = `// NewMethodQueryArrayStringValidatePayload builds a
// ServiceQueryArrayStringValidate service MethodQueryArrayStringValidate
// endpoint payload.
func NewMethodQueryArrayStringValidatePayload(q []string) *servicequeryarraystringvalidate.MethodQueryArrayStringValidatePayload {
    return &servicequeryarraystringvalidate.MethodQueryArrayStringValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayStringValidateDSL = func() {
    Service("ServiceQueryArrayStringValidate", func() {
        Method("MethodQueryArrayStringValidate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(String), func() {
                    MinLength(1)
                    Elem(func() {
                        Enum("val")
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayStringValidateDecodeCode = `// DecodeMethodQueryArrayStringValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayStringValidate MethodQueryArrayStringValidate
// endpoint.
func DecodeMethodQueryArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []string
            err error
        )
        q = r.URL.Query()["q"]
        if q == nil {
            err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if !(e == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[*]", e, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayStringValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayStringValidateEncodeCode = `// EncodeMethodQueryArrayStringValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayStringValidate MethodQueryArrayStringValidate
// server.
func EncodeMethodQueryArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarraystringvalidate.MethodQueryArrayStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayStringValidate", "MethodQueryArrayStringValidate", "*servicequeryarraystringvalidate.MethodQueryArrayStringValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            values.Add("q", value)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayUInt32ConstructorCode = `// NewMethodQueryArrayUInt32Payload builds a ServiceQueryArrayUInt32 service
// MethodQueryArrayUInt32 endpoint payload.
func NewMethodQueryArrayUInt32Payload(q []uint32) *servicequeryarrayuint32.MethodQueryArrayUInt32Payload {
    return &servicequeryarrayuint32.MethodQueryArrayUInt32Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayUInt32DSL = func() {
    Service("ServiceQueryArrayUInt32", func() {
        Method("MethodQueryArrayUInt32", func() {
            Payload(func() {
                Attribute("q", ArrayOf(UInt32))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayUInt32DecodeCode = `// DecodeMethodQueryArrayUInt32Request returns a decoder for requests sent to
// the ServiceQueryArrayUInt32 MethodQueryArrayUInt32 endpoint.
func DecodeMethodQueryArrayUInt32Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []uint32
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]uint32, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseUint(rv, 10, 32)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of unsigned integers"))
                    }
                    q[i] = int32(v)
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayUInt32Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayUInt32EncodeCode = `// EncodeMethodQueryArrayUInt32Request returns an encoder for requests sent to
// the ServiceQueryArrayUInt32 MethodQueryArrayUInt32 server.
func EncodeMethodQueryArrayUInt32Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayuint32.MethodQueryArrayUInt32Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayUInt32", "MethodQueryArrayUInt32", "*servicequeryarrayuint32.MethodQueryArrayUInt32Payload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatUint(uint64(value), 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayUInt32ValidateConstructorCode = `// NewMethodQueryArrayUInt32ValidatePayload builds a
// ServiceQueryArrayUInt32Validate service MethodQueryArrayUInt32Validate
// endpoint payload.
func NewMethodQueryArrayUInt32ValidatePayload(q []uint32) *servicequeryarrayuint32validate.MethodQueryArrayUInt32ValidatePayload {
    return &servicequeryarrayuint32validate.MethodQueryArrayUInt32ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayUInt32ValidateDSL = func() {
    Service("ServiceQueryArrayUInt32Validate", func() {
        Method("MethodQueryArrayUInt32Validate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(UInt32), func() {
                    MinLength(1)
                    Elem(func() {
                        Minimum(1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayUInt32ValidateDecodeCode = `// DecodeMethodQueryArrayUInt32ValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayUInt32Validate MethodQueryArrayUInt32Validate
// endpoint.
func DecodeMethodQueryArrayUInt32ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []uint32
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]uint32, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseUint(rv, 10, 32)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of unsigned integers"))
                }
                q[i] = int32(v)
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if e < 1 {
                err = goa.MergeErrors(err, goa.InvalidRangeError("q[*]", e, 1, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayUInt32ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayUInt32ValidateEncodeCode = `// EncodeMethodQueryArrayUInt32ValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayUInt32Validate MethodQueryArrayUInt32Validate
// server.
func EncodeMethodQueryArrayUInt32ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayuint32validate.MethodQueryArrayUInt32ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayUInt32Validate", "MethodQueryArrayUInt32Validate", "*servicequeryarrayuint32validate.MethodQueryArrayUInt32ValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatUint(uint64(value), 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayUInt64ConstructorCode = `// NewMethodQueryArrayUInt64Payload builds a ServiceQueryArrayUInt64 service
// MethodQueryArrayUInt64 endpoint payload.
func NewMethodQueryArrayUInt64Payload(q []uint64) *servicequeryarrayuint64.MethodQueryArrayUInt64Payload {
    return &servicequeryarrayuint64.MethodQueryArrayUInt64Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayUInt64DSL = func() {
    Service("ServiceQueryArrayUInt64", func() {
        Method("MethodQueryArrayUInt64", func() {
            Payload(func() {
                Attribute("q", ArrayOf(UInt64))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayUInt64DecodeCode = `// DecodeMethodQueryArrayUInt64Request returns a decoder for requests sent to
// the ServiceQueryArrayUInt64 MethodQueryArrayUInt64 endpoint.
func DecodeMethodQueryArrayUInt64Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []uint64
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]uint64, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseUint(rv, 10, 64)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of unsigned integers"))
                    }
                    q[i] = v
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayUInt64Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayUInt64EncodeCode = `// EncodeMethodQueryArrayUInt64Request returns an encoder for requests sent to
// the ServiceQueryArrayUInt64 MethodQueryArrayUInt64 server.
func EncodeMethodQueryArrayUInt64Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayuint64.MethodQueryArrayUInt64Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayUInt64", "MethodQueryArrayUInt64", "*servicequeryarrayuint64.MethodQueryArrayUInt64Payload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatUint(value, 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayUInt64ValidateConstructorCode = `// NewMethodQueryArrayUInt64ValidatePayload builds a
// ServiceQueryArrayUInt64Validate service MethodQueryArrayUInt64Validate
// endpoint payload.
func NewMethodQueryArrayUInt64ValidatePayload(q []uint64) *servicequeryarrayuint64validate.MethodQueryArrayUInt64ValidatePayload {
    return &servicequeryarrayuint64validate.MethodQueryArrayUInt64ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayUInt64ValidateDSL = func() {
    Service("ServiceQueryArrayUInt64Validate", func() {
        Method("MethodQueryArrayUInt64Validate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(UInt64), func() {
                    MinLength(1)
                    Elem(func() {
                        Minimum(1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayUInt64ValidateDecodeCode = `// DecodeMethodQueryArrayUInt64ValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayUInt64Validate MethodQueryArrayUInt64Validate
// endpoint.
func DecodeMethodQueryArrayUInt64ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []uint64
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]uint64, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseUint(rv, 10, 64)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of unsigned integers"))
                }
                q[i] = v
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if e < 1 {
                err = goa.MergeErrors(err, goa.InvalidRangeError("q[*]", e, 1, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayUInt64ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayUInt64ValidateEncodeCode = `// EncodeMethodQueryArrayUInt64ValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayUInt64Validate MethodQueryArrayUInt64Validate
// server.
func EncodeMethodQueryArrayUInt64ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayuint64validate.MethodQueryArrayUInt64ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayUInt64Validate", "MethodQueryArrayUInt64Validate", "*servicequeryarrayuint64validate.MethodQueryArrayUInt64ValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatUint(value, 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayUIntConstructorCode = `// NewMethodQueryArrayUIntPayload builds a ServiceQueryArrayUInt service
// MethodQueryArrayUInt endpoint payload.
func NewMethodQueryArrayUIntPayload(q []uint) *servicequeryarrayuint.MethodQueryArrayUIntPayload {
    return &servicequeryarrayuint.MethodQueryArrayUIntPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayUIntDSL = func() {
    Service("ServiceQueryArrayUInt", func() {
        Method("MethodQueryArrayUInt", func() {
            Payload(func() {
                Attribute("q", ArrayOf(UInt))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayUIntDecodeCode = `// DecodeMethodQueryArrayUIntRequest returns a decoder for requests sent to the
// ServiceQueryArrayUInt MethodQueryArrayUInt endpoint.
func DecodeMethodQueryArrayUIntRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []uint
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw != nil {
                q = make([]uint, len(qRaw))
                for i, rv := range qRaw {
                    v, err2 := strconv.ParseUint(rv, 10, strconv.IntSize)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of unsigned integers"))
                    }
                    q[i] = uint(v)
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayUIntPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayUIntEncodeCode = `// EncodeMethodQueryArrayUIntRequest returns an encoder for requests sent to
// the ServiceQueryArrayUInt MethodQueryArrayUInt server.
func EncodeMethodQueryArrayUIntRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayuint.MethodQueryArrayUIntPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayUInt", "MethodQueryArrayUInt", "*servicequeryarrayuint.MethodQueryArrayUIntPayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatUint(uint64(value), 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryArrayUIntValidateConstructorCode = `// NewMethodQueryArrayUIntValidatePayload builds a
// ServiceQueryArrayUIntValidate service MethodQueryArrayUIntValidate endpoint
// payload.
func NewMethodQueryArrayUIntValidatePayload(q []uint) *servicequeryarrayuintvalidate.MethodQueryArrayUIntValidatePayload {
    return &servicequeryarrayuintvalidate.MethodQueryArrayUIntValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryArrayUIntValidateDSL = func() {
    Service("ServiceQueryArrayUIntValidate", func() {
        Method("MethodQueryArrayUIntValidate", func() {
            Payload(func() {
                Attribute("q", ArrayOf(UInt), func() {
                    MinLength(1)
                    Elem(func() {
                        Minimum(1)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryArrayUIntValidateDecodeCode = `// DecodeMethodQueryArrayUIntValidateRequest returns a decoder for requests
// sent to the ServiceQueryArrayUIntValidate MethodQueryArrayUIntValidate
// endpoint.
func DecodeMethodQueryArrayUIntValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []uint
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]uint, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseUint(rv, 10, strconv.IntSize)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of unsigned integers"))
                }
                q[i] = uint(v)
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if e < 1 {
                err = goa.MergeErrors(err, goa.InvalidRangeError("q[*]", e, 1, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryArrayUIntValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryArrayUIntValidateEncodeCode = `// EncodeMethodQueryArrayUIntValidateRequest returns an encoder for requests
// sent to the ServiceQueryArrayUIntValidate MethodQueryArrayUIntValidate
// server.
func EncodeMethodQueryArrayUIntValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryarrayuintvalidate.MethodQueryArrayUIntValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryArrayUIntValidate", "MethodQueryArrayUIntValidate", "*servicequeryarrayuintvalidate.MethodQueryArrayUIntValidatePayload", v)
        }
        values := req.URL.Query()
        for _, value := range p.Q {
            valueStr := strconv.FormatUint(uint64(value), 10)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryBoolConstructorCode = `// NewMethodQueryBoolPayload builds a ServiceQueryBool service MethodQueryBool
// endpoint payload.
func NewMethodQueryBoolPayload(q *bool) *servicequerybool.MethodQueryBoolPayload {
    return &servicequerybool.MethodQueryBoolPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryBoolDSL = func() {
    Service("ServiceQueryBool", func() {
        Method("MethodQueryBool", func() {
            Payload(func() {
                Attribute("q", Boolean)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryBoolDecodeCode = `// DecodeMethodQueryBoolRequest returns a decoder for requests sent to the
// ServiceQueryBool MethodQueryBool endpoint.
func DecodeMethodQueryBoolRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *bool
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseBool(qRaw)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "boolean"))
                }
                q = &v
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryBoolPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryBoolEncodeCode = `// EncodeMethodQueryBoolRequest returns an encoder for requests sent to the
// ServiceQueryBool MethodQueryBool server.
func EncodeMethodQueryBoolRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerybool.MethodQueryBoolPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryBool", "MethodQueryBool", "*servicequerybool.MethodQueryBoolPayload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryBoolValidateConstructorCode = `// NewMethodQueryBoolValidatePayload builds a ServiceQueryBoolValidate service
// MethodQueryBoolValidate endpoint payload.
func NewMethodQueryBoolValidatePayload(q bool) *servicequeryboolvalidate.MethodQueryBoolValidatePayload {
    return &servicequeryboolvalidate.MethodQueryBoolValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryBoolValidateDSL = func() {
    Service("ServiceQueryBoolValidate", func() {
        Method("MethodQueryBoolValidate", func() {
            Payload(func() {
                Attribute("q", Boolean, func() {
                    Enum(true)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryBoolValidateDecodeCode = `// DecodeMethodQueryBoolValidateRequest returns a decoder for requests sent to
// the ServiceQueryBoolValidate MethodQueryBoolValidate endpoint.
func DecodeMethodQueryBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   bool
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseBool(qRaw)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "boolean"))
            }
            q = v
        }
        if !(q == true) {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("q", q, []interface{}{true}))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryBoolValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryBoolValidateEncodeCode = `// EncodeMethodQueryBoolValidateRequest returns an encoder for requests sent to
// the ServiceQueryBoolValidate MethodQueryBoolValidate server.
func EncodeMethodQueryBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryboolvalidate.MethodQueryBoolValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryBoolValidate", "MethodQueryBoolValidate", "*servicequeryboolvalidate.MethodQueryBoolValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryBytesConstructorCode = `// NewMethodQueryBytesPayload builds a ServiceQueryBytes service
// MethodQueryBytes endpoint payload.
func NewMethodQueryBytesPayload(q []byte) *servicequerybytes.MethodQueryBytesPayload {
    return &servicequerybytes.MethodQueryBytesPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryBytesDSL = func() {
    Service("ServiceQueryBytes", func() {
        Method("MethodQueryBytes", func() {
            Payload(func() {
                Attribute("q", Bytes)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryBytesDecodeCode = `// DecodeMethodQueryBytesRequest returns a decoder for requests sent to the
// ServiceQueryBytes MethodQueryBytes endpoint.
func DecodeMethodQueryBytesRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q []byte
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                q = []byte(qRaw)
            }
        }
        payload := NewMethodQueryBytesPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryBytesEncodeCode = `// EncodeMethodQueryBytesRequest returns an encoder for requests sent to the
// ServiceQueryBytes MethodQueryBytes server.
func EncodeMethodQueryBytesRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerybytes.MethodQueryBytesPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryBytes", "MethodQueryBytes", "*servicequerybytes.MethodQueryBytesPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", string(p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryBytesValidateConstructorCode = `// NewMethodQueryBytesValidatePayload builds a ServiceQueryBytesValidate
// service MethodQueryBytesValidate endpoint payload.
func NewMethodQueryBytesValidatePayload(q []byte) *servicequerybytesvalidate.MethodQueryBytesValidatePayload {
    return &servicequerybytesvalidate.MethodQueryBytesValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryBytesValidateDSL = func() {
    Service("ServiceQueryBytesValidate", func() {
        Method("MethodQueryBytesValidate", func() {
            Payload(func() {
                Attribute("q", Bytes, func() {
                    MinLength(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryBytesValidateDecodeCode = `// DecodeMethodQueryBytesValidateRequest returns a decoder for requests sent to
// the ServiceQueryBytesValidate MethodQueryBytesValidate endpoint.
func DecodeMethodQueryBytesValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []byte
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = []byte(qRaw)
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryBytesValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryBytesValidateEncodeCode = `// EncodeMethodQueryBytesValidateRequest returns an encoder for requests sent
// to the ServiceQueryBytesValidate MethodQueryBytesValidate server.
func EncodeMethodQueryBytesValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerybytesvalidate.MethodQueryBytesValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryBytesValidate", "MethodQueryBytesValidate", "*servicequerybytesvalidate.MethodQueryBytesValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", string(p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryFloat32ConstructorCode = `// NewMethodQueryFloat32Payload builds a ServiceQueryFloat32 service
// MethodQueryFloat32 endpoint payload.
func NewMethodQueryFloat32Payload(q *float32) *servicequeryfloat32.MethodQueryFloat32Payload {
    return &servicequeryfloat32.MethodQueryFloat32Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryFloat32DSL = func() {
    Service("ServiceQueryFloat32", func() {
        Method("MethodQueryFloat32", func() {
            Payload(func() {
                Attribute("q", Float32)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryFloat32DecodeCode = `// DecodeMethodQueryFloat32Request returns a decoder for requests sent to the
// ServiceQueryFloat32 MethodQueryFloat32 endpoint.
func DecodeMethodQueryFloat32Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *float32
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseFloat(qRaw, 32)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "float"))
                }
                pv := float32(v)
                q = &pv
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryFloat32Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryFloat32EncodeCode = `// EncodeMethodQueryFloat32Request returns an encoder for requests sent to the
// ServiceQueryFloat32 MethodQueryFloat32 server.
func EncodeMethodQueryFloat32Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryfloat32.MethodQueryFloat32Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryFloat32", "MethodQueryFloat32", "*servicequeryfloat32.MethodQueryFloat32Payload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryFloat32ValidateConstructorCode = `// NewMethodQueryFloat32ValidatePayload builds a ServiceQueryFloat32Validate
// service MethodQueryFloat32Validate endpoint payload.
func NewMethodQueryFloat32ValidatePayload(q float32) *servicequeryfloat32validate.MethodQueryFloat32ValidatePayload {
    return &servicequeryfloat32validate.MethodQueryFloat32ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryFloat32ValidateDSL = func() {
    Service("ServiceQueryFloat32Validate", func() {
        Method("MethodQueryFloat32Validate", func() {
            Payload(func() {
                Attribute("q", Float32, func() {
                    Minimum(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryFloat32ValidateDecodeCode = `// DecodeMethodQueryFloat32ValidateRequest returns a decoder for requests sent
// to the ServiceQueryFloat32Validate MethodQueryFloat32Validate endpoint.
func DecodeMethodQueryFloat32ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   float32
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseFloat(qRaw, 32)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "float"))
            }
            q = float32(v)
        }
        if q < 1 {
            err = goa.MergeErrors(err, goa.InvalidRangeError("q", q, 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryFloat32ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryFloat32ValidateEncodeCode = `// EncodeMethodQueryFloat32ValidateRequest returns an encoder for requests sent
// to the ServiceQueryFloat32Validate MethodQueryFloat32Validate server.
func EncodeMethodQueryFloat32ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryfloat32validate.MethodQueryFloat32ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryFloat32Validate", "MethodQueryFloat32Validate", "*servicequeryfloat32validate.MethodQueryFloat32ValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryFloat64ConstructorCode = `// NewMethodQueryFloat64Payload builds a ServiceQueryFloat64 service
// MethodQueryFloat64 endpoint payload.
func NewMethodQueryFloat64Payload(q *float64) *servicequeryfloat64.MethodQueryFloat64Payload {
    return &servicequeryfloat64.MethodQueryFloat64Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryFloat64DSL = func() {
    Service("ServiceQueryFloat64", func() {
        Method("MethodQueryFloat64", func() {
            Payload(func() {
                Attribute("q", Float64)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryFloat64DecodeCode = `// DecodeMethodQueryFloat64Request returns a decoder for requests sent to the
// ServiceQueryFloat64 MethodQueryFloat64 endpoint.
func DecodeMethodQueryFloat64Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *float64
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseFloat(qRaw, 64)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "float"))
                }
                q = &v
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryFloat64Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryFloat64EncodeCode = `// EncodeMethodQueryFloat64Request returns an encoder for requests sent to the
// ServiceQueryFloat64 MethodQueryFloat64 server.
func EncodeMethodQueryFloat64Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryfloat64.MethodQueryFloat64Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryFloat64", "MethodQueryFloat64", "*servicequeryfloat64.MethodQueryFloat64Payload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryFloat64ValidateConstructorCode = `// NewMethodQueryFloat64ValidatePayload builds a ServiceQueryFloat64Validate
// service MethodQueryFloat64Validate endpoint payload.
func NewMethodQueryFloat64ValidatePayload(q float64) *servicequeryfloat64validate.MethodQueryFloat64ValidatePayload {
    return &servicequeryfloat64validate.MethodQueryFloat64ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryFloat64ValidateDSL = func() {
    Service("ServiceQueryFloat64Validate", func() {
        Method("MethodQueryFloat64Validate", func() {
            Payload(func() {
                Attribute("q", Float64, func() {
                    Minimum(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryFloat64ValidateDecodeCode = `// DecodeMethodQueryFloat64ValidateRequest returns a decoder for requests sent
// to the ServiceQueryFloat64Validate MethodQueryFloat64Validate endpoint.
func DecodeMethodQueryFloat64ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   float64
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseFloat(qRaw, 64)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "float"))
            }
            q = v
        }
        if q < 1 {
            err = goa.MergeErrors(err, goa.InvalidRangeError("q", q, 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryFloat64ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryFloat64ValidateEncodeCode = `// EncodeMethodQueryFloat64ValidateRequest returns an encoder for requests sent
// to the ServiceQueryFloat64Validate MethodQueryFloat64Validate server.
func EncodeMethodQueryFloat64ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryfloat64validate.MethodQueryFloat64ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryFloat64Validate", "MethodQueryFloat64Validate", "*servicequeryfloat64validate.MethodQueryFloat64ValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryInt32ConstructorCode = `// NewMethodQueryInt32Payload builds a ServiceQueryInt32 service
// MethodQueryInt32 endpoint payload.
func NewMethodQueryInt32Payload(q *int32) *servicequeryint32.MethodQueryInt32Payload {
    return &servicequeryint32.MethodQueryInt32Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryInt32DSL = func() {
    Service("ServiceQueryInt32", func() {
        Method("MethodQueryInt32", func() {
            Payload(func() {
                Attribute("q", Int32)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryInt32DecodeCode = `// DecodeMethodQueryInt32Request returns a decoder for requests sent to the
// ServiceQueryInt32 MethodQueryInt32 endpoint.
func DecodeMethodQueryInt32Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *int32
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseInt(qRaw, 10, 32)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "integer"))
                }
                pv := int32(v)
                q = &pv
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryInt32Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryInt32EncodeCode = `// EncodeMethodQueryInt32Request returns an encoder for requests sent to the
// ServiceQueryInt32 MethodQueryInt32 server.
func EncodeMethodQueryInt32Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryint32.MethodQueryInt32Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryInt32", "MethodQueryInt32", "*servicequeryint32.MethodQueryInt32Payload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryInt32ValidateConstructorCode = `// NewMethodQueryInt32ValidatePayload builds a ServiceQueryInt32Validate
// service MethodQueryInt32Validate endpoint payload.
func NewMethodQueryInt32ValidatePayload(q int32) *servicequeryint32validate.MethodQueryInt32ValidatePayload {
    return &servicequeryint32validate.MethodQueryInt32ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryInt32ValidateDSL = func() {
    Service("ServiceQueryInt32Validate", func() {
        Method("MethodQueryInt32Validate", func() {
            Payload(func() {
                Attribute("q", Int32, func() {
                    Minimum(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryInt32ValidateDecodeCode = `// DecodeMethodQueryInt32ValidateRequest returns a decoder for requests sent to
// the ServiceQueryInt32Validate MethodQueryInt32Validate endpoint.
func DecodeMethodQueryInt32ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   int32
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseInt(qRaw, 10, 32)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "integer"))
            }
            q = int32(v)
        }
        if q < 1 {
            err = goa.MergeErrors(err, goa.InvalidRangeError("q", q, 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryInt32ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryInt32ValidateEncodeCode = `// EncodeMethodQueryInt32ValidateRequest returns an encoder for requests sent
// to the ServiceQueryInt32Validate MethodQueryInt32Validate server.
func EncodeMethodQueryInt32ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryint32validate.MethodQueryInt32ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryInt32Validate", "MethodQueryInt32Validate", "*servicequeryint32validate.MethodQueryInt32ValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryInt64ConstructorCode = `// NewMethodQueryInt64Payload builds a ServiceQueryInt64 service
// MethodQueryInt64 endpoint payload.
func NewMethodQueryInt64Payload(q *int64) *servicequeryint64.MethodQueryInt64Payload {
    return &servicequeryint64.MethodQueryInt64Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryInt64DSL = func() {
    Service("ServiceQueryInt64", func() {
        Method("MethodQueryInt64", func() {
            Payload(func() {
                Attribute("q", Int64)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryInt64DecodeCode = `// DecodeMethodQueryInt64Request returns a decoder for requests sent to the
// ServiceQueryInt64 MethodQueryInt64 endpoint.
func DecodeMethodQueryInt64Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *int64
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseInt(qRaw, 10, 64)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "integer"))
                }
                q = &v
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryInt64Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryInt64EncodeCode = `// EncodeMethodQueryInt64Request returns an encoder for requests sent to the
// ServiceQueryInt64 MethodQueryInt64 server.
func EncodeMethodQueryInt64Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryint64.MethodQueryInt64Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryInt64", "MethodQueryInt64", "*servicequeryint64.MethodQueryInt64Payload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryInt64ValidateConstructorCode = `// NewMethodQueryInt64ValidatePayload builds a ServiceQueryInt64Validate
// service MethodQueryInt64Validate endpoint payload.
func NewMethodQueryInt64ValidatePayload(q int64) *servicequeryint64validate.MethodQueryInt64ValidatePayload {
    return &servicequeryint64validate.MethodQueryInt64ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryInt64ValidateDSL = func() {
    Service("ServiceQueryInt64Validate", func() {
        Method("MethodQueryInt64Validate", func() {
            Payload(func() {
                Attribute("q", Int64, func() {
                    Minimum(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryInt64ValidateDecodeCode = `// DecodeMethodQueryInt64ValidateRequest returns a decoder for requests sent to
// the ServiceQueryInt64Validate MethodQueryInt64Validate endpoint.
func DecodeMethodQueryInt64ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   int64
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseInt(qRaw, 10, 64)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "integer"))
            }
            q = v
        }
        if q < 1 {
            err = goa.MergeErrors(err, goa.InvalidRangeError("q", q, 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryInt64ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryInt64ValidateEncodeCode = `// EncodeMethodQueryInt64ValidateRequest returns an encoder for requests sent
// to the ServiceQueryInt64Validate MethodQueryInt64Validate server.
func EncodeMethodQueryInt64ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryint64validate.MethodQueryInt64ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryInt64Validate", "MethodQueryInt64Validate", "*servicequeryint64validate.MethodQueryInt64ValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryIntConstructorCode = `// NewMethodQueryIntPayload builds a ServiceQueryInt service MethodQueryInt
// endpoint payload.
func NewMethodQueryIntPayload(q *int) *servicequeryint.MethodQueryIntPayload {
    return &servicequeryint.MethodQueryIntPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryIntDSL = func() {
    Service("ServiceQueryInt", func() {
        Method("MethodQueryInt", func() {
            Payload(func() {
                Attribute("q", Int)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryIntDecodeCode = `// DecodeMethodQueryIntRequest returns a decoder for requests sent to the
// ServiceQueryInt MethodQueryInt endpoint.
func DecodeMethodQueryIntRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *int
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseInt(qRaw, 10, strconv.IntSize)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "integer"))
                }
                pv := int(v)
                q = &pv
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryIntPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryIntEncodeCode = `// EncodeMethodQueryIntRequest returns an encoder for requests sent to the
// ServiceQueryInt MethodQueryInt server.
func EncodeMethodQueryIntRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryint.MethodQueryIntPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryInt", "MethodQueryInt", "*servicequeryint.MethodQueryIntPayload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryIntValidateConstructorCode = `// NewMethodQueryIntValidatePayload builds a ServiceQueryIntValidate service
// MethodQueryIntValidate endpoint payload.
func NewMethodQueryIntValidatePayload(q int) *servicequeryintvalidate.MethodQueryIntValidatePayload {
    return &servicequeryintvalidate.MethodQueryIntValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryIntValidateDSL = func() {
    Service("ServiceQueryIntValidate", func() {
        Method("MethodQueryIntValidate", func() {
            Payload(func() {
                Attribute("q", Int, func() {
                    Minimum(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryIntValidateDecodeCode = `// DecodeMethodQueryIntValidateRequest returns a decoder for requests sent to
// the ServiceQueryIntValidate MethodQueryIntValidate endpoint.
func DecodeMethodQueryIntValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   int
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseInt(qRaw, 10, strconv.IntSize)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "integer"))
            }
            q = int(v)
        }
        if q < 1 {
            err = goa.MergeErrors(err, goa.InvalidRangeError("q", q, 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryIntValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryIntValidateEncodeCode = `// EncodeMethodQueryIntValidateRequest returns an encoder for requests sent to
// the ServiceQueryIntValidate MethodQueryIntValidate server.
func EncodeMethodQueryIntValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryintvalidate.MethodQueryIntValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryIntValidate", "MethodQueryIntValidate", "*servicequeryintvalidate.MethodQueryIntValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayBoolConstructorCode = `// NewMethodQueryMapBoolArrayBoolPayload builds a ServiceQueryMapBoolArrayBool
// service MethodQueryMapBoolArrayBool endpoint payload.
func NewMethodQueryMapBoolArrayBoolPayload(q map[bool][]bool) *servicequerymapboolarraybool.MethodQueryMapBoolArrayBoolPayload {
    return &servicequerymapboolarraybool.MethodQueryMapBoolArrayBoolPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayBoolDSL = func() {
    Service("ServiceQueryMapBoolArrayBool", func() {
        Method("MethodQueryMapBoolArrayBool", func() {
            Payload(func() {
                Attribute("q", MapOf(Boolean, ArrayOf(Boolean)))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapBoolArrayBoolDecodeCode = `// DecodeMethodQueryMapBoolArrayBoolRequest returns a decoder for requests sent
// to the ServiceQueryMapBoolArrayBool MethodQueryMapBoolArrayBool endpoint.
func DecodeMethodQueryMapBoolArrayBoolRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool][]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) != 0 {
                q = make(map[bool][]bool, len(qRaw))
                for keyRaw, valRaw := range qRaw {
                    var key bool
                    {
                        v, err2 := strconv.ParseBool(keyRaw)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                        }
                        key = v
                    }
                    var val []bool
                    {
                        val = make([]bool, len(valRaw))
                        for i, rv := range valRaw {
                            v, err2 := strconv.ParseBool(rv)
                            if err2 != nil {
                                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "array of booleans"))
                            }
                            val[i] = v
                        }
                    }
                    q[key] = val
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapBoolArrayBoolPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayBoolEncodeCode = `// EncodeMethodQueryMapBoolArrayBoolRequest returns an encoder for requests
// sent to the ServiceQueryMapBoolArrayBool MethodQueryMapBoolArrayBool server.
func EncodeMethodQueryMapBoolArrayBoolRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapboolarraybool.MethodQueryMapBoolArrayBoolPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapBoolArrayBool", "MethodQueryMapBoolArrayBool", "*servicequerymapboolarraybool.MethodQueryMapBoolArrayBoolPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayBoolValidateConstructorCode = `// NewMethodQueryMapBoolArrayBoolValidatePayload builds a
// ServiceQueryMapBoolArrayBoolValidate service
// MethodQueryMapBoolArrayBoolValidate endpoint payload.
func NewMethodQueryMapBoolArrayBoolValidatePayload(q map[bool][]bool) *servicequerymapboolarrayboolvalidate.MethodQueryMapBoolArrayBoolValidatePayload {
    return &servicequerymapboolarrayboolvalidate.MethodQueryMapBoolArrayBoolValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayBoolValidateDSL = func() {
    Service("ServiceQueryMapBoolArrayBoolValidate", func() {
        Method("MethodQueryMapBoolArrayBoolValidate", func() {
            Payload(func() {
                Attribute("q", MapOf(Boolean, ArrayOf(Boolean)), func() {
                    MinLength(1)
                    Key(func() {
                        Enum(true)
                    })
                    Elem(func() {
                        MinLength(2)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapBoolArrayBoolValidateDecodeCode = `// DecodeMethodQueryMapBoolArrayBoolValidateRequest returns a decoder for
// requests sent to the ServiceQueryMapBoolArrayBoolValidate
// MethodQueryMapBoolArrayBoolValidate endpoint.
func DecodeMethodQueryMapBoolArrayBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool][]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make(map[bool][]bool, len(qRaw))
            for keyRaw, valRaw := range qRaw {
                var key bool
                {
                    v, err2 := strconv.ParseBool(keyRaw)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                    }
                    key = v
                }
                var val []bool
                {
                    val = make([]bool, len(valRaw))
                    for i, rv := range valRaw {
                        v, err2 := strconv.ParseBool(rv)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "array of booleans"))
                        }
                        val[i] = v
                    }
                }
                q[key] = val
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{true}))
            }
            if len(v) < 2 {
                err = goa.MergeErrors(err, goa.InvalidLengthError("q[key]", v, len(v), 2, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapBoolArrayBoolValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayBoolValidateEncodeCode = `// EncodeMethodQueryMapBoolArrayBoolValidateRequest returns an encoder for
// requests sent to the ServiceQueryMapBoolArrayBoolValidate
// MethodQueryMapBoolArrayBoolValidate server.
func EncodeMethodQueryMapBoolArrayBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapboolarrayboolvalidate.MethodQueryMapBoolArrayBoolValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapBoolArrayBoolValidate", "MethodQueryMapBoolArrayBoolValidate", "*servicequerymapboolarrayboolvalidate.MethodQueryMapBoolArrayBoolValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayStringConstructorCode = `// NewMethodQueryMapBoolArrayStringPayload builds a
// ServiceQueryMapBoolArrayString service MethodQueryMapBoolArrayString
// endpoint payload.
func NewMethodQueryMapBoolArrayStringPayload(q map[bool][]string) *servicequerymapboolarraystring.MethodQueryMapBoolArrayStringPayload {
    return &servicequerymapboolarraystring.MethodQueryMapBoolArrayStringPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayStringDSL = func() {
    Service("ServiceQueryMapBoolArrayString", func() {
        Method("MethodQueryMapBoolArrayString", func() {
            Payload(func() {
                Attribute("q", MapOf(Boolean, ArrayOf(String)))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapBoolArrayStringDecodeCode = `// DecodeMethodQueryMapBoolArrayStringRequest returns a decoder for requests
// sent to the ServiceQueryMapBoolArrayString MethodQueryMapBoolArrayString
// endpoint.
func DecodeMethodQueryMapBoolArrayStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool][]string
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) != 0 {
                q = make(map[bool][]string, len(qRaw))
                for keyRaw, val := range qRaw {
                    var key bool
                    {
                        v, err2 := strconv.ParseBool(keyRaw)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                        }
                        key = v
                    }
                    q[key] = val
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapBoolArrayStringPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayStringEncodeCode = `// EncodeMethodQueryMapBoolArrayStringRequest returns an encoder for requests
// sent to the ServiceQueryMapBoolArrayString MethodQueryMapBoolArrayString
// server.
func EncodeMethodQueryMapBoolArrayStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapboolarraystring.MethodQueryMapBoolArrayStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapBoolArrayString", "MethodQueryMapBoolArrayString", "*servicequerymapboolarraystring.MethodQueryMapBoolArrayStringPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayStringValidateConstructorCode = `// NewMethodQueryMapBoolArrayStringValidatePayload builds a
// ServiceQueryMapBoolArrayStringValidate service
// MethodQueryMapBoolArrayStringValidate endpoint payload.
func NewMethodQueryMapBoolArrayStringValidatePayload(q map[bool][]string) *servicequerymapboolarraystringvalidate.MethodQueryMapBoolArrayStringValidatePayload {
    return &servicequerymapboolarraystringvalidate.MethodQueryMapBoolArrayStringValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayStringValidateDSL = func() {
    Service("ServiceQueryMapBoolArrayStringValidate", func() {
        Method("MethodQueryMapBoolArrayStringValidate", func() {
            Payload(func() {
                Attribute("q", MapOf(Boolean, ArrayOf(String)), func() {
                    MinLength(1)
                    Key(func() {
                        Enum(true)
                    })
                    Elem(func() {
                        MinLength(2)
                    })
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapBoolArrayStringValidateDecodeCode = `// DecodeMethodQueryMapBoolArrayStringValidateRequest returns a decoder for
// requests sent to the ServiceQueryMapBoolArrayStringValidate
// MethodQueryMapBoolArrayStringValidate endpoint.
func DecodeMethodQueryMapBoolArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool][]string
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) != 0 {
                q = make(map[bool][]string, len(qRaw))
                for keyRaw, val := range qRaw {
                    var key bool
                    {
                        v, err2 := strconv.ParseBool(keyRaw)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                        }
                        key = v
                    }
                    q[key] = val
                }
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{true}))
            }
            if len(v) < 2 {
                err = goa.MergeErrors(err, goa.InvalidLengthError("q[key]", v, len(v), 2, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapBoolArrayStringValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapBoolArrayStringValidateEncodeCode = `// EncodeMethodQueryMapBoolArrayStringValidateRequest returns an encoder for
// requests sent to the ServiceQueryMapBoolArrayStringValidate
// MethodQueryMapBoolArrayStringValidate server.
func EncodeMethodQueryMapBoolArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapboolarraystringvalidate.MethodQueryMapBoolArrayStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapBoolArrayStringValidate", "MethodQueryMapBoolArrayStringValidate", "*servicequerymapboolarraystringvalidate.MethodQueryMapBoolArrayStringValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapBoolBoolConstructorCode = `// NewMethodQueryMapBoolBoolPayload builds a ServiceQueryMapBoolBool service
// MethodQueryMapBoolBool endpoint payload.
func NewMethodQueryMapBoolBoolPayload(q map[bool]bool) *servicequerymapboolbool.MethodQueryMapBoolBoolPayload {
    return &servicequerymapboolbool.MethodQueryMapBoolBoolPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapBoolBoolDSL = func() {
    Service("ServiceQueryMapBoolBool", func() {
        Method("MethodQueryMapBoolBool", func() {
            Payload(func() {
                Attribute("q", MapOf(Boolean, Boolean))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapBoolBoolDecodeCode = `// DecodeMethodQueryMapBoolBoolRequest returns a decoder for requests sent to
// the ServiceQueryMapBoolBool MethodQueryMapBoolBool endpoint.
func DecodeMethodQueryMapBoolBoolRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) != 0 {
                q = make(map[bool]bool, len(qRaw))
                for keyRaw, va := range qRaw {
                    var key bool
                    {
                        v, err2 := strconv.ParseBool(keyRaw)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                        }
                        key = v
                    }
                    var val bool
                    {
                        valRaw := va[0]
                        v, err2 := strconv.ParseBool(valRaw)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "boolean"))
                        }
                        val = v
                    }
                    q[key] = val
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapBoolBoolPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapBoolBoolEncodeCode = `// EncodeMethodQueryMapBoolBoolRequest returns an encoder for requests sent to
// the ServiceQueryMapBoolBool MethodQueryMapBoolBool server.
func EncodeMethodQueryMapBoolBoolRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapboolbool.MethodQueryMapBoolBoolPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapBoolBool", "MethodQueryMapBoolBool", "*servicequerymapboolbool.MethodQueryMapBoolBoolPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapBoolBoolValidateConstructorCode = `// NewMethodQueryMapBoolBoolValidatePayload builds a
// ServiceQueryMapBoolBoolValidate service MethodQueryMapBoolBoolValidate
// endpoint payload.
func NewMethodQueryMapBoolBoolValidatePayload(q map[bool]bool) *servicequerymapboolboolvalidate.MethodQueryMapBoolBoolValidatePayload {
    return &servicequerymapboolboolvalidate.MethodQueryMapBoolBoolValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapBoolBoolValidateDSL = func() {
    Service("ServiceQueryMapBoolBoolValidate", func() {
        Method("MethodQueryMapBoolBoolValidate", func() {
            Payload(func() {
                Attribute("q", MapOf(Boolean, Boolean), func() {
                    MinLength(1)
                    Key(func() {
                        Enum(false)
                    })
                    Elem(func() {
                        Enum(true)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapBoolBoolValidateDecodeCode = `// DecodeMethodQueryMapBoolBoolValidateRequest returns a decoder for requests
// sent to the ServiceQueryMapBoolBoolValidate MethodQueryMapBoolBoolValidate
// endpoint.
func DecodeMethodQueryMapBoolBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make(map[bool]bool, len(qRaw))
            for keyRaw, va := range qRaw {
                var key bool
                {
                    v, err2 := strconv.ParseBool(keyRaw)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                    }
                    key = v
                }
                var val bool
                {
                    valRaw := va[0]
                    v, err2 := strconv.ParseBool(valRaw)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "boolean"))
                    }
                    val = v
                }
                q[key] = val
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == false) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{false}))
            }
            if !(v == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[key]", v, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapBoolBoolValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapBoolBoolValidateEncodeCode = `// EncodeMethodQueryMapBoolBoolValidateRequest returns an encoder for requests
// sent to the ServiceQueryMapBoolBoolValidate MethodQueryMapBoolBoolValidate
// server.
func EncodeMethodQueryMapBoolBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapboolboolvalidate.MethodQueryMapBoolBoolValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapBoolBoolValidate", "MethodQueryMapBoolBoolValidate", "*servicequerymapboolboolvalidate.MethodQueryMapBoolBoolValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapBoolStringConstructorCode = `// NewMethodQueryMapBoolStringPayload builds a ServiceQueryMapBoolString
// service MethodQueryMapBoolString endpoint payload.
func NewMethodQueryMapBoolStringPayload(q map[bool]string) *servicequerymapboolstring.MethodQueryMapBoolStringPayload {
    return &servicequerymapboolstring.MethodQueryMapBoolStringPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapBoolStringDSL = func() {
    Service("ServiceQueryMapBoolString", func() {
        Method("MethodQueryMapBoolString", func() {
            Payload(func() {
                Attribute("q", MapOf(Boolean, String))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapBoolStringDecodeCode = `// DecodeMethodQueryMapBoolStringRequest returns a decoder for requests sent to
// the ServiceQueryMapBoolString MethodQueryMapBoolString endpoint.
func DecodeMethodQueryMapBoolStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool]string
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) != 0 {
                q = make(map[bool]string, len(qRaw))
                for keyRaw, va := range qRaw {
                    var key bool
                    {
                        v, err2 := strconv.ParseBool(keyRaw)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                        }
                        key = v
                    }
                    var val string
                    {
                        val = va[0]
                    }
                    q[key] = val
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapBoolStringPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapBoolStringEncodeCode = `// EncodeMethodQueryMapBoolStringRequest returns an encoder for requests sent
// to the ServiceQueryMapBoolString MethodQueryMapBoolString server.
func EncodeMethodQueryMapBoolStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapboolstring.MethodQueryMapBoolStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapBoolString", "MethodQueryMapBoolString", "*servicequerymapboolstring.MethodQueryMapBoolStringPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapBoolStringValidateConstructorCode = `// NewMethodQueryMapBoolStringValidatePayload builds a
// ServiceQueryMapBoolStringValidate service MethodQueryMapBoolStringValidate
// endpoint payload.
func NewMethodQueryMapBoolStringValidatePayload(q map[bool]string) *servicequerymapboolstringvalidate.MethodQueryMapBoolStringValidatePayload {
    return &servicequerymapboolstringvalidate.MethodQueryMapBoolStringValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapBoolStringValidateDSL = func() {
    Service("ServiceQueryMapBoolStringValidate", func() {
        Method("MethodQueryMapBoolStringValidate", func() {
            Payload(func() {
                Attribute("q", MapOf(Boolean, String), func() {
                    MinLength(1)
                    Key(func() {
                        Enum(true)
                    })
                    Elem(func() {
                        Enum("val")
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapBoolStringValidateDecodeCode = `// DecodeMethodQueryMapBoolStringValidateRequest returns a decoder for requests
// sent to the ServiceQueryMapBoolStringValidate
// MethodQueryMapBoolStringValidate endpoint.
func DecodeMethodQueryMapBoolStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool]string
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make(map[bool]string, len(qRaw))
            for keyRaw, va := range qRaw {
                var key bool
                {
                    v, err2 := strconv.ParseBool(keyRaw)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                    }
                    key = v
                }
                var val string
                {
                    val = va[0]
                }
                q[key] = val
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{true}))
            }
            if !(v == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[key]", v, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapBoolStringValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapBoolStringValidateEncodeCode = `// EncodeMethodQueryMapBoolStringValidateRequest returns an encoder for
// requests sent to the ServiceQueryMapBoolStringValidate
// MethodQueryMapBoolStringValidate server.
func EncodeMethodQueryMapBoolStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapboolstringvalidate.MethodQueryMapBoolStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapBoolStringValidate", "MethodQueryMapBoolStringValidate", "*servicequerymapboolstringvalidate.MethodQueryMapBoolStringValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapStringArrayBoolConstructorCode = `// NewMethodQueryMapStringArrayBoolPayload builds a
// ServiceQueryMapStringArrayBool service MethodQueryMapStringArrayBool
// endpoint payload.
func NewMethodQueryMapStringArrayBoolPayload(q map[string][]bool) *servicequerymapstringarraybool.MethodQueryMapStringArrayBoolPayload {
    return &servicequerymapstringarraybool.MethodQueryMapStringArrayBoolPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapStringArrayBoolDSL = func() {
    Service("ServiceQueryMapStringArrayBool", func() {
        Method("MethodQueryMapStringArrayBool", func() {
            Payload(func() {
                Attribute("q", MapOf(String, ArrayOf(Boolean)))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapStringArrayBoolDecodeCode = `// DecodeMethodQueryMapStringArrayBoolRequest returns a decoder for requests
// sent to the ServiceQueryMapStringArrayBool MethodQueryMapStringArrayBool
// endpoint.
func DecodeMethodQueryMapStringArrayBoolRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[string][]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) != 0 {
                q = make(map[string][]bool, len(qRaw))
                for key, valRaw := range qRaw {
                    var val []bool
                    {
                        val = make([]bool, len(valRaw))
                        for i, rv := range valRaw {
                            v, err2 := strconv.ParseBool(rv)
                            if err2 != nil {
                                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "array of booleans"))
                            }
                            val[i] = v
                        }
                    }
                    q[key] = val
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapStringArrayBoolPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapStringArrayBoolEncodeCode = `// EncodeMethodQueryMapStringArrayBoolRequest returns an encoder for requests
// sent to the ServiceQueryMapStringArrayBool MethodQueryMapStringArrayBool
// server.
func EncodeMethodQueryMapStringArrayBoolRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapstringarraybool.MethodQueryMapStringArrayBoolPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapStringArrayBool", "MethodQueryMapStringArrayBool", "*servicequerymapstringarraybool.MethodQueryMapStringArrayBoolPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapStringArrayBoolValidateConstructorCode = `// NewMethodQueryMapStringArrayBoolValidatePayload builds a
// ServiceQueryMapStringArrayBoolValidate service
// MethodQueryMapStringArrayBoolValidate endpoint payload.
func NewMethodQueryMapStringArrayBoolValidatePayload(q map[string][]bool) *servicequerymapstringarrayboolvalidate.MethodQueryMapStringArrayBoolValidatePayload {
    return &servicequerymapstringarrayboolvalidate.MethodQueryMapStringArrayBoolValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapStringArrayBoolValidateDSL = func() {
    Service("ServiceQueryMapStringArrayBoolValidate", func() {
        Method("MethodQueryMapStringArrayBoolValidate", func() {
            Payload(func() {
                Attribute("q", MapOf(String, ArrayOf(Boolean)), func() {
                    MinLength(1)
                    Key(func() {
                        Enum("key")
                    })
                    Elem(func() {
                        MinLength(2)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapStringArrayBoolValidateDecodeCode = `// DecodeMethodQueryMapStringArrayBoolValidateRequest returns a decoder for
// requests sent to the ServiceQueryMapStringArrayBoolValidate
// MethodQueryMapStringArrayBoolValidate endpoint.
func DecodeMethodQueryMapStringArrayBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[string][]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make(map[string][]bool, len(qRaw))
            for key, valRaw := range qRaw {
                var val []bool
                {
                    val = make([]bool, len(valRaw))
                    for i, rv := range valRaw {
                        v, err2 := strconv.ParseBool(rv)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "array of booleans"))
                        }
                        val[i] = v
                    }
                }
                q[key] = val
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == "key") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{"key"}))
            }
            if len(v) < 2 {
                err = goa.MergeErrors(err, goa.InvalidLengthError("q[key]", v, len(v), 2, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapStringArrayBoolValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapStringArrayBoolValidateEncodeCode = `// EncodeMethodQueryMapStringArrayBoolValidateRequest returns an encoder for
// requests sent to the ServiceQueryMapStringArrayBoolValidate
// MethodQueryMapStringArrayBoolValidate server.
func EncodeMethodQueryMapStringArrayBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapstringarrayboolvalidate.MethodQueryMapStringArrayBoolValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapStringArrayBoolValidate", "MethodQueryMapStringArrayBoolValidate", "*servicequerymapstringarrayboolvalidate.MethodQueryMapStringArrayBoolValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapStringArrayStringConstructorCode = `// NewMethodQueryMapStringArrayStringPayload builds a
// ServiceQueryMapStringArrayString service MethodQueryMapStringArrayString
// endpoint payload.
func NewMethodQueryMapStringArrayStringPayload(q map[string][]string) *servicequerymapstringarraystring.MethodQueryMapStringArrayStringPayload {
    return &servicequerymapstringarraystring.MethodQueryMapStringArrayStringPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapStringArrayStringDSL = func() {
    Service("ServiceQueryMapStringArrayString", func() {
        Method("MethodQueryMapStringArrayString", func() {
            Payload(func() {
                Attribute("q", MapOf(String, ArrayOf(String)))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapStringArrayStringDecodeCode = `// DecodeMethodQueryMapStringArrayStringRequest returns a decoder for requests
// sent to the ServiceQueryMapStringArrayString MethodQueryMapStringArrayString
// endpoint.
func DecodeMethodQueryMapStringArrayStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q map[string][]string
        )
        q = r.URL.Query()
        payload := NewMethodQueryMapStringArrayStringPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapStringArrayStringEncodeCode = `// EncodeMethodQueryMapStringArrayStringRequest returns an encoder for requests
// sent to the ServiceQueryMapStringArrayString MethodQueryMapStringArrayString
// server.
func EncodeMethodQueryMapStringArrayStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapstringarraystring.MethodQueryMapStringArrayStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapStringArrayString", "MethodQueryMapStringArrayString", "*servicequerymapstringarraystring.MethodQueryMapStringArrayStringPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapStringArrayStringValidateConstructorCode = `// NewMethodQueryMapStringArrayStringValidatePayload builds a
// ServiceQueryMapStringArrayStringValidate service
// MethodQueryMapStringArrayStringValidate endpoint payload.
func NewMethodQueryMapStringArrayStringValidatePayload(q map[string][]string) *servicequerymapstringarraystringvalidate.MethodQueryMapStringArrayStringValidatePayload {
    return &servicequerymapstringarraystringvalidate.MethodQueryMapStringArrayStringValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapStringArrayStringValidateDSL = func() {
    Service("ServiceQueryMapStringArrayStringValidate", func() {
        Method("MethodQueryMapStringArrayStringValidate", func() {
            Payload(func() {
                Attribute("q", MapOf(String, ArrayOf(String)), func() {
                    MinLength(1)
                    Key(func() {
                        Enum("key")
                    })
                    Elem(func() {
                        MinLength(2)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapStringArrayStringValidateDecodeCode = `// DecodeMethodQueryMapStringArrayStringValidateRequest returns a decoder for
// requests sent to the ServiceQueryMapStringArrayStringValidate
// MethodQueryMapStringArrayStringValidate endpoint.
func DecodeMethodQueryMapStringArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[string][]string
            err error
        )
        q = r.URL.Query()
        if len(q) == 0 {
            err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == "key") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{"key"}))
            }
            if len(v) < 2 {
                err = goa.MergeErrors(err, goa.InvalidLengthError("q[key]", v, len(v), 2, true))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapStringArrayStringValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapStringArrayStringValidateEncodeCode = `// EncodeMethodQueryMapStringArrayStringValidateRequest returns an encoder for
// requests sent to the ServiceQueryMapStringArrayStringValidate
// MethodQueryMapStringArrayStringValidate server.
func EncodeMethodQueryMapStringArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapstringarraystringvalidate.MethodQueryMapStringArrayStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapStringArrayStringValidate", "MethodQueryMapStringArrayStringValidate", "*servicequerymapstringarraystringvalidate.MethodQueryMapStringArrayStringValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapStringBoolConstructorCode = `// NewMethodQueryMapStringBoolPayload builds a ServiceQueryMapStringBool
// service MethodQueryMapStringBool endpoint payload.
func NewMethodQueryMapStringBoolPayload(q map[string]bool) *servicequerymapstringbool.MethodQueryMapStringBoolPayload {
    return &servicequerymapstringbool.MethodQueryMapStringBoolPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapStringBoolDSL = func() {
    Service("ServiceQueryMapStringBool", func() {
        Method("MethodQueryMapStringBool", func() {
            Payload(func() {
                Attribute("q", MapOf(String, Boolean))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapStringBoolDecodeCode = `// DecodeMethodQueryMapStringBoolRequest returns a decoder for requests sent to
// the ServiceQueryMapStringBool MethodQueryMapStringBool endpoint.
func DecodeMethodQueryMapStringBoolRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[string]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) != 0 {
                q = make(map[string]bool, len(qRaw))
                for key, va := range qRaw {
                    var val bool
                    {
                        valRaw := va[0]
                        v, err2 := strconv.ParseBool(valRaw)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "boolean"))
                        }
                        val = v
                    }
                    q[key] = val
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapStringBoolPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapStringBoolEncodeCode = `// EncodeMethodQueryMapStringBoolRequest returns an encoder for requests sent
// to the ServiceQueryMapStringBool MethodQueryMapStringBool server.
func EncodeMethodQueryMapStringBoolRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapstringbool.MethodQueryMapStringBoolPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapStringBool", "MethodQueryMapStringBool", "*servicequerymapstringbool.MethodQueryMapStringBoolPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapStringBoolValidateConstructorCode = `// NewMethodQueryMapStringBoolValidatePayload builds a
// ServiceQueryMapStringBoolValidate service MethodQueryMapStringBoolValidate
// endpoint payload.
func NewMethodQueryMapStringBoolValidatePayload(q map[string]bool) *servicequerymapstringboolvalidate.MethodQueryMapStringBoolValidatePayload {
    return &servicequerymapstringboolvalidate.MethodQueryMapStringBoolValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapStringBoolValidateDSL = func() {
    Service("ServiceQueryMapStringBoolValidate", func() {
        Method("MethodQueryMapStringBoolValidate", func() {
            Payload(func() {
                Attribute("q", MapOf(String, Boolean), func() {
                    MinLength(1)
                    Key(func() {
                        Enum("key")
                    })
                    Elem(func() {
                        Enum(true)
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapStringBoolValidateDecodeCode = `// DecodeMethodQueryMapStringBoolValidateRequest returns a decoder for requests
// sent to the ServiceQueryMapStringBoolValidate
// MethodQueryMapStringBoolValidate endpoint.
func DecodeMethodQueryMapStringBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[string]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make(map[string]bool, len(qRaw))
            for key, va := range qRaw {
                var val bool
                {
                    valRaw := va[0]
                    v, err2 := strconv.ParseBool(valRaw)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "boolean"))
                    }
                    val = v
                }
                q[key] = val
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == "key") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{"key"}))
            }
            if !(v == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[key]", v, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapStringBoolValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapStringBoolValidateEncodeCode = `// EncodeMethodQueryMapStringBoolValidateRequest returns an encoder for
// requests sent to the ServiceQueryMapStringBoolValidate
// MethodQueryMapStringBoolValidate server.
func EncodeMethodQueryMapStringBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapstringboolvalidate.MethodQueryMapStringBoolValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapStringBoolValidate", "MethodQueryMapStringBoolValidate", "*servicequerymapstringboolvalidate.MethodQueryMapStringBoolValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapStringStringConstructorCode = `// NewMethodQueryMapStringStringPayload builds a ServiceQueryMapStringString
// service MethodQueryMapStringString endpoint payload.
func NewMethodQueryMapStringStringPayload(q map[string]string) *servicequerymapstringstring.MethodQueryMapStringStringPayload {
    return &servicequerymapstringstring.MethodQueryMapStringStringPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapStringStringDSL = func() {
    Service("ServiceQueryMapStringString", func() {
        Method("MethodQueryMapStringString", func() {
            Payload(func() {
                Attribute("q", MapOf(String, String))
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapStringStringDecodeCode = `// DecodeMethodQueryMapStringStringRequest returns a decoder for requests sent
// to the ServiceQueryMapStringString MethodQueryMapStringString endpoint.
func DecodeMethodQueryMapStringStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q map[string]string
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) != 0 {
                q = make(map[string]string, len(qRaw))
                for key, va := range qRaw {
                    var val string
                    {
                        val = va[0]
                    }
                    q[key] = val
                }
            }
        }
        payload := NewMethodQueryMapStringStringPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapStringStringEncodeCode = `// EncodeMethodQueryMapStringStringRequest returns an encoder for requests sent
// to the ServiceQueryMapStringString MethodQueryMapStringString server.
func EncodeMethodQueryMapStringStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapstringstring.MethodQueryMapStringStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapStringString", "MethodQueryMapStringString", "*servicequerymapstringstring.MethodQueryMapStringStringPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryMapStringStringValidateConstructorCode = `// NewMethodQueryMapStringStringValidatePayload builds a
// ServiceQueryMapStringStringValidate service
// MethodQueryMapStringStringValidate endpoint payload.
func NewMethodQueryMapStringStringValidatePayload(q map[string]string) *servicequerymapstringstringvalidate.MethodQueryMapStringStringValidatePayload {
    return &servicequerymapstringstringvalidate.MethodQueryMapStringStringValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryMapStringStringValidateDSL = func() {
    Service("ServiceQueryMapStringStringValidate", func() {
        Method("MethodQueryMapStringStringValidate", func() {
            Payload(func() {
                Attribute("q", MapOf(String, String), func() {
                    MinLength(1)
                    Key(func() {
                        Enum("key")
                    })
                    Elem(func() {
                        Enum("val")
                    })
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryMapStringStringValidateDecodeCode = `// DecodeMethodQueryMapStringStringValidateRequest returns a decoder for
// requests sent to the ServiceQueryMapStringStringValidate
// MethodQueryMapStringStringValidate endpoint.
func DecodeMethodQueryMapStringStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[string]string
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make(map[string]string, len(qRaw))
            for key, va := range qRaw {
                var val string
                {
                    val = va[0]
                }
                q[key] = val
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == "key") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{"key"}))
            }
            if !(v == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[key]", v, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryMapStringStringValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryMapStringStringValidateEncodeCode = `// EncodeMethodQueryMapStringStringValidateRequest returns an encoder for
// requests sent to the ServiceQueryMapStringStringValidate
// MethodQueryMapStringStringValidate server.
func EncodeMethodQueryMapStringStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerymapstringstringvalidate.MethodQueryMapStringStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryMapStringStringValidate", "MethodQueryMapStringStringValidate", "*servicequerymapstringstringvalidate.MethodQueryMapStringStringValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveArrayBoolValidateDSL = func() {
    Service("ServiceQueryPrimitiveArrayBoolValidate", func() {
        Method("MethodQueryPrimitiveArrayBoolValidate", func() {
            Payload(ArrayOf(Boolean), func() {
                MinLength(1)
                Elem(func() {
                    Enum(true)
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryPrimitiveArrayBoolValidateDecodeCode = `// DecodeMethodQueryPrimitiveArrayBoolValidateRequest returns a decoder for
// requests sent to the ServiceQueryPrimitiveArrayBoolValidate
// MethodQueryPrimitiveArrayBoolValidate endpoint.
func DecodeMethodQueryPrimitiveArrayBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []bool
            err error
        )
        {
            qRaw := r.URL.Query()["q"]
            if qRaw == nil {
                return goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make([]bool, len(qRaw))
            for i, rv := range qRaw {
                v, err2 := strconv.ParseBool(rv)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "array of booleans"))
                }
                q[i] = v
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if !(e == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[*]", e, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := q

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveArrayBoolValidateEncodeCode = `// EncodeMethodQueryPrimitiveArrayBoolValidateRequest returns an encoder for
// requests sent to the ServiceQueryPrimitiveArrayBoolValidate
// MethodQueryPrimitiveArrayBoolValidate server.
func EncodeMethodQueryPrimitiveArrayBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.([]bool)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryPrimitiveArrayBoolValidate", "MethodQueryPrimitiveArrayBoolValidate", "[]bool", v)
        }
        values := req.URL.Query()
        for _, value := range p {
            valueStr := strconv.FormatBool(value)
            values.Add("q", valueStr)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveArrayStringValidateDSL = func() {
    Service("ServiceQueryPrimitiveArrayStringValidate", func() {
        Method("MethodQueryPrimitiveArrayStringValidate", func() {
            Payload(ArrayOf(String), func() {
                MinLength(1)
                Elem(func() {
                    Enum("val")
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryPrimitiveArrayStringValidateDecodeCode = `// DecodeMethodQueryPrimitiveArrayStringValidateRequest returns a decoder for
// requests sent to the ServiceQueryPrimitiveArrayStringValidate
// MethodQueryPrimitiveArrayStringValidate endpoint.
func DecodeMethodQueryPrimitiveArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   []string
            err error
        )
        q = r.URL.Query()["q"]
        if q == nil {
            err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for _, e := range q {
            if !(e == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[*]", e, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := q

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveArrayStringValidateEncodeCode = `// EncodeMethodQueryPrimitiveArrayStringValidateRequest returns an encoder for
// requests sent to the ServiceQueryPrimitiveArrayStringValidate
// MethodQueryPrimitiveArrayStringValidate server.
func EncodeMethodQueryPrimitiveArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.([]string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryPrimitiveArrayStringValidate", "MethodQueryPrimitiveArrayStringValidate", "[]string", v)
        }
        values := req.URL.Query()
        for _, value := range p {
            values.Add("q", value)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveBoolValidateDSL = func() {
    Service("ServiceQueryPrimitiveBoolValidate", func() {
        Method("MethodQueryPrimitiveBoolValidate", func() {
            Payload(Boolean, func() {
                Enum(true)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryPrimitiveBoolValidateDecodeCode = `// DecodeMethodQueryPrimitiveBoolValidateRequest returns a decoder for requests
// sent to the ServiceQueryPrimitiveBoolValidate
// MethodQueryPrimitiveBoolValidate endpoint.
func DecodeMethodQueryPrimitiveBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   bool
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseBool(qRaw)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "boolean"))
            }
            q = v
        }
        if !(q == true) {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("q", q, []interface{}{true}))
        }
        if err != nil {
            return nil, err
        }
        payload := q

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveBoolValidateEncodeCode = `// EncodeMethodQueryPrimitiveBoolValidateRequest returns an encoder for
// requests sent to the ServiceQueryPrimitiveBoolValidate
// MethodQueryPrimitiveBoolValidate server.
func EncodeMethodQueryPrimitiveBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(bool)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryPrimitiveBoolValidate", "MethodQueryPrimitiveBoolValidate", "bool", v)
        }
        values := req.URL.Query()
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveMapBoolArrayBoolValidateDSL = func() {
    Service("ServiceQueryPrimitiveMapBoolArrayBoolValidate", func() {
        Method("MethodQueryPrimitiveMapBoolArrayBoolValidate", func() {
            Payload(MapOf(Boolean, ArrayOf(Boolean)), func() {
                MinLength(1)
                Key(func() {
                    Enum(true)
                })
                Elem(func() {
                    MinLength(2)
                    Elem(func() {
                        Enum(false)
                    })
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryPrimitiveMapBoolArrayBoolValidateDecodeCode = `// DecodeMethodQueryPrimitiveMapBoolArrayBoolValidateRequest returns a decoder
// for requests sent to the ServiceQueryPrimitiveMapBoolArrayBoolValidate
// MethodQueryPrimitiveMapBoolArrayBoolValidate endpoint.
func DecodeMethodQueryPrimitiveMapBoolArrayBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[bool][]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make(map[bool][]bool, len(qRaw))
            for keyRaw, valRaw := range qRaw {
                var key bool
                {
                    v, err2 := strconv.ParseBool(keyRaw)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("key", keyRaw, "boolean"))
                    }
                    key = v
                }
                var val []bool
                {
                    val = make([]bool, len(valRaw))
                    for i, rv := range valRaw {
                        v, err2 := strconv.ParseBool(rv)
                        if err2 != nil {
                            err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "array of booleans"))
                        }
                        val[i] = v
                    }
                }
                q[key] = val
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            if !(k == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q.key", k, []interface{}{true}))
            }
            if len(v) < 2 {
                err = goa.MergeErrors(err, goa.InvalidLengthError("q[key]", v, len(v), 2, true))
            }
            for _, e := range v {
                if !(e == false) {
                    err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[key][*]", e, []interface{}{false}))
                }
            }
        }
        if err != nil {
            return nil, err
        }
        payload := q

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveMapBoolArrayBoolValidateEncodeCode = `// EncodeMethodQueryPrimitiveMapBoolArrayBoolValidateRequest returns an encoder
// for requests sent to the ServiceQueryPrimitiveMapBoolArrayBoolValidate
// MethodQueryPrimitiveMapBoolArrayBoolValidate server.
func EncodeMethodQueryPrimitiveMapBoolArrayBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(map[bool][]bool)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryPrimitiveMapBoolArrayBoolValidate", "MethodQueryPrimitiveMapBoolArrayBoolValidate", "map[bool][]bool", v)
        }
        values := req.URL.Query()
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveMapStringArrayStringValidateDSL = func() {
    Service("ServiceQueryPrimitiveMapStringArrayStringValidate", func() {
        Method("MethodQueryPrimitiveMapStringArrayStringValidate", func() {
            Payload(MapOf(String, ArrayOf(String)), func() {
                MinLength(1)
                Key(func() {
                    Pattern("key")
                })
                Elem(func() {
                    MinLength(2)
                    Elem(func() {
                        Pattern("val")
                    })
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryPrimitiveMapStringArrayStringValidateDecodeCode = `// DecodeMethodQueryPrimitiveMapStringArrayStringValidateRequest returns a
// decoder for requests sent to the
// ServiceQueryPrimitiveMapStringArrayStringValidate
// MethodQueryPrimitiveMapStringArrayStringValidate endpoint.
func DecodeMethodQueryPrimitiveMapStringArrayStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[string][]string
            err error
        )
        q = r.URL.Query()
        if len(q) == 0 {
            err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            err = goa.MergeErrors(err, goa.ValidatePattern("q.key", k, "key"))
            if len(v) < 2 {
                err = goa.MergeErrors(err, goa.InvalidLengthError("q[key]", v, len(v), 2, true))
            }
            for _, e := range v {
                err = goa.MergeErrors(err, goa.ValidatePattern("q[key][*]", e, "val"))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := q

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveMapStringArrayStringValidateEncodeCode = `// EncodeMethodQueryPrimitiveMapStringArrayStringValidateRequest returns an
// encoder for requests sent to the
// ServiceQueryPrimitiveMapStringArrayStringValidate
// MethodQueryPrimitiveMapStringArrayStringValidate server.
func EncodeMethodQueryPrimitiveMapStringArrayStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(map[string][]string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryPrimitiveMapStringArrayStringValidate", "MethodQueryPrimitiveMapStringArrayStringValidate", "map[string][]string", v)
        }
        values := req.URL.Query()
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveMapStringBoolValidateDSL = func() {
    Service("ServiceQueryPrimitiveMapStringBoolValidate", func() {
        Method("MethodQueryPrimitiveMapStringBoolValidate", func() {
            Payload(MapOf(String, Boolean), func() {
                MinLength(1)
                Key(func() {
                    Pattern("key")
                })
                Elem(func() {
                    Enum(true)
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryPrimitiveMapStringBoolValidateDecodeCode = `// DecodeMethodQueryPrimitiveMapStringBoolValidateRequest returns a decoder for
// requests sent to the ServiceQueryPrimitiveMapStringBoolValidate
// MethodQueryPrimitiveMapStringBoolValidate endpoint.
func DecodeMethodQueryPrimitiveMapStringBoolValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   map[string]bool
            err error
        )
        {
            qRaw := r.URL.Query()
            if len(qRaw) == 0 {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            q = make(map[string]bool, len(qRaw))
            for key, va := range qRaw {
                var val bool
                {
                    valRaw := va[0]
                    v, err2 := strconv.ParseBool(valRaw)
                    if err2 != nil {
                        err = goa.MergeErrors(err, goa.InvalidFieldTypeError("val", valRaw, "boolean"))
                    }
                    val = v
                }
                q[key] = val
            }
        }
        if len(q) < 1 {
            err = goa.MergeErrors(err, goa.InvalidLengthError("q", q, len(q), 1, true))
        }
        for k, v := range q {
            err = goa.MergeErrors(err, goa.ValidatePattern("q.key", k, "key"))
            if !(v == true) {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q[key]", v, []interface{}{true}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := q

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveMapStringBoolValidateEncodeCode = `// EncodeMethodQueryPrimitiveMapStringBoolValidateRequest returns an encoder
// for requests sent to the ServiceQueryPrimitiveMapStringBoolValidate
// MethodQueryPrimitiveMapStringBoolValidate server.
func EncodeMethodQueryPrimitiveMapStringBoolValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(map[string]bool)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryPrimitiveMapStringBoolValidate", "MethodQueryPrimitiveMapStringBoolValidate", "map[string]bool", v)
        }
        values := req.URL.Query()
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveStringDefaultDSL = func() {
    Service("ServiceQueryPrimitiveStringDefault", func() {
        Method("MethodQueryPrimitiveStringDefault", func() {
            Payload(String, func() {
                Default("def")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryPrimitiveStringDefaultDecodeCode = `// DecodeMethodQueryPrimitiveStringDefaultRequest returns a decoder for
// requests sent to the ServiceQueryPrimitiveStringDefault
// MethodQueryPrimitiveStringDefault endpoint.
func DecodeMethodQueryPrimitiveStringDefaultRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   string
            err error
        )
        q = r.URL.Query().Get("q")
        if q == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
        }
        if err != nil {
            return nil, err
        }
        payload := q

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveStringDefaultEncodeCode = `// EncodeMethodQueryPrimitiveStringDefaultRequest returns an encoder for
// requests sent to the ServiceQueryPrimitiveStringDefault
// MethodQueryPrimitiveStringDefault server.
func EncodeMethodQueryPrimitiveStringDefaultRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryPrimitiveStringDefault", "MethodQueryPrimitiveStringDefault", "string", v)
        }
        values := req.URL.Query()
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveStringValidateDSL = func() {
    Service("ServiceQueryPrimitiveStringValidate", func() {
        Method("MethodQueryPrimitiveStringValidate", func() {
            Payload(String, func() {
                Enum("val")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryPrimitiveStringValidateDecodeCode = `// DecodeMethodQueryPrimitiveStringValidateRequest returns a decoder for
// requests sent to the ServiceQueryPrimitiveStringValidate
// MethodQueryPrimitiveStringValidate endpoint.
func DecodeMethodQueryPrimitiveStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   string
            err error
        )
        q = r.URL.Query().Get("q")
        if q == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
        }
        if !(q == "val") {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("q", q, []interface{}{"val"}))
        }
        if err != nil {
            return nil, err
        }
        payload := q

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryPrimitiveStringValidateEncodeCode = `// EncodeMethodQueryPrimitiveStringValidateRequest returns an encoder for
// requests sent to the ServiceQueryPrimitiveStringValidate
// MethodQueryPrimitiveStringValidate server.
func EncodeMethodQueryPrimitiveStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(string)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryPrimitiveStringValidate", "MethodQueryPrimitiveStringValidate", "string", v)
        }
        values := req.URL.Query()
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryStringConstructorCode = `// NewMethodQueryStringPayload builds a ServiceQueryString service
// MethodQueryString endpoint payload.
func NewMethodQueryStringPayload(q *string) *servicequerystring.MethodQueryStringPayload {
    return &servicequerystring.MethodQueryStringPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryStringDSL = func() {
    Service("ServiceQueryString", func() {
        Method("MethodQueryString", func() {
            Payload(func() {
                Attribute("q", String)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryStringDecodeCode = `// DecodeMethodQueryStringRequest returns a decoder for requests sent to the
// ServiceQueryString MethodQueryString endpoint.
func DecodeMethodQueryStringRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q *string
        )
        qRaw := r.URL.Query().Get("q")
        if qRaw != "" {
            q = &qRaw
        }
        payload := NewMethodQueryStringPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryStringDefaultDSL = func() {
    Service("ServiceQueryStringDefault", func() {
        Method("MethodQueryStringDefault", func() {
            Payload(func() {
                Attribute("q", func() {
                    Default("def")
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryStringDefaultDecodeCode = `// DecodeMethodQueryStringDefaultRequest returns a decoder for requests sent to
// the ServiceQueryStringDefault MethodQueryStringDefault endpoint.
func DecodeMethodQueryStringDefaultRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q string
        )
        qRaw := r.URL.Query().Get("q")
        if qRaw != "" {
            q = qRaw
        } else {
            q = "def"
        }
        payload := NewMethodQueryStringDefaultPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryStringDefaultEncodeCode = `// EncodeMethodQueryStringDefaultRequest returns an encoder for requests sent
// to the ServiceQueryStringDefault MethodQueryStringDefault server.
func EncodeMethodQueryStringDefaultRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerystringdefault.MethodQueryStringDefaultPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryStringDefault", "MethodQueryStringDefault", "*servicequerystringdefault.MethodQueryStringDefaultPayload", v)
        }
        values := req.URL.Query()
        values.Add("q", p.Q)
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryStringDefaultValidateDSL = func() {
    Service("ServiceQueryStringDefaultValidate", func() {
        Method("MethodQueryStringDefaultValidate", func() {
            Payload(func() {
                Attribute("q", func() {
                    Default("def")
                    Enum("def")
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryStringDefaultValidateDecodeCode = `// DecodeMethodQueryStringDefaultValidateRequest returns a decoder for requests
// sent to the ServiceQueryStringDefaultValidate
// MethodQueryStringDefaultValidate endpoint.
func DecodeMethodQueryStringDefaultValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   string
            err error
        )
        qRaw := r.URL.Query().Get("q")
        if qRaw != "" {
            q = qRaw
        } else {
            q = "def"
        }
        if !(q == "def") {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("q", q, []interface{}{"def"}))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryStringDefaultValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryStringEncodeCode = `// EncodeMethodQueryStringRequest returns an encoder for requests sent to the
// ServiceQueryString MethodQueryString server.
func EncodeMethodQueryStringRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerystring.MethodQueryStringPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryString", "MethodQueryString", "*servicequerystring.MethodQueryStringPayload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", *p.Q)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryStringMappedConstructorCode = `// NewMethodQueryStringMappedPayload builds a ServiceQueryStringMapped service
// MethodQueryStringMapped endpoint payload.
func NewMethodQueryStringMappedPayload(query *string) *servicequerystringmapped.MethodQueryStringMappedPayload {
    return &servicequerystringmapped.MethodQueryStringMappedPayload{
        Query: query,
    }
}
`
```
``` go
var PayloadQueryStringMappedDSL = func() {
    Service("ServiceQueryStringMapped", func() {
        Method("MethodQueryStringMapped", func() {
            Payload(func() {
                Attribute("query")
            })
            HTTP(func() {
                GET("/")
                Param("query:q")
            })
        })
    })
}
```
``` go
var PayloadQueryStringMappedDecodeCode = `// DecodeMethodQueryStringMappedRequest returns a decoder for requests sent to
// the ServiceQueryStringMapped MethodQueryStringMapped endpoint.
func DecodeMethodQueryStringMappedRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            query *string
        )
        queryRaw := r.URL.Query().Get("q")
        if queryRaw != "" {
            query = &queryRaw
        }
        payload := NewMethodQueryStringMappedPayload(query)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryStringMappedEncodeCode = `// EncodeMethodQueryStringMappedRequest returns an encoder for requests sent to
// the ServiceQueryStringMapped MethodQueryStringMapped server.
func EncodeMethodQueryStringMappedRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerystringmapped.MethodQueryStringMappedPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryStringMapped", "MethodQueryStringMapped", "*servicequerystringmapped.MethodQueryStringMappedPayload", v)
        }
        values := req.URL.Query()
        if p.Query != nil {
            values.Add("q", *p.Query)
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryStringNotRequiredValidateDSL = func() {
    Service("ServiceQueryStringNotRequiredValidate", func() {
        Method("MethodQueryStringNotRequiredValidate", func() {
            Payload(func() {
                Attribute("q", String, func() {
                    Enum("val")
                })
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryStringNotRequiredValidateDecodeCode = `// DecodeMethodQueryStringNotRequiredValidateRequest returns a decoder for
// requests sent to the ServiceQueryStringNotRequiredValidate
// MethodQueryStringNotRequiredValidate endpoint.
func DecodeMethodQueryStringNotRequiredValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *string
            err error
        )
        qRaw := r.URL.Query().Get("q")
        if qRaw != "" {
            q = &qRaw
        }
        if q != nil {
            if !(*q == "val") {
                err = goa.MergeErrors(err, goa.InvalidEnumValueError("q", *q, []interface{}{"val"}))
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryStringNotRequiredValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryStringValidateConstructorCode = `// NewMethodQueryStringValidatePayload builds a ServiceQueryStringValidate
// service MethodQueryStringValidate endpoint payload.
func NewMethodQueryStringValidatePayload(q string) *servicequerystringvalidate.MethodQueryStringValidatePayload {
    return &servicequerystringvalidate.MethodQueryStringValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryStringValidateDSL = func() {
    Service("ServiceQueryStringValidate", func() {
        Method("MethodQueryStringValidate", func() {
            Payload(func() {
                Attribute("q", String, func() {
                    Enum("val")
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryStringValidateDecodeCode = `// DecodeMethodQueryStringValidateRequest returns a decoder for requests sent
// to the ServiceQueryStringValidate MethodQueryStringValidate endpoint.
func DecodeMethodQueryStringValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   string
            err error
        )
        q = r.URL.Query().Get("q")
        if q == "" {
            err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
        }
        if !(q == "val") {
            err = goa.MergeErrors(err, goa.InvalidEnumValueError("q", q, []interface{}{"val"}))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryStringValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryStringValidateEncodeCode = `// EncodeMethodQueryStringValidateRequest returns an encoder for requests sent
// to the ServiceQueryStringValidate MethodQueryStringValidate server.
func EncodeMethodQueryStringValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequerystringvalidate.MethodQueryStringValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryStringValidate", "MethodQueryStringValidate", "*servicequerystringvalidate.MethodQueryStringValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", p.Q)
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryUInt32ConstructorCode = `// NewMethodQueryUInt32Payload builds a ServiceQueryUInt32 service
// MethodQueryUInt32 endpoint payload.
func NewMethodQueryUInt32Payload(q *uint32) *servicequeryuint32.MethodQueryUInt32Payload {
    return &servicequeryuint32.MethodQueryUInt32Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryUInt32DSL = func() {
    Service("ServiceQueryUInt32", func() {
        Method("MethodQueryUInt32", func() {
            Payload(func() {
                Attribute("q", UInt32)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryUInt32DecodeCode = `// DecodeMethodQueryUInt32Request returns a decoder for requests sent to the
// ServiceQueryUInt32 MethodQueryUInt32 endpoint.
func DecodeMethodQueryUInt32Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *uint32
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseUint(qRaw, 10, 32)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "unsigned integer"))
                }
                pv := uint32(v)
                q = &pv
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryUInt32Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryUInt32EncodeCode = `// EncodeMethodQueryUInt32Request returns an encoder for requests sent to the
// ServiceQueryUInt32 MethodQueryUInt32 server.
func EncodeMethodQueryUInt32Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryuint32.MethodQueryUInt32Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryUInt32", "MethodQueryUInt32", "*servicequeryuint32.MethodQueryUInt32Payload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryUInt32ValidateConstructorCode = `// NewMethodQueryUInt32ValidatePayload builds a ServiceQueryUInt32Validate
// service MethodQueryUInt32Validate endpoint payload.
func NewMethodQueryUInt32ValidatePayload(q uint32) *servicequeryuint32validate.MethodQueryUInt32ValidatePayload {
    return &servicequeryuint32validate.MethodQueryUInt32ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryUInt32ValidateDSL = func() {
    Service("ServiceQueryUInt32Validate", func() {
        Method("MethodQueryUInt32Validate", func() {
            Payload(func() {
                Attribute("q", UInt32, func() {
                    Minimum(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryUInt32ValidateDecodeCode = `// DecodeMethodQueryUInt32ValidateRequest returns a decoder for requests sent
// to the ServiceQueryUInt32Validate MethodQueryUInt32Validate endpoint.
func DecodeMethodQueryUInt32ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   uint32
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseUint(qRaw, 10, 32)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "unsigned integer"))
            }
            q = uint32(v)
        }
        if q < 1 {
            err = goa.MergeErrors(err, goa.InvalidRangeError("q", q, 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryUInt32ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryUInt32ValidateEncodeCode = `// EncodeMethodQueryUInt32ValidateRequest returns an encoder for requests sent
// to the ServiceQueryUInt32Validate MethodQueryUInt32Validate server.
func EncodeMethodQueryUInt32ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryuint32validate.MethodQueryUInt32ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryUInt32Validate", "MethodQueryUInt32Validate", "*servicequeryuint32validate.MethodQueryUInt32ValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryUInt64ConstructorCode = `// NewMethodQueryUInt64Payload builds a ServiceQueryUInt64 service
// MethodQueryUInt64 endpoint payload.
func NewMethodQueryUInt64Payload(q *uint64) *servicequeryuint64.MethodQueryUInt64Payload {
    return &servicequeryuint64.MethodQueryUInt64Payload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryUInt64DSL = func() {
    Service("ServiceQueryUInt64", func() {
        Method("MethodQueryUInt64", func() {
            Payload(func() {
                Attribute("q", UInt64)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryUInt64DecodeCode = `// DecodeMethodQueryUInt64Request returns a decoder for requests sent to the
// ServiceQueryUInt64 MethodQueryUInt64 endpoint.
func DecodeMethodQueryUInt64Request(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *uint64
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseUint(qRaw, 10, 64)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "unsigned integer"))
                }
                q = &v
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryUInt64Payload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryUInt64EncodeCode = `// EncodeMethodQueryUInt64Request returns an encoder for requests sent to the
// ServiceQueryUInt64 MethodQueryUInt64 server.
func EncodeMethodQueryUInt64Request(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryuint64.MethodQueryUInt64Payload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryUInt64", "MethodQueryUInt64", "*servicequeryuint64.MethodQueryUInt64Payload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryUInt64ValidateConstructorCode = `// NewMethodQueryUInt64ValidatePayload builds a ServiceQueryUInt64Validate
// service MethodQueryUInt64Validate endpoint payload.
func NewMethodQueryUInt64ValidatePayload(q uint64) *servicequeryuint64validate.MethodQueryUInt64ValidatePayload {
    return &servicequeryuint64validate.MethodQueryUInt64ValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryUInt64ValidateDSL = func() {
    Service("ServiceQueryUInt64Validate", func() {
        Method("MethodQueryUInt64Validate", func() {
            Payload(func() {
                Attribute("q", UInt64, func() {
                    Minimum(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryUInt64ValidateDecodeCode = `// DecodeMethodQueryUInt64ValidateRequest returns a decoder for requests sent
// to the ServiceQueryUInt64Validate MethodQueryUInt64Validate endpoint.
func DecodeMethodQueryUInt64ValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   uint64
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseUint(qRaw, 10, 64)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "unsigned integer"))
            }
            q = v
        }
        if q < 1 {
            err = goa.MergeErrors(err, goa.InvalidRangeError("q", q, 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryUInt64ValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryUInt64ValidateEncodeCode = `// EncodeMethodQueryUInt64ValidateRequest returns an encoder for requests sent
// to the ServiceQueryUInt64Validate MethodQueryUInt64Validate server.
func EncodeMethodQueryUInt64ValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryuint64validate.MethodQueryUInt64ValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryUInt64Validate", "MethodQueryUInt64Validate", "*servicequeryuint64validate.MethodQueryUInt64ValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryUIntConstructorCode = `// NewMethodQueryUIntPayload builds a ServiceQueryUInt service MethodQueryUInt
// endpoint payload.
func NewMethodQueryUIntPayload(q *uint) *servicequeryuint.MethodQueryUIntPayload {
    return &servicequeryuint.MethodQueryUIntPayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryUIntDSL = func() {
    Service("ServiceQueryUInt", func() {
        Method("MethodQueryUInt", func() {
            Payload(func() {
                Attribute("q", UInt)
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryUIntDecodeCode = `// DecodeMethodQueryUIntRequest returns a decoder for requests sent to the
// ServiceQueryUInt MethodQueryUInt endpoint.
func DecodeMethodQueryUIntRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   *uint
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw != "" {
                v, err2 := strconv.ParseUint(qRaw, 10, strconv.IntSize)
                if err2 != nil {
                    err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "unsigned integer"))
                }
                pv := uint(v)
                q = &pv
            }
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryUIntPayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryUIntEncodeCode = `// EncodeMethodQueryUIntRequest returns an encoder for requests sent to the
// ServiceQueryUInt MethodQueryUInt server.
func EncodeMethodQueryUIntRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryuint.MethodQueryUIntPayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryUInt", "MethodQueryUInt", "*servicequeryuint.MethodQueryUIntPayload", v)
        }
        values := req.URL.Query()
        if p.Q != nil {
            values.Add("q", fmt.Sprintf("%v", *p.Q))
        }
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PayloadQueryUIntValidateConstructorCode = `// NewMethodQueryUIntValidatePayload builds a ServiceQueryUIntValidate service
// MethodQueryUIntValidate endpoint payload.
func NewMethodQueryUIntValidatePayload(q uint) *servicequeryuintvalidate.MethodQueryUIntValidatePayload {
    return &servicequeryuintvalidate.MethodQueryUIntValidatePayload{
        Q: q,
    }
}
`
```
``` go
var PayloadQueryUIntValidateDSL = func() {
    Service("ServiceQueryUIntValidate", func() {
        Method("MethodQueryUIntValidate", func() {
            Payload(func() {
                Attribute("q", UInt, func() {
                    Minimum(1)
                })
                Required("q")
            })
            HTTP(func() {
                GET("/")
                Param("q")
            })
        })
    })
}
```
``` go
var PayloadQueryUIntValidateDecodeCode = `// DecodeMethodQueryUIntValidateRequest returns a decoder for requests sent to
// the ServiceQueryUIntValidate MethodQueryUIntValidate endpoint.
func DecodeMethodQueryUIntValidateRequest(mux goahttp.Muxer, decoder func(*http.Request) goahttp.Decoder) func(*http.Request) (interface{}, error) {
    return func(r *http.Request) (interface{}, error) {
        var (
            q   uint
            err error
        )
        {
            qRaw := r.URL.Query().Get("q")
            if qRaw == "" {
                err = goa.MergeErrors(err, goa.MissingFieldError("q", "query string"))
            }
            v, err2 := strconv.ParseUint(qRaw, 10, strconv.IntSize)
            if err2 != nil {
                err = goa.MergeErrors(err, goa.InvalidFieldTypeError("q", qRaw, "unsigned integer"))
            }
            q = uint(v)
        }
        if q < 1 {
            err = goa.MergeErrors(err, goa.InvalidRangeError("q", q, 1, true))
        }
        if err != nil {
            return nil, err
        }
        payload := NewMethodQueryUIntValidatePayload(q)

        return payload, nil
    }
}
`
```
``` go
var PayloadQueryUIntValidateEncodeCode = `// EncodeMethodQueryUIntValidateRequest returns an encoder for requests sent to
// the ServiceQueryUIntValidate MethodQueryUIntValidate server.
func EncodeMethodQueryUIntValidateRequest(encoder func(*http.Request) goahttp.Encoder) func(*http.Request, interface{}) error {
    return func(req *http.Request, v interface{}) error {
        p, ok := v.(*servicequeryuintvalidate.MethodQueryUIntValidatePayload)
        if !ok {
            return goahttp.ErrInvalidType("ServiceQueryUIntValidate", "MethodQueryUIntValidate", "*servicequeryuintvalidate.MethodQueryUIntValidatePayload", v)
        }
        values := req.URL.Query()
        values.Add("q", fmt.Sprintf("%v", p.Q))
        req.URL.RawQuery = values.Encode()
        return nil
    }
}
`
```
``` go
var PrimitiveErrorResponseDSL = func() {
    Service("ServicePrimitiveErrorResponse", func() {
        Method("MethodPrimitiveErrorResponse", func() {
            Error("bad_request", String)
            Error("internal_error", String)
            HTTP(func() {
                GET("/one/two")
                Response("bad_request", StatusBadRequest)
                Response("internal_error", StatusInternalServerError)
            })
        })
    })
}
```
``` go
var PrimitiveErrorResponseEncoderCode = `// EncodeMethodPrimitiveErrorResponseError returns an encoder for errors
// returned by the MethodPrimitiveErrorResponse ServicePrimitiveErrorResponse
// endpoint.
func EncodeMethodPrimitiveErrorResponseError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error {
    encodeError := goahttp.ErrorEncoder(encoder)
    return func(ctx context.Context, w http.ResponseWriter, v error) error {
        en, ok := v.(ErrorNamer)
        if !ok {
            return encodeError(ctx, w, v)
        }
        switch en.ErrorName() {
        case "bad_request":
            res := v.(serviceprimitiveerrorresponse.BadRequest)
            enc := encoder(ctx, w)
            body := NewMethodPrimitiveErrorResponseBadRequestResponseBody(res)
            w.Header().Set("goa-error", "bad_request")
            w.WriteHeader(http.StatusBadRequest)
            return enc.Encode(body)
        case "internal_error":
            res := v.(serviceprimitiveerrorresponse.InternalError)
            enc := encoder(ctx, w)
            body := NewMethodPrimitiveErrorResponseInternalErrorResponseBody(res)
            w.Header().Set("goa-error", "internal_error")
            w.WriteHeader(http.StatusInternalServerError)
            return enc.Encode(body)
        default:
            return encodeError(ctx, w, v)
        }
    }
}
`
```
``` go
var QueryBoolBuildCode = `// BuildMethodQueryBoolPayload builds the payload for the ServiceQueryBool
// MethodQueryBool endpoint from CLI flags.
func BuildMethodQueryBoolPayload(serviceQueryBoolMethodQueryBoolQ string) (*servicequerybool.MethodQueryBoolPayload, error) {
    var err error
    var q *bool
    {
        if serviceQueryBoolMethodQueryBoolQ != "" {
            val, err := strconv.ParseBool(serviceQueryBoolMethodQueryBoolQ)
            q = &val
            if err != nil {
                err = fmt.Errorf("invalid value for q, must be BOOL")
            }
        }
    }
    if err != nil {
        return nil, err
    }
    payload := &servicequerybool.MethodQueryBoolPayload{
        Q: q,
    }
    return payload, nil
}
`
```
``` go
var QueryStringBuildCode = `// BuildMethodQueryStringPayload builds the payload for the ServiceQueryString
// MethodQueryString endpoint from CLI flags.
func BuildMethodQueryStringPayload(serviceQueryStringMethodQueryStringQ string) (*servicequerystring.MethodQueryStringPayload, error) {
    var q *string
    {
        if serviceQueryStringMethodQueryStringQ != "" {
            q = &serviceQueryStringMethodQueryStringQ
        }
    }
    payload := &servicequerystring.MethodQueryStringPayload{
        Q: q,
    }
    return payload, nil
}
`
```
``` go
var QueryStringDefaultBuildCode = `// BuildMethodQueryStringDefaultPayload builds the payload for the
// ServiceQueryStringDefault MethodQueryStringDefault endpoint from CLI flags.
func BuildMethodQueryStringDefaultPayload(serviceQueryStringDefaultMethodQueryStringDefaultQ string) (*servicequerystringdefault.MethodQueryStringDefaultPayload, error) {
    var q string
    {
        if serviceQueryStringDefaultMethodQueryStringDefaultQ != "" {
            q = serviceQueryStringDefaultMethodQueryStringDefaultQ
        }
    }
    payload := &servicequerystringdefault.MethodQueryStringDefaultPayload{
        Q: q,
    }
    return payload, nil
}
`
```
``` go
var QueryStringRequiredBuildCode = `// BuildMethodQueryStringValidatePayload builds the payload for the
// ServiceQueryStringValidate MethodQueryStringValidate endpoint from CLI flags.
func BuildMethodQueryStringValidatePayload(serviceQueryStringValidateMethodQueryStringValidateQ string) (*servicequerystringvalidate.MethodQueryStringValidatePayload, error) {
    var q string
    {
        q = serviceQueryStringValidateMethodQueryStringValidateQ
    }
    payload := &servicequerystringvalidate.MethodQueryStringValidatePayload{
        Q: q,
    }
    return payload, nil
}
`
```
``` go
var QueryUInt32BuildCode = `// BuildMethodQueryUInt32Payload builds the payload for the ServiceQueryUInt32
// MethodQueryUInt32 endpoint from CLI flags.
func BuildMethodQueryUInt32Payload(serviceQueryUInt32MethodQueryUInt32Q string) (*servicequeryuint32.MethodQueryUInt32Payload, error) {
    var err error
    var q *uint32
    {
        if serviceQueryUInt32MethodQueryUInt32Q != "" {
            var v uint64
            v, err = strconv.ParseUint(serviceQueryUInt32MethodQueryUInt32Q, 10, 32)
            val := uint32(v)
            q = &val
            if err != nil {
                err = fmt.Errorf("invalid value for q, must be UINT32")
            }
        }
    }
    if err != nil {
        return nil, err
    }
    payload := &servicequeryuint32.MethodQueryUInt32Payload{
        Q: q,
    }
    return payload, nil
}
`
```
``` go
var QueryUIntBuildCode = `// BuildMethodQueryUIntPayload builds the payload for the ServiceQueryUInt
// MethodQueryUInt endpoint from CLI flags.
func BuildMethodQueryUIntPayload(serviceQueryUIntMethodQueryUIntQ string) (*servicequeryuint.MethodQueryUIntPayload, error) {
    var err error
    var q *uint
    {
        if serviceQueryUIntMethodQueryUIntQ != "" {
            var v uint64
            v, err = strconv.ParseUint(serviceQueryUIntMethodQueryUIntQ, 10, 64)
            val := uint(v)
            q = &val
            if err != nil {
                err = fmt.Errorf("invalid value for q, must be UINT")
            }
        }
    }
    if err != nil {
        return nil, err
    }
    payload := &servicequeryuint.MethodQueryUIntPayload{
        Q: q,
    }
    return payload, nil
}
`
```
``` go
var ResultBodyArrayStringDSL = func() {
    Service("ServiceBodyArrayString", func() {
        Method("MethodBodyArrayString", func() {
            Result(func() {
                Attribute("b", ArrayOf(String))
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyArrayStringEncodeCode = `// EncodeMethodBodyArrayStringResponse returns an encoder for responses
// returned by the ServiceBodyArrayString MethodBodyArrayString endpoint.
func EncodeMethodBodyArrayStringResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicebodyarraystring.MethodBodyArrayStringResult)
        enc := encoder(ctx, w)
        body := NewMethodBodyArrayStringResponseBody(res)
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyArrayUserDSL = func() {
    var ResultType = Type("ResultType", func() {
        Attribute("a", String, func() {
            Pattern("apattern")
        })
    })
    Service("ServiceBodyArrayUser", func() {
        Method("MethodBodyArrayUser", func() {
            Result(func() {
                Attribute("b", ArrayOf(ResultType))
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyArrayUserEncodeCode = `// EncodeMethodBodyArrayUserResponse returns an encoder for responses returned
// by the ServiceBodyArrayUser MethodBodyArrayUser endpoint.
func EncodeMethodBodyArrayUserResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicebodyarrayuser.MethodBodyArrayUserResult)
        enc := encoder(ctx, w)
        body := NewMethodBodyArrayUserResponseBody(res)
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyCollectionDSL = func() {
    var RT = ResultType("ResultTypeCollection", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
            Attribute("c", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
        View("tiny", func() {
            Attribute("c")
        })
    })
    Service("ServiceBodyCollection", func() {
        Method("MethodBodyCollection", func() {
            Result(CollectionOf(RT))
            HTTP(func() {
                POST("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var ResultBodyCollectionExplicitViewDSL = func() {
    var RT = ResultType("ResultTypeCollection", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", String)
            Attribute("c", String)
        })
        View("default", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
        View("tiny", func() {
            Attribute("c")
        })
    })
    Service("ServiceBodyCollectionExplicitView", func() {
        Method("MethodBodyCollectionExplicitView", func() {
            Result(CollectionOf(RT), func() {
                View("tiny")
            })
            HTTP(func() {
                POST("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var ResultBodyCollectionExplicitViewEncodeCode = `// EncodeMethodBodyCollectionExplicitViewResponse returns an encoder for
// responses returned by the ServiceBodyCollectionExplicitView
// MethodBodyCollectionExplicitView endpoint.
func EncodeMethodBodyCollectionExplicitViewResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(servicebodycollectionexplicitviewviews.ResulttypecollectionCollection)
        enc := encoder(ctx, w)
        body := NewResulttypecollectionResponseBodyTinyCollection(res.Projected)
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyCollectionMultipleViewsEncodeCode = `// EncodeMethodBodyCollectionResponse returns an encoder for responses returned
// by the ServiceBodyCollection MethodBodyCollection endpoint.
func EncodeMethodBodyCollectionResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(servicebodycollectionviews.ResulttypecollectionCollection)
        w.Header().Set("goa-view", res.View)
        enc := encoder(ctx, w)
        var body interface{}
        switch res.View {
        case "default", "":
            body = NewResulttypecollectionResponseBodyCollection(res.Projected)
        case "tiny":
            body = NewResulttypecollectionResponseBodyTinyCollection(res.Projected)
        }
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyHeaderObjectDSL = func() {
    Service("ServiceBodyHeaderObject", func() {
        Method("MethodBodyHeaderObject", func() {
            Result(func() {
                Attribute("a", String)
                Attribute("b", String)
            })
            HTTP(func() {
                POST("/")
                Response(StatusOK, func() {
                    Header("b")
                })
            })
        })
    })
}
```
``` go
var ResultBodyHeaderObjectEncodeCode = `// EncodeMethodBodyHeaderObjectResponse returns an encoder for responses
// returned by the ServiceBodyHeaderObject MethodBodyHeaderObject endpoint.
func EncodeMethodBodyHeaderObjectResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicebodyheaderobject.MethodBodyHeaderObjectResult)
        enc := encoder(ctx, w)
        body := NewMethodBodyHeaderObjectResponseBody(res)
        if res.B != nil {
            w.Header().Set("b", *res.B)
        }
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyHeaderUserDSL = func() {
    var ResultType = Type("ResultType", func() {
        Attribute("a", String)
        Attribute("b", String)
    })
    Service("ServiceBodyHeaderUser", func() {
        Method("MethodBodyHeaderUser", func() {
            Result(ResultType)
            HTTP(func() {
                POST("/")
                Response(StatusOK, func() {
                    Header("b")
                })
            })
        })
    })
}
```
``` go
var ResultBodyHeaderUserEncodeCode = `// EncodeMethodBodyHeaderUserResponse returns an encoder for responses returned
// by the ServiceBodyHeaderUser MethodBodyHeaderUser endpoint.
func EncodeMethodBodyHeaderUserResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicebodyheaderuser.ResultType)
        enc := encoder(ctx, w)
        body := NewMethodBodyHeaderUserResponseBody(res)
        if res.B != nil {
            w.Header().Set("b", *res.B)
        }
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyMultipleViewsDSL = func() {
    var ResultType = ResultType("ResultTypeMultipleViews", func() {
        Attribute("a", String)
        Attribute("b", String)
        Attribute("c", String)
        View("default", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
        View("tiny", func() {
            Attribute("c")
        })
    })
    Service("ServiceBodyMultipleView", func() {
        Method("MethodBodyMultipleView", func() {
            Result(ResultType)
            HTTP(func() {
                POST("/")
                Response(StatusOK, func() {
                    Header("c:Location")
                })
            })
        })
    })
}
```
``` go
var ResultBodyMultipleViewsDecodeCode = `// DecodeMethodBodyMultipleViewResponse returns a decoder for responses
// returned by the ServiceBodyMultipleView MethodBodyMultipleView endpoint.
// restoreBody controls whether the response body should be restored after
// having been read.
func DecodeMethodBodyMultipleViewResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error) {
    return func(resp *http.Response) (interface{}, error) {
        if restoreBody {
            b, err := ioutil.ReadAll(resp.Body)
            if err != nil {
                return nil, err
            }
            resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            defer func() {
                resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            }()
        } else {
            defer resp.Body.Close()
        }
        switch resp.StatusCode {
        case http.StatusOK:
            var (
                body MethodBodyMultipleViewResponseBody
                err  error
            )
            err = decoder(resp).Decode(&body)
            if err != nil {
                return nil, goahttp.ErrDecodingError("ServiceBodyMultipleView", "MethodBodyMultipleView", err)
            }
            var (
                c *string
            )
            cRaw := resp.Header.Get("Location")
            if cRaw != "" {
                c = &cRaw
            }
            p := NewMethodBodyMultipleViewResulttypemultipleviewsOK(&body, c)
            view := resp.Header.Get("goa-view")
            vres := &servicebodymultipleviewviews.Resulttypemultipleviews{p, view}
            if err = vres.Validate(); err != nil {
                return nil, goahttp.ErrValidationError("ServiceBodyMultipleView", "MethodBodyMultipleView", err)
            }
            return servicebodymultipleview.NewResulttypemultipleviews(vres), nil
        default:
            body, _ := ioutil.ReadAll(resp.Body)
            return nil, goahttp.ErrInvalidResponse("ServiceBodyMultipleView", "MethodBodyMultipleView", resp.StatusCode, string(body))
        }
    }
}
`
```
``` go
var ResultBodyMultipleViewsEncodeCode = `// EncodeMethodBodyMultipleViewResponse returns an encoder for responses
// returned by the ServiceBodyMultipleView MethodBodyMultipleView endpoint.
func EncodeMethodBodyMultipleViewResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicebodymultipleviewviews.Resulttypemultipleviews)
        w.Header().Set("goa-view", res.View)
        enc := encoder(ctx, w)
        var body interface{}
        switch res.View {
        case "default", "":
            body = NewMethodBodyMultipleViewResponseBody(res.Projected)
        case "tiny":
            body = NewMethodBodyMultipleViewResponseBodyTiny(res.Projected)
        }
        if res.Projected.C != nil {
            w.Header().Set("Location", *res.Projected.C)
        }
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyObjectDSL = func() {
    Service("ServiceBodyObject", func() {
        Method("MethodBodyObject", func() {
            Result(func() {
                Attribute("b", String)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyObjectEncodeCode = `// EncodeMethodBodyObjectResponse returns an encoder for responses returned by
// the ServiceBodyObject MethodBodyObject endpoint.
func EncodeMethodBodyObjectResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicebodyobject.MethodBodyObjectResult)
        enc := encoder(ctx, w)
        body := NewMethodBodyObjectResponseBody(res)
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyObjectHeaderDSL = func() {
    Service("ServiceBodyObjectHeader", func() {
        Method("MethodBodyObjectHeader", func() {
            Result(func() {
                Attribute("a", String)
                Attribute("b", String)
            })
            HTTP(func() {
                POST("/")
                Response(StatusOK, func() {
                    Header("b:Authorization")
                })
            })
        })
    })
}
```
``` go
var ResultBodyPrimitiveArrayBoolDSL = func() {
    Service("ServiceBodyPrimitiveArrayBool", func() {
        Method("MethodBodyPrimitiveArrayBool", func() {
            Result(ArrayOf(Boolean), func() {
                MinLength(1)
                Elem(func() {
                    Enum(true)
                })
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyPrimitiveArrayBoolEncodeCode = `// EncodeMethodBodyPrimitiveArrayBoolResponse returns an encoder for responses
// returned by the ServiceBodyPrimitiveArrayBool MethodBodyPrimitiveArrayBool
// endpoint.
func EncodeMethodBodyPrimitiveArrayBoolResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.([]bool)
        enc := encoder(ctx, w)
        body := res
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyPrimitiveArrayStringDSL = func() {
    Service("ServiceBodyPrimitiveArrayString", func() {
        Method("MethodBodyPrimitiveArrayString", func() {
            Result(ArrayOf(String), func() {
                MinLength(1)
                Elem(func() {
                    Enum("val")
                })
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyPrimitiveArrayStringEncodeCode = `// EncodeMethodBodyPrimitiveArrayStringResponse returns an encoder for
// responses returned by the ServiceBodyPrimitiveArrayString
// MethodBodyPrimitiveArrayString endpoint.
func EncodeMethodBodyPrimitiveArrayStringResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.([]string)
        enc := encoder(ctx, w)
        body := res
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyPrimitiveArrayUserDSL = func() {
    var ResultType = Type("ResultType", func() {
        Attribute("a", String, func() {
            Pattern("apattern")
        })
    })
    Service("ServiceBodyPrimitiveArrayUser", func() {
        Method("MethodBodyPrimitiveArrayUser", func() {
            Result(ArrayOf(ResultType))
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyPrimitiveArrayUserEncodeCode = `// EncodeMethodBodyPrimitiveArrayUserResponse returns an encoder for responses
// returned by the ServiceBodyPrimitiveArrayUser MethodBodyPrimitiveArrayUser
// endpoint.
func EncodeMethodBodyPrimitiveArrayUserResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.([]*servicebodyprimitivearrayuser.ResultType)
        enc := encoder(ctx, w)
        body := NewResultTypeResponseBody(res)
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyPrimitiveBoolDSL = func() {
    Service("ServiceBodyPrimitiveBool", func() {
        Method("MethodBodyPrimitiveBool", func() {
            Result(Boolean, func() {
                Enum(true)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyPrimitiveBoolEncodeCode = `// EncodeMethodBodyPrimitiveBoolResponse returns an encoder for responses
// returned by the ServiceBodyPrimitiveBool MethodBodyPrimitiveBool endpoint.
func EncodeMethodBodyPrimitiveBoolResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(bool)
        enc := encoder(ctx, w)
        body := res
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyPrimitiveStringDSL = func() {
    Service("ServiceBodyPrimitiveString", func() {
        Method("MethodBodyPrimitiveString", func() {
            Result(String, func() {
                Enum("val")
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyPrimitiveStringEncodeCode = `// EncodeMethodBodyPrimitiveStringResponse returns an encoder for responses
// returned by the ServiceBodyPrimitiveString MethodBodyPrimitiveString
// endpoint.
func EncodeMethodBodyPrimitiveStringResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(string)
        enc := encoder(ctx, w)
        body := res
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyStringDSL = func() {
    Service("ServiceBodyString", func() {
        Method("MethodBodyString", func() {
            Result(func() {
                Attribute("b", String)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyStringEncodeCode = `// EncodeMethodBodyStringResponse returns an encoder for responses returned by
// the ServiceBodyString MethodBodyString endpoint.
func EncodeMethodBodyStringResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicebodystring.MethodBodyStringResult)
        enc := encoder(ctx, w)
        body := NewMethodBodyStringResponseBody(res)
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultBodyUserDSL = func() {
    var ResultType = Type("ResultType", func() {
        Attribute("a", String)
    })
    Service("ServiceBodyUser", func() {
        Method("MethodBodyUser", func() {
            Result(ResultType)
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ResultBodyUserEncodeCode = `// EncodeMethodBodyUserResponse returns an encoder for responses returned by
// the ServiceBodyUser MethodBodyUser endpoint.
func EncodeMethodBodyUserResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicebodyuser.ResultType)
        enc := encoder(ctx, w)
        body := NewMethodBodyUserResponseBody(res)
        w.WriteHeader(http.StatusNoContent)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultHeaderAnyDSL = func() {
    Service("ServiceHeaderAny", func() {
        Method("MethodHeaderAny", func() {
            Result(func() {
                Attribute("h", Any)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderAnyEncodeCode = `// EncodeMethodHeaderAnyResponse returns an encoder for responses returned by
// the ServiceHeaderAny MethodHeaderAny endpoint.
func EncodeMethodHeaderAnyResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderany.MethodHeaderAnyResult)
        if res.H != nil {
            val := res.H
            hs := fmt.Sprintf("%v", val)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayAnyDSL = func() {
    Service("ServiceHeaderArrayAny", func() {
        Method("MethodHeaderArrayAny", func() {
            Result(func() {
                Attribute("h", ArrayOf(Any))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayAnyEncodeCode = `// EncodeMethodHeaderArrayAnyResponse returns an encoder for responses returned
// by the ServiceHeaderArrayAny MethodHeaderArrayAny endpoint.
func EncodeMethodHeaderArrayAnyResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayany.MethodHeaderArrayAnyResult)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := fmt.Sprintf("%v", e)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayBoolDSL = func() {
    Service("ServiceHeaderArrayBool", func() {
        Method("MethodHeaderArrayBool", func() {
            Result(func() {
                Attribute("h", ArrayOf(Boolean))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayBoolDefaultDSL = func() {
    Service("ServiceHeaderArrayBoolDefault", func() {
        Method("MethodHeaderArrayBoolDefault", func() {
            Result(func() {
                Attribute("h", ArrayOf(Boolean), func() {
                    Default([]bool{true, false})
                })
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayBoolDefaultEncodeCode = `// EncodeMethodHeaderArrayBoolDefaultResponse returns an encoder for responses
// returned by the ServiceHeaderArrayBoolDefault MethodHeaderArrayBoolDefault
// endpoint.
func EncodeMethodHeaderArrayBoolDefaultResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarraybooldefault.MethodHeaderArrayBoolDefaultResult)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatBool(e)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        } else {
            w.Header().Set("h", "true, false")
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayBoolEncodeCode = `// EncodeMethodHeaderArrayBoolResponse returns an encoder for responses
// returned by the ServiceHeaderArrayBool MethodHeaderArrayBool endpoint.
func EncodeMethodHeaderArrayBoolResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarraybool.MethodHeaderArrayBoolResult)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatBool(e)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayBoolRequiredDefaultDSL = func() {
    Service("ServiceHeaderArrayBoolRequiredDefault", func() {
        Method("MethodHeaderArrayBoolRequiredDefault", func() {
            Result(func() {
                Attribute("h", ArrayOf(Boolean), func() {
                    Default([]bool{true, false})
                })
                Required("h")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayBoolRequiredDefaultEncodeCode = `// EncodeMethodHeaderArrayBoolRequiredDefaultResponse returns an encoder for
// responses returned by the ServiceHeaderArrayBoolRequiredDefault
// MethodHeaderArrayBoolRequiredDefault endpoint.
func EncodeMethodHeaderArrayBoolRequiredDefaultResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayboolrequireddefault.MethodHeaderArrayBoolRequiredDefaultResult)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatBool(e)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        } else {
            w.Header().Set("h", "true, false")
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayBytesDSL = func() {
    Service("ServiceHeaderArrayBytes", func() {
        Method("MethodHeaderArrayBytes", func() {
            Result(func() {
                Attribute("h", ArrayOf(Bytes))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayBytesEncodeCode = `// EncodeMethodHeaderArrayBytesResponse returns an encoder for responses
// returned by the ServiceHeaderArrayBytes MethodHeaderArrayBytes endpoint.
func EncodeMethodHeaderArrayBytesResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarraybytes.MethodHeaderArrayBytesResult)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := string(e)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayFloat32DSL = func() {
    Service("ServiceHeaderArrayFloat32", func() {
        Method("MethodHeaderArrayFloat32", func() {
            Result(func() {
                Attribute("h", ArrayOf(Float32))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayFloat32EncodeCode = `// EncodeMethodHeaderArrayFloat32Response returns an encoder for responses
// returned by the ServiceHeaderArrayFloat32 MethodHeaderArrayFloat32 endpoint.
func EncodeMethodHeaderArrayFloat32Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayfloat32.MethodHeaderArrayFloat32Result)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatFloat(float64(e), 'f', -1, 32)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayFloat64DSL = func() {
    Service("ServiceHeaderArrayFloat64", func() {
        Method("MethodHeaderArrayFloat64", func() {
            Result(func() {
                Attribute("h", ArrayOf(Float64))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayFloat64EncodeCode = `// EncodeMethodHeaderArrayFloat64Response returns an encoder for responses
// returned by the ServiceHeaderArrayFloat64 MethodHeaderArrayFloat64 endpoint.
func EncodeMethodHeaderArrayFloat64Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayfloat64.MethodHeaderArrayFloat64Result)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatFloat(e, 'f', -1, 64)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayInt32DSL = func() {
    Service("ServiceHeaderArrayInt32", func() {
        Method("MethodHeaderArrayInt32", func() {
            Result(func() {
                Attribute("h", ArrayOf(Int32))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayInt32EncodeCode = `// EncodeMethodHeaderArrayInt32Response returns an encoder for responses
// returned by the ServiceHeaderArrayInt32 MethodHeaderArrayInt32 endpoint.
func EncodeMethodHeaderArrayInt32Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayint32.MethodHeaderArrayInt32Result)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatInt(int64(e), 10)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayInt64DSL = func() {
    Service("ServiceHeaderArrayInt64", func() {
        Method("MethodHeaderArrayInt64", func() {
            Result(func() {
                Attribute("h", ArrayOf(Int64))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayInt64EncodeCode = `// EncodeMethodHeaderArrayInt64Response returns an encoder for responses
// returned by the ServiceHeaderArrayInt64 MethodHeaderArrayInt64 endpoint.
func EncodeMethodHeaderArrayInt64Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayint64.MethodHeaderArrayInt64Result)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatInt(e, 10)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayIntDSL = func() {
    Service("ServiceHeaderArrayInt", func() {
        Method("MethodHeaderArrayInt", func() {
            Result(func() {
                Attribute("h", ArrayOf(Int))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayIntEncodeCode = `// EncodeMethodHeaderArrayIntResponse returns an encoder for responses returned
// by the ServiceHeaderArrayInt MethodHeaderArrayInt endpoint.
func EncodeMethodHeaderArrayIntResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayint.MethodHeaderArrayIntResult)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.Itoa(e)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayStringDSL = func() {
    Service("ServiceHeaderArrayString", func() {
        Method("MethodHeaderArrayString", func() {
            Result(func() {
                Attribute("h", ArrayOf(String))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayStringDefaultDSL = func() {
    Service("ServiceHeaderArrayStringDefault", func() {
        Method("MethodHeaderArrayStringDefault", func() {
            Result(func() {
                Attribute("h", ArrayOf(String), func() {
                    Default([]string{"foo", "bar"})
                })
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayStringDefaultEncodeCode = `// EncodeMethodHeaderArrayStringDefaultResponse returns an encoder for
// responses returned by the ServiceHeaderArrayStringDefault
// MethodHeaderArrayStringDefault endpoint.
func EncodeMethodHeaderArrayStringDefaultResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarraystringdefault.MethodHeaderArrayStringDefaultResult)
        if res.H != nil {
            val := res.H
            hs := strings.Join(val, ", ")
            w.Header().Set("h", hs)
        } else {
            w.Header().Set("h", "foo, bar")
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayStringEncodeCode = `// EncodeMethodHeaderArrayStringResponse returns an encoder for responses
// returned by the ServiceHeaderArrayString MethodHeaderArrayString endpoint.
func EncodeMethodHeaderArrayStringResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarraystring.MethodHeaderArrayStringResult)
        if res.H != nil {
            val := res.H
            hs := strings.Join(val, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayStringRequiredDefaultDSL = func() {
    Service("ServiceHeaderArrayStringRequiredDefault", func() {
        Method("MethodHeaderArrayStringRequiredDefault", func() {
            Result(func() {
                Attribute("h", ArrayOf(String), func() {
                    Default([]string{"foo", "bar"})
                })
                Required("h")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayStringRequiredDefaultEncodeCode = `// EncodeMethodHeaderArrayStringRequiredDefaultResponse returns an encoder for
// responses returned by the ServiceHeaderArrayStringRequiredDefault
// MethodHeaderArrayStringRequiredDefault endpoint.
func EncodeMethodHeaderArrayStringRequiredDefaultResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarraystringrequireddefault.MethodHeaderArrayStringRequiredDefaultResult)
        if res.H != nil {
            val := res.H
            hs := strings.Join(val, ", ")
            w.Header().Set("h", hs)
        } else {
            w.Header().Set("h", "foo, bar")
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayUInt32DSL = func() {
    Service("ServiceHeaderArrayUInt32", func() {
        Method("MethodHeaderArrayUInt32", func() {
            Result(func() {
                Attribute("h", ArrayOf(UInt32))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayUInt32EncodeCode = `// EncodeMethodHeaderArrayUInt32Response returns an encoder for responses
// returned by the ServiceHeaderArrayUInt32 MethodHeaderArrayUInt32 endpoint.
func EncodeMethodHeaderArrayUInt32Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayuint32.MethodHeaderArrayUInt32Result)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatUint(uint64(e), 10)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayUInt64DSL = func() {
    Service("ServiceHeaderArrayUInt64", func() {
        Method("MethodHeaderArrayUInt64", func() {
            Result(func() {
                Attribute("h", ArrayOf(UInt64))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayUInt64EncodeCode = `// EncodeMethodHeaderArrayUInt64Response returns an encoder for responses
// returned by the ServiceHeaderArrayUInt64 MethodHeaderArrayUInt64 endpoint.
func EncodeMethodHeaderArrayUInt64Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayuint64.MethodHeaderArrayUInt64Result)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatUint(e, 10)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderArrayUIntDSL = func() {
    Service("ServiceHeaderArrayUInt", func() {
        Method("MethodHeaderArrayUInt", func() {
            Result(func() {
                Attribute("h", ArrayOf(UInt))
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderArrayUIntEncodeCode = `// EncodeMethodHeaderArrayUIntResponse returns an encoder for responses
// returned by the ServiceHeaderArrayUInt MethodHeaderArrayUInt endpoint.
func EncodeMethodHeaderArrayUIntResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderarrayuint.MethodHeaderArrayUIntResult)
        if res.H != nil {
            val := res.H
            hsSlice := make([]string, len(val))
            for i, e := range val {
                es := strconv.FormatUint(uint64(e), 10)
                hsSlice[i] = es
            }
            hs := strings.Join(hsSlice, ", ")
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderBoolDSL = func() {
    Service("ServiceHeaderBool", func() {
        Method("MethodHeaderBool", func() {
            Result(func() {
                Attribute("h", Boolean)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderBoolDefaultDSL = func() {
    Service("ServiceHeaderBoolDefault", func() {
        Method("MethodHeaderBoolDefault", func() {
            Result(func() {
                Attribute("h", Boolean, func() {
                    Default(true)
                })
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderBoolDefaultEncodeCode = `// EncodeMethodHeaderBoolDefaultResponse returns an encoder for responses
// returned by the ServiceHeaderBoolDefault MethodHeaderBoolDefault endpoint.
func EncodeMethodHeaderBoolDefaultResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderbooldefault.MethodHeaderBoolDefaultResult)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatBool(*val)
            w.Header().Set("h", hs)
        } else {
            w.Header().Set("h", "true")
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderBoolEncodeCode = `// EncodeMethodHeaderBoolResponse returns an encoder for responses returned by
// the ServiceHeaderBool MethodHeaderBool endpoint.
func EncodeMethodHeaderBoolResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderbool.MethodHeaderBoolResult)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatBool(*val)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderBoolRequiredDefaultDSL = func() {
    Service("ServiceHeaderBoolRequiredDefault", func() {
        Method("MethodHeaderBoolRequiredDefault", func() {
            Result(func() {
                Attribute("h", Boolean, func() {
                    Default(true)
                })
                Required("h")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderBoolRequiredDefaultEncodeCode = `// EncodeMethodHeaderBoolRequiredDefaultResponse returns an encoder for
// responses returned by the ServiceHeaderBoolRequiredDefault
// MethodHeaderBoolRequiredDefault endpoint.
func EncodeMethodHeaderBoolRequiredDefaultResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderboolrequireddefault.MethodHeaderBoolRequiredDefaultResult)
        val := res.H
        hs := strconv.FormatBool(val)
        w.Header().Set("h", hs)
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderBytesDSL = func() {
    Service("ServiceHeaderBytes", func() {
        Method("MethodHeaderBytes", func() {
            Result(func() {
                Attribute("h", Bytes)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderBytesEncodeCode = `// EncodeMethodHeaderBytesResponse returns an encoder for responses returned by
// the ServiceHeaderBytes MethodHeaderBytes endpoint.
func EncodeMethodHeaderBytesResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderbytes.MethodHeaderBytesResult)
        if res.H != nil {
            val := res.H
            hs := string(val)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderFloat32DSL = func() {
    Service("ServiceHeaderFloat32", func() {
        Method("MethodHeaderFloat32", func() {
            Result(func() {
                Attribute("h", Float32)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderFloat32EncodeCode = `// EncodeMethodHeaderFloat32Response returns an encoder for responses returned
// by the ServiceHeaderFloat32 MethodHeaderFloat32 endpoint.
func EncodeMethodHeaderFloat32Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderfloat32.MethodHeaderFloat32Result)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatFloat(float64(*val), 'f', -1, 32)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderFloat64DSL = func() {
    Service("ServiceHeaderFloat64", func() {
        Method("MethodHeaderFloat64", func() {
            Result(func() {
                Attribute("h", Float64)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderFloat64EncodeCode = `// EncodeMethodHeaderFloat64Response returns an encoder for responses returned
// by the ServiceHeaderFloat64 MethodHeaderFloat64 endpoint.
func EncodeMethodHeaderFloat64Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderfloat64.MethodHeaderFloat64Result)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatFloat(*val, 'f', -1, 64)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderInt32DSL = func() {
    Service("ServiceHeaderInt32", func() {
        Method("MethodHeaderInt32", func() {
            Result(func() {
                Attribute("h", Int32)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderInt32EncodeCode = `// EncodeMethodHeaderInt32Response returns an encoder for responses returned by
// the ServiceHeaderInt32 MethodHeaderInt32 endpoint.
func EncodeMethodHeaderInt32Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderint32.MethodHeaderInt32Result)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatInt(int64(*val), 10)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderInt64DSL = func() {
    Service("ServiceHeaderInt64", func() {
        Method("MethodHeaderInt64", func() {
            Result(func() {
                Attribute("h", Int64)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderInt64EncodeCode = `// EncodeMethodHeaderInt64Response returns an encoder for responses returned by
// the ServiceHeaderInt64 MethodHeaderInt64 endpoint.
func EncodeMethodHeaderInt64Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderint64.MethodHeaderInt64Result)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatInt(*val, 10)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderIntDSL = func() {
    Service("ServiceHeaderInt", func() {
        Method("MethodHeaderInt", func() {
            Result(func() {
                Attribute("h", Int)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderIntEncodeCode = `// EncodeMethodHeaderIntResponse returns an encoder for responses returned by
// the ServiceHeaderInt MethodHeaderInt endpoint.
func EncodeMethodHeaderIntResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderint.MethodHeaderIntResult)
        if res.H != nil {
            val := res.H
            hs := strconv.Itoa(*val)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderStringDSL = func() {
    Service("ServiceHeaderString", func() {
        Method("MethodHeaderString", func() {
            Result(func() {
                Attribute("h", String)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderStringDefaultDSL = func() {
    Service("ServiceHeaderStringDefault", func() {
        Method("MethodHeaderStringDefault", func() {
            Result(func() {
                Attribute("h", func() {
                    Default("def")
                })
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderStringDefaultEncodeCode = `// EncodeMethodHeaderStringDefaultResponse returns an encoder for responses
// returned by the ServiceHeaderStringDefault MethodHeaderStringDefault
// endpoint.
func EncodeMethodHeaderStringDefaultResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderstringdefault.MethodHeaderStringDefaultResult)
        if res.H != nil {
            w.Header().Set("h", *res.H)
        } else {
            w.Header().Set("h", "def")
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderStringEncodeCode = `// EncodeMethodHeaderStringResponse returns an encoder for responses returned
// by the ServiceHeaderString MethodHeaderString endpoint.
func EncodeMethodHeaderStringResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderstring.MethodHeaderStringResult)
        if res.H != nil {
            w.Header().Set("h", *res.H)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderStringRequiredDefaultDSL = func() {
    Service("ServiceHeaderStringRequiredDefault", func() {
        Method("MethodHeaderStringRequiredDefault", func() {
            Result(func() {
                Attribute("h", func() {
                    Default("def")
                })
                Required("h")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderStringRequiredDefaultEncodeCode = `// EncodeMethodHeaderStringRequiredDefaultResponse returns an encoder for
// responses returned by the ServiceHeaderStringRequiredDefault
// MethodHeaderStringRequiredDefault endpoint.
func EncodeMethodHeaderStringRequiredDefaultResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderstringrequireddefault.MethodHeaderStringRequiredDefaultResult)
        w.Header().Set("h", res.H)
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderUInt32DSL = func() {
    Service("ServiceHeaderUInt32", func() {
        Method("MethodHeaderUInt32", func() {
            Result(func() {
                Attribute("h", UInt32)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderUInt32EncodeCode = `// EncodeMethodHeaderUInt32Response returns an encoder for responses returned
// by the ServiceHeaderUInt32 MethodHeaderUInt32 endpoint.
func EncodeMethodHeaderUInt32Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderuint32.MethodHeaderUInt32Result)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatUint(uint64(*val), 10)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderUInt64DSL = func() {
    Service("ServiceHeaderUInt64", func() {
        Method("MethodHeaderUInt64", func() {
            Result(func() {
                Attribute("h", UInt64)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderUInt64EncodeCode = `// EncodeMethodHeaderUInt64Response returns an encoder for responses returned
// by the ServiceHeaderUInt64 MethodHeaderUInt64 endpoint.
func EncodeMethodHeaderUInt64Response(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderuint64.MethodHeaderUInt64Result)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatUint(*val, 10)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultHeaderUIntDSL = func() {
    Service("ServiceHeaderUInt", func() {
        Method("MethodHeaderUInt", func() {
            Result(func() {
                Attribute("h", UInt)
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK, func() {
                    Header("h")
                })
            })
        })
    })
}
```
``` go
var ResultHeaderUIntEncodeCode = `// EncodeMethodHeaderUIntResponse returns an encoder for responses returned by
// the ServiceHeaderUInt MethodHeaderUInt endpoint.
func EncodeMethodHeaderUIntResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*serviceheaderuint.MethodHeaderUIntResult)
        if res.H != nil {
            val := res.H
            hs := strconv.FormatUint(uint64(*val), 10)
            w.Header().Set("h", hs)
        }
        w.WriteHeader(http.StatusOK)
        return nil
    }
}
`
```
``` go
var ResultMultipleViewsTagDSL = func() {
    var ResultType = ResultType("ResultTypeMultipleViews", func() {
        Attribute("a", String)
        Attribute("b", String)
        Attribute("c", String)
        View("default", func() {
            Attribute("a")
            Attribute("c")
        })
        View("tiny", func() {
            Attribute("c")
        })
    })
    Service("ServiceTagMultipleViews", func() {
        Method("MethodTagMultipleViews", func() {
            Result(ResultType)
            HTTP(func() {
                GET("/")
                Response(StatusAccepted, func() {
                    Header("c")
                    Tag("b", "value")
                })
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var ResultMultipleViewsTagDecodeCode = `// DecodeMethodTagMultipleViewsResponse returns a decoder for responses
// returned by the ServiceTagMultipleViews MethodTagMultipleViews endpoint.
// restoreBody controls whether the response body should be restored after
// having been read.
func DecodeMethodTagMultipleViewsResponse(decoder func(*http.Response) goahttp.Decoder, restoreBody bool) func(*http.Response) (interface{}, error) {
    return func(resp *http.Response) (interface{}, error) {
        if restoreBody {
            b, err := ioutil.ReadAll(resp.Body)
            if err != nil {
                return nil, err
            }
            resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            defer func() {
                resp.Body = ioutil.NopCloser(bytes.NewBuffer(b))
            }()
        } else {
            defer resp.Body.Close()
        }
        switch resp.StatusCode {
        case http.StatusAccepted:
            var (
                body MethodTagMultipleViewsAcceptedResponseBody
                err  error
            )
            err = decoder(resp).Decode(&body)
            if err != nil {
                return nil, goahttp.ErrDecodingError("ServiceTagMultipleViews", "MethodTagMultipleViews", err)
            }
            var (
                c *string
            )
            cRaw := resp.Header.Get("c")
            if cRaw != "" {
                c = &cRaw
            }
            p := NewMethodTagMultipleViewsResulttypemultipleviewsAccepted(&body, c)
            view := resp.Header.Get("goa-view")
            vres := &servicetagmultipleviewsviews.Resulttypemultipleviews{p, view}
            if err = vres.Validate(); err != nil {
                return nil, goahttp.ErrValidationError("ServiceTagMultipleViews", "MethodTagMultipleViews", err)
            }
            return servicetagmultipleviews.NewResulttypemultipleviews(vres), nil
        case http.StatusOK:
            var (
                body MethodTagMultipleViewsOKResponseBody
                err  error
            )
            err = decoder(resp).Decode(&body)
            if err != nil {
                return nil, goahttp.ErrDecodingError("ServiceTagMultipleViews", "MethodTagMultipleViews", err)
            }
            p := NewMethodTagMultipleViewsResulttypemultipleviewsOK(&body)
            view := resp.Header.Get("goa-view")
            vres := &servicetagmultipleviewsviews.Resulttypemultipleviews{p, view}
            if err = vres.Validate(); err != nil {
                return nil, goahttp.ErrValidationError("ServiceTagMultipleViews", "MethodTagMultipleViews", err)
            }
            return servicetagmultipleviews.NewResulttypemultipleviews(vres), nil
        default:
            body, _ := ioutil.ReadAll(resp.Body)
            return nil, goahttp.ErrInvalidResponse("ServiceTagMultipleViews", "MethodTagMultipleViews", resp.StatusCode, string(body))
        }
    }
}
`
```
``` go
var ResultMultipleViewsTagEncodeCode = `// EncodeMethodTagMultipleViewsResponse returns an encoder for responses
// returned by the ServiceTagMultipleViews MethodTagMultipleViews endpoint.
func EncodeMethodTagMultipleViewsResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicetagmultipleviewsviews.Resulttypemultipleviews)
        w.Header().Set("goa-view", res.View)
        if res.Projected.B != nil && *res.Projected.B == "value" {
            enc := encoder(ctx, w)
            var body interface{}
            switch res.View {
            case "default", "":
                body = NewMethodTagMultipleViewsAcceptedResponseBody(res.Projected)
            case "tiny":
                body = NewMethodTagMultipleViewsAcceptedResponseBodyTiny(res.Projected)
            }
            w.Header().Set("c", *res.Projected.C)
            w.WriteHeader(http.StatusAccepted)
            return enc.Encode(body)
        }
        enc := encoder(ctx, w)
        var body interface{}
        switch res.View {
        case "default", "":
            body = NewMethodTagMultipleViewsOKResponseBody(res.Projected)
        case "tiny":
            body = NewMethodTagMultipleViewsOKResponseBodyTiny(res.Projected)
        }
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultTagStringDSL = func() {
    Service("ServiceTagString", func() {
        Method("MethodTagString", func() {
            Result(func() {
                Attribute("h", String)
            })
            HTTP(func() {
                GET("/")
                Response(StatusAccepted, func() {
                    Header("h")
                    Tag("h", "value")
                })
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var ResultTagStringEncodeCode = `// EncodeMethodTagStringResponse returns an encoder for responses returned by
// the ServiceTagString MethodTagString endpoint.
func EncodeMethodTagStringResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicetagstring.MethodTagStringResult)
        if res.H != nil && *res.H == "value" {
            w.Header().Set("h", *res.H)
            w.WriteHeader(http.StatusAccepted)
            return nil
        }
        enc := encoder(ctx, w)
        body := NewMethodTagStringOKResponseBody(res)
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ResultTagStringRequiredDSL = func() {
    Service("ServiceTagStringRequired", func() {
        Method("MethodTagStringRequired", func() {
            Result(func() {
                Attribute("h", String)
                Required("h")
            })
            HTTP(func() {
                GET("/")
                Response(StatusAccepted, func() {
                    Header("h")
                    Tag("h", "value")
                })
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var ResultTagStringRequiredEncodeCode = `// EncodeMethodTagStringRequiredResponse returns an encoder for responses
// returned by the ServiceTagStringRequired MethodTagStringRequired endpoint.
func EncodeMethodTagStringRequiredResponse(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, interface{}) error {
    return func(ctx context.Context, w http.ResponseWriter, v interface{}) error {
        res := v.(*servicetagstringrequired.MethodTagStringRequiredResult)
        if res.H == "value" {
            w.Header().Set("h", res.H)
            w.WriteHeader(http.StatusAccepted)
            return nil
        }
        enc := encoder(ctx, w)
        body := NewMethodTagStringRequiredOKResponseBody(res)
        w.WriteHeader(http.StatusOK)
        return enc.Encode(body)
    }
}
`
```
``` go
var ServerFileServerConstructorCode = `// New instantiates HTTP handlers for all the ServiceFileServer service
// endpoints.
func New(
    e *servicefileserver.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) *Server {
    return &Server{
        Mounts: []*MountPoint{
            {"/path/to/file1.json", "GET", "/server_file_server/file1.json"},
            {"/path/to/file2.json", "GET", "/server_file_server/file2.json"},
            {"/path/to/file3.json", "GET", "/server_file_server/file3.json"},
        },
    }
}
`
```
``` go
var ServerFileServerDSL = func() {
    Service("ServiceFileServer", func() {
        HTTP(func() {
            Path("/server_file_server")
        })
        Files("/file1.json", "/path/to/file1.json")
        Files("/file2.json", "/path/to/file2.json")
        Files("/file3.json", "/path/to/file3.json")
    })
}
```
``` go
var ServerMixedConstructorCode = `// New instantiates HTTP handlers for all the ServerMixed service endpoints.
func New(
    e *servermixed.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) *Server {
    return &Server{
        Mounts: []*MountPoint{
            {"MethodMixed", "GET", "/{id}"},
            {"/path/to/file1.json", "GET", "/file1.json"},
            {"/path/to/file2.json", "GET", "/file2.json"},
        },
        MethodMixed: NewMethodMixedHandler(e.MethodMixed, mux, dec, enc, eh),
    }
}
`
```
``` go
var ServerMixedDSL = func() {
    Service("ServerMixed", func() {
        Method("MethodMixed", func() {
            Payload(func() {
                Attribute("id", String)
            })
            HTTP(func() {
                GET("/{id}")
            })
        })
        Files("/file1.json", "/path/to/file1.json")
        Files("/file2.json", "/path/to/file2.json")
    })
}
```
``` go
var ServerMultiBasesConstructorCode = `// New instantiates HTTP handlers for all the ServiceMultiBases service
// endpoints.
func New(
    e *servicemultibases.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) *Server {
    return &Server{
        Mounts: []*MountPoint{
            {"MethodMultiBases", "GET", "/base_1/{id}"},
            {"MethodMultiBases", "GET", "/base_2/{id}"},
        },
        MethodMultiBases: NewMethodMultiBasesHandler(e.MethodMultiBases, mux, dec, enc, eh),
    }
}
`
```
``` go
var ServerMultiBasesDSL = func() {
    Service("ServiceMultiBases", func() {
        HTTP(func() {
            Path("/base_1")
            Path("/base_2")
        })
        Method("MethodMultiBases", func() {
            Payload(func() {
                Attribute("id", String)
            })
            HTTP(func() {
                GET("/{id}")
            })
        })
    })
}
```
``` go
var ServerMultiEndpointsConstructorCode = `// New instantiates HTTP handlers for all the ServiceMultiEndpoints service
// endpoints.
func New(
    e *servicemultiendpoints.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) *Server {
    return &Server{
        Mounts: []*MountPoint{
            {"MethodMultiEndpoints1", "GET", "/server_multi_endpoints/{id}"},
            {"MethodMultiEndpoints2", "POST", "/server_multi_endpoints"},
        },
        MethodMultiEndpoints1: NewMethodMultiEndpoints1Handler(e.MethodMultiEndpoints1, mux, dec, enc, eh),
        MethodMultiEndpoints2: NewMethodMultiEndpoints2Handler(e.MethodMultiEndpoints2, mux, dec, enc, eh),
    }
}
`
```
``` go
var ServerMultiEndpointsDSL = func() {
    Service("ServiceMultiEndpoints", func() {
        HTTP(func() {
            Path("/server_multi_endpoints")
        })
        Method("MethodMultiEndpoints1", func() {
            Payload(func() {
                Attribute("id", String)
            })
            HTTP(func() {
                GET("/{id}")
            })
        })
        Method("MethodMultiEndpoints2", func() {
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ServerMultipartConstructorCode = `// New instantiates HTTP handlers for all the ServiceMultipart service
// endpoints.
func New(
    e *servicemultipart.Endpoints,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    ServiceMultipartMethodMultiBasesDecoderFn ServiceMultipartMethodMultiBasesDecoderFunc,
) *Server {
    return &Server{
        Mounts: []*MountPoint{
            {"MethodMultiBases", "GET", "/"},
        },
        MethodMultiBases: NewMethodMultiBasesHandler(e.MethodMultiBases, mux, NewServiceMultipartMethodMultiBasesDecoder(mux, ServiceMultipartMethodMultiBasesDecoderFn), enc, eh),
    }
}
`
```
``` go
var ServerMultipartDSL = func() {
    Service("ServiceMultipart", func() {
        Method("MethodMultiBases", func() {
            Payload(String)
            HTTP(func() {
                GET("/")
                MultipartRequest()
            })
        })
    })
}
```
``` go
var ServerNoPayloadNoResultDSL = func() {
    Service("ServiceNoPayloadNoResult", func() {
        Method("MethodNoPayloadNoResult", func() {
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ServerNoPayloadNoResultHandlerConstructorCode = `// NewMethodNoPayloadNoResultHandler creates a HTTP handler which loads the
// HTTP request and calls the "ServiceNoPayloadNoResult" service
// "MethodNoPayloadNoResult" endpoint.
func NewMethodNoPayloadNoResultHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler {
    var (
        encodeResponse = EncodeMethodNoPayloadNoResultResponse(enc)
        encodeError    = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "MethodNoPayloadNoResult")
        ctx = context.WithValue(ctx, goa.ServiceKey, "ServiceNoPayloadNoResult")

        res, err := endpoint(ctx, nil)

        if err != nil {
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
        if err := encodeResponse(ctx, w, res); err != nil {
            eh(ctx, w, err)
        }
    })
}
`
```
``` go
var ServerNoPayloadResultDSL = func() {
    Service("ServiceNoPayloadResult", func() {
        Method("MethodNoPayloadResult", func() {
            Result(func() {
                Attribute("b", Boolean)
            })
            HTTP(func() {
                POST("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var ServerNoPayloadResultHandlerConstructorCode = `// NewMethodNoPayloadResultHandler creates a HTTP handler which loads the HTTP
// request and calls the "ServiceNoPayloadResult" service
// "MethodNoPayloadResult" endpoint.
func NewMethodNoPayloadResultHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler {
    var (
        encodeResponse = EncodeMethodNoPayloadResultResponse(enc)
        encodeError    = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "MethodNoPayloadResult")
        ctx = context.WithValue(ctx, goa.ServiceKey, "ServiceNoPayloadResult")

        res, err := endpoint(ctx, nil)

        if err != nil {
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
        if err := encodeResponse(ctx, w, res); err != nil {
            eh(ctx, w, err)
        }
    })
}
`
```
``` go
var ServerPayloadNoResultDSL = func() {
    Service("ServicePayloadNoResult", func() {
        Method("MethodPayloadNoResult", func() {
            Payload(func() {
                Attribute("a", Boolean)
            })
            HTTP(func() {
                POST("/")
            })
        })
    })
}
```
``` go
var ServerPayloadNoResultHandlerConstructorCode = `// NewMethodPayloadNoResultHandler creates a HTTP handler which loads the HTTP
// request and calls the "ServicePayloadNoResult" service
// "MethodPayloadNoResult" endpoint.
func NewMethodPayloadNoResultHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler {
    var (
        decodeRequest  = DecodeMethodPayloadNoResultRequest(mux, dec)
        encodeResponse = EncodeMethodPayloadNoResultResponse(enc)
        encodeError    = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "MethodPayloadNoResult")
        ctx = context.WithValue(ctx, goa.ServiceKey, "ServicePayloadNoResult")
        payload, err := decodeRequest(r)
        if err != nil {
            eh(ctx, w, err)
            return
        }

        res, err := endpoint(ctx, payload)

        if err != nil {
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
        if err := encodeResponse(ctx, w, res); err != nil {
            eh(ctx, w, err)
        }
    })
}
`
```
``` go
var ServerPayloadResultDSL = func() {
    Service("ServicePayloadResult", func() {
        Method("MethodPayloadResult", func() {
            Payload(func() {
                Attribute("a", Boolean)
            })
            Result(func() {
                Attribute("b", Boolean)
            })
            HTTP(func() {
                POST("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var ServerPayloadResultErrorDSL = func() {
    Service("ServicePayloadResultError", func() {
        Method("MethodPayloadResultError", func() {
            Payload(func() {
                Attribute("a", Boolean)
            })
            Result(func() {
                Attribute("b", Boolean)
            })
            Error("e", func() {
                Attribute("c", Boolean)
            })
            HTTP(func() {
                POST("/")
                Response(StatusOK)
                Response("e", func() {
                    Code(StatusConflict)
                })
            })
        })
    })
}
```
``` go
var ServerPayloadResultErrorHandlerConstructorCode = `// NewMethodPayloadResultErrorHandler creates a HTTP handler which loads the
// HTTP request and calls the "ServicePayloadResultError" service
// "MethodPayloadResultError" endpoint.
func NewMethodPayloadResultErrorHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler {
    var (
        decodeRequest  = DecodeMethodPayloadResultErrorRequest(mux, dec)
        encodeResponse = EncodeMethodPayloadResultErrorResponse(enc)
        encodeError    = EncodeMethodPayloadResultErrorError(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "MethodPayloadResultError")
        ctx = context.WithValue(ctx, goa.ServiceKey, "ServicePayloadResultError")
        payload, err := decodeRequest(r)
        if err != nil {
            eh(ctx, w, err)
            return
        }

        res, err := endpoint(ctx, payload)

        if err != nil {
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
        if err := encodeResponse(ctx, w, res); err != nil {
            eh(ctx, w, err)
        }
    })
}
`
```
``` go
var ServerPayloadResultHandlerConstructorCode = `// NewMethodPayloadResultHandler creates a HTTP handler which loads the HTTP
// request and calls the "ServicePayloadResult" service "MethodPayloadResult"
// endpoint.
func NewMethodPayloadResultHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
) http.Handler {
    var (
        decodeRequest  = DecodeMethodPayloadResultRequest(mux, dec)
        encodeResponse = EncodeMethodPayloadResultResponse(enc)
        encodeError    = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "MethodPayloadResult")
        ctx = context.WithValue(ctx, goa.ServiceKey, "ServicePayloadResult")
        payload, err := decodeRequest(r)
        if err != nil {
            eh(ctx, w, err)
            return
        }

        res, err := endpoint(ctx, payload)

        if err != nil {
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
        if err := encodeResponse(ctx, w, res); err != nil {
            eh(ctx, w, err)
        }
    })
}
`
```
``` go
var ServiceErrorResponseDSL = func() {
    Service("ServiceServiceErrorResponse", func() {
        Error("bad_request")
        HTTP(func() {
            Response("bad_request", StatusBadRequest)
        })
        Method("MethodServiceErrorResponse", func() {
            Error("internal_error")
            HTTP(func() {
                GET("/one/two")
                Response("internal_error", StatusInternalServerError)
            })
        })
    })
}
```
``` go
var ServiceErrorResponseEncoderCode = `// EncodeMethodServiceErrorResponseError returns an encoder for errors returned
// by the MethodServiceErrorResponse ServiceServiceErrorResponse endpoint.
func EncodeMethodServiceErrorResponseError(encoder func(context.Context, http.ResponseWriter) goahttp.Encoder) func(context.Context, http.ResponseWriter, error) error {
    encodeError := goahttp.ErrorEncoder(encoder)
    return func(ctx context.Context, w http.ResponseWriter, v error) error {
        en, ok := v.(ErrorNamer)
        if !ok {
            return encodeError(ctx, w, v)
        }
        switch en.ErrorName() {
        case "internal_error":
            res := v.(*goa.ServiceError)
            enc := encoder(ctx, w)
            body := NewMethodServiceErrorResponseInternalErrorResponseBody(res)
            w.Header().Set("goa-error", "internal_error")
            w.WriteHeader(http.StatusInternalServerError)
            return enc.Encode(body)
        case "bad_request":
            res := v.(*goa.ServiceError)
            enc := encoder(ctx, w)
            body := NewMethodServiceErrorResponseBadRequestResponseBody(res)
            w.Header().Set("goa-error", "bad_request")
            w.WriteHeader(http.StatusBadRequest)
            return enc.Encode(body)
        default:
            return encodeError(ctx, w, v)
        }
    }
}
`
```
``` go
var StreamingPayloadClientEndpointCode = `// StreamingPayloadMethod returns an endpoint that makes HTTP requests to the
// StreamingPayloadService service StreamingPayloadMethod server.
func (c *Client) StreamingPayloadMethod() goa.Endpoint {
    var (
        encodeRequest  = EncodeStreamingPayloadMethodRequest(c.encoder)
        decodeResponse = DecodeStreamingPayloadMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildStreamingPayloadMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        err = encodeRequest(req, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("StreamingPayloadService", "StreamingPayloadMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &StreamingPayloadMethodClientStream{conn: conn}
        return stream, nil
    }
}
`
```
``` go
var StreamingPayloadClientStreamRecvCode = `// CloseAndRecv stops sending messages to the "StreamingPayloadMethod" endpoint
// websocket connection and reads instances of
// "streamingpayloadservice.UserType" from the connection.
func (s *StreamingPayloadMethodClientStream) CloseAndRecv() (*streamingpayloadservice.UserType, error) {
    var (
        rv   *streamingpayloadservice.UserType
        body StreamingPayloadMethodResponseBody
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingPayloadMethodUserTypeOK(&body)
    return res, nil
}
`
```
``` go
var StreamingPayloadClientStreamSendCode = `// Send streams instances of "streamingpayloadservice.Request" to the
// "StreamingPayloadMethod" endpoint websocket connection.
func (s *StreamingPayloadMethodClientStream) Send(v *streamingpayloadservice.Request) error {
    body := NewStreamingPayloadMethodStreamingBody(v)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var PayloadType = Type("Payload", func() {
        Attribute("p", String)
        Attribute("q", String)
        Attribute("r", String)
    })
    var ResultType = Type("UserType", func() {
        Attribute("a", String)
    })
    Service("StreamingPayloadService", func() {
        Method("StreamingPayloadMethod", func() {
            Payload(PayloadType)
            StreamingPayload(Request)
            Result(ResultType)
            HTTP(func() {
                GET("/{p}")
                Param("q")
                Header("r:Location")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadNoPayloadClientEndpointCode = `// StreamingPayloadNoPayloadMethod returns an endpoint that makes HTTP requests
// to the StreamingPayloadNoPayloadService service
// StreamingPayloadNoPayloadMethod server.
func (c *Client) StreamingPayloadNoPayloadMethod() goa.Endpoint {
    var (
        decodeResponse = DecodeStreamingPayloadNoPayloadMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildStreamingPayloadNoPayloadMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("StreamingPayloadNoPayloadService", "StreamingPayloadNoPayloadMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &StreamingPayloadNoPayloadMethodClientStream{conn: conn}
        return stream, nil
    }
}
`
```
``` go
var StreamingPayloadNoPayloadClientStreamRecvCode = `// CloseAndRecv stops sending messages to the "StreamingPayloadNoPayloadMethod"
// endpoint websocket connection and reads instances of
// "streamingpayloadnopayloadservice.UserType" from the connection.
func (s *StreamingPayloadNoPayloadMethodClientStream) CloseAndRecv() (*streamingpayloadnopayloadservice.UserType, error) {
    var (
        rv   *streamingpayloadnopayloadservice.UserType
        body StreamingPayloadNoPayloadMethodResponseBody
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingPayloadNoPayloadMethodUserTypeOK(&body)
    return res, nil
}
`
```
``` go
var StreamingPayloadNoPayloadClientStreamSendCode = `// Send streams instances of "streamingpayloadnopayloadservice.Request" to the
// "StreamingPayloadNoPayloadMethod" endpoint websocket connection.
func (s *StreamingPayloadNoPayloadMethodClientStream) Send(v *streamingpayloadnopayloadservice.Request) error {
    body := NewStreamingPayloadNoPayloadMethodStreamingBody(v)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadNoPayloadDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var ResultType = Type("UserType", func() {
        Attribute("a", String)
    })
    Service("StreamingPayloadNoPayloadService", func() {
        Method("StreamingPayloadNoPayloadMethod", func() {
            StreamingPayload(Request)
            Result(ResultType)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadNoPayloadServerHandlerInitCode = `// NewStreamingPayloadNoPayloadMethodHandler creates a HTTP handler which loads
// the HTTP request and calls the "StreamingPayloadNoPayloadService" service
// "StreamingPayloadNoPayloadMethod" endpoint.
func NewStreamingPayloadNoPayloadMethodHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler {
    var (
        encodeError = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "StreamingPayloadNoPayloadMethod")
        ctx = context.WithValue(ctx, goa.ServiceKey, "StreamingPayloadNoPayloadService")

        v := &streamingpayloadnopayloadservice.StreamingPayloadNoPayloadMethodEndpointInput{
            Stream: &StreamingPayloadNoPayloadMethodServerStream{
                upgrader:     up,
                connConfigFn: connConfigFn,
                w:            w,
                r:            r,
            },
        }
        _, err = endpoint(ctx, v)

        if err != nil {
            if _, ok := err.(websocket.HandshakeError); ok {
                return
            }
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
    })
}
`
```
``` go
var StreamingPayloadNoResultClientStreamCloseCode = `// Close closes the "StreamingPayloadNoResultMethod" endpoint websocket
// connection.
func (s *StreamingPayloadNoResultMethodClientStream) Close() error {
    defer s.conn.Close()
    var err error
    // Send a nil payload to the server implying client closing connection.
    if err = s.conn.WriteJSON(nil); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var StreamingPayloadNoResultClientStreamSendCode = `// Send streams instances of "string" to the "StreamingPayloadNoResultMethod"
// endpoint websocket connection.
func (s *StreamingPayloadNoResultMethodClientStream) Send(v string) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var StreamingPayloadNoResultDSL = func() {
    Service("StreamingPayloadNoResultService", func() {
        Method("StreamingPayloadNoResultMethod", func() {
            StreamingPayload(String)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadNoResultServerStreamCloseCode = `// Close closes the "StreamingPayloadNoResultMethod" endpoint websocket
// connection.
func (s *StreamingPayloadNoResultMethodServerStream) Close() error {
    defer s.conn.Close()
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Close().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    if err = s.conn.WriteControl(
        websocket.CloseMessage,
        websocket.FormatCloseMessage(websocket.CloseNormalClosure, "server closing connection"),
        time.Now().Add(time.Second),
    ); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var StreamingPayloadNoResultServerStreamRecvCode = `// Recv reads instances of "string" from the "StreamingPayloadNoResultMethod"
// endpoint websocket connection.
func (s *StreamingPayloadNoResultMethodServerStream) Recv() (string, error) {
    var (
        rv  string
        msg *string
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var StreamingPayloadPrimitiveArrayClientStreamRecvCode = `// CloseAndRecv stops sending messages to the
// "StreamingPayloadPrimitiveArrayMethod" endpoint websocket connection and
// reads instances of "[]string" from the connection.
func (s *StreamingPayloadPrimitiveArrayMethodClientStream) CloseAndRecv() ([]string, error) {
    var (
        rv   []string
        body []string
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var StreamingPayloadPrimitiveArrayClientStreamSendCode = `// Send streams instances of "[]int32" to the
// "StreamingPayloadPrimitiveArrayMethod" endpoint websocket connection.
func (s *StreamingPayloadPrimitiveArrayMethodClientStream) Send(v []int32) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var StreamingPayloadPrimitiveArrayDSL = func() {
    Service("StreamingPayloadPrimitiveArrayService", func() {
        Method("StreamingPayloadPrimitiveArrayMethod", func() {
            StreamingPayload(ArrayOf(Int32))
            Result(ArrayOf(String))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadPrimitiveArrayServerStreamRecvCode = `// Recv reads instances of "[]int32" from the
// "StreamingPayloadPrimitiveArrayMethod" endpoint websocket connection.
func (s *StreamingPayloadPrimitiveArrayMethodServerStream) Recv() ([]int32, error) {
    var (
        rv  []int32
        msg *[]int32
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var StreamingPayloadPrimitiveArrayServerStreamSendCode = `// SendAndClose streams instances of "[]string" to the
// "StreamingPayloadPrimitiveArrayMethod" endpoint websocket connection and
// closes the connection.
func (s *StreamingPayloadPrimitiveArrayMethodServerStream) SendAndClose(v []string) error {
    defer s.conn.Close()
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var StreamingPayloadPrimitiveClientStreamRecvCode = `// CloseAndRecv stops sending messages to the "StreamingPayloadPrimitiveMethod"
// endpoint websocket connection and reads instances of "string" from the
// connection.
func (s *StreamingPayloadPrimitiveMethodClientStream) CloseAndRecv() (string, error) {
    var (
        rv   string
        body string
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var StreamingPayloadPrimitiveClientStreamSendCode = `// Send streams instances of "string" to the "StreamingPayloadPrimitiveMethod"
// endpoint websocket connection.
func (s *StreamingPayloadPrimitiveMethodClientStream) Send(v string) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var StreamingPayloadPrimitiveDSL = func() {
    Service("StreamingPayloadPrimitiveService", func() {
        Method("StreamingPayloadPrimitiveMethod", func() {
            StreamingPayload(String)
            Result(String)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadPrimitiveMapClientStreamRecvCode = `// CloseAndRecv stops sending messages to the
// "StreamingPayloadPrimitiveMapMethod" endpoint websocket connection and reads
// instances of "map[int]int" from the connection.
func (s *StreamingPayloadPrimitiveMapMethodClientStream) CloseAndRecv() (map[int]int, error) {
    var (
        rv   map[int]int
        body map[int]int
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var StreamingPayloadPrimitiveMapClientStreamSendCode = `// Send streams instances of "map[string]int32" to the
// "StreamingPayloadPrimitiveMapMethod" endpoint websocket connection.
func (s *StreamingPayloadPrimitiveMapMethodClientStream) Send(v map[string]int32) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var StreamingPayloadPrimitiveMapDSL = func() {
    Service("StreamingPayloadPrimitiveMapService", func() {
        Method("StreamingPayloadPrimitiveMapMethod", func() {
            StreamingPayload(MapOf(String, Int32))
            Result(MapOf(Int, Int))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadPrimitiveMapServerStreamRecvCode = `// Recv reads instances of "map[string]int32" from the
// "StreamingPayloadPrimitiveMapMethod" endpoint websocket connection.
func (s *StreamingPayloadPrimitiveMapMethodServerStream) Recv() (map[string]int32, error) {
    var (
        rv  map[string]int32
        msg *map[string]int32
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var StreamingPayloadPrimitiveMapServerStreamSendCode = `// SendAndClose streams instances of "map[int]int" to the
// "StreamingPayloadPrimitiveMapMethod" endpoint websocket connection and
// closes the connection.
func (s *StreamingPayloadPrimitiveMapMethodServerStream) SendAndClose(v map[int]int) error {
    defer s.conn.Close()
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var StreamingPayloadPrimitiveServerStreamRecvCode = `// Recv reads instances of "string" from the "StreamingPayloadPrimitiveMethod"
// endpoint websocket connection.
func (s *StreamingPayloadPrimitiveMethodServerStream) Recv() (string, error) {
    var (
        rv  string
        msg *string
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var StreamingPayloadPrimitiveServerStreamSendCode = `// SendAndClose streams instances of "string" to the
// "StreamingPayloadPrimitiveMethod" endpoint websocket connection and closes
// the connection.
func (s *StreamingPayloadPrimitiveMethodServerStream) SendAndClose(v string) error {
    defer s.conn.Close()
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var StreamingPayloadResultCollectionWithExplicitViewClientStreamRecvCode = `// CloseAndRecv stops sending messages to the
// "StreamingPayloadResultCollectionWithExplicitViewMethod" endpoint websocket
// connection and reads instances of
// "streamingpayloadresultcollectionwithexplicitviewservice.UsertypeCollection"
// from the connection.
func (s *StreamingPayloadResultCollectionWithExplicitViewMethodClientStream) CloseAndRecv() (streamingpayloadresultcollectionwithexplicitviewservice.UsertypeCollection, error) {
    var (
        rv   streamingpayloadresultcollectionwithexplicitviewservice.UsertypeCollection
        body StreamingPayloadResultCollectionWithExplicitViewMethodResponseBody
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingPayloadResultCollectionWithExplicitViewMethodUsertypeCollectionOK(body)
    vres := streamingpayloadresultcollectionwithexplicitviewserviceviews.UsertypeCollection{res, "tiny"}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("StreamingPayloadResultCollectionWithExplicitViewService", "StreamingPayloadResultCollectionWithExplicitViewMethod", err)
    }
    return streamingpayloadresultcollectionwithexplicitviewservice.NewUsertypeCollection(vres), nil
}
`
```
``` go
var StreamingPayloadResultCollectionWithExplicitViewClientStreamSendCode = `// Send streams instances of "interface{}" to the
// "StreamingPayloadResultCollectionWithExplicitViewMethod" endpoint websocket
// connection.
func (s *StreamingPayloadResultCollectionWithExplicitViewMethodClientStream) Send(v interface{}) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var StreamingPayloadResultCollectionWithExplicitViewDSL = func() {
    var ResultT = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("StreamingPayloadResultCollectionWithExplicitViewService", func() {
        Method("StreamingPayloadResultCollectionWithExplicitViewMethod", func() {
            StreamingPayload(Any)
            Result(CollectionOf(ResultT), func() {
                View("tiny")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadResultCollectionWithExplicitViewServerStreamRecvCode = `// Recv reads instances of "interface{}" from the
// "StreamingPayloadResultCollectionWithExplicitViewMethod" endpoint websocket
// connection.
func (s *StreamingPayloadResultCollectionWithExplicitViewMethodServerStream) Recv() (interface{}, error) {
    var (
        rv  interface{}
        msg *interface{}
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var StreamingPayloadResultCollectionWithExplicitViewServerStreamSendCode = `// SendAndClose streams instances of
// "streamingpayloadresultcollectionwithexplicitviewservice.UsertypeCollection"
// to the "StreamingPayloadResultCollectionWithExplicitViewMethod" endpoint
// websocket connection and closes the connection.
func (s *StreamingPayloadResultCollectionWithExplicitViewMethodServerStream) SendAndClose(v streamingpayloadresultcollectionwithexplicitviewservice.UsertypeCollection) error {
    defer s.conn.Close()
    res := streamingpayloadresultcollectionwithexplicitviewservice.NewViewedUsertypeCollection(v, "tiny")
    body := NewUsertypeResponseBodyTinyCollection(res.Projected)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadResultCollectionWithViewsClientStreamRecvCode = `// CloseAndRecv stops sending messages to the
// "StreamingPayloadResultCollectionWithViewsMethod" endpoint websocket
// connection and reads instances of
// "streamingpayloadresultcollectionwithviewsservice.UsertypeCollection" from
// the connection.
func (s *StreamingPayloadResultCollectionWithViewsMethodClientStream) CloseAndRecv() (streamingpayloadresultcollectionwithviewsservice.UsertypeCollection, error) {
    var (
        rv   streamingpayloadresultcollectionwithviewsservice.UsertypeCollection
        body StreamingPayloadResultCollectionWithViewsMethodResponseBody
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingPayloadResultCollectionWithViewsMethodUsertypeCollectionOK(body)
    vres := streamingpayloadresultcollectionwithviewsserviceviews.UsertypeCollection{res, s.view}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("StreamingPayloadResultCollectionWithViewsService", "StreamingPayloadResultCollectionWithViewsMethod", err)
    }
    return streamingpayloadresultcollectionwithviewsservice.NewUsertypeCollection(vres), nil
}
`
```
``` go
var StreamingPayloadResultCollectionWithViewsClientStreamSendCode = `// Send streams instances of "interface{}" to the
// "StreamingPayloadResultCollectionWithViewsMethod" endpoint websocket
// connection.
func (s *StreamingPayloadResultCollectionWithViewsMethodClientStream) Send(v interface{}) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var StreamingPayloadResultCollectionWithViewsClientStreamSetViewCode = `// SetView sets the view to render the interface{} type before sending to the
// "StreamingPayloadResultCollectionWithViewsMethod" endpoint websocket
// connection.
func (s *StreamingPayloadResultCollectionWithViewsMethodClientStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var StreamingPayloadResultCollectionWithViewsDSL = func() {
    var ResultT = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("StreamingPayloadResultCollectionWithViewsService", func() {
        Method("StreamingPayloadResultCollectionWithViewsMethod", func() {
            StreamingPayload(Any)
            Result(CollectionOf(ResultT))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadResultCollectionWithViewsServerStreamRecvCode = `// Recv reads instances of "interface{}" from the
// "StreamingPayloadResultCollectionWithViewsMethod" endpoint websocket
// connection.
func (s *StreamingPayloadResultCollectionWithViewsMethodServerStream) Recv() (interface{}, error) {
    var (
        rv  interface{}
        msg *interface{}
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var StreamingPayloadResultCollectionWithViewsServerStreamSendCode = `// SendAndClose streams instances of
// "streamingpayloadresultcollectionwithviewsservice.UsertypeCollection" to the
// "StreamingPayloadResultCollectionWithViewsMethod" endpoint websocket
// connection and closes the connection.
func (s *StreamingPayloadResultCollectionWithViewsMethodServerStream) SendAndClose(v streamingpayloadresultcollectionwithviewsservice.UsertypeCollection) error {
    defer s.conn.Close()
    res := streamingpayloadresultcollectionwithviewsservice.NewViewedUsertypeCollection(v, s.view)
    var body interface{}
    switch s.view {
    case "tiny":
        body = NewUsertypeResponseBodyTinyCollection(res.Projected)
    case "extended":
        body = NewUsertypeResponseBodyExtendedCollection(res.Projected)
    case "default", "":
        body = NewUsertypeResponseBodyCollection(res.Projected)
    }
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadResultCollectionWithViewsServerStreamSetViewCode = `// SetView sets the view to render the
// streamingpayloadresultcollectionwithviewsservice.UsertypeCollection type
// before sending to the "StreamingPayloadResultCollectionWithViewsMethod"
// endpoint websocket connection.
func (s *StreamingPayloadResultCollectionWithViewsMethodServerStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var StreamingPayloadResultWithExplicitViewClientStreamRecvCode = `// CloseAndRecv stops sending messages to the
// "StreamingPayloadResultWithExplicitViewMethod" endpoint websocket connection
// and reads instances of
// "streamingpayloadresultwithexplicitviewservice.Usertype" from the connection.
func (s *StreamingPayloadResultWithExplicitViewMethodClientStream) CloseAndRecv() (*streamingpayloadresultwithexplicitviewservice.Usertype, error) {
    var (
        rv   *streamingpayloadresultwithexplicitviewservice.Usertype
        body StreamingPayloadResultWithExplicitViewMethodResponseBody
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingPayloadResultWithExplicitViewMethodUsertypeOK(&body)
    vres := &streamingpayloadresultwithexplicitviewserviceviews.Usertype{res, "extended"}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("StreamingPayloadResultWithExplicitViewService", "StreamingPayloadResultWithExplicitViewMethod", err)
    }
    return streamingpayloadresultwithexplicitviewservice.NewUsertype(vres), nil
}
`
```
``` go
var StreamingPayloadResultWithExplicitViewClientStreamSendCode = `// Send streams instances of "float32" to the
// "StreamingPayloadResultWithExplicitViewMethod" endpoint websocket connection.
func (s *StreamingPayloadResultWithExplicitViewMethodClientStream) Send(v float32) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var StreamingPayloadResultWithExplicitViewDSL = func() {
    var ResultT = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("StreamingPayloadResultWithExplicitViewService", func() {
        Method("StreamingPayloadResultWithExplicitViewMethod", func() {
            StreamingPayload(Float32)
            Result(ResultT, func() {
                View("extended")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadResultWithExplicitViewServerStreamRecvCode = `// Recv reads instances of "float32" from the
// "StreamingPayloadResultWithExplicitViewMethod" endpoint websocket connection.
func (s *StreamingPayloadResultWithExplicitViewMethodServerStream) Recv() (float32, error) {
    var (
        rv  float32
        msg *float32
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var StreamingPayloadResultWithExplicitViewServerStreamSendCode = `// SendAndClose streams instances of
// "streamingpayloadresultwithexplicitviewservice.Usertype" to the
// "StreamingPayloadResultWithExplicitViewMethod" endpoint websocket connection
// and closes the connection.
func (s *StreamingPayloadResultWithExplicitViewMethodServerStream) SendAndClose(v *streamingpayloadresultwithexplicitviewservice.Usertype) error {
    defer s.conn.Close()
    res := streamingpayloadresultwithexplicitviewservice.NewViewedUsertype(v, "extended")
    body := NewStreamingPayloadResultWithExplicitViewMethodResponseBodyExtended(res.Projected)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadResultWithViewsClientStreamRecvCode = `// CloseAndRecv stops sending messages to the
// "StreamingPayloadResultWithViewsMethod" endpoint websocket connection and
// reads instances of "streamingpayloadresultwithviewsservice.Usertype" from
// the connection.
func (s *StreamingPayloadResultWithViewsMethodClientStream) CloseAndRecv() (*streamingpayloadresultwithviewsservice.Usertype, error) {
    var (
        rv   *streamingpayloadresultwithviewsservice.Usertype
        body StreamingPayloadResultWithViewsMethodResponseBody
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingPayloadResultWithViewsMethodUsertypeOK(&body)
    vres := &streamingpayloadresultwithviewsserviceviews.Usertype{res, s.view}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("StreamingPayloadResultWithViewsService", "StreamingPayloadResultWithViewsMethod", err)
    }
    return streamingpayloadresultwithviewsservice.NewUsertype(vres), nil
}
`
```
``` go
var StreamingPayloadResultWithViewsClientStreamSendCode = `// Send streams instances of "float32" to the
// "StreamingPayloadResultWithViewsMethod" endpoint websocket connection.
func (s *StreamingPayloadResultWithViewsMethodClientStream) Send(v float32) error {
    return s.conn.WriteJSON(v)
}
`
```
``` go
var StreamingPayloadResultWithViewsClientStreamSetViewCode = `// SetView sets the view to render the float32 type before sending to the
// "StreamingPayloadResultWithViewsMethod" endpoint websocket connection.
func (s *StreamingPayloadResultWithViewsMethodClientStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var StreamingPayloadResultWithViewsDSL = func() {
    var ResultT = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("StreamingPayloadResultWithViewsService", func() {
        Method("StreamingPayloadResultWithViewsMethod", func() {
            StreamingPayload(Float32)
            Result(ResultT)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadResultWithViewsServerStreamRecvCode = `// Recv reads instances of "float32" from the
// "StreamingPayloadResultWithViewsMethod" endpoint websocket connection.
func (s *StreamingPayloadResultWithViewsMethodServerStream) Recv() (float32, error) {
    var (
        rv  float32
        msg *float32
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return body, nil
}
`
```
``` go
var StreamingPayloadResultWithViewsServerStreamSendCode = `// SendAndClose streams instances of
// "streamingpayloadresultwithviewsservice.Usertype" to the
// "StreamingPayloadResultWithViewsMethod" endpoint websocket connection and
// closes the connection.
func (s *StreamingPayloadResultWithViewsMethodServerStream) SendAndClose(v *streamingpayloadresultwithviewsservice.Usertype) error {
    defer s.conn.Close()
    res := streamingpayloadresultwithviewsservice.NewViewedUsertype(v, s.view)
    var body interface{}
    switch s.view {
    case "tiny":
        body = NewStreamingPayloadResultWithViewsMethodResponseBodyTiny(res.Projected)
    case "extended":
        body = NewStreamingPayloadResultWithViewsMethodResponseBodyExtended(res.Projected)
    case "default", "":
        body = NewStreamingPayloadResultWithViewsMethodResponseBody(res.Projected)
    }
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadResultWithViewsServerStreamSetViewCode = `// SetView sets the view to render the
// streamingpayloadresultwithviewsservice.Usertype type before sending to the
// "StreamingPayloadResultWithViewsMethod" endpoint websocket connection.
func (s *StreamingPayloadResultWithViewsMethodServerStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var StreamingPayloadServerHandlerInitCode = `// NewStreamingPayloadMethodHandler creates a HTTP handler which loads the HTTP
// request and calls the "StreamingPayloadService" service
// "StreamingPayloadMethod" endpoint.
func NewStreamingPayloadMethodHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler {
    var (
        decodeRequest = DecodeStreamingPayloadMethodRequest(mux, dec)
        encodeError   = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "StreamingPayloadMethod")
        ctx = context.WithValue(ctx, goa.ServiceKey, "StreamingPayloadService")
        payload, err := decodeRequest(r)
        if err != nil {
            eh(ctx, w, err)
            return
        }

        v := &streamingpayloadservice.StreamingPayloadMethodEndpointInput{
            Stream: &StreamingPayloadMethodServerStream{
                upgrader:     up,
                connConfigFn: connConfigFn,
                w:            w,
                r:            r,
            },
            Payload: payload.(*streamingpayloadservice.Payload),
        }
        _, err = endpoint(ctx, v)

        if err != nil {
            if _, ok := err.(websocket.HandshakeError); ok {
                return
            }
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
    })
}
`
```
``` go
var StreamingPayloadServerStreamRecvCode = `// Recv reads instances of "streamingpayloadservice.Request" from the
// "StreamingPayloadMethod" endpoint websocket connection.
func (s *StreamingPayloadMethodServerStream) Recv() (*streamingpayloadservice.Request, error) {
    var (
        rv  *streamingpayloadservice.Request
        msg **StreamingPayloadMethodStreamingBody
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return NewStreamingPayloadMethodStreamingBody(body), nil
}
`
```
``` go
var StreamingPayloadServerStreamSendCode = `// SendAndClose streams instances of "streamingpayloadservice.UserType" to the
// "StreamingPayloadMethod" endpoint websocket connection and closes the
// connection.
func (s *StreamingPayloadMethodServerStream) SendAndClose(v *streamingpayloadservice.UserType) error {
    defer s.conn.Close()
    res := v
    body := NewStreamingPayloadMethodResponseBody(res)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadUserTypeArrayClientStreamRecvCode = `// CloseAndRecv stops sending messages to the
// "StreamingPayloadUserTypeArrayMethod" endpoint websocket connection and
// reads instances of "string" from the connection.
func (s *StreamingPayloadUserTypeArrayMethodClientStream) CloseAndRecv() (string, error) {
    var (
        rv   string
        body string
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var StreamingPayloadUserTypeArrayClientStreamSendCode = `// Send streams instances of
// "[]*streamingpayloadusertypearrayservice.RequestType" to the
// "StreamingPayloadUserTypeArrayMethod" endpoint websocket connection.
func (s *StreamingPayloadUserTypeArrayMethodClientStream) Send(v []*streamingpayloadusertypearrayservice.RequestType) error {
    body := NewRequestType(v)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadUserTypeArrayDSL = func() {
    var RequestType = Type("RequestType", func() {
        Attribute("a", String)
    })
    Service("StreamingPayloadUserTypeArrayService", func() {
        Method("StreamingPayloadUserTypeArrayMethod", func() {
            StreamingPayload(ArrayOf(RequestType))
            Result(String)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadUserTypeArrayServerStreamRecvCode = `// Recv reads instances of
// "[]*streamingpayloadusertypearrayservice.RequestType" from the
// "StreamingPayloadUserTypeArrayMethod" endpoint websocket connection.
func (s *StreamingPayloadUserTypeArrayMethodServerStream) Recv() ([]*streamingpayloadusertypearrayservice.RequestType, error) {
    var (
        rv  []*streamingpayloadusertypearrayservice.RequestType
        msg *[]*RequestType
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return NewStreamingPayloadUserTypeArrayMethodArray(body), nil
}
`
```
``` go
var StreamingPayloadUserTypeArrayServerStreamSendCode = `// SendAndClose streams instances of "string" to the
// "StreamingPayloadUserTypeArrayMethod" endpoint websocket connection and
// closes the connection.
func (s *StreamingPayloadUserTypeArrayMethodServerStream) SendAndClose(v string) error {
    defer s.conn.Close()
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var StreamingPayloadUserTypeMapClientStreamRecvCode = `// CloseAndRecv stops sending messages to the
// "StreamingPayloadUserTypeMapMethod" endpoint websocket connection and reads
// instances of "[]string" from the connection.
func (s *StreamingPayloadUserTypeMapMethodClientStream) CloseAndRecv() ([]string, error) {
    var (
        rv   []string
        body []string
        err  error
    )
    defer s.conn.Close()
    // Send a nil payload to the server implying end of message
    if err = s.conn.WriteJSON(nil); err != nil {
        return rv, err
    }
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var StreamingPayloadUserTypeMapClientStreamSendCode = `// Send streams instances of
// "map[string]*streamingpayloadusertypemapservice.RequestType" to the
// "StreamingPayloadUserTypeMapMethod" endpoint websocket connection.
func (s *StreamingPayloadUserTypeMapMethodClientStream) Send(v map[string]*streamingpayloadusertypemapservice.RequestType) error {
    body := NewMapStringRequestType(v)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingPayloadUserTypeMapDSL = func() {
    var RequestType = Type("RequestType", func() {
        Attribute("a", String)
    })
    Service("StreamingPayloadUserTypeMapService", func() {
        Method("StreamingPayloadUserTypeMapMethod", func() {
            StreamingPayload(MapOf(String, RequestType))
            Result(ArrayOf(String))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingPayloadUserTypeMapServerStreamRecvCode = `// Recv reads instances of
// "map[string]*streamingpayloadusertypemapservice.RequestType" from the
// "StreamingPayloadUserTypeMapMethod" endpoint websocket connection.
func (s *StreamingPayloadUserTypeMapMethodServerStream) Recv() (map[string]*streamingpayloadusertypemapservice.RequestType, error) {
    var (
        rv  map[string]*streamingpayloadusertypemapservice.RequestType
        msg *map[string]*RequestType
        err error
    )
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Recv().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return rv, err
    }
    if err = s.conn.ReadJSON(&msg); err != nil {
        return rv, err
    }
    if msg == nil {
        return rv, io.EOF
    }
    body := *msg
    return NewStreamingPayloadUserTypeMapMethodMap(body), nil
}
`
```
``` go
var StreamingPayloadUserTypeMapServerStreamSendCode = `// SendAndClose streams instances of "[]string" to the
// "StreamingPayloadUserTypeMapMethod" endpoint websocket connection and closes
// the connection.
func (s *StreamingPayloadUserTypeMapMethodServerStream) SendAndClose(v []string) error {
    defer s.conn.Close()
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var StreamingResultClientEndpointCode = `// StreamingResultMethod returns an endpoint that makes HTTP requests to the
// StreamingResultService service StreamingResultMethod server.
func (c *Client) StreamingResultMethod() goa.Endpoint {
    var (
        encodeRequest  = EncodeStreamingResultMethodRequest(c.encoder)
        decodeResponse = DecodeStreamingResultMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildStreamingResultMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        err = encodeRequest(req, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("StreamingResultService", "StreamingResultMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &StreamingResultMethodClientStream{conn: conn}
        return stream, nil
    }
}
`
```
``` go
var StreamingResultClientStreamRecvCode = `// Recv reads instances of "streamingresultservice.UserType" from the
// "StreamingResultMethod" endpoint websocket connection.
func (s *StreamingResultMethodClientStream) Recv() (*streamingresultservice.UserType, error) {
    var (
        rv   *streamingresultservice.UserType
        body StreamingResultMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingResultMethodUserTypeOK(&body)
    return res, nil
}
`
```
``` go
var StreamingResultCollectionWithExplicitViewClientEndpointCode = `// StreamingResultCollectionWithExplicitViewMethod returns an endpoint that
// makes HTTP requests to the StreamingResultCollectionWithExplicitViewService
// service StreamingResultCollectionWithExplicitViewMethod server.
func (c *Client) StreamingResultCollectionWithExplicitViewMethod() goa.Endpoint {
    var (
        encodeRequest  = EncodeStreamingResultCollectionWithExplicitViewMethodRequest(c.encoder)
        decodeResponse = DecodeStreamingResultCollectionWithExplicitViewMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildStreamingResultCollectionWithExplicitViewMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        err = encodeRequest(req, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("StreamingResultCollectionWithExplicitViewService", "StreamingResultCollectionWithExplicitViewMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &StreamingResultCollectionWithExplicitViewMethodClientStream{conn: conn}
        return stream, nil
    }
}
`
```
``` go
var StreamingResultCollectionWithExplicitViewClientStreamRecvCode = `// Recv reads instances of
// "streamingresultcollectionwithexplicitviewservice.UsertypeCollection" from
// the "StreamingResultCollectionWithExplicitViewMethod" endpoint websocket
// connection.
func (s *StreamingResultCollectionWithExplicitViewMethodClientStream) Recv() (streamingresultcollectionwithexplicitviewservice.UsertypeCollection, error) {
    var (
        rv   streamingresultcollectionwithexplicitviewservice.UsertypeCollection
        body StreamingResultCollectionWithExplicitViewMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingResultCollectionWithExplicitViewMethodUsertypeCollectionOK(body)
    vres := streamingresultcollectionwithexplicitviewserviceviews.UsertypeCollection{res, "tiny"}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("StreamingResultCollectionWithExplicitViewService", "StreamingResultCollectionWithExplicitViewMethod", err)
    }
    return streamingresultcollectionwithexplicitviewservice.NewUsertypeCollection(vres), nil
}
`
```
``` go
var StreamingResultCollectionWithExplicitViewDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var Result = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("StreamingResultCollectionWithExplicitViewService", func() {
        Method("StreamingResultCollectionWithExplicitViewMethod", func() {
            Payload(Request)
            StreamingResult(CollectionOf(Result), func() {
                View("tiny")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultCollectionWithExplicitViewServerStreamSendCode = `// Send streams instances of
// "streamingresultcollectionwithexplicitviewservice.UsertypeCollection" to the
// "StreamingResultCollectionWithExplicitViewMethod" endpoint websocket
// connection.
func (s *StreamingResultCollectionWithExplicitViewMethodServerStream) Send(v streamingresultcollectionwithexplicitviewservice.UsertypeCollection) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := streamingresultcollectionwithexplicitviewservice.NewViewedUsertypeCollection(v, "tiny")
    body := NewUsertypeResponseBodyTinyCollection(res.Projected)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingResultCollectionWithViewsClientStreamRecvCode = `// Recv reads instances of
// "streamingresultcollectionwithviewsservice.UsertypeCollection" from the
// "StreamingResultCollectionWithViewsMethod" endpoint websocket connection.
func (s *StreamingResultCollectionWithViewsMethodClientStream) Recv() (streamingresultcollectionwithviewsservice.UsertypeCollection, error) {
    var (
        rv   streamingresultcollectionwithviewsservice.UsertypeCollection
        body StreamingResultCollectionWithViewsMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingResultCollectionWithViewsMethodUsertypeCollectionOK(body)
    vres := streamingresultcollectionwithviewsserviceviews.UsertypeCollection{res, s.view}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("StreamingResultCollectionWithViewsService", "StreamingResultCollectionWithViewsMethod", err)
    }
    return streamingresultcollectionwithviewsservice.NewUsertypeCollection(vres), nil
}
`
```
``` go
var StreamingResultCollectionWithViewsClientStreamSetViewCode = `// SetView sets the view to render the  type before sending to the
// "StreamingResultCollectionWithViewsMethod" endpoint websocket connection.
func (s *StreamingResultCollectionWithViewsMethodClientStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var StreamingResultCollectionWithViewsDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var Result = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("StreamingResultCollectionWithViewsService", func() {
        Method("StreamingResultCollectionWithViewsMethod", func() {
            Payload(Request)
            StreamingResult(CollectionOf(Result))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultCollectionWithViewsServerStreamSendCode = `// Send streams instances of
// "streamingresultcollectionwithviewsservice.UsertypeCollection" to the
// "StreamingResultCollectionWithViewsMethod" endpoint websocket connection.
func (s *StreamingResultCollectionWithViewsMethodServerStream) Send(v streamingresultcollectionwithviewsservice.UsertypeCollection) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        respHdr := make(http.Header)
        respHdr.Add("goa-view", s.view)
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, respHdr)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := streamingresultcollectionwithviewsservice.NewViewedUsertypeCollection(v, s.view)
    var body interface{}
    switch s.view {
    case "tiny":
        body = NewUsertypeResponseBodyTinyCollection(res.Projected)
    case "extended":
        body = NewUsertypeResponseBodyExtendedCollection(res.Projected)
    case "default", "":
        body = NewUsertypeResponseBodyCollection(res.Projected)
    }
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingResultCollectionWithViewsServerStreamSetViewCode = `// SetView sets the view to render the
// streamingresultcollectionwithviewsservice.UsertypeCollection type before
// sending to the "StreamingResultCollectionWithViewsMethod" endpoint websocket
// connection.
func (s *StreamingResultCollectionWithViewsMethodServerStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var StreamingResultDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var Result = Type("UserType", func() {
        Attribute("a", String)
    })
    Service("StreamingResultService", func() {
        Method("StreamingResultMethod", func() {
            Payload(Request)
            StreamingResult(Result)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultNoPayloadClientEndpointCode = `// StreamingResultNoPayloadMethod returns an endpoint that makes HTTP requests
// to the StreamingResultNoPayloadService service
// StreamingResultNoPayloadMethod server.
func (c *Client) StreamingResultNoPayloadMethod() goa.Endpoint {
    var (
        decodeResponse = DecodeStreamingResultNoPayloadMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildStreamingResultNoPayloadMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("StreamingResultNoPayloadService", "StreamingResultNoPayloadMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &StreamingResultNoPayloadMethodClientStream{conn: conn}
        return stream, nil
    }
}
`
```
``` go
var StreamingResultNoPayloadDSL = func() {
    var Result = Type("UserType", func() {
        Attribute("a", String)
    })
    Service("StreamingResultNoPayloadService", func() {
        Method("StreamingResultNoPayloadMethod", func() {
            StreamingResult(Result)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultNoPayloadServerHandlerInitCode = `// NewStreamingResultNoPayloadMethodHandler creates a HTTP handler which loads
// the HTTP request and calls the "StreamingResultNoPayloadService" service
// "StreamingResultNoPayloadMethod" endpoint.
func NewStreamingResultNoPayloadMethodHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler {
    var (
        encodeError = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "StreamingResultNoPayloadMethod")
        ctx = context.WithValue(ctx, goa.ServiceKey, "StreamingResultNoPayloadService")

        v := &streamingresultnopayloadservice.StreamingResultNoPayloadMethodEndpointInput{
            Stream: &StreamingResultNoPayloadMethodServerStream{
                upgrader:     up,
                connConfigFn: connConfigFn,
                w:            w,
                r:            r,
            },
        }
        _, err = endpoint(ctx, v)

        if err != nil {
            if _, ok := err.(websocket.HandshakeError); ok {
                return
            }
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
    })
}
`
```
``` go
var StreamingResultPrimitiveArrayClientStreamRecvCode = `// Recv reads instances of "[]int32" from the
// "StreamingResultPrimitiveArrayMethod" endpoint websocket connection.
func (s *StreamingResultPrimitiveArrayMethodClientStream) Recv() ([]int32, error) {
    var (
        rv   []int32
        body []int32
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var StreamingResultPrimitiveArrayDSL = func() {
    Service("StreamingResultPrimitiveArrayService", func() {
        Method("StreamingResultPrimitiveArrayMethod", func() {
            StreamingResult(ArrayOf(Int32))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultPrimitiveArrayServerStreamSendCode = `// Send streams instances of "[]int32" to the
// "StreamingResultPrimitiveArrayMethod" endpoint websocket connection.
func (s *StreamingResultPrimitiveArrayMethodServerStream) Send(v []int32) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var StreamingResultPrimitiveClientStreamRecvCode = `// Recv reads instances of "string" from the "StreamingResultPrimitiveMethod"
// endpoint websocket connection.
func (s *StreamingResultPrimitiveMethodClientStream) Recv() (string, error) {
    var (
        rv   string
        body string
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var StreamingResultPrimitiveDSL = func() {
    Service("StreamingResultPrimitiveService", func() {
        Method("StreamingResultPrimitiveMethod", func() {
            StreamingResult(String)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultPrimitiveMapClientStreamRecvCode = `// Recv reads instances of "map[int32]string" from the
// "StreamingResultPrimitiveMapMethod" endpoint websocket connection.
func (s *StreamingResultPrimitiveMapMethodClientStream) Recv() (map[int32]string, error) {
    var (
        rv   map[int32]string
        body map[int32]string
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    return body, nil
}
`
```
``` go
var StreamingResultPrimitiveMapDSL = func() {
    Service("StreamingResultPrimitiveMapService", func() {
        Method("StreamingResultPrimitiveMapMethod", func() {
            StreamingResult(MapOf(Int32, String))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultPrimitiveMapServerStreamSendCode = `// Send streams instances of "map[int32]string" to the
// "StreamingResultPrimitiveMapMethod" endpoint websocket connection.
func (s *StreamingResultPrimitiveMapMethodServerStream) Send(v map[int32]string) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var StreamingResultPrimitiveServerStreamSendCode = `// Send streams instances of "string" to the "StreamingResultPrimitiveMethod"
// endpoint websocket connection.
func (s *StreamingResultPrimitiveMethodServerStream) Send(v string) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    return s.conn.WriteJSON(res)
}
`
```
``` go
var StreamingResultServerHandlerInitCode = `// NewStreamingResultMethodHandler creates a HTTP handler which loads the HTTP
// request and calls the "StreamingResultService" service
// "StreamingResultMethod" endpoint.
func NewStreamingResultMethodHandler(
    endpoint goa.Endpoint,
    mux goahttp.Muxer,
    dec func(*http.Request) goahttp.Decoder,
    enc func(context.Context, http.ResponseWriter) goahttp.Encoder,
    eh func(context.Context, http.ResponseWriter, error),
    up goahttp.Upgrader,
    connConfigFn goahttp.ConnConfigureFunc,
) http.Handler {
    var (
        decodeRequest = DecodeStreamingResultMethodRequest(mux, dec)
        encodeError   = goahttp.ErrorEncoder(enc)
    )
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := context.WithValue(r.Context(), goahttp.AcceptTypeKey, r.Header.Get("Accept"))
        ctx = context.WithValue(ctx, goa.MethodKey, "StreamingResultMethod")
        ctx = context.WithValue(ctx, goa.ServiceKey, "StreamingResultService")
        payload, err := decodeRequest(r)
        if err != nil {
            eh(ctx, w, err)
            return
        }

        v := &streamingresultservice.StreamingResultMethodEndpointInput{
            Stream: &StreamingResultMethodServerStream{
                upgrader:     up,
                connConfigFn: connConfigFn,
                w:            w,
                r:            r,
            },
            Payload: payload.(*streamingresultservice.Request),
        }
        _, err = endpoint(ctx, v)

        if err != nil {
            if _, ok := err.(websocket.HandshakeError); ok {
                return
            }
            if err := encodeError(ctx, w, err); err != nil {
                eh(ctx, w, err)
            }
            return
        }
    })
}
`
```
``` go
var StreamingResultServerStreamCloseCode = `// Close closes the "StreamingResultMethod" endpoint websocket connection.
func (s *StreamingResultMethodServerStream) Close() error {
    defer s.conn.Close()
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Close().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    if err = s.conn.WriteControl(
        websocket.CloseMessage,
        websocket.FormatCloseMessage(websocket.CloseNormalClosure, "server closing connection"),
        time.Now().Add(time.Second),
    ); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var StreamingResultServerStreamSendCode = `// Send streams instances of "streamingresultservice.UserType" to the
// "StreamingResultMethod" endpoint websocket connection.
func (s *StreamingResultMethodServerStream) Send(v *streamingresultservice.UserType) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    body := NewStreamingResultMethodResponseBody(res)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingResultUserTypeArrayClientStreamRecvCode = `// Recv reads instances of "[]*streamingresultusertypearrayservice.UserType"
// from the "StreamingResultUserTypeArrayMethod" endpoint websocket connection.
func (s *StreamingResultUserTypeArrayMethodClientStream) Recv() ([]*streamingresultusertypearrayservice.UserType, error) {
    var (
        rv   []*streamingresultusertypearrayservice.UserType
        body StreamingResultUserTypeArrayMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingResultUserTypeArrayMethodUserTypeOK(body)
    return res, nil
}
`
```
``` go
var StreamingResultUserTypeArrayDSL = func() {
    var Result = Type("UserType", func() {
        Attribute("a", String)
    })
    Service("StreamingResultUserTypeArrayService", func() {
        Method("StreamingResultUserTypeArrayMethod", func() {
            StreamingResult(ArrayOf(Result))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultUserTypeArrayServerStreamSendCode = `// Send streams instances of "[]*streamingresultusertypearrayservice.UserType"
// to the "StreamingResultUserTypeArrayMethod" endpoint websocket connection.
func (s *StreamingResultUserTypeArrayMethodServerStream) Send(v []*streamingresultusertypearrayservice.UserType) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    body := NewUserTypeResponseBody(res)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingResultUserTypeMapClientStreamRecvCode = `// Recv reads instances of
// "map[string]*streamingresultusertypemapservice.UserType" from the
// "StreamingResultUserTypeMapMethod" endpoint websocket connection.
func (s *StreamingResultUserTypeMapMethodClientStream) Recv() (map[string]*streamingresultusertypemapservice.UserType, error) {
    var (
        rv   map[string]*streamingresultusertypemapservice.UserType
        body StreamingResultUserTypeMapMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingResultUserTypeMapMethodMapStringUserTypeOK(body)
    return res, nil
}
`
```
``` go
var StreamingResultUserTypeMapDSL = func() {
    var Result = Type("UserType", func() {
        Attribute("a", String)
    })
    Service("StreamingResultUserTypeMapService", func() {
        Method("StreamingResultUserTypeMapMethod", func() {
            StreamingResult(MapOf(String, Result))
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultUserTypeMapServerStreamSendCode = `// Send streams instances of
// "map[string]*streamingresultusertypemapservice.UserType" to the
// "StreamingResultUserTypeMapMethod" endpoint websocket connection.
func (s *StreamingResultUserTypeMapMethodServerStream) Send(v map[string]*streamingresultusertypemapservice.UserType) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := v
    body := NewMapStringUserTypeResponseBody(res)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingResultWithExplicitViewClientEndpointCode = `// StreamingResultWithExplicitViewMethod returns an endpoint that makes HTTP
// requests to the StreamingResultWithExplicitViewService service
// StreamingResultWithExplicitViewMethod server.
func (c *Client) StreamingResultWithExplicitViewMethod() goa.Endpoint {
    var (
        encodeRequest  = EncodeStreamingResultWithExplicitViewMethodRequest(c.encoder)
        decodeResponse = DecodeStreamingResultWithExplicitViewMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildStreamingResultWithExplicitViewMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        err = encodeRequest(req, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("StreamingResultWithExplicitViewService", "StreamingResultWithExplicitViewMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &StreamingResultWithExplicitViewMethodClientStream{conn: conn}
        return stream, nil
    }
}
`
```
``` go
var StreamingResultWithExplicitViewClientStreamRecvCode = `// Recv reads instances of "streamingresultwithexplicitviewservice.Usertype"
// from the "StreamingResultWithExplicitViewMethod" endpoint websocket
// connection.
func (s *StreamingResultWithExplicitViewMethodClientStream) Recv() (*streamingresultwithexplicitviewservice.Usertype, error) {
    var (
        rv   *streamingresultwithexplicitviewservice.Usertype
        body StreamingResultWithExplicitViewMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingResultWithExplicitViewMethodUsertypeOK(&body)
    vres := &streamingresultwithexplicitviewserviceviews.Usertype{res, "extended"}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("StreamingResultWithExplicitViewService", "StreamingResultWithExplicitViewMethod", err)
    }
    return streamingresultwithexplicitviewservice.NewUsertype(vres), nil
}
`
```
``` go
var StreamingResultWithExplicitViewDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var Result = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("StreamingResultWithExplicitViewService", func() {
        Method("StreamingResultWithExplicitViewMethod", func() {
            Payload(Request)
            StreamingResult(Result, func() {
                View("extended")
            })
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultWithExplicitViewServerStreamSendCode = `// Send streams instances of "streamingresultwithexplicitviewservice.Usertype"
// to the "StreamingResultWithExplicitViewMethod" endpoint websocket connection.
func (s *StreamingResultWithExplicitViewMethodServerStream) Send(v *streamingresultwithexplicitviewservice.Usertype) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := streamingresultwithexplicitviewservice.NewViewedUsertype(v, "extended")
    body := NewStreamingResultWithExplicitViewMethodResponseBodyExtended(res.Projected)
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingResultWithViewsClientEndpointCode = `// StreamingResultWithViewsMethod returns an endpoint that makes HTTP requests
// to the StreamingResultWithViewsService service
// StreamingResultWithViewsMethod server.
func (c *Client) StreamingResultWithViewsMethod() goa.Endpoint {
    var (
        encodeRequest  = EncodeStreamingResultWithViewsMethodRequest(c.encoder)
        decodeResponse = DecodeStreamingResultWithViewsMethodResponse(c.decoder, c.RestoreResponseBody)
    )
    return func(ctx context.Context, v interface{}) (interface{}, error) {
        req, err := c.BuildStreamingResultWithViewsMethodRequest(ctx, v)
        if err != nil {
            return nil, err
        }
        err = encodeRequest(req, v)
        if err != nil {
            return nil, err
        }
        conn, resp, err := c.dialer.Dial(req.URL.String(), req.Header)
        if err != nil {
            if resp != nil {
                return decodeResponse(resp)
            }
            return nil, goahttp.ErrRequestError("StreamingResultWithViewsService", "StreamingResultWithViewsMethod", err)
        }
        if c.connConfigFn != nil {
            conn = c.connConfigFn(conn)
        }
        stream := &StreamingResultWithViewsMethodClientStream{conn: conn}
        view := resp.Header.Get("goa-view")
        stream.SetView(view)
        return stream, nil
    }
}
`
```
``` go
var StreamingResultWithViewsClientStreamRecvCode = `// Recv reads instances of "streamingresultwithviewsservice.Usertype" from the
// "StreamingResultWithViewsMethod" endpoint websocket connection.
func (s *StreamingResultWithViewsMethodClientStream) Recv() (*streamingresultwithviewsservice.Usertype, error) {
    var (
        rv   *streamingresultwithviewsservice.Usertype
        body StreamingResultWithViewsMethodResponseBody
        err  error
    )
    err = s.conn.ReadJSON(&body)
    if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
        s.conn.Close()
        return rv, io.EOF
    }
    if err != nil {
        return rv, err
    }
    res := NewStreamingResultWithViewsMethodUsertypeOK(&body)
    vres := &streamingresultwithviewsserviceviews.Usertype{res, s.view}
    if err := vres.Validate(); err != nil {
        return rv, goahttp.ErrValidationError("StreamingResultWithViewsService", "StreamingResultWithViewsMethod", err)
    }
    return streamingresultwithviewsservice.NewUsertype(vres), nil
}
`
```
``` go
var StreamingResultWithViewsClientStreamSetViewCode = `// SetView sets the view to render the  type before sending to the
// "StreamingResultWithViewsMethod" endpoint websocket connection.
func (s *StreamingResultWithViewsMethodClientStream) SetView(view string) {
    s.view = view
}
`
```
``` go
var StreamingResultWithViewsDSL = func() {
    var Request = Type("Request", func() {
        Attribute("x", String)
    })
    var Result = ResultType("UserType", func() {
        Attributes(func() {
            Attribute("a", String)
            Attribute("b", Int)
            Attribute("c", String)
        })
        View("tiny", func() {
            Attribute("a", String)
        })
        View("extended", func() {
            Attribute("a")
            Attribute("b")
            Attribute("c")
        })
    })
    Service("StreamingResultWithViewsService", func() {
        Method("StreamingResultWithViewsMethod", func() {
            Payload(Request)
            StreamingResult(Result)
            HTTP(func() {
                GET("/")
                Response(StatusOK)
            })
        })
    })
}
```
``` go
var StreamingResultWithViewsServerStreamCloseCode = `// Close closes the "StreamingResultWithViewsMethod" endpoint websocket
// connection.
func (s *StreamingResultWithViewsMethodServerStream) Close() error {
    defer s.conn.Close()
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Close().
    s.once.Do(func() {
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, nil)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    if err = s.conn.WriteControl(
        websocket.CloseMessage,
        websocket.FormatCloseMessage(websocket.CloseNormalClosure, "server closing connection"),
        time.Now().Add(time.Second),
    ); err != nil {
        return err
    }
    return nil
}
`
```
``` go
var StreamingResultWithViewsServerStreamSendCode = `// Send streams instances of "streamingresultwithviewsservice.Usertype" to the
// "StreamingResultWithViewsMethod" endpoint websocket connection.
func (s *StreamingResultWithViewsMethodServerStream) Send(v *streamingresultwithviewsservice.Usertype) error {
    var err error
    // Upgrade the HTTP connection to a websocket connection only once. Connection
    // upgrade is done here so that authorization logic in the endpoint is executed
    // before calling the actual service method which may call Send().
    s.once.Do(func() {
        respHdr := make(http.Header)
        respHdr.Add("goa-view", s.view)
        var conn *websocket.Conn
        conn, err = s.upgrader.Upgrade(s.w, s.r, respHdr)
        if err != nil {
            return
        }
        if s.connConfigFn != nil {
            conn = s.connConfigFn(conn)
        }
        s.conn = conn
    })
    if err != nil {
        return err
    }
    res := streamingresultwithviewsservice.NewViewedUsertype(v, s.view)
    var body interface{}
    switch s.view {
    case "tiny":
        body = NewStreamingResultWithViewsMethodResponseBodyTiny(res.Projected)
    case "extended":
        body = NewStreamingResultWithViewsMethodResponseBodyExtended(res.Projected)
    case "default", "":
        body = NewStreamingResultWithViewsMethodResponseBody(res.Projected)
    }
    return s.conn.WriteJSON(body)
}
`
```
``` go
var StreamingResultWithViewsServerStreamSetViewCode = `// SetView sets the view to render the streamingresultwithviewsservice.Usertype
// type before sending to the "StreamingResultWithViewsMethod" endpoint
// websocket connection.
func (s *StreamingResultWithViewsMethodServerStream) SetView(view string) {
    s.view = view
}
`
```







- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
