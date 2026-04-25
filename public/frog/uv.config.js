self.__uv$config = {
	prefix: "/frog/service/",
	bare: "/bare/",
	encodeUrl: Ultraviolet.codec.xor.encode,
	decodeUrl: Ultraviolet.codec.xor.decode,
	handler: "/frog/uv.handler.js",
	bundle: "/frog/uv.bundle.js",
	config: "/frog/uv.config.js",
	sw: "/frog/sw.js",
};
