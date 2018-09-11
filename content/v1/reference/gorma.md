+++
date="2018-09-11T15:21:35-07:00"
description="github.com/goadesign/gorma"
+++


# gorma
`import "github.com/goadesign/gorma"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>
Package gorma is a plugin generator for Goa (<a href="http://goa.design">http://goa.design</a>).
See the documentation in the `dsl` package for details
on how to create a definition for your API.

The `example` folder contains an example Goa design package.
The `models.go` file is the Gorma definition, which is responsible
for generating all the files in the `example\models` folder.

See specific documentation in the `dsl` package.




## <a name="pkg-index">Index</a>
* [Constants](#pkg-constants)
* [func Generate() (files []string, err error)](#Generate)
* [type BuildSource](#BuildSource)
  * [func NewBuildSource() *BuildSource](#NewBuildSource)
  * [func (f *BuildSource) Context() string](#BuildSource.Context)
  * [func (f *BuildSource) DSL() func()](#BuildSource.DSL)
* [type BuildSourceIterator](#BuildSourceIterator)
* [type FieldIterator](#FieldIterator)
* [type FieldType](#FieldType)
* [type Generator](#Generator)
  * [func (g *Generator) Cleanup()](#Generator.Cleanup)
  * [func (g *Generator) Generate(api *design.APIDefinition) (_ []string, err error)](#Generator.Generate)
* [type ManyToManyDefinition](#ManyToManyDefinition)
  * [func (m *ManyToManyDefinition) LeftName() string](#ManyToManyDefinition.LeftName)
  * [func (m *ManyToManyDefinition) LeftNamePlural() string](#ManyToManyDefinition.LeftNamePlural)
  * [func (m *ManyToManyDefinition) LowerLeftName() string](#ManyToManyDefinition.LowerLeftName)
  * [func (m *ManyToManyDefinition) LowerRightName() string](#ManyToManyDefinition.LowerRightName)
  * [func (m *ManyToManyDefinition) RightName() string](#ManyToManyDefinition.RightName)
  * [func (m *ManyToManyDefinition) RightNamePlural() string](#ManyToManyDefinition.RightNamePlural)
* [type MapDefinition](#MapDefinition)
  * [func NewMapDefinition() *MapDefinition](#NewMapDefinition)
* [type MediaTypeAdapterDefinition](#MediaTypeAdapterDefinition)
* [type ModelIterator](#ModelIterator)
* [type PayloadAdapterDefinition](#PayloadAdapterDefinition)
* [type RelationalFieldDefinition](#RelationalFieldDefinition)
  * [func NewRelationalFieldDefinition() *RelationalFieldDefinition](#NewRelationalFieldDefinition)
  * [func (f *RelationalFieldDefinition) Attribute() *design.AttributeDefinition](#RelationalFieldDefinition.Attribute)
  * [func (f RelationalFieldDefinition) Children() []dslengine.Definition](#RelationalFieldDefinition.Children)
  * [func (f *RelationalFieldDefinition) Context() string](#RelationalFieldDefinition.Context)
  * [func (f *RelationalFieldDefinition) DSL() func()](#RelationalFieldDefinition.DSL)
  * [func (f *RelationalFieldDefinition) FieldDefinition() string](#RelationalFieldDefinition.FieldDefinition)
  * [func (f *RelationalFieldDefinition) LowerName() string](#RelationalFieldDefinition.LowerName)
  * [func (f *RelationalFieldDefinition) Tags() string](#RelationalFieldDefinition.Tags)
  * [func (f *RelationalFieldDefinition) Underscore() string](#RelationalFieldDefinition.Underscore)
  * [func (field *RelationalFieldDefinition) Validate() *dslengine.ValidationErrors](#RelationalFieldDefinition.Validate)
* [type RelationalModelDefinition](#RelationalModelDefinition)
  * [func NewRelationalModelDefinition() *RelationalModelDefinition](#NewRelationalModelDefinition)
  * [func (f *RelationalModelDefinition) Attribute() *design.AttributeDefinition](#RelationalModelDefinition.Attribute)
  * [func (f RelationalModelDefinition) Children() []dslengine.Definition](#RelationalModelDefinition.Children)
  * [func (f *RelationalModelDefinition) Context() string](#RelationalModelDefinition.Context)
  * [func (f *RelationalModelDefinition) DSL() func()](#RelationalModelDefinition.DSL)
  * [func (f *RelationalModelDefinition) IterateBuildSources(it BuildSourceIterator) error](#RelationalModelDefinition.IterateBuildSources)
  * [func (f *RelationalModelDefinition) IterateFields(it FieldIterator) error](#RelationalModelDefinition.IterateFields)
  * [func (f *RelationalModelDefinition) LowerName() string](#RelationalModelDefinition.LowerName)
  * [func (f *RelationalModelDefinition) PKAttributes() string](#RelationalModelDefinition.PKAttributes)
  * [func (f *RelationalModelDefinition) PKUpdateFields(modelname string) string](#RelationalModelDefinition.PKUpdateFields)
  * [func (f *RelationalModelDefinition) PKWhere() string](#RelationalModelDefinition.PKWhere)
  * [func (f *RelationalModelDefinition) PKWhereFields() string](#RelationalModelDefinition.PKWhereFields)
  * [func (f *RelationalModelDefinition) PopulateFromModeledType()](#RelationalModelDefinition.PopulateFromModeledType)
  * [func (f *RelationalModelDefinition) Project(name, v string) *design.MediaTypeDefinition](#RelationalModelDefinition.Project)
  * [func (f *RelationalModelDefinition) StructDefinition() string](#RelationalModelDefinition.StructDefinition)
  * [func (f RelationalModelDefinition) TableName() string](#RelationalModelDefinition.TableName)
  * [func (f *RelationalModelDefinition) Underscore() string](#RelationalModelDefinition.Underscore)
  * [func (a *RelationalModelDefinition) Validate() *dslengine.ValidationErrors](#RelationalModelDefinition.Validate)
* [type RelationalStorageType](#RelationalStorageType)
* [type RelationalStoreDefinition](#RelationalStoreDefinition)
  * [func NewRelationalStoreDefinition() *RelationalStoreDefinition](#NewRelationalStoreDefinition)
  * [func (sd RelationalStoreDefinition) Children() []dslengine.Definition](#RelationalStoreDefinition.Children)
  * [func (sd *RelationalStoreDefinition) Context() string](#RelationalStoreDefinition.Context)
  * [func (sd *RelationalStoreDefinition) DSL() func()](#RelationalStoreDefinition.DSL)
  * [func (sd *RelationalStoreDefinition) IterateModels(it ModelIterator) error](#RelationalStoreDefinition.IterateModels)
  * [func (a *RelationalStoreDefinition) Validate() *dslengine.ValidationErrors](#RelationalStoreDefinition.Validate)
* [type StorageGroupDefinition](#StorageGroupDefinition)
  * [func NewStorageGroupDefinition() *StorageGroupDefinition](#NewStorageGroupDefinition)
  * [func (sd StorageGroupDefinition) Children() []dslengine.Definition](#StorageGroupDefinition.Children)
  * [func (sd StorageGroupDefinition) Context() string](#StorageGroupDefinition.Context)
  * [func (sd StorageGroupDefinition) DSL() func()](#StorageGroupDefinition.DSL)
  * [func (sd *StorageGroupDefinition) DSLName() string](#StorageGroupDefinition.DSLName)
  * [func (sd *StorageGroupDefinition) DependsOn() []dslengine.Root](#StorageGroupDefinition.DependsOn)
  * [func (sd *StorageGroupDefinition) IterateSets(iterator dslengine.SetIterator)](#StorageGroupDefinition.IterateSets)
  * [func (sd *StorageGroupDefinition) IterateStores(it StoreIterator) error](#StorageGroupDefinition.IterateStores)
  * [func (sd *StorageGroupDefinition) Reset()](#StorageGroupDefinition.Reset)
  * [func (a *StorageGroupDefinition) Validate() *dslengine.ValidationErrors](#StorageGroupDefinition.Validate)
* [type StoreIterator](#StoreIterator)
* [type UserHelperWriter](#UserHelperWriter)
  * [func NewUserHelperWriter(filename string) (*UserHelperWriter, error)](#NewUserHelperWriter)
  * [func (w *UserHelperWriter) Execute(data *UserTypeTemplateData) error](#UserHelperWriter.Execute)
* [type UserTypeAdapterDefinition](#UserTypeAdapterDefinition)
* [type UserTypeTemplateData](#UserTypeTemplateData)
* [type UserTypesWriter](#UserTypesWriter)
  * [func NewUserTypesWriter(filename string) (*UserTypesWriter, error)](#NewUserTypesWriter)
  * [func (w *UserTypesWriter) Execute(data *UserTypeTemplateData) error](#UserTypesWriter.Execute)


#### <a name="pkg-files">Package files</a>
[buildsources.go](/src/github.com/goadesign/gorma/buildsources.go) [definitions.go](/src/github.com/goadesign/gorma/definitions.go) [doc.go](/src/github.com/goadesign/gorma/doc.go) [generator.go](/src/github.com/goadesign/gorma/generator.go) [init.go](/src/github.com/goadesign/gorma/init.go) [manytomany.go](/src/github.com/goadesign/gorma/manytomany.go) [mapdefinition.go](/src/github.com/goadesign/gorma/mapdefinition.go) [relationalfield.go](/src/github.com/goadesign/gorma/relationalfield.go) [relationalmodel.go](/src/github.com/goadesign/gorma/relationalmodel.go) [relationalstore.go](/src/github.com/goadesign/gorma/relationalstore.go) [storagegroup.go](/src/github.com/goadesign/gorma/storagegroup.go) [validate.go](/src/github.com/goadesign/gorma/validate.go) [writers.go](/src/github.com/goadesign/gorma/writers.go) 


## <a name="pkg-constants">Constants</a>
``` go
const (
    // StorageGroup is the constant string used as the index in the
    // GormaConstructs map
    StorageGroup = "storagegroup"
    // MySQL is the StorageType for MySQL databases
    MySQL RelationalStorageType = "mysql"
    // Postgres is the StorageType for Postgres
    Postgres RelationalStorageType = "postgres"
    // SQLite3 is the StorageType for SQLite3 databases
    SQLite3 RelationalStorageType = "sqlite3"
    // None is For tests
    None RelationalStorageType = ""
    // Boolean is a bool field type
    Boolean FieldType = "bool"
    // Integer is an integer field type
    Integer FieldType = "integer"
    // BigInteger is a large integer field type
    BigInteger FieldType = "biginteger"
    // AutoInteger is not implemented
    AutoInteger FieldType = "auto_integer"
    // AutoBigInteger is not implemented
    AutoBigInteger FieldType = "auto_biginteger"
    // Decimal is a float field type
    Decimal FieldType = "decimal"
    // BigDecimal is a large float field type
    BigDecimal FieldType = "bigdecimal"
    // String is a varchar field type
    String FieldType = "string"
    // Text is a large string field type
    Text FieldType = "text"
    // UUID is not implemented yet
    UUID FieldType = "uuid"
    // Timestamp is a date/time field in the database
    Timestamp FieldType = "timestamp"
    // NullableTimestamp is a timestamp that may not be
    // populated.  Fields with no value will be null in the database
    NullableTimestamp FieldType = "nulltimestamp"
    // NotFound is used internally
    NotFound FieldType = "notfound"
    // HasOne is used internally
    HasOne FieldType = "hasone"
    // HasOneKey is used internally
    HasOneKey FieldType = "hasonekey"
    // HasMany is used internally
    HasMany FieldType = "hasmany"
    // HasManyKey is used internally
    HasManyKey FieldType = "hasmanykey"
    // Many2Many is used internally
    Many2Many FieldType = "many2many"
    // Many2ManyKey is used internally
    Many2ManyKey FieldType = "many2manykey"
    // BelongsTo is used internally
    BelongsTo FieldType = "belongsto"
)
```



## <a name="Generate">func</a> [Generate](/src/target/generator.go?s=642:685#L25)
``` go
func Generate() (files []string, err error)
```
Generate is the generator entry point called by the meta generator.




## <a name="BuildSource">type</a> [BuildSource](/src/target/definitions.go?s=2087:2228#L67)
``` go
type BuildSource struct {
    dslengine.Definition
    DefinitionDSL   func()
    Parent          *RelationalModelDefinition
    BuildSourceName string
}

```
BuildSource stores the BuildsFrom sources
for parsing.







### <a name="NewBuildSource">func</a> [NewBuildSource](/src/target/buildsources.go?s=82:116#L6)
``` go
func NewBuildSource() *BuildSource
```
NewBuildSource returns an initialized BuildSource





### <a name="BuildSource.Context">func</a> (\*BuildSource) [Context](/src/target/buildsources.go?s=226:264#L12)
``` go
func (f *BuildSource) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="BuildSource.DSL">func</a> (\*BuildSource) [DSL](/src/target/buildsources.go?s=426:460#L20)
``` go
func (f *BuildSource) DSL() func()
```
DSL returns this object's DSL.




## <a name="BuildSourceIterator">type</a> [BuildSourceIterator](/src/target/definitions.go?s=5046:5097#L170)
``` go
type BuildSourceIterator func(m *BuildSource) error
```
BuildSourceIterator is a function that iterates over Fields
in a RelationalModel.










## <a name="FieldIterator">type</a> [FieldIterator](/src/target/definitions.go?s=4897:4956#L166)
``` go
type FieldIterator func(m *RelationalFieldDefinition) error
```
FieldIterator is a function that iterates over Fields
in a RelationalModel.










## <a name="FieldType">type</a> [FieldType](/src/target/definitions.go?s=245:266#L12)
``` go
type FieldType string
```
FieldType is the storage data type for a database field.










## <a name="Generator">type</a> [Generator](/src/target/generator.go?s=244:569#L16)
``` go
type Generator struct {
    // contains filtered or unexported fields
}

```
Generator is the application code generator.










### <a name="Generator.Cleanup">func</a> (\*Generator) [Cleanup](/src/target/generator.go?s=2169:2198#L79)
``` go
func (g *Generator) Cleanup()
```
Cleanup removes the entire "app" directory if it was created by this generator.




### <a name="Generator.Generate">func</a> (\*Generator) [Generate](/src/target/generator.go?s=1500:1579#L54)
``` go
func (g *Generator) Generate(api *design.APIDefinition) (_ []string, err error)
```
Generate the application code, implement codegen.Generator.




## <a name="ManyToManyDefinition">type</a> [ManyToManyDefinition](/src/target/definitions.go?s=4290:4519#L147)
``` go
type ManyToManyDefinition struct {
    dslengine.Definition
    DefinitionDSL    func()
    Left             *RelationalModelDefinition
    Right            *RelationalModelDefinition
    RelationshipName string // ??
    DatabaseField    string
}

```
ManyToManyDefinition stores information about a ManyToMany
relationship between two domain objects.










### <a name="ManyToManyDefinition.LeftName">func</a> (\*ManyToManyDefinition) [LeftName](/src/target/manytomany.go?s=538:586#L23)
``` go
func (m *ManyToManyDefinition) LeftName() string
```
LeftName returns the name of the "owner" of the
m2m relationship.




### <a name="ManyToManyDefinition.LeftNamePlural">func</a> (\*ManyToManyDefinition) [LeftNamePlural](/src/target/manytomany.go?s=163:217#L11)
``` go
func (m *ManyToManyDefinition) LeftNamePlural() string
```
LeftNamePlural returns the pluralized version of
the "owner" of the m2m relationship.




### <a name="ManyToManyDefinition.LowerLeftName">func</a> (\*ManyToManyDefinition) [LowerLeftName](/src/target/manytomany.go?s=859:912#L35)
``` go
func (m *ManyToManyDefinition) LowerLeftName() string
```
LowerLeftName returns the lower case name of the "owner" of the
m2m relationship.




### <a name="ManyToManyDefinition.LowerRightName">func</a> (\*ManyToManyDefinition) [LowerRightName](/src/target/manytomany.go?s=1038:1092#L41)
``` go
func (m *ManyToManyDefinition) LowerRightName() string
```
LowerRightName returns the name of the "child" of the
m2m relationship.




### <a name="ManyToManyDefinition.RightName">func</a> (\*ManyToManyDefinition) [RightName](/src/target/manytomany.go?s=690:739#L29)
``` go
func (m *ManyToManyDefinition) RightName() string
```
RightName returns the name of the "child" of the
m2m relationship.




### <a name="ManyToManyDefinition.RightNamePlural">func</a> (\*ManyToManyDefinition) [RightNamePlural](/src/target/manytomany.go?s=360:415#L17)
``` go
func (m *ManyToManyDefinition) RightNamePlural() string
```
RightNamePlural returns the pluralized version
of the "child" of the m2m relationship.




## <a name="MapDefinition">type</a> [MapDefinition](/src/target/definitions.go?s=2301:2390#L76)
``` go
type MapDefinition struct {
    RemoteType  *design.UserTypeDefinition
    RemoteField string
}

```
MapDefinition represents field mapping to and from
Gorma models.







### <a name="NewMapDefinition">func</a> [NewMapDefinition](/src/target/mapdefinition.go?s=76:114#L5)
``` go
func NewMapDefinition() *MapDefinition
```
NewMapDefinition returns an initialized
MapDefinition.





## <a name="MediaTypeAdapterDefinition">type</a> [MediaTypeAdapterDefinition](/src/target/definitions.go?s=2529:2744#L85)
``` go
type MediaTypeAdapterDefinition struct {
    dslengine.Definition
    DefinitionDSL func()
    Name          string
    Description   string
    Left          *design.MediaTypeDefinition
    Right         *RelationalModelDefinition
}

```
MediaTypeAdapterDefinition represents the transformation of a
Goa media type into a Gorma Model.

Unimplemented at this time.










## <a name="ModelIterator">type</a> [ModelIterator](/src/target/definitions.go?s=4754:4813#L162)
``` go
type ModelIterator func(m *RelationalModelDefinition) error
```
ModelIterator is a function that iterates over Models in a
RelationalStore.










## <a name="PayloadAdapterDefinition">type</a> [PayloadAdapterDefinition](/src/target/definitions.go?s=3270:3482#L112)
``` go
type PayloadAdapterDefinition struct {
    dslengine.Definition
    DefinitionDSL func()
    Name          string
    Description   string
    Left          *design.UserTypeDefinition
    Right         *RelationalModelDefinition
}

```
PayloadAdapterDefinition represents the transformation of a Goa
Payload (which is really a UserTypeDefinition)
into a Gorma model.

Unimplemented at this time.










## <a name="RelationalFieldDefinition">type</a> [RelationalFieldDefinition](/src/target/definitions.go?s=3561:4182#L123)
``` go
type RelationalFieldDefinition struct {
    dslengine.Definition
    DefinitionDSL func()
    Parent        *RelationalModelDefinition

    FieldName         string
    TableName         string
    Datatype          FieldType
    SQLTag            string
    DatabaseFieldName string // gorm:column
    Description       string
    Nullable          bool
    PrimaryKey        bool
    Timestamp         bool
    Size              int // string field size
    BelongsTo         string
    HasOne            string
    HasMany           string
    Many2Many         string
    Mappings          map[string]*MapDefinition
    // contains filtered or unexported fields
}

```
RelationalFieldDefinition represents
a field in a relational database.







### <a name="NewRelationalFieldDefinition">func</a> [NewRelationalFieldDefinition](/src/target/relationalfield.go?s=215:277#L14)
``` go
func NewRelationalFieldDefinition() *RelationalFieldDefinition
```
NewRelationalFieldDefinition returns an initialized
RelationalFieldDefinition.





### <a name="RelationalFieldDefinition.Attribute">func</a> (\*RelationalFieldDefinition) [Attribute](/src/target/relationalfield.go?s=994:1069#L42)
``` go
func (f *RelationalFieldDefinition) Attribute() *design.AttributeDefinition
```
Attribute implements the Container interface of the goa Attribute
model.




### <a name="RelationalFieldDefinition.Children">func</a> (RelationalFieldDefinition) [Children](/src/target/relationalfield.go?s=788:856#L35)
``` go
func (f RelationalFieldDefinition) Children() []dslengine.Definition
```
Children returns a slice of this objects children.




### <a name="RelationalFieldDefinition.Context">func</a> (\*RelationalFieldDefinition) [Context](/src/target/relationalfield.go?s=446:498#L22)
``` go
func (f *RelationalFieldDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="RelationalFieldDefinition.DSL">func</a> (\*RelationalFieldDefinition) [DSL](/src/target/relationalfield.go?s=656:704#L30)
``` go
func (f *RelationalFieldDefinition) DSL() func()
```
DSL returns this object's DSL.




### <a name="RelationalFieldDefinition.FieldDefinition">func</a> (\*RelationalFieldDefinition) [FieldDefinition](/src/target/relationalfield.go?s=1145:1205#L47)
``` go
func (f *RelationalFieldDefinition) FieldDefinition() string
```
FieldDefinition returns the field's struct definition.




### <a name="RelationalFieldDefinition.LowerName">func</a> (\*RelationalFieldDefinition) [LowerName](/src/target/relationalfield.go?s=1591:1645#L62)
``` go
func (f *RelationalFieldDefinition) LowerName() string
```
LowerName returns the field name as a lowercase string.




### <a name="RelationalFieldDefinition.Tags">func</a> (\*RelationalFieldDefinition) [Tags](/src/target/relationalfield.go?s=1461:1510#L57)
``` go
func (f *RelationalFieldDefinition) Tags() string
```
Tags returns the sql and gorm struct tags for the Definition.




### <a name="RelationalFieldDefinition.Underscore">func</a> (\*RelationalFieldDefinition) [Underscore](/src/target/relationalfield.go?s=1762:1817#L67)
``` go
func (f *RelationalFieldDefinition) Underscore() string
```
Underscore returns the field name as a lowercase string in snake case.




### <a name="RelationalFieldDefinition.Validate">func</a> (\*RelationalFieldDefinition) [Validate](/src/target/validate.go?s=1569:1647#L61)
``` go
func (field *RelationalFieldDefinition) Validate() *dslengine.ValidationErrors
```
Validate tests whether the RelationalField definition is consistent.




## <a name="RelationalModelDefinition">type</a> [RelationalModelDefinition](/src/target/definitions.go?s=1113:2024#L39)
``` go
type RelationalModelDefinition struct {
    dslengine.Definition
    *design.UserTypeDefinition
    DefinitionDSL    func()
    ModelName        string
    Description      string
    GoaType          *design.MediaTypeDefinition
    Parent           *RelationalStoreDefinition
    BuiltFrom        map[string]*design.UserTypeDefinition
    BuildSources     []*BuildSource
    RenderTo         map[string]*design.MediaTypeDefinition
    BelongsTo        map[string]*RelationalModelDefinition
    HasMany          map[string]*RelationalModelDefinition
    HasOne           map[string]*RelationalModelDefinition
    ManyToMany       map[string]*ManyToManyDefinition
    Alias            string // gorm:tablename
    Cached           bool
    CacheDuration    int
    Roler            bool
    DynamicTableName bool
    SQLTag           string
    RelationalFields map[string]*RelationalFieldDefinition
    PrimaryKeys      []*RelationalFieldDefinition
    // contains filtered or unexported fields
}

```
RelationalModelDefinition implements the storage of a domain model into a
table in a relational database.







### <a name="NewRelationalModelDefinition">func</a> [NewRelationalModelDefinition](/src/target/relationalmodel.go?s=328:390#L19)
``` go
func NewRelationalModelDefinition() *RelationalModelDefinition
```
NewRelationalModelDefinition returns an initialized
RelationalModelDefinition.





### <a name="RelationalModelDefinition.Attribute">func</a> (\*RelationalModelDefinition) [Attribute](/src/target/relationalmodel.go?s=4100:4175#L136)
``` go
func (f *RelationalModelDefinition) Attribute() *design.AttributeDefinition
```
Attribute implements the Container interface of goa.




### <a name="RelationalModelDefinition.Children">func</a> (RelationalModelDefinition) [Children](/src/target/relationalmodel.go?s=1704:1772#L59)
``` go
func (f RelationalModelDefinition) Children() []dslengine.Definition
```
Children returns a slice of this objects children.




### <a name="RelationalModelDefinition.Context">func</a> (\*RelationalModelDefinition) [Context](/src/target/relationalmodel.go?s=1197:1249#L41)
``` go
func (f *RelationalModelDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="RelationalModelDefinition.DSL">func</a> (\*RelationalModelDefinition) [DSL](/src/target/relationalmodel.go?s=1404:1452#L49)
``` go
func (f *RelationalModelDefinition) DSL() func()
```
DSL returns this object's DSL.




### <a name="RelationalModelDefinition.IterateBuildSources">func</a> (\*RelationalModelDefinition) [IterateBuildSources](/src/target/relationalmodel.go?s=5188:5273#L171)
``` go
func (f *RelationalModelDefinition) IterateBuildSources(it BuildSourceIterator) error
```
IterateBuildSources runs an iterator function once per Model in the Store's model list.




### <a name="RelationalModelDefinition.IterateFields">func</a> (\*RelationalModelDefinition) [IterateFields](/src/target/relationalmodel.go?s=5486:5559#L183)
``` go
func (f *RelationalModelDefinition) IterateFields(it FieldIterator) error
```
IterateFields returns an iterator function useful for iterating through
this model's field list.




### <a name="RelationalModelDefinition.LowerName">func</a> (\*RelationalModelDefinition) [LowerName](/src/target/relationalmodel.go?s=4518:4572#L150)
``` go
func (f *RelationalModelDefinition) LowerName() string
```
LowerName returns the model name as a lowercase string.




### <a name="RelationalModelDefinition.PKAttributes">func</a> (\*RelationalModelDefinition) [PKAttributes](/src/target/relationalmodel.go?s=1997:2054#L69)
``` go
func (f *RelationalModelDefinition) PKAttributes() string
```
PKAttributes constructs a pair of field + definition strings
useful for method parameters.




### <a name="RelationalModelDefinition.PKUpdateFields">func</a> (\*RelationalModelDefinition) [PKUpdateFields](/src/target/relationalmodel.go?s=3095:3170#L101)
``` go
func (f *RelationalModelDefinition) PKUpdateFields(modelname string) string
```
PKUpdateFields returns something?  This function doesn't look useful in
current form.  Perhaps it isn't.




### <a name="RelationalModelDefinition.PKWhere">func</a> (\*RelationalModelDefinition) [PKWhere](/src/target/relationalmodel.go?s=2385:2437#L79)
``` go
func (f *RelationalModelDefinition) PKWhere() string
```
PKWhere returns an array of strings representing the where clause
of a retrieval by primary key(s) -- x = ? and y = ?.




### <a name="RelationalModelDefinition.PKWhereFields">func</a> (\*RelationalModelDefinition) [PKWhereFields](/src/target/relationalmodel.go?s=2720:2778#L90)
``` go
func (f *RelationalModelDefinition) PKWhereFields() string
```
PKWhereFields returns the fields for a where clause for the primary
keys of a model.




### <a name="RelationalModelDefinition.PopulateFromModeledType">func</a> (\*RelationalModelDefinition) [PopulateFromModeledType](/src/target/relationalmodel.go?s=6799:6860#L236)
``` go
func (f *RelationalModelDefinition) PopulateFromModeledType()
```
PopulateFromModeledType creates fields for the model
based on the goa UserTypeDefinition it models, which is
set using BuildsFrom().
This happens before fields are processed, so it's
ok to just assign without testing.




### <a name="RelationalModelDefinition.Project">func</a> (\*RelationalModelDefinition) [Project](/src/target/relationalmodel.go?s=4316:4403#L144)
``` go
func (f *RelationalModelDefinition) Project(name, v string) *design.MediaTypeDefinition
```
Project does something interesting, and I don't remember if I use it
anywhere.

TODO find out




### <a name="RelationalModelDefinition.StructDefinition">func</a> (\*RelationalModelDefinition) [StructDefinition](/src/target/relationalmodel.go?s=3459:3520#L113)
``` go
func (f *RelationalModelDefinition) StructDefinition() string
```
StructDefinition returns the struct definition for the model.




### <a name="RelationalModelDefinition.TableName">func</a> (RelationalModelDefinition) [TableName](/src/target/relationalmodel.go?s=1532:1585#L54)
``` go
func (f RelationalModelDefinition) TableName() string
```
TableName returns the TableName of the struct.




### <a name="RelationalModelDefinition.Underscore">func</a> (\*RelationalModelDefinition) [Underscore](/src/target/relationalmodel.go?s=4711:4766#L155)
``` go
func (f *RelationalModelDefinition) Underscore() string
```
Underscore returns the model name as a lowercase string in snake case.




### <a name="RelationalModelDefinition.Validate">func</a> (\*RelationalModelDefinition) [Validate](/src/target/validate.go?s=1066:1140#L43)
``` go
func (a *RelationalModelDefinition) Validate() *dslengine.ValidationErrors
```
Validate tests whether the RelationalModel definition is consistent.




## <a name="RelationalStorageType">type</a> [RelationalStorageType](/src/target/definitions.go?s=150:183#L9)
``` go
type RelationalStorageType string
```
RelationalStorageType is the type of database.










## <a name="RelationalStoreDefinition">type</a> [RelationalStoreDefinition](/src/target/definitions.go?s=654:999#L24)
``` go
type RelationalStoreDefinition struct {
    dslengine.Definition
    DefinitionDSL    func()
    Name             string
    Description      string
    Parent           *StorageGroupDefinition
    Type             RelationalStorageType
    RelationalModels map[string]*RelationalModelDefinition
    NoAutoIDFields   bool
    NoAutoTimestamps bool
    NoAutoSoftDelete bool
}

```
RelationalStoreDefinition is the parent configuration structure for Gorm relational model definitions.







### <a name="NewRelationalStoreDefinition">func</a> [NewRelationalStoreDefinition](/src/target/relationalstore.go?s=166:228#L12)
``` go
func NewRelationalStoreDefinition() *RelationalStoreDefinition
```
NewRelationalStoreDefinition returns an initialized
RelationalStoreDefinition.





### <a name="RelationalStoreDefinition.Children">func</a> (RelationalStoreDefinition) [Children](/src/target/relationalstore.go?s=754:823#L33)
``` go
func (sd RelationalStoreDefinition) Children() []dslengine.Definition
```
Children returns a slice of this objects children.




### <a name="RelationalStoreDefinition.Context">func</a> (\*RelationalStoreDefinition) [Context](/src/target/relationalstore.go?s=417:470#L20)
``` go
func (sd *RelationalStoreDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="RelationalStoreDefinition.DSL">func</a> (\*RelationalStoreDefinition) [DSL](/src/target/relationalstore.go?s=620:669#L28)
``` go
func (sd *RelationalStoreDefinition) DSL() func()
```
DSL returns this object's DSL.




### <a name="RelationalStoreDefinition.IterateModels">func</a> (\*RelationalStoreDefinition) [IterateModels](/src/target/relationalstore.go?s=1037:1111#L42)
``` go
func (sd *RelationalStoreDefinition) IterateModels(it ModelIterator) error
```
IterateModels runs an iterator function once per Model in the Store's model list.




### <a name="RelationalStoreDefinition.Validate">func</a> (\*RelationalStoreDefinition) [Validate](/src/target/validate.go?s=571:645#L25)
``` go
func (a *RelationalStoreDefinition) Validate() *dslengine.ValidationErrors
```
Validate tests whether the RelationalStore definition is consistent.




## <a name="StorageGroupDefinition">type</a> [StorageGroupDefinition](/src/target/definitions.go?s=355:546#L15)
``` go
type StorageGroupDefinition struct {
    dslengine.Definition
    DefinitionDSL    func()
    Name             string
    Description      string
    RelationalStores map[string]*RelationalStoreDefinition
}

```
StorageGroupDefinition is the parent configuration structure for Gorma definitions.


``` go
var GormaDesign *StorageGroupDefinition
```
GormaDesign is the root definition for Gorma







### <a name="NewStorageGroupDefinition">func</a> [NewStorageGroupDefinition](/src/target/storagegroup.go?s=195:251#L13)
``` go
func NewStorageGroupDefinition() *StorageGroupDefinition
```
NewStorageGroupDefinition returns an initialized
StorageGroupDefinition.





### <a name="StorageGroupDefinition.Children">func</a> (StorageGroupDefinition) [Children](/src/target/storagegroup.go?s=1279:1345#L57)
``` go
func (sd StorageGroupDefinition) Children() []dslengine.Definition
```
Children returns a slice of this objects children.




### <a name="StorageGroupDefinition.Context">func</a> (StorageGroupDefinition) [Context](/src/target/storagegroup.go?s=955:1004#L44)
``` go
func (sd StorageGroupDefinition) Context() string
```
Context returns the generic definition name used in error messages.




### <a name="StorageGroupDefinition.DSL">func</a> (StorageGroupDefinition) [DSL](/src/target/storagegroup.go?s=1149:1194#L52)
``` go
func (sd StorageGroupDefinition) DSL() func()
```
DSL returns this object's DSL.




### <a name="StorageGroupDefinition.DSLName">func</a> (\*StorageGroupDefinition) [DSLName](/src/target/storagegroup.go?s=1533:1583#L66)
``` go
func (sd *StorageGroupDefinition) DSLName() string
```
DSLName is displayed to the user when the DSL executes.




### <a name="StorageGroupDefinition.DependsOn">func</a> (\*StorageGroupDefinition) [DependsOn](/src/target/storagegroup.go?s=1708:1770#L71)
``` go
func (sd *StorageGroupDefinition) DependsOn() []dslengine.Root
```
DependsOn return the DSL roots the Gorma DSL root depends on, that's the goa API DSL.




### <a name="StorageGroupDefinition.IterateSets">func</a> (\*StorageGroupDefinition) [IterateSets](/src/target/storagegroup.go?s=1995:2072#L77)
``` go
func (sd *StorageGroupDefinition) IterateSets(iterator dslengine.SetIterator)
```
IterateSets goes over all the definition sets of the StorageGroup: the
StorageGroup definition itself, each store definition, models and fields.




### <a name="StorageGroupDefinition.IterateStores">func</a> (\*StorageGroupDefinition) [IterateStores](/src/target/storagegroup.go?s=472:543#L22)
``` go
func (sd *StorageGroupDefinition) IterateStores(it StoreIterator) error
```
IterateStores runs an iterator function once per Relational Store in the
StorageGroup's Store list.




### <a name="StorageGroupDefinition.Reset">func</a> (\*StorageGroupDefinition) [Reset](/src/target/storagegroup.go?s=2732:2773#L101)
``` go
func (sd *StorageGroupDefinition) Reset()
```
Reset resets the storage group to pre DSL execution state.




### <a name="StorageGroupDefinition.Validate">func</a> (\*StorageGroupDefinition) [Validate](/src/target/validate.go?s=142:213#L10)
``` go
func (a *StorageGroupDefinition) Validate() *dslengine.ValidationErrors
```
Validate tests whether the StorageGroup definition is consistent.




## <a name="StoreIterator">type</a> [StoreIterator](/src/target/definitions.go?s=4611:4670#L158)
``` go
type StoreIterator func(m *RelationalStoreDefinition) error
```
StoreIterator is a function that iterates over Relational Stores in a
StorageGroup.










## <a name="UserHelperWriter">type</a> [UserHelperWriter](/src/target/writers.go?s=910:996#L36)
``` go
type UserHelperWriter struct {
    *codegen.SourceFile
    UserHelperTmpl *template.Template
}

```
UserHelperWriter generate code for a goa application user types.
User types are data structures defined in the DSL with "Type".







### <a name="NewUserHelperWriter">func</a> [NewUserHelperWriter](/src/target/writers.go?s=9649:9717#L327)
``` go
func NewUserHelperWriter(filename string) (*UserHelperWriter, error)
```
NewUserHelperWriter returns a contexts code writer.
User types contain custom data structured defined in the DSL with "Type".





### <a name="UserHelperWriter.Execute">func</a> (\*UserHelperWriter) [Execute](/src/target/writers.go?s=9920:9988#L336)
``` go
func (w *UserHelperWriter) Execute(data *UserTypeTemplateData) error
```
Execute writes the code for the context types to the writer.




## <a name="UserTypeAdapterDefinition">type</a> [UserTypeAdapterDefinition](/src/target/definitions.go?s=2881:3094#L98)
``` go
type UserTypeAdapterDefinition struct {
    dslengine.Definition
    DefinitionDSL func()
    Name          string
    Description   string
    Left          *RelationalModelDefinition
    Right         *RelationalModelDefinition
}

```
UserTypeAdapterDefinition represents the transformation of a Goa
user type into a Gorma Model.

Unimplemented at this time.










## <a name="UserTypeTemplateData">type</a> [UserTypeTemplateData](/src/target/writers.go?s=354:513#L20)
``` go
type UserTypeTemplateData struct {
    APIDefinition *design.APIDefinition
    UserType      *RelationalModelDefinition
    DefaultPkg    string
    AppPkg        string
}

```
UserTypeTemplateData contains all the information used by the template to redner the
media types code.










## <a name="UserTypesWriter">type</a> [UserTypesWriter](/src/target/writers.go?s=650:771#L28)
``` go
type UserTypesWriter struct {
    *codegen.SourceFile
    UserTypeTmpl   *template.Template
    UserHelperTmpl *template.Template
}

```
UserTypesWriter generate code for a goa application user types.
User types are data structures defined in the DSL with "Type".







### <a name="NewUserTypesWriter">func</a> [NewUserTypesWriter](/src/target/writers.go?s=10667:10733#L355)
``` go
func NewUserTypesWriter(filename string) (*UserTypesWriter, error)
```
NewUserTypesWriter returns a contexts code writer.
User types contain custom data structured defined in the DSL with "Type".





### <a name="UserTypesWriter.Execute">func</a> (\*UserTypesWriter) [Execute](/src/target/writers.go?s=10935:11002#L364)
``` go
func (w *UserTypesWriter) Execute(data *UserTypeTemplateData) error
```
Execute writes the code for the context types to the writer.








- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md)
