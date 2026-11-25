package design

import . "goa.design/model/dsl"

// Palette constants for Goa documentation diagrams.
// Light theme defaults - can be overridden via CSS custom properties.
// CSS variables: --mdl-<tag>-bg, --mdl-<tag>-color
const (
	// Element backgrounds
	colorPrimary       = "#5bc0eb" // goa.design brand blue - services, components
	colorStore         = "#9d89e8" // Purple - data stores
	colorQueue         = "#00cec9" // Teal - queues/streams
	colorSurlaNode     = "#1e4da8" // High-contrast blue (7.58:1 with white)
	colorSurlaVerifier = "#0f766e" // High-contrast teal (5.47:1 with white)

	// Text colors
	colorWhite = "#ffffff"

	// Relationship colors
	colorGray     = "#757575" // Muted gray - arrows
	colorSurlaRel = "#334155" // High-contrast slate (10.9:1 on light canvas)
)

// ApplyGoaStyles applies the standard Goa documentation styles.
// Call this function inside Views() to apply consistent styling.
// Elements use CSS custom properties for theming support:
//   - --mdl-goa-bg, --mdl-goa-color: services, components, tools, agents
//   - --mdl-store-bg, --mdl-store-color: data stores (cylinders)
//   - --mdl-queue-bg, --mdl-queue-color: queues/streams (pipes)
//   - --mdl-rel-default-color: relationship lines
func ApplyGoaStyles() {
	Styles(func() {
		// Primary elements - all use "goa" tag for consistent theming
		ElementStyle("goa", func() {
			Background(colorPrimary)
			Color(colorWhite)
		})

		// Data stores - cylinder shape
		ElementStyle("store", func() {
			Background(colorStore)
			Color(colorWhite)
			Shape(ShapeCylinder)
		})

		// Queues/streams - pipe shape
		ElementStyle("queue", func() {
			Background(colorQueue)
			Color(colorWhite)
			Shape(ShapePipe)
		})

		// Shape-only styles (inherit colors from "goa" tag)
		ElementStyle("folder", func() {
			Shape(ShapeFolder)
		})
		ElementStyle("person", func() {
			Shape(ShapePerson)
		})

		// Relationships
		RelationshipStyle("default", func() {
			Color(colorGray)
			Thickness(2)
		})
		RelationshipStyle("async", func() {
			Color(colorGray)
			Thickness(2)
			Dashed()
		})

		// Surla high-contrast process/container styles (WCAG AA+)
		ElementStyle("surla", func() {
			Background(colorSurlaNode)
			Color(colorWhite)
		})
		ElementStyle("surla-verifier", func() {
			Background(colorSurlaVerifier)
			Color(colorWhite)
		})
		RelationshipStyle("surla-sync", func() {
			Color(colorSurlaRel)
			Thickness(2)
		})
		RelationshipStyle("surla-async", func() {
			Color(colorSurlaRel)
			Thickness(2)
			Dashed()
		})
	})
}
