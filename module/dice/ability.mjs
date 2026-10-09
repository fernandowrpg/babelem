import { BABELEM, SYSTEM_ID } from "../config.mjs";
import { adjustWeave, adjustCommonPool } from "../helpers/weave.mjs";
import { rollTest } from "./test.mjs";

const { renderTemplate } = foundry.applications.handlebars;
const DIALOG_TEMPLATE = `systems/${SYSTEM_ID}/templates/apps/ability-dialog.hbs`;
const CARD_TEMPLATE = `systems/${SYSTEM_ID}/templates/chat/item-card.hbs`;

function formData(form) {
  const FDE = foundry.applications.ux?.FormDataExtended ?? globalThis.FormDataExtended;
  return new FDE(form).object;
}

function resourcePath(actor, resource) {
  if (resource === "aura") return "system.aura.value";
  if (resource === "weave") return null;
  if (actor.type === "threat") {
    if (["danger", "defense", "brabo"].includes(resource)) return `system.${resource}.value`;
    return null;
  }
  if (BABELEM.attributes[resource]) return `system.attributes.${resource}.value`;
  return null;
}

export function resourceLabel(resource) {
  const label = BABELEM.resources[resource] ?? BABELEM.threatResources[resource];
  return label ? game.i18n.localize(label) : resource;
}

export function costLabel(cost) {
  if (!cost || cost.resource === "none") return "";
  if (cost.resource === "special") return game.i18n.localize("BABELEM.Resource.special");
  return `${cost.value} ${resourceLabel(cost.resource)}`.toUpperCase();
}

async function spend(actor, costs) {
  const totals = {};
  let weave = 0;
  for (const { value, resource } of costs) {
    if (!value || resource === "none") continue;
    if (resource === "weave" || (actor.type === "threat" && resource === "aura")) {
      weave += value;
      continue;
    }
    const path = resourcePath(actor, resource);
    if (!path) continue;
    totals[path] ??= { value: 0, resource };
    totals[path].value += value;
  }
  const update = {};
  for (const [path, { value, resource }] of Object.entries(totals)) {
    const current = foundry.utils.getProperty(actor, path) ?? 0;
    if (current < value && !game.user.isGM) {
      ui.notifications.warn(game.i18n.format("BABELEM.Notify.notEnough", { resource: resourceLabel(resource) }));
      return false;
    }
    update[path] = Math.max(0, current - value);
  }
  if (!foundry.utils.isEmpty(update)) await actor.update(update);
  if (weave) await adjustWeave(-weave);
  return true;
}

async function promptAbility(item) {
  const sys = item.system;
  const content = await renderTemplate(DIALOG_TEMPLATE, {
    item,
    cost: costLabel(sys.cost),
    special: sys.cost?.resource === "special",
    extraCost: sys.extraCost?.value ? costLabel(sys.extraCost) : "",
    extraRelease: sys.extraRelease,
    auraCost: sys.cost?.resource === "aura"
  });
  return foundry.applications.api.DialogV2.prompt({
    window: { title: item.name },
    content,
    position: { width: 460 },
    ok: {
      label: game.i18n.localize("BABELEM.Ability.use"),
      icon: "fa-solid fa-wand-sparkles",
      callback: (event, button) => formData(button.form)
    },
    rejectClose: false
  });
}

export async function useAbility(item, { skipDialog = false } = {}) {
  const actor = item.actor;
  if (!actor) return item.sheet.render(true);
  const sys = item.system;
  const options = skipDialog ? {} : await promptAbility(item);
  if (options === null) return;
  const extra = !!options.extra;
  const motorRite = !!options.motorRite;
  const sonicRite = !!options.sonicRite;
  const costs = [];
  if (sys.cost?.resource === "special") {
    const invested = Math.max(0, Number(options.invest) || 0);
    if (invested) costs.push({ value: invested, resource: "aura" });
  } else if (sys.cost) {
    let value = sys.cost.value;
    if (sonicRite && sys.cost.resource === "aura") value = Math.max(1, value - 1);
    costs.push({ value, resource: sys.cost.resource });
  }
  if (extra && sys.extraCost?.value) costs.push({ value: sys.extraCost.value, resource: sys.extraCost.resource });
  if (sys.cost?.channel && !actor.statuses?.has("channeling")) {
    ui.notifications.warn(game.i18n.localize("BABELEM.Notify.requiresChannel"));
  }
  if (!(await spend(actor, costs))) return;
  const rites = Number(motorRite) + Number(sonicRite);
  if (rites) await adjustWeave(rites);

  const content = await renderTemplate(CARD_TEMPLATE, {
    item,
    actor,
    typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
    paid: costs.filter(c => c.value && c.resource !== "none").map(costLabel).join(" + "),
    extra,
    motorRite,
    sonicRite,
    description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.description, { relativeTo: item }),
    extraRelease: extra ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.extraRelease ?? "", { relativeTo: item }) : ""
  });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, flags: { [SYSTEM_ID]: { type: "ability", itemUuid: item.uuid } } });

  const test = sys.test;
  if (test && (test.attack || test.attribute) && actor.type === "character") {
    const choices = [test.attribute, test.alt].filter(Boolean);
    await rollTest(actor, {
      attribute: test.attribute || test.attack,
      attributes: choices.length > 1 ? choices : null,
      label: item.name,
      itemName: item.name,
      bonus: test.bonus ?? 0,
      attack: test.attack,
      damageType: test.damageType,
      motorRite,
      skipDialog
    });
  }
}

export async function createAdvantage(actor, attribute) {
  const reserve = actor.system.attributes[attribute];
  if (reserve.value < 1) return ui.notifications.warn(game.i18n.localize("BABELEM.Notify.noReserve"));
  await actor.update({ [`system.attributes.${attribute}.value`]: reserve.value - 1 });
  await adjustCommonPool(1);
  const key = attribute === "ligeiro" ? "BABELEM.Action.notice" : "BABELEM.Action.recall";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="babelem chat-card notice"><h3>${game.i18n.localize("BABELEM.Action.createAdvantage")}</h3><p>${game.i18n.localize(key)}</p></div>`
  });
}
