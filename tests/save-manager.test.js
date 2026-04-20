import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

describe('save-manager tests', () => {
  const code = fs.readFileSync('public/save-manager.js', 'utf8');

  // Set up mock environment
  const sandbox = {
    console: console,
    Blob: Blob,
    btoa: btoa,
    atob: atob,
    ArrayBuffer: ArrayBuffer,
    Uint8Array: Uint8Array,
    String: String,
    Array: Array,
    Object: Object,
    Promise: Promise,
    FileReader: class {
      readAsDataURL(blob) {
        blob.arrayBuffer().then(buffer => {
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          this.result = `data:${blob.type};base64,${base64}`;
          if (this.onload) this.onload();
        });
      }
    }
  };

  vm.createContext(sandbox);
  // Assign to globalThis to access top-level functions inside tests
  vm.runInContext(code + '; globalThis.serializeValue = serializeValue;', sandbox);

  const serializeValue = sandbox.serializeValue;

  it('serializeValue with Blob', async () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 1; view[1] = 2; view[2] = 3; view[3] = 4;

    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const result = await serializeValue(blob);

    // deepStrictEqual doesn't play well with objects from different VMs, so check properties manually
    assert.strictEqual(result.__type, 'Blob');
    assert.strictEqual(result.mime, 'application/octet-stream');
    assert.strictEqual(result.data, btoa('\x01\x02\x03\x04'));
  });

  it('serializeValue with ArrayBuffer', async () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 5; view[1] = 6; view[2] = 7; view[3] = 8;

    const result = await serializeValue(buffer);

    assert.strictEqual(result.__type, 'ArrayBuffer');
    assert.strictEqual(result.data, btoa('\x05\x06\x07\x08'));
  });

  it('serializeValue with primitive types', async () => {
    const nullResult = await serializeValue(null);
    assert.strictEqual(nullResult, null);

    const stringResult = await serializeValue('hello');
    assert.strictEqual(stringResult, 'hello');

    const numberResult = await serializeValue(42);
    assert.strictEqual(numberResult, 42);

    const booleanResult = await serializeValue(true);
    assert.strictEqual(booleanResult, true);
  });

  it('serializeValue with arrays', async () => {
    const arrayResult = await serializeValue([1, 'two', null]);

    // Check elements
    assert.strictEqual(Array.isArray(arrayResult), true);
    assert.strictEqual(arrayResult.length, 3);
    assert.strictEqual(arrayResult[0], 1);
    assert.strictEqual(arrayResult[1], 'two');
    assert.strictEqual(arrayResult[2], null);
  });

  it('serializeValue with plain objects', async () => {
    const objResult = await serializeValue({ a: 1, b: 'two' });

    assert.strictEqual(objResult.a, 1);
    assert.strictEqual(objResult.b, 'two');
  });

  it('serializeValue with nested structures', async () => {
    const buffer = new ArrayBuffer(2);
    const view = new Uint8Array(buffer);
    view[0] = 9; view[1] = 10;

    const result = await serializeValue({
      nestedArray: [buffer, { x: 10 }]
    });

    assert.strictEqual(result.nestedArray.length, 2);
    assert.strictEqual(result.nestedArray[0].__type, 'ArrayBuffer');
    assert.strictEqual(result.nestedArray[0].data, btoa('\x09\x0A'));
    assert.strictEqual(result.nestedArray[1].x, 10);
  });
});
