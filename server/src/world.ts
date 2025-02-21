import type { Player } from './player';
import * as Packet from '../../shared/src/packets';

export class World {
  private players: { [key: number]: Player } = {};

  constructor() {
    log.debug('World created');
  }

  update(_dt: number) {}

  getPlayerById(id: number) {
    if (id in this.players) {
      return this.players[id];
    }

    log.debug(`Unknown entity : ${id}`);
  }

  addPlayer(player: Player) {
    this.players[player.id] = player;

    log.debug(`Added player: ${player.id}`);
  }

  removePlayer(player: Player) {
    this.broadcast(Packet.Despawn.serialize(player.id), player.id);

    delete this.players[player.id];

    log.debug(`Removed player: ${player.id}`);
  }

  pushToPlayer(player: Player, packet: (number | string)[]) {
    if (player) {
      player.socket.send(packet);
    } else {
      log.debug('pushToPlayer: player was undefined');
    }
  }

  pushPlayersToPlayer(player: Player) {
    if (!player) return;

    for (const other of Object.values(this.players)) {
      if (player.id === other.id) {
        continue;
      }

      this.pushToPlayer(
        player,
        Packet.Spawn.serialize(
          other.id,
          other.flags,
          other.name,
          other.x,
          other.y,
          other.z,
          other.orientation,
        ),
      );
    }
  }

  broadcast(packet: Packet.Serialized, ignoredPlayerId?: number) {
    for (const playerId in this.players) {
      if (+playerId === ignoredPlayerId) {
        continue;
      }

      this.pushToPlayer(this.players[playerId], packet);
    }
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }
}
