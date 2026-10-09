import { BABELEM, SYSTEM_ID } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

function localized(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, game.i18n.localize(v)]));
}

export class BabelemItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["babelem", "sheet", "item"],
    position: { width: 560, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editImage: BabelemItemSheet.#onEditImage,
      useItem: BabelemItemSheet.#onUseItem
    }
  };

  static PARTS = {
    sheet: {
      template: `systems/${SYSTEM_ID}/templates/item/item-sheet.hbs`,
      scrollable: [".sheet-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    const sys = item.system;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const enrichOptions = { relativeTo: item, secrets: item.isOwner };
    const attributeChoices = { "": game.i18n.localize("BABELEM.Attack.none"), ...localized(BABELEM.attributes) };
    Object.assign(context, {
      item,
      system: sys,
      source: sys._source,
      fields: sys.schema.fields,
      editable: this.isEditable,
      typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
      is: { [item.type]: true },
      isAbility: item.type === "technique" || item.type === "spell",
      choices: {
        resources: localized(BABELEM.resources),
        threatResources: localized(BABELEM.threatResources),
        attackTypes: localized(BABELEM.attackTypes),
        attributes: attributeChoices,
        damageTypes: localized(BABELEM.damageTypes),
        ranges: localized(BABELEM.ranges),
        techniqueTypes: localized(BABELEM.techniqueTypes),
        planes: localized(BABELEM.planes),
        activations: localized(BABELEM.activations),
        interactionKinds: localized(BABELEM.interactionKinds),
        restrictionTypes: localized(BABELEM.restrictionTypes)
      },
      damageFlags: sys.resistances ? Object.entries(BABELEM.damageTypes).map(([key, label]) => ({
        key,
        label: game.i18n.localize(label),
        checked: sys.resistances[key]
      })) : [],
      enriched: {
        description: await TextEditor.enrichHTML(sys.description ?? "", enrichOptions),
        extraRelease: await TextEditor.enrichHTML(sys.extraRelease ?? "", enrichOptions)
      }
    });
    return context;
  }

  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    if (this.document.type === "essence") {
      const triggers = foundry.utils.getProperty(data, "system.triggers");
      if (triggers && !Array.isArray(triggers)) {
        foundry.utils.setProperty(data, "system.triggers", Object.keys(triggers).sort().map(k => triggers[k]));
      }
    }
    return data;
  }

  static #onEditImage() {
    if (!this.isEditable) return;
    const FilePicker = foundry.applications.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    new FilePicker({
      type: "image",
      current: this.document.img,
      callback: path => this.document.update({ img: path })
    }).browse();
  }

  static async #onUseItem() {
    await this.document.use();
  }
}
