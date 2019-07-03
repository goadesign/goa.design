#!/usr/bin/make
#
# Makefile for goa.design
#
# Targets:
# - "depend" retrieves the Go packages needed to build and run the static site
# - "install" builds and install the tools used to generate the static content
# - "docs" builds the reference docs served by the site
# - "serve" starts the HTTP server that serves the site
# - "all" default target that runs all the above in order

all: depend install docs serve

depend:
	export GO111MODULE=on && go get github.com/gohugoio/hugo
	export GO111MODULE=off && go get github.com/goadesign/gorma

install:
	@cd tools/mdc && go get ./... && go install
	@cd tools/godoc2md && export GO111MODULE=on && go get ./... && go install

docs:
	@mdc --exclude public --branch v1 github.com/goadesign/goa content/v1/reference
	@mdc --exclude public,example github.com/goadesign/gorma content/v1/reference

linkcheck:
	@cd tools/linkcheck && go install
	@(hugo serve >/dev/null &); sleep 2 && linkcheck -root http://localhost:1313 && echo No broken links!

serve:
	@hugo serve --watch

deploy:
	dpl --provider=gcs --access-key-id=$(GCS_ACCESS_KEY) --secret-access-key=$(GCS_SECRET_KEY) --bucket=goa.design --local-dir=public --cache-control=300 --acl=public-read --skip-cleanup=true

