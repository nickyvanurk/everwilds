import * as THREE from 'three';

import { actions, input, mouseState } from './input';
import type { Unit } from './unit';
import type { Socket } from './socket';
import * as Packet from '../../shared/src/packets';
import type { SceneManager } from './scene-manager';

export class Player {
  socket: Socket | null = null;
  unit?: Unit;
  target?: Unit;
  isAttacking = false;
  lastUnitId = 0;

  private timeSinceLastMovePacket = 0;
  private prejump?: THREE.Audio;

  constructor(sceneManager: SceneManager) {
    input.on('forward', this.sendMovementPacket.bind(this));
    input.on('backward', this.sendMovementPacket.bind(this));
    input.on('left', this.sendMovementPacket.bind(this));
    input.on('right', this.sendMovementPacket.bind(this));

    sceneManager.on('cameraYawChanged', (yaw: number) => {
      if (mouseState.rmb && this.unit) {
        this.unit.setOrientation(yaw);
        this.sendMovementPacket();
      }
    });

    gAssetManager.getSound('prejump', (buffer: AudioBuffer) => {
      const prejump = new THREE.Audio(sceneManager.audioListener);
      prejump.setBuffer(buffer);
      prejump.setVolume(0.1);
      this.prejump = prejump;
    });
  }

  update(dt: number) {
    if (!this.unit) return;

    const isForward = actions.forward || (mouseState.lmb && mouseState.rmb);

    this.unit.isStrafeLeft = actions.left;
    this.unit.isStrafeRight = actions.right;
    this.unit.isForward = isForward;
    this.unit.isBackward = actions.backward;

    const input = new THREE.Vector3();
    input.x = actions.left ? -1 : actions.right ? 1 : 0;
    input.z = isForward ? -1 : actions.backward ? 1 : 0;
    input.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.unit.orientation,
    );
    input.normalize();

    if (input.x || input.z) {
      this.timeSinceLastMovePacket += dt;
      if (this.timeSinceLastMovePacket > 0.5) {
        this.timeSinceLastMovePacket -= 0.5;
        this.sendMovementPacket(false);
      }
    }

    this.unit.move(input.x, input.z);

    if (actions.jump && this.unit.isGrounded()) {
      this.unit.jump();
      this.sendMovementPacket(true, true);
      actions.jump = false;

      if (this.prejump) {
        if (this.prejump.isPlaying) {
          this.prejump.stop();
        }

        this.prejump.play();
      }
    }
  }

  sendMovementPacket(resetTimer = true, jumping = false) {
    if (!this.unit) return;

    let movementFlags = 0;
    if (actions.forward) movementFlags |= 1;
    if (actions.backward) movementFlags |= 2;
    if (actions.left) movementFlags |= 4;
    if (actions.right) movementFlags |= 8;
    if (jumping) movementFlags |= 16;

    this.socket?.send(
      Packet.Move.serialize(
        movementFlags,
        this.unit.position.x,
        this.unit.position.y,
        this.unit.position.z,
        this.unit.orientation,
      ),
    );

    if (resetTimer) {
      this.timeSinceLastMovePacket = 0;
    }
  }

  setTarget(target: Unit) {
    if (this.target) {
      this.target.targeted = false;
    }

    this.target = target;
    this.target.targeted = true;
  }

  clearTarget() {
    if (this.target) {
      this.target.targeted = false;
      this.target = undefined;
    }
  }

  startAttack(target: Unit) {
    this.isAttacking = true;
    this.socket?.send(Packet.AttackStart.serialize(target.id));
  }

  stopAttack() {
    this.isAttacking = false;
    this.socket?.send(Packet.AttackStop.serialize());
  }
}
