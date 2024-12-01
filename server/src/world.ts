import type { Player } from './player';
import type { Entity } from './entity';
import * as Message from './message';
import type { WorldSession } from './world-session';

export class World {
   private ups = 50;

   private sessions: { [key: number]: WorldSession } = {};
   private entities: { [key: number]: Entity } = {};
   private players: { [key: number]: Player } = {};

   // biome-ignore lint/suspicious/noExplicitAny: <explanation>
   private outgoingQueues: { [key: number]: any[] } = {};

   constructor(
      private id: string,
      private maxPlayers: number,
   ) {}

   run() {
      setInterval(() => {
         this.processQueues();
      }, 1000 / this.ups);

      console.log(`${this.id} created (capacity: ${this.maxPlayers})`);
   }

   getEntityById(id: number) {
      if (id in this.entities) {
         return this.entities[id];
      }

      console.log(`Unknown entity : ${id}`);
   }

   addSession(session: WorldSession) {
      this.sessions[session.id] = session;
   }

   addPlayer(player: Player) {
      this.entities[player.id] = player;
      this.players[player.id] = player;
      this.outgoingQueues[player.id] = [];

      console.log(`Added player: ${player.id}`);
   }

   removePlayer(player: Player) {
      this.broadcast(new Message.Despawn(player.id));

      delete this.entities[player.id];
      delete this.players[player.id];
      delete this.outgoingQueues[player.id];

      console.log(`Removed player: ${player.id}`);
   }

   pushToPlayer(player: Player, message: Message.Message) {
      if (player && player.id in this.outgoingQueues) {
         this.outgoingQueues[player.id].push(message.serialize());
      } else {
         console.log('pushToPlayer: player was undefined');
      }
   }

   pushRelevantEntityListToPlayer(player: Player) {
      if (player) {
         const ids = Object.keys(this.entities)
            .filter(id => Number.parseInt(id) !== player.id)
            .map(id => Number.parseInt(id));
         if (ids) {
            this.pushToPlayer(player, new Message.List(ids));
         }
      }
   }

   pushSpawnsToPlayer(player: Player, ids: number[]) {
      for (const id of ids) {
         const entity = this.getEntityById(id);
         if (entity) {
            this.pushToPlayer(player, new Message.Spawn(entity));
         }
      }

      console.log(`Pushed ${ids.length} new spawns to ${player.id}`);
   }

   broadcast(message: Message.Message, ignoredPlayerId?: number) {
      for (const playerId in this.players) {
         if (+playerId === ignoredPlayerId) {
            continue;
         }

         this.pushToPlayer(this.players[playerId], message);
      }
   }

   // TODO: Doesn't belong in this class. Move the queues to WorldSession.
   processQueues() {
      for (const playerId in this.outgoingQueues) {
         const player = this.players[playerId];
         const queue = this.outgoingQueues[playerId];

         if (queue.length > 0) {
            player.session.socket.sendPacket(queue);
            this.outgoingQueues[playerId] = [];
         }
      }
   }
}
