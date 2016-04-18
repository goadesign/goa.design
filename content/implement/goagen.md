+++
date = "2016-01-30T11:01:06-05:00"
title = "goagen, the goa Tool"
+++

`goagen` is a tool that generates various artifacts from a goa design package.

Install it with:

```bash
go get github.com/goadesign/goa/goagen
```

Each type of artifact is associated with a `goagen` command that exposes it own set of flags.
Internally these commands map to "generators" that contain the logic for generating the artifacts.
It works something like this:

1. goagen parses the command line to determine the type of output desired and invokes the appropriate generator.
2. The generator writes the code of the tool that will produce the final output to a temporary directory.
3. The tool composed of the design language package and the output producing code is compiled in the temporary directory.
4. `goagen` runs the tool which evaluates the design functions and traverses the resulting in-memory data
structures to write the output.

Each generator registers a command with the `goagen` tool, `goagen --help` lists all the available
commands. These are:

* [`app`](#gen_app): generates the service boilerplate code including controllers, contexts, media types and user types.
* [`main`](#gen_main): generates a skeleton file for each resource controller as well as a default `main`.
* [`test`](#gen_test): generates the API test helpers
* [`client`](#gen_client): generates an API client Go package and tool.
* [`js`](#gen_js): generates a JavaScript API client.
* [`swagger`](#gen_swagger): generates the API Swagger specification.
* [`schema`](#gen_schema): generates the API Hyper-schema JSON.
* [`gen`](#gen_gen): invokes a third party generator.
* `bootstrap`: invokes the `app`, `main`, `test`, `client` and `swagger` generators.

The command `goagen --help-long` lists all the supported commands and their flags.

## Common flags

The following flags apply to all the `goagen` commands:

* `--design|-d=DESIGN` defines the Go package path to the service design package.
* `--out|-o=OUT` specifies where to generate the files, defaults to the current directory.
* `--debug` enables `goagen` debug. This causes `goagen` to print the content of the temporary
files and to leave them around.
* `--help|--help-long|--help-man` prints contextual help.

## <a name="gen_app"></a> Contexts and Controllers: `goagen app`

The `app` command is arguably the most critical. It generates all the supporting code for the
goa service. This command supports an additional flag:

* `--pkg=app` specifies the name of the generated Go package, defaults to `app`. That's also the
name of the subdirectory that gets created to store the generated Go files.

This command always deletes and re-creates any pre-existing directory with the same name. The idea
being that these files should never be edited.

## <a name="gen_main"></a> Scaffolding: `goagen main`

The `main` command helps bootstrap a new goa service by generating a default `main.go` as
well as a default (empty) implementation for each resource controller defined in the design package. By default
this command only generates the files if they don't exist yet in the output directory. This
command accepts two additional flags:

* `--force` causes the files to be generated even if files with the same name already exist (in
        which case they get overwritten).
* `name=API` specifies the name of the service to be used in the generated call to `goa.New`.

## <a name="gen_test"></a> Testing: `goagen test`

The `test` command generates test helpers for all the defined combinations of `Resource`, `Action`, `Response`,
`Route` and `View` in the `API`. The test helpers will have the same `Params`, `Payload` and `MediaType` objects
as defined by your `API`.

```go
// ShowVersionOK test setup
func ShowVersionOK(t *testing.T, ctrl app.VersionController) *app.Version {
	return ShowVersionOKCtx(t, context.Background(), ctrl)
}

// ShowVersionOKCtx test setup
func ShowVersionOKCtx(t *testing.T, ctx context.Context, ctrl app.VersionController) *app.Version {
	var logBuf bytes.Buffer
	var resp interface{}
	respSetter := func(r interface{}) { resp = r }
	service := goatest.Service(&logBuf, respSetter)
	rw := httptest.NewRecorder()
	req, err := http.NewRequest("GET", fmt.Sprintf("/api/version"), nil)
	if err != nil {
		panic("invalid test " + err.Error()) // bug
	}
	goaCtx := goa.NewContext(goa.WithAction(ctx, "VersionTest"), rw, req, nil)
	showCtx, err := app.NewShowVersionContext(goaCtx, service)
	if err != nil {
		panic("invalid test data " + err.Error()) // bug
	}
	err = ctrl.Show(showCtx)
	if err != nil {
		t.Fatalf("controller returned %s, logs:\n%s", err, logBuf.String())
	}

	a, ok := resp.(*app.Version)
	if !ok {
		t.Errorf("invalid response media: got %+v, expected instance of app.Version", resp)
	}

	if rw.Code != 200 {
		t.Errorf("invalid response status code: got %+v, expected 200", rw.Code)
	}

	err = a.Validate()
	if err != nil {
		t.Errorf("invalid response payload: got %v", err)
	}
	return a
}
```
The test helpers have validation like `Type`, `Status`, `Payload.Validate()`
and `MediaType.Validate()` out of the box.

These test helpers only depend on `testing.T` so they can be used together with
your favorite testing framework.

```go
func TestShowVersionOK(t *testing.T) {
	controller := VersionController{}
	resp := test.ShowVersionOK(t, &controller)

	if resp.Commit == "" {
		t.Error("Commit not found")
	}
}
```

## <a name="gen_client"></a> Client Package and Tool: `goagen client`

The `client` command generates both an API client package and tool. The client package implements a `Client`
object that exposes one method for each resource action. The generated code of the CLI tool leverages the package to
make the API requests to the service.

The `Client` object can be configured to use request signers that get invoked prior to sending the
request. The signers modify the request to include auth headers for example. goa comes with signers that implement
[basic auth](https://godoc.org/github.com/goadesign/goa#BasicSigner),
[JWT auth](https://godoc.org/github.com/goadesign/goa#JWTSigner) and a subset of
[OAuth2](https://godoc.org/github.com/goadesign/goa#OAuth2Signer). Custom signers may be used as well, they must
implement the [Signer](https://godoc.org/github.com/goadesign/goa#Signer) interface.
This command accepts three additional flags:

* `--version` specifies the CLI tool version.
* `--signer` specifies a signer object supported by the API. Signer objects generally perform auth.
* `--signerPkg` specifies the path to the package implementing the signer objects if not goa.

## <a name="gen_js"></a> JavaScript: `goagen js`

The `js` command generates a JavaScript API client suitable for both client-side and server-side
applications. The generated code defines an anonymous AMD module and relies on the
[axios](https://github.com/mzabriskie/axios) promise-based JavaScript library for making the actual
HTTP requests.

The generated module wraps the `axios` client and adds API specific functions, for example:

```javascript
// List all bottles in account optionally filtering by year
// path is the request path, the format is "/cellar/accounts/:accountID/bottles"
// years is used to build the request query string.
// config is an optional object to be merged into the config built by the function prior to making the request.
// The content of the config object is described here: https://github.com/mzabriskie/axios#request-api
// This function returns a promise which raises an error if the HTTP response is a 4xx or 5xx.
client.listBottle = function (path, years, config) {
        cfg = {
                timeout: timeout,
                url: urlPrefix + path,
                method: 'get',
                params: {
                        years: years
                },
                responseType: 'json'
        };
        if (config) {
                cfg = utils.merge(cfg, config);
        }
        return client(cfg);
}
```

The generated client module can be loaded using `requirejs`:

```javascript
requirejs.config({
        paths: {
                axios: '/js/axios.min',
                client: '/js/client'
        }
});
requirejs(['client'], function (client) {
        client().listBottle ("/cellar/accounts/440/bottles", 317)
                .then(function (resp) {
                        // All good, use resp
                })
                .catch(function (resp) {
                        // Woops, request failed or returned 4xx or 5xx.
                });
});
```

The code above assumes that the generated files `client.js` and `axios.min.js` are both
served from `/js`. The `resp` value returned to the promise is an object with the following
fields:

```javascript
{
        // `data` is the response that was provided by the server
        data: {},

        // `status` is the HTTP status code from the server response
        status: 200,

        // `statusText` is the HTTP status message from the server response
        statusText: 'OK',

        // `headers` is the headers that the server responded with
        headers: {},

        // `config` is the config that was provided to `axios` for the request
        config: {}
}
```

The generator also produces an example HTML and controller that can be mounted on a
goa service to quickly test the JavaScript. Simply import the `js` Go
package in your service main and mount the controller. The example HTML is served
under `/js` so that loading this path in a browser will trigger the generated
JavaScript.

## <a name="gen_swagger"></a> Swagger: `goagen swagger`

The `swagger` command generates a [Swagger](http://swagger.io) specification of the API. The command
does not accept additional flags. It generates both the Swagger JSON as well as a controller that
can be mounted on the goa service to serve it under `/swagger.json`.

## <a name="gen_schema"></a> JSON Schema: `goagen schema`

The `schema` command generates a
[Heroku-like](https://blog.heroku.com/archives/2014/1/8/json_schema_for_heroku_platform_api) JSON
hyper-schema representation of the API. It generates both the JSON as well as a controller that can
be mounted on the goa service to serve it under `/schema.json`. The command accepts an additional
flag:

* `--url|-u=URL` specifies the base URL used to build the JSON schema ID.

## <a name="gen_gen"></a> Plugins: `goagen gen`

The `gen` command makes it possible to invoke `goagen` plugins.
This command accepts two flags:

* `--pkg-path=PKG-PATH` specifies the Go package path to the plugin package.
* `--pkg-name=PKG-NAME` specifies the Go package name of the plugin package. It defaults to the
name of the inner most directory in the Go package path.

Refer to the [Generator Plugins](../extend/generators.html) section for details on goa plugins.
