---
title: Goaにおけるエラー処理
linkTitle: エラー処理
weight: 1
description: "エラー定義、トランスポートマッピング、ベストプラクティスを含む、Goaサービスにおける効果的なエラー処理の方法を学びます。"
---

Goaは、サービス全体でエラーを効果的に定義、管理、通信できる堅牢なエラー処理システムを提供します。このガイドでは、Goaにおけるエラー処理について知っておくべきすべてを説明します。

## 概要

Goaはエラー処理に対して「バッテリー同梱」アプローチを取っており、必要に応じて完全にカスタムなエラー型をサポートしながら、最小限の情報（名前のみ）でエラーを定義できます。フレームワークはエラー定義からコードとドキュメントの両方を生成し、API全体での一貫性を確保します。

Goaのエラー処理の主な機能：

- サービスレベルとメソッドレベルのエラー定義
- デフォルトとカスタムのエラー型
- トランスポート固有のステータスコードマッピング（HTTP/gRPC）
- エラー作成用の生成されたヘルパー関数
- 自動的なドキュメント生成

## エラーの定義

### APIレベルのエラー

エラーはAPIレベルで定義して、再利用可能なエラー定義を作成できます。
サービスレベルのエラーとは異なり、APIレベルのエラーは自動的にすべての
メソッドに適用されるわけではありません。代わりに、トランスポートマッピングを
含むエラープロパティを一度定義し、サービスとメソッド間で再利用する方法を
提供します：

```go
var _ = API("calc", func() {
    // トランスポートマッピングを持つ再利用可能なエラーを定義
    Error("invalid_argument")  // デフォルトのErrorResult型を使用
    HTTP(func() {
        Response("invalid_argument", StatusBadRequest)
    })
})

var _ = Service("divider", func() {
    // APIレベルのエラーを参照
    Error("invalid_argument")  // 上で定義したエラーを再利用
                              // HTTPマッピングを再定義する必要なし

    Method("divide", func() {
        Payload(DivideRequest)
        // カスタム型を持つメソッド固有のエラー
        Error("div_by_zero", DivByZero, "ゼロによる除算")
    })
})
```

このアプローチは：
- API全体で一貫したエラー定義を可能にする
- トランスポートマッピングの重複を削減
- 一元化されたエラー処理ポリシーを可能にする
- 一貫したエラーレスポンスの維持を容易にする

### サービスレベルのエラー

サービスレベルのエラーは、サービス内のすべてのメソッドで利用可能です。
再利用可能な定義を提供するAPIレベルのエラーとは異なり、サービスレベルの
エラーは自動的にサービス内のすべてのメソッドに適用されます：

```go
var _ = Service("calc", func() {
    // このエラーはこのサービスのどのメソッドからも返すことができます
    Error("invalid_arguments", ErrorResult, "無効な引数が提供されました") 
    
    Method("divide", func() {
        // このメソッドは明示的に宣言しなくてもinvalid_argumentsを返すことができます
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        // ... その他のメソッド定義
    })

    Method("multiply", func() {
        // このメソッドもinvalid_argumentsを返すことができます
        // ... メソッド定義
    })
})
```

サービスレベルでエラーを定義する場合：
- エラーはサービス内のすべてのメソッドで利用可能
- 各メソッドは明示的に宣言しなくてもエラーを返すことができる
- エラーに定義されたトランスポートマッピングはすべてのメソッドに適用される

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
            Field(2, "reminder", Int)
            Required("quotient", "reminder")
        })
        Error("div_by_zero") // メソッド固有のエラー
    })
})
```

### カスタムエラー型

より複雑なエラーシナリオでは、カスタムエラー型を定義できます。カスタム
エラー型を使用すると、エラーケースに特有の追加のコンテキスト情報を
含めることができます。

#### 基本的なカスタムエラー型

以下は簡単なカスタムエラー型の例です：

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZeroは、除数として0を使用した場合に返されるエラーです。")
    Field(1, "message", String, "ゼロによる除算は無限大になります。")
    Required("message")
})
```

#### エラー名フィールドの要件

同じメソッドで複数のエラーにカスタムエラー型を使用する場合、Goaはどのフィールドにエラー名が含まれているかを知る必要があります。これは以下の点で重要です：
- エラーを設計定義とマッチング
- 正しいHTTP/gRPCステータスコードの決定
- 適切なドキュメントの生成
- クライアントでの適切なエラー処理の有効化

エラー名フィールドを指定するには、`struct:error:name`メタデータを使用します：

```go
var DivByZero = Type("DivByZero", func() {
    Description("DivByZeroは、除数として0を使用した場合に返されるエラーです。")
    Field(1, "message", String, "ゼロによる除算は無限大になります。")
    Field(2, "name", String, "エラーの名前", func() {
        Meta("struct:error:name")  // このフィールドにエラー名が含まれることをGoaに伝える
    })
    Required("message", "name")
})
```

`Meta("struct:error:name")`でマークされたフィールドは：
- 文字列型でなければならない
- 必須フィールドでなければならない
- 設計で定義されたエラー名に設定されなければならない
- `"error_name"`という名前は使用できない（Goaによって予約済み）

#### 複数のエラー型の使用

メソッドが複数の異なるカスタムエラー型を返す可能性がある場合、名前フィールドは特に重要になります。その理由は：

1. **エラー型の解決**: 複数のエラー型が可能な場合、Goaは名前フィールドを使用して、
返されている実際のエラーが設計のどのエラー定義に一致するかを判断します。これにより
Goaは以下が可能になります：
   - 正しいトランスポートマッピング（HTTP/gRPCステータスコード）の適用
   - 正確なAPIドキュメントの生成
   - クライアント側での適切なエラー処理の有効化

2. **トランスポート層の処理**: 名前フィールドがないと、トランスポート層は異なる
ステータスコードで定義された複数のエラー型のうち、どのステータスコードを使用すべきか
わかりません：
   ```go
   HTTP(func() {
       Response("div_by_zero", StatusBadRequest)        // 400
       Response("overflow", StatusUnprocessableEntity)  // 422
   })
   ```

3. **クライアント側の型アサーション**: 名前フィールドにより、Goaは設計で定義された
各エラーに対して特定のエラー型を生成できます。これらの生成された型により、エラー処理は
型安全になり、すべてのエラーフィールドにアクセスできます：

以下は、設計での名前が実装と一致する必要がある例です：

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        // これらの名前（"div_by_zero"と"overflow"）は、エラー型の
        // nameフィールドで正確に使用される必要があります
        Error("div_by_zero", DivByZero)
        Error("overflow", NumericOverflow)
        // ... その他のメソッド定義
    })
})

// これらのエラーを処理するクライアントコードの例
res, err := client.Divide(ctx, payload)
if err != nil {
    switch err := err.(type) {
    case *calc.DivideDivByZeroError:
        // このエラーは設計のError("div_by_zero", ...)に対応
        fmt.Printf("ゼロ除算エラー: %s\n", err.Message)
        fmt.Printf("%dをゼロで除算しようとしました\n", err.Dividend)
    case *calc.DivideOverflowError:
        // このエラーは設計のError("overflow", ...)に対応
        fmt.Printf("オーバーフローエラー: %s\n", err.Message)
        fmt.Printf("結果値 %d が最大値を超えました\n", err.Value)
    case *goa.ServiceError:
        // 一般的なサービスエラー（バリデーションなど）の処理
        fmt.Printf("サービスエラー: %s\n", err.Message)
    default:
        // 不明なエラーの処理
        fmt.Printf("不明なエラー: %s\n", err.Error())
    }
}
```

設計で定義された各エラーに対して、Goaは以下を生成します：
- 特定のエラー型（例：`"div_by_zero"`に対する`DivideDivByZeroError`）
- これらのエラーを作成および処理するためのヘルパー関数
- トランスポート層での適切なエラー型変換

設計と実装の接続はエラー名を通じて維持されます：
1. 設計で`Error("name", ...)`で使用される名前
2. エラー型のnameフィールドは正確に一致する必要がある
3. 生成されるエラー型はこれに基づいて名付けられる（例：`MethodNameError`）

### エラープロパティ

エラープロパティは、エラーの性質についてクライアントに通知し、適切な処理戦略を
実装できるようにする重要なフラグです。これらのプロパティは**デフォルトの`ErrorResult`型を
使用する場合にのみ利用可能**で、カスタムエラー型では効果がありません。

プロパティはDSL関数を使用して定義されます：

- `Temporary()`: エラーが一時的であり、同じリクエストを再試行すると成功する可能性があることを示す
- `Timeout()`: デッドラインを超過したためにエラーが発生したことを示す
- `Fault()`: サーバーサイドのエラー（バグ、設定の問題など）を示す

デフォルトの`ErrorResult`型を使用する場合、これらのプロパティは生成された`ServiceError`構造体の
フィールドに自動的にマッピングされ、洗練されたクライアント側のエラー処理が可能になります：

```go
var _ = Service("calc", func() {
    // 一時的なエラーはクライアントに再試行を提案します
    Error("invalid_argument", ErrorResult, "無効な引数が提供されました")
    Method("divide", func() {
        Payload(func() {
            Field(1, "dividend", Int)
            Field(2, "divisor", Int)
            Required("dividend", "divisor")
        })
        Error("div_by_zero", DivByZero, "ゼロによる除算")
    })
}) 
```

Error("rate_limit", ErrorResult, func() {
    Description("APIレート制限を超過しました")
    Temporary()  // レート制限が解除されたら再試行可能
})

Error("db_unavailable", ErrorResult, func() {
    Description("データベースが一時的に利用できません")
    Temporary()  // データベースが復旧したら再試行可能
    Fault()      // サーバー側の問題
})

Error("deadline_exceeded", ErrorResult, func() {
    Description("リクエストがタイムアウトしました")
    Timeout()    // タイムアウトエラー
    Temporary()  // 再試行可能
})

Method("process", func() {
    Payload(func() {
        Field(1, "input", String)
        Required("input")
    })
    Result(String)
    // 上記で定義したエラーを使用可能
})
```

これらのプロパティを使用することで、クライアントは適切な再試行戦略を実装できます：

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    switch e := err.(type) {
    case *goa.ServiceError:  // ServiceErrorのみがこれらのプロパティを持ちます
        if e.Temporary {
            // バックオフ付きで再試行を実装
            return retry(ctx, func() error {
                res, err = client.Divide(ctx, payload)
                return err
            })
        }
        if e.Timeout {
            // 次のリクエストのタイムアウトを増やすかもしれません
            ctx = context.WithTimeout(ctx, 2*time.Second)
            return client.Divide(ctx, payload)
        }
        if e.Fault {
            // エラーをログに記録し、管理者に通知
            log.Error("サーバーの障害を検出", "error", e)
            alertAdmins(e)
        }
    default:
        // カスタムエラー型はこれらのプロパティを持ちません
        log.Error("エラーが発生しました", "error", err)
    }
}
```

これらのプロパティにより、クライアントは以下が可能になります：
- 一時的なエラーに対してインテリジェントな再試行戦略を実装
- タイムアウトエラーに対してタイムアウトやペイロードサイズを調整
- サーバーサイドの障害を適切にエスカレーション
- 操作を再試行するかどうかについて情報に基づいた決定を行う

注意：カスタムエラー型でこれらのプロパティが必要な場合は、カスタム型に
同様のフィールドを実装し、コードで明示的に処理する必要があります。

## エラー処理のベストプラクティス

1. **エラー定義の階層**
   - APIレベルで共通エラーを定義
   - サービスレベルでサービス固有のエラーを定義
   - メソッドレベルでメソッド固有のエラーを定義
   - エラー定義の重複を避ける

2. **エラー型の選択**
   - 単純なケースにはデフォルトの`ErrorResult`を使用
   - 追加のコンテキストが必要な場合はカスタム型を使用
   - エラープロパティを活用して再試行ロジックを実装
   - エラー型を一貫して使用

3. **トランスポートマッピング**
   - 適切なHTTP/gRPCステータスコードを選択
   - エラーレスポンスを一貫してフォーマット
   - プロトコル固有の機能（HTTPヘッダーなど）を活用
   - クライアントの要件を考慮

4. **エラーメッセージ**
   - 明確で説明的なメッセージを提供
   - センシティブな情報を漏洩しない
   - 問題の解決方法を提案
   - 国際化を考慮

5. **クライアント側の処理**
   - 型付きエラーを活用
   - エラープロパティに基づいて再試行
   - エラーを適切にログに記録
   - ユーザーフレンドリーなエラーメッセージを表示

## 結論

Goaのエラー処理システムは、以下を提供することで、堅牢なAPIの構築を支援します：
- 柔軟なエラー定義オプション
- 型安全なエラー処理
- 自動的なトランスポートマッピング
- クライアントフレンドリーなエラー情報

このシステムを効果的に使用することで：
- エラー処理の一貫性を維持
- クライアントの使いやすさを向上
- エラー処理のメンテナンス性を改善
- APIの信頼性を向上

次のセクションでは、これらの概念を実際のユースケースに適用する方法を見ていきます。

## トランスポートマッピング

Goaでは、エラーを適切なトランスポート固有のステータスコードにマッピングできます。
このマッピングは、異なるプロトコル間で一貫性のある意味のあるエラーレスポンスを
提供するために重要です。

### HTTPステータスコード

HTTPトランスポートの場合、エラー状態を最もよく表す標準的なHTTPステータスコードに
エラーをマッピングします。マッピングは`HTTP` DSLで定義されます：

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        // 説明付きで可能性のあるエラーを定義
        Error("div_by_zero", ErrorResult, "ゼロによる除算エラー")
        Error("overflow", ErrorResult, "数値オーバーフローエラー")
        Error("unauthorized", ErrorResult, "認証が必要です")

        HTTP(func() {
            POST("/")
            // 各エラーを適切なHTTPステータスコードにマッピング
            Response("div_by_zero", StatusBadRequest)
            Response("overflow", StatusUnprocessableEntity)
            Response("unauthorized", StatusUnauthorized)
        })
    })
})
```

エラーが発生すると、Goaは：
1. エラーを設計定義とマッチング
2. マッピングされたステータスコードをHTTPレスポンスで使用
3. レスポンス定義に従ってエラーをシリアライズ
4. 指定されたヘッダーやメタデータを含める

### gRPCステータスコード

gRPCトランスポートの場合、標準的なgRPCステータスコードにエラーをマッピングします。
マッピングは同様の原則に従いますが、gRPC固有のコードを使用します：

```go
var _ = Service("calc", func() {
    Method("divide", func() {
        // 説明付きで可能性のあるエラーを定義
        Error("div_by_zero", ErrorResult, "ゼロによる除算エラー")
        Error("overflow", ErrorResult, "数値オーバーフローエラー")
        Error("unauthorized", ErrorResult, "認証が必要です")

        GRPC(func() {
            // 各エラーを適切なgRPCステータスコードにマッピング
            Response("div_by_zero", CodeInvalidArgument)
            Response("overflow", CodeOutOfRange)
            Response("unauthorized", CodeUnauthenticated)
        })
    })
})
```

一般的なgRPCステータスコードのマッピング：
- `CodeInvalidArgument`: バリデーションエラー用（例：div_by_zero）
- `CodeNotFound`: リソースが見つからないエラー用
- `CodeUnauthenticated`: 認証エラー用
- `CodePermissionDenied`: 認可エラー用
- `CodeDeadlineExceeded`: タイムアウトエラー用
- `CodeInternal`: サーバーサイドの障害用

### デフォルトマッピング

明示的なマッピングが提供されない場合：
- HTTP: バリデーションエラーにはステータスコード400（Bad Request）、その他のエラーには500（Internal Server Error）を使用
- gRPC: マッピングされていないエラーには`CodeUnknown`を使用

## 次のステップ

Goaのエラー処理の基本を理解したところで、以下のトピックを探索して知識を深めましょう：

- [ドメインvsトランスポートエラー](1-domain-vs-transport.md) - ビジネスロジックのエラーとそのトランスポート表現の分離方法を学ぶ
- [エラーの伝播](2-error-propagation.md) - サービスの異なる層を通じてエラーがどのように流れるかを理解する
- [エラーのシリアライズ](3-error-serialization.md) - エラーのシリアライズとフォーマットのカスタマイズ方法を学ぶ

これらのガイドは、Goaサービスで包括的なエラー処理戦略を実装するのに役立ちます。