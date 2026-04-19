import { EpoxyClient, EpoxyClientOptions } from "/surf/epoxy/epoxy.js";

export default class EpoxyTransport extends EpoxyClient {
  constructor(arg1, arg2) {
    // Bare-Mux 2.x often does new Transport(...args)
    // If setTransport(url, [{wisp: "..."}]), arg1 is {wisp: "..."}
    // If setTransport(url, [wispUrl]), arg1 is wispUrl
    const wispUrl = typeof arg1 === 'string' ? arg1 : (arg1?.wisp || arg1?.[0]?.wisp);
    const options = new EpoxyClientOptions();
    super(wispUrl, options);
  }
}
