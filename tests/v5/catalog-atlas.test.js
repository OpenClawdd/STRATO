import { describe, it, expect } from "vitest";
import {
  normalize,
  cleanHost,
  toURL,
  familiesFor,
  isGenericUrl
} from "../../scripts/catalog-atlas.mjs";

describe("STRATO Catalog Atlas Utilities", () => {
  describe("normalize", () => {
    it("lowercases and removes special characters", () => {
      expect(normalize("MineCraft! Classic")).toBe("minecraftclassic");
      expect(normalize("1Key_Game")).toBe("1keygame");
      expect(normalize("   Slope   ")).toBe("slope");
      expect(normalize("")).toBe("");
    });
  });

  describe("cleanHost", () => {
    it("removes www prefix and lowercases", () => {
      expect(cleanHost("WWW.Selenite.CC")).toBe("selenite.cc");
      expect(cleanHost("frogiee.com")).toBe("frogiee.com");
    });
  });

  describe("toURL", () => {
    it("handles absolute and relative URLs", () => {
      expect(toURL("https://example.com/game")).not.toBeNull();
      expect(toURL("/games/pacman")).not.toBeNull();
      expect(toURL("invalid-url-string")).toBeNull();
    });
  });

  describe("familiesFor", () => {
    it("identifies source families by metadata fields", () => {
      const g1 = { name: "Selenite Game", url: "https://example.com" };
      expect(familiesFor(g1)).toContain("selenite");

      const g2 = { name: "Test 1key Title", url: "https://example.com" };
      expect(familiesFor(g2)).toContain("1key");

      const g3 = { name: "Generic game", url: "https://example.com" };
      expect(familiesFor(g3)).toEqual(["unknown"]);
    });
  });

  describe("isGenericUrl", () => {
    it("returns true for homepages and root index paths", () => {
      expect(isGenericUrl("https://selenite.cc/")).toBe(true);
      expect(isGenericUrl("https://frogiee.com/projects")).toBe(true);
      expect(isGenericUrl("https://selenite.cc/games/pacman")).toBe(false);
    });
  });
});
