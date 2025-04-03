import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

import type { Game } from './game';
import type { Unit } from './unit';
import { input } from './input';
import * as config from './config';

const nameplateHitboxMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  opacity: 0,
  transparent: true,
});
const nameplateHitboxGeometry = new THREE.PlaneGeometry(110, 38);
nameplateHitboxGeometry.translate(0, 23, 0);

const healthBarGeometry = new THREE.PlaneGeometry(100, 10);
healthBarGeometry.translate(0, 10, 0);

const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

export class HUD {
  nameplates = new Map<Unit, THREE.Group>();

  private nameplatesVisible = config.nameplatesVisibleByDefault;
  private names = new Map<Unit, THREE.Mesh>();
  private labels = new Map<Unit, THREE.Mesh>();
  private healthbars = new Map<Unit, THREE.Group>();
  private damageTexts = [] as {
    time: number;
    text: THREE.Mesh;
    anchor: THREE.Vector3;
    lifetime: number;
    speed: number; // units per second
  }[];

  constructor(private game: Game) {}

  async init() {
    input.on('toggleNameplates', isDown => {
      if (!isDown) return;

      this.nameplatesVisible = !this.nameplatesVisible;

      for (const name of this.names.values()) {
        name.visible = !name.visible;
      }

      for (const nameplate of this.nameplates.values()) {
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

    for (const unit of units) {
      const anchor = unit.position.clone();
      anchor.y += unit.getHeight() + 0.75;

      // Names
      if (!this.names.has(unit)) {
        // === Three.js ===

        // Create name
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
        const offset = (bbox.max.x - bbox.min.x) / 2;
        geometry.translate(-offset, 0, 0);
        const name = new THREE.Mesh(geometry, whiteMaterial);
        this.game.sceneManager.addObject(name);
        this.names.set(unit, name);
        name.visible = !this.nameplatesVisible;
      }

      // Update name
      const name = this.names.get(unit);
      if (name) {
        name.visible = unit.targeted ? false : !this.nameplatesVisible;
        name.position.copy(anchor);
        name.rotation.setFromRotationMatrix(
          this.game.sceneManager.camera.matrix,
        );
      }

      // Nameplates
      if (!this.nameplates.has(unit)) {
        // === Three.js ===

        // Create nameplate
        const nameplate = new THREE.Group();
        this.game.sceneManager.addObject(nameplate);
        this.nameplates.set(unit, nameplate);

        // Background
        const hitbox = new THREE.Mesh(
          nameplateHitboxGeometry,
          nameplateHitboxMaterial,
        );
        hitbox.userData.id = unit.id;
        hitbox.renderOrder = 2;
        nameplate.add(hitbox);

        // Name
        {
          const font = gAssetManager.getFont('helvetiker_bold');
          if (!font) continue;

          const geometry = new TextGeometry(unit.name, {
            font: font,
            size: 16,
            depth: 0,
            curveSegments: 12,
          });
          geometry.computeBoundingBox();
          const bbox = geometry.boundingBox!;
          const offsetX = -0.5 * (bbox.max.x - bbox.min.x);
          const offsetY = 0.5 * (bbox.max.y - bbox.min.y);
          geometry.translate(offsetX, offsetY + 15, 0);
          const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            opacity: 0.5,
            transparent: true,
          });
          const name = new THREE.Mesh(geometry, material);
          nameplate.add(name);
          this.labels.set(unit, name);
        }

        // Health bar
        {
          // TODO: Replace with shader for performance, don't create material
          // for every healthbar.

          const healthBar = new THREE.Group();
          healthBar.position.copy(anchor);
          healthBar.rotation.setFromRotationMatrix(
            this.game.sceneManager.camera.matrix,
          );
          nameplate.add(healthBar);

          const healthBarBackgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            opacity: 1,
            transparent: true,
          });
          const healthBarBackground = new THREE.Mesh(
            healthBarGeometry,
            healthBarBackgroundMaterial,
          );
          healthBarBackground.renderOrder = 0;
          healthBar.add(healthBarBackground);

          const healthBarForegroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            opacity: 1,
            transparent: true,
          });
          const healthBarForeground = new THREE.Mesh(
            healthBarGeometry,
            healthBarForegroundMaterial,
          );
          healthBarForeground.renderOrder = 1;
          healthBar.add(healthBarForeground);

          this.healthbars.set(unit, healthBar);
        }
      }

      const fov = this.game.sceneManager.camera.fov * (Math.PI / 180);
      const cameraToNameplate = new THREE.Vector3().subVectors(
        anchor,
        this.game.sceneManager.camera.position,
      );
      const forwardDistance = cameraToNameplate.dot(
        this.game.sceneManager.camera.getWorldDirection(new THREE.Vector3()),
      );
      const scale = (4 * forwardDistance * Math.tan(fov)) / 10000; // so 1 unit = 1 pixel

      // Update nameplate
      const nameplate = this.nameplates.get(unit);
      if (nameplate) {
        nameplate.visible = unit.targeted || this.nameplatesVisible;

        nameplate.children.forEach((child: THREE.Mesh) => {
          child.position.copy(anchor);
          child.rotation.setFromRotationMatrix(
            this.game.sceneManager.camera.matrix,
          );
          child.scale.setScalar(scale);
        });

        const healthbar = this.healthbars.get(unit);
        if (healthbar) {
          const foreground = healthbar.children[1] as THREE.Mesh;
          const healthFraction = unit.health.current / unit.health.max;
          foreground.scale.set(healthFraction, 1, 1);
          foreground.position.set(-50 * (1 - healthFraction), 0, 0);

          healthbar.children.forEach((child: THREE.Mesh) => {
            (child.material as THREE.Material).opacity = unit.targeted
              ? 1
              : 0.5;
          });
        }

        // Name
        const name = this.labels.get(unit);
        if (name) {
          (name.material as THREE.MeshBasicMaterial).opacity = unit.targeted
            ? 1
            : 0.5;
        }
      }
    }

    const damageTextsToRemove = [] as typeof this.damageTexts;
    const currentTime = performance.now(); // Store the current time once

    for (const damageText of this.damageTexts) {
      const { time, text, anchor, lifetime, speed } = damageText;

      const fov = this.game.sceneManager.camera.fov * (Math.PI / 180);
      const cameraToDamageText = new THREE.Vector3().subVectors(
        anchor,
        this.game.sceneManager.camera.position,
      );
      const forwardDistance = cameraToDamageText.dot(
        this.game.sceneManager.camera.getWorldDirection(new THREE.Vector3()),
      );
      const scale = (4 * forwardDistance * Math.tan(fov)) / 10000; // so 1 unit = 1 pixel

      text.position.copy(anchor);
      text.rotation.setFromRotationMatrix(this.game.sceneManager.camera.matrix);
      text.scale.setScalar(scale);

      const delta = currentTime - time; // Use the stored current time
      text.position.y += speed * (delta / 1000); // units per second

      if (delta > lifetime) {
        this.game.sceneManager.removeObject(text);
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

    for (const [unit, nameplate] of this.nameplates) {
      if (!units.includes(unit)) {
        this.game.sceneManager.removeObject(nameplate);
        this.nameplates.delete(unit);
        this.labels.delete(unit);
        this.healthbars.delete(unit);
      }
    }
  }

  spawnDamageText(target: Unit, damage: number) {
    const font = gAssetManager.getFont('helvetiker_bold');
    if (!font) return;

    const anchor = target.position.clone();
    anchor.y += target.getHeight() + 0.75;

    const geometry = new TextGeometry(damage.toString(), {
      font: font,
      size: 24,
      depth: 0,
      curveSegments: 12,
    });
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    geometry.translate(-width / 2, height / 2 + height * 1.5, 0);
    const text = new THREE.Mesh(geometry, whiteMaterial);
    this.game.sceneManager.addObject(text);

    text.position.copy(anchor);
    text.rotation.setFromRotationMatrix(this.game.sceneManager.camera.matrix);

    this.damageTexts.push({
      time: performance.now(),
      text,
      anchor,
      lifetime: 1000,
      speed: 2, // units per second
    });
  }

  getNameplateHitboxes() {
    return this.nameplates
      .values()
      .filter(nameplate => nameplate.visible)
      .map(nameplate => nameplate.children[0] as THREE.Mesh);
  }

  setXpBar(currentXp, xpToLevelUp, level, maxLevel) {
    const experienceBarFill = document.getElementById('experience-bar-fill');
    const fillPercentage = (currentXp / xpToLevelUp) * 100;
    experienceBarFill.style.width = `calc((100% - 100px) / 100 * ${fillPercentage})`;

    const experienceBarText = document.getElementById('experience-bar-text');
    experienceBarText.innerText = `${currentXp} / ${xpToLevelUp}`;

    const currentLevel = document.getElementById('current-level');
    currentLevel.innerText = `${level}`;

    const nextLevel = document.getElementById('next-level');
    nextLevel.innerText = `${level + 1 <= maxLevel ? level + 1 : ''}`;
  }
}
