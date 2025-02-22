import '../../shared/src/globals';
import { GameServer } from './game-server';

const server = new GameServer(3001);

process.on('SIGINT', () => {
  server.shutdown();
  process.exit(0);
});
