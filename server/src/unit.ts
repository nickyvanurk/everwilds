import { Entity } from './entity';

export class Unit extends Entity {
  health = { current: 100, max: 100, min: 0 };

  constructor(
    public name: string,
    public color: number,
  ) {
    super();
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
