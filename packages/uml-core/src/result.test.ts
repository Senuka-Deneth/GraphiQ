import { describe, expect, it } from "vitest";
import { err, ok } from "./result.js";

describe("Result", () => {
  it("ok creates a success result", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
    if (result.ok) {
      expect(result.value).toBe(42);
    } else {
      throw new Error("expected ok result");
    }
  });

  it("err creates a failure result", () => {
    const result = err("failed");
    expect(result).toEqual({ ok: false, error: "failed" });
    if (!result.ok) {
      expect(result.error).toBe("failed");
    } else {
      throw new Error("expected err result");
    }
  });
});
