---
title: "プラグイン"
linkTitle: "プラグイン"
description: "コード生成の拡張とカスタマイズのためのGoaプラグインの理解、使用、作成に関する包括的なガイド"
weight: 1
---

# Goaプラグインを理解する

Goaプラグインは、APIの機能を拡張およびカスタマイズします。レート制限の追加、
モニタリングツールの統合、異なる言語でのコード生成など、プラグインは
Goaの機能を柔軟に拡張する方法を提供します。このガイドでは、基本から応用まで、
プラグインの理解と作成について説明します。

## プラグインの基礎

技術的な詳細に入る前に、プラグインができることとGoaでの動作方法について理解しましょう。
プラグインは通常、以下の3つの主要な機能を提供します：

第一に、プラグインはGoaのDSLに新しい設計関数を追加します。これらの関数により、ユーザーは
APIの設計に追加機能を設定できます。例えば、レート制限プラグインは、リクエスト制限を
設定するための`RateLimit()`や`Burst()`などの関数を追加するかもしれません：

```go
var _ = Service("calculator", func() {
    // プラグインのDSL関数を使用してレート制限を設定
    RateLimit(100, func() {      // 100リクエストを許可...
        Period("1m")             // ...1分あたり
        Burst(20)                // ...最大バースト20まで
    })
    
    Method("add", func() {
        // 通常のGoa DSLはここから続く
        Payload(func() {
            Field(1, "a", Int)
            Field(2, "b", Int)
        })
        Result(Int)
    })
})
```

第二に、プラグインはこの設定を保存および検証するためのカスタム式を作成します。
これらの式はGoaのAPI設計の内部表現と統合され、すべての設定が有効で一貫性があることを
保証します。

第三に、プラグインは設定に基づいて追加のコードを生成します。これには、
ミドルウェア、ヘルパー関数、設定ファイルなどが含まれます。例えば、レート制限
プラグインは、設定された制限を適用するミドルウェアコードを生成します：

```go
// 生成されたレート制限ミドルウェア
type calculatorRateMiddleware struct {
    limiter *rate.Limiter
    next    Service
}

func NewRateMiddleware() Middleware {
    // レートリミッターを作成：1分あたり100リクエスト、バースト20
    limiter := rate.NewLimiter(rate.Every(time.Minute), 100)
    limiter.SetBurst(20)
    
    return func(next Service) Service {
        return &calculatorRateMiddleware{
            limiter: limiter,
            next:    next,
        }
    }
}
```

この生成されたコードは、ユーザーの最小限のセットアップでGoaの標準出力とシームレスに
統合されます。

## 基礎：Goa設計言語

効果的なプラグインを作成するには、Goaの設計言語がどのように機能するかを理解する
必要があります。通常のGoコードのように見えますが、GoaのDSL（ドメイン固有言語）は、
サービス、メソッド、およびそれらのプロパティを定義するための構造化された方法を
提供します。

以下はGoaの設計言語の簡単な例です：

```go
var _ = Service("calculator", func() {
    Description("基本的な計算機サービス")
    
    Method("add", func() {
        // 入力パラメータを定義
        Payload(func() {
            Field(1, "a", Int, "足し算の最初の数")
            Field(2, "b", Int, "足し算の2番目の数")
        })
        // 出力を定義
        Result(Int, "aとbの合計")
    })
})
```

このコードは加算メソッドを持つ計算機サービスを定義します。`Service()`、`Method()`、
`Field()`などの各関数は、GoaのDSLの一部です。Goaがこの設計を処理すると、
「式ツリー」と呼ばれる内部表現を作成します：

```
Service("calculator")
    └── Method("add")
        ├── Payload
        │   ├── Field("a")
        │   └── Field("b")
        └── Result(Int)
```

## 新しいDSL関数の作成

プラグインを構築する際、ユーザーがAPI設計で呼び出せるDSL関数を作成する必要があります。
これらの関数は多くの場合、設定を保存および検証する必要があり、これはカスタム式を
通じて行われます。このプロセスを段階的に理解しましょう。

### 式の理解

式はGoaにおけるAPIデザインの一部を表現します。ユーザーがDSL関数を記述すると、
これらの関数は式を作成および設定します。以下がその仕組みです：

```go
var _ = Service("calculator", func() {    // ServiceExprを作成
    Method("add", func() {                // MethodExprを作成
        Payload(func() {                  // PayloadExprを作成
            Field(1, "x", Int)            // ペイロードを設定
        })
    })
})
```

プラグインでは、設定を保存するためのカスタム式を定義します。例えば、
レート制限プラグインは以下のように定義するかもしれません：

```go
// RateExprはサービスのレート制限設定を保存
type RateExpr struct {
    Service  *expr.ServiceExpr // 適用対象のサービス
    Requests int               // 期間あたりのリクエスト数
    Period   string           // 時間期間（例：「1m」）
    Burst    int              // 最大バーストサイズ
}
```

### 式のインターフェース

式がGoaの設計処理で機能するためには、特定のインターフェースを実装する必要があります。
最も基本的な要件は、識別情報を提供する`Expression`インターフェースです：

```go
// すべての式に必要
type Expression interface {
    // EvalNameはエラーメッセージ用の説明的な名前を返す
    EvalName() string    // 例：「service calculator」
}
```

必要に応じて、追加のインターフェースを実装できます：

```go
// オプション - 式が子DSL関数を持つ場合に実装
type Source interface {
    DSL() func()        // 実行するDSL関数を返す
}

// オプション - 検証前にデータを準備する必要がある場合に実装
type Preparer interface {
    Prepare()           // 準備フェーズで呼び出される
}

// オプション - 式に検証が必要な場合に実装
type Validator interface {
    Validate() error    // 検証フェーズで呼び出される
}

// オプション - 検証後の処理が必要な場合に実装
type Finalizer interface {
    Finalize()          // 最終化フェーズで呼び出される
}
```

以下は、これらのインターフェースがレート制限プラグインでどのように連携するかを
示す完全な例です：

```go
// RateExprはレート制限設定を表す
type RateExpr struct {
    Service  *expr.ServiceExpr
    Requests int
    Period   string
    Burst    int
    
    // 内部状態
    prepared bool
    dsl      func()
}

// 必須：Expressionインターフェースを実装
func (r *RateExpr) EvalName() string {
    return fmt.Sprintf("service %qのレート制限", r.Service.Name)
}

// オプション：式が子DSLを持つ場合はSourceを実装
func (r *RateExpr) DSL() func() {
    return r.dsl  // この式を設定するDSL関数を返す
}

// オプション：セットアップ用にPreparerを実装
func (r *RateExpr) Prepare() {
    if !r.prepared {
        // 適切なデフォルト値を設定
        if r.Period == "" {
            r.Period = "1m"
        }
        if r.Burst == 0 {
            r.Burst = r.Requests
        }
        r.prepared = true
    }
}

// オプション：検証用にValidatorを実装
func (r *RateExpr) Validate() error {
    errors := new(eval.ValidationErrors)

    if r.Requests <= 0 {
        errors.Add(r, "リクエスト数は正の値である必要があります。%dが指定されました", r.Requests)
    }

    if _, err := time.ParseDuration(r.Period); err != nil {
        errors.Add(r, "無効な期間%q：%s", r.Period, err)
    }

    if len(errors.Errors) > 0 {
        return errors
    }
    return nil
}

// オプション：後処理用にFinalizerを実装
func (r *RateExpr) Finalize() {
    // 検証後の最終処理を実行
}
```

### DSL関数の作成

DSL関数は、ユーザーがプラグインの機能を設定するためのインターフェースを提供します。
以下は、レート制限プラグインのDSL関数の実装例です：

```go
// RateLimit関数は、サービスのレート制限を設定します
func RateLimit(requests int, fn func()) {
    // 現在のサービスを取得
    service, ok := eval.Current().(*expr.ServiceExpr)
    if !ok {
        eval.IncompatibleDSL()
        return
    }
    
    // 新しいレート制限式を作成
    rate := &RateExpr{
        Service:  service,
        Requests: requests,
        dsl:      fn,
    }
    
    // 式をサービスのメタデータに追加
    service.Meta = append(service.Meta, rate)
}

// Period関数は、レート制限の期間を設定します
func Period(p string) {
    // 親のRateExpr式を取得
    if rate, ok := eval.Current().(*RateExpr); ok {
        rate.Period = p
        return
    }
    eval.IncompatibleDSL()
}

// Burst関数は、最大バーストサイズを設定します
func Burst(size int) {
    if rate, ok := eval.Current().(*RateExpr); ok {
        rate.Burst = size
        return
    }
    eval.IncompatibleDSL()
}
```

これらの関数は以下の重要な点を示しています：

1. **コンテキストの検証** - 各関数は適切なコンテキストで呼び出されていることを確認
2. **型安全性** - 強力な型付けにより設定エラーを防止
3. **ユーザーフレンドリー** - 直感的なAPIで簡単に使用可能
4. **エラー処理** - 明確なエラーメッセージで問題を特定

## evalパッケージ：Goaのプラグインエンジン

式とDSL関数について理解したところで、Goaがそれらをどのように処理するかを見ていきましょう。
`eval`パッケージはGoaのプラグインシステムを動かすエンジンで、設計を4つのフェーズで処理します：

1. **初期実行**: まず、記述されたすべてのDSL関数を実行し、APIデザインを表現する式ツリーを構築します。

2. **準備**: 次に、式を準備し、型間の継承の解決やネストされた構造のフラット化などのタスクを処理します。

3. **検証**: その後、すべての式を検証して、DSLのルールに従っており、論理的に意味があることを確認します。

4. **最終化**: 最後に、デフォルト値の設定や設計の異なる部分間の参照の解決など、必要なクリーンアップを実行します。

レートリミッタープラグインでこれを実際に見てみましょう：

```go
// 設計ファイルにて：
var _ = Service("api", func() {
    RateLimit(100, func() {     // RateExprを作成
        Period("1m")            // 期間を設定
        Burst(20)               // バーストサイズを設定
    })
})

// 内部で以下のように処理されます：

// 1. 初期実行
// - requests=100でRateExprを作成
// - DSL関数を実行し、period="1m"とburst=20を設定
// - RateExprをServiceExprにリンク

// 2. 準備
func (r *RateExpr) Prepare() {
    if !r.prepared {
        // 指定されていない場合はデフォルトの期間を設定
        if r.Period == "" {
            r.Period = "1m"
        }
        // 指定されていない場合はデフォルトのバーストを設定
        if r.Burst == 0 {
            r.Burst = r.Requests
        }
        r.prepared = true
    }
}

// 3. 検証
func (r *RateExpr) Validate() error {
    errors := new(eval.ValidationErrors)
    
    // リクエスト数を検証
    if r.Requests <= 0 {
        errors.Add(r, "リクエスト数は正の値である必要があります。%dが指定されました", r.Requests)
    }
    
    // 期間のフォーマットを検証
    if _, err := time.ParseDuration(r.Period); err != nil {
        errors.Add(r, "無効な期間%q：%s", r.Period, err)
    }
    
    // バーストサイズを検証
    if r.Burst < 0 {
        errors.Add(r, "バーストは非負である必要があります。%dが指定されました", r.Burst)
    }
    
    if len(errors.Errors) > 0 {
        return errors
    }
    return nil
}

// 4. 最終化
func (r *RateExpr) Finalize() {
    // 期間を正規化された形式に変換
    if duration, err := time.ParseDuration(r.Period); err == nil {
        r.normalizedPeriod = duration
    }
    
    // バーストがリクエスト数を超えないようにする
    if r.Burst > r.Requests {
        r.Burst = r.Requests
    }
}
```

このプロセスにより、コード生成が開始される時点で以下が保証されます：
- すべての式が完全に設定されている
- すべての値が検証されている
- すべての相互参照が解決されている
- すべてのデフォルト値が適切に設定されている

### 重要なevalパッケージ関数

このシステムを効果的に使用するために、`eval`パッケージの重要な関数を見ていきましょう：

#### 1. Current() Expression

`Current()`関数は、DSL実行中に現在処理されている式を返します。これはコンテキストを
意識したDSL関数にとって重要です：

```go
// 現在処理中の式を取得
func Current() Expression

// DSL関数での使用例：
func RateLimit(requests int) {
    // 現在の式を取得（Serviceであるべき）
    if current := eval.Current(); current != nil {
        // 正しいコンテキストにいるか確認
        if svc, ok := current.(*expr.ServiceExpr); ok {
            // Service定義の中にいる
            // ... このサービスのレート制限を設定
        } else {
            // 誤ったコンテキスト - RateLimitはService内で使用する必要がある
            eval.ReportError("RateLimitはService内で使用する必要があります")
        }
    }
}
```

この関数は以下の場合に特に有用です：
- DSL関数が使用されているコンテキストの検証
- 設定を含む親式へのアクセス
- 親式の変更（例：サブ式の追加）

#### 2. Execute(fn func(), def Expression) bool

`Execute`関数は、特定の式のコンテキストでDSL関数を実行します。実行コンテキストの
セットアップとクリーンアップを処理します：

```go
// 式のコンテキストでDSL関数を実行
// 実行が成功した場合はtrueを返す
func Execute(fn func(), def Expression) bool

// 使用例：
func RateLimit(requests int, fn func()) {
    if current := eval.Current(); current != nil {
        if svc, ok := current.(*expr.ServiceExpr); ok {
            // 設定式を作成
            rate := &RateExpr{
                Service:  svc,
                Requests: requests,
            }
            
            // 式をコンテキストとしてDSL関数を実行
            if eval.Execute(fn, rate) {
                // DSLが正常に実行された、設定を保存
                svc.Meta = append(svc.Meta, rate)
            }
            // 注：Executeがfalseを返した場合、エラーは既に報告されている
        }
    }
}

// 以下のように使用：
var _ = Service("api", func() {
    RateLimit(100, func() {
        Period("1m")
        Burst(20)
    })
})
```

`Execute`の重要な点：
- 提供された式を一時的に現在の式として設定
- そのコンテキストでDSL関数を実行
- 完了時に以前のコンテキストを復元
- エラーが発生した場合はfalseを返す

#### 3. エラー報告関数

`eval`パッケージは、DSL実行中のエラー報告のための関数を提供します：

##### ReportError(fm string, vals ...any)

`ReportError`はDSL実行中にエラーを報告するために使用されます。提供されたフォーマット文字列と
値を使用してエラーメッセージをフォーマットし、現在の式のコンテキストで自動的にラップします：

```go
// DSL実行中にエラーを報告
func ReportError(fm string, vals ...any)
```

使用例：

```go
func Period(duration string) {
    if rate, ok := eval.Current().(*RateExpr); ok {
        if _, err := time.ParseDuration(duration); err != nil {
            eval.ReportError(
                "無効な期間%q：有効な期間（例：'1m'、'1h'）を指定してください",
                duration)
        }
        rate.Period = duration
    }
}
```

以下のような設計で使用した場合：

```go
var _ = Service("orders", func() {
    RateLimit(100, func() {
        Period("2x")  // 無効な期間
    })
})

// エラー出力：
// /path/to/design/design.go:42: service "orders"のレート制限：無効な期間"2x"：有効な期間（例：'1m'、'1h'）を指定してください
//
// エラーメッセージには以下が含まれます：
// - エラーが発生したファイルと行番号
// - 式のコンテキスト（"service 'orders'のレート制限"）
// - 具体的なエラーメッセージ
// - 問題を修正するためのガイダンス
```

##### IncompatibleDSL()

`IncompatibleDSL`は、DSL関数が誤ったコンテキストで使用された場合を報告します。
これは一般的なエラーケースのための便利な関数です：

```go
// IncompatibleDSLは、DSL関数が誤ったコンテキストで呼び出された場合に
// 呼び出される必要があります（例：「Service」内での「Params」）。
func IncompatibleDSL() {
    ReportError("無効な%sの使用", caller())
}
```

DSL関数での使用方法：

```go
func Burst(n int) {
    if rate, ok := eval.Current().(*RateExpr); ok {
        rate.Burst = n
    } else {
        // Burst()がRateLimitブロック外で呼び出された
        eval.IncompatibleDSL()
    }
}
```

無効なコンテキストで使用した場合：

```go
var _ = Service("orders", func() {
    Burst(20)  // エラー：RateLimit外で呼び出し
})
```

以下のようなエラーメッセージが生成されます：

```
/path/to/design/design.go:42: Burstの無効な使用
```

エラーは以下を示します：
- DSL関数が誤って使用されたファイルと行
- 誤ったコンテキストで使用された関数の名前

これは以下の場合に特に有用です：
- DSL関数が特定の親内で使用される必要がある場合（例：`RateLimit`内の`Burst`）
- 現在の式が期待される型でない場合
- 関数が存在しない特定のコンテキストを必要とする場合

#### 4. Register(r Root) error

`Register`は新しいルート式をDSLに追加します。ルート式はDSLのエントリーポイントであり、
実行順序を制御します：

```go
// 新しいルート式を登録
func Register(r Root) error

// ルート式の例：
type RateLimitRoot struct {
    *expr.RootExpr
    // プラグイン固有の追加フィールド
}

// Rootインターフェースを実装
func (r *RateLimitRoot) WalkSets(w eval.SetWalker) {
    // 式の評価順序を定義
    w.Walk(r.Services)
}

func (r *RateLimitRoot) DependsOn() []eval.Root {
    // 他のプラグインへの依存関係を指定
    return []eval.Root{
        &security.Root{},
    }
}

func (r *RateLimitRoot) Packages() []string {
    // 生成されたコードに必要なインポートパスを返す
    return []string{
        "golang.org/x/time/rate",
    }
}

// プラグインのinit関数でルートを登録
func init() {
    root := &RateLimitRoot{
        RootExpr: &expr.RootExpr{},
    }
    if err := eval.Register(root); err != nil {
        panic(err) // またはエラーを適切に処理
    }
}
```

ルート式の重要な側面：
- `WalkSets`を通じてDSLの実行順序を制御
- 他のプラグインへの依存関係を宣言
- 生成されたコードに必要なパッケージを指定
- 通常はパッケージの初期化時に登録

これらの関数は協調してDSL実行のための堅牢なフレームワークを提供します：
1. `Register`がプラグインのルート式を設定
2. `Current`と`Execute`が実行コンテキストを管理
3. `ReportError`と`IncompatibleDSL`がエラーケースを処理
4. ルート式が全体的な実行フローを制御

## 最初のプラグインの作成

これまでの知識を実践に移し、レート制限プラグインを作成してみましょう。
各コンポーネントとそのプラグインシステムにおける役割を段階的に説明します。

### プロジェクトのセットアップ

まず、以下の構造でプラグイン用の新しいディレクトリを作成します：

```
ratelimit/
├── dsl/
│   ├── dsl.go      # DSL関数（RateLimit、Period等）
│   └── types.go    # 設定を保存する式の型
├── generate.go     # コード生成ロジック
├── plugin.go       # プラグイン登録
└── templates/      # コード生成用テンプレート
    └── middleware.go.tmpl
```

この構造は関心事を分離します：
- `dsl`パッケージにはユーザーが設計で呼び出す関数を含む
- 式の型は設定を保存および検証する
- コード生成ロジックは実際のミドルウェアを生成する
- テンプレートは生成されるコードの見た目を定義する

## プラグイン開発のベストプラクティス

高品質で保守可能なプラグインを作成するためのベストプラクティスを見ていきましょう。
これらのガイドラインは実際のGoaプラグインの経験に基づいています。

### 設計原則

プラグインのインターフェースを設計する際は、以下の原則に従ってください：

1. **シンプルに保つ**
   - 1つの問題を適切に解決することに集中
   - 最も一般的なユースケースを最も簡単に実装できるようにする
   - オプション設定にはセンシブルなデフォルト値を提供

2. **Goaとの一貫性を保つ**
   - GoaのDSLスタイルと命名規則に従う
   - Goaの組み込み関数と同様のパターンを使用
   - エラーメッセージとドキュメントの一貫性を維持

適切に設計されたDSLの例：

```go
var _ = Service("orders", func() {
    // シンプルな一般的なケース
    RateLimit(100)
    
    // より複雑なケースとオプション
    RateLimit(100, func() {
        Period("1m")
        Burst(20)
    })
})
```

### コードの構成

プラグインコードを明確さと保守性のために構造化します：

```
plugin-name/
├── dsl/
│   ├── dsl.go       # 公開DSL関数
│   ├── types.go     # 式の型
│   └── internal.go  # 内部ヘルパー
├── generate/
│   ├── generate.go  # メインの生成ロジック
│   └── helpers.go   # 生成ヘルパー
├── templates/       # コードテンプレート
│   ├── client.go.tmpl
│   └── server.go.tmpl
├── example/         # 使用例
│   └── design/
│       └── design.go
└── README.md       # 明確なドキュメント
```

### エラー処理

ユーザーが問題を素早く修正できるよう、包括的なエラー処理を実装します。Goaは
検証エラーの収集と管理のための特別な`ValidationErrors`型を提供します：

```go
// ValidationErrorsは、そのコンテキストと共に複数の検証エラーを収集します
type ValidationErrors struct {
    Errors      []error      // 実際のエラー
    Expressions []Expression // エラーが発生した式
}

// 検証関数でのValidationErrorsの使用例
func (r *RateExpr) Validate() error {
    errors := new(eval.ValidationErrors)
    
    // コンテキスト付きで個別のエラーを追加
    if r.Requests <= 0 {
        errors.Add(r, "リクエスト数は正の値である必要があります。%dが指定されました", r.Requests)
    }
    
    // ネストされた設定を検証
    if err := r.validatePeriod(); err != nil {
        if verr, ok := err.(*eval.ValidationErrors); ok {
            errors.Merge(verr)
        } else {
            // コンテキスト付きで単一のエラーを追加
            errors.AddError(r, err)
        }
    }
    
    if len(errors.Errors) > 0 {
        return errors
    }
    return nil
}

// ネストされた検証を示すヘルパー関数
func (r *RateExpr) validatePeriod() error {
    errors := new(eval.ValidationErrors)
    
    if r.Period != "" {
        if _, err := time.ParseDuration(r.Period); err != nil {
            // 適切なコンテキストでフォーマットされたエラーを追加
            errors.Add(r, 
                "無効な期間%q：有効な期間（例：'1m'、'1h'）を指定してください",
                r.Period)
        }
    }
    
    return errors
}
```

`ValidationErrors`型は以下の主要な機能を提供します：
1. **エラーの収集**: 検証中に複数のエラーを蓄積：
   ```go
   errors := new(eval.ValidationErrors)
   errors.Add(expr, "最初のエラー：%v", val1)
   errors.Add(expr, "2番目のエラー：%v", val2)
   ```

2. **コンテキストの保持**: 各エラーはその式と関連付けられます：
   ```go
   // エラーメッセージには式の名前が含まれます：
   // "service 'api'のレート制限：リクエスト数は正の値である必要があります。-1が指定されました"
   errors.Add(rateExpr, "リクエスト数は正の値である必要があります。%dが指定されました", requests)
   ```

3. **エラーのマージ**: ネストされた検証からのエラーを結合：
   ```go
   func (v *ValidationExpr) Validate() error {
       errors := new(eval.ValidationErrors)
       
       // 基本設定を検証
       if err := v.validateBasic(); err != nil {
           if verr, ok := err.(*eval.ValidationErrors); ok {
               errors.Merge(verr)  // ネストされた検証からのエラーをマージ
           }
       }
       
       // 各ルールを検証
       for _, rule := range v.Rules {
           if err := rule.Validate(); err != nil {
               if verr, ok := err.(*eval.ValidationErrors); ok {
                   errors.Merge(verr)  // 各ルールからのエラーをマージ
               } else {
                   errors.AddError(v, err)  // 単一のエラーを追加
               }
           }
       }
       
       return errors
   }
   ```

4. **フラット化されたエラーメッセージ**: `Error()`メソッドは明確で構造化された出力を生成：
   ```go
   // 出力形式：
   // service 'api'のレート制限：リクエスト数は正の値である必要があります。-1が指定されました
   // service 'api'のレート制限：無効な期間"2x"、"s"、"m"、または"h"を使用してください
   ```

`ValidationErrors`使用のベストプラクティス：

1. **早期作成**: 検証の開始時にエラーコンテナを作成
   ```go
   func (e *Expr) Validate() error {
       errors := new(eval.ValidationErrors)
       // ... 検証ロジック ...
   }
   ```

2. **コンテキストの追加**: エラー追加時は常に式を提供
   ```go
   errors.Add(e, "値%vは無効です", value)  // 良い
   errors.AddError(e, fmt.Errorf("無効"))    // これも良い
   ```

3. **ネストされた検証の処理**: サブ検証からのエラーを適切にマージ
   ```go
   if err := subExpr.Validate(); err != nil {
       if verr, ok := err.(*eval.ValidationErrors); ok {
           errors.Merge(verr)
       } else {
           errors.AddError(e, err)
       }
   }
   ```

4. **早期リターン**: エラーがない場合はnilを返す
   ```go
   if len(errors.Errors) > 0 {
       return errors
   }
   return nil
   ```

この構造化されたエラー処理アプローチにより、ユーザーはAPI設計の問題を以下の方法で
理解し修正できます：
- 最初のエラーで停止せず、すべての検証エラーを収集
- 各エラーが発生した場所について明確なコンテキストを提供
- エラーとその式の関係を維持
- 整形された明確なエラーメッセージを生成

### コード生成

コード生成時は以下のプラクティスに従ってください：

1. **テンプレートを効果的に使用**
   ```go
   // 複雑なテンプレートを小さな、焦点を絞ったセクションに分割
   sections := []*codegen.SectionTemplate{
       {
           Name:   "types",
           Source: typesT,
           Data:   data,
       },
       {
           Name:   "encoders",
           Source: encodersT,
           Data:   data,
       },
   }
   ```

2. **クリーンなコードを生成**
   ```go
   // テンプレートに明確なコメントを追加
   {{ define "types" }}
   // {{ .TypeName }}はレート制限設定を実装します。
   // 並行使用に対して安全です。
   type {{ .TypeName }} struct {
       limiter *rate.Limiter
       config  *Config
   }
   
   // Configはレート制限パラメータを保存します。
   type Config struct {
       Requests int           // 期間あたりの最大リクエスト数
       Period   time.Duration // 制限の時間期間
       Burst    int          // 最大バーストサイズ
   }
   {{ end }}
   ```

3. **ドキュメントを含める**
   ```go
   // テンプレートで、パッケージドキュメントを生成
   {{ define "header" }}
   // パッケージ{{ .Package }}はレート制限機能を提供します。
   //
   // リクエストレートを制御するためのトークンバケットアルゴリズムを実装します。
   // 使用方法：
   //     limiter := New(100, time.Minute)  // 1分あたり100リクエスト
   //     if err := limiter.Wait(ctx); err != nil {
   //         return err
   //     }
   package {{ .Package }}
   {{ end }}
   ```

### テスト

プラグインの包括的なテストを実装します：

```go
func TestRateLimitDSL(t *testing.T) {
    cases := []struct {
        name     string
        design   func()
        wantErr  bool
        errMsg   string
    }{
        {
            name: "基本的なレート制限",
            design: func() {
                Service("test", func() {
                    RateLimit(100)
                })
            },
        },
        {
            name: "無効なレート制限",
            design: func() {
                Service("test", func() {
                    RateLimit(-1)
                })
            },
            wantErr: true,
            errMsg:  "リクエスト数は正の値である必要があります",
        },
    }
    
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            // 設計をリセット
            eval.Reset()
            
            // テストを実行
            err := eval.RunDSL(tc.design)
            
            // 結果を確認
            if tc.wantErr {
                if err == nil {
                    t.Error("エラーが期待されましたが、nilが返されました")
                } else if !strings.Contains(err.Error(), tc.errMsg) {
                    t.Errorf("%qを含むエラーが期待されましたが、%qが返されました",
                        tc.errMsg, err.Error())
                }
            } else if err != nil {
                t.Errorf("予期しないエラー：%v", err)
            }
        })
    }
}
```

### ドキュメント

明確で包括的なドキュメントを提供します：

1. **README.md**
   - プラグインの目的の明確な説明
   - インストール手順
   - 基本的な使用例
   - 設定オプション
   - 一般的なユースケース

2. **コードコメント**
   ```go
   // RateLimitはサービスまたはメソッドにレート制限を適用します。
   // 時間期間あたりの最大リクエスト数を指定できます。
   //
   // 例：
   //
   //    var _ = Service("api", func() {
   //        // シンプルな使用法：1分あたり100リクエスト
   //        RateLimit(100)
   //
   //        // 高度な使用法：カスタム期間とバースト
   //        RateLimit(100, func() {
   //            Period("1m")
   //            Burst(20)
   //        })
   func RateLimit(requests int, fn ...func()) { ... }
   ```

3. **例**
   - `example`ディレクトリに動作する例を提供
   - 一般的なユースケースと高度なシナリオを含める
   - キーコンセプトを説明するコメントを追加

## まとめ

プラグインは、Goaの機能を拡張し、特定のニーズに合わせてカスタマイズするための
強力な方法を提供します。以下の点に注意して設計と実装を行うことで、
効果的なプラグインを作成できます：

- 明確で一貫したDSLインターフェース
- 堅牢なエラー処理と検証
- 効率的なコード生成
- 包括的なテストとドキュメント

これらの原則に従うことで、メンテナンス可能で信頼性の高いプラグインを
作成することができます。

実際の例とインスピレーションについては、
[公式プラグインリポジトリ](https://github.com/goadesign/plugins)を参照してください。 