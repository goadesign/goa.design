+++
title = "Goa の開発"
weight = 2

[menu.main]
name = "Goa の開発"
parent = "extend"
+++

# 開発環境の構築
Goa は GitHub を使用しています。プロジェクトは次の場所にあります。
[github.com/goadesign/goa](https://github.com/goadesign/goa)。 
このサイトのプロジェクトと混同しないでください
[github.com/goadesign/goa.design](https://github.com/goadesign/goa.design)。

このドキュメントでは、Goa にコントリビュートするための開発環境のセットアップに必要な手順について説明します。

## 1. Go をインストールする

まず Go のディストリビューションをインストールしましょう。
[Go 入門ガイド](https://golang.org/doc/install)に記載されている手順に従ってください。

## 2. Goa をクローンする
> 注：この手順には git が必要です。 git のインストールは、このドキュメントの範囲外です。

Go をインストールし、環境変数 [GOPATH](https://github.com/golang/go/wiki/SettingGOPATH) を設定してから、Goa のクローンをおこないます。

```bash
cd $GOPATH/src
mkdir -p goa.design
cd goa.design
git clone https://github.com/goadesign/goa
cd goa
git checkout v3
```

## 3. 依存関係をインストールする

Goa が依存するすべての Go パッケージを取り込みます：

```bash
go get -v -u ./...
```

## 4. Goa をビルドする

Goa ツールをインストールします：

```bash
cd cmd/goa
go install .
```

## 5. セットアップをテストする

最後に、すべてが正しくセットアップされていることを確認するためにテストを実行します：

```bash
cd $GOPATH/src/goa.design/goa
make
```

## 6. 開発

これで、完全に機能する Goa のインストールが完了し、Goa をハックする準備が整いました！
もしまだ Goa の Slack [チャンネル](https://gophers.slack.com/messages/goa/)に参加していないようでしたら
（[ここからサインアップ](https://gophersinvite.herokuapp.com/)して）質問できるように参加してください。

変更を提出する準備が出来たら、Github で [PR](https://help.github.com/en/articles/about-pull-requests)
をオープンするだけです。誰かが提案された変更をレビューして、フィードバックを提供します。
コントリビューションの詳細については[レポジトリ](https://github.com/goadesign/goa/blob/v3/CONTRIBUTING.md)を参照してください。
