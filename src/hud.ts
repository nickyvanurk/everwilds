import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

import type { Game } from './game';
import type { Player } from './player';

export class HUD {
   private names = new Map<Player, THREE.Mesh>();

   constructor(private game: Game) {}

   update(_dt: number) {
      for (const character of this.game.characters) {
         if (this.names.has(character)) continue;

         const font = gAssetManager.getFont('helvetiker');
         if (!font) continue;

         const geometry = new TextGeometry(character.name, {
            font: font,
            size: 0.2,
            depth: 0,
            curveSegments: 12,
         });
         geometry.computeBoundingBox();
         const bbox = geometry.boundingBox!;
         const offset = -0.5 * (bbox.max.x - bbox.min.x);
         geometry.translate(offset, 0, 0);
         const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
         });
         const name = new THREE.Mesh(geometry, material);
         this.game.scene.add(name);
         this.names.set(character, name);
      }

      for (const [character, name] of this.names) {
         name.position.copy(character.position);
         name.position.y += character.getHeight() + 0.5;
         name.rotation.setFromRotationMatrix(this.game.camera.matrix);
      }
   }
}
