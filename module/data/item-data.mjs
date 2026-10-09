import { BABELEM } from "../config.mjs";
import { choiceField, costField, damageFlagsField, intField, restrictionField, testField } from "./fields.mjs";

const fields = foundry.data.fields;

class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
      d66: new fields.StringField({ initial: "" }),
      sourceKey: new fields.StringField({ initial: "" })
    };
  }
}

export class EssenceData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      triggers: new fields.ArrayField(new fields.StringField({ initial: "" }), { initial: ["", "", ""] })
    };
  }
}

export class TraitData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tracker: new fields.SchemaField({
        enabled: new fields.BooleanField({ initial: false }),
        label: new fields.StringField({ initial: "" }),
        value: intField(0, { min: 0 }),
        max: intField(0, { min: 0 })
      }),
      resistances: damageFlagsField()
    };
  }
}

export class TechniqueData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      techType: choiceField(BABELEM.techniqueTypes, "atq"),
      cost: new fields.SchemaField({
        value: intField(0, { min: 0 }),
        resource: choiceField(BABELEM.resources, "none"),
        channel: new fields.BooleanField({ initial: false })
      }),
      test: testField(BABELEM),
      restriction: restrictionField(BABELEM)
    };
  }

  get isAbility() {
    return true;
  }
}

export class SpellData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      plane: choiceField(BABELEM.planes, "oblivo"),
      activation: choiceField(BABELEM.activations, "action"),
      cost: new fields.SchemaField({
        value: intField(0, { min: 0 }),
        resource: choiceField(BABELEM.resources, "aura"),
        perTurn: new fields.BooleanField({ initial: false })
      }),
      extraCost: costField(BABELEM.resources, "aura"),
      extraRelease: new fields.HTMLField({ initial: "" }),
      test: testField(BABELEM),
      restriction: restrictionField(BABELEM)
    };
  }

  get isAbility() {
    return true;
  }
}

export class StyleData extends BaseItemData {}

export class GearData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: intField(1, { min: 0 })
    };
  }
}

export class InteractionData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      kind: choiceField(BABELEM.interactionKinds, "action"),
      attack: choiceField(BABELEM.attackTypes, ""),
      range: choiceField(BABELEM.ranges, ""),
      cost: costField(BABELEM.threatResources, "none"),
      damage: new fields.StringField({ initial: "" }),
      damageType: choiceField(BABELEM.damageTypes, "kinetic"),
      pierce: new fields.BooleanField({ initial: false })
    };
  }
}
