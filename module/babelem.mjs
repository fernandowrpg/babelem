import { BABELEM, SYSTEM_ID } from "./config.mjs";
import { CharacterData, ThreatData } from "./data/actor-data.mjs";
import { EssenceData, GearData, InteractionData, SpellData, StyleData, TechniqueData, TraitData } from "./data/item-data.mjs";
import { BabelemActor, registerActorSocketHandlers } from "./documents/actor.mjs";
import { BabelemItem } from "./documents/item.mjs";
import { CharacterSheet } from "./sheets/character-sheet.mjs";
import { ThreatSheet } from "./sheets/threat-sheet.mjs";
import { BabelemItemSheet } from "./sheets/item-sheet.mjs";
import { WeavePanel } from "./apps/weave-panel.mjs";
import { registerSettings } from "./helpers/settings.mjs";
import { registerSocket, registerSocketHandler } from "./helpers/socket.mjs";
import { adjustCommonPool, adjustWeave, endScene, registerWeaveHandlers, rollEchoDie, startSession } from "./helpers/weave.mjs";
import { applyDamageToTargets, onRenderChatMessage, rollTest } from "./dice/test.mjs";

const TEMPLATES = [
  "templates/parts/item-row.hbs",
  "templates/actor/character-sheet.hbs",
  "templates/actor/threat-sheet.hbs",
  "templates/item/item-sheet.hbs",
  "templates/chat/test-card.hbs",
  "templates/chat/item-card.hbs",
  "templates/chat/echo-die.hbs",
  "templates/apps/test-dialog.hbs",
  "templates/apps/damage-dialog.hbs",
  "templates/apps/ability-dialog.hbs",
  "templates/apps/weave-panel.hbs"
].map(path => `systems/${SYSTEM_ID}/${path}`);

function registerSheets() {
  const SheetConfig = foundry.applications.apps?.DocumentSheetConfig;
  const register = (documentClass, collection, sheet, options) => {
    if (SheetConfig?.registerSheet) SheetConfig.registerSheet(documentClass, SYSTEM_ID, sheet, options);
    else collection.registerSheet(SYSTEM_ID, sheet, options);
  };
  const Actors = foundry.documents.collections?.Actors ?? globalThis.Actors;
  const Items = foundry.documents.collections?.Items ?? globalThis.Items;
  register(Actor, Actors, CharacterSheet, { types: ["character"], makeDefault: true, label: "BABELEM.Sheet.characterLabel" });
  register(Actor, Actors, ThreatSheet, { types: ["threat"], makeDefault: true, label: "BABELEM.Sheet.threatLabel" });
  register(Item, Items, BabelemItemSheet, { makeDefault: true, label: "BABELEM.Sheet.itemLabel" });
}

function registerHelpers() {
  Handlebars.registerHelper("bab-eq", (a, b) => a === b);
}

async function createItemMacro(data, slot) {
  const item = await fromUuid(data.uuid);
  if (!item?.actor) return;
  const command = `game.babelem.useItem("${item.uuid}");`;
  let macro = game.macros.find(m => m.name === item.name && m.command === command);
  macro ??= await Macro.create({ name: item.name, type: "script", img: item.img, command, flags: { [SYSTEM_ID]: { itemMacro: true } } });
  await game.user.assignHotbarMacro(macro, slot);
}

Hooks.once("init", () => {
  CONFIG.BABELEM = BABELEM;
  CONFIG.Actor.documentClass = BabelemActor;
  CONFIG.Item.documentClass = BabelemItem;
  Object.assign(CONFIG.Actor.dataModels, { character: CharacterData, threat: ThreatData });
  Object.assign(CONFIG.Item.dataModels, {
    essence: EssenceData,
    trait: TraitData,
    technique: TechniqueData,
    spell: SpellData,
    style: StyleData,
    gear: GearData,
    interaction: InteractionData
  });
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["guard", "aura", "memory", "attributes.brabo", "attributes.ligeiro", "attributes.safo"], value: ["barrier"] },
    threat: { bar: ["guard", "danger", "defense", "brabo"], value: ["barrier", "grade"] }
  };
  CONFIG.Combat.initiative = { formula: "@initiative", decimals: 0 };
  CONFIG.statusEffects = BABELEM.statusEffects.map(s => ({ ...s }));
  CONFIG.specialStatusEffects.DEFEATED = "dead";

  registerSettings();
  registerSheets();
  registerHelpers();
  foundry.applications.handlebars.loadTemplates(TEMPLATES);

  game.babelem = {
    config: BABELEM,
    rollTest,
    rollEchoDie,
    adjustWeave,
    adjustCommonPool,
    endScene,
    startSession,
    applyDamageToTargets,
    useItem: async uuid => {
      const item = await fromUuid(uuid);
      if (!item) return ui.notifications.warn(game.i18n.localize("BABELEM.Notify.itemMissing"));
      return item.use();
    },
    weavePanel: null
  };
});

Hooks.once("ready", () => {
  registerWeaveHandlers();
  registerActorSocketHandlers(registerSocketHandler);
  registerSocket();
  game.babelem.weavePanel = new WeavePanel();
  game.babelem.weavePanel.render();
});

Hooks.on("renderChatMessageHTML", (message, html) => onRenderChatMessage(message, html));

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type !== "Item" || !data.uuid) return;
  const item = fromUuidSync(data.uuid);
  if (!item?.actor) return;
  createItemMacro(data, slot);
  return false;
});
