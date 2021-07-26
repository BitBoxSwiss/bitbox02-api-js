LOCAL_VENDORED_GOPATH=$(shell pwd)/gopath
GOPHERJS_GOROOT="$(shell go env GOROOT)"

dockercompile:
	docker run -v `pwd`:/bitbox02-api-js --workdir=/bitbox02-api-js --rm -it bitbox02-api-js make compile
servedemo:
	cd demo && python3 -m http.server 8000
compile:
	# GopherJS does not support go modules yet; we make an ad-hoc go root.
	# See https://github.com/gopherjs/gopherjs/issues/855
	rm -rf gopath
	mkdir gopath
	cp -aR gowrapper/vendor gopath/src
	GOPATH=$(LOCAL_VENDORED_GOPATH) GOPHERJS_GOROOT=$(GOPHERJS_GOROOT) \
       /gopherjs/gopherjs build -m ./gowrapper -o /bitbox02-api-js/src/bitbox02-api-go.js
dockerinit:
	docker build --no-cache --pull --force-rm -t bitbox02-api-js .
