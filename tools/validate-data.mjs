import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { LANGS, ROOT, loadSources, readJSON, walkBilingual } from "./lib.mjs";

const errors = [];
const warnings = [];

function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, full, out);
    else out[full] = value;
  }
  return out;
}

function listFiles(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, exts));
    else if (exts.some(e => name.endsWith(e))) out.push(full);
  }
  return out;
}

const manifest = readJSON("system.json");
const langFiles = Object.fromEntries(manifest.languages.map(l => [l.lang, flatten(readJSON(l.path))]));
const [baseLang, ...otherLangs] = Object.keys(langFiles);
for (const other of otherLangs) {
  for (const key of Object.keys(langFiles[baseLang])) if (!(key in langFiles[other])) errors.push(`i18n: chave ${key} ausente em ${other}`);
  for (const key of Object.keys(langFiles[other])) if (!(key in langFiles[baseLang])) errors.push(`i18n: chave ${key} ausente em ${baseLang}`);
}

const code = [...listFiles(path.join(ROOT, "module"), [".mjs"]), ...listFiles(path.join(ROOT, "templates"), [".hbs"])];
const used = new Set();
for (const file of code) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/["'`]((?:BABELEM|TYPES)\.[A-Za-z0-9_.]+)["'`]/g)) {
    if (!match[1].endsWith(".")) used.add(match[1]);
  }
}
for (const file of code.filter(f => f.endsWith(".hbs"))) {
  try {
    Handlebars.precompile(readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(`template ${path.relative(ROOT, file)}: ${err.message.split("\n")[0]}`);
  }
}

for (const key of used) {
  if (!(key in langFiles[baseLang])) errors.push(`i18n: chave usada no código e ausente nos idiomas: ${key}`);
}

for (const { file, data } of loadSources()) {
  walkBilingual(data, (node, trail) => {
    for (const lang of LANGS) {
      if (typeof node[lang] !== "string" || !node[lang].trim()) errors.push(`${file}: ${trail.join(".")} sem texto em "${lang}"`);
    }
  });
  const keys = new Set();
  for (const entry of data.entries ?? []) {
    if (!entry.key) errors.push(`${file}: entrada sem key`);
    if (keys.has(entry.key)) errors.push(`${file}: key duplicada ${entry.key}`);
    keys.add(entry.key);
  }
  for (const lang of LANGS) {
    const packName = `${data.pack}-${lang}`;
    if (!manifest.packs.some(p => p.name === packName)) errors.push(`system.json: pacote ${packName} não declarado`);
  }
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✖ ${e}`);
  process.exit(1);
}
console.log(`✔ Dados válidos (${used.size} chaves i18n usadas, ${Object.keys(langFiles[baseLang]).length} definidas)`);
