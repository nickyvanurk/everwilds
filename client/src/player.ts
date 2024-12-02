import { actions, input } from './input';
import { Character } from './character';
import type { Client } from './client';

export class Player extends Character {
   client: Client | null = null;

   constructor(
      public name: string,
      public speed: number,
   ) {
      super(name, speed);

      const sendMovementPacket = () => {
         this.client?.sendMove(
            this.position.x,
            this.position.y,
            this.position.z,
         );
      };

      input.on('forward', () => sendMovementPacket());
      input.on('backward', () => sendMovementPacket());
      input.on('left', () => sendMovementPacket());
      input.on('right', () => sendMovementPacket());
      input.on('jump', () => sendMovementPacket());
   }

   update(dt: number) {
      if (actions.jump) {
         this.velocity.y = 15;
      }

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

      super.update(dt);
   }
}
