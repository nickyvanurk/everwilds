export class Entity {
  flags = 0;
  id: number;
  x = 0;
  y = 0;
  z = 0;
  orientation = 0;

  static nextId = 1;

  constructor() {
    this.id = Entity.nextId++;
  }

  update(_dt: number) {}
}
