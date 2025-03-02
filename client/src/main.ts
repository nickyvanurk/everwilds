import './globals';
import { Game } from './game';

async function main() {
  const game = new Game();
  globalThis.game = game;
  await game.init();
  game.run();

  const audioContextListeners = new Map();
  const listenerKeys = [
    'keydown',
    'mousedown',
    'touchstart',
    'pointerdown',
    'visibilitychange',
  ];
  listenerKeys.forEach(key => {
    audioContextListeners.set(key, document.addEventListener(key, resumeAudio));
  });

  function resumeAudio() {
    if (game?.sceneManager?.audioListener?.context?.state === 'running') return;
    game?.sceneManager?.audioListener?.context?.resume?.();

    for (const [key, listener] of audioContextListeners) {
      document.removeEventListener(key, listener);
    }
  }
}

main();
