import { BABELEM, SYSTEM_ID } from "../config.mjs";
import { costLabel, useAbility } from "../dice/ability.mjs";
import { adjustWeave } from "../helpers/weave.mjs";

const { renderTemplate } = foundry.applications.handlebars;
const CARD_TEMPLATE = `systems/${SYSTEM_ID}/templates/chat/item-card.hbs`;

const DEFAULT_ICONS = {
  essence: "icons/svg/eye.svg",
  trait: "icons/svg/upgrade.svg",
  technique: "icons/svg/sword.svg",
  spell: "icons/svg/ice-aura.svg",
  style: "icons/svg/shield.svg",
  gear: "icons/svg/item-bag.svg",
  interaction: "icons/svg/dice-target.svg"
};

export class BabelemItem extends Item {
  static getDefaultArtwork(itemData) {
    const img = DEFAULT_ICONS[itemData?.type];
    return img ? { img } : super.getDefaultArtwork(itemData);
  }

  get isAbility() {
    return this.type === "technique" || this.type === "spell";
  }

  get costLabel() {
    return costLabel(this.system.cost);
  }

  async use(options = {}) {
    if (this.isAbility) return useAbility(this, options);
    if (this.type === "interaction") return this.#useInteraction(options);
    return this.toChat();
  }

  async toChat(extra = {}) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const content = await renderTemplate(CARD_TEMPLATE, {
      item: this,
      actor: this.actor,
      typeLabel: game.i18n.localize(`TYPES.Item.${this.type}`),
      description: await TextEditor.enrichHTML(this.system.description ?? "", { relativeTo: this }),
      triggers: this.type === "essence" ? this.system.triggers.filter(Boolean) : null,
      ...extra
    });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      flags: { [SYSTEM_ID]: { type: "item", itemUuid: this.uuid } }
    });
  }

  async #useInteraction() {
    const actor = this.actor;
    const sys = this.system;
    if (actor && sys.cost?.value && sys.cost.resource !== "none") {
      if (sys.cost.resource === "weave") await adjustWeave(-sys.cost.value);
      else {
        const path = `system.${sys.cost.resource}.value`;
        const current = foundry.utils.getProperty(actor, path);
        if (typeof current === "number") await actor.update({ [path]: Math.max(0, current - sys.cost.value) });
      }
    }
    let damageRoll = null;
    if (sys.damage) {
      try {
        damageRoll = await new Roll(sys.damage, actor?.getRollData() ?? {}).evaluate();
      } catch (err) {
        ui.notifications.error(game.i18n.format("BABELEM.Notify.badFormula", { formula: sys.damage }));
      }
    }
    const extra = {
      paid: sys.cost?.value && sys.cost.resource !== "none" ? costLabel(sys.cost) : "",
      attackLabel: sys.attack ? game.i18n.localize(BABELEM.attackTypes[sys.attack]) : "",
      rangeLabel: sys.range ? game.i18n.localize(BABELEM.ranges[sys.range]) : "",
      hits: actor?.type === "threat" && sys.attack && sys.attack !== "safo" ? actor.system.attackHits : null,
      damage: damageRoll?.total ?? null,
      damageFormula: damageRoll?.formula ?? "",
      damageType: sys.damageType,
      damageTypeLabel: game.i18n.localize(BABELEM.damageTypes[sys.damageType] ?? ""),
      pierce: sys.pierce
    };
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const content = await renderTemplate(CARD_TEMPLATE, {
      item: this,
      actor,
      typeLabel: game.i18n.localize(BABELEM.interactionKinds[sys.kind]),
      description: await TextEditor.enrichHTML(sys.description ?? "", { relativeTo: this }),
      ...extra
    });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      rolls: damageRoll ? [damageRoll] : [],
      sound: damageRoll ? CONFIG.sounds.dice : undefined,
      flags: { [SYSTEM_ID]: { type: "interaction", itemUuid: this.uuid } }
    });
  }
}
