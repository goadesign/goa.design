---
linkTitle: "デバッグ"
title: デバッグとプロファイリング
description: "Clueを使用したランタイムデバッグとプロファイリング"
weight: 6
---

ランタイムデバッグとプロファイリングは、サービスの動作を理解し、本番環境での問題を診断するために不可欠です。
Clueは、サービスの運用に影響を与えることなく、問題の調査、パフォーマンスの分析、システムの動作監視を
支援する包括的なツールセットを提供します。

## 概要

Clueのデバッグツールキットには、以下の強力な機能が含まれています：

- **動的ログ制御**: 再起動なしでログレベルを実行時に調整
- **ペイロードロギング**: リクエスト/レスポンスデータの取得と分析
- **Goプロファイリング**: Goのpprofツールの組み込みサポート
- **メモリ分析**: メモリ使用パターンの追跡と分析
- **カスタムデバッグ**: サービス固有のデバッグのための拡張可能なフレームワーク

## デバッグログ制御

動的ログレベル制御により、実行中のサービスでログの詳細度を調整できます。
これは特に本番環境での問題調査に役立ちます：

```go
// デバッグログ有効化機能をマウント
// ログレベルを制御するエンドポイントを追加
debug.MountDebugLogEnabler(mux)

// HTTPハンドラーにデバッグミドルウェアを追加
// HTTPリクエストの動的デバッグログを有効化
handler = debug.HTTP()(handler)

// gRPCサーバーにデバッグインターセプターを追加
// gRPC呼び出しの動的デバッグログを有効化
svr := grpc.NewServer(
    grpc.UnaryInterceptor(debug.UnaryServerInterceptor()))
```

HTTPエンドポイントを通じてデバッグログを制御：
```bash
# 詳細な調査のためにデバッグログを有効化
curl "http://localhost:8080/debug?debug-logs=on"

# 調査完了時にデバッグログを無効化
curl "http://localhost:8080/debug?debug-logs=off"

# 現在のデバッグログ状態を確認
curl "http://localhost:8080/debug"
```

## ペイロードロギング

ペイロードロギングは、APIの統合問題をデバッグするためにリクエストとレスポンスの内容を取得します。
これはデバッグログレベルが有効な場合にのみ動作し、動的ログレベル制御と組み合わせることで強力なツールとなります。
以下のように使用できます：

1. 必要な時にデバッグログを有効化: `curl "http://localhost:8080/debug?debug-logs=on"`
2. リクエストの詳細なペイロード情報を確認
3. 完了時にデバッグログを無効化: `curl "http://localhost:8080/debug?debug-logs=off"`

セットアップ方法：

```go
// すべてのエンドポイントでペイロードロギングを有効化
// 分析用にリクエストとレスポンスのボディを取得
// 注：ペイロードはデバッグレベルが有効な場合のみログに記録
endpoints := genapi.NewEndpoints(svc)
endpoints.Use(debug.LogPayloads())

// 取得したペイロードを表示するデバッグログ出力の例
// デバッグログが有効な場合のみ表示
{
    "level": "debug",
    "msg": "request payload",
    "path": "/users",
    "method": "POST",
    "payload": {
        "name": "John Doe",
        "email": "john@example.com"
    }
}
```

このアプローチには以下の利点があります：

- **パフォーマンス**: 通常の運用時にはペイロードロギングのオーバーヘッドなし
- **セキュリティ**: 機密性の高いペイロードデータは明示的に有効化された場合のみ露出
- **柔軟性**: 実行時にペイロードロギングの有効/無効を切り替え可能
- **デバッグ**: 必要な時に完全なリクエスト/レスポンスのコンテキストを取得

一般的なデバッグワークフロー：
```bash
# 1. 問題調査時にデバッグログを有効化
curl "http://localhost:8080/debug?debug-logs=on"

# 2. 問題を再現 - ペイロードがログに記録される
# 3. ログに記録されたペイロードを分析

# 4. 調査完了時にデバッグログを無効化
curl "http://localhost:8080/debug?debug-logs=off"
```

## プロファイリングエンドポイント

Goのpprofプロファイリングツールはサービスのパフォーマンスについて深い洞察を提供します。
Clueはこれらのエンドポイントを簡単に公開できるようにします：

```go
// すべてのpprofハンドラーを一度にマウント
// Goプロファイリングツールの完全なスイートを有効化
debug.MountDebugPprof(mux)

// または特定のハンドラーを個別にマウントしてより細かく制御
mux.HandleFunc("/debug/pprof/", pprof.Index)          // プロファイルインデックス
mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline) // コマンドライン
mux.HandleFunc("/debug/pprof/profile", pprof.Profile) // CPUプロファイル
mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)   // シンボル検索
mux.HandleFunc("/debug/pprof/trace", pprof.Trace)     // 実行トレース
```

これらのエンドポイントをGoのプロファイリングツールと共に使用：

```bash
# CPUプロファイルの収集と分析
go tool pprof http://localhost:8080/debug/pprof/profile
# CPU分析用の対話型pprofシェルが開く

# ヒープメモリ使用量の分析
go tool pprof http://localhost:8080/debug/pprof/heap
# メモリ割り当てパターンを表示

# ゴルーチンの動作調査
go tool pprof http://localhost:8080/debug/pprof/goroutine
# ゴルーチンのスタックと状態を表示

# 実行トレースの取得
curl -o trace.out http://localhost:8080/debug/pprof/trace
go tool trace trace.out
# 詳細な実行の可視化を開く
```

プロファイリングの詳細については以下を参照：
- [Profiling Go Programs](https://go.dev/blog/pprof)
  pprofの使用に関する公式Goブログ記事
- [Runtime pprof](https://pkg.go.dev/runtime/pprof)
  pprofのパッケージドキュメント
- [Debugging Performance Issues](https://golang.org/doc/diagnostics.html)
  Goの公式診断ドキュメント

## カスタムデバッグエンドポイント

重要なランタイム情報を公開するサービス固有のデバッグエンドポイントを作成：

```go
// デバッグ設定エンドポイント
// 現在のサービス設定を公開
type Config struct {
    LogLevel      string            `json:"log_level"`      // 現在のログレベル
    Features      map[string]bool   `json:"features"`       // 機能フラグの状態
    RateLimit     int              `json:"rate_limit"`      // 現在のレート制限
    Dependencies  []string         `json:"dependencies"`    // サービスの依存関係
}

func debugConfig(w http.ResponseWriter, r *http.Request) {
    cfg := Config{
        LogLevel: log.GetLevel(r.Context()),
        Features: getFeatureFlags(),
        RateLimit: getRateLimit(),
        Dependencies: getDependencies(),
    }
    
    json.NewEncoder(w).Encode(cfg)
}

// デバッグメトリクスエンドポイント
// リアルタイムのサービスメトリクスを提供
func debugMetrics(w http.ResponseWriter, r *http.Request) {
    metrics := struct {
        Goroutines  int     `json:"goroutines"`     // アクティブなゴルーチン
        Memory      uint64  `json:"memory_bytes"`    // 現在のメモリ使用量
        Uptime      int64   `json:"uptime_seconds"`  // サービスの稼働時間
        Requests    int64   `json:"total_requests"`  // リクエスト数
    }{
        Goroutines: runtime.NumGoroutine(),
        Memory:     getMemoryUsage(),
        Uptime:     getUptime(),
        Requests:   getRequestCount(),
    }
    
    json.NewEncoder(w).Encode(metrics)
}

// デバッグエンドポイントをマウント
mux.HandleFunc("/debug/config", debugConfig)
mux.HandleFunc("/debug/metrics", debugMetrics)
```

## メモリ分析

メモリの問題は本番環境での診断が困難な場合があります。Clueはリアルタイムでメモリ使用パターンを
監視・分析するためのツールを提供します：

```go
// メモリ統計エンドポイント
// 詳細なメモリ使用情報を提供
type MemStats struct {
    Alloc      uint64  `json:"alloc"`          // 現在割り当てられているバイト数
    TotalAlloc uint64  `json:"total_alloc"`    // 割り当てられた総バイト数
    Sys        uint64  `json:"sys"`            // システムから取得した総メモリ
    NumGC      uint32  `json:"num_gc"`         // GCサイクル数
    PauseTotalNs uint64  `json:"pause_total_ns"` // GC一時停止の合計時間
}

func debugMemory(w http.ResponseWriter, r *http.Request) {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    stats := MemStats{
        Alloc:      m.Alloc,
        TotalAlloc: m.TotalAlloc,
        Sys:        m.Sys,
        NumGC:      m.NumGC,
        PauseTotalNs: m.PauseTotalNs,
    }
    
    json.NewEncoder(w).Encode(stats)
}

// テスト用の手動GCトリガー
// 本番環境では注意して使用
func debugGC(w http.ResponseWriter, r *http.Request) {
    runtime.GC()
    w.Write([]byte("GC triggered"))
}
```

監視すべき主要なメトリクス：
- **Alloc**: 現在割り当てられているヒープメモリ
- **TotalAlloc**: 起動以降の累積割り当て
- **Sys**: システムから取得した総メモリ
- **NumGC**: 完了したGCサイクル数
- **PauseTotalNs**: GC一時停止の合計時間

メモリ管理の詳細については以下を参照：
- [Memory Management](https://golang.org/doc/gc-guide) 