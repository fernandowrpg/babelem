import { SYSTEM_ID } from "../config.mjs";

const CHANNEL = `system.${SYSTEM_ID}`;
const handlers = {};

function isResponsibleGM() {
  const active = game.users.activeGM;
  return active ? active.isSelf : game.user.isGM;
}

export function registerSocket() {
  game.socket.on(CHANNEL, async payload => {
    if (!payload?.action || !isResponsibleGM()) return;
    const handler = handlers[payload.action];
    if (handler) await handler(payload.data ?? {});
  });
}

export function registerSocketHandler(action, handler) {
  handlers[action] = handler;
}

export async function runAsGM(action, data = {}) {
  if (game.user.isGM) return handlers[action]?.(data);
  if (!game.users.activeGM) {
    ui.notifications.warn(game.i18n.localize("BABELEM.Notify.noGM"));
    return;
  }
  game.socket.emit(CHANNEL, { action, data });
}
