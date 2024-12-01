import './globals';
import { Game } from './game';

const game = new Game();

game.setServerOptions('localhost', 8080, 'Balthazar');

game.run();
