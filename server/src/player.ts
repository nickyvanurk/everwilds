import { MessageType } from '../../shared/src/gametypes';
import { Entity } from './entity';
import type { World } from './world';
import * as Message from './message';
import type { WorldSocket } from './world-socket';

export class Player extends Entity {
   constructor(
      public socket: WorldSocket,
      private world: World,
   ) {
      super(Number.parseInt(`5${Math.floor(Math.random() * 1000)}`)); // TODO: ws wrapper + use connection id

      socket.ws.on('message', (message: (string | number)[]) => {
         message = JSON.parse(message.toString());
         const action = +message[0];

         if (action === MessageType.Hello) {
            const name = message[1]; // TODO: Sanitize
            const id = this.id;
            const x = this.x;
            const y = this.y;
            const z = this.z;

            socket.ws.send(
               JSON.stringify([MessageType.Welcome, id, name, x, y, z]),
            );

            this.world.addPlayer(this);
            this.world.pushRelevantEntityListToPlayer(this);

            this.world.broadcast(new Message.Spawn(this), this.id);
         } else if (action === MessageType.Who) {
            this.world.pushSpawnsToPlayer(this, message.slice(1).map(Number));
         } else if (action === MessageType.Move) {
            this.x = message[1] as number;
            this.y = message[2] as number;
            this.z = message[3] as number;

            this.world.broadcast(new Message.Move(this), this.id);
         }
      });

      socket.ws.on('close', () => {
         this.world.removePlayer(this);
      });

      socket.ws.send('go'); // Notify client that the HELLO/WELCOME handshake can start
   }
}
