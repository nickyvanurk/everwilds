import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import * as PIXI from 'pixi.js';

import type { Game } from './game';
import type { Character } from './character';
import { input } from './input';

export class HUD {
  private pixiRenderer: PIXI.WebGLRenderer;
  private pixiScene = new PIXI.Container();

  private nameplatesVisible = false;
  private names = new Map<Character, THREE.Mesh>();
  private labels = new Map<Character, PIXI.Text>();
  private healthBars = new Map<Character, PIXI.Graphics>();

  constructor(private game: Game) {
    const pixiRenderer = new PIXI.WebGLRenderer();
    this.pixiRenderer = pixiRenderer;

    const pStage = new PIXI.Container();
    this.pixiScene = pStage;
  }

  async init() {
    await this.pixiRenderer.init({
      width: window.innerWidth,
      height: window.innerHeight,
      canvas: this.game.renderer.domElement,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
    });

    input.on('toggleNameplates', (isDown) => {
      if (!isDown) return;

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
  }

  update(_dt: number) {
    const characters = this.game.characters.slice().sort((a, b) => {
      const distA = a.position.distanceTo(this.game.camera.position);
      const distB = b.position.distanceTo(this.game.camera.position);
      return distA - distB;
    });

    characters.forEach((character, index) => {
      const label = this.labels.get(character);
      if (label) this.pixiScene.setChildIndex(label, index);
      const healthBar = this.healthBars.get(character);
      if (healthBar) this.pixiScene.setChildIndex(healthBar, index);
    });

    for (const character of this.game.characters) {
      const anchor = character.position.clone();
      anchor.y += character.getHeight() + 0.5;

      const screenPosition = anchor.clone().project(this.game.camera);
      const x = (screenPosition.x + 1) * window.innerWidth / 2;
      const y = (-screenPosition.y + 1) * window.innerHeight / 2;

      // === Three.js ===

      // Names
      if (!this.names.has(character)) {
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
        this.game.scene.add(name);
        this.names.set(character, name);
        name.visible = !this.nameplatesVisible;
      };

      const name = this.names.get(character);
      if (name) {
        name.position.copy(anchor);
        name.rotation.setFromRotationMatrix(this.game.camera.matrix);
      }

      // === Pixi.js ===

      // Labels
      if (!this.labels.has(character)) {
        const label = new PIXI.Text({
          text: character.name,
          style: {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xffffff,
            align: 'center',
            fontWeight: 'bold'
          },
        });
        this.pixiScene.addChild(label);
        this.labels.set(character, label);
        label.visible = this.nameplatesVisible;
      }

      const label = this.labels.get(character);
      if (label) {
        const labelX = x - label.width / 2;
        const labelY = y - label.height / 2 - label.height
        label.position.set(labelX, labelY);
      }

      // Health bar
      if (!this.healthBars.has(character)) {
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
        const healthBarX = x - healthBar.width / 2;
        const healthBarY = y - healthBar.height / 2;
        healthBar.position.set(healthBarX, healthBarY);
      }
    }

    for (const [character, name] of this.names) {
      if (!this.game.characters.includes(character)) {
        this.game.scene.remove(name);
        this.names.delete(character);
      }
    }

    for (const [character, label] of this.labels) {
      if (!this.game.characters.includes(character)) {
        this.pixiScene.removeChild(label);
        this.labels.delete(character);
      }
    }

    for (const [character, healthBar] of this.healthBars) {
      if (!this.game.characters.includes(character)) {
        this.pixiScene.removeChild(healthBar);
        this.healthBars.delete(character);
      }
    }
  }

  render() {
    this.pixiRenderer.runners.contextChange.emit(this.pixiRenderer.gl);
    this.pixiRenderer.render({ container: this.pixiScene, clear: false });
  }
}
