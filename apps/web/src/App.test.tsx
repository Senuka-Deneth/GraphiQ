import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { initDocumentPersistenceForTests, resetPersistenceForTests } from "./persist/initDocumentPersistence.js";
import { resetDocumentStoreForTests, useDocumentStore } from "./store/documentStore.js";

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

  it("shows a white loading screen with blinking GraphiQ while restoring", () => {
    useDocumentStore.setState({ persistState: "loading" });
    render(<App />);

    const screenEl = screen.getByTestId("persist-state");
    expect(screenEl).toHaveAttribute("data-value", "loading");
    expect(screenEl).toHaveClass("bg-white");

    const logo = screen.getByText("GraphiQ");
    expect(logo).toHaveClass("graphiq-blink");
  });

  it("renders the GraphiQ heading", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "GraphiQ" })).toBeInTheDocument();
  });

  it("renders editor chrome with stencil, canvas, DSL editor, and diagnostics", async () => {
    render(<App />);

    expect(await screen.findByTestId("stencil")).toBeInTheDocument();
    expect(screen.getByLabelText("Class")).toBeInTheDocument();
    expect(screen.getByLabelText("Interface")).toBeInTheDocument();
    expect(screen.getByLabelText("Enumeration")).toBeInTheDocument();
    expect(screen.getByLabelText("Abstract class")).toBeInTheDocument();
    expect(screen.getByLabelText("Note")).toBeInTheDocument();
    expect(screen.getByLabelText("Text")).toBeInTheDocument();
    expect(screen.getByLabelText("Generalization")).toBeInTheDocument();

    expect(screen.getByTestId("canvas-panel")).toBeInTheDocument();
    expect(screen.getByTestId("dsl-editor-panel")).toBeInTheDocument();
    expect(screen.getByTestId("dsl-panel-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("diagnostics-list")).toBeInTheDocument();
    expect(screen.getByTestId("diagnostics-toggle")).toBeInTheDocument();
    expect(screen.getByLabelText("Show diagnostics")).toBeInTheDocument();

    await waitFor(() => {
      const editor = document.querySelector('[data-testid="dsl-editor"]');
      expect(editor).not.toBeNull();
      expect(editor?.getAttribute("contenteditable")).toBe("true");
    });
  });
});
