import { describe, expect, it } from "vitest";
import { findToolForNotation, notationForTool } from "./edgeStyleOptions.js";

describe("findToolForNotation", () => {
  it("maps a solid hollow triangle end to generalization", () => {
    const current = notationForTool("class", "association");
    expect(
      findToolForNotation("class", current, {
        targetMarkerId: "gen-hollow-triangle",
      }),
    ).toBe("generalization");
  });

  it("maps a filled diamond start to composition", () => {
    const current = notationForTool("class", "association");
    expect(
      findToolForNotation("class", current, {
        sourceMarkerId: "comp-filled-diamond",
      }),
    ).toBe("composition");
  });

  it("returns undefined when no legal class tool has that head", () => {
    const current = notationForTool("class", "association");
    expect(
      findToolForNotation("class", current, {
        targetMarkerId: "ext-filled-triangle",
      }),
    ).toBeUndefined();
  });
});
