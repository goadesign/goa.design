---
title: エラーをトランスポートステータスコードにマッピング
linkTitle: トランスポートマッピング
weight: 4
description: "GoaのエラーをHTTPおよびgRPCステータスコードに適切にマッピングする方法を学び、異なるトランスポートプロトコル間で一貫したエラーレスポンスを確保します。"
---

Goa DSLでエラーを定義した後、次のステップはこれらのエラーを適切な
トランスポート固有のステータスコードにマッピングすることです。これにより、
クライアントがエラーの性質に基づいて意味のある標準化されたレスポンスを
受け取ることが保証されます。GoaではDSL内のResponse関数を使用して、
HTTPやgRPCなどの異なるトランスポートプロトコルに対してこれらの
マッピングを定義できます。

## HTTPトランスポートマッピング

HTTPトランスポートの場合、サービスまたはメソッド定義内でHTTP関数を使用して、
エラーを特定のHTTPステータスコードにマッピングします。このマッピングにより、
エラーが発生した場合、クライアントは正しいステータスコードとエラー情報を
含むHTTPレスポンスを受け取ることが保証されます。

例

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZeroは、除数がゼロの場合に返されるエラーです。")
    })

    HTTP(func() {
        // "DivByZero"エラーをHTTP 400 Bad Requestにマッピング
        Response("DivByZero", StatusBadRequest)
    })

    Method("integral_divide", func() {
        Error("HasRemainder", func() {
            Description("HasRemainderは、整数除算に余りがある場合に返されます。")
        })

        HTTP(func() {
            // "HasRemainder"エラーをHTTP 417 Expectation Failedにマッピング
            Response("HasRemainder", StatusExpectationFailed)
        })

        // 追加のメソッド定義...
    })

    Method("divide", func() {
        // メソッド固有の定義...
    })
})
```

この例では：

- `DivByZero`: HTTPステータスコード400 Bad Requestにマッピング。
- `HasRemainder`: HTTPステータスコード417 Expectation Failedにマッピング。

## レスポンスの定義

HTTP関数内で、Response関数を使用して各エラーをHTTPステータスコードに
関連付けます。構文は以下の通りです：

```go
Response("<エラー名>", <HTTPステータスコード>, func() {
    Description("<オプションの説明>")
})
```

- `<エラー名>`: DSLで定義されたエラーの名前。
- `<HTTPステータスコード>`: エラーをマッピングするHTTPステータスコード。
- `Description`: （オプション）ドキュメント用のレスポンスの説明。

## 完全なHTTPマッピングの例

```go
var _ = Service("divider", func() {
    // サービスレベルのエラー
    Error("DivByZero", func() {
        Description("DivByZeroは、除数がゼロの場合に返されるエラーです。")
    })

    HTTP(func() {
        // サービス全体のエラーマッピング
        Response("DivByZero", StatusBadRequest)           // 400
    })

    Method("integral_divide", func() {
        Description("整数除算を実行し、余りをチェックします")
        
        Payload(func() {
            Field(1, "dividend", Int, "被除数")
            Field(2, "divisor", Int, "除数")
            Required("dividend", "divisor")
        })
        Result(Int)

        Error("HasRemainder", func() {
            Description("HasRemainderは、整数除算に余りがある場合に返されます。")
        })

        HTTP(func() {
            POST("/divide/integral")
            
            // メソッド固有のエラーマッピング
            Response("HasRemainder", StatusExpectationFailed, func() { // 417
                Description("除算に余りがある場合に返されます")
            })
        })
    })

    Method("divide", func() {
        Description("浮動小数点除算を実行します")
        
        Payload(func() {
            Field(1, "dividend", Float64, "被除数")
            Field(2, "divisor", Float64, "除数")
            Required("dividend", "divisor")
        })
        Result(Float64)

        Error("Overflow", func() {
            Description("Overflowは、結果が最大値を超える場合に返されます。")
        })

        HTTP(func() {
            POST("/divide")
            
            // メソッド固有のエラーマッピング
            Response("Overflow", StatusUnprocessableEntity, func() { // 422
                Description("除算結果が最大値を超える場合に返されます")
            })
        })
    })
})
```

この例は以下を示しています：

1. **サービスレベルのエラー**: メソッド間で共通のエラー：
   - `DivByZero`: ゼロによる除算を試みた場合

2. **メソッド固有のエラー**: 各メソッドが独自の特定のエラーを定義：
   - `integral_divide`: 余りのケースを処理
   - `divide`: 浮動小数点オーバーフローを処理

3. **HTTPステータスコードマッピング**:
   - 400 Bad Request: ゼロによる除算の場合
   - 417 Expectation Failed: 余りのある整数除算の場合
   - 422 Unprocessable Entity: 浮動小数点オーバーフローの場合

4. **異なるエンドポイント**: 2つの異なる除算操作のエラーマッピングを示す：
   - `/divide/integral` 整数除算用
   - `/divide` 浮動小数点除算用

これらのマッピングにより、各エラー条件がエラーの性質を正確に反映した
適切なHTTPステータスコードを返すことが保証されます。

## gRPCトランスポートマッピング

gRPCトランスポートの場合、サービスまたはメソッド定義内でGRPC関数を使用して、
エラーを特定のgRPCステータスコードにマッピングします。このマッピングにより、
エラーが発生した場合、クライアントは正しいステータスコードとエラー情報を
含むgRPCレスポンスを受け取ることが保証されます。

例

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZeroは、除数がゼロの場合に返されるエラーです。")
    })

    GRPC(func() {
        // "DivByZero"エラーをgRPCステータスコードInvalidArgument (3)にマッピング
        Response("DivByZero", CodeInvalidArgument)
    })

    Method("integral_divide", func() {
        Error("HasRemainder", func() {
            Description("HasRemainderは、整数除算に余りがある場合に返されます。")
        })

        GRPC(func() {
            // "HasRemainder"エラーをgRPCステータスコードUnknown (2)にマッピング
            Response("HasRemainder", CodeUnknown)
        })

        // 追加のメソッド定義...
    })

    Method("divide", func() {
        // メソッド固有の定義...
    })
})
```

この例では：

- `DivByZero`: gRPCステータスコードInvalidArgument（コード3）にマッピング。
- `HasRemainder`: gRPCステータスコードUnknown（コード2）にマッピング。

## レスポンスの定義

GRPC関数内で、Response関数を使用して各エラーをgRPCステータスコードに
関連付けます。構文は以下の通りです：

```go
Response("<エラー名>", Code<ステータスコード>, func() {
    Description("<オプションの説明>")
})
```

- `<エラー名>`: DSLで定義されたエラーの名前。
- `Code<ステータスコード>`: エラーをマッピングするgRPCステータスコード（Codeプレフィックス付き）。
- `Description`: （オプション）ドキュメント用のレスポンスの説明。

## HTTPとgRPCマッピングの組み合わせ

Goaでは、同じサービスまたはメソッド内でHTTPとgRPCの両方のマッピングを
定義できます。これは、サービスが複数のトランスポートをサポートする場合に
特に有用で、クライアントが使用するトランスポートプロトコルに関係なく、
エラーが適切にマッピングされることを保証します。

例

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("DivByZeroは、ゼロによる除算を試みた場合に返されます。")
    })

    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Float64, "被除数")
            Field(2, "divisor", Float64, "除数")
            Required("dividend", "divisor")
        })
        Result(Float64)

        HTTP(func() {
            POST("/divide")
            // ゼロによる除算をHTTP 422 Unprocessable Entityにマッピング
            Response("DivByZero", StatusUnprocessableEntity)
        })

        GRPC(func() {
            // ゼロによる除算をINVALID_ARGUMENTにマッピング
            Response("DivByZero", CodeInvalidArgument)
        })
    })
}) 