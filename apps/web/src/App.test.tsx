import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the GraphiQ heading", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "GraphiQ" })).toBeInTheDocument();
  });

  it("renders editor chrome with stencil, canvas, DSL editor, and diagnostics", () => {
    render(<App />);

    expect(screen.getByTestId("stencil")).toBeInTheDocument();
    expect(screen.getByText("Class")).toBeInTheDocument();
    expect(screen.getByText("Interface")).toBeInTheDocument();
    expect(screen.getByText("Enumeration")).toBeInTheDocument();
    expect(screen.getByText("Abstract class")).toBeInTheDocument();
    expect(screen.getByText("Note")).toBeInTheDocument();

    expect(screen.getByTestId("canvas-panel")).toBeInTheDocument();
    expect(screen.getByTestId("dsl-editor-panel")).toBeInTheDocument();
    expect(screen.getByTestId("diagnostics-list")).toBeInTheDocument();
    expect(screen.getByText("No issues")).toBeInTheDocument();

    const editor = document.querySelector('[data-testid="dsl-editor"]');
    expect(editor).not.toBeNull();
    expect(editor?.getAttribute("contenteditable")).toBe("true");
  });
});
