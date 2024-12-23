import type { Socket } from './socket';

export class Player {
  flags = 0;
  id: number;
  x = 0;
  y = 0;
  z = 0;
  orientation = 0;

  constructor(
    public socket: Socket,
    public name: string,
  ) {
    this.id = Number.parseInt(`5${Math.floor(Math.random() * 1000)}`);
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
}
