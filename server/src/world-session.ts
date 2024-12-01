import { MessageType } from '../../shared/src/gametypes';
import { Player } from './player';
import type { World } from './world';
import type { WorldSocket } from './world-socket';
import * as Message from './message';

export class WorldSession {
   private player: Player | null = null;

   constructor(
      public id: number,
      public socket: WorldSocket,
      private world: World,
   ) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const handlers: any[] = [];
      handlers[MessageType.Hello] = this.handleHelloOpcode.bind(this);
      handlers[MessageType.Who] = this.handleWhoOpcode.bind(this);
      handlers[MessageType.Move] = this.handleMoveOpcode.bind(this);

      socket.onPacket((opcode, data) => {
         const handler = handlers[opcode];
         if (!handler) {
            console.log(`Unknown opcode: ${opcode}`);
            return;
         }

         handler(data);
      });

      socket.onClose(() => {
         if (!this.player) return;

         this.world.removePlayer(this.player);
         this.player = null;
      });

      socket.initiateHandshake();
   }

   // TODO: Pass parsed Hello packet as the argument
   handleHelloOpcode(data: (string | number)[]) {
      const name = data[0]; // TODO: Sanitize

      this.player = new Player(this);
      this.world.addSession(this);
      this.world.addPlayer(this.player);
      this.world.pushRelevantEntityListToPlayer(this.player);

      this.socket.sendPacket([
         MessageType.Welcome,
         this.player.id,
         name,
         this.player.x,
         this.player.y,
         this.player.z,
      ]);

      this.world.broadcast(new Message.Spawn(this.player), this.player.id);
   }

   // TODO: Pass parsed Who packet as the argument
   handleWhoOpcode(data: (string | number)[]) {
      if (!this.player) return;

      this.world.pushSpawnsToPlayer(this.player, data.map(Number));
   }

   // TODO: Pass parsed Move packet as the argument
   handleMoveOpcode(data: (string | number)[]) {
      if (!this.player) return;

      this.player.x = data[0] as number;
      this.player.y = data[1] as number;
      this.player.z = data[2] as number;

      this.world.broadcast(new Message.Move(this.player), this.player.id);
   }
}
