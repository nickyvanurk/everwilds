import * as config from './config';
import { SceneManager } from './scene-manager';
import { EntityManager } from './entity-manager';
import { NetworkManager } from './network-manager';
import { setKeyBindings } from './input';
import { HUD } from './hud';
import { UI } from './ui';
import { Player } from './player';
import { Character } from './character';

export class Game {
  sceneManager = new SceneManager();
  entityManager = new EntityManager(this.sceneManager);

  private networkManager = new NetworkManager(config.host, config.port);
  private hud: HUD;
  private ui: UI;
  private player: Player;

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

    this.networkManager.connect('Balthazar');

    this.networkManager.socket.on(
      'welcome',
      ({ id, flags, name, x, y, z, orientation }) => {
        log.debug(`Received player ID from server: ${id}`);

        this.player.setSocket(this.networkManager.socket);

        const playerCharacter = new Character(name);
        playerCharacter.id = id;
        playerCharacter.setFlags(flags);
        playerCharacter.setPosition(x, y, z);
        playerCharacter.setOrientation(orientation);

        this.entityManager.addEntity(playerCharacter);

        this.player.setCharacter(playerCharacter);

        this.sceneManager.setCameraTarget(playerCharacter);
      },
    );

    this.networkManager.socket.on(
      'spawn',
      ({ id, flags, name, x, y, z, orientation }) => {
        log.debug(`Received spawn entity: ${id} ${x} ${y} ${z}`);

        const character = new Character(name);
        character.id = id;
        character.remoteControlled = true;
        character.setFlags(flags);
        character.setPosition(x, y, z);
        character.setOrientation(orientation);

        this.entityManager.addEntity(character);
      },
    );

    this.networkManager.socket.on('despawn', ({ id }) => {
      log.debug(`Received despawn entity: ${id}`);

      const entity = this.entityManager.getEntity(id);
      if (entity) {
        this.sceneManager.removeObject(entity.mesh);
        this.entityManager.removeEntity(id);
      }
    });

    this.networkManager.socket.on(
      'move',
      ({ id, flags, x, y, z, orientation }) => {
        const entity = this.entityManager.getEntity(id);
        if (entity) {
          entity.setFlags(flags);
          entity.setPosition(x, y, z);
          entity.setOrientation(orientation);
        }
      },
    );
  }

  update() {
    const dt = this.sceneManager.getDeltaTime();

    this.player.update(dt);
    this.entityManager.update(dt);
    this.hud.update(dt);
    this.networkManager.update(dt);

    this.sceneManager.render();
    this.hud.render();
  }
}
