import * as THREE from 'three';

export class Character {
   id = -1;
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

   update(_dt: number) {
      this.mesh.position.copy(this.position);
   }

   getHeight() {
      return this.mesh.geometry.boundingBox!.max.y;
   }
}
