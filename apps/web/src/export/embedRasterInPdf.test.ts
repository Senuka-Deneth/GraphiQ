import { describe, expect, it } from "vitest";
import { embedPngBlobInPdf, embedRgbImageInPdf, imageDataToRgb } from "./embedRasterInPdf.js";

describe("embedRasterInPdf", () => {
  it("writes a PDF header and an image XObject for an RGB buffer", async () => {
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0]);
    const pdf = await embedRgbImageInPdf({
      imageWidth: 2,
      imageHeight: 2,
      rgb,
      pageWidthPt: 72,
      pageHeightPt: 72,
    });
    const text = new TextDecoder("latin1").decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Subtype /Image");
    expect(text).toContain("/MediaBox [0 0 72 72]");
    expect(text).toContain("/Im0 Do");
    expect(text).toContain("%%EOF");
  });

  it("composites translucent pixels onto white", () => {
    const data = new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 128]);
    const rgb = imageDataToRgb(data);
    expect(rgb[0]).toBe(255);
    expect(rgb[1]).toBe(255);
    expect(rgb[2]).toBe(255);
    expect(rgb[3]).toBeGreaterThan(100);
    expect(rgb[4]).toBeLessThan(160);
  });

  it("embeds a PNG blob in a one-page PDF", async () => {
    const png = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
      (char) => char.charCodeAt(0),
    );
    const pdf = await embedPngBlobInPdf(new Blob([png], { type: "image/png" }), 100, 200);
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
          return;
        }
        reject(new Error("expected array buffer"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsArrayBuffer(pdf);
    });
    expect(new TextDecoder("latin1").decode(bytes.subarray(0, 5))).toBe("%PDF-");
    expect(new TextDecoder("latin1").decode(bytes)).toContain("MediaBox");
  });
});
