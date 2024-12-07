import EventEmitter from "eventemitter3";

export const input = new EventEmitter();

export const actions: { [action: string]: boolean } = {};

export function setKeyBindings (bindings: KeyBinding[]) {
  for (const binding of bindings) {
    actions[binding.action] = false;
    keyBindings[binding.key] = binding.action;
  }
}

const keyBindings: { [key: string]: string } = {};

window.addEventListener('keydown', handleKeyEvent);
window.addEventListener('keyup', handleKeyEvent);

function handleKeyEvent(ev: KeyboardEvent) {
  const action = keyBindings[ev.code];
  if (action) {
    const previousAction = actions[action];
    actions[action] = ev.type === 'keydown';

    if (previousAction !== actions[action]) {
      input.emit(action, actions[action]);
    }
  }
}

type KeyBinding = {
  action: string;
  key: string;
};
