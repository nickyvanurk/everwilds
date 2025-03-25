import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import * as PIXI from 'pixi.js';

import type { Game } from './game';
import type { Character } from './character';
import { input, inputEvents } from './input';
import * as config from './config';

export class HUD {
  private pixiRenderer: PIXI.WebGLRenderer;
  private pixiScene = new PIXI.Container();

  private nameplatesVisible = config.nameplatesVisibleByDefault;
  private names = new Map<Character, THREE.Mesh>();
  private nameplates = new Map<Character, PIXI.Container>();
  private labels = new Map<Character, PIXI.Text>();
  private healthBars = new Map<Character, PIXI.Graphics>();
  private damageTexts = new Map<
    Character,
    { time: number; text: PIXI.Text; anchor: THREE.Vector3 }[]
  >();

  constructor(private game: Game) {
    this.pixiRenderer = new PIXI.WebGLRenderer();
    this.pixiScene = new PIXI.Container();
  }

  async init() {
    await this.pixiRenderer.init({
      canvas: this.game.sceneManager.renderer.domElement,
      width: window.innerWidth,
      height: window.innerHeight,
      clearBeforeRender: false, // Prevent pixijs from clearing the threejs renderer
      resolution: window.devicePixelRatio,
    });

    addEventListener('resize', () => {
      this.pixiRenderer.resize(window.innerWidth, window.innerHeight);
      this.render();
    });

    input.on('toggleNameplates', isDown => {
      if (!isDown) return;

      this.nameplatesVisible = !this.nameplatesVisible;

      for (const [_, name] of this.names) {
        name.visible = !name.visible;
      }

      for (const [_, nameplate] of this.nameplates) {
        nameplate.visible = !nameplate.visible;
      }
    });
  }

  update(_dt: number) {
    const camPos = this.game.sceneManager.camera.position;
    const characters = this.game.entityManager
      .getCharacters()
      .slice()
      .sort((a, b) => {
        const distA = a.position.distanceTo(camPos);
        const distB = b.position.distanceTo(camPos);
        return distB - distA;
      });

    characters
      .filter(character => this.nameplates.has(character))
      .forEach((character, index) => {
        this.pixiScene.setChildIndex(this.nameplates.get(character)!, index);
      });

    for (const character of characters) {
      const anchor = character.position.clone();
      anchor.y += character.getHeight() + 0.75;

      const screenPosition = anchor
        .clone()
        .project(this.game.sceneManager.camera);
      const x = ((screenPosition.x + 1) * window.innerWidth) / 2;
      const y = ((-screenPosition.y + 1) * window.innerHeight) / 2;

      if (!this.names.has(character)) {
        // === Three.js ===

        // Names
        const font = gAssetManager.getFont('helvetiker');
        if (!font) continue;

        const geometry = new TextGeometry(character.name, {
          font: font,
          size: 0.2,
          depth: 0,
          curveSegments: 12,
        });
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox!;
        const offset = -0.5 * (bbox.max.x - bbox.min.x);
        geometry.translate(offset, 0, 0);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const name = new THREE.Mesh(geometry, material);
        this.game.sceneManager.addObject(name);
        this.names.set(character, name);
        name.visible = !this.nameplatesVisible;
      }

      const name = this.names.get(character);
      if (name) {
        name.visible = character.targeted ? false : !this.nameplatesVisible;
        name.position.copy(anchor);
        name.rotation.setFromRotationMatrix(
          this.game.sceneManager.camera.matrix,
        );
      }

      if (!this.nameplates.has(character)) {
        // === Pixi.js ===

        const nameplate = new PIXI.Container();
        this.pixiScene.addChild(nameplate);
        this.nameplates.set(character, nameplate);

        const selectCharacter = (ev: PIXI.FederatedPointerEvent) => {
          const button =
            ev.button === 0 ? 'left' : ev.button === 2 ? 'right' : 'middle';
          inputEvents.push({
            type: 'selectCharacter',
            data: { character, button, origin: 'hud' },
          });
        };

        nameplate.eventMode = 'dynamic';
        nameplate.on('mouseupoutside', selectCharacter);
        nameplate.on('rightupoutside', selectCharacter);

        // Use invisible background as hitbox
        const hitbox = new PIXI.Graphics();
        hitbox.rect(0, 0, 110, 40);
        hitbox.fill(0x000000);
        hitbox.alpha = 0;
        hitbox.position.set(-hitbox.width / 2, -hitbox.height + 10);
        nameplate.addChild(hitbox);

        // Create name label
        const label = new PIXI.Text({
          text: character.name,
          style: {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xffffff,
            align: 'center',
            fontWeight: 'bold',
          },
        });
        nameplate.addChild(label);
        this.labels.set(character, label);

        // Create health bar
        const healthBar = new PIXI.Graphics();
        healthBar.rect(0, 0, 100, 10);
        healthBar.fill(0x00ff00);
        healthBar.position.set(0, 0);
        nameplate.addChild(healthBar);
        this.healthBars.set(character, healthBar);
      }

      const cameraDirection = this.game.sceneManager.camera.getWorldDirection(
        new THREE.Vector3(),
      );

      const nameplate = this.nameplates.get(character);
      if (nameplate) {
        const nameplateDirection = character.position
          .clone()
          .sub(camPos)
          .normalize();
        const isBehindCamera = cameraDirection.dot(nameplateDirection) < 0;

        nameplate.visible =
          !isBehindCamera &&
          (character.targeted ? true : this.nameplatesVisible);
        nameplate.alpha = character.targeted ? 1 : 0.5;

        nameplate.position.set(x, y);
      }

      const label = this.labels.get(character);
      if (label) {
        label.position.set(-label.width / 2, -label.height / 2 - label.height);
      }

      const healthBar = this.healthBars.get(character);
      if (healthBar) {
        healthBar.position.set(-healthBar.width / 2, -healthBar.height / 2);

        healthBar.rect(0, 0, 100, 10);
        healthBar.fill(0xff0000);

        const healthFraction = character.health.current / character.health.max;
        healthBar.rect(0, 0, 100 * healthFraction, 10);
        healthBar.fill(0x00ff00);
      }

      // Floating damage numbers
      for (const { time, text, anchor } of this.damageTexts.get(character) ??
        []) {
        const screenPosition = anchor
          .clone()
          .project(this.game.sceneManager.camera);
        const x = ((screenPosition.x + 1) * window.innerWidth) / 2;
        const y = ((-screenPosition.y + 1) * window.innerHeight) / 2;

        text.position.set(
          x - text.width / 2,
          y - text.height / 2 - text.height * 1.5,
        );

        const delta = performance.now() - time;
        text.position.y -= delta / 10;
      }
    }

    for (const [character, name] of this.names) {
      if (!characters.includes(character)) {
        this.game.sceneManager.removeObject(name);
        this.names.delete(character);
      }
    }

    for (const [character, container] of this.nameplates) {
      if (!characters.includes(character)) {
        this.pixiScene.removeChild(container);
        this.nameplates.delete(character);
        this.labels.delete(character);
        this.healthBars.delete(character);
        this.damageTexts.delete(character);
      }
    }
  }

  render() {
    this.pixiRenderer.resetState();
    this.pixiRenderer.render({ container: this.pixiScene });
  }

  spawnDamageText(target: Character, damage: number) {
    const text = new PIXI.Text({
      text: damage.toString(),
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        align: 'center',
        fontWeight: 'bold',
      },
    });

    const anchor = target.position.clone();
    anchor.y += target.getHeight() + 0.75;

    const screenPosition = anchor
      .clone()
      .project(this.game.sceneManager.camera);

    const x = ((screenPosition.x + 1) * window.innerWidth) / 2;
    const y = ((-screenPosition.y + 1) * window.innerHeight) / 2;

    text.position.set(
      x - text.width / 2,
      y - text.height / 2 - text.height * 1.5,
    );

    this.pixiScene.addChild(text);

    if (!this.damageTexts.has(target)) {
      this.damageTexts.set(target, []);
    }

    const value = { time: performance.now(), text, anchor };
    this.damageTexts.get(target)!.push(value);

    setTimeout(() => {
      this.pixiScene.removeChild(text);
      this.damageTexts.set(
        target,
        this.damageTexts.get(target)!.filter(v => v !== value),
      );
    }, 1000);
  }
}
