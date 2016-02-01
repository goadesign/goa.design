+++
title="gorma/example/app"
description="godoc for gorma/example/app"
categories=["godoc"]
tags=["godoc","app"]
+++

# app
    import "github.com/goadesign/gorma/example/app"






## func AccountHref
``` go
func AccountHref(accountID interface{}) string
```
AccountHref returns the resource href.


## func BottleHref
``` go
func BottleHref(accountID, bottleID interface{}) string
```
BottleHref returns the resource href.


## func MarshalAccount
``` go
func MarshalAccount(source *Account, inErr error) (target map[string]interface{}, err error)
```
MarshalAccount validates and renders an instance of Account into a interface{}
using view "default".


## func MarshalAccountLink
``` go
func MarshalAccountLink(source *Account, inErr error) (target map[string]interface{}, err error)
```
MarshalAccountLink validates and renders an instance of Account into a interface{}
using view "link".


## func MarshalAccountTiny
``` go
func MarshalAccountTiny(source *Account, inErr error) (target map[string]interface{}, err error)
```
MarshalAccountTiny validates and renders an instance of Account into a interface{}
using view "tiny".


## func MarshalBottle
``` go
func MarshalBottle(source *Bottle, inErr error) (target map[string]interface{}, err error)
```
MarshalBottle validates and renders an instance of Bottle into a interface{}
using view "default".


## func MarshalBottleCollection
``` go
func MarshalBottleCollection(source BottleCollection, inErr error) (target []map[string]interface{}, err error)
```
MarshalBottleCollection validates and renders an instance of BottleCollection into a interface{}
using view "default".


## func MarshalBottleCollectionTiny
``` go
func MarshalBottleCollectionTiny(source BottleCollection, inErr error) (target []map[string]interface{}, err error)
```
MarshalBottleCollectionTiny validates and renders an instance of BottleCollection into a interface{}
using view "tiny".


## func MarshalBottleFull
``` go
func MarshalBottleFull(source *Bottle, inErr error) (target map[string]interface{}, err error)
```
MarshalBottleFull validates and renders an instance of Bottle into a interface{}
using view "full".


## func MarshalBottlePayload
``` go
func MarshalBottlePayload(source *BottlePayload, inErr error) (target map[string]interface{}, err error)
```
MarshalBottlePayload validates and renders an instance of BottlePayload into a interface{}


## func MarshalBottleTiny
``` go
func MarshalBottleTiny(source *Bottle, inErr error) (target map[string]interface{}, err error)
```
MarshalBottleTiny validates and renders an instance of Bottle into a interface{}
using view "tiny".


## func MountAccountController
``` go
func MountAccountController(service goa.Service, ctrl AccountController)
```
MountAccountController "mounts" a Account resource controller on the given service.


## func MountBottleController
``` go
func MountBottleController(service goa.Service, ctrl BottleController)
```
MountBottleController "mounts" a Bottle resource controller on the given service.



## type Account
``` go
type Account struct {
    // Date of creation
    CreatedAt *string `json:"created_at,omitempty"`
    // Email of account owner
    CreatedBy *string `json:"created_by,omitempty"`
    // API href of account
    Href string `json:"href"`
    // ID of account
    ID int `json:"id"`
    // Name of account
    Name string `json:"name"`
}
```
A tenant account
Identifier: application/vnd.account+json











### func (\*Account) Dump
``` go
func (mt *Account) Dump(view AccountViewEnum) (res map[string]interface{}, err error)
```
Dump produces raw data from an instance of Account running all the
validations. See LoadAccount for the definition of raw data.



### func (\*Account) Validate
``` go
func (mt *Account) Validate() (err error)
```
Validate validates the media type instance.



## type AccountController
``` go
type AccountController interface {
    goa.Controller
    Create(*CreateAccountContext) error
    Delete(*DeleteAccountContext) error
    Show(*ShowAccountContext) error
    Update(*UpdateAccountContext) error
}
```
AccountController is the controller interface for the Account actions.











## type AccountViewEnum
``` go
type AccountViewEnum string
```
Account views



``` go
const (
    // Account default view
    AccountDefaultView AccountViewEnum = "default"
    // Account link view
    AccountLinkView AccountViewEnum = "link"
    // Account tiny view
    AccountTinyView AccountViewEnum = "tiny"
)
```








## type Bottle
``` go
type Bottle struct {
    // Account that owns bottle
    Account *Account `json:"account,omitempty"`
    Color   string   `json:"color"`
    Country *string  `json:"country,omitempty"`
    // Date of creation
    CreatedAt *string `json:"created_at,omitempty"`
    // API href of bottle
    Href string `json:"href"`
    // ID of bottle
    ID   int    `json:"id"`
    Name string `json:"name"`
    // Rating of bottle between 1 and 5
    Rating    *int    `json:"rating,omitempty"`
    Region    *string `json:"region,omitempty"`
    Review    *string `json:"review,omitempty"`
    Sweetness *int    `json:"sweetness,omitempty"`
    // Date of last update
    UpdatedAt     *string `json:"updated_at,omitempty"`
    Varietal      string  `json:"varietal"`
    Vineyard      string  `json:"vineyard"`
    Vintage       string  `json:"vintage"`
    VinyardCounty *string `json:"vinyard_county,omitempty"`
}
```
A bottle of wine
Identifier: application/vnd.bottle+json











### func (\*Bottle) Dump
``` go
func (mt *Bottle) Dump(view BottleViewEnum) (res map[string]interface{}, err error)
```
Dump produces raw data from an instance of Bottle running all the
validations. See LoadBottle for the definition of raw data.



### func (\*Bottle) Validate
``` go
func (mt *Bottle) Validate() (err error)
```
Validate validates the media type instance.



## type BottleCollection
``` go
type BottleCollection []*Bottle
```
BottleCollection media type
Identifier: application/vnd.bottle+json; type=collection











### func (BottleCollection) Dump
``` go
func (mt BottleCollection) Dump(view BottleCollectionViewEnum) (res []map[string]interface{}, err error)
```
Dump produces raw data from an instance of BottleCollection running all the
validations. See LoadBottleCollection for the definition of raw data.



### func (BottleCollection) Validate
``` go
func (mt BottleCollection) Validate() (err error)
```
Validate validates the media type instance.



## type BottleCollectionViewEnum
``` go
type BottleCollectionViewEnum string
```
BottleCollection views



``` go
const (
    // BottleCollection default view
    BottleCollectionDefaultView BottleCollectionViewEnum = "default"
    // BottleCollection tiny view
    BottleCollectionTinyView BottleCollectionViewEnum = "tiny"
)
```








## type BottleController
``` go
type BottleController interface {
    goa.Controller
    Create(*CreateBottleContext) error
    Delete(*DeleteBottleContext) error
    List(*ListBottleContext) error
    Rate(*RateBottleContext) error
    Show(*ShowBottleContext) error
    Update(*UpdateBottleContext) error
}
```
BottleController is the controller interface for the Bottle actions.











## type BottlePayload
``` go
type BottlePayload struct {
    Color         *string `json:"color,omitempty"`
    Country       *string `json:"country,omitempty"`
    Myvintage     *int    `json:"myvintage,omitempty"`
    Name          *string `json:"name,omitempty"`
    Region        *string `json:"region,omitempty"`
    Review        *string `json:"review,omitempty"`
    Sweetness     *int    `json:"sweetness,omitempty"`
    Varietal      *string `json:"varietal,omitempty"`
    Vineyard      *string `json:"vineyard,omitempty"`
    VinyardCounty *string `json:"vinyard_county,omitempty"`
}
```
BottlePayload type











### func (\*BottlePayload) Validate
``` go
func (ut *BottlePayload) Validate() (err error)
```
Validate validates the type instance.



## type BottleViewEnum
``` go
type BottleViewEnum string
```
Bottle views



``` go
const (
    // Bottle default view
    BottleDefaultView BottleViewEnum = "default"
    // Bottle full view
    BottleFullView BottleViewEnum = "full"
    // Bottle tiny view
    BottleTinyView BottleViewEnum = "tiny"
)
```








## type CreateAccountContext
``` go
type CreateAccountContext struct {
    *goa.Context
    Payload *CreateAccountPayload
}
```
CreateAccountContext provides the account create action context.









### func NewCreateAccountContext
``` go
func NewCreateAccountContext(c *goa.Context) (*CreateAccountContext, error)
```
NewCreateAccountContext parses the incoming request URL and body, performs validations and creates the
context used by the account controller create action.




### func (\*CreateAccountContext) Created
``` go
func (ctx *CreateAccountContext) Created() error
```
Created sends a HTTP response with status code 201.



## type CreateAccountPayload
``` go
type CreateAccountPayload struct {
    // Name of account
    Name string `json:"name"`
}
```
CreateAccountPayload is the account create action payload.











### func (\*CreateAccountPayload) Validate
``` go
func (payload *CreateAccountPayload) Validate() (err error)
```
Validate runs the validation rules defined in the design.



## type CreateBottleContext
``` go
type CreateBottleContext struct {
    *goa.Context
    AccountID int
    Payload   *CreateBottlePayload
}
```
CreateBottleContext provides the bottle create action context.









### func NewCreateBottleContext
``` go
func NewCreateBottleContext(c *goa.Context) (*CreateBottleContext, error)
```
NewCreateBottleContext parses the incoming request URL and body, performs validations and creates the
context used by the bottle controller create action.




### func (\*CreateBottleContext) Created
``` go
func (ctx *CreateBottleContext) Created() error
```
Created sends a HTTP response with status code 201.



## type CreateBottlePayload
``` go
type CreateBottlePayload struct {
    Color         string  `json:"color"`
    Country       *string `json:"country,omitempty"`
    Myvintage     int     `json:"myvintage"`
    Name          string  `json:"name"`
    Region        *string `json:"region,omitempty"`
    Review        *string `json:"review,omitempty"`
    Sweetness     *int    `json:"sweetness,omitempty"`
    Varietal      string  `json:"varietal"`
    Vineyard      string  `json:"vineyard"`
    VinyardCounty *string `json:"vinyard_county,omitempty"`
}
```
CreateBottlePayload is the bottle create action payload.











### func (\*CreateBottlePayload) Validate
``` go
func (payload *CreateBottlePayload) Validate() (err error)
```
Validate runs the validation rules defined in the design.



## type DeleteAccountContext
``` go
type DeleteAccountContext struct {
    *goa.Context
    AccountID int
}
```
DeleteAccountContext provides the account delete action context.









### func NewDeleteAccountContext
``` go
func NewDeleteAccountContext(c *goa.Context) (*DeleteAccountContext, error)
```
NewDeleteAccountContext parses the incoming request URL and body, performs validations and creates the
context used by the account controller delete action.




### func (\*DeleteAccountContext) NoContent
``` go
func (ctx *DeleteAccountContext) NoContent() error
```
NoContent sends a HTTP response with status code 204.



### func (\*DeleteAccountContext) NotFound
``` go
func (ctx *DeleteAccountContext) NotFound() error
```
NotFound sends a HTTP response with status code 404.



## type DeleteBottleContext
``` go
type DeleteBottleContext struct {
    *goa.Context
    AccountID int
    BottleID  int
}
```
DeleteBottleContext provides the bottle delete action context.









### func NewDeleteBottleContext
``` go
func NewDeleteBottleContext(c *goa.Context) (*DeleteBottleContext, error)
```
NewDeleteBottleContext parses the incoming request URL and body, performs validations and creates the
context used by the bottle controller delete action.




### func (\*DeleteBottleContext) NoContent
``` go
func (ctx *DeleteBottleContext) NoContent() error
```
NoContent sends a HTTP response with status code 204.



### func (\*DeleteBottleContext) NotFound
``` go
func (ctx *DeleteBottleContext) NotFound() error
```
NotFound sends a HTTP response with status code 404.



## type ListBottleContext
``` go
type ListBottleContext struct {
    *goa.Context
    AccountID int
    Years     []int
}
```
ListBottleContext provides the bottle list action context.









### func NewListBottleContext
``` go
func NewListBottleContext(c *goa.Context) (*ListBottleContext, error)
```
NewListBottleContext parses the incoming request URL and body, performs validations and creates the
context used by the bottle controller list action.




### func (\*ListBottleContext) NotFound
``` go
func (ctx *ListBottleContext) NotFound() error
```
NotFound sends a HTTP response with status code 404.



### func (\*ListBottleContext) OK
``` go
func (ctx *ListBottleContext) OK(resp BottleCollection, view BottleCollectionViewEnum) error
```
OK sends a HTTP response with status code 200.



## type RateBottleContext
``` go
type RateBottleContext struct {
    *goa.Context
    AccountID int
    BottleID  int
    Payload   *RateBottlePayload
}
```
RateBottleContext provides the bottle rate action context.









### func NewRateBottleContext
``` go
func NewRateBottleContext(c *goa.Context) (*RateBottleContext, error)
```
NewRateBottleContext parses the incoming request URL and body, performs validations and creates the
context used by the bottle controller rate action.




### func (\*RateBottleContext) NoContent
``` go
func (ctx *RateBottleContext) NoContent() error
```
NoContent sends a HTTP response with status code 204.



### func (\*RateBottleContext) NotFound
``` go
func (ctx *RateBottleContext) NotFound() error
```
NotFound sends a HTTP response with status code 404.



## type RateBottlePayload
``` go
type RateBottlePayload struct {
    // Rating of bottle between 1 and 5
    Rating int `json:"rating"`
}
```
RateBottlePayload is the bottle rate action payload.











### func (\*RateBottlePayload) Validate
``` go
func (payload *RateBottlePayload) Validate() (err error)
```
Validate runs the validation rules defined in the design.



## type ShowAccountContext
``` go
type ShowAccountContext struct {
    *goa.Context
    AccountID int
}
```
ShowAccountContext provides the account show action context.









### func NewShowAccountContext
``` go
func NewShowAccountContext(c *goa.Context) (*ShowAccountContext, error)
```
NewShowAccountContext parses the incoming request URL and body, performs validations and creates the
context used by the account controller show action.




### func (\*ShowAccountContext) NotFound
``` go
func (ctx *ShowAccountContext) NotFound() error
```
NotFound sends a HTTP response with status code 404.



### func (\*ShowAccountContext) OK
``` go
func (ctx *ShowAccountContext) OK(resp *Account, view AccountViewEnum) error
```
OK sends a HTTP response with status code 200.



## type ShowBottleContext
``` go
type ShowBottleContext struct {
    *goa.Context
    AccountID int
    BottleID  int
}
```
ShowBottleContext provides the bottle show action context.









### func NewShowBottleContext
``` go
func NewShowBottleContext(c *goa.Context) (*ShowBottleContext, error)
```
NewShowBottleContext parses the incoming request URL and body, performs validations and creates the
context used by the bottle controller show action.




### func (\*ShowBottleContext) NotFound
``` go
func (ctx *ShowBottleContext) NotFound() error
```
NotFound sends a HTTP response with status code 404.



### func (\*ShowBottleContext) OK
``` go
func (ctx *ShowBottleContext) OK(resp *Bottle, view BottleViewEnum) error
```
OK sends a HTTP response with status code 200.



## type UpdateAccountContext
``` go
type UpdateAccountContext struct {
    *goa.Context
    AccountID int
    Payload   *UpdateAccountPayload
}
```
UpdateAccountContext provides the account update action context.









### func NewUpdateAccountContext
``` go
func NewUpdateAccountContext(c *goa.Context) (*UpdateAccountContext, error)
```
NewUpdateAccountContext parses the incoming request URL and body, performs validations and creates the
context used by the account controller update action.




### func (\*UpdateAccountContext) NoContent
``` go
func (ctx *UpdateAccountContext) NoContent() error
```
NoContent sends a HTTP response with status code 204.



### func (\*UpdateAccountContext) NotFound
``` go
func (ctx *UpdateAccountContext) NotFound() error
```
NotFound sends a HTTP response with status code 404.



## type UpdateAccountPayload
``` go
type UpdateAccountPayload struct {
    // Name of account
    Name string `json:"name"`
}
```
UpdateAccountPayload is the account update action payload.











### func (\*UpdateAccountPayload) Validate
``` go
func (payload *UpdateAccountPayload) Validate() (err error)
```
Validate runs the validation rules defined in the design.



## type UpdateBottleContext
``` go
type UpdateBottleContext struct {
    *goa.Context
    AccountID int
    BottleID  int
    Payload   *UpdateBottlePayload
}
```
UpdateBottleContext provides the bottle update action context.









### func NewUpdateBottleContext
``` go
func NewUpdateBottleContext(c *goa.Context) (*UpdateBottleContext, error)
```
NewUpdateBottleContext parses the incoming request URL and body, performs validations and creates the
context used by the bottle controller update action.




### func (\*UpdateBottleContext) NoContent
``` go
func (ctx *UpdateBottleContext) NoContent() error
```
NoContent sends a HTTP response with status code 204.



### func (\*UpdateBottleContext) NotFound
``` go
func (ctx *UpdateBottleContext) NotFound() error
```
NotFound sends a HTTP response with status code 404.



## type UpdateBottlePayload
``` go
type UpdateBottlePayload struct {
    Color         *string `json:"color,omitempty"`
    Country       *string `json:"country,omitempty"`
    Myvintage     *int    `json:"myvintage,omitempty"`
    Name          *string `json:"name,omitempty"`
    Region        *string `json:"region,omitempty"`
    Review        *string `json:"review,omitempty"`
    Sweetness     *int    `json:"sweetness,omitempty"`
    Varietal      *string `json:"varietal,omitempty"`
    Vineyard      *string `json:"vineyard,omitempty"`
    VinyardCounty *string `json:"vinyard_county,omitempty"`
}
```
UpdateBottlePayload is the bottle update action payload.











### func (\*UpdateBottlePayload) Validate
``` go
func (payload *UpdateBottlePayload) Validate() (err error)
```
Validate runs the validation rules defined in the design.









- - -
Generated by [godoc2md](http://godoc.org/github.com/davecheney/godoc2md))
