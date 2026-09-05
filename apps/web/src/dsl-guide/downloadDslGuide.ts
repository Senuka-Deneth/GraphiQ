import guideText from "./graphiq-dsl-guide.md?raw";
import { downloadText } from "../export/downloadExport.js";

const GUIDE_FILENAME = "graphiq-dsl-guide.md";
const GUIDE_MIME = "text/markdown;charset=utf-8";

export function getDslGuideText(): string {
  return guideText;
}

export function downloadDslGuide(): void {
  downloadText(guideText, GUIDE_FILENAME, GUIDE_MIME);
}

export const DSL_GUIDE_CONFIRM_MESSAGE =
  "Download the GraphiQ DSL guide as graphiq-dsl-guide.md?";

export function confirmAndDownloadDslGuide(): boolean {
  if (!window.confirm(DSL_GUIDE_CONFIRM_MESSAGE)) {
    return false;
  }
  downloadDslGuide();
  return true;
}
