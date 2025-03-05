import * as config from './config';
import * as THREE from 'three';
import { SceneManager } from './scene-manager';
import { EntityManager } from './entity-manager';
import { NetworkManager } from './network-manager';
import { setKeyBindings } from './input';
import { HUD } from './hud';
import { UI } from './ui';
import { Player } from './player';
import { input } from './input';
import EventEmitter from 'eventemitter3';

export class Game extends EventEmitter {
  sceneManager = new SceneManager();
  entityManager = new EntityManager(this.sceneManager);
  networkManager = new NetworkManager(config.host, config.port);
  hud: HUD;
  ui: UI;
  player: Player;

  constructor() {
    super();

    setKeyBindings(config.keyBindings);

    this.hud = new HUD(this);
    this.ui = new UI(this);

    gAssetManager.load(config.assets);

    gAssetManager.getSound('background', (buffer: AudioBuffer) => {
      const background = new THREE.Audio(this.sceneManager.audioListener);
      background.setBuffer(buffer);
      background.setVolume(0.1);
      background.setLoop(true);
      background.play();
    });

    gAssetManager.getSound('birds', (buffer: AudioBuffer) => {
      const birds = new THREE.Audio(this.sceneManager.audioListener);
      birds.setBuffer(buffer);
      birds.setVolume(0.3);
      birds.setLoop(true);
      birds.play();
    });

    this.player = new Player(this.sceneManager);
  }

  async init() {
    await this.hud.init();
  }

  run() {
    this.sceneManager.startRenderLoop(this.update.bind(this));

    this.networkManager.connect(this, 'Balthazar');

    input.on('mouseClick', ({ pointer, button }) => {
      const target = this.sceneManager.getTargetEntityFromMouse(
        pointer.x,
        pointer.y,
      );

      if (target) {
        const targetedEntity = this.entityManager.getEntity(target.id);
        if (targetedEntity) {
          this.player.setTarget(targetedEntity);

          if (button === 'right') {
            this.player.startAttack(targetedEntity);
          }
        }
      } else {
        this.player.clearTarget();

        if (this.player.isAttacking) {
          this.player.stopAttack();
        }
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
