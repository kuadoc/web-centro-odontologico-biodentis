import { writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(webRoot, "public/images/logo-biodentis.jpg");
// Extraer el símbolo del original, sin redibujarlo ni modificar sus colores.
// El nombre completo se muestra como texto legible junto al símbolo en la UI.
const mark = await sharp(source).extract({ left: 260, top: 200, width: 480, height: 480 }).png().toBuffer();
await Promise.all([
  sharp(mark).resize(192, 192).png().toFile(path.join(webRoot, "public/images/biodentis-mark.png")),
  sharp(mark).resize(64, 64).png().toFile(path.join(webRoot, "app/icon.png")),
  sharp(mark).resize(180, 180).png().toFile(path.join(webRoot, "app/apple-icon.png")),
]);

// ICO con PNG de 16/32/48 px para navegadores que solicitan /favicon.ico.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => sharp(mark).resize(size, size).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((data, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(data.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += data.length;
});
await writeFile(path.join(webRoot, "app/favicon.ico"), Buffer.concat([header, ...images]));
console.log("Logo de interfaz, favicon e icono de Apple generados desde logo-biodentis.jpg.");
