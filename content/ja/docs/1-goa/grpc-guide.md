---
title: gRPCガイド
weight: 5
description: "Complete guide to gRPC transport in Goa - service design, streaming patterns, error handling, and Protocol Buffer integration."
llm_optimized: true
aliases:
---

Goa は、DSL とコード生成を通じて、gRPC サービスの構築を包括的にサポートします。このガイドでは、サービス設計、ストリーミングパターン、エラー処理、実装について説明します。

## 概要

Goa の gRPC サポートには以下が含まれます：

- **プロトコル・バッファの自動生成**：`.proto` ファイルがデザインから生成されます。
- **型安全性**：定義から実装までのエンドツーエンドの型安全性
- **コード生成**：サーバーとクライアントのコードを自動生成
- **組み込みバリデーション**：設計に基づく検証要求
- **ストリーミングサポート**：すべての gRPC ストリーミングパターンをサポート
- **エラー処理**：ステータスコードのマッピングによる包括的なエラーハンドリング

### タイプマッピング

| Goa 型 | Protocol Buffer 型 |
|-----------|---------------------|
| Int       | int32              |
| Int32     | int32              |
| Int64     | int64              |
| UInt      | uint32             |
| UInt32    | uint32             |
| UInt64    | uint64             |
| Float32   | float              |
| Float64   | double             |
| String    | string             |
| Boolean   | bool               |
| Bytes     | bytes              |
| ArrayOf   | repeated           |
| MapOf     | map                |

---

## サービスデザイン

### サービスの基本構造

```go
var _ = Service("calculator", func() {
    Description("The Calculator service performs arithmetic operations")

    GRPC(func() {
        Metadata("package", "calculator.v1")
        Metadata("go.package", "calculatorpb")
    })

    Method("add", func() {
        Description("Add two numbers")
        
        Payload(func() {
            Field(1, "a", Int, "First operand")
            Field(2, "b", Int, "Second operand")
            Required("a", "b")
        })
        
        Result(func() {
            Field(1, "sum", Int, "Result of addition")
            Required("sum")
        })
    })
})
```

### メソッドの定義

メソッドは、gRPC固有の設定を伴う操作を定義します：

```go
Method("add", func() {
    Description("Add two numbers")

    Payload(func() {
        Field(1, "a", Int, "First operand")
        Field(2, "b", Int, "Second operand")
        Required("a", "b")
    })

    Result(func() {
        Field(1, "sum", Int, "Result of addition")
        Required("sum")
    })

    GRPC(func() {
        Response(CodeOK)
        Response("not_found", CodeNotFound)
        Response("invalid_argument", CodeInvalidArgument)
    })
})
```

### メッセージの種類

#### フィールド番号

プロトコルバッファのベストプラクティスを使用してください：
- 番号1～15：番号1～15：頻繁に出現するフィールド（1バイトエンコーディング）
- 16～2047番：出現頻度の低いフィールド（2バイトエンコーディング）

```go
Method("createUser", func() {
    Payload(func() {
        // Frequently used fields (1-byte encoding)
        Field(1, "id", String)
        Field(2, "name", String)
        Field(3, "email", String)

        // Less frequently used fields (2-byte encoding)
        Field(16, "preferences", func() {
            Field(1, "theme", String)
            Field(2, "language", String)
        })
    })
})
```

#### メタデータの取り扱い

メッセージボディの代わりにgRPCメタデータとしてフィールドを送信する：

```go
var CreatePayload = Type("CreatePayload", func() {
    Field(1, "name", String, "Name of account")
    TokenField(2, "token", String, "JWT token")
    Field(3, "metadata", String, "Additional info")
})

Method("create", func() {
    Payload(CreatePayload)
    
    GRPC(func() {
        // Send token in metadata
        Metadata(func() {
            Attribute("token")
        })
        // Only include specific fields in message
        Message(func() {
            Attribute("name")
            Attribute("metadata")
        })
        Response(CodeOK)
    })
})
```

#### レスポンス・ヘッダとトレーラ

```go
Method("create", func() {
    Result(CreateResult)
    
    GRPC(func() {
        Response(func() {
            Code(CodeOK)
            Headers(func() {
                Attribute("id")
            })
            Trailers(func() {
                Attribute("status")
            })
        })
    })
})
```

---

## ストリーミング・パターン

gRPCは3つのストリーミング・パターンをサポートしています。

### サーバサイド・ストリーミング

サーバーは1つのクライアントリクエストに対して複数のレスポンスを送信します：

```go
var _ = Service("monitor", func() {
    Method("watch", func() {
        Description("Stream system metrics")
        
        Payload(func() {
            Field(1, "interval", Int, "Sampling interval in seconds")
            Required("interval")
        })
        
        StreamingResult(func() {
            Field(1, "cpu", Float32, "CPU usage percentage")
            Field(2, "memory", Float32, "Memory usage percentage")
            Required("cpu", "memory")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

サーバーの実装：

```go
func (s *monitorService) Watch(ctx context.Context, p *monitor.WatchPayload, stream monitor.WatchServerStream) error {
    ticker := time.NewTicker(time.Duration(p.Interval) * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            metrics := getSystemMetrics()
            if err := stream.Send(&monitor.WatchResult{
                CPU:    metrics.CPU,
                Memory: metrics.Memory,
            }); err != nil {
                return err
            }
        }
    }
}
```

### クライアント側ストリーミング

クライアントは複数のリクエストを送信し、サーバーは単一のレスポンスを送信する：

```go
var _ = Service("analytics", func() {
    Method("process", func() {
        Description("Process stream of analytics events")
        
        StreamingPayload(func() {
            Field(1, "event_type", String, "Type of event")
            Field(2, "timestamp", String, "Event timestamp")
            Field(3, "data", Bytes, "Event data")
            Required("event_type", "timestamp", "data")
        })
        
        Result(func() {
            Field(1, "processed_count", Int64, "Number of events processed")
            Required("processed_count")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

サーバーの実装：

```go
func (s *analyticsService) Process(ctx context.Context, stream analytics.ProcessServerStream) error {
    var count int64
    
    for {
        event, err := stream.Recv()
        if err == io.EOF {
            return stream.SendAndClose(&analytics.ProcessResult{
                ProcessedCount: count,
            })
        }
        if err != nil {
            return err
        }
        
        if err := processEvent(event); err != nil {
            return err
        }
        count++
    }
}
```

### 双方向ストリーミング

クライアントとサーバーの両方が同時にストリームを送信する：

```go
var _ = Service("chat", func() {
    Method("connect", func() {
        Description("Establish bidirectional chat connection")
        
        StreamingPayload(func() {
            Field(1, "message", String, "Chat message")
            Field(2, "user_id", String, "User identifier")
            Required("message", "user_id")
        })
        
        StreamingResult(func() {
            Field(1, "message", String, "Chat message")
            Field(2, "user_id", String, "User identifier")
            Field(3, "timestamp", String, "Message timestamp")
            Required("message", "user_id", "timestamp")
        })
        
        GRPC(func() {
            Response(CodeOK)
        })
    })
})
```

サーバーの実装：

```go
func (s *chatService) Connect(ctx context.Context, stream chat.ConnectServerStream) error {
    for {
        msg, err := stream.Recv()
        if err == io.EOF {
            return nil
        }
        if err != nil {
            return err
        }

        response := &chat.ConnectResult{
            Message:   msg.Message,
            UserID:    msg.UserID,
            Timestamp: time.Now().Format(time.RFC3339),
        }
        
        if err := stream.Send(response); err != nil {
            return err
        }
    }
}
```

---

## エラー処理

### ステータスコード

エラーをgRPCステータスコードにマップする：

```go
Method("divide", func() {
    Error("division_by_zero")
    Error("invalid_input")

    GRPC(func() {
        Response(CodeOK)
        Response("division_by_zero", CodeInvalidArgument)
        Response("invalid_input", CodeInvalidArgument)
    })
})
```

一般的なステータスコードのマッピング：

| Goaエラー|gRPCステータスコード|ユースケース
|-----------|-----------------|-----------|
`not_found` | `CodeNotFound` | リソースが存在しません。
| `invalid_argument` | `CodeInvalidArgument` | 入力が無効です。
| `internal_error` | `CodeInternal` | サーバー・エラー | `unauthenticated` | 入力が無効です。
| `unauthenticated` | `CodeUnauthenticated` | クレデンシャルが見つからない/無効である。
| `permission_denied` | `CodePermissionDenied` | パーミッションが不十分である。

### エラーの定義

サービスレベルまたはメソッドレベルでエラーを定義する：

```go
var _ = Service("users", func() {
    // Service-level errors
    Error("not_found", func() {
        Description("User not found")
    })
    Error("invalid_input")

    Method("getUser", func() {
        // Method-specific error
        Error("profile_incomplete")

        GRPC(func() {
            Response(CodeOK)
            Response("not_found", CodeNotFound)
            Response("invalid_input", CodeInvalidArgument)
            Response("profile_incomplete", CodeFailedPrecondition)
        })
    })
})
```

### エラーを返す

生成されたエラーコンストラクタを使用する：

```go
func (s *users) CreateUser(ctx context.Context, p *users.CreateUserPayload) (*users.User, error) {
    exists, err := s.db.EmailExists(ctx, p.Email)
    if err != nil {
        return nil, users.MakeDatabaseError(fmt.Errorf("failed to check email: %w", err))
    }
    if exists {
        return nil, users.MakeDuplicateEmail(fmt.Sprintf("email %s is already registered", p.Email))
    }
    
    user, err := s.db.CreateUser(ctx, p)
    if err != nil {
        return nil, users.MakeDatabaseError(fmt.Errorf("failed to create user: %w", err))
    }
    
    return user, nil
}
```

---

## 実装

### サーバーの実装

```go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"

    "github.com/yourusername/calc"
    gencalc "github.com/yourusername/calc/gen/calc"
    genpb "github.com/yourusername/calc/gen/grpc/calc/pb"
    gengrpc "github.com/yourusername/calc/gen/grpc/calc/server"
)

func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    svr := grpc.NewServer()
    gensvr := gengrpc.New(endpoints, nil)
    genpb.RegisterCalcServer(svr, gensvr)
    
    lis, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatal(err)
    }
    
    log.Println("gRPC server listening on :8080")
    svr.Serve(lis)
}
```

### クライアントの実装

```go
package main

import (
    "context"
    "log"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    gencalc "github.com/yourusername/calc/gen/calc"
    genclient "github.com/yourusername/calc/gen/grpc/calc/client"
)

func main() {
    conn, err := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    grpcClient := genclient.NewClient(conn)
    client := gencalc.NewClient(
        grpcClient.Add(),
        grpcClient.Multiply(),
    )

    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("1 + 2 = %d", result)
}
```

---

## プロトコルバッファの統合

### 自動生成

Goa は、デザインから `.proto` ファイルを自動的に生成します：

```protobuf
syntax = "proto3";
package calc;

service Calc {
    rpc Add (AddRequest) returns (AddResponse);
    rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
}

message AddRequest {
    int64 a = 1;
    int64 b = 2;
}

message AddResponse {
    int64 result = 1;
}
``` ファイルを生成します。

### プロトタイプの構成

```go
var _ = Service("calculator", func() {
    GRPC(func() {
        Meta("protoc:path", "protoc")
        Meta("protoc:version", "v3")
        Meta("protoc:plugin", "grpc-gateway")
    })
})
```

---

## ベストプラクティス

### エラー処理
- 適切なgRPCステータスコードを使用する
- 意味のあるエラーメッセージを含める
- コンテキストのキャンセルとタイムアウトの処理

### ストリーミング
- メッセージ・サイズを適切に保つ
- 適切なフロー制御の実装
- 適切なタイムアウトを設定する
- EOFとエラーを優雅に処理する

### パフォーマンス
- 適切なフィールド・タイプを使用する
- メッセージ・サイズを考慮した設計
- 大きなデータセットにはストリーミングを使用する

### バージョン管理
- 後方互換性を計画する
- フィールド番号を戦略的に使用する
- パッケージのバージョン管理を考慮する

### リソース管理
- gRPC接続の適切な管理
- グレースフル・シャットダウンの実装
- コンテキスト・キャンセル時のリソースのクリーンアップ
