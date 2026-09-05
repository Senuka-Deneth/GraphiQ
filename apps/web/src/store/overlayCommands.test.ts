import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initDocumentPersistenceForTests, resetPersistenceForTests } from "../persist/initDocumentPersistence.js";
import { resetDocumentStoreForTests, useDocumentStore } from "./documentStore.js";

describe("overlay commands", () => {
  beforeEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
    await initDocumentPersistenceForTests();
  });

  afterEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
  });

  it("updates size without reprinting DSL", async () => {
    await useDocumentStore.getState().dropStencilElement("class", 40, 40);
    const elementId = useDocumentStore.getState().document.model.elements[0]?.id;
    expect(elementId).toBeDefined();
    if (elementId === undefined) {
      throw new Error("expected dropped class");
    }

    const dslBefore = useDocumentStore.getState().document.dsl;
    useDocumentStore.getState().updateNodeSize(elementId, 240, 160);
    const overlayNode = useDocumentStore.getState().document.overlay.nodes[elementId];
    expect(overlayNode?.width).toBe(240);
    expect(overlayNode?.height).toBe(160);
    expect(useDocumentStore.getState().document.dsl).toBe(dslBefore);
  });

  it("deletes a dropped element from the model", async () => {
    await useDocumentStore.getState().dropStencilElement("class", 40, 40);
    const elementId = useDocumentStore.getState().document.model.elements[0]?.id;
    expect(elementId).toBeDefined();
    if (elementId === undefined) {
      throw new Error("expected dropped class");
    }

    await useDocumentStore.getState().deleteElements([elementId]);
    expect(useDocumentStore.getState().document.model.elements).toHaveLength(0);
  });
});
