import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import * as PIXI from 'pixi.js';

import type { Game } from './game';
import type { Unit } from './unit';
import { input, inputEvents } from './input';
import * as config from './config';

export class HUD {
  private pixiRenderer: PIXI.WebGLRenderer;
  private pixiScene = new PIXI.Container();

  private nameplatesVisible = config.nameplatesVisibleByDefault;
  private names = new Map<Unit, THREE.Mesh>();
  private nameplates = new Map<Unit, PIXI.Container>();
  private labels = new Map<Unit, PIXI.Text>();
  private healthBars = new Map<Unit, PIXI.Graphics>();
  private damageTexts = [] as {
    time: number;
    text: PIXI.Text;
    anchor: THREE.Vector3;
    lifetime: number;
  }[];

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
    const units = this.game.entityManager
      .getUnits()
      .slice()
      .sort((a, b) => {
        const distA = a.position.distanceTo(camPos);
        const distB = b.position.distanceTo(camPos);
        return distB - distA;
      });

    units
      .filter(unit => this.nameplates.has(unit))
      .forEach((unit, index) => {
        this.pixiScene.setChildIndex(this.nameplates.get(unit)!, index);
      });

    for (const unit of units) {
      const anchor = unit.position.clone();
      anchor.y += unit.getHeight() + 0.75;

      const screenPosition = anchor
        .clone()
        .project(this.game.sceneManager.camera);
      const x = ((screenPosition.x + 1) * window.innerWidth) / 2;
      const y = ((-screenPosition.y + 1) * window.innerHeight) / 2;

      if (!this.names.has(unit)) {
        // === Three.js ===

        // Names
        const font = gAssetManager.getFont('helvetiker');
        if (!font) continue;

        const geometry = new TextGeometry(unit.name, {
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
        this.names.set(unit, name);
        name.visible = !this.nameplatesVisible;
      }

      const name = this.names.get(unit);
      if (name) {
        name.visible = unit.targeted ? false : !this.nameplatesVisible;
        name.position.copy(anchor);
        name.rotation.setFromRotationMatrix(
          this.game.sceneManager.camera.matrix,
        );
      }

      if (!this.nameplates.has(unit)) {
        // === Pixi.js ===

        const nameplate = new PIXI.Container();
        this.pixiScene.addChild(nameplate);
        this.nameplates.set(unit, nameplate);

        const selectUnit = (ev: PIXI.FederatedPointerEvent) => {
          const button =
            ev.button === 0 ? 'left' : ev.button === 2 ? 'right' : 'middle';
          inputEvents.push({
            type: 'selectUnit',
            data: { unit, button, origin: 'hud' },
          });
        };

        nameplate.eventMode = 'dynamic';
        nameplate.on('mouseupoutside', selectUnit);
        nameplate.on('rightupoutside', selectUnit);

        // Use invisible background as hitbox
        const hitbox = new PIXI.Graphics();
        hitbox.rect(0, 0, 110, 40);
        hitbox.fill(0x000000);
        hitbox.alpha = 0;
        hitbox.position.set(-hitbox.width / 2, -hitbox.height + 10);
        nameplate.addChild(hitbox);

        // Create name label
        const label = new PIXI.Text({
          text: unit.name,
          style: {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xffffff,
            align: 'center',
            fontWeight: 'bold',
          },
        });
        nameplate.addChild(label);
        this.labels.set(unit, label);

        // Create health bar
        const healthBar = new PIXI.Graphics();
        healthBar.rect(0, 0, 100, 10);
        healthBar.fill(0x00ff00);
        healthBar.position.set(0, 0);
        nameplate.addChild(healthBar);
        this.healthBars.set(unit, healthBar);
      }

      const cameraDirection = this.game.sceneManager.camera.getWorldDirection(
        new THREE.Vector3(),
      );

      const nameplate = this.nameplates.get(unit);
      if (nameplate) {
        const nameplateDirection = unit.position
          .clone()
          .sub(camPos)
          .normalize();
        const isBehindCamera = cameraDirection.dot(nameplateDirection) < 0;

        nameplate.visible =
          !isBehindCamera && (unit.targeted ? true : this.nameplatesVisible);
        nameplate.alpha = unit.targeted ? 1 : 0.5;

        nameplate.position.set(x, y);
      }

      const label = this.labels.get(unit);
      if (label) {
        label.position.set(-label.width / 2, -label.height / 2 - label.height);
      }

      const healthBar = this.healthBars.get(unit);
      if (healthBar) {
        healthBar.position.set(-healthBar.width / 2, -healthBar.height / 2);

        healthBar.rect(0, 0, 100, 10);
        healthBar.fill(0xff0000);

        const healthFraction = unit.health.current / unit.health.max;
        healthBar.rect(0, 0, 100 * healthFraction, 10);
        healthBar.fill(0x00ff00);
      }
    }

    const damageTextsToRemove = [] as typeof this.damageTexts;

    for (const damageText of this.damageTexts) {
      const { time, text, anchor, lifetime } = damageText;

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

      if (delta > lifetime) {
        this.pixiScene.removeChild(text);
        damageTextsToRemove.push(damageText);
      }
    }

    this.damageTexts = this.damageTexts.filter(
      t => !damageTextsToRemove.includes(t),
    );

    for (const [unit, name] of this.names) {
      if (!units.includes(unit)) {
        this.game.sceneManager.removeObject(name);
        this.names.delete(unit);
      }
    }

    for (const [unit, container] of this.nameplates) {
      if (!units.includes(unit)) {
        this.pixiScene.removeChild(container);
        this.nameplates.delete(unit);
        this.labels.delete(unit);
        this.healthBars.delete(unit);
      }
    }
  }

  render() {
    this.pixiRenderer.resetState();
    this.pixiRenderer.render({ container: this.pixiScene });
  }

  spawnDamageText(target: Unit, damage: number) {
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

    this.damageTexts.push({
      time: performance.now(),
      text,
      anchor,
      lifetime: 1000,
    });
  }
}
