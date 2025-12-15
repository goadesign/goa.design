---
title: エラー処理
weight: 6
description: "Complete guide to error handling in Goa - defining errors, transport mapping, custom types, and best practices."
llm_optimized: true
aliases:
---

Goa は、サービス全体でエラーを効果的に定義、管理、伝達できる堅牢なエラー処理システムを提供します。このガイドでは、基本的なエラー定義から高度なカスタマイズまで、すべてをカバーします。

## 概要

Goa はエラー処理に "バッテリーを含む" アプローチを採用しており、エラーは最小限の情報 (名前だけ) で定義することができます。

主な特徴
- サービスレベルおよびメソッドレベルのエラー定義
- デフォルトとカスタムのエラータイプ
- トランスポート固有のステータスコードマッピング (HTTP/gRPC)
- エラー生成用ヘルパー関数の生成
- ドキュメントの自動生成

---

## エラーの定義

### API レベルのエラー

トランスポートマッピングを使用して、APIレベルで再利用可能なエラーを定義します：

```go
var _ = API("calc", func() {
    Error("invalid_argument")
    HTTP(func() {
        Response("invalid_argument", StatusBadRequest)
    })
})

var _ = Service("divider", func() {
    Error("invalid_argument")  // Reuses API-level definition
    
    Method("divide", func() {
        Error("div_by_zero", DivByZero, "Division by zero")
    })
})
```

### サービスレベルエラー

サービスレベルのエラーは、サービス内のすべてのメソッドで利用できます：

```go
var _ = Service("calc", func() {
    Error("invalid_arguments", ErrorResult, "Invalid arguments provided")
    
    Method("divide", func() {
        // Can return invalid_arguments without explicitly declaring it
    })

    Method("multiply", func() {
        // Can also return invalid_arguments
    })
})
```

### メソッドレベルのエラー

メソッド固有のエラーは、特定のメソッドにスコープされます：

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        Result(func() {
            Field(1, "quotient", Int)
            Required("quotient")
        })
        Error("div_by_zero")  // Only available to this method
    })
})
```

---

## エラーの種類

### デフォルトのエラー結果

デフォルトの`ErrorResult`タイプには、標準的なフィールドが含まれています：

- **Name**: DSL で定義されたエラー名
- **ID**: エラーインスタンスの一意の識別子
- **Message**: 説明的なエラーメッセージ
- **Temporary**: エラーが一時的かどうか
- **Timeout**: エラーがタイムアウトによって引き起こされたかどうか
- **Fault**: エラーがサーバー側の障害かどうか

```go
var _ = Service("divider", func() {
    Error("DivByZero", ErrorResult, "Division by zero")
    Error("ServiceUnavailable", ErrorResult, "Service temporarily unavailable", func() {
        Temporary()
    })
})
```

生成されたヘルパー関数

```go
// MakeDivByZero builds a goa.ServiceError from an error
func MakeDivByZero(err error) *goa.ServiceError {
    return goa.NewServiceError(err, "DivByZero", false, false, false)
}

// MakeServiceUnavailable builds a goa.ServiceError from an error
func MakeServiceUnavailable(err error) *goa.ServiceError {
    return goa.NewServiceError(err, "ServiceUnavailable", true, false, false)
}
```

### カスタムエラータイプ

より詳細なエラー情報を得るには、カスタム・エラー・タイプを定義します：

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZero is the error returned when using value 0 as divisor.")
    Field(1, "message", String, "Error message")
    Field(2, "dividend", Int, "Dividend that was used")
    Field(3, "name", String, "Error name", func() {
        Meta("struct:error:name")  // Required for multiple custom errors
    })
    Required("message", "dividend", "name")
})

var _ = Service("divider", func() {
    Method("divide", func() {
        Error("DivByZero", DivByZero, "Division by zero")
    })
})
```

**重要**: 同じメソッド内で複数のエラーにカスタムタイプを使用する場合は、`Meta("struct:error:name")` を使って「どの属性にエラー名が入るか」を指定する必要があります。

### エラーのプロパティ

エラー・プロパティは、エラーの特徴をクライアントに知らせます（`ErrorResult`でのみ使用可能）：

```go
var _ = Service("calc", func() {
    Error("service_unavailable", ErrorResult, func() {
        Description("Service is temporarily unavailable")
        Temporary()  // Client should retry
    })

    Error("request_timeout", ErrorResult, func() {
        Description("Request timed out")
        Timeout()    // Deadline exceeded
    })

    Error("internal_error", ErrorResult, func() {
        Description("Internal server error")
        Fault()      // Server-side issue
    })
})
```

クライアント側の処理：

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if e, ok := err.(*goa.ServiceError); ok {
        if e.Temporary {
            return retry(ctx, func() error {
                res, err = client.Divide(ctx, payload)
                return err
            })
        }
        if e.Fault {
            log.Error("server fault detected", "error", e)
            alertAdmins(e)
        }
    }
}
```

---

## 輸送マッピング

### HTTP ステータスコード

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("Division by zero error")
    })

    HTTP(func() {
        Response("DivByZero", StatusBadRequest)
    })

    Method("integral_divide", func() {
        Error("HasRemainder", func() {
            Description("Integer division has a remainder")
        })

        HTTP(func() {
            POST("/divide/integral")
            Response("HasRemainder", StatusExpectationFailed)
        })
    })
})
```

### gRPCステータスコード

```go
var _ = Service("divider", func() {
    Error("DivByZero", func() {
        Description("Division by zero error")
    })

    GRPC(func() {
        Response("DivByZero", CodeInvalidArgument)
    })

    Method("integral_divide", func() {
        Error("HasRemainder")

        GRPC(func() {
            Response("HasRemainder", CodeUnknown)
        })
    })
})
```

### HTTPとgRPCの組み合わせ

```go
var _ = Service("divider", func() {
    Error("DivByZero")

    Method("divide", func() {
        HTTP(func() {
            POST("/divide")
            Response("DivByZero", StatusUnprocessableEntity)
        })

        GRPC(func() {
            Response("DivByZero", CodeInvalidArgument)
        })
    })
})
```

---

## エラーの発生と消費

### エラーの発生

生成されたヘルパー関数の使用

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if p.Divisor == 0 {
        return 0, gendivider.MakeDivByZero(fmt.Errorf("divisor cannot be zero"))
    }
    if p.Dividend%p.Divisor != 0 {
        return 0, gendivider.MakeHasRemainder(fmt.Errorf("remainder is %d", p.Dividend%p.Divisor))
    }
    return p.Dividend / p.Divisor, nil
}
```

カスタムエラータイプの使用

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if p.Divisor == 0 {
        return 0, &gendivider.DivByZero{
            Name:     "DivByZero",
            Message:  "divisor cannot be zero",
            Dividend: p.Dividend,
        }
    }
    return p.Dividend / p.Divisor, nil
}
```

### エラーの消費

デフォルトエラーの処理

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        case "HasRemainder":
            // Handle remainder error
        case "DivByZero":
            // Handle division by zero
        default:
            // Handle unknown errors
        }
    }
}
```

カスタムエラーの処理

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if dbz, ok := err.(*gendivider.DivByZero); ok {
        fmt.Printf("Division by zero: %s (dividend was %d)\n", dbz.Message, dbz.Dividend)
    }
}
```

---

## エラーシリアライズ

カスタムフォーマッタを提供することで、エラーシリアライズをカスタマイズします：

```go
type CustomErrorResponse struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details map[string]string `json:"details,omitempty"`
}

func (r *CustomErrorResponse) StatusCode() int {
    switch r.Code {
    case "VALIDATION_ERROR":
        return http.StatusBadRequest
    case "NOT_FOUND":
        return http.StatusNotFound
    default:
        return http.StatusInternalServerError
    }
}

func customErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        case goa.MissingField:
            return &CustomErrorResponse{
                Code:    "MISSING_FIELD",
                Message: fmt.Sprintf("The field '%s' is required", *serr.Field),
                Details: map[string]string{"field": *serr.Field},
            }
        default:
            return &CustomErrorResponse{
                Code:    "VALIDATION_ERROR",
                Message: serr.Message,
            }
        }
    }
    return &CustomErrorResponse{
        Code:    "INTERNAL_ERROR",
        Message: err.Error(),
    }
}

// Use when creating the server
server = calcsvr.New(endpoints, mux, dec, enc, eh, customErrorFormatter)
```

---

## ベストプラクティス

### 1.一貫したエラー名

明確で説明的な名前を使用する：

```go
// Good
Error("DivByZero", func() {
    Description("DivByZero is returned when the divisor is zero.")
})

// Bad
Error("Error1", func() {
    Description("An unspecified error occurred.")
})
```

### 2.カスタム型よりもErrorResultを優先する

ほとんどのエラーにはデフォルトの `ErrorResult` を使用します。カスタム型は、追加のコンテキストを必要とするシナリオのために予約してください：

```go
// Simple errors - use ErrorResult
Error("InvalidInput", ErrorResult, "Invalid input provided.")

// Complex errors needing extra context - use custom types
Error("InvalidOperation", InvalidOperation, "Unsupported operation.")
``` を使用する。

### 3.エラープロパティの使用

メタデータを提供するために、`Temporary()`、`Timeout()`、`Fault()`を活用する：

```go
Error("ServiceUnavailable", ErrorResult, func() {
    Description("Service is temporarily unavailable")
    Temporary()
})
```

### 4.エラーを徹底的に文書化する

明確な説明を行う：

```go
Error("AuthenticationFailed", ErrorResult, func() {
    Description("AuthenticationFailed is returned when user credentials are invalid.")
})
```

### 5.適切なエラーマッピングの実装

トランスポート間で一貫したエラーマッピングを行う：

```go
var _ = Service("auth", func() {
    Error("InvalidToken", func() {
        Description("InvalidToken is returned when the provided token is invalid.")
    })

    HTTP(func() {
        Response("InvalidToken", StatusUnauthorized)
    })

    GRPC(func() {
        Response("InvalidToken", CodeUnauthenticated)
    })
})
```

### 6.エラー処理のテスト

エラーの動作を検証するテストを書く：

```go
func TestDivideByZero(t *testing.T) {
    svc := internal.NewDividerService()
    _, err := svc.Divide(context.Background(), &divider.DividePayload{A: 10, B: 0})
    if err == nil {
        t.Fatalf("expected error, got nil")
    }
    if serr, ok := err.(*goa.ServiceError); !ok || serr.Name != "DivByZero" {
        t.Fatalf("expected DivByZero error, got %v", err)
    }
}
```

### 7.セキュリティに関する考察

- エラーの中で内部システムの詳細を決して公開しない
- すべてのエラーメッセージをサニタイズする
- 内部的には詳細なエラーをログに記録するが、クライアントには安全なメッセージを返す

```go
func secureErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
    log.Printf("Error: %+v", err)  // Log full details
    
    if serr, ok := err.(*goa.ServiceError); ok && serr.Fault {
        // Return generic message for server faults
        return &CustomErrorResponse{
            Code:    "INTERNAL_ERROR",
            Message: "An internal error occurred",
        }
    }
    // Return specific message for validation errors
    return formatValidationError(err)
}
```
