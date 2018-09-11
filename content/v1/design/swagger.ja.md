+++
date = "2016-01-30T11:01:06-05:00"
title = "Swagger の活用"
weight = 4

[menu.main]
name = "Swagger"
parent = "design"
+++

[goagen](/implement/goagen) はデザインによって与えられた API の Swagger 仕様を生成することができます。
[https://swagger.goa.design](https://swagger.goa.design) でホストされているサービスは、（公開されている）Github レポジトリ上で `goagen swagger` を実行し、対応する Swagger UI をレンダリングします。
これにより、オープンソースの goa サービスの API 定義をすばやく見て、それを試してみる便利な方法が提供されます。

## 「Try It!」ボタンと CORS

Swagger UI は各操作に対して "Try It!" ボタンをレンダリングします。
これらのボタンをクリックすると、UI は対応する API リクエストをそのデザインで定義されたホストに送信します。
したがって、ホストは、ボタンが動作するようにアクティブに実行してAPIをホストする必要があります。

HTTP レスポンスには、レスポンスの JSON にアクセスするための UI JavaScript を認可する CORS ヘッダーも含まれている必要があります。
CORS パッケージの[リファレンス](/reference/goa/cors) では CORS を goa サービスでどのようにセットアップするかの詳細を説明しています。
