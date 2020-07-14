package main

import (
	"bytes"
	"context"
	"log"
	"net/http"
	"text/template"
	"time"

	"google.golang.org/appengine"
)

var goaImportT = template.Must(template.New("goaImport").Parse(goaImport))
var packageImportT = template.Must(template.New("packageImport").Parse(packageImport))

func main() {
	http.HandleFunc("/goa", serveGoa("v2"))
	http.HandleFunc("/goa/v3", serveGoa("v3"))
	http.HandleFunc("/plugins/", servePackage("plugins"))
	http.HandleFunc("/examples/", servePackage("examples"))
	http.HandleFunc("/structurizr", servePackage("structurizr"))
	http.HandleFunc("/", serveAsset(DefaultStorage))
	appengine.Main()
}

func serveGoa(v string) func(http.ResponseWriter, *http.Request) {
	var buf bytes.Buffer
	{
		p := ""
		if v != "v2" {
			p = "/" + v
		}
		data := map[string]string{"version": v, "prefix": p}
		if err := goaImportT.Execute(&buf, data); err != nil {
			panic(err.Error())
		}
	}
	return func(w http.ResponseWriter, r *http.Request) {
		w.Write(buf.Bytes())
	}
}

func servePackage(pkg string) func(w http.ResponseWriter, _ *http.Request) {
	var buf bytes.Buffer
	{
		data := map[string]string{"pkg": pkg}
		if err := packageImportT.Execute(&buf, data); err != nil {
			panic(err.Error())
		}
	}
	return func(w http.ResponseWriter, r *http.Request) {
		w.Write(buf.Bytes())
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
  <meta name="go-source" content="goa.design/goa{{ .prefix }} _ https://github.com/goadesign/goa/tree/{{ .version }}/{/dir} https://github.com/goadesign/goa/blob/{{ .version }}{/dir}/{file}#L{line}">
  <meta http-equiv="refresh" content="0; https://goa.design">
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
  <meta name="go-source" content="goa.design/{{ .pkg }} _ https://github.com/goadesign/{{ .pkg }}/tree/master/{/dir} https://github.com/goadesign/{{ .pkg }}/blob/master{/dir}/{file}#L{line}">
  <meta http-equiv="refresh" content="0; https://goa.design">
</head>
<body>
</body>
</html>
`
