import { SYSTEM_ID } from "../config.mjs";
import { getCommonPool, getWeave } from "../helpers/settings.mjs";
import { adjustCommonPool, adjustWeave, endScene, rollEchoDie, startSession } from "../helpers/weave.mjs";

const TEMPLATE = `systems/${SYSTEM_ID}/templates/apps/weave-panel.hbs`;

export class WeavePanel {
  element = null;
  collapsed = false;

  async render() {
    if (!game.settings.get(SYSTEM_ID, "showWeavePanel")) return this.toggle(false);
    const html = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
      weave: getWeave(),
      pool: getCommonPool(),
      isGM: game.user.isGM,
      canAdjustPool: game.user.isGM || game.settings.get(SYSTEM_ID, "playersAdjustPool"),
      collapsed: this.collapsed
    });
    if (!this.element) {
      this.element = document.createElement("section");
      this.element.id = "babelem-weave-panel";
      this.element.classList.add("babelem");
      this.element.addEventListener("click", this.#onClick.bind(this));
      document.body.appendChild(this.element);
    }
    this.element.innerHTML = html;
    this.element.classList.toggle("collapsed", this.collapsed);
  }

  toggle(visible) {
    if (visible) return this.render();
    this.element?.remove();
    this.element = null;
  }

  async #onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();
    const delta = Number(button.dataset.delta) || 0;
    switch (button.dataset.action) {
      case "weave":
        if (game.user.isGM) await adjustWeave(delta);
        break;
      case "pool":
        await adjustCommonPool(delta);
        break;
      case "clearPool":
        if (game.user.isGM) await adjustCommonPool(-getCommonPool());
        break;
      case "echo":
        await rollEchoDie({ bonus: event.shiftKey ? await this.#promptBonus() : 0 });
        break;
      case "endScene":
        await endScene();
        break;
      case "startSession":
        await startSession();
        break;
      case "collapse":
        this.collapsed = !this.collapsed;
        await this.render();
        break;
    }
  }

  async #promptBonus() {
    const value = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("BABELEM.EchoDie.title") },
      content: `<div class="form-group"><label>${game.i18n.localize("BABELEM.EchoDie.bonus")}</label><input type="number" name="bonus" value="0" min="0" autofocus></div>`,
      ok: { callback: (event, button) => Number(button.form.elements.bonus.value) || 0 },
      rejectClose: false
    });
    return value ?? 0;
  }
}
