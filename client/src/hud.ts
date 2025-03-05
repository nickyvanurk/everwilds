import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import * as PIXI from 'pixi.js';

import type { Game } from './game';
import type { Character } from './character';
import { input } from './input';
import * as config from './config';

export class HUD {
  private pixiRenderer: PIXI.WebGLRenderer;
  private pixiScene = new PIXI.Container();

  private nameplatesVisible = config.nameplatesVisibleByDefault;
  private names = new Map<Character, THREE.Mesh>();
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

      for (const [_, label] of this.labels) {
        label.visible = !label.visible;
      }

      for (const [_, healthBar] of this.healthBars) {
        healthBar.visible = !healthBar.visible;
      }
    });

    this.game.on('attackHit', (_attacker, target, damage) => {
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
    });
  }

  update(_dt: number) {
    const characters = this.game.entityManager
      .getCharacters()
      .slice()
      .sort((a, b) => {
        const distA = a.position.distanceTo(
          this.game.sceneManager.camera.position,
        );
        const distB = b.position.distanceTo(
          this.game.sceneManager.camera.position,
        );
        return distA - distB;
      });

    characters.forEach((character, index) => {
      const label = this.labels.get(character);
      if (label) this.pixiScene.setChildIndex(label, index);
      const healthBar = this.healthBars.get(character);
      if (healthBar) this.pixiScene.setChildIndex(healthBar, index);
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
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
        });
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

      if (!this.labels.has(character)) {
        // === Pixi.js ===

        // Labels
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
        this.pixiScene.addChild(label);
        this.labels.set(character, label);
        label.visible = this.nameplatesVisible;
      }

      const cameraDirection = this.game.sceneManager.camera.getWorldDirection(
        new THREE.Vector3(),
      );

      const label = this.labels.get(character);
      if (label) {
        const labelDirection = character.position
          .clone()
          .sub(this.game.sceneManager.camera.position)
          .normalize();
        const isBehindCamera = cameraDirection.dot(labelDirection) < 0;

        label.visible =
          !isBehindCamera &&
          (character.targeted ? true : this.nameplatesVisible);
        label.alpha = character.targeted ? 1 : 0.5;

        const labelX = x - label.width / 2;
        const labelY = y - label.height / 2 - label.height;
        label.position.set(labelX, labelY);
      }

      if (!this.healthBars.has(character)) {
        // Health bar
        const healthBar = new PIXI.Graphics();
        healthBar.rect(0, 0, 100, 10);
        healthBar.fill(0x00ff00);
        healthBar.position.set(0, 0);
        this.pixiScene.addChild(healthBar);
        this.healthBars.set(character, healthBar);
        healthBar.visible = this.nameplatesVisible;
      }

      const healthBar = this.healthBars.get(character);
      if (healthBar) {
        const labelDirection = character.position
          .clone()
          .sub(this.game.sceneManager.camera.position)
          .normalize();
        const isBehindCamera = cameraDirection.dot(labelDirection) < 0;

        healthBar.visible =
          !isBehindCamera &&
          (character.targeted ? true : this.nameplatesVisible);
        healthBar.alpha = character.targeted ? 1 : 0.5;

        const healthBarX = x - healthBar.width / 2;
        const healthBarY = y - healthBar.height / 2;
        healthBar.position.set(healthBarX, healthBarY);

        const healthFraction = character.health.current / character.health.max;

        healthBar.rect(0, 0, 100, 10);
        healthBar.fill(0xff0000);

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

    for (const [character, label] of this.labels) {
      if (!characters.includes(character)) {
        this.pixiScene.removeChild(label);
        this.labels.delete(character);
      }
    }

    for (const [character, healthBar] of this.healthBars) {
      if (!characters.includes(character)) {
        this.pixiScene.removeChild(healthBar);
        this.healthBars.delete(character);
      }
    }
  }

  render() {
    this.pixiRenderer.resetState();
    this.pixiRenderer.render({ container: this.pixiScene });
  }
}
