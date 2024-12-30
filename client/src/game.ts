import * as config from './config';
import { SceneManager } from './scene-manager';
import { EntityManager } from './entity-manager';
import { NetworkManager } from './network-manager';
import { setKeyBindings } from './input';
import { HUD } from './hud';
import { UI } from './ui';
import { Player } from './player';
import { input } from './input';

export class Game {
  sceneManager = new SceneManager();
  entityManager = new EntityManager(this.sceneManager);
  networkManager = new NetworkManager(config.host, config.port);
  hud: HUD;
  ui: UI;
  player: Player;

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

    this.networkManager.connect(this, 'Balthazar');

    input.on('pointerDown', pointer => {
      const target = this.sceneManager.getTargetEntityFromMouse(pointer.x, pointer.y);
      if (target) {
        const targetedEntity = this.entityManager.getEntity(target.id);
        if (targetedEntity) {
          this.player.setTarget(targetedEntity);
        }
      } else {
        this.player.clearTarget();
      }
    });
  }

  update() {
    const dt = this.sceneManager.getDeltaTime();

    this.player.update(dt);
    this.sceneManager.prePlayerMoveUpdate(dt);
    this.entityManager.update(dt);
    this.sceneManager.postPlayerMoveUpdate(dt);
    this.networkManager.update(dt);
    this.hud.update(dt);

    this.sceneManager.render();
    this.hud.render();
  }
}
