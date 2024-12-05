import type { Player } from './player';
import type { Entity } from './entity';
import * as Packet from '../../shared/src/packets';

export class World {
   private entities: { [key: number]: Entity } = {};
   private players: { [key: number]: Player } = {};

   constructor(
      private id: string,
      private maxPlayers: number,
   ) {
      console.log(`${this.id} created (capacity: ${this.maxPlayers})`);
   }

   update(_dt: number) {}

   getEntityById(id: number) {
      if (id in this.entities) {
         return this.entities[id];
      }

      console.log(`Unknown entity : ${id}`);
   }

   addPlayer(player: Player) {
      this.entities[player.id] = player;
      this.players[player.id] = player;

      console.log(`Added player: ${player.id}`);
   }

   removePlayer(player: Player) {
      this.broadcast(Packet.Despawn.serialize(player.id), player.id);

      delete this.entities[player.id];
      delete this.players[player.id];

      console.log(`Removed player: ${player.id}`);
   }

   pushToPlayer(player: Player, packet: any[]) {
      if (player) {
         player.socket.send(packet);
      } else {
         console.log('pushToPlayer: player was undefined');
      }
   }

   pushEntitiesToPlayer(player: Player) {
      if (!player) return;

      for (const entity of Object.values(this.entities)) {
         if (entity.id === player.id) {
            continue;
         }

         //@ts-ignore
         this.pushToPlayer(player, Packet.Spawn.serialize(entity.serverTime, entity.id, entity.flag, entity.name, entity.x, entity.y, entity.z, entity.orientation));
      }
   }

   broadcast(packet: any[], ignoredPlayerId?: number) {
      for (const playerId in this.players) {
         if (+playerId === ignoredPlayerId) {
            continue;
         }

         this.pushToPlayer(this.players[playerId], packet);
      }
   }
}
