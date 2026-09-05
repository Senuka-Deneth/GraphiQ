import { addElement, emptyModel } from "@graphiq/uml-model";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLastDocument, saveDocument, setLastOpenId } from "./documentPersist.js";
import {
  hydrateDocumentStore,
  initDocumentPersistenceForTests,
  resetPersistenceForTests,
} from "./initDocumentPersistence.js";
import {
  resetDocumentStoreForTests,
  useDocumentStore,
  type GraphiqDocument,
} from "../store/documentStore.js";

describe("initDocumentPersistence", () => {
  beforeEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
  });

  afterEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
  });

  it("hydrates the last saved document into the store", async () => {
    const modelResult = addElement(emptyModel("class"), {
      elementType: "class",
      name: "Order",
    });
    expect(modelResult.ok).toBe(true);
    if (!modelResult.ok) {
      throw new Error("expected class element");
    }

    const elementId = modelResult.value.elements[0]?.id;
    if (elementId === undefined) {
      throw new Error("expected element id");
    }

    const stored: GraphiqDocument = {
      id: "persist-doc-1",
      kind: "class",
      title: "Persisted",
      model: modelResult.value,
      overlay: {
        nodes: {
          [elementId]: {
            id: elementId,
            x: 40,
            y: 80,
            width: 180,
            height: 96,
          },
        },
        edges: {},
      },
      dsl: "diagram class Persisted\n\nclass Order {\n}\n",
    };

    await saveDocument(stored);
    await setLastOpenId(stored.id);
    resetDocumentStoreForTests();
    await hydrateDocumentStore();

    const state = useDocumentStore.getState();
    expect(state.document.id).toBe(stored.id);
    expect(state.document.dsl).toContain("class Order");
    expect(state.document.overlay.nodes[elementId]).toEqual(stored.overlay.nodes[elementId]);
    expect(state.persistState).toBe("saved");
  });

  it("createDocument writes a new id as last-open", async () => {
    await initDocumentPersistenceForTests();
    useDocumentStore.getState().createDocument("object");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const lastOpen = await loadLastDocument();
    expect(lastOpen?.kind).toBe("object");
    expect(lastOpen?.id).toBe(useDocumentStore.getState().document.id);
  });
});
