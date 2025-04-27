---
title: "Sticky Cookies"
linkTitle: "Sticky Cookies"
description: "Deployment strategy for Services using streaming / websockets"
weight: 4
---

When using streaming services / websockets you need to do some additional steps
in your deployment.

## Why do we need sticky cookies?

You might want to deploy your Goa Services into Kubernetes and do a horizontal
scaling of your pods.

In a common scenario you will have one Docker container that is executed multiple
times (replicas count).

A loadbalancer (ingress, traefik, haproxy, etc) will balance the calls that are
send to a public endpoint to hit a pod. The pod that is targeted is picked by
the loadbalancer and is randomized / load balanced.

For regular REST (http) or gRPC calls this is exactly what you want.

For streaming / websockets the client / server on a specific pod needs to keep
"their" connection.

To achieve this, the loadbalancer uses a technique called `sticky cookies`.

Basically when a streaming / websocket client hits the loadbalancer the first time
a cookie is generated and this is send back with the response of the pod to the client.

As we are using websockets, the connection is still open between client and server.

- The client uses the cookie during the next call to the server and also sets the cookie.

- The loadbalancer uses the cookie to send the call to the specific pod.

**Hint**: Never use sticky cookies for your REST/gRPC calls - unless you know what
you are doing. For streaming / websockets it's a must when you use horizontal scaling

## Developer Test Framework

### Goa Endpoint

Design

```go
var _ = Service("dummy", func() {
    Description("Private functions")

    Method("hostname", func() {
        Result(func() {
            Field(1, "ip", String, "IP of the host")
            Field(2, "hostname", String, "Name of the host")
        })

        HTTP(func() {
            GET("/hostname")
        })
    })
})
```

Implementation

```go
func (s *dummysrvc) Hostname(ctx context.Context) (res *dummy.HostnameResult, err error) {
    res = &dummy.HostnameResult{}
    log.Printf(ctx, "dummy.hostname")

    hostname, _ := os.Hostname()
    addrs, _ := net.LookupIP(hostname)
    for _, addr := range addrs {
        if ipv4 := addr.To4(); ipv4 != nil {
            var str = ipv4.String()
            res.IP = &str
            break
        }
    }
    res.Hostname = &hostname

    return
}
```

We assume that you have a Docker container with your goa service called `my-service`
and that the container exposes a http port `8000`. (TBD: simple tutorial how to do this).

```yml
---
services:
  server:
    image: my-service
    deploy:
      replicas: 3
    labels:
      - "traefik.http.routers.webapp.rule=Host(`localhost`)"
      - "traefik.http.services.webapp.loadbalancer.server.port=8000"
      - "traefik.http.services.webapp.loadbalancer.sticky.cookie.name=ws-session"
  traefik-lb:
    image: traefik:latest
    command: --api.insecure=true --providers.docker
    ports:
      - 8000:8000
      # traefik web interface
      - 8080:8080
    labels:
    - "traefik.http.routers.api.rule=Host(`admin.localhost`)"
    - "traefik.http.routers.api.insecure=true"
    - "traefik.http.routers.api.service=api@internal"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

**Hint**: Check [this](https://github.com/07prajwal2000/Auto-Scaling-Websockets-using-Traefik/tree/master) repository for further ideas.

Testing

```bash
# this will give you responses from server-1, server-2, server-3
# (or your developer machine when not running with the traefik loadbalancer )
curl -vs "http://localhost:8000/hostname"
```

```bash
# run this command multiple times - you will stick to a server

# important: to simplify testing, we use a REST example!
# do not use sticky cookies for your REST endpoints (unless you know why)

curl -vs -c "cookies.txt" -b "cookies.txt" "http://localhost:8000/hostname"
```

```javascript
// this is a javascript client
// most of the WebSocket libraries honor cookies out of the box
import WebSocket from "ws";

// check the goa "Bidirectional Streaming Example"

const api_key = "secret";
const ws = new WebSocket("ws://localhost:8000/streaming", {
  // you can even use headers to auth
  // check the goa "Security" example
  headers: {
    Authorization: api_key,
  },
});

ws.on("error", console.error);

ws.on("open", function open() {
  console.log("connected");
  const json = {
    topic: "my topic",
  };
  const payload = JSON.stringify(json);
  ws.send(payload);
});

ws.on("close", function close() {
  console.log("disconnected");
});

ws.on("message", function message(data) {
  console.log("result", data.toString());

  setTimeout(function timeout() {
    const json = {
      topic: "" + Date.now(),
    };
    const payload = JSON.stringify(json);

    ws.send(payload);
  }, 500);
});
```

**Hint**: Use `docker compose logs -f` to validate that it is using always the same server.
