+++
date = "2017-07-20T11:01:06-05:00"
title = "Client"
weight = 9

[menu.main]
name = "Client"
identifier = "implement client"
parent = "implement"
+++

`goagen` can generate a Go client package from an API design. The client package makes it
possible to make requests programmatically to the service implemented using the same design.
`goagen` also generates a client command line tool which uses the generated package to 
make the requests. Finally, `goagen` can also generate a JavaScript client library based 
on the [axios JavaScript library](https://github.com/mzabriskie/axios).

## Native Go Client

In order to generate the Go client, `Goagen client -d [design_path]` must be run. It is
generated automatically during the bootstrap command as well. 

The native Go client makes a few different things to make consuming the API easier...

#### A Payload struct (if applicable)

The generated code contains a payload struct for each endpoint that requires a payload.
The struct follows the definition provided in the API design.

```Go
// RateBottlePayload is the bottle rate action payload.
type RateBottlePayload struct {
	Rating int `form:"rating" json:"rating" xml:"rating"`
}
```

#### A Path Generator

The path generator builds the request path from the URL parameters defined in the design.

```Go
// RateBottlePath computes a request path to the rate action of bottle.
func RateBottlePath(accountID int, bottleID int) string {
	param0 := strconv.Itoa(accountID)
	param1 := strconv.Itoa(bottleID)

	return fmt.Sprintf("/cellar/accounts/%s/bottles/%s/actions/rate", param0, param1)
}
```

#### A method that creates the request and executes it

If there is no need to modify the request, then the function that was made with the
endpoint name can be called directly...

```Go
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

If there is a need to alter the request in some way before executing it, the
`New[name]Request` function can be used to get the request and then it can be executed at
a later time.

```Go
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

#### A method which decodes the http response to a Goa type

If there is data returned in the form of a `MediaType` then Goa will also generate code to
take the http response and convert it back to a native data type...

```Go
// DecodeAccount decodes the Account instance encoded in resp body.
func (c *Client) DecodeAccount(resp *http.Response) (*Account, error) {
	var decoded Account
	err := c.Decoder.Decode(&decoded, resp.Body, resp.Header.Get("Content-Type"))
	return &decoded, err
}
```

### Putting it all together:

```Go
GoaClientDoer := Goaclient.HTTPClientDoer(http.DefaultClient)
c := client.New(GoaClientDoer)
c.Host = "127.0.0.1:8081"

// clientpackage is imported from the Goagen generated client package
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

```Go
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

#### Security

The generated Go client includes signers that will set the proper `Authentication` headers
to the request if needed, all that needs to be done is provide the client and the signers with
the proper authentication credentials and the client will take care of the rest based on the
design of the API...

```Go
GoaClientDoer := Goaclient.HTTPClientDoer(http.DefaultClient)
c := client.New(GoaClientDoer)
c.Host = "127.0.0.1:8081"

c.SetSigninBasicAuthSigner(&Goaclient.BasicSigner{
    Password: "drunkPasswordlsdjalsfj",
    Username: "luvs2drink",
})

// or if you had used JWT authentication instead of BasicAuth...

staticToken := &Goaclient.StaticToken{
    Type:  "Bearer",
    Value: "sldkjdfsjdfljsdfl.slkdfjDSLjflsdjfljdfjsdlfj.sdljasldklsajdsalkdj",
    // your JWT should look something like this...
}

tokenSource := &Goaclient.StaticTokenSource{
    StaticToken: staticToken,
}

c.SetJWTSigner(&Goaclient.JWTSigner{
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

In order to generate the Javascript client `Goagen js -d [design_path]` must be run. The
Javascript client is not automatically generated in the `bootstrap`command.
 

