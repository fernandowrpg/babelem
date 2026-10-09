import { createWriteStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { ROOT, readJSON } from "./lib.mjs";

const INCLUDE = ["system.json", "module", "templates", "styles", "lang", "packs", "assets", "README.md", "CHANGELOG.md", "LICENSE"];
const DEFAULT_REPOSITORY = "fernandowrpg/babelem";

const manifest = readJSON("system.json");
const repo = process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
const tag = process.env.RELEASE_TAG || `v${manifest.version}`;
manifest.version = tag.replace(/^v/, "");
const base = `https://github.com/${repo}`;
manifest.url = base;
manifest.bugs = `${base}/issues`;
manifest.manifest = `${base}/releases/latest/download/system.json`;
manifest.download = `${base}/releases/download/${tag}/babelem.zip`;

if (!existsSync(path.join(ROOT, "packs"))) {
  console.error("✖ packs/ não encontrado: rode `npm run build:packs` antes.");
  process.exit(1);
}

const json = `${JSON.stringify(manifest, null, 2)}\n`;
const dist = path.join(ROOT, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(path.join(ROOT, "system.json"), json);
writeFileSync(path.join(dist, "system.json"), json);

const zipPath = path.join(dist, "babelem.zip");
const output = createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });
const done = new Promise((resolve, reject) => {
  output.on("close", resolve);
  archive.on("error", reject);
});
archive.pipe(output);
for (const entry of INCLUDE) {
  const full = path.join(ROOT, entry);
  if (!existsSync(full)) continue;
  if (statSync(full).isDirectory()) archive.directory(full, entry);
  else archive.file(full, { name: entry });
}
await archive.finalize();
await done;
console.log(`✔ dist/babelem.zip e dist/system.json (v${manifest.version})`);
console.log(`  manifest: ${manifest.manifest}`);
console.log(`  download: ${manifest.download}`);
