import { Unit } from './unit';
import type { Socket } from './socket';

export class Player extends Unit {
  attackTarget?: Unit;

  onAttack: (() => void) | null = null;

  private timeSinceLastMoveAttack = 0;
  private attackCooldown = 1;
  private isAttacking = false;
  private attackRange = 2.5;

  constructor(
    public socket: Socket,
    public name: string,
    public color: number,
  ) {
    super(name, color);
  }

  update(dt: number) {
    if (this.isAttacking && this.attackTarget) {
      this.timeSinceLastMoveAttack += dt / 1000;

      if (this.timeSinceLastMoveAttack > this.attackCooldown) {
        const distance = Math.sqrt(
          (this.x - this.attackTarget.x) ** 2 +
            (this.y - this.attackTarget.y) ** 2 +
            (this.z - this.attackTarget.z) ** 2,
        );

        if (distance <= this.attackRange) {
          this.timeSinceLastMoveAttack = 0;
          this.onAttack?.();
        }
      }
    }
  }

  startAttack(target: Unit) {
    this.attackTarget = target;
    this.isAttacking = true;
  }

  stopAttack() {
    this.attackTarget = undefined;
    this.timeSinceLastMoveAttack = 0;
    this.isAttacking = false;
  }
}
