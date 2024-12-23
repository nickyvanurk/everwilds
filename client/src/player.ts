import { actions, input } from './input';
import { Character } from './character';
import type { Socket } from './socket';
import * as Packet from '../../shared/src/packets';

export class Player extends Character {
  socket: Socket | null = null;
  private timeSinceLastMovePacket = 0;

  constructor(public name: string) {
    super(name);

    input.on('forward', this.sendMovementPacket.bind(this));
    input.on('backward', this.sendMovementPacket.bind(this));
    input.on('left', this.sendMovementPacket.bind(this));
    input.on('right', this.sendMovementPacket.bind(this));
  }

  update(dt: number) {
    const input = {
      x: actions.left ? -1 : actions.right ? 1 : 0,
      z: actions.forward ? -1 : actions.backward ? 1 : 0,
    };

    if (input.x || input.z) {
      this.timeSinceLastMovePacket += dt;
      if (this.timeSinceLastMovePacket > 0.5) {
        this.timeSinceLastMovePacket -= 0.5;
        this.sendMovementPacket(false);
      }
    }

    this.velocity.x = this.speed * input.x;
    this.velocity.z = this.speed * input.z;
    this.velocity.y -= 1;

    if (this.velocity.x && this.velocity.z) {
      this.velocity.x *= Math.SQRT1_2;
      this.velocity.z *= Math.SQRT1_2;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    if (this.position.y < 0) {
      this.position.y = 0;
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.orientation;
  }

  setOrientation(orientation: number) {
    super.setOrientation(orientation);
    this.sendMovementPacket();
  }

  sendMovementPacket(resetTimer = true) {
    let movementFlags = 0;
    if (actions.forward) movementFlags |= 1;
    if (actions.backward) movementFlags |= 2;
    if (actions.left) movementFlags |= 4;
    if (actions.right) movementFlags |= 8;

    this.socket?.send(
      Packet.Move.serialize(
        movementFlags,
        this.position.x,
        this.position.y,
        this.position.z,
        this.orientation,
      ),
    );

    if (resetTimer) {
      this.timeSinceLastMovePacket = 0;
    }
  }
}
