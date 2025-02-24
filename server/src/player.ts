import type { Socket } from './socket';

export class Player {
  flags = 0;
  id: number;
  x = 0;
  y = 0;
  z = 0;
  orientation = 0;

  static assignedIds = new Set<number>();
  static nextId = 1;

  constructor(
    public socket: Socket,
    public name: string,
  ) {
    this.id = Number.parseInt(`${Player.getNextId()}`);
  }

  getState(): (string | number)[] {
    return [
      this.id,
      this.flags,
      this.name,
      this.x,
      this.y,
      this.z,
      this.orientation,
    ];
  }

  static getNextId() {
    while (Player.assignedIds.has(Player.nextId)) {
      Player.nextId++;
    }

    Player.assignedIds.add(Player.nextId);
    return Player.nextId;
  }

  static releaseId(id: number) {
    Player.assignedIds.delete(id);

    if (id < Player.nextId) {
      Player.nextId = id;
    }
  }
}
