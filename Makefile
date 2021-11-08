dockercompile:
	docker run -v `pwd`:/bitbox02-api-js --workdir=/bitbox02-api-js --rm -it bitbox02-api-js make compile
builddemo:
	cd sandbox && npm run build
servedemo:
	cd sandbox/dist && python3 -m http.server 8000
compile:
	cd gowrapper && /gopherjs/gopherjs build -m -o /bitbox02-api-js/src/bitbox02-api-go.js
dockerinit:
	docker build --no-cache --pull --force-rm -t bitbox02-api-js .
