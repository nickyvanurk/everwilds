import { WebSocketServer } from 'ws';
import { World } from './world';
import { Player } from './player';
import { WorldSocket } from './world-socket';

const server = new WebSocketServer({ port: 8080 });

console.log('Starting Spellforge game server...');

const world = new World('world0', 2, server);
world.run();

server.on('connection', ws => {
   const socket = new WorldSocket(ws);
   new Player(socket, world);

   ws.on('error', error => {
      console.log(`Error: ${error}`);
   });
});
