export class Entity {
  flags = 0;
  id: number;
  x = 0;
  y = 0;
  z = 0;
  orientation = 0;

  static assignedIds = new Set<number>();
  static nextId = 1;

  constructor() {
    this.id = Number.parseInt(`${Entity.getNextId()}`);
  }

  update(dt: number) {}

  static getNextId() {
    while (Entity.assignedIds.has(Entity.nextId)) {
      Entity.nextId++;
    }

    Entity.assignedIds.add(Entity.nextId);
    return Entity.nextId;
  }

  static releaseId(id: number) {
    Entity.assignedIds.delete(id);

    if (id < Entity.nextId) {
      Entity.nextId = id;
    }
  }
}
