+++
date = "2016-01-30T11:01:06-05:00"
title = "Client"
weight = 9

[menu.main]
name = "Client"
identifier = "implement client"
parent = "implement"
+++

Once the API dsl is used to define types and resources, goagen automatically generates a
native go client, and optionally a javascript client based on the [axios](ihttps://github.com/mzabriskie/axios) 
javascript package. 

## Native Go Client

In order to generate the go client `goagen client -d [design_path]` must be run. It is
generates automatically in the bootstrap command as well. 

The native go client makes a few different things to make consuming the API easier...

#### A Payload struct (if applicable)

If the endpoint you are consuming requires a payload, then it will auto generate a payload
struct that mimics the type that is defined in the design package...

```go
// RateBottlePayload is the bottle rate action payload.
type RateBottlePayload struct {
	Rating int `form:"rating" json:"rating" xml:"rating"`
}
```

#### A Path Generator

The path generator will take any url params that are defined in the definition and return
the proper path that the request is supposed to go to...

```go
// RateBottlePath computes a request path to the rate action of bottle.
func RateBottlePath(accountID int, bottleID int) string {
	param0 := strconv.Itoa(accountID)
	param1 := strconv.Itoa(bottleID)

	return fmt.Sprintf("/cellar/accounts/%s/bottles/%s/actions/rate", param0, param1)
}
```

#### A method that creates the request and executes it

If there is no need to modify the request, then you can simply call the function that was
made with the endpoint name...

```go
// RateBottle makes a request to the rate action endpoint of the bottle resource
func (c *Client) RateBottle(ctx context.Context, path string, payload *RateBottlePayload, contentType string) (*http.Response, error) {
	req, err := c.NewRateBottleRequest(ctx, path, payload, contentType)
	if err != nil {
		return nil, err
	}
	return c.Client.Do(ctx, req)
}
```

#### A method that creates the request and returns it

If there is some need to alter the request in some way before executing it, you can get
the request and then handle executing it later...

```go
// NewRateBottleRequest create the request corresponding to the rate action endpoint of the bottle resource.
func (c *Client) NewRateBottleRequest(ctx context.Context, path string, payload *RateBottlePayload, contentType string) (*http.Request, error) {
	var body bytes.Buffer
	if contentType == "" {
		contentType = "*/*" // Use default encoder
	}
	err := c.Encoder.Encode(payload, &body, contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to encode body: %s", err)
	}
	scheme := c.Scheme
	if scheme == "" {
		scheme = "http"
	}
	u := url.URL{Host: c.Host, Scheme: scheme, Path: path}
	req, err := http.NewRequest("PUT", u.String(), &body)
	if err != nil {
		return nil, err
	}
	header := req.Header
	if contentType == "*/*" {
		header.Set("Content-Type", "application/json")
	} else {
		header.Set("Content-Type", contentType)
	}
	return req, nil
}
```

#### A method which decodes the http response to a goa type

If there is data returned in the form of a `MediaType` then goa will also generate code to
take the http response and convert it back to a native data type...

```go
// DecodeAccount decodes the Account instance encoded in resp body.
func (c *Client) DecodeAccount(resp *http.Response) (*Account, error) {
	var decoded Account
	err := c.Decoder.Decode(&decoded, resp.Body, resp.Header.Get("Content-Type"))
	return &decoded, err
}
```

### Example:

```go
goaClientDoer := goaclient.HTTPClientDoer(http.DefaultClient)
c := client.New(goaClientDoer)
c.Host = "127.0.0.1:8081"

// clientpackage is imported from the goagen generated client package
createAccountPayload := client.CreateAccountPayload{
    Name: "luvs2drink",
}

path := c.CreateAccountPath()

resp, err := c.CreateAccount(ctx.TODO(), path, createAccountPayload, "application/json")
if err != nil {
    return err
}

// continue and do something with the response...
```

Likewise if there was an endpoint that returned a `MediaType` to the caller, the response
could be decided using the generated `MediaType` decoder methods.

```go
// assuming the client object is already instantiated...

path := c.ListBottlePath(accountID)

resp, err := c.ListBottle(ctx.TODO(), path, []int{2006})
if err != nil {
    return err
}

bottleCollection, err := c.DecodeBottleCollection(resp)
if err != nil {
    return err
}

// Do whatever you want with the bottle collection...

for _, bottle := range bottleCollection {
    log.Println(bottle.Name)
}
```

#### Authentication stuff(?)

The generated go client includes signers that will set the proper `Authentication` headers
to the request if needed, all you need to go is provide the client and the signers with
the proper authentication credentials and it will take care of the rest based on the
design of the API...

```go
goaClientDoer := goaclient.HTTPClientDoer(http.DefaultClient)
c := client.New(goaClientDoer)
c.Host = "127.0.0.1:8081"

c.SetSigninBasicAuthSigner(&goaclient.BasicSigner{
    Password: "drunkPasswordlsdjalsfj",
    Username: "luvs2drink",
})

// or if you had used JWT authentication instead of BasicAuth...

staticToken := &goaclient.StaticToken{
    Type:  "Bearer",
    Value: "sldkjdfsjdfljsdfl.slkdfjdsljflsdjfljdfjsdlfj.sdljasldklsajdsalkdj",
    // your JWT should look something like this...
}

tokenSource := &goaclient.StaticTokenSource{
    StaticToken: staticToken,
}

c.SetJWTSigner(&goaclient.JWTSigner{
    TokenSource: tokenSource,
})

resp, err := c.SomeAuthProtectedEndpoitn(ctx.TODO(), path)
if err != nil {
    return err
}

// should be a successful status code :)
log.Println(resp.StatusCode)
```

## Axios Javascript Client

In order to generate the javascript client `goagen js -d [design_path]` must be run. The
javascript client is not automatically generated in the `bootstrap`command.
 

