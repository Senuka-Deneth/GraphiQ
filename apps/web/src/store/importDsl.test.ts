import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initDocumentPersistenceForTests, resetPersistenceForTests } from "../persist/initDocumentPersistence.js";
import { resetDocumentStoreForTests, useDocumentStore } from "../store/documentStore.js";

const CLASS_IMPORT_DSL = `diagram class StoreImport

class Alpha {
}

class Beta {
}

Alpha --|> Beta`;

const MERMAID_TEXT = `classDiagram
  Alpha --> Beta
`;

describe("importDsl", () => {
  beforeEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
    await initDocumentPersistenceForTests();
  });

  afterEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
  });

  it("parses a class document and yields class elements", async () => {
    useDocumentStore.getState().importDsl(CLASS_IMPORT_DSL);
    await useDocumentStore.getState().runParse();

    const { document, diagnostics } = useDocumentStore.getState();
    expect(diagnostics.some((diagnostic) => diagnostic.severity === "error")).toBe(false);
    expect(document.kind).toBe("class");
    expect(document.dsl).toBe(CLASS_IMPORT_DSL);
    expect(document.model.elements.filter((element) => element.elementType === "class")).toHaveLength(
      2,
    );
  });

  it("switches to activity when the imported kind differs", async () => {
    const activityDsl = `diagram activity SwitchKind

initial --> final`;
    useDocumentStore.getState().importDsl(activityDsl);
    await useDocumentStore.getState().runParse();

    const { document } = useDocumentStore.getState();
    expect(document.kind).toBe("activity");
    expect(document.dsl).toBe(activityDsl);
  });

  it("does not mutate the model when Mermaid text is imported", async () => {
    useDocumentStore.getState().importDsl(MERMAID_TEXT);

    const { document, diagnostics, lastGoodModel } = useDocumentStore.getState();
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "dsl.import-no-diagram",
          severity: "error",
        }),
      ]),
    );
    expect(document.dsl).toBe("diagram class\n");
    expect(lastGoodModel.elements).toHaveLength(0);
  });
});
