// Copyright 2015 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package server

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/net/context"

	"html/template"

	weasel "github.com/goadesign/goa.design/appengine"
	"google.golang.org/appengine"
	"google.golang.org/appengine/log"
)

// storage is used by the weasel server to serve GCS objects.
var storage *weasel.Storage

func init() {
	if err := readConfig(); err != nil {
		panic(err)
	}
	storage = &weasel.Storage{Base: config.GCSBase, Index: config.Index}
	for path, redir := range config.AbsoluteRedirects {
		http.Handle(path, redirectHandler(redir, http.StatusMovedPermanently, true))
	}
	for host, redir := range config.Redirects {
		http.Handle(host, redirectHandler(redir, http.StatusMovedPermanently, false))
	}
	http.HandleFunc(config.ImportRoot, servePackage)
	http.HandleFunc(config.PluginsImportRoot, servePackage)
	http.HandleFunc(config.WebRoot, serveObject)
	http.HandleFunc(config.HookPath, storage.HandleChangeHook)
	http.HandleFunc("/_ah/warmup", handleWarmup)
}

func handleWarmup(w http.ResponseWriter, r *http.Request) {
	// nothing to do here
}

var (
	// importTmp is the template used to render the go-import meta tag response.
	importTmpl = template.Must(template.New("import").Parse(importT))

	// pluginsImportTmp is the template used to render the go-import meta tag response for
	// goa plugin packages.
	pluginsImportTmpl = template.Must(template.New("pluginsImport").Parse(pluginsImportT))

	// versionRegexp captures the version from the URL
	versionRegexp = regexp.MustCompile(`goa\.(v[1-9]+[0-9]*)(?:$|/)`)
)

func servePackage(w http.ResponseWriter, r *http.Request) {
	if strings.Contains(r.URL.Path, "/plugins") {
		if err := pluginsImportTmpl.Execute(w, nil); err != nil {
			panic(err.Error())
		}
		return
	}
	branch := "v2" // default to v2
	if matches := versionRegexp.FindAllStringSubmatch(r.URL.Path, 1); len(matches) == 1 {
		branch = matches[0][1]
	}
	if err := importTmpl.Execute(w, branch); err != nil {
		panic(err.Error())
	}
}

// serveObject responds with a GCS object contents, preserving its original headers
// listed in objectHeaders.
// The bucket is identifed by matching r.Host against config.Buckets map keys.
// Default bucket is used if no match is found.
//
// Only GET, HEAD and OPTIONS methods are allowed.
func serveObject(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, config.ImportRoot) {
		servePackage(w, r)
		return
	}
	if !weasel.ValidMethod(r.Method) {
		http.Error(w, "", http.StatusMethodNotAllowed)
		return
	}
	if _, force := config.tlsOnly[r.Host]; force && r.TLS == nil {
		u := "https://" + r.Host + r.URL.Path
		if r.URL.RawQuery != "" {
			u += "?" + r.URL.RawQuery
		}
		http.Redirect(w, r, u, http.StatusMovedPermanently)
		return
	}

	ctx := newContext(r)
	bucket := bucketForHost(r.Host)
	oname := r.URL.Path[1:]

	o, err := storage.OpenFile(ctx, bucket, oname)
	if err != nil {
		code := http.StatusInternalServerError
		if errf, ok := err.(*weasel.FetchError); ok {
			code = errf.Code
		}
		if code == http.StatusNotFound {
			o, err = storage.OpenFile(ctx, bucket, config.NotFound)
			if err == nil {
				goto serve
			}
		}
		serveError(w, code, "")
		if code != http.StatusNotFound {
			log.Errorf(ctx, "%s/%s: %v", bucket, oname, err)
		}
		return
	}
serve:
	if err := storage.ServeObject(w, r, o); err != nil {
		log.Errorf(ctx, "%s/%s: %v", bucket, oname, err)
	}
	o.Body.Close()
}

// redirectHandler creates a new handler which redirects all requests
// to the specified url, preserving original path and raw query.
func redirectHandler(url string, code int, abs bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := url
		if !abs {
			u += r.URL.Path
			if r.URL.RawQuery != "" {
				u += "?" + r.URL.RawQuery
			}
		}
		http.Redirect(w, r, u, code)
	})
}

func serveError(w http.ResponseWriter, code int, msg string) {
	if msg == "" {
		msg = http.StatusText(code)
	}
	w.WriteHeader(code)
	// TODO: render some template
	w.Write([]byte(msg))
}

// bucketForHost returns a bucket name mapped to the host.
// Default bucket name is return if no match found.
func bucketForHost(host string) string {
	if b, ok := config.Buckets[host]; ok {
		return b
	}
	return config.Buckets["default"]
}

// newContext creates a new context from a client in-flight request.
// It should not be used for server-to-server, such as web hooks.
func newContext(r *http.Request) context.Context {
	c := appengine.NewContext(r)
	c, _ = context.WithTimeout(c, 10*time.Second)
	return c
}

const importT = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en-us">
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8">

  <!-- Go Imports -->
  <meta name="go-import" content="goa.design/goa git https://gopkg.in/goadesign/goa.v2">
  <meta name="go-source" content="goa.design/goa _ https://github.com/goadesign/goa/tree/v2/{/dir} https://github.com/goadesign/goa/blob/v2{/dir}/{file}#L{line}">
  <meta http-equiv="refresh" content="0; https://goa.design">

</head>
<body>
</body>
</html>
`

const pluginsImportT = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en-us">
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8">

  <!-- Go Imports -->
  <meta name="go-import" content="goa.design/plugins git https://github.com/goadesign/plugins">
  <meta name="go-source" content="goa.design/plugins _ https://github.com/goadesign/plugins/tree/master/{/dir} https://github.com/goadesign/plugins/blob/master{/dir}/{file}#L{line}">
  <meta http-equiv="refresh" content="0; https://goa.design">

</head>
<body>
</body>
</html>
`
