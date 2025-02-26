---
title: "Views and Result Types"
description: "Understanding how Goa handles result type views, including view computation and marshalling"
weight: 9
---

## Result Type Views Overview

Views in Goa provide a powerful way to control how result types are rendered in responses. When a method returns a result type with views:

1. The service method includes an additional view parameter
2. A dedicated views package is generated at the service level
3. View-specific validation logic is automatically generated

## View Computation Process

### Service Method Generation

When a method returns a result type with multiple views:

* The method signature includes an extra view parameter
* The generated endpoint function uses this view to create a viewed result type
* Constructors are generated to convert between regular and viewed result types

### Views Package

The generated views package at the service level contains:

* Viewed result type definitions for each method result
* Fields use pointers to enable view-specific validation
* Conversion functions between regular and viewed result types

## Marshalling and Transport

### Server-Side Response

1. The viewed result type is marshalled into a server type
2. Nil attributes are omitted from the response
3. The view name is passed in the "Goa-View" header

### Client-Side Response

1. Response is unmarshalled into the client type
2. Transformed into the viewed result type
3. View name is extracted from the "Goa-View" header
4. View-specific validation is performed
5. Viewed result type is converted back to service result type

## Default View Behavior

* If no views are defined, Goa adds a "default" view automatically
* To bypass view-specific logic, use the `Type` DSL instead of result type
* The default view includes all basic fields of the result type

## Best Practices

* Use views to control data visibility for different contexts
* Consider performance implications when designing views
* Document view behavior in your API specification
* Use meaningful view names that reflect their purpose 