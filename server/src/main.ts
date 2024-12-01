import { WebSocketServer } from 'ws';
import { World } from './world';
import { Player } from './player';

const server = new WebSocketServer({ port: 8080 });

console.log('Starting Spellforge game server...');

const world = new World('world0', 2, server);
world.run();

server.on('connection', connection => {
   new Player(connection, world);

   connection.on('error', error => {
      console.log(`Error: ${error}`);
   });
});
