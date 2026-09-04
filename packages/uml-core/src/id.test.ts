import { describe, expect, it } from "vitest";
import { createId } from "./id.js";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("createId", () => {
  it("returns a UUID v4 string", () => {
    expect(createId()).toMatch(UUID_V4_PATTERN);
  });

  it("returns distinct ids on successive calls", () => {
    expect(createId()).not.toBe(createId());
  });
});
