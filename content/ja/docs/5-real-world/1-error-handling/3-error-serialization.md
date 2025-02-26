---
title: エラーのシリアライゼーション
weight: 3
description: "バリデーションエラーの処理や組織の標準への対応を含む、Goaサービスにおけるエラーシリアライゼーションのカスタマイズ方法を学びます。"
---

# エラーシリアライゼーションのオーバーライド

このガイドでは、Goaサービスにおけるエラーのシリアライゼーション方法をカスタマイズする方法を説明します。
エラーシリアライゼーションは、エラーオブジェクトをHTTPやgRPCを通じてクライアントに送信できる形式に
変換するプロセスです。これは特にバリデーションエラーにとって重要です。バリデーションエラーはGoaによって
特定のエラー型を使用して自動生成され、作成時にカスタマイズすることはできません - シリアライゼーションのみを
制御できます。

## 概要

Goaサービスでエラーが発生した場合、クライアントが理解できる形式に変換する必要があります。カスタムエラー
フォーマットが必要な最も一般的なケースは、Goaによって自動生成され、常に`ServiceError`型を使用する
バリデーションエラーです。これらのエラーの作成方法を変更することはできませんが、レスポンスでの
フォーマット方法を制御することはできます。

カスタムエラーフォーマットが必要な一般的なシナリオ：

- **組織のエラーフォーマット標準への対応**
  - 組織がエラーレスポンスに特定の要件を持っている場合
  - エコシステム内の既存APIと一致させる必要がある場合
  - ユースケースに特有の追加フィールドを含める必要がある場合

- **バリデーションエラーの一貫したフォーマット**
  - Goaの組み込みバリデーションエラー（`ServiceError`）の処理
  - ユーザーフレンドリーな形式でのバリデーションエラーの提示
  - フィールド固有のバリデーション詳細の含有

- **特定のエラー型に対するカスタムエラーレスポンスの提供**
  - 異なるエラーに異なるフォーマットが必要な場合
  - 一部のエラーに追加のコンテキストや詳細が必要な場合
  - バリデーションエラーとビジネスロジックエラーを異なる方法で処理したい場合

## デフォルトのエラーレスポンス

Goaは、バリデーションやその他の組み込みエラーに内部的に`ServiceError`型を使用します。
この型には以下の重要なフィールドが含まれています：

```go
// ServiceErrorはGoaのバリデーションやその他の組み込みエラーに使用されます
type ServiceError struct {
    Name      string   // エラー名（例："missing_field"）
    ID        string   // 一意のエラーID
    Field     *string  // 関連する場合、エラーの原因となったフィールド名
    Message   string   // 人間が読めるエラーメッセージ
    Timeout   bool     // タイムアウトエラーかどうか
    Temporary bool     // 一時的なエラーかどうか
    Fault     bool     // サーバーの障害かどうか
}
```

デフォルトでは、これは以下のようなJSONレスポンスにシリアライズされます：
```json
{
    "name": "missing_field",
    "id": "abc123",
    "message": "リクエストボディからemailが欠落しています",
    "field": "email"
}
```

## カスタムエラーフォーマッター

デフォルトのエラーシリアライゼーションをオーバーライドするには、HTTPサーバーの作成時に
カスタムエラーフォーマッターを提供する必要があります。

フォーマッターは`Statuser`インターフェースを実装する型を返す必要があります。このインターフェースは
`StatusCode()`メソッドを要求し、このメソッドはレスポンスで使用されるHTTPステータスコードを
決定します。

以下は、カスタムエラーフォーマットの実装方法の詳細な説明です：

```go
// 1. カスタムエラーレスポンス型の定義
// この型がエラーレスポンスのJSON構造を決定します
type CustomErrorResponse struct {
    // 機械可読なエラーコード
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details map[string]string `json:"details,omitempty"`
}

// 2. Statuserインターフェースの実装
// これによりGoaに使用するHTTPステータスコードを伝えます
func (r *CustomErrorResponse) StatusCode() int {
    // 適切なステータスコードを決定するための複雑なロジックをここに実装できます
    switch r.Code {
    case "VALIDATION_ERROR":
        return http.StatusBadRequest
    case "NOT_FOUND":
        return http.StatusNotFound
    default:
        return http.StatusInternalServerError
    }
}

// 3. フォーマッター関数の作成
// この関数は任意のエラーをカスタムフォーマットに変換します
func customErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
    // Goaの組み込みServiceError型の処理（バリデーションエラーに使用）
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        // 一般的なバリデーションエラーのケース
        case goa.MissingField:
            return &CustomErrorResponse{
                Code:    "MISSING_FIELD",
                Message: fmt.Sprintf("フィールド '%s' は必須です", *serr.Field),
                Details: map[string]string{
                    "field": *serr.Field,
                },
            }

        case goa.InvalidFieldType:
            return &CustomErrorResponse{
                Code:    "INVALID_TYPE",
                Message: serr.Message,
                Details: map[string]string{
                    "field": *serr.Field,
                },
            }

        case goa.InvalidFormat:
            return &CustomErrorResponse{
                Code:    "INVALID_FORMAT",
                Message: serr.Message,
                Details: map[string]string{
                    "field": *serr.Field,
                    "format_error": serr.Message,
                },
            }

        // その他のバリデーションエラーの処理
        default:
            return &CustomErrorResponse{
                Code:    "VALIDATION_ERROR",
                Message: serr.Message,
                Details: map[string]string{
                    "error_id": serr.ID,
                    "field":    *serr.Field,
                },
            }
        }
    }

    // その他のエラータイプの処理
    return &CustomErrorResponse{
        Code:    "INTERNAL_ERROR",
        Message: err.Error(),
    }
}

// 4. サーバー作成時にフォーマッターを使用
var server *calcsvr.Server
{
    // エラーハンドラーを作成（予期せぬエラー用）
    eh := errorHandler(logger)
    
    // カスタムフォーマッターを使用してサーバーを作成
    server = calcsvr.New(
        endpoints,    // サービスのエンドポイント
        mux,         // HTTPルーター
        dec,         // リクエストデコーダー
        enc,         // レスポンスエンコーダー
        eh,          // エラーハンドラー
        customErrorFormatter,  // カスタムフォーマッター
    )
}
```

これにより、以下のようなJSONレスポンスが生成されます：
```json
{
    "code": "MISSING_FIELD",
    "message": "フィールド 'email' は必須です",
    "details": {
        "field": "email"
    }
}
```

## ベストプラクティス

1. **一貫したフォーマット**
   - API全体で一貫したエラーフォーマットを使用
   - すべてのエラーレスポンスに標準的な構造を定義
   - 常に存在する共通フィールドを含める
   - エラーフォーマットを徹底的に文書化
   
   一貫したフォーマットの例：
   ```json
   {
       "error": {
           "code": "VALIDATION_ERROR",
           "message": "無効な入力が提供されました",
           "details": {
               "field": "email",
               "reason": "invalid_format",
               "help": "有効なメールアドレスである必要があります"
           },
           "trace_id": "abc-123",
           "timestamp": "2024-01-20T10:00:00Z"
       }
   }
   ```

2. **ステータスコード**
   - エラーを正確に反映するHTTPステータスコードを選択
   - ステータスコードの使用に一貫性を持たせる
   - 各ステータスコードの意味を文書化
   - HTTPステータスコードの標準的な意味を考慮
   
   一般的なステータスコードの使用例：
   ```go
   func (r *CustomErrorResponse) StatusCode() int {
       switch r.Code {
       case "NOT_FOUND":
           return http.StatusNotFound        // 404
       case "VALIDATION_ERROR":
           return http.StatusBadRequest      // 400
       case "UNAUTHORIZED":
           return http.StatusUnauthorized    // 401
       case "FORBIDDEN":
           return http.StatusForbidden       // 403
       case "CONFLICT":
           return http.StatusConflict        // 409
       case "INTERNAL_ERROR":
           return http.StatusInternalServerError // 500
       default:
           return http.StatusInternalServerError
       }
   }
   ```

3. **セキュリティ**
   - エラーで内部システムの詳細を露出しない
   - すべてのエラーメッセージをサニタイズ
   - 内部/外部APIで異なるエラーフォーマットを使用
   - 詳細なエラーを内部的にログに記録し、安全なメッセージを返す
   
   安全なエラー処理の例：
   ```go
   func secureErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
       // デバッグ用に完全なエラー詳細を常にログに記録
       log.Printf("Error: %+v", err)
       
       if serr, ok := err.(*goa.ServiceError); ok {
           switch serr.Name {
           // バリデーションエラーはユーザー入力の問題なので露出しても安全
           case goa.MissingField, goa.InvalidFieldType, goa.InvalidFormat,
                goa.InvalidPattern, goa.InvalidRange, goa.InvalidLength:
               return &CustomErrorResponse{
                   Code:    "VALIDATION_ERROR",
                   Message: serr.Message,
                   Details: map[string]string{
                       "field": *serr.Field,
                   }
               }
               
           // 障害エラーは内部詳細を露出する可能性があるので注意
           case "internal_error":
               if serr.Fault {
                   // 内部モニタリング用にログを記録し、一般的なメッセージを返す
                   alertMonitoring(serr)
                   return &CustomErrorResponse{
                       Code:    "INTERNAL_ERROR",
                       Message: "内部エラーが発生しました",
                   }
               }
               
           // 一時的なエラーの場合、原因ではなく再試行可能性を示す
           case "service_unavailable":
               if serr.Temporary {
                   return &CustomErrorResponse{
                       Code:    "SERVICE_UNAVAILABLE",
                       Message: "サービスは一時的に利用できません",
                       Details: map[string]string{
                           "retry_after": "30",
                       },
                   }
               }
           }
       }
       
       // その他のエラーの場合、一般的なエラーレスポンスを返す
       // これにより内部実装の詳細が漏洩するのを防ぐ
       return &CustomErrorResponse{
           Code:    "UNEXPECTED_ERROR",
           Message: "予期せぬエラーが発生しました",
       }
   }
   ```

4. **互換性**
   - フォーマットを変更する際は後方互換性を維持
   - 破壊的な変更を行う場合はエラーフォーマットをバージョン管理
   - すべてのエラーフォーマットの変更を文書化
   - クライアント向けの移行ガイドを提供
   
   バージョン管理されたエラーフォーマットの例：
   ```go
   func versionedErrorFormatter(ctx context.Context, err error) goahttp.Statuser {
       // コンテキストからAPIバージョンを確認
       version := extractAPIVersion(ctx)
       
       switch version {
       case "v1":
           return formatV1Error(err)
       case "v2":
           return formatV2Error(err)
       default:
           return formatLatestError(err)
       }
   }
   ```

## まとめ

カスタムエラーシリアライゼーションにより、以下のことが可能になります：
- バリデーションエラーのシリアライズ方法をカスタマイズ
- エラーを一貫した形式で提示
- エラー詳細の露出を制御
- 異なるエラー型を適切に処理
- クライアントに意味のあるエラーレスポンスを提供

これらの機能により、APIの利用者に対して一貫性があり、セキュアで、有用なエラー情報を提供することができます。