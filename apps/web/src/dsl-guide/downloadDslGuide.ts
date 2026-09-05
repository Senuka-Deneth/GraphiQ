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
