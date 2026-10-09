import { BABELEM } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const NATIVE_DRAG_DROP = typeof ActorSheetV2.prototype._onDropItem === "function";
const HANDLED_DROPS = new WeakSet();

function dragDropClass() {
  const DD = foundry.applications.ux?.DragDrop ?? globalThis.DragDrop;
  return DD?.implementation ?? DD;
}

export class BabelemActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  #dragDrop = null;

  static DEFAULT_OPTIONS = {
    classes: ["babelem", "sheet", "actor"],
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      itemUse: BabelemActorSheet.#onItemUse,
      itemEdit: BabelemActorSheet.#onItemEdit,
      itemDelete: BabelemActorSheet.#onItemDelete,
      itemCreate: BabelemActorSheet.#onItemCreate,
      itemToggle: BabelemActorSheet.#onItemToggle,
      itemChat: BabelemActorSheet.#onItemChat,
      trackerStep: BabelemActorSheet.#onTrackerStep,
      toggleStatus: BabelemActorSheet.#onToggleStatus,
      editImage: BabelemActorSheet.#onEditImage,
      openCompendium: BabelemActorSheet.#onOpenCompendium
    }
  };

  constructor(options = {}) {
    super(options);
    const DragDrop = dragDropClass();
    if (DragDrop) {
      this.#dragDrop = new DragDrop({
        dragSelector: ".draggable",
        dropSelector: null,
        permissions: {
          dragstart: () => this.isEditable,
          drop: () => this.isEditable
        },
        callbacks: {
          dragstart: this.#onFallbackDragStart.bind(this),
          drop: this.#onFallbackDrop.bind(this)
        }
      });
    }
  }

  get actor() {
    return this.document;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const enrich = html => TextEditor.enrichHTML(html ?? "", { relativeTo: actor, secrets: actor.isOwner });
    const items = {};
    for (const item of actor.items.contents.sort((a, b) => (a.sort || 0) - (b.sort || 0))) {
      items[item.type] ??= [];
      items[item.type].push({
        id: item.id,
        uuid: item.uuid,
        name: item.name,
        img: item.img,
        type: item.type,
        system: item.system,
        cost: item.isAbility || item.type === "interaction" ? item.costLabel : "",
        description: await enrich(item.system.description),
        expanded: this._expanded.has(item.id)
      });
    }
    const statuses = BABELEM.statusEffects.map(s => ({
      id: s.id,
      label: game.i18n.localize(s.name),
      img: s.img,
      active: actor.statuses.has(s.id)
    }));
    Object.assign(context, {
      actor,
      system: actor.system,
      source: actor.system._source,
      fields: actor.system.schema.fields,
      config: BABELEM,
      items,
      statuses,
      editable: this.isEditable,
      owner: actor.isOwner,
      isGM: game.user.isGM
    });
    return context;
  }

  get _expanded() {
    this.__expanded ??= new Set();
    return this.__expanded;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.#dragDrop?.bind(this.element);
    for (const input of this.element.querySelectorAll("input[data-dtype='Number'], input[type='number']")) {
      input.addEventListener("focus", ev => ev.currentTarget.select());
    }
  }

  async _onDropItem(event, item) {
    if (!this.actor.isOwner || !item || HANDLED_DROPS.has(event)) return null;
    HANDLED_DROPS.add(event);
    if (item.parent?.uuid === this.actor.uuid) {
      return typeof super._onSortItem === "function" ? super._onSortItem(event, item) : null;
    }
    const allowed = BABELEM.itemTypesByActor[this.actor.type] ?? [];
    if (!allowed.includes(item.type)) {
      ui.notifications.warn(game.i18n.format("BABELEM.Notify.itemNotAllowed", {
        type: game.i18n.localize(`TYPES.Item.${item.type}`),
        actor: game.i18n.localize(`TYPES.Actor.${this.actor.type}`)
      }));
      return null;
    }
    const existing = this.actor.items.find(i => i.type === item.type && i.name === item.name);
    if (existing && item.type === "gear") {
      return existing.update({ "system.quantity": (existing.system.quantity ?? 0) + (item.system.quantity || 1) });
    }
    if (existing && BABELEM.uniqueItemTypes.includes(item.type)) {
      ui.notifications.info(game.i18n.format("BABELEM.Notify.alreadyHas", { name: item.name }));
      return null;
    }
    if (item.type === "essence") {
      const old = this.actor.items.filter(i => i.type === "essence").map(i => i.id);
      if (old.length) await this.actor.deleteEmbeddedDocuments("Item", old);
    }
    const data = item.pack ? game.items.fromCompendium(item) : item.toObject();
    delete data._id;
    const [created] = await this.actor.createEmbeddedDocuments("Item", [data]);
    this._afterItemDropped(created);
    return created ?? null;
  }

  _afterItemDropped(item) {
    if (!item || this.actor.type !== "character") return;
    if (item.type === "trait") {
      const count = this.actor.items.filter(i => i.type === "trait").length;
      if (count > 2) ui.notifications.info(game.i18n.localize("BABELEM.Notify.traitsLimit"));
    }
    if (item.isAbility) {
      const count = this.actor.items.filter(i => i.isAbility).length;
      if (count > this.actor.system.abilitiesMax) {
        ui.notifications.info(game.i18n.format("BABELEM.Notify.abilitiesLimit", { max: this.actor.system.abilitiesMax }));
      }
    }
  }

  #onFallbackDragStart(event) {
    const row = event.currentTarget.closest("[data-item-id]");
    const item = row ? this.actor.items.get(row.dataset.itemId) : null;
    if (!item) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));
  }

  async #onFallbackDrop(event) {
    const TextEditor = foundry.applications.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
    const data = TextEditor.getDragEventData(event);
    if (!NATIVE_DRAG_DROP && Hooks.call("dropActorSheetData", this.actor, this, data) === false) return;
    if (data.type !== "Item") return;
    const item = await Item.implementation.fromDropData(data);
    return this._onDropItem(event, item);
  }

  _getItem(target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return id ? this.actor.items.get(id) : null;
  }

  static async #onItemUse(event, target) {
    const item = this._getItem(target);
    if (item) await item.use({ skipDialog: event.shiftKey });
  }

  static async #onItemChat(event, target) {
    const item = this._getItem(target);
    if (item) await item.toChat();
  }

  static #onItemEdit(event, target) {
    this._getItem(target)?.sheet.render(true);
  }

  static async #onItemDelete(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("BABELEM.Item.delete") },
      content: `<p>${game.i18n.format("BABELEM.Item.deleteConfirm", { name: item.name })}</p>`,
      rejectClose: false
    });
    if (confirmed) await item.delete();
  }

  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const name = game.i18n.format("BABELEM.Item.new", { type: game.i18n.localize(`TYPES.Item.${type}`) });
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{ name, type }]);
    item?.sheet.render(true);
  }

  static #onItemToggle(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    if (this._expanded.has(item.id)) this._expanded.delete(item.id);
    else this._expanded.add(item.id);
    this.render();
  }

  static async #onTrackerStep(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const delta = Number(target.dataset.delta) || 0;
    const tracker = item.system.tracker;
    let value = Math.max(0, tracker.value + delta);
    if (tracker.max > 0) value = Math.min(tracker.max, value);
    await item.update({ "system.tracker.value": value });
  }

  static async #onToggleStatus(event, target) {
    await this.actor.toggleStatusEffect(target.dataset.status, { overlay: target.dataset.status === "dead" });
  }

  static async #onEditImage(event, target) {
    if (!this.isEditable) return;
    const FilePicker = foundry.applications.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    const picker = new FilePicker({
      type: "image",
      current: this.actor.img,
      callback: path => this.actor.update({ img: path })
    });
    picker.browse();
  }

  static #onOpenCompendium(event, target) {
    const lang = game.i18n.lang?.startsWith("pt") ? "pt" : "en";
    const pack = game.packs.get(`babelem.${target.dataset.pack}-${lang}`);
    pack?.render(true);
  }
}
