import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditorShell } from "./EditorShell.js";
import {
  initDocumentPersistenceForTests,
  resetPersistenceForTests,
} from "../persist/initDocumentPersistence.js";
import { resetDocumentStoreForTests } from "../store/documentStore.js";

describe("EditorShell", () => {
  beforeEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
    await initDocumentPersistenceForTests();
  });

  afterEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
  });

  it("renders the top bar, the docked sidebar, and the corner toggle islands", () => {
    render(<EditorShell />);

    expect(screen.getByRole("heading", { name: "GraphiQ" })).toBeInTheDocument();
    expect(screen.getByLabelText("Diagram title")).toBeInTheDocument();
    expect(screen.getByTestId("document-kind-badge")).toHaveTextContent("class");

    const sidebar = screen.getByTestId("stencil");
    expect(sidebar).toHaveClass("graphiq-sidebar");
    expect(sidebar).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBeInTheDocument();

    expect(screen.getByLabelText("Show DSL")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText("Show diagnostics")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps closed panels mounted but collapsed to zero size", () => {
    render(<EditorShell />);

    const dslIsland = screen.getByTestId("dsl-editor-panel");
    expect(dslIsland).toHaveClass("h-0", "w-0", "pointer-events-none");
    expect(dslIsland).not.toHaveClass("graphiq-island");

    const diagnosticsIsland = screen.getByTestId("diagnostics-list");
    expect(diagnosticsIsland).toHaveClass("h-0", "w-0");
  });

  it("names exactly one toggle button per panel state", () => {
    render(<EditorShell />);

    expect(screen.queryAllByLabelText("Hide DSL")).toHaveLength(0);
    expect(screen.queryAllByLabelText("Show DSL")).toHaveLength(1);
    expect(screen.queryAllByLabelText("Hide stencil")).toHaveLength(1);
    expect(screen.queryAllByLabelText("Show stencil")).toHaveLength(0);
  });
});
