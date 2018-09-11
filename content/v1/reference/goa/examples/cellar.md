+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar"
+++


# cellar
`import "github.com/goadesign/goa/examples/cellar"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)
* [Subdirectories](#pkg-subdirectories)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [Variables](#pkg-variables)
* [func NewSommelier(logger *log.Logger) sommelier.Service](#NewSommelier)
* [func NewStorage(db *bolt.DB, logger *log.Logger) (storage.Service, error)](#NewStorage)
* [func NewSwagger(logger *log.Logger) swagger.Service](#NewSwagger)
* [func StorageMultiAddDecoderFunc(mr *multipart.Reader, p *[]*storage.Bottle) error](#StorageMultiAddDecoderFunc)
* [func StorageMultiAddEncoderFunc(mw *multipart.Writer, p []*storage.Bottle) error](#StorageMultiAddEncoderFunc)
* [func StorageMultiUpdateDecoderFunc(mr *multipart.Reader, p **storage.MultiUpdatePayload) error](#StorageMultiUpdateDecoderFunc)
* [func StorageMultiUpdateEncoderFunc(mw *multipart.Writer, p *storage.MultiUpdatePayload) error](#StorageMultiUpdateEncoderFunc)
* [type Bolt](#Bolt)
  * [func NewBoltDB(client *bolt.DB) (*Bolt, error)](#NewBoltDB)
  * [func (b *Bolt) Delete(bucket, id string) error](#Bolt.Delete)
  * [func (b *Bolt) Load(bucket, id string, data interface{}) error](#Bolt.Load)
  * [func (b *Bolt) LoadAll(bucket string, data interface{}) error](#Bolt.LoadAll)
  * [func (b *Bolt) NewID(bucket string) (string, error)](#Bolt.NewID)
  * [func (b *Bolt) Save(bucket, id string, data interface{}) error](#Bolt.Save)


#### <a name="pkg-files">Package files</a>
[db.go](/src/github.com/goadesign/goa/examples/cellar/db.go) [sommelier.go](/src/github.com/goadesign/goa/examples/cellar/sommelier.go) [storage.go](/src/github.com/goadesign/goa/examples/cellar/storage.go) [swagger.go](/src/github.com/goadesign/goa/examples/cellar/swagger.go) 



## <a name="pkg-variables">Variables</a>
``` go
var ErrNotFound = fmt.Errorf("missing record")
```
ErrNotFound is the error returned when attempting to load a record that does
not exist.



## <a name="NewSommelier">func</a> [NewSommelier](/src/target/sommelier.go?s=326:381#L17)
``` go
func NewSommelier(logger *log.Logger) sommelier.Service
```
NewSommelier returns the sommelier service implementation.



## <a name="NewStorage">func</a> [NewStorage](/src/target/storage.go?s=548:621#L27)
``` go
func NewStorage(db *bolt.DB, logger *log.Logger) (storage.Service, error)
```
NewStorage returns the storage service implementation.



## <a name="NewSwagger">func</a> [NewSwagger](/src/target/swagger.go?s=303:354#L16)
``` go
func NewSwagger(logger *log.Logger) swagger.Service
```
NewSwagger returns the swagger service implementation.



## <a name="StorageMultiAddDecoderFunc">func</a> [StorageMultiAddDecoderFunc](/src/target/storage.go?s=3849:3930#L147)
``` go
func StorageMultiAddDecoderFunc(mr *multipart.Reader, p *[]*storage.Bottle) error
```
StorageMultiAddDecoderFunc implements the multipart decoder for service
"storage" endpoint "multi_add". The decoder must populate the argument p
after encoding.



## <a name="StorageMultiAddEncoderFunc">func</a> [StorageMultiAddEncoderFunc](/src/target/storage.go?s=4504:4584#L170)
``` go
func StorageMultiAddEncoderFunc(mw *multipart.Writer, p []*storage.Bottle) error
```
StorageMultiAddEncoderFunc implements the multipart encoder for service
"storage" endpoint "multi_add".



## <a name="StorageMultiUpdateDecoderFunc">func</a> [StorageMultiUpdateDecoderFunc](/src/target/storage.go?s=5851:5945#L211)
``` go
func StorageMultiUpdateDecoderFunc(mr *multipart.Reader, p **storage.MultiUpdatePayload) error
```
StorageMultiUpdateDecoderFunc implements the multipart decoder for service
"storage" endpoint "multi_update". The decoder must populate the argument p
after encoding.



## <a name="StorageMultiUpdateEncoderFunc">func</a> [StorageMultiUpdateEncoderFunc](/src/target/storage.go?s=6604:6697#L235)
``` go
func StorageMultiUpdateEncoderFunc(mw *multipart.Writer, p *storage.MultiUpdatePayload) error
```
StorageMultiUpdateEncoderFunc implements the multipart encoder for service
"storage" endpoint "multi_update".




## <a name="Bolt">type</a> [Bolt](/src/target/db.go?s=273:341#L17)
``` go
type Bolt struct {
    // contains filtered or unexported fields
}

```
Bolt is the database driver.







### <a name="NewBoltDB">func</a> [NewBoltDB](/src/target/db.go?s=418:464#L23)
``` go
func NewBoltDB(client *bolt.DB) (*Bolt, error)
```
NewBoltDB creates a Bolt DB database driver given an underlying client.





### <a name="Bolt.Delete">func</a> (\*Bolt) [Delete](/src/target/db.go?s=1496:1542#L66)
``` go
func (b *Bolt) Delete(bucket, id string) error
```
Delete deletes a record by ID.




### <a name="Bolt.Load">func</a> (\*Bolt) [Load](/src/target/db.go?s=1738:1800#L73)
``` go
func (b *Bolt) Load(bucket, id string, data interface{}) error
```
Load reads a record by ID. data is unmarshaled into and should hold a pointer.




### <a name="Bolt.LoadAll">func</a> (\*Bolt) [LoadAll](/src/target/db.go?s=2127:2188#L86)
``` go
func (b *Bolt) LoadAll(bucket string, data interface{}) error
```
LoadAll returns all the records in the given bucket. data should be a pointer
to a slice. Don't do this in a real service :-)




### <a name="Bolt.NewID">func</a> (\*Bolt) [NewID](/src/target/db.go?s=708:759#L35)
``` go
func (b *Bolt) NewID(bucket string) (string, error)
```
NewID returns a unique ID for the given bucket.




### <a name="Bolt.Save">func</a> (\*Bolt) [Save](/src/target/db.go?s=1158:1220#L51)
``` go
func (b *Bolt) Save(bucket, id string, data interface{}) error
```
Save writes the record to the DB and returns the corresponding new ID.
data must contain a value that can be marshaled by the encoding/json package.








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
