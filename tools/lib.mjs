import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = path.join(ROOT, "src", "packs");
export const LANGS = ["pt", "en"];
export const SYSTEM_ID = "babelem";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function stableId(...parts) {
  const hash = createHash("sha256").update(parts.join(":")).digest();
  let id = "";
  for (let i = 0; i < 16; i++) id += ALPHABET[hash[i] % ALPHABET.length];
  return id;
}

export function loadSources() {
  return readdirSync(SRC)
    .filter(f => f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort()
    .map(file => ({ file, data: yaml.load(readFileSync(path.join(SRC, file), "utf8")) }));
}

export function readJSON(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

export function isBilingual(value) {
  return value && typeof value === "object" && !Array.isArray(value) && "pt" in value;
}

export function walkBilingual(node, visit, trail = []) {
  if (Array.isArray(node)) {
    node.forEach((child, i) => walkBilingual(child, visit, [...trail, i]));
    return;
  }
  if (!node || typeof node !== "object") return;
  if (isBilingual(node)) {
    visit(node, trail);
    return;
  }
  for (const [key, child] of Object.entries(node)) walkBilingual(child, visit, [...trail, key]);
}
