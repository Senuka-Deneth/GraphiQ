import { beforeEach, describe, expect, it } from "vitest";
import { resetDocumentStoreForTests, useDocumentStore } from "./documentStore.js";

describe("document title", () => {
  beforeEach(() => {
    resetDocumentStoreForTests();
  });

  it("quotes titles that contain spaces and keeps them after parsing", async () => {
    useDocumentStore.getState().setTitle("Order Domain");
    await useDocumentStore.getState().runParse();

    const { document } = useDocumentStore.getState();
    expect(document.title).toBe("Order Domain");
    expect(document.dsl.startsWith('diagram class "Order Domain"')).toBe(true);
  });
});
