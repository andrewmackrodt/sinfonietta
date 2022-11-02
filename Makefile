SHELL=/bin/bash

.PHONY: build dist install start clean

build:
	@docker build -f docker/broker/Dockerfile -t andrewmackrodt/sinfonietta .

dist: install clean-dist
	@yarn build

install:
	@yarn install

start:
	@docker run --rm \
		-e PORT=8080 \
		-p 8080:8080 \
		andrewmackrodt/sinfonietta

clean-dist:
	@if [[ -d ./build/ ]]; then \
		yarn clean ; \
	fi

clean-docker:
	@docker rmi -f andrewmackrodt/sinfonietta

clean: clean-dist clean-docker
