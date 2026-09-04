import { describe, expect, it } from "vitest";
import { assertNever } from "./assertNever.js";

describe("assertNever", () => {
  it("throws when called", () => {
    expect(() => assertNever("unexpected" as never)).toThrow(
      'Unexpected value: unexpected',
    );
  });
});
