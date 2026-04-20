import zlib from "node:zlib";
import { promisify } from "node:util";

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

export async function decompress(buffer, encoding) {
	if (encoding === "gzip") return gunzip(buffer);
	if (encoding === "deflate") return inflate(buffer);
	if (encoding === "br") return brotliDecompress(buffer);
	return buffer;
}
