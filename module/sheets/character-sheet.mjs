import { BABELEM, SYSTEM_ID } from "../config.mjs";
import { createAdvantage } from "../dice/ability.mjs";
import { rollTest } from "../dice/test.mjs";
import { BabelemActorSheet } from "./base-actor-sheet.mjs";

export class CharacterSheet extends BabelemActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["character"],
    position: { width: 980, height: 860 },
    actions: {
      rollAttribute: CharacterSheet.#onRollAttribute,
      rollAttack: CharacterSheet.#onRollAttack,
      rollDefense: CharacterSheet.#onRollDefense,
      createAdvantage: CharacterSheet.#onCreateAdvantage,
      channel: CharacterSheet.#onChannel,
      raiseGuard: CharacterSheet.#onRaiseGuard,
      toggleEvent: CharacterSheet.#onToggleEvent,
      toggleWound: CharacterSheet.#onToggleWound,
      rest: CharacterSheet.#onRest
    }
  };

  static PARTS = {
    sheet: {
      template: `systems/${SYSTEM_ID}/templates/actor/character-sheet.hbs`,
      scrollable: [".sheet-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const enrichOptions = { relativeTo: this.actor, secrets: this.actor.isOwner };
    const items = context.items;
    const abilities = [...(items.technique ?? []), ...(items.spell ?? [])];
    context.attributeRows = Object.keys(BABELEM.attributes).map(key => ({
      key,
      label: game.i18n.localize(BABELEM.attributes[key]),
      value: sys.attributes[key].value,
      max: sys.attributes[key].max
    }));
    context.essence = items.essence?.[0] ?? null;
    context.traits = items.trait ?? [];
    context.techniques = items.technique ?? [];
    context.spells = items.spell ?? [];
    context.styles = items.style ?? [];
    context.gear = items.gear ?? [];
    context.abilityCount = abilities.length;
    context.restrictionCount = abilities.filter(a => a.system.restriction?.type && a.system.restriction.type !== "none").length;
    context.wounds = BABELEM.wounds.map(key => ({ key, label: game.i18n.localize(`BABELEM.Wounds.${key}`), marked: sys.wounds[key] }));
    context.events = ["one", "two", "three"].map(key => ({ key, marked: sys.events[key] }));
    context.damageFlags = Object.entries(BABELEM.damageTypes).map(([key, label]) => ({
      key,
      label: game.i18n.localize(label),
      resistance: sys.resistances[key],
      vulnerability: sys.vulnerabilities[key],
      fromTrait: this.actor.effectiveFlags("resistances")[key] && !sys.resistances[key]
    }));
    context.idealRanges = Object.fromEntries(Object.entries(BABELEM.idealRanges).map(([k, v]) => [k, game.i18n.localize(v)]));
    context.enriched = {
      background: await TextEditor.enrichHTML(sys.background, enrichOptions),
      inventory: await TextEditor.enrichHTML(sys.inventory, enrichOptions),
      notes: await TextEditor.enrichHTML(sys.notes, enrichOptions)
    };
    context.backgroundDice = game.settings.get(SYSTEM_ID, "backgroundBonusDice");
    return context;
  }

  static async #onRollAttribute(event, target) {
    await rollTest(this.actor, { attribute: target.dataset.attribute, skipDialog: event.shiftKey });
  }

  static async #onRollAttack(event, target) {
    const attack = target.dataset.attack;
    await rollTest(this.actor, {
      attribute: attack,
      attack,
      label: game.i18n.localize(BABELEM.attackTypes[attack]),
      skipDialog: event.shiftKey
    });
  }

  static async #onRollDefense(event, target) {
    const defense = target.dataset.defense;
    const attribute = defense === "dodge" ? "ligeiro" : "brabo";
    await rollTest(this.actor, {
      attribute,
      defense,
      label: game.i18n.localize(`BABELEM.Defense.${defense}`),
      skipDialog: event.shiftKey
    });
  }

  static async #onCreateAdvantage(event, target) {
    await createAdvantage(this.actor, target.dataset.attribute);
  }

  static async #onChannel() {
    const aura = this.actor.system.aura;
    await this.actor.update({ "system.aura.value": Math.min(aura.max, aura.value + 1) });
    await this.actor.toggleStatusEffect("channeling", { active: true });
  }

  static async #onRaiseGuard(event) {
    const active = this.actor.statuses.has("guardRaised");
    await this.actor.toggleStatusEffect("guardRaised", { active: !active });
    if (!active && event.shiftKey) {
      const brabo = this.actor.system.attributes.brabo;
      if (brabo.value < 1) return ui.notifications.warn(game.i18n.localize("BABELEM.Notify.noReserve"));
      await this.actor.update({ "system.attributes.brabo.value": brabo.value - 1, "system.guard.value": this.actor.system.guard.max });
    }
  }

  static async #onToggleEvent(event, target) {
    await this.actor.recoverAuraFromEvent(target.dataset.event);
  }

  static async #onToggleWound(event, target) {
    const key = target.dataset.wound;
    await this.actor.update({ [`system.wounds.${key}`]: !this.actor.system.wounds[key] });
  }

  static async #onRest() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("BABELEM.Rest.title") },
      content: `<p>${game.i18n.localize("BABELEM.Rest.confirm")}</p>`,
      rejectClose: false
    });
    if (confirmed) await this.actor.rest();
  }

}
