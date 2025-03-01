import type { Socket } from './socket';

export class Player {
  flags = 0;
  id: number;
  x = 0;
  y = 0;
  z = 0;
  orientation = 0;
  health = { current: 100, max: 100, min: 0 };
  attackTarget?: Player;

  onAttack: (() => void) | null = null;

  static assignedIds = new Set<number>();
  static nextId = 1;

  private timeSinceLastMoveAttack = 0;
  private attackCooldown = 1;
  private isAttacking = false;
  private attackRange = 2.5;

  constructor(
    public socket: Socket,
    public name: string,
    public color: number,
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

  startAttack(target: Player) {
    this.attackTarget = target;
    this.isAttacking = true;
  }

  stopAttack() {
    this.attackTarget = undefined;
    this.timeSinceLastMoveAttack = 0;
    this.isAttacking = false;
  }

  damage(amount: number) {
    if (this.health.current - amount <= 0) {
      this.stopAttack();
    }

    this.health.current = Math.max(
      this.health.min,
      this.health.current - amount,
    );
  }

  isAlive() {
    return this.health.current > 0;
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
