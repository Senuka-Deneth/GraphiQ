import { describe, expect, it } from "vitest";
import { diagnosticsToLint } from "./dslLint.js";
import { sourceLocation } from "../diagnostics/sourceLocation.js";

const diagnostic = (start: number, end: number) => ({
  id: "test", ruleId: "dsl.parse", severity: "error" as const,
  message: "Expected a name.", elementIds: [], dslSpan: { start, end },
});

describe("source diagnostic locations", () => {
  it("shows accurate line and column numbers with CRLF and blank lines", () => {
    const text = "diagram activity\r\n\r\naction @";
    const start = text.indexOf("@");
    expect(sourceLocation(text, { start, end: start + 1 })).toEqual({ start, end: start + 1, line: 3, column: 8 });
    expect(diagnosticsToLint(text, [diagnostic(start, start + 1)])[0]).toMatchObject({
      from: start, to: start + 1, message: "Line 3, column 8: Expected a name.",
    });
  });

  it("keeps missing-token errors at the end of the document visible", () => {
    const text = "diagram activity\naction";
    expect(diagnosticsToLint(text, [diagnostic(text.length, text.length)])[0]).toMatchObject({
      from: text.length, to: text.length, message: "Line 2, column 7: Expected a name.",
    });
  });

  it("clamps stale ranges and ignores non-finite ranges so CodeMirror cannot crash", () => {
    expect(diagnosticsToLint("abc", [diagnostic(-2, 100)])[0]).toMatchObject({ from: 0, to: 3 });
    expect(diagnosticsToLint("abc", [diagnostic(NaN, Infinity)])).toEqual([]);
  });
});
