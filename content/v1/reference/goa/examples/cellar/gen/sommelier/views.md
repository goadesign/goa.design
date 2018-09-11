+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar/gen/sommelier/views"
+++


# views
`import "github.com/goadesign/goa/examples/cellar/gen/sommelier/views"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [type ComponentView](#ComponentView)
  * [func (result *ComponentView) Validate() (err error)](#ComponentView.Validate)
* [type StoredBottleCollection](#StoredBottleCollection)
  * [func (result StoredBottleCollection) Validate() (err error)](#StoredBottleCollection.Validate)
* [type StoredBottleCollectionView](#StoredBottleCollectionView)
  * [func (result StoredBottleCollectionView) Validate() (err error)](#StoredBottleCollectionView.Validate)
  * [func (result StoredBottleCollectionView) ValidateTiny() (err error)](#StoredBottleCollectionView.ValidateTiny)
* [type StoredBottleView](#StoredBottleView)
  * [func (result *StoredBottleView) Validate() (err error)](#StoredBottleView.Validate)
  * [func (result *StoredBottleView) ValidateTiny() (err error)](#StoredBottleView.ValidateTiny)
* [type WineryView](#WineryView)
  * [func (result *WineryView) Validate() (err error)](#WineryView.Validate)
  * [func (result *WineryView) ValidateTiny() (err error)](#WineryView.ValidateTiny)


#### <a name="pkg-files">Package files</a>
[view.go](/src/github.com/goadesign/goa/examples/cellar/gen/sommelier/views/view.go) 






## <a name="ComponentView">type</a> [ComponentView](/src/target/view.go?s=1420:1541#L61)
``` go
type ComponentView struct {
    // Grape varietal
    Varietal *string
    // Percentage of varietal in wine
    Percentage *uint32
}

```
ComponentView is a type that runs validations on a projected type.










### <a name="ComponentView.Validate">func</a> (\*ComponentView) [Validate](/src/target/view.go?s=6248:6299#L216)
``` go
func (result *ComponentView) Validate() (err error)
```
Validate runs the validations defined on ComponentView.




## <a name="StoredBottleCollection">type</a> [StoredBottleCollection](/src/target/view.go?s=346:474#L19)
``` go
type StoredBottleCollection struct {
    // Type to project
    Projected StoredBottleCollectionView
    // View to render
    View string
}

```
StoredBottleCollection is the viewed result type that is projected based on
a view.










### <a name="StoredBottleCollection.Validate">func</a> (StoredBottleCollection) [Validate](/src/target/view.go?s=1637:1696#L70)
``` go
func (result StoredBottleCollection) Validate() (err error)
```
Validate runs the validations defined on the viewed result type
StoredBottleCollection.




## <a name="StoredBottleCollectionView">type</a> [StoredBottleCollectionView](/src/target/view.go?s=562:613#L28)
``` go
type StoredBottleCollectionView []*StoredBottleView
```
StoredBottleCollectionView is a type that runs validations on a projected
type.










### <a name="StoredBottleCollectionView.Validate">func</a> (StoredBottleCollectionView) [Validate](/src/target/view.go?s=2045:2108#L84)
``` go
func (result StoredBottleCollectionView) Validate() (err error)
```
Validate runs the validations defined on StoredBottleCollectionView using
the "default" view.




### <a name="StoredBottleCollectionView.ValidateTiny">func</a> (StoredBottleCollectionView) [ValidateTiny](/src/target/view.go?s=2341:2408#L95)
``` go
func (result StoredBottleCollectionView) ValidateTiny() (err error)
```
ValidateTiny runs the validations defined on StoredBottleCollectionView
using the "tiny" view.




## <a name="StoredBottleView">type</a> [StoredBottleView](/src/target/view.go?s=688:1108#L31)
``` go
type StoredBottleView struct {
    // ID is the unique id of the bottle.
    ID *string
    // Name of bottle
    Name *string
    // Winery that produces wine
    Winery *WineryView
    // Vintage of bottle
    Vintage *uint32
    // Composition is the list of grape varietals and associated percentage.
    Composition []*ComponentView
    // Description of bottle
    Description *string
    // Rating of bottle from 1 (worst) to 5 (best)
    Rating *uint32
}

```
StoredBottleView is a type that runs validations on a projected type.










### <a name="StoredBottleView.Validate">func</a> (\*StoredBottleView) [Validate](/src/target/view.go?s=2634:2688#L106)
``` go
func (result *StoredBottleView) Validate() (err error)
```
Validate runs the validations defined on StoredBottleView using the
"default" view.




### <a name="StoredBottleView.ValidateTiny">func</a> (\*StoredBottleView) [ValidateTiny](/src/target/view.go?s=4472:4530#L163)
``` go
func (result *StoredBottleView) ValidateTiny() (err error)
```
ValidateTiny runs the validations defined on StoredBottleView using the
"tiny" view.




## <a name="WineryView">type</a> [WineryView](/src/target/view.go?s=1177:1348#L49)
``` go
type WineryView struct {
    // Name of winery
    Name *string
    // Region of winery
    Region *string
    // Country of winery
    Country *string
    // Winery website URL
    URL *string
}

```
WineryView is a type that runs validations on a projected type.










### <a name="WineryView.Validate">func</a> (\*WineryView) [Validate](/src/target/view.go?s=5159:5207#L184)
``` go
func (result *WineryView) Validate() (err error)
```
Validate runs the validations defined on WineryView using the "default" view.




### <a name="WineryView.ValidateTiny">func</a> (\*WineryView) [ValidateTiny](/src/target/view.go?s=6025:6077#L208)
``` go
func (result *WineryView) ValidateTiny() (err error)
```
ValidateTiny runs the validations defined on WineryView using the "tiny"
view.








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
