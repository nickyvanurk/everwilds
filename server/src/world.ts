import type { Player } from './player';
import * as Packet from '../../shared/src/packets';

export class World {
   private players: { [key: number]: Player } = {};

   constructor() {
      console.log(`World created`);
   }

   update(_dt: number) {}

   getPlayerById(id: number) {
      if (id in this.players) {
         return this.players[id];
      }

      console.log(`Unknown entity : ${id}`);
   }

   addPlayer(player: Player) {
      this.players[player.id] = player;

      console.log(`Added player: ${player.id}`);
   }

   removePlayer(player: Player) {
      this.broadcast(Packet.Despawn.serialize(player.id), player.id);

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

   pushPlayersToPlayer(player: Player) {
      if (!player) return;

      for (const other of Object.values(this.players)) {
         if (player.id === other.id) {
            continue;
         }

         this.pushToPlayer(player, Packet.Spawn.serialize(other.serverTime, other.id, other.flag, other.name, other.x, other.y, other.z, other.orientation));
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
