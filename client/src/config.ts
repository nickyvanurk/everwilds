export const host = window.location.hostname;
export const port = 3000;

export const assets = [
  {
    type: 'font',
    name: 'helvetiker',
    src: 'helvetiker_regular.typeface.json',
  },
  {
    type: 'font',
    name: 'helvetiker_bold',
    src: 'helvetiker_bold.typeface.json',
  },
  {
    type: 'sound',
    name: 'background',
    src: 'background.ogg',
  },
  {
    type: 'sound',
    name: 'prejump',
    src: 'prejump.wav',
  },
  {
    type: 'sound',
    name: 'birds',
    src: 'birds.wav',
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

export const nameplatesVisibleByDefault = false;
