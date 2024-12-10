import './globals';
import { Game } from './game';

const game = new Game('localhost', 8080, 'Balthazar');
await game.init();

game.run();
