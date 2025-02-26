---
title: "HTTPを介した生のバイナリデータのストリーミング"
linkTitle: "生のバイナリストリーミング"
weight: 7
description: "Goaの低レベルストリーミング機能を使用して、ファイルやマルチメディアコンテンツなどの生のバイナリデータをHTTP経由で効率的にストリーミングする方法を学びます。"
---

Goaの`StreamingPayload`と`StreamingResult`は型付きデータストリームに適していますが、
時には生のバイナリデータストリームに直接アクセスする必要があります。これは、
ファイルのアップロード、ダウンロード、またはマルチメディアストリームを処理する
際によく見られます。Goaは、`SkipRequestBodyEncodeDecode`と
`SkipResponseBodyEncodeDecode`機能を通じてこの機能を提供します。

## ストリーミングアプローチの選択

Goaは、異なるニーズに適した2つの異なるアプローチを提供します：

`StreamingPayload`と`StreamingResult`アプローチは、既知の型を持つ構造化データを
扱う場合に最適です。型の安全性、バリデーション、またはgRPCの互換性が必要な場合に
特に有用です。このアプローチは、データストリームが期待される構造を維持することを
保証するためにGoaの型システムを活用します。

`SkipRequestBodyEncodeDecode`アプローチは、生のHTTPボディストリームに直接アクセス
できます。これは、ファイルなどのバイナリデータを扱う場合や、データ処理を完全に
制御する必要がある場合に適しています。不要なエンコード/デコードステップを避ける
ため、大きなファイルに対して特に効率的です。

## リクエストストリーミング

リクエストストリーミングにより、サービスは完全なペイロードを待つのではなく、
到着したデータを処理できます。以下は、生のストリーミングを使用してファイル
アップロードを実装する方法です：

```go
var _ = Service("upload", func() {
    Method("upload", func() {
        Payload(func() {
            // 注意：ストリーミングを使用する場合、ボディ属性を定義できません
            Attribute("content_type", String)
            Attribute("dir", String)
        })
        HTTP(func() {
            POST("/upload/{*dir}")
            Header("content_type:Content-Type")
            SkipRequestBodyEncodeDecode()
        })
    })
})
```

サービス実装は、リクエストボディをストリーミングするための`io.ReadCloser`を受け取ります：

```go
func (s *service) Upload(ctx context.Context, p *upload.Payload, body io.ReadCloser) error {
    defer body.Close()
    
    buffer := make([]byte, 32*1024)
    for {
        n, err := body.Read(buffer)
        if err == io.EOF {
            break
        }
        if err != nil {
            return err
        }
        // buffer[:n]を処理
    }
    return nil
}
```

## レスポンスストリーミング

レスポンスストリーミングにより、サービスはクライアントにデータを段階的に送信
できます。これは、ファイルのダウンロードやリアルタイムデータフィードに最適です。
以下は、その実装方法です：

```go
var _ = Service("download", func() {
    Method("download", func() {
        Payload(String)
        Result(func() {
            Attribute("length", Int64)
        })
        HTTP(func() {
            GET("/download/{*filename}")
            SkipResponseBodyEncodeDecode()
            Response(func() {
                Header("length:Content-Length")
            })
        })
    })
})
```

サービス実装は、結果と`io.ReadCloser`の両方を返します：

```go
func (s *service) Download(ctx context.Context, p string) (*download.Result, io.ReadCloser, error) {
    file, err := os.Open(p)
    if err != nil {
        return nil, nil, err
    }
    
    stat, err := file.Stat()
    if err != nil {
        file.Close()
        return nil, nil, err
    }
    
    return &download.Result{
        Length: stat.Size(),
    }, file, nil
}
```

## 完全な例

以下は、単一のサービスでファイルのアップロードとダウンロードの両方のストリーミングを
示す完全な例です：

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = API("streaming", func() {
    Title("ストリーミングAPI例")
})

var _ = Service("files", func() {
    Method("upload", func() {
        Payload(func() {
            Attribute("content_type", String)
            Attribute("filename", String)
        })
        HTTP(func() {
            POST("/upload/{filename}")
            Header("content_type:Content-Type")
            SkipRequestBodyEncodeDecode()
        })
    })
    
    Method("download", func() {
        Payload(String)
        Result(func() {
            Attribute("length", Int64)
        })
        HTTP(func() {
            GET("/download/{*filepath}")
            SkipResponseBodyEncodeDecode()
            Response(func() {
                Header("length:Content-Length")
            })
        })
    })
})
```

実装は、アップロードとダウンロードの両方を処理する完全なファイルサービスを示しています：

```go
type filesService struct {
    storageDir string
}

func (s *filesService) Upload(ctx context.Context, p *files.UploadPayload, body io.ReadCloser) error {
    defer body.Close()
    
    fpath := filepath.Join(s.storageDir, p.Filename)
    f, err := os.Create(fpath)
    if err != nil {
        return err
    }
    defer f.Close()
    
    _, err = io.Copy(f, body)
    return err
}

func (s *filesService) Download(ctx context.Context, p string) (*files.DownloadResult, io.ReadCloser, error) {
    fpath := filepath.Join(s.storageDir, p)
    f, err := os.Open(fpath)
    if err != nil {
        return nil, nil, err
    }
    
    stat, err := f.Stat()
    if err != nil {
        f.Close()
        return nil, nil, err
    }
    
    return &files.DownloadResult{
        Length: stat.Size(),
    }, f, nil
}
```

この実装の主要な側面を見てみましょう：

サービスは、シンプルなストレージディレクトリの概念を中心に構築されています。
各インスタンスは、すべてのファイルが保存され、取得される基本ディレクトリで
構成されます。この特定のディレクトリ内での制限は、ファイル操作の基本的な
セキュリティ境界を提供します。

アップロードでは、メモリ使用量を最小限に抑えるストリーミングアプローチを
実装しています。ファイル全体をメモリにバッファリングする代わりに、`io.Copy`を
使用してリクエストボディからファイルシステムに直接データをストリーミングします。
実装は`defer`文を使用してリソースを慎重に管理し、操作が成功または失敗に
かかわらず適切なクリーンアップを保証します。

ダウンロードの実装も同様に効率的です。ダウンロードが要求されると、まず
ファイルを開いてそのメタデータを1回の操作で取得します。これにより、
ファイルサイズをGoa（Content-Lengthヘッダーに使用）に提供しながら、
ストリーミング用のファイルハンドルも取得できます。成功の場合、ファイルを
閉じないことに注意してください - Goaがファイルハンドルの所有権を取得し、
クライアントにコンテンツをストリーミングした後に閉じます。

両方の操作を通じて、エラー処理が重要な焦点となっています。コードには、
エラーが発生した場合のリソースの適切なクリーンアップ、呼び出し元への
明確なエラー伝播、ディレクトリトラバーサル攻撃を防ぐための安全な
ファイルパス処理が含まれています。このエラー処理への注意により、
さまざまな障害条件下でもサービスの堅牢性とセキュリティが確保されます。

この実装は、以下の方法で効率的なストリーミングを実現しています：
- 直接のファイルシステムストリーミングの使用
- defer文によるリソースの適切な管理
- 正確なコンテンツ長情報の提供
- 適切なエラー処理の実装
- 安全なファイルパス処理の確保

静的ファイルとテンプレートの提供に関連する内容については、[静的コンテンツ](../5-static-content)セクションを参照してください。 