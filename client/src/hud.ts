import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import * as PIXI from 'pixi.js';

import type { Game } from './game';
import type { Character } from './character';

export class HUD {
  private pixiRenderer: PIXI.WebGLRenderer;
  private pixiScene = new PIXI.Container();
  private names = new Map<Character, THREE.Mesh>();

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

    const UI = new PIXI.Graphics()
      .roundRect(20, 80, 100, 100, 5)
      .roundRect(220, 80, 100, 100, 5)
      .fill(0xffff00);
    this.pixiScene.addChild(UI);
  }

  update(_dt: number) {
    for (const character of this.game.characters) {
      if (this.names.has(character)) continue;

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
    }

    for (const [character, name] of this.names) {
      if (!this.game.characters.includes(character)) {
        this.game.scene.remove(name);
        this.names.delete(character);
      }
    }

    for (const [character, name] of this.names) {
      name.position.copy(character.position);
      name.position.y += character.getHeight() + 0.5;
      name.rotation.setFromRotationMatrix(this.game.camera.matrix);
    }
  }

  render() {
    this.pixiRenderer.runners.contextChange.emit(this.pixiRenderer.gl);
    this.pixiRenderer.render({ container: this.pixiScene, clear: false });
  }
}
