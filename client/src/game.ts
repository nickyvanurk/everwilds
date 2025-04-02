import * as config from './config';
import { SceneManager } from './scene-manager';
import { EntityManager } from './entity-manager';
import { Socket } from './socket';
import { inputEvents, setKeyBindings } from './input';
import { HUD } from './hud';
import { UI } from './ui';
import { Player } from './player';

export class Game {
  sceneManager = new SceneManager(this);
  entityManager = new EntityManager(this.sceneManager);
  socket = new Socket(config.host, config.port);
  hud: HUD;
  ui: UI;
  player: Player;

  constructor() {
    gAssetManager.load(config.assets);

    setKeyBindings(config.keyBindings);

    this.hud = new HUD(this);
    this.ui = new UI(this);
    this.player = new Player(this.sceneManager);
  }

  async init() {
    await this.hud.init();
  }

  run() {
    this.sceneManager.startRenderLoop(this.update.bind(this));
    this.socket.connect('Balthazar');
  }

  update() {
    const dt = this.sceneManager.getDeltaTime();

    this.player.update(dt);
    this.sceneManager.prePlayerMoveUpdate(dt);
    this.entityManager.update(dt);
    this.sceneManager.postPlayerMoveUpdate(dt);
    this.socket.update(dt);
    this.hud.update(dt);

    const eventsToHandle = inputEvents.slice();
    inputEvents.length = 0;

    // Sort events so deselectUnit events are handled before selectUnit events.
    // Otherwise selecting a nameplate can select the unit and then immediately
    // deselect it.
    eventsToHandle.sort((a, b) => {
      if (a.type === b.type) return 0;
      return a.type === 'deselectUnit' ? -1 : 1;
    });

    for (const inputEvent of eventsToHandle) {
      if (inputEvent.type === 'deselectUnit') {
        this.player.clearTarget();

        if (this.player.isAttacking) {
          this.player.stopAttack();
        }
      } else if (inputEvent.type === 'selectUnit') {
        if (!inputEvent.data.unit) continue;

        this.player.setTarget(inputEvent.data.unit);
        if (inputEvent.data.button === 'right') {
          this.player.startAttack(inputEvent.data.unit);
        }
      }
    }

    this.sceneManager.render();
  }
}
