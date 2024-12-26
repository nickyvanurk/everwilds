import './globals';
import { Game } from './game';

const game = new Game();
await game.init();

game.run();
