import type { Player } from './player';
import * as Packet from '../../shared/src/packets';
import { Unit } from './unit';
import type { Entity } from './entity';

export class World {
  private entities: { [key: number]: Entity } = {};
  private units: { [key: number]: Unit } = {};
  private players: { [key: number]: Player } = {};

  constructor() {
    log.debug('World created');

    // Create 10 monster units
    for (let i = 0; i < 10; i++) {
      const mob = new Unit('Monster', 0xff0000);
      mob.spawn(
        (Math.random() - 0.5) * 100,
        0,
        (Math.random() - 0.5) * 100,
        Math.random() * 360,
      );
      this.entities[mob.id] = mob;
      this.units[mob.id] = mob;
    }
  }

  update(dt: number) {
    for (const entity of Object.values(this.entities)) {
      entity.update(dt);
    }
  }

  getUnitById(id: number) {
    if (id in this.units) {
      return this.units[id];
    }

    log.debug(`Unknown unit : ${id}`);
  }

  addPlayer(player: Player) {
    this.entities[player.id] = player;
    this.units[player.id] = player;
    this.players[player.id] = player;

    log.debug(`Added player: ${player.id}`);
  }

  removePlayer(player: Player) {
    this.broadcast(Packet.Despawn.serialize(player.id), player.id);

    delete this.entities[player.id];
    delete this.units[player.id];
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

  pushUnitsToPlayer(player: Player) {
    if (!player) return;

    for (const unit of Object.values(this.units)) {
      if (player.id === unit.id) {
        continue;
      }

      this.pushToPlayer(
        player,
        Packet.Spawn.serialize(
          unit.id,
          unit.flags,
          unit.name,
          unit.x,
          unit.y,
          unit.z,
          unit.orientation,
          unit.color,
          unit.health.max,
          unit.health.current,
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
}
