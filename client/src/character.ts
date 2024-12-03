import * as THREE from 'three';

export class Character {
   id = -1;
   prevServerPosition = new THREE.Vector3();
   serverPosition = new THREE.Vector3();
   position = new THREE.Vector3();
   velocity = new THREE.Vector3();
   mesh: THREE.Mesh;
   orientation = 0;
   time = 0;

   constructor(
      public name: string,
      public speed = 0
   ) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.translate(0, 0.5, 0);
      geometry.computeBoundingBox();
      const material = new THREE.MeshNormalMaterial();
      const cube = new THREE.Mesh(geometry, material);
      this.mesh = cube;
   }

   update(dt: number) {
      this.position.copy(this.serverPosition);

      const dir = new THREE.Vector3(
         Math.sin(this.orientation),
         0,
         Math.cos(this.orientation),
      );
      dir.normalize();
      dir.multiplyScalar(this.speed).multiplyScalar(this.time);

      this.position.add(dir);

      this.time += dt;

      this.mesh.position.copy(this.position);
   }

   getHeight() {
      return this.mesh.geometry.boundingBox!.max.y;
   }

   setPosition(x: number, y: number, z: number) {
      this.prevServerPosition.copy(this.serverPosition);
      this.serverPosition.set(x, y, z);
   }
}
