import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import vm from "node:vm";

test("save-manager serializeValue", async () => {
    const code = fs.readFileSync("public/save-manager.js", "utf8");

    // Create a mock environment
    const context = {
        Blob: class Blob {
            constructor(parts, options) {
                this.parts = parts;
                this.type = options ? options.type : "";
            }
        },
        ArrayBuffer: ArrayBuffer,
        FileReader: class FileReader {
            readAsDataURL(blob) {
                // Mock implementation
                setTimeout(() => {
                    this.result = "data:" + blob.type + ";base64,mockbase64data";
                    if (typeof this.onload === 'function') {
                        this.onload({ target: this });
                    }
                }, 10);
            }
        },
        btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
        atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
        console: console,
        Promise: Promise,
        Uint8Array: Uint8Array,
        String: String
    };

    vm.createContext(context);
    vm.runInContext(code, context);

    // Call serializeValue using context
    const serializeValue = context.serializeValue;

    // Test null
    assert.strictEqual(await serializeValue(null), null);

    // Test basic scalar
    assert.strictEqual(await serializeValue(42), 42);
    assert.strictEqual(await serializeValue("hello"), "hello");
    assert.strictEqual(await serializeValue(true), true);

    // Test ArrayBuffer
    const ab = new ArrayBuffer(4);
    const view = new Uint8Array(ab);
    view[0] = 1; view[1] = 2; view[2] = 3; view[3] = 4;

    const serializedAb = await serializeValue(ab);
    assert.strictEqual(serializedAb.__type, "ArrayBuffer");
    assert.strictEqual(typeof serializedAb.data, "string");
    // Verify it contains base64 string
    assert.strictEqual(Buffer.from(serializedAb.data, 'base64').toString('binary'), Buffer.from(view).toString('binary'));

    // Test Blob
    const blob = new context.Blob([ab], { type: "application/octet-stream" });
    const serializedBlob = await serializeValue(blob);
    assert.strictEqual(serializedBlob.__type, "Blob");
    assert.strictEqual(serializedBlob.mime, "application/octet-stream");
    assert.strictEqual(serializedBlob.data, "mockbase64data");

    // Test array
    const arr = [1, blob, ab];
    const serializedArr = await serializeValue(arr);
    assert.strictEqual(serializedArr.length, 3);
    assert.strictEqual(serializedArr[0], 1);
    assert.strictEqual(serializedArr[1].__type, "Blob");
    assert.strictEqual(serializedArr[2].__type, "ArrayBuffer");

    // Test object
    const obj = { a: 1, b: blob };
    const serializedObj = await serializeValue(obj);
    assert.strictEqual(serializedObj.a, 1);
    assert.strictEqual(serializedObj.b.__type, "Blob");
});
