import { BABELEM, SYSTEM_ID } from "../config.mjs";
import { getCommonPool } from "../helpers/settings.mjs";
import { runAsGM } from "../helpers/socket.mjs";
import { adjustWeave, rollEchoDie } from "../helpers/weave.mjs";

const TEST_TEMPLATE = `systems/${SYSTEM_ID}/templates/chat/test-card.hbs`;
const DIALOG_TEMPLATE = `systems/${SYSTEM_ID}/templates/apps/test-dialog.hbs`;
const DAMAGE_TEMPLATE = `systems/${SYSTEM_ID}/templates/apps/damage-dialog.hbs`;

const { renderTemplate } = foundry.applications.handlebars;

function formData(form) {
  const FDE = foundry.applications.ux?.FormDataExtended ?? globalThis.FormDataExtended;
  return new FDE(form).object;
}

function clampDice(n) {
  return Math.max(BABELEM.minDice, Math.min(BABELEM.maxDice, n));
}

export function computeTest(state) {
  const dice = state.dice.map((value, index) => {
    const burned = state.burned.includes(index);
    const hit = value >= 5 || burned || (state.threat && value === 1);
    return { value, index, burned, hit, one: value === 1 && !burned && !state.threat };
  });
  const natural = dice.filter(d => d.hit && !d.burned).length;
  const hits = natural + state.burned.length + state.effort;
  const ones = dice.filter(d => d.one).length;
  let damage = null;
  let payPrice = false;
  const perHit = 1 + (state.motorRite ? 1 : 0);
  if (state.attack === "brabo") {
    if (hits === 0) payPrice = true;
    else damage = hits * perHit + state.attrValue + (state.bonusDamage ?? 0);
  } else if (state.attack === "ligeiro") {
    damage = hits * perHit + (state.bonusDamage ?? 0);
  }
  return { dice, hits, ones, damage, payPrice };
}

async function renderCard(state) {
  const computed = computeTest(state);
  return renderTemplate(TEST_TEMPLATE, {
    ...state,
    ...computed,
    attributeLabel: state.attribute ? game.i18n.localize(BABELEM.attributes[state.attribute] ?? state.attribute) : "",
    damageTypeLabel: game.i18n.localize(BABELEM.damageTypes[state.damageType] ?? ""),
    attackLabel: state.attack ? game.i18n.localize(BABELEM.attackTypes[state.attack]) : "",
    defenseLabel: state.defense ? game.i18n.localize(`BABELEM.Defense.${state.defense}`) : "",
    canBurn: !state.finalized && !state.threat && computed.ones > 0,
    canEffort: !state.finalized && !state.threat && !!state.attribute,
    canFinalize: !state.finalized && !state.threat
  });
}

export async function promptTest(actor, options = {}) {
  const pool = getCommonPool();
  const attributes = Object.entries(BABELEM.attributes)
    .filter(([key]) => !options.attributes || options.attributes.includes(key))
    .map(([key, label]) => ({ key, label: game.i18n.localize(label), value: actor.system.attributes?.[key]?.max ?? 0, selected: key === options.attribute }));
  const content = await renderTemplate(DIALOG_TEMPLATE, {
    attributes,
    showAttributes: attributes.length > 1,
    attribute: options.attribute,
    bonus: options.bonus ?? 0,
    pool,
    guardRaised: options.defense && actor.statuses?.has("guardRaised"),
    backgroundDice: game.settings.get(SYSTEM_ID, "backgroundBonusDice"),
    showBackground: actor.type === "character"
  });
  const DialogV2 = foundry.applications.api.DialogV2;
  const result = await DialogV2.prompt({
    window: { title: options.label ?? game.i18n.localize("BABELEM.Test.title") },
    content,
    ok: {
      label: game.i18n.localize("BABELEM.Test.roll"),
      icon: "fa-solid fa-dice-six",
      callback: (event, button) => formData(button.form)
    },
    rejectClose: false
  });
  if (!result) return null;
  return {
    attribute: result.attribute || options.attribute,
    bonus: Number(result.bonus) || 0,
    pool: Math.min(pool, Math.max(0, Number(result.pool) || 0)),
    background: !!result.background
  };
}

export async function rollTest(actor, {
  attribute,
  label,
  bonus = 0,
  pool = 0,
  background = false,
  attack = "",
  damageType = "kinetic",
  defense = "",
  motorRite = false,
  bonusDamage = 0,
  itemName = "",
  skipDialog = false,
  attributes = null
} = {}) {
  if (!skipDialog) {
    const choice = await promptTest(actor, { attribute, bonus, label, defense, attributes });
    if (!choice) return null;
    ({ attribute, bonus, pool, background } = { ...choice });
  }
  const attrValue = actor.system.attributes?.[attribute]?.max ?? 0;
  const backgroundDice = background ? game.settings.get(SYSTEM_ID, "backgroundBonusDice") : 0;
  const guardBonus = defense && actor.statuses?.has("guardRaised") ? 1 : 0;
  const count = clampDice(attrValue + bonus + pool + backgroundDice + guardBonus);
  const roll = await new Roll(`${count}d6`).evaluate();
  const dice = roll.dice[0].results.map(r => r.result);
  const state = {
    type: "test",
    actorUuid: actor.uuid,
    attribute,
    attrValue,
    label: label ?? game.i18n.format("BABELEM.Test.of", { attribute: game.i18n.localize(BABELEM.attributes[attribute]) }),
    itemName,
    count,
    bonus,
    pool,
    background,
    guardBonus,
    dice,
    burned: [],
    effort: 0,
    finalized: false,
    threat: false,
    attack,
    damageType,
    defense,
    motorRite,
    bonusDamage
  };
  const content = await renderCard(state);
  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { [SYSTEM_ID]: state }
  });
  if (background) await adjustWeave(1);
  if (pool > 0) await rollEchoDie({ fromPool: true, reason: game.i18n.localize("BABELEM.EchoDie.poolReason") });
  return message;
}

export async function rollThreatTest(actor, { label, dice: count, attack = "", damageType = "kinetic" } = {}) {
  count = Math.max(1, count ?? actor.system.danger.value);
  const roll = await new Roll(`${count}d6`).evaluate();
  const state = {
    type: "test",
    actorUuid: actor.uuid,
    attribute: "",
    attrValue: actor.system.danger.value,
    label: label ?? game.i18n.localize("BABELEM.Threat.testDanger"),
    itemName: "",
    count,
    bonus: 0,
    pool: 0,
    dice: roll.dice[0].results.map(r => r.result),
    burned: [],
    effort: 0,
    finalized: true,
    threat: true,
    attack,
    damageType,
    defense: ""
  };
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await renderCard(state),
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { [SYSTEM_ID]: state }
  });
}

async function updateCard(message, state) {
  await message.update({ content: await renderCard(state), [`flags.${SYSTEM_ID}`]: state });
}

async function onBurn(message, state) {
  const actor = await fromUuid(state.actorUuid);
  if (!actor) return;
  if (actor.system.aura.value < 1) return ui.notifications.warn(game.i18n.localize("BABELEM.Notify.noAura"));
  const next = state.dice.findIndex((v, i) => v === 1 && !state.burned.includes(i));
  if (next < 0) return;
  await actor.update({ "system.aura.value": actor.system.aura.value - 1 });
  state.burned.push(next);
  await updateCard(message, state);
}

async function onEffort(message, state) {
  const actor = await fromUuid(state.actorUuid);
  if (!actor) return;
  const reserve = actor.system.attributes[state.attribute];
  if (!reserve || reserve.value < 1) return ui.notifications.warn(game.i18n.localize("BABELEM.Notify.noReserve"));
  await actor.update({ [`system.attributes.${state.attribute}.value`]: reserve.value - 1 });
  state.effort += 1;
  await updateCard(message, state);
}

async function onFinalize(message, state) {
  const actor = await fromUuid(state.actorUuid);
  const { ones } = computeTest(state);
  state.finalized = true;
  await updateCard(message, state);
  if (ones > 0) {
    await adjustWeave(ones);
    if (actor && game.settings.get(SYSTEM_ID, "onesGrantAura")) {
      const aura = actor.system.aura;
      await actor.update({ "system.aura.value": Math.min(aura.max, aura.value + ones) });
    }
  }
}

export async function promptDamage({ amount = 0, damageType = "kinetic", pierce = false } = {}) {
  const content = await renderTemplate(DAMAGE_TEMPLATE, {
    amount,
    pierce,
    damageTypes: Object.entries(BABELEM.damageTypes).map(([key, label]) => ({ key, label: game.i18n.localize(label), selected: key === damageType }))
  });
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("BABELEM.Damage.apply") },
    content,
    ok: {
      label: game.i18n.localize("BABELEM.Damage.apply"),
      icon: "fa-solid fa-burst",
      callback: (event, button) => formData(button.form)
    },
    rejectClose: false
  });
  if (!result) return null;
  return {
    amount: Math.max(0, Number(result.amount) || 0),
    damageType: result.damageType,
    pierce: !!result.pierce,
    ignoreResistance: !!result.ignoreResistance
  };
}

export async function applyDamageToTargets(defaults) {
  const targets = [...game.user.targets].map(t => t.actor).filter(Boolean);
  if (!targets.length) return ui.notifications.warn(game.i18n.localize("BABELEM.Notify.noTargets"));
  const options = await promptDamage(defaults);
  if (!options) return;
  for (const actor of targets) {
    if (actor.isOwner) await actor.applyDamage(options);
    else await runAsGM("applyDamage", { uuid: actor.uuid, options });
  }
}

export function onRenderChatMessage(message, html) {
  const state = message.getFlag(SYSTEM_ID, "type") ? message.flags[SYSTEM_ID] : null;
  if (!state) return;
  const element = html instanceof HTMLElement ? html : html[0];
  const canControl = message.isAuthor || game.user.isGM;
  for (const button of element.querySelectorAll("[data-babelem-action]")) {
    const action = button.dataset.babelemAction;
    if (action !== "applyDamage" && !canControl) {
      button.remove();
      continue;
    }
    button.addEventListener("click", async event => {
      event.preventDefault();
      button.disabled = true;
      try {
        const current = foundry.utils.deepClone(message.flags[SYSTEM_ID]);
        if (action === "burn") await onBurn(message, current);
        else if (action === "effort") await onEffort(message, current);
        else if (action === "finalize") await onFinalize(message, current);
        else if (action === "applyDamage") {
          await applyDamageToTargets({
            amount: Number(button.dataset.amount) || 0,
            damageType: button.dataset.damageType || "kinetic",
            pierce: button.dataset.pierce === "true"
          });
        }
      } finally {
        button.disabled = false;
      }
    });
  }
}
