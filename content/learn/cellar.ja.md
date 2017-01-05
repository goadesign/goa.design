+++
date = "2016-01-30T11:01:06-05:00"
title = "goa セラーの参考例"
weight = 3

[menu.main]
name = "セラーの例"
parent = "learn"
+++

goa ワインセラーサービスは [goa](http://goa.design) Web アプリケーションフレームワークの例です。

このサービスはワインボトルを管理するための API を実装しています。このサービスはマルチテナントです。ボトルはアカウントのコンテキストで作成されます。この時点で、データベースはインメモリハッシュでエミュレートされます。この例のインスタンスは `http://cellar.goa.design` でホストされています。

優れた [httpie クライアント](https://github.com/jkbrzt/httpie)を使用します。

アカウント 1 のボトルの列挙。
```bash
http http://cellar.goa.design/cellar/accounts/1/bottles
HTTP/1.1 200 OK
Content-Length: 707
Content-Type: application/vnd.goa.example.bottle+json; type=collection; charset=utf-8
Date: Sun, 06 Dec 2015 09:06:10 GMT
Server: Google Frontend
Vary: Origin

[
    {
        "href": "/cellar/accounts/1/bottles/100",
        "id": 100,
        "links": {
            "account": {
                "href": "/cellar/accounts/1",
                "id": 1,
                "name": "account 1"
            }
        },
        "name": "Number 8",
        "rating": 4,
        "varietal": "Merlot",
        "vineyard": "Asti Winery",
        "vintage": 2012
    },
# ...
```

新しいアカウントの作成。
```bash
http POST http://cellar.goa.design/cellar/accounts name=sonoma created_by=me
HTTP/1.1 201 Created
Content-Length: 0
Content-Type: text/html; charset=utf-8
Date: Sun, 06 Dec 2015 09:08:55 GMT
Location: /cellar/accounts/3
Server: Google Frontend
Vary: Origin
```

新しく作成したアカウントの表示。
```bash
http  http://cellar.goa.design/cellar/accounts/3
HTTP/1.1 200 OK
Content-Length: 66
Content-Type: application/vnd.goa.example.account+json; charset=utf-8
Date: Sun, 06 Dec 2015 09:10:09 GMT
Server: Google Frontend
Vary: Origin

{
    "created_at": "",
    "created_by": "me",
    "href": "",
    "id": 3,
    "name": "sonoma"
}
```

このサンプルの完全なドキュメントは [swagger.goa.design](http://swagger.goa.design/?url=goadesign%2Fgoa-cellar%2Fdesign) にあります。
