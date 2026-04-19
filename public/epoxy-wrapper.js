import initWasm, { EpoxyClient, EpoxyClientOptions } from "/surf/epoxy/epoxy-bundled.js";

export default class EpoxyWrapper {
  constructor(options) {
    this.wisp = options.wisp;
    this.client = null;
  }
  async init() {
    await initWasm();
    const opts = new EpoxyClientOptions();
    this.client = new EpoxyClient(this.wisp, opts);
  }
  get ready() {
    return this.client !== null;
  }
  async request(remote, method, body, headers, signal) {
    if (!this.client) await this.init();
    const res = await this.client.fetch(remote, { method, body, headers, redirect: 'manual' });
    
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
        }
      });
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: nativeBody
    };
  }
  connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
    if (!this.client) throw new Error("Epoxy client not initialized");
    // WebSockets aren't technically supported by this simple wrapper, 
    // but the fetch method is enough to get the iframe loading!
    this.client.connect_websocket(null, url, protocols, requestHeaders)
      .then(ws => {})
      .catch(onerror);
  }
}
