import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initDocumentPersistenceForTests,
  resetPersistenceForTests,
} from "../persist/initDocumentPersistence.js";
import { resetDocumentStoreForTests } from "../store/documentStore.js";
import { ExportPage } from "./ExportPage.js";

describe("ExportPage", () => {
  beforeEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
    await initDocumentPersistenceForTests();
  });

  afterEach(async () => {
    await resetPersistenceForTests();
    resetDocumentStoreForTests();
  });

  it("renders format, content, and page options", () => {
    render(<ExportPage entry={{ panelWidth: 800, panelHeight: 600 }} onClose={() => undefined} />);

    expect(screen.getByTestId("export-page")).toBeInTheDocument();
    expect(screen.getByTestId("export-capture-root")).toBeInTheDocument();
    expect(screen.getByTestId("export-format-png")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("export-content-cropToContent")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("export-page-fill")).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByTestId("export-paper-size")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("export-format-pdf"));
    expect(screen.getByTestId("export-format-pdf")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByTestId("export-content-customCrop"));
    expect(screen.getByTestId("export-crop-overlay")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("export-page-size"));
    expect(screen.getByTestId("export-paper-size")).toBeInTheDocument();
    expect(screen.getByTestId("export-orientation")).toBeInTheDocument();
    expect(screen.queryByTestId("export-crop-overlay")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("export-content-fullCanvas"));
    expect(screen.getByTestId("export-content-fullCanvas")).toHaveAttribute("aria-pressed", "true");
  });
});
