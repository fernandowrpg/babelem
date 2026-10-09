import { BABELEM, SYSTEM_ID } from "../config.mjs";
import { getCommonPool, getWeave } from "./settings.mjs";
import { registerSocketHandler, runAsGM } from "./socket.mjs";

const TEMPLATE = `systems/${SYSTEM_ID}/templates/chat/echo-die.hbs`;

export function registerWeaveHandlers() {
  registerSocketHandler("adjustWeave", ({ delta }) => setWeave(getWeave() + Number(delta || 0)));
  registerSocketHandler("adjustPool", ({ delta }) => setCommonPool(getCommonPool() + Number(delta || 0)));
}

async function setWeave(value) {
  return game.settings.set(SYSTEM_ID, "weave", Math.max(0, value));
}

async function setCommonPool(value) {
  return game.settings.set(SYSTEM_ID, "commonPool", Math.max(0, value));
}

export async function adjustWeave(delta) {
  if (!delta) return;
  return runAsGM("adjustWeave", { delta });
}

export async function adjustCommonPool(delta) {
  if (!delta) return;
  if (!game.user.isGM && delta > 0 && !game.settings.get(SYSTEM_ID, "playersAdjustPool")) {
    return ui.notifications.warn(game.i18n.localize("BABELEM.Notify.poolGMOnly"));
  }
  return runAsGM("adjustPool", { delta });
}

export async function rollEchoDie({ bonus = 0, reason = "", fromPool = false } = {}) {
  const roll = await new Roll(BABELEM.echoDie).evaluate();
  const weave = getWeave();
  const result = roll.total + bonus;
  const complication = roll.total === 1 || result < weave;
  if (complication && fromPool) await adjustCommonPool(-1);
  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    result,
    natural: roll.total,
    bonus,
    weave,
    complication,
    reason,
    fromPool
  });
  await ChatMessage.create({
    speaker: { alias: game.i18n.localize("BABELEM.EchoDie.speaker") },
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { [SYSTEM_ID]: { type: "echoDie" } }
  });
  return { roll, result, complication };
}

export async function endScene() {
  if (!game.user.isGM) return;
  const actors = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
  for (const actor of actors) await actor.recoverEndOfScene();
  await adjustWeave(1);
  await ChatMessage.create({
    speaker: { alias: game.i18n.localize("BABELEM.Weave.weaver") },
    content: `<div class="babelem chat-card notice"><h3>${game.i18n.localize("BABELEM.Weave.endScene")}</h3><p>${game.i18n.format("BABELEM.Weave.endSceneSummary", { count: actors.length })}</p></div>`
  });
}

export async function startSession() {
  if (!game.user.isGM) return;
  const players = game.users.filter(u => u.active && !u.isGM).length;
  await setWeave(players);
  await ChatMessage.create({
    speaker: { alias: game.i18n.localize("BABELEM.Weave.weaver") },
    content: `<div class="babelem chat-card notice"><h3>${game.i18n.localize("BABELEM.Weave.startSession")}</h3><p>${game.i18n.format("BABELEM.Weave.startSessionSummary", { weave: players })}</p></div>`
  });
}
