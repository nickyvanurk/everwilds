import * as THREE from 'three';

import { actions, input, mouseState } from './input';
import type { Character } from './character';
import type { Socket } from './socket';
import * as Packet from '../../shared/src/packets';
import type { SceneManager } from './scene-manager';

export class Player {
  socket: Socket | null = null;
  character?: Character; // TODO: Don't make it optional
  target?: Character;
  isAttacking = false;
  traversalMode: 'walk' | 'fly' = 'walk';
  lastCharacterId = 0;

  private timeSinceLastMovePacket = 0;
  private prejump?: THREE.Audio;

  constructor(sceneManager: SceneManager) {
    input.on('forward', this.sendMovementPacket.bind(this));
    input.on('backward', this.sendMovementPacket.bind(this));
    input.on('left', this.sendMovementPacket.bind(this));
    input.on('right', this.sendMovementPacket.bind(this));
    input.on('toggleFlyMode', (isDown: boolean) => {
      if (!isDown) return;
      this.traversalMode = this.traversalMode === 'walk' ? 'fly' : 'walk';
      if (this.character) {
        this.character.hasGravity = this.traversalMode === 'walk';
      }
    });

    sceneManager.on('cameraYawChanged', (yaw: number) => {
      if (mouseState.rmb && this.character) {
        this.character.setOrientation(yaw);
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
    if (!this.character) return;

    const isForward = actions.forward || (mouseState.lmb && mouseState.rmb);

    this.character.isStrafeLeft = actions.left;
    this.character.isStrafeRight = actions.right;
    this.character.isForward = isForward;
    this.character.isBackward = actions.backward;

    const input = new THREE.Vector3();
    input.x = actions.left ? -1 : actions.right ? 1 : 0;
    input.z = isForward ? -1 : actions.backward ? 1 : 0;
    input.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.character.orientation,
    );
    input.normalize();

    if (input.x || input.z) {
      this.timeSinceLastMovePacket += dt;
      if (this.timeSinceLastMovePacket > 0.5) {
        this.timeSinceLastMovePacket -= 0.5;
        this.sendMovementPacket(false);
      }
    }

    if (this.traversalMode === 'walk') {
      this.character.move(input.x, input.z);

      if (actions.jump && this.character.isGrounded()) {
        this.character.jump();
        this.sendMovementPacket(true, true);
        actions.jump = false;

        if (this.prejump) {
          if (this.prejump.isPlaying) {
            this.prejump.stop();
          }

          this.prejump.play();
        }
      }
    } else {
      this.character.fly(input.x, input.z, actions.jump, actions.flyDown);
    }
  }

  sendMovementPacket(resetTimer = true, jumping = false) {
    if (!this.character) return;

    let movementFlags = 0;
    if (actions.forward) movementFlags |= 1;
    if (actions.backward) movementFlags |= 2;
    if (actions.left) movementFlags |= 4;
    if (actions.right) movementFlags |= 8;

    if (jumping) {
      movementFlags |= 16;
    }

    this.socket?.send(
      Packet.Move.serialize(
        movementFlags,
        this.character.position.x,
        this.character.position.y,
        this.character.position.z,
        this.character.orientation,
      ),
    );

    if (resetTimer) {
      this.timeSinceLastMovePacket = 0;
    }
  }

  setTarget(target: Character) {
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

  startAttack(target: Character) {
    this.isAttacking = true;
    this.socket?.send(Packet.AttackStart.serialize(target.id));
  }

  stopAttack() {
    this.isAttacking = false;
    this.socket?.send(Packet.AttackStop.serialize());
  }
}
