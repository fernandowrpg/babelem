import { BABELEM } from "../config.mjs";
import { choiceField, damageFlagsField, intField, resourceField } from "./fields.mjs";

const fields = foundry.data.fields;

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      level: intField(1, { min: 0 }),
      grade: intField(1, { min: 0 }),
      advances: intField(0, { min: 0 }),
      attributes: new fields.SchemaField({
        brabo: resourceField(3),
        ligeiro: resourceField(3),
        safo: resourceField(3)
      }),
      aura: resourceField(3),
      guard: new fields.SchemaField({
        value: intField(9, { min: 0 }),
        bonus: intField(0)
      }),
      memory: new fields.SchemaField({
        value: intField(4, { min: 0 }),
        bonus: intField(0)
      }),
      barrier: intField(0, { min: 0 }),
      wounds: new fields.SchemaField({
        temporary: new fields.BooleanField({ initial: false }),
        serious: new fields.BooleanField({ initial: false }),
        mortal: new fields.BooleanField({ initial: false })
      }),
      events: new fields.SchemaField({
        one: new fields.BooleanField({ initial: false }),
        two: new fields.BooleanField({ initial: false }),
        three: new fields.BooleanField({ initial: false })
      }),
      appearance: new fields.SchemaField({
        clothes: new fields.StringField({ initial: "" }),
        age: new fields.StringField({ initial: "" }),
        height: new fields.StringField({ initial: "" }),
        weight: new fields.StringField({ initial: "" }),
        eyes: new fields.StringField({ initial: "" }),
        hair: new fields.StringField({ initial: "" }),
        favoriteColor: new fields.StringField({ initial: "" })
      }),
      stereotype: new fields.StringField({ initial: "" }),
      background: new fields.HTMLField({ initial: "" }),
      pockets: new fields.StringField({ initial: "" }),
      inventory: new fields.HTMLField({ initial: "" }),
      style: new fields.SchemaField({
        name: new fields.StringField({ initial: "" }),
        idealRange: choiceField(BABELEM.idealRanges, "close"),
        pactWeapon: new fields.StringField({ initial: "" })
      }),
      resistances: damageFlagsField(),
      vulnerabilities: damageFlagsField(),
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    const { brabo, ligeiro, safo } = this.attributes;
    for (const attr of Object.values(this.attributes)) attr.value = Math.min(attr.value, attr.max);
    this.aura.value = Math.min(this.aura.value, this.aura.max);
    this.guard.max = Math.max(0, 2 * brabo.max + ligeiro.max + this.guard.bonus);
    this.guard.value = Math.min(this.guard.value, this.guard.max);
    this.memory.max = Math.max(0, safo.max + 1 + this.memory.bonus);
    this.memory.value = Math.min(this.memory.value, this.memory.max);
    this.woundCount = BABELEM.wounds.filter(w => this.wounds[w]).length;
    this.restrictionsMax = this.aura.max;
    this.abilitiesMax = this.memory.max;
  }

  get initiative() {
    return 2;
  }
}

export class ThreatData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      grade: intField(1, { min: 0, max: 4 }),
      archetype: choiceField(BABELEM.archetypes, "normal"),
      origin: choiceField(BABELEM.origins, "litura"),
      guard: resourceField(12),
      danger: resourceField(3),
      defense: resourceField(1),
      brabo: resourceField(0),
      barrier: intField(0, { min: 0 }),
      resistances: damageFlagsField(),
      vulnerabilities: damageFlagsField(),
      interactionsPerTurn: new fields.StringField({ initial: "" }),
      special: new fields.HTMLField({ initial: "" }),
      tactics: new fields.HTMLField({ initial: "" }),
      power: new fields.HTMLField({ initial: "" }),
      weakness: new fields.HTMLField({ initial: "" }),
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    for (const key of ["guard", "danger", "defense", "brabo"]) {
      this[key].value = Math.min(this[key].value, this[key].max);
    }
    this.attackHits = this.grade + this.danger.value;
  }

  get initiative() {
    return 1;
  }
}
