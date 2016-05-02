+++
date = "2016-01-30T11:01:06-05:00"
title = "The goa-cellar Reference Example"
weight = 3
+++

The goa winecellar service provides an example for the [goa](http://goa.design) web application
framework.

The service implements an API for managing wine bottles. The service is multitenant: bottles are
created in the context of an account. At this time the database is emulated with an in-memory hash.
An instance of this example is hosted at `http://cellar.goa.design`.

Using the excellent [httpie client](https://github.com/jkbrzt/httpie):

Listing bottles in account 1:
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

Creating a new account:
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

Showing the newly created account:
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

The complete documentation for the example is available on
[swagger.goa.design](http://swagger.goa.design/?url=goadesign%2Fgoa-cellar%2Fdesign).
