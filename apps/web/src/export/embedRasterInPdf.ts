import { PDFDocument } from "pdf-lib";

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function pad10(offset: number): string {
  return offset.toString().padStart(10, "0");
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

async function maybeDeflate(data: Uint8Array): Promise<{ bytes: Uint8Array; flate: boolean }> {
  if (typeof CompressionStream !== "function") {
    return { bytes: data, flate: false };
  }
  try {
    const stream = new CompressionStream("deflate");
    const writer = stream.writable.getWriter();
    await writer.write(new Uint8Array(toArrayBuffer(data)));
    await writer.close();
    const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer());
    return { bytes: compressed, flate: true };
  } catch {
    return { bytes: data, flate: false };
  }
}

export type EmbedRgbInPdfOptions = {
  imageWidth: number;
  imageHeight: number;
  rgb: Uint8Array;
  pageWidthPt: number;
  pageHeightPt: number;
  draw?: { x: number; y: number; width: number; height: number };
};

export async function embedRgbImageInPdf(options: EmbedRgbInPdfOptions): Promise<Uint8Array> {
  const expected = options.imageWidth * options.imageHeight * 3;
  if (options.rgb.byteLength !== expected) {
    throw new Error("RGB buffer length does not match image size");
  }

  const draw = options.draw ?? {
    x: 0,
    y: 0,
    width: options.pageWidthPt,
    height: options.pageHeightPt,
  };
  const packed = await maybeDeflate(options.rgb);
  const filter = packed.flate ? " /Filter /FlateDecode" : "";
  const content = `q\n${draw.width} 0 0 ${draw.height} ${draw.x} ${draw.y} cm\n/Im0 Do\nQ\n`;
  const contentBytes = ascii(content);

  const objects: Uint8Array[] = [
    ascii("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    ascii("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    ascii(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${options.pageWidthPt} ${options.pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>\nendobj\n`,
    ),
    concat([
      ascii(
        `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${options.imageWidth} /Height ${options.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8${filter} /Length ${packed.bytes.byteLength} >>\nstream\n`,
      ),
      packed.bytes,
      ascii("\nendstream\nendobj\n"),
    ]),
    concat([
      ascii(`5 0 obj\n<< /Length ${contentBytes.byteLength} >>\nstream\n`),
      contentBytes,
      ascii("endstream\nendobj\n"),
    ]),
  ];

  const header = ascii("%PDF-1.4\n");
  const offsets = [0];
  let cursor = header.byteLength;
  const body: Uint8Array[] = [header];
  for (const object of objects) {
    offsets.push(cursor);
    body.push(object);
    cursor += object.byteLength;
  }

  const xrefStart = cursor;
  const xrefLines = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  for (let index = 1; index < offsets.length; index += 1) {
    xrefLines.push(`${pad10(offsets[index] ?? 0)} 00000 n `);
  }
  body.push(ascii(`${xrefLines.join("\n")}\n`));
  body.push(
    ascii(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
    ),
  );
  return concat(body);
}

export function imageDataToRgb(
  data: Uint8ClampedArray,
  background: readonly [number, number, number] = [255, 255, 255],
): Uint8Array {
  const rgb = new Uint8Array((data.length / 4) * 3);
  for (let index = 0, rgbIndex = 0; index < data.length; index += 4, rgbIndex += 3) {
    const alpha = (data[index + 3] ?? 255) / 255;
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    rgb[rgbIndex] = Math.round(red * alpha + background[0] * (1 - alpha));
    rgb[rgbIndex + 1] = Math.round(green * alpha + background[1] * (1 - alpha));
    rgb[rgbIndex + 2] = Math.round(blue * alpha + background[2] * (1 - alpha));
  }
  return rgb;
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read PNG blob"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read PNG blob"));
    reader.readAsArrayBuffer(blob);
  });
}

export async function embedPngBlobInPdf(
  png: Blob,
  pageWidthPt: number,
  pageHeightPt: number,
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(await blobToArrayBuffer(png));
  const page = pdf.addPage([pageWidthPt, pageHeightPt]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageWidthPt,
    height: pageHeightPt,
  });
  const bytes = await pdf.save({ useObjectStreams: false });
  return new Blob([toArrayBuffer(bytes)], { type: "application/pdf" });
}
