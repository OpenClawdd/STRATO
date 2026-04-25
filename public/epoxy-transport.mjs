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
		// bare-mux expects connect() to synchronously return { send, close }.
		// We buffer messages until the WebSocket is actually live.
		const messageQueue = [];
		let ws = null;
		let isClosed = false;

		const doConnect = () => {
			if (isClosed) return;
			try {
				this.client
					.connect_websocket(null, url, protocols, requestHeaders)
					.then((socket) => {
						if (isClosed) {
							// close() was called before the WS connected
							try { socket.close?.(); } catch {}
							return;
						}
						ws = socket;

						// Fire onopen with the negotiated protocol
						if (onopen) onopen(ws.protocol || []);

						// Drain any queued messages
						while (messageQueue.length > 0) {
							const msg = messageQueue.shift();
							try { ws.send(msg); } catch (e) {
								console.warn("[EpoxyTransport] Queued send failed:", e);
							}
						}

						// Wire up message forwarding
						if (ws && typeof ws.addEventListener === "function") {
							ws.addEventListener("message", (evt) => {
								if (onmessage) onmessage(evt.data || evt);
							});
							ws.addEventListener("close", (evt) => {
								if (onclose) onclose(evt.code || 1000, evt.reason || "");
							});
							ws.addEventListener("error", () => {
								if (onerror) onerror(new Error("WebSocket error"));
							});
						}
					})
					.catch((err) => {
						if (onerror) onerror(err);
					});
			} catch (err) {
				if (onerror) onerror(err);
			}
		};

		if (!this.client) {
			this._initPromise.then(doConnect).catch(onerror || (() => {}));
		} else {
			doConnect();
		}

		// Return synchronous handles — bare-mux requires this
		return {
			send(data) {
				if (ws) {
					try { ws.send(data); } catch (e) {
						console.warn("[EpoxyTransport] Send failed:", e);
					}
				} else if (!isClosed) {
					// Buffer until WebSocket is ready
					messageQueue.push(data);
				}
			},
			close(code, reason) {
				isClosed = true;
				messageQueue.length = 0;
				if (ws) {
					try { ws.close(code, reason); } catch {}
				}
			},
		};
	}
}

