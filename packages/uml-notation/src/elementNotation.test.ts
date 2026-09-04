import { describe, expect, it } from "vitest";
import { getElementNotation } from "./elementNotation.js";
import { ELEMENT_TYPES } from "./elementTypes.js";

describe("getElementNotation", () => {
  it("returns notation for all 54 element types", () => {
    expect(ELEMENT_TYPES).toHaveLength(54);

    for (const type of ELEMENT_TYPES) {
      const notation = getElementNotation(type);
      expect(notation.shape).toBeTruthy();
    }
  });

  it("does not treat abstractClass as an element type", () => {
    expect(ELEMENT_TYPES.includes("abstractClass" as never)).toBe(false);
  });

  it("uses a stick figure for actors", () => {
    expect(getElementNotation("actor")).toEqual({
      shape: "stickFigure",
      minWidth: 24,
      minHeight: 40,
    });
  });

  it("uses classifier boxes with keywords for interface and enumeration", () => {
    expect(getElementNotation("interface").keyword).toBe("«interface»");
    expect(getElementNotation("enumeration").keyword).toBe("«enumeration»");
    expect(getElementNotation("class").keyword).toBeUndefined();
  });

  it("underlines instance specification names", () => {
    expect(getElementNotation("instanceSpecification").nameUnderline).toBe(true);
  });
});
