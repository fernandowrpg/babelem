import { BABELEM } from "../config.mjs";

export class BabelemActor extends Actor {
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    const prototypeToken = {};
    if (this.type === "character") {
      Object.assign(prototypeToken, { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY });
      if (data.system?.guard?.value === undefined) {
        const { brabo, ligeiro, safo } = this.system.attributes;
        this.updateSource({
          "system.guard.value": 2 * brabo.max + ligeiro.max + this.system.guard.bonus,
          "system.memory.value": safo.max + 1 + this.system.memory.bonus
        });
      }
    } else if (this.type === "threat") {
      Object.assign(prototypeToken, { disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE });
    }
    prototypeToken.bar1 = { attribute: "guard" };
    prototypeToken.bar2 = { attribute: this.type === "character" ? "aura" : "danger" };
    if (!data.prototypeToken) this.updateSource({ prototypeToken });
  }

  getRollData() {
    const data = foundry.utils.deepClone(this.system.toObject?.() ?? this.system);
    data.initiative = this.system.initiative ?? 0;
    if (this.type === "character") {
      for (const [key, attr] of Object.entries(this.system.attributes)) data[key] = attr.max;
      data.aura = this.system.aura.value;
      data.guard = this.system.guard.value;
      data.memory = this.system.memory.value;
    } else {
      data.danger = this.system.danger.value;
      data.defense = this.system.defense.value;
      data.guard = this.system.guard.value;
      data.grade = this.system.grade;
      data.brabo = this.system.brabo.value;
    }
    return data;
  }

  get essence() {
    return this.items.find(i => i.type === "essence") ?? null;
  }

  effectiveFlags(kind) {
    const flags = { ...(this.system[kind] ?? {}) };
    if (kind === "resistances") {
      for (const trait of this.items.filter(i => i.type === "trait")) {
        for (const [key, on] of Object.entries(trait.system.resistances ?? {})) if (on) flags[key] = true;
      }
    }
    return flags;
  }

  async applyDamage({ amount = 0, damageType = "kinetic", pierce = false, ignoreResistance = false } = {}) {
    let damage = Math.max(0, Math.floor(amount));
    const notes = [];
    if (!ignoreResistance) {
      if (this.effectiveFlags("resistances")[damageType]) {
        damage = Math.floor(damage / 2);
        notes.push(game.i18n.localize("BABELEM.Damage.resisted"));
      }
      if (this.effectiveFlags("vulnerabilities")[damageType]) {
        damage *= 2;
        notes.push(game.i18n.localize("BABELEM.Damage.vulnerable"));
      }
    }
    const update = {};
    const barrier = this.system.barrier ?? 0;
    if (!pierce && barrier > 0 && damage > 0) {
      damage = Math.max(0, damage - barrier);
      update["system.barrier"] = barrier - 1;
      notes.push(game.i18n.format("BABELEM.Damage.barrierAbsorbed", { barrier }));
    }
    const guard = this.system.guard.value;
    const remaining = guard - damage;
    update["system.guard.value"] = Math.max(0, remaining);
    await this.update(update);
    const summary = game.i18n.format("BABELEM.Damage.taken", {
      name: this.name,
      damage,
      type: game.i18n.localize(BABELEM.damageTypes[damageType]),
      pierce: pierce ? ` (${game.i18n.localize("BABELEM.Damage.pierceShort")})` : ""
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="babelem chat-card notice"><p>${summary}</p>${notes.length ? `<p class="notes">${notes.join(" · ")}</p>` : ""}</div>`
    });
    if (damage > 0 && remaining <= 0) await this.#onGuardBroken();
    return damage;
  }

  async #onGuardBroken() {
    if (this.type === "character") return this.#markWound();
    return this.#threatGuardBroken();
  }

  async #markWound() {
    const wounds = this.system.wounds;
    const next = BABELEM.wounds.find(w => !wounds[w]);
    if (!next) {
      await this.toggleStatusEffect("dead", { active: true, overlay: true });
      return ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="babelem chat-card danger"><p>${game.i18n.format("BABELEM.Wounds.noneLeft", { name: this.name })}</p></div>`
      });
    }
    await this.update({ [`system.wounds.${next}`]: true, "system.guard.value": this.system.guard.max });
    const count = BABELEM.wounds.filter(w => this.system.wounds[w]).length;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="babelem chat-card danger"><p>${game.i18n.format("BABELEM.Wounds.marked", { name: this.name, wound: game.i18n.localize(`BABELEM.Wounds.${next}`) })}</p></div>`
    });
    const roll = await new Roll(BABELEM.echoDie).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("BABELEM.Wounds.defeatCheck", { count })
    });
    if (roll.total <= count) {
      await this.toggleStatusEffect("dead", { active: true, overlay: true });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="babelem chat-card danger"><p>${game.i18n.format("BABELEM.Wounds.defeated", { name: this.name })}</p></div>`
      });
    }
  }

  async #threatGuardBroken() {
    const defense = this.system.defense.value;
    if (defense <= 0 || this.system.archetype === "minion") {
      await this.toggleStatusEffect("dead", { active: true, overlay: true });
      return ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="babelem chat-card danger"><p>${game.i18n.format("BABELEM.Threat.defeated", { name: this.name })}</p></div>`
      });
    }
    const roll = await new Roll(`${defense}d6`).evaluate();
    await this.update({
      "system.defense.value": 0,
      "system.guard.value": Math.min(this.system.guard.max, roll.total)
    });
    await this.toggleStatusEffect("exposed", { active: true });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="babelem chat-card danger"><p>${game.i18n.format("BABELEM.Threat.exposedNow", { name: this.name, guard: roll.total, defense })}</p></div>`,
      rolls: [roll],
      sound: CONFIG.sounds.dice
    });
  }

  async recoverEndOfScene() {
    if (this.type !== "character") return;
    const sys = this.system;
    const update = {
      "system.wounds.temporary": false,
      "system.guard.value": sys.guard.max,
      "system.memory.value": Math.min(sys.memory.max, sys.memory.value + Math.ceil(sys.memory.max / 2))
    };
    for (const [key, attr] of Object.entries(sys.attributes)) {
      update[`system.attributes.${key}.value`] = Math.min(attr.max, attr.value + 1);
    }
    await this.update(update);
  }

  async rest() {
    if (this.type !== "character") return;
    const sys = this.system;
    const update = {
      "system.wounds.temporary": false,
      "system.wounds.serious": false,
      "system.guard.value": sys.guard.max,
      "system.memory.value": sys.memory.max
    };
    for (const [key, attr] of Object.entries(sys.attributes)) update[`system.attributes.${key}.value`] = attr.max;
    await this.update(update);
    const blood = this.items.filter(i => i.type === "trait" && i.system.tracker.enabled && i.system.sourceKey === "feiticaria-de-sangue");
    for (const trait of blood) await trait.update({ "system.tracker.value": 0 });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="babelem chat-card notice"><p>${game.i18n.format("BABELEM.Rest.done", { name: this.name })}</p>${sys.wounds.mortal ? `<p class="notes">${game.i18n.localize("BABELEM.Rest.mortalWarning")}</p>` : ""}</div>`
    });
  }

  async recoverAuraFromEvent(eventKey) {
    if (this.type !== "character") return;
    const marked = this.system.events[eventKey];
    if (!marked) return this.update({ [`system.events.${eventKey}`]: true });
    const aura = this.system.aura;
    await this.update({ [`system.events.${eventKey}`]: false, "system.aura.value": Math.min(aura.max, aura.value + 3) });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="babelem chat-card notice"><p>${game.i18n.format("BABELEM.Essence.auraRecovered", { name: this.name })}</p></div>`
    });
  }

  applyThreatTable() {
    const row = BABELEM.threatTable[this.system.grade];
    if (!row) return;
    const minion = this.system.archetype === "minion";
    const guard = minion ? 1 : row.guard;
    const defense = minion ? 0 : row.defense;
    return this.update({
      "system.guard.max": guard,
      "system.guard.value": guard,
      "system.danger.max": row.danger,
      "system.danger.value": row.danger,
      "system.defense.max": defense,
      "system.defense.value": defense
    });
  }
}

export function registerActorSocketHandlers(register) {
  register("applyDamage", async ({ uuid, options }) => {
    const actor = await fromUuid(uuid);
    if (actor) await actor.applyDamage(options);
  });
}
