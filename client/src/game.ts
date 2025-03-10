import * as config from './config';
import { SceneManager } from './scene-manager';
import { EntityManager } from './entity-manager';
import { Socket } from './socket';
import { inputEvents, setKeyBindings } from './input';
import { HUD } from './hud';
import { UI } from './ui';
import { Player } from './player';

export class Game {
  sceneManager = new SceneManager();
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

    // Sort events so deselectCharacter events are handled before selectCharacter events.
    // Otherwise selecting a nameplate can select the character and then immediately
    // deselect it.
    eventsToHandle.sort((a, b) => {
      if (a.type === b.type) return 0;
      return a.type === 'deselectCharacter' ? -1 : 1;
    });

    for (const inputEvent of eventsToHandle) {
      if (inputEvent.type === 'deselectCharacter') {
        this.player.clearTarget();
        if (this.player.isAttacking) {
          this.player.stopAttack();
        }
      } else if (inputEvent.type === 'selectCharacter') {
        if (!inputEvent.data.character) continue;

        // Clear other selected characters if origin is hud
        if (inputEvent.data.origin === 'hud') {
          inputEvents.filter(
            event =>
              event.type === 'selectCharacter' &&
              event.data.origin !== 'hud' &&
              event.data.character !== inputEvent.data.character,
          );
        }

        this.player.setTarget(inputEvent.data.character);
        if (inputEvent.data.button === 'right') {
          this.player.startAttack(inputEvent.data.character);
        }
      }
    }

    this.sceneManager.render();
    this.hud.render();
  }
}
