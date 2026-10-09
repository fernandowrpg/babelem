import { BABELEM, SYSTEM_ID } from "../config.mjs";
import { rollThreatTest } from "../dice/test.mjs";
import { BabelemActorSheet } from "./base-actor-sheet.mjs";

const { renderTemplate } = foundry.applications.handlebars;

export class ThreatSheet extends BabelemActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["threat"],
    position: { width: 720, height: 820 },
    actions: {
      testDanger: ThreatSheet.#onTestDanger,
      basicAttack: ThreatSheet.#onBasicAttack,
      applyTable: ThreatSheet.#onApplyTable
    }
  };

  static PARTS = {
    sheet: {
      template: `systems/${SYSTEM_ID}/templates/actor/threat-sheet.hbs`,
      scrollable: [".sheet-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const enrichOptions = { relativeTo: this.actor, secrets: this.actor.isOwner };
    const localize = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, game.i18n.localize(v)]));
    context.grades = localize(BABELEM.grades);
    context.archetypes = localize(BABELEM.archetypes);
    context.origins = localize(BABELEM.origins);
    const interactions = context.items.interaction ?? [];
    context.interactionGroups = Object.entries(BABELEM.interactionKinds).map(([kind, label]) => ({
      kind,
      label: game.i18n.localize(label),
      items: interactions.filter(i => i.system.kind === kind)
    })).filter(g => g.items.length);
    context.abilities = [...(context.items.technique ?? []), ...(context.items.spell ?? [])];
    context.traits = context.items.trait ?? [];
    context.gear = context.items.gear ?? [];
    context.damageFlags = Object.entries(BABELEM.damageTypes).map(([key, label]) => ({
      key,
      label: game.i18n.localize(label),
      resistance: sys.resistances[key],
      vulnerability: sys.vulnerabilities[key]
    }));
    context.enriched = {};
    for (const key of ["special", "tactics", "power", "weakness", "notes"]) {
      context.enriched[key] = await TextEditor.enrichHTML(sys[key], enrichOptions);
    }
    context.attackHits = sys.attackHits;
    return context;
  }

  static async #onTestDanger(event) {
    await rollThreatTest(this.actor, {});
  }

  static async #onBasicAttack(event, target) {
    const attack = target.dataset.attack;
    const sys = this.actor.system;
    let formula = null;
    if (attack === "brabo") formula = sys.grade > 0 ? `${sys.grade}d6kh1 + @danger` : "@danger";
    else if (attack === "ligeiro") formula = "@grade + @danger";
    const roll = formula ? await new Roll(formula, this.actor.getRollData()).evaluate() : null;
    const content = await renderTemplate(`systems/${SYSTEM_ID}/templates/chat/item-card.hbs`, {
      item: { name: game.i18n.localize(BABELEM.attackTypes[attack]), img: "icons/svg/sword.svg" },
      actor: this.actor,
      typeLabel: game.i18n.localize("BABELEM.Threat.basicAttack"),
      description: game.i18n.localize(`BABELEM.Threat.basicAttackText.${attack}`),
      hits: attack !== "safo" ? sys.attackHits : null,
      damage: roll?.total ?? null,
      damageFormula: roll?.formula ?? "",
      damageType: "kinetic",
      damageTypeLabel: game.i18n.localize(BABELEM.damageTypes.kinetic)
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: roll ? [roll] : [],
      sound: roll ? CONFIG.sounds.dice : undefined,
      flags: { [SYSTEM_ID]: { type: "interaction" } }
    });
  }

  static async #onApplyTable() {
    await this.actor.applyThreatTable();
  }
}
