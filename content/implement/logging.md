+++
date = "2016-01-30T11:01:06-05:00"
title = "Logging"
+++

An important aspect of writing microservices is having a good logging strategy. This is a pretty
complex topic and goa makes as little assumption as possible about how the service implements it.
However there needs to be some integration so that for example errors that are not caught by user
code end up being logged properly.

## The Logger Adapter

goa defines a minimal interface that it expects the logger to implement. This
interface is
[LogAdapter](http://goa.design/reference/goa/#type-logadapter-a-name-goa-logadapter-a)
and is defined as follows:

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

The code may take advantage of the logging context by using the accessor functions provided by each
adapter package. Keeping with the `log15` example:

```go
logger := goalog15.Logger(ctx) // logger is a log15.Logger
logger.Warn("whoops", "value", 15)
```

The service code should not have to funnel all logging calls through goa. For example the database
layer should probably not have to use the goa package at all. The idea to avoid the coupling is
to define functions for each log method that combine the above:

```go
// define logInfo, logWarn, and logError globally:
func logInfo(ctx context.Context, msg string, keyvals...interface{}) {
	goalog15.Logger(ctx).Info(msg, keyvals...)
}

// which can be used as in:
logInfo(ctx, "whoops", "value", 15)
```

The service should define the logging functions that make sense to it this way which allows it to
take advantage of the context setup by goa without creating a strong coupling.

## Usage in Middleware

Middlewares have access to the logger via the context and the
[ContextLogger](http://goa.design/reference/goa/#func-contextlogger-a-name-goa-logadapter-contextlogger-a)
function. They may use the returned
[LogAdapter](http://goa.design/reference/goa/#type-logadapter-a-name-goa-logadapter-a) to add to the
logger context or write logs.

Alternatively middlewares may take advantage of the
[WithLogContext](http://goa.design/reference/goa/#func-withlogcontext-a-name-goa-withlogcontext-a)
function to add to the logger context and use the
[LogInfo](http://goa.design/reference/goa/#func-loginfo-a-name-goa-loginfo-a) and
[LogError](http://goa.design/reference/goa/#func-logerror-a-name-goa-logerror-a) goa package
functions to write logs.


