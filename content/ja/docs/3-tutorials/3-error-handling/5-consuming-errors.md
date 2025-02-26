---
title: エラーの生成と消費
linkTitle: エラーの生成
weight: 5
description: "Goaサービスでのエラーの生成と処理のガイド。生成されたヘルパー関数の使用とクライアント側でのエラー処理を含みます。"
---

エラーの生成と消費は、Goaベースのサービスにおけるエラーハンドリングの
重要な側面です。このセクションでは、サービス実装内でエラーを生成する方法と、
クライアント側でこれらのエラーを効果的に処理する方法について詳しく説明します。

## エラーの生成

### 生成されたヘルパー関数の使用

Goaは定義されたエラーのためのヘルパー関数を生成し、標準化されたエラー
レスポンスの作成プロセスを簡素化します。これらのヘルパー関数は、エラーが
サービス設計に従って一貫性があり、適切にフォーマットされることを保証します。
ヘルパー関数は`Make<エラー名>`という名前で、`<エラー名>`はDSLで定義された
エラーの名前です。これらはサービス設計に基づいてエラーフィールドを初期化
します（例：エラーがタイムアウトか、一時的かなど）。

以下のサービス設計を考えてみましょう：

```go
var _ = Service("divider", func() {
    Method("IntegralDivide", func() {
        Payload(IntOperands)
        Result(Int)
        Error("DivByZero", ErrorResult, "除数はゼロにできません")
        Error("HasRemainder", ErrorResult, "余りがゼロではありません")
        HTTP(func() {
            POST("/divide")
            Response(StatusOK)
            Response("DivByZero", StatusBadRequest)
            Response("HasRemainder", StatusUnprocessableEntity)
        })
    })
})

var IntOperands = Type("IntOperands", func() {
    Attribute("dividend", Int, "被除数")
    Attribute("divisor", Int, "除数")
    Required("dividend", "divisor")
})
```

実装例：

```go
//...
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if p.Divisor == 0 {
        return 0, gendivider.MakeDivByZero(fmt.Errorf("除数はゼロにできません"))
    }
    if p.Dividend%p.Divisor != 0 {
        return 0, gendivider.MakeHasRemainder(fmt.Errorf("余りは%dです", p.Dividend%p.Divisor))
    }
    return p.Dividend / p.Divisor, nil
}
```

この例では：

- `gendivider`パッケージはGoaによって生成されます（`gen/divider`の下）。
- `MakeDivByZero`関数は標準化された`DivByZero`エラーを作成します。
- `MakeHasRemainder`関数は標準化された`HasRemainder`エラーを作成します。

これらのヘルパー関数は、サービス設計に基づいてエラーフィールドの初期化を
処理し、エラーが正しくシリアライズされ、トランスポート固有のステータス
コード（この例では`DivByZero`は400、`HasRemainder`は422）にマッピング
されることを保証します。

### カスタムエラータイプの使用

より複雑なエラーシナリオでは、カスタムエラータイプを定義する必要がある
かもしれません。デフォルトの`ErrorResult`とは異なり、カスタムエラータイプ
では、エラーに関連する追加のコンテキスト情報を含めることができます。

以下のサービス設計を考えてみましょう：

```go
var _ = Service("divider", func() {
    Method("IntegralDivide", func() {
        Payload(IntOperands)
        Result(Int)
        Error("DivByZero", DivByZero, "除数はゼロにできません")
        HTTP(func() {
            POST("/divide")
            Response(StatusOK)
            Response("DivByZero", StatusBadRequest)
        })
    })
})

var DivByZero = Type("DivByZero", func() {
    Description("DivByZeroは、除数として0を使用した場合に返されるエラーです。")
    Field(1, "name", String, "エラー名", func() {
        Meta("struct:error:name")
    })
    Field(2, "message", String, "ゼロによる除算のエラーメッセージ。")
    Field(3, "dividend", Int, "操作で使用された被除数。")
    Required("name", "message", "dividend")
})
```

実装例：

```go
func (s *dividerSvc) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if p.Divisor == 0 {
        return 0, &gendivider.DivByZero{Name: "DivByZero", Message: "除数はゼロにできません", Dividend: p.Dividend}
    }
    // 追加のロジック...
}
```

この例では：

- `DivByZero`構造体は、サービス設計で定義されたカスタムエラータイプです。
- `DivByZero`のインスタンスを返すことで、カスタムの詳細なエラー情報を
  提供できます。
- 注意：カスタムエラータイプを使用する場合、Goaがエラーを正しくマッピング
  できるように、エラー構造体に`Meta("struct:error:name")`を持つ属性を
  含める必要があります。この属性は、サービス設計で定義されたエラーの名前で
  設定する必要があります。

## エラーの消費

クライアント側でのエラー処理は、サーバー側でのエラー生成と同様に重要です。
適切なエラー処理により、クライアントが異なるエラーシナリオに適切に対応
できることを保証します。

### デフォルトエラーの処理

デフォルトの`ErrorResult`タイプを使用する場合、クライアント側のエラーは
`goa.ServiceError`のインスタンスです。エラータイプをチェックし、エラー名に
基づいて処理できます。

例：

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if serr, ok := err.(*goa.ServiceError); ok {
        switch serr.Name {
        case "HasRemainder":
            // 余りがあるエラーを処理
        case "DivByZero":
            // ゼロによる除算エラーを処理
        default:
            // 不明なエラーを処理
        }
    }
}
```

### カスタムエラーの処理

カスタムエラータイプを使用する場合、クライアント側のエラーは対応する
生成されたGo構造体のインスタンスです。エラーを特定のカスタムタイプに
型アサーションし、それに応じて処理できます。

例：

```go
res, err := client.Divide(ctx, payload)
if err != nil {
    if dbz, ok := err.(*gendivider.DivByZero); ok {
        // ゼロによる除算エラーを処理
    }
}
```

## まとめ

エラーを効果的に生成および消費することで、Goaベースのサービスが障害を
明確かつ一貫して伝達することを保証します。標準エラーには生成された
ヘルパー関数を、より複雑なシナリオにはカスタムエラータイプを利用することで、
柔軟で堅牢なエラーハンドリングが可能になります。適切なクライアント側の
エラー処理により、APIの信頼性と使いやすさがさらに向上し、ユーザーに
意味のあるフィードバックを提供し、適切な修正措置を可能にします。

### エラーハンドリングのテスト

エラーハンドリングのテストには、エラー条件とタイプの慎重な検証が必要です。
以下は、Clueの[mockパッケージ](https://github.com/goadesign/clue/tree/main/mock)
を使用してエラーハンドリングを効果的にテストする方法です：

```go
// Clueのmockパッケージをインポート
import (
    "github.com/goadesign/clue/mock"
)

// Clueのmockパッケージを使用したモック実装
// これはClueを使用してモックを適切に構造化する方法を示しています
type mockDividerService struct {
    *mock.Mock // Clueのモックタイプを埋め込み
}

// IntegralDivideはClueのNextパターンを使用してモックを実装します
func (m *mockDividerService) IntegralDivide(ctx context.Context, p *divider.IntOperands) (int, error) {
    if f := m.Next("IntegralDivide"); f != nil {
        return f.(func(context.Context, *divider.IntOperands) (int, error))(ctx, p)
    }
    return 0, errors.New("IntegralDivideへの予期しない呼び出し")
}

func TestIntegralDivide(t *testing.T) {
    // Clueのmockパッケージを使用してモックサービスを作成
    // これはテスト用のClueの強力なモック機能を示しています
    svc := &mockDividerService{mock.New()}
    
    tests := []struct {
        name     string
        setup    func(*mockDividerService)
        dividend int
        divisor  int
        wantErr  string
    }{
        {
            name: "ゼロによる除算",
            setup: func(m *mockDividerService) {
                m.Set("IntegralDivide", func(ctx context.Context, p *divider.IntOperands) (int, error) {
                    if p.Divisor == 0 {
                        return 0, gendivider.MakeDivByZero(fmt.Errorf("除数はゼロにできません"))
                    }
                    return p.Dividend / p.Divisor, nil
                })
            },
            dividend: 10,
            divisor:  0,
            wantErr:  "除数はゼロにできません",
        },
        {
            name: "余りがある",
            setup: func(m *mockDividerService) {
                m.Set("IntegralDivide", func(ctx context.Context, p *divider.IntOperands) (int, error) {
                    if p.Dividend%p.Divisor != 0 {
                        return 0, gendivider.MakeHasRemainder(fmt.Errorf("余りは%dです", p.Dividend%p.Divisor))
                    }
                    return p.Dividend / p.Divisor, nil
                })
            },
            dividend: 10,
            divisor:  3,
            wantErr:  "余りは1です",
        },
    }
    // ... テストの実行 ...
} 