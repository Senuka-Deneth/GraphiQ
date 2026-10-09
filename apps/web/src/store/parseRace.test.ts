import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyOverlay, layoutDocument } from "@graphiq/uml-layout";
import { resetDocumentStoreForTests, useDocumentStore } from "./documentStore.js";

vi.mock("@graphiq/uml-layout", async (importOriginal) => {
  const original = await importOriginal<typeof import("@graphiq/uml-layout")>();
  return { ...original, layoutDocument: vi.fn(original.layoutDocument) };
});

describe("asynchronous parse results", () => {
  beforeEach(() => { vi.useFakeTimers(); resetDocumentStoreForTests(); });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); resetDocumentStoreForTests(); });

  it("reports failed layout without losing the previous canvas and can recover", async () => {
    vi.mocked(layoutDocument).mockRejectedValueOnce(new Error("Layout unavailable")).mockResolvedValueOnce(emptyOverlay());
    useDocumentStore.getState().setDsl("diagram class Recovery\nclass Recovery");
    await useDocumentStore.getState().runParse();
    expect(useDocumentStore.getState().diagnostics).toContainEqual(expect.objectContaining({ ruleId: "layout.failed" }));
    expect(useDocumentStore.getState().lastGoodModel.elements).toHaveLength(0);
    await useDocumentStore.getState().runParse();
    expect(useDocumentStore.getState().document.model.elements[0]?.name).toBe("Recovery");
    expect(useDocumentStore.getState().diagnostics).toEqual([]);
  });

  it("accepts layout after a viewport change and preserves the user's zoom", async () => {
    let finish!: (overlay: ReturnType<typeof emptyOverlay>) => void;
    vi.mocked(layoutDocument).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    useDocumentStore.getState().setDsl("diagram class Stable\nclass Stable");
    const pending = useDocumentStore.getState().runParse();
    const viewport = { x: 10, y: 20, zoom: 0.75 };
    useDocumentStore.getState().updateViewport(viewport);
    finish(emptyOverlay());
    await pending;
    expect(useDocumentStore.getState().document.model.elements[0]?.name).toBe("Stable");
    expect(useDocumentStore.getState().document.overlay.viewport).toEqual(viewport);
  });

  it.each(["edit", "document switch"])("does not overwrite a newer %s when old layout finishes", async (action) => {
    let finish!: (overlay: ReturnType<typeof emptyOverlay>) => void;
    vi.mocked(layoutDocument).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    useDocumentStore.getState().setDsl("diagram class Old\nclass Old");
    const pending = useDocumentStore.getState().runParse();
    if (action === "edit") {
      useDocumentStore.getState().setDsl("diagram class New\nclass New");
    } else {
      useDocumentStore.getState().createDocument("activity");
    }
    const newer = useDocumentStore.getState().document;
    finish(emptyOverlay());
    await pending;
    expect(useDocumentStore.getState().document).toBe(newer);
    expect(useDocumentStore.getState().lastGoodModel.elements).toEqual([]);
  });
});
