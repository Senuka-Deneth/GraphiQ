import { describe, expect, it } from "vitest";
import { diagramCodeFilename } from "./diagramCodeFilename.js";

describe("diagramCodeFilename", () => {
  it("uses a puml extension for sequence markup and dsl for GraphiQ source", () => {
    expect(diagramCodeFilename("Checkout", "sequence", "@startuml\nAlice -> Bob\n@enduml\n")).toBe(
      "Checkout.puml",
    );
    expect(diagramCodeFilename("Untitled class diagram", "class", "diagram class\n")).toBe(
      "Untitled-class-diagram.dsl",
    );
  });
});