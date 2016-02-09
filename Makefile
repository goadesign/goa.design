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
	github.com/spf13/hugo

all: depend install docs serve

depend:
	@go get $(DEPEND)

install:
	@cd tools/godoc2md && go get ./... && go install
	@cd tools/mdc      && go get ./... && go install

docs:
	@mdc github.com/goadesign/goa        content/reference
	@mdc github.com/goadesign/middleware content/reference
	@mdc github.com/goadesign/encoding   content/reference
	@mdc github.com/goadesign/gorma      content/reference

serve:
	@hugo --theme goa serve --watch

