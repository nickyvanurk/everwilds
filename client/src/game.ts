import { setKeyBindings } from './input';
import { Player } from './player';
import { HUD } from './hud';
import * as config from './config';
import { Socket } from './socket';
import { Character } from './character';
import * as Packet from '../../shared/src/packets';
import { NetworkSimulator } from './network-simulator';
import { UI } from './ui';
import { SceneManager } from './scene-manager';

export class Game {
  sceneManager = new SceneManager();

  private netsim = new NetworkSimulator();
  private hud: HUD;
  private ui: UI;
  private player: Player;
  private entities: Record<number, Character> = {};

  constructor() {
    setKeyBindings(config.keyBindings);

    this.hud = new HUD(this);
    this.ui = new UI(this);

    gAssetManager.load(config.assets);

    this.player = new Player(this.sceneManager);
  }

  async init() {
    await this.hud.init();
  }

  run() {
    this.sceneManager.startRenderLoop(this.update.bind(this));

    this.connect('Balthazar');
  }

  connect(requestedPlayerName: string) {
    const socket = new Socket(config.host, config.port, this.netsim);

    socket.connect();

    socket.on('connected', () => {
      log.debug('Starting client/server handshake');

      socket.send(Packet.Hello.serialize(requestedPlayerName));
    });

    socket.on('disconnected', () => {
      log.debug('Disconnected from server');
    });

    socket.on('welcome', ({ id, flags, name, x, y, z, orientation }) => {
      log.debug(`Received player ID from server: ${id}`);

      this.player.setSocket(socket);

      const playerCharacter = new Character(name);
      playerCharacter.id = id;
      playerCharacter.setFlags(flags);
      playerCharacter.setPosition(x, y, z);
      playerCharacter.setOrientation(orientation);

      this.addEntity(playerCharacter);

      this.player.setCharacter(playerCharacter);

      this.sceneManager.setCameraTarget(playerCharacter);
    });

    socket.on('spawn', ({ id, flags, name, x, y, z, orientation }) => {
      log.debug(`Received spawn entity: ${id} ${x} ${y} ${z}`);

      const character = new Character(name);
      character.id = id;
      character.remoteControlled = true;
      character.setFlags(flags);
      character.setPosition(x, y, z);
      character.setOrientation(orientation);

      this.addEntity(character);
    });

    socket.on('despawn', ({ id }) => {
      log.debug(`Received despawn entity: ${id}`);

      const entity = this.entities[id] as Character;
      this.sceneManager.addObject(entity.mesh);
      delete this.entities[id];
    });

    socket.on('move', ({ id, flags, x, y, z, orientation }) => {
      const entity = this.entities[id] as Character;
      if (!entity) {
        log.error(`Entity with ID ${id} not found`);
        return;
      }
      entity.setFlags(flags);
      entity.setPosition(x, y, z);
      entity.setOrientation(orientation);
    });
  }

  addEntity(entity: Character) {
    this.entities[entity.id] = entity;
    this.sceneManager.addObject(entity.mesh);
  }

  update() {
    const dt = this.sceneManager.getDeltaTime();

    this.player.update(dt);

    for (const entity of Object.values(this.entities)) {
      entity.update(dt);
    }

    this.hud.update(dt);

    this.sceneManager.render();
    this.hud.render();

    this.netsim.update(dt);
  }

  getCharacters() {
    return Object.values(this.entities);
  }
}
