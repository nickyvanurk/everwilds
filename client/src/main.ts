import './globals';
import { Game } from './game';

const game = new Game('localhost', 8080, 'Balthazar');
await game.hud.init();

game.run();
