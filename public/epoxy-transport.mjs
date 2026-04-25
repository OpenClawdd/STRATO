/**
 * STRATO Epoxy Transport for bare-mux
 *
 * This is loaded by the bare-mux SharedWorker via dynamic import().
 * It must export a default class that accepts transport args.
 *
 * Usage in client code:
 *   connection.setTransport("/epoxy-transport.mjs", [{ wisp: "wss://host/wisp/" }])
 */
import initWasm, { EpoxyClient, EpoxyClientOptions } from "/surf/epoxy/epoxy-bundled.js";

let wasmReady = false;

export default class EpoxyTransport {
	constructor(arg1, arg2) {
		// bare-mux passes args from setTransport(url, args)
		// Could be: [{wisp: "..."}] or just "wispUrl"
		const wispUrl =
			typeof arg1 === "string"
				? arg1
				: arg1?.wisp || (Array.isArray(arg1) ? arg1[0]?.wisp : undefined);

		if (!wispUrl) {
			throw new Error("EpoxyTransport: No Wisp URL provided. Expected { wisp: 'wss://...' }");
		}

		this.wispUrl = wispUrl;
		this.client = null;
		this._initPromise = this._init();
	}

	async _init() {
		if (!wasmReady) {
			await initWasm();
			wasmReady = true;
		}
		const opts = new EpoxyClientOptions();
		this.client = new EpoxyClient(this.wispUrl, opts);
	}

	get ready() {
		return this.client !== null;
	}

	async request(remote, method, body, headers, signal) {
		if (!this.client) await this._initPromise;
		const res = await this.client.fetch(remote, {
			method,
			body,
			headers,
			redirect: "manual",
		});

		let nativeBody = null;
		if (res.body) {
			// Wrap WASM stream in a native browser stream to prevent DataCloneError on postMessage
			const reader = res.body.getReader();
			nativeBody = new ReadableStream({
				async pull(controller) {
					const { done, value } = await reader.read();
					if (done) {
						controller.close();
					} else {
						controller.enqueue(value);
					}
				},
				cancel() {
					reader.cancel();
				},
			});
		}

		return {
			status: res.status,
			statusText: res.statusText,
			headers: Object.fromEntries(res.headers.entries()),
			body: nativeBody,
		};
	}

	connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
		if (!this.client) {
			this._initPromise.then(() => this._connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror)).catch(onerror);
			return;
		}
		this._connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror);
	}

	_connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
		this.client
			.connect_websocket(null, url, protocols, requestHeaders)
			.then((ws) => {
				if (onopen) onopen(ws.protocol || []);
			})
			.catch((err) => {
				if (onerror) onerror(err);
			});
	}
}
