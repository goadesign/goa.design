package main

import (
	"context"
	"log"
	"net/http"
	"text/template"
	"time"

	"google.golang.org/appengine"
)

func main() {
	http.HandleFunc("/plugins/", servePackage("plugins"))
	http.HandleFunc("/examples/", servePackage("examples"))
	http.HandleFunc("/structurizr", servePackage("structurizr"))
	http.HandleFunc("/", serveAsset(DefaultStorage))
	appengine.Main()

	// mux := http.DefaultServeMux
	// mux.HandleFunc("/goa", serveGoa)
	// mux.HandleFunc("/plugins/", servePackage("plugins"))
	// mux.HandleFunc("/examples/", servePackage("examples"))
	// mux.HandleFunc("/structurizr", servePackage("structurizr"))
	// mux.HandleFunc("/", serveAsset(DefaultStorage))

	// port := os.Getenv("PORT")
	// if port == "" {
	// 	port = "8080"
	// 	log.Printf("Defaulting to port %s", port)
	// }

	// log.Printf("Listening on port %s", port)
	// if err := http.ListenAndServe(":"+port, mux); err != nil {
	// 	log.Fatal(err)
	// }
}

func serveGoa(w http.ResponseWriter, _ *http.Request) {
	w.Write([]byte(goaImport))
}

var t = template.Must(template.New("packageImport").Parse(packageImport))

func servePackage(pkg string) func(w http.ResponseWriter, _ *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := t.Execute(w, map[string]string{"pkg": pkg}); err != nil {
			panic(err.Error())
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
  <meta name="go-import" content="goa.design/goa git https://gopkg.in/goadesign/goa.v2">
  <meta name="go-source" content="goa.design/goa _ https://github.com/goadesign/goa/tree/v2/{/dir} https://github.com/goadesign/goa/blob/v2{/dir}/{file}#L{line}">
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
