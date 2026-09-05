import { describe, expect, it } from "vitest";
import { emptyOverlay } from "@graphiq/uml-layout";
import { emptyModel } from "@graphiq/uml-model";
import { exportFilename } from "./exportFilename.js";

describe("exportFilename", () => {
  it("sanitizes the document title and uses the format extension", () => {
    expect(
      exportFilename(
        {
          id: "1",
          kind: "class",
          title: "My Diagram!",
          model: emptyModel("class"),
          overlay: emptyOverlay(),
          dsl: "diagram class\n",
        },
        "pdf",
      ),
    ).toBe("My-Diagram.pdf");
  });
});
