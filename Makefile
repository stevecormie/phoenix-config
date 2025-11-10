install:
	rm -f ~/.phoenix.js
	rm -f ~/.phoenix.debug.js
	cp -f ./src/phoenix.js ~/.phoenix.js
	ln -s ~/.phoenix.js ~/.phoenix.debug.js
