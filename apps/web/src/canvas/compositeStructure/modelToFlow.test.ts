import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "@graphiq/uml-dsl";
import { emptyOverlay, layoutDocument } from "@graphiq/uml-layout";
import { astToModel } from "@graphiq/uml-print";
import { compositeStructureModelToFlow } from "./modelToFlow.js";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const carFixture = readFileSync(
  join(fixtureDir, "../../../../../packages/uml-dsl/src/fixtures/compositeStructure-car.dsl"),
  "utf8",
);

describe("compositeStructureModelToFlow", () => {
  it("renders frame and part nodes from the section 5.4 fixture", async () => {
    const parsed = parse("compositeStructure", carFixture);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error("expected parse to succeed");
    }

    const model = astToModel(parsed.value.ast);
    const overlay = await layoutDocument(
      "compositeStructure",
      model,
      emptyOverlay(),
      "first-open-empty-overlay",
    );
    const { nodes, edges } = compositeStructureModelToFlow(model, overlay, []);

    expect(nodes.some((node) => node.type === "csFrameNode")).toBe(true);
    expect(nodes.filter((node) => node.type === "csPartNode")).toHaveLength(2);
    expect(nodes.filter((node) => node.type === "portNode")).toHaveLength(2);
    expect(edges).toHaveLength(1);
  });
});
