#! /usr/bin/make
#
# Makefile for goa.design
#
all: hugo index 

hugo:
	hugo --theme=goa
index:
	grunt lunr-index

deploy:
	./deploy.sh
docker:
	docker build -t bketelsen/goaweb .
	docker push bketelsen/goaweb

