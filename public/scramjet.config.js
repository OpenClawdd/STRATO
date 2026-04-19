(() => {
	self.__scramjet$config = {
		prefix: "/scram/",
		codec: self.__scramjet$codecs.base64,
		config: "/scramjet.config.js",
		bundle: "/surf/scram/scramjet.bundle.js",
		worker: "/surf/scram/scramjet.worker.js",
		client: "/surf/scram/scramjet.client.js",
		codecs: "/surf/scram/scramjet.codecs.js",
	};
})();
