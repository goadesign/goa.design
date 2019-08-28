+++
title = "ミドルウェア"
weight = 1

[menu.main]
name = "ミドルウェア"
parent = "implement"
+++


[ミドルウェア](https://godoc.org/goa.design/goa/middleware) は、エンドポイントまたはトランスポート固有のハンドラを受け付けて返す関数で構成されます。

## ミドルウェアのエンドポイント

エンドポイント・ミドルウェアはエンドポイントレベルで動作し、トランスポートに依存しません。
これらは、Goa エンドポイントを受け付けて返す関数で構成されています。
ここで、エラーをログに記録するエンドポイント・ミドルウェアの例を次に示します。

```go
// ErrorLogger は、指定されたロガーを使用してエラーを記録するエンドポイントミドルウェアです。
// すべてのログエントリは、指定されたプレフィックスで始まります。
func ErrorLogger(l *log.Logger, prefix string) func (goa.Endpoint) goa.Endpoint {
    return func(e goa.Endpoint) goa.Endpoint {
        // Goa エンドポイント自体が関数です。
        return goa.Endpoint(func (ctx context.Context, req interface{}) (interface{}, error) {
            // オリジナルのエンドポイント関数を呼び出します。
            res, err := e(ctx, req)
            // 何かエラーがあれば記録する。
            if err != nil {
                l.Printf("%s: %s", prefix, err.Error())
            }
            // エンドポイントの結果を返します。
            return res, err
        })
    }
}
```

Goa によって生成されたサービスコードは、ミドルウェアをサービスによって定義されたすべてのエンドポイントに適用する `Use` メソッドを定義します。
あるいは、対応するエンドポイント構造体フィールドでラップすることにより、ミドルウェアを特定のエンドポイントに適用できます。

```go
import (
    calcsvc "goa.design/examples/basic/gen/calc"
    calc "goa.design/examples/basic"
)

func main() {
    // ...
    var svc calcsvc.Service
    {
        svc = calc.NewCalc(logger)
    }

    var eps *calcsvc.Endpoints
    {
        eps = calcsvc.NewEndpoints(svc)

        // ErrorLoggerをすべてのエンドポイントに適用します。
        calcsvc.Use(ErrorLogger(logger, "calc"))

        // または、特定のエンドポイントにErrorLoggerを適用します。
        // eps.Add = ErrorLogger(logger, "add")(eps.Add)
    }
    // ...
}
```

## トランスポート ミドルウェア

トランスポート・ミドルウェアはトランスポート層で動作します。 
HTTP ハンドラまたは gRPC メソッドに適用されます。

### HTTP ミドルウェア

HTTP ミドルウェアは、HTTP [ハンドラ](https://golang.org/pkg/net/http/#Handler)を取って、HTTP ハンドラを返す関数です。

ここで、`X-Request-Id` リクエストヘッダーの値を読み取り、該当リクエストヘッダーが存在する場合はリクエストコンテキストに書き込む HTTP ミドルウェアの例を次に示します。

```go
// InitRequestID は、X-Request-Id ヘッダーの値を読み取り、存在する場合は
// それをリクエストコンテキストに書き込む HTTP サーバーミドルウェアです。
func InitRequestID() func(http.Handler) http.Handler {
    return func(h http.Handler) http.Handler {
        // A HTTP handler is a function.
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            req := r
            //  X-Request-Idヘッダーを取得して、リクエストコンテキストを初期化します。
            if id := r.Header.Get("X-Request-Id"); id != "" {
                ctx = context.WithValue(r.Context(), RequestIDKey, id)
                req = r.WithContext(ctx)
            }

            // 最初のハンドラを呼び出す。
            h.ServeHTTP(w, req)
        })
    }
}
```

HTTP ミドルウェアは、HTTPサーバー上に生成された `Use` メソッドを使用して適用できます。
このメソッドは、ミドルウェアをすべてのサーバーハンドラに適用します。
エンドポイント・ミドルウェアを特定のエンドポイントに適用する方法と同様に、
ミドルウェアを特定のサーバーハンドラに適用することもできます。
HTTP ミドルウェアを [goa Muxer](https://godoc.org/goa.design/goa/http#Muxer) に直接マウントして、
ハンドラとは無関係にすべてのリクエストでミドルウェアを実行することもできます。

```go
func main() {
    // ...
    var mux goahttp.Muxer
    {
        mux = goahttp.NewMuxer()
    }

    var calcServer *calcsvcsvr.Server
    {
        calcServer = calcsvcsvr.New(calcEndpoints, mux, dec, enc, errorHandler(logger))
        // InitRequestID ミドルウェアをすべてのサーバーハンドラに適用します。
        calcServer.Use(InitRequestID())
    }

    // あるいは、ミドルウェアをすべてのリクエストに適用します。
    // var handler http.Handler = mux
    // handler = InitRequestID()(handler)
    // ... ここで、mux の代わりにハンドラを使用して HTTP サーバーを起動します。
}
```
Goaには、次のような HTTP ミドルウェアの実装があります。

* [**ロギング**](https://godoc.org/goa.design/goa/http/middleware#Log) サーバー ミドルウエア。
* [**リクエスト ID**](https://godoc.org/goa.design/goa/http/middleware#RequestID) サーバー ミドルウェア。
* [サーバー](https://godoc.org/goa.design/goa/http/middleware#Trace)および[クライアント](https://godoc.org/goa.design/goa/http/middleware#WrapDoer)用の **トラッキング** ミドルウエア。
* サーバーおよびクライアント用の [**AWS X-Ray**](https://godoc.org/goa.design/goa/http/middleware/xray) ミドルウェア。

### gRPC ミドルウェア

gRPC ミドルウェアは gRPC トランスポート固有であり、サーバーとクライアントの gRPC インターセプターで構成されます。

* 単項エンドポイントに対して、[UnaryServerInterceptor](https://godoc.org/google.golang.org/grpc#UnaryServerInterceptor)
と [UnaryClientInterceptor](https://godoc.org/google.golang.org/grpc#UnaryClientInterceptor)
* ストリーミング エンドポイントに対して、[StreamServerInterceptor](https://godoc.org/google.golang.org/grpc#StreamServerInterceptor)
と [StreamClientInterceptor](https://godoc.org/google.golang.org/grpc#StreamClientInterceptor)

Goa は次の gRPC ミドルウェアを実装しています：

* [単項](https://godoc.org/goa.design/goa/grpc/middleware#UnaryServerLog)および[ストリーミング](https://godoc.org/goa.design/goa/grpc/middleware#StreamServerLog)エンドポイント用の **ロギング** サーバー ミドルウエア。

* [単項](https://godoc.org/goa.design/goa/grpc/middleware#UnaryRequestID)および[ストリーミング](https://godoc.org/goa.design/goa/grpc/middleware#StreamRequestID)エンドポイント用の **リクエスト ID** サーバー ミドルウェア

* [**ストリーム キャンセラー**](https://godoc.org/goa.design/goa/grpc/middleware#StreamCanceler)サーバー ミドルウェア。
* [単項サーバー](https://godoc.org/goa.design/goa/grpc/middleware#UnaryServerTrace)および
  [クライアント](https://godoc.org/goa.design/goa/grpc/middleware#UnaryClientTrace)、および
  [ストリーミング サーバー](https://godoc.org/goa.design/goa/grpc/middleware#StreamServerTrace)および
  [クライアント](https://godoc.org/goa.design/goa/grpc/middleware#StreamClientTrace)用の **トレーシング**ミドルウエア。  
* 単項およびストリーミングのクライアント・サーバー用の [**AWS X-Ray**](https://godoc.org/goa.design/goa/grpc/middleware/xray) ミドルウエア。

gRPC ミドルウェアを gRPC エンドポイントに適用する方法については、[トレースの例](https://github.com/goadesign/examples/blob/master/tracing)を参照してください。
