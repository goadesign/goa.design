package main

import (
	"bytes"
	"testing"
)

func TestGoaTemplate(t *testing.T) {
	const (
		v    = "v1.0.0"
		p    = "prefix"
		path = "path"
	)
	var b bytes.Buffer
	if err := goaImportT.Execute(&b, struct {
		Version string
		Prefix  string
		Path    string
	}{
		Version: v,
		Prefix:  p,
		Path:    path,
	}); err != nil {
		t.Fatalf("failed to run template: %s", err)
	}
}

func TestPackageTemplate(t *testing.T) {
	const (
		pkg  = "pkg"
		path = "path"
	)
	var b bytes.Buffer
	if err := packageImportT.Execute(&b, struct {
		Pkg  string
		Path string
	}{
		Pkg:  pkg,
		Path: path,
	}); err != nil {
		t.Fatalf("failed to run template: %s", err)
	}
}
