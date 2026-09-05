import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { initDocumentPersistenceForTests, resetPersistenceForTests } from "./persist/initDocumentPersistence.js";
import { resetDocumentStoreForTests } from "./store/documentStore.js";

describe("App", () => {
  beforeEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
    await initDocumentPersistenceForTests();
  });

  afterEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
  });

  it("renders the GraphiQ heading", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "GraphiQ" })).toBeInTheDocument();
  });

  it("renders editor chrome with stencil, canvas, DSL editor, and diagnostics", async () => {
    render(<App />);

    expect(await screen.findByTestId("stencil")).toBeInTheDocument();
    expect(screen.getByText("Class")).toBeInTheDocument();
    expect(screen.getByText("Interface")).toBeInTheDocument();
    expect(screen.getByText("Enumeration")).toBeInTheDocument();
    expect(screen.getByText("Abstract class")).toBeInTheDocument();
    expect(screen.getByText("Note")).toBeInTheDocument();

    expect(screen.getByTestId("canvas-panel")).toBeInTheDocument();
    expect(screen.getByTestId("dsl-editor-panel")).toBeInTheDocument();
    expect(screen.getByTestId("diagnostics-list")).toBeInTheDocument();
    expect(screen.getByText("No issues")).toBeInTheDocument();

    await waitFor(() => {
      const editor = document.querySelector('[data-testid="dsl-editor"]');
      expect(editor).not.toBeNull();
      expect(editor?.getAttribute("contenteditable")).toBe("true");
    });
  });
});
