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

DEPEND=\
	github.com/raphael/hugo \
	github.com/davecheney/godoc2md \
	github.com/goadesign/gorma

all: depend install docs serve

depend:
	@go get $(DEPEND)

install:
	@cd tools/mdc && go get ./... && go install

docs:
	@mdc --exclude public         github.com/goadesign/goa   content/reference
	@mdc --exclude public,example github.com/goadesign/gorma content/reference

linkcheck:
	@cd tools/linkcheck && go install
	@(hugo serve >/dev/null &); sleep 2 && linkcheck -root http://localhost:1313 && echo No broken links!

serve:
	@hugo serve --watch

deploy:
	dpl --provider=gcs --access-key-id=$(GCS_ACCESS_KEY) --secret-access-key=$(GCS_SECRET_KEY) --bucket=goa.design --local-dir=public --cache-control=300 --acl=public-read --skip-cleanup=true

