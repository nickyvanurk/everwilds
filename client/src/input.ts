import EventEmitter from 'eventemitter3';

export const input = new EventEmitter();

export const actions: { [action: string]: boolean } = {};
export const pointer = { x: 0, y: 0 };

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

window.onpointerdown = (ev: PointerEvent) => {
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;

  if (ev.pointerType !== 'mouse' || ev.button === 0) {
    input.emit('leftMouseButton', pointer);
  }
};

type KeyBinding = {
  action: string;
  key: string;
};
