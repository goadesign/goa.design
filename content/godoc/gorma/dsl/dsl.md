
# dsl
    import "github.com/goadesign/gorma/dsl"

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
				BuiltFrom(BottlePayload)
				RenderTo(Bottle)
				Description("This is the bottle model")
				Field("ID", gorma.PKInteger, func() {
					Description("This is the ID PK field")
				})
				Field("Vintage", gorma.Integer, func() {
					SQLTag("index")
				})
				Field("CreatedAt", gorma.Timestamp, func() {})
				Field("UpdatedAt", gorma.Timestamp, func() {})
				Field("DeletedAt", gorma.NullableTimestamp, func() {})
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

Every `Store` will have one or more `Model` which maps a Go structure to a table in the database.
Use the `BuiltFrom` and `RenderTo` DSL to tell the model which Goa types will be the payload (input)
and return types.

A `Model` will contain one or more fields.  Gorma will use the `BuiltFrom` definition to populate
a base set of fields.  Custom DSL is provided to add additional fields:

Each table will likely want a primary key.  To add one to your `Model`, create a Field definition
with a type of `gorma.PKInteger` or `gorma.PKBigInteger`.  Gorma will support UUID primary keys
at some point in the future.


	Field("ID", gorma.PKInteger, func() {
		Description("This is the ID PK field")
	})

Gorma generates all the helpers you need to translate to and from the Goa types (media types and payloads).
This makes wiring up your Goa controllers almost too easy to be considered programming.






## func Alias
``` go
func Alias(d string)
```
Alias overrides the name of the SQL store's table or field.


## func BelongsTo
``` go
func BelongsTo(parent string)
```
BelongsTo signifies a relationship between this model and a
Parent.  The Parent has the child, and the Child belongs
to the Parent.
Usage:  BelongsTo("User")


## func BuiltFrom
``` go
func BuiltFrom(bf interface{})
```
BuiltFrom informs Gorma that this model will be populated
from a Goa payload (User Type).  Conversion functions
will be generated to convert from the payload to the model.
Usage:  BuiltFrom(SomeGoaPayload)


## func Cached
``` go
func Cached(d string)
```
Cached caches the models for `duration` seconds.


## func Description
``` go
func Description(d string)
```
Description sets the definition description.
Description can be called inside StorageGroup, RelationalStore, RelationalModel, RelationalField


## func DynamicTableName
``` go
func DynamicTableName()
```
DynamicTableName sets a boolean flag that causes the generator to
generate function definitions in the database models that specify
the name of the database table.  Useful when using multiple tables
with different names but same schema e.g. Users, AdminUsers.


## func Field
``` go
func Field(name string, args ...interface{})
```
Field is a DSL definition for a field in a Relational Model.
TODO: Examples and more docs here later.

Parameter Options:
Field("Title")
Field("Title", gorma.String)
Field("Title", func(){... other field level dsl ...})
Field("Title", gorma.String, func(){... other field level dsl ...})


## func HasMany
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
Struct field definition:  Children	[]Child


## func HasOne
``` go
func HasOne(child string)
```
HasOne signifies a relationship between this model and another model.
If this model HasOne(OtherModel), then OtherModel is expected
to have a ThisModelID field as a Foreign Key to this model's
Primary Key.  ThisModel will have a field named OtherModel of type
OtherModel.
Usage:  HasOne("Proposal")


## func ManyToMany
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
be an array of type `product.Product`.


## func Model
``` go
func Model(name string, dsl func())
```
Model is the DSL that represents a Relational Model.
Model name should be Title cased. Use RenderTo() and BuiltFrom()
to have Gorma generate conversion helpers for your model.  Gorma
will create appropriate fields for all of your database relationships
too, using the BelongsTo(), HasMany(), HasOne(), and ManyToMany() DSL.


## func NoAutomaticIDFields
``` go
func NoAutomaticIDFields()
```
NoAutomaticIDFields applies to a `Store` type.  It allows you
to turn off the default behavior that will automatically create
an ID/int Primary Key for each model.


## func NoAutomaticSoftDelete
``` go
func NoAutomaticSoftDelete()
```
NoAutomaticSoftDelete applies to a `Store` type.  It allows
you to turn off the default behavior that will automatically
create a `DeletedAt` field (*time.Time) that acts as a
soft-delete filter for your models.


## func NoAutomaticTimestamps
``` go
func NoAutomaticTimestamps()
```
NoAutomaticTimestamps applies to a `Store` type.  It allows you
to turn off the default behavior that will automatically create
an `CreatedAt` and `UpdatedAt` fields for each model.


## func RenderTo
``` go
func RenderTo(rt interface{})
```
RenderTo informs Gorma that this model will need to be
rendered to a Goa type.  Conversion functions
will be generated to convert to/from the model.
Usage:   RenderTo(SomeGoaMediaType)


## func Roler
``` go
func Roler()
```
Roler sets a boolean flag that cause the generation of a
Role() function that returns the model's Role value
Requires a field in the model named Role, type String


## func SQLTag
``` go
func SQLTag(d string)
```
SQLTag sets the model's struct tag `sql` value
for indexing and other purposes.


## func SanitizeDBFieldName
``` go
func SanitizeDBFieldName(name string) string
```
SanitizeDBFieldName is exported for testing purposes


## func SanitizeFieldName
``` go
func SanitizeFieldName(name string) string
```
SanitizeFieldName is exported for testing purposes


## func StorageGroup
``` go
func StorageGroup(name string, dsli func()) *gorma.StorageGroupDefinition
```
StorageGroup implements the top level Gorma DSL
There should be one StorageGroup per Goa application.


## func Store
``` go
func Store(name string, storeType gorma.RelationalStorageType, dsl func())
```
Store represents a database.  Gorma lets you specify
a database type, but it's currently not used for any generation
logic.









- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)