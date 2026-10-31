import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestContext } from "node:test";

export async function temporaryDirectory(context: TestContext): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "biodentis-storage-"));
  context.after(async () => {
    const resolved = path.resolve(directory);
    // Antes de borrar recursivamente, verificar el destino absoluto de la prueba.
    assert.equal(path.dirname(resolved).toLowerCase(), path.resolve(tmpdir()).toLowerCase());
    assert.ok(path.basename(resolved).startsWith("biodentis-storage-"));
    await rm(resolved, { recursive: true, force: true });
  });
  return directory;
}

/** EXIF de prueba: orientación 6 e IFD GPS con latitud 51°30' N. */
export function jpegWithGpsAndOrientation(jpeg: Buffer): Buffer {
  const tiff = Buffer.alloc(92);
  tiff.write("II", 0); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);
  tiff.writeUInt16LE(0x0112, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(6, 18);
  tiff.writeUInt16LE(0x8825, 22); tiff.writeUInt16LE(4, 24); tiff.writeUInt32LE(1, 26); tiff.writeUInt32LE(38, 30);
  tiff.writeUInt16LE(2, 38);
  tiff.writeUInt16LE(1, 40); tiff.writeUInt16LE(2, 42); tiff.writeUInt32LE(2, 44); tiff.write("N\0", 48);
  tiff.writeUInt16LE(2, 52); tiff.writeUInt16LE(5, 54); tiff.writeUInt32LE(3, 56); tiff.writeUInt32LE(68, 60);
  for (const [index, numerator] of [51, 30, 0].entries()) {
    tiff.writeUInt32LE(numerator, 68 + index * 8); tiff.writeUInt32LE(1, 72 + index * 8);
  }
  const exif = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const app1 = Buffer.alloc(4);
  app1.writeUInt16BE(0xffe1, 0); app1.writeUInt16BE(exif.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), app1, exif, jpeg.subarray(2)]);
}
