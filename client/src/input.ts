import EventEmitter from 'eventemitter3';
import type { Unit } from './unit';

export const input = new EventEmitter();

export const mouseState: { [button: string]: boolean } = {};
export const actions: { [action: string]: boolean } = {};
export const inputEvents = [] as {
  type: string;
  data: {
    button: string;
    pointer?: { x: number; y: number };
    unit?: Unit;
    origin?: string;
  };
}[];

export function setKeyBindings(bindings: KeyBinding[]) {
  for (const binding of bindings) {
    actions[binding.action] = false;

    if (Array.isArray(binding.key)) {
      for (const key of binding.key) {
        keyBindings[key] = binding.action;
      }
    } else {
      keyBindings[binding.key] = binding.action;
    }
  }
}

const keyBindings: { [key: string]: string } = {};
const releasedActions: { [action: string]: boolean } = {};

window.addEventListener('keydown', handleKeyEvent);
window.addEventListener('keyup', handleKeyEvent);

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

let isDragging = false;
const prevPointer = { x: 0, y: 0 };
const pointer = { x: 0, y: 0 };
const dragThreshold = 2; // Minimum pixels moved to be considered a drag

function pointerToClipSpace(pointer: { x: number; y: number }) {
  return {
    x: (pointer.x / window.innerWidth) * 2 - 1,
    y: -(pointer.y / window.innerHeight) * 2 + 1,
  };
}

window.onpointerdown = ev => {
  pointer.x = ev.clientX;
  pointer.y = ev.clientY;
  prevPointer.x = pointer.x;
  prevPointer.y = pointer.y;
  isDragging = false;

  if (ev.pointerType === 'mouse') {
    mouseState.lmb = !!(ev.buttons & 1);
    mouseState.rmb = !!(ev.buttons & 2);
    mouseState.mmb = !!(ev.buttons & 4);
  }
};

window.onpointerup = ev => {
  pointer.x = ev.clientX;
  pointer.y = ev.clientY;

  if (ev.pointerType === 'mouse') {
    mouseState.lmb = !!(ev.buttons & 1);
    mouseState.rmb = !!(ev.buttons & 2);
    mouseState.mmb = !!(ev.buttons & 4);

    const pointerClip = pointerToClipSpace(pointer);
    const prevPointerClip = pointerToClipSpace(prevPointer);

    if (isDragging) {
      input.emit('mouseDragEnd', {
        pointer: pointerClip,
        prevPointer: prevPointerClip,
      });
    } else {
      const button =
        ev.button === 0 ? 'left' : ev.button === 2 ? 'right' : 'middle';

      const target = game.sceneManager.getTargetEntityFromMouse(
        pointerClip.x,
        pointerClip.y,
      );
      if (target) {
        const targetedEntity = game.entityManager.getEntity(target.id);
        if (targetedEntity) {
          inputEvents.push({
            type: 'selectUnit',
            data: { unit: targetedEntity, button },
          });
        }
      } else {
        inputEvents.push({
          type: 'deselectUnit',
          data: { button },
        });
      }
    }

    isDragging = false;
  }
};

window.onpointermove = (ev: PointerEvent) => {
  if (ev.pointerType === 'mouse') {
    mouseState.lmb = !!(ev.buttons & 1);
    mouseState.rmb = !!(ev.buttons & 2);
    mouseState.mmb = !!(ev.buttons & 4);

    if (ev.buttons & 1 || ev.buttons & 2) {
      pointer.x = ev.clientX;
      pointer.y = ev.clientY;

      const dx = pointer.x - prevPointer.x;
      const dy = pointer.y - prevPointer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > dragThreshold) {
        const pointerClip = pointerToClipSpace(pointer);
        const prevPointerClip = pointerToClipSpace(prevPointer);

        if (!isDragging) {
          input.emit('mouseDragStart', {
            pointer: pointerClip,
            prevPointer: prevPointerClip,
          });
          isDragging = true;
        }

        input.emit('mouseDragging', {
          pointer: pointerClip,
          prevPointer: prevPointerClip,
        });
      }
    }
  }
};

type KeyBinding = {
  action: string;
  key: string | string[];
};
