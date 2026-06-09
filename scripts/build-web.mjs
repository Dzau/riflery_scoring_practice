/* Assemble the static web app into www/ for Capacitor to wrap.
   The app has no build step — this just copies the source files that
   make up the deployable site into a clean webDir. */
import { rm, mkdir, copyFile, cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");

const FILES = [
  "index.html",
  "styles.css",
  "app.js",
  "camera.js",
  "manifest.webmanifest",
  "sw.js",
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const f of FILES) {
  await copyFile(join(root, f), join(out, f));
}
await cp(join(root, "assets"), join(out, "assets"), { recursive: true });

console.log(`Built www/ with ${FILES.length} files + assets/`);
