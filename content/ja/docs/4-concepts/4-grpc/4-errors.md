---
title: "エラー処理"
linkTitle: "エラー処理"
weight: 4
description: "ステータスコード、エラー定義、エラー伝播を含むGoaでのgRPCサービスのエラー処理方法を学ぶ"
---

このガイドでは、Goaを使用したgRPCサービスでのエラー処理方法について説明します。

## エラーの種類

### ステータスコード

gRPCはエラーを示すためにステータスコードを使用します。Goaはこれらのコードへの組み込みマッピングを提供します：

```go
Method("divide", func() {
    // 発生する可能性のあるエラーを定義
    Error("division_by_zero")
    Error("invalid_input")

    GRPC(func() {
        // エラーをgRPCステータスコードにマッピング
        Response(CodeOK)
        Response("division_by_zero", CodeInvalidArgument)
        Response("invalid_input", CodeInvalidArgument)
    })
})
```

一般的なステータスコードのマッピング：

| Goaエラー | gRPCステータスコード | 使用ケース |
|-----------|-----------------|-----------|
| `not_found` | `CodeNotFound` | リソースが存在しない |
| `invalid_argument` | `CodeInvalidArgument` | 無効な入力 |
| `internal_error` | `CodeInternal` | サーバーエラー |
| `unauthenticated` | `CodeUnauthenticated` | 認証情報の欠落/無効 |
| `permission_denied` | `CodePermissionDenied` | 権限不足 |

## エラー定義

### 基本的なエラー定義

サービスまたはメソッドレベルでエラーを定義します：

```go
var _ = Service("users", func() {
    // サービスレベルのエラー
    Error("not_found", func() {
        Description("ユーザーが見つかりません")
    })
    Error("invalid_input")

    Method("getUser", func() {
        // メソッド固有のエラー
        Error("profile_incomplete")

        GRPC(func() {
            // 発生する可能性のあるすべてのエラーをマッピング
            Response(CodeOK)
            Response("not_found", CodeNotFound)
            Response("invalid_input", CodeInvalidArgument)
            Response("profile_incomplete", CodeFailedPrecondition)
        })
    })
})
```

## エラーの実装

### エラーの返却

サービスメソッドを実装する際には、様々な種類のエラーを処理する必要があります。入力バリデーションについては、これらの制約を直接Goa DSLで定義するのがベストです：

```go
var _ = Service("users", func() {
    Method("createUser", func() {
        Payload(func() {
            Field(1, "name", String, "ユーザーのフルネーム")
            Field(2, "age", Int, "ユーザーの年齢")
            Field(3, "email", String, "ユーザーのメールアドレス")
            
            // DSLでバリデーションルールを定義
            Required("name", "age", "email")
            Minimum("age", 0)
            Maximum("age", 150)
            Pattern("email", "^[^@]+@[^@]+$")
        })
        
        Error("database_error")
        Error("duplicate_email")
        
        GRPC(func() {
            Response(CodeOK)
            Response("database_error", CodeInternal)
            Response("duplicate_email", CodeAlreadyExists)
        })
    })
})
```

DSLを通じて検証できないランタイムエラー（データベースの競合、外部サービスの障害、ビジネスロジックの違反など）については、生成されたエラーコンストラクタを使用します：

```go
func (s *users) CreateUser(ctx context.Context, p *users.CreateUserPayload) (*users.User, error) {
    // メールアドレスが既に存在するかチェック
    exists, err := s.db.EmailExists(ctx, p.Email)
    if err != nil {
        // データベースエラーをラップ
        return nil, users.MakeDatabaseError(fmt.Errorf("メールアドレスの確認に失敗: %w", err))
    }
    if exists {
        // ビジネスロジックエラーを返却
        return nil, users.MakeDuplicateEmail(fmt.Sprintf("メールアドレス %s は既に登録されています", p.Email))
    }
    
    // データベースにユーザーを作成
    user, err := s.db.CreateUser(ctx, p)
    if err != nil {
        return nil, users.MakeDatabaseError(fmt.Errorf("ユーザーの作成に失敗: %w", err))
    }
    
    return user, nil
}
```

### ストリーミングでのエラー処理

ストリーミングgRPCメソッドを扱う場合、ストリーム関連のエラーとビジネスロジックのエラーの両方を処理する必要があるため、エラー処理はより複雑になります。以下は、ストリーミングサービスメソッドで異なる種類のエラーを処理する方法を示す例です：

```go
func (s *service) StreamData(stream service.StreamDataServerStream) error {
    for {
        data, err := getData()
        if err != nil {
            if isRateLimitError(err) {
                return service.MakeRateLimitExceeded(err)
            }
            return service.MakeInternalError(err)
        }

        if err := stream.Send(data); err != nil {
            if isStreamInterrupted(err) {
                return service.MakeStreamInterrupted(err)
            }
            return err
        }
    }
}
```

## エラー処理パターン

### エラーのラッピング

外部パッケージや下位コンポーネントからのエラーを扱う場合、適切なgRPCステータスコードを維持しながらコンテキストを提供することが重要です。以下は、エラーチェーンを保持しながらエラーをラップする方法です：

```go
func (s *service) ProcessData(ctx context.Context, p *service.ProcessDataPayload) (*service.Result, error) {
    result, err := s.processor.Process(p.Data)
    if err != nil {
        switch {
        case errors.Is(err, ErrInvalidFormat):
            return nil, service.MakeInvalidInput(fmt.Errorf("無効なデータ形式: %w", err))
        case errors.Is(err, ErrProcessingFailed):
            return nil, service.MakeInternalError(fmt.Errorf("処理に失敗: %w", err))
        default:
            return nil, service.MakeInternalError(err)
        }
    }
    return result, nil
}
```

### エラーリカバリー

長時間実行される操作やバッチ処理では、一時的な障害を処理するためにエラーリカバリーメカニズムを実装することが望ましい場合があります。以下は、リトライロジックとエラー追跡を含むバッチ処理を実装する例です：

```go
func (s *service) ProcessBatch(stream service.ProcessBatchServerStream) error {
    var processed, failed int

    for {
        payload, err := stream.Recv()
        if err == io.EOF {
            // 最終ステータスを送信
            return stream.SendAndClose(&service.BatchResult{
                Processed: processed,
                Failed:    failed,
            })
        }
        if err != nil {
            return service.MakeStreamInterrupted(err)
        }

        // エラーリカバリー付きで処理
        if err := s.processWithRetry(payload); err != nil {
            failed++
            // エラーをログに記録して処理を継続
            log.Printf("アイテムの処理に失敗: %v", err)
            continue
        }
        processed++
    }
}

func (s *service) processWithRetry(payload *service.Payload) error {
    var err error
    for retries := 0; retries < 3; retries++ {
        err = s.process(payload)
        if err == nil {
            return nil
        }
        // 一時的なエラーの場合のみリトライ
        if !isTransientError(err) {
            return err
        }
        time.Sleep(time.Second * time.Duration(retries+1))
    }
    return err
}
```

## ベストプラクティス

### エラー設計のガイドライン

1. **APIレベルの共通エラーを定義する**
   
   すべてのサービスで一貫性を確保し、再利用を可能にするために、APIレベルで共通エラーを定義します。これにより、重複が減少し、統一的なエラー処理が確保されます：

   ```go
   var _ = API("myapi", func() {
       // API全体で共有される共通エラー
       Error("unauthorized", func() {
           Description("リクエストには認証が必要です")
       })
       Error("not_found")  // デフォルトのErrorResult型を使用
       Error("validation_error", ValidationError, "バリデーションに失敗しました")

       // 共通のHTTPマッピングを定義
       HTTP(func() {
           Response("unauthorized", StatusUnauthorized)
           Response("not_found", StatusNotFound)
           Response("validation_error", StatusBadRequest)
       })
   })
``` 