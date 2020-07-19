package main

import (
	"context"
	"log"
	"net/http"
	"strings"
	"text/template"
	"time"

	"google.golang.org/appengine"
)

var goaImportT = template.Must(template.New("goaImport").Parse(goaImport))
var packageImportT = template.Must(template.New("packageImport").Parse(packageImport))

func main() {
	http.HandleFunc("/", serveAsset(DefaultStorage))
	http.HandleFunc("/goa", serveGoa("v2"))
	http.HandleFunc("/goa/", serveGoa("v2"))
	http.HandleFunc("/goa/v3", serveGoa("v3"))
	http.HandleFunc("/goa/v3/", serveGoa("v3"))
	http.HandleFunc("/plugins/", servePackage("plugins"))
	http.HandleFunc("/examples/", servePackage("examples"))
	http.HandleFunc("/structurizr", servePackage("structurizr"))
	http.HandleFunc("/structurizr/", servePackage("structurizr"))
	appengine.Main()
}

func serveGoa(v string) func(http.ResponseWriter, *http.Request) {
	p := ""
	if v != "v2" {
		p = "/" + v
	}
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "goa.design/goa"+p)
		w.Header().Set("Cache-Control", "public, max-age=86400")
		if err := goaImportT.Execute(w, struct {
			version string
			prefix  string
			path    string
		}{
			version: v,
			prefix:  p,
			path:    path,
		}); err != nil {
			http.Error(w, "cannot render the page", http.StatusInternalServerError)
		}
	}
}

func servePackage(pkg string) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "goa.design/"+pkg)
		w.Header().Set("Cache-Control", "public, max-age=86400")
		if err := goaImportT.Execute(w, struct {
			pkg  string
			path string
		}{
			pkg:  pkg,
			path: path,
		}); err != nil {
			http.Error(w, "cannot render the page", http.StatusInternalServerError)
		}
	}
}

func serveAsset(s *Storage) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(appengine.NewContext(r), 10*time.Second)
		defer cancel()
		oname := r.URL.Path[1:]
		o, err := s.OpenFile(ctx, "goa.design", oname)
		if err != nil {
			code := http.StatusInternalServerError
			if errf, ok := err.(*FetchError); ok {
				code = errf.Code
			}
			w.WriteHeader(code)
			if code != http.StatusNotFound {
				log.Printf("[ERROR] %s/%s: %v", "goa.design", oname, err)
			}
			return
		}
		if err := s.ServeObject(w, r, o); err != nil {
			log.Printf("[ERROR] %s/%s: %v", "goa.design", oname, err)
		}
		o.Body.Close()
	}
}

const goaImport = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en-us">
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8">
  <!-- Go Imports -->
  <meta name="go-import" content="goa.design/goa{{ .prefix }} git https://gopkg.in/goadesign/goa.{{ .version }}">
  <meta name="go-source" content="goa.design/goa{{ .prefix }} https://github.com/goadesign/goa https://github.com/goadesign/goa/tree/{{ .version }}/{/dir} https://github.com/goadesign/goa/blob/{{ .version }}{/dir}/{file}#L{line}">
  <meta http-equiv="refresh" content="0; url=https://pkg.go.dev/goa.design/goa/{{ .path }}">
</head>
<body>
</body>
</html>
`

const packageImport = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en-us">
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8">
  <!-- Go Imports -->
  <meta name="go-import" content="goa.design/{{ .pkg }} git https://github.com/goadesign/{{ .pkg }}">
  <meta name="go-source" content="goa.design/{{ .pkg }} https://github.com/goadesign/{{ .pkg }} https://github.com/goadesign/{{ .pkg }}/tree/master/{/dir} https://github.com/goadesign/{{ .pkg }}/blob/master{/dir}/{file}#L{line}">
  <meta http-equiv="refresh" content="0; url=https://pkg.go.dev/goa.design/{{ .pkg }}/{{ .path }}">
</head>
<body>
</body>
</html>
`
