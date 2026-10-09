import { SYSTEM_ID } from "../config.mjs";

export function registerSettings() {
  game.settings.register(SYSTEM_ID, "weave", {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: () => game.babelem?.weavePanel?.render()
  });

  game.settings.register(SYSTEM_ID, "commonPool", {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: () => game.babelem?.weavePanel?.render()
  });

  game.settings.register(SYSTEM_ID, "onesGrantAura", {
    name: "BABELEM.Settings.onesGrantAura.name",
    hint: "BABELEM.Settings.onesGrantAura.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "backgroundBonusDice", {
    name: "BABELEM.Settings.backgroundBonusDice.name",
    hint: "BABELEM.Settings.backgroundBonusDice.hint",
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    range: { min: 1, max: 3, step: 1 }
  });

  game.settings.register(SYSTEM_ID, "playersAdjustPool", {
    name: "BABELEM.Settings.playersAdjustPool.name",
    hint: "BABELEM.Settings.playersAdjustPool.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "showWeavePanel", {
    name: "BABELEM.Settings.showWeavePanel.name",
    hint: "BABELEM.Settings.showWeavePanel.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => game.babelem?.weavePanel?.toggle(value)
  });
}

export function getWeave() {
  return game.settings.get(SYSTEM_ID, "weave");
}

export function getCommonPool() {
  return game.settings.get(SYSTEM_ID, "commonPool");
}
