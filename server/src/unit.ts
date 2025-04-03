import { Entity } from './entity';

export class Unit extends Entity {
  vy = 0;
  gravity = -9.81;
  floorHeight = 0;
  health = { current: 100, max: 100, min: 0 };
  spawnPosition = { x: 0, y: 0, z: 0 };
  spawnOrientation = 0;
  respawnTime = 1000;
  isRespawning = false;
  level = 1;
  maxLevel = 10;
  xp = 0;

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

  damage(amount: number, attacker: Unit) {
    this.health.current = Math.max(
      this.health.min,
      this.health.current - amount,
    );

    eventBus.emit('unitDamage', attacker, this, amount);

    if (this.health.current === this.health.min) {
      this.die();
    }
  }

  die() {
    if (this.isRespawning) return;
    this.isRespawning = true;

    eventBus.emit('unitDie', this);

    setTimeout(() => {
      this.respawn();
      this.isRespawning = false;
    }, this.respawnTime);
  }

  isAlive() {
    return this.health.current > 0;
  }

  spawn(x: number, y: number, z: number, orientation: number) {
    this.spawnPosition.x = x;
    this.spawnPosition.y = y;
    this.spawnPosition.z = z;
    this.spawnOrientation = orientation;
    this.x = x;
    this.y = y;
    this.z = z;
    this.orientation = orientation;
  }

  respawn() {
    this.x = this.spawnPosition.x;
    this.y = this.spawnPosition.y;
    this.z = this.spawnPosition.z;
    this.orientation = this.spawnOrientation;
    this.health.current = this.health.max;
    this.vy = 0;
    eventBus.emit('unitRespawn', this);
  }

  get xpToLevelUp() {
    return 12.5 * this.level * this.xpPerKill; // 8 is used for wow classic
  }

  get xpPerKill() {
    return 15 + 5 * this.level; // 45 + 5 * this.level is used for wow classic
  }

  gainXp(amount: number) {
    this.xp += amount;
    if (this.xp >= this.xpToLevelUp) {
      this.levelUp();
    }

    eventBus.emit('unitGainXp', this, amount);
  }

  levelUp() {
    this.xp -= this.xpToLevelUp;
    this.level++;
    if (this.level > this.maxLevel) {
      this.level = this.maxLevel;
      this.xp = this.xpToLevelUp;
    }
  }
}
