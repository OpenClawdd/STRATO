import { describe, expect, it, vi } from "vitest";
import {
  applySourceUiPreference,
  normalizeSourceUi,
  sourceUiOptions,
} from "../../public/js/v5/core/source-ui.js";

function fakeBody() {
  const classes = new Set();
  const props = new Map();
  return {
    classList: {
      add: vi.fn((...names) => names.forEach((name) => classes.add(name))),
      remove: vi.fn((...names) =>
        names.forEach((name) => classes.delete(name)),
      ),
      contains: (name) => classes.has(name),
    },
    dataset: {},
    style: {
      setProperty: vi.fn((name, value) => props.set(name, value)),
      removeProperty: vi.fn((name) => props.delete(name)),
    },
  };
}

describe("source UI preferences", () => {
  it("exposes the requested source UI options", () => {
    const domains = sourceUiOptions().map((option) => option.domain);
    expect(domains).toEqual(
      expect.arrayContaining([
        "frogiesarcade.win",
        "lucideon.top",
        "1key.lol",
        "chat.deepseek.com",
        "selenite.cc",
      ]),
    );
  });

  it("normalizes unknown source UI ids to STRATO", () => {
    expect(normalizeSourceUi("frogiesarcade-win")).toBe("frogiesarcade-win");
    expect(normalizeSourceUi("missing")).toBe("strato");
  });

  it("applies source UI classes and CSS variables without navigating away", () => {
    const body = fakeBody();
    const applied = applySourceUiPreference("selenite-cc", body);

    expect(applied).toBe("selenite-cc");
    expect(body.dataset.sourceUi).toBe("selenite-cc");
    expect(body.classList.contains("source-ui-selenite")).toBe(true);
    expect(body.style.setProperty).toHaveBeenCalledWith(
      "--source-ui-accent",
      "#b6ff68",
    );
  });
});
