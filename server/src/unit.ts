import { Entity } from './entity';

export class Unit extends Entity {
  vy = 0;
  gravity = -9.81;
  floorHeight = 0;
  health = { current: 100, max: 100, min: 0 };

  constructor(
    public name: string,
    public color: number,
  ) {
    super();
  }

  update(dt: number): void {
    this.vy += (this.gravity * dt) / 1000;
    this.y += (this.vy * dt) / 1000;

    if (this.y < this.floorHeight) {
      this.y = this.floorHeight;
      this.vy = 0;
    }
  }

  damage(amount: number) {
    this.health.current = Math.max(
      this.health.min,
      this.health.current - amount,
    );
  }

  isAlive() {
    return this.health.current > 0;
  }
}
