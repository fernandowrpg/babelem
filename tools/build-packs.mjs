import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { LANGS, ROOT, SYSTEM_ID, loadSources, readJSON, stableId } from "./lib.mjs";

const BUILD = path.join(ROOT, "build", "packs");
const OUT = path.join(ROOT, "packs");
const manifest = readJSON("system.json");
const STATS = { systemId: SYSTEM_ID, systemVersion: manifest.version, coreVersion: "13.345" };

const ICONS = {
  essence: "icons/svg/eye.svg",
  trait: "icons/svg/upgrade.svg",
  technique: "icons/svg/sword.svg",
  style: "icons/svg/shield.svg",
  gear: "icons/svg/item-bag.svg",
  interaction: "icons/svg/dice-target.svg",
  spell: { oblivo: "icons/svg/ice-aura.svg", litura: "icons/svg/fire.svg" },
  threat: { litura: "icons/svg/terror.svg", oblivo: "icons/svg/skull.svg", babelem: "icons/svg/mystery-man.svg", other: "icons/svg/mystery-man.svg" },
  journal: "icons/svg/book.svg"
};

const PACK_LABEL_ORDER = ["essences", "traits", "techniques", "spells", "styles"];

function t(value, lang) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  return value[lang] ?? value.pt ?? "";
}

function html(value, lang) {
  const text = t(value, lang).trim();
  if (!text) return "";
  if (text.startsWith("<")) return text;
  return text.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, " ").trim()}</p>`).join("");
}

function flags(list = []) {
  return { kinetic: list.includes("kinetic"), void: list.includes("void"), energy: list.includes("energy") };
}

function testData(test = {}) {
  return {
    attack: test.attack ?? "",
    attribute: test.attribute ?? "",
    alt: test.alt ?? "",
    bonus: test.bonus ?? 0,
    damageType: test.damageType ?? "kinetic"
  };
}

function baseDoc(id, key, name, extra = {}) {
  return { _id: id, _key: key, name, folder: null, sort: 0, ownership: { default: 0 }, flags: {}, _stats: { ...STATS }, ...extra };
}

function itemSystem(entry, lang) {
  const common = { description: html(entry.description, lang), d66: entry.d66 ?? "", sourceKey: entry.key };
  switch (entry.itemType) {
    case "essence":
      return { ...common, triggers: (entry.triggers ?? []).map(tr => t(tr, lang)) };
    case "trait":
      return {
        ...common,
        tracker: {
          enabled: !!entry.tracker,
          label: t(entry.tracker?.label, lang),
          value: 0,
          max: entry.tracker?.max ?? 0
        },
        resistances: flags(entry.resistances)
      };
    case "technique":
      return {
        ...common,
        techType: entry.techType ?? "atq",
        cost: { value: entry.cost?.value ?? 0, resource: entry.cost?.resource ?? "none", channel: !!entry.cost?.channel },
        test: testData(entry.test),
        restriction: { type: "none", text: "", benefit: "" }
      };
    case "spell":
      return {
        ...common,
        plane: entry.plane,
        activation: entry.activation ?? "action",
        cost: { value: entry.cost?.value ?? 0, resource: entry.cost?.resource ?? "aura", perTurn: !!entry.cost?.perTurn },
        extraCost: { value: entry.extraCost?.value ?? 0, resource: entry.extraCost?.resource ?? "aura" },
        extraRelease: html(entry.extraRelease, lang),
        test: testData(entry.test),
        restriction: { type: "none", text: "", benefit: "" }
      };
    case "style":
      return common;
    case "gear":
      return { ...common, quantity: entry.quantity ?? 1 };
    case "interaction":
      return {
        ...common,
        kind: entry.kind ?? "action",
        attack: entry.attack ?? "",
        range: entry.range ?? "",
        cost: { value: entry.cost?.value ?? 0, resource: entry.cost?.resource ?? "none" },
        damage: entry.damage ?? "",
        damageType: entry.damageType ?? "kinetic",
        pierce: !!entry.pierce
      };
    default:
      throw new Error(`Tipo de item desconhecido: ${entry.itemType} (${entry.key})`);
  }
}

function itemImg(entry) {
  const icon = ICONS[entry.itemType];
  if (entry.img) return entry.img;
  if (typeof icon === "object") return icon[entry.plane] ?? "icons/svg/item-bag.svg";
  return icon ?? "icons/svg/item-bag.svg";
}

function buildFolders(source, lang, docType) {
  const map = {};
  const docs = (source.folders ?? []).map((folder, i) => {
    const id = stableId(source.pack, lang, "folder", folder.key);
    map[folder.key] = id;
    return {
      _id: id,
      _key: `!folders!${id}`,
      name: t(folder.name, lang),
      type: docType,
      folder: null,
      sorting: "m",
      sort: (i + 1) * 100000,
      color: null,
      description: "",
      flags: {},
      _stats: { ...STATS }
    };
  });
  return { docs, map };
}

function folderFor(entry, source, folderMap) {
  if (entry.folder) return folderMap[entry.folder] ?? null;
  if (entry.itemType === "technique" && folderMap[entry.techType]) return folderMap[entry.techType];
  if (entry.itemType === "spell" && folderMap[entry.plane]) return folderMap[entry.plane];
  return null;
}

function buildItems(source, lang, index) {
  const { docs: folders, map } = buildFolders(source, lang, "Item");
  const docs = source.entries.map((entry, i) => {
    const id = stableId(source.pack, lang, entry.key);
    const name = t(entry.name, lang);
    index.push({ pack: source.pack, key: entry.key, id, name, d66: entry.d66 ?? "", folder: entry.folder ?? entry.plane ?? entry.techType ?? "" });
    return baseDoc(id, `!items!${id}`, name, {
      type: entry.itemType,
      img: itemImg(entry),
      system: itemSystem(entry, lang),
      effects: [],
      folder: folderFor(entry, source, map),
      sort: (i + 1) * 100000
    });
  });
  return [...folders, ...docs];
}

function buildThreats(source, lang) {
  const { docs: folders, map } = buildFolders(source, lang, "Actor");
  const docs = source.entries.map((entry, i) => {
    const id = stableId(source.pack, lang, entry.key);
    const name = t(entry.name, lang);
    const img = entry.img ?? ICONS.threat[entry.origin] ?? ICONS.threat.other;
    const brabo = entry.brabo ?? 0;
    const items = (entry.interactions ?? []).map((inter, j) => {
      const itemId = stableId(source.pack, lang, entry.key, inter.key);
      return baseDoc(itemId, `!actors.items!${id}.${itemId}`, t(inter.name, lang), {
        type: "interaction",
        img: inter.img ?? ICONS.interaction,
        system: itemSystem({ ...inter, itemType: "interaction" }, lang),
        effects: [],
        sort: (j + 1) * 100000,
        ownership: { default: 0 }
      });
    });
    return baseDoc(id, `!actors!${id}`, name, {
      type: "threat",
      img,
      system: {
        grade: entry.grade ?? 1,
        archetype: entry.archetype ?? "normal",
        origin: entry.origin ?? "other",
        guard: { value: entry.guard, max: entry.guard },
        danger: { value: entry.danger, max: entry.danger },
        defense: { value: entry.defense, max: entry.defense },
        brabo: { value: brabo, max: brabo },
        barrier: 0,
        resistances: flags(entry.resistances),
        vulnerabilities: flags(entry.vulnerabilities),
        interactionsPerTurn: t(entry.interactionsPerTurn, lang),
        special: html(entry.special, lang),
        tactics: html(entry.tactics, lang),
        power: html(entry.power, lang),
        weakness: html(entry.weakness, lang),
        notes: ""
      },
      items,
      effects: [],
      folder: map[entry.folder] ?? null,
      sort: (i + 1) * 100000,
      prototypeToken: {
        name,
        actorLink: false,
        disposition: -1,
        displayName: 20,
        displayBars: 20,
        bar1: { attribute: "guard" },
        bar2: { attribute: "danger" },
        texture: { src: img }
      }
    });
  });
  return [...folders, ...docs];
}

function journalDoc(pack, lang, entryKey, name, pages, sort) {
  const id = stableId(pack, lang, entryKey);
  return baseDoc(id, `!journal!${id}`, name, {
    sort,
    pages: pages.map((page, i) => {
      const pageId = stableId(pack, lang, entryKey, page.key);
      return {
        _id: pageId,
        _key: `!journal.pages!${id}.${pageId}`,
        name: page.name,
        type: "text",
        title: { show: true, level: 1 },
        text: { content: page.content, format: 1 },
        sort: (i + 1) * 100000,
        ownership: { default: -1 },
        flags: {},
        _stats: { ...STATS }
      };
    })
  });
}

function buildJournal(source, lang, index, sources) {
  const docs = source.entries.map((entry, i) => journalDoc(source.pack, lang, entry.key, t(entry.name, lang), entry.pages.map(page => ({
    key: page.key,
    name: t(page.name, lang),
    content: html(page.content, lang)
  })), (i + 1) * 100000));
  const headers = lang === "pt"
    ? { title: "Tabelas e Listas (d66)", roll: "Rolagem", name: "Nome" }
    : { title: "Tables and Lists (d66)", roll: "Roll", name: "Name" };
  const pages = PACK_LABEL_ORDER.map(pack => {
    const src = sources.find(s => s.pack === pack);
    if (!src) return null;
    const rows = index.filter(r => r.pack === pack)
      .map(r => `<tr><td>${r.d66}</td><td>@UUID[Compendium.${SYSTEM_ID}.${pack}-${lang}.Item.${r.id}]{${r.name}}</td></tr>`)
      .join("");
    return {
      key: `table-${pack}`,
      name: t(src.label, lang),
      content: `${html(src.intro, lang)}<table><thead><tr><th>${headers.roll}</th><th>${headers.name}</th></tr></thead><tbody>${rows}</tbody></table>`
    };
  }).filter(Boolean);
  docs.push(journalDoc(source.pack, lang, "d66-tables", headers.title, pages, (docs.length + 1) * 100000));
  return docs;
}

async function main() {
  const sources = loadSources().map(s => s.data);
  const ordered = [...sources.filter(s => s.type !== "JournalEntry"), ...sources.filter(s => s.type === "JournalEntry")];
  rmSync(BUILD, { recursive: true, force: true });
  for (const lang of LANGS) {
    const index = [];
    for (const source of ordered) {
      const packName = `${source.pack}-${lang}`;
      let docs;
      if (source.type === "Item") docs = buildItems(source, lang, index);
      else if (source.type === "Actor") docs = buildThreats(source, lang);
      else if (source.type === "JournalEntry") docs = buildJournal(source, lang, index, sources);
      else throw new Error(`Tipo de pacote desconhecido: ${source.type}`);
      const srcDir = path.join(BUILD, packName);
      mkdirSync(srcDir, { recursive: true });
      for (const doc of docs) {
        const slug = doc.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
        writeFileSync(path.join(srcDir, `${slug || "doc"}_${doc._id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
      }
      const dest = path.join(OUT, packName);
      rmSync(dest, { recursive: true, force: true });
      await compilePack(srcDir, dest, { log: false });
      console.log(`✔ ${packName}: ${docs.length} documento(s)`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
