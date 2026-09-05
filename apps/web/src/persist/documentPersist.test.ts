import { emptyOverlay } from "@graphiq/uml-layout";
import { emptyModel } from "@graphiq/uml-model";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearPersistedData,
  loadDocument,
  loadLastDocument,
  saveDocument,
  setLastOpenId,
} from "./documentPersist.js";
import type { GraphiqDocument } from "../store/documentStore.js";

const sampleDocument: GraphiqDocument = {
  id: "doc-1",
  kind: "class",
  title: "Saved class",
  model: emptyModel("class"),
  overlay: emptyOverlay(),
  dsl: "diagram class Saved\n\nclass Order {\n}\n",
};

describe("documentPersist", () => {
  beforeEach(async () => {
    await clearPersistedData();
  });

  afterEach(async () => {
    await clearPersistedData();
  });

  it("round-trips a document through IndexedDB", async () => {
    await saveDocument(sampleDocument);
    const loaded = await loadDocument(sampleDocument.id);
    expect(loaded).toEqual(sampleDocument);
  });

  it("loads the last-open document by meta key", async () => {
    await saveDocument(sampleDocument);
    await setLastOpenId(sampleDocument.id);
    const loaded = await loadLastDocument();
    expect(loaded).toEqual(sampleDocument);
  });
});
