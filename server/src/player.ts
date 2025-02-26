import type { Socket } from './socket';

export class Player {
  flags = 0;
  id: number;
  x = 0;
  y = 0;
  z = 0;
  orientation = 0;

  onAttack: (() => void) | null = null;

  static assignedIds = new Set<number>();
  static nextId = 1;

  private timeSinceLastMoveAttack = 0;
  private attackCooldown = 1;
  private isAttacking = false;
  private attackRange = 2.5;
  private attackTarget?: Player;

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

  update(dt: number) {
    if (this.isAttacking && this.attackTarget) {
      const distance = Math.sqrt(
        (this.x - this.attackTarget.x) ** 2 +
          (this.y - this.attackTarget.y) ** 2 +
          (this.z - this.attackTarget.z) ** 2,
      );

      if (distance > this.attackRange) {
        this.timeSinceLastMoveAttack = 0;
        return;
      }

      if (this.timeSinceLastMoveAttack === 0) {
        this.onAttack?.();
      }

      this.timeSinceLastMoveAttack += dt / 1000;

      if (this.timeSinceLastMoveAttack > this.attackCooldown) {
        this.timeSinceLastMoveAttack = 0;
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
