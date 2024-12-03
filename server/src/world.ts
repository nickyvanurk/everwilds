import type { Player } from './player';
import type { Entity } from './entity';
import * as Packet from '../../shared/src/packets';
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
         for (const [_, session] of Object.entries(this.sessions)) {
            session.update(1000 / this.ups);
         }
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
      this.broadcast(new Packet.Despawn(player.id));

      delete this.entities[player.id];
      delete this.players[player.id];
      delete this.outgoingQueues[player.id];

      console.log(`Removed player: ${player.id}`);
   }

   pushToPlayer(player: Player, packet: Packet.Packet) {
      if (player && player.id in this.outgoingQueues) {
         this.outgoingQueues[player.id].push(packet.write());
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
            this.pushToPlayer(player, new Packet.List(ids));
         }
      }
   }

   broadcast(packet: Packet.Packet, ignoredPlayerId?: number) {
      for (const playerId in this.players) {
         if (+playerId === ignoredPlayerId) {
            continue;
         }

         this.pushToPlayer(this.players[playerId], packet);
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
