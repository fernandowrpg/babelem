const fields = foundry.data.fields;

export function resourceField(initial = 0, max = initial) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, min: 0, initial, nullable: false }),
    max: new fields.NumberField({ required: true, integer: true, min: 0, initial: max, nullable: false })
  });
}

export function intField(initial = 0, options = {}) {
  return new fields.NumberField({ required: true, integer: true, initial, nullable: false, ...options });
}

export function damageFlagsField() {
  return new fields.SchemaField({
    kinetic: new fields.BooleanField({ initial: false }),
    void: new fields.BooleanField({ initial: false }),
    energy: new fields.BooleanField({ initial: false })
  });
}

export function choiceField(choices, initial) {
  return new fields.StringField({ required: true, blank: initial === "", initial, choices: () => Object.keys(choices) });
}

export function costField(resources, initial = "aura") {
  return new fields.SchemaField({
    value: intField(0, { min: 0 }),
    resource: choiceField(resources, initial)
  });
}

export function testField(config) {
  return new fields.SchemaField({
    attack: choiceField(config.attackTypes, ""),
    attribute: new fields.StringField({ required: true, blank: true, initial: "" }),
    alt: new fields.StringField({ required: true, blank: true, initial: "" }),
    bonus: intField(0),
    damageType: choiceField(config.damageTypes, "kinetic")
  });
}

export function restrictionField(config) {
  return new fields.SchemaField({
    type: choiceField(config.restrictionTypes, "none"),
    text: new fields.StringField({ required: true, blank: true, initial: "" }),
    benefit: new fields.StringField({ required: true, blank: true, initial: "" })
  });
}
