NODE=node
NODE_BIN=./node_modules/.bin

SRC_DIR=./src
BUILD_DIR=./build

DOCKER=sudo docker

.PHONY: docker-shell
docker-shell:
	mkdir -p build node_modules
	touch yarn.lock yarn-error.log
	
	$(DOCKER) run -it --rm \
		-v "$(abspath .)":/home/node/app:ro \
		-v "$(abspath ./node_modules)":/home/node/app/node_modules \
		-v "$(abspath ./build)":/home/node/app/build \
		-v "$(abspath ./yarn.lock)":/home/node/app/yarn.lock \
		-v "$(abspath ./yarn-error.log)":/home/node/app/yarn-error.log \
		--user node \
		node:10 bash

.PHONY: init
init:
	yarn install

.PHONY: build
build: 
	"$(NODE_BIN)"/browserify "$(SRC_DIR)"/js/main.js -o "$(BUILD_DIR)"/bundle-raw.js
	
	cat "$(BUILD_DIR)"/bundle-raw.js \
		| "$(NODE_BIN)"/browser-unpack \
		| "$(NODE_BIN)"/intreq \
		| "$(NODE_BIN)"/browser-pack > "$(BUILD_DIR)"/bundle-clean.js

	$(NODE_BIN)/uglifyjs \
		"$(BUILD_DIR)"/bundle-clean.js \
		-mc \
		--source-map="$(BUILD_DIR)"/bundle.js.map \
		--screw-ie8 \
		--stats \
		-o "$(BUILD_DIR)"/bundle.js

	$(NODE) ./inline.js > "$(BUILD_DIR)"/waves.html

.PHONY: watch
watch:
	cp "$(SRC_DIR)"/index.html "$(BUILD_DIR)"/index.html
	"$(NODE_BIN)"/watchify "$(SRC_DIR)"/js/main.js -o "$(BUILD_DIR)"/bundle.js -dv

.PHONY: clean
clean:
	rm -rvf build/*
