---
title: "インターセプター入門"
description: "Goaインターセプターの作成と使用方法を学ぶ"
weight: 1
---

このガイドでは、最初のGoaインターセプターの作成と使用方法について説明します。
メソッド呼び出しのタイミングを記録する簡単なロギングインターセプターを作成します。

## インターセプターの定義

インターセプターは設計内で`Interceptor`関数を使用して定義します。以下は簡単な
ロギングインターセプターの例です：

```go
var RequestLogger = Interceptor("RequestLogger", func() {
    Description("受信リクエストとそのタイミングをログに記録します")
    
    // リザルトからメソッドのステータスを読み取りたい
    ReadResult(func() {
        Attribute("status", Int, "返却されたステータスコード") // HTTPではなくビジネスロジックのステータスコード
    })
    
    // タイミング情報をリザルトに追加する
    WriteResult(func() {
        Attribute("processedAt", String, "リクエストが処理された時刻")
        Attribute("duration", Int, "処理時間（ミリ秒）")
    })
})
```

`Interceptor` DSLは`RequestLogger`という名前の新しいインターセプターを定義します。
`ReadResult`と`WriteResult`を使用して、リザルトからアクセスする必要のあるフィールドを
指定します - この場合、リザルトのステータスコードを読み取り、タイミング情報を書き込みます。
Goaにはペイロードの読み書きに対応するDSLもあります。

## インターセプターの適用

インターセプターはサービスレベルとメソッドレベルの両方に適用できます：

```go
var _ = Service("calculator", func() {
    // サービス内のすべてのメソッドに適用
    ServerInterceptor(RequestLogger)
    
    Method("add", func() {
        // メソッド固有のインターセプター
        ServerInterceptor(ValidateNumbers)
        
        Payload(func() {
            Attribute("a", Int)
            Attribute("b", Int)
        })
        Result(Int)
    })
})
```

この例は、`ServerInterceptor`を使用してサービス設計でインターセプターを適用する方法を
示しています。サービスレベル（すべてのメソッドに影響）またはメソッドレベル（そのメソッド
のみに影響）で適用できます。

これにより、Goaの生成コードを通じて型安全性を維持しながら、サービス操作全体のタイミングを
追跡できる簡単なロギングシステムが作成されます。

## インターセプターの実装

生成されたコードは、インターセプターを実装するための型安全なインターフェースを提供します。
以下はロギングインターセプターの実装方法です：

```go
func (i *ServerInterceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    start := time.Now()
    
    // 次のインターセプターまたは最終エンドポイントを呼び出す
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    // 型安全なインターフェースを通じてリザルトにアクセス
    r := info.Result(res)
    
    // タイミング情報を追加
    r.SetProcessedAt(time.Now().Format(time.RFC3339))
    r.SetDuration(int(time.Since(start).Milliseconds()))
    
    return res, nil
}
```

このインターセプターの動作を分解してみましょう：

1. 関数シグネチャはGoaのインターセプターパターンに従います：
   - コンテキスト、型安全な情報オブジェクト、次のエンドポイントを受け取る
   - リザルトとエラーを返す

2. タイミングの取得：

   ```go
   start := time.Now()
   ```

   リクエストの開始時刻を記録

3. 次のハンドラーの呼び出し：

   ```go
   res, err := next(ctx, info.RawPayload())
   ```

   - 次のインターセプターまたは最終エンドポイントを実行
   - 元のペイロードを渡す
   - エラーがある場合は早期に返却

4. リザルトへのアクセス：
   ```go
   r := info.Result(res)
   ```
   生成された型安全なインターフェースを使用してリザルトにアクセス

5. タイミング情報の追加：
   ```go
   r.SetProcessedAt(time.Now().Format(time.RFC3339))
   r.SetDuration(int(time.Since(start).Milliseconds()))
   ```
   - 処理完了時刻を記録
   - 合計時間を計算して保存
   - 型安全性のために生成されたセッターを使用

6. 変更されたリザルトの返却：
   ```go
   return res, nil
   ```
   強化されたレスポンスをチェーンの上位に渡す

## インターセプターの使用

インターセプターを定義すると、Goaはそれをサービスに組み込むために必要なコードを生成します。
生成されるコードの構造は以下の通りです：

1. まず、Goaはすべてのサーバーサイドインターセプターを定義する`ServerInterceptors`
   インターフェースを生成します：

```go
// ServerInterceptorsはすべてのサーバーサイドインターセプターのインターフェースを定義
type ServerInterceptors interface {
    RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error)
    // ... 他のインターセプター ...
}
```

2. 各インターセプターについて、Goaは型安全な情報構造体とインターフェースを生成します：

```go
// 情報構造体はインターセプションに関するメタデータを提供
type RequestLoggerInfo struct {
    service    string
    method     string
    callType   goa.InterceptorCallType
    rawPayload any
}

// リザルトにアクセスするための型安全なインターフェース
type RequestLoggerResult interface {
    Status() int
    SetProcessedAt(string)
    SetDuration(int)
}
```

3. サービスで`ServerInterceptors`インターフェースを実装します：

```go
type interceptors struct {
    logger *log.Logger
}

func NewInterceptors(logger *log.Logger) *interceptors {
    return &interceptors{logger: logger}
}

func (i *interceptors) RequestLogger(ctx context.Context, info *RequestLoggerInfo, next goa.Endpoint) (any, error) {
    // 前の例からの実装
    start := time.Now()
    res, err := next(ctx, info.RawPayload())
    if err != nil {
        return nil, err
    }
    
    r := info.Result(res)
    r.SetProcessedAt(time.Now().Format(time.RFC3339))
    r.SetDuration(int(time.Since(start).Milliseconds()))
    
    return res, nil
}
```

4. Goaはインターセプターをエンドポイントに適用するためのラッパー関数を生成します：

```go
func main() {
    // サービス実装を作成
    svc := NewService()
    
    // インターセプターを作成
    interceptors := NewInterceptors(log.Default())
    
    // インターセプター付きでエンドポイントを作成
    endpoints := NewEndpoints(svc, interceptors)
    
    // ... 通常通り続行 ...
}
```

生成されたコードは以下の主要な利点を提供します：

- 生成されたインターフェースを通じたペイロードとリザルトへの型安全なアクセス
- 正しい順序でのエンドポイントの自動ラッピング
- インターセプターの定義と実装の明確な分離
- 異なる呼び出し型（単項、サーバーストリーミング、クライアントストリーミング、双方向）の適切な処理

生成されたインターフェースとラッパーにより、インターセプターがチェーン全体を通じて型安全性を
維持しながら、リクエスト処理パイプラインに適切に統合されることが保証されます。

## インターセプターの実行順序

複数のインターセプターが適用される場合、以下の順序で実行されます：

1. サービスレベルのインターセプター（宣言順）
2. メソッドレベルのインターセプター（宣言順）
3. 実際のエンドポイント
4. メソッドレベルのインターセプター（逆順）
5. サービスレベルのインターセプター（逆順）

これは、インターセプターがリクエストとレスポンスの両方のフローを包含することを意味します。

## 次のステップ

基本を理解したところで：

- 様々な[インターセプターの種類](../2-interceptor-types)について学ぶ
- [インターセプターの実装](3-interceptor-implementation)の詳細とパターンについて学ぶ
- 本番環境での使用のための[ベストプラクティス](../4-best-practices)を確認する 