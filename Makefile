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
	github.com/spf13/hugo \
	github.com/davecheney/godoc2md

all: depend install docs serve

depend:
	@go get $(DEPEND)

install:
	@cd tools/mdc && go get ./... && go install

docs:
	@mdc github.com/goadesign/goa   content/reference --exclude public
	@mdc github.com/goadesign/gorma content/reference --exclude public --exclude example

serve:
	@hugo serve --watch

deploy:
	dpl --provider=gcs --access-key-id=$(GCS_ACCESS_KEY) --secret-access-key=$(GCS_SECRET_KEY) --bucket=goa.design --local-dir=public --cache-control=300 --acl=public-read --skip-cleanup=true

