import * as Packet from '../../shared/src/packets';
import { NetworkSimulator } from './network-simulator';
import { isDebug } from './utils';
import { Character } from './character';

export class Socket {
  clockDelta = 0;
  netsim = new NetworkSimulator();

  private ws?: WebSocket;

  constructor(
    private host: string,
    private port: number,
  ) {}

  connect(requestedPlayerName: string) {
    const url = `ws://${this.host}:${this.port}`;
    log.debug(`Connecting to ${url}`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      log.debug('Connected to server');
    };

    this.ws.onmessage = ev => {
      if (ev.data === 'go') {
        log.debug('Starting client/server handshake');
        this.send(Packet.Hello.serialize(requestedPlayerName));
        return;
      }

      this.receiveMessage(ev.data);
    };

    this.ws.onerror = ev => {
      log.error(`Error: ${ev}`);
    };

    this.ws.onclose = () => {
      log.debug('Disconnected from server');
    };
  }

  send(message: (string | number)[]) {
    const send = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    };

    isDebug() ? this.netsim.enqueue(send) : send();
  }

  update(dt: number) {
    if (isDebug()) this.netsim.update(dt);
  }

  receiveMessage(message: string) {
    const data = JSON.parse(message);
    if (!Array.isArray(data)) return;

    for (const action of Array.isArray(data[0]) ? data : [data]) {
      this.receiveAction(action);
    }
  }

  receiveAction(data: (string | number)[]) {
    const opcodeString = Packet.Opcode[+data[0]];

    //@ts-ignore
    const packetType = Packet[opcodeString];
    if (!packetType) {
      log.error(`No packet type found for opcode: ${opcodeString}`);
      return;
    }

    //@ts-ignore
    const packetHandler = this[`handle${opcodeString}`];
    if (!packetHandler) {
      log.error(`No packet handler found for opcode: ${opcodeString}`);
      return;
    }

    packetHandler(packetType.deserialize(data));
  }

  handleWelcome(data: ReturnType<typeof Packet.Welcome.deserialize>) {
    const { id, flags, name, x, y, z, orientation, color } = data;

    log.debug(`Received player ID from server: ${id}`);

    game.player.socket = game.socket;

    const playerCharacter = new Character(name, color);
    playerCharacter.setId(id);
    playerCharacter.setFlags(flags);
    playerCharacter.setPosition(x, y, z, true);
    playerCharacter.setOrientation(orientation);

    game.entityManager.addEntity(playerCharacter);

    game.player.character = playerCharacter;
    game.player.lastCharacterId = id;

    game.sceneManager.setCameraTarget(playerCharacter);
    game.sceneManager.setCameraYaw(orientation);
  }

  handleSpawn(data: ReturnType<typeof Packet.Spawn.deserialize>) {
    const { id, flags, name, x, y, z, orientation, color } = data;

    log.debug(`Received spawn entity: ${id} ${x} ${y} ${z}`);

    const isPlayerCharacter = id === game.player.lastCharacterId;

    const character = new Character(name, color, !isPlayerCharacter);
    character.setId(id);
    character.setFlags(flags);
    character.setPosition(x, y, z, true);
    character.setOrientation(orientation);

    game.entityManager.addEntity(character);

    if (isPlayerCharacter) {
      game.player.character = character;
      game.sceneManager.setCameraTarget(character);
      game.sceneManager.setCameraYaw(orientation);
    }
  }

  handleDespawn({ id }: ReturnType<typeof Packet.Despawn.deserialize>) {
    log.debug(`Received despawn entity: ${id}`);

    const entity = game.entityManager.getEntity(id);
    if (entity) {
      game.entityManager.removeEntity(id);

      if (id === game.player.character?.id) {
        game.player.character = undefined;
      }

      if (id === game.player.character?.id || game.player.target === entity) {
        game.player.clearTarget();
      }
    }
  }

  handleMoveUpdate(data: ReturnType<typeof Packet.MoveUpdate.deserialize>) {
    const { id, flags, x, y, z, orientation } = data;
    const entity = game.entityManager.getEntity(id);
    if (entity) {
      entity.setFlags(flags);
      entity.setPosition(x, y, z);
      entity.setOrientation(orientation);
    }
  }

  handleChatMessage(data: ReturnType<typeof Packet.ChatMessage.deserialize>) {
    const { playerName, message } = data;
    game.ui.addChatMessage(playerName, message);
  }

  handleAttackSwing(data: ReturnType<typeof Packet.AttackSwing.deserialize>) {
    const { attackerId, targetId, damage, targetHealth } = data;

    const attacker = game.entityManager.getEntity(attackerId);
    if (!attacker) {
      log.error(`Received attack swing for unknown attacker: ${attackerId}`);
      return;
    }

    const target = game.entityManager.getEntity(targetId);
    if (!target) {
      log.error(`Received attack swing for unknown target: ${targetId}`);
      return;
    }

    target.health.current = targetHealth;

    const attackerName =
      attacker.id === game.player.character?.id ? 'Your' : `${attacker.name}'s`;

    game.hud.spawnDamageText(target, damage);

    log.info(
      `${attackerName} melee swing hits ${target.name} for ${damage} damage`,
    );
  }
}
