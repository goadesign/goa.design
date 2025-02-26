---
title: ファイルのアップロードとダウンロード
weight: 2
description: "ストリーミングを使用してGoaで効率的なファイルアップロードとダウンロード機能を実装する方法を学びます"
---

# ファイルのアップロードとダウンロード

Webサービスを構築する際、ファイルのアップロードとダウンロードの処理は一般的な要件です。
ファイル共有サービス、画像アップロードAPI、ドキュメント管理システムなどを構築する場合、
バイナリファイル転送を効率的に処理する必要があります。

このセクションでは、ストリーミングを使用してバイナリファイルを効率的に処理するGoaでの
ファイルアップロードとダウンロード機能の実装方法を説明します。ここで示すアプローチは
直接HTTPストリーミングを使用し、サーバーとクライアントの両方のコードがペイロード全体を
メモリにロードすることなくコンテンツを処理できるようにします。これは特に大きなファイルを
扱う場合に重要で、それらを完全にメモリにロードすると、パフォーマンスの問題を引き起こしたり、
サービスがクラッシュする可能性があります。

## 設計の概要

Goaでファイルのアップロードとダウンロードを効率的に実装するための鍵は、GoaがHTTPリクエストと
レスポンスのボディを処理する方法を変更する2つの特別なDSL関数を使用することです：

- `SkipRequestBodyEncodeDecode`: アップロードのために、リクエストボディのエンコード/デコードを
  バイパスするために使用します。これにより、アップロードされたファイルをメモリに最初にロードすることなく、
  直接ストリーミングできます。
- `SkipResponseBodyEncodeDecode`: ダウンロードのために、レスポンスボディのエンコード/デコードを
  バイパスするために使用します。これにより、ファイル全体をメモリにバッファリングすることなく、
  ディスクからクライアントに直接ファイルをストリーミングできます。

これらの関数は、GoaにHTTPリクエストとレスポンスのボディのエンコーダーとデコーダーの生成を
スキップするように指示し、代わりに基礎となるIOストリームへの直接アクセスを提供します。
これは大きなファイルを効率的に処理するために重要です。

## 実装例

ファイルのアップロードとダウンロードの両方を処理する完全なサービスの実装を見ていきましょう。
以下のようなサービスを作成します：
- マルチパートフォームデータを介してファイルアップロードを受け付ける
- ファイルをディスクに保存する
- 以前にアップロードされたファイルのダウンロードを許可する
- エラーを適切に処理する
- 効率性のためにストリーミングを使用する

### API設計

まず、デザインパッケージでAPIとサービスを定義する必要があります。ここでエンドポイント、
そのパラメータ、およびそれらがHTTPにどのようにマッピングされるかを指定します：

```go
var _ = API("upload_download", func() {
    Description("ファイルアップロードとダウンロードの例")
})

var _ = Service("updown", func() {
    Description("ファイルのアップロードとダウンロードを処理するサービス")

    // アップロードエンドポイント
    Method("upload", func() {
        Payload(func() {
            // アップロードに必要なヘッダーとパラメータを定義
            // content_typeはマルチパートフォームデータの解析に必要
            Attribute("content_type", String, "マルチパート境界を含むContent-Typeヘッダー")
            // dirはアップロードされたファイルを保存する場所を指定
            Attribute("dir", String, "アップロードディレクトリのパス")
        })

        HTTP(func() {
            POST("/upload/{*dir}")  // ディレクトリをURLパラメータとするPOSTエンドポイント
            Header("content_type:Content-Type")  // content_typeをContent-Typeヘッダーにマッピング
            SkipRequestBodyEncodeDecode()  // アップロード用のストリーミングを有効化
        })
    })

    // ダウンロードエンドポイント
    Method("download", func() {
        Payload(String)  // ダウンロードするファイル名
        
        Result(func() {
            // Content-Lengthヘッダーでファイルサイズを返す
            Attribute("length", Int64, "バイト単位のコンテンツ長")
            Required("length")
        })

        HTTP(func() {
            GET("/download/{*filename}")  // ファイル名をURLパラメータとするGETエンドポイント
            SkipResponseBodyEncodeDecode()  // ダウンロード用のストリーミングを有効化
            Response(func() {
                Header("length:Content-Length")  // lengthをContent-Lengthヘッダーにマッピング
            })
        })
    })
})
```

この設計は2つのエンドポイントを作成します：
1. `POST /upload/{dir}` - ファイルアップロードを受け付け、指定されたディレクトリに保存
2. `GET /download/{filename}` - リクエストされたファイルをクライアントにストリーミング

### サービスの実装

次に、これらのエンドポイントを処理するサービスの実装を見てみましょう。実装では、
ファイルアップロードのためのマルチパートフォームデータの処理、ディスクとの間の
ファイルの効率的なストリーミング、ファイルハンドルやメモリなどのシステムリソースの
適切な管理、エラーの堅牢な処理が必要です。これには、ファイルが正しく処理され、
エラーの場合でもリソースがクリーンアップされることを保証するために、細心の注意を
払う必要があります。

サービスの実装は、本番環境での大きなファイルのアップロードとダウンロードの処理の
ベストプラクティスを示します。マルチパート境界の解析、メモリの問題を避けるための
チャンク単位でのデータのストリーミング、defer文を使用したリソースの適切なクローズ
方法を見ていきます。

詳細な説明付きの実装は以下の通りです：

```go
// serviceは、アップロード/ダウンロードサービスの設定を保持する構造体です
type service struct {
    dir string  // ファイルを保存するベースディレクトリ
}

// Upload実装は、マルチパートフォームデータを介してファイルアップロードを処理します
func (s *service) Upload(ctx context.Context, p *updown.UploadPayload, req io.ReadCloser) error {
    // 完了時にリクエストボディを必ずクローズ
    defer req.Close()

    // リクエストからマルチパートフォームデータを解析
    // これには境界パラメータを含むContent-Typeヘッダーが必要
    _, params, err := mime.ParseMediaType(p.ContentType)
    if err != nil {
        return err  // 無効なContent-Typeヘッダー
    }
    mr := multipart.NewReader(req, params["boundary"])

    // マルチパートフォーム内の各ファイルを処理
    for {
        part, err := mr.NextPart()
        if err == io.EOF {
            break  // これ以上ファイルがない
        }
        if err != nil {
            return err  // パート読み取りエラー
        }
        
        // 保存先ファイルを作成
        // ベースディレクトリとアップロードされたファイル名を結合
        dst := filepath.Join(s.dir, part.FileName())
        f, err := os.Create(dst)
        if err != nil {
            return err  // ファイル作成エラー
        }
        defer f.Close()  // 早期リターンの場合でもファイルを確実にクローズ

        // リクエストからディスクにファイル内容をストリーミング
        // io.Copyはストリーミングを効率的に処理
        if _, err := io.Copy(f, part); err != nil {
            return err  // ファイル書き込みエラー
        }
    }
    return nil
}

// Download実装は、ディスクからクライアントにファイルをストリーミングします
func (s *service) Download(ctx context.Context, filename string) (*updown.DownloadResult, io.ReadCloser, error) {
    // 完全なファイルパスを構築
    path := filepath.Join(s.dir, filename)
    
    // ファイル情報を取得（主にサイズのため）
    fi, err := os.Stat(path)
    if err != nil {
        return nil, nil, err  // ファイルが見つからないか他のエラー
    }

    // 読み取り用にファイルを開く
    f, err := os.Open(path)
    if err != nil {
        return nil, nil, err  // ファイルオープンエラー
    }

    // ファイルサイズとファイルリーダーを返す
    // 呼び出し元がリーダーをクローズする責任を持つ
    return &updown.DownloadResult{Length: fi.Size()}, f, nil
}
```

## 使用方法

サービスを実装し、`goa gen`でコードを生成した後、いくつかの方法でサービスを使用できます。
生成されたCLIツールを使用してテストする方法は以下の通りです：

```bash
# まず、1つの端末でサーバーを起動
$ go run cmd/upload_download/main.go

# 別の端末でファイルをアップロード
# --streamフラグは、ファイルをディスクから直接ストリーミングするようCLIに指示
$ go run cmd/upload_download-cli/main.go updown upload \
    --stream /path/to/file.jpg \
    --dir uploads

# 以前にアップロードしたファイルをダウンロード
# 出力は新しいファイルにリダイレクト
$ go run cmd/upload_download-cli/main.go updown download file.jpg > downloaded.jpg
```

実際のアプリケーションでは、通常HTTPクライアントを使用してこれらのエンドポイントを
呼び出します。`curl`を使用した例：

```bash
# ファイルをアップロード
$ curl -X POST -F "file=@/path/to/file.jpg" http://localhost:8080/upload/uploads

# ファイルをダウンロード
$ curl http://localhost:8080/download/file.jpg -o downloaded.jpg
```

## 重要なポイントとベストプラクティス

1. アップロードには`SkipRequestBodyEncodeDecode`を使用して：
   - リクエストボディデコーダーの生成をバイパス
   - HTTPリクエストボディリーダーへの直接アクセスを取得
   - メモリの問題なく大きなファイルをストリーミング
   - マルチパートフォームデータを効率的に処理

2. ダウンロードには`SkipResponseBodyEncodeDecode`を使用して：
   - レスポンスボディエンコーダーの生成をバイパス
   - レスポンスを直接クライアントにストリーミング
   - 大きなファイルを効率的に処理
   - 適切なContent-Lengthヘッダーを設定

3. サービスの実装は`io.Reader`インターフェースを受け取り、返すことで、データの効率的な
   ストリーミングを可能にします。これは以下の点で重要です：
   - メモリ効率
   - 大きなファイルでのパフォーマンス
   - 複数の同時アップロード/ダウンロードの処理

4. リソースを適切に処理することを常に忘れないでください：
   - `defer`を使用してリーダーとファイルをクローズ
   - 各ステップで適切にエラーを処理
   - セキュリティのためにファイルパスとタイプを検証
   - 適切なファイルパーミッションを設定
   - 本番環境での使用のためのレート制限の実装を検討

5. セキュリティの考慮事項：
   - ファイルタイプとサイズを検証
   - ディレクトリトラバーサル攻撃を防ぐためにファイル名をサニタイズ
   - 認証と認可を実装
   - アップロードされたファイルのウイルススキャンの検討
``` 