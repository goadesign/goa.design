+++
date="2019-03-10T18:05:50-07:00"
description="github.com/goadesign/gorma/dsl"
+++


# dsl
`import "github.com/goadesign/gorma/dsl"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>
Package dsl uses the Goa DSL engine to generate a data storage layer
for your Goa API.

Using a few DSL definitions you can extend the Goa API to include
database persistence.

An example:


	var sg = StorageGroup("MyStorageGroup", func() {
		Description("This is the global storage group")
		Store("mysql", gorma.MySQL, func() {
			Description("This is the mysql relational store")
			Model("Bottle", func() {
				BuildsFrom(func() {
					Payload("myresource","actionname")  // e.g. "bottle", "create" resource definition
				})
				RendersTo(Bottle)						// a Media Type definition
				Description("This is the bottle model")
				Field("ID", gorma.Integer, func() {    //  redundant
					PrimaryKey()
					Description("This is the ID PK field")
				})
				Field("Vintage", gorma.Integer, func() {
					SQLTag("index")						// Add an index
				})
				Field("CreatedAt", gorma.Timestamp)
				Field("UpdatedAt", gorma.Timestamp)			 // Shown for demonstration
				Field("DeletedAt", gorma.NullableTimestamp)  // These are added by default
			})
		})
	})

Gorma uses Gorm (<a href="https://github.com/jinzhu/gorm">https://github.com/jinzhu/gorm</a>) for database access.  Gorm was chosen
as the best of the 'light-ORM' libraries available for Go.  It does the mundane work and
allows you to do anything manually if you choose.

The base Gorma definition is a `StorageGroup` which represents all the storage needs for an
application.  A StorageGroup will contain one or more `Store`, which represends a database or
other persistence mechanism.  Gorma supports all the databases that Gorm supports, and
it is possible in the future to support others -- like Key/Value stores.

Every `Store` will have one or more `Model`s which maps a Go structure to a table in the database.
Use the `BuildsFrom` and `RendersTo` DSL to build generated functions to convert the model to Media
Type definitions and from User Type definitions.

A `Model` will contain one or more fields.  Gorma will use the `BuildsFrom` definition to populate
a base set of fields.  Custom DSL is provided to add additional fields:

Each table will likely want a primary key. Gorma automatically adds one to your table called "ID" if
there isn't one already.  Gorma supports Integer primary keys currently, but support for UUID and string
primary keys is in the plan for the future. [github](<a href="https://github.com/goadesign/gorma/issues/57">https://github.com/goadesign/gorma/issues/57</a>)

In the event that the `BuildsFrom` types don't contain all the fields that you want to include in your
model, you can add extra fields using the `Field` DSL:


	Field("foo", gorma.String, func() {
		Description("This is the foo field")
	})

You can also specify modifications to fields that you know will be inherited from the `BuildsFrom` DSL.  For
example if the type specified in `BuildsFrom` contains a field called `Author` and you want to ensure that
it gets indexed, you can specify the field explicitly and add a `SQLTag` declaration:


	Field("author", gorma.String, func() {
		SQLTag("index")
	})

In general the only time you need to declare fields explicitly is if you want to modify the type or attributes
of the fields that are inherited from the `BuildsFrom` type, or if you want to add extra fields not included
in the `BuildsFrom` types.

You may specify more than one `BuildsFrom` type.

You can control naming between the `BuildsFrom` and `RendersTo` models by using the `MapsTo` and `MapsFrom` DSL:


	Field("Title", func(){
		MapsFrom(UserPayload, "position")
	})

This creates a field in the Gorma model called "Title", which is populated from the "position" field in the UserPayload.

The `MapsTo` DSL can be used similarly to change output field mapping to Media Types.

Gorma generates all the helpers you need to translate to and from the Goa types (media types and payloads).
This makes wiring up your Goa controllers almost too easy to be considered programming.




## <a name="pkg-index">Index</a>
* [func Alias(d string)](#Alias)
* [func BelongsTo(parent string)](#BelongsTo)
* [func BuildsFrom(dsl func())](#BuildsFrom)
* [func Cached(d string)](#Cached)
* [func DatabaseFieldName(name string)](#DatabaseFieldName)
* [func Description(d string)](#Description)
* [func DynamicTableName()](#DynamicTableName)
* [func Field(name string, args ...interface{})](#Field)
* [func HasMany(name, child string)](#HasMany)
* [func HasOne(child string)](#HasOne)
* [func ManyToMany(other, tablename string)](#ManyToMany)
* [func MapsFrom(utd *design.UserTypeDefinition, field string)](#MapsFrom)
* [func MapsTo(mtd *design.MediaTypeDefinition, field string)](#MapsTo)
* [func Model(name string, dsl func())](#Model)
* [func NoAutomaticIDFields()](#NoAutomaticIDFields)
* [func NoAutomaticSoftDelete()](#NoAutomaticSoftDelete)
* [func NoAutomaticTimestamps()](#NoAutomaticTimestamps)
* [func Nullable()](#Nullable)
* [func Payload(r interface{}, act string)](#Payload)
* [func PrimaryKey()](#PrimaryKey)
* [func RendersTo(rt interface{})](#RendersTo)
* [func Roler()](#Roler)
* [func SQLTag(d string)](#SQLTag)
* [func SanitizeDBFieldName(name string) string](#SanitizeDBFieldName)
* [func SanitizeFieldName(name string) string](#SanitizeFieldName)
* [func StorageGroup(name string, dsli func()) *gorma.StorageGroupDefinition](#StorageGroup)
* [func Store(name string, storeType gorma.RelationalStorageType, dsl func())](#Store)


#### <a name="pkg-files">Package files</a>
[doc.go](/src/github.com/goadesign/gorma/dsl/doc.go) [relationalfield.go](/src/github.com/goadesign/gorma/dsl/relationalfield.go) [relationalmodel.go](/src/github.com/goadesign/gorma/dsl/relationalmodel.go) [relationalstore.go](/src/github.com/goadesign/gorma/dsl/relationalstore.go) [runner.go](/src/github.com/goadesign/gorma/dsl/runner.go) [storagegroup.go](/src/github.com/goadesign/gorma/dsl/storagegroup.go) 





## <a name="Alias">func</a> [Alias](/src/target/relationalmodel.go?s=11149:11169#L334)
``` go
func Alias(d string)
```
Alias overrides the name of the SQL store's table or field.



## <a name="BelongsTo">func</a> [BelongsTo](/src/target/relationalmodel.go?s=4845:4874#L162)
``` go
func BelongsTo(parent string)
```
BelongsTo signifies a relationship between this model and a
Parent.  The Parent has the child, and the Child belongs
to the Parent.

Usage:  BelongsTo("User")



## <a name="BuildsFrom">func</a> [BuildsFrom](/src/target/relationalmodel.go?s=3402:3429#L107)
``` go
func BuildsFrom(dsl func())
```
BuildsFrom informs Gorma that this model will be populated
from a Goa UserType.  Conversion functions
will be generated to convert from the payload to the model.

Usage:  BuildsFrom(YourType)

Fields not in `YourType` that you want in your model must be
added explicitly with the `Field` DSL.



## <a name="Cached">func</a> [Cached](/src/target/relationalmodel.go?s=11538:11559#L346)
``` go
func Cached(d string)
```
Cached caches the models for `duration` seconds.
Not fully implemented yet, and not guaranteed to stay
in Gorma long-term because of the complex rendering
that happens in the conversion functions.



## <a name="DatabaseFieldName">func</a> [DatabaseFieldName](/src/target/relationalfield.go?s=387:422#L17)
``` go
func DatabaseFieldName(name string)
```
DatabaseFieldName allows for customization of the column name
by seting the struct tags. This is necessary to create correlate
non standard column naming conventions in gorm.



## <a name="Description">func</a> [Description](/src/target/storagegroup.go?s=889:915#L31)
``` go
func Description(d string)
```
Description sets the definition description.
Description can be called inside StorageGroup, RelationalStore, RelationalModel, RelationalField



## <a name="DynamicTableName">func</a> [DynamicTableName](/src/target/relationalmodel.go?s=12551:12574#L377)
``` go
func DynamicTableName()
```
DynamicTableName sets a boolean flag that causes the generator to
generate function definitions in the database models that specify
the name of the database table.  Useful when using multiple tables
with different names but same schema e.g. Users, AdminUsers.



## <a name="Field">func</a> [Field](/src/target/relationalfield.go?s=986:1030#L37)
``` go
func Field(name string, args ...interface{})
```
Field is a DSL definition for a field in a Relational Model.
Parameter Options:


	// A field called "Title" with default type `String`.
	Field("Title")
	
	// Explicitly specify the type.
	Field("Title", gorma.String)
	
	// "Title" field, as `String` with other DSL included.
	Field("Title", func(){... other field level dsl ...})
	
	// All options specified: name, type and dsl.
	Field("Title", gorma.String, func(){... other field level dsl ...})



## <a name="HasMany">func</a> [HasMany](/src/target/relationalmodel.go?s=8002:8034#L243)
``` go
func HasMany(name, child string)
```
HasMany signifies a relationship between this model and a
set of Children.  The Parent has the children, and the Children belong
to the Parent.  The first parameter becomes the name of the
field in the model struct, the second parameter is the name
of the child model.  The Child model will have a ParentID field
appended to the field list.  The Parent model definition will use
the first parameter as the field name in the struct definition.

Usage:  HasMany("Orders", "Order")

Generated struct field definition:  Children	[]Child



## <a name="HasOne">func</a> [HasOne](/src/target/relationalmodel.go?s=6020:6045#L190)
``` go
func HasOne(child string)
```
HasOne signifies a relationship between this model and another model.
If this model HasOne(OtherModel), then OtherModel is expected
to have a ThisModelID field as a Foreign Key to this model's
Primary Key.  ThisModel will have a field named OtherModel of type
OtherModel.

Usage:  HasOne("Proposal")



## <a name="ManyToMany">func</a> [ManyToMany](/src/target/relationalmodel.go?s=10075:10115#L297)
``` go
func ManyToMany(other, tablename string)
```
ManyToMany creates a join table to store the intersection relationship
between this model and another model.  For example, in retail an Order can
contain many products, and a product can belong to many orders.  To express
this relationship use the following syntax:


	Model("Order", func(){
		ManyToMany("Product", "order_lines")
	})

This specifies that the Order and Product tables have a "junction" table
called `order_lines` that contains the order and product information.
The generated model will have a field called `Products` that will
be an array of type `Product`.



## <a name="MapsFrom">func</a> [MapsFrom](/src/target/relationalfield.go?s=2246:2305#L78)
``` go
func MapsFrom(utd *design.UserTypeDefinition, field string)
```
MapsFrom establishes a mapping relationship between a source
Type field and this model.  The source type must be a UserTypeDefinition "Type"
in goa.  These are typically Payloads.



## <a name="MapsTo">func</a> [MapsTo](/src/target/relationalfield.go?s=2575:2633#L90)
``` go
func MapsTo(mtd *design.MediaTypeDefinition, field string)
```
MapsTo establishes a mapping relationship between a field in model and
a MediaType in goa.



## <a name="Model">func</a> [Model](/src/target/relationalmodel.go?s=766:801#L25)
``` go
func Model(name string, dsl func())
```
Model is the DSL that represents a Relational Model.
Model name should be Title cased.  Use BuildsFrom() and RendersTo() DSL
to define the mapping between a Model and a Goa Type.
Models may contain multiple instances of the `Field` DSL to
add fields to the model.

To control whether the ID field is auto-generated, use `NoAutomaticIDFields()`
Similarly, use NoAutomaticTimestamps() and NoAutomaticSoftDelete() to
prevent CreatedAt, UpdatedAt and DeletedAt fields from being created.



## <a name="NoAutomaticIDFields">func</a> [NoAutomaticIDFields](/src/target/relationalstore.go?s=1382:1408#L48)
``` go
func NoAutomaticIDFields()
```
NoAutomaticIDFields applies to a `Store` or `Model` type.  It allows you
to turn off the default behavior that will automatically create
an ID/int Primary Key for each model.



## <a name="NoAutomaticSoftDelete">func</a> [NoAutomaticSoftDelete](/src/target/relationalstore.go?s=2286:2314#L72)
``` go
func NoAutomaticSoftDelete()
```
NoAutomaticSoftDelete applies to a `Store` or `Model` type.  It allows
you to turn off the default behavior that will automatically
create a `DeletedAt` field (*time.Time) that acts as a
soft-delete filter for your models.



## <a name="NoAutomaticTimestamps">func</a> [NoAutomaticTimestamps](/src/target/relationalstore.go?s=1791:1819#L59)
``` go
func NoAutomaticTimestamps()
```
NoAutomaticTimestamps applies to a `Store` or `Model` type.  It allows you
to turn off the default behavior that will automatically create
an `CreatedAt` and `UpdatedAt` fields for each model.



## <a name="Nullable">func</a> [Nullable](/src/target/relationalfield.go?s=3073:3088#L110)
``` go
func Nullable()
```
Nullable sets the fields nullability
A Nullable field will be stored as a pointer.  A field that is
not Nullable won't be stored as a pointer.



## <a name="Payload">func</a> [Payload](/src/target/relationalmodel.go?s=4030:4069#L129)
``` go
func Payload(r interface{}, act string)
```
Payload specifies the Resource and Action containing
a User Type (Payload).
Gorma will generate a conversion function for the Payload to
the Model.



## <a name="PrimaryKey">func</a> [PrimaryKey](/src/target/relationalfield.go?s=3333:3350#L119)
``` go
func PrimaryKey()
```
PrimaryKey establishes a field as a Primary Key by
seting the struct tags necessary to create the PK in gorm.
Valid only for `Integer` datatypes currently



## <a name="RendersTo">func</a> [RendersTo](/src/target/relationalmodel.go?s=2901:2931#L89)
``` go
func RendersTo(rt interface{})
```
RendersTo informs Gorma that this model will need to be
rendered to a Goa type.  Conversion functions
will be generated to convert to/from the model.

Usage: RendersTo(MediaType)



## <a name="Roler">func</a> [Roler](/src/target/relationalmodel.go?s=11989:12001#L361)
``` go
func Roler()
```
Roler sets a boolean flag that cause the generation of a
Role() function that returns the model's Role value
Creates a "Role" field in the table if it doesn't already exist
as a string type



## <a name="SQLTag">func</a> [SQLTag](/src/target/relationalmodel.go?s=12749:12770#L385)
``` go
func SQLTag(d string)
```
SQLTag sets the model's struct tag `sql` value
for indexing and other purposes.



## <a name="SanitizeDBFieldName">func</a> [SanitizeDBFieldName](/src/target/relationalfield.go?s=4009:4053#L144)
``` go
func SanitizeDBFieldName(name string) string
```
SanitizeDBFieldName is exported for testing purposes



## <a name="SanitizeFieldName">func</a> [SanitizeFieldName](/src/target/relationalfield.go?s=3757:3799#L133)
``` go
func SanitizeFieldName(name string) string
```
SanitizeFieldName is exported for testing purposes



## <a name="StorageGroup">func</a> [StorageGroup](/src/target/storagegroup.go?s=201:274#L10)
``` go
func StorageGroup(name string, dsli func()) *gorma.StorageGroupDefinition
```
StorageGroup implements the top level Gorma DSL
There should be one StorageGroup per Goa application.



## <a name="Store">func</a> [Store](/src/target/relationalstore.go?s=226:300#L11)
``` go
func Store(name string, storeType gorma.RelationalStorageType, dsl func())
```
Store represents a database.  Gorma lets you specify
a database type, but it's currently not used for any generation
logic.








- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
