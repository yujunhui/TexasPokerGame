export IDENTIFY_VERSION_KEY=$(shell git rev-parse HEAD . | md5sum | cut -d' ' -f1)
compose=docker-compose -f ./docker-compose.prod.yml

help:
	@cat Makefile

build:
	${compose} build

build-api:
	${compose} build api

build-nginx:
	${compose} build nginx

start:
	${compose} up -d

start-api:
	${compose} up -d api

start-nginx:
	${compose} up -d nginx