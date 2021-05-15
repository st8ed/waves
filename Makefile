NODE=node
NODE_BIN=./node_modules/.bin

SRC_DIR=./src
BUILD_DIR=./build

.PHONY: build
build: 
	yarn install

	mkdir -p "$(BUILD_DIR)"
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
	cp -f "$(SRC_DIR)"/index.html "$(BUILD_DIR)"/
	cp -f "$(SRC_DIR)"/style.css "$(BUILD_DIR)"/
	"$(NODE_BIN)"/watchify "$(SRC_DIR)"/js/main.js -o "$(BUILD_DIR)"/bundle.js -dv

.PHONY: clean
clean:
	rm -rvf build/*

DOCKER=sudo docker

.PHONY: docker-shell
docker-shell:
	mkdir -p build node_modules
	touch yarn-error.log

	$(DOCKER) run -it --rm \
		-v "$(abspath .)":/home/node/app:ro \
		-v "$(abspath ./node_modules)":/home/node/app/node_modules \
		-v "$(abspath ./build)":/home/node/app/build \
		-v "$(abspath ./yarn.lock)":/home/node/app/yarn.lock \
		-v "$(abspath ./yarn-error.log)":/home/node/app/yarn-error.log \
		-w /home/node/app \
		--user node \
		node:10 bash
