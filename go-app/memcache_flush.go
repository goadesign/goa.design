package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"google.golang.org/appengine/v2"
	"google.golang.org/appengine/v2/memcache"
)

const memcacheDeployFlushHeader = "X-Goa-Memcache-Flushed"

var deployMemcacheFlushState struct {
	mu   sync.Mutex
	done bool
}

func withDeployMemcacheFlush(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := appengine.NewContext(r)
		flushed, err := flushMemcacheOnDeploy(ctx)
		if err != nil {
			log.Printf("[ERROR] memcache deploy flush: %v", err)
		}
		if flushed {
			w.Header().Set(memcacheDeployFlushHeader, "1")
		}
		next(w, r)
	}
}

func flushMemcacheOnDeploy(ctx context.Context) (bool, error) {
	if !shouldFlushMemcacheOnDeploy() {
		markDeployMemcacheFlushDone()
		return false, nil
	}
	if isDeployMemcacheFlushDone() {
		return false, nil
	}

	ver := strings.TrimSpace(appengine.VersionID(ctx))
	if ver == "" {
		return false, fmt.Errorf("version ID not set")
	}

	if err := memcache.Flush(ctx); err != nil {
		return false, fmt.Errorf("flush memcache: %w", err)
	}

	markDeployMemcacheFlushDone()
	log.Printf("[INFO] memcache flushed for version %q", ver)
	return true, nil
}

func shouldFlushMemcacheOnDeploy() bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("FLUSH_MEMCACHE_ON_DEPLOY"))) {
	case "1", "true", "yes", "on":
		return true
	case "", "0", "false", "no", "off":
		return false
	default:
		return false
	}
}

func isDeployMemcacheFlushDone() bool {
	deployMemcacheFlushState.mu.Lock()
	defer deployMemcacheFlushState.mu.Unlock()
	return deployMemcacheFlushState.done
}

func markDeployMemcacheFlushDone() {
	deployMemcacheFlushState.mu.Lock()
	deployMemcacheFlushState.done = true
	deployMemcacheFlushState.mu.Unlock()
}
