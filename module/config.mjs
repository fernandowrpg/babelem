export const SYSTEM_ID = "babelem";

export const BABELEM = {
  attributes: {
    brabo: "BABELEM.Attribute.brabo",
    ligeiro: "BABELEM.Attribute.ligeiro",
    safo: "BABELEM.Attribute.safo"
  },
  resources: {
    none: "BABELEM.Resource.none",
    aura: "BABELEM.Resource.aura",
    brabo: "BABELEM.Attribute.brabo",
    ligeiro: "BABELEM.Attribute.ligeiro",
    safo: "BABELEM.Attribute.safo",
    special: "BABELEM.Resource.special"
  },
  threatResources: {
    none: "BABELEM.Resource.none",
    danger: "BABELEM.Threat.danger",
    defense: "BABELEM.Threat.defense",
    brabo: "BABELEM.Attribute.brabo",
    weave: "BABELEM.Weave.label"
  },
  attackTypes: {
    "": "BABELEM.Attack.none",
    brabo: "BABELEM.Attack.brabo",
    ligeiro: "BABELEM.Attack.ligeiro",
    safo: "BABELEM.Attack.safo"
  },
  damageTypes: {
    kinetic: "BABELEM.Damage.kinetic",
    void: "BABELEM.Damage.void",
    energy: "BABELEM.Damage.energy"
  },
  ranges: {
    "": "BABELEM.Range.none",
    short: "BABELEM.Range.short",
    long: "BABELEM.Range.long",
    wide: "BABELEM.Range.wide"
  },
  idealRanges: {
    close: "BABELEM.Style.close",
    far: "BABELEM.Style.far"
  },
  techniqueTypes: {
    atq: "BABELEM.Technique.atq",
    sup: "BABELEM.Technique.sup",
    reac: "BABELEM.Technique.reac"
  },
  planes: {
    oblivo: "BABELEM.Plane.oblivo",
    litura: "BABELEM.Plane.litura"
  },
  activations: {
    action: "BABELEM.Activation.action",
    reaction: "BABELEM.Activation.reaction",
    freeAction: "BABELEM.Activation.freeAction",
    actionChannel: "BABELEM.Activation.actionChannel",
    special: "BABELEM.Activation.special"
  },
  interactionKinds: {
    action: "BABELEM.Activation.action",
    maneuver: "BABELEM.Activation.maneuver",
    reaction: "BABELEM.Activation.reaction",
    freeAction: "BABELEM.Activation.freeAction"
  },
  restrictionTypes: {
    none: "BABELEM.Restriction.none",
    minor: "BABELEM.Restriction.minor",
    major: "BABELEM.Restriction.major"
  },
  origins: {
    litura: "BABELEM.Plane.litura",
    oblivo: "BABELEM.Plane.oblivo",
    babelem: "BABELEM.Threat.originBabelem",
    other: "BABELEM.Threat.originOther"
  },
  archetypes: {
    normal: "BABELEM.Threat.archetypeNormal",
    boss: "BABELEM.Threat.archetypeBoss",
    minion: "BABELEM.Threat.archetypeMinion"
  },
  grades: {
    0: "BABELEM.Threat.grade0",
    1: "BABELEM.Threat.grade1",
    2: "BABELEM.Threat.grade2",
    3: "BABELEM.Threat.grade3",
    4: "BABELEM.Threat.grade4"
  },
  threatTable: {
    0: { guard: 6, danger: 2, defense: 0 },
    1: { guard: 12, danger: 3, defense: 1 },
    2: { guard: 18, danger: 4, defense: 2 },
    3: { guard: 24, danger: 5, defense: 3 },
    4: { guard: 32, danger: 6, defense: 4 }
  },
  wounds: ["temporary", "serious", "mortal"],
  maxDice: 9,
  minDice: 1,
  echoDie: "1d8",
  statusEffects: [
    { id: "impeded", name: "BABELEM.Status.impeded", img: "icons/svg/net.svg" },
    { id: "compelled", name: "BABELEM.Status.compelled", img: "icons/svg/terror.svg" },
    { id: "stunned", name: "BABELEM.Status.stunned", img: "icons/svg/daze.svg" },
    { id: "offBalance", name: "BABELEM.Status.offBalance", img: "icons/svg/falling.svg" },
    { id: "favored", name: "BABELEM.Status.favored", img: "icons/svg/upgrade.svg" },
    { id: "disfavored", name: "BABELEM.Status.disfavored", img: "icons/svg/downgrade.svg" },
    { id: "hidden", name: "BABELEM.Status.hidden", img: "icons/svg/invisible.svg" },
    { id: "channeling", name: "BABELEM.Status.channeling", img: "icons/svg/aura.svg" },
    { id: "guardRaised", name: "BABELEM.Status.guardRaised", img: "icons/svg/shield.svg" },
    { id: "exhausted", name: "BABELEM.Status.exhausted", img: "icons/svg/unconscious.svg" },
    { id: "poisoned", name: "BABELEM.Status.poisoned", img: "icons/svg/poison.svg" },
    { id: "blinded", name: "BABELEM.Status.blinded", img: "icons/svg/blind.svg" },
    { id: "exposed", name: "BABELEM.Status.exposed", img: "icons/svg/target.svg" },
    { id: "dead", name: "BABELEM.Status.defeated", img: "icons/svg/skull.svg" }
  ],
  conditionIds: ["impeded", "compelled", "stunned", "offBalance", "favored", "disfavored", "hidden", "channeling", "guardRaised", "exhausted", "poisoned", "blinded", "exposed", "dead"],
  itemTypesByActor: {
    character: ["essence", "trait", "technique", "spell", "style", "gear"],
    threat: ["technique", "spell", "interaction", "trait", "gear"]
  },
  uniqueItemTypes: ["essence", "trait", "technique", "spell", "style"]
};
