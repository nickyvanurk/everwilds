import type { Unit } from './unit';
import type { SceneManager } from './scene-manager';
import type * as THREE from 'three';

export class EntityManager {
  private entities: Map<number, Unit> = new Map();
  private sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  addEntity(entity: Unit) {
    if (this.entities.has(entity.id)) {
      log.warn(`Entity with ID ${entity.id} already exists`);
      return;
    }

    this.entities.set(entity.id, entity);
    this.sceneManager.addObject(entity.object3d);
  }

  removeEntity(id: number) {
    const entity = this.entities.get(id);
    if (!entity) {
      log.warn(`Entity with ID ${id} not found`);
      return;
    }

    this.sceneManager.removeObject(entity.object3d);
    this.entities.delete(id);
  }

  getEntity(id: number): Unit | undefined {
    const entity = this.entities.get(id);
    if (!entity) {
      log.warn(`Entity with ID ${id} not found`);
      return;
    }

    return entity;
  }

  update(dt: number) {
    for (const entity of this.entities.values()) {
      entity.update(dt);
    }
  }

  getUnits() {
    return Array.from(this.entities.values());
  }

  getNearestUnit(position: THREE.Vector3) {
    const units = this.getUnits();
    let nearestUnit: Unit | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const unit of units) {
      if (unit === game.player.unit) continue;

      const distance = unit.position.distanceTo(position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestUnit = unit;
      }
    }

    return nearestUnit;
  }
}
