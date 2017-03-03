+++
date = "2016-01-30T11:01:06-05:00"
title = "ロギング"
weight = 5

[menu.main]
name = "ロギング"
parent = "implement"
+++

優れたログ戦略を持つことが、マイクロサービスを書くための重要な側面としてあります。
これはかなり複雑なトピックですが、goa はサービス上でロギングがどのように実装されているかについて、可能な限り仮定しないようになっています。
しかしながら、例えば、ユーザーコードによって補足されないエラーが最終的には正しくログに記録されるといったようないくつかの統合は必要です。

## ロガーアダプター

goaは、ロガーが実装することを期待する最小限のインターフェースを定義します。
このインターフェイスは
[LogAdapter](http://goa.design/reference/goa/#type-logadapter-a-name-goa-logadapter-a)
で、次のように定義されています：

```go
 type LogAdapter interface {
 	// Info logs an informational message.
 	Info(msg string, keyvals ...interface{})
 	// Error logs an error.
 	Error(msg string, keyvals ...interface{})
 	// New appends to the logger context and returns the updated logger adapter.
 	New(keyvals ...interface{}) LogAdapter
 }
```

`Info` と `Error` メソッドは、各メッセージと共にオプションのキーと値のペアを渡すことができるようにすることで、構造化ログを実装します。
これにより、それをサポートするロガーの構造化されたログエントリが生成されます。
アダプターは、実際のロガーがそれをサポートしていない場合でも、goa の一部である標準ロガーアダプターと同様にコンテキストを適切にロギングする必要があります。

ミドルウェアは `New` メソッドを利用して、各ログエントリでログに記録される追加のロギングコンテキストをともなったアダプタをインスタンス化できます。
このような追加のコンテキストは、例えば [LogRequest](http://goa.design/reference/goa/middleware/#func-logrequest-a-name-middleware-logrequest-a) ミドルウェアによって行われるような、一意のリクエスト ID を含むことができるでしょう。
ログアダプター自体はリクエストコンテキストに保管され、[ContextLogger](http://goa.design/reference/goa/#func-contextlogger-a-name-goa-logadapter-contextlogger-a) を使用して取り出すことができます。
goa はまた、アダプタ上で `New` を呼び出し、結果のログアダプタを含む新しいコンテキストを作成する [WithLogContext](http://goa.design/reference/goa/#func-withlogcontext-a-name-goa-withlogcontext-a) 関数を公開しています。

## サービスでの利用方法

サービスは、goa とは独立に、必要に応じてロガーを設定する必要があります。
goa は、[標準ログ](https://golang.org/pkg/log/)や [log15](https://github.com/inconshreveable/log15)、[logrus](https://github.com/Sirupsen/logrus)、[go-kit logger](https://github.com/go-kit/kit) などを含む共通ログパッケージに対するいくつかの `LogAdapter` の[実装](http://goa.design/reference/) を備えています。

インスタンス化されるとすぐに、これらのアダプターの1つを利用して、サービスのロガーを goa に注入する必要があります。
`log15` を例にとると、次のようになります：

```go
// Create logger
logger := log.New("module", "app/server")
// Configure it
logger.SetHandler(log.StreamHandler(os.Stderr, log.LogfmtFormat()))
// Inject it
service.WithLogger(goalog15.New(logger))
```

アクションハンドラが呼び出される前に、goa はロガーコンテキストを設定を処理します。
コンテキストは、[LogRequest](http://goa.design/reference/goa/middleware/#func-logrequest-a-name-middleware-logrequest-a)
ミドルウェアなどのミドルウェアによって追加構成することもできます。

コードは各アダプタパッケージが提供するアクセサ関数を利用してロギングコンテキストを利用することができます。
引き続き、`log15` の例では：

```go
logger := goalog15.Logger(ctx) // logger is a log15.Logger
logger.Warn("whoops", "value", 15)
```

サービスのコードは、すべてのロギングコールを goa 経由で流す必要はありません。
たとえば、データベース層では、おそらく goa パッケージを使用する必要は全くありません。
結合を避けるためのアイデアは、上記を組み合わせた各ログメソッドの関数を定義することです：

```go
// define logInfo, logWarn, and logError globally:
func logInfo(ctx context.Context, msg string, keyvals...interface{}) {
	goalog15.Logger(ctx).Info(msg, keyvals...)
}

// which can be used as in:
logInfo(ctx, "whoops", "value", 15)
```

サービスは、goa によって設定されたコンテキストを利用できるこのような筋の通ったロギング関数を、強い結合なしに、定義しなくてはなりません。

## ミドルウエアでの利用方法

ミドルウェアは、コンテキストと [ContextLogger](http://goa.design/reference/goa/#func-contextlogger-a-name-goa-logadapter-contextlogger-a) 関数を介してロガーにアクセスできます。
返された [LogAdapter](http://goa.design/reference/goa/#type-logadapter-a-name-goa-logadapter-a) を使用して、ロガーコンテキストに追加したり、ログを書き込んだりすることができます。

あるいは、ミドルウェアは、[WithLogContext](http://goa.design/reference/goa/#func-withlogcontext-a-name-goa-withlogcontext-a) 関数を利用してロガーコンテキストに追加し、goa パッケージの [LogInfo](http://goa.design/reference/goa/#func-loginfo-a-name-goa-loginfo-a) および [LogError](http://goa.design/reference/goa/#func-logerror-a-name-goa-logerror-a) 関数を使用してログを書き込むことができます。
