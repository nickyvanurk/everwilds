import type * as Packet from '../../shared/src/packets';
import { Character } from './character';
import type { Game } from './game';

export function handleWelcome(this: Game, data: Packet.Welcome) {
  const { id, flags, name, x, y, z, orientation, color } = data;

  log.debug(`Received player ID from server: ${id}`);

  this.player.socket = this.networkManager.socket;

  const playerCharacter = new Character(name, color);
  playerCharacter.setId(id);
  playerCharacter.setFlags(flags);
  playerCharacter.setPosition(x, y, z, true);
  playerCharacter.setOrientation(orientation);

  this.entityManager.addEntity(playerCharacter);

  this.player.character = playerCharacter;

  this.sceneManager.setCameraTarget(playerCharacter);
  this.sceneManager.setCameraYaw(orientation);
}

export function handleSpawn(this: Game, data: Packet.Spawn) {
  const { id, flags, name, x, y, z, orientation, color } = data;

  log.debug(`Received spawn entity: ${id} ${x} ${y} ${z}`);

  const character = new Character(name, color);
  character.remoteControlled = true;
  character.setId(id);
  character.setFlags(flags);
  character.setPosition(x, y, z, true);
  character.setOrientation(orientation);

  this.entityManager.addEntity(character);
}

export function handleDespawn(this: Game, { id }: Packet.Despawn) {
  log.debug(`Received despawn entity: ${id}`);

  const entity = this.entityManager.getEntity(id);
  if (entity) {
    this.sceneManager.removeObject(entity.object3d);
    this.entityManager.removeEntity(id);
  }
}

export function handleMove(this: Game, data: Packet.MoveUpdate) {
  const { id, flags, x, y, z, orientation } = data;

  const entity = this.entityManager.getEntity(id);
  if (entity) {
    entity.setFlags(flags);
    entity.setPosition(x, y, z);
    entity.setOrientation(orientation);
  }
}

export function handleChatMessage(
  this: Game,
  { playerName, message }: Packet.ChatMessage,
) {
  this.ui.addChatMessage(playerName, message);
}

export function handleAttackSwing(
  this: Game,
  { attackerId, targetId, damage, targetHealth }: Packet.AttackSwing,
) {
  const attacker = this.entityManager.getEntity(attackerId);
  if (!attacker) {
    log.error(`Received attack swing for unknown attacker: ${attackerId}`);
    return;
  }

  const target = this.entityManager.getEntity(targetId);
  if (!target) {
    log.error(`Received attack swing for unknown target: ${targetId}`);
    return;
  }

  target.health.current = targetHealth;

  const attackerName =
    attacker.id === this.player.character.id ? 'Your' : `${attacker.name}'s`;

  log.info(
    `${attackerName} melee swing hits ${target.name} for ${damage} damage`,
  );
}

export function handleRespawn(
  this: Game,
  { id, x, y, z, orientation }: Packet.Respawn,
) {
  const entity = this.entityManager.getEntity(id);
  if (entity) {
    entity.setPosition(x, y, z, true);
    entity.setOrientation(orientation);
    entity.health.current = entity.health.max;

    if (id === this.player.character.id) {
      this.sceneManager.setCameraYaw(orientation);
      this.player.clearTarget();
    }

    if (this.player.target === entity) {
      this.player.clearTarget();
    }
  }
}
