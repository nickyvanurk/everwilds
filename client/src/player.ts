import { actions, input } from './input';
import { Character } from './character';
import type { Client } from './client';
import * as Packet from '../../shared/src/packets';
import { getMSTime } from '../../shared/src/time';

export class Player extends Character {
   client: Client | null = null;

   constructor(
      public name: string,
      public speed: number,
   ) {
      super(name, speed);

      const sendMovementPacket = () => {
         const input = {
            x: actions.left ? -1 : actions.right ? 1 : 0,
            z: actions.forward ? -1 : actions.backward ? 1 : 0,
         };
         const orientation = Math.atan2(input.x, input.z);

         let movementFlag = 0;
         if (actions.forward) movementFlag |= 1;
         if (actions.backward) movementFlag |= 2;
         if (actions.left) movementFlag |= 4;
         if (actions.right) movementFlag |= 8;

         this.client?.send(Packet.Move.serialize(getMSTime(), movementFlag, this.position.x, this.position.y, this.position.z, orientation));
      };

      input.on('forward', sendMovementPacket);
      input.on('backward', sendMovementPacket);
      input.on('left', sendMovementPacket);
      input.on('right', sendMovementPacket);
   }

   update(dt: number) {
      const input = {
         x: actions.left ? -1 : actions.right ? 1 : 0,
         z: actions.forward ? -1 : actions.backward ? 1 : 0,
      };

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
   }
}
