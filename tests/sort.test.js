import { describe, it, expect } from "vitest";
import { getTopN } from "../src/utils/sort.js";

describe("getTopN", () => {
  it("should return the top N elements in descending order", () => {
    const arr = [{val: 1}, {val: 5}, {val: 3}, {val: 4}, {val: 2}];
    const res = getTopN(arr, 3, (a) => a.val);
    expect(res).toEqual([{val: 5}, {val: 4}, {val: 3}]);
  });

  it("should handle array smaller than N", () => {
    const arr = [{val: 1}, {val: 3}];
    const res = getTopN(arr, 3, (a) => a.val);
    expect(res).toEqual([{val: 3}, {val: 1}]);
  });

  it("should handle undefined values with 0 fallback", () => {
    const arr = [{val: 1}, {}, {val: 3}];
    const res = getTopN(arr, 3, (a) => a.val);
    expect(res).toEqual([{val: 3}, {val: 1}, {}]);
  });
});
