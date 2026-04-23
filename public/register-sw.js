"use strict";

const stockSW = "/sw.js";
const swAllowedHostnames = ["localhost", "127.0.0.1"];

async function registerSW() {
	if (!navigator.serviceWorker) {
		if (
			location.protocol !== "https:" &&
			!swAllowedHostnames.includes(location.hostname)
		)
			throw new Error("Service workers cannot be registered without https.");

		throw new Error("Your browser doesn't support service workers.");
	}

	// Register Scramjet SW (Global scope)
	const reg = await navigator.serviceWorker.register(stockSW, { scope: "/" });
    if (reg) await reg.update();

	// Register Ultraviolet SW (UV scope)
	if (typeof __uv$config !== 'undefined') {
		const uvReg = await navigator.serviceWorker.register(__uv$config.sw || "/frog/uv.sw.js", {
			scope: __uv$config.prefix || "/frog/service/",
		});
        if (uvReg) await uvReg.update();
	}
}
