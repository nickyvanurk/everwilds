import * as THREE from 'three';

import { actions } from './input';

export class Player {
   position = new THREE.Vector3();
   velocity = new THREE.Vector3();
   mesh: THREE.Mesh;

   constructor(
      public name: string,
      public speed: number,
   ) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.translate(0, 0.5, 0);
      geometry.computeBoundingBox();
      const material = new THREE.MeshNormalMaterial();
      const cube = new THREE.Mesh(geometry, material);
      this.mesh = cube;
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

      this.mesh.position.copy(this.position);
   }

   getHeight() {
      return this.mesh.geometry.boundingBox!.max.y;
   }
}
