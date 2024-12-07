import { GameServer } from './game-server';

const server = new GameServer(8080);

process.on('SIGINT', () => {
   server.shutdown();
   process.exit(0);
});
