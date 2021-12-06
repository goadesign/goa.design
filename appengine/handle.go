package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"

	"google.golang.org/appengine/v2"
)

// allowMethods is a comman-separated list of allowed HTTP methods,
// suitable for Allow or CORS allow-methods header.
var allowMethods = "GET, HEAD, OPTIONS"

// ServeObject writes object o to w, with optional body and CORS headers,
// based on the in-flight request r.
func (s *Storage) ServeObject(w http.ResponseWriter, r *http.Request, o *Object) error {
	// headers
	h := w.Header()
	for k, v := range o.Meta {
		h.Set(k, v)
	}
	h.Set("allow", allowMethods)
	if o := corsMatch(&s.CORS, r.Header.Get("origin")); o != "" {
		h.Set("access-control-allow-origin", o)
		if r.Method == "OPTIONS" {
			h.Set("access-control-allow-methods", allowMethods)
			h.Set("access-control-allow-headers", r.Header.Get("access-control-request-headers"))
			h.Set("access-control-expose-headers", "Location, Etag, Content-Disposition")
			if s.CORS.MaxAge != "" {
				h.Set("access-control-max-age", s.CORS.MaxAge)
			}
		}
	}

	// redirect
	if v := o.Redirect(); v != "" && r.Method != "OPTIONS" {
		h.Set("location", v)
		w.WriteHeader(o.RedirectCode())
		return nil
	}

	// body
	if r.Method == "GET" {
		_, err := io.Copy(w, o.Body)
		return err
	}

	return nil
}

// HandleChangeHook handles Object Change Notifications as described at
// https://cloud.google.com/storage/docs/object-change-notification.
// It removes objects from cache.
func (s *Storage) HandleChangeHook(w http.ResponseWriter, r *http.Request) {
	// skip sync requests
	if v := r.Header.Get("x-goog-resource-state"); v == "sync" {
		return
	}

	// this is not a client request, so don't use newContext.
	ctx := appengine.NewContext(r)
	// we only care about name and the bucket
	body := struct{ Name, Bucket string }{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("[ERROR] json.Decode: %v", err.Error())
		return
	}
	if err := s.PurgeCache(ctx, body.Bucket, body.Name); err != nil {
		log.Printf("[ERROR] s.PurgeCache(%q, %q): %v", body.Bucket, body.Name, err)
		w.WriteHeader(http.StatusInternalServerError) // let GCS retry
	}
}

// ValidMethod reports whether m is a supported HTTP method.
func ValidMethod(m string) bool {
	return strings.Index(allowMethods, m) >= 0
}

func corsMatch(cors *CORS, o string) string {
	if len(cors.Origin) == 0 {
		return ""
	}
	if cors.Origin[0] == "*" {
		return "*"
	}
	if cors.Origin[0] == o {
		return o
	}
	i := sort.SearchStrings(cors.Origin, o)
	if i < len(cors.Origin) && cors.Origin[i] == o {
		return o
	}
	return ""
}
