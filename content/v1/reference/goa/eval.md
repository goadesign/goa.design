+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/eval"
+++


# eval
`import "github.com/goadesign/goa/eval"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>
Package eval implements a DSL engine for executing arbitrary Go DSLs.

DSLs executed via eval consist of package functions that build up expressions
upon execution.

A DSL that allows describing a service and its methods could look like this:


	var _ = Service("service name")         // Defines the service "service name"
	
	var _ = Method("method name", func() {  // Defines the method "method name"
	    Description("some method description") // Sets the method description
	})

DSL keywords are simply package functions that can be nested using anonymous
functions as last argument. Upon execution the DSL functions create expression
structs. The expression structs created by the top level functions on process
start (both Service and Method in this example) should be stored in special
expressions called root expressions. The DSL implements both the expression and
root expression structs, the only requirement is that they implement the eval
package Expression and Root interfaces respectively.

Keeping with the example above, Method creates instances of the following
MethodExpression struct:


	type MethodExpression struct {
	    Name string
	    DSLFunc func()
	}

where Name gets initialized with the first argument and DSLFunc with the second.
ServiceExpression is the root expression that contains the instances of
MethodExpression created by the Method function:


	type ServiceExpression struct {
	    Name string
	    Methods []eval.Expression
	}

The Method DSL function simply initializes a MethodExpression and stores it
in the Methods field of the root ServiceExpression:


	func Method(name string, fn func()) {
	    ep := &MethodExpression{Name: name, DSLFunc: fn}
	    Design.Methods = append(Design.Methods, ep)
	}

where Design is a package variable holding the ServiceExpression root
expression:


	// Design is the DSL root expression.
	var Design *ServiceExpression = &ServiceExpression{}

The Service function simply sets the Name field of Service:


	func Service(name string) {
	    Design.Name = name
	}

Once the process is loaded the Design package variable contains an instance of
ServiceExpression which in turn contains all the instances of MethodExpression
that were created via the Method function. Note that at this point the
Description function used in the Method DSL hasn't run yet as it is called by
the anonymous function stored in the DSLFunc field of each MethodExpression
instance. This is where the RunDSL function of package eval comes in.

RunDSL iterates over the initial set of root expressions and calls the
WalkSets method exposed by the Root interface. This method lets the DSL
engine iterate over the sub-expressions that were initialized when the process
loaded.

In this example the ServiceExpression implementation of WalkSets simply
passes the Methods field to the iterator:


	func (se *ServiceExpression) WalkSets(it eval.SetWalker) {
	    it(se.Methods)
	}

Each expression in an expression set may optionally implement the Source,
Validator and Finalizer interfaces:

- Expressions that are initialized via a child DSL implement Source which


	provides RunDSL with the corresponding anonymous function.

- Expressions that need to be validated implement the Validator interface.

- Expressions that require an additional pass after validation implement the


	Finalizer interface.

In our example MethodExpression implements Source and return its DSLFunc
member in the implementation of the Source interface DSL function:


	func (ep *MethodExpression) Source() func() {
	    return ep.DSLFunc
	}

MethodExpression could also implement the Validator Validate method to check
that the name of the method is not empty for example.

The execution of the DSL thus happens in three phases: in the first phase RunDSL
executes all the DSLs of all the source expressions in each expression set. In
this initial phase the DSLs being executed may append to the expression set
and/or may register new expression roots. In the second phase RunDSL validates
all the validator expressions and in the last phase it calls Finalize on all the
finalizer expressions.

The eval package exposes functions that the implementation of the DSL can take
advantage of to report errors, such as ReportError, InvalidArg and
IncompatibleDSL. The engine records the errors being reported but keeps running
the current phase so that multiple errors may be reported at once. This means
that the DSL implementation must maintain a consistent state for the duration of
one iteration even though some input may be incorrect (for example it may elect
to create default value expressions instead of leaving them nil to avoid panics
later on).

The package exposes other helper functions such as Execute which allows running
a DSL function manually or IsTop which reports whether the expression being
currently built is a top level expression (such as Service and Method in our
example).




## <a name="pkg-index">Index</a>
* [func Execute(fn func(), def Expression) bool](#Execute)
* [func IncompatibleDSL()](#IncompatibleDSL)
* [func InvalidArgError(expected string, actual interface{})](#InvalidArgError)
* [func Register(r Root) error](#Register)
* [func ReportError(fm string, vals ...interface{})](#ReportError)
* [func Reset()](#Reset)
* [func RunDSL() error](#RunDSL)
* [type DSLContext](#DSLContext)
  * [func (c *DSLContext) Error() string](#DSLContext.Error)
  * [func (c *DSLContext) Record(err *Error)](#DSLContext.Record)
  * [func (c *DSLContext) Roots() ([]Root, error)](#DSLContext.Roots)
* [type DSLFunc](#DSLFunc)
  * [func (f DSLFunc) DSL() func()](#DSLFunc.DSL)
* [type Error](#Error)
  * [func (e *Error) Error() string](#Error.Error)
* [type Expression](#Expression)
  * [func Current() Expression](#Current)
* [type ExpressionSet](#ExpressionSet)
* [type Finalizer](#Finalizer)
* [type MultiError](#MultiError)
  * [func (m MultiError) Error() string](#MultiError.Error)
* [type Preparer](#Preparer)
* [type Root](#Root)
* [type SetWalker](#SetWalker)
* [type Source](#Source)
* [type Stack](#Stack)
  * [func (s Stack) Current() Expression](#Stack.Current)
* [type TopExpr](#TopExpr)
  * [func (t TopExpr) EvalName() string](#TopExpr.EvalName)
* [type ValidationErrors](#ValidationErrors)
  * [func (verr *ValidationErrors) Add(def Expression, format string, vals ...interface{})](#ValidationErrors.Add)
  * [func (verr *ValidationErrors) AddError(def Expression, err error)](#ValidationErrors.AddError)
  * [func (verr *ValidationErrors) Error() string](#ValidationErrors.Error)
  * [func (verr *ValidationErrors) Merge(err *ValidationErrors)](#ValidationErrors.Merge)
* [type Validator](#Validator)


#### <a name="pkg-files">Package files</a>
[context.go](/src/github.com/goadesign/goa/eval/context.go) [doc.go](/src/github.com/goadesign/goa/eval/doc.go) [error.go](/src/github.com/goadesign/goa/eval/error.go) [eval.go](/src/github.com/goadesign/goa/eval/eval.go) [expression.go](/src/github.com/goadesign/goa/eval/expression.go) 





## <a name="Execute">func</a> [Execute](/src/target/eval.go?s=3245:3289#L134)
``` go
func Execute(fn func(), def Expression) bool
```
Execute runs the given DSL to initialize the given expression. It returns
true on success. It returns false and appends to Context.Errors on failure.
Note that Run takes care of calling Execute on all expressions that implement
Source. This function is intended for use by expressions that run the DSL at
declaration time rather than store the DSL for execution by the dsl engine
(usually simple independent expressions). The DSL should use ReportError to
record DSL execution errors.



## <a name="IncompatibleDSL">func</a> [IncompatibleDSL](/src/target/eval.go?s=4581:4603#L184)
``` go
func IncompatibleDSL()
```
IncompatibleDSL should be called by DSL functions when they are invoked in an
incorrect context (e.g. "Params" in "Service").



## <a name="InvalidArgError">func</a> [InvalidArgError](/src/target/eval.go?s=4818:4875#L191)
``` go
func InvalidArgError(expected string, actual interface{})
```
InvalidArgError records an invalid argument error.  It is used by DSL
functions that take dynamic arguments.



## <a name="Register">func</a> [Register](/src/target/context.go?s=1197:1224#L46)
``` go
func Register(r Root) error
```
Register appends a root expression to the current Context root expressions.
Each root expression may only be registered once.



## <a name="ReportError">func</a> [ReportError](/src/target/eval.go?s=4047:4095#L164)
``` go
func ReportError(fm string, vals ...interface{})
```
ReportError records a DSL error for reporting post DSL execution.  It accepts
a format and values a la fmt.Printf.



## <a name="Reset">func</a> [Reset](/src/target/context.go?s=978:990#L40)
``` go
func Reset()
```
Reset resets the eval context, mostly useful for tests.



## <a name="RunDSL">func</a> [RunDSL](/src/target/eval.go?s=487:506#L17)
``` go
func RunDSL() error
```
RunDSL iterates through the root expressions and calls WalkSets on each to
retrieve the expression sets. It iterates over the expression sets multiple
times to first execute the DSL, then validate the resulting expressions and
lastly to finalize them. The executed DSL may register additional roots
during initial execution via Register to have them be executed (last) in the
same run.




## <a name="DSLContext">type</a> [DSLContext](/src/target/context.go?s=211:722#L12)
``` go
type DSLContext struct {
    // Stack represents the current execution stack.
    Stack Stack
    // Errors contains the DSL execution errors for the current
    // expression set.
    // Errors is an instance of MultiError.
    Errors error
    // contains filtered or unexported fields
}

```
DSLContext is the data structure that contains the DSL execution state.


``` go
var Context *DSLContext
```
Context contains the state used by the engine to execute the DSL.










### <a name="DSLContext.Error">func</a> (\*DSLContext) [Error](/src/target/context.go?s=1720:1755#L67)
``` go
func (c *DSLContext) Error() string
```
Error builds the error message from the current context errors.




### <a name="DSLContext.Record">func</a> (\*DSLContext) [Record](/src/target/context.go?s=3542:3581#L135)
``` go
func (c *DSLContext) Record(err *Error)
```
Record appends an error to the context Errors field.




### <a name="DSLContext.Roots">func</a> (\*DSLContext) [Roots](/src/target/context.go?s=1943:1987#L76)
``` go
func (c *DSLContext) Roots() ([]Root, error)
```
Roots orders the DSL roots making sure dependencies are last. It returns an
error if there is a dependency cycle.




## <a name="DSLFunc">type</a> [DSLFunc](/src/target/expression.go?s=2518:2532#L70)
``` go
type DSLFunc func()
```
DSLFunc is a type that DSL expressions may embed to store DSL. It
implements Source.










### <a name="DSLFunc.DSL">func</a> (DSLFunc) [DSL](/src/target/expression.go?s=3485:3514#L96)
``` go
func (f DSLFunc) DSL() func()
```
DSL returns the DSL function.




## <a name="Error">type</a> [Error](/src/target/error.go?s=275:538#L15)
``` go
type Error struct {
    // GoError is the original error returned by the DSL function.
    GoError error
    // File is the path to the file containing the user code that
    // caused the error.
    File string
    // Line is the line number  that caused the error.
    Line int
}

```
Error represents an error that occurred while evaluating the DSL.
It contains the name of the file and line number of where the error
occurred as well as the original Go error.










### <a name="Error.Error">func</a> (\*Error) [Error](/src/target/error.go?s=868:898#L39)
``` go
func (e *Error) Error() string
```
Error returns the underlying error message.




## <a name="Expression">type</a> [Expression](/src/target/expression.go?s=84:215#L5)
``` go
type Expression interface {
    // EvalName is the qualified name of the DSL expression e.g.
    // "service bottle".
    EvalName() string
}
```
Expression built by the engine through the DSL functions.







### <a name="Current">func</a> [Current](/src/target/eval.go?s=3806:3831#L154)
``` go
func Current() Expression
```
Current returns the expression whose DSL is currently being executed.
As a special case Current returns Top when the execution stack is empty.





## <a name="ExpressionSet">type</a> [ExpressionSet](/src/target/expression.go?s=3173:3199#L85)
``` go
type ExpressionSet []Expression
```
ExpressionSet is a sequence of expressions processed in order. Each
DSL implementation provides an arbitrary number of expression sets to
the engine via iterators (see the Root interface WalkSets method).

The items in the set may implement the Source, Validator and/or
Finalizer interfaces to enable the corresponding behaviors during DSL
execution. The engine first runs the expression DSLs (for the ones
that implement Source) then validates them (for the ones that
implement Validator) and finalizes them (for the ones that implement
Finalizer).










## <a name="Finalizer">type</a> [Finalizer](/src/target/expression.go?s=2224:2422#L61)
``` go
type Finalizer interface {
    // Finalize is run by the engine as the last step. Finalize
    // cannot fail, any potential failure should be returned by
    // implementing Validator instead.
    Finalize()
}
```
A Finalizer expression requires an additional pass after the DSL has
executed and has been validated (e.g. to merge generated expressions
or initialize default values).










## <a name="MultiError">type</a> [MultiError](/src/target/error.go?s=607:626#L26)
``` go
type MultiError []*Error
```
MultiError collects multiple DSL errors. It implements error.










### <a name="MultiError.Error">func</a> (MultiError) [Error](/src/target/error.go?s=666:700#L30)
``` go
func (m MultiError) Error() string
```
Error returns the error message.




## <a name="Preparer">type</a> [Preparer](/src/target/expression.go?s=1491:1696#L42)
``` go
type Preparer interface {
    // Prepare is run by the engine right after the DSL has run.
    // Prepare cannot fail, any potential failure should be returned
    // by implementing Validator instead.
    Prepare()
}
```
A Preparer expression requires an additional pass after the DSL has
executed and BEFORE it is validated (e.g. to flatten inheritance)










## <a name="Root">type</a> [Root](/src/target/expression.go?s=430:1142#L14)
``` go
type Root interface {
    Expression
    // WalkSets implements the visitor pattern: is is called by
    // the engine so the DSL can control the order of execution.
    // WalkSets calls back the engine via the given iterator as
    // many times as needed providing the expression sets on each
    // callback.
    WalkSets(SetWalker)
    // DependsOn returns the list of other DSL roots this root
    // depends on.  The engine uses this function to order the
    // execution of the DSL roots.
    DependsOn() []Root
    // Packages returns the import path to the Go packages that make
    // up the DSL. This is used to skip frames that point to files
    // in these packages when computing the location of errors.
    Packages() []string
}
```
A Root expression represents an entry point to the executed DSL: upon
execution the DSL engine iterates over all root expressions and calls
their WalkSets methods to iterate over the sub-expressions.










## <a name="SetWalker">type</a> [SetWalker](/src/target/expression.go?s=3298:3335#L89)
``` go
type SetWalker func(s ExpressionSet) error
```
SetWalker is the function signature used to iterate over expression
sets with WalkSets.










## <a name="Source">type</a> [Source](/src/target/expression.go?s=1228:1346#L34)
``` go
type Source interface {
    // DSL returns the DSL used to initialize the expression in a
    // second pass.
    DSL() func()
}
```
A Source expression embeds DSL to be executed after the process is
loaded.










## <a name="Stack">type</a> [Stack](/src/target/context.go?s=871:889#L32)
``` go
type Stack []Expression
```
Stack represents the expression evaluation stack. The stack is
appended to each time the initiator executes an expression source
DSL.










### <a name="Stack.Current">func</a> (Stack) [Current](/src/target/context.go?s=1558:1593#L59)
``` go
func (s Stack) Current() Expression
```
Current evaluation context, i.e. object being currently built by DSL




## <a name="TopExpr">type</a> [TopExpr](/src/target/expression.go?s=2567:2581#L73)
``` go
type TopExpr string
```
TopExpr is the type of Top.


``` go
const Top TopExpr = "top-level"
```
Top is the expression returned by Current when the execution stack is empty.










### <a name="TopExpr.EvalName">func</a> (TopExpr) [EvalName](/src/target/expression.go?s=3595:3629#L101)
``` go
func (t TopExpr) EvalName() string
```
EvalName is the name is the qualified name of the expression.




## <a name="ValidationErrors">type</a> [ValidationErrors](/src/target/eval.go?s=5049:5128#L196)
``` go
type ValidationErrors struct {
    Errors      []error
    Expressions []Expression
}

```
ValidationErrors records the errors encountered when running Validate.










### <a name="ValidationErrors.Add">func</a> (\*ValidationErrors) [Add](/src/target/eval.go?s=5707:5792#L220)
``` go
func (verr *ValidationErrors) Add(def Expression, format string, vals ...interface{})
```
Add adds a validation error to the target.




### <a name="ValidationErrors.AddError">func</a> (\*ValidationErrors) [AddError](/src/target/eval.go?s=6000:6065#L226)
``` go
func (verr *ValidationErrors) AddError(def Expression, err error)
```
AddError adds a validation error to the target. It "flattens" validation
errors so that the recorded errors are never ValidationErrors themselves.




### <a name="ValidationErrors.Error">func</a> (\*ValidationErrors) [Error](/src/target/eval.go?s=5171:5215#L202)
``` go
func (verr *ValidationErrors) Error() string
```
Error implements the error interface.




### <a name="ValidationErrors.Merge">func</a> (\*ValidationErrors) [Merge](/src/target/eval.go?s=5453:5511#L211)
``` go
func (verr *ValidationErrors) Merge(err *ValidationErrors)
```
Merge merges validation errors into the target.




## <a name="Validator">type</a> [Validator](/src/target/expression.go?s=1744:2040#L50)
``` go
type Validator interface {
    // Validate runs after Prepare if the expression is a Preparer.
    // It returns nil if the expression contains no validation
    // error. The Validate implementation may take advantage of
    // ValidationErrors to report more than one errors at a time.
    Validate() error
}
```
A Validator expression can be validated.














- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
