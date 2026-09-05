import { afterEach, describe, expect, it, vi } from "vitest";
import {
  confirmAndDownloadDslGuide,
  DSL_GUIDE_CONFIRM_MESSAGE,
} from "./downloadDslGuide.js";

describe("confirmAndDownloadDslGuide", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not download when the user cancels", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    expect(confirmAndDownloadDslGuide()).toBe(false);
    expect(confirm).toHaveBeenCalledWith(DSL_GUIDE_CONFIRM_MESSAGE);
    expect(click).not.toHaveBeenCalled();
  });

  it("downloads the markdown guide after confirmation", () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal("confirm", confirm);
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:graphiq-guide",
      revokeObjectURL: () => undefined,
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    expect(confirmAndDownloadDslGuide()).toBe(true);
    expect(confirm).toHaveBeenCalledWith(DSL_GUIDE_CONFIRM_MESSAGE);
    expect(click).toHaveBeenCalledTimes(1);
  });
});
