import EventEmitter from 'eventemitter3';

export const input = new EventEmitter();

export const actions: { [action: string]: boolean } = {};

export function setKeyBindings(bindings: KeyBinding[]) {
  for (const binding of bindings) {
    actions[binding.action] = false;
    keyBindings[binding.key] = binding.action;
  }
}

const keyBindings: { [key: string]: string } = {};

window.addEventListener('keydown', handleKeyEvent);
window.addEventListener('keyup', handleKeyEvent);

const releasedActions: { [action: string]: boolean } = {};

function handleKeyEvent(ev: KeyboardEvent) {
  const action = keyBindings[ev.code];

  if (action) {
    const isKeyDown = ev.type === 'keydown';

    if (isKeyDown) {
      const isKeyReleased =
        releasedActions[action] || releasedActions[action] === undefined;
      if (!actions[action] && isKeyReleased) {
        actions[action] = true;
        input.emit(action, true);
        releasedActions[action] = false;
      }
    } else {
      actions[action] = false;
      input.emit(action, false);
      releasedActions[action] = true;
    }
  }
}

type KeyBinding = {
  action: string;
  key: string;
};
