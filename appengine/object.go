package main

import (
	"bytes"
	"context"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"google.golang.org/appengine/v2/memcache"
)

const (
	// object custom metadata
	metaRedirect     = "x-goog-meta-redirect"
	metaRedirectCode = "x-goog-meta-redirect-code"

	// memcache settings
	cacheItemMax    = 1 << 20 // max size per item, in bytes
	cacheItemExpiry = 24 * time.Hour
)

// objectHeaders is a slice of headers propagated from a GCS object.
var objectHeaders = []string{
	"cache-control",
	"content-disposition",
	"content-type",
	"etag",
	"last-modified",
	metaRedirect,
	metaRedirectCode,
}

// Object represents a single GCS object.
type Object struct {
	Meta map[string]string
	Body io.ReadCloser
}

// Redirect returns o's redirect URL, zero string otherwise.
func (o *Object) Redirect() string {
	return o.Meta[metaRedirect]
}

// RedirectCode returns o's HTTP response code for redirect.
// It defaults to http.StatusMovedPermanently.
func (o *Object) RedirectCode() int {
	c, err := strconv.Atoi(o.Meta[metaRedirectCode])
	if err != nil {
		c = http.StatusMovedPermanently
	}
	return c
}

// objectBuf implements io.ReadCloser for Object.Body.
// It stores all r.Read results in its buf and caches exported fields
// in memcache when Read returns io.EOF.
type objectBuf struct {
	Meta map[string]string
	Body []byte // set after rc returns io.EOF

	r   io.Reader
	buf bytes.Buffer
	key string          // cache key
	ctx context.Context // memcache context
}

func (b *objectBuf) Read(p []byte) (int, error) {
	n, err := b.r.Read(p)
	if n > 0 && b.buf.Len() < cacheItemMax {
		b.buf.Write(p[:n])
	}
	if err == io.EOF && b.buf.Len() < cacheItemMax {
		b.Body = b.buf.Bytes()
		item := memcache.Item{
			Key:        b.key,
			Object:     b,
			Expiration: cacheItemExpiry,
		}
		if err := memcache.Gob.Set(b.ctx, &item); err != nil {
			log.Printf("[ERROR] memcache.Gob.Set(%q): %v", b.key, err)
		}
	}
	return n, err
}

func (b *objectBuf) Close() error {
	if c, ok := b.r.(io.Closer); ok {
		return c.Close()
	}
	return nil
}
