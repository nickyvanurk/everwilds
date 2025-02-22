import './globals';
import { Game } from './game';

async function main() {
  const game = new Game();
  await game.init();
  game.run();
}

main();
