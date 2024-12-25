import * as THREE from 'three';

import { actions, input } from './input';
import type { Character } from './character';
import type { Socket } from './socket';
import * as Packet from '../../shared/src/packets';
import type { SceneManager } from './scene-manager';

export class Player {
  socket: Socket | null = null;
  character!: Character;

  private timeSinceLastMovePacket = 0;

  constructor(sceneManager: SceneManager) {
    input.on('forward', this.sendMovementPacket.bind(this));
    input.on('backward', this.sendMovementPacket.bind(this));
    input.on('left', this.sendMovementPacket.bind(this));
    input.on('right', this.sendMovementPacket.bind(this));

    sceneManager.on('cameraYawChanged', (yaw: number) => {
      this.character.setOrientation(yaw);
      this.sendMovementPacket();
    });
  }

  update(dt: number) {
    if (!this.character) return;

    const input = new THREE.Vector3();
    input.x = actions.left ? -1 : actions.right ? 1 : 0;
    input.z = actions.forward ? -1 : actions.backward ? 1 : 0;
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

    const vx = this.character.speed * input.x;
    const vz = this.character.speed * input.z;
    this.character.setVelocity(vx, 0, vz);
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

  setCharacter(character: Character) {
    this.character = character;
  }

  setSocket(socket: Socket) {
    this.socket = socket;
  }
}
