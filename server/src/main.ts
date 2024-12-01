import { WebSocketServer } from 'ws';
import { World } from './world';
import { WorldSocket } from './world-socket';
import { WorldSession } from './world-session';

console.log('Starting Spellforge game server...');
const server = new WebSocketServer({ port: 8080 });

const world = new World('world0', 2);
world.run();

server.on('connection', ws => {
   const socket = new WorldSocket(ws);
   const session = new WorldSession(
      Number.parseInt(`4${Math.floor(Math.random() * 1000)}`),
      socket,
      world,
   );
});
