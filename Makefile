.PHONY: help serve clean build start setup update-deps prereqs diagrams diagrams-check

# Default Hugo port
PORT ?= 1313

# Default HUGO bind interface
BIND ?= localhost

# Colors for help text
BLUE := \033[34m
RESET := \033[0m

# Check for required commands
NPM := $(shell command -v npm 2> /dev/null)
CONVERT := $(shell command -v convert 2> /dev/null)

# Define Chrome path and common Chrome options
CHROME := /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
CHROME_OPTS := --headless --force-device-scale-factor=1 --default-background-color=00000000

# Target to check for npm
check-npm:
ifndef NPM
	$(error "npm is required but not installed. Please visit https://nodejs.org/ to install")
endif

# Target to check for ImageMagick
check-imagemagick:
ifndef CONVERT
	$(error "ImageMagick is required but not installed. Please run: brew install imagemagick")
endif

## Display this help message
help:
	@echo "$(BLUE)Goa Documentation Site$(RESET)"
	@echo "Available commands:"
	@echo
	@awk '/^[a-zA-Z\-\_0-9]+:/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
		if (helpMessage) { \
			helpCommand = substr($$1, 0, index($$1, ":")-1); \
			helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
			printf "  $(BLUE)%-15s$(RESET) %s\n", helpCommand, helpMessage; \
		} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)
	@echo

## Initialize Hugo modules and install dependencies
setup:
	hugo mod get -u
	hugo mod tidy

## Start the Hugo server with live reload (alias for 'serve')
start: setup serve

## Start the Hugo server with live reload
serve:
	@echo "Starting Hugo server on http://$(BIND):$(PORT)..."
	hugo server -D --bind $(BIND) -p $(PORT) --disableFastRender

## Clean generated files (public/ and resources/)
clean:
	@echo "Cleaning generated files..."
	rm -rf public/
	rm -rf resources/
	rm -rf .hugo_build.lock

## Build the site for production with minification
build: setup diagrams
	@echo "Building site..."
	hugo --minify

## Generate architecture diagrams from Model DSL
diagrams:
	@echo "Generating diagrams..."
	@cd diagrams && mdl svg goa.design/docs/diagrams -dir ../static/images/diagrams -all -compact -direction RIGHT

## Check if diagrams are up-to-date (for CI)
diagrams-check:
	@echo "Checking diagram freshness..."
	@mkdir -p /tmp/diagrams-check
	@cd diagrams && mdl svg goa.design/docs/diagrams -dir /tmp/diagrams-check -all
	@diff -r static/images/diagrams /tmp/diagrams-check || \
		(echo "Diagrams are out of date. Run 'make diagrams'" && exit 1)
	@rm -rf /tmp/diagrams-check
	@echo "Diagrams are up-to-date"

## Update npm dependencies
update-deps: check-npm  ## Update npm dependencies
	@echo "Updating npm dependencies..."
	npm update
	npm audit fix
	@echo "Dependencies updated successfully"

## Install prerequisites (npm packages, hugo)
prereqs: check-npm  ## Install prerequisites (npm, hugo)
	@echo "Installing prerequisites..."
	npm install
	go install -tags extended github.com/gohugoio/hugo@latest
	@echo "Prerequisites installed successfully"

## Create logo and variants
logo:
	@echo "Creating logos..."
	mkdir -p static/img/social
	# Generate card image
	$(CHROME) $(CHROME_OPTS) --screenshot="static/img/social/goa-card-temp.png" \
		--window-size=1200,800 file://$(PWD)/static/logo.html
	convert static/img/social/goa-card-temp.png -gravity north -crop 1200x630+0+0 static/img/social/goa-card.png
	rm static/img/social/goa-card-temp.png
	# Generate square image
	$(CHROME) $(CHROME_OPTS) --screenshot="static/img/social/goa-square-temp.png" \
		--window-size=400,500 file://$(PWD)/static/logo-square.html
	convert static/img/social/goa-square-temp.png -gravity north -crop 400x400+0+0 static/img/social/goa-square.png
	rm static/img/social/goa-square-temp.png
	# Generate banner image
	$(CHROME) $(CHROME_OPTS) --screenshot="static/img/social/goa-banner-temp.png" \
		--window-size=1000,300 file://$(PWD)/static/logo-banner.html
	convert static/img/social/goa-banner-temp.png -gravity north -crop 1000x250+0+0 static/img/social/goa-banner.png
	rm static/img/social/goa-banner-temp.png

favicons: logo check-imagemagick
	@echo "Generating favicons..."
	mkdir -p static/favicons
	convert static/img/social/goa-card.png -resize 16x16 static/favicons/favicon-16x16.png
	convert static/img/social/goa-card.png -resize 32x32 static/favicons/favicon-32x32.png
	convert static/img/social/goa-card.png -resize 192x192 static/favicons/android-chrome-192x192.png
	convert static/img/social/goa-card.png -resize 512x512 static/favicons/android-chrome-512x512.png
	convert static/img/social/goa-card.png -resize 180x180 static/favicons/apple-touch-icon.png
	convert static/img/social/goa-card.png -resize 150x150 static/favicons/mstile-150x150.png
	convert static/favicons/favicon-16x16.png static/favicons/favicon-32x32.png static/favicons/favicon.ico

.DEFAULT_GOAL := help
