import { describe, expect, it } from "vitest";
import { classifyLaunchResponse } from "../scripts/check-launch.mjs";

describe("check-launch route classification", () => {
  it("does not count /login redirects as launch success", () => {
    expect(classifyLaunchResponse("/play/2048", 302, "/login")).toEqual({
      ok: false,
      kind: "auth_redirect",
    });
  });

  it("reports unexpected redirects distinctly", () => {
    expect(classifyLaunchResponse("/play/2048", 302, "/somewhere")).toEqual({
      ok: false,
      kind: "unexpected_redirect",
    });
  });

  it("accepts direct non-generic launch targets", () => {
    expect(classifyLaunchResponse("/games/2048/index.html", 200, "")).toEqual({
      ok: true,
      kind: "launch_route",
    });
  });

  it("does not count the generic app shell as launch proof", () => {
    expect(classifyLaunchResponse("/?game=2048", 200, "")).toEqual({
      ok: false,
      kind: "generic_app_shell",
    });
  });
});
