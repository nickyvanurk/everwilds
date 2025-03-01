import type * as Packet from '../../shared/src/packets';
import { Character } from './character';
import type { Game } from './game';

export function handleWelcome(this: Game, data: Packet.Welcome) {
  const { id, flags, name, x, y, z, orientation } = data;

  log.debug(`Received player ID from server: ${id}`);

  this.player.socket = this.networkManager.socket;

  const playerCharacter = new Character(name);
  playerCharacter.setId(id);
  playerCharacter.setFlags(flags);
  playerCharacter.setPosition(x, y, z);
  playerCharacter.setOrientation(orientation);

  this.entityManager.addEntity(playerCharacter);

  this.player.character = playerCharacter;

  this.sceneManager.setCameraTarget(playerCharacter);
}

export function handleSpawn(this: Game, data: Packet.Spawn) {
  const { id, flags, name, x, y, z, orientation } = data;

  log.debug(`Received spawn entity: ${id} ${x} ${y} ${z}`);

  const character = new Character(name);
  character.remoteControlled = true;
  character.setId(id);
  character.setFlags(flags);
  character.setPosition(x, y, z);
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
  { attackerId, targetId, damage }: Packet.AttackSwing,
) {
  console.log(`Received attack swing: ${attackerId} -> ${targetId} for ${damage} damage`);
}
