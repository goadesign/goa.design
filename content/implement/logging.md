+++
date = "2016-01-30T11:01:06-05:00"
title = "Logging"
+++

An important aspect of writing microservices is having a good logging strategy. This is a pretty
complex topic and goa makes as little assumption as possible about how the service implements it.
However there needs to be some integration so that for example errors that are not caught by user
code end up being logged properly.

## The Logger Adapter

goa therefore defines a minimal interface that it expects the logger to implement. This interface is
[LogAdapter](http://goa.design/reference/goa/#type-logadapter-a-name-goa-logadapter-a) and is
 defined as follows:

```go
 type LogAdapter interface {
 	// Info logs an informational message.
 	Info(msg string, keyvals ...interface{})
 	// Error logs an error.
 	Error(msg string, keyvals ...interface{})
 	// New appends to the logger context and returns the updated logger adapter.
 	New(keyvals ...interface{}) LogAdapter
 }
```

The `Info` and `Error` methods implement structured logging by making it possible to pass in
optional key/value pairs with each message. This results in structured log entries for loggers that
support it. The adapters should take care of properly logging the context even if the actual logger
does not support it similarly to how the standard logger adapter that is part of goa does it.

Middlewares can take advantage of the `New` method to instantiate adapters with additional logging
context that gets logged with each log entry. Such additional context may contain a unique request
id for example as done by the
[LogRequest](http://goa.design/reference/goa/middleware/#func-logrequest-a-name-middleware-logrequest-a)
middleware.

The log adapter itself is stored in the request context and can be retrieved using the
[ContextLogger](http://goa.design/reference/goa/#func-contextlogger-a-name-goa-logadapter-contextlogger-a)
function. goa also exposes the
[WithLogContext](http://goa.design/reference/goa/#func-withlogcontext-a-name-goa-withlogcontext-a)
function which calls `New` on the adapter and creates a new context containing the resulting log
adapter.

## Usage in Services

Services should setup their logger like they need to - independently of goa. goa comes with a
number of `LogAdapter` [implementations](http://goa.design/reference/) for common logging packages
including the [standard logger](https://golang.org/pkg/log/),
[log15](https://github.com/inconshreveable/log15), [logrus](https://github.com/Sirupsen/logrus) and
the go-kit [logger](https://github.com/go-kit/kit).

Once instantiated the service should inject its logger in goa using one of these adapters. Taking
`log15` as an example, this could look like the following:

```go
// Create logger
logger := log.New("module", "app/server")
// Configure it
logger.SetHandler(log.StreamHandler(os.Stderr, log.LogfmtFormat()))
// Inject it
service.WithLogger(goalog15.New(logger))
```

goa then takes care of setting up the logger context before the action handler gets invoked. The
context may also be additionally configured by middleware such as the
[LogRequest](http://goa.design/reference/goa/middleware/#func-logrequest-a-name-middleware-logrequest-a)
middleware.

User code may take advantage of the logging context in one of two ways:

1. By logging via the [LogInfo](http://goa.design/reference/goa/#func-loginfo-a-name-goa-loginfo-a) and
   [LogError](http://goa.design/reference/goa/#func-logerror-a-name-goa-logerror-a) goa package
   functions.
2. By retrieving the log adapter itself via
   [ContextLogger](http://goa.design/reference/goa/#func-contextlogger-a-name-goa-logadapter-contextlogger-a).

Keeping with the `log15` example, the latter could look like this:

```go
logger := goa.ContextLogger(ctx).(*goalog15.Logger)
// Now use logger as you would an instance of log15.Logger
// since it's embedded in goalog15.Logger.
logger.Warn("woops", "value", 15)
```

## Usage in Middleware

Middlewares have access to the logger via the context and the
[ContextLogger](http://goa.design/reference/goa/#func-contextlogger-a-name-goa-logadapter-contextlogger-a)
function. They may use the returned
[LogAdapter](http://goa.design/reference/goa/#type-logadapter-a-name-goa-logadapter-a) to add to the
logging context. Alternatively middleware may take advantage of the
[WithLogContext](http://goa.design/reference/goa/#func-withlogcontext-a-name-goa-withlogcontext-a)
function which takes care of storing the resulting adapter in the returned context.

Middlewares should use the
[LogInfo](http://goa.design/reference/goa/#func-loginfo-a-name-goa-loginfo-a) and
[LogError](http://goa.design/reference/goa/#func-logerror-a-name-goa-logerror-a) goa package
functions to produce logs.


