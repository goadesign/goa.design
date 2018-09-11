+++
date="2018-09-06T11:21:49-07:00"
description="github.com/goadesign/goa/examples/cellar/gen/storage/views"
+++


# views
`import "github.com/goadesign/goa/examples/cellar/gen/storage/views"`

* [Overview](#pkg-overview)
* [Index](#pkg-index)

## <a name="pkg-overview">Overview</a>



## <a name="pkg-index">Index</a>
* [type ComponentView](#ComponentView)
  * [func (result *ComponentView) Validate() (err error)](#ComponentView.Validate)
* [type StoredBottle](#StoredBottle)
  * [func (result *StoredBottle) Validate() (err error)](#StoredBottle.Validate)
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
[view.go](/src/github.com/goadesign/goa/examples/cellar/gen/storage/views/view.go) 






## <a name="ComponentView">type</a> [ComponentView](/src/target/view.go?s=1606:1727#L69)
``` go
type ComponentView struct {
    // Grape varietal
    Varietal *string
    // Percentage of varietal in wine
    Percentage *uint32
}

```
ComponentView is a type that runs validations on a projected type.










### <a name="ComponentView.Validate">func</a> (\*ComponentView) [Validate](/src/target/view.go?s=6814:6865#L237)
``` go
func (result *ComponentView) Validate() (err error)
```
Validate runs the validations defined on ComponentView.




## <a name="StoredBottle">type</a> [StoredBottle](/src/target/view.go?s=551:660#L27)
``` go
type StoredBottle struct {
    // Type to project
    Projected *StoredBottleView
    // View to render
    View string
}

```
StoredBottle is the viewed result type that is projected based on a view.










### <a name="StoredBottle.Validate">func</a> (\*StoredBottle) [Validate](/src/target/view.go?s=2212:2262#L91)
``` go
func (result *StoredBottle) Validate() (err error)
```
Validate runs the validations defined on the viewed result type StoredBottle.




## <a name="StoredBottleCollection">type</a> [StoredBottleCollection](/src/target/view.go?s=344:472#L19)
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










### <a name="StoredBottleCollection.Validate">func</a> (StoredBottleCollection) [Validate](/src/target/view.go?s=1823:1882#L78)
``` go
func (result StoredBottleCollection) Validate() (err error)
```
Validate runs the validations defined on the viewed result type
StoredBottleCollection.




## <a name="StoredBottleCollectionView">type</a> [StoredBottleCollectionView](/src/target/view.go?s=748:799#L36)
``` go
type StoredBottleCollectionView []*StoredBottleView
```
StoredBottleCollectionView is a type that runs validations on a projected
type.










### <a name="StoredBottleCollectionView.Validate">func</a> (StoredBottleCollectionView) [Validate](/src/target/view.go?s=2611:2674#L105)
``` go
func (result StoredBottleCollectionView) Validate() (err error)
```
Validate runs the validations defined on StoredBottleCollectionView using
the "default" view.




### <a name="StoredBottleCollectionView.ValidateTiny">func</a> (StoredBottleCollectionView) [ValidateTiny](/src/target/view.go?s=2907:2974#L116)
``` go
func (result StoredBottleCollectionView) ValidateTiny() (err error)
```
ValidateTiny runs the validations defined on StoredBottleCollectionView
using the "tiny" view.




## <a name="StoredBottleView">type</a> [StoredBottleView](/src/target/view.go?s=874:1294#L39)
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










### <a name="StoredBottleView.Validate">func</a> (\*StoredBottleView) [Validate](/src/target/view.go?s=3200:3254#L127)
``` go
func (result *StoredBottleView) Validate() (err error)
```
Validate runs the validations defined on StoredBottleView using the
"default" view.




### <a name="StoredBottleView.ValidateTiny">func</a> (\*StoredBottleView) [ValidateTiny](/src/target/view.go?s=5038:5096#L184)
``` go
func (result *StoredBottleView) ValidateTiny() (err error)
```
ValidateTiny runs the validations defined on StoredBottleView using the
"tiny" view.




## <a name="WineryView">type</a> [WineryView](/src/target/view.go?s=1363:1534#L57)
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










### <a name="WineryView.Validate">func</a> (\*WineryView) [Validate](/src/target/view.go?s=5725:5773#L205)
``` go
func (result *WineryView) Validate() (err error)
```
Validate runs the validations defined on WineryView using the "default" view.




### <a name="WineryView.ValidateTiny">func</a> (\*WineryView) [ValidateTiny](/src/target/view.go?s=6591:6643#L229)
``` go
func (result *WineryView) ValidateTiny() (err error)
```
ValidateTiny runs the validations defined on WineryView using the "tiny"
view.








- - -
Generated by [godoc2md](https://godoc.org/github.com/davecheney/godoc2md)
