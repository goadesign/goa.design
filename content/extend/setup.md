+++
title = "Goa Development"
weight = 2

[menu.main]
name = "Goa Development"
parent = "design"
+++

# Development Setup

This document describes the steps required to setup a development environment for contributing to Goa.

## 1. Install Go

The first step is to install the Go distribution. Please follow the steps described in the
[Go Getting Started guide](https://golang.org/doc/install)

## 2. Clone Goa

> Note: This step requires git. Installing git is outside the scope of this document.

Once Go is installed and the [GOPATH](https://github.com/golang/go/wiki/SettingGOPATH) environment variable is set, clone Goa:

```bash
cd $GOPATH/src
mkdir -p goa.design
cd goa.design
git clone https://github.com/goadesign/goa
cd goa
git checkout v3
```

## 3. Install dependencies

Bring in all the Go packages that Goa depends on:

```bash
go get -v -u ./...
```

## 4. Build Goa

Install the goa tool:

```bash
cd cmd/goa
go install .
```

## 5. Test the setup

Finally to make sure everything is properly setup run the tests:

```bash
cd $GOPATH/src/goa.design/goa
make
```

## 6. Development

You now have a fully functional Goa installation and are ready to start hacking!
If you haven't yet you should join the Slack
[channel](https://gophers.slack.com/messages/goa/) (sign up
[here](https://gophersinvite.herokuapp.com/)) to ask questions.

Once you are ready to submit your changes simply open a GitHub
[PR](https://help.github.com/en/articles/about-pull-requests), someone will review
your proposed changes and provide feedback. More details on how to contribute is
available in the [repo](https://github.com/goadesign/goa/blob/v3/CONTRIBUTING.md).
