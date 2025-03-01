export const host = 'localhost';
export const port = 3000;

export const assets = [
  {
    type: 'font',
    name: 'helvetiker',
    src: 'fonts/helvetiker_regular.typeface.json',
  },
];

export const keyBindings = [
  { action: 'forward', key: ['KeyW', 'ArrowUp'] },
  { action: 'backward', key: ['KeyS', 'ArrowDown'] },
  { action: 'left', key: ['KeyA', 'ArrowLeft'] },
  { action: 'right', key: ['KeyD', 'ArrowRight'] },
  { action: 'jump', key: 'Space' },
  { action: 'toggleNameplates', key: 'KeyV' },
];

export const nameplatesVisibleByDefault = true;
